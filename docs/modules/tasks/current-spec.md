<!-- CURRENT SPEC — tasks context · durable doc (§XXIX Currency Rule). Reflects what IS BUILT, not the full design. -->
<!-- Born: mod-tasks #65 · LIF-142 · S1 (2026-10-14). Updated per slice. -->

# Tasks — Current Spec

> **Context:** `@vida/core` tasks service tier (`packages/core/src/services/tasks/`). The OS-wide task primitive +
> its time ledger. Built PER SLICE (Entity Delivery Flow ①). **Pulled ahead of mod-routines** (routines drives
> task-type steps). Design authority: `docs/features/tasks/` + `docs/specs/foundation/backend-intent/parts/tasks.md`.

## Build status — slices
| Slice | State | Surface |
|-------|-------|---------|
| **S1 Foundation** | ✅ BUILT (2026-10-14) | CRUD · ≤1-parent guard · app-layer cascade · list filters · DB-11 reconcile |
| **S2 Sub-tasks + M4 rollup** | ✅ BUILT (2026-10-14) | `addSubtask` (single-level) · `getSubtasks` · `getRollup` derived-on-read |
| **S3 Completion + effects** | ✅ BUILT (2026-10-14) | `completeTask`/`reopenTask` + deny-safe completion effect fan-out |
| **S4 Timer + log_time** | ✅ BUILT (2026-10-15) | `startTimer`/`stopTimer`/`getActualMinutes` over a `'work'` session sub-type; `log_time` → kept ledger |
| **S5 Obligations + recurrence** | ✅ BUILT (2026-10-15) | `setRecurrence` (obligation-only) + `completeTask` regen hook; RRULE via `ical.js` |
| **S6 Measurability + contribution** | ✅ BUILT (2026-10-15) | `getTaskProgress` (pursuable `progress()`, derived-on-read honoring `binding_mode`) + C1/C2 guards |
| **S7 Aggregation** | ✅ BUILT (2026-10-16) | `getAggregatedTasks` over the SHARED `ViewProviderRegistry` (R7/V4); standalone Inbox; per-group degradation |
| **S8 Tags + Notes + Views + ReadProvider** | ✅ BUILT (2026-10-18) | `tagTask`/`untagTask`/`getTaskTags` · `getTaskNote` (`task_note` page) · `saveView`/`listViews` (exact-`['task']` views) · `TASK_VIEW_PRESETS` + `kind` filter · tasks registered as a `ReadProvider` (nested tags) |
| **S9 Journal summary + DueProvider (the ① closer)** | ✅ BUILT (2026-10-19) | `getDayTasksSummary` (the §2 journal set) · `getDueReminders` (the SS-7 due-bucket) · `journal.ts` (`registerTasksJournal` + `registerTasksDueProvider` on Sessions) · `utcDay` · TAS-29 `TaskViewConfig`/`TaskViewConfigSchema` · TAS-32/36 RATIFY — **① BACKEND COMPLETE** |

## Persistence (built floor — migration 015)
- `tasks` — 5 parent refs (`project_id`/`milestone_id`/`course_id`/`contact_id`/`parent_task_id`, plain TEXT no FK),
  `status`/`priority`/`difficulty` (CHECK enums), `due_date`/`scheduled_date`, `estimated_minutes`, `actual_minutes`
  (derived, S4), `completed_at` (S3), `kind`, `recurrence_rule`, `measurement_kind` (NN `milestone`), `binding_mode`
  (nullable), `nesting_weight`, `sort_order`, `deleted_at`. Soft-delete.
- `task_time_logs` — `task_id` (no FK), `start_time`/`end_time` (NULL=running), `duration_minutes`. **Ledger — no
  `deleted_at`** (hard-deletes with the task).

## S1 surface — `createTasksService(deps)`
- **Deps (as of S3):** `{ db, deviceId, effects? }` where `effects?: { rail: EffectRail; registry: EffectRegistry }`
  (deny-safe, S3). (Still grows — `sessions`/`spaces`/`notes`/`registry`/`providers` land later.)
- `createTask(input): TaskRow` — validates (Zod); **≤1 parent-module FK** or `MultipleParentError`; backfills every
  NN-default col (create() echoes input, not SQL defaults).
- `updateTask(id, patch): TaskRow` — `TaskNotFoundError` if absent; re-enforces ≤1-parent on the **merged** set;
  sparse write; no-op patch returns existing unchanged. **Plain column writer** — does NOT set `completed_at` or
  compute `actual_minutes` (S3/S4).
- `softDeleteTask(id)` — app-layer cascade: sub-tasks soft-deleted (single level), task + sub-task `task_time_logs`
  **hard-deleted**, children before parent.
