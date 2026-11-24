# trueline — Orbit landing before/after

Screen: `examples/before/landing.html` → `examples/after/landing.html` · mode: computed DOM · rubric 1 · confidence 1

| | Slop | Design |
|---|---:|---:|
| Before | 67 | 33 |
| After | 0 | 100 |
| Change | -67 | +67 |

The slop score fell by 67 points. Every remaining signal is listed below.

## Categories

| Category | Max | Before | After | Delta |
|---|---:|---:|---:|---:|
| color | 30 | 21.2 | 0 | -21.2 |
| layout | 20 | 14.7 | 0 | -14.7 |
| type | 15 | 3.3 | 0 | -3.3 |
| copy | 15 | 12 | 0 | -12 |
| contrast | 10 | 8.7 | 0 | -8.7 |
| motion | 10 | 7.3 | 0 | -7.3 |

## Passes

| Pass | Category | Edits | Score after | Delta |
|---|---|---:|---:|---:|
| 1. Spacing and frame | layout | 2 | — | — |
| 2. Color and depth | color | 4 | — | — |
| 3. Icons | copy | 1 | — | — |
| 4. Copy | copy | 4 | — | — |
| 5. Type | type | 3 | — | — |
| 6. Layout | layout | 4 | — | — |
| 7. Components | layout | 3 | — | — |
| 8. Visual | layout | 2 | — | — |
| 9. Motion | motion | 3 | — | — |

A `—` under *Score after* means no separate scan was recorded for that pass; only the final scan is shown. The edit ledger is still complete.

## Edits

| Pass | Signal | File | Selector | Before | After |
|---|---|---|---|---|---|
| 1. Spacing and frame | B4 | `examples/after/landing.html` | `body` | full-bleed gradient with 20–64px blocks | 1160px page with 28px gutters |
| 1. Spacing and frame | B3 | `examples/after/landing.html` | `.hero` | centered 860px box with 64px padding | two-column hero, 72px top, 64px bottom |
| 2. Color and depth | A1 | `examples/after/landing.html` | `body` | radial pink plus linear-gradient(#6d28d9, #2563eb) | warm paper #f7f4ee with a dark counterpart |
| 2. Color and depth | A6 | `examples/after/landing.html` | `.hero, .card` | rgba(255,255,255,.1) + backdrop-filter: blur(20px) | no glass; solid preview surface |
| 2. Color and depth | A4 | `examples/after/landing.html` | `.card` | 0 20px 48px rgba(30,27,75,.32) | no shadow; hairline only |
| 2. Color and depth | A5 | `examples/after/landing.html` | `.card, section` | 1px rgba(167,139,250,.6) | rgba(31,27,22,.12) hairline |
| 3. Icons | D1 | `examples/after/landing.html` | `.card .emoji` | 🚀 repeated above every feature | one 20px stroke icon per feature |
| 4. Copy | D2 | `examples/after/landing.html` | `h1` | Supercharge your workflow with AI | Run every client project from one quiet page. |
| 4. Copy | D2 | `examples/after/landing.html` | `.sub` | Seamlessly unlock magic insights... game changer! | Orbit keeps scopes, hours, invoices and notes in one place. |
| 4. Copy | D3 | `examples/after/landing.html` | `.stats` | 99.99% / 123,456 / 10x and John Doe quotes | a project preview with real line items |
| 4. Copy | D4 | `examples/after/landing.html` | `.btn` | Get started now | Start a project |
| 5. Type | C1 | `examples/after/landing.html` | `h1` | 32px, weight 800, gradient text | 56px, weight 500, solid ink |
| 5. Type | C3 | `examples/after/landing.html` | `.badge` | uppercase, 0.14em tracking | sentence-case kicker, no tracking |
| 5. Type | C4 | `examples/after/landing.html` | `.sub` | 12–14px body copy | 15–18px body |
| 6. Layout | B3 | `examples/after/landing.html` | `.hero` | centered stack | argument on the left, project preview on the right |
| 6. Layout | B1 | `examples/after/landing.html` | `.grid-3` | three identical feature cards | a two-column feature list |
| 6. Layout | B2 | `examples/after/landing.html` | `.grid-3` | grid-template-columns: repeat(3, 1fr) | grid-template-columns: 1.1fr 0.9fr |
| 6. Layout | B4 | `examples/after/landing.html` | `section` | three sections with identical 24px padding | header, hero, clients, features, footer |
| 7. Components | B5 | `examples/after/landing.html` | `.btn` | border-radius: 999px; gradient fill; glow | 8px radius; solid accent or hairline |
| 7. Components | A5 | `examples/after/landing.html` | `.hero, .card` | 28–32px radius | 14px radius on the preview only |
| 7. Components | E3 | `examples/after/landing.html` | `a, button` | no focus rule | :focus-visible outline 2px, offset 2px |
| 8. Visual | B4 | `examples/after/landing.html` | `.preview` | no product visual | a real project preview with hours, total and budget |
| 8. Visual | D3 | `examples/after/landing.html` | `.clients` | fake quote wall | sample studios named as samples |
| 9. Motion | F1 | `examples/after/landing.html` | `.dot` | animation: pulse 1.4s infinite | removed |
| 9. Motion | F2 | `examples/after/landing.html` | `.btn` | transition: all 300ms; hover:scale(1.04) | background-color / border-color 140ms |
| 9. Motion | F3 | `examples/after/landing.html` | `.grow` | transition: width 400ms | removed |

## Signals removed

- **A1** purple or blue gradient surface — `h1`
- **A2** gradient text — `h1`
- **A3** saturated glow — `span.logo`
- **A4** soft shadow on every surface — `div.card`
- **A5** saturated border — `div.hero`
- **A6** glassmorphism — `div.hero`
- **B1** identical cards repeated — `div.grid-3`
- **B2** three equal columns repeated — `grid`
- **B3** centered stacked hero — `h1`
- **B4** uniform section rhythm — `sections`
- **B5** everything is a pill — `a`
- **C3** uppercase tracked labels — `span.badge`
- **C4** body text too small — `p`
- **D1** emoji in the interface — `span.badge`
- **D2** hype copy and greetings — `h1`
- **D3** placeholder data presented as real — `div.trust`
- **E1** unreadable body text — `div.brand`
- **E2** unreadable meta text — `a`
- **E3** keyboard focus and small targets — `css`
- **F1** decorative infinite animation — `span.dot`
- **F2** transition-all and hover scale — `button.btn`
- **F3** animated layout properties — `div.grow`

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
node <skill>/scripts/scan.mjs examples/after/landing.html
```
