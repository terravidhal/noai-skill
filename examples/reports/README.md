# Reports — four screens, one rubric

All scores below come from the computed DOM at 1440 × 900, rubric 1, confidence
1. Dark mode scores the four `after` pages at 0 as well. The scans, the ledgers
and the generated reports are kept together so a number can be checked without
re-running the correction.

| Screen | Before | After | Scan pair | Ledger | Report |
|---|---:|---:|---|---|---|
| Dashboard | 69 | 0 | [`dashboard-before.json`](dashboard-before.json) / [`dashboard-after.json`](dashboard-after.json) | [`../passes.json`](../passes.json) | [`../../RAPPORT.md`](../../RAPPORT.md) |
| Landing | 67 | 0 | [`landing-before.json`](landing-before.json) / [`landing-after.json`](landing-after.json) | [`../passes-landing.json`](../passes-landing.json) | [`landing-report.md`](landing-report.md) |
| Pricing | 64 | 0 | [`pricing-before.json`](pricing-before.json) / [`pricing-after.json`](pricing-after.json) | [`../passes-pricing.json`](../passes-pricing.json) | [`pricing-report.md`](pricing-report.md) |
| New-project form | 54 | 0 | [`form-before.json`](form-before.json) / [`form-after.json`](form-after.json) | [`../passes-form.json`](../passes-form.json) | [`form-report.md`](form-report.md) |

Each `*-after.json` contains a `compare` block with the per-category delta. The
`*-report.json` files contain the same delta plus the pass ledger.

## Reproduce one pair

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
