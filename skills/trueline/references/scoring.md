# Scoring — formula, weights and contract

The score is deterministic: same input, same rubric, same viewport and theme give
the same number. No model, no network, no telemetry. The scanner reads the page
locally and exits.

## Formula

```
severity ∈ [0, 1]        how much of the signal is present
penalty  = weight × severity
category = min(category max, Σ penalties in that category)
slop     = round(Σ category)              # 0 = designed, 100 = maximal slop
design   = 100 − slop
```

Categories have caps so one family cannot swallow the score. Weights sum to 100.

| Category | Signals | Max |
|---|---|---:|
| colour | A1–A7 | 30 |
| layout | B1–B5 | 20 |
| type | C1–C5 | 15 |
| copy | D1–D4 | 15 |
| contrast | E1–E3 | 10 |
| motion | F1–F3 | 10 |

## Weights (rubric 1)

| Id | Signal | Weight |
|---|---|---:|
| A1 | purple or blue gradient surface | 6 |
| A2 | gradient text | 6 |
| A3 | saturated glow | 5 |
| A4 | soft shadow on every surface | 4 |
| A5 | saturated border | 3 |
| A6 | glassmorphism | 3 |
| A7 | many saturated hues in the chrome | 3 |
| B1 | identical cards repeated | 7 |
| B2 | three equal columns repeated | 4 |
| B3 | centered stacked hero | 4 |
| B4 | uniform section rhythm | 3 |
| B5 | everything is a pill | 2 |
| C1 | flat type hierarchy | 5 |
| C2 | too many type variants | 3 |
| C3 | uppercase tracked labels | 3 |
| C4 | body text too small | 2 |
| C5 | negative tracking on small text | 2 |
| D1 | emoji in the interface | 5 |
| D2 | hype copy and greetings | 4 |
| D3 | placeholder data | 3 |
| D4 | wordy labels | 3 |
| E1 | unreadable body text | 5 |
| E2 | unreadable meta text | 2 |
| E3 | focus and small targets | 3 |
| F1 | decorative infinite animation | 4 |
| F2 | transition-all and hover scale | 3 |
| F3 | animated layout properties | 3 |
| **Total** | | **100** |

The rubric string is `"1"`. Changing a weight, a threshold or a normalisation
means a new rubric number, because old and new scans are no longer comparable.

## Normalisation

- **Count** — `severity = min(1, n / threshold)`, for example emoji: 1 → 0.33,
  2 → 0.67, 3+ → 1.
- **Ratio** — `severity = clamp((value − low) / (high − low))`, for example soft
  shadows fire above 35 % of surfaces and saturate at 90 %.
- **Share of failing text** — body contrast fails are normalised over the number
  of body text samples, capped by `n / 5`.
- **Presence with prominence** — a single glass panel is not the same as six:
  severity rises with count and area.
- **Dedup** — a signal fires once with one penalty. Multiple occurrences are in
  its `evidence` and `measured`, not as repeated penalties.

## Confidence

| Mode | Confidence | What it sees |
|---|---:|---|
| `dom` (Playwright) | 1.0 | computed styles, layout, contrast, focus rules |
| `static` (HTML + CSS) | 0.55 | parsed declarations, approximated inheritance |
| `image` (PNG) | 0.45 | colour, softness, hue spread; no selectors or text |

- `dom` is the reference. Use it for anything that matters.
- `static` exists so CI and a machine without Playwright still get a score. It
  ignores viewport and reduced-motion media queries, cannot resolve the full
  cascade and cannot measure layout; it says so in `notes`.
- `image` supports PNG only and decodes it with `node:zlib`. Do not use it as a
  substitute for the DOM when the source exists.

`--compare` works across modes but records both confidences. Do not present an
image delta as a DOM delta.

## JSON output

```json
{
  "rubric": "1",
  "tool": "trueline",
  "toolVersion": "1.0.0",
  "input": "examples/after/dashboard.html",
  "mode": "dom",
  "confidence": 1,
  "viewport": "1440x900",
  "theme": "light",
  "slop": 0,
  "design": 100,
  "categories": {
    "color": { "slop": 0, "max": 30 },
    "layout": { "slop": 0, "max": 20 },
    "type": { "slop": 0, "max": 15 },
    "copy": { "slop": 0, "max": 15 },
    "contrast": { "slop": 0, "max": 10 },
    "motion": { "slop": 0, "max": 10 }
  },
  "signals": [
    {
      "id": "A1",
      "name": "purple or blue gradient surface",
      "category": "color",
      "weight": 6,
      "severity": 0.75,
      "penalty": 4.5,
      "evidence": [
        { "selector": "body", "detail": "linear-gradient(135deg, #7c3aed, #2563eb)" }
      ],
      "measured": { "count": 1 }
    }
  ],
  "waived": [],
  "hiddenSelectors": [],
  "notes": [],
  "meta": { "elements": 141, "texts": 77, "surfaces": 28, "durationMs": 41 },
  "compare": {
    "before": { "slop": 69, "design": 31 },
    "after": { "slop": 0, "design": 100 },
    "slop": -69,
    "design": 69,
    "categories": { "color": { "before": 24, "after": 0, "delta": -24 } },
    "removed": ["A1"],
    "remaining": [],
    "appeared": [],
    "warnings": []
  }
}
```

`compare` is present only with `--compare`. `hiddenSelectors` is present in DOM
and static modes.

## Waivers

A waiver is a **write-off with a public reason**, not a mute button.

`trueline.json` in the working directory (or next to the scanned file), or
`--waivers <file>`:

```json
{
  "waivers": [
    {
      "id": "A1",
      "selector": ".brand-hero",
      "reason": "Approved 2026 brand gradient, signed off by the brand owner",
      "until": "2027-01-01"
    }
  ]
}
```

Rules:

- `reason` must be at least 8 characters; a missing reason is ignored.
- `selector` is optional; without it the waiver applies to the whole signal.
- At most 5 waivers apply (`--max-waivers`). Extra waivers are ignored and the
  signal stays.
- Waived signals leave the score, appear in `waived` with their penalty, and in
  the report under **Waivers**.
- A waiver never hides the evidence from the report.

## Thresholds and exit codes

| Flag | Effect |
|---|---|
| `--max-slop N` | exit 2 when `slop > N` |
| `--min-design N` | exit 2 when `design < N` |
| `--min-score N` | alias for `--min-design` |
| rubric mismatch on `--compare` | exit 3 |

Use `--max-slop 20` as the finish line for a full correction, and `--max-slop 45`
to decide whether a correction is warranted. Do not lower a threshold to make a
run pass.

## Anti-gaming

- Hiding an element with `display:none` removes it from the scan, but its selector
  is kept in `hiddenSelectors`. If a before signal disappears and its selector is
  now hidden, `compare.warnings` says so.
- `opacity:0` is not treated as absent: the element is scanned and the page gets
  a note.
- Waivers are capped, need a reason and are listed.
- The rubric and weights are frozen per version.
- The examples and the lint assert the expected score band, so a silent weight
  change fails CI.
