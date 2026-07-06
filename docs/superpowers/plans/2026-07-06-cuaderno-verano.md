# El Cuaderno de Verano — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Offline-first iPad PWA where Aira (9-10, 4º→5º Primaria) and Leo (4-5, I4→I5) practice math (Innovamat method), reading, writing, spelling, English and world knowledge daily, themed around their real summer itinerary, with per-skill gem progression.

**Architecture:** React SPA (hash routing) with three isolated layers: `content/` (static JSON validated by schema), `src/generators/` (pure parametric exercise generators emitting statement + answer + step-by-step Innovamat strategies), and `src/engine/` (deterministic day composer, adaptive selection, gems, surprises). UI renders cards generically by card type. All state in IndexedDB. Zero network at runtime; service worker precaches everything.

**Tech Stack:** Vite 6 + React 18 + TypeScript (strict), Tailwind CSS 4, zustand + idb-keyval (persistence), react-router (HashRouter), vite-plugin-pwa (Workbox precache), vitest (unit + property tests), Web Speech API (TTS), Canvas + Pointer Events (tracing). Deploy: GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-07-06-cuaderno-verano-design.md`
**Research:** `docs/research/perfil-y-contenidos.md`

---

## Conventions (read first)

- **Language:** UI strings in Spanish. Code (identifiers, comments, commits) in English. Content JSON carries `es`/`ca`/`en` fields where applicable.
- **Determinism:** No `Math.random()` / `Date.now()` inside generators or engine logic. Everything takes a `rng: Rng` and/or `dateISO: string` parameter. Only the app shell reads the real clock (one place: `src/lib/clock.ts`).
- **TDD:** every engine/generator task = failing test → minimal implementation → pass → commit.
- **Commits:** small, after every green test run. Prefix `feat:`, `test:`, `content:`, `chore:`.
- **File size:** keep files < ~250 lines; one responsibility per file.
- Run all tests with `npx vitest run` (CI mode). Dev server: `npm run dev`.

## File Structure (target)

```
/                           (repo root = app root)
├── index.html
├── vite.config.ts          (base: '/cuaderno-verano/', PWA config)
├── package.json
├── content/
│   ├── chapters.json       (summer chapters w/ date ranges)
│   ├── series/             (aventura-humanos.json, exploradores.json, inventos.json, animales.json)
│   ├── curiosities.json    (facts + jokes, tagged)
│   ├── geography.json      (SE Asia focus + world basics)
│   ├── english.json        (Leo vocab units + Aira mini-readings)
│   └── diary-prompts.json
├── scripts/
│   └── validate-content.ts (schema validation, run in CI/pretest)
├── src/
│   ├── main.tsx, App.tsx, routes.tsx
│   ├── lib/                (rng.ts, clock.ts, tts.ts, storage.ts, textDiff.ts)
│   ├── types/              (content.ts, exercise.ts, progress.ts)
│   ├── content/            (loader.ts, schemas.ts — zod schemas)
│   ├── generators/
│   │   ├── framework.ts    (Generator interface, registry, difficulty scale)
│   │   ├── aira/           (multiplication.ts, division.ts, mental.ts, estimation.ts,
│   │   │                    wordProblems.ts, measure.ts, fractions.ts, decimalsMoney.ts)
│   │   └── leo/            (counting.ts, decomposition.ts, patterns.ts, shapes.ts)
│   ├── engine/
│   │   ├── mastery.ts      (per-subskill rolling accuracy, difficulty calibration)
│   │   ├── scheduler.ts    (weighted selection 60/25/15 + spaced repetition)
│   │   ├── gems.ts         (7 levels, thresholds, level-up detection)
│   │   ├── surprises.ts    (seeded event roll, challenge gating)
│   │   └── dayComposer.ts  (page-of-today assembly per profile)
│   ├── state/              (profileStore.ts, progressStore.ts, settingsStore.ts)
│   ├── components/         (ui/ primitives, cards/, celebrations/)
│   ├── screens/
│   │   ├── ProfileSelect.tsx, TodayAira.tsx, TodayLeo.tsx, FreeTraining.tsx
│   │   ├── players/        (ProblemPlayer, DictationPlayer, ReadingPlayer, DiaryPlayer,
│   │   │                    TracingPlayer, CountingPlayer, TapImagePlayer, QuizPlayer)
│   │   ├── collections/    (GemCabinet.tsx, Passport.tsx, Mural.tsx)
│   │   └── parents/        (ParentGate.tsx, Dashboard.tsx, Heatmap.tsx, Settings.tsx)
│   └── styles/tokens.css   (kawaii palette, radii, shadows)
└── tests/ mirrors src/ (colocated *.test.ts next to sources instead — chosen style)
```

---

## Phase 0 — Scaffold & foundations

### Task 0.1: Project scaffold

**Files:** Create `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles/tokens.css`.

- [ ] **Step 1:** Scaffold: `npm create vite@latest . -- --template react-ts` (in repo root; keep existing `docs/`, `.gitignore` — extend it with `node_modules/`, `dist/`).
- [ ] **Step 2:** `npm i react-router zustand idb-keyval zod` and `npm i -D vitest @vitest/coverage-v8 tailwindcss @tailwindcss/vite vite-plugin-pwa jsdom @testing-library/react`.
- [ ] **Step 3:** Configure `vite.config.ts`: `base: '/cuaderno-verano/'`, tailwind plugin, `test: { environment: 'jsdom' }`. Add `"test": "vitest run"`, `"validate:content": "tsx scripts/validate-content.ts"` scripts.
- [ ] **Step 4:** Create `src/styles/tokens.css` with the approved palette as CSS custom properties: `--bg:#fdf6f0; --ink:#5b4a43; --ink-soft:#b0958a; --peach:#f4a988; --peach-soft:#ffe8d6; --mint:#d9ead6; --sky:#cfe2ef; --card:#ffffff;` plus celebration accents `--zap:#38bdf8; --sun:#ffd93d; --pow:#ff8a3d; --navy:#1e3a5f;` and radii `--r-card:22px; --r-pill:999px`.
- [ ] **Step 5:** `npm run dev` renders "Cuaderno de Verano" placeholder. `npm run build` passes.
- [ ] **Step 6:** Commit `chore: scaffold Vite+React+TS with Tailwind, PWA deps, design tokens`.