- `getTask(id): TaskRow | null` — soft-delete filtered.
- `listTasks(filter?): TaskRow[]` — `findAll` (soft-delete filtered) + JS filter by status/priority/parent/project/
  completed/due_before. (Pagination is ② P6.)
- **Returns Drizzle `TaskRow`** (not `@vida/types.Task` — the interface is the mirror; `_sync_status` string≠union).

## S2 surface — sub-tasks + rollup
- `addSubtask(parentId, input): TaskRow` — `TaskNotFoundError` if parent absent; **single-level** (`SubtaskNestingError`
  if the parent is itself a sub-task, TK-3); delegates to `createTask` with `parent_task_id=parentId` (S1 guards apply).
- `getSubtasks(parentId): TaskRow[]` — direct children, soft-delete filtered, ordered `sort_order` then `created_at`.
- `getRollup(parentId): { done, total, progress }` — DERIVED (no stored column): `done`/`total` = completed/child
  counts; `progress` = ADR-011 M4 `rollup()` over each child's milestone-from-status leaf (`normalize`), weighted by
  `nesting_weight` (NULL ⇒ equal); **no children ⇒ `progress:null`** (unmeasured, never 0). Read-only — a parent's
  completion never force-completes children.

## S3 surface — completion + effect fan-out
- `completeTask(id): TaskRow` — `TaskNotFoundError` if absent. Sets `status='completed'` + `completed_at=Date.now()`
  via **`tasksRepo.update`** (the repo primitive — `updateTask` cannot write `completed_at`, BR-TK-S1-5). On the
  not-completed→completed transition, **post-commit**, fans out the completion catalogue (below). Sole writer of
  `completed_at` (TK-6).
- `reopenTask(id): TaskRow` — `TaskNotFoundError` if absent. Resets `status='not_started'` + `completed_at=null`;
  **no-op guard** (already non-completed with `completed_at==null` ⇒ returns existing, no write); fires **no** effects.
- **Completion catalogue** = `[award_xp, contribute_purpose_metric, emit_measurement_signal]` — the keyed/additive
  subset, pushed through the rail. The two **projection** effects are realized by their class, not a push:
  `surface_journal` ⇒ S9 pull registry; `surface_calendar` ⇒ read-seam (D1). `award_xp` is legitimate because Tasks
  **is** a framework §4 economy feeder (unlike Projects/Books/Education, C-E2).
- **Deny-safe + dormant:** no `effects` dep ⇒ no-op; dep present but handler unregistered ⇒ skipped (no
  `NoEffectHandler`); handler throws ⇒ swallowed, the completed task stands (post-commit, failure-isolated). Rail
  dedups via `effect_event_id = derive(taskId‖'task_completed'‖type)` — complete→reopen→re-complete grants once ever.

## S4 surface — timer + log_time + actual_minutes (the decided model: G-S1/G-S4/C4)
- **Deps (as of S4):** `+ sessions?: SessionsService` (required for the timer — the timer composes it) and `effects?`
  (S3's optional rail; the timer **asserts both are wired** → `TimerNotWiredError`, fail-loud, not S3-dormant).
- `registerTasksTimer({ sessionRegistry, effectRegistry, db, deviceId })` — **composition wiring** (not a service
  method, SS-5): registers the `'work'` `SessionTypeDef` (`effects:[]`, spine-only; into the SESSION registry,
  persisted, guarded by `SessionTypeNotFound`) + the tasks `log_time` **handler** (into the EFFECT registry, in-memory).
- `startTimer(taskId): SessionRow` — `TaskNotFoundError` if absent; `TimerAlreadyRunningError` if an open `'work'`
  session is attached (via `sessions.findOpenSessionForEntity`); else opens a `'work'` session (`in_progress`) + attaches
  the task. The timer is a **sessions sub-type referencing the task** (G-S1) — no bespoke task timer, no running ledger row.
- `stopTimer(sessionId): void` — `TimerNotFoundError` if missing/non-`work`; already-completed ⇒ idempotent no-op; else
  **fire-first, commit-last**: fire `log_time` through the rail (`payload:{started_at,ended_at}`, `targetRef`=the
  attached task) → the tasks handler writes ONE `task_time_logs` row → then `completeSession`. A crash between leaves the
  session `in_progress` (recoverable; rail dedups the written row).
- `getActualMinutes(taskId): number` — SUM of the task's `task_time_logs.duration_minutes` (TAS-15, derived; opt-out
  deferred — no sanctioned column).
