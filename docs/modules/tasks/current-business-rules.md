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
  computes the next `due_date` anchored at the current `due_date` (null ⇒ today as the UTC calendar day — re-pointed at S9 from a local day to the platform convention, see BR-TK-S9-3): (1) a next instance ⇒ spawn one
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

## S6 — Measurability axes + contribution (BUILT 2026-10-15) — TAS-25/26
- **BR-TK-S6-1 (`getTaskProgress` = the pursuable `progress()` contract, derived-on-read, TAS-25/XCU-08/BR-8).** A task's
  OWN progress ∈ [0,1] | null is computed on read; no stored progress column (C6). Tasks has **no override slot**, so it
  always derives (Projects-faithful): a **parent** (has sub-tasks) ⇒ the M4 `getRollup().progress` (container rollup
  wins, regardless of `binding_mode`); a **childless** task ⇒ the `binding_mode` branch (BR-TK-S6-2).
- **BR-TK-S6-2 (`binding_mode` governs the childless read, TAS-25).** `resolveBindingMode = binding_mode ?? 'event-trigger'`
  (NULL ⇒ the task's natural mode — `015_tasks.ts:21` "NULL ⇒ derive-natural" ∘ interpretation.md:33 "event-trigger
  (completion)"). A childless **`derived-pull`** task ⇒ **`null`** (its measure is source-fed, not completion-fed; no
  task↔source binding exists in M1 → nothing to read, never fabricated — BR-2). Any other childless task
  (`event-trigger`/`manual`/NULL) ⇒ the milestone-from-completion leaf (`normalize({kind:'milestone', done})`).
- **BR-TK-S6-3 (milestone is the only leaf; `measurement_kind` is carried, not leaf-applied, BR-TK-S2-4).** A childless
  task's leaf is its completion as a `milestone` for ALL declared `measurement_kind` values — a task carries no
  quantitative/rate/qualitative value inputs (those home to value-bearing entities, XCU-15). The declared kind governs
  how the value composes UP a ladder (contributions/M4), not the leaf.
- **BR-TK-S6-4 (`manual` is inert in M1, not a special-case).** Without an override column (deferred — XCU-16) a `manual`
  task has no stored value, so it derives the milestone leaf like any other. No `manual⇒null` rule is fabricated; once the
  override column lands, `resolveProgress` will give a stored `manual` value precedence.
- **BR-TK-S6-5 (not-found ≠ unmeasured).** `getTaskProgress` on a missing/soft-deleted id ⇒ `TaskNotFoundError`, never
  `null` — `null` is reserved for the *unmeasured* measure (BR-2); the two signals never collide.
- **BR-TK-S6-6 (pure read — C2 guard).** `getTaskProgress` writes nothing (no row/`_sync_version`/ledger change); tasks
  owns no Purpose-apex table (`contributions`/`values`/`purpose_reviews`/`plan_steps` are Purpose-domain, §3.8).
- **BR-TK-S6-7 (not an M5 source — C1 guard, by construction).** `TasksServiceDeps` holds no `MeasurementSourceRegistry`,
  so tasks cannot `advertise`; `progress(task)` is not a queryable measure source (tasks absent from the M5 applies-to
  set). S6 adds no `advertise` call anywhere.
- **BR-TK-S6-8 (S3 emission unchanged).** S6 adds no push-side `binding_mode` gate: `emit_measurement_signal` +
  `contribute_purpose_metric` fire on completion exactly as S3 built them (unconditional, bare, dormant) — the
  Projects/Habits convention (the event-trigger write IS the effect, ADR-011 §3.5 / XCU-09).

## S7 — Aggregation, R7 fan-out over the shared seam (BUILT 2026-10-16) — TAS-05/32
- **BR-TK-S7-1 (own table only — TK-9/C5).** `getAggregatedTasks` reads ONLY the own `tasks` table (the soft-delete-
  filtered `listTasks` path) and partitions in JS. It never reads a cross-module table; every cross-module parent
  comes through the `providers` seam. The 4 parent FKs stay the aggregator mechanism (C5 — untouched).
