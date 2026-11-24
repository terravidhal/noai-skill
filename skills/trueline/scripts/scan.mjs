#!/usr/bin/env node
/**
 * trueline scan — deterministic slop score for a screen.
 *
 *   node scan.mjs ./page.html
 *   node scan.mjs http://localhost:3000 --theme dark
 *   node scan.mjs ./capture.png --image
 *   node scan.mjs ./after.html --compare before.json --max-slop 20
 *
 * Three modes, one JSON schema:
 *   dom    Playwright reads computed styles (confidence 1.0)
 *   static HTML + CSS parsed with no dependency (confidence 0.55)
 *   image  PNG pixels decoded with node:zlib (confidence 0.45)
 *
 * No network call, no model, no telemetry. Same input, same score.
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inflateSync } from "node:zlib";

const RUBRIC = "1";
const TOOL_VERSION = "1.0.0";
const CATEGORIES = ["color", "layout", "type", "copy", "contrast", "motion"];
const DEFAULT_WEIGHTS = {
  A1: 6, A2: 6, A3: 5, A4: 4, A5: 3, A6: 3, A7: 3,
  B1: 7, B2: 4, B3: 4, B4: 3, B5: 2,
  C1: 5, C2: 3, C3: 3, C4: 2, C5: 2,
  D1: 5, D2: 4, D3: 3, D4: 3,
  E1: 5, E2: 2, E3: 3,
  F1: 4, F2: 3, F3: 3,
};
const CATEGORY_MAX = { color: 30, layout: 20, type: 15, copy: 15, contrast: 10, motion: 10 };

const USAGE = `usage: node scan.mjs <file.html | url | capture.png> [options]

  --image                 treat the target as a screenshot (PNG)
  --json <file|->         write the JSON report ("-" prints only JSON)
  --compare <before.json> add a delta and refuse mismatched rubrics
  --max-slop <0-100>      exit 2 when the slop score is higher
  --min-design <0-100>    exit 2 when the design score is lower
  --min-score <0-100>     alias for --min-design
  --theme <light|dark>    prefers-color-scheme for DOM rendering (default light)
  --width <px>            viewport width, default 1440
  --height <px>           viewport height, default 900
  --static                force the no-dependency HTML parser
  --waivers <file>        JSON waivers (default ./trueline.json when present)
  --max-waivers <n>       waiver cap, default 5
  --chrome <path>         explicit Chromium executable
  --playwright <path>     import Playwright from a specific folder
  --quiet                 no human summary on stdout
  --help                  this text`;

function fail(message, code = 1) {
  console.error(`trueline: ${message}`);
  process.exit(code);
}

function parseArgs(argv) {
  const options = {
    target: null, image: false, json: null, compare: null,
    maxSlop: null, minDesign: null, theme: "light",
    width: 1440, height: 900, static: false, waivers: null,
    maxWaivers: 5, chrome: null, playwright: null, quiet: false,
  };
  const number = (name, value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) fail(`--${name} needs a number, got "${value}"`);
    return parsed;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const take = () => {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) fail(`${arg} needs a value`);
      i += 1;
      return value;
    };
    switch (arg) {
      case "--help": case "-h": console.log(USAGE); process.exit(0); break;
      case "--image": options.image = true; break;
      case "--static": options.static = true; break;
      case "--quiet": options.quiet = true; break;
      case "--json": options.json = take(); break;
      case "--compare": options.compare = take(); break;
      case "--waivers": options.waivers = take(); break;
      case "--playwright": options.playwright = take(); break;
      case "--chrome": options.chrome = take(); break;
      case "--theme": options.theme = take() === "dark" ? "dark" : "light"; break;
      case "--width": options.width = Math.round(number("width", take())); break;
      case "--height": options.height = Math.round(number("height", take())); break;
      case "--max-slop": options.maxSlop = number("max-slop", take()); break;
      case "--min-design": options.minDesign = number("min-design", take()); break;
      case "--min-score": options.minDesign = number("min-score", take()); break;
      case "--max-waivers": options.maxWaivers = Math.round(number("max-waivers", take())); break;
      default:
        if (arg.startsWith("--")) fail(`unknown option ${arg}`);
        if (options.target) fail(`unexpected argument ${arg}`);
        options.target = arg;
    }
  }
  if (!options.target) {
    console.error(USAGE);
    process.exit(1);
  }
  return options;
}

/* ------------------------------------------------------------------ */
/* values: colors, lengths, shadows, gradients                         */
/* ------------------------------------------------------------------ */

const NAMED = {
  transparent: [0, 0, 0, 0], white: [255, 255, 255, 1], black: [0, 0, 0, 1],
  gray: [128, 128, 128, 1], grey: [128, 128, 128, 1], silver: [192, 192, 192, 1],
  red: [255, 0, 0, 1], green: [0, 128, 0, 1], blue: [0, 0, 255, 1],
  yellow: [255, 255, 0, 1], orange: [255, 165, 0, 1], purple: [128, 0, 128, 1],
  pink: [255, 192, 203, 1], cyan: [0, 255, 255, 1], magenta: [255, 0, 255, 1],
  currentcolor: null, inherit: null, initial: null,
};

function clamp(value, low = 0, high = 1) {
  return Math.max(low, Math.min(high, value));
}

function parseColor(input) {
  if (!input || typeof input !== "string") return null;
  const value = input.trim().toLowerCase();
  if (NAMED[value] === null) return null;
  if (NAMED[value]) {
    const [r, g, b, a] = NAMED[value];
    return { r, g, b, a };
  }
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    const expand = (part) => parseInt(part.length === 1 ? part + part : part, 16);
    if (hex.length === 3 || hex.length === 4) {
      return {
        r: expand(hex[0]), g: expand(hex[1]), b: expand(hex[2]),
        a: hex.length === 4 ? expand(hex[3]) / 255 : 1,
      };
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: expand(hex.slice(0, 2)), g: expand(hex.slice(2, 4)), b: expand(hex.slice(4, 6)),
        a: hex.length === 8 ? expand(hex.slice(6, 8)) / 255 : 1,
      };
    }
    return null;
  }
  const rgb = value.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const channel = (part) => (part.endsWith("%") ? (parseFloat(part) * 255) / 100 : parseFloat(part));
    return {
      r: clamp(channel(parts[0]), 0, 255),
      g: clamp(channel(parts[1]), 0, 255),
      b: clamp(channel(parts[2]), 0, 255),
      a: parts[3] === undefined ? 1 : partAlpha(parts[3]),
    };
  }
  const hsl = value.match(/^hsla?\(([^)]+)\)$/);
  if (hsl) {
    const parts = hsl[1].split(/[\s,/]+/).filter(Boolean);
    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    const a = parts[3] === undefined ? 1 : partAlpha(parts[3]);
    const rgbValue = hslToRgb(h, s, l);
    return { ...rgbValue, a };
  }
  return null;
}

function partAlpha(part) {
  return part.endsWith("%") ? parseFloat(part) / 100 : parseFloat(part);
}

function hslToRgb(h, s, l) {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0; let g = 0; let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

function rgbToHsl({ r, g, b }) {
  const rn = r / 255; const gn = g / 255; const bn = b / 255;
  const max = Math.max(rn, gn, bn); const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else h = ((rn - gn) / d + 4) * 60;
  return { h, s, l };
}

function composite(fg, bg) {
  if (!fg) return bg;
  if (!bg) return fg;
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a,
  };
}

function luminance({ r, g, b }) {
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(fg, bg) {
  if (!fg || !bg) return null;
  const base = bg.a < 1 ? composite(bg, { r: 255, g: 255, b: 255, a: 1 }) : bg;
  const front = composite(fg, base);
  const a = luminance(front); const b = luminance(base);
  const light = Math.max(a, b); const dark = Math.min(a, b);
  return (light + 0.05) / (dark + 0.05);
}

function parseLength(value, font = 16, root = 16) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const text = String(value).trim().toLowerCase();
  if (!text || text === "auto" || text === "normal" || text === "none" || text === "inherit") return null;
  const number = parseFloat(text);
  if (!Number.isFinite(number)) return null;
  if (text.endsWith("rem")) return number * root;
  if (text.endsWith("em")) return number * (font || root);
  if (text.endsWith("%")) return number;
  return number;
}

function parseTime(value) {
  if (!value || typeof value !== "string") return 0;
  const first = value.split(",")[0].trim();
  const number = parseFloat(first);
  if (!Number.isFinite(number)) return 0;
  if (first.endsWith("ms")) return number;
  if (first.endsWith("s")) return number * 1000;
  return number;
}

function splitTop(value, separator = ",") {
  const parts = []; let depth = 0; let quote = null; let current = "";
  for (const char of String(value || "")) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; current += char; continue; }
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === separator && depth === 0) { parts.push(current); current = ""; continue; }
    current += char;
  }
  if (current.trim()) parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