- **G-S4 — never a direct write:** the ONLY writer of `task_time_logs` is the rail-invoked `log_time` handler (XCU-23).
- **Sessions addition (read-only):** `SessionsService.findOpenSessionForEntity(subType, entityType, entityId)` — the one
  substrate touch (the `fireCompletionEffects`-payload edit was rejected for write-side blast radius).

## S5 surface — obligations + recurrence (TAS-21/22/23; the routines RT-4 seam)
- `setRecurrence(taskId, rule): TaskRow` — obligation-only (`RecurrenceNotAllowedError` on a non-obligation, TK-7);
  `null` clears it (the obligation then behaves standard). The `recurrence_rule ⇒ kind='obligation'` invariant is
  enforced at **every** write path (create/update/setRecurrence).
- `completeTask` **regen hook (extends S3):** a fresh completion of an obligation WITH a rule computes the next
  occurrence (`nextOccurrence`, below) and spawns one. **Three outcomes:** (1) next instance → spawn a fresh
  `not_started` occurrence (exhaustive carry-over; `parent_task_id` dropped — top-level only; `completed_at`/
  `actual_minutes`/`scheduled_date` reset); (2) valid rule, **exhausted** (`COUNT`/`UNTIL`) → complete, no spawn, no
  error; (3) **invalid** rule → complete + `RecurrenceRegenError` (the task IS completed — complete-but-flag, TAS-23;
  do not retry). Completion commits BEFORE regen (durable).
- **`nextOccurrence(rule, fromYmd)`** — RFC-5545 RRULE (ADR-002:1160) via the **canonical `ical.js`** (ADR-001:137;
  `@vida/core` dep, verified v2.2.1). Anchors a DTSTART at the current `due_date` (null ⇒ local today), iterates past
  the anchor, returns the next `YYYY-MM-DD`. **Built from `ICAL.Time`'s own calendar fields, NOT `toJSDate()/UTC`** —
  the latter drifts one day early in UTC-positive zones (g2 B1; a `TZ=Asia/Tokyo` test guards it).

## S6 surface — measurability (TAS-25/26; the pursuable `progress()` contract)
- `getTaskProgress(id): number | null` — a task's OWN progress ∈ [0,1] | null, DERIVED on read (XCU-08/BR-8). No deps
  added (`{db, deviceId, effects?, sessions?}` unchanged). `TaskNotFoundError` on a missing/soft-deleted id (never
  `null` — `null` is the distinct *unmeasured* signal). Resolution (Projects-faithful; tasks has **no** stored override
  column, C6, so it always derives):
  - **parent (has sub-tasks)** ⇒ the M4 `getRollup().progress` (container rollup wins, regardless of `binding_mode`);
  - **childless `binding_mode='derived-pull'`** ⇒ `null` (source-fed, not completion-fed; no task↔source binding in M1
    → nothing to read, never fabricated — BR-2);
  - **childless else** (`event-trigger` / `manual` / NULL-natural) ⇒ the milestone-from-completion leaf
    (`normalize({kind:'milestone', done})`). A task's only leaf signal is completion (BR-TK-S2-4); the declared
    `measurement_kind` governs ladder composition, not the leaf.
- **`binding_mode` resolution:** `resolveBindingMode = binding_mode ?? 'event-trigger'` (NULL ⇒ the task's natural mode;
  `015_tasks.ts:21` "NULL ⇒ derive-natural" ∘ interpretation.md:33). `manual` is **inert in M1** (no override column
  until XCU-16 lands) — it derives like any other, no `manual⇒null` special case.
- **S3 emission UNCHANGED** — S6 adds no push-side gate: `emit_measurement_signal`/`contribute_purpose_metric` fire on
  completion exactly as S3 built them (unconditional, bare, dormant), matching the Projects/Habits convention.
- **C1 (no M5 source) — by construction:** `TasksServiceDeps` holds no `MeasurementSourceRegistry`, so tasks cannot
  `advertise`; `progress(task)` is not an advertised queryable measure (tasks absent from the M5 applies-to set).
- **C2 (no M7 tables):** `getTaskProgress` is a pure read; tasks owns no Purpose-apex table (`contributions`/`values`/
  `purpose_reviews`/`plan_steps` are Purpose-domain, §3.8).

## S7 surface — aggregation (TAS-05/32; R7 fan-out over the shared seam)
- **Deps (as of S7):** `+ providers?: ViewProviderRegistry` — the **shared** `foundation/views` R7/V4 read-provider
  seam (ADR-007 §3.4; XCU-07/08), deny-safe optional. The slice-map's `AggregationProviderPort` placeholder resolved to
  this type: tasks **consumes the one OS seam and defines no provider port of its own** (a second registry = a fork).
  Ships EMPTY at M1 (providers register per-module at their build; no composition root until M2/P6).