- **BR-TK-S7-2 (the seam IS the shared `ViewProviderRegistry` — no bespoke port).** Parents resolve through the
  `foundation/views` R7/V4 read-provider seam (ADR-007 §3.4, XCU-07/08) — `providers.get(type).list({predicates:{id}})`.
  Tasks defines no provider port of its own (the slice-map's `AggregationProviderPort` was a placeholder for this
  type; a second registry would fork the one OS seam). `ViewEngine.resolve` is not used (saved-view-driven,
  single-field grouping ≠ a 4-FK partition + parent lookup).
- **BR-TK-S7-3 (defensive id match — correct regardless of the deferred predicate grammar).** The by-id lookup passes
  `predicates:{id}` as a best-effort hint, then selects `rows.find(r => r.id === id)`. A provider that ignores the
  predicate (ADR-007:67-68 — unrecognized predicates are ignored per type) still resolves the CORRECT row (never
  `rows[0]`); rows with no matching `id` ⇒ `degraded`, never a wrong parent. `id` is the one universal field read
  (ADR-002 PK); the row is attached OPAQUE (`parentRow: unknown`) — ① never reads a `name`/`title` off an unknown shape.
- **BR-TK-S7-4 (one lookup per DISTINCT parent).** N tasks under the same parent ⇒ exactly one `list` call for that
  parent (spy-proven). `by:'parent_type'` and `by:'status'` make ZERO provider calls (own-table data).
- **BR-TK-S7-5 (per-group degradation — TAS-32 / BR-11 / BR-12; the view never blanks).** No `providers`, no provider
  registered for the type (BR-11 "declared, never dropped"), no matching row, or a `list` that THROWS (BR-12, caught
  per-group) ⇒ that group is `state:'degraded'` with `parentRow:null` and the deterministic fallback label — its
  tasks are STILL PRESENT. A down source degrades its own group only; the method **never rejects** for a source
  outage. A malformed `grouping` is a caller bug ⇒ Zod error (distinct from an outage).
- **BR-TK-S7-6 (standalone / Inbox = the ungrouped bucket, G2 / BR-10).** Tasks with no parent FK form the
  `'standalone'` group (`parent:null`) under both parent groupings: included whenever any exist, omitted when none,
  always `state:'ok'`, always LAST in the stable order (others by key) — never dropped.
- **BR-TK-S7-7 (deterministic, platform-independent order; never-fabricated labels — g2 F2/F5/F7).** Group order =
  standalone LAST, the rest by **codepoint** key compare (not `localeCompare` — ICU/locale collation differs across
  web/Node/Hermes); tasks within a group by `sort_order` then `created_at` (the `getSubtasks` order — `findAll` has no
  ORDER BY, so rowid order is not stable across devices/plans). `label` is a fallback (`'<type>:<id>'`,
  `'standalone'`, the status, the type) in ① for every group; the ② render upgrades it from `parentRow` (typed
  `object | null` so `!== null` narrows) per type (SPLIT leg). Two calls on the same data ⇒ identical output.
- **BR-TK-S7-8 (grain = TOP-LEVEL tasks — g2 F1).** `getAggregatedTasks` aggregates tasks with `parent_task_id == null`
  under EVERY grouping. A sub-task is a decomposition of its parent task (TK-3, S2-owned — reachable via
  `getSubtasks`/`getRollup`), not an independent cross-module item; a child with no module FK of its own must never be
  misrouted to the Inbox as "standalone". (Recurrence, S5, is likewise top-level only.) The contract was silent on
  sub-tasks; resolved from TK-3/S2 ownership, not by inventing an FK-inheritance rule.
- **BR-TK-S7-9 (every failure path degrades — g2 F6; lookups in parallel — g2 F8).** The registry `get`, the provider
  `list`, and the id match all run INSIDE the per-group try: a registry whose `get` throws degrades the parented groups
  (never rejects the view). Distinct-parent lookups run via `Promise.all` (independent, self-contained) — one latency,
  not N serial round-trips. One table (`PARENT_MODULES`) drives both the ≤1-parent guard and the aggregator axis (g2 F3).

## S8 — Tags · Notes · Views · the tasks ReadProvider (BUILT 2026-10-18) — TAS-27/28/30/31 · XCU-07/08
- **BR-TK-S8-1 (tags ride the shared primitive — TK-8 / SP1 / SP2).** Tag WRITES go ONLY through `SpacesService`
  (`tagEntity`/`untagEntity`: idempotent BR-14, resolve-then-soft-delete BR-15, `entity_type` registry-validated BR-2).
  `'task'` is pre-seeded in `_registry.ts` ⇒ no tasks `register()`, no `registry` dep. Tasks never writes `entity_tags`
  directly and never re-creates an inline tag column. Enforced: `service.ts` `tagTask`/`untagTask`.