function shadowList(value) {
  if (!value || value === "none") return [];
  return splitTop(value).map((part) => {
    const colors = part.match(/(?:rgba?|hsla?)\([^)]*\)|#[0-9a-f]{3,8}\b|\b(?:white|black|gray|grey|silver|red|green|blue|yellow|orange|purple|pink|cyan|magenta)\b/gi) || [];
    const color = colors.map(parseColor).find(Boolean) || { r: 0, g: 0, b: 0, a: 1 };
    const numbers = (part.match(/-?\d*\.?\d+px/g) || []).map((n) => parseFloat(n));
    const [x = 0, y = 0, blur = 0, spread = 0] = numbers;
    const hsl = rgbToHsl(color);
    return { x, y, blur, spread, color, saturation: hsl.s, inset: /inset/.test(part) };
  });
}

function gradientColors(value) {
  if (!value || !/gradient/i.test(value)) return null;
  const colors = [];
  const pattern = /(?:rgba?|hsla?)\([^)]*\)|#[0-9a-f]{3,8}\b/gi;
  const found = value.match(pattern) || [];
  for (const item of found) {
    const color = parseColor(item);
    if (color) colors.push(color);
  }
  return colors.length ? colors : null;
}

function hueDistance(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/* ------------------------------------------------------------------ */
/* HTML + CSS parser (static mode)                                     */
/* ------------------------------------------------------------------ */

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const INLINE = new Set(["a", "span", "strong", "em", "b", "i", "small", "label", "code", "abbr", "time"]);

function parseAttributes(source) {
  const attrs = {};
  const pattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = pattern.exec(source))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

function parseHtml(html) {
  const styles = [];
  const body = String(html)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
      styles.push(css);
      return "";
    })
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, "");
  const root = { tag: "#root", attrs: {}, children: [], parent: null, text: "", index: 0 };
  const stack = [root];
  const token = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^<>]*?)?)\s*(\/?)>|([^<]+)/g;
  let match;
  while ((match = token.exec(body))) {
    if (match[5] !== undefined) {
      const text = match[5];
      if (text.trim() && stack.length > 1) stack[stack.length - 1].text += ` ${text.replace(/\s+/g, " ")}`;
      continue;
    }
    const closing = match[1] === "/";
    const tag = match[2].toLowerCase();
    if (closing) {
      for (let i = stack.length - 1; i > 0; i -= 1) {
        if (stack[i].tag === tag) { stack.length = i; break; }
      }
      continue;
    }
    if (tag === "!doctype" || tag === "html" || tag === "head" || tag === "meta" || tag === "link" || tag === "title") continue;
    const node = {
      tag,
      attrs: parseAttributes(match[3] || ""),
      children: [],
      parent: stack[stack.length - 1],
      text: "",
      index: 0,
    };
    node.parent.children.push(node);
    if (!VOID.has(tag) && !match[4]) stack.push(node);
  }
  return { root, styles };
}

function parseDeclarations(source) {
  const decls = {};
  for (const part of splitTop(source, ";")) {
    const index = part.indexOf(":");
    if (index < 0) continue;
    const key = part.slice(0, index).trim().toLowerCase();
    const value = part.slice(index + 1).trim();
    if (key) decls[key] = value;
  }
  return decls;
}

