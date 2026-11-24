# Passes — order, values, finish condition

Finish one pass across the whole screen before starting the next. After each
pass: re-scan, append the real score and the edits to `trueline/passes.json`.

The values below are starting points for a correction without an existing design
system. If the project already has a coherent system, keep its values and fix how
they are used. The direction can move the ramp, the accent and the type.

## Starting tokens

### Space

`4 8 12 16 20 24 32 40 48 64 80 96 128`

| Use | Value |
|---|---|
| Inside a control | 4–12 |
| Between rows of a list | 2–8 |
| Between a label and its group | 8–12 |
| Between groups | 12–24 |
| Between sections | 32–64; landing 80–128 |
| Navigation row | 32–36 tall, 2–4 gap |
| Page padding | 24–32 |
| Hero, nav to headline | 96–128 desktop, 48–64 mobile |

A 2 px nudge inside a small control is fine when it centres something. A random
`13px` or `31px` outside a control is not.

### Neutral ramps

Keep a surface neutral. The world tints the ramp, not turns it into a colour.

| Role | Graphite dark | Warm dark | Ink dark |
|---|---|---|---|
| Deepest | `#0f0f10` | `#12110f` | `#07080d` |
| Page | `#141415` | `#161513` | `#0b0d14` |
| Card | `#19191b` | `#1c1a18` | `#11141c` |
| Raised | `#232325` | `#262421` | `#1a1e28` |
| Primary text | `#ededed` | `#efe9de` | `#eef0f5` |
| Secondary | `#a1a1a6` | `#aaa398` | `#a3a9b8` |
| Muted | `#85858b` | `#8a847a` | `#7a8296` |

| Role | Graphite light | Warm light | Ink light |
|---|---|---|---|
| Page | `#fafafa` | `#f7f4ee` | `#f5f7fa` |
| Card | `#ffffff` | `#fdfbf7` | `#ffffff` |
| Raised | `#f4f4f5` | `#efe9df` | `#eceff4` |
| Primary text | `#171717` | `#1f1b16` | `#111827` |
| Secondary | `#525252` | `#5e554a` | `#4b5565` |
| Muted | `#737373` | `#7b7266` | `#6b7487` |

Three text roles. Hairlines are the primary text at 8–12 % opacity. Semantic
green/red stay toned and only carry meaning.

### Accent

One accent, a few percent of the screen: primary action, selection, one figure.
Take it from the world or a real brand colour, never from the purple-to-blue
family unless the brand truly is purple. Text on the accent reaches 4.5:1; if it
does not, darken the accent or use dark text.

### Type

| Use | Size | Line height | Weight |
|---|---|---|---|
| Meta, labels | 12 | 16 | 400 |
| Caption | 13–14 | 20 | 400 |
| Body, nav | 14–15 | 20–22 | 400–500 |
| Brand wordmark | 16–18 | 1 | 500–600 |
| Card figure | 28–32 | 1 | 500, tabular |
| Page title | 28–36 | 1.15 | 400–500 |
| Hero | 56–72 desktop, 36–44 mobile | 1.02–1.08 | 400–500 |

Zero tracking under 16 px. `-0.02em` from 40 px, `-0.03em` from 56 px. Numbers use
`font-variant-numeric: tabular-nums` and one format.

### Radius and depth

| Element | Radius |
|---|---|
| Keycap, tag, small control | 4–6 |
| Row, input, button | 8–10 |
| Card | 12–16 |
| Panel, window | 14–20 |

Nested radius: `inner = outer − padding`, never below 4.

- Dark depth: surface steps plus a hairline. A top highlight
  `inset 0 1px 0 rgba(255,255,255,0.12)` is allowed on a raised control.
- Light depth: `0 1px 2px rgba(0,0,0,0.05)` for small things,
  `0 8px 24px rgba(0,0,0,0.06)` for a floating layer. Never on every card.

### Motion

One easing curve: `cubic-bezier(0.22, 1, 0.36, 1)`.

| Use | Duration |
|---|---|
| Hover, press | 120–180 ms |
| Menu, popover | 160–220 ms |
| Entrance, sheet | 300–500 ms |

Enter 6–12 px, press 0.97–0.98. Transition colour, background, border, opacity and
transform only.

---

## Pass 1 — Spacing and frame

**Signals.** B1, B3, B4, B5, sometimes C1 (line length).

- Put every margin, padding, gap and fixed height on the 4 px scale, except a
  2 px optical nudge inside a control.
- Equal things get equal padding and equal height: rows in one list, cards in one
  row, icons in one column.
- Space shows grouping: inside a group smaller than between groups.
- Align: icons in one column, labels on one line, numbers right-aligned.
- App shell: sidebar 240–280, fluid content, page padding 24–32, top bar 56–64.
  A dashboard fills the viewport and continues below; it is never a narrow
  centred column.
- Do not change the sections or their order.

**Done when** every visible edge traces to the scale and the same kind of block
has the same padding.

## Pass 2 — Colour and depth

