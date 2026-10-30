# Intake: Routines
<!-- /documentation Phase 1 (Intake). Harvest from 3 sources → gap map. No-Guessing: every claim cited. -->
Context: features/routines (Wave 2 — depends on Habits + Tasks [links]; feeds Journal /summary + Purpose + Gamification)
Sources: v2 (ADR-002 §5.6 + @vida/types/routine.ts + CLAUDE.md §5) · v1 (life-os src/features/routines + types/routines.ts + API.md) · user intent
Session: 2026-06-29 · documentation-blueprint

## A. WHAT EXISTS — v2 (current, authoritative)
**Data model — 2 tables** `[FACT: ADR-002 §5.6 L1705-1763; routine.ts]`:
- `routine_actions`: `title`[E], `description`[E], `action_type`{habit,task,focus}, `time_of_day`{morning,afternoon,evening}, `duration_minutes`, `is_active`, `sort_order`, **`linked_habit_id`** (SET NULL), **`linked_task_id`** (SET NULL), `recurrence_frequency`{daily,weekdays,weekends,custom}, `recurrence_days` JSON[0-6], **`skip_dates`** JSON (planned skips), soft-delete. `[FACT: L1708-1736]`
- `routine_completions`: `routine_action_id` (CASCADE), `completed_date` (**UNIQUE per action+date**), `completed_at`, `skipped`, `skip_reason`[E], `actual_duration_minutes`. `[FACT: L1744-1761]`

**Intent (CLAUDE.md §5)** `[FACT: CLAUDE.md §5]`: routines with recurrence + **to-do list view** for completion (separated by morning/afternoon/evening); **single standalone page for each routine** with analytics graphs/charts; **linked to habits or tasks** via `linked_habit_id`/`linked_task_id`; **skip tracking with reason capture**.

**Cross-cutting:** `purpose_routines` junction `[FACT: project.ts L243-246]`; `routine_action` is a valid `entity_links` note target `[FACT: ADR-002 L1344]`; action can link an existing Habit or Task as a step. `[FACT: L1719-1720]`

## B. WHAT v1 DID — life-os routines (legacy)
`[FACT: life-os src/features/routines + API.md]`
- **Full feature**: AllRoutines · RoutineDetail · Routines(home) · **RoutineAnalytics** pages. `[FACT: pages]`
- **Rich analytics**: StreakDisplay, CompletionTrend, CompletionCalendar, **Ranking**, **TimePeriodComparison**, CompletionHistory, SummaryCard. `[FACT: components]`
- **TimeOfDayTabs** (morning/afternoon/evening grouping), RoutineSection, RoutineGrid, ViewModeToggle. `[FACT: components]`
- **RecurrenceSelector**, **SkipReasonInput**, QuickAddInput, RoutineSidePanel, mobile variants. `[FACT: components]`

### Key notes (v2 vs intent)
1. v2 **encrypts** title/description/skip_reason `[E]`. `[FACT: §5.6 [E]]`
2. **No denormalized streak counters** on `routine_actions` (unlike Habits) — streaks derive from the completions ledger. `[FACT: §5.6 has none]`
3. **No parent "routine" grouping table** — only individual `routine_actions` bucketed by `time_of_day`; yet CLAUDE.md says "standalone page **for each routine**." Granularity ambiguity (see G2). `[FACT: §5.6 vs CLAUDE.md §5]`
4. **Two skip mechanisms:** `routine_actions.skip_dates` (planned skips) + `routine_completions.skipped`+`skip_reason` (logged skip). `[FACT: L1724, L1749-1750]`
5. A routine action can BE/LINK a Habit, Task, or Focus block (`action_type` + `linked_*_id`). `[FACT: L1712-1720]`