### Task 0.2: Deterministic primitives — rng, clock

**Files:** Create `src/lib/rng.ts`, `src/lib/rng.test.ts`, `src/lib/clock.ts`.

- [ ] **Step 1:** Write failing tests: `createRng('2026-07-16:aira')` returns same sequence across two instances; `rng.int(1,10)` stays in bounds over 1000 draws; `rng.pick([...])` deterministic; different seeds → different first 5 draws.
- [ ] **Step 2:** Implement `createRng(seed: string): Rng` — xmur3 string hash → mulberry32. Interface: `{ next(): number; int(min,max): number; pick<T>(arr:T[]): T; shuffle<T>(arr:T[]): T[]; chance(p:number): boolean }`.
- [ ] **Step 3:** Implement `src/lib/clock.ts`: `todayISO(): string` (local date, `sv-SE` locale trick) — the ONLY file allowed to call `new Date()`.
- [ ] **Step 4:** `npx vitest run src/lib/rng.test.ts` → PASS. Commit `feat: seeded rng and clock primitives`.

### Task 0.3: Content schemas + chapters.json + validation script

**Files:** Create `src/content/schemas.ts`, `content/chapters.json`, `scripts/validate-content.ts`, `src/content/schemas.test.ts`.

- [ ] **Step 1:** Failing test: chapters schema rejects overlapping ranges and gaps; accepts the real chapter list.
- [ ] **Step 2:** Define zod schemas in `src/content/schemas.ts`: `ChapterSchema` `{ id, title, emoji, dateStart, dateEnd (start-inclusive/end-EXCLUSIVE), place, mascot: {id,name,emoji}, flavor: {currency?, landmarks: string[], animals: string[], foods: string[]}, stickers: {id,emoji,name}[] }` + `validateChapters()` asserting: sorted, no gaps, no overlaps, covers 2026-06-29 → 2026-09-13.
- [ ] **Step 3:** Write `content/chapters.json` with the real itinerary (from spec §4.5): preparativos (…→2026-07-12), **vuelo (07-12→07-13, its own chapter per spec §10 — timezone-safe boundary; flavor: SQ387, 13h15, husos horarios)**, singapur (07-13→07-15), borneo-sepilok (07-15→07-17), borneo-kinabatangan (07-17→07-20), kuala-lumpur (07-20→07-24), ubud (07-24→07-27), gili-air (07-27→07-29), sanur (07-29→08-05), verano-en-casa (08-05→09-13). Each with mascot (Tang 🦧 for borneo etc.), currency, landmarks, animals, foods, 10-14 stickers.
- [ ] **Step 4:** `scripts/validate-content.ts` loads every file in `content/`, parses with schemas, exits 1 on error. Wire as `pretest` script.
- [ ] **Step 5:** Tests pass + `npm run validate:content` green. Commit `feat: content schemas, real summer chapters, validation script`.

### Task 0.4: Storage + stores

**Files:** Create `src/lib/storage.ts`, `src/state/profileStore.ts`, `src/state/progressStore.ts`, `src/state/settingsStore.ts`, `src/state/progressStore.test.ts`.

- [ ] **Step 1:** Failing tests for progressStore: `recordAttempt()` appends `{dateISO, cardType, subskill, correct, hintsUsed, ms, difficulty}`; attempts retrievable filtered by subskill; store round-trips through (mocked) idb.
- [ ] **Step 2:** `src/lib/storage.ts`: thin idb-keyval wrapper `loadState<T>(key)`, `saveState(key, value)`, plus `requestPersistence()` calling `navigator.storage.persist()`.
- [ ] **Step 3:** zustand stores with manual hydration from idb on boot (`hydrateAll()` called in `main.tsx`), persisting on change (debounced 500ms). Keys: `profile:aira`, `profile:leo`, `settings`.
- [ ] **Step 4:** Types in `src/types/progress.ts`: `Attempt`, `GemState {skillId, level: 0-6, progress}`, `ProfileProgress {attempts: Attempt[], gems, streak: {count, lastDayISO, graceUsed}, stickers: PlacedSticker[], passportStamps, diaryEntries, coins}`.
- [ ] **Step 5:** Tests pass. Commit `feat: persistent stores over IndexedDB`.

---

## Phase 1 — Engine

### Task 1.1: Skills & subskills catalog

**Files:** Create `src/engine/skills.ts`, `src/engine/skills.test.ts`.