**Signals.** A1–A7, E1, E2.

- One neutral ramp for page, surface, raised, hairline and three text roles.
- One accent. The chrome stays quiet; richness belongs to the content moment.
- Remove hue gradients on chrome, gradient text, coloured glows, coloured
  shadows, radial washes and neon borders.
- Borders are hairlines. Depth is a surface step plus a hairline, not fog.
- Fix contrast now: body ≥ 4.5:1, large text ≥ 3:1, meta ≥ 4.5:1 at 12 px.
- Semantic colour only when it means something; tone it into the ramp.

**Done when** a grayscale screenshot still has a clear hierarchy and one accent
is identifiable.

## Pass 3 — Icons

**Signal.** D1, sometimes B5.

- Every emoji used as a nav icon, badge, stat or label decoration becomes a line
  icon from one set (the project's set, otherwise Lucide) or disappears.
- One size (16 or 18), one stroke (1.5), one colour role.
- Same icon box width in every row, fixed gap (8–10) to the label.
- An icon that adds nothing is removed. Status gets a 6–8 px dot.

**Done when** no emoji remains in interface text and every icon aligns.

## Pass 4 — Copy

**Signals.** D1–D4, sometimes C1.

- Headlines say what the product does for whom, with the nouns already on the
  page. No invented feature, customer or number.
- No exclamation marks, no greetings, no hype words.
- Labels are short: `Search`, `Export`, `New project`.
- A change names its comparison: `+12% vs October`.
- Short strings have no trailing period; paragraphs keep theirs.
- Unverifiable claims (`10,000+ teams`, `10x faster`) are removed or confirmed by
  the user, never quietly kept.
- Sample data looks plausible and consistent; no `[X]`, `Lorem`, `123,456`.

**Done when** a competitor's name could not replace the product name without the
copy becoming false.

## Pass 5 — Type

**Signals.** C1–C5, E1, E2.

- Choose the family for the direction; keep a real brand face. One interface
  family, at most one partner for display or figures.
- Three sizes minimum on a screen, a clear ratio between body and title.
- Two weights (400/500), 600 only for rare emphasis. No 800/900 headings.
- Sentence case. Uppercase tracked labels become sentence case.
- No negative tracking under 16 px, no italic for emphasis.
- Numbers in one format with tabular figures.
- Line length 45–75 characters for body copy.

**Done when** squinting at the page still shows title, section and body as three
different levels.

## Pass 6 — Layout

**Signals.** B1–B4, C1.

- Keep sections and their order. Inside a section you may re-proportion.
- Replace a row of identical cards with a rhythm: one wide block, compact stats,
  a list, a table. Vary widths by what the content needs.
- Break the centered stacked hero: asymmetric split with the product beside the
  text, or text over a large real view. Left-align long headlines.
- One primary action and at most one secondary in the hero.
- Compose the first screen as a whole: no dead band, no card floating in a void.
- On mobile everything stacks in reading order; a dense preview simplifies
  instead of scaling down.

**Done when** the page has a focal point, a second level and a quiet third level.

## Pass 7 — Components and details

**Signals.** B5, A5, E3, sometimes B1.

- Radius by size and nested radius math. Not everything is a pill.
- Search, buttons, inputs and cards share one control radius.
- Counts and meta become quiet mono text or a keycap, not glowing pills.
- Badges (`PRO`, `New ✨`, `Beta 🚀`) go unless the product needs one, then as
  quiet text.
- Charts: one main chart, muted grid, mono labels, one accent on the thing that
  matters, neutral steps for the rest. No rainbow bars in one series.
- Stat cards: label, figure, comparison. No sparkline or icon added to fill them.
- Visible focus ring; hover and press stay inside the palette.
- Real states: header, selected, focus and disabled all read apart.

**Done when** a keyboard user can see where they are and no component looks like
a default template.

## Pass 8 — Visual

**Signal.** Usually none; it protects the result from becoming a new template.

- Remove filler: blobs, orbs, grids, glowing lines, stock robots.
- A landing hero gets a visual that shows something true: a product preview in
  code, a real screenshot, or one image from the product's world.
- Dashboards rarely need images. Their moment is a real chart, a figure set with
  care, real content, a physical object built in code.
- The visual must carry at least one crafted moment (a chart, an object, a
  product view), not just a framed empty box.
- If an image tool is available, write the prompt for the missing scene and leave
  a correctly sized slot. Do not call a paid service without permission.

**Done when** the screen would still work without the visual, and the visual
still earns its place.

## Pass 9 — Motion

**Signals.** F1–F3.

- Remove loops that mean nothing: pulse, ping, shimmer, breathing, floating,
  parallax.
- Remove `transition-all`, bouncy springs and `hover:scale` on cards.
- Name the properties: `transition: color 150ms`, `transition: background-color,
  border-color 150ms`.
- One easing curve, a few durations. Press scale down, not up.
- At most one entrance on load, a short fade and rise with a small stagger.

**Done when** nothing moves unless the user does something or data changes.