## C. GAP MAP — genuine unknowns (need Victor's intent; not answerable from sources)
G1 — **Scope / views**: full v1 (assumed). Views: **to-do list** (today's actions grouped by morning/afternoon/evening) · **per-routine standalone page** (streak/trend/calendar analytics) · all-routines · **analytics page** (ranking, time-period comparison). Confirm set.
G2 — ⚠ **ROUTINE GRANULARITY (headline)**: is a "routine" a **single `routine_action`**, or a **named GROUP/SEQUENCE** of ordered actions (e.g. a "Morning Routine" = wake → meditate → gym)? Schema has only individual actions bucketed by `time_of_day` — no group table. CLAUDE.md "standalone page per routine" + per-routine analytics implies a meaningful unit. If named sequences are wanted → ⚠ INTENDED `routines` table + `routine_action.routine_id` + ordering. Resolve.
G3 — ⚠ **Habit/Task linkage semantics (double-completion)**: when `action_type='habit'` + `linked_habit_id` set, does completing the routine action **also complete the linked habit** (one tap, both updated), or are they independent? Same for `linked_task_id`. Avoids double-tracking / defines the single source of truth.
G4 — **Completion + skip model**: confirm `skip_dates` = **pre-planned** skips (e.g. vacation, no streak penalty) and `routine_completions.skipped`+`skip_reason` = **logged** skip on the day. Does a skip **break the streak** or count as neutral (planned skips neutral, unplanned break)?
G5 — **Routine vs Habit boundary** (both recur + complete + have time_of_day + streaks): confirm the distinction — **Habits = standalone behavior** (build/break, quantified); **Routines = an ordered action-list cadence** (a sequence of steps that may *include* habits/tasks/focus). Why both exist.
G6 — **`focus` action type**: `action_type='focus'` = a focus/Pomodoro block inside the routine? Does it start a `pomodoro_sessions` timer / write a time log? Confirm.
G7 — **Streaks & analytics**: confirm streaks **derive from the completions ledger** (no denormalized counters), same rule as Habits (consecutive scheduled occurrences, no grace?). Bring back v1's **ranking** + **time-period comparison** analytics?
G8 — **Cross-module**: confirm `purpose_routines` (routines serve purposes), routine completions feed **Journal /summary** + **Gamification** streaks (⚠ INTENDED). Any contribution to the linked Habit's/Purpose's metrics?
G9 — **Notes via pages**: routine notes via `pages` (`routine_action` already a valid `entity_type`, L1344). Confirm — at the action level, or the routine-group level (ties to G2)?
G10 — **Tags**: `routine_actions` has **no tags column** today. Add the **shared scoped** tag system, or leave routines untagged (out of scope)? Confirm.

## Resolution
`[INTENT: Victor, 2026-06-30]` — **IN PROGRESS.** ⚠ **MAJOR REFRAME first** (resolves G2 + G5 + the action model);
G1, G3, G4, G6–G10 pending re-confirmation under the new framing.

### ⚠⚠ REFRAME — Routines = the recurring CROSS-MODULE ORCHESTRATION layer (Victor)
The harvested v1 was a **deliberately limited proof-of-concept** ("less powerful, less integrated, just to see it
work"). The real idealization: a routine lets the user **compose a recurring schedule that integrates steps from
across the WHOLE OS** — exercises, habits, **recurrent tasks**, **obligations**, **study periods**,
**project-focus time**, and "many others." Consequences:
- **G2 RESOLVED → named ordered SEQUENCE.** A routine is a **named, ordered, recurring sequence** (e.g. "Morning
  Routine", "Deep-Work Block") — not a loose time-of-day bucket. ⚠ **INTENDED `routines` table + `routine_step`
  (ordered) + `routine_step.routine_id`.**
- **ACTION MODEL RESOLVED → polymorphic steps.** A step references **any schedulable entity in any module**
  (habit · recurrent task · obligation · study_session · project-focus · exercise · …). The schema's narrow
  `action_type{habit,task,focus}` + `linked_habit_id`/`linked_task_id` was the POC — superseded by a
  **polymorphic step link** (step_type + entity ref). ⚠ INTENDED → ADR-002 amendment + **own design pass** (the
  step-type taxonomy), like the deliverables system.
- **G5 RESOLVED → boundary is clear.** Habits = a single tracked behavior (build/break, quantified); **Routines =
  the orchestrator** that sequences steps (which may *be* habits/tasks/study/focus) into a recurring block.
  Routines are the **active** counterpart to the **passive** global Calendar.
- **Forward dependency** (Routines → Habits ✅, Tasks ✅, Learning ⬜, Projects ✅): document the orchestration
  intent now; finalize each step-type's contract as its module is documented (same approach as Check-in reviews).
- ⚠ **"Exercises"** has no module today — model as a habit, a step-type, or a new concept? **OPEN (re-confirm).**

- **G3 RESOLVED → steps are INTERACTIVE surfaces with per-step completion MODES (not checkboxes).** `[INTENT: Victor 2026-06-30]`
  A routine is an **interactive daily cockpit**. Each step **renders its underlying entity's live info** (a linked
  task shows its sub-tasks/due/progress; an exercise shows its session plan; a focus block shows the timer) and lets
  the user **drill into a dedicated per-step MODE to actually do it in place** — check sub-tasks inline, enter an
  exercise-session mode, start a focus timer, run a study session. **Completing via that mode DRIVES the underlying
  entity** (the entity stays the single source of truth; the routine reflects it — no parallel record, no
  double-count). ⇒ **each step-type defines its own interactive completion mode** — this IS the polymorphic
  step-type taxonomy the design pass must specify (habit-mode · task-mode-with-subtasks · exercise-session-mode ·
  focus-timer-mode · study-session-mode · …). ⚠ INTENDED, needs design pass.

- **G_new RESOLVED → Exercises is a NEW future module (not yet planned in any artifact).** `[INTENT: Victor 2026-06-30]`
  ⚠ Verified: NO exercise/fitness/workout module exists in CLAUDE.md, ADR-002, `@vida/types`, or v1 life-os — it's
  a genuinely new module Victor intends but hasn't specified anywhere. Recorded as a **candidate new feature
  context** (future manifest row). Routines reference it via an `exercise` step-type (forward reference, finalized
  when that module is designed — same pattern as the Learning step-type).

## D. RECONCILIATION — resumed 2026-07-14 (compose the foundations documented since 06-30)

Routines was parked **2026-06-30**. Since then the foundations it forward-referenced were documented — which
**resolves the "own design pass" the reframe flagged** (the step-type/mode taxonomy) by COMPOSITION, not invention.
`[FACT: docs/features/sessions-and-scheduling/*, docs/features/health/*]`

- **Sessions & Scheduling (ADR-004) ✅ provides the step "modes."** A polymorphic **Session supertype + sub-type
  registry** (`study · class · focus · reading · practice · review · **workout** · work · …`) + `dueIn(range)`
  provider + `createSession(block)` + `generatePlan`/`planned_blocks`. `[FACT: sessions/contract.md §1 SessionRegistry,
  §"dueIn", identity.md L6-7]` → a routine step's **interactive "do-it-in-place" MODE = launch/drive the underlying
  entity's Session sub-type** (workout→workout session · focus→focus session · study→study session · reading/
  practice) **or the entity's native completion** (task drill-in/subtasks · habit tick). **No bespoke mode engine;
  no parallel record; single source of truth** (the entity) — exactly what G3's "modes DRIVE the underlying entity" asked.
- **Health ✅ = the "Exercises" module — G_new SUPERSEDED.** The 06-30 note "Exercises = a new future module" is
  obsolete: Health (documented 07-13/14) owns exercise+nutrition; a **workout is a `workout` Session sub-type** and
  Health already states *"the `exercise` step drives a Core-scheduled workout session."* `[FACT: health/core/contract.md
  L50; README L27-28]` → the routine `exercise` step-type = drive a Health workout Session.
- **Tasks types (this session) ✅.** The reframe's `recurrent task` + `obligation` step-types = a Tasks step of type
  `standard`/`duty`/`obligation` (Duties dissolution, [[intake/duties.md]]). No separate "obligation" step concept.
- **Providers/consumers ✅.** `dueIn()` is shared with the **Global Calendar**; **Journals** uses a provider registry
  (each module registers `summary(date)` + reuses `dueIn`) → Routines **registers as a provider** (routine occurrences
  → Journal agenda/summary + Calendar), same pattern as every documented module. `[FACT: journals docs; sessions/contract dueIn]`
- **Net effect:** Routines' remaining "own design pass" shrinks to (a) the `routines` + `routine_step` tables (named
  ordered sequence + ordering), (b) the **polymorphic step→entity link** (`step_type` + entity ref), (c) how a step
  **surfaces + drives** its entity (mostly: launch its Session sub-type; else native drill-in) — composition against
  documented contracts, not fresh invention.

