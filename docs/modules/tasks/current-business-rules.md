<!-- CURRENT BUSINESS RULES — tasks context · durable doc (§XXIX). The invariants the CODE enforces today. -->
<!-- Born: mod-tasks #65 · S1 (2026-10-14). BR-TK-S<n>-<k>. Updated per slice. -->

# Tasks — Current Business Rules (enforced)

> The rules the shipped code **actually enforces**, traced to the feature invariants (TK-*) + backend-intent (TAS-*).
> Design-but-not-yet-built rules live in `docs/features/tasks/business-rules.md`, not here.

## S1 — Foundation (BUILT 2026-10-14)
- **BR-TK-S1-1 (≤1 parent module, TK-2/TAS-34).** A task sets at most one of `project_id`/`milestone_id`/`course_id`/
  `contact_id`; >1 ⇒ `MultipleParentError`, on create AND on the merged set at update. `parent_task_id` is a separate
  (sub-task) axis and is NOT counted. Enforced: `service.ts` `assertSingleParent` + `PARENT_MODULE_KEYS`.
- **BR-TK-S1-2 (NN-default backfill).** Because `Repository.create()` echoes the input row (not SQL defaults), every
  NOT-NULL-with-default column is backfilled in the create input: `status='not_started'`, `priority='medium'`,
  `difficulty='medium'`, `kind='standard'`, `measurement_kind='milestone'`, `sort_order=0`; nullable-no-default
  (`binding_mode`/`nesting_weight`/`completed_at`/`actual_minutes`) = `null`. The echoed row == the persisted row.
- **BR-TK-S1-3 (app-layer cascade, TK-4).** No FK ⇒ `softDeleteTask` cascades in code: direct sub-tasks (single level)
  soft-deleted; the task's AND each sub-task's `task_time_logs` **hard-deleted** (ledger, no `deleted_at`); children
  before parent. A missing id ⇒ `TaskNotFoundError`.
- **BR-TK-S1-4 (soft delete + hidden reads).** `tasks.deleted_at` hides a task from `getTask`/`listTasks`
  (`findAll`/`findById` apply `isNull(deleted_at)`; `findWhere` does not, so cascade queries pass an explicit
  `isNull`). The completions/time ledger is hard state, not soft.
- **BR-TK-S1-5 (S1 is a plain column writer).** `updateTask` never sets `completed_at`, never fires completion
  effects, never computes `actual_minutes` — completion semantics (TK-6) are S3, the time ledger (TK-5) is S4. A raw
  `status:'completed'` patch writes only the column. A no-op patch (no provided keys) returns the existing row
  without bumping `_sync_version`.
- **BR-TK-S1-6 (enum validation, TK-33).** `status`/`priority`/`difficulty`/`kind`/`measurement_kind`/`binding_mode`
  validated via Zod (`z.enum` over the `@vida/types` canonical tuples) at the service boundary; out-of-set rejected.
- **BR-TK-S1-7 (local-first / sync, TK-10).** Every create/update/delete succeeds locally and enqueues a
  co-transactional `sync_queue` row via the generic Repository; no bespoke sync.
- **BR-TK-S1-8 (M1.0 encryption seam).** `[E]` `title`/`description` pass through (`encryptedFields:[]`); real
  field encryption is M3/DB-5. The seam is present but dormant.

## S2 — Sub-tasks + M4 rollup (BUILT 2026-10-14)
- **BR-TK-S2-1 (single-level nesting, TK-3).** `addSubtask(parentId, …)` requires the parent to be top-level
  (`parent.parent_task_id == null`) else `SubtaskNestingError`; a missing parent ⇒ `TaskNotFoundError`. A sub-task may
  still carry one parent-module FK (a different axis — the S1 ≤1 guard still runs via the delegated create).
  **Enforcement boundary:** the guard lives at the `addSubtask` entry only. A raw `createTask`/`updateTask` with an
  arbitrary `parent_task_id` is NOT data-layer-guarded against depth (createTask is a deliberate low-level primitive);
  reads stay single-level (`getSubtasks`/`getRollup` look one level down). When a non-`addSubtask` write surface is
  exposed (② UI / import), that surface must route through `addSubtask` or re-assert the invariant.
