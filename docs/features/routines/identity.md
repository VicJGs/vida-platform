<!-- Identity — features/routines · /documentation Phase 2 · sources: ADR-002 §5.6 L1705-1763 · @vida/types/routine.ts · CLAUDE.md §5 · docs/intake/routines.md (§D reconciliation + §E resolution) -->

> ⚠ **Superseded in part (2026-10-21).** The As-is/naming layer predates the shipped reframe (migration 018) and D1–D2 — see
> [`delivery/documentation-gate.md` §A](delivery/documentation-gate.md) for the governing FACT per stale claim. Full rewording lands in the §XXIX pass at unit close.

# Identity — Routines (level: Feature)

**What it is.** The OS's **cross-module orchestration cockpit**: a **named, ordered, recurring sequence** of
**steps**, where each step _drives_ a real entity somewhere else in the OS (a workout Session, a task, a habit, a
recurrent action). It is the **active** counterpart to the **passive** Global Calendar — the Calendar shows what's
due; a Routine is the place the user actually _runs_ a block of life, step by step, on its cadence. `[FACT: CLAUDE.md
§5; ADR-002 §5.6]` `[INTENT: reframe Victor 2026-06-30; §E 2026-07-14]`

**The desire behind it.** The user wants to **compose a recurring schedule that integrates steps from across the
WHOLE OS** — exercises, habits, recurrent tasks, study periods, project-focus time, "and many others" — into a
single interactive sequence he can run and track. The v2 shipped a _deliberately limited proof-of-concept_ ("less
powerful, less integrated, just to see it work"); the real idealization is a **deeply personalizable** layer where
the user defines _what_ a routine contains, _how_ completion is judged, _how_ misses count, and can even extend the
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
  **lifecycle** (active · paused · off). Streaks are **policy-derived**, not a fixed rule. As a **pursuable**
  (ADR-011), the routine carries a **`measurement_kind`** (natural `rate` — completion frequency over cadence) and a
  **`binding_mode`** (`derived-pull` — done/streak is computed-on-read from the completions ledger, not a stored
  counter). `[INTENT Q2, Q3; ADR-011 M1/M2]`
- **Step-scoping:** a repeatable action can belong to **all routines · one routine · a subset** (shared
  membership). **User-extensible** step/session types + segments ride **Spaces**. `[INTENT Q1]`

**What it is NOT.** `[INTENT; FACT: CLAUDE.md modules; docs/features/*]`

- **Not a behavior tracker.** Single build/break behaviors with streaks are **Habits**; a Routine _sequences_ steps
  (which may _be_ habits). Habits' own identity already cedes "action-list cadence" to Routines. `[FACT:
habits/identity.md L26]`
- **Not a deadline tool.** Deadline recurrence (obligations) is a **Tasks** type; a routine can _contain_ such a
  task, it doesn't own the concept. `[FACT: intake/tasks.md ADDENDUM]`
- **Not a session engine.** Runtimes (timers, rest/energy capture) are **Sessions & Scheduling** (ADR-004); Routines
  _launches_ sub-types, never re-implements them. `[FACT: sessions/identity.md]`
- **Not its own scheduler.** Cadence, availability, `dueIn`, reschedule-to-open-slot come from the **Scheduler**.
  `[FACT: sessions/contract.md]`
- **Not a duplicator.** A step never writes a parallel completion record — completing the step _is_ completing the
  driven entity. `[INTENT Q1 — single source of truth]`
- **Not the Gamification engine.** Routine outcomes **feed** the economy: a routine-completion event fires the
  **`grant_currency(XP)`** feeder effect (ADR-012 E2) that **Gamification applies**, writing to
  **`consequence_ledger`** (E3). Gamification consumes a **policy-derived** streak (a `derived-pull` measure it
  READS, RT-7) — **Routines never writes XP itself** (E1/E2 layering). `[INTENT Q4; ADR-012 E2/E3]`
- **Not the Purpose-metrics owner.** A routine **contributes to** a linked purpose via the polymorphic weighted
  **`contributions`** primitive (ADR-011 M7 — retires the forward `purpose_routines` junction); the metric is owned
  by **Purpose & Goals**. `[FACT: project.ts purpose_routines (As-is); INTENT: ADR-011 M7 → contributions]`
- **Not a notes store.** Notes live in linked `pages` (`entity_type='routine_action'`), never inline. `[FACT:
ADR-002 L1344]`

## Completion checklist

- [x] "what it is" + "desire" + "what it is NOT" filled · [x] each claim [FACT/INTENT/INTERP] · [x] no `{{…}}` remaining
