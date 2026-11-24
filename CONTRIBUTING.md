# Contributing

The repository is a skill, not a library. Keep it installable by copying one
folder and runnable with Node 22.

## Rules

- Write your own text, code and examples. Do not copy files, prose or images from
  another anti-slop skill.
- No secret, token, private URL or personal address in the repository, the
  examples or the commit messages.
- No new runtime dependency. Playwright is the only optional heavy tool, used for
  computed styles, captures and screenshots.
- The scanner stays deterministic: no model call, no network call, no telemetry.
- Weights sum to 100. A change to a weight, a threshold or a normalisation bumps
  the rubric and updates the evals.
- Waivers need a reason and remain capped.
- The examples keep fictional brands and data.
- A page that moves also has a `prefers-reduced-motion: reduce` rule; the check
  enforces it.

## Change a signal

1. Edit `skills/trueline/references/signals.md` and `references/scoring.md`.
2. Edit the signal in `skills/trueline/scripts/scan.mjs`.
3. Add or adjust the fixture in `scripts/check-skill.mjs`.
4. Re-scan the examples. The before/after bands are part of the check.
5. Regenerate `RAPPORT.md` and `examples/reports/` if the example scores changed.
   The root report also carries `## Fait`, `## Captures`, `## Limites` and
   `## Ce qui reste à Vidhal`; keep them, and `npm run lint` will check them.

## Change an example

1. Edit the HTML in `examples/before/` or `examples/after/`.
2. `npm run lint` — the static bands must still hold.
3. If Playwright is available:
   `npm run lint:assets -- --playwright <folder> --chrome <path>`
4. Check the pages in a browser:
   `npm run lint:pages -- --playwright <folder>`. It opens every page at 1440,
   390, light, dark and reduced motion, and fails on a console error or a motion
   that ignores the setting.
5. Regenerate the report with the same viewport and theme.

## Change the skill

`skills/trueline/SKILL.md` stays short: what, when, loop, thresholds, rules,
references, checklist, output contract. Detail goes into `references/`.

Every relative link must resolve. Every reference must be reachable from the
skill.

## Before a commit

```bash
npm run lint
npm run lint:evals
npm run lint:original   # needs the ignored ref/unslop clone
```

The check runs the scanner on all four example pairs, the demo asset and the
captures, and the deterministic evals. It needs no browser and no key. The
browser check (`lint:pages`) and `lint:assets` are optional and need Playwright;
they are never a dependency of the installed skill.

## Style

- English in the skill and the README.
- Concrete values, not adjectives.
- Tables for thresholds and tokens.
- No emoji as decoration in the skill or the references. An emoji may appear
  only as a quoted symptom in the frontmatter description, or in a deliberately
  sloppy `before` example.
- No claim that was not measured.