- `getAggregatedTasks(grouping: AggGrouping): AggregatedTasks` — groups **own TOP-LEVEL** tasks (`parent_task_id == null`
  — the grain, BR-TK-S7-8; sub-tasks are S2's via `getSubtasks`/`getRollup`; soft-delete-filtered `listTasks` read;
  **never a cross-module table**, TK-9/C5). `AggGrouping = {by:'parent'} | {by:'parent_type'} | {by:'status'}`
  (TAS-05 "by module/project/status"), Zod-validated at the boundary (a malformed `by` ⇒ Zod error = caller bug).
  - **`by:'parent'`** (the only provider-consuming grouping): partition by the single set parent FK → group
    `'<type>:<id>'`; for each **distinct** parent (one lookup, not per task): `providers.get(type)` →
    `provider.list({ predicates: { id } })` → a **defensive `row.id` match** (correct whether or not the provider
    honours the deferred predicate grammar, ADR-007:67-68; `id` is the one universal field read in ①). The resolved
    row is attached **opaque** (`parentRow: unknown`, as the ViewEngine returns `unknown[]`) for the ② render to map to
    a display label per type (SPLIT). `label` is a deterministic fallback (`'<type>:<id>'`), never a fabricated name.
  - **`by:'parent_type'`** (by module) and **`by:'status'`**: own-table partitions, **zero provider calls**, all `ok`.
  - **standalone / Inbox group** (`key:'standalone'`, `parent:null`): top-level tasks with no parent FK — BR-10's
    "ungrouped bucket, never dropped" (G2); included whenever any exist; always `state:'ok'`; **always last**.
  - **Order (platform-independent):** groups by **codepoint** key (not `localeCompare`), standalone last; tasks within
    a group by `sort_order` then `created_at`. Distinct-parent lookups run in **parallel** (`Promise.all`), every
    failure path (incl. a throwing registry `get`) caught per group. `parentRow` is `object | null` (narrowable).
  - **Per-group degradation (TAS-32 / BR-11 / BR-12):** no `providers`, no provider for the type, no matching row, or
    a throwing `list` ⇒ THAT group `state:'degraded'` (`parentRow:null`, fallback label, **tasks still present**);
    the method **never rejects for a source outage** — the view never blanks. A throw is caught per-group.
  - **Not `ViewEngine.resolve`** (grounded non-reuse): `resolve(viewRow)` is saved-view-driven with single-field
    grouping; `getAggregatedTasks` is an ad-hoc derivation over one type with a 4-FK partition + a parent *lookup* —
    tasks consumes the registry (the seam), not the engine.
- Result types `AggregatedGroup { key, label, parent, parentRow, state, tasks }` + `AggregatedTasks { groups }` in
  `services/tasks/types.ts`; `AggGroupingSchema` in `validators/task.ts`.

## S8 surface — tags · notes · views · the tasks ReadProvider (TAS-27/28/30/31 · XCU-07/08)
- **Deps (as of S8):** `+ spaces?: SpacesService` · `+ notes?: NotesService` · `+ views?: ViewsService` — optional +
  **fail-loud** (`TasksDepNotWiredError(dep)`; the S4 `TimerNotWiredError` is kept). **No `registry` dep:** `'task'` is
  pre-seeded in `_registry.ts` ENTITY_TYPES, so the taggable registry needs no tasks `register()` (the seam-contract's
  `registry` line was pre-S1). Reads that need no dep (`getTaskTags`) work unwired.
- **Tags (TAS-27 · ADR-006 SP1/SP2):** `tagTask(taskId, tagId): EntityTagRow` → `spaces.tagEntity(tagId,'task',id)`
  (idempotent BR-14; re-tag-after-untag REVIVES the same row BR-15) after a task-exists guard (`TaskNotFoundError`) and
  a **live-tag guard** (read-only `tags` `findById`, soft-delete filtered ⇒ unknown OR soft-deleted tag ⇒ `TagNotFound`
  from `foundation/spaces` — `tagEntity` itself blind-inserts an unresolved `tag_id`). `untagTask` → `untagEntity`
  (absent ⇒ no-op; **no tag guard** so a soft-deleted tag stays cleanable). `getTaskTags` = a raw read-only
  `entity_tags` scan with the hand-appended `isNull(deleted_at)`; unknown id ⇒ `[]`.
- **Task note (TAS-31):** `getTaskNote(taskId): PageRow` → `notes.ensureEntityNote('task_note','task',id,{ title })`
  — the dedicated `PAGE_TYPE` member; idempotent find-or-create; the seed is creation-only (the title lands in the
  `content` H1, `pages.title` stays NULL; a renamed task does not retitle its note). ONE guiding page per task; other
  pages/attachments are the ②'s via `NotesService`.
