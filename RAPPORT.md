# trueline — Orbit workspace before/after

Screen: `examples/before/dashboard.html` → `examples/after/dashboard.html` · mode: computed DOM · rubric 1 · confidence 1

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

A `—` under *Score after* means no separate scan was recorded for that pass; only the final scan is shown. The edit ledger is still complete.

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
| 4. Copy | D2 | `examples/after/dashboard.html` | `h1` | Good morning, Alex! ☀️ | Overview |
| 4. Copy | D2 | `examples/after/dashboard.html` | `.lede` | Seamlessly unlock magic insights... | Four projects are active this month... |
| 4. Copy | D2 | `examples/after/dashboard.html` | `.tiny` | +12%!! | +12% vs October |
| 4. Copy | D3 | `examples/after/dashboard.html` | `.card .big` | $123,456 | $47,860 |
| 4. Copy | D4 | `examples/after/dashboard.html` | `button` | Enter your search query... | Export |
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
- [x] Focus rules exist on every after page; the scanner reports no target under 24 px.
- [x] Light and dark read, and the files hold at 390 px (`npm run lint:pages`).
- [x] No feature or claim was invented; the data stays fictional and is marked as sample on the landing page.

Score with the same command to reproduce:

```bash
node <skill>/scripts/scan.mjs examples/after/dashboard.html
```

## Fait

- Skill `trueline` : `SKILL.md` route l'agent, sept références portent le détail,
  trois scripts font le travail (`scan.mjs`, `capture.mjs`, `report.mjs`).
- Scanner déterministe 0–100, sans modèle ni réseau : signaux datés (A1–A7,
  B1–B5, C1–C5, D1–D4, E1–E3, F1–F3), preuve par sélecteur et valeur, mode DOM
  (confiance 1), HTML statique (0.55) et PNG (0.45).
- Boucle en neuf passes, re-scan après chaque passe, ledger
  (`examples/passes*.json`) et rapport généré.
- Quatre paires avant/après complètes, même produit et mêmes sections :
  dashboard 69 → 0, landing 67 → 0, pricing 64 → 0, formulaire 54 → 0.
- Vérifications : `npm run lint`, `npm run lint:evals`, `npm run lint:original`,
  `npm run lint:pages` et les scans DOM; tous verts.
- Les transitions et animations sont neutralisées sous
  `prefers-reduced-motion: reduce`; le scanner ignore ces blocs en mode statique.
- Aucune séquence de 10 mots en prose ni de 8 mots dans les exemples n'est
  partagée avec `ref/unslop`; aucun fichier, texte ou dessin n'a été recopié.

## Captures

Chromium via Playwright, 1440 × 900 et 390 × 844, clair et sombre, pour chaque
état des quatre écrans (32 PNG). Les planches avant/après sont dans
`assets/readme/` (`before-after.png` et `before-after-{dashboard,landing,pricing,form}.png`),
et la démo courte est `assets/demo.gif`. Commande de régénération :

```bash
npm run lint:assets -- --playwright /path/to/playwright --chrome /path/to/chrome
```

## Limites

- Le score mesure des signes observables, pas le goût. Un 0 ne promet pas un bon
  écran, seulement l'absence des signes mesurés.
- Le mode statique ignore les media queries de largeur et de mouvement réduit et
  ne mesure pas la mise en page réelle; il sert de repli à 0.55.
- Le mode image (0.45) ne rend ni sélecteurs, ni copie, ni contrastes par élément;
  il ne remplace pas le DOM.
- Les scores intermédiaires par passe ne sont pas enregistrés pour les fixtures :
  le ledger des changements est complet, seul le scan final est chiffré.
- Les exemples sont du HTML autonome, pas une application React/Next/Vue/Svelte.
  Les références de stacks décrivent la transposition, mais aucun vrai projet
  n'est fourni dans le dépôt.
- Les captures et le GIF demandent Playwright et ffmpeg, hors CI; la CI ne lance
  que le lint déterministe.
- Testé sur Chromium uniquement. Firefox, Safari, lecteurs d'écran et vraie
  navigation clavier page par page restent à couvrir.
- Aucun build, typecheck ou test d'une application réelle n'est exécuté.

## Ce qui reste à Vidhal

- Choisir le nom définitif du dépôt. Le README et l'étude supposent
  `terravidhal/trueline`; créer le dépôt GitHub, puis pousser. Rien n'a été poussé
  ni publié.
- Vérifier que `npx skills add terravidhal/trueline --skill trueline` fonctionne
  sur le dépôt réel, et tester l'installation dans Claude Code, Codex, Cursor,
  Gemini CLI, Copilot et OpenCode.
- Essayer le skill sur un vrai projet React/Tailwind, avec un build, un typecheck
  et un thème sombre, pour valider la transposition au-delà des fixtures.
- Décider du sort des 37 PNG et du GIF : les garder dans git, ou les déplacer
  dans une release ou GitHub Pages si le poids devient gênant.
- Ajouter la description, les topics, l'aperçu social et, si utile, une démo
  hébergée des quatre pages.
- Relire la licence MIT et la mention d'attribution de la méthode (`unslop`,
  CC BY 4.0) avant publication; aucun texte de ce dépôt n'en est copié.
- Fournir, si souhaité, des captures d'un vrai produit plutôt que du produit
  fictif Orbit.
- Valider les liens publics, le nom du compte et l'adresse de commit utilisée
  pour l'historique. Aucune information personnelle n'est présente dans les
  fichiers du dépôt.
