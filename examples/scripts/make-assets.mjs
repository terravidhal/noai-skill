#!/usr/bin/env node
/**
 * Regenerate the README screenshots and the short demo GIF with Chromium.
 *
 *   node examples/scripts/make-assets.mjs
 *   node examples/scripts/make-assets.mjs --playwright ./node_modules/playwright --chrome /path/to/chrome
 *
 * For every example it writes four captures:
 *   1440 light, 1440 dark, 390 light, 390 dark.
 * It also builds one before/after sheet per screen, a generic hero sheet, and
 * assets/demo.gif when ffmpeg is available. Playwright and ffmpeg are only
 * needed for this maintainer script; the scanner and the repository lint run
 * without them.
 */
import { execFileSync, spawnSync } from "node:child_process";
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
  { name: "dashboard", file: "examples/after/dashboard.html", before: "examples/before/dashboard.html" },
  { name: "landing", file: "examples/after/landing.html", before: "examples/before/landing.html" },
  { name: "pricing", file: "examples/after/pricing.html", before: "examples/before/pricing.html" },
  { name: "form", file: "examples/after/form.html", before: "examples/before/form.html" },
];

const variants = [
  { suffix: "", width: 1440, height: 900, scheme: "light" },
  { suffix: "-dark", width: 1440, height: 900, scheme: "dark" },
  { suffix: "-390", width: 390, height: 844, scheme: "light" },
  { suffix: "-390-dark", width: 390, height: 844, scheme: "dark" },
];

const shots = [
  ...pages.map((page) => ({ name: `${page.name}-before`, file: page.before })),
  ...pages.map((page) => ({ name: `${page.name}-after`, file: page.file })),
];

function scanArgs(file) {
  const args = [join(root, "skills/trueline/scripts/scan.mjs"), file, "--json", "-", "--quiet"];
  if (value("--playwright")) args.push("--playwright", value("--playwright"));
  if (value("--chrome")) args.push("--chrome", value("--chrome"));
  return args;
}

function scoreOf(file) {
  const output = execFileSync(process.execPath, scanArgs(file), { cwd: root, encoding: "utf8" });
  return JSON.parse(output).slop;
}

try {
  mkdirSync(outDir, { recursive: true });

  for (const shot of shots) {
    for (const variant of variants) {
      const tab = await browser.newPage({
        viewport: { width: variant.width, height: variant.height },
        colorScheme: variant.scheme,
        deviceScaleFactor: 1,
      });
      await tab.goto(pathToFileURL(join(root, shot.file)).href, { waitUntil: "networkidle" });
      await tab.evaluate(() => document.fonts?.ready);
      await tab.waitForTimeout(250);
      await tab.screenshot({ path: join(outDir, `${shot.name}${variant.suffix}.png`) });
      await tab.close();
      console.log(`saved assets/readme/${shot.name}${variant.suffix}.png`);
    }
  }

  const scores = Object.fromEntries(shots.map((shot) => [shot.name, scoreOf(shot.file)]));

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

  for (const page of pages) {
    await comparison(`before-after-${page.name}`, `${page.name}-before`, `${page.name}-after`, "Before", "After");
  }
  await comparison("before-after", "dashboard-before", "dashboard-after", "Agent output, no skill", "Same page, with trueline");

  const ffmpeg = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (ffmpeg.status !== 0) {
    console.warn("ffmpeg not found; skipped assets/demo.gif");
  } else {
    const filters = [];
    const inputs = [];
    ["dashboard-before", "dashboard-after", "pricing-before", "pricing-after"].forEach((name, index) => {
      inputs.push("-loop", "1", "-t", "2.4", "-i", join(outDir, `${name}.png`));
      filters.push(`[${index}:v]scale=900:563:force_original_aspect_ratio=decrease,pad=900:563:(ow-iw)/2:(oh-ih)/2:color=0xf6f7f9,setsar=1,format=rgb24,setpts=PTS-STARTPTS[v${index}]`);
    });
    filters.push("[v0][v1]xfade=transition=wipeleft:duration=0.7:offset=1.3[c1]");
    filters.push("[v2][v3]xfade=transition=wipeleft:duration=0.7:offset=1.3[c2]");
    filters.push("[c1][c2]concat=n=2:v=1:a=0,fps=10,split[seq][seq2]");
    filters.push("[seq]palettegen=max_colors=128[p]");
    filters.push("[seq2][p]paletteuse=dither=bayer:bayer_scale=3");
    const result = spawnSync("ffmpeg", [
      "-y", ...inputs,
      "-filter_complex", filters.join(";"),
      "-loop", "0", join(root, "assets/demo.gif"),
    ], { cwd: root, encoding: "utf8" });
    if (result.status !== 0) {
      console.warn(`ffmpeg failed; skipped assets/demo.gif\n${result.stderr?.slice(-800) || ""}`);
    } else {
      console.log("saved assets/demo.gif");
    }
  }
} finally {
  await browser.close();
}
