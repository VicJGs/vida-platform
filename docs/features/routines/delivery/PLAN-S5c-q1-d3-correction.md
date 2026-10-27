<!-- Forward spec — Routines ① S5c (correction slice) · Per-Step Build Gate (§XXVI) · authored before implementation -->
<!-- Corrects a shipped drift (Victor, 2026-10-22): the entity-less "actionable" step contradicts intake Q1 / RT-4 / Duties D3. -->

# PLAN S5c — Correction: every step drives an entity; occurrences are Sessions (Q1 · RT-4 · Duties D3)

> A correction slice inserted before S6. It reverses the Documentation-Gate **A11** drift and the S3/R5 "only focus is drivable" drift, both
> shipped in S2c–S5. It runs the full §XXVI gate.

## Why (the drift, cited)
- **A11 (Documentation Gate) said "RT-4 superseded by the shipped DDL"** because `db/schema/routines.ts` comments "an actionable step may have none".
  The intake RESOLVED the opposite: "**Actionable step (no rich entity) = a recurrent TASK** (resolves the edge case) … reusing the Tasks module's
  recurrence … rescheduled within the day → the Scheduler moves it" (`docs/intake/routines.md:126-130`, Q1, Victor 2026-07-14; RT-4). A schema comment
  never overrides a resolved intake gap. The entity-less "actionable" target propagated into S2c (A11 test), S3 (`resolveTarget` 'actionable'), S4
  (ledger-only judgment) and S5.
- **Duties D3** (`docs/intake/duties.md:180-181`, Victor 2026-07-14): "NO per-module Master→Instance engine; **cycle-gen → Scheduler** (`dueIn`/
  `planned_blocks`), **work → Tasks Universe**, **occurrences → Session sub-types**". A recurring responsibility's occurrences are **Sessions**, not
  completions of the Task. mod-tasks calls its S5 "the seam routines' RT-4 recurrent task consumes" (`docs/features/tasks/delivery/slice-map.md:29`).
- **Routines can start any session sub-type** (Victor 2026-10-22). Modules register the sub-types they drive and create sessions themselves: `work`
  (tasks `registerTasksTimer`), `review` ("a SHARED canonical sub-type", purposes **and** flashcards, idempotent first-wins:
  `services/purposes/service.ts:704-722`), `reading` (books), `class` (learning). ADR-004 §3.1 lists the identified sub-types.