function parseCss(css) {
  const rules = [];
  let order = 0;
  const walk = (source) => {
    let i = 0;
    while (i < source.length) {
      while (i < source.length && /\s/.test(source[i])) i += 1;
      if (source[i] === "}" ) { i += 1; continue; }
      let start = i;
      let depth = 0; let quote = null;
      while (i < source.length) {
        const char = source[i];
        if (quote) { if (char === quote) quote = null; i += 1; continue; }
        if (char === '"' || char === "'") { quote = char; i += 1; continue; }
        if (char === "{" && depth === 0) break;
        i += 1;
      }
      if (i >= source.length) break;
      const prelude = source.slice(start, i).trim();
      let bodyStart = i + 1;
      depth = 1; quote = null;
      i = bodyStart;
      while (i < source.length && depth > 0) {
        const char = source[i];
        if (quote) { if (char === quote) quote = null; i += 1; continue; }
        if (char === '"' || char === "'") { quote = char; i += 1; continue; }
        if (char === "{") depth += 1;
        if (char === "}") depth -= 1;
        i += 1;
      }
      const body = source.slice(bodyStart, i - 1);
      if (/^@(media|supports|layer)\b/i.test(prelude)) walk(body);
      else if (!prelude.startsWith("@")) {
        for (const selector of splitTop(prelude)) {
          if (!selector || /::?(before|after|placeholder|selection|marker)\b/i.test(selector)) continue;
          if (/:(hover|active|visited|focus|focus-visible|focus-within|target)\b/i.test(selector)) continue;
          rules.push({ selector, decls: parseDeclarations(body), order: order += 1 });
        }
      }
    }
  };
  walk(css.replace(/\/\*[\s\S]*?\*\//g, ""));
  return rules;
}

function cleanSelector(selector) {
  return selector
    .replace(/:{1,2}[\w-]+(\([^)]*\))?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function selectivity(selector) {
  const ids = (selector.match(/#[\w-]+/g) || []).length;
  const classes = (selector.match(/\.[\w-]+|\[[^\]]+\]/g) || []).length;
  const tags = (selector.match(/(^|[\s>+~])([a-zA-Z][\w-]*)/g) || []).length;
  return ids * 100 + classes * 10 + tags;
}

function simpleMatch(node, simple) {
  let attrsOk = true;
  const text = simple.replace(/\[([^=\]]+)(?:=["']?([^"'\]]*)["']?)?\]/g, (_, name, value) => {
    const actual = node.attrs[name.toLowerCase()];
    if (actual === undefined) { attrsOk = false; return ""; }
    if (value !== undefined && actual !== value) { attrsOk = false; }
    return "";
  });
  if (!attrsOk) return false;
  const id = text.match(/#([\w-]+)/);
  if (id && node.attrs.id !== id[1]) return false;
  const classes = [...text.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
  const actual = new Set((node.attrs.class || "").split(/\s+/).filter(Boolean));
  if (classes.some((name) => !actual.has(name))) return false;
  const wantedTag = text.match(/^([a-zA-Z][\w-]*)/);
  if (wantedTag && wantedTag[1].toLowerCase() !== node.tag) return false;
  return true;
}

function matchesSelector(node, selector) {
  const cleaned = cleanSelector(selector);
  if (!cleaned) return false;
  if (cleaned === "*") return true;
  if (cleaned === ":root") return node.tag === "html";
  const parts = cleaned.split(/\s*[>+~]\s*|\s+/).filter(Boolean);
  if (!parts.length) return false;
  if (!simpleMatch(node, parts[parts.length - 1])) return false;
  let cursor = node.parent;
  for (let i = parts.length - 2; i >= 0; i -= 1) {
    let found = false;
    while (cursor && cursor.tag !== "#root") {
      if (simpleMatch(cursor, parts[i])) { found = true; cursor = cursor.parent; break; }
      cursor = cursor.parent;
    }
    if (!found) return false;
  }
  return true;
}

function camelKey(key) {
  const cleaned = key.startsWith("-") ? key.slice(1) : key;
  return cleaned.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function expandStyle(input) {
  const out = {};
  for (const [key, value] of Object.entries(input)) out[camelKey(key)] = value;
  if (out.background !== undefined) {
    if (/gradient/i.test(out.background)) out.backgroundImage = out.background;
    else if (!/^(none|transparent|initial|inherit)$/i.test(out.background) && out.backgroundColor === undefined) out.backgroundColor = out.background;
  }
  if (out.border !== undefined && !/^(none|0)$/i.test(out.border)) {
    const width = out.border.match(/-?\d*\.?\d+px/)?.[0];
    const color = out.border.match(/(?:rgba?|hsla?)\([^)]*\)|#[0-9a-f]{3,8}\b/gi)?.[0];
    if (out.borderTopWidth === undefined && width) out.borderTopWidth = width;
    if (out.borderTopColor === undefined && color) out.borderTopColor = color;
  }
  if (out.padding !== undefined && out.paddingTop === undefined) {
    const parts = out.padding.trim().split(/\s+/);
    const [top, right = top, bottom = top, left = right] = parts;
    out.paddingTop = top; out.paddingRight = right; out.paddingBottom = bottom; out.paddingLeft = left;
  }
  if (out.transition !== undefined && out.transitionProperty === undefined) {
    const time = out.transition.match(/-?\d*\.?\d+m?s\b/)?.[0];
    if (time && out.transitionDuration === undefined) out.transitionDuration = time;
    out.transitionProperty = out.transition
      .replace(/\s*-?\d*\.?\d+m?s\b/g, "")
      .replace(/\s*(ease-in-out|ease-in|ease-out|ease|linear|step-start|step-end|steps\([^)]*\))/gi, "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .join(", ") || "none";
  }
  if (out.animation !== undefined) {
    const tokens = out.animation.split(/[\s,]+/).filter(Boolean);
    if (out.animationName === undefined) out.animationName = tokens.find((token) => !/^-?\d*\.?\d+m?s$/.test(token) && !/^(infinite|normal|reverse|alternate|alternate-reverse|none|forwards|backwards|both|running|paused|linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end)$/.test(token)) || "none";
    if (out.animationIterationCount === undefined) out.animationIterationCount = /infinite/.test(out.animation) ? "infinite" : "1";
  }
  if (out.webkitBackgroundClip !== undefined && out.backgroundClip === undefined) out.backgroundClip = out.webkitBackgroundClip;
  if (out.webkitBackdropFilter !== undefined && out.backdropFilter === undefined) out.backdropFilter = out.webkitBackdropFilter;
  return out;
}

function resolveVars(value, vars, depth = 0) {
  if (depth > 6 || !value || !String(value).includes("var(")) return value;
  return String(value).replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g, (_, name, fallback) => {
    const found = vars[name];
    if (found !== undefined) return resolveVars(found, vars, depth + 1);
    return fallback ? resolveVars(fallback.trim(), vars, depth + 1) : "";
  });
}

function buildStatic(html) {
  const { root, styles } = parseHtml(html);
  const cssText = styles.join("\n");
  const rules = parseCss(cssText);
  const focusVisible = /:focus(-visible)?\b/.test(cssText);
  const rootVars = {};
  for (const rule of rules) {
    if (!/:root\b/.test(rule.selector)) continue;
    for (const [key, value] of Object.entries(rule.decls)) if (key.startsWith("--")) rootVars[key] = value;
  }
  const elements = [];
  const walk = (node, parentIndex, inheritedVars, hiddenByParent) => {
    for (const child of node.children) {
      if (child.tag === "#root") continue;
      const vars = { ...inheritedVars };
      const declared = {};
      for (const name of Object.keys(child.attrs)) if (name.startsWith("--")) vars[name] = child.attrs[name];
      const matched = rules.filter((rule) => matchesSelector(child, rule.selector))
        .sort((a, b) => selectivity(a.selector) - selectivity(b.selector) || a.order - b.order);
      for (const rule of matched) {
        for (const [key, value] of Object.entries(rule.decls)) {
          if (key.startsWith("--")) { vars[key] = value; continue; }
          declared[camelKey(key)] = value;
        }
      }
      for (const [key, value] of Object.entries(parseDeclarations(child.attrs.style || ""))) {
        if (key.startsWith("--")) vars[key] = value;
        else declared[camelKey(key)] = value;
      }
      const style = {};
      for (const [key, value] of Object.entries(expandStyle(declared))) style[key] = resolveVars(value, vars);
      const parentStyle = parentIndex >= 0 ? elements[parentIndex].inheritedStyle || {} : {};
      for (const key of ["color", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textTransform", "textAlign"]) {
        if (style[key] !== undefined && style[key] !== "inherit") continue;
        if (parentStyle[key] !== undefined) style[key] = parentStyle[key];
      }
      const display = style.display || (INLINE.has(child.tag) ? "inline" : "block");
      const hidden = hiddenByParent || display === "none" || style.visibility === "hidden";
      const suspect = style.opacity === "0";
      const classes = (child.attrs.class || "").split(/\s+/).filter(Boolean);
      const record = {
        tag: child.tag,
        attrs: child.attrs,
        classes,
        classesStr: classes.slice().sort().join(" "),
        selector: makeStaticSelector(child),
        style,
        rect: null,
        text: child.text.replace(/\s+/g, " ").trim(),
        hidden,
        suspect,
        parentIndex,
        childCount: child.children.length,
        depth: parentIndex < 0 ? 0 : elements[parentIndex].depth + 1,
        inheritedStyle: {
          color: style.color, fontSize: style.fontSize, fontWeight: style.fontWeight,
          lineHeight: style.lineHeight, letterSpacing: style.letterSpacing,
          textTransform: style.textTransform, textAlign: style.textAlign,
        },
      };
      const index = elements.length;
      elements.push(record);
      child.index = index;
      walk(child, index, vars, hidden);
    }
  };
  walk(root, -1, rootVars, false);
  return { elements, focusVisible, cssText, rules };
}

function makeStaticSelector(node) {
  const pieces = [];
  let cursor = node;
  while (cursor && cursor.tag !== "#root") {
    let piece = cursor.tag;
    if (cursor.attrs.id) piece += `#${cursor.attrs.id}`;
    else {
      const classes = (cursor.attrs.class || "").split(/\s+/).filter(Boolean).slice(0, 2);
      piece += classes.map((name) => `.${name}`).join("");
    }
    pieces.unshift(piece);
    cursor = cursor.parent;
    if (pieces.length >= 3) break;
  }
  return pieces.join(" ");
}

/* ------------------------------------------------------------------ */
/* DOM collector (Playwright)                                          */
/* ------------------------------------------------------------------ */

async function loadPlaywright(explicit) {
  const candidates = [];
  if (explicit) {
    const base = resolve(explicit);
    if (existsSync(base) && statSync(base).isDirectory()) {
      for (const entry of ["index.mjs", "index.js", "package.json"]) {
        const file = join(base, entry);
        if (existsSync(file)) candidates.push(pathToFileURL(file).href);
      }
    } else if (existsSync(base)) {
      candidates.push(pathToFileURL(base).href);
    } else {
      candidates.push(explicit);
    }
  }
  candidates.push("playwright", "playwright-core");
  for (const name of candidates) {
    try {
      const module = await import(name);
      return module.chromium ? module : module.default;
    } catch { /* next */ }
  }
  return null;
}

async function collectDom(target, options) {
  const chromiumModule = await loadPlaywright(options.playwright);
  if (!chromiumModule) return null;
  const browser = await chromiumModule.chromium.launch({
    executablePath: options.chrome || undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: options.width, height: options.height },
      colorScheme: options.theme,
    });
    const url = /^https?:/.test(target) ? target : pathToFileURL(resolve(target)).href;
    await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(250);
    const data = await page.evaluate(() => {
      const visible = [];
      const texts = [];
      const hiddenSelectors = [];
      let suspectHidden = 0;
      let cssText = "";
      let focusVisible = false;
      try {
        for (const sheet of document.styleSheets) {
          try {
            for (const rule of sheet.cssRules) cssText += `${rule.cssText}\n`;
          } catch { /* cross-origin */ }
        }
      } catch { /* no sheets */ }
      focusVisible = /:focus(-visible)?\b/.test(cssText);
      const selectorFor = (el) => {
        if (el.id) return `${el.tagName.toLowerCase()}#${CSS.escape(el.id)}`;
        let value = el.tagName.toLowerCase();
        const classes = [...el.classList].slice(0, 2);
        if (classes.length) value += classes.map((name) => `.${CSS.escape(name)}`).join("");
        return value;
      };
      const colorOf = (value) => value;
      const all = [...document.body.querySelectorAll("*")];
      const indexOf = new Map();
      for (const el of all) {
        const tag = el.tagName.toLowerCase();
        if (["script", "style", "noscript", "template", "link", "meta"].includes(tag)) continue;
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const hidden = style.display === "none" || style.visibility === "hidden";
        const suspect = style.opacity === "0";
        if (hidden) hiddenSelectors.push(selectorFor(el));
        if (suspect) suspectHidden += 1;
        const parent = el.parentElement && indexOf.has(el.parentElement) ? indexOf.get(el.parentElement) : -1;
        const record = {
          tag,
          selector: selectorFor(el),
          classesStr: [...el.classList].sort().join(" "),
          classes: [...el.classList],
          attrs: {
            alt: el.getAttribute("alt") || "",
            "aria-label": el.getAttribute("aria-label") || "",
            placeholder: el.getAttribute("placeholder") || "",
            title: el.getAttribute("title") || "",
            role: el.getAttribute("role") || "",
            type: el.getAttribute("type") || "",
          },
          style: {
            color: colorOf(style.color),
            backgroundColor: colorOf(style.backgroundColor),
            backgroundImage: style.backgroundImage,
            backgroundClip: style.backgroundClip || style.webkitBackgroundClip,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            letterSpacing: style.letterSpacing,
            textTransform: style.textTransform,
            textAlign: style.textAlign,
            borderTopColor: style.borderTopColor,
            borderBottomColor: style.borderBottomColor,
            borderLeftColor: style.borderLeftColor,
            borderRightColor: style.borderRightColor,
            borderTopWidth: style.borderTopWidth,
            borderRadius: style.borderTopLeftRadius,
            boxShadow: style.boxShadow,
            filter: style.filter,
            backdropFilter: style.backdropFilter || style.webkitBackdropFilter,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            animationName: style.animationName,
            animationIterationCount: style.animationIterationCount,
            transitionProperty: style.transitionProperty,
            transitionDuration: style.transitionDuration,
            transform: style.transform,
            gridTemplateColumns: style.gridTemplateColumns,
            flexDirection: style.flexDirection,
            justifyContent: style.justifyContent,
            alignItems: style.alignItems,
            paddingTop: style.paddingTop,
            paddingBottom: style.paddingBottom,
            paddingLeft: style.paddingLeft,
            paddingRight: style.paddingRight,
            position: style.position,
            overflow: style.overflow,
          },
          rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
          hidden,
          suspect,
          parentIndex: parent,
          childCount: el.children.length,
        };
        const direct = [...el.childNodes]
          .filter((node) => node.nodeType === 3)
          .map((node) => node.textContent)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (direct) record.text = direct;
        const index = visible.length;
        indexOf.set(el, index);
        visible.push(record);
        if (direct && !hidden) {
          let background = null;
          let cursor = el;
          while (cursor) {
            const computed = getComputedStyle(cursor);
            const color = computed.backgroundColor;
            if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent") { background = color; break; }
            cursor = cursor.parentElement;
          }
          texts.push({
            selector: selectorFor(el), tag, text: direct, source: "text",
            fontSize: style.fontSize, fontWeight: style.fontWeight, letterSpacing: style.letterSpacing,
            textTransform: style.textTransform, textAlign: style.textAlign,
            color: style.color, background: background || "rgb(255, 255, 255)",
            backgroundImage: style.backgroundImage,
          });
        }
        for (const name of ["alt", "aria-label", "placeholder", "title"]) {
          const value = (record.attrs[name] || "").replace(/\s+/g, " ").trim();
          if (value && !hidden) texts.push({
            selector: selectorFor(el), tag, text: value, source: name,
            fontSize: style.fontSize, fontWeight: style.fontWeight, letterSpacing: style.letterSpacing,
            textTransform: style.textTransform, textAlign: style.textAlign, color: style.color,
            background: "rgb(255, 255, 255)", backgroundImage: "none",
          });
        }
      }
      return {
        elements: visible, texts, hiddenSelectors, suspectHidden, focusVisible,
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        bodyText: (document.body.innerText || "").slice(0, 20_000),
      };
    });
    return { ...data, mode: "dom", confidence: 1 };
  } finally {
    await browser.close();
  }
}

/* ------------------------------------------------------------------ */
/* image mode: minimal PNG decoder + pixel heuristics                  */
/* ------------------------------------------------------------------ */

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("not a PNG file");
  let offset = 8; let width = 0; let height = 0;
  let bitDepth = 8; let colorType = 6; let interlace = 0;
  let palette = null; let transparency = null;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("latin1", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === "PLTE") {
      palette = [];
      for (let i = 0; i < data.length; i += 3) palette.push([data[i], data[i + 1], data[i + 2]]);
    } else if (type === "tRNS") {
      transparency = data;
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") break;
  }
  if (!width || !height) throw new Error("PNG has no size");
  if (interlace !== 0) throw new Error("interlaced PNG is not supported; export a normal PNG");
  if (bitDepth !== 8 && bitDepth !== 16) throw new Error("only 8 or 16 bit PNG is supported");
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`unsupported PNG color type ${colorType}`);
  const raw = inflateSync(Buffer.concat(idat));
  const bytesPerPixel = channels * (bitDepth / 8);
  const stride = width * bytesPerPixel;
  const pixels = Buffer.alloc(height * stride);
  let cursor = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[cursor]; cursor += 1;
    const line = raw.subarray(cursor, cursor + stride); cursor += stride;
    const previous = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x += 1) {
      const left = x >= bytesPerPixel ? out[x - bytesPerPixel] : 0;
      const up = previous[x];
      const upLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
      let value = line[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += Math.floor((left + up) / 2);
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left); const pb = Math.abs(p - up); const pc = Math.abs(p - upLeft);
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      out[x] = value & 0xff;
    }
  }
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 220_000)));
  const points = [];
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const at = y * stride + x * bytesPerPixel;
      let r; let g; let b; let a = 255;
      if (bitDepth === 16) {
        if (colorType === 6) {
          r = pixels[at]; g = pixels[at + 2]; b = pixels[at + 4]; a = pixels[at + 6];
        } else if (colorType === 2) {
          r = pixels[at]; g = pixels[at + 2]; b = pixels[at + 4];
        } else if (colorType === 4) {
          r = g = b = pixels[at]; a = pixels[at + 2];
        } else {
          r = g = b = pixels[at];
        }
      } else if (colorType === 6) {
        r = pixels[at]; g = pixels[at + 1]; b = pixels[at + 2]; a = pixels[at + 3];
      } else if (colorType === 2) {
        r = pixels[at]; g = pixels[at + 1]; b = pixels[at + 2];
      } else if (colorType === 0) {
        r = g = b = pixels[at];
      } else if (colorType === 4) {
        r = g = b = pixels[at]; a = pixels[at + 1];
      } else if (colorType === 3) {
        const entry = palette?.[pixels[at]] || [0, 0, 0];
        [r, g, b] = entry; a = transparency?.[pixels[at]] ?? 255;
      }
      points.push({ x, y, r, g, b, a });
    }
  }
  return { width, height, points, step };
}

