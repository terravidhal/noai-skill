# trueline — Orbit pricing before/after

Screen: `examples/before/pricing.html` → `examples/after/pricing.html` · mode: computed DOM · rubric 1 · confidence 1

| | Slop | Design |
|---|---:|---:|
| Before | 64 | 36 |
| After | 0 | 100 |
| Change | -64 | +64 |

The slop score fell by 64 points. Every remaining signal is listed below.

## Categories

| Category | Max | Before | After | Delta |
|---|---:|---:|---:|---:|
| color | 30 | 21.2 | 0 | -21.2 |
| layout | 20 | 13.3 | 0 | -13.3 |
| type | 15 | 4.9 | 0 | -4.9 |
| copy | 15 | 12 | 0 | -12 |
| contrast | 10 | 8.7 | 0 | -8.7 |
| motion | 10 | 4.3 | 0 | -4.3 |

## Passes

| Pass | Category | Edits | Score after | Delta |
|---|---|---:|---:|---:|
| 1. Spacing and frame | layout | 3 | — | — |
| 2. Color and depth | color | 5 | — | — |
| 3. Icons | copy | 1 | — | — |
| 4. Copy | copy | 4 | — | — |
| 5. Type | type | 4 | — | — |
| 6. Layout | layout | 4 | — | — |
| 7. Components | layout | 3 | — | — |
| 8. Visual | layout | 2 | — | — |
| 9. Motion | motion | 3 | — | — |

A `—` under *Score after* means no separate scan was recorded for that pass; only the final scan is shown. The edit ledger is still complete.

## Edits

| Pass | Signal | File | Selector | Before | After |
|---|---|---|---|---|---|
| 1. Spacing and frame | B4 | `examples/after/pricing.html` | `.nav` | padding: 20px 40px | header inside a 1160px page with 28px gutters |
| 1. Spacing and frame | B3 | `examples/after/pricing.html` | `.hero` | max-width: 880px; padding: 56px 32px | two-column grid, 56px top, 40px bottom |
| 1. Spacing and frame | B4 | `examples/after/pricing.html` | `section` | 26px padding, three identical blocks | one table plus a two-column notes row |
| 2. Color and depth | A1 | `examples/after/pricing.html` | `body` | linear-gradient(135deg, #6d28d9, #2563eb) plus a pink radial | solid #f6f7f9 with a dark counterpart |
| 2. Color and depth | A6 | `examples/after/pricing.html` | `.hero` | rgba(255,255,255,.1) + backdrop-filter: blur(22px) | no glass; type on the page background |
| 2. Color and depth | A4 | `examples/after/pricing.html` | `.plan` | 0 22px 52px rgba(30,27,75,.34) | no shadow; a 1px hairline inside the table |
| 2. Color and depth | A5 | `examples/after/pricing.html` | `.plan, .hero` | 1px rgba(167,139,250,.6) border | rgba(18,22,31,.12) hairline |
| 2. Color and depth | A7 | `examples/after/pricing.html` | `.ribbon, .toggle .on` | five saturated accents | one teal accent used for the primary action |
| 3. Icons | D1 | `examples/after/pricing.html` | `.plan ul li` | ✅ emoji on every row | one 18px check stroke in the table |
| 4. Copy | D2 | `examples/after/pricing.html` | `h1` | Supercharge your team with AI | Pay for active projects, not seats. |
| 4. Copy | D2 | `examples/after/pricing.html` | `.lede` | Seamlessly unlock magic insights... Trusted by 10,000+ teams! | Every plan includes scopes, hours, invoices and client notes. |
| 4. Copy | D3 | `examples/after/pricing.html` | `.quote` | John Doe and 99.99% / 123,456 proof points | plan limits, prices and two real questions |
| 4. Copy | D4 | `examples/after/pricing.html` | `.btn` | Get started now | Choose a plan / Start with Studio |
| 5. Type | C1 | `examples/after/pricing.html` | `h1` | 34px, weight 800, gradient text | 46px, weight 500, solid ink |
| 5. Type | C3 | `examples/after/pricing.html` | `.badge, .ribbon` | uppercase, 0.14em tracking | sentence case, no tracking |
| 5. Type | C4 | `examples/after/pricing.html` | `.quote` | 12px body copy | 15px body, 12px short meta only |
| 5. Type | C5 | `examples/after/pricing.html` | `.price span` | -0.5px tracking at 12px | zero tracking below 16px |
| 6. Layout | B3 | `examples/after/pricing.html` | `.hero` | centered stack with a pill toggle | left-aligned argument and a small start panel |
| 6. Layout | B1 | `examples/after/pricing.html` | `.grid-3` | three identical plan cards | one comparison table with three different plans |
| 6. Layout | B2 | `examples/after/pricing.html` | `.stats` | 3x3 equal columns of fake proof | one table, no repeated stat grid |
| 6. Layout | B4 | `examples/after/pricing.html` | `section` | three sections with the same 26px padding | table and notes with different rhythms |
| 7. Components | B5 | `examples/after/pricing.html` | `.btn` | border-radius: 999px; gradient fill; glow | 8px radius; solid accent or hairline |
| 7. Components | A5 | `examples/after/pricing.html` | `.plans, .start` | 26–32px radius with saturated border | 12px radius with a hairline |
| 7. Components | E3 | `examples/after/pricing.html` | `a, button, summary` | no focus rule | :focus-visible outline 2px, offset 2px |
| 8. Visual | B4 | `examples/after/pricing.html` | `.plans` | emoji feature lists and a glowing ribbon | a real comparison table with limits and prices |
| 8. Visual | B1 | `examples/after/pricing.html` | `.notes` | three repeated stat blocks | included items next to two questions |
| 9. Motion | F1 | `examples/after/pricing.html` | `.dot` | animation: pulse 1.4s infinite | removed |
| 9. Motion | F2 | `examples/after/pricing.html` | `.plan, .links a` | transition: all 300ms; hover:scale(1.05) | background-color / border-color 140ms |
| 9. Motion | F3 | `examples/after/pricing.html` | `.grow` | transition: width 400ms | removed |

## Signals removed

- **A1** purple or blue gradient surface — `h1`
- **A2** gradient text — `h1`
- **A3** saturated glow — `span.logo`
- **A4** soft shadow on every surface — `div.plan`
- **A5** saturated border — `div.hero`
- **A6** glassmorphism — `div.hero`
- **B1** identical cards repeated — `div.grid-3`
- **B2** three equal columns repeated — `grid`
- **B3** centered stacked hero — `h1`
- **B4** uniform section rhythm — `sections`
- **B5** everything is a pill — `a`
- **C3** uppercase tracked labels — `span.badge`
- **C4** body text too small — `p.quote`
- **C5** negative tracking on small text — `span`
- **D1** emoji in the interface — `span.badge`
- **D2** hype copy and greetings — `h1`
- **D3** placeholder data presented as real — `p.sub`
- **E1** unreadable body text — `div.brand`
- **E2** unreadable meta text — `a`
- **E3** keyboard focus and small targets — `css`
- **F1** decorative infinite animation — `span.dot`
- **F2** transition-all and hover scale — `a`

## Signals remaining

- None measured.

## Verification

- [x] Before and after scored with the same rubric and viewport.
- [ ] Build and typecheck pass on the project that owns the screen.
- [ ] Keyboard focus is visible on every control; targets are at least 24 px.
- [ ] Light and dark themes both read; mobile width 390 checked.
- [ ] No feature, claim or data was invented during the correction.

Score with the same command to reproduce:

```bash
node <skill>/scripts/scan.mjs examples/after/pricing.html
```
