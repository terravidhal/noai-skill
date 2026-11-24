# trueline — Orbit new project form before/after

Input: `examples/after/form.html` · mode: computed DOM · rubric 1 · confidence 1

| | Slop | Design |
|---|---:|---:|
| Before | 54 | 46 |
| After | 0 | 100 |
| Change | -54 | +54 |

The slop score fell by 54 points. Every remaining signal is listed below.

## Categories

| Category | Max | Before | After | Delta |
|---|---:|---:|---:|---:|
| color | 30 | 20.6 | 0 | -20.6 |
| layout | 20 | 8.7 | 0 | -8.7 |
| type | 15 | 4.5 | 0 | -4.5 |
| copy | 15 | 13.2 | 0 | -13.2 |
| contrast | 10 | 2.2 | 0 | -2.2 |
| motion | 10 | 4.3 | 0 | -4.3 |

## Passes

| Pass | Category | Edits | Score after | Delta |
|---|---|---:|---:|---:|
| 1. Spacing and frame | layout | 3 | — | — |
| 2. Color and depth | color | 5 | — | — |
| 3. Icons | copy | 2 | — | — |
| 4. Copy | copy | 4 | — | — |
| 5. Type | type | 4 | — | — |
| 6. Layout | layout | 4 | — | — |
| 7. Components | layout | 4 | — | — |
| 8. Visual | layout | 2 | — | — |
| 9. Motion | motion | 2 | — | — |

## Edits

| Pass | Signal | File | Selector | Before | After |
|---|---|---|---|---|---|
| 1. Spacing and frame | B3 | `examples/after/form.html` | `body` | centered 520px card with 40px padding | 1040px page, two columns, 56px top |
| 1. Spacing and frame | B4 | `examples/after/form.html` | `.panel` | 34px padding inside the glass card | 24px padding on a solid panel |
| 1. Spacing and frame | B4 | `examples/after/form.html` | `form` | 14px gaps with no field groups | two fieldsets, 16px gaps on a 4px grid |
| 2. Color and depth | A1 | `examples/after/form.html` | `body` | linear-gradient(135deg, #6d28d9, #2563eb) | solid #f6f7f9 with a dark counterpart |
| 2. Color and depth | A6 | `examples/after/form.html` | `.card` | rgba(255,255,255,.12) + backdrop-filter: blur(22px) | solid panel with a hairline |
| 2. Color and depth | A4 | `examples/after/form.html` | `.proof-card` | 0 18px 40px rgba(30,27,75,.32) on three cards | removed |
| 2. Color and depth | A5 | `examples/after/form.html` | `.proof-card` | 1px rgba(167,139,250,.6) | no saturated border |
| 2. Color and depth | A7 | `examples/after/form.html` | `.tag` | five saturated badge colours | one accent, no badge wall |
| 3. Icons | D1 | `examples/after/form.html` | `label` | ✨ 👋 📧 🏢 📈 💬 on every label | plain labels, no icon |
| 3. Icons | D1 | `examples/after/form.html` | `.proof` | ⭐ 🚀 ✨ as proof icons | numbered steps, no icons |
| 4. Copy | D2 | `examples/after/form.html` | `h1` | Let us supercharge your onboarding! 🚀 | Tell us what the project needs to cover. |
| 4. Copy | D2 | `examples/after/form.html` | `.sub` | Seamlessly set up your first project... Trusted by 10,000+ teams! | Two fields decide the rest; both can change later. |
| 4. Copy | D3 | `examples/after/form.html` | `input` | John Doe / Jane Doe / you@example.com / Acme Corp | Mara / Ellis / mara@northwind.studio / Northwind |
| 4. Copy | D4 | `examples/after/form.html` | `.btn` | Continue to the next step | Create project |
| 5. Type | C1 | `examples/after/form.html` | `h1` | 28px, weight 800, gradient text | 44px, weight 500, solid ink |
| 5. Type | C3 | `examples/after/form.html` | `label` | uppercase, 0.12em tracking | sentence case, 13px |
| 5. Type | C4 | `examples/after/form.html` | `.sub` | 12px body copy | 16px lede and 15px inputs |
| 5. Type | E2 | `examples/after/form.html` | `.help` | 12px at 1.79:1 on transparency | 12px meta at 4.6:1 on solid surfaces |
| 6. Layout | B3 | `examples/after/form.html` | `main` | one centered stack | intro with steps on the left, form on the right |
| 6. Layout | B1 | `examples/after/form.html` | `.proof` | three identical proof cards | removed |
| 6. Layout | B2 | `examples/after/form.html` | `.proof` | grid-template-columns: repeat(3, 1fr) | no three-column grid |
| 6. Layout | B4 | `examples/after/form.html` | `form` | one flat list of ten fields | two fieldsets: client, then scope |
| 7. Components | B5 | `examples/after/form.html` | `input, select, textarea` | border-radius: 999px; translucent fill | 8px radius; solid field; visible border |
| 7. Components | A5 | `examples/after/form.html` | `.panel` | 30px radius with a saturated border | 12px radius with a hairline |
| 7. Components | E3 | `examples/after/form.html` | `a, button, input, select, textarea` | no focus rule | :focus-visible outline 2px, offset 2px |
| 7. Components | E3 | `examples/after/form.html` | `.check input` | 18px, no minimum target | 24px checkbox; inline links reach 24px |
| 8. Visual | B1 | `examples/after/form.html` | `.proof, .tags, .quote` | fake proof wall with 10x stats and testimonials | three real steps and a note about what is shared |
| 8. Visual | D4 | `examples/after/form.html` | `.panel` | no indication of what happens next | field hints, privacy note and draft action |
| 9. Motion | F1 | `examples/after/form.html` | `.dot` | animation: pulse 1.5s infinite | removed |
| 9. Motion | F2 | `examples/after/form.html` | `input, .btn` | transition: all 260ms; hover:scale(1.03) | border-color / background-color 140ms |

## Signals removed

- **A1** purple or blue gradient surface — `h1`
- **A2** gradient text — `h1`
- **A3** saturated glow — `main.card`
- **A5** saturated border — `main.card`
- **A6** glassmorphism — `main.card`
- **A7** many saturated hues in the chrome — `page`
- **B1** identical cards repeated — `div.proof`
- **B3** centered stacked hero — `h1`
- **B5** everything is a pill — `input`
- **C3** uppercase tracked labels — `div.eyebrow`
- **C4** body text too small — `p.sub`
- **D1** emoji in the interface — `h1`
- **D2** hype copy and greetings — `h1`
- **D3** placeholder data presented as real — `p.sub`
- **D4** wordy labels and placeholders — `textarea`
- **E2** unreadable meta text — `div.eyebrow`
- **E3** keyboard focus and small targets — `input`
- **F1** decorative infinite animation — `span.dot`
- **F2** transition-all and hover scale — `input`

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
node scan.mjs examples/after/form.html
```
