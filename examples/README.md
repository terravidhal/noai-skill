# Examples — the same screen, before and after

Eight static HTML files, no build, no dependency. Fictional product, fictional
brands, fictional numbers. Each `after` page keeps the same product, sections and
argument as its `before` page; the craft is corrected, the copy is made plain and
the sample data is marked as sample.

| Screen | Slop (computed DOM) | What it shows |
|---|---:|---|
| `before/dashboard.html` → `after/dashboard.html` | 69 → 0 | purple gradient, glass panels, identical cards, emoji nav, pills, pulse, low-contrast copy → neutral ramp, one accent, metrics strip, real chart, table, visible focus |
| `before/landing.html` → `after/landing.html` | 67 → 0 | centered hero, gradient text, hype, badge wall, three identical features → asymmetric hero, product preview, plain copy, one accent, real hierarchy |
| `before/pricing.html` → `after/pricing.html` | 64 → 0 | three identical glowing plans, fake proof, emoji checklists → one comparison table, distinct plans, real limits, questions |
| `before/form.html` → `after/form.html` | 54 → 0 | centered glass card, pill inputs, emoji labels, fake placeholders, proof wall → split form, grouped fields, plain labels, visible focus, dark theme |

Every `after` page supports light and dark (`prefers-color-scheme`) and holds at
1440 and 390. All nine demo pages stop their transitions and loops under
`prefers-reduced-motion: reduce`, and `npm run lint:pages` opens each one at
1440, 390, light, dark and reduced motion to check for console errors. The
captures are in [`../assets/readme/`](../assets/readme/): four variants per state,
plus one before/after sheet per screen and a generic
[`before-after.png`](../assets/readme/before-after.png).

Change ledgers: [`passes.json`](passes.json) (dashboard),
[`passes-landing.json`](passes-landing.json),
[`passes-pricing.json`](passes-pricing.json),
[`passes-form.json`](passes-form.json). Generated reports:
[`../RAPPORT.md`](../RAPPORT.md) and [`reports/`](reports/) (Markdown and JSON).
The raw computed-DOM scans are in [`reports/`](reports/).

## Run

From the repository root:

```bash
node skills/trueline/scripts/scan.mjs examples/before/dashboard.html
node skills/trueline/scripts/scan.mjs examples/after/dashboard.html \
  --compare examples/reports/dashboard-before.json
node skills/trueline/scripts/scan.mjs examples/after/form.html \
  --compare examples/reports/form-before.json
```

Without Playwright the scanner uses static mode and prints a lower confidence.
With Playwright it reads the computed styles at 1440 × 900. Open the pages
directly in a browser; they are self-contained. No font is downloaded: the
after pages name system or installed families with fallbacks.

## Regenerate the evidence

```bash
node skills/trueline/scripts/scan.mjs examples/before/pricing.html \
  --json examples/reports/pricing-before.json
node skills/trueline/scripts/scan.mjs examples/after/pricing.html \
  --compare examples/reports/pricing-before.json \
  --json examples/reports/pricing-after.json
node skills/trueline/scripts/report.mjs \
  --before examples/reports/pricing-before.json \
  --after examples/reports/pricing-after.json \
  --passes examples/passes-pricing.json \
  --out examples/reports/pricing-report.md \
  --json examples/reports/pricing-report.json
```

The same three commands work for `landing`, `form` and `dashboard` (dashboard
writes `RAPPORT.md`). Regenerating the root report drops its maintainer notes;
add the `Fait`, `Captures`, `Limites` and `Ce qui reste à Vidhal` sections back
before running `npm run lint`.

## Screenshots and GIF

```bash
npm run lint:assets -- --playwright <playwright-folder> --chrome <chrome-binary>
```

This scans each page, captures 1440 × 900 and 390 × 844 in light and dark, builds
the five before/after sheets, and writes `assets/demo.gif` with ffmpeg. Playwright
and ffmpeg are not needed for `npm run lint`.
