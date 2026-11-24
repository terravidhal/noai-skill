#!/usr/bin/env node
/**
 * Originality check: compare this repository's prose and example copy with the
 * reference clone in ref/unslop. It looks for shared word sequences, not file
 * names, so a common phrase in two independent texts is reported.
 *
 *   node scripts/check-original.mjs
 *
 * ref/ is ignored by git and may be absent; the check is then skipped.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const refRoot = join(root, "ref/unslop");
if (!existsSync(refRoot)) {
  console.log("skip: ref/unslop is not present");
  process.exit(0);
}

const prose = [
  "README.md",
  "CONTRIBUTING.md",
  "ETUDE.md",
  "RAPPORT.md",
  "skills/trueline/SKILL.md",
  "skills/trueline/references/signals.md",
  "skills/trueline/references/scoring.md",
  "skills/trueline/references/passes.md",
  "skills/trueline/references/direction.md",
  "skills/trueline/references/report.md",
  "skills/trueline/references/capture.md",
  "skills/trueline/references/stacks.md",
  "examples/README.md",
  "examples/reports/README.md",
];

const refProse = [
  "README.md",
  "skills/unslop/SKILL.md",
  "skills/unslop/references/signs.md",
  "skills/unslop/references/tokens.md",
  "skills/unslop/references/visuals.md",
  "skills/unslop/references/effects.md",
  "skills/unslop/references/rtl.md",
  "skills/unslop/references/refs.md",
];

const examples = [
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

const refExamples = [
  "examples/dashboard.html",
  "examples/hero.html",
  "examples/store.html",
];

const words = (text, stripCode) => {
  let value = String(text)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ");
  if (stripCode) value = value.replace(/```[\s\S]*?```/g, " ").replace(/`[^`]*`/g, " ");
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
};

const shingles = (list, size) => {
  const out = new Set();
  for (let index = 0; index + size <= list.length; index += 1) {
    out.add(list.slice(index, index + size).join(" "));
  }
  return out;
};

function compare(ours, theirs, size, label) {
  const foreign = new Set();
  for (const file of theirs) {
    const path = join(refRoot, file);
    if (!existsSync(path)) continue;
    for (const item of shingles(words(readFileSync(path, "utf8"), true), size)) foreign.add(item);
  }
  const hits = [];
  for (const file of ours) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    const local = shingles(words(readFileSync(path, "utf8"), true), size);
    for (const item of local) {
      if (foreign.has(item)) hits.push({ file, phrase: item });
    }
  }
  if (hits.length) {
    for (const hit of hits.slice(0, 20)) {
      console.error(`error: ${label}: ${hit.file} shares ${size} words: "${hit.phrase}"`);
    }
    if (hits.length > 20) console.error(`error: ${label}: ${hits.length - 20} more hit(s)`);
  }
  return hits.length;
}

const proseHits = compare(prose, refProse, 10, "prose");
const exampleHits = compare(examples, refExamples, 8, "example copy");

if (proseHits || exampleHits) {
  console.error(`\n${proseHits + exampleHits} shared sequence(s)`);
  process.exit(1);
}
console.log(`ok: no shared 10-word prose sequence and no shared 8-word example phrase with ref/unslop (${prose.length} prose files, ${examples.length} examples)`);