- [ ] **Step 1:** Failing test: every subskill belongs to exactly one skill; Aira has 8 skills, Leo 4; each subskill declares `difficultyRange: [min,max]` and `challenge?: boolean` (next-course content).
- [ ] **Step 2:** Implement catalog as typed const:
  - Aira `calculo`: subskills `tablas`, `mult-1cifra`, `mult-2cifras`, `div-resto`, `mental`, `estimacion`, `cajitas`; `problemas`: `1-paso`, `2-pasos`, `dato-trampa`, `dinero`, `tiempo`, `medida`; `ortografia`: rule-tagged (`accents-ca`, `b-v`, `essa-sorda`, `apostrof`, `maj`, `puntuacio`…); `escritura`, `lectura`, `english`, `geografia`, `mundo`. Challenge subskills (🚀, `challenge:true`): `fracciones`, `decimales-dinero`, `hechos-derivados-dec`, `proporcionalidad`.
  - Leo `trazos`: `letras`, `numeros`, `espejo`; `numeros`: `contar-6`, `descomponer-4-6`, `comparar`; challenge: `contar-20`, `descomponer-7-9`, `dobles`, `mas-menos-1-2`; `english`: `animales`, `colores`, `comida`, `huerto`; `logica`: `patrones`, `formas`, `simetria`, `clasificar`.
- [ ] **Step 3:** Tests pass. Commit `feat: skills and subskills catalog`.

### Task 1.2: Mastery model

**Files:** Create `src/engine/mastery.ts`, `src/engine/mastery.test.ts`.

- [ ] **Step 1:** Failing tests: `masteryFor(attempts, subskill)` = accuracy over last 20 attempts (fewer OK); `suggestedDifficulty` rises when accuracy ≥85% over last 10 at current level, drops when <60%; hint-assisted correct counts 0.5.
- [ ] **Step 2:** Implement pure functions (no store access — take `Attempt[]`).
- [ ] **Step 3:** Tests pass. Commit `feat: mastery model with difficulty calibration`.

### Task 1.3: Scheduler (adaptive selection + spaced repetition)

**Files:** Create `src/engine/scheduler.ts`, `src/engine/scheduler.test.ts`.

- [ ] **Step 1:** Failing tests: with a failed attempt on `mult-2cifras` 1/3/7 days ago → subskill is "due"; weights: due/weak pool 60%, consolidation 25%, novelty 15% (assert distribution over 1000 seeded picks ±5%); parent boost doubles a subskill's weight; focus mode restricts novelty pool to focus subskills; challenge subskills excluded unless base skill gem ≥ level 2 (Ámbar).
- [ ] **Step 2:** Implement `pickSubskill(rng, attempts, catalog, settings): SubskillId` + `dueSubskills()` (spaced-rep re-queue at +1, +3, +7 days after a failure).
- [ ] **Step 3:** Tests pass. Commit `feat: adaptive scheduler with spaced repetition and parent overrides`.

### Task 1.4: Gems

**Files:** Create `src/engine/gems.ts`, `src/engine/gems.test.ts`.

- [ ] **Step 1:** Failing tests: levels `piedra(0)→cuarzo→ambar→esmeralda→rubi→diamante→opalo(6)`; level-up requires BOTH ≥80% accuracy over last 20 attempts in that skill AND ≥N attempts at difficulty ≥ level's floor (N=12); never levels down; `checkLevelUp` returns event object for celebration. Skills without correctness signal (`escritura` via diary): each diary save counts as a correct attempt at difficulty = current level floor (progression by consistency).
- [ ] **Step 2:** Implement. Include `gemVisual(level)` mapping (emoji + name es).
- [ ] **Step 3:** Tests pass. Commit `feat: gem progression by mastery`.

### Task 1.5: Streak

**Files:** Create `src/engine/streak.ts`, `src/engine/streak.test.ts`.

- [ ] **Step 1:** Failing tests: ≥1 completed card in a day extends streak; missing 1 day consumes a grace day (2 grace days per rolling 7) without reset; missing beyond grace → reset to 0 silently (no scolding copy anywhere); streak never blocks anything, only grants coin bonus at 3/7/14/30.
- [ ] **Step 2:** Implement pure `advanceStreak(streak, dateISO, completedToday): Streak`. Tests pass. Commit `feat: tolerant streak engine`.

### Task 1.6: Surprise engine

**Files:** Create `src/engine/surprises.ts`, `src/engine/surprises.test.ts`.

- [ ] **Step 1:** Failing tests: seeded by `dateISO:profile`; ~30% of 365 simulated days have exactly one event (±5%); challenge-day events only when gating passes; `gema-doble` biased toward weakest gem; event set: `desafio | relampago | gema-doble | invitado | cofre-mejorado`.
- [ ] **Step 2:** Implement `rollSurprise(rng, gems, catalog): Surprise | null`.
- [ ] **Step 3:** Tests pass. Commit `feat: seeded surprise engine`.

### Task 1.7: Day composer

**Files:** Create `src/engine/dayComposer.ts`, `src/engine/dayComposer.test.ts`.

- [ ] **Step 1:** Failing tests: same (date, profile, progress) → identical page; Aira page = [problema, dictado, sabias-que, diario] + surprise slot; Leo = [trazos, contar, english, sorpresa]; chapter resolved by date (boundary: 2026-07-15 → borneo-sepilok); dictation card alternates language with ≥60% ca over 30 days; content picks (episode, curiosity, diary prompt) never repeat until pool exhausted (progress tracks consumed ids).
- [ ] **Step 2:** Implement `composeDay(dateISO, profile, progress, content, settings): DayPage` returning card descriptors `{cardType, subskill?, contentRef?, generatorParams?, surprise?}` — NO exercise instances yet (players instantiate via generator at open time with `rng(seed=date:profile:cardIdx)`).
- [ ] **Step 3:** Tests pass. Commit `feat: deterministic day composer`.

