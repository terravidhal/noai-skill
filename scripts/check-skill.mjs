#!/usr/bin/env node
/**
 * Repository check: structure, frontmatter, links, JSON, assets, and deterministic
 * scanner evals. No browser and no model, so it runs in CI.
 *
 *   npm run lint
 *   node scripts/check-skill.mjs --evals
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scan = join(root, "skills/trueline/scripts/scan.mjs");
const report = join(root, "skills/trueline/scripts/report.mjs");
const errors = [];
const warnings = [];
const withEvals = process.argv.includes("--evals");
const temp = mkdtempSync(join(tmpdir(), "trueline-check-"));

const required = [
  "README.md",
  "LICENSE",
  "CONTRIBUTING.md",
  "RAPPORT.md",
  "package.json",
  ".gitignore",
  ".github/workflows/check.yml",
  "evals/evals.json",
  "skills/trueline/SKILL.md",
  "skills/trueline/references/signals.md",
  "skills/trueline/references/scoring.md",
  "skills/trueline/references/passes.md",
  "skills/trueline/references/direction.md",
  "skills/trueline/references/report.md",
  "skills/trueline/references/capture.md",
  "skills/trueline/references/stacks.md",
  "skills/trueline/scripts/scan.mjs",
  "skills/trueline/scripts/capture.mjs",
  "skills/trueline/scripts/report.mjs",
  "scripts/check-pages.mjs",
  "scripts/check-original.mjs",
  "skills/trueline/assets/example-before.html",
  "examples/before/dashboard.html",
  "examples/before/landing.html",
  "examples/before/pricing.html",
  "examples/before/form.html",
  "examples/after/dashboard.html",
  "examples/after/landing.html",
  "examples/after/pricing.html",
  "examples/after/form.html",
  "examples/passes.json",
  "examples/passes-landing.json",
  "examples/passes-pricing.json",
  "examples/passes-form.json",
  "examples/README.md",
  "examples/reports/README.md",
  "examples/reports/dashboard-before.json",
  "examples/reports/dashboard-after.json",
  "examples/reports/dashboard-report.json",
  "examples/reports/landing-before.json",
  "examples/reports/landing-after.json",
  "examples/reports/landing-report.json",
  "examples/reports/pricing-before.json",
  "examples/reports/pricing-after.json",
  "examples/reports/pricing-report.json",
  "examples/reports/form-before.json",
  "examples/reports/form-after.json",
  "examples/reports/form-report.json",
  "assets/demo.gif",
];

const capturePages = ["dashboard", "landing", "pricing", "form"];
const captureStates = ["before", "after"];
const captureVariants = ["", "-dark", "-390", "-390-dark"];
for (const page of capturePages) {
  for (const state of captureStates) {
    for (const variant of captureVariants) {
      required.push(`assets/readme/${page}-${state}${variant}.png`);
    }
  }
  required.push(`assets/readme/before-after-${page}.png`);
}
required.push("assets/readme/before-after.png");

const markdown = [
  "README.md",
  "CONTRIBUTING.md",
  "RAPPORT.md",
  "examples/README.md",
  "examples/reports/README.md",
  "examples/reports/landing-report.md",
  "examples/reports/pricing-report.md",
  "examples/reports/form-report.md",
  "skills/trueline/SKILL.md",
  "skills/trueline/references/signals.md",
  "skills/trueline/references/scoring.md",
  "skills/trueline/references/passes.md",
  "skills/trueline/references/direction.md",
  "skills/trueline/references/report.md",
  "skills/trueline/references/capture.md",
  "skills/trueline/references/stacks.md",
];

const jsonFiles = [
  "package.json",
  "evals/evals.json",
  "examples/passes.json",
  "examples/passes-landing.json",
  "examples/passes-pricing.json",
  "examples/passes-form.json",
  "examples/reports/dashboard-before.json",
  "examples/reports/dashboard-after.json",
  "examples/reports/dashboard-report.json",
  "examples/reports/landing-before.json",
  "examples/reports/landing-after.json",
  "examples/reports/landing-report.json",
  "examples/reports/pricing-before.json",
  "examples/reports/pricing-after.json",
  "examples/reports/pricing-report.json",
  "examples/reports/form-before.json",
  "examples/reports/form-after.json",
  "examples/reports/form-report.json",
];

function exists(relative) {
  return existsSync(join(root, relative));
}

function run(script, args) {
  return execFileSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
}

function scanJson(file, extra = []) {
  return JSON.parse(run(scan, [file, "--static", "--json", "-", "--quiet", ...extra]));
}

for (const file of required) {
  if (!exists(file)) errors.push(`missing ${file}`);
}

const motionPages = [
  "examples/before/dashboard.html",
  "examples/before/landing.html",
  "examples/before/pricing.html",
  "examples/before/form.html",
  "examples/after/dashboard.html",
  "examples/after/landing.html",
  "examples/after/pricing.html",
  "examples/after/form.html",
  "skills/trueline/assets/example-before.html",
];
for (const file of motionPages) {
  if (!exists(file)) continue;
  const source = readFileSync(join(root, file), "utf8");
  const moves = /(?:transition|animation)\s*:/i.test(source);
  const respects = /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i.test(source);
  if (moves && !respects) errors.push(`${file}: has motion but no prefers-reduced-motion rule`);
}

const skillFile = "skills/trueline/SKILL.md";
if (exists(skillFile)) {
  const source = readFileSync(join(root, skillFile), "utf8");
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) errors.push(`${skillFile} has no frontmatter`);
  else {
    const block = frontmatter[1];
    const name = block.match(/^name:\s*(\S+)/m)?.[1];
    if (name !== "trueline") errors.push(`${skillFile}: name must be trueline`);
    const descriptionLines = [];
    let inDescription = false;
    for (const line of block.split(/\r?\n/)) {
      if (/^description:\s*/.test(line)) { inDescription = true; descriptionLines.push(line.replace(/^description:\s*/, "")); continue; }
      if (inDescription) {
        if (/^\s+\S/.test(line) || line.trim() === "") descriptionLines.push(line.trim());
        else break;
      }
    }
    const description = descriptionLines.join(" ").trim();
    if (description.replace(/^[>|-]\s*/, "").length < 120) errors.push(`${skillFile}: description is too short to route`);
    for (const word of ["score", "slop", "unslop", "screenshot", "React", "Tailwind"]) {
      if (!new RegExp(word, "i").test(description)) errors.push(`${skillFile}: description should mention ${word}`);
    }
  }
  const links = [...source.matchAll(/\]\((references\/[^)#]+)\)/g)].map((match) => match[1]);
  for (const link of new Set(links)) {
    if (!exists(join("skills/trueline", link))) errors.push(`${skillFile} links to missing ${link}`);
  }
}

for (const file of jsonFiles) {
  if (!exists(file)) continue;
  try { JSON.parse(readFileSync(join(root, file), "utf8")); }
  catch (error) { errors.push(`${file}: invalid JSON (${error.message})`); }
}

for (const file of markdown) {
  if (!exists(file)) continue;
  const source = readFileSync(join(root, file), "utf8");
  const base = dirname(file);
  for (const match of source.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const link = match[1];
    if (/^(https?:|mailto:|#|\{)/.test(link)) continue;
    const [target] = link.split("#");
    if (!target) continue;
    const resolved = normalize(join(base, target));
    if (!exists(resolved)) warnings.push(`${file}: relative link not found: ${link}`);
  }
}

for (const file of required.filter((entry) => entry.endsWith(".png"))) {
  if (!exists(file)) continue;
  const { size } = statSync(join(root, file));
  if (size < 10_000) errors.push(`${file} looks too small (${size} bytes)`);
  const header = readFileSync(join(root, file)).subarray(0, 8);
  if (!header.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) errors.push(`${file} is not a PNG`);
}

if (exists("assets/demo.gif")) {
  const { size } = statSync(join(root, "assets/demo.gif"));
  if (size < 20_000) errors.push(`assets/demo.gif looks too small (${size} bytes)`);
  const header = readFileSync(join(root, "assets/demo.gif")).subarray(0, 6).toString("latin1");
  if (header !== "GIF89a" && header !== "GIF87a") errors.push("assets/demo.gif is not a GIF");
}

const textFiles = [...markdown, "package.json", "LICENSE", ".github/workflows/check.yml", "evals/evals.json", "examples/passes.json"];
const secretPatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bghp_[A-Za-z0-9]{30,}\b/,
  /\bsk-[A-Za-z0-9]{20,}\b/,
  /[\w.+-]+@(gmail|outlook|yahoo|hotmail|proton)\.[a-z]{2,}/i,
];
for (const file of textFiles) {
  if (!exists(file)) continue;
  const source = readFileSync(join(root, file), "utf8");
  for (const pattern of secretPatterns) {
    if (pattern.test(source)) errors.push(`${file}: possible secret or personal address (${pattern})`);
  }
}

const cases = [
  { before: "examples/before/dashboard.html", after: "examples/after/dashboard.html", minBefore: 55, maxAfter: 10 },
  { before: "examples/before/landing.html", after: "examples/after/landing.html", minBefore: 55, maxAfter: 10 },
  { before: "examples/before/pricing.html", after: "examples/after/pricing.html", minBefore: 50, maxAfter: 10 },
  { before: "examples/before/form.html", after: "examples/after/form.html", minBefore: 45, maxAfter: 10 },
];

for (const item of cases) {
  if (!exists(item.before) || !exists(item.after)) continue;
  const before = scanJson(item.before);
  const after = scanJson(item.after);
  if (before.slop < item.minBefore) errors.push(`${item.before}: expected slop ≥ ${item.minBefore}, got ${before.slop}`);
  if (after.slop > item.maxAfter) errors.push(`${item.after}: expected slop ≤ ${item.maxAfter}, got ${after.slop}`);
  if (after.mode !== "static" || before.rubric !== after.rubric) errors.push(`${item.after}: mode or rubric mismatch`);
  const beforeFile = join(temp, `${item.before.split("/").pop()}-before.json`);
  const afterFile = join(temp, `${item.after.split("/").pop()}-after.json`);
  writeFileSync(beforeFile, JSON.stringify(before));
  const compared = scanJson(item.after, ["--compare", beforeFile]);
  if (!compared.compare || compared.compare.slop !== after.slop - before.slop) errors.push(`${item.after}: compare delta is wrong`);
  if (compared.compare && compared.compare.slop > -40) errors.push(`${item.after}: expected a delta of at least -40, got ${compared.compare.slop}`);
  writeFileSync(afterFile, JSON.stringify(compared));
}

if (exists("skills/trueline/assets/example-before.html")) {
  const demo = scanJson("skills/trueline/assets/example-before.html");
  if (demo.slop < 45) errors.push(`assets/example-before.html: expected slop ≥ 45, got ${demo.slop}`);
}

if (exists("RAPPORT.md")) {
  const source = readFileSync(join(root, "RAPPORT.md"), "utf8");
  for (const needle of [
    "| Before |", "| After |", "## Passes", "## Edits", "## Signals remaining",
    "## Fait", "## Captures", "## Limites", "## Ce qui reste à Vidhal",
  ]) {
    if (!source.includes(needle)) errors.push(`RAPPORT.md is missing ${needle}`);
  }
}

if (withEvals) {
  /* Contrast fixture */
  const contrastFile = join(temp, "contrast.html");
  writeFileSync(contrastFile, `<!doctype html><html><body style="background:#fff"><p style="color:#999;font-size:16px">This paragraph is long enough to count as body copy and should fail the contrast check.</p></body></html>`);
  const contrast = scanJson(contrastFile);
  if (!contrast.signals.some((signal) => signal.id === "E1")) errors.push("eval contrast: #999 body text was not counted as unreadable");

  /* Waiver fixture */
  const gradientFile = join(temp, "gradient.html");
  writeFileSync(gradientFile, `<!doctype html><html><body style="background:linear-gradient(135deg,#7c3aed,#2563eb)"><h1 style="color:#fff">A heading</h1></body></html>`);
  const plain = scanJson(gradientFile);
  const waivers = join(temp, "trueline.json");
  writeFileSync(waivers, JSON.stringify({ waivers: [{ id: "A1", reason: "Approved brand gradient by the owner" }] }));
  const waived = scanJson(gradientFile, ["--waivers", waivers]);
  if (!plain.signals.some((signal) => signal.id === "A1" && signal.penalty > 0)) errors.push("eval waiver: gradient was not detected");
  if (waived.waived.length !== 1) errors.push("eval waiver: A1 was not waived");
  if (waived.slop >= plain.slop) errors.push("eval waiver: waiver did not lower the score");

  /* Hiding is reported, not rewarded silently */
  const hideBefore = join(temp, "hide-before.html");
  const hideAfter = join(temp, "hide-after.html");
  writeFileSync(hideBefore, `<!doctype html><html><body><p>🚀 🚀 🚀</p></body></html>`);
  writeFileSync(hideAfter, `<!doctype html><html><body><p style="display:none">🚀 🚀 🚀</p></body></html>`);
  const hiddenBefore = scanJson(hideBefore);
  const hiddenAfter = scanJson(hideAfter);
  const hiddenBeforeFile = join(temp, "hidden-before.json");
  writeFileSync(hiddenBeforeFile, JSON.stringify(hiddenBefore));
  const hiddenCompare = scanJson(hideAfter, ["--compare", hiddenBeforeFile]);
  if (!hiddenBefore.signals.some((signal) => signal.id === "D1")) errors.push("eval hide: emoji was not detected before");
  if (hiddenCompare.compare.removed.length === 0) errors.push("eval hide: D1 did not disappear");
  if (!hiddenCompare.compare.warnings.some((warning) => /hiding is not a fix/i.test(warning))) errors.push("eval hide: hiding was not reported as a warning");

  /* Report generation */
  const reportOut = join(temp, "RAPPORT.md");
  const reportJson = join(temp, "report.json");
  run(report, [
    "--before", "examples/reports/dashboard-before.json",
    "--after", "examples/reports/dashboard-after.json",
    "--passes", "examples/passes.json",
    "--out", reportOut,
    "--json", reportJson,
  ]);
  const generated = readFileSync(reportOut, "utf8");
  for (const needle of ["| Before | 69 |", "| After | 0 |", "## Passes", "## Edits"]) {
    if (!generated.includes(needle)) errors.push(`eval report: missing ${needle}`);
  }
  const generatedJson = JSON.parse(readFileSync(reportJson, "utf8"));
  if (generatedJson.delta.slop !== -69) errors.push(`eval report: expected delta -69, got ${generatedJson.delta.slop}`);

  /* Image mode */
  const imageBefore = JSON.parse(run(scan, ["assets/readme/dashboard-before.png", "--image", "--json", "-", "--quiet"]));
  const imageAfter = JSON.parse(run(scan, ["assets/readme/dashboard-after.png", "--image", "--json", "-", "--quiet"]));
  if (imageBefore.mode !== "image" || imageBefore.confidence !== 0.45) errors.push("eval image: mode or confidence is wrong");
  if (imageBefore.slop <= imageAfter.slop) errors.push(`eval image: expected before > after, got ${imageBefore.slop} and ${imageAfter.slop}`);

  /* Rubric mismatch is refused */
  const forged = join(temp, "forged.json");
  writeFileSync(forged, JSON.stringify({ ...hiddenBefore, rubric: "99" }));
  let status = 0;
  try {
    execFileSync(process.execPath, [scan, hideAfter, "--static", "--compare", forged, "--quiet"], { cwd: root, stdio: "ignore" });
  } catch (error) {
    status = error.status ?? 1;
  }
  if (status !== 3) errors.push(`eval rubric: expected exit 3 on a mismatch, got ${status}`);
}

for (const warning of warnings) console.warn(`warning: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`error: ${error}`);
  console.error(`\n${errors.length} error(s)`);
  process.exit(1);
}
console.log(`ok: ${required.length} required files, frontmatter, links, JSON, assets, scanner evals${withEvals ? " (full)" : ""}`);
