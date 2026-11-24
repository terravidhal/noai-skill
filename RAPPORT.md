# trueline — Orbit workspace before/after

Input: `examples/after/dashboard.html` · mode: computed DOM · rubric 1 · confidence 1

| | Slop | Design |
|---|---:|---:|
| Before | 69 | 31 |
| After | 0 | 100 |
| Change | -69 | +69 |

The slop score fell by 69 points. Every remaining signal is listed below.

## Categories

| Category | Max | Before | After | Delta |
|---|---:|---:|---:|---:|
| color | 30 | 24 | 0 | -24 |
| layout | 20 | 9.7 | 0 | -9.7 |
| type | 15 | 2.6 | 0 | -2.6 |
| copy | 15 | 13.8 | 0 | -13.8 |
| contrast | 10 | 8.7 | 0 | -8.7 |
| motion | 10 | 10 | 0 | -10 |

## Passes

| Pass | Category | Edits | Score after | Delta |
|---|---|---:|---:|---:|
| 1. Spacing and frame | layout | 3 | — | — |
| 2. Color and depth | color | 5 | — | — |
| 3. Icons | copy | 1 | — | — |
| 4. Copy | copy | 5 | — | — |
| 5. Type | type | 4 | — | — |
| 6. Layout | layout | 4 | — | — |
| 7. Components | layout | 3 | — | — |
| 8. Visual | layout | 2 | — | — |
| 9. Motion | motion | 3 | — | — |

## Edits

| Pass | Signal | File | Selector | Before | After |
|---|---|---|---|---|---|
| 1. Spacing and frame | B4 | `examples/after/dashboard.html` | `.shell` | gap: 24px; padding: 24px | grid 248px + fluid; no outer padding |
| 1. Spacing and frame | B4 | `examples/after/dashboard.html` | `.main` | padding: 24px | padding: 28px 32px 40px |
| 1. Spacing and frame | B4 | `examples/after/dashboard.html` | `.nav a` | padding: 10px 14px; gap: 8px | min-height: 34px; padding: 6px 10px; gap: 2px |
| 2. Color and depth | A1 | `examples/after/dashboard.html` | `body` | linear-gradient(135deg, #7c3aed, #2563eb) | background: #f6f7f9 |
| 2. Color and depth | A6 | `examples/after/dashboard.html` | `.sidebar, .panel` | rgba(255,255,255,.12) + backdrop-filter: blur(22px) | solid #fff with 1px hairline |
| 2. Color and depth | A4 | `examples/after/dashboard.html` | `.card` | 0 18px 48px rgba(15,23,42,.28) | no shadow; 1px hairline |
| 2. Color and depth | A3 | `examples/after/dashboard.html` | `.mark, .dot` | saturated glow shadows | flat accent, no glow |
| 2. Color and depth | A7 | `examples/after/dashboard.html` | `.badge` | five saturated badge colors | removed; one quiet status |
| 3. Icons | D1 | `examples/after/dashboard.html` | `.nav a` | emoji labels (📊 🚀 👥 💳 ⚙️) | 16px line icons, one stroke |
| 4. Copy | D2 | `examples/after/dashboard.html` | `h1` | Welcome back, Alex! 👋 | Overview |
| 4. Copy | D2 | `examples/after/dashboard.html` | `.lede` | Seamlessly unlock magic insights... | Four projects are active this month... |
| 4. Copy | D2 | `examples/after/dashboard.html` | `.tiny` | +12%!! | +12% vs October |
| 4. Copy | D3 | `examples/after/dashboard.html` | `.card .big` | $123,456 | $48,210 |
| 4. Copy | D4 | `examples/after/dashboard.html` | `button` | Search anything... | Export |
| 5. Type | C1 | `examples/after/dashboard.html` | `body` | 12px body, weights 700-800 | 14px body, weights 400-600 |
| 5. Type | C1 | `examples/after/dashboard.html` | `h1` | 20px, weight 800, letter-spacing -0.5px | 32px, weight 500, letter-spacing -0.01em |
| 5. Type | C3 | `examples/after/dashboard.html` | `.eyebrow` | uppercase, 0.12em tracking | sentence case, no tracking |
| 5. Type | E2 | `examples/after/dashboard.html` | `.muted` | 12px #9ca3af on translucency | 12px #5f6a7d on solid surfaces |
| 6. Layout | B3 | `examples/after/dashboard.html` | `.hero` | centered hero card above the grid | left-aligned header, no hero card |
| 6. Layout | B1 | `examples/after/dashboard.html` | `.grid-3` | two rows of three identical cards | metrics strip + wide chart + narrow list |
| 6. Layout | B2 | `examples/after/dashboard.html` | `.grid-3` | grid-template-columns: repeat(3, 1fr) | 1.6fr chart / 0.8fr list |
| 6. Layout | B4 | `examples/after/dashboard.html` | `section` | three sections with identical padding | one table panel; section padding varies |
| 7. Components | B5 | `examples/after/dashboard.html` | `.btn` | border-radius: 999px; gradient fill | border-radius: 8px; solid accent |
| 7. Components | A5 | `examples/after/dashboard.html` | `.panel, table` | border-radius: 24px, saturated border | border-radius: 12px, hairline |
| 7. Components | E3 | `examples/after/dashboard.html` | `.btn, .nav a` | no focus rule | :focus-visible outline 2px |
| 8. Visual | B4 | `examples/after/dashboard.html` | `.chart` | gradient progress bar, no data | six-month revenue line with labels and one highlighted point |
| 8. Visual | B1 | `examples/after/dashboard.html` | `table` | three repeated activity sections | recent projects table with real columns |
| 9. Motion | F1 | `examples/after/dashboard.html` | `.dot` | animation: pulse 1.6s infinite | static status dot |
| 9. Motion | F2 | `examples/after/dashboard.html` | `.card, .nav a` | transition: all 300ms; hover:scale(1.03) | transition background-color / color 150ms |
| 9. Motion | F3 | `examples/after/dashboard.html` | `.grow` | transition: width 400ms | removed |

## Signals removed

- **A1** purple or blue gradient surface — `a.active`
- **A2** gradient text — `h1`
- **A3** saturated glow — `aside.sidebar`
- **A4** soft shadow on every surface — `aside.sidebar`
- **A5** saturated border — `aside.sidebar`
- **A6** glassmorphism — `aside.sidebar`
- **B1** identical cards repeated — `div.grid-3`
- **B4** uniform section rhythm — `sections`
- **B5** everything is a pill — `a.active`
- **C3** uppercase tracked labels — `div.eyebrow`
- **C4** body text too small — `p`
- **D1** emoji in the interface — `a.active`
- **D2** hype copy and greetings — `h1`
- **D3** placeholder data presented as real — `p`
- **D4** wordy labels and placeholders — `button.btn.ghost`
- **E1** unreadable body text — `div.brand`
- **E2** unreadable meta text — `div.eyebrow`
- **E3** keyboard focus and small targets — `css`
- **F1** decorative infinite animation — `span.dot`
- **F2** transition-all and hover scale — `a.active`
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
node scan.mjs examples/after/dashboard.html
```