function scanImage(target) {
  const buffer = readFileSync(target);
  const { width, height, points, step } = decodePng(buffer);
  let saturated = 0; let purple = 0; let coloredGlow = 0;
  const hueCounts = new Map();
  for (const point of points) {
    const { h, s, l } = rgbToHsl(point);
    if (s > 0.35 && l > 0.18 && l < 0.88) {
      saturated += 1;
      const bucket = Math.round(h / 30) % 12;
      hueCounts.set(bucket, (hueCounts.get(bucket) || 0) + 1);
      if (h >= 235 && h <= 305) purple += 1;
    }
    if (s > 0.55 && l > 0.3 && l < 0.75) coloredGlow += 1;
  }
  const total = points.length || 1;
  const purpleShare = purple / total;
  const distinctHues = [...hueCounts.values()].filter((count) => count / total >= 0.005).length;
  let soft = 0; let edges = 0;
  const grid = new Map(points.map((point) => [`${point.x},${point.y}`, point]));
  for (const point of points) {
    const right = grid.get(`${point.x + step},${point.y}`);
    const down = grid.get(`${point.x},${point.y + step}`);
    if (!right || !down) continue;
    const value = (p) => 0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b;
    const dx = value(right) - value(point);
    const dy = value(down) - value(point);
    const magnitude = Math.hypot(dx, dy);
    if (magnitude > 1 && magnitude < 10) soft += 1;
    if (magnitude >= 10) edges += 1;
  }
  const softShare = soft / total;
  const signals = [];
  const push = (id, name, category, weight, severity, detail, selector) => {
    if (severity <= 0.02) return;
    signals.push({
      id, name, category, weight,
      severity: Number(severity.toFixed(3)),
      penalty: Number((weight * severity).toFixed(2)),
      evidence: [{ selector, detail }],
      measured: {},
    });
  };
  push("A1", "purple or blue gradient spread", "color", 6,
    clamp((purpleShare - 0.02) / 0.18), `${(purpleShare * 100).toFixed(1)}% of pixels are saturated violet/blue`, "pixels");
  push("A3", "saturated color glow", "color", 5,
    clamp((coloredGlow / total - 0.01) / 0.12), `${((coloredGlow / total) * 100).toFixed(1)}% of pixels are saturated mid-tones`, "pixels");
  push("A4", "soft blur everywhere", "color", 4,
    clamp((softShare - 0.2) / 0.5), `${(softShare * 100).toFixed(1)}% of sampled pixels sit in soft gradients`, "pixels");
  push("A7", "hue chaos", "color", 3,
    clamp((distinctHues - 4) / 6), `${distinctHues} distinct saturated hue buckets above 0.5%`, "pixels");
  const categories = {};
  for (const name of CATEGORIES) categories[name] = { slop: 0, max: CATEGORY_MAX[name] };
  for (const signal of signals) categories[signal.category].slop += signal.penalty;
  let slop = 0;
  for (const name of CATEGORIES) {
    categories[name].slop = Number(Math.min(CATEGORY_MAX[name], categories[name].slop).toFixed(1));
    slop += categories[name].slop;
  }
  slop = Math.round(clamp(slop, 0, 100));
  return {
    rubric: RUBRIC, tool: "trueline", toolVersion: TOOL_VERSION,
    input: target, mode: "image", confidence: 0.45,
    viewport: `${width}x${height}`, theme: "unknown",
    slop, design: 100 - slop, categories, signals, waived: [],
    notes: [
      "Image mode estimates colour and softness only; selectors, copy, contrast and accessibility need DOM mode.",
      "Decoded locally with node:zlib. No pixel leaves the machine.",
    ],
    meta: { sampledPixels: total, width, height, durationMs: 0 },
  };
}