---

## Phase 2 — Math generator framework + Aira generators

### Task 2.1: Generator framework

**Files:** Create `src/generators/framework.ts`, `src/types/exercise.ts`, `src/generators/framework.test.ts`.

- [ ] **Step 1:** Failing test: registry lookup by subskill returns generator; generating with same rng seed twice → identical exercise.
- [ ] **Step 2:** Define core types:

```ts
export interface Exercise {
  id: string;                 // seed-derived
  subskill: SubskillId;
  difficulty: number;         // 1..5
  prompt: Prompt;             // { text: string; flavor?: FlavorRefs } — text may embed {gaps}
  answer: Answer;             // { kind: 'number'|'text'|'choice'|'multi'; value: ... ; tolerance? }
  choices?: Choice[];         // for choice kinds
  dataHighlight?: { statement: string; relevant: string[]; trap?: string }; // word problems
  strategies: Strategy[];     // ≥1; { id, name, steps: StrategyStep[] }
  microlesson?: string;       // "¿para qué sirve?" real-world hook
}
export interface StrategyStep { text: string; visual?: VisualSpec } // VisualSpec: rectangle-model | number-line | boxes | none
export interface Generator { subskill: SubskillId; generate(rng: Rng, difficulty: number, flavor: ChapterFlavor): Exercise }
```

- [ ] **Step 3:** Implement registry + `instantiateCard(descriptor, content)` helper. Tests pass. Commit `feat: generator framework and exercise types`.

### Task 2.2: Multiplication generators

**Files:** Create `src/generators/aira/multiplication.ts`, `.test.ts`.

- [ ] **Step 1:** Property tests (200 seeds × difficulties): answer equals a×b; difficulty maps to ranges (d1: tables ≤10×10 · d2: 1-digit × 2-digit · d3: 1-digit × 3-digit · d4: 2-digit × 2-digit · d5: 2-digit × 3-digit); strategies present: `rectangular` (steps decompose b into tens+units with visual), `descomposicion`, `algoritmo` (d≥2), `hechos-derivados` only when applicable (a or b even); every step's arithmetic is self-consistent (parse numbers from steps and verify).
- [ ] **Step 2:** Implement; strategy steps computed from operands (e.g. 17×4 → "17 = 10 + 7", "10×4 = 40", "7×4 = 28", "40+28 = 68" + rectangle VisualSpec `{rows:4, colsSplit:[10,7]}`).
- [ ] **Step 3:** Also `tablas` generator (missing-factor, pattern-hunt on multiplicative board: "¿qué casillas de la tabla del 5 acaban en 0?") and `cajitas` generator (triple → 4 derived operations, one hidden).
- [ ] **Step 4:** Tests pass. Commit `feat: multiplication, tables and cajitas generators with Innovamat strategies`.

### Task 2.3: Division generators

**Files:** Create `src/generators/aira/division.ts`, `.test.ts`.

- [ ] **Step 1:** Property tests: `divisor×quotient+remainder === dividend`, `0 ≤ r < divisor`; both meanings generated (`repartir` / `agrupar`) with matching phrasing; strategies: `reparto-sucesivo` (vertical scheme steps: running total of dealt rounds), `cajita` (nearest multiplication), `descomposicion` (split dividend into divisor-friendly chunks); difficulty ranges d1: exact ≤50 · d2: remainder ≤50 · d3: ≤100 · d4: ≤300 · d5: ≤1000.
- [ ] **Step 2:** Implement with flavor phrasing (satay sticks per plate, photos per passport page…).
- [ ] **Step 3:** Tests pass. Commit `feat: division generators (sharing/grouping) with vertical scheme strategy`.

### Task 2.4: Mental calc + estimation generators

**Files:** Create `src/generators/aira/mental.ts`, `src/generators/aira/estimation.ts`, tests.

- [ ] **Step 1:** Property tests. `mental`: chains like `34+19` (compensation strategy steps: "+20 −1"), doubles/halves, ×10/×100. `estimacion`: three kinds — pick-the-plausible-result (choices), is-budget-enough ("Tienes 65€…" → yes/no + reasoning step), spot-the-error (a worked operation with a wrong digit; answer = the wrong step index).
- [ ] **Step 2:** Implement both. Also two small extras from spec §5.1: `patrones-crecimiento` generator (growth sequences 1,3,6,10… find-next with strategy step showing the differences) registered under `problemas`, and `romanos` (roman↔decimal conversion, occasional/lúdico, low weight) under `calculo`.
- [ ] **Step 3:** Tests pass. Commit `feat: mental calculation and estimation generators`.

### Task 2.5: Word-problem generator (the flagship)

**Files:** Create `src/generators/aira/wordProblems.ts`, `src/generators/aira/problemTemplates.ts`, tests.

