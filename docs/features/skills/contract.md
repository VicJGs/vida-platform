<!-- Contract — features/skills · Phase 2 · sources: intake/skills.md §reshape + current-intent. ⚠ DESIGNED
     interface — no @vida/core code yet (v2 = a 2-table floor). -->

# Contract — Skills

Skills' services + seams. **Designed — not yet coded** (`@vida/core/services/skills/`).

## Exposed services (Skills-owned)

- **Skill Composer** — `composeSkill({domain, whatItIs, components[], tracked[], measurement})` · `quickSetup(
template)` · `advancedSetup(config)`. Defines a skill + its integration/measurement recipe. `[INTENT CI-2]`
- **Definition Library** — `fillDefinition(mode: manual|llm|import)` (`import` = X1 device-mediated public-reference
  fetch under `external_in_ok`, X2/X3/X5; `llm` = an ADR-015 model call, X11 split, in `on_device`/`cloud` modes AI1,
  cloud rides egress + scope-min AI3) · `importFromSkillDB(skill, locale)` (opt-in) · **`exportTemplate(def)`** (F1: a
  user-sovereign generic-template **export** = X4 egress under `external_out_ok`, per-target consent — replaces the
  retired `submitToCommunity`; no in-OS submission) · resolves **locale variants**. `[INTENT CI-1; ADR-014
X1/X2/X3/X4/X5/X11; ADR-015 AI1/AI3]`
- **Ladder / Levels** — `defineLadder(template|custom)` · `evaluateGates(skill)` → derived level. `[INTENT CI-1/CI-4]`
- **Activities / Actions** — `addActivity({type, …})` · `scheduleAction()` → **Sessions `practice`**; `logDevEntry()`
  → **shared reflective engine**; `deriveMastery(skill)`. `[INTENT CI-2/CI-3]`
- **Skill Graph** — `linkDependency(a,b,type)` · `recommendPath(skill)` · `detectSynergies(goals[])` ·
  `renderTree()` (neural-graph Space). `[INTENT CI-3]`

## PROVIDES →

- **Purposes** — Target-Mastery as a **purpose target** (carries `measurement_kind`/`binding_mode`, M1/M2 —
  Purposes-owned) + progress metric (PG6 stub). **Gamification** — level-ups/mastery/streaks emit `grant_currency(XP)`
  (E2). **Journal** — practice done. **Health** — a Discipline binds a Skill. **Notifications** — decay/maintenance
  (advisory). `[INTENT reshape §C; ADR-011 M1/M2; ADR-012 E2]`

## CONSUMES ←

- **Sessions & Scheduling (ADR-004)** — `practice` sub-type + scheduler (Actions). `[FACT ADR-004]`
- **Knowledge** — theory/mastery **compound set** · Study/Assessment activities · insights = objects · **review-curve
  (SRS)** for decay. `[FACT knowledge]`
- **Projects** — Project-type activities spawn real Projects (dispatch). **the reflective/Adaptation engine** (shared
  with Health) — Dev-logs + N-of-1 experiments. `[INTENT CI-2/CI-3]`
- **Spaces** — universal tags (via `entity_tags`, SP1) · saved views · the **Life Skill Tree** capability Block (#8
  stub). **Preferences** — units·toggle. **external Skill-DB (ADR-014 X2 public-reference) + the AI layer** —
  import/AI-draft (opt-in); AI config = `ai_connections` (AI2, mediator credential custody, key never in sandbox).
  **Notes&Pages** — evidence/pages. `[INTENT; ADR-006 SP1; ADR-014 X2; ADR-015 AI2]`

## Terminal states (per capability)

- **Composer:** quick (template) · advanced (custom) · incomplete.
- **Definition fill:** manual · AI-generating (**fail→manual**) · importing (**not-found→manual/community-import**).
- **Mastery:** insufficient-data · derived · manual-override. **Graph:** no-deps · path-recommended · synergy-detected.
- **Action:** planned · in-progress · complete/**skipped**. **Decay:** none · at-risk (advisory) · **dismissed**.

## Completion checklist

- [x] provides/consumes · [x] terminal states · [x] designed-not-coded · [x] no `{{…}}`
