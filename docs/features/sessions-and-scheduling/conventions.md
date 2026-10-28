<!-- Conventions — features/sessions-and-scheduling · /documentation Phase 2 · sources: ADR-002 §5.11 + study_sessions · type moves knowledge.ts L222-250 · v1 studyPlanner.ts + entities.ts L1677-1711 · CLAUDE.md conventions · docs/intake/sessions-and-scheduling.md -->

# Conventions — Sessions & Scheduling (level: Foundation / OWN MODULE)

> This module is **INTENDED** (v2 = schema-only, 0 logic). These conventions govern how it gets built, and
> flag the FACT-base landmines so the build doesn't repeat v1/v2 mistakes.

## How to build here

- **Table-per-type is the pattern.** Every session sub-type = a row in the base `sessions` spine + a 1:1 row
  in a module-owned extension table (`session_id` FK). Read the spine for cross-type work (agenda, Journal,
  Calendar, analytics); join the extension only for that type's tooling. Never widen the spine with
  type-specific columns. `[INTENT S1]`
- **Register, don't hard-code.** A module adds a sub-type by calling `SessionRegistry.register()` with a full
  `SessionTypeDef` (4 dimensions + extension schema + tools). The core never names sub-types by hand — that's
  what makes new modules (Health, Skills) plug in without touching it. `[INTENT S1]`
- **Ship types fully configured.** An identified sub-type's attachment/effects/lifecycle/permissions are
  authored by us at registration. Do NOT expose the main types' setup to the user as required config; expose
  editing only behind a "not recommended" warning (SS-4). `[INTENT Victor S5]`
- **Aggregate, never mirror.** To show module work in the agenda, call its `dueIn()`; to schedule time for it,
  create a `planned_block` that **points** at the owner's item. Never copy the owner's schedule into a local
  table — that is the v1 staleness bug (SS-7). `[INTENT G2]`
- **Effects go through the Integration Contract, never direct writes.** A session that completes a habit calls
  the Habits write API via a declared effect (R2); it never touches `habit_completions` directly. Permission-check
  (`canTouch`) before every effect (§6 + SS-6). `[INTENT S3/R2]`
- **Every cross-module effect is idempotent (R1).** An effect carries a deterministic `effect_event_id`
  (`derive(subject_natural_key ‖ transition ‖ effect_type)`) and is deduped through the local `applied_effects`
  ledger — a replayed effect (sync re-delivery) NEVER double-counts. Do not invent a per-effect dedup scheme.
  `[INTENT R1 — ADR-004 §3.2.5]`
- **Emit signals, don't compute domain measures.** On completion, emit the measurement event; let
  Knowledge/Education compute mastery/pace. Never derive a domain number here (SS-10). `[INTENT G10]`
- **Analytics are read-time.** Compute from the session log; no synced aggregate tables (SS-12). `[INTENT G8]`

## Naming & layout

- Sub-types are `<x>_session` (singular concept, plural table): `class_session`, `reading_session`,
  `work_session`. The base is `sessions`; the discriminator is `sub_type`.
- Scheduling entities: `planned_block` (NOT "scheduled_session" — the rename marks the reshape from mirror to
  pointer), `study_availability`, `availability_exception`, `study_plan_batch`, `session_template`.
- Axes are `scheduling_mode` (attended|planned|ad-hoc) and `purpose` (facet); keep them distinct columns.
- Follows platform conventions: UUIDv7 TEXT PKs · Unix-ms INTEGER timestamps · `YYYY-MM-DD` dates · booleans
  as 0/1 · `-- [E]` field-level encryption · full `_sync_*` metadata on every syncable table · soft-delete
  `deleted_at`. `[FACT: CLAUDE.md Conventions]`

## Landmines / local "never do"

- **The v2 surface is a schema stub — never cite it as behaviour.** `study-planner.ts`, `pomodoro-service.ts`,
  `models/learning.ts` are **0 lines**. There is no engine yet; docs describe INTENDED. `[FACT: wc -l = 0]`
- **Planner types are in `knowledge.ts`, not `learning.ts`.** `ScheduledStudySession` + `SessionTemplate`
  moved there during the Knowledge extraction (L222-250). Don't look for them in learning.ts and conclude they
  don't exist. `[FACT]`
- **Don't re-merge plan + actual.** v1 stored the plan and its completion in ONE `ScheduledStudySession` row
  (scheduled_date + actual_duration/completed_at together — entities.ts L1677-1711). v2 over-corrected by
  splitting them with **no FK**. The rule is: two entities, LINKED by `planned_block_id` (SS-8) — neither
  merged nor orphaned. `[FACT]`
- **Don't scope the planner to a course.** v2 `study_plan_batches.course_id` reflects v1's Learning-only
  origin. This module plans across the whole OS; batch scope widens (G5 design-pass). `[FACT L2800]`
- **Pomodoro IS owned in this realm (⚠ reframed 2026-07-15).** It is the `focus`-sub-type runtime keyed by
  `session_id` — no longer a Notes entity. This module owns its templates + runtime; the Notes `/pomodoro`
  block is a widget-lens only (SS-11, reversed). `[[../pomodoro/conventions]]` `[FACT superseded: entity_type L1435]`
- **Don't let a user-created type inherit shipped-type powers.** Its permission envelope is a strict subset
  (SS-6); no XP/finance/health effects without explicit opt-in. `[INTENT S3-dim4]`
- **Views are deferred.** The view family (Hub/wizard/Management/Availability/per-type tools) is a dedicated
  post-completion pass (G9); do not fabricate view behaviour in these docs. `[INTENT Victor 2026-07-12]`

## Completion checklist

- [x] patterns in use (INTENDED, marked) · [x] naming & layout · [x] landmines (v1/v2 traps) · [x] [FACT]/[INTENT] on each claim
