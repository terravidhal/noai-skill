# Signals — what the scanner measures

Each signal has an id, a category, a weight and a measurable evidence field. A
signal fires only when its threshold is crossed, so a page is never penalised for
using a technique in a deliberate, isolated way.

The score is `Σ weight × severity`. Severity is a number from 0 to 1: a count of
3 emoji is not the same as 30, a shadow on 2 of 20 surfaces is not "everywhere".
Weights and normalisation live in [scoring.md](scoring.md).

Two families are counted from the DOM; `--image` estimates only the ones marked
*image*. Contrast, copy, type and layout need the DOM.

---

## Colour

### A1 — Purple or blue gradient surface · 6 · *image*
**Detect.** A `linear-gradient` or `radial-gradient` on a reasonably sized surface
whose stops include a hue between 235° and 305° and span at least 20° of hue.
**Not** a small tone shift inside one neutral.
**Fix.** One solid neutral surface. Put colour in one accent or inside the
content moment, never across the chrome.
**Evidence.** Selector, the whole gradient value, the area.

### A2 — Gradient text · 6
**Detect.** `background-clip: text` (or `-webkit-`) with a transparent text colour
on an element that has visible text.
**Fix.** The primary text colour. If the headline needs emphasis, use size,
weight or a single accent word in a solid colour.
**Evidence.** Selector, the clipped gradient, the text.

### A3 — Saturated glow · 5 · *image*
**Detect.** `box-shadow` or `drop-shadow()` with saturation above 0.45, alpha at
least 0.15 and blur at least 12 px.
**Fix.** Remove it. On dark surfaces, depth comes from surface steps and a
hairline; on light surfaces, at most a small neutral shadow.
**Evidence.** Selector, full shadow value.

### A4 — Soft shadow on every surface · 4 · *image*
**Detect.** Share of surfaces (120 × 60 px or more) with a shadow of blur ≥ 16 px
and alpha ≤ 0.35. Fires above 35 % of surfaces, saturates at 90 %.
**Fix.** One shadow language: hairlines for panels, a single small shadow for
things that truly float. Do not remove the border and keep the fog.
**Evidence.** Surface count, count with soft shadow, share.

### A5 — Saturated border · 3
**Detect.** A border at least 1 px with saturation above 0.5, alpha above 0.4 and
a colour visibly different from its own fill.
**Fix.** A hairline from the text colour at 8–12 % opacity. A filled accent button
does not need an accent border.
**Evidence.** Selector, border width and colour.

### A6 — Glassmorphism · 3
**Detect.** `backdrop-filter: blur(...)` together with a translucent background.
**Fix.** A solid raised surface with a hairline. Keep blur only for a real
overlay that sits over moving content.
**Evidence.** Selector, backdrop filter, background alpha.

### A7 — Many saturated hues in the chrome · 3 · *image*
**Detect.** More than four distinct 30° hue buckets across backgrounds and
borders of visible chrome.
**Fix.** One neutral ramp, one accent, semantic colours only where they mean
something.
**Evidence.** The hue buckets found.

---

## Layout

### B1 — Identical cards repeated · 7
**Detect.** Three or more siblings that are surfaces with the same tag, the same
dimensions (±2 px) and the same child structure, or the same class signature in
static mode.
**Fix.** Give the grid a rhythm: one wide block, compact strips, varied weights.
Do not make one card different just to dodge the rule — change what each block
holds and how much room it needs.
**Evidence.** Parent selector, count, size.

### B2 — Three equal columns repeated · 4
**Detect.** `repeat(3, …)` or three equal horizontal children, in at least two
places. Stacked lists do not count.
**Fix.** Use the content to choose the proportions: 1.6fr / 0.8fr, a wide table,
a two-column split.
**Evidence.** Number of such grids.

### B3 — Centered stacked hero · 4
**Detect.** An `h1`/`h2` with `text-align: center`, inside a stacked block, at the
top of the page (or a large centered heading).
**Fix.** Left-align long headlines; use an asymmetric split, text beside the
product, or text over a large real view. Keep centering for a short hero with no
visual.
**Evidence.** Heading selector and text.

### B4 — Uniform section rhythm · 3
**Detect.** Three or more `<section>` elements with the same top/bottom padding
and the same display shape (and, in DOM mode, similar height).
**Fix.** Vary the rhythm by content: a tight header, a wide data block, a quiet
footer. Equal padding everywhere reads as a template.
**Evidence.** Repeated section shapes.

### B5 — Everything is a pill · 2
**Detect.** At least 60 % of controls have a radius of half their height or more
(999 px in static mode), with at least three controls.
**Fix.** Radius by size: 4–6 keycap, 8–10 control, 12–16 card, 14–20 panel.
Nested radius: inner = outer − padding, never below 4.
**Evidence.** Control count, pill count, share.

---

## Type

### C1 — Flat type hierarchy · 5
**Detect.** Few distinct font sizes and a largest/smallest ratio below 1.4, or a
single size across meaningful text.
**Fix.** A real scale: 12, 14, 16, 18, 24, 32, 48, 56. Hierarchy comes from size
and colour, not from weight 800.
**Evidence.** Sizes found.