- **BR-TK-S8-2 (live-tag orphan guard on the CREATE path; the remove path stays cleanable).** `tagTask` requires an
  existing, non-soft-deleted task (`TaskNotFoundError`) and a LIVE tag (`tags` `findById`, soft-delete filtered ⇒
  unknown OR soft-deleted ⇒ `TagNotFound`, nothing inserted — `tagEntity` itself blind-inserts an unresolved `tag_id`).
  `untagTask` guards the task only: removing creates no orphan, and a soft-deleted tag must remain removable.
- **BR-TK-S8-3 (tag READ is raw + soft-delete-filtered; a read never throws for an unknown id).** `getTaskTags` =
  `entity_tags` `findWhere(entity_type='task' ∧ entity_id ∧ isNull(deleted_at))` (BR-TK-S1-4 discipline); unknown task
  ⇒ `[]`; no dep needed.
- **BR-TK-S8-4 (ONE guiding note per task — TAS-31).** `getTaskNote` = `notes.ensureEntityNote('task_note','task',id,
  { title })`: the dedicated `PAGE_TYPE` member, `entity_type='task'`; idempotent (second call ⇒ same page id); the seed
  is CREATION-ONLY (title → the content H1; `pages.title` NULL; a rename does not retitle). Task-exists guard first.
- **BR-TK-S8-5 (task-view identity = `entity_types` EXACTLY `['task']`, stamped — ADR-007 §3.5).** `saveView` always
  writes `filter.entity_types = ['task']`; `SaveTaskViewSchema` is a `strictObject` so a caller-supplied `entity_types`
  is a Zod error. A row whose filter selects anything else — another type, or a MIXED list — is NOT a task view.
- **BR-TK-S8-6 (`saveView` with `id` = REPLACE the config; `space_id` = ownership; foreign/mixed rows untouched).**
  `views.getView(id)` runs FIRST (`ViewNotFound` ⇒ `TaskViewNotFoundError`; `repo.update` on a missing row would throw
  a generic Error); a non-task or mixed view ⇒ `TaskViewNotFoundError` with the row byte-for-byte unchanged (tasks never
  rewrites a view it does not own — one JSON `filter` column would lose the other types); otherwise name · layout ·
  filter · grouping · sort are written IN FULL from the input (omitted optional keys ⇒ cleared: no tags/predicates,
  `grouping`/`sort` NULL). `space_id` changes ONLY when given (omitted ⇒ ownership unchanged; `null` ⇒ re-homed global).
- **BR-TK-S8-7 (`listViews` = exact task views in substrate order).** `views.listViews()` (live rows, `created_at`
  then `id`) filtered by BR-TK-S8-5 with a tolerant filter parse (malformed JSON ⇒ `{}` ⇒ excluded — the engine's own
  discipline); foreign, mixed and soft-deleted rows excluded; deterministic across calls.
- **BR-TK-S8-8 (the ReadProvider honours what it understands and NEVER throws for a bad predicate — XCU-13).**
  a present `predicates.id` SHORT-CIRCUITS: a string ⇒ `[getTask(id)]` (a sub-task IS returned by id; `tags`/grain
  skipped); a present-but-non-string id ⇒ `[]` (an identity predicate that can match nothing returns nothing, never
  "all tasks" — g2 F4); otherwise only `PROVIDER_KEYS` are read, each validated PER KEY (`ListTasksFilterFieldsSchema.shape[k]`): an invalid
  value drops THAT key, unknown keys are ignored, nothing is thrown. Default grain = TOP-LEVEL tasks (BR-TK-S7-8)
  unless `parent_task_id` is given. Soft-deleted excluded. A non-object `predicates` ⇒ `{}`.
