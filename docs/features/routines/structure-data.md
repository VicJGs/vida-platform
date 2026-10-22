<!-- Structure & Data — features/routines · /documentation Phase 2 · sources: ADR-002 §5.6 L1705-1763 · routine.ts · docs/intake/routines.md §D/§E -->

> ⚠ **Superseded in part (2026-10-21).** The As-is/naming layer predates the shipped reframe (migration 018) and D1–D2 — see
> [`delivery/documentation-gate.md` §A](delivery/documentation-gate.md) for the governing FACT per stale claim. Full rewording lands in the §XXIX pass at unit close.

# Structure & Data — Routines  (level: Feature)

## Data model

### As-is (v2 — FACT, the floor) `[FACT: ADR-002 §5.6 L1705-1763; routine.ts]`
- **`routine_actions`** — `title[E]`, `description[E]`, `action_type`{habit,task,focus}, `time_of_day`{morning,
  afternoon,evening}, `duration_minutes`, `is_active`, `sort_order`, **`linked_habit_id`** (SET NULL),
  **`linked_task_id`** (SET NULL), `recurrence_frequency`{daily,weekdays,weekends,custom}, `recurrence_days`
  JSON[0-6], **`skip_dates`** JSON, soft-delete + `_sync_*`.
- **`routine_completions`** — `routine_action_id` (CASCADE), `completed_date` (**UNIQUE per action+date**),
  `completed_at`, `skipped`, `skip_reason[E]`, `actual_duration_minutes`.
- **Cross-cutting (exists):** `purpose_routines` junction `[FACT: project.ts L243-246]` — **As-is floor; retired in
  `[INTENT]` → the polymorphic weighted `contributions` primitive (ADR-011 M7, Purpose-owned)**; `routine_action` is a
  valid `entity_links` / `pages` target `[FACT: ADR-002 L1344]`. **No inline tags column exists** (As-is) — tags
  go-forward via `entity_tags` (SP1, below).

**The v2 model is a proof-of-concept:** flat individual actions bucketed by `time_of_day`, with a closed
`action_type` + two hard FKs — **no group/sequence table, no policy, no provider.**

### Intended (the reframe — ⚠ INTENDED → ADR-002 amendment + Routines design-pass) `[INTENT §E]`
- **`routines`** (NEW) — the named ordered sequence: `name[E]`, broad `schedule` (day / week+timeframe /
  month / year), `lifecycle`{active,paused,off}, `completion_policy`{all-or-nothing,required-node,threshold} +
  params, `miss_policy` + `acceptance_window`, `sort_order`, soft-delete. **As a pursuable (ADR-011):
  `measurement_kind`{quantitative,milestone,rate,qualitative} (natural `rate`) × `binding_mode`{manual,derived-pull,
  event-trigger} (`derived-pull`); any stored `progress` is a nullable override slot (`NULL ⇒ derive` — M3), never a
  `NOT NULL DEFAULT 0` counter.** `[INTENT RT-2, RT-5, RT-6; ADR-011 M1/M2/M3]`
- **`routine_step`** (NEW, replaces flat `routine_actions`) — `routine_id` (CASCADE), `order`, **`step_type`**
  (polymorphic: habit · task(standard/duty/obligation) · session-subtype(workout/focus/study/reading/practice) ·
  … user-extensible), **`entity_ref`** (the driven entity), `required?`, `time_of_day`/timeframe, `skip_dates`.
  Supersedes `action_type` + `linked_habit_id`/`linked_task_id`. `[INTENT RT-3]`
- **`routine_step_membership`** (NEW) — a repeatable step scoped to all/one/subset of routines (step-scoping,
  RT-10). Internals = design-pass. `[INTENT RT-10]`
- **`routine_completions`** — retained as the per-step/-date ledger (analytics derive from it, RT-14); routine-level
  completion is **computed** by policy, not stored.

## Dependencies / graph (within the coupling budget — constitution §6)
- **Depends on (consumes):** Sessions & Scheduling (ADR-004: registry + scheduler + `dueIn`) · Tasks (task/duty/
  obligation steps + recurrence) · Habits · Health (workout) · Knowledge/Education (study) · Journals (provider
  registry) · Purpose (`contributions` — retires the As-is `purpose_routines`, M7) · Spaces (tags/views/types/templates) · Preferences (policy settings) ·
  Notes & Pages (`pages`/`entity_links`). All via documented contracts — **no direct table access.**
- **Depended on by:** Journals (agenda/summary) · Global Calendar (`dueIn`) · Gamification (policy-derived streak) ·
  Purpose (contribution). `[FACT: journals docs; health README consumes Routines]`
- **No cycle:** Routines sits ABOVE the foundations it composes (Tasks/Habits/Sessions) and BELOW the
  read-everything contexts (Journals/Purpose/Gamification) — consistent with the fill order.

## ADRs / structural decisions
- **ADR-004 (Session Framework)** — the sub-type registry + scheduler Routines' steps compose (the step "modes").
  `[FACT: docs/core/decisions/ADR-004]`
- **ADR-011 (Measurability) / ADR-012 (Economy) / ADR-006 (Spaces & Tags)** — the routine is a **pursuable**
  (`measurement_kind`/`binding_mode`/derived `progress()` — M1/M2/M3; contribution via `contributions` — M4-up/M7);
  a routine-completion is a **`grant_currency(XP)`** economy feeder → `consequence_ledger` (E2/E3); tags via
  **`entity_tags`** (SP1). Cited contracts only — Purpose / Gamification / Spaces own the substrates (DDL deferred).
  `[INTENT: ADR-011/012/006]`
- **ADR-002 amendment (consolidated, build-phase)** — `routines` + `routine_step` + membership + policy/lifecycle
  columns; retire the closed `action_type` + hard FKs for the polymorphic `step_type`+`entity_ref`. Joins the
  standing amendment. `[INTENT §E]`
- **Routines design-pass** — the `step_type` taxonomy internals + step-scoping membership + the policy engine
  (completion/miss/acceptance-window). `[INTENT §E]`

## Single source of truth (constitution §3)
- **Completion of a step lives on the DRIVEN ENTITY**, never a parallel routine record (RT-3). The routine reflects.
- **Routine-level "done" is DERIVED** (policy over the ledger via `progress()` on-read — ADR-011 M3), never a
  stored/denormalized flag (RT-5, RT-14).
- **Policies** (completion/miss/acceptance-window) live once, as **Preferences/Spaces** settings — not duplicated per routine table.
- **Tags** = the **Spaces** universal tag vocabulary (RT-16), not a Routines-local tag store.
- **Scheduling/recurrence** = the **Scheduler**, not a Routines-local scheduler (RT-11).

## Completion checklist
- [x] data model (as-is FACT vs INTENDED) · [x] dep graph within budget (no cycle) · [x] ADRs · [x] single source per cross-cutting concern · [x] [FACT/INTENT]
