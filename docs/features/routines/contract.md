<!-- Contract — features/routines · /documentation Phase 2 · sources: ADR-002 §5.6 · routine.ts · sessions/contract.md · docs/intake/routines.md §D/§E -->

# Contract — Routines  (level: Feature)

> ⚠ The surface below is **INTENDED** (the reframe); the v2 code is schema-only (2 tables, 0 service logic). Every
> interface composes documented contracts — Routines is an **orchestrator/aggregator**, it re-implements nothing.

## Exposed surface — `RoutineService`
- **`createRoutine(def) / updateRoutine / archiveRoutine`** — a routine = `{ name, schedule (broad recurrence),
  ordered steps[], completion_policy, miss_policy, acceptance_window, lifecycle }`. `[INTENT RT-2, RT-5, RT-6]`
- **`addStep(routine, step) / reorderSteps / removeStep`** — a step = `{ step_type, entity_ref, scope, order,
  required? }`; `scope ∈ { all-routines · this-routine · subset }` (RT-10). `[INTENT RT-3, RT-10]`
- **`runStep(step): drives the entity`** — resolves the step's entity and **launches its Session sub-type**
  (`SessionRegistry.createSession`) or the entity's native completion; returns the entity's live state. Never writes
  a parallel completion. `[INTENT RT-3; FACT: sessions/contract.md createSession]`
- **`completeStep / skipStep(step, {planned|logged, reason?}) / rescheduleStep(step)`** — reschedule asks the
  **Scheduler** for an open, fitting slot in the day. `[INTENT RT-4, RT-8; FACT: Scheduler availability]`
- **`evaluateRoutine(routine, date): { done|partial, percent, done[], not_done[] }`** — applies the
  **completion_policy**; always returns the "what was done" record (RT-5). The routine's measure is a pursuable
  (`measurement_kind`=`rate` × `binding_mode`=`derived-pull`); `progress()` **derives on read** from the completions
  ledger, no stored counter (ADR-011 M1/M2/M3). `[INTENT RT-5; ADR-011 M1/M2/M3]`
- **`setLifecycle(routine, active|paused|off)`**. `[INTENT RT-6]`
- **Provider registration** — `dueIn(range): DueItem[]` (scheduled occurrences → Global Calendar + Journal agenda)
  and `summary(date)` (→ Journal daily dashboard); **emits completion events → Gamification applies the
  `grant_currency(XP)` feeder effect (ADR-012 E2) → `consequence_ledger` (E3); Routines never writes XP itself.**
  `[INTENT RT-13; ADR-012 E2/E3; FACT: journals provider registry; sessions dueIn]`

## What it consumes (documented integration points — no direct table access, constitution §6)
- **Sessions & Scheduling (ADR-004)** — `SessionRegistry.register/createSession` for step runtimes; the Scheduler's
  `dueIn` / availability / reschedule / `planned_blocks`. **Routines does not own a scheduler or a session engine.**
  `[FACT: sessions/contract.md §1, §"dueIn"]`
- **Tasks** — `task`/`duty`/`obligation`-type steps + **recurrence-in-a-timeframe** (RT-4). `[FACT: intake/tasks.md
  ADDENDUM]`
- **Habits** — habit-type steps drive `habit_completions` via the Habits contract (RT-3). `[FACT: habits/contract.md]`
- **Health** — the `exercise` step drives a `workout` Session (Health composes Sessions). `[FACT: health/core/contract.md L50]`
- **Knowledge / Education** — study/practice steps drive study/review Sessions. `[FACT: sessions/identity.md]`
- **Journals** — registers `summary(date)` + reuses `dueIn` (provider registry). `[FACT: journals docs]`
- **Purpose & Goals** — contributes progress via the polymorphic weighted **`contributions`** primitive (ADR-011 M7,
  retires the As-is `purpose_routines`; laddering weight `contribution_percentage`, M4-up); mapping owned by Purpose.
  `[FACT: project.ts purpose_routines (As-is); ADR-011 M4/M7]`
- **Gamification** — READS the **policy-derived** streak (a `derived-pull` measure, ADR-011 M2) and consumes
  completion events, applying `grant_currency(XP)` → `consequence_ledger` (E2/E3) (RT-7). `[INTENT RT-7; ADR-011 M2;
  ADR-012 E2/E3]`
- **Spaces** — universal tags via **`entity_tags`** (RT-16, ADR-006 SP1); saved views, user-extensible step/session
  types + templates (Spaces-owned; 007/SP5 cited-as-consumed, not re-spec'd here). `[FACT: intake/spaces.md SP2/SP3/SP5;
  ADR-006 SP1]`
- **Preferences** — home of the user's completion/miss/acceptance-window policy settings. `[INTENT RT-5, RT-6]`
- **Notes & Pages** — notes via `pages` (`entity_type='routine_action'`) + `entity_links`. `[FACT: ADR-002 L1344; INT-1]`

## Contract error cases (typed)
- `EntityUnavailable` — a step's driven entity is missing/deleted → typed step state, never silent skip (RT-3).
- `OutsideAcceptanceWindow` — a make-good/reschedule past the window → rejected, no state change (RT-6).
- `PolicyUndefined` — evaluate called before a completion policy resolves → falls back to the shipped default, flagged.
- `ProviderEmitFailed` — `dueIn`/`summary` failure is isolated; other providers + the routine itself are unaffected (RT-13).

## Completion checklist
- [x] exposed surface + consumed · [x] typed errors · [x] integration via documented points (no direct table access) · [x] [FACT/INTENT] on each claim
