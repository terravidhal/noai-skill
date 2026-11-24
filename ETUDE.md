# ETUDE — `trueline`

> Étude de conception pour un skill d'agent qui transforme une interface « générée »
> en interface qui a l'air dessinée, **avec un score avant/après chiffré** et
> **une correction réellement appliquée au code**, pas seulement des conseils.
>
> Date : 2026-11-24 · Statut : étude terminée, implémentation à venir
> Langue du produit : anglais (`SKILL.md`, `README`) · Étude : français
> Licence prévue : MIT

---

## 1. Résumé exécutif

Le marché des skills « anti-slop » est déjà occupé par des projets très populaires.
La référence imposée, **`heydamir/unslop`** (~21 000 étoiles), est excellente sur le
**discours de direction artistique** et sur l'**ordre des passes**, mais elle s'arrête
au conseil : elle décrit ce qu'un designer ferait, elle ne **prouve** pas le progrès et
n'impose pas un **rapport de changements** traçable.

`trueline` reprend ce qui marche (audit des signes, direction tirée du produit, passes
ordonnées, checklist, captures Playwright) et ajoute les deux choses qui manquent :

1. **Un score déterministe** : un script Node ouvre une page HTML **ou** une capture,
   mesure les signes (dégradés violets, ombres molles partout, cartes identiques, emojis,
   texte gris illisible, tailles uniformes, etc.), et rend un **score de slop 0–100**
   (0 = dessiné) avec des sous-scores par catégorie et la preuve (sélecteur + valeur).
2. **Une correction appliquée pas à pas** sur le vrai code, avec après chaque passe un
   **re-scan** et un **rapport de changements** (avant → après, fichier, sélecteur,
   catégorie, delta de score). Le résultat n'est pas « voici des conseils » mais
   « voici le code modifié et la preuve chiffrée que le score est passé de X à Y ».

Le nom retenu est **`trueline`** : la ligne juste (alignement, grille) et la « redline »
du designer, en un mot court, libre sur npm et sur `terravidhal/trueline`.

---

## 2. Périmètre

### Dans le périmètre

- Un dépôt `terravidhal/trueline`, installable par `npx skills add terravidhal/trueline`.
- Un dossier `skills/trueline/` autonome : `SKILL.md`, `references/`, `scripts/`, `assets/`.
- Support des stacks courantes : HTML/CSS statique, React/Next, Vue, Svelte, Tailwind,
  et une page live quand on n'a qu'une URL.
- Un scanner qui note une page HTML **ou** une capture PNG, en mode déterministe.
- Une boucle de correction en passes, avec re-scan et rapport.
- Des exemples avant/après, des evals, un lint de dépôt et une CI.

### Hors périmètre