- **Saved views (TAS-28, cite-level · ADR-007 V1/V2/§3.5):** a task view IS a `views` row whose `filter.entity_types`
  is **exactly** `['task']` — tasks STAMPS it (`SaveTaskViewSchema` is a `z.strictObject`; a caller `entity_types` is a
  Zod error). `saveView(input)` without `id` → `views.createView` (`space_id` null = global); with `id` → **REPLACE the
  config**: `views.getView` first (`ViewNotFound` → `TaskViewNotFoundError`; required — `repo.update` on a missing row
  throws a generic Error), the row must be exactly a task view (a foreign `['page']` or MIXED `['task','page']` view ⇒
  `TaskViewNotFoundError`, row untouched — one JSON `filter` column would lose the other types), then
  `views.updateView` with name · layout · filter (re-stamped) · `grouping ?? null` · `sort ?? null` written in full
  (omitted optional keys ⇒ CLEARED); `space_id` is OWNERSHIP, written only when given. `listViews()` =
  `views.listViews()` filtered to exact task views (tolerant filter parse: malformed JSON ⇒ excluded), substrate order.
  `predicates`/`grouping`/`sort` pass through opaque — the predicate DSL is the deferred ADR-007 pass.
- **Presets data (TAS-30 · ADR-009 T4):** `TASK_VIEW_PRESETS: readonly TaskViewPreset[]` = `today` (list, open) ·
  `board` (board, open, grouped by status) · `all_by_project` (list, grouped by `project_id`), each `kind:null`; a
  kind-bound preset sets `kind` + `predicates.kind` from the same shape. **`+ ListTasksFilter.kind`** (own-table,
  additive) so a kind-bound preset is expressible through the provider. The preset PRIMITIVE + tab = Spaces/P6
  (first-consumer-pull); row seeding = XCU-06 pipeline (db-10).
- **Tasks as a `ReadProvider` (XCU-07/08 — the other direction of the S7 seam):** `createTasksReadProvider({svc, db,
  deviceId}): ReadProvider` + `registerTasksReadProvider(providers, deps)` (the `registerTasksTimer` composition shape;
  no composition root at M1). `list(filter)` honours what it understands, ignores the rest, never throws for a bad
  predicate (ADR-007 §3.3.4 / XCU-13): (1) a present `predicates.id` SHORT-CIRCUITS → string ⇒ `[getTask(id)]` (a
  sub-task IS returned by id), non-string ⇒ `[]`; (2) `PROVIDER_KEYS` (`status · priority · project_id · parent_task_id · completed · due_before · kind`) picked
  from `predicates`, validated PER KEY via `ListTasksFilterFieldsSchema.shape[k].safeParse` (invalid ⇒ key dropped;
  unknown keys ignored); (3) grain = TOP-LEVEL unless `parent_task_id` given (BR-TK-S7-8); (4) `filter.tags`
  (array-of-strings only, else ignored) = **membership incl. nested** (ADR-007:57 / ADR-006 `#a ⊃ #a/b`) — the ids are
  expanded — LIVE ids only — to themselves ∪ all LIVE descendants (`expandTagIds`: one `tags` read, a worklist walk
  over `parent_tag_id`, `seen` set; a soft-deleted node — requested or intermediate — stops the walk and contributes
  nothing; unknown id matches nothing), then ONE `entity_tags` scan + a JS `Set` (not
  `inArray` — SQLite bound-variable cap); several tags = **union** (the only interpretation in S8 — an intersection
  combinator is a 007-DSL predicate); (5) returns `TaskRow[]`, soft-deleted excluded. Proven end-to-end through the
  REAL `ViewEngine.resolve` (a saved task view ⇒ `success`, `degraded:[]`; a mixed view degrades only the missing type).
- **Substrate addition (first-consumer-pull):** `ViewsService.listViews()` (live rows, `created_at` then `id` order) +
  `CreateViewInput.grouping?: ViewGrouping | null` (type-accuracy: the runtime already wrote NULL for `== null`).