## What changes (built behaviour → corrected)
| # | Area | Built (drift) | Corrected |
|---|---|---|---|
| 1 | `addStep` | a step with no entity and no `step_type` = an entity-less "actionable" step | **A check-off step IS a Task (Q1/RT-4):** with no entity ref and `step_type` null or `'task'`, routines creates the Task via `tasks.createTask({ title })` (`standard`, a valid step-task type per intake §D; becomes `duty` when TAS-24 lands) and links it. **Sharing (RT-10):** a step may instead **link an existing task** (`entity_type:'task'`, `entity_id`), so several routines share one responsibility with no duplicate. Atomicity: the Task is created first; if the step insert then fails, the orphan Task is soft-deleted (best-effort) so no dangling responsibility is left |
| 2 | Target precedence | focus → task/habit ref → actionable → unavailable | **session step** (`step_type` names a **registered** sub-type, or `'exercise'` → `workout`, intake §D:94-98) → **task** ref → **habit** ref → `EntityUnavailableError`. A session step's own entity ref (what the session is *about*) is **attached alongside** the `routine_step` at instance level (ADR-004 §3.2.1), so the owner's declared effects target it |
| 3a | Task step, `standard` (responsibility) | `completeTask` | **An occurrence is a `work` session (D3; ADR-004 §3.1 `work_sessions`→Tasks):**<br>• `runStep` = `tasks.startTimer(taskId)` (Tasks' API) + attach the `routine_step`. If Tasks reports `TimerAlreadyRunningError` (a timer the user started in Tasks), **adopt** that open `work` session (`sessions.findOpenSessionForEntity('work','task',taskId)`) and attach the step (the N9 adoption pattern).<br>• `completeStep` with a running occurrence = `tasks.stopTimer(sessionId)`, which logs the time via Tasks' `log_time` and completes the session; then stamp.<br>• **A bare check** (no running occurrence) = a completed `work` occurrence via the Sessions API: `createSession({sub_type:'work', scheduling_mode:'ad_hoc', status:'in_progress', started_at})` + attach task + step, then `completeSession` (`work` declares `effects:[]`, so no time-log row). Then stamp. **Never a stamp without an entity-side occurrence** (RT-3; structure-data.md:66; BR:118).<br>• The Task itself is never completed by the routine. A TERMINAL Task → `EntityUnavailableError`. Timer not wired → `EntityUnavailableError` |
| 3b | Task step, `obligation` | `completeTask` | **Unchanged: `completeTask`** (TK-7 regeneration is the obligation's own occurrence engine; tasks slice-map S5 "the seam routines' RT-4 recurrent task consumes"; RT-3 "task drill-in"). Inherits the documented obligation-lineage limit (interp rule 22) |
| 4 | Session steps | focus only; anything else unavailable (R5) | **Any REGISTERED sub-type** (owners register their own: tasks `work`, books `reading`, learning `class`, purposes/flashcards `review`; users' long-tail types).<br>• Focus keeps its timer path (`startFocus`/`completeFocus`, N9).<br>• Others: **lifecycle-aware**. Read `registry.get(sub_type).lifecycle` and create in the state from which a `complete` transition exists (`in_progress` if `in_progress→completed` is declared, else `scheduled`; with a `start` transition available, start before complete). Then `completeSession` fires the owner's declared effects.<br>• **Routines registers no sub-type** (ADR-004 §3.1: extensions are owned by their domain module; §3.3: shipped types are fully authored by their owner; the registry is first-wins with no update path, `foundation/sessions/registry.ts:103-117`). An unregistered sub-type → `EntityUnavailableError`, a borrowed leg homed to its owner (`workout` → MOD-health-training #69, slice-map §Borrowed legs) |
| 5 | S4 reflection | task step done if the Task is `completed` with `completed_at ≤ D` | Standard task steps: the occurrence record (ledger row + its `work` session) only. Obligation task steps keep the S4 `completed_at ≤ D` reflection (3b). Habit unchanged |
| 6 | S5 | inherited the rule-22 limit | the limit now applies only to obligation steps |
| 7 | Docs | A11, interp rules 15/22, R2/R5, BR-RT-S3d-2/3, S4e-3, S5a limit, seam:50 ("nullable = actionable"), slice-map:43 (A11 cell), the `StepRunState.target` `'actionable'` value | amended (§XXVIII); seam factory deps gain **`sessionRegistry: SessionRegistry` (required)**, to read sub-type lifecycles |
| 8 | Legacy rows | built steps with a null entity ref | resolved by the same rule as a new check-off step: on its next `runStep`/`completeStep`, routines creates + links its Task (one-time migration-on-touch; M1 has no user data) |

**Kept:** habit steps (one native tick, HB-5 reflect) · focus steps (S3 + the N9 detach workaround) · drive-then-stamp (N7) · the per-step lock · the
acceptance/policy/S4/S5 machinery.

## Deps
`sessionRegistry: SessionRegistry` joins the factory (read-only use: `get(sub_type)` for lifecycles; routines registers nothing). It is **required**,
alongside `sessions`. The tasks timer requires the composition to call `registerTasksTimer` (it registers `work` + the `log_time` handler); the test harness
does so.

## Verification Gate (blocking — live store, Node 24, real tasks/habits/sessions + `registerTasksTimer`)
1. `addStep({title:'Water plants'})` (no entity) creates + links a standard Task; `step_type:'task'` with no entity does the same; linking an existing
   task in two routines shares it (no duplicate Task).
2. Standard task step: `runStep` → a running `work` session attached to the task **and** the routine_step; `completeStep` → the session completed, a
   `task_time_logs` row, stamped; **the Task stays open**.
3. Standard task step, **bare check** (no running occurrence) → a **completed `work` session** attached to task + step, **no** time-log row, stamped.
4. Adopting a user-started timer: `tasks.startTimer` in Tasks, then `runStep` → the same session (adopted, step attached), no `TimerAlreadyRunningError`.
5. Two days → two occurrence sessions + two ledger rows; the Task is untouched.
6. TERMINAL Task, or tasks timer not wired → `EntityUnavailableError`.
7. **Obligation** task step → `completeTask` (TK-7 regeneration happens), stamped (3b).
8. Session step `step_type:'review'` under **both registration orders** (purposes def `scheduled→completed` first, and flashcards def
   `scheduled→in_progress→completed` first) → completed + stamped, no `InvalidTransition`.
9. A session step about an entity (`entity_type:'task'`) → that entity attached alongside the step.
10. `step_type:'workout'` (unregistered; owner unbuilt) and `'not_a_type'` → `EntityUnavailableError`, **no registration, no session**. `'exercise'`
   maps to `workout` (same result while unregistered).
11. A legacy null-entity step row → on `runStep`, a Task is created + linked, then driven.
12. Focus and habit unchanged (S3 gates green).
13. **Fixture rewrite (named, incl. the semantic changes):** the S3 task tests that expect the Task `completed` (`test.ts:609-617`, `:845`) move to
   3a semantics (an occurrence session, the Task open) or to an **obligation** task (3b); the rule-17 `award_xp` test (`:785-800`) moves to an obligation
   task (3a fires no Task effect); the S4/S5 reflection tests (`:1036`, `:1183`, `:1406`) move to obligation tasks. Plus: about 45 entity-less `addStep` calls across the S1–S5 blocks become check-off Task steps (`registerTasksTimer` in the
   harness). Expectations that relied on the 'actionable' target (7 references) move to the task-step semantics. S4: a standard task step's day is done
   iff stamped (a Task completed in Tasks no longer reflects); obligation steps keep the reflection.
Gates: tsc 0 · eslint 0 · routines suite green · full `@vida/core` sequential · g2 · /critique · §XXIX.

## Preflight (gate 2): `/preflight` PASSED, 0 gaps (after Approval 1, 2026-10-22)
| Layer | Specified? | Where |
|---|---|---|
| Backend (in-process service) | ✅ the corrected drive per target, the error mapping, the deps | rows 1–8 · §Deps |
| Database | ✅ no schema change. Writes: routines' own rows + Task creation via `tasks.createTask` + sessions via the Sessions/Tasks APIs | rows 1, 3a, 4 |
| Integration | ✅ public APIs only: `tasks.{createTask,getTask,startTimer,stopTimer,completeTask,softDeleteTask}`, `sessions.{createSession,attach,findOpenSessionForEntity,completeSession}`, `sessionRegistry.get` | rows 3a/3b/4 |
| Durable-doc invariants | ✅ RT-3 (the entity side is always written), N7 drive-then-stamp, rule 1, the per-step lock, S4/S5 machinery | §Kept |

**Assumptions pinned:**
1. **Target resolution (approved row 2: a session step names a REGISTERED sub-type, else the task/habit ref), registration memoised per call:**
   - `step_type === 'focus'` → focus;
   - `step_type === 'work'` → **3a with the task ref** (Tasks' invariant: "a `'work'` timer is always task-attached", `tasks/service.ts:550-553`;
     ADR-004 `work_sessions`→Tasks), unavailable without one;
   - `step_type` (or `'exercise'` → `workout`) **registered** (`sessionRegistry.get` succeeds) → session;
   - an unregistered `step_type` **falls through** to the task/habit ref when present, else unavailable;
   - task ref → task; habit ref → habit;
   - no entity ref and `step_type` null or `'task'` → check-off.

   Registration is resolved **once per call** (a memo inside the call), and `isDoneOn` (S4/S5 reflection) uses the same fall-through.
2. **Task kind** is read via the memoised `getTask` (`kind === 'obligation'` ⇒ 3b; else 3a).
3. **Generic session lifecycle:** with `def = sessionRegistry.get(sub_type)`, a session can be **running** iff the def declares an `in_progress → *`
   transition with event `complete` (`createSession` skips the lifecycle, so creating directly in `in_progress` is safe only then).
   - `runStep`: running-capable ⇒ `createSession({status:'in_progress', started_at})` + attach (or re-enter an open one via `findOpenSessionForEntity`).
     Otherwise ⇒ the same as `completeStep`.
   - `completeStep`: an open attached session ⇒ `completeSession`. Otherwise create in the state the def's `complete` transition starts from
     (`in_progress` or `scheduled`) + attach, then `completeSession`.
   - No detach is needed: `completeSession` moves the spine to `completed`, so it's no longer "open". The N9 workaround stays focus-only.
4. **Standard-task occurrence minutes:** the timer path stamps `round((now − started_at)/60000)`; the bare check stamps the caller's
   `actual_duration_minutes ?? null`.
5. **`completeStep` returns `StepRunState` for every step** (the 'actionable' `RoutineCompletion` branch is gone). The seam union collapses to
   `StepRunState`; `isStepRunState` stays exported for compatibility. Tests read `.completion`.
6. **`StepRunState.target`** becomes `'task' | 'habit' | 'focus' | 'session'` (`'actionable'` removed).
7. **Check-off add, ordered so a rejected add writes nothing:** Zod parse → `assertEntityType` → `loadRoutineOrThrow` → `step_order` → **then**
   `tasks.createTask({ title })` → `stepsRepo.create`; if the step insert throws, `tasks.softDeleteTask(task.id)` best-effort, then rethrow.
7b. **Legacy migration-on-touch runs INSIDE the per-step lock** on a step **re-loaded inside `serialized`** (a stale outer row on a double-tap would mint
   a second Task and orphan the first). The link is `stepsRepo.update(entity_type/entity_id)`; if it fails, the new Task is soft-deleted best-effort.
8. **S4 reflection:** a task step's day is done iff its ledger row is done, **or** the task is an obligation with `completed_at ≤ D` (3b). The
   `taskOnce` memo is reused.
9. **Harness wiring:** one hoisted `sessionRegistry` + one `effectRegistry` are passed to `createSessionsService`, `registerTasksTimer` and routines;
   `createTasksService` gets **`sessions`** + `effects` (else `assertTimerWired` throws, `tasks/service.ts:524-526`); `await registerTasksTimer(...)` runs
   after the services are built and before the first drive.
10. **3a `completeStep` with an open `work` session started in Tasks:** attach the `routine_step` **before** `stopTimer`, so the occurrence is linked.
11. **Error mapping (step 3):** `TimerNotWiredError` (`tasks/types.ts:334`) and `TaskNotFoundError` from `startTimer` → `EntityUnavailableError`;
    `TimerAlreadyRunningError` → adopt (row 3a); `SessionTypeNotFound` → the pin-1 fall-through.

## Implementation plan (§5)
1. **Tests first (red):** S5c gates 1–13 + the named fixture rewrite (entity-less `addStep` → check-off Task steps; `completeActionable` → `.completion`;
   'actionable' expectations → task-step semantics).
2. **types.ts / index.ts:** the `sessionRegistry` dep · `StepRunState.target` · `completeStep` return type.
3. **service.ts:** `resolveTarget` (pin 1) · `addStep` check-off creation · legacy migration-on-touch · `driveTask` split 3a/3b (timer, adopt, bare
   check) · `driveSession` (lifecycle-aware, about-entity attach, `exercise`→`workout`) · `isDoneOn` (pin 8) · remove the 'actionable' branch.
   **Gate point = 2–3.**
4. **Docs (row 7):** `services/routines/CLAUDE.md` · A11 · interp 15/22, R2/R5 · BR-RT-S3d-2/3, S4e-3, S5a limit · seam (factory dep, completeStep, `StepRunState`, line 50) ·
   slice-map (A11 cell, S5c row, borrowed legs).
5. **Gates:** tsc · eslint · routines suite · full core · g2 · /critique · §XXIX.

## Step-5 critique (folded): REVISE → 3 blocking fixed (pin 1 honours approved row 2: unregistered `step_type` falls through to the ref, memoised,
same in `isDoneOn`; legacy migration inside the lock on a re-loaded step + orphan cleanup; harness wiring: shared registries, tasks gets `sessions`)
+ 6 non-blocking (running-capable = `in_progress→*` on `complete`; check-off add order; attach before `stopTimer`; error mapping named; fixture
rewrite enumerated; `work` routed to 3a by Tasks' task-attached invariant + routines `CLAUDE.md` in the docs list)

## g1 critique (folded): REVISE → 4 blocking fixed (a bare check writes a completed `work` occurrence, never a stamp alone; obligation steps keep
`completeTask`; routines registers NO sub-type, so an unregistered one is a borrowed leg; lifecycle-aware session completion under both `review` defs) +
5 non-blocking (link existing tasks for RT-10 sharing + orphan cleanup; `exercise`→`workout` + the session's about-entity attached; the
attached-session read homed to Sessions; the full docs list incl. the seam `sessionRegistry` dep; gate cases + the named fixture rewrite)

## Out of scope
Reschedule as a scheduled occurrence session (S6, next, on this model) · Task `duty` type + its preset (TAS-24, Tasks' ADR-002 amendment) · a
Sessions "list sessions by attached entity + date" read (to reflect occurrences driven outside routines). **Named home: sessions-rescope #63** ("backend
`findActiveSession` + applied-effects read", `reconstructed-structure.md:151`), a borrowed leg per golive §3.
