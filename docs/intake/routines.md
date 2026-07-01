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

## Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-06-29 | documentation-blueprint | intake harvested (v2 ADR-002 §5.6 2 tables + routine.ts + CLAUDE.md §5; v1 life-os routines full feature w/ analytics/ranking/streaks); gap map G1–G10. ⚠ Headline gaps: routine granularity (no group table), habit/task double-completion semantics, routine-vs-habit boundary. |