/* ------------------------------------------------------------------ */
/* normalization                                                       */
/* ------------------------------------------------------------------ */

function normalizeElement(record, staticMode) {
  const raw = record.style || {};
  const fontSize = parseLength(raw.fontSize, 16) ?? 16;
  const lineHeight = raw.lineHeight === "normal" ? Math.round(fontSize * 1.4) : parseLength(raw.lineHeight, fontSize) ?? fontSize * 1.4;
  const color = parseColor(raw.color) || { r: 0, g: 0, b: 0, a: 1 };
  const backgroundColor = parseColor(raw.backgroundColor) || { r: 0, g: 0, b: 0, a: 0 };
  const bgImage = raw.backgroundImage && raw.backgroundImage !== "none" ? raw.backgroundImage : "";
  const borderColor = parseColor(raw.borderTopColor) || parseColor(raw.borderLeftColor) || { r: 0, g: 0, b: 0, a: 0 };
  const borderWidth = parseLength(raw.borderTopWidth, fontSize) ?? 0;
  const radius = parseLength(raw.borderRadius, fontSize) ?? 0;
  return {
    ...record,
    staticMode,
    fontSize,
    fontWeight: Number(raw.fontWeight) || (String(raw.fontWeight) === "bold" ? 700 : 400),
    lineHeight,
    letterSpacing: raw.letterSpacing === "normal" ? 0 : parseLength(raw.letterSpacing, fontSize) ?? 0,
    color,
    backgroundColor,
    bgImage,
    borderColor,
    borderWidth,
    radius,
    radiusIsPercent: String(raw.borderRadius || "").includes("%"),
    shadows: shadowList(raw.boxShadow),
    filters: shadowList((raw.filter || "").replace("drop-shadow", "")),
    backdrop: /blur\(/i.test(raw.backdropFilter || ""),
    textTransform: raw.textTransform || "none",
    textAlign: raw.textAlign || "start",
    display: raw.display || "block",
    opacity: raw.opacity === undefined ? 1 : Number(raw.opacity),
    animationName: raw.animationName || "none",
    animationIteration: raw.animationIterationCount || "1",
    transitionProperty: raw.transitionProperty || "none",
    transitionMs: parseTime(raw.transitionDuration),
    transform: raw.transform || "none",
    gridTemplateColumns: raw.gridTemplateColumns || "none",
    flexDirection: raw.flexDirection || "row",
    justifyContent: raw.justifyContent || "normal",
    alignItems: raw.alignItems || "normal",
    paddingTop: parseLength(raw.paddingTop, fontSize) ?? 0,
    paddingBottom: parseLength(raw.paddingBottom, fontSize) ?? 0,
    paddingLeft: parseLength(raw.paddingLeft, fontSize) ?? 0,
    paddingRight: parseLength(raw.paddingRight, fontSize) ?? 0,
    area: record.rect ? record.rect.w * record.rect.h : null,
    gradient: gradientColors(bgImage),
  };
}

function normalizeText(sample, fallbackBg) {
  const fontSize = parseLength(sample.fontSize, 16) ?? 16;
  const color = (sample.color && typeof sample.color === "object" ? sample.color : parseColor(sample.color)) || { r: 0, g: 0, b: 0, a: 1 };
  const background = (sample.background && typeof sample.background === "object" ? sample.background : parseColor(sample.background))
    || (fallbackBg && typeof fallbackBg === "object" ? fallbackBg : parseColor(fallbackBg))
    || { r: 255, g: 255, b: 255, a: 1 };
  return {
    ...sample,
    fontSize,
    fontWeight: Number(sample.fontWeight) || 400,
    letterSpacing: sample.letterSpacing === "normal" || sample.letterSpacing === undefined ? 0 : parseLength(sample.letterSpacing, fontSize) ?? 0,
    textTransform: sample.textTransform || "none",
    color,
    background,
    backgroundImage: sample.backgroundImage || "",
    ratio: contrast(color, background),
  };
}

/* ------------------------------------------------------------------ */
/* signals                                                             */
/* ------------------------------------------------------------------ */

function severityCount(count, threshold) {
  return clamp(count / Math.max(1, threshold));
}

function severityRatio(value, low, high) {
  return clamp((value - low) / Math.max(0.0001, high - low));
}

function hasVisibleText(record) {
  return record.text && record.text.length > 0;
}

function surfaceLike(record, staticMode) {
  if (record.hidden) return false;
  if (staticMode) return ["div", "section", "article", "li", "a", "main", "aside", "header"].includes(record.tag) && record.childCount > 0;
  return record.area !== null && record.area >= 8_000 && (record.backgroundColor.a > 0.02 || record.bgImage || record.shadows.length || record.borderWidth > 0);
}

function categoryOf(id) {
  if (id.startsWith("A")) return "color";
  if (id.startsWith("B")) return "layout";
  if (id.startsWith("C")) return "type";
  if (id.startsWith("D")) return "copy";
  if (id.startsWith("E")) return "contrast";
  return "motion";
}

function runSignals(context) {
  const { elements, texts, staticMode, focusVisible, imageStats } = context;
  const visibleElements = elements.filter((element) => !element.hidden && (staticMode || (element.area ?? 0) > 0));
  const visibleTexts = texts.filter((text) => text.text && text.text.trim().length > 0);
  const surfaces = visibleElements.filter((element) => surfaceLike(element, staticMode));
  const signals = [];
  const add = (id, name, severity, evidence, measured = {}) => {
    if (severity === null || severity === undefined || severity <= 0.02) return;
    const weight = DEFAULT_WEIGHTS[id];
    signals.push({
      id, name, category: categoryOf(id), weight,
      severity: Number(clamp(severity).toFixed(3)),
      penalty: Number((weight * clamp(severity)).toFixed(2)),
      evidence: evidence.slice(0, 5),
      measured,
    });
  };

  /* A — color */
  const gradientSurfaces = visibleElements.filter((element) => {
    if (!element.gradient || element.backgroundClip === "text") return false;
    const saturated = element.gradient.map(rgbToHsl).filter((hsl) => hsl.s > 0.25 && hsl.l > 0.15 && hsl.l < 0.9);
    if (saturated.length < 2) return false;
    const hues = saturated.map((hsl) => hsl.h);
    const purple = hues.some((hue) => hue >= 235 && hue <= 305);
    const spread = Math.max(...hues) - Math.min(...hues);
    return purple && spread >= 20;
  }).filter((element) => staticMode || !element.area || element.area >= 4_000);
  add("A1", "purple or blue gradient surface", gradientSurfaces.length ? clamp(0.65 + 0.1 * gradientSurfaces.length) : 0,
    gradientSurfaces.map((element) => ({ selector: element.selector, detail: element.bgImage.slice(0, 140) })),
    { count: gradientSurfaces.length });

  const gradientText = visibleElements.filter((element) => !element.hidden && /text/.test(element.style.backgroundClip || "") && hasVisibleText(element));
  add("A2", "gradient text", gradientText.length ? clamp(0.6 + 0.15 * gradientText.length) : 0,
    gradientText.map((element) => ({ selector: element.selector, detail: `background-clip: text; ${element.bgImage.slice(0, 100)}` })),
    { count: gradientText.length });

  const glows = visibleElements.filter((element) => {
    const all = [...element.shadows, ...element.filters];
    return all.some((shadow) => shadow.saturation > 0.45 && shadow.color.a >= 0.15 && shadow.blur >= 12);
  });
  add("A3", "saturated glow", glows.length ? clamp(0.55 + 0.15 * glows.length) : 0,
    glows.map((element) => ({ selector: element.selector, detail: (element.style.boxShadow || element.style.filter || "").slice(0, 140) })),
    { count: glows.length });

  const softShadows = surfaces.filter((element) => element.shadows.some((shadow) => shadow.blur >= 16 && shadow.color.a <= 0.35));
  const shadowShare = surfaces.length ? softShadows.length / surfaces.length : 0;
  add("A4", "soft shadow on every surface", severityRatio(shadowShare, 0.35, 0.9),
    softShadows.slice(0, 5).map((element) => ({ selector: element.selector, detail: element.style.boxShadow?.slice(0, 120) || "" })),
    { surfaces: surfaces.length, withSoftShadow: softShadows.length, share: Number(shadowShare.toFixed(2)) });

  const neon = visibleElements.filter((element) => {
    const hsl = rgbToHsl(element.borderColor);
    const distance = Math.hypot(element.borderColor.r - element.backgroundColor.r, element.borderColor.g - element.backgroundColor.g, element.borderColor.b - element.backgroundColor.b);
    const visibleAgainstSurface = element.backgroundColor.a < 0.2 || distance > 60;
    return element.borderWidth >= 1 && hsl.s > 0.5 && element.borderColor.a > 0.4 && visibleAgainstSurface && (staticMode || (element.area ?? 0) > 1_000);
  });
  add("A5", "saturated border", severityCount(neon.length, 3) * 0.8,
    neon.map((element) => ({ selector: element.selector, detail: `${element.style.borderTopWidth} ${element.style.borderTopColor}` })),
    { count: neon.length });

  const glass = visibleElements.filter((element) => element.backdrop && element.backgroundColor.a > 0 && element.backgroundColor.a < 0.9);
  add("A6", "glassmorphism", glass.length ? clamp(0.55 + 0.15 * glass.length) : 0,
    glass.map((element) => ({ selector: element.selector, detail: `backdrop-filter: ${element.style.backdropFilter}` })),
    { count: glass.length });

  const chromeHues = new Set();
  for (const element of visibleElements) {
    if (staticMode || (element.area ?? 0) > 2_000) {
      const color = element.backgroundColor;
      const hsl = rgbToHsl(color);
      if (color.a > 0.3 && hsl.s > 0.35 && hsl.l > 0.1 && hsl.l < 0.9) chromeHues.add(Math.round(hsl.h / 30));
      const border = rgbToHsl(element.borderColor);
      if (element.borderWidth > 0 && element.borderColor.a > 0.3 && border.s > 0.4) chromeHues.add(Math.round(border.h / 30));
    }
  }
  add("A7", "many saturated hues in the chrome", severityRatio(chromeHues.size, 4, 8),
    [{ selector: "page", detail: `${chromeHues.size} distinct hue buckets: ${[...chromeHues].map((hue) => hue * 30).join(", ")}` }],
    { hues: chromeHues.size });

  /* B — layout */
  const groups = new Map();
  for (const element of visibleElements) {
    if (element.parentIndex < 0) continue;
    const key = element.parentIndex;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(element);
  }
  const identical = [];
  for (const [parentIndex, children] of groups) {
    if (children.length < 3) continue;
    const candidates = children.filter((child) => {
      if (child.tag === "a" || child.tag === "button") return false;
      if (staticMode) {
        return ["div", "article", "section", "li"].includes(child.tag) && child.childCount > 0 &&
          (child.backgroundColor.a > 0.05 || child.bgImage || child.borderWidth > 0 || child.shadows.length > 0);
      }
      return child.rect && child.rect.w >= 140 && child.rect.h >= 80 && child.childCount > 0 &&
        (child.backgroundColor.a > 0.05 || child.bgImage || child.borderWidth > 0 || child.shadows.length > 0);
    });
    if (candidates.length < 3) continue;
    const byShape = new Map();
    for (const child of candidates) {
      let key;
      if (!staticMode && child.rect) key = `${child.tag}|${Math.round(child.rect.w / 4)}x${Math.round(child.rect.h / 4)}|${Math.min(child.childCount, 4)}`;
      else key = `${child.tag}|${child.classesStr}|${Math.min(child.childCount, 3)}`;
      if (!byShape.has(key)) byShape.set(key, []);
      byShape.get(key).push(child);
    }
    for (const [, list] of byShape) {
      if (list.length >= 3) {
        identical.push({ parent: elements[parentIndex], children: list });
        break;
      }
    }
  }
  add("B1", "identical cards repeated", identical.length ? clamp(0.6 + 0.1 * identical.length) : 0,
    identical.slice(0, 3).map((group) => ({
      selector: group.parent.selector,
      detail: `${group.children.length} siblings share the same size and structure (${group.children[0].rect ? `${Math.round(group.children[0].rect.w)}x${Math.round(group.children[0].rect.h)}` : group.children[0].classesStr})`,
    })),
    { groups: identical.length });

  let threeColumn = 0;
  for (const element of visibleElements) {
    if (!element.hidden) {
      if (/repeat\(\s*3\s*,/.test(element.gridTemplateColumns) || /1fr\s+1fr\s+1fr/.test(element.gridTemplateColumns)) threeColumn += 1;
      else if (!staticMode && element.rect && element.childCount >= 3) {
        const children = visibleElements.filter((child) => child.parentIndex === elements.indexOf(element) && child.rect);
        if (children.length === 3) {
          const widths = children.map((child) => child.rect.w);
          const tops = children.map((child) => child.rect.y);
          const horizontal = Math.max(...tops) - Math.min(...tops) <= 8;
          if (horizontal && Math.max(...widths) - Math.min(...widths) <= 2 && widths[0] > 150) threeColumn += 1;
        }
      }
    }
  }
  add("B2", "three equal columns repeated", severityRatio(threeColumn, 1, 4) * (threeColumn >= 2 ? 1 : 0.6),
    [{ selector: "grid", detail: `${threeColumn} grid(s) with three equal columns` }],
    { grids: threeColumn });

  const headings = visibleTexts.filter((text) => ["h1", "h2"].includes(text.tag));
  const centeredHero = headings.find((heading) => heading.textAlign === "center" && (staticMode || heading.fontSize >= 28));
  add("B3", "centered stacked hero", centeredHero ? 0.75 : 0,
    centeredHero ? [{ selector: centeredHero.selector, detail: `text-align: center on "${centeredHero.text.slice(0, 60)}"` }] : [],
    {});

  let uniform = 0;
  if (staticMode) {
    const sections = visibleElements.filter((element) => element.tag === "section");
    const paddings = new Map();
    for (const section of sections) {
      const key = `${section.paddingTop}|${section.paddingBottom}|${section.display}`;
      paddings.set(key, (paddings.get(key) || 0) + 1);
    }
    uniform = [...paddings.values()].filter((count) => count >= 3).length;
  } else {
    const sections = visibleElements.filter((element) => element.tag === "section" && element.area > 20_000);
    const heights = new Map();
    for (const section of sections) {
      const key = `${section.paddingTop}|${section.paddingBottom}|${Math.round((section.rect?.h || 0) / 40)}`;
      heights.set(key, (heights.get(key) || 0) + 1);
    }
    uniform = [...heights.values()].filter((count) => count >= 3).length;
  }
  add("B4", "uniform section rhythm", uniform ? 0.7 : 0,
    uniform ? [{ selector: "sections", detail: `${uniform} repeated section shape(s)` }] : [], {});

  const controls = visibleElements.filter((element) => ["button", "a", "input", "select", "textarea"].includes(element.tag) || element.attrs.role === "button");
  const pills = controls.filter((control) => {
    if (staticMode) return control.radius >= 200 || control.radiusIsPercent && control.radius >= 40;
    return control.rect && control.rect.h > 0 && control.radius >= control.rect.h / 2 - 1;
  });
  const pillShare = controls.length ? pills.length / controls.length : 0;
  add("B5", "everything is a pill", controls.length >= 3 ? severityRatio(pillShare, 0.6, 1) : 0,
    pills.slice(0, 3).map((control) => ({ selector: control.selector, detail: `border-radius: ${control.style.borderRadius}` })),
    { controls: controls.length, pills: pills.length, share: Number(pillShare.toFixed(2)) });

  /* C — type */
  const meaningful = visibleTexts.filter((text) => text.source === "text" && text.text.length >= 3);
  const sizes = [...new Set(meaningful.map((text) => Math.round(text.fontSize)))].sort((a, b) => a - b);
  let hierarchy = 0;
  if (meaningful.length >= 3) {
    if (sizes.length === 1) hierarchy = 1;
    else {
      const ratio = sizes[sizes.length - 1] / sizes[0];
      hierarchy = Math.max(severityRatio(1.4 - ratio, 0, 0.6), sizes.length <= 2 && sizes[sizes.length - 1] < 30 ? 0.5 : 0);
    }
  }
  add("C1", "flat type hierarchy", hierarchy,
    [{ selector: "type", detail: `${sizes.length} size(s): ${sizes.join(", ")}px` }],
    { sizes });

  const weights = [...new Set(meaningful.map((text) => Math.round(text.fontWeight)))];
  add("C2", "too many type variants", Math.max(severityRatio(weights.length, 3, 6) * 0.7, severityRatio(sizes.length, 8, 12)),
    [{ selector: "type", detail: `${weights.length} weights, ${sizes.length} sizes` }],
    { weights, sizes });

  const tracked = visibleTexts.filter((text) => text.source === "text" && text.textTransform === "uppercase" && text.letterSpacing >= text.fontSize * 0.05 && text.text.length <= 48);
  add("C3", "uppercase tracked labels", severityCount(tracked.length, 4) * 0.85,
    tracked.slice(0, 4).map((text) => ({ selector: text.selector, detail: `"${text.text.slice(0, 40)}" ${text.letterSpacing}px tracking` })),
    { count: tracked.length });

  const bodyTexts = meaningful.filter((text) => text.text.length >= 60);
  const smallBody = bodyTexts.filter((text) => text.fontSize < 13);
  add("C4", "body text too small", bodyTexts.length ? severityRatio(smallBody.length / bodyTexts.length, 0.1, 0.6) : 0,
    smallBody.slice(0, 3).map((text) => ({ selector: text.selector, detail: `${text.fontSize}px: "${text.text.slice(0, 50)}"` })),
    { body: bodyTexts.length, small: smallBody.length });

  const tight = meaningful.filter((text) => text.letterSpacing < -0.2 && text.fontSize < 16);
  add("C5", "negative tracking on small text", severityCount(tight.length, 3) * 0.8,
    tight.slice(0, 3).map((text) => ({ selector: text.selector, detail: `${text.fontSize}px with ${text.letterSpacing}px tracking` })),
    { count: tight.length });

  /* D — copy */
  const allCopy = visibleTexts.map((text) => text.text).join("\n");
  const emoji = allCopy.match(/\p{Extended_Pictographic}/gu) || [];
  add("D1", "emoji in the interface", severityCount(emoji.length, 3),
    visibleTexts.filter((text) => /\p{Extended_Pictographic}/u.test(text.text)).slice(0, 4)
      .map((text) => ({ selector: text.selector, detail: `"${text.text.slice(0, 70)}"` })),
    { count: emoji.length });

  const hype = /(supercharge|seamless|unlock|magic|revolutioni[sz]e|game[- ]chang|unleash|elevate|effortless|cutting[- ]edge|next[- ]level|world[- ]class|welcome back|good morning|trusted by|loved by|\b10x\b|\bAI-powered\b)/i;
  const hypeHits = visibleTexts.filter((text) => hype.test(text.text) || /!/.test(text.text)).length;
  add("D2", "hype copy and greetings", severityCount(hypeHits, 4),
    visibleTexts.filter((text) => hype.test(text.text) || /!/.test(text.text)).slice(0, 4)
      .map((text) => ({ selector: text.selector, detail: `"${text.text.slice(0, 80)}"` })),
    { count: hypeHits });

  const fake = /(\[x\]|123,456|lorem ipsum|10,000\+|99\.99%|john doe|jane doe|acme corp|foo ?bar|insert (text|name)|your company|example\.com)/i;
  const fakeHits = visibleTexts.filter((text) => fake.test(text.text)).length;
  add("D3", "placeholder data presented as real", severityCount(fakeHits, 3),
    visibleTexts.filter((text) => fake.test(text.text)).slice(0, 4)
      .map((text) => ({ selector: text.selector, detail: `"${text.text.slice(0, 80)}"` })),
    { count: fakeHits });

  const wordy = visibleTexts.filter((text) => {
    const control = ["button", "a", "label"].includes(text.tag) || ["alt", "aria-label", "placeholder"].includes(text.source);
    if (!control) return false;
    const value = text.text.trim();
    return /\.$/.test(value) || /(search anything|enter your|type here|click here|learn more about|\.\.\.$)/i.test(value) || (text.tag === "button" && value.split(/\s+/).length > 8);
  });
  add("D4", "wordy labels and placeholders", severityCount(wordy.length, 4) * 0.8,
    wordy.slice(0, 4).map((text) => ({ selector: text.selector, detail: `"${text.text.slice(0, 70)}"` })),
    { count: wordy.length });

  /* E — contrast */
  const measured = visibleTexts.filter((text) => text.source === "text" && text.text.length >= 3 && text.source !== "alt" && !/gradient/.test(text.backgroundImage));
  const normalText = measured.filter((text) => text.fontSize > 13 && !(text.fontSize >= 24 || (text.fontSize >= 18.66 && text.fontWeight >= 700)));
  const normalFails = normalText.filter((text) => text.ratio !== null && text.ratio < 4.5);
  add("E1", "unreadable body text", severityCount(normalFails.length, 5),
    normalFails.slice(0, 5).map((text) => ({ selector: text.selector, detail: `${text.ratio.toFixed(2)}:1 "${text.text.slice(0, 50)}"` })),
    { checked: normalText.length, failing: normalFails.length });

  const metaTexts = measured.filter((text) => text.fontSize <= 13);
  const metaFails = metaTexts.filter((text) => text.ratio !== null && text.ratio < 3);
  add("E2", "unreadable meta text", severityCount(metaFails.length, 3),
    metaFails.slice(0, 4).map((text) => ({ selector: text.selector, detail: `${text.ratio.toFixed(2)}:1 "${text.text.slice(0, 50)}"` })),
    { checked: metaTexts.length, failing: metaFails.length });

  const smallTargets = controls.filter((control) => control.rect && control.rect.w > 0 && control.rect.h > 0 && control.rect.x > -1 && (control.rect.w < 24 || control.rect.h < 24));
  const focusSeverity = focusVisible ? 0 : 0.55;
  add("E3", "keyboard focus and small targets", focusSeverity + Math.min(0.45, smallTargets.length / 6 * 0.45),
    [
      ...(focusVisible ? [] : [{ selector: "css", detail: "no :focus-visible rule found" }]),
      ...smallTargets.slice(0, 2).map((control) => ({ selector: control.selector, detail: `${Math.round(control.rect.w)}x${Math.round(control.rect.h)} target` })),
    ],
    { focusVisible, smallTargets: smallTargets.length });

  /* F — motion */
  const loops = visibleElements.filter((element) => /pulse|ping|bounce|spin|breathe|shimmer|float|glow|blob/i.test(element.animationName) && /infinite/i.test(element.animationIteration) && !/live|status|recording/i.test(`${element.classesStr} ${element.selector} ${element.text || ""}`));
  add("F1", "decorative infinite animation", severityCount(loops.length, 3),
    loops.slice(0, 3).map((element) => ({ selector: element.selector, detail: `${element.animationName} infinite` })),
    { count: loops.length });

  const transitionAll = visibleElements.filter((element) => (/\ball\b/.test(element.transitionProperty) && element.transitionMs > 0) || /hover:scale/.test(element.classesStr));
  add("F2", "transition-all and hover scale", severityCount(transitionAll.length, 4),
    transitionAll.slice(0, 3).map((element) => ({ selector: element.selector, detail: element.style.transitionProperty })),
    { count: transitionAll.length });

  const layoutMotion = visibleElements.filter((element) => element.transitionMs > 0 && /(width|height|top|left|right|bottom|margin)/.test(element.transitionProperty));
  add("F3", "animated layout properties", severityCount(layoutMotion.length, 2),
    layoutMotion.slice(0, 3).map((element) => ({ selector: element.selector, detail: element.style.transitionProperty })),
    { count: layoutMotion.length });

  return { signals, stats: { elements: visibleElements.length, texts: visibleTexts.length, surfaces: surfaces.length } };
}

/* ------------------------------------------------------------------ */
/* waivers, scoring, compare                                           */
/* ------------------------------------------------------------------ */

function readWaivers(options, target) {
  const candidates = [];
  if (options.waivers) candidates.push(options.waivers);
  else {
    candidates.push(join(process.cwd(), "trueline.json"));
    if (target && !/^https?:/.test(target)) candidates.push(join(dirname(resolve(target)), "trueline.json"));
  }
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8"));
      const list = parsed.waivers || parsed.waive || [];
      return { file, list: Array.isArray(list) ? list : [] };
    } catch (error) {
      return { file, list: [], error: error.message };
    }
  }
  return { file: null, list: [] };
}

