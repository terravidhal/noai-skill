---
name: trueline
description: >-
  Scores AI-looking UI and then fixes the real code, proving the change with a
  before/after number. Use when a screen looks generated or templated — purple
  or blue gradients, gradient text, colored glows, glass cards, soft shadows on
  every surface, rows of identical cards, centered three-card heroes, emoji
  labels, "New ✨" badges, uppercase tracked labels, 12px grey body copy,
  pulsing dots, transition-all, hover scale — or when the user asks to unslop,
  de-slop, audit, rate, score, polish, clean up or redesign a screen, asks "why
  does this look AI", "make it look designed", or wants a visual quality score.
  Reads an HTML page, a live URL, or a PNG screenshot; returns a deterministic
  0-100 slop score with evidence, then edits React, Next.js, Vue, Svelte,
  Tailwind, CSS or plain HTML in ordered passes, re-scans each pass, and writes
  a change ledger. Not for a brand-new screen with no existing UI, and not for
  choosing a brand identity from scratch.
license: MIT
---

# trueline — score it, fix it, prove it

Your job is to turn a screen that looks generated into a screen that looks drawn,
and to leave two numbers behind: the slop score before and after. Advice is not
the deliverable. The edited code and the measured delta are.

**Two rules override everything else:**

1. **Measure first.** Never declare "fixed" without a second scan on the same
   rubric, viewport and theme.
2. **Do not hide, do not swap.** Removing a signal by hiding the element, muting
   the rule, or trading one trend for another is not a fix.

## When to use it

Use it when the screen already exists and the problem is craft: colour, depth,
spacing, type, copy, repetition, motion, contrast. It works on a component, a
page, a dashboard, a landing hero, a static HTML file, or a screenshot.

Do not use it to:

- invent a product, a feature, a claim or a customer;
- redesign a screen whose slop score is already low just to make it different;
- redraw a logo or pick a brand identity;
- bypass accessibility to gain points.

If the slop score is already low, say so and offer at most three concrete refinements.

## Install

```bash
npx skills add terravidhal/trueline --skill trueline
```

Node 22+ is enough for the static scanner and the report. Captures, computed
styles and live URLs use Playwright + Chromium.

In the commands below, `<skill>` is the folder containing this `SKILL.md`. Run
them from the project root so `trueline/` and the scanned paths stay in the
project.

## The loop

### 0. See the screen

Find the files that render it. Prefer the running app or a local HTML file.

- Live URL only: `node <skill>/scripts/capture.mjs <url> trueline/original.html --png trueline/before.png`
- HTML file: score it directly.
- PNG only: `node <skill>/scripts/scan.mjs shot.png --image`, then say clearly that the
  confidence is low and offer to scan the DOM instead.

### 1. Scan, do not edit yet

```bash
node <skill>/scripts/scan.mjs <page.html|url> --json trueline/before.json
```

Show the score, the sub-scores, and the signals sorted by penalty with their
selector and value. This list is the work order.

### 2. Decide the dose

| Slop | Decision |
|---:|---|
| 45–100 | Full correction. Write the direction, then run every pass. |
| 20–44 | Polish. Keep the brand, palette, type and layout; fix the signals found. |
| 0–19 | Do not redesign. Report the score and offer 2–3 exact refinements. |

Never start a full correction on a screen with no measurable signal.

### 3. Direction, before editing

For a full correction, write five short lines and show them before touching code:

- **Product** — what it does, for whom, in one plain sentence.
- **Character** — two or three concrete words, never generic praise such as
  `sleek`, `premium`, `clean`, `modern` or `minimal`.
- **World** — the place or material the product belongs to; it chooses how the
  neutral ramp, the accent and the visual are tinted.
- **Moments** — one or two places where the screen is allowed to be rich.
- **Signature** — a single distinctive mark that could only come from this
  product; use it no more than twice.

Derive them from the page, not from the current trend. If the user already said
"just do it", keep the direction in the report instead of waiting.

See [references/direction.md](references/direction.md).

### 4. Fix in ordered passes

Cover the entire screen in one pass before the next pass. Re-scan after each one
and append the real result to `trueline/passes.json`.

1. Spacing and frame
2. Colour and depth
3. Icons
4. Copy
5. Type
6. Layout
7. Components and details
8. Visual
9. Motion

The order is not cosmetic: spacing changes how everything else reads, copy
changes the length that decides the type size and the layout, and visuals and
motion should arrive on a screen that already stands on its own.

Exact starting values for every pass: [references/passes.md](references/passes.md).