**Still-open gaps under the reconciled framing** (confirm this pass): G1 (view set) · G4 (skip/streak) · G6 (focus
step = a `focus` Session) · G7 (sequence streak/analytics) · G8 (purpose_routines + provider registration) · G9
(notes: action vs routine-group level) · G10 (tags → Spaces universal tags) · **NEW:** sequence **partial-completion
/ "done" threshold** semantics; confirm the **compose-don't-invent** step model.

## E. RESOLUTION — resumed 2026-07-14 `[INTENT: Victor 2026-07-14]`
**Through-line: Routines is a deeply PERSONALIZABLE orchestration layer** — completion, miss/streak, acceptance
windows, session types, and step-scoping are all **user-configured policies** (ship defaults, fully editable). A
major instance of **Spaces** (personalization foundation) + the **autonomy-with-clarity** constitution principle.

**Q1 / STEP MODEL — RESOLVED: compose + user-extensible + actionable-step = recurrent Task.**
- **Compose ✓** (no bespoke mode engine): a step drives its underlying entity — a **Session sub-type** (workout/
  focus/study/reading/practice) or the entity's **native completion** (task drill-in · habit tick). Single source
  of truth; no double-count. `[INTENT Q1]`
- **User-extensible ✓:** the user can **create new session types** and **new segments** via personalization
  (Spaces) — "a very complete part of the OS." The Session sub-type registry (ADR-004) is user-extensible, not a
  fixed enum. `[INTENT Q1]`
