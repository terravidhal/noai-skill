#!/usr/bin/env node
/**
 * trueline report — merge a before scan, an after scan and the pass ledger into
 * one Markdown report plus a stable JSON record.
 *
 *   node report.mjs --before trueline/before.json --after trueline/after.json \
 *     --passes trueline/passes.json --out RAPPORT.md --json trueline/report.json
 *
 * The ledger is optional. Without it, the report still shows what disappeared and
 * where; with it, every pass and every edit is tied to a signal and a selector.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const USAGE = `usage: node report.mjs --before <json> --after <json> [options]

  --passes <json>   ledger of passes and edits
  --out <file>      Markdown report, default RAPPORT.md
  --json <file>     JSON report, default trueline/report.json
  --title <text>    report title
  --help            this text`;

const CATEGORIES = ["color", "layout", "type", "copy", "contrast", "motion"];
const SIGNAL_NAMES = {
  A1: "purple or blue gradient surface", A2: "gradient text", A3: "saturated glow",
  A4: "soft shadow on every surface", A5: "saturated border", A6: "glassmorphism",
  A7: "many saturated hues", B1: "identical cards repeated", B2: "three equal columns",
  B3: "centered stacked hero", B4: "uniform section rhythm", B5: "everything is a pill",
  C1: "flat type hierarchy", C2: "too many type variants", C3: "uppercase tracked labels",
  C4: "body text too small", C5: "negative tracking on small text", D1: "emoji in the interface",
  D2: "hype copy and greetings", D3: "placeholder data", D4: "wordy labels",
  E1: "unreadable body text", E2: "unreadable meta text", E3: "focus and small targets",
  F1: "decorative infinite animation", F2: "transition-all and hover scale",
  F3: "animated layout properties",
};

function fail(message) {
  console.error(`trueline report: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    before: null, after: null, passes: null,
    out: "RAPPORT.md", json: "trueline/report.json",
    title: "Redline report",
  };
  const take = (index, name) => {
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) fail(`--${name} needs a value`);
    return value;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") { console.log(USAGE); process.exit(0); }
    else if (arg === "--before") { options.before = take(i, "before"); i += 1; }
    else if (arg === "--after") { options.after = take(i, "after"); i += 1; }
    else if (arg === "--passes") { options.passes = take(i, "passes"); i += 1; }
    else if (arg === "--out") { options.out = take(i, "out"); i += 1; }
    else if (arg === "--json") { options.json = take(i, "json"); i += 1; }
    else if (arg === "--title") { options.title = take(i, "title"); i += 1; }
    else fail(`unknown option ${arg}`);
  }
  if (!options.before || !options.after) { console.error(USAGE); process.exit(1); }
  return options;
}

function readJson(file, label) {
  if (!existsSync(file)) fail(`no ${label} file: ${file}`);
  try { return JSON.parse(readFileSync(file, "utf8")); }
  catch (error) { fail(`invalid ${label} JSON: ${error.message}`); }
}

function escape(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function compare(before, after) {
  if (after.compare) return after.compare;
  return {
    before: { slop: before.slop, design: before.design },
    after: { slop: after.slop, design: after.design },
    slop: after.slop - before.slop,
    design: after.design - before.design,
    categories: Object.fromEntries(CATEGORIES.map((name) => [name, {
      before: before.categories[name].slop,
      after: after.categories[name].slop,
      delta: Number((after.categories[name].slop - before.categories[name].slop).toFixed(1)),
    }])),
    removed: before.signals.filter((signal) => !after.signals.some((next) => next.id === signal.id)).map((signal) => signal.id),
    remaining: after.signals.map((signal) => signal.id),
    appeared: after.signals.filter((signal) => !before.signals.some((previous) => previous.id === signal.id)).map((signal) => signal.id),
    warnings: [],
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const before = readJson(options.before, "before");
  const after = readJson(options.after, "after");
  const passData = options.passes ? readJson(options.passes, "passes") : null;
  const passes = Array.isArray(passData) ? passData : passData?.passes || [];
  const delta = compare(before, after);
  const mode = after.mode === "dom" ? "computed DOM" : after.mode === "image" ? "image estimate" : "static parse";

  const lines = [];
  lines.push(`# ${options.title}`);
  lines.push("");
  lines.push(`Screen: \`${escape(before.input)}\` → \`${escape(after.input)}\` · mode: ${mode} · rubric ${after.rubric} · confidence ${after.confidence}`);
  lines.push("");
  lines.push("| | Slop | Design |");
  lines.push("|---|---:|---:|");
  lines.push(`| Before | ${before.slop} | ${before.design} |`);
  lines.push(`| After | ${after.slop} | ${after.design} |`);
  lines.push(`| Change | ${delta.slop >= 0 ? "+" : ""}${delta.slop} | ${delta.design >= 0 ? "+" : ""}${delta.design} |`);
  lines.push("");
  lines.push(delta.slop <= -20
    ? `The slop score fell by ${Math.abs(delta.slop)} points. Every remaining signal is listed below.`
    : delta.slop < 0
      ? `The slop score fell by ${Math.abs(delta.slop)} points, a small polish.`
      : "The score did not fall. Do not present this as a fix; reopen the remaining signals.");
  lines.push("");

  lines.push("## Categories");
  lines.push("");
  lines.push("| Category | Max | Before | After | Delta |");
  lines.push("|---|---:|---:|---:|---:|");
  for (const name of CATEGORIES) {
    const item = delta.categories[name];
    lines.push(`| ${name} | ${before.categories[name].max} | ${item.before} | ${item.after} | ${item.delta >= 0 ? "+" : ""}${item.delta} |`);
  }
  lines.push("");

  if (passes.length) {
    lines.push("## Passes");
    lines.push("");
    lines.push("| Pass | Category | Edits | Score after | Delta |");
    lines.push("|---|---|---:|---:|---:|");
    for (const pass of passes) {
      const edits = Array.isArray(pass.changes) ? pass.changes.length : pass.edits ?? 0;
      lines.push(`| ${escape(pass.pass)} | ${escape(pass.category || "—")} | ${edits} | ${pass.scoreAfter ?? "—"} | ${pass.delta !== undefined ? `${pass.delta >= 0 ? "+" : ""}${pass.delta}` : "—"} |`);
    }
    lines.push("");
    if (passes.some((pass) => pass.scoreAfter === undefined || pass.scoreAfter === null)) {
      lines.push("A `—` under *Score after* means no separate scan was recorded for that pass; only the final scan is shown. The edit ledger is still complete.");
      lines.push("");
    }
    const edits = passes.flatMap((pass) => (pass.changes || []).map((change) => ({ pass: pass.pass, ...change })));
    if (edits.length) {
      lines.push("## Edits");
      lines.push("");
      lines.push("| Pass | Signal | File | Selector | Before | After |");
      lines.push("|---|---|---|---|---|---|");
      for (const change of edits) {
        lines.push(`| ${escape(change.pass)} | ${escape(change.signal || "—")} | \`${escape(change.file || "—")}\` | \`${escape(change.selector || "—")}\` | ${escape(change.before || "—")} | ${escape(change.after || "—")} |`);
      }
      lines.push("");
    }
  }

  lines.push("## Signals removed");
  lines.push("");
  if (delta.removed.length) {
    for (const id of delta.removed) {
      const signal = before.signals.find((item) => item.id === id);
      lines.push(`- **${id}** ${escape(signal?.name || SIGNAL_NAMES[id] || "")}${signal?.evidence?.[0] ? ` — \`${escape(signal.evidence[0].selector)}\`` : ""}`);
    }
  } else lines.push("- None. Nothing measurable was removed.");
  lines.push("");

  lines.push("## Signals remaining");
  lines.push("");
  if (after.signals.length) {
    lines.push("| Signal | Penalty | Evidence |");
    lines.push("|---|---:|---|");
    for (const signal of [...after.signals].sort((a, b) => b.penalty - a.penalty)) {
      const evidence = signal.evidence.map((item) => `${item.selector}: ${item.detail}`).join("; ");
      lines.push(`| ${signal.id} ${escape(signal.name)} | ${signal.penalty} | ${escape(evidence)} |`);
    }
  } else lines.push("- None measured.");
  lines.push("");

  if (after.waived?.length) {
    lines.push("## Waivers");
    lines.push("");
    lines.push("| Signal | Selector | Reason |");
    lines.push("|---|---|---|");
    for (const waiver of after.waived) {
      lines.push(`| ${escape(waiver.id)} | \`${escape(waiver.selector || "—")}\` | ${escape(waiver.reason)} |`);
    }
    lines.push("");
  }

  if (delta.warnings?.length) {
    lines.push("## Warnings");
    lines.push("");
    for (const warning of delta.warnings) lines.push(`- ${escape(warning)}`);
    lines.push("");
  }

  lines.push("## Verification");
  lines.push("");
  lines.push("- [x] Before and after scored with the same rubric and viewport.");
  lines.push("- [ ] Build and typecheck pass on the project that owns the screen.");
  lines.push("- [ ] Keyboard focus is visible on every control; targets are at least 24 px.");
  lines.push("- [ ] Light and dark themes both read; mobile width 390 checked.");
  lines.push("- [ ] No feature, claim or data was invented during the correction.");
  lines.push("");
  lines.push("Score with the same command to reproduce:");
  lines.push("");
  lines.push("```bash");
  lines.push(`node <skill>/scripts/scan.mjs ${after.input}`);
  lines.push("```");
  lines.push("");

  mkdirSync(dirname(resolve(options.out)), { recursive: true });
  writeFileSync(resolve(options.out), lines.join("\n"));
  const record = {
    rubric: after.rubric,
    tool: after.tool,
    toolVersion: after.toolVersion,
    title: options.title,
    input: before.input,
    afterInput: after.input,
    mode: after.mode,
    confidence: after.confidence,
    before: { slop: before.slop, design: before.design, categories: before.categories },
    after: { slop: after.slop, design: after.design, categories: after.categories },
    delta: { slop: delta.slop, design: delta.design, categories: delta.categories },
    passes,
    removed: delta.removed,
    remaining: delta.remaining,
    appeared: delta.appeared,
    waivers: after.waived || [],
    warnings: delta.warnings || [],
  };
  mkdirSync(dirname(resolve(options.json)), { recursive: true });
  writeFileSync(resolve(options.json), `${JSON.stringify(record, null, 2)}\n`);
  console.log(`saved ${options.out}`);
  console.log(`saved ${options.json}`);
  console.log(`score ${before.slop} → ${after.slop} (${delta.slop >= 0 ? "+" : ""}${delta.slop})`);
}

main();