- **BR-TK-S2-2 (rollup derives — no stored progress, TK-11/M3).** `getRollup(parentId)` computes `{done,total,progress}`
  on read and writes nothing. `done`/`total` = completed/total direct-child counts; `progress` = the ADR-011 M4
  weighted `rollup()` (composed from `foundation/measurement`, not hand-rolled) over each child's milestone-from-status
  leaf (`normalize({kind:'milestone', done})`), weighted by `nesting_weight` (NULL/0 ⇒ equal-weight). **No children ⇒
  `progress:null`** (unmeasured, BR-2 — never coerced to 0).
- **BR-TK-S2-3 (independence, TK-3).** Completing a parent never force-completes its children, and vice-versa —
  `getRollup` is a read-only display derivation. Soft-deleted children are excluded from `getSubtasks` + `getRollup`.
- **BR-TK-S2-4 (leaf measure scope).** In M1 a task's only measurable leaf signal is completion (binary milestone);
  richer per-kind task measures (quantitative/rate/qualitative) are S6. `measurement_kind` is carried but the rollup
  leaf reads completion status.

## S3 — Completion + effect fan-out (BUILT 2026-10-14)
- **BR-TK-S3-1 (completion = status + timestamp, repo-written, TK-6).** `completeTask(id)` sets `status='completed'` +
  `completed_at=Date.now()` via the **repo primitive `tasksRepo.update`**, NOT the service `updateTask` (which has no
  `completed_at` path — BR-TK-S1-5). `completeTask`/`reopenTask` are `completed_at`'s sole writers. A missing/soft-deleted
  id ⇒ `TaskNotFoundError` (findById is soft-delete filtered).
- **BR-TK-S3-2 (reopen clears + resets, no effects, TK-6/TAS-07).** `reopenTask(id)` sets `status='not_started'` +
  `completed_at=null` and fires **no** effects. `'not_started'` (not `'in_progress'`) is the chosen reset — reopen
  conveys no progress; the user re-sets it. **No-op guard:** already non-completed with `completed_at==null` ⇒ returns
  the existing row with no write (no `updated_at`/`_sync_version` bump; mirrors BR-TK-S1-5).
- **BR-TK-S3-3 (completion catalogue = keyed/additive only, TAS-19).** On the not-completed→completed transition the
  task is an EFFECT PRODUCER, emitting `[award_xp, contribute_purpose_metric, emit_measurement_signal]` through the
  rail. The two **projection** effects are realized by class, not pushed: `surface_journal` ⇒ the S9 pull registry;
  `surface_calendar` ⇒ a read-seam over `due_date`/`scheduled_date`/`dueIn` (**D1** — `surface_calendar` IS a valid
  `EffectType`, but Tasks does not emit it). Tasks never writes XP/ledger/metric directly.
- **BR-TK-S3-4 (`award_xp` is feeder-legitimate, TAS-20).** Tasks IS a framework §4 economy feeder (L242), so emitting
  `award_xp` is correct here — the intended divergence from Projects/Books/Education, which are not feeders (C-E2).
  `award_xp` is the XP case; ADR-012 generalizes the slot to `grant_currency(XP)` (Gamification-owned layering).
- **BR-TK-S3-5 (deny-safe, dormant, failure-isolated).** No `effects` dep ⇒ fan-out is a no-op (M1 default). Dep
  present but a handler unregistered ⇒ that effect is skipped (the `registry.resolve` guard — no `NoEffectHandler`
  throw). The column write commits BEFORE the fan-out; a throwing handler is swallowed, so the completed task stands.
