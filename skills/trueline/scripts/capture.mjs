#!/usr/bin/env node
/**
 * trueline capture — turn a URL or a local page into one standalone HTML file
 * and a PNG of the frame that was measured.
 *
 *   node capture.mjs https://example.com trueline/original.html
 *   node capture.mjs ./page.html trueline/original.html --dark --png trueline/before.png
 *
 * The page is scrolled once to reveal lazy content, its stylesheets and media
 * are inlined, scripts and preloads are dropped, and the chosen colour scheme is
 * frozen. The result is a working copy; the real project is untouched.
 */
import { writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";

const HELP = `usage: node capture.mjs <url|file> <out.html> [options]

  --png <file>            screenshot path (default: <out>.live.png)
  --dark | --light        freeze prefers-color-scheme
  --theme <light|dark>    same as --light or --dark
  --width <px>            viewport width, default 1440
  --height <px>           viewport height, default 900
  --wait <ms>             settle time after load, default 600
  --playwright <folder>   import Playwright from a specific folder
  --chrome <path>         explicit Chromium executable
  --help                  this text`;

const FLAGS_WITH_VALUE = new Set([
  "--png", "--theme", "--width", "--height", "--wait", "--playwright", "--chrome",
]);

function die(message) {
  console.error(`trueline capture: ${message}`);
  process.exit(1);
}

function positive(name, raw) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) die(`--${name} expects a positive number, got "${raw}"`);
  return Math.round(value);
}

function parseArgs(argv) {
  const options = {
    target: null,
    out: null,
    png: null,
    scheme: null,
    width: 1440,
    height: 900,
    wait: 600,
    playwright: null,
    chrome: null,
  };
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    let token = argv[index];

    if (token === "--help" || token === "-h") {
      console.log(HELP);
      process.exit(0);
    }
    if (token === "--dark" || token === "--light") {
      options.scheme = token.slice(2);
      continue;
    }

    let value;
    const equal = token.indexOf("=");
    if (token.startsWith("--") && equal > 0) {
      value = token.slice(equal + 1);
      token = token.slice(0, equal);
    }

    if (!FLAGS_WITH_VALUE.has(token)) {
      if (token.startsWith("--")) die(`unknown option ${token}`);
      positional.push(token);
      continue;
    }

    if (value === undefined) {
      value = argv[index + 1];
      index += 1;
    }
    if (value === undefined || value.startsWith("--")) die(`${token} needs a value`);

    if (token === "--png") options.png = value;
    else if (token === "--theme") {
      if (value !== "light" && value !== "dark") die(`--theme expects light or dark, got "${value}"`);
      options.scheme = value;
    } else if (token === "--width") options.width = positive("width", value);
    else if (token === "--height") options.height = positive("height", value);
    else if (token === "--wait") options.wait = positive("wait", value);
    else if (token === "--playwright") options.playwright = value;
    else if (token === "--chrome") options.chrome = value;
  }

  if (positional.length < 2) {
    console.error(HELP);
    process.exit(1);
  }
  [options.target, options.out] = positional;
  return options;
}

function moduleCandidates(spec) {
  const candidates = [];
  if (spec) {
    const absolute = resolve(spec);
    if (existsSync(absolute)) {
      if (statSync(absolute).isDirectory()) {
        for (const entry of ["index.mjs", "index.js"]) {
          const file = join(absolute, entry);
          if (existsSync(file)) candidates.push(pathToFileURL(file).href);
        }
      } else {
        candidates.push(pathToFileURL(absolute).href);
      }
    } else {
      candidates.push(spec);
    }
  }
  candidates.push("playwright", "playwright-core");
  return candidates;
}

async function loadPlaywright(spec) {
  for (const candidate of moduleCandidates(spec)) {
    try {
      const loaded = await import(candidate);
      const kit = loaded?.chromium ? loaded : loaded?.default;
      if (kit?.chromium) return kit;
    } catch {
      /* try the next candidate */
    }
  }
  die("Playwright is not installed. Run `npm install -D playwright`, then `npx playwright install chromium`, or pass --playwright <folder>.");
}

