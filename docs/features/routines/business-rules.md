<!-- Business Rules — features/routines · /documentation Phase 2 · sources: ADR-002 §5.6 · routine.ts · docs/intake/routines.md §D/§E -->

# Business Rules — Routines  (level: Feature)

> Inherits the CORE constitution `[[../../core/business-rules]]` — ZK-1/2/3, LF-1/2/3, SU-1, INT-1. Every rule
> below complies. **Altitude note:** the v2 surface is 2 tables of individual `routine_actions`; the sequence /
> policy / provider model below is the intended reframe — live-vs-INTENDED is flagged per rule and consolidated in
> the ⚠ Flagged delta section.

## Invariants (what is ALWAYS / NEVER true)

- **RT-1 — Encrypted content.** `routine_actions.title`/`description` and `routine_completions.skip_reason` are
  `[E]` (client-side, ZK-1); `action_type`, `time_of_day`, `recurrence_*`, `is_active`, `sort_order`, dates are
  plaintext config. `[FACT: ADR-002 §5.6 [E]]`
- **RT-2 — A routine is a named, ordered SEQUENCE.** Not a loose time-of-day bucket: a routine owns an ordered list
  of steps (⚠ INTENDED `routines` + `routine_step.routine_id` + ordering). The v2 flat `routine_actions` bucketed by
  `time_of_day` was the POC. `[INTENT G2; FACT: §5.6 has no group table]`
- **RT-3 — Steps COMPOSE; completing a step DRIVES its entity (single source of truth).** A step references a
  schedulable entity via `step_type` + entity ref. Its interactive completion **drives that entity** — launch its
  **Session sub-type** (workout/focus/study/reading/practice, ADR-004) or the entity's native completion (task
  drill-in · habit tick). The routine **reflects** the entity; it **never writes a parallel completion record** and
  never double-counts. `[INTENT Q1, G3]`
- **RT-4 — An actionable step with no rich entity is a recurrent Task.** A "just check it within a timeframe" step
  is modeled as a **Task** using Tasks' recurrence-in-a-timeframe (e.g. every 3h). Alarm-like: not checked within
  the timeframe → **not done**; **rescheduled within the day → the Scheduler places it in an open, fitting slot**,
  then completed. `[INTENT Q1; composes intake/tasks.md + Scheduler]`
- **RT-5 — Completion is a USER-CONFIGURABLE policy; partial is ALWAYS recorded.** At the timeframe's end the
  routine computes **what was done vs not**, and that partial record is **never discarded** and is surfaced
  **positively** (→ Journal / meaning-spine). Whether the routine counts as *done* is the **user's policy**:
  **all-or-nothing** · **required-node** (a specific step must be done) · **threshold/partial**. Ships a default;
  fully editable. `[INTENT Q2]`
- **RT-6 — Miss policy + acceptance window are user-configurable; routine has a lifecycle.** The user controls **how
  misses count** and the **acceptance window** — how long a miss stays make-good-able / reschedulable (one week · N
  days · …) before it is a real miss. Routine **lifecycle = active · paused · off**; paused/off routines generate no
  misses. `[INTENT Q3]`
- **RT-7 — Streaks are POLICY-DERIVED, not a fixed rule.** A routine streak is computed from the routine's own
  completion + miss policy (RT-5/RT-6) — the user may align it with the Habits rule (consecutive scheduled, no
  grace) or diverge. **Gamification must read the policy-derived streak; it may NOT assume the Habits rule.**
  `[INTENT Q4]`
- **RT-8 — Two skip mechanisms, distinct meanings.** `routine_actions.skip_dates` = **pre-planned** skips (declared
  in advance); `routine_completions.skipped` + `skip_reason` = a **logged** skip on the day. Their effect on the
  streak follows the miss policy (RT-6): a planned skip is neutral by default; an unplanned no-show counts per
  policy. `[FACT: ADR-002 L1724, L1749-1750; INTENT Q3]`
- **RT-9 — Habit↔Routine boundary.** A **Habit** is one tracked behavior (build/break, quantified); a **Routine** is
  the orchestrator that sequences steps (which may *be* habits/tasks/sessions). They are never merged; a habit-step
  drives the Habit, it does not re-define it. `[INTENT G5]`
- **RT-10 — Step-scoping (shared repeatable actions).** A repeatable action may be scoped to **all routines · one
  routine · a subset** — one action, many routine memberships (⚠ INTENDED task↔routine membership; internals =
  design-pass). `[INTENT Q1]`
- **RT-11 — Broad scheduling via the Scheduler.** A routine's cadence spans day · day+timeframe-of-week ·
  day+time-of-month · day+time-of-year, resolved through **Sessions & Scheduling** (availability + `dueIn`),
  not a bespoke Routines scheduler. `[INTENT Q2; FACT: sessions/contract.md]`
- **RT-12 — Purpose contribution (⚠ INTENDED).** A routine linked via `purpose_routines` **contributes to** that
  purpose's progress/metric; the metric is owned by **Purpose & Goals** (the mapping is a contract Purpose defines).
  `[INTENT G8; FACT: project.ts purpose_routines]`
- **RT-13 — Provider registration (⚠ INTENDED).** Routines **registers as a provider**: it exposes scheduled
  occurrences via **`dueIn()`** (→ Global Calendar + Journal agenda) and a **`summary(date)`** (→ Journal daily
  dashboard), and emits completion events (→ Gamification). Aggregator pattern — no mirroring. `[INTENT G8; FACT:
  journals docs provider registry; sessions dueIn]`