- [ ] **Step 1:** Property tests: numeric answer consistent with template computation; `dataHighlight.relevant` lists the numbers actually needed; when difficulty ≥3 a `trap` datum exists and is NOT needed; templates cover contexts `dinero`, `tiempo`, `medida`, `reparto`, `compra` and 1-paso/2-pasos; every template renders with ≥3 chapter flavors without broken placeholders (test iterates all chapters × templates).
- [ ] **Step 2:** `problemTemplates.ts`: ~25 parametric templates with flavor slots, e.g. `"En {market} cada {item} cuesta {a}€. Compráis {b} {item}s y pagáis con {c}€. ¿Cuánto os devuelven?"` → computation `(c - a*b)`, relevant `[a,b,c]`, two-step. Templates declare required flavor keys and fall back to `verano-en-casa` flavor when a chapter lacks one.
- [ ] **Step 3:** Generator picks template by subskill/difficulty, binds flavored values, computes answer + strategy steps (Innovamat phases: `entender` → `datos` → `plan` → `calculo` → `comprobar`).
- [ ] **Step 4:** Tests pass. Commit `feat: flavored word-problem generator with data-identification support`.

### Task 2.6: Measure + challenge generators (5º 🚀)

**Files:** Create `src/generators/aira/measure.ts`, `src/generators/aira/fractions.ts`, `src/generators/aira/decimalsMoney.ts`, tests.

- [ ] **Step 1:** Property tests. `measure`: unit conversions with reasoning ("una hormiga mide 4mm…"; only mm/cm/m/km, ml/cl/l, g/kg — no hectogramos per Innovamat), grid area/perimeter (answer verified against generated grid figure). `fracciones` (challenge): part-of-unit visual (pizza slices), part-of-collection (`3/4 de 36`, steps `:4 ×3`), compare/equivalents. `decimales-dinero` (challenge): ±/×/÷ with 2 decimals in € context, strategies `saltos-linea` and `descomposicion-monedas`; all money arithmetic done in integer cents inside the generator (assert no float drift). `hechos-derivados-dec` (challenge): known-fact → derived-fact pairs (5+4=9 → 4,90+3,90=?) with the reasoning step as the strategy. `proporcionalidad` (challenge): recipe doubling/tripling and unit-change deduce-×-or-÷ items. Every challenge subskill declared in Task 1.1's catalog MUST have a registered generator by end of this task (test: iterate catalog, assert registry coverage).
- [ ] **Step 2:** Implement; challenge exercises get `challenge: true` marker propagated to Exercise.
- [ ] **Step 3:** Tests pass. Commit `feat: measure generators and 5º challenge generators (fractions, decimals-as-money)`.

---

## Phase 3 — Leo generators

### Task 3.1: Counting & decomposition

**Files:** Create `src/generators/leo/counting.ts`, `src/generators/leo/decomposition.ts`, tests.

- [ ] **Step 1:** Property tests: `contar-6` renders n∈[1..6] animal emojis from chapter flavor, answer=n, choices are 3 near numbers; challenge `contar-20` n∈[7..20]; `comparar`: two emoji groups, "¿dónde hay más?" (or equal), counts within 0-6; `descomponer-4-6`: "hay {t} en total, ves {v}, ¿cuántos escondidos?" answer t−v; challenge `descomponer-7-9`, `dobles` (1-6), `mas-menos-1-2` similar bounds, `simbolos` (pick +, − or = to make a shown equation true, range 1-9). Registry-coverage test for Leo catalog too.
- [ ] **Step 2:** Implement (visual-first: exercises carry `visual: {kind:'emoji-count', items,…}` for big-tap UI).
- [ ] **Step 3:** Tests pass. Commit `feat: Leo counting and decomposition generators (I4 + I5 challenges)`.

### Task 3.2: Patterns, shapes, symmetry, classify

**Files:** Create `src/generators/leo/patterns.ts`, `src/generators/leo/shapes.ts`, tests.

- [ ] **Step 1:** Property tests: pattern `AB/AAB/ABC` sequences with one hidden slot, answer index correct; shapes: "toca el {shape}" among 4 distractors; symmetry: pick the mirrored half (precomputed emoji pairs); classify: "¿cuál NO es {category}?" using flavor animal/food pools.
- [ ] **Step 2:** Implement. Tests pass. Commit `feat: Leo logic generators (patterns, shapes, symmetry, classification)`.

### Task 3.3: Letter/number tracing data

**Files:** Create `src/generators/leo/tracing.ts`, `src/lib/strokes.ts`, tests.

- [ ] **Step 1:** Failing test: `strokesFor('a')` returns ≥1 stroke as normalized point arrays in a 0..1 box; every uppercase letter A-Z (+Ñ), lowercase, digits 0-9 have stroke data; daily pick rotates through unmastered glyphs first (mirror-prone digits 3,5,7,9,S,Z flagged for extra rotation).
- [ ] **Step 2:** `src/lib/strokes.ts`: stroke path data (hand-authored polyline approximations per glyph — coarse is fine, tolerance is generous). `tracing.ts` picks glyph of the day (seeded, mastery-aware) and emits `{glyph, strokes, audioText}`.
- [ ] **Step 3:** Tests pass. Commit `feat: tracing glyph data and daily glyph selection`.

---

## Phase 4 — Editorial content (data-only tasks; every file must pass `npm run validate:content`)

> Content tasks are volume work: dispatch content-writer subagents WITH the schema and 2 gold examples in the prompt. Spanish/Catalan text must be native-quality; Catalan orthography is the point of dictations — a native-level review pass of `ca` fields is part of each task's checklist.

### Task 4.1: Series schemas + "La aventura de ser humanos" + "Animales increíbles"

**Files:** Create `src/content/seriesSchema.ts` (extend schemas.ts), `content/series/aventura-humanos.json`, `content/series/animales.json`.

