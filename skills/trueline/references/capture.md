# Capture — a stable screen to score

When the user only has a URL, freeze the page first. A live page changes between
the before and after scans, and a scoring run must read the same thing twice.

`<skill>` below is the folder that contains `SKILL.md`; run the commands from the
project root.

## Install Playwright (once, in the project)

```bash
npm install -D playwright
npx playwright install chromium
```

If the project cannot take the dependency, point the scripts at an existing
folder and browser:

```bash
node <skill>/scripts/scan.mjs <target> --playwright /path/to/node_modules/playwright \
  --chrome /path/to/chrome
```

Without Playwright, a local HTML file can still be scored in static mode. A live
URL cannot: the script exits with the install command instead of guessing.

## Freeze a URL or a local page

```bash
node <skill>/scripts/capture.mjs <url|file> trueline/original.html \
  --theme light --width 1440 --height 900 --png trueline/before.png
```

Options:

| Option | Effect |
|---|---|
| `--dark` / `--light` | freeze `prefers-color-scheme`, not a class toggle |
| `--theme <light\|dark>` | same as `--light` or `--dark` |
| `--width`, `--height` | viewport, default 1440 × 900 |
| `--wait <ms>` | settle time after load, default 600 |
| `--png <file>` | screenshot, default `<out>.live.png` |
| `--playwright <folder>` | import Playwright from a specific directory |
| `--chrome <path>` | explicit Chromium executable |

What the snapshot does:

- scrolls the page to trigger lazy images and sections, then returns to the top;
- waits for `document.fonts.ready` and pending images (5 s cap);
- inlines stylesheet text, CSS `url(...)` assets, images, posters and SVG images
  as data URIs;
- keeps the browser's selected `currentSrc`, drops `srcset` and `<source>`;
- removes scripts, `<noscript>`, stylesheet links and preloads;
- absolutises links;
- writes one standalone HTML file plus a PNG of the live render.

It does not invent a layout and does not rewrite the project. It is a working
copy for the scan and the correction; the real code still lives in the app.

## Score the same frame

```bash
node <skill>/scripts/scan.mjs trueline/original.html --theme light \
  --width 1440 --height 900 --json trueline/before.json
```

Use the same `--theme`, `--width` and `--height` for the after scan. A theme
switch or a different width changes type, wrapping and contrast, which changes
the score for reasons unrelated to the fix.

Check three widths when the layout is responsive:

| Width | What it shows |
|---:|---|
| 1440 | desktop composition and hierarchy |
| 768 | tablet wrapping and navigation collapse |
| 390 | mobile stack, tap targets, headline size |

Report the primary score at 1440 and note any width where the layout breaks. Do
not average widths into one number.

## Screenshot-only input

```bash
node <skill>/scripts/scan.mjs shot.png --image
```

Image mode decodes the PNG locally with `node:zlib` and estimates colour share,
hue spread, softness and saturated mid-tones. It has:

- `confidence: 0.45`;
- no selectors, no text, no copy, no contrast per element;
- no layout or motion detection;
- it does not estimate text contrast at all, because pixels alone cannot tell a
  label from a large heading reliably.

Say this in the report. Offer to snapshot the live page for a real DOM score.
JPEG and interlaced PNG are not supported; export a normal PNG or use the DOM.

## What snapshots lose

- Canvas, WebGL and script-drawn backgrounds (capture them in the PNG, describe
  them in the audit);
- iframes and cross-origin CSS that cannot be read;
- interactions and states reached by JavaScript;
- server-side variations shown only to a logged-in user.

If a background is drawn by a script, keep the PNG as evidence and note that the
HTML copy cannot reproduce it.

## Fallback without a browser

```bash
node <skill>/scripts/scan.mjs page.html --static
```

Static mode parses `<style>` blocks, inline styles, class/tag/id selectors,
custom properties and common shorthands. It ignores viewport and reduced-motion
media queries and does not run the full cascade. It is useful in CI and on a
locked machine; it is not a replacement for the computed DOM. The output says
`mode: "static"` and `confidence: 0.55`.