- **BR-TK-S8-9 (`tags` = membership INCL. NESTED, upward only, union across the list — ADR-007:57 / ADR-006 §3.2).**
  `filter.tags` is honoured only as an array of strings (anything else ⇒ ignored, never iterated); the LIVE ids among
  them expand to themselves ∪ all LIVE descendants (a worklist walk over `parent_tag_id`, `seen` set); membership flows
  UP (`#a/x/y` tagged ⇒ in the `#a` and `#a/x` views), never down; ONLY live nodes expand — a soft-deleted node STOPS
  the walk whether it is intermediate (its live descendants drop out of the ancestor view) or REQUESTED (a view saved
  on `#x` after `#x` was deleted matches nothing; `deleteTag` does not cascade the junction, so stale `entity_tags`
  rows never resurrect membership — g2 F2); an unknown id matches nothing. Several tags ⇒ UNION (the only
  interpretation in S8; intersection = a 007-DSL predicate). Implementation = one `entity_tags` scan + a JS `Set`, not
  `inArray` (SQLite bound-variable cap).
- **BR-TK-S8-10 (substrate deps are optional + FAIL-LOUD).** `spaces?`/`notes?`/`views?` absent ⇒ the dependent op
  throws `TasksDepNotWiredError(dep)` — never a silent no-op (a swallowed tag write would be data loss). Reads that
  need no dep keep working. The S4 timer keeps its own `TimerNotWiredError` (a shipped error is a seam).
- **BR-TK-S8-11 (presets are DATA bound to `kind`; `kind` is a provider-honoured filter — TAS-30 / T4).**
  `TASK_VIEW_PRESETS` are valid `SaveTaskViewInput`s (proven against the live primitive + engine); a kind-bound preset
  carries `kind` AND `predicates.kind`; `ListTasksFilter.kind` is additive and own-table. The preset primitive + tab are
  NOT tasks' (first-consumer-pull / P6). `pinView`/`reorderViews` are Preferences-OWNED (ADR-007 §3.5) — not enforced
  here by design, not a gap.

## S9 — Journal summary + DueProvider, the ① closer (BUILT 2026-10-19) — TAS-19 (`surface_journal` PULL) · TAS-29/32/36
- **BR-TK-S9-1 (the journal is PULL; S9 emits nothing — ADR-004 §3.2.5).** `surface_journal`/`surface_calendar` are
  projection effects ("writes no row — pull-aggregated at render"); tasks registers READERS (`registerTasksJournal`,
  `registerTasksDueProvider`) and never pushes either. Enforced: `service.ts` `COMPLETION_EFFECTS` unchanged; `journal.ts`.