- [ ] **Step 1:** Schema: `{ id, title, emoji, episodes: [{ id, order, title, dictation: {ca: string, es: string}, factExtra: {ca,es}, hook: string, questions: [{q, choices[4], correctIdx, kind:'reflexiva'|'literal'}] }] }`. Dictation length 2-4 sentences, target 25-45 words. Validation: sequential order, both languages present, exactly 1 reflexiva question per episode.
- [ ] **Step 2:** Write 20 episodes of `aventura-humanos` (Sapiens-juvenile arc: primeros homínidos → fuego → neandertales → arte rupestre → agricultura → escritura…) and 20 of `animales` (front-loaded with trip fauna: orangután, nasique, elefante pigmeo, cálao, tortuga verde, dragón de Komodo…).
- [ ] **Step 3:** `npm run validate:content` green. Commit `content: human-history and animals dictation series (20+20 episodes, ca+es)`.

### Task 4.2: "Exploradoras y exploradores" + "Inventos que cambiaron todo"

**Files:** Create `content/series/exploradores.json`, `content/series/inventos.json`.

- [ ] **Step 1:** 15 episodes each, same schema. Explorers include Magallanes-Elcano, Jeanne Baret, Ibn Battuta (Sumatra tie-in), Amelia Earhart, Junko Tabei, Sacagawea. Inventos: rueda, papel, brújula, imprenta, penicilina, avión…
- [ ] **Step 2:** Validate + commit `content: explorers and inventions dictation series`.

### Task 4.3: Curiosities, jokes, diary prompts

**Files:** Create `content/curiosities.json`, `content/diary-prompts.json`.

- [ ] **Step 1:** Schemas: curiosity `{id, text: {es}, tag: 'viaje'|'espacio'|'animales'|'record'|'cuerpo'|'historia', chapterId?, premium?: boolean}`; joke `{id, text:{es|ca}, kind:'chiste'}`; diary prompt `{id, text:{es}, chapterId?}`.
- [ ] **Step 2:** Write ~120 curiosities (≥4 per trip chapter incl. Singapore chewing-gum ban, Petronas height math, komodo, 29.422km ≈ 0,73 vueltas), ~40 jokes (kid-appropriate, some in Catalan), ~70 diary prompts (trip-aware: "¿Qué es lo más raro que has comido hoy?" + at-home ones).
- [ ] **Step 3:** Validate + commit `content: curiosities, jokes and diary prompts`.

### Task 4.4: Geography + English + Mundo quiz data

**Files:** Create `content/geography.json`, `content/english.json`, `content/mundo.json`.

- [ ] **Step 1:** Schemas + data. Geography: SE-Asia pack (countries/capitals/flags-as-emoji/landmarks for SG/MY/ID + neighbors) + Europe/world basics pack; quiz item kinds: `capital-of`, `flag-pick`, `where-is` (region multiple-choice). English Leo: 6 vocab units (animals, colors, food, garden, numbers, body) each 8-10 `{word, emoji, audioText}`. English Aira: 20 mini-readings (3-5 sentences, A1-A2) with 2 comprehension questions each. Mundo: 30 Sistema Solar / how-things-work quiz items.
- [ ] **Step 2:** `content/cuentos-leo.json`: 15 audio-cuentos (4-6 short sentences es, TTS-read, chapter-flavored when possible: the orangutan who lost his mango…) each ending in ONE visual question `{q, choices: emoji[4], correctIdx}` — feeds Leo's "sorpresa" rotation (spec §4.3/§6.3).
- [ ] **Step 3:** Validate + commit `content: geography, english, world-knowledge and Leo story packs`.

---

## Phase 5 — UI

> Kawaii-calm base + manga celebrations (spec §3). Reference mockups: `.superpowers/brainstorm/83961-1783318647/home-cuaderno-v2.html` (Aira), `home-leo.html` (Leo), `visual-style.html` (style A base + C celebrations). Touch targets ≥60px for Leo, ≥44px for Aira. All Leo screens speak via TTS on mount.

### Task 5.1: UI primitives + TTS

**Files:** Create `src/lib/tts.ts`, `src/components/ui/` (Button, Card, Pill, ProgressBar, SpeakButton, Modal), `src/lib/tts.test.ts`.

- [ ] **Step 1:** `tts.ts`: `speak(text, lang: 'es-ES'|'ca-ES'|'en-US'|'en-GB')` picking best local voice, `voicesAvailable()` report, rate 0.9 for kids. Test with mocked `speechSynthesis`.
- [ ] **Step 2:** Primitives styled with tokens (rounded-22, soft shadows, peach primary). Storybook-less: create `/dev/kitchen-sink` route to eyeball components.
- [ ] **Step 3:** Commit `feat: TTS wrapper and kawaii UI primitives`.

### Task 5.2: Profile select + app shell

**Files:** Create `src/screens/ProfileSelect.tsx`, `src/routes.tsx`, header/nav components.

- [ ] **Step 1:** HashRouter routes: `/` (profile select), `/hoy` (today, per active profile), `/entrenar`, `/coleccion` (gems+passport/mural), `/padres`. Profile select: two big avatar cards (Aira 🌸 / Leo 🦖) + tiny lock icon → parent gate.
- [ ] **Step 2:** Shell header: greeting, chapter pill (place + emoji from date), streak flame, coins. Leo variant: bigger, fewer elements.
- [ ] **Step 3:** Manual check on dev server both profiles. Commit `feat: profile selection and app shell with chapter theming`.

### Task 5.3: Today page (both profiles)

