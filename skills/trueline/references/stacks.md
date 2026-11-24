# Stacks — where the styles live

The scanner reads the rendered screen, not the framework. The correction touches
the source that produces those computed styles. Find that source before editing.

## Read the project first

- `package.json` — framework, styling library, scripts, Node version.
- Config — `tailwind.config.*`, `postcss.config.*`, `vite.config.*`,
  `next.config.*`, `svelte.config.*`.
- The entry — `app/layout.tsx`, `pages/_app.tsx`, `src/main.tsx`,
  `src/App.vue`, `src/routes/+layout.svelte`, `index.html`.
- The component that renders the screen. Search for a visible string, not for
  "hero" or "card".

Then run the app or build it, and scan the result. Do not correct a component you
have not seen rendered.

## Plain HTML and CSS

- Styles: `<style>`, external `*.css` linked in the head, inline `style=""`.
- Change the declaration, not the HTML structure, unless the structure is the
  signal (three identical cards).
- Keep the cascade: prefer editing the existing rule over adding a new
  `!important`.
- If a rule is shared across pages, check every page before changing it.
- Static mode scans this stack well. Use the DOM for the real final check.

## Tailwind

- Utility classes live in the component. The theme lives in `tailwind.config.*`
  or in `@theme` / CSS variables for Tailwind 4.
- Map the passes to utilities:

| Pass | Utilities |
|---|---|
| Space | `p-*`, `m-*`, `gap-*`, `space-y-*`, `h-*` on a 4 px scale |
| Colour | `bg-*`, `text-*`, `border-*`, custom ramp in the theme |
| Type | `text-*`, `font-*`, `tracking-*`, `leading-*` |
| Layout | `grid-cols-*`, `flex-*`, `max-w-*`, `col-span-*` |
| Radius | `rounded-*`, arbitrary only with a reason |
| Depth | `shadow-*`, `border-*` |
| Motion | `transition-*` named, `duration-*`, `ease-*` |

- Replace `transition-all` with named transitions, delete `hover:scale-*` on
  cards, and define one easing in the theme.
- Do not add a plugin, a UI kit or an animation library to fix a signal.
- Purge safety: dynamic class strings (`bg-${color}-500`) must become complete
  class names or CSS variables, or they disappear in production.

## React and Next.js

- Components: `app/`, `pages/`, `src/components/`.
- Styles: CSS Modules (`*.module.css`), global CSS, Tailwind, CSS-in-JS.
- Find the component with a string search, then follow its imports to the style
  file.
- Server components cannot use browser APIs; keep the fix in markup, classes and
  CSS. Do not introduce a client component just for a hover.
- App Router: global tokens in `app/globals.css` or the Tailwind theme. Keep the
  layout shell in `app/layout.tsx`.
- Run `npm run build` (or the project's typecheck) after the correction. Next
  will fail on an invalid class name only at build, not always at dev.
- Avoid changing `next/image` dimensions or priority while fixing a layout.

## Vue

- Single-file components: `<template>`, `<script setup>`, `<style scoped>`.
- Global tokens in `src/assets/` or the app CSS.
- `:class` bindings and CSS variables are the safe place to change state styles.
- Scoped styles do not leak; changing a shared child may need `:deep()`.
- Check the component that owns the element, not only the parent view.

## Svelte and SvelteKit

- `src/routes/`, `src/lib/components/`.
- `<style>` in the component is scoped; global tokens in `app.css`.
- `class:` directives carry state.
- Do not move a style from a component to global CSS just to reach it.

## CSS-in-JS

- `styled-components`, `emotion`, `stitches`: find the styled declaration, not the
  generated class in the DOM.
- Keep the token object as the source of truth; change the token if it is wrong,
  or the local block if the exception is local.
- Avoid adding runtime styles for a static fix.

## Live URL only

1. `capture.mjs` the page with the theme the user sees.
2. Score the snapshot.
3. Correct the snapshot and score it again.
4. Hand the corrected HTML to whoever owns the real site, and say that the
   snapshot is a working copy, not a deployed fix.

If the app source exists, do not stop at the snapshot: apply the same changes in
the source.

## RTL and multilingual

- Set `dir` and `lang` on the root; use logical properties (`margin-inline`,
  `padding-inline`, `inset-inline-start`).
- Mirror directional icons (back, next, chevrons); keep media controls and
  objects unmirrored.
- One digit system per screen. Isolate Latin words and signed numbers with
  `<bdi>` or `unicode-bidi: isolate`.
- No letter-spacing on Arabic; line-height 1.6–1.8 for body, 1.3–1.4 for
  headings.
- Use `،` and `؟` in Arabic copy, not `,` and `?`.
- Do not apply a Latin uppercase label style to Arabic or Hebrew.

## Do not

- introduce a new dependency, font service, icon package or CSS framework;
- rewrite the component tree to make a CSS fix easier;
- change data fetching, routing or business logic;
- edit generated files (`dist`, `.next`, build output);
- touch lockfiles unless the user asked for a dependency change;
- add a global `*` rule to force a value across the app.
