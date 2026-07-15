<!-- Contract — features/skills · Phase 2 · sources: intake/skills.md §reshape + current-intent. ⚠ DESIGNED
     interface — no @vida/core code yet (v2 = a 2-table floor). -->

# Contract — Skills

Skills' services + seams. **Designed — not yet coded** (`@vida/core/services/skills/`).

## Exposed services (Skills-owned)
- **Skill Composer** — `composeSkill({domain, whatItIs, components[], tracked[], measurement})` · `quickSetup(
  template)` · `advancedSetup(config)`. Defines a skill + its integration/measurement recipe. `[INTENT CI-2]`
- **Definition Library** — `fillDefinition(mode: manual|llm|import)` · `importFromSkillDB(skill, locale)` (opt-in) ·
  `submitToCommunity(def)` · resolves **locale variants**. `[INTENT CI-1]`
- **Ladder / Levels** — `defineLadder(template|custom)` · `evaluateGates(skill)` → derived level. `[INTENT CI-1/CI-4]`
- **Activities / Actions** — `addActivity({type, …})` · `scheduleAction()` → **Sessions `practice`**; `logDevEntry()`
  → **shared reflective engine**; `deriveMastery(skill)`. `[INTENT CI-2/CI-3]`
- **Skill Graph** — `linkDependency(a,b,type)` · `recommendPath(skill)` · `detectSynergies(goals[])` ·
  `renderTree()` (neural-graph Space). `[INTENT CI-3]`

## PROVIDES →
- **Purposes** — Target-Mastery as a purpose target + progress metric (PG6 stub). **Gamification** — level-ups/
  mastery/streaks. **Journal** — practice done. **Health** — a Discipline binds a Skill. **Notifications** — decay/
  maintenance (advisory). `[INTENT reshape §C]`

## CONSUMES ←
- **Sessions & Scheduling (ADR-004)** — `practice` sub-type + scheduler (Actions). `[FACT ADR-004]`
- **Knowledge** — theory/mastery **compound set** · Study/Assessment activities · insights = objects · **review-curve
  (SRS)** for decay. `[FACT knowledge]`
- **Projects** — Project-type activities spawn real Projects (dispatch). **the reflective/Adaptation engine** (shared
  with Health) — Dev-logs + N-of-1 experiments. `[INTENT CI-2/CI-3]`
- **Spaces** — universal tags · saved views · the **Life Skill Tree** capability Block (#8 stub). **Preferences** —
  units·toggle. **external Skill-DB + AI ADR** — import/AI-draft (opt-in). **Notes&Pages** — evidence/pages. `[INTENT]`

## Terminal states (per capability)
- **Composer:** quick (template) · advanced (custom) · incomplete.
- **Definition fill:** manual · AI-generating (**fail→manual**) · importing (**not-found→manual/community**).
- **Mastery:** insufficient-data · derived · manual-override. **Graph:** no-deps · path-recommended · synergy-detected.
- **Action:** planned · in-progress · complete/**skipped**. **Decay:** none · at-risk (advisory) · **dismissed**.

## Completion checklist
- [x] provides/consumes · [x] terminal states · [x] designed-not-coded · [x] no `{{…}}`