**Files:** Create `src/screens/TodayAira.tsx`, `src/screens/TodayLeo.tsx`, `src/components/cards/DayCard.tsx`.

- [ ] **Step 1:** Render `composeDay()` output as card grid per approved mockups: Aira 2×2 (problema/dictado/sabías/diario) + "¿Quieres más?" strip + gem cabinet preview; Leo 3 big cards + sorpresa card + mural strip. Cards show NUEVO badge, completion check, and per-card gem hint ("+progreso en 💎 Ortografía").
- [ ] **Step 2:** Card completion state from progressStore; completing all → chest modal (reward via surprises/coins) + passport stamp/mural sticker grant.
- [ ] **Step 3:** Playwright-free manual QA: set device date to 3 different chapter dates, verify theming. Commit `feat: daily notebook page for both profiles`.

### Task 5.4: Exercise players — Aira math

**Files:** Create `src/screens/players/ProblemPlayer.tsx`, `src/components/StrategyViewer.tsx`, `src/components/DataHighlighter.tsx`, `src/components/visuals/` (RectangleModel, NumberLine, BoxesVisual).

- [ ] **Step 1:** ProblemPlayer flow (spec §5.2): statement (with flavor art placeholder) → for word problems: DataHighlighter step (tap the needed numbers; trap feedback) → numeric keypad answer → correct: celebration + "¿Cómo lo resolvió {mascota}?" opens StrategyViewer (steps animate one-by-one, strategy rotated by seed; "¿Lo hiciste igual?" yes/no logged) → wrong #1: scaffold phases (re-read → what do we know → what's asked → which operation) → wrong #2: guided full solution, re-queue subskill.
- [ ] **Step 2:** StrategyViewer renders StrategyStep.visual specs (rectangle model as CSS grid, number line as SVG).
- [ ] **Step 3:** Component tests for answer validation + hint escalation logic (extract to `src/screens/players/problemFlow.ts`, pure, tested). Commit `feat: problem player with strategy viewer and Innovamat scaffolding`.

### Task 5.5: Dictation, reading & diary players

**Files:** Create `src/screens/players/DictationPlayer.tsx`, `src/lib/textDiff.ts` (+test), `src/screens/players/ReadingPlayer.tsx`, `src/screens/players/DiaryPlayer.tsx`.

