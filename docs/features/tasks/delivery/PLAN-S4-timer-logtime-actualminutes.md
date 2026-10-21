<!-- Forward spec — Tasks ① S4 · Per-Step Build Gate (§XXVI) · authored before implementation -->

# PLAN S4 — Timer + `log_time` + `actual_minutes`

> Slice-map S4. TAS-12,13,15,16. The time-tracking model is **already decided** in the gap-overview + approved
> Decomposition Gate — this PLAN builds it, it does not re-open it.

## Decided model (SETTLED — cite, do not re-litigate)
Source: Tasks Part-1.2 re-run (`realignment-master-plan/part-1.2-reruns/tasks.md`, ✅ IMPLEMENTED, Victor LITE-gate)
§2 **G-S1/G-S4** + guard **C4**; mirrored in the approved `interpretation.md §5 D2` / `slice-map.md D2`:
- **G-S1** — the timer **is a `sessions` sub-type that references the task** (attachment), not a bespoke task timer.
- **G-S4** — *"TK-5's 'timer writes `task_time_logs`' becomes the `log_time` S4 effect"* — `log_time` writes the ledger
  via **R2 (documented handler, never a direct client write)**, idempotent via **R1**.
- **C4** — **keep `task_time_logs`** (wrapped, not replaced); the `work_session` extension-table ("replaced" branch) is
  a deferred **P2 schema-reconcile** (`schema-audit-deferred-homes.md:350-366`) — NOT needed here, so NOT in ① scope.
- **Sub-type literal** = `'work'` (`SESSION_SUB_TYPE`, `session.ts:28`; `sessions.sub_type` is open vocab).
- **Handler home** = the tasks service (XCU-23 "tasks handler" — the single documented writer of `task_time_logs`).

## The build-concrete left to S4 (interpretation D2: "decide concretely at S4") — the emit path
TAS-16 homes the effect to **"tasks service (emit)"** and TAS-13 says **"closing produces the `log_time` effect."** So
the producer is TASKS, not the Sessions lifecycle — `stopTimer` fires `log_time` itself via **`rail.applyEffect`**
(the `projects/service.ts:72 fanOutCompletion` pattern: a module firing its own completion effect through the rail,
with a `payload`), carrying the session's `{ started_at, ended_at }`. The `'work'` sub-type declares **`effects: []`**
— it is only the **timed-run reference** (G-S1 "the session run references the task"); the emit is tasks-driven, not a
session auto-fire. **One read-only Sessions addition is required** — a reverse entity→session lookup
`findOpenSessionForEntity(subType, entityType, entityId)` for the `TimerAlreadyRunningError` guard (the running state
lives only in the open session; Sessions today exposes only the forward `resolveTargets`, and tasks can't read
`session_attachments` directly, §6). Legitimate "jointly with sessions" work (TAS-12 lists `sessions-and-scheduling` as
a contributor) and **read-only** — far lower risk than editing the shared `fireCompletionEffects` fire path (the
rejected alternative: write-side blast radius on every module's completion).

## Operations (added to the S1–S3 surface)
- `registerTasksTimer(registry)` (composition wiring, not a service method) — registers the tasks `log_time` **handler**
  into the effect registry (idempotent; skip if present). The `'work'` `SessionTypeDef` (effects `[]`, lifecycle
  `not_started→in_progress→completed`, attachment instance-level) is registered into the **session** registry at the
  same wiring point (SS-5 — owning modules register their own sub-types).
- `startTimer(taskId): SessionRow` — `getTask` → `TaskNotFoundError`; **running-timer guard (TAS-12):**
  `sessions.findOpenSessionForEntity('work','task',taskId)` returns a non-null open session → `TimerAlreadyRunningError`
  (the running state lives only in the open session — there is no running `task_time_logs` row, which would be a
  forbidden direct write); else `sessions.createSession({ sub_type:'work', status:'in_progress', started_at:now })` +
  `sessions.attach(id,'task',taskId,'instance')`. Returns the running session.
- `stopTimer(sessionId): void` — load via `sessions.getSession` → `TimerNotFoundError` if absent / not `'work'`; if
  already `completed` → idempotent no-op; else **FIRE-FIRST, COMMIT-LAST** (the `lifecycle.ts:12-13` discipline):
  compute `endedAt = Date.now()`, read `started_at` from the session, **fire** `log_time {started_at, endedAt}` through
  the rail (the tasks handler writes one `task_time_logs` row), **then** `sessions.completeSession(sessionId)`. On a
  crash/throw between the two, the session stays `in_progress` → a re-`stopTimer` retries; the rail dedups the
  already-written row (so no duplicate). **Not** S3-style deny-safe: the `log_time` handler is tasks' OWN (registered at
  wiring), so the fire expects it — a missing handler is a wiring error and fails loud (`NoEffectHandler`).