function applyWaivers(signals, waivers, max) {
  const used = [];
  const kept = [];
  for (const signal of signals) {
    const match = waivers.find((waiver) => waiver.id === signal.id && waiver.reason && waiver.reason.trim().length >= 8 &&
      (!waiver.selector || signal.evidence.some((item) => item.selector.includes(waiver.selector) || waiver.selector.includes(item.selector))));
    if (match && used.length < max) {
      used.push({ ...match, penalty: signal.penalty });
    } else kept.push(signal);
  }
  return { signals: kept, waived: used };
}

function score(signals) {
  const categories = {};
  for (const name of CATEGORIES) categories[name] = { slop: 0, max: CATEGORY_MAX[name] };
  for (const signal of signals) categories[signal.category].slop += signal.penalty;
  let slop = 0;
  for (const name of CATEGORIES) {
    categories[name].slop = Number(Math.min(CATEGORY_MAX[name], categories[name].slop).toFixed(1));
    slop += categories[name].slop;
  }
  return { slop: Math.round(clamp(slop, 0, 100)), design: 100 - Math.round(clamp(slop, 0, 100)), categories };
}

function compareSnapshots(before, after) {
  if (before.rubric !== after.rubric) {
    fail(`cannot compare rubric ${before.rubric} with rubric ${after.rubric}`, 3);
  }
  const beforeIds = new Set(before.signals.map((signal) => signal.id));
  const afterIds = new Set(after.signals.map((signal) => signal.id));
  const categories = {};
  for (const name of CATEGORIES) {
    const from = before.categories?.[name]?.slop ?? 0;
    const to = after.categories?.[name]?.slop ?? 0;
    categories[name] = { before: from, after: to, delta: Number((to - from).toFixed(1)) };
  }
  const removed = before.signals.filter((signal) => !afterIds.has(signal.id)).map((signal) => signal.id);
  const appeared = after.signals.filter((signal) => !beforeIds.has(signal.id)).map((signal) => signal.id);
  const remaining = after.signals.map((signal) => signal.id);
  const warnings = [];
  const hidden = new Set((after.hiddenSelectors || []).map((selector) => selector.toLowerCase()));
  const hiddenText = [...hidden].join(" ");
  for (const signal of before.signals) {
    if (!removed.includes(signal.id)) continue;
    for (const evidence of signal.evidence) {
      if (hiddenText.includes(evidence.selector.toLowerCase())) {
        warnings.push(`${signal.id} (${evidence.selector}) disappeared into display:none or visibility:hidden; hiding is not a fix.`);
      }
    }
  }
  return {
    before: { slop: before.slop, design: before.design },
    after: { slop: after.slop, design: after.design },
    slop: after.slop - before.slop,
    design: after.design - before.design,
    categories, removed, remaining, appeared, warnings,
  };
}

