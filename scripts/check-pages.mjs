#!/usr/bin/env node
/**
 * Browser check for the example pages: console errors, light and dark rendering,
 * mobile width, and prefers-reduced-motion. Playwright is optional and never a
 * dependency of the skill; this script is a maintainer tool.
 *
 *   node scripts/check-pages.mjs
 *   node scripts/check-pages.mjs --playwright ./node_modules/playwright --chrome /path/to/chrome
 */
import { createRequire } from "node:module";
import { existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(new URL("..", import.meta.url).pathname);
const argv = process.argv.slice(2);
const value = (name) => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : null;
};

const pages = [
  { name: "dashboard", file: "examples/before/dashboard.html", theme: false },
  { name: "landing", file: "examples/before/landing.html", theme: false },
  { name: "pricing", file: "examples/before/pricing.html", theme: false },
  { name: "form", file: "examples/before/form.html", theme: false },
  { name: "dashboard", file: "examples/after/dashboard.html", theme: true },
  { name: "landing", file: "examples/after/landing.html", theme: true },
  { name: "pricing", file: "examples/after/pricing.html", theme: true },
  { name: "form", file: "examples/after/form.html", theme: true },
  { name: "demo", file: "skills/trueline/assets/example-before.html", theme: false },
];

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
  const require = createRequire(join(root, "package.json"));
  for (const name of ["playwright", "playwright-core"]) {
    try {
      const loaded = require(name);
      if (loaded?.chromium) candidates.push(loaded);
    } catch { /* not installed at the repository root */ }
  }
  return candidates;
}

async function loadPlaywright(spec) {
  for (const candidate of moduleCandidates(spec)) {
    if (typeof candidate === "object") return candidate;
    try {
      const loaded = await import(candidate);
      const kit = loaded?.chromium ? loaded : loaded?.default;
      if (kit?.chromium) return kit;
    } catch { /* try the next candidate */ }
  }
  console.error("Playwright is not installed. Run `npm install -D playwright`, then `npx playwright install chromium`, or pass --playwright <folder>.");
  process.exit(1);
}

const reducedMotionAudit = () => {
  const failures = [];
  for (const element of document.querySelectorAll("*")) {
    const style = getComputedStyle(element);
    const animations = style.animationName.split(",").map((item) => item.trim());
    const iterations = style.animationIterationCount.split(",").map((item) => item.trim());
    const animationTime = Math.max(...style.animationDuration.split(",").map((item) => {
      const text = item.trim();
      return text.endsWith("ms") ? Number.parseFloat(text) / 1000 : Number.parseFloat(text) || 0;
    }));
    const transitionTime = Math.max(...style.transitionDuration.split(",").map((item) => {
      const text = item.trim();
      return text.endsWith("ms") ? Number.parseFloat(text) / 1000 : Number.parseFloat(text) || 0;
    }));
    const loops = animations.some((name, index) => name !== "none" && iterations[index] === "infinite");
    if (loops) failures.push(`${element.tagName.toLowerCase()} keeps an infinite animation`);
    if (animationTime > 0.001) failures.push(`${element.tagName.toLowerCase()} animation lasts ${animationTime}s`);
    if (transitionTime > 0.001) failures.push(`${element.tagName.toLowerCase()} transition lasts ${transitionTime}s`);
    if (failures.length > 8) break;
  }
  return [...new Set(failures)];
};

const playwright = await loadPlaywright(value("--playwright"));
const browser = await playwright.chromium.launch({
  executablePath: value("--chrome") || process.env.CHROME_PATH || undefined,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const errors = [];
let checks = 0;

async function open(page, file) {
  const messages = [];
  page.on("console", (message) => {
    if (message.type() === "error") messages.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => messages.push(`request failed: ${request.url()}`));
  await page.goto(pathToFileURL(join(root, file)).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(80);
  return messages;
}

async function audit(page, label, file) {
  const messages = await open(page, file);
  const title = await page.title();
  if (!title.trim()) errors.push(`${label}: empty title`);
  if (messages.length) errors.push(`${label}: ${messages.slice(0, 3).join(" | ")}`);
  checks += 1;
  return page;
}

try {
  for (const item of pages) {
    const label = `${item.file}`;

    const light = await audit(await browser.newPage({
      viewport: { width: 1440, height: 900 }, colorScheme: "light",
    }), `${label} (light)`, item.file);
    const lightBackground = await light.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await light.close();

    const dark = await audit(await browser.newPage({
      viewport: { width: 1440, height: 900 }, colorScheme: "dark",
    }), `${label} (dark)`, item.file);
    const darkBackground = await dark.evaluate(() => getComputedStyle(document.body).backgroundColor);
    if (item.theme && lightBackground === darkBackground) {
      errors.push(`${label}: dark mode renders the same background as light`);
    }
    await dark.close();

    const mobile = await audit(await browser.newPage({
      viewport: { width: 390, height: 844 }, colorScheme: "light",
    }), `${label} (390)`, item.file);
    const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) errors.push(`${label}: overflows 390 px by ${overflow} px`);
    await mobile.close();

    const reduced = await audit(await browser.newPage({
      viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce",
    }), `${label} (reduced motion)`, item.file);
    const motion = await reduced.evaluate(reducedMotionAudit);
    for (const failure of motion) errors.push(`${label}: reduced motion not respected, ${failure}`);
    await reduced.close();
  }
} finally {
  await browser.close();
}

if (errors.length) {
  for (const error of errors) console.error(`error: ${error}`);
  console.error(`\n${errors.length} error(s) across ${checks} page loads`);
  process.exit(1);
}
console.log(`ok: ${pages.length} pages, ${checks} loads, no console errors, light + dark + 390 + reduced motion`);