- **Doc-resolved (C8): `pinView`/`reorderViews` are Preferences-OWNED** — intake G1 "named, reorderable, pinnable" =
  nav placement; ADR-007 §3.5 + IA §6 + XCU-21 home nav placement / default-view preference in Preferences (which has
  no view surface yet: a first-consumer-pull gap, pulled when the ② view-switcher lands). Not a tasks op; not built on
  `spaces.default_view_id` (a Space's single opener ≠ a pinned set); no columns added to `views`.
- Types `SaveTaskViewInput` · `TaskViewPreset` · `TasksDepNotWiredError` · `TaskViewNotFoundError` in `types.ts`
  (`PageRow` is imported THERE — the structural gate admits only `db/schema/(tasks|foundation/)` in `service.ts`);
  `SaveTaskViewSchema` · `ListTasksFilterFieldsSchema` (+ `ListTasksFilterSchema = …optional()`) in `validators/task.ts`.

## S9 surface — Journal summary + DueProvider (TAS-19 `surface_journal` PULL · TAS-29/32/36 RATIFY · the ① closer)
- **Governing doc:** `docs/core/architecture/cross-module-integration.md` §2 ("Governs: the daily-summary aggregation")
  — the tasks row verbatim: "Tasks completed or due on the date: title, status, priority | `tasks` WHERE `due_date = ?`
  OR completed on date"; `docs/features/tasks/contract.md:32` adds `scheduled_date` to "due". Journal = PULL
  (ADR-004 §3.2.5: `surface_journal`/`surface_calendar` are projections — "writes no row, pull-aggregated at render");
  S3 pushes neither. No rail emission in S9.
- **`getDayTasksSummary(date): TasksDaySummaryItem[]`** — the day's journal SET over `listTasks()` (every row, soft-
  delete filtered, no grain filter): a task is a member when `completed_at != null && utcDay(completed_at) === date`
  (`completedToday`) or `due_date === date || scheduled_date === date` (`dueToday`); projected to `{ id, title, status,
  priority, completedToday, dueToday }`. A set union — a task completed-on AND due-on the date is ONE member with both
  flags; a `status:'completed'` row with no timestamp is NOT "completed on date" (TK-6: a completion is status +
  timestamp) but still a member via its date. Order `sort_order` → `created_at` → `id` codepoint. Never throws for
  data; an idle or malformed `date` ⇒ `[]`.
- **`utcDay(ms)`** (exported helper) — Unix ms → the UTC calendar day `YYYY-MM-DD` (`toISOString().slice(0,10)`): the
  platform's shipped convention for "the date" of a timestamp (habits `clock` · finance · books · check-ins · purposes ·
  relationships; `cross-module-integration.md:70` `date(started_at)`). Timezone-INDEPENDENT. The designed
  `user_profile.timezone` (ADR-002:3381, unbuilt) will re-point this one seam. **Flagged divergence (not changed):**
  `todayYmd()` (S5 regen anchor, local day) is the only local-day helper in `@vida/core` — aligning it is a §XXVIII
  change to BR-TK-S5-3, Victor's call. **Second flag:** the lane's OPEN inherits the S1 `completed:false` definition
  (`status !== 'completed'`), so a `cancelled`/`on_hold` dated task is listed as due work — no doc fixes whether those
  statuses are "open" (S1 filter · S8 `Today` preset · S9 lane); Victor's call, not special-cased.
- **`getDueReminders(range: TimeRange): DueItem[]`** — the SS-7 lane producer (sessions intake G2-shape: "a module-
  owned due-bucket resolved LIVE by its owner … `hard_deadline?`"; the Calendar is the dueIn aggregator and surfaces
  BOTH dates, TAS-19 `surface_calendar (due/scheduled)` + G6). OPEN tasks only (the agenda is the forward "what's due"
  half, JR-5); a task is in the window when `utcMidnightMs(due_date)` OR `utcMidnightMs(scheduled_date)` ∈ `[start,end]`
  (inclusive; `Date.parse(ymd+'T00:00:00Z')` — the purposes/relationships convention = how every caller builds bounds;
  `NaN`/absent ⇒ not in window). Item `{ source_module:'tasks', ref_id, label:title, est_minutes: estimated_minutes ?? 0,
  urgency:0, hard_deadline?: dueMs }` — `hard_deadline` OMITTED when the task has no (valid) `due_date`, never NaN;
  `urgency:0` = the deferred G5 placement algorithm (ADR-004 §3.3). A TOTAL deterministic order: `hard_deadline` asc
  with none LAST, then `sort_order`, `created_at`, `id` codepoint. Never throws; soft-deleted excluded.