- `getActualMinutes(taskId): number` — SUM of `duration_minutes` over the task's `task_time_logs` (S1 `timeLogsRepo`).
  `0` when none.

## The `log_time` handler (tasks-owned — the single ledger writer, XCU-23; never a direct client write, G-S4)
`(event, tx) => { const { started_at, ended_at } = event.payload; const mins = Math.max(0, Math.round((ended_at −
started_at)/60000)); tx.insert(task_time_logs).values({ task_id: event.targetRef, start_time: started_at, end_time:
ended_at, duration_minutes: mins, ...base/sync cols }) }`. Co-writes through the rail tx (F1 §3B). Fired with
`{ subjectNaturalKey: sessionId, transition: 'time_logged', effectType: 'log_time', targetRef: taskId, payload:
{started_at, ended_at} }` — grain = the session id (one ledger row per timer run; a re-stop re-derives the same key →
`{applied:false}`).

## Composition (no re-implementation)
Composes `SessionsService` (required dep `sessions: SessionsService` — already in the seam-contract factory) + the
effect `rail` + `registry`. `task_time_logs` stays the S1 `timeLogsRepo` (`softDelete:false`). **No new DB table, no
DDL. One read-only Sessions addition** (`findOpenSessionForEntity`) + its g2 — the only substrate touch.

## Types / validators
- `types.ts`: `TimerAlreadyRunningError`, `TimerNotFoundError`; extend `TasksServiceDeps` with `sessions:
  SessionsService` (required — the timer composes it). `effects?` stays **optional** (S3's deny-safe contract,
  unchanged); but the timer is a live feature, so `startTimer`/`stopTimer` **assert `effects` is wired** and throw a
  clear error if not (fail-loud, not silent-0) — distinct from S3's dormant completion catalogue. Extend `TasksService`
  with `startTimer` / `stopTimer` / `getActualMinutes`. No `@vida/types` change.
- **Sessions substrate (ONE read-only addition):** `SessionsService.findOpenSessionForEntity(subType, entityType,
  entityId): Promise<SessionRow | null>` — the in_progress session of `subType` attached to `(entityType, entityId)`, or
  null. Composes the existing attachment read + a spine status/`sub_type` filter; no write, no lifecycle change. Needs
  its own unit test on the Sessions side + g2 (a substrate change, however small).

## Verification Gate (blocking — live store, Node 24, real better-sqlite3 + real SessionsService + rail)
1. `startTimer(taskId)` → a running `'work'` session attached to the task; `getActualMinutes` still `0`.
2. second `startTimer` on the same task (one running) → `TimerAlreadyRunningError`.
3. `stopTimer(sessionId)` → session `completed`; exactly one `task_time_logs` row written **by the handler** (not a
   direct write) with `duration_minutes ≈ (end−start)/60000`; `getActualMinutes` now = that duration.
4. `stopTimer` on an already-completed session → idempotent no-op (no second `task_time_logs` row; assert via
   `applyEffect`/ledger count stays 1).
5. `stopTimer` on a missing/non-`work` session → `TimerNotFoundError`; `startTimer` on a missing task → `TaskNotFoundError`.
6. two timers start→stop→start→stop → `getActualMinutes` = sum of both; a third still-running timer adds nothing until stopped.
7. duration rounding: a <60s run → a row with `duration_minutes = 0`, counts 0.
8. **Ledger write rides the rail (G-S4, never direct):** with `registerTasksTimer` NOT called (handler unregistered),
   `stopTimer`'s `log_time` fire throws `NoEffectHandler` (fail-loud wiring guard) — proving the row is written by the
   rail handler, not a direct client write.
9. **The `'work'` sub-type auto-fires nothing:** `sessions.completeSession` on a `'work'` session fires zero lifecycle
   effects (`effects: []`); only `stopTimer`'s explicit `log_time` emit writes the ledger (the emit is tasks-driven,
   TAS-16, not a session auto-fire).
10. **Fire-first recovery (R1):** a `log_time` handler that throws on the first `stopTimer` → the session stays
    `in_progress` (NOT completed), no partial state; a second `stopTimer` (handler healthy) completes it and writes
    exactly one ledger row (the rail dedup prevents a double if the first fire had partially applied).
11. **Running-guard uses the Sessions reverse read:** after `startTimer`, `findOpenSessionForEntity('work','task',id)`
    returns the open session; after `stopTimer`, it returns null (so a fresh `startTimer` is allowed again).

## Out of scope (documented deferrals — grounded)
`work_session` extension table ("replaced" branch — P2 schema-reconcile, `schema-audit-deferred-homes.md:365`) ·
`setTimeTrackingEnabled` + the `time_tracking_enabled` column (no sanctioned column; db-4-tasks:441 "all intended cols"
excludes it) · `attach_pomodoro` focus-mode binding (TAS-17 — the pomodoro-lens ②/later; the `'work'` timer declares
only `log_time`) · obligation recurrence (S5) · aggregation (S7).