- **BR-TK-S3-6 (idempotent grain = occurrence id, TAS-19/R1).** Dedup key = `derive(taskId‖'task_completed'‖type)`.
  A plain re-complete is short-circuited by the `wasCompleted` guard (fan-out not called); a reopen→re-complete re-calls
  the fan-out but the rail ledger holds each effect to once → **one task, one completion grant, ever**. Recurring
  obligations (S5) spawn new task rows (fresh ids) so each occurrence grants.
- **BR-TK-S3-7 (terminal-status note).** `completeTask` does not guard against a `'cancelled'` task — it forces
  `'completed'` and fires. Accepted: completion is an explicit user action and the spec imposes no restriction
  (recorded as a decision, not an oversight).

## S4 — Timer + log_time + actual_minutes (BUILT 2026-10-15) — the decided model (G-S1/G-S4/C4)
- **BR-TK-S4-1 (timer IS a `'work'` sessions sub-type, G-S1/TK-5).** `startTimer(taskId)` opens a `'work'` session
  (`in_progress`) and attaches the task (`entity_type='task'`, instance level) — the timed-run reference, **not** a
  bespoke task timer. `'work'` is a tasks-registered sub-type (`WORK_SESSION_TYPE`, `effects:[]`, spine-only), via
  `registerTasksTimer` (SS-5 — owning module registers its own; the def persists, guarded by `SessionTypeNotFound`).
- **BR-TK-S4-2 (running state lives in the session; one-open-per-task, TAS-12).** The guard uses
  `sessions.findOpenSessionForEntity('work','task',taskId)` — a reverse attachment read (tasks can't read
  `session_attachments`, §6). A second `startTimer` while one is open ⇒ `TimerAlreadyRunningError`. There is **no**
  running `task_time_logs` row (that would be a forbidden direct write) — the ledger row is written only on stop.
- **BR-TK-S4-3 (ledger written ONLY via the `log_time` rail handler, G-S4 — never direct, TAS-16/XCU-23).** `stopTimer`
  is **fire-first, commit-last**: fire `log_time` through the rail (`payload:{started_at,ended_at}`, `targetRef`=the
  attached task) → the tasks-owned handler writes one `task_time_logs` row `{task_id, start_time, end_time,
  duration_minutes=max(0, round((end−start)/60000))}` → **then** `completeSession`. A crash between leaves the session
  `in_progress` → a re-`stopTimer` retries; the rail dedups the written row (grain = session id ‖ `'time_logged'`).
  `stopTimer` on an already-completed session ⇒ idempotent no-op.
- **BR-TK-S4-4 (`actual_minutes` derives on read, TAS-15/C6).** `getActualMinutes(taskId)` = SUM of the task's
  `task_time_logs.duration_minutes`; the `actual_minutes` column is never written. Running sessions contribute nothing
  (no closed row yet). Per-task opt-out (TAS-14) is **deferred** — no sanctioned column (db-4-tasks:441).
- **BR-TK-S4-5 (timer is fail-loud, not S3-dormant).** `startTimer`/`stopTimer` assert `sessions` + `effects` are wired
  (`TimerNotWiredError`); the `log_time` handler is tasks' OWN (not a deferred consumer effect), so a missing handler
  is a wiring error (`NoEffectHandler`), not a silent no-op.
- **BR-TK-S4-6 (`log_time` is a GLOBAL one-per-type slot — guard against bogus rows, g2 F1).** The tasks handler
  receives ANY producer's `log_time`. It writes a row **only** for a well-formed timer emission (numeric
  `started_at`/`ended_at` payload); a payload-less `log_time` (e.g. a future focus/`attach_pomodoro` auto-fire, TAS-17)
  is skipped — no bogus 0-minute row. (Note: the rail still marks such an event `applied`; by-design per XCU-23 at M1,
  revisited when the pomodoro lens lands. F2 cross-device sub-type dedup = AR-9/M4; F4 mis-wiring surfaces
  `SessionTypeNotFound` — both low, deferred.)