- **`journal.ts`** — `createTasksJournalContribution(svc)` (`module:'tasks'`, `sectionKey:'summary'`, dataPoints
  `completed_today 'Completed'` · `due_today 'Due today'`; `summary(date)` ⇒ `state = items.length>0 ? 'success' :
  'empty'`, `items` = the set; **summary-only — no `dueIn`**) · `registerTasksJournal(registry, svc)` (overwrite-dedup
  by module) · `registerTasksDueProvider(sessions, svc)` ⇒ `sessions.registerDueProvider({ module:'tasks', fetch })`.
  ONE registration for due work, on Sessions (journals contract:27-32 + JR-3/JR-5 "agenda reads the shared `dueIn()`"
  + SS-7 "never duplicator"); consequence: `buildDashboard().agenda` carries no tasks section in M1 (the built engine
  reads only `JournalContribution.dueIn`; the journals→Sessions bridge is journals' contract). Registry handles are
  PARAMS (no new dep). The file imports only the `../journals`/`../sessions` barrels + `./types` (structural gate).
- **TAS-29 RATIFY + name:** `TaskViewConfig = TaskViewPreset['view']` (types.ts) + `TaskViewConfigSchema =
  SaveTaskViewSchema.omit({ id, space_id })` (validators/task.ts; `strictObject().omit` keeps the `never` catchall on
  zod 4.4.3 ⇒ `entity_types`/`id`/`space_id` still rejected) — the ONE saved-view config schema the 12 renderers consume.
  **TAS-32 RATIFY:** the per-group typed-error half is the S7 group `state:'degraded'` (BR-TK-S7-5). **TAS-36 RATIFY:**
  the ② reverts optimistic state on the 10 typed errors (stable `.name`), surface-guarded by test.
- **Deps unchanged.** `service.ts` gains one type-only `../sessions` import (no cycle — sessions imports nothing from
  tasks) + the `utcDay` helper. No schema, no `@vida/types` change, no new dep, no new error.

## DB-11 reconcile (shipped S1)
`@vida/types/task.ts`: `Task` dropped `tags`, gained `scheduled_date`/`completed_at`/`kind`/`recurrence_rule`/
`measurement_kind`/`binding_mode`/`nesting_weight`; `TaskTimeLog` gained `updated_at`. `validators/task.ts` gained
`CreateTaskSchema`/`UpdateTaskSchema`/`ListTasksFilterSchema`.

## Verification (through S9)
**S9:** tsc 0 · eslint 0 · tasks suite **96/96** (+9 S9: the 9-member §2 set with flags/fields/order + idle/malformed ·
`utcDay` + the day bucket timezone-INDEPENDENT under `TZ=Asia/Tokyo` and `America/Sao_Paulo` · the contribution through
the REAL `createJournalRegistry` + `buildDashboard` (success/empty, dedup, no agenda section, per-section degrade) ·
`getDueReminders` 12-case predicate incl. bounds, open-only, soft-delete, sub-task, omitted `hard_deadline` · total
order under a pinned clock · the REAL `sessions.dueIn` lane + a rejecting lane skipped (BR-34) · TAS-36 10-error
surface guard · TAS-29 both halves incl. strictness · structural read of `journal.ts`). Gate: PLAN-S9 gate-1
REVISE→SHIP → Victor ×2 "ground in the documentation" → rev 3 on the GOVERNING docs → SHIP · preflight PASSED (A1–A6)
· gate-2 SHIP · g2 code review SHIP (9 NITs, 7 folded; N1 `cancelled`/`on_hold`-as-open + N7 `CalendarDateSchema`
rollover flagged — PLAN-S9 §Gate record) · /critique REVISE(docs)→folded→SHIP. **No new dep, no migration, no
`@vida/types` change.**
**S8:** tsc 0 · eslint 0 · tasks suite **87/87** (+11 S8: tags ×2 · note · views ×3 · provider ×4 incl. the REAL
`ViewEngine` end-to-end + nested-tag hierarchy · presets · structural) + spaces substrate **23/23** (+2 `listViews`)
live-store (better-sqlite3, Node 24; REAL `SpacesService`/`NotesService`/`ViewsService`/`ViewProviderRegistry`/
`ViewEngine` over the same store). Gate: PLAN-S8 gate-1 REVISE→SHIP (independent critic, 3 rounds) · preflight PASSED
(ADR-006/007/009/002 conform) · gate-2 SHIP · g2 code review (see task file). One ISOLATED test-baseline fix (F004:
`create()` echo vs DB read). **No new dep, no migration, no `@vida/types` change.**
**Through S6:** tsc 0 · eslint clean · tasks suite **66/66** (+12 S6) + sessions **41/41** live-store (better-sqlite3, Node 24; incl. a
`TZ=Asia/Tokyo` recurrence regression) · full `@vida/core` **1972 pass / 2 env-timeouts** — the 2 reds are the
pre-existing, self-documented marginal-perf `encryptBytes 1MB` + DB-6 encryption tests timing out under sustained load
on this hardware (passed in the session's first full run; DB-6 green in isolation; both in `encryption/`, unrelated to
S6 which touches no encryption/repository file). g2 SHIP (S6: F1/F2 test-rigor + F3 doc + F4 helper-unit-tests fixed;
F5 perf-NIT accepted — DRY over a micro-opt on bounded single-level children) · /critique SHIP. **No new dep** (S6 adds
no dependency). Prior through S5: g2 SHIP (S5 B1 timezone-drift fixed; S4 F1/F3). dep `ical.js@2.2.1` (S5, RRULE parser).

## Deferred / downstream
**① BACKEND COMPLETE (S1–S9).** **S9 deferrals (each homed in a DOC):** urgency ranking (`urgency:0`) → ADR-004 §3.3
L139 + `parts/xcut-sessions.md` UNKNOWN-1 (G5 placement design-pass) · a user-timezone day bucket → the designed
`user_profile.timezone` (ADR-002:3370-3381, unbuilt) + journals BR-S3-4 ("strict tz-aware today = design-pass");
`utcDay` is the one seam · composition-root CALLS of `registerTasksJournal`/`registerTasksDueProvider` → MVP-PATH:
108-111 (UI-3 / M1.1+) · the 12→7 layout mapping → `schema-audit-deferred-homes.md:281-282` (007 anatomy pass).
**Flagged for Victor (not a deferral — a shipped-rule alignment):** `todayYmd()` local-day vs the UTC convention
(BR-TK-S5-3). **Closed by the docs (not deferrals):** "overdue carry-forward" (the lane's window IS the SS-7 contract;
overdue reads ship as `listTasks({ completed:false, due_before })`) · recap lists vs counts (§2 names the fields — a
list) · `JournalContribution.dueIn` (SS-7 one registration, on Sessions). **S8 deferrals (homed):** `pinView`/`reorderViews` → **Preferences-owned** (ADR-007 §3.5 ·
IA §6 · XCU-21; a first-consumer-pull gap against the Preferences corpus — "per-view nav placement: pinned set + order,
per-Space, consumed by the ② view-switcher (fe-tasks)"); a multi-tag INTERSECTION combinator + the predicate-DSL
grammar + per-layout field declarations + the 12→7 layout mapping → the dedicated ADR-007 pass; the preset PRIMITIVE +
tab (XCU-12/13) → Spaces first-consumer-pull / P6, preset ROW seeding → XCU-06 (db-10); a partial-patch `updateView`
form (no ① caller); `registerTasksReadProvider` CALLER (composition root) → M2/P6; `[E]` on `entity_tags`/`views.name`
→ M3; tag/link unify⇄separate surface (XCU-SP-27) → design pass; the ② view-builder / tag picker / note render → P6.
**S7 deferrals (homed):** provider **registration/wiring**
(projects/relationships/learning registering their `ReadProvider` — "per-module at their build", XCU-07; "M1 has no
composition root — wired at M2/P6", projects/types.ts:31; M1 ⇒ registry EMPTY ⇒ cross-module groups `degraded`);
**tasks-as-a-`ReadProvider`** (registering `'task'` so saved views fan out OVER tasks — XCU-07 registrant, TAS-05
"views = rider") → **S8**; `getTaskRollup`/`getFocusMinutes` (Projects' own optional port, projects/types.ts:55 — no
tasks TAS row → a separate cross-module unit); the ② grouped-view render + parent-row→label mapping (SPLIT, P6);
saved-view grouping / `views` config + the V1 anatomy (S8 / the deferred ADR-007 pass, C8); the predicate-DSL grammar
(build-time — S7's defensive id-match is correct regardless). **S6 deferrals (homed):** the `derived-pull`
source read + its task↔source binding store + the `measurementSources` dep (XCU-13, build-phase — M1 yields `null`);
value-bearing per-kind measures + columns (XCU-15, value-bearing entities' DB-4, not tasks); the live
`contribute_purpose_metric`/`emit_measurement_signal` handlers + `contributions` write (XCU-12, MOD-purposes /
first-consumer-pull — verified dormant); a manual stored-progress override column (XCU-16, ADR-002 amendment). The
S3 completion catalogue's **handlers** are registered by consumer modules later (M1 = dormant seam). **S4 deferrals:**
`work_session` extension table (P2 schema-reconcile), `setTimeTrackingEnabled` (no column), `attach_pomodoro` (TAS-17).
**S5 deferrals:** TAS-24 `duty`/open-vocab type registry (ADR-002 amendment); reopen→re-complete spawn-dedup
(BR-TK-S5-7 M1 edge). `[E]` field encryption → M3/DB-5. ② UI → P6.