### 5. Re-scan

```bash
node <skill>/scripts/scan.mjs trueline/original.html \
  --compare trueline/before.json --json trueline/after.json --max-slop 20
```

`--compare` returns a per-category delta, the signals removed, the signals that
remain and warnings when a signal disappeared into `display:none` or
`visibility:hidden`. A non-zero exit code means the target was not met.

If the score did not fall, do not rewrite the report as a success. Reopen the
signals that remain.

### 6. Verify what a score cannot see

Run the project's build, typecheck and lint if they exist. Then check:

- keyboard focus visible on every control, targets at least 24 px;
- body contrast at least 4.5:1, large text at least 3:1;
- light and dark both read, mobile at 390 px;
- no feature, claim, number or customer was invented;
- no rename of the product, no redrawn logo;
- no signal removed by hiding an element.

### 7. Report

Write the ledger and generate the report:

```bash
node <skill>/scripts/report.mjs --before trueline/before.json --after trueline/after.json \
  --passes trueline/passes.json --out RAPPORT.md --json trueline/report.json
```

The report must state: the two scores, the delta per category, the edits per pass
(file, selector, before → after, signal), the signals that remain, the waivers,
and what you could not verify. Format: [references/report.md](references/report.md).

## Score honestly

- The rubric is versioned. Never compare scans with different rubric versions.
- Static parsing is a fallback (confidence 0.55); a live URL without Playwright
  is an error, not a guess. Image mode is 0.45 and covers colour and softness
  only.
- A waiver needs a signal id, a selector, a reason of at least 8 characters, and
  is capped at 5. Waivers appear in `waived`, never silently.
- `opacity:0`, off-screen content and `display:none` are recorded. Hiding a card
  does not lower the score; it produces a warning in the comparison.
- Never edit the rubric, the weights or the examples to make a number better.

## What not to do

- Do not answer a removed effect with a fresh one: no new glass, grain, noise,
  neon, blobs, bento grid or gradient.
- Do not change what the product is, its features, its claims or its section
  order.
- Do not invent plausible-looking data. Use what is on the page; if a number is
  clearly fake, remove it or keep it clearly marked as sample data.
- Do not "fix" contrast by making everything black, or accessibility by removing
  content.
- Do not touch a real brand logo, name or typeface that is not itself slop.
- Do not run a score, then edit without re-scanning.

## Reference map

| Need | Read |
|---|---|
| What each signal means and how it is measured | [references/signals.md](references/signals.md) |
| Weights, formula, JSON schema, waivers, compare | [references/scoring.md](references/scoring.md) |
| Nine passes with exact values | [references/passes.md](references/passes.md) |
| Five-line direction and forbidden words | [references/direction.md](references/direction.md) |
| Ledger and `RAPPORT.md` format | [references/report.md](references/report.md) |
| Playwright capture, themes, widths, fallbacks | [references/capture.md](references/capture.md) |
| React, Next, Vue, Svelte, Tailwind, plain HTML, RTL | [references/stacks.md](references/stacks.md) |

## Output contract

When you finish, return:

1. the files you changed;
2. the commands you ran;
3. the before/after slop and design scores, with mode and confidence;
4. the delta per category, and the signals that remain;
5. any waiver and its reason;
6. what you verified, and what you could not.

## Final checklist

- [ ] The page was scored before any edit, and re-scored after every pass.
- [ ] The after scan uses the same rubric, viewport and theme as the before scan.
- [ ] Every remaining signal is either fixed, waived with a reason, or reported.
- [ ] No element was hidden to lower the score.
- [ ] No trend was replaced by another trend.
- [ ] Spacing is on a 4 px grid; equal things have equal sizes.
- [ ] One neutral ramp, three text roles, one accent used sparingly.
- [ ] No hue gradients on chrome, no gradient text, no coloured glow.
- [ ] No emoji left as icons or labels; one icon set, one size, one stroke.
- [ ] Type hierarchy comes from size and colour, not 800 weights.
- [ ] Sentence case; no uppercase tracked labels; no negative tracking under 16 px.
- [ ] No exclamation marks, greetings, hype or unverifiable claims.
- [ ] Body contrast ≥ 4.5:1, meta ≥ 3:1; focus visible; targets ≥ 24 px.
- [ ] No decorative infinite animation, no `transition-all`, no hover scale on cards.
- [ ] Light and dark read; mobile 390 checked; build/typecheck/lint pass if present.
- [ ] `RAPPORT.md` contains two scores, a per-pass table and per-edit evidence.
