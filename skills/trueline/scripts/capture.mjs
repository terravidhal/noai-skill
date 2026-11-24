#!/usr/bin/env node
/**
 * trueline capture — freeze a live page into one standalone HTML file, plus a PNG
 * of what it really looked like. Use it when you only have a URL and need a stable
 * file to score and edit.
 *
 *   node capture.mjs https://example.com trueline/original.html
 *   node capture.mjs ./page.html trueline/original.html --dark --png trueline/before.png
 *
 * The snapshot inlines CSS, fonts referenced by CSS, images and posters, removes
 * scripts, and lazy-loads the page first. It is a working copy, not a rewrite of
 * the real project.
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const USAGE = `usage: node capture.mjs <url|file> <out.html> [options]

  --png <file>            also save a screenshot (default: <out>.live.png)
  --dark | --light        freeze prefers-color-scheme
  --theme <light|dark>    same as --light or --dark
  --width <px>            viewport width, default 1440
  --height <px>           viewport height, default 900
  --wait <ms>             settle time after load, default 600
  --playwright <folder>   import Playwright from a specific folder
  --chrome <path>         explicit Chromium executable
  --help                  this text`;

function fail(message) {
  console.error(`trueline capture: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    target: null, out: null, png: null, scheme: "no-preference",
    width: 1440, height: 900, wait: 600, playwright: null, chrome: null,
  };
  const positionals = [];
  const take = (index, name) => {
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) fail(`--${name} needs a value`);
    return value;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") { console.log(USAGE); process.exit(0); }
    else if (arg === "--dark") options.scheme = "dark";
    else if (arg === "--light") options.scheme = "light";
    else if (arg === "--theme") { options.scheme = take(i, "theme") === "dark" ? "dark" : "light"; i += 1; }
    else if (arg === "--png") { options.png = take(i, "png"); i += 1; }
    else if (arg === "--width") { options.width = Number(take(i, "width")); i += 1; }
    else if (arg === "--height") { options.height = Number(take(i, "height")); i += 1; }
    else if (arg === "--wait") { options.wait = Number(take(i, "wait")); i += 1; }
    else if (arg === "--playwright") { options.playwright = take(i, "playwright"); i += 1; }
    else if (arg === "--chrome") { options.chrome = take(i, "chrome"); i += 1; }
    else if (arg.startsWith("--")) fail(`unknown option ${arg}`);
    else positionals.push(arg);
  }
  if (positionals.length < 2) { console.error(USAGE); process.exit(1); }
  [options.target, options.out] = positionals;
  if (!Number.isFinite(options.width) || !Number.isFinite(options.height)) fail("width and height must be numbers");
  return options;
}

async function loadPlaywright(explicit) {
  const candidates = [];
  if (explicit) {
    const base = resolve(explicit);
    if (existsSync(base) && statSync(base).isDirectory()) {
      for (const entry of ["index.mjs", "index.js"]) {
        const file = join(base, entry);
        if (existsSync(file)) candidates.push(pathToFileURL(file).href);
      }
    } else if (existsSync(base)) candidates.push(pathToFileURL(base).href);
    else candidates.push(explicit);
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

const options = parseArgs(process.argv.slice(2));
const playwright = await loadPlaywright(options.playwright);
if (!playwright) {
  fail("Playwright is not installed. Run `npm install -D playwright` then `npx playwright install chromium`, or pass --playwright <folder>.");
}

const browser = await playwright.chromium.launch({
  executablePath: options.chrome || undefined,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const page = await browser.newPage({
    viewport: { width: options.width, height: options.height },
    colorScheme: options.scheme,
  });
  const url = /^https?:/.test(options.target)
    ? options.target
    : pathToFileURL(resolve(options.target)).href;
  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(200);
  await page.evaluate(async () => {
    const pause = (ms) => new Promise((done) => setTimeout(done, ms));
    const root = document.scrollingElement || document.documentElement;
    let last = root.scrollHeight;
    for (let step = 0; step < 30 && root.scrollTop < 24_000; step += 1) {
      window.scrollBy(0, window.innerHeight);
      await pause(120);
      const grown = root.scrollHeight;
      if (grown <= last && root.scrollTop + window.innerHeight >= grown) break;
      last = grown;
    }
    window.scrollTo(0, 0);
    const pending = [...document.images].filter((image) => !image.complete);
    const loaded = (image) => new Promise((done) => {
      image.addEventListener("load", done, { once: true });
      image.addEventListener("error", done, { once: true });
    });
    await Promise.race([Promise.all(pending.map(loaded)), pause(5_000)]);
  });
  await page.waitForTimeout(options.wait);

  const html = await page.evaluate(async (scheme) => {
    const LIMIT = 4_000_000;
    const absolute = (value, base = location.href) => {
      try { return new URL(value, base).href; } catch { return value; }
    };
    const cache = new Map();
    const asDataUrl = async (href) => {
      if (!href || href.startsWith("data:")) return href;
      if (!cache.has(href)) {
        cache.set(href, fetch(href)
          .then((response) => (response.ok ? response.blob() : null))
          .then((blob) => (blob && blob.size < LIMIT ? new Promise((done) => {
            const reader = new FileReader();
            reader.onload = () => done(reader.result);
            reader.readAsDataURL(blob);
          }) : href))
          .catch(() => href));
      }
      return cache.get(href);
    };
    const inlineCssUrls = async (css, base) => {
      const found = [...css.matchAll(/url\((['"]?)(?!data:)([^)'"]+)\1\)/g)];
      let result = css;
      for (const [whole, , value] of found) {
        if (/^(#|%23)/.test(value.trim())) continue;
        const data = await asDataUrl(absolute(value.trim(), base));
        result = result.split(whole).join(`url("${data}")`);
      }
      return result;
    };

    const css = [];
    let rawCss = "";
    for (const sheet of document.styleSheets) {
      const owner = sheet.ownerNode;
      let text = "";
      let base = location.href;
      if (sheet.href) {
        base = sheet.href;
        text = await fetch(sheet.href).then((response) => (response.ok ? response.text() : "")).catch(() => "");
      } else if (owner && owner.textContent.trim()) {
        text = owner.textContent;
      }
      if (!text) {
        try { text = [...sheet.cssRules].map((rule) => rule.cssText).join("\n"); } catch { /* cross-origin */ }
      }
      rawCss += `\n${text}`;
      const media = sheet.media && sheet.media.mediaText;
      const wrapped = media && media !== "all" ? `@media ${media} {\n${text}\n}` : text;
      css.push(await inlineCssUrls(wrapped, base));
    }

    const copy = document.documentElement.cloneNode(true);
    const liveImages = document.images;
    copy.querySelectorAll("img").forEach((node, index) => {
      const selected = liveImages[index]?.currentSrc;
      if (selected) node.setAttribute("src", selected);
    });
    copy.querySelectorAll("script, noscript, link[rel='stylesheet'], link[rel='preload'], link[rel='modulepreload'], style").forEach((node) => node.remove());
    copy.querySelectorAll("[srcset]").forEach((node) => node.removeAttribute("srcset"));
    copy.querySelectorAll("source").forEach((node) => node.remove());
    copy.querySelectorAll("[loading]").forEach((node) => node.removeAttribute("loading"));
    for (const node of copy.querySelectorAll("img[src], video[poster], image")) {
      const attr = node.tagName === "VIDEO" ? "poster" : node.tagName.toLowerCase() === "image" ? "href" : "src";
      const value = node.getAttribute(attr);
      if (value) node.setAttribute(attr, await asDataUrl(absolute(value)));
    }
    for (const node of copy.querySelectorAll("a[href]")) node.setAttribute("href", absolute(node.getAttribute("href")));
    for (const node of copy.querySelectorAll("[style*='url(']")) node.setAttribute("style", await inlineCssUrls(node.getAttribute("style"), location.href));

    let text = css.join("\n");
    if (scheme === "dark" || scheme === "light") {
      const other = scheme === "dark" ? "light" : "dark";
      text = text
        .replace(new RegExp(`prefers-color-scheme\\s*:\\s*${scheme}`, "g"), "min-width: 0px")
        .replace(new RegExp(`prefers-color-scheme\\s*:\\s*${other}`, "g"), "max-width: 0px");
      const meta = document.createElement("meta");
      meta.name = "color-scheme";
      meta.content = scheme;
      copy.querySelector("head").prepend(meta);
    }
    const style = document.createElement("style");
    style.textContent = text;
    copy.querySelector("head").appendChild(style);
    const marker = document.createElement("meta");
    marker.name = "trueline-capture";
    marker.content = "standalone copy for scoring and editing";
    copy.querySelector("head").prepend(marker);
    return { html: "<!doctype html>\n" + copy.outerHTML, cssLength: rawCss.length };
  }, options.scheme);

  mkdirSync(dirname(resolve(options.out)), { recursive: true });
  writeFileSync(resolve(options.out), html.html);
  const png = options.png || resolve(options.out).replace(/\.html?$/, "") + ".live.png";
  mkdirSync(dirname(resolve(png)), { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(120);
  await page.screenshot({ path: resolve(png), fullPage: false });
  console.log(`saved ${resolve(options.out)}`);
  console.log(`saved ${resolve(png)}`);
  console.log(`next: node scan.mjs ${resolve(options.out)} --json trueline/before.json`);
} finally {
  await browser.close();
}