function targetToUrl(target) {
  if (/^https?:\/\//i.test(target)) return target;
  const absolute = resolve(target);
  if (!existsSync(absolute)) die(`no such file: ${target}`);
  return pathToFileURL(absolute).href;
}

async function scrollAndSettle(page) {
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
    const root = document.scrollingElement || document.documentElement;
    const limit = 24_000;
    let travelled = 0;

    while (travelled < limit) {
      const heightBefore = root.scrollHeight;
      window.scrollBy(0, window.innerHeight);
      travelled += window.innerHeight;
      await sleep(140);
      const heightAfter = root.scrollHeight;
      const atBottom = window.scrollY + window.innerHeight >= heightAfter;
      if (atBottom && heightAfter === heightBefore) break;
    }
    window.scrollTo(0, 0);

    const finish = (image) => new Promise((resolveImage) => {
      if (image.complete) {
        resolveImage();
        return;
      }
      image.addEventListener("load", resolveImage, { once: true });
      image.addEventListener("error", resolveImage, { once: true });
    });
    const waiting = [...document.images].map(finish);
    await Promise.race([Promise.all(waiting), sleep(5_000)]);
  });
}

function snapshotInPage({ scheme }) {
  const MAX_ASSET_BYTES = 4_000_000;
  const assetCache = new Map();

  const asAbsolute = (href, base) => {
    try {
      return new URL(href, base || document.baseURI).href;
    } catch {
      return href;
    }
  };

  const bytesToBase64 = (bytes) => {
    let binary = "";
    const block = 0x2000;
    for (let offset = 0; offset < bytes.length; offset += block) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + block));
    }
    return btoa(binary);
  };

  const asDataUri = async (href) => {
    if (!href || /^data:/i.test(href)) return href;
    if (!assetCache.has(href)) {
      assetCache.set(href, (async () => {
        try {
          const response = await fetch(href);
          if (!response.ok) return href;
          const blob = await response.blob();
          if (blob.size >= MAX_ASSET_BYTES) return href;
          const bytes = new Uint8Array(await blob.arrayBuffer());
          return `data:${blob.type || "application/octet-stream"};base64,${bytesToBase64(bytes)}`;
        } catch {
          return href;
        }
      })());
    }
    return assetCache.get(href);
  };

  const inlineCssAssets = async (cssText, base) => {
    const pattern = /url\(\s*(["']?)([^"')]+)\1\s*\)/gi;
    let output = cssText;
    for (const match of cssText.matchAll(pattern)) {
      const raw = match[2].trim();
      if (!raw || /^(?:data:|#|%23)/i.test(raw)) continue;
      const absolute = asAbsolute(raw, base);
      const data = await asDataUri(absolute);
      if (data !== absolute) output = output.split(match[0]).join(`url("${data}")`);
    }
    return output;
  };

  const freezeScheme = (cssText, chosen) => {
    if (chosen !== "light" && chosen !== "dark") return cssText;
    return cssText.replace(/\(\s*prefers-color-scheme\s*:\s*(dark|light)\s*\)/gi, (whole, value) => {
      return value.toLowerCase() === chosen ? "(min-width: 0px)" : "(max-width: 0px)";
    });
  };

  const collectStyles = async () => {
    const chunks = [];
    let sourceLength = 0;

    for (const stylesheet of document.styleSheets) {
      let origin = location.href;
      let body = "";
      const tag = stylesheet.ownerNode;

      if (stylesheet.href) {
        origin = stylesheet.href;
        try {
          const reply = await fetch(stylesheet.href);
          if (reply.ok) body = await reply.text();
        } catch {
          /* cross-origin sheet: fall through */
        }
      } else if (tag && tag.textContent) {
        body = tag.textContent;
      }

      if (!body.trim()) {
        try {
          const rules = [];
          for (const rule of stylesheet.cssRules) rules.push(rule.cssText);
          body = rules.join("\n");
        } catch {
          /* protected sheet */
        }
      }
      if (!body.trim()) continue;

      sourceLength += body.length;
      const media = stylesheet.media && stylesheet.media.mediaText;
      if (media && media !== "all") body = `@media ${media} {\n${body}\n}`;
      chunks.push(await inlineCssAssets(body, origin));
    }
    return { css: freezeScheme(chunks.join("\n"), chosen), sourceLength };
  };

  const clone = document.documentElement.cloneNode(true);
  const liveImages = [...document.images];

  const disposable = [
    "script",
    "noscript",
    "style",
    "link[rel='stylesheet']",
    "link[rel='preload']",
    "link[rel='modulepreload']",
  ].join(", ");
  for (const node of clone.querySelectorAll(disposable)) node.remove();
  for (const node of clone.querySelectorAll("source")) node.remove();
  for (const node of clone.querySelectorAll("[srcset]")) node.removeAttribute("srcset");
  for (const node of clone.querySelectorAll("[loading]")) node.removeAttribute("loading");

  clone.querySelectorAll("img").forEach((node, index) => {
    const live = liveImages[index];
    const src = live?.currentSrc || node.getAttribute("src");
    if (src) node.setAttribute("src", src);
  });

  const chosen = scheme === "light" || scheme === "dark" ? scheme : null;
  return (async () => {
    const { css, sourceLength } = await collectStyles();

    const attributeFor = (tagName) => {
      if (tagName === "VIDEO") return "poster";
      if (tagName === "image") return "href";
      return "src";
    };
    const mediaSelector = ["img[src]", "video[poster]", "image"].join(", ");
    for (const node of clone.querySelectorAll(mediaSelector)) {
      const attribute = attributeFor(node.tagName);
      const raw = node.getAttribute(attribute);
      if (raw) node.setAttribute(attribute, await asDataUri(asAbsolute(raw)));
    }
    for (const node of clone.querySelectorAll("a[href]")) {
      node.setAttribute("href", asAbsolute(node.getAttribute("href")));
    }
    for (const node of clone.querySelectorAll("[style]")) {
      const inline = node.getAttribute("style");
      if (!inline.includes("url(")) continue;
      node.setAttribute("style", await inlineCssAssets(inline, document.baseURI));
    }

    let head = clone.querySelector("head");
    if (!head) {
      head = document.createElement("head");
      clone.prepend(head);
    }

    if (chosen) {
      const schemeMeta = document.createElement("meta");
      schemeMeta.name = "color-scheme";
      schemeMeta.content = chosen;
      head.prepend(schemeMeta);
    }
    const marker = document.createElement("meta");
    marker.name = "trueline-capture";
    marker.content = "standalone copy for scoring and editing";
    head.prepend(marker);

    const styleNode = document.createElement("style");
    styleNode.textContent = css;
    head.appendChild(styleNode);

    return {
      html: `<!doctype html>\n${clone.outerHTML}`,
      cssLength: sourceLength,
    };
  })();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const playwright = await loadPlaywright(options.playwright);
  const browser = await playwright.chromium.launch({
    executablePath: options.chrome || undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: options.width, height: options.height },
      colorScheme: options.scheme || "no-preference",
    });
    const page = await context.newPage();
    await page.goto(targetToUrl(options.target), { waitUntil: "networkidle", timeout: 60_000 });
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(180);
    await scrollAndSettle(page);
    await page.waitForTimeout(options.wait);

    const snapshot = await page.evaluate(snapshotInPage, { scheme: options.scheme });

    const out = resolve(options.out);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, snapshot.html);

    const png = resolve(options.png || out.replace(/\.html?$/i, "") + ".live.png");
    mkdirSync(dirname(png), { recursive: true });
    await page.evaluate(() => window.scroll(0, 0));
    await page.waitForTimeout(120);
    await page.screenshot({ path: png });

    console.log(`saved ${out}`);
    console.log(`saved ${png}`);
    console.log(`next: node scan.mjs ${out} --json trueline/before.json`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`trueline capture: ${error?.message || error}`);
  process.exit(1);
});
