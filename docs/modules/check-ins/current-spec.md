# Current Spec — check-ins   (level: Module · tier: STANDARD)
> Coverage: read schema (1/1, full) + colocated types + validators + 4/5 intake aspects (conventions.md = companion, not folded) — status: full (code) · full (aspects harvested).
> Inherits: docs/core (business-rules constitution — ZK-1/2/3, LF-1/2/3). This doc must not contradict any level above it.
> Last refreshed: 2026-09-19-mod-check-ins  ·  Source of truth = the code (Currency Rule §3.2b).

> ⚠ **BASELINE stale-source findings (the intake aspect docs predate DB-4 #16).** `docs/features/check-ins/`
> was authored when the module was "ZERO CODE" and still frames CK-2/CK-3 as "bugs to fix" and the types as
> non-existent. **The schema + `@vida/types` already realized every one of those INTENDED fixes.** Where the
> aspect docs and the code disagree, **the code wins** and is flagged below. These are the corrections the
> service plan must build on — not the stale "to-fix" framing.

## 1. Identity & responsibility
**What it is.** The check-ins module — structured daily reflection (morning · afternoon · evening) plus
periodic weekly/monthly/yearly reviews — over 3 owned tables `[FACT: packages/core/src/db/schema/check-ins.ts]`.
This build delivers the ① **backend service tier** (`@vida/core/services/checkins`) over that schema; the ②
frontend is a separate issue (`fe-check-ins`). `[FACT: docs/features/check-ins/identity.md]`

**The one job it owns.** Persist and validate check-in entries + their customizable templates/questions, and
derive the trend/streak analytics — all client-side-encrypted, local-first. `[FACT: identity.md]`

**What it is NOT.**
- Not the schema (authored at DB-4 #16, migration `026_check_ins`, v26). `[FACT: check-ins.ts:1-10]`
- Not the Journal — check-in responses *feed* the Journal day page via `entity_links`; they don't replace it. `[FACT: identity.md; business-rules CK-7]`
- Not the owner of goals/projects — reviews *read* Purpose/Projects/Tasks via integration points (cross-wave, INTENDED). `[INTENT G7]`
- Not the Gamification owner — it owns the streak (derived) and *emits* a `grant_currency(XP)` feeder; Gamification applies it. It never writes XP itself. `[INTENT G9; ADR-012 E2/E3/E9]`
- Not tagged — deliberate SP1-consistent opt-out from `entity_tags`; uses `entity_links` (SP4). `[INTENT G10; ADR-006]`

## 2. Contract — what it exposes / needs
**Status: ① BACKEND SERVICE COMPLETE — S1 ✅ · S2 ✅ · S3 ✅ · S4 ✅ · S5 ✅ (all 28 legs). ② fe-check-ins separate.**
**S5 (2026-09-19):** cross-module seams via OPTIONAL dormant deps (`journal?`/`effects?` — absent = no-op, keeps
unit construction valid): `getReviewData` (M1.1 degraded placeholder, never false-complete — full aggregation
cross-wave-deferred); Journal `entity_links` re-feed on create/update (CHE-16, link-don't-copy, best-effort,
IR-13 eventually-consistent); `grant_currency` emit on create (CHE-17, **guarded** by a registered handler —
emit-only, apply→M1.2 Gamification; NEVER writes XP/ledger/user_profile). CHE-29 (`/summary` provide) covered by
S2 reads. `[FACT: services/checkins/service.ts]` 27 tests; core 1039.
**S4 (2026-09-19):** `getMoodEnergyTrend(range)` (plaintext points, sorted, CK-1) + `computeCheckInStreak(asOf?)`
(pure `computeStreak(dates, asOf)`: distinct-date consecutive run; `longest_streak` all-time; `current_streak`
today-relative — 0 when broken; **NO `user_profile` write**, E9). asOf injected for determinism. `[FACT: services/checkins/service.ts]` 23 tests; core 1035.
**S3 (2026-09-19):** `getActiveTemplate` (default-first via `is_default`/`is_active` — built-in default is
type-agnostic per G5, no `check_in_type` column), `createTemplate`/`updateTemplate`/`deleteTemplate` (no-FK
app-cascade: null referencing entries + delete questions), `seedDefaultTemplates` (idempotent single canonical
default), `addQuestion` (UNIQUE field_key → `DuplicateFieldKeyError`; reduced-column row via `findById`),
`reorderQuestions`/`removeQuestion`/`getQuestions`, `setSchedule` (config only). Templates return parsed
`CheckInTemplate` (schedule_days JSON → number[], icon coalesced). `[FACT: services/checkins/service.ts]` 16
tests; core 1028. `services/checkins/`
now holds `{types,service,index}.ts` + `__tests__` — `createCheckInsService(deps)` (factory-object, no `this.`),
exported from `@vida/core`. **S2 (2026-09-19):** `createCheckIn` (slot pre-query → `DuplicateCheckInError`;
nullable-scalar backfill), `updateCheckIn` (content-only, slot immutable), `getCheckIn`, `listCheckIns`; CHE-20
required-question gate (read-only questions repo), CHE-21 `custom_data` discipline (`StandardFieldInCustomDataError`,
fail-loud), CHE-31 slot verify. JSON `text()` cols (de)serialized at the boundary (`toDailyCheckIn`/`serialize*`,
preferences precedent); returns the parsed `DailyCheckIn`. `[FACT: services/checkins/service.ts]` 9 live-store
tests; core suite 1021. The remaining designed surface (from contract.md) — mirroring `preferences`/`journals`/`notes`:

- **Entries:** `createCheckIn({date, type, template_id, …})` (enforces one per (date,type), CK-2) ·
  `updateCheckIn(id, patch)` (re-feeds Journal day page, CK-7) · `getCheckIn(date, type)` · `listCheckIns(range)` ·
  `getActiveTemplate(type)` → default if none customized (CK-4).
- **Templates:** `createTemplate` · `updateTemplate` · `addQuestion`/`reorderQuestions`/`removeQuestion`
  (UNIQUE(template_id, field_key), CK-5) · `setSchedule(templateId, {schedule_type, days, preferred_time})` (CK-8) ·
  `seedDefaultTemplates()` → one per type (CK-3/CK-4).
- **Trends & reviews:** `getMoodEnergyTrend(range)` (plaintext scales, CK-1) · ⚠ `getReviewData(type)` (aggregates
  Purpose/Project/Task progress, CK-6 — cross-wave INTENDED).

**Types (already exist — do NOT author net-new; reconcile the colocated file):** `CHECK_IN_TYPE` (6),
`CHECK_IN_SCHEDULE_TYPE` (3), `CHECK_IN_PREFERRED_TIME` (4), `CHECK_IN_QUESTION_FIELD_TYPE` (6); interfaces
`DailyCheckIn`, `CheckInTemplate`, `CheckInTemplateQuestion` `[FACT: packages/types/src/entities/user.ts:104-180]`.
Zod enum validators exist: `CheckInTypeSchema` et al. `[FACT: packages/core/src/validators/user.ts:19-22]`.
**✅ S1 DONE (2026-09-19):** entity object validators authored — `DailyCheckInFields`/`CreateCheckInSchema`/
`UpdateCheckInSchema`, `CheckInTemplateFields`/`CreateTemplateSchema`/`UpdateTemplateSchema`,
`CheckInTemplateQuestionFields`/`AddQuestionSchema`, `ScheduleConfigSchema` — domain-fields-only, mood/energy
1–10 bounds (CHE-19), `.partial()` patches. `[FACT: packages/core/src/validators/user.ts:107-193]` 17 tests
green (`validators/check-ins.test.ts`); core suite 1012 passed.
> ⚠ **CONTRADICTION:** contract.md:6-8 says "ZERO CODE — no `@vida/types` check-in file, no model/service." The
> types + validators DO exist (only the service is unbuilt). The aspect doc is stale; the code is the truth.

**Error cases (designed):** `DuplicateCheckInError` on (date,type) collision (CK-2) · duplicate `field_key`
typed error (CK-5) · scale answer outside min/max → typed validation error (CK-5) · `getReviewData` partial-read
→ returns partial + flag, never falsely complete (CK-6). `[FACT: contract.md:45-49]`

## 3. Structure & key data
Three owned tables `[FACT: check-ins.ts]`:

| Table | Shape | Key constraints (code-as-is) |
|---|---|---|
| `daily_check_ins` | `...baseColumns` + entry fields; 7 `[E]` (top_intentions, wins, gratitude, challenges, tomorrow_focus, reflection, custom_data) | `uq_daily_check_ins_slot` **UNIQUE(check_in_date, check_in_type)** ✅ (CK-2 realized) · `check_in_type` default `morning` · `mood_score`/`energy_level` plaintext INT (BETWEEN 1–10 in SQL migration) · `template_id` no-FK nullable · **NO deleted_at** (CK-10 hard-delete) |
| `check_in_templates` | `...baseColumns`; `name`/`description` `[E]` | `is_default`/`is_active` bool · `schedule_type`/`preferred_time` nullable enum · `schedule_days` JSON · **NO deleted_at** (is_active governs lifecycle) |
| `check_in_template_questions` | `id` + `...syncColumns` ONLY (no created_at/updated_at) | `template_id` no-FK notNull · `field_type` enum notNull · `label`/`placeholder` `[E]` · `uq_..._field` UNIQUE(template_id, field_key) · **NO deleted_at** |

- Mood/energy live **once** on `daily_check_ins` (plaintext — the trend source). `[FACT: check-ins.ts:52-53]`
- Default-template fields = the materialized `daily_check_ins` columns; extra user questions → `custom_data` `[E]` JSON keyed by `field_key` (no duplication, CK-4). `[FACT: business-rules CK-4]`
- Service pattern to follow: `validate → repository → encrypt-seam → return`, rides `foundation/` substrates, factory-object (no `this.` for intra-calls). `[FACT: services/checkins/CLAUDE.md; docs/core/architecture/data-flow.md]`

## 4. Dependencies
**Consumes:** `@vida/types` (colocated check-in types) · `@vida/core/validators` (Zod) · `db/repository` +
`db/schema/check-ins` · Notes/Pages + `entity_links` (Journal day-page link, CK-7) · Preferences + Notifications
(schedule → reminders, CK-8, INTENDED) · ⚠ Purpose/Projects/Tasks (review aggregation, cross-wave INTENDED, CK-6).
**Consumed by:** Journal `/summary` (today's check-in in the daily dashboard) · Gamification (streak + XP feeder
effect) · Purpose (`target_reviews` within a review). `[FACT: contract.md:24-43; structure-data.md:44-49]`
No direct cross-module table reads — integration points only (constitution §6). `[FACT: structure-data.md:49]`

## 5. Key states
Entry wizard (loading template · "no template — use default" · typed save error · completed+linked) · History/
calendar (skeleton · "no check-ins yet" · read error+retry · list) · Mood/energy trends ("not enough data" ·
degrade chart · charts) · Review (loading module progress · "no goals/projects" → free reflection · partial read
→ show available+flag · aggregated+saved) · Template builder (dup field_key → typed error · saved+ordered).
`[FACT: business-rules.md:60-68]`

## Completion checklist
- [x] §1 identity + explicit "is NOT" · [x] §2 contract with [FACT] cites (+ stale-doc contradiction flagged)
- [x] §3 structure · §4 deps · §5 states
- [x] inherits docs/core; contradicts no level above · load-bearing UNKNOWNs surfaced in current-business-rules §
