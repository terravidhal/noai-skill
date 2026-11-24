# Examples — the same screen, before and after

Four static HTML files, no build, no dependency. Fictional product, fictional
brands, fictional numbers.

| File | Slop (computed DOM) | What it shows |
|---|---:|---|
| `before/dashboard.html` | 69 | purple gradient, glass panels, identical cards, emoji nav, pills, pulse, low-contrast copy |
| `after/dashboard.html` | 0 | neutral ramp, one accent, metrics strip, real chart, table, visible focus |
| `before/landing.html` | 67 | centered hero, gradient text, hype, badge wall, three identical features |
| `after/landing.html` | 0 | asymmetric hero, product preview in code, plain copy, one accent, real hierarchy |

Screenshots: [`../assets/readme/`](../assets/readme/). The correction ledger is
[`passes.json`](passes.json); the generated report is
[`../RAPPORT.md`](../RAPPORT.md). The raw computed-DOM scans are in
[`reports/`](reports/).

## Run

From the repository root:

```bash
node skills/trueline/scripts/scan.mjs examples/before/dashboard.html
node skills/trueline/scripts/scan.mjs examples/after/dashboard.html \
  --compare examples/reports/dashboard-before.json
```

Without Playwright the scanner uses static mode and prints a lower confidence.
With Playwright it reads the computed styles at 1440 × 900.

Open the files directly in a browser: they are self-contained. No font is
downloaded; the after pages name system or installed families with fallbacks.

## Regenerate the evidence

```bash
node skills/trueline/scripts/scan.mjs examples/before/dashboard.html \
  --json examples/reports/dashboard-before.json
node skills/trueline/scripts/scan.mjs examples/after/dashboard.html \
  --compare examples/reports/dashboard-before.json \
  --json examples/reports/dashboard-after.json
node skills/trueline/scripts/report.mjs \
  --before examples/reports/dashboard-before.json \
  --after examples/reports/dashboard-after.json \
  --passes examples/passes.json \
  --out RAPPORT.md --json examples/reports/dashboard-report.json
```

## Screenshots

```bash
npm run lint:assets -- --playwright <playwright-folder> --chrome <chrome-binary>
```

This scans each page, captures 1440 × 900, and builds the two comparison images.
Playwright is not needed for `npm run lint`.