### C2 — Too many type variants · 3
**Detect.** More than three weights or more than eight sizes.
**Fix.** Two weights (400/500), 600 only for rare emphasis. One family, plus at
most one partner for display or figures.
**Evidence.** Weight list and size list.

### C3 — Uppercase tracked labels · 3
**Detect.** `text-transform: uppercase` with tracking of at least 0.05 em on short
text, twice or more.
**Fix.** Sentence case, normal tracking. If a label needs distance, use space,
not letter-spacing.
**Evidence.** Selector, text, tracking.

### C4 — Body text too small · 2
**Detect.** Body copy (60 characters or more) below 13 px.
**Fix.** 14–16 px body, 20–24 px line height. Meta can stay at 12 px with enough
contrast.
**Evidence.** Size and excerpt.

### C5 — Negative tracking on small text · 2
**Detect.** Letter-spacing below −0.2 px under 16 px.
**Fix.** Zero or slightly positive. Negative tracking belongs to display text
from 40 px.
**Evidence.** Size and tracking.

---

## Copy

### D1 — Emoji in the interface · 5
**Detect.** Extended pictographic characters in visible text, `alt`, `aria-label`,
`title` or placeholder.
**Fix.** One line-icon set at one size and stroke, or nothing. An emoji in a
personal message is not chrome; an emoji in a nav, badge, stat or button is.
**Evidence.** Selector and excerpt.

### D2 — Hype copy and greetings · 4
**Detect.** Exclamation marks, `Welcome back`, `Good morning`, and a fixed list:
supercharge, seamless, unlock, magic, revolutionize, game-changing, unleash,
elevate, effortless, cutting-edge, next-level, world-class, trusted by, loved by,
10x, AI-powered.
**Fix.** Say what the thing does. A change says what it compares to:
`+12% vs October`. No exclamation marks.
**Evidence.** Selector and excerpt.

### D3 — Placeholder data presented as real · 3
**Detect.** `[X]`, `123,456`, Lorem ipsum, `10,000+`, `99.99%`, John/Jane Doe, Acme
Corp, Foo Bar, `Your Company`, `example.com`.
**Fix.** Use plausible data from the page or remove the claim. Never invent a
metric or a customer.
**Evidence.** Selector and excerpt.

### D4 — Wordy labels and placeholders · 3
**Detect.** Control/label text ending with a period, `Search anything…`,
`Enter your…`, `Click here`, or a button longer than eight words.
**Fix.** `Search`, `Export`, `New project`. The surrounding layout explains the
rest.
**Evidence.** Selector and excerpt.

---

## Contrast and accessibility

### E1 — Unreadable body text · 5
**Detect.** Text above 13 px with a contrast ratio below 4.5:1 against its
resolved background, excluding large or bold large text (3:1). Gradient text is
skipped in DOM mode.
**Fix.** Move the colour toward the primary or secondary role of the ramp. Do not
fix it by making the background pure white if the theme is tinted.
**Evidence.** Selector, ratio, excerpt.

### E2 — Unreadable meta text · 2
**Detect.** Text at 13 px or below with a contrast ratio below 3:1.
**Fix.** Muted meta still needs to be read: aim for 4.5:1 at 12 px on the surface
it sits on.
**Evidence.** Selector, ratio, excerpt.

### E3 — Focus and small targets · 3
**Detect.** No `:focus` or `:focus-visible` rule in the stylesheets, plus controls
smaller than 24 × 24 px that are on screen.
**Fix.** One visible focus ring using the accent; 32–36 px minimum control height
on desktop, 40–44 px for touch.
**Evidence.** Whether focus exists, small targets.

---

## Motion

### F1 — Decorative infinite animation · 4
**Detect.** A pulse, ping, bounce, spin, breathe, shimmer, float, glow or blob
animation with `infinite` iteration, unless the element is genuinely live
(status, recording, cursor).
**Fix.** Static. If something is live, one small dot is enough.
**Evidence.** Selector, animation name.

### F2 — Transition-all and hover scale · 3
**Detect.** A transition on `all` with a non-zero duration, or a `hover:scale`
class on cards and buttons.
**Fix.** Name the properties: colour, background, border, opacity, transform.
Hover is a colour or surface step; press can scale down 0.97–0.98.
**Evidence.** Selector, transition list.

### F3 — Animated layout properties · 3
**Detect.** A transition on width, height, top, right, bottom, left or margin with
a non-zero duration.
**Fix.** Animate transform and opacity. For size changes, animate a clip or a
scale and keep the layout stable.
**Evidence.** Selector, transition list.

---

## What the scanner deliberately ignores

- `display:none` and `visibility:hidden` subtrees (but the hidden selectors are
  recorded and compared, to catch hiding as a "fix");
- overlay chrome outside the visible viewport in static mode;
- real brand logos and their colours;
- data visualisation colours that encode series;
- a single deliberate accent, a single justified shadow, a single short centered
  hero.
