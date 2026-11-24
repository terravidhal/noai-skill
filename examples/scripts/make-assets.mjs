#!/usr/bin/env node
/**
 * Regenerate the README screenshots from the example pages with Chromium.
 *
 *   node examples/scripts/make-assets.mjs
 *   node examples/scripts/make-assets.mjs --playwright ./node_modules/playwright --chrome /path/to/chrome
 *
 * Playwright is only needed for this maintainer script; the scanner and the
 * repository lint run without it.
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(new URL("../..", import.meta.url).pathname);
const outDir = join(root, "assets/readme");

const argv = process.argv.slice(2);
function value(name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : null;
}

async function loadPlaywright() {
  const candidates = [];
  const explicit = value("--playwright");
  if (explicit) {
    const base = resolve(explicit);
    if (existsSync(base) && statSync(base).isDirectory()) {
      for (const entry of ["index.mjs", "index.js"]) {
        if (existsSync(join(base, entry))) candidates.push(pathToFileURL(join(base, entry)).href);
      }
    } else if (existsSync(base)) candidates.push(pathToFileURL(base).href);
    else candidates.push(explicit);
  }
  candidates.push("playwright", "playwright-core");
  const require = createRequire(join(root, "package.json"));
  for (const name of candidates) {
    try {
      const module = await import(name);
      return module.chromium ? module : module.default;
    } catch { /* next */ }
  }
  for (const name of ["playwright", "playwright-core"]) {
    try {
      const module = require(name);
      return module.chromium ? module : module.default;
    } catch { /* next */ }
  }
  console.error("Playwright is not installed. Run `npm install -D playwright` then `npx playwright install chromium`, or pass --playwright <folder>.");
  process.exit(1);
}

const playwright = await loadPlaywright();
const browser = await playwright.chromium.launch({
  executablePath: value("--chrome") || process.env.CHROME_PATH || undefined,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const pages = [
  { name: "dashboard-before", file: "examples/before/dashboard.html" },
  { name: "dashboard-after", file: "examples/after/dashboard.html" },
  { name: "landing-before", file: "examples/before/landing.html" },
  { name: "landing-after", file: "examples/after/landing.html" },
];

function scoreOf(file) {
  const args = [join(root, "skills/trueline/scripts/scan.mjs"), file, "--json", "-", "--quiet"];
  const playwright = value("--playwright");
  const chrome = value("--chrome");
  if (playwright) args.push("--playwright", playwright);
  if (chrome) args.push("--chrome", chrome);
  const output = execFileSync(process.execPath, args, { cwd: root, encoding: "utf8" });
  return JSON.parse(output).slop;
}

try {
  mkdirSync(outDir, { recursive: true });
  for (const page of pages) {
    const tab = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: "light", deviceScaleFactor: 1 });
    await tab.goto(pathToFileURL(join(root, page.file)).href, { waitUntil: "networkidle" });
    await tab.evaluate(() => document.fonts?.ready);
    await tab.waitForTimeout(300);
    await tab.screenshot({ path: join(outDir, `${page.name}.png`) });
    await tab.close();
    console.log(`saved assets/readme/${page.name}.png`);
  }

  const scores = Object.fromEntries(pages.map((page) => [page.name, scoreOf(page.file)]));

  const comparison = async (name, before, after, left, right) => {
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  body { margin: 0; background: #f6f7f9; color: #12161f; font-family: "IBM Plex Sans", Arial, sans-serif; }
  .wrap { padding: 28px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  figure { margin: 0; background: #fff; border: 1px solid rgba(18,22,31,.12); border-radius: 12px; overflow: hidden; }
  img { display: block; width: 100%; height: auto; }
  figcaption { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 12px 16px; font-size: 14px; }
  .label { font-weight: 600; }
  .score { color: #5f6a7d; font-variant-numeric: tabular-nums; }
  h1 { margin: 0 0 16px; font-size: 20px; font-weight: 500; letter-spacing: -0.01em; }
  p { margin: 0 0 18px; color: #434c5c; font-size: 14px; }
</style></head>
<body><div class="wrap">
  <h1>trueline · same screen, measured</h1>
  <p>Slop score from the scanner (0 is designed). The code is in examples/before and examples/after.</p>
  <div class="grid">
    <figure><img src="${pathToFileURL(join(outDir, `${before}.png`)).href}" alt="${left}"><figcaption><span class="label">${left}</span><span class="score">slop ${scores[before]} / 100</span></figcaption></figure>
    <figure><img src="${pathToFileURL(join(outDir, `${after}.png`)).href}" alt="${right}"><figcaption><span class="label">${right}</span><span class="score">slop ${scores[after]} / 100</span></figcaption></figure>
  </div>
</div></body></html>`;
    const tmp = join(root, ".trueline", `${name}.html`);
    mkdirSync(dirname(tmp), { recursive: true });
    writeFileSync(tmp, html);
    const tab = await browser.newPage({ viewport: { width: 1600, height: 760 }, colorScheme: "light", deviceScaleFactor: 1 });
    await tab.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle" });
    await tab.waitForTimeout(200);
    await tab.locator(".wrap").screenshot({ path: join(outDir, `${name}.png`) });
    await tab.close();
    console.log(`saved assets/readme/${name}.png`);
  };

  await comparison("before-after-dashboard", "dashboard-before", "dashboard-after", "Before", "After");
  await comparison("before-after-landing", "landing-before", "landing-after", "Before", "After");
} finally {
  await browser.close();
}