- **BR-TK-S9-2 (the summary CONTENT is the governing doc's row — `cross-module-integration.md` §2 ∘ `contract.md:32`).**
  `getDayTasksSummary(date)` = the SET of tasks `{ due_date = date ∨ scheduled_date = date ∨ utcDay(completed_at) =
  date }` over EVERY live row (no grain filter — a sub-task completion is a completion), projected to `{ id, title,
  status, priority, completedToday, dueToday }`. A set UNION: a task completed-on AND due-on the date is one member with
  both flags; nothing is excluded for being completed (its `status` is carried). `completedToday` requires the
  TIMESTAMP (`completed_at != null`, TK-6) — a `status:'completed'` label with no timestamp is not "completed on date".
  Never throws for data; idle/malformed `date` ⇒ `[]`. Order: `sort_order` → `created_at` → `id` codepoint.
- **BR-TK-S9-3 ("the date" of a timestamp = the UTC calendar day — the platform convention).** `utcDay(ms)` =
  `toISOString().slice(0,10)`, identical to the 7 shipped day-derivation sites across 6 modules (habits · finance ×2 · books · check-ins ·
  purposes · relationships) and `cross-module-integration.md:70`; timezone-INDEPENDENT (proven under Tokyo + São Paulo).
  The designed `user_profile.timezone` (ADR-002:3381, unbuilt) re-points this one seam later. **`todayYmd()` (the BR-TK-S5-3 null-due anchor) now rides the same helper** — re-pointed at S9 (§XXVIII) from a LOCAL day, which was a review-time S5 choice, not doc-grounded; proven by a `TZ=Asia/Tokyo` regen test.
- **BR-TK-S9-4 (the due-work lane = the SS-7 due-bucket; both dates qualify; the deadline rides as `hard_deadline`).**
  `getDueReminders(range)` returns OPEN tasks (status ∉ the platform TERMINAL set `{completed, cancelled}` — projects:71 · purposes:81 · sessions; projects intake G9 "archived = completed/cancelled"; `on_hold` is open, paused but still owed — the agenda is the forward "what's due" half,
  JR-5; relationships `:521` likewise) whose `due_date` OR `scheduled_date` (G6: deadline / "plan to work on it — drives
  Today/Calendar"; TAS-19 `surface_calendar (due/scheduled)`; the Calendar is the dueIn aggregator) falls in the
  inclusive ms window, converting a calendar date at UTC midnight (the purposes/relationships convention = the callers'
  bound convention). `hard_deadline` = the `due_date` moment, OMITTED when none (never `NaN`); `est_minutes` =
  `estimated_minutes ?? 0`; `urgency:0` (G5 design-pass, ADR-004 §3.3). `DueItem` has no position field — consumers
  place by their range query or by `hard_deadline`. Never throws; soft-deleted excluded.
- **BR-TK-S9-5 (a TOTAL, deterministic lane order).** `hard_deadline` ascending with no-deadline LAST (dated work leads;
  `sessions.dueIn` concatenates lanes unsorted), then `sort_order`, `created_at`, `id` codepoint — never rowid order.
- **BR-TK-S9-6 (ONE due-work registration, on Sessions — SS-7 "never duplicator").** The contribution is summary-only
  (no `JournalContribution.dueIn`); the lane registers via `sessions.registerDueProvider` (journals contract:27-32 +
  JR-3/JR-5: the agenda reads the shared `dueIn()` primitive). Registry handles are PARAMS to the helpers, never service
  deps. Consequence: `buildDashboard().agenda` has no tasks section until journals reads Sessions (journals' contract).
- **BR-TK-S9-7 (the contribution never throws for data; degrade is the engine's).** `summary(date)` ⇒ `state:'success'`
  iff the set is non-empty, else `'empty'` (the precedent rule); a rejecting day-read degrades the tasks section only
  (journals BR-S2-2); a rejecting lane is skipped by `dueIn` (sessions BR-34). Both proven through the REAL engines.
- **BR-TK-S9-8 (TAS-29 — the one config schema is NAMED, not re-authored).** `TaskViewConfig` (type) +
  `TaskViewConfigSchema` (strict Zod: rejects `id`/`space_id`/`entity_types`/a bad `layout`) = `SaveTaskViewSchema` minus
  identity/ownership; every shipped preset parses. The 12→7 mapping stays the 007 pass.
- **BR-TK-S9-9 (TAS-32/36 — the ① typed-error halves are RATIFIED, not extended).** TAS-32's per-group error = the S7
  `state:'degraded'` (BR-TK-S7-5); TAS-36's revert signal = the 10 shipped `Error` subclasses with stable `.name`
  (surface-guarded). No new error.
- **BR-TK-S9-10 (structural).** `journal.ts` imports ONLY the `../journals`/`../sessions` barrels + `./types`;
  `service.ts` adds one type-only `../sessions` import (no cycle) and still no other module's service or schema.

## Not yet enforced (designed, downstream)
**① backend complete.** `pinView`/`reorderViews` = Preferences (first-consumer-pull gap filed). TAS-24 `duty`/open-vocab
type registry = ADR-002 amendment (deferred). S7's provider REGISTRATION (projects/relationships/learning) + the
composition root that CALLS `registerTasks{Timer,ReadProvider,Journal,DueProvider}` = UI-3 / M1.1+ (MVP-PATH:108-111;
registries EMPTY at M1). The S3 completion catalogue's **handlers** (incl. the live `contribute_purpose_metric`
consumer) are consumer-registered later (verified dormant at M1). The S6 `derived-pull` source read + task↔source
binding + `measurementSources` dep = a later slice (XCU-13); a manual stored-progress override column = ADR-002
amendment (XCU-16). S9: urgency ranking = the G5 placement design-pass (ADR-004 §3.3); a user-timezone day bucket =
`user_profile.timezone` (ADR-002, unbuilt) + journals BR-S3-4; the calendar-date FORMAT rule is ADR-002 §2.8 (`YYYY-MM-DD` TEXT) and every date validator is shape-only (task · project · purpose · note) — the lane parses dates exactly as the purposes/relationships lanes do (platform convention, no S9 change).