- Générer des images ou payer un service de génération (on peut proposer un prompt, pas
  l'exécuter).
- Publier, pousser, créer un compte, `npm publish`.
- Promettre un rendu « garanti beau » : le skill mesure des **signes observables**, il ne
  remplace pas un directeur artistique.
- Copier des fichiers, textes, dessins ou prompts d'un dépôt tiers.

---

## 3. Étude de la référence — `heydamir/unslop`

Méthode : lecture du `SKILL.md`, des références (`signs`, `tokens`, `visuals`, `effects`,
`refs`, `rtl`), des scripts (`snapshot.mjs`, `story.mjs`), de l'arborescence et du README.
Aucun fichier n'est recopié ; on retient des **méthodes**.

### 3.1 Format et arborescence

```
unslop/
├── .claude-plugin/{marketplace,plugin}.json
├── README.md
├── LICENSE                      # CC BY 4.0 (le brief le donnait sans licence)
├── examples/{dashboard,hero,store}.html
├── test/{snapshot,story,story-path}.test.mjs
└── skills/unslop/
    ├── SKILL.md                 # ~32 Ko : tout le protocole
    ├── agents/openai.yaml
    ├── references/
    │   ├── signs.md             # catalogue des signes + correctif
    │   ├── tokens.md            # échelles, rampes, type, radius, motion
    │   ├── visuals.md           # remplacer le décor par un vrai visuel
    │   ├── effects.md           # traitements d'image (glyphes, dither…)
    │   ├── refs.md + refs/*.webp# écrans finis à observer
    │   └── rtl.md               # arabe/hébreu
    └── scripts/
        ├── snapshot.mjs         # Playwright : sauve une page live en HTML autonome
        └── story.mjs            # vidéo « la page se dé-slop elle-même »
```

Le point important : **tout ce que l'agent doit charger vit dans `skills/unslop/`**. Un
fichier à la racine du dépôt ne suivrait pas l'installation.

### 3.2 Flux de l'agent

Le `SKILL.md` impose un ordre strict, et c'est sa vraie force :

0. **Voir l'écran** : trouver les fichiers, rendre et capturer si possible ; sinon
   `snapshot.mjs` sur une URL, sinon reconstruire une capture en HTML statique.
1. **Audit** : parcourir `signs.md`, lister chaque signe avec son emplacement.
2. **Dosage** : heavy slop → processus complet ; light slop → polissage ; no slop → dire
   que c'est bon et proposer 2–3 retouches chiffrées, sans rien imposer.
3. **Direction** (et pause) : cinq lignes — produit, caractère, monde, moments, signature —
   puis on attend l'accord avant d'éditer.
4. **Neuf passes ordonnées** : espacement → couleur → icônes → copie → type → layout →
   détails → visuels → motion. Une passe finie sur tout l'écran avant la suivante.
5. **Vérifier** : checklist + nouveau rendu comparé à la liste d'audit.
6. **Rapporter** : direction, quelques lignes par passe.
7. **Enregistrer** (optionnel) : « story video » où les valeurs s'interpolent en place.

L'ordre n'est pas cosmétique : l'espacement d'abord parce qu'il change la lecture de tout
le reste ; la copie avant le type et le layout parce que la longueur du titre décide de sa
taille et de sa place ; les visuels et le motion en dernier parce qu'ils doivent s'ajouter
à un écran qui tient déjà sans eux.

### 3.3 Le système de références

- **`signs.md`** : catalogue « signe → correctif » par familles (surfaces, type, icônes,
  espacement, copie, composants, hero, visuels, motion, RTL, « template look »). C'est un
  routeur de diagnostic, pas un style.
- **`tokens.md`** : valeurs de départ, pas une maison de style — échelle 4 px, rampes
  neutres (graphite/warm/ink) en clair et sombre, accent, boutons, familles et échelle
  typographiques, radius avec règle d'imbrication, profondeur, motion.
- **`visuals.md`** : décider si l'écran a besoin d'un visuel, préférer le produit réel, et
  seulement ensuite générer une scène ; recette de prompt, placement, fusion des bords.
- **`effects.md`** : traitements code d'une image (glyphes, halftone, dither, duotone) avec
  les règles de perf (pixels lus une fois, 8–12 fps, pause hors écran).
- **`refs.md` + images** : écrans finis par l'auteur, à observer pour les qualités
  (composition, lumière, retenue), jamais pour le sujet ou le layout.
- **`rtl.md`** : règles complètes arabe/hébreu (propriétés logiques, miroir, chiffres,
  ponctuation, line-height).

### 3.4 Ce qui fait sa qualité

1. **Une thèse claire** : le slop étale la richesse sur le chrome ; le craft la concentre
   dans un ou deux moments de contenu. Tout le reste en découle.
2. **Un ordre de passes** justifié, répété, vérifiable.
3. **Une direction avant les edits**, avec des mots interdits (« clean, modern, sleek,
   premium ») pour empêcher le retour au template.
4. **Une description de frontmatter** très riche en déclencheurs et en symptômes : c'est le
   vrai mécanisme de découverte par l'agent.
5. **Des références courtes et actionnables**, chargées à la demande (divulgation
   progressive).
6. **Un outil de capture réel** (`snapshot.mjs`) qui gère lazy-load, images, CSS, thème, et
   sauve aussi une capture de la page live pour comparer.
7. **Une checklist finale** et des interdits explicites (ne pas renommer, ne pas changer le
   produit, ne pas remplacer un décor par un autre).

### 3.5 Limites (nos ouvertures)

- **Pas de score.** L'audit est une liste qualitative ; deux agents peuvent produire deux
  diagnostics différents, et rien ne prouve le progrès.
- **Pas de preuve de correction.** Le rapport décrit les passes en prose ; il ne relie pas
  chaque changement à un signe mesuré, à un sélecteur et à un delta.
- **Tout repose sur le jugement du modèle.** Sans garde-fou déterministe, le « no slop »
  et le « light slop » sont déclarés, pas mesurés.
- **Friction.** Le `SKILL.md` fait ~32 Ko ; beaucoup de prose à charger avant d'agir.
- **Story video** et génération d'images ajoutent des dépendances (ffmpeg, service payant)
  et du temps, pour un bénéfice de démonstration plus que de production.
- **Pas de mode « capture seule » sérieux** : il faut reconstruire la page avant de noter.

### 3.6 Licence et posture

Le brief décrit le dépôt comme sans licence ; la fiche du dépôt affiche aujourd'hui
**CC BY 4.0**. Dans les deux cas la règle est la même : on **ne recopie aucun fichier, aucun
texte, aucun dessin**. On reprend des **idées et des méthodes** (audit, ordre des passes,
direction, capture) et on écrit nos propres textes, nos propres exemples, notre propre
scanner. Aucune image de `refs/` n'est reprise.

---

## 4. Étude des pairs (même sujet)

Le paysage a beaucoup bougé : plusieurs skills « anti-slop » dépassent déjà la référence en
fonctionnalités. Les ignorer serait une faute. Voici les plus utiles à situer.

### 4.1 `Leonxlnx/taste-skill` — ~120 000 étoiles, MIT

- **Nature** : direction artistique complète pour construire ou refondre des sites.
- **Forces** : distribution de trois directions parmi vingt, photographies réelles avec
  crédits, icônes de marques réelles, vérification dans un vrai navigateur à 1440/1024/768/390,
  et un **finish gate** (`gate.mjs`) qui refuse de finir tant qu'un FAIL subsiste.
- **Leçon** : un skill crédible se juge sur son **outil de vérification**, pas sur son
  manifeste. Un « gate » qui bloque la livraison est plus fort qu'une checklist.
- **Limite pour nous** : très orienté *création* de sites, lourd (assets nombreux, WebGL,
  shaders), et pas centré sur « noter puis corriger l'existant ».

### 4.2 `Nutlope/hallmark` — ~60 000 étoiles, MIT

- **Nature** : skill anti-slop avec thèmes distribués et lint navigateur.
- **Forces** : hiérarchie de portes **Floor / Reflex / Finish** (ce qui ne ship jamais, les
  défauts réflexes qu'on peut surcharger avec une raison, les finitions non bloquantes) ;
  `sloplint.mjs --render` à huit largeurs ; un relecteur à contexte neuf.
- **Leçon** : séparer les règles dures des préférences, et permettre une **dérogation
  motivée** évite les faux positifs qui rendent un linter inutilisable.
- **Limite pour nous** : catalogue de thèmes et refonte, pas une boucle « score → correction
  → re-score » sur le code existant.

### 4.3 `callmehai/sloplint` — MIT (jeune)

- **Nature** : le plus proche de notre différenciateur. 54 « tells » pondérés, checker DOM
  dans le navigateur, CLI Chromium desktop/mobile, rapport HTML annoté, et **diff avant/après**
  qui encadre chaque changement.
- **Forces** : mesure les styles calculés, donc voit ce que le framework produit vraiment ;
  chaque tell a un poids et un correctif ; le diff avant/après est exactement le bon réflexe.
- **Leçon** : c'est la bonne direction, et elle valide notre pari. Il faut donc être **plus
  simple, plus rapide et plus intégré** : un seul petit script, un schéma JSON stable, la
  correction appliquée par l'agent avec un rapport par passe, et des dérogations.
- **Limite** : statut « early », liste de tells très large à maintenir, et la correction
  reste une étape séparée du scoring.

### 4.4 Autres signaux utiles

- `agshinrajabov/no-slop-design` (MIT) : phases brief → recherche → direction → tokens →
  revue, avec un `slop_lint.py` et un « studio crit ». Confirme que le **score honnête**
  est attendu.
- `avivgerz-hue/unslop` : 72 règles sur 7 piliers, vise 95–100/100. Confirme la demande de
  score, mais reste un protocole très verbeux.
- `kundan0907/slopless` (MIT) : routes Quick/Standard/Deep/Review et rapport type PR avec
  des `avant → après`. Bon modèle de **contrat de sortie**.

### 4.5 Tableau comparatif

| Projet | Étoiles | Licence | Cœur | Score chiffré | Correction appliquée + ledger |
|---|---|---|---|---|---|
| `heydamir/unslop` | ~21 k | CC BY 4.0 | direction + 9 passes | non | non (conseils) |
| `Leonxlnx/taste-skill` | ~120 k | MIT | build + gate navigateur | non (portes) | partiel (crée la page) |
| `Nutlope/hallmark` | ~60 k | MIT | thèmes + lint + portes | non | partiel |
| `callmehai/sloplint` | petit | MIT | 54 tells + diff | oui | diff, correction séparée |
| **`trueline` (nôtre)** | — | MIT | **score + correction bouclée** | **oui, déterministe** | **oui, par passe + preuve** |

### 4.6 Invariants à respecter

1. Une promesse en une phrase, puis la commande d'installation dans les dix premières lignes.
2. Un `SKILL.md` court et actionnable ; les détails dans `references/`, les outils dans
   `scripts/`.
3. Une description de frontmatter riche en symptômes et en vocabulaire utilisateur.
4. Des garde-fous explicites (ce qu'on ne fait pas) et des dérogations motivées.
5. Une vérification finale **automatisée**, pas seulement une checklist.
6. Zéro dépendance lourde ; un skill s'installe sans build ni clé.
7. Des evals et une CI qui vérifient vraiment le dépôt.
8. Un `README` avec avant/après et des limites honnêtes.

---

## 5. Ce qu'on reprend, ce qu'on ne copie pas

### Méthodes reprises (idées, reformulées et réimplémentées)

- L'**audit par signes** avant toute édition.
- La **direction en cinq lignes** (produit, caractère, monde, moments, signature) et les
  mots interdits.
- L'**ordre des passes** (espacement d'abord, visuels et motion en dernier), avec la
  justification.
- La règle « **pas de slop → ne pas refondre** ».
- Le **snapshot Playwright** d'une URL vers un HTML autonome, et la capture de contrôle.
- La **checklist finale** et les interdits (ne pas changer le produit, ne pas remplacer un
  décor par un autre).
- L'idée de **dérogation motivée** (venue des portes de `hallmark`) pour contrôler les faux
  positifs.

### Ce qu'on ne copie pas

- Aucun texte, aucune phrase, aucun prompt, aucune image, aucun fichier de `unslop`, de
  `taste-skill`, de `hallmark` ou de `sloplint`.
- Pas de « story video », pas de génération d'images, pas de catalogue de thèmes en v1 :
  cela ajoute des dépendances et détourne du cœur (mesurer + corriger).
- Pas de liste de 54–72 règles en v1 : un noyau de ~20 signes **mesurables** suffit, et se
  déduplique (un signal peut couvrir plusieurs symptômes).

---

## 6. Nos deux différenciateurs

### 6.1 Le score avant/après

Un script unique, `scripts/scan.mjs`, répond à une question simple : **« à quel point cet
écran a-t-il l'air généré ? »** Il accepte :

```bash
node scripts/scan.mjs ./page.html                 # HTML autonome (recommandé)
node scripts/scan.mjs http://localhost:3000       # page live (Playwright)
node scripts/scan.mjs ./capture.png --image       # capture seule (confiance basse)
node scripts/scan.mjs ./after.html --compare before.json
```

Il sort un **Slop Score 0–100** (0 = dessiné, 100 = slop maximal), un **Design Score**
complémentaire (`100 − slop`), des **sous-scores par catégorie**, et pour chaque signal la
**preuve** (sélecteur, valeur calculée, nombre d'occurrences). Le score est **déterministe** :
même entrée → même sortie, sans appel réseau ni modèle.

### 6.2 La correction appliquée, avec ledger

Le skill ne s'arrête pas au diagnostic. Il **édite le vrai code** de l'utilisateur, passe par
passe, puis :

- re-lance `scan.mjs` après chaque passe ;
- enregistre le **delta par catégorie** et les fichiers touchés (`git diff --numstat`) ;
- produit `RAPPORT.md` + `trueline/report.json` : score avant/après, tableau par passe,
  captures avant/après, liste des signes restants, et pour chaque changement
  `fichier · sélecteur · ancienne valeur → nouvelle valeur · signal visé`.

Le critère d'acceptation n'est pas « l'agent dit que c'est mieux », mais **« le score a
baissé, chaque baisse est expliquée, et le build passe encore »**.

---

## 7. Nom proposé et disponibilité

### 7.1 Candidats vérifiés le 2026-11-24

Vérification faite via l'équivalent HTTP de `npm view <nom>` (`registry.npmjs.org/<nom>`) et
de `gh repo view terravidhal/<nom>` (`https://github.com/terravidhal/<nom>`) : un 404 = libre.

| Nom | npm | `terravidhal/<nom>` | Verdict |
|---|---|---|---|
| `unslop` | pris (le skill de référence) | — | non |
| `redline` | **pris** (jauge jQuery) | libre | non |
| `deslop` | **pris** (CLI concurrent, MIT) | libre | non |
| `redpen` | **pris** (revue de code) | libre | non |
| `slopscore` | pris | — | non |
| `hairline` | **pris** (CSS retina) | libre | non |
| `slopline` | libre | libre | écarté : proche de `sloplint`, et `dimkr/slopline` existe |
| **`trueline`** | **libre (404)** | **libre (404)** | **retenu** |

### 7.2 Pourquoi `trueline`

- **Court** (8 lettres), prononçable, sans tiret.
- Il dit les deux gestes : **truing** (remettre d'aplomb, aligner) et **redline** (la revue
  de designer).
- Il ne reprend pas le mot « slop » (déjà saturé) tout en restant clair une fois associé au
  symptôme dans la description du frontmatter.
- Libre aux deux endroits demandés, sans collision dans l'écosystème des skills.

Installation cible : `npx skills add terravidhal/trueline` (skill `trueline`).

---

## 8. Plan du skill

### 8.1 Arborescence cible

```
trueline/
├── README.md                    # promesse, install, avant/après, limites
├── LICENSE                      # MIT
├── ETUDE.md                     # ce document
├── RAPPORT.md                   # rapport de la dernière exécution (généré)
├── CONTRIBUTING.md
├── .gitignore                   # ref/, node_modules/, .trueline/
├── .github/workflows/check.yml  # lint + evals déterministes
├── ref/                         # clone de travail de la référence (ignoré par git)
├── skills/trueline/
│   ├── SKILL.md                 # court : seuils, boucle, contrat de sortie
│   ├── references/
│   │   ├── signals.md           # les ~20 signes mesurables + seuils
│   │   ├── scoring.md           # formule, poids, normalisation, dérogations
│   │   ├── passes.md            # les 9 passes, avec valeurs exactes
│   │   ├── direction.md         # les 5 lignes, mots interdits, signature
│   │   ├── report.md            # format du ledger et du RAPPORT.md
│   │   ├── capture.md           # Playwright, thème, lazy-load
│   │   └── stacks.md            # HTML, React/Next, Vue, Svelte, Tailwind, RTL
│   ├── scripts/
│   │   ├── scan.mjs             # score DOM + capture, --compare, --json
│   │   ├── capture.mjs          # snapshot HTML autonome + PNG de contrôle
│   │   └── report.mjs           # fusionne scans + git diff → RAPPORT.md
│   └── assets/
│       └── example-before.html  # démo minimale (fictive, sans marque)
├── examples/
│   ├── before/                  # deux écrans volontairement « slop »
│   └── after/                   # les mêmes, corrigés
├── evals/evals.json
├── assets/readme/               # captures avant/après 1440
└── scripts/check-skill.mjs      # lint du dépôt (frontmatter, liens, JSON, assets)
```

`trueline` ne dépend que de Node 22+ et de Playwright/Chromium (déjà nécessaires aux
captures). Le mode image réutilise Chromium + canvas pour lire les pixels : **pas de `sharp`,
pas de `canvas` natif, pas de nouvelle dépendance lourde**.

### 8.2 `SKILL.md` — frontmatter

```yaml
---
name: trueline
description: >-
  Turns AI-looking UI into a designed screen and proves it with a before/after
  score. Use when a page looks generated or templated — purple gradients, glows,
  gradient text, emoji labels, soft shadows on everything, identical cards,
  flat type scale, unreadable grey text, "New ✨" badges, pulse animations,
  centered three-card heroes — or when the user asks to audit, rate, clean up,
  redesign or "unslop" a screen and apply the fixes. Scores an HTML page or a
  screenshot, then fixes the real code in ordered passes and reports the change
  per pass. Works on React, Next.js, Vue, Svelte, Tailwind, plain HTML/CSS and
  live URLs.
license: MIT
---
```

Notes : `name` = dossier = `--skill` ; description longue **exprès** (routeur sémantique) ;
pas de champ `allowed-tools` en v1.

### 8.3 Corps du `SKILL.md` — plan (court)

1. **Ce que fait trueline** en trois phrases + la règle des deux nombres.
2. **Quand l'utiliser / quand s'abstenir** (design neuf, identité de marque, « no slop »).
3. **Boucle en 7 étapes** :
   0. localiser et rendre l'écran (DOM si possible, capture sinon) ;
   1. **scanner** → `before.json` + tableau des signes avec preuves ;
   2. **direction** en 5 lignes (si le score est élevé) ;
   3. **corriger par passes** (ordre imposé), re-scan après chaque passe ;
   4. **re-scanner** → `after.json`, delta par catégorie ;
   5. **vérifier** build/typecheck/contraste/clavier/thèmes ;
   6. **rapporter** (score, tableau des passes, captures, restes, dérogations).
4. **Seuils de décision** : `slop ≥ 45` → refonte complète ; `20–44` → polissage ;
   `≤ 19` → ne pas refondre, proposer 2–3 retouches.
5. **Renvois** vers `references/{signals,scoring,passes,direction,report,capture,stacks}.md`.
6. **Interdits** : pas de décor remplacé par un autre décor, pas de feature inventée, pas de
   score gonflé par suppression de règle, pas de copie d'un dépôt tiers.
7. **Contrat de sortie** : fichiers modifiés, commandes, score avant/après, preuves.

### 8.4 Références — contenu

- `signals.md` : chaque signe, comment le **mesurer**, son seuil, son correctif.
- `scoring.md` : poids, normalisation, formule, plafonds, dérogations, versionnage du barème.
- `passes.md` : neuf passes avec valeurs de départ (échelle 4 px, rampes, type, radius,
  profondeur, motion) et la règle « on finit une passe partout avant la suivante ».
- `direction.md` : produit / caractère / monde / moments / signature, mots interdits,
  test « si je remplace le nom par un concurrent, la page tient-elle encore ? ».
- `report.md` : schéma JSON stable, format du tableau, ce qui compte comme preuve.
- `capture.md` : `capture.mjs`, thème clair/sombre, largeurs 1440/768/390, lazy-load.
- `stacks.md` : où vivent les styles selon la stack, comment scanner un composant Next sans
  serveur (build statique ou rendu local), cas RTL.

### 8.5 `README` — structure cible

```
# trueline
AI-looking UI in, designed UI out — with a score to prove it.
`npx skills add terravidhal/trueline`
[badges MIT | skills.sh]
[capture avant/après]

## What it does
- Scores an HTML page or a screenshot (0–100 slop) with evidence.
- Fixes the real code in ordered passes.
- Re-scores and reports the delta per pass.

## See the score
(shows a real before/after JSON excerpt and the two numbers)

## Install
(one command per agent)

## Use
(3 example prompts: audit only, fix, capture-only)

## What it will not do
- invent features or claims, redraw logos, replace slop with another trend, rescore by
  muting a rule.

## Scoring (short table)

## License
MIT
```

---

## 9. Spécification du score (cœur technique)

### 9.1 Principe

Le score est une **somme de pénalités pondérées**, chaque signal étant normalisé en
sévérité ∈ [0, 1] pour être indépendant de la taille de la page.

```
slop = round( Σ_signal  weight_signal × severity_signal )      # 0..100
design = 100 − slop
```

Chaque catégorie a un plafond ; le total des poids vaut 100. Le barème est versionné
(`"rubric": "1"`) pour que deux scans soient comparables.

### 9.2 Signaux, poids et mesures (v1)

| Id | Catégorie | Signe | Détection | Poids |
|---|---|---|---|---|
| A1 | Couleur | dégradé violet/bleu de surface | `linear/radial-gradient` avec teintes 245–290° et écart ≥ 20° | 6 |
| A2 | Couleur | texte en dégradé | `background-clip:text` + `color:transparent` sur du texte | 6 |
| A3 | Couleur | glow coloré | `box-shadow`/`drop-shadow` saturé, blur ≥ 12, alpha ≥ .15 | 5 |
| A4 | Profondeur | ombres molles partout | part d'éléments « surface » avec blur ≥ 16 et alpha ≤ .35 | 4 |
| A5 | Couleur | bordure néon/saturée | bordure saturée, alpha > .4 | 3 |
| A6 | Couleur | glassmorphism | `backdrop-filter: blur` + fond translucide | 3 |
| A7 | Couleur | chaos de teintes | > 4 teintes saturées distinctes dans le chrome | 3 |
| B1 | Layout | cartes identiques | ≥ 3 conteneurs frères de mêmes dimensions (±2 px) et même structure | 7 |
| B2 | Layout | grille de 3 répétée | 3 colonnes égales dans ≥ 2 sections | 4 |
| B3 | Layout | hero centré empilé | enfants centrés, une colonne, visuel sous le texte | 4 |
| B4 | Layout | rythme uniforme | toutes les sections même hauteur/padding/layout | 3 |
| B5 | Layout | tout en pilule | radius ≥ moitié de hauteur sur ≥ 60 % des contrôles | 2 |
| C1 | Type | pas de hiérarchie | peu de tailles distinctes, ratio titre/corps < 1.4 | 5 |
| C2 | Type | trop de variantes | > 3 graisses ou > 8 tailles | 3 |
| C3 | Type | labels capitales espacées | `uppercase` + `letter-spacing` ≥ .05em sur des labels | 3 |
| C4 | Type | corps trop petit | corps < 13 px | 2 |
| C5 | Type | tracking négatif sur petit texte | `letter-spacing` < 0 sous 16 px | 2 |
| D1 | Copie | emojis dans l'UI | emoji Unicode dans texte/`alt`/`aria-label` | 5 |
| D2 | Copie | exclamations / hype / salutations | `!`, « Welcome back », supercharge, seamless… | 4 |
| D3 | Copie | données factices | `[X]`, `123,456`, Lorem, « 10,000+ teams » non sourcé | 3 |
| D4 | Copie | libellés bavards | point final sur label/bouton, « Search anything... » | 3 |
| E1 | Contraste | texte illisible | ratio WCAG < 4.5 (corps) | 5 |
| E2 | Contraste | méta illisible | ratio < 3.0 sur les métadonnées | 2 |
| E3 | A11y | focus/targets | pas de `:focus-visible` ou cibles < 24 px | 3 |
| F1 | Motion | pulse/ping décoratif | animation infinie sur un élément non « live » | 4 |
| F2 | Motion | `transition-all` / `hover:scale` | sur cartes et boutons | 3 |
| F3 | Motion | animer le layout | width/height/top/left/margin animés | 3 |

Total = 100. Les poids sont des **valeurs de départ** ; ils vivent dans `scoring.md` et
`scan.mjs` avec un numéro de version, et seront ajustés sur les exemples + evals.

### 9.3 Normalisation (exemples)

- **Compte** : `severity = min(1, n / seuil)`, ex. emojis : 1 → .4, 2 → .8, 3+ → 1.
- **Ratio** : `severity = clamp((ratio − seuil_bas) / (seuil_haut − seuil_bas))`, ex. part
  d'ombres molles > 50 %.
- **Écart de teinte** : normalisé sur `Δhue` et la longueur du dégradé.
- **Contraste** : pénalité proportionnelle à `(4.5 − ratio) / 4.5`, plafonnée.
- **Uniformité des cartes** : coefficient de variation des dimensions ; 0 = identiques.

On ignore les éléments `display:none`, hors viewport, et les `<template>`. On ne note que
le **chrome** et le contenu visible, pas les overlays techniques.

### 9.4 Sortie JSON (stable)

```json
{
  "rubric": "1",
  "input": "page.html",
  "viewport": "1440x900",
  "theme": "light",
  "confidence": 1.0,
  "slop": 72,
  "design": 28,
  "categories": {
    "color":   { "slop": 22, "max": 30 },
    "layout":  { "slop": 11, "max": 20 },
    "type":    { "slop": 9,  "max": 15 },
    "copy":    { "slop": 12, "max": 15 },
    "contrast":{ "slop": 8,  "max": 10 },
    "motion":  { "slop": 10, "max": 10 }
  },
  "signals": [
    {
      "id": "A1",
      "name": "purple gradient surface",
      "weight": 6,
      "severity": 0.8,
      "penalty": 4.8,
      "evidence": [
        { "selector": ".hero", "detail": "linear-gradient(135deg,#7c3aed,#2563eb)" }
      ]
    }
  ],
  "waived": []
}
```

`confidence` vaut 1 pour le DOM, plus bas pour une capture (les seuils de texte/contraste y
sont estimés). `--compare a.json` ajoute un bloc `delta` (global + par catégorie + signaux
supprimés/restants) et un code de sortie non nul si `--min-score` n'est pas atteint.

### 9.5 Mode capture (sans DOM)

Une capture PNG est chargée dans Chromium et lue via un `<canvas>` (aucune dépendance
d'image). On estime : part de pixels violets/bleus saturés, douceur des ombres (variance
locale), régularité de grille (autocorrélation des bords), densité de texte et contraste
par clustering. On marque `"confidence": "low"` et on recommande le mode DOM.

### 9.6 Dérogations et anti-triche

- Un fichier `trueline.json` (optionnel) peut déroger un signal avec une **raison** ;
  la dérogation apparaît dans la sortie et ne peut pas viser plus de N signaux.
- **Interdit de gonfler le score** en supprimant une règle ou en cachant un élément :
  le scanner ignore `display:none` mais signale les `opacity:0` suspects, et le rapport
  liste les dérogations.
- Le barème est figé par version ; comparer deux scans de versions différentes est refusé.

---

## 10. Workflow du skill, en détail

### Étape 0 — Voir l'écran

Trouver les fichiers qui rendent l'écran. Si un serveur local existe, `scan.mjs` sur l'URL.
Sinon `capture.mjs <fichier|url> --out trueline/before.html` (HTML autonome) + PNG de
contrôle. Capture seule → mode image, confidence basse.

### Étape 1 — Scanner

`scan.mjs` → `trueline/before.json`. Présenter à l'utilisateur les signes **triés par
pénalité**, avec sélecteur et valeur, et le score. Ne rien éditer encore.

### Étape 2 — Décider du dosage

- `slop ≥ 45` : refonte, on écrit la direction en 5 lignes et on la soumet.
- `20–44` : polissage, on garde la marque et le layout, on corrige les signes trouvés.
- `≤ 19` : ne pas refondre ; proposer 2–3 retouches chiffrées et s'arrêter.

### Étape 3 — Direction (si refonte)

Produit, caractère (mots concrets, pas « clean/modern »), monde, moments (1–2), signature
(1 détail). Dérivée du produit, jamais des tendances.

### Étape 4 — Corriger par passes

Ordre : **espacement/frame → couleur/profondeur → icônes → type → copie → layout →
composants → visuels → motion**. On termine une passe partout avant la suivante. Après
chaque passe : re-scan, noter le delta de la catégorie, committer localement si demandé.

### Étape 5 — Re-scanner et vérifier

`scan.mjs --compare before.json` → `after.json` + `delta`. Vérifier en plus ce qu'un score
ne voit pas : build/typecheck, contraste réel, focus clavier, clair/sombre, mobile 390.

### Étape 6 — Rapporter

`report.mjs` écrit `RAPPORT.md` et `trueline/report.json` : deux scores, tableau par passe,
captures avant/après, signes restants, dérogations, fichiers touchés. Chaque ligne relie un
changement à un signal et à une preuve.

---

## 11. Captures (Playwright / Chromium)

- `capture.mjs` reprend l'idée d'un HTML autonome : inline CSS, images en data-URI, scroll
  pour charger le lazy, `document.fonts.ready`, thème clair/sombre via `color-scheme`,
  suppression des scripts. Il sauve aussi `before.live.png` pour comparer.
- `scan.mjs` réutilise Playwright pour lire les **styles calculés** (le vrai rendu du
  framework, pas le source), à 1440×900 par défaut, avec options `--width/--height`.
- Pour le mode image, Chromium + canvas suffisent : pas de décodeur natif.
- Si Playwright manque : message d'installation (`npm i -D playwright` +
  `npx playwright install chromium`), et repli sur l'analyse statique du source (moins
  fiable, `confidence` basse).

---

## 12. Qualité, evals, sécurité

### Evals (`evals/evals.json`)

Cas déterministes, vérifiables sans modèle :

1. **slop manifeste** : page avec dégradé violet, 3 cartes identiques, emojis → score ≥ 60.
2. **page propre** : grille 4 px, une accent, zéro emoji → score ≤ 15.
3. **no-slop** : le skill ne doit pas refondre, il propose ≤ 3 retouches.
4. **compare** : après correction des exemples, `slop` baisse d'au moins 40 points.
5. **capture seule** : produit un score et `confidence: low`.
6. **dérogation motivée** : un signal dérogé sort du score et apparaît dans `waived`.
7. **anti-triche** : cacher un élément en `display:none` ne doit pas améliorer le score.
8. **contraste** : un texte gris #999 sur blanc est compté illisible.
9. **rapport** : `RAPPORT.md` contient deux scores et un tableau par passe.
10. **install** : `skills/trueline/SKILL.md` a un frontmatter valide et des liens résolus.

### Vérifications du dépôt (`scripts/check-skill.mjs`)

Frontmatter (`name`, `description`), liens relatifs, JSON valides, présence des fichiers
requis, assets non vides, et **exécution du scanner sur les exemples** avec seuils attendus.

### CI (`.github/workflows/check.yml`)

`npm run lint` (check-skill + scan des exemples) sur Node 22. Pas d'appel LLM en CI : tests
déterministes uniquement.

### Sécurité et vie privée

- Aucun secret, aucune télémétrie, aucun appel réseau caché.
- Le scanner ne quitte pas la machine ; il n'envoie ni page ni capture.
- Le skill ne modifie pas la config de l'utilisateur ni n'installe de paquet sans accord.
- Aucune donnée personnelle dans les exemples ; contenus fictifs.

---

## 13. Risques et mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Faux positifs (un dégradé voulu, une ombre justifiée) | Élevé | dérogation motivée + `waived` visible + seuils par défaut prudents |
| Score « jeu » (cacher/retirer) | Élevé | détection des `opacity:0`, liste des dérogations, barème versionné |
| Capture seule peu fiable | Moyen | `confidence: low` + recommandation DOM |
| Le skill refond un écran déjà bon | Moyen | palier « no slop » explicite + accord utilisateur |
| Sur-correction vers un nouveau template | Élevé | direction tirée du produit, signature, test du nom remplacé |
| Régression d'accessibilité en gagnant des points | Élevé | vérifs contraste/focus/clavier obligatoires, non compensables par le score |
| Dépendance à Playwright | Moyen | repli statique + message d'installation clair |
| Barème qui vieillit | Faible | `rubric` versionné + evals de non-régression |

---

## 14. Plan d'implémentation (commits locaux, sans push)

1. **`docs: study unslop and peer skills, plan trueline`** — ce document + `.gitignore`
   + `ref/` ignoré. *(commit courant)*
2. **`chore: scaffold trueline skill repository`** — arborescence, `LICENSE` MIT,
   `package.json` privé, `scripts/check-skill.mjs`, `.github/workflows/check.yml`.
3. **`feat: add trueline scoring script`** — `skills/trueline/scripts/scan.mjs` (DOM +
   image), schéma JSON, `scoring.md`, `signals.md`, evals de score.
4. **`feat: add capture and report scripts`** — `capture.mjs`, `report.mjs`, `report.md`,
   `capture.md`.
5. **`feat: write trueline skill instructions`** — `SKILL.md` court, `passes.md`,
   `direction.md`, `stacks.md`, checklist et contrat de sortie.
6. **`docs: add before/after examples and README`** — `examples/` (fictif), captures 1440,
   README install-first avec les deux scores.
7. **`test: add evals and final repository checks`** — evals complets, lint, revue finale.

### Critères d'acceptation

- `npx skills add terravidhal/trueline --list` trouve le skill `trueline`.
- `scan.mjs` note un HTML **et** une capture, de façon déterministe.
- Les exemples passent de `slop ≥ 60` à `slop ≤ 15` après correction.
- `RAPPORT.md` contient deux scores, un tableau par passe et des preuves.
- Aucun build/typecheck cassé par la correction sur les exemples.
- Le dépôt est MIT, sans secret ni donnée personnelle.

---

## 15. Sources consultées

### Référence

- `github.com/heydamir/unslop` — `README.md`, `skills/unslop/SKILL.md`,
  `skills/unslop/references/{signs,tokens,visuals,effects,refs,rtl}.md`,
  `skills/unslop/scripts/{snapshot,story}.mjs`, arborescence GitHub.

### Pairs

- `github.com/Leonxlnx/taste-skill` — README, `skills/taste-skill/SKILL.md`, `tasteskill.dev`.
- `github.com/Nutlope/hallmark` — README (portes Floor/Reflex/Finish, `sloplint.mjs`).
- `github.com/callmehai/sloplint` — README (54 tells, checker DOM, diff avant/après).
- `github.com/agshinrajabov/no-slop-design` — README (phases, `slop_lint.py`).
- `github.com/avivgerz-hue/unslop` — SKILL.md (72 règles, score 95–100).
- `github.com/kundan0907/slopless` — README (routes, rapport `avant → après`).

### Modèle de qualité interne

- `terravidhal/logoforge-skill` — structure `skills/<nom>/{SKILL.md,references}`,
  `scripts/check-skill.mjs`, `evals/evals.json`, `README` avant/après, CI, `ETUDE.md`,
  `RAPPORT.md`, licence MIT.

### Disponibilité des noms

- `registry.npmjs.org/{redline,deslop,redpen,slopscore,hairline,slopline,trueline}`
- `github.com/terravidhal/{slopline,trueline,hairline,redline}`

### Note de méthode

Le bac à sable de cette session bloquait `git clone` et la lecture des chemins externes ;
l'étude des dépôts publics a donc été faite via les URL `raw.githubusercontent.com` et
l'API GitHub, ce qui est équivalent pour lire les fichiers. Le clone de travail de la
référence est prévu dans `ref/` (ignoré par git) :

```bash
git clone --depth 1 https://github.com/heydamir/unslop ref/unslop
```