- **Actionable step (no rich entity) = a recurrent TASK** (resolves the edge case): a step that is "just check it
  within a period/timeframe" **is a Task**, reusing the Tasks module's **recurrence-in-specific-timeframes** (e.g.
  every 3h). Behaves **alarm-like** — pinpoints the user to act within the time/timeframe, then waits for the check.
  Not checked within the timeframe → **not done**; **rescheduled within the day → the Scheduler moves it to an open,
  more-fitting time slot** (availability), then he completes it. `[INTENT Q1; composes Tasks recurrence + Scheduler]`
- **Step-scoping (shared repeatable actions):** the user establishes repeatable tasks scoped **to ALL routines · to
  a SPECIFIC routine · to a SUBSET of routines** — one repeatable action can belong to many routines. ⚠ INTENDED —
  modeling = task↔routine membership; **design-pass.** `[INTENT Q1]`

**Q2 / COMPLETION — RESOLVED: user-configurable "done" POLICY + always-record-partial.**
- **Broad scheduling** (not just daily): specific days · day + timeframe of the week · day + time of the month · day
  + time of the year. `[INTENT Q2; composes Scheduler recurrence]`
- **Always record what was done** — at the timeframe's end the routine computes **what was done vs not**; partial
  progress is **never discarded** and is surfaced **positively** ("important to be grateful and happy about what was
  done" → Journal / meaning-spine). `[INTENT Q2]`
- **The "done" rule is USER-DEFINED** (supersedes a single fixed threshold — threshold is just one option): the user
  picks his policy per his method — **all-or-nothing** ("wasted unless everything finished" → not computed as done) ·
  **required-node** ("this specific node not done → routine not done") · **threshold/partial**. Ships a default,
  fully personalizable. `[INTENT Q2]`

**Q3 / SKIP & MISS — RESOLVED: lifecycle + user-configurable miss policy + acceptance window.**
- **Routine lifecycle:** active · **paused** (temporarily) · **off** (turned off entirely). ⚠ INTENDED states.
  `[INTENT Q3]`
- **Miss-computation is user-personalized:** the user controls **how misses count** AND the **acceptance window** —
  how long a miss is still "accepted" / can be made good or rescheduled (one week · N days · …) before it counts as a
  real miss. `[INTENT Q3]`

**Q4 / STREAK RULE — DISSOLVED into user-config.** Not a fixed "same as Habits" rule — streak/miss semantics are part
of the user-configurable policy (Q2/Q3); the user may align it with Habits or diverge. ⇒ **Gamification must read a
POLICY-DERIVED streak from each routine, not assume the Habits rule.** `[INTENT: implied by Q2/Q3]`

**Confirmations folded (take-as-proposed unless flagged):** **G1** views = today/to-do (grouped by time-of-day, w/
the alarm/timeframe-check behavior from Q1) + per-routine standalone page (streak/trend/calendar) + all-routines +
analytics (ranking, time-period comparison) · **G6** focus step = a `focus` Session · **G7** analytics derive from
the completions ledger (no denormalized counters) · **G8** `purpose_routines` laddering + Journal `/summary` +
Gamification feeds; **Routines registers as a `dueIn`/`summary` provider** (Journals pattern) · **G9** notes via
`pages` at **both** routine-group and step level · **G10** tags = **Spaces universal tags**.

**⚠ INTENDED surface → ADR-002 amendment + design-pass** (consolidate): `routines` + `routine_step` tables (named
ordered sequence + ordering) · polymorphic `step_type` + entity ref · task↔routine membership (step-scoping) ·
lifecycle states (active/paused/off) · user-configurable **completion policy** + **miss policy** + **acceptance
window** · user-extensible session types/segments. Several ride **Spaces** (personalization) — added to its
requirements accumulator.

## Status (resumed)
- [x] intake **WHOLE** — Q1/Q2/Q3 resolved + confirmations folded; §E synthesis confirmed faithful (Victor
  2026-07-14). Step-scoping internals + personalization machinery = ⚠ INTENDED → ADR-002 amendment + Routines
  design-pass (non-blocking). → **Transform.**

## Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-06-29 | documentation-blueprint | intake harvested (v2 ADR-002 §5.6 2 tables + routine.ts + CLAUDE.md §5; v1 life-os routines full feature w/ analytics/ranking/streaks); gap map G1–G10. ⚠ Headline gaps: routine granularity (no group table), habit/task double-completion semantics, routine-vs-habit boundary. |
| 2026-07-14 | documentation-blueprint | RESOLUTION §E (Victor): Q1 compose + user-extensible session types + actionable-step=recurrent-Task (alarm-like, reschedule-to-open-slot) + step-scoping; Q2 user-configurable completion policy + always-record-partial; Q3 lifecycle (active/paused/off) + user-configurable miss policy + acceptance window; Q4 streak dissolved into user-config (Gamification reads policy-derived streak). Routines = major Spaces consumer. |
| 2026-06-30 | documentation-blueprint | ⚠⚠ REFRAME (Victor): Routines = cross-module ORCHESTRATION layer; G2 (named ordered sequence) + G3 (interactive per-step modes that DRIVE entities) + G5 (Habit↔Routine boundary) + action-model (polymorphic steps) resolved; G_new (Exercises = future module) recorded. Intake parked mostly-whole. |
| 2026-07-14 | documentation-blueprint | RECONCILIATION (§D) on resume: Session sub-type registry (ADR-004) + Health workout-session + Tasks duty/obligation types supply the step "modes" by COMPOSITION → design pass shrinks; G_new SUPERSEDED (Exercises = Health). Open gaps re-scoped (G1/G4/G6–G10 + sequence partial-completion). |