- **RT-14 — Analytics derive from the completions ledger (no denormalized counters).** Streaks, completion rate,
  ranking, and time-period comparison recompute deterministically from `routine_completions` — unlike Habits,
  Routines keeps **no cached streak columns**. `[FACT: ADR-002 §5.6 has none; INTENT G7]`
- **RT-15 — Notes via `pages`, at routine and step level.** Notes attach through a linked `pages` row
  (`entity_type='routine_action'` reserved; routine-group level = ⚠ INTENDED extension), never inline. `[FACT:
  ADR-002 L1344; INTENT G9]`
- **RT-16 — Tags via Spaces universal tags (⚠ INTENDED).** `routine_actions` has no tags column today; the direction
  is the **shared/universal** tag system owned by **Spaces**, not a bespoke Routines tag store. `[INTENT G10; FACT:
  §5.6 no tags col; intake/spaces.md SP2]`
- **RT-17 — Cascade + soft delete.** `routine_completions` cascade-delete with their action (`ON DELETE CASCADE`);
  deleting a routine deletes its steps (⚠ INTENDED). Soft delete (`deleted_at`) hides while preserving the ledger.
  `[FACT: ADR-002 §5.6 CASCADE; soft-delete convention]`
- **RT-18 — Local-first.** Every create/edit/complete/skip/reschedule succeeds locally first; multi-device
  reconciles LWW on structured columns; the completion ledger merges by (`routine_action_id`, `completed_date`).
  `[FACT: LF-2; ADR-003; §5.6 UNIQUE per action+date]`

## Validation & edge cases
- Enum CHECKs (v2): `action_type`∈{habit,task,focus} (⚠ superseded by the polymorphic `step_type` taxonomy),
  `time_of_day`∈{morning,afternoon,evening}, `recurrence_frequency`∈{daily,weekdays,weekends,custom};
  `recurrence_days` JSON[0-6]. `[FACT: ADR-002 §5.6]`
- `custom` recurrence requires `recurrence_days`, else the step has no schedule and never appears in the today
  list. `[INTERP; FACT: recurrence_days JSON]`
- A step whose driven entity is deleted/unavailable → the step surfaces a typed "entity unavailable" state, never a
  silent skip (RT-3 fail-loud). `[INTERP RT-3]`
- Completing a step out of order is allowed (the sequence is a suggested order, not a hard gate) **unless** the user's
  policy marks a step as a prerequisite. `[INTERP RT-5]`
- Editing/deleting a past completion **re-derives** all analytics from the ledger (RT-14) — never adjusts a cache.
  `[INTENT G7]`

## Terminal states (enumerated before build)
| Capability | loading | empty | error | success |
|---|---|---|---|---|
| Today's routine to-do (by time_of_day) | skeleton | "nothing scheduled" | typed read error, retry | steps grouped, each showing its entity's live state |
| Run a step (drive entity) | entity/session loading | — | driven-entity error → typed state, step stays open | entity advanced/completed; step reflects it |
| Actionable step (alarm) | — | — | missed the timeframe → **not done**; reschedule fails → typed toast | checked in timeframe → done, or moved to an open slot |
| Compute routine completion | computing from ledger | "not started" | ledger read error → show partial + flag | policy-evaluated done/partial %, "what was done" recorded |
| Skip / reschedule step | — | — | outside acceptance window → typed toast, no change | planned/logged skip recorded; streak per policy |
| Per-routine standalone page | skeleton | "no data yet" | typed error, retry | streak/trend/calendar + ranking/time-comparison |
| Provider (dueIn / summary) | — | no occurrences in range | provider error → flagged, other providers unaffected | occurrences surfaced on Calendar + Journal |

## Failure behavior (fail loud — constitution §5)
- A driven-entity failure (RT-3) surfaces a **typed error on the step**; the step is **never silently marked done**
  and never writes a parallel record. `[INTENT Q1; FACT §5]`
- A miss/skip outside the acceptance window is **rejected with a typed error** (RT-6), not silently absorbed.
  `[INTENT Q3]`
- If the purpose contribution (RT-12) or a provider emit (RT-13) fails, the routine/step **still succeeds** and the
  contribution/emit is **flagged**, never silently dropped. `[INTENT G8]`
- Partial completion is **always persisted** even on interruption — never discarded (RT-5). `[INTENT Q2]`

## ⚠ Flagged delta (spec must not outrun code — constitution §8)
INTENDED, not in ADR-002 §5.6 / `routine.ts` today (→ consolidate into the ADR-002 amendment + a **Routines
design-pass**): **RT-2** `routines` + `routine_step` (named ordered sequence); **RT-3** polymorphic `step_type` +
entity ref (supersedes `action_type`{habit,task,focus} + `linked_habit_id`/`linked_task_id`); **RT-5/RT-6**
user-configurable completion policy + miss policy + acceptance window (settings home = **Preferences**/**Spaces**);
**RT-6** lifecycle states (active/paused/off); **RT-10** task↔routine membership (step-scoping); **RT-12** purpose
contribution mapping (depends on Purpose contract); **RT-13** provider registration (`dueIn` + `summary`); **RT-15**
routine-group-level notes; **RT-16** Spaces universal tags. Live invariants today: RT-1, RT-8, RT-9, RT-14 (derive),
RT-17, RT-18. `[FACT: ADR-002 §5.6; INTENT §E]`

## Completion checklist
- [x] invariants with [FACT/INTENT/INTERP] · [x] all terminal states enumerated · [x] failure is loud · [x] inherits constitution · [x] spec/code drift flagged