- [ ] **Step 1:** `textDiff.ts` TDD: word-level diff tolerant to case/punctuation option flags; returns per-word status (`ok|misspelled|missing|extra`) for highlight; accent errors flagged distinctly (that's the Catalan point).
- [ ] **Step 2:** DictationPlayer: episode intro (series cover + "Episodio N") → listen (sentence-by-sentence replay buttons, TTS ca/es) → type → self-correct view with diff highlights → fact extra + hook for next episode. Fallback (spec §10): if the needed TTS voice is unavailable, show the dictation text in a "léelo tú en voz alta" adult-reader mode instead of blocking. Errors feed `ortografia` subskill attempts (rule inference: accent errors → `accents-ca`, etc. — keep heuristic simple: map by error character class).
- [ ] **Step 3:** ReadingPlayer: text → 2 questions (1 reflexiva); DiaryPlayer: prompt + textarea, autosave draft, save → coin + streak credit; entries listed in collection screen.
- [ ] **Step 4:** Commit `feat: dictation with diff self-correction, reading and diary players`.

### Task 5.6: Leo players

**Files:** Create `src/screens/players/TracingPlayer.tsx`, `src/lib/traceScore.ts` (+test), `src/screens/players/CountingPlayer.tsx`, `src/screens/players/TapImagePlayer.tsx`.

- [ ] **Step 1:** `traceScore.ts` TDD: given stroke guide points + user pointer samples → coverage %, direction bonus, generous star mapping (≥50% 1★, ≥70% 2★, ≥85% 3★).
- [ ] **Step 2:** TracingPlayer: canvas, giant glyph outline, animated direction arrow demo, finger draw (Pointer Events, `touch-action: none`), instant sparkle trail, star result + TTS praise; mirror-flagged glyphs get a ghost "wrong-way" watermark to compare.
- [ ] **Step 3:** CountingPlayer: emoji field, tap-to-count with counter voice, big number choices. TapImagePlayer: TTS word → 4 image tiles.
- [ ] **Step 4:** CuentoPlayer: sentence-by-sentence TTS with big illustration emoji, then the visual question (4 emoji tiles). Used by the "sorpresa" rotation alongside patterns/shapes/symmetry/puzzle.
- [ ] **Step 5:** Commit `feat: Leo players (tracing with scoring, counting, tap-image English, audio stories)`.

### Task 5.7: Quiz player (geography/mundo/english-Aira) + free training

**Files:** Create `src/screens/players/QuizPlayer.tsx`, `src/screens/FreeTraining.tsx`.

- [ ] **Step 1:** Generic QuizPlayer over content quiz items (4-choice, streak-of-5 rounds). FreeTraining: skill grid → subskill list w/ mastery dots → endless session loop (generator or quiz-backed), challenge items marked 🚀, exit summary (+relámpago mode when surprise active).
- [ ] **Step 2:** Commit `feat: quiz player and endless free training`.

### Task 5.8: Celebrations + collections

**Files:** Create `src/components/celebrations/` (ConfettiBurst, GemLevelUp, MangaBurst), `src/screens/collections/GemCabinet.tsx`, `Passport.tsx`, `Mural.tsx`.

- [ ] **Step 1:** MangaBurst: 500ms CSS-only radial speed-lines + star pop + onomatopeya («¡ZAS!», «¡SUGOI!») — used on correct answers (probabilistic, not every time) . GemLevelUp: full-screen takeover, gem morph animation, mascot cheer. Respect `prefers-reduced-motion`.
- [ ] **Step 2:** GemCabinet (per-skill gem, level name, progress ring, weakest gem gentle pulse), Passport (stamp grid by day with chapter art, milestone pages), Mural (drag stickers onto chapter scene, position persisted, past murals gallery).
- [ ] **Step 3:** Coin spending — "El Cofre de los Tesoros" section in the collection screen: spend coins to unlock `premium` curiosities, extra jokes, bonus mural stickers and mascot accessories (hat/scarf cosmetic on the mascot avatar). Prices flat and cheap (5-15 coins); unlocked items persist in progress. This closes the earn→spend loop (spec §7.3).
- [ ] **Step 4:** Commit `feat: manga celebrations, gem cabinet, passport, mural and coin treasure chest`.

---

## Phase 6 — Parent panel

### Task 6.1: Gate + dashboard + heatmap

**Files:** Create `src/screens/parents/ParentGate.tsx`, `Dashboard.tsx`, `Heatmap.tsx`, `src/engine/analytics.ts` (+test).

- [ ] **Step 1:** `analytics.ts` TDD: per-subskill accuracy/volume over window; daily activity rollup (cards done, minutes) — pure over `Attempt[]`.
- [ ] **Step 2:** ParentGate: 4-digit PIN (set on first use, stored hashed in settings; recovery = math question 7×8+5). Dashboard per child: last-14-days activity, gem levels. Heatmap: subskill grid colored by accuracy (🔴<60 🟠<80 🟢≥80) with volume; tap → detail + controls.
- [ ] **Step 3:** Commit `feat: parent gate, dashboard and subskill heatmap`.

### Task 6.2: Controls + export/import

**Files:** Modify `src/screens/parents/Settings.tsx`, `src/state/settingsStore.ts`; create `src/lib/backup.ts` (+test).

- [ ] **Step 1:** Controls wired to scheduler settings: per-subskill Boost (×2, 7 days, auto-expires), difficulty offset (−1/auto/+1), weekly focus picker, per-child mission size (Leo 3-4 / Aira 4-6 cards), challenge frequency, module toggles.
- [ ] **Step 2:** `backup.ts` TDD: `exportAll()` → versioned JSON blob (both profiles + settings) triggering download; `importAll(json)` validates version + schema, atomic replace. Plus `exportDiaryText(profile)` → readable `.txt` ("El diario de Aira — verano 2026"). Parent dashboard shows a discreet "última copia: hace N días" nudge when >14 days since last export (spec §10).
- [ ] **Step 3:** Commit `feat: parent controls, backup export/import, diary text export`.

---

## Phase 7 — PWA, offline hardening, deploy

### Task 7.1: PWA + offline

**Files:** Modify `vite.config.ts`; create `public/icons/*`, `src/lib/swUpdate.ts`.

- [ ] **Step 1:** vite-plugin-pwa: `registerType: 'prompt'`, manifest (name "Cuaderno de Verano", display standalone, orientation any, theme `#fdf6f0`, icons 192/512 + apple-touch-icon), Workbox `globPatterns` covering ALL assets + content JSON (everything is build-time imported, so precache = whole app).
- [ ] **Step 2:** Update toast ("Hay una versión nueva ✨ Actualizar") via `swUpdate.ts`. Boot sequence: `requestPersistence()`, TTS voices check → banner with Settings deep-link instructions if `ca-ES` missing.
- [ ] **Step 3:** `npm run build && npm run preview` → Lighthouse PWA installable; DevTools offline → full session works. Commit `feat: installable offline PWA with update prompt`.

### Task 7.2: Deploy to GitHub Pages

**Files:** Create `.github/workflows/deploy.yml`.

- [ ] **Step 1:** Confirm with user: repo name `cuaderno-verano`, public (no personal data ships: progress is device-local; kid names only in local state — verify content JSONs contain no real-kid data beyond first names in UI strings, which stay in code not content). Create via `gh repo create`.
- [ ] **Step 2:** Actions workflow: on push to main → build → deploy Pages artifact. Push, verify `https://<user>.github.io/cuaderno-verano/` loads, installs to Home Screen, works in airplane mode.
- [ ] **Step 3:** Commit `chore: GitHub Pages deploy workflow`.

### Task 7.3: iPad QA pass + fixes

- [ ] **Step 1:** On the real iPad: install PWA; run one full Aira day + one Leo day in airplane mode; verify TTS ca/es/en; tracing feel (palm rejection via touch-action, stroke latency); text sizes at arm's length; storage persist prompt.
- [ ] **Step 2:** File and fix issues found (timebox: fix blockers, log rest to `docs/qa-notes.md`).
- [ ] **Step 3:** Commit fixes. Tag `v1.0.0`.

---

## Milestone acceptance (maps to spec §13)

1. `npx vitest run` green; `npm run validate:content` green.
2. Airplane-mode full session per child on iPad.
3. Same day + profile reopened → identical page (determinism spot-check).
4. Parent heatmap reflects seeded wrong answers; Boost visibly shifts next-day selection (dev-tool: date override in parent panel `?debugDate=`).
5. Gem level-up reachable in ~1 week of simulated normal use (simulation script in `scripts/simulate-summer.ts` — optional, build only if thresholds feel off).