function humanReport(result) {
  const lines = [];
  const label = result.mode === "image" ? "image estimate" : result.mode === "static" ? "static parse" : "computed DOM";
  lines.push(`trueline ${result.slop}/100 slop  (design ${result.design})  ${label}, confidence ${result.confidence}`);
  for (const name of CATEGORIES) {
    lines.push(`  ${name.padEnd(9)} ${String(result.categories[name].slop).padStart(5)} / ${result.categories[name].max}`);
  }
  if (result.signals.length) {
    lines.push("  signals");
    for (const signal of [...result.signals].sort((a, b) => b.penalty - a.penalty)) {
      const where = signal.evidence[0]?.selector || "";
      lines.push(`    ${signal.id} ${String(signal.penalty).padStart(5)}  ${signal.name}${where ? ` — ${where}` : ""}`);
    }
  } else {
    lines.push("  no measurable slop signal");
  }
  if (result.waived?.length) {
    lines.push(`  waived: ${result.waived.map((waiver) => `${waiver.id} (${waiver.reason})`).join("; ")}`);
  }
  if (result.compare) {
    lines.push(`  before ${result.compare.before.slop} → after ${result.compare.after.slop} (${result.compare.slop >= 0 ? "+" : ""}${result.compare.slop})`);
    for (const warning of result.compare.warnings) lines.push(`  warning: ${warning}`);
  }
  for (const note of result.notes || []) lines.push(`  note: ${note}`);
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  const started = Date.now();
  const options = parseArgs(process.argv.slice(2));
  const target = options.target;
  const isUrl = /^https?:/.test(target);
  if (!isUrl && !existsSync(target)) fail(`no such file: ${target}`);
  if (!isUrl && !statSync(target).isFile()) fail(`${target} is not a file`);

  let result;
  if (options.image || /\.(png)$/i.test(target)) {
    try {
      result = scanImage(target);
    } catch (error) {
      fail(`image mode: ${error.message}`);
    }
  } else {
    let dom = null;
    if (!options.static && (isUrl || options.playwright || options.chrome || (await loadPlaywright(options.playwright)))) {
      try {
        dom = await collectDom(target, options);
      } catch (error) {
        console.error(`trueline: browser mode failed (${error.message}); falling back to static parsing`);
      }
    }
    let context;
    if (dom) {
      const elements = dom.elements.map((record) => normalizeElement(record, false));
      const texts = dom.texts.map((sample) => normalizeText(sample, dom.bodyBackground));
      context = { elements, texts, staticMode: false, focusVisible: dom.focusVisible, hiddenSelectors: dom.hiddenSelectors, suspectHidden: dom.suspectHidden, mode: "dom", confidence: 1 };
    } else {
      if (isUrl) fail("a live URL needs Playwright; install it or pass --playwright <folder>");
      const html = readFileSync(target, "utf8");
      const staticData = buildStatic(html);
      const elements = staticData.elements.map((record) => normalizeElement(record, true));
      const chainOf = (index) => {
        const chain = [];
        let cursor = index;
        while (cursor >= 0) { chain.unshift(cursor); cursor = elements[cursor].parentIndex; }
        return chain;
      };
      for (let index = 0; index < elements.length; index += 1) {
        let background = { r: 0, g: 0, b: 0, a: 0 };
        for (const parent of chainOf(index)) {
          const node = elements[parent];
          background = composite(node.backgroundColor, background);
          if (node.gradient?.length) {
            const average = node.gradient.reduce((sum, color) => ({
              r: sum.r + color.r / node.gradient.length,
              g: sum.g + color.g / node.gradient.length,
              b: sum.b + color.b / node.gradient.length,
              a: sum.a + color.a / node.gradient.length,
            }), { r: 0, g: 0, b: 0, a: 0 });
            background = composite(average, background);
          }
        }
        elements[index].effectiveBg = background.a > 0 ? background : { r: 255, g: 255, b: 255, a: 1 };
      }
      const bodyBackground = elements.find((element) => element.tag === "body")?.effectiveBg;
      const texts = [];
      for (const element of elements) {
        if (!element.text || element.hidden) continue;
        texts.push(normalizeText({
          selector: element.selector, tag: element.tag, text: element.text, source: "text",
          fontSize: element.fontSize, fontWeight: element.fontWeight,
          letterSpacing: element.letterSpacing, textTransform: element.textTransform,
          color: element.color, background: element.effectiveBg,
          backgroundImage: element.bgImage, textAlign: element.textAlign,
        }, bodyBackground));
        for (const name of ["alt", "aria-label", "placeholder", "title"]) {
          const value = (element.attrs[name] || "").trim();
          if (value) texts.push(normalizeText({
            selector: element.selector, tag: element.tag, text: value, source: name,
            fontSize: element.fontSize, fontWeight: element.fontWeight,
            letterSpacing: element.letterSpacing, textTransform: element.textTransform,
            color: element.color, background: element.effectiveBg,
            backgroundImage: "none", textAlign: element.textAlign,
          }, bodyBackground));
        }
      }
      context = {
        elements, texts, staticMode: true, focusVisible: staticData.focusVisible,
        hiddenSelectors: elements.filter((element) => element.hidden).map((element) => element.selector),
        suspectHidden: elements.filter((element) => element.suspect).length,
        mode: "static", confidence: 0.55,
      };
    }
    const { signals, stats } = runSignals(context);
    const waivers = readWaivers(options, target);
    const applied = applyWaivers(signals, waivers.list, options.maxWaivers);
    const scored = score(applied.signals);
    result = {
      rubric: RUBRIC, tool: "trueline", toolVersion: TOOL_VERSION,
      input: target, mode: context.mode, confidence: context.confidence,
      viewport: `${options.width}x${options.height}`, theme: options.theme,
      slop: scored.slop, design: scored.design, categories: scored.categories,
      signals: applied.signals, waived: applied.waived,
      hiddenSelectors: context.hiddenSelectors,
      notes: [],
      meta: { ...stats, durationMs: 0 },
    };
    if (context.mode === "static") result.notes.push("Static mode approximates layout and contrast; use Playwright for computed styles.");
    if (waivers.error) result.notes.push(`waiver file ignored: ${waivers.error}`);
    if (context.suspectHidden) result.notes.push(`${context.suspectHidden} element(s) use opacity:0; hiding UI is not a scoring fix.`);
    if (applied.waived.length) result.notes.push(`${applied.waived.length} waiver(s) applied; they are listed in the report.`);
  }

  result.meta.durationMs = Date.now() - started;

  if (options.compare) {
    if (!existsSync(options.compare)) fail(`no such comparison file: ${options.compare}`);
    let before;
    try { before = JSON.parse(readFileSync(options.compare, "utf8")); }
    catch (error) { fail(`invalid comparison JSON: ${error.message}`); }
    result.compare = compareSnapshots(before, result);
  }

  if (options.json) {
    const text = `${JSON.stringify(result, null, 2)}\n`;
    if (options.json === "-") process.stdout.write(text);
    else {
      writeFileSync(resolve(options.json), text);
      if (!options.quiet && options.json !== "-") console.log(`saved ${options.json}`);
    }
  }
  if (!options.quiet) console.log(humanReport(result));

  const thresholdMissed =
    (options.maxSlop !== null && result.slop > options.maxSlop) ||
    (options.minDesign !== null && result.design < options.minDesign);
  if (thresholdMissed) process.exit(2);
}

main().catch((error) => fail(error.stack || error.message));