## S5 — Obligations + recurrence (BUILT 2026-10-15)
- **BR-TK-S5-1 (obligation-only recurrence, TK-7/TAS-21, enforced at EVERY write path).** A non-null `recurrence_rule`
  requires `kind='obligation'` — `createTask`/`updateTask`/`setRecurrence` all reject it on a non-obligation
  (`RecurrenceNotAllowedError`; `assertRecurrenceAllowed`). `updateTask` checks the MERGED kind/rule (flipping an
  obligation-with-rule to `standard` without clearing the rule throws). `setRecurrence(id, null)` clears it (the
  obligation then behaves standard). No stray inert rule on a standard task.
- **BR-TK-S5-2 (RRULE format + canonical parser).** `recurrence_rule` is RFC-5545 **RRULE** (ADR-002:1160); the
  next-occurrence is computed via the **canonical `ical.js`** (ADR-001:137; `@vida/core` dep `ical.js@2.2.1`,
  `/verify`'d). No `rrule` npm (a forbidden alternative, ADR-001:15); no hand-rolled parser.
- **BR-TK-S5-3 (regeneration = the three outcomes, TAS-22/23).** A FRESH completion of an obligation with a rule
  computes the next `due_date` anchored at the current `due_date` (null ⇒ local today): (1) a next instance ⇒ spawn one
  `not_started` occurrence; (2) a valid but **exhausted** rule (`COUNT`/`UNTIL`) ⇒ complete, **no spawn, no error**
  (legitimate end — NOT a failure); (3) an **invalid/unparseable** rule ⇒ complete + `RecurrenceRegenError`.
- **BR-TK-S5-4 (complete-but-flag, TAS-23 — caller contract).** The S3 completion (status + `completed_at` + fan-out)
  commits BEFORE regen, so it is durable regardless of regen outcome. `completeTask` returns the completed task on
  outcomes 1 & 2; on outcome 3 it **throws `RecurrenceRegenError`** (carrying the completed task id) — this is NOT a
  completion failure; the caller must **not** retry `completeTask` (the task is already completed).
- **BR-TK-S5-5 (carry-over, exhaustive).** The spawned occurrence CARRIES `title`/`description`/the one parent-module
  FK/`priority`/`difficulty`/`estimated_minutes`/`kind:'obligation'`/`recurrence_rule`/`measurement_kind`/
  `binding_mode`/`nesting_weight`/`sort_order`; RESETS `due_date:=next`, `status:'not_started'`, `completed_at:null`,
  `actual_minutes:null`, `scheduled_date:null` (only the deadline recurs); DROPS `parent_task_id` (recurrence is
  top-level only). Each occurrence is a distinct row → the S3 effects fire anew when it completes (each grants).
- **BR-TK-S5-6 (timezone-independent dates — g2 B1).** `nextOccurrence` builds `YYYY-MM-DD` from `ICAL.Time`'s own
  calendar fields, NOT `toJSDate()/toISOString()` (which renders local midnight in UTC → one day early in UTC-positive
  zones). The BRT/UTC gate can't see that drift; a `TZ=Asia/Tokyo` regression test guards it.
- **BR-TK-S5-7 (known M1 edge — reopen→re-complete double-spawn).** `completeTask` regenerates on every
  not-completed→completed transition; the fan-out is rail-deduped but the SPAWN is not. So reopening a completed
  obligation then re-completing spawns a SECOND future occurrence. Spec-literal (TAS-22 "completing spawns next");
  accepted for M1 (g2-reviewed), a spawn-dedup is deferred. The ② UI should avoid/guard the reopen-obligation path.

## Not yet enforced (designed, downstream)
TK-11 per-kind measure + contribution emit (S6) · TK-9 aggregation R7 (S7) · TK-8 tags (S8). TAS-24 `duty`/open-vocab
type registry = ADR-002 amendment (deferred). The S3 completion catalogue's **handlers** are consumer-registered later.
