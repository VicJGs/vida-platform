<!-- Identity — features/routines · /documentation Phase 2 · sources: ADR-002 §5.6 L1705-1763 · @vida/types/routine.ts · CLAUDE.md §5 · docs/intake/routines.md (§D reconciliation + §E resolution) -->

# Identity — Routines  (level: Feature)

**What it is.** The OS's **cross-module orchestration cockpit**: a **named, ordered, recurring sequence** of
**steps**, where each step *drives* a real entity somewhere else in the OS (a workout Session, a task, a habit, a
recurrent action). It is the **active** counterpart to the **passive** Global Calendar — the Calendar shows what's
due; a Routine is the place the user actually *runs* a block of life, step by step, on its cadence. `[FACT: CLAUDE.md
§5; ADR-002 §5.6]` `[INTENT: reframe Victor 2026-06-30; §E 2026-07-14]`

**The desire behind it.** The user wants to **compose a recurring schedule that integrates steps from across the
WHOLE OS** — exercises, habits, recurrent tasks, study periods, project-focus time, "and many others" — into a
single interactive sequence he can run and track. The v2 shipped a *deliberately limited proof-of-concept* ("less
powerful, less integrated, just to see it work"); the real idealization is a **deeply personalizable** layer where
the user defines *what* a routine contains, *how* completion is judged, *how* misses count, and can even extend the
kinds of steps it holds. And crucially: it must **always record and celebrate what was done** — partial progress is
never discarded, because "it is very important to be grateful and happy about what was done." `[INTENT: Victor
2026-06-30; §E Q1/Q2 2026-07-14]`

**Scope — the orchestration reframe (NOT the 2-table v2 POC).** `[INTENT §E]`
- A routine is a **named ordered sequence** of steps (⚠ INTENDED `routines` + `routine_step`), scheduled **broadly**
  — a specific day · day + timeframe of the week · day + time of the month · day + time of the year. `[INTENT Q2]`
- **Steps are polymorphic and COMPOSE, never duplicate.** A step's interactive "do-it-in-place" mode = **drive the
  underlying entity**: launch its **Session sub-type** (workout/focus/study/reading/practice — ADR-004) or use the
  entity's **native completion** (task drill-in · habit tick). The driven entity stays the single source of truth.
  `[INTENT Q1; FACT: sessions/contract.md SessionRegistry]`
- An **actionable step with no rich entity is a recurrent Task** — reusing the Tasks recurrence-in-a-timeframe
  feature; it behaves **alarm-like** (do it within the timeframe → check; miss → not done; reschedule → the
  Scheduler drops it into an open, fitting slot). `[INTENT Q1]`
- **Everything about judgment is user-configurable policy** (ships defaults, fully editable): the **completion
  policy** (all-or-nothing · required-node · threshold), the **miss policy + acceptance window**, and the routine
  **lifecycle** (active · paused · off). Streaks are **policy-derived**, not a fixed rule. `[INTENT Q2, Q3]`
- **Step-scoping:** a repeatable action can belong to **all routines · one routine · a subset** (shared
  membership). **User-extensible** step/session types + segments ride **Spaces**. `[INTENT Q1]`

**What it is NOT.** `[INTENT; FACT: CLAUDE.md modules; docs/features/*]`
- **Not a behavior tracker.** Single build/break behaviors with streaks are **Habits**; a Routine *sequences* steps
  (which may *be* habits). Habits' own identity already cedes "action-list cadence" to Routines. `[FACT:
  habits/identity.md L26]`
- **Not a deadline tool.** Deadline recurrence (obligations) is a **Tasks** type; a routine can *contain* such a
  task, it doesn't own the concept. `[FACT: intake/tasks.md ADDENDUM]`
- **Not a session engine.** Runtimes (timers, rest/energy capture) are **Sessions & Scheduling** (ADR-004); Routines
  *launches* sub-types, never re-implements them. `[FACT: sessions/identity.md]`
- **Not its own scheduler.** Cadence, availability, `dueIn`, reschedule-to-open-slot come from the **Scheduler**.
  `[FACT: sessions/contract.md]`
- **Not a duplicator.** A step never writes a parallel completion record — completing the step *is* completing the
  driven entity. `[INTENT Q1 — single source of truth]`
- **Not the Gamification engine.** Routine outcomes **feed** XP/achievements; Gamification consumes a
  **policy-derived** streak, Routines never writes XP. `[INTENT Q4]`
- **Not the Purpose-metrics owner.** A routine **contributes to** a linked purpose via `purpose_routines`; the
  metric is owned by **Purpose & Goals**. `[FACT: project.ts purpose_routines]`
- **Not a notes store.** Notes live in linked `pages` (`entity_type='routine_action'`), never inline. `[FACT:
  ADR-002 L1344]`

## Completion checklist
- [x] "what it is" + "desire" + "what it is NOT" filled · [x] each claim [FACT/INTENT/INTERP] · [x] no `{{…}}` remaining
