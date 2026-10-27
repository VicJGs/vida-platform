# Current Spec — routines (level: module · tier: DEEP)

> Language: English (code + docs agree).
> Coverage: 9/9 files read — **full** (`services/routines/{service,types,index,journal}.ts` + `CLAUDE.md` + `__tests__/routines-service.test.ts`
> · `validators/routine.ts` · `@vida/types/routine.ts` · `db/schema/routines.ts`).
> Inherits: `docs/core` (constitution: `business-rules.md`, `conventions.md`, `architecture/data-flow.md`) → this module.
> Last refreshed: 2026-10-26 · **① track closed — S9 providers + Journal promoted (§XXIX)** · S8 tags/notes/links · S7 effects · S6 reschedule + window guard · S5c correction · S5 progress + analytics · S4 policy evaluation · S3 run/drive · S2c floor conformance · earlier: entity-rescope **Step 0 BASELINE** (worktree `mod-routines` @ `0456c32`,
> = built S1–S3 `1a61189` + merged `origin/main`). Source of truth = the code (Currency Rule §XXIX).

> **Baseline note (2026-10-21).** This doc records the code AS-IS. The code was built 2026-10-13 against an
> **older 8-slice decomposition**. The governing delivery docs are now main's **9-slice** set (Victor's
> 2026-10-14 re-approval, D1–D3): `docs/features/routines/delivery/{interpretation,slice-map,seam-contract}.md`.
> The "S1/S2/S3" labels below are the **as-built** labels; how they map onto the governing slices is the job of
> the re-scope's Step 4 (`delivery/reconciliation.md`), not this doc. Implicit-rule cites use the governing
> interpretation's numbering: **interp §4.n** (the old `IR-n` labels are retired).

## 1. Identity & responsibility

The `@vida/core` **① service tier for Routines**: the cross-module _orchestrator_. A routine is a named, ordered,
recurring sequence of polymorphic steps, and each step drives a real entity elsewhere. The intended service
"composes + derives, writes almost nothing of its own" `[FACT: docs/features/routines/delivery/interpretation.md:13-15]`.

**As-built today (S1–S9, the ① track closed):** routine + step CRUD, the ledger + skips, floor conformance (S2c), run/drive over the real Tasks/Habits/
Sessions (S3, S5c), policy evaluation (S4), progress + analytics (S5), reschedule + the window guard (S6), routine-level effects (S7),
tags/notes/links (S8), and the providers + Journal contribution (S9) `[FACT: services/routines/types.ts RoutinesService]`.

**What it is NOT (yet / ever):**

- A derivation engine for evaluation (S4) and progress/streak/analytics/misses (S5); `progress` stays a nullable override slot.
- A provider since S9: `dueIn` / `getDueReminders` / `summary` + `routines/journal.ts` register helpers — shipped, NOT called (N5).
- NOT registered in the app composition-root. That happens in the routines ENTITY close (fe-routines ②), not this track
  `[FACT: docs/specs/foundation/golive-replan/process.md §4]`.
- NEVER an owner of policy config (→ Preferences/Spaces), the Scheduler (→ Sessions), XP (→ Gamification handler) or
  purpose mapping (→ Purpose) `[FACT: db/schema/routines.ts:31-34; interpretation.md §1b]`.

## 2. Contract — what it exposes / needs

### Composition

`createRoutinesService(deps: RoutinesServiceDeps): RoutinesService`: a factory-object with hoisted closures and no `this.`.
`RoutinesServiceDeps = { db: DrizzleDb; deviceId: string; clock?: () => string; registry: TaggableTypeRegistry; tasks: TasksService;
sessions: SessionsService; sessionRegistry: SessionRegistry; habits?: HabitsService; prefs?: RoutinesPrefsPort; effects?: { rail: EffectRail; registry: EffectRegistry }; spaces: SpacesService; notes: NotesService }` (S7 `effects?`; S8 `spaces`/`notes` required) (S3 added `tasks`/`sessions` required, `habits` optional; default `clock` = tasks' `utcDay`) (`registry` added in
S2c: validates a step's `entity_type`; required per the approved seam) `[FACT: types.ts RoutinesServiceDeps]`.

- `clock` defaults to `utcDay(Date.now())` (tasks' public helper, S3), i.e. **today's UTC calendar day** `[FACT: service.ts]`.
- **Factory vs the governing shape:** `registry` (S2c), `tasks`/`sessions` (required) and `habits?` (S3) have landed, plus `prefs?` (S4) and
  `effects?` (S7) and `spaces`/`notes` (S8, required per the seam).

Repositories (DB-6 generic Repository, `encryptedFields: []`, the M1.0 dormant `[E]` seam) `[FACT: service.ts]`:
| Repo | Table | softDelete |
|---|---|---|
| `routinesRepo` | `routines` | true |
| `stepsRepo` | `routine_step` | true |
| `completionsRepo` | `routine_completions` | **false** (ledger, hard delete) |
| `tagsRepo` (S8, read-only) | `tags` | true (liveness reads only — no Spaces tag-read contract) |

### Operations (as-built)

**Routine definition** (`service.ts`)
| Method | Signature | Errors |
|---|---|---|
| `createRoutine` | `(input: CreateRoutineInput) => Promise<Routine>` | `ZodError` (bad enum / missing or empty `name` / progress out of 0–100); `InvalidRecurrenceRuleError` (S2c) |
| `updateRoutine` | `(id, patch: UpdateRoutineInput) => Promise<Routine>` | `ZodError`; `InvalidRecurrenceRuleError` (S2c); `Error('Row not found: <id>')` from Repository `[FACT: db/repository.ts:413]` |
| `archiveRoutine` | `(id) => Promise<void>` | soft-deletes the routine, then cascade-soft-deletes its live steps; ledger untouched |
| `getRoutine` | `(id) => Promise<Routine \| null>` | null if missing/soft-deleted |
| `listRoutines` | `(filter?: { lifecycle? }) => Promise<Routine[]>` | ordered `sort_order`, `created_at`, id (S2c) |
| `setLifecycle` | `(id, lifecycle) => Promise<Routine>` | **S2c.** `ZodError` (off-tuple); `RoutineNotFoundError` (missing/archived), no write |

**Steps** (`service.ts`)
| Method | Signature | Errors |
|---|---|---|
| `addStep` | `(routineId, step: AddStepInput) => Promise<RoutineStep>` | `ZodError`; `UnknownEntityType` (unregistered `entity_type`, S2c); `RoutineNotFoundError` (missing/archived parent). Appends (`step_order` = max+1) unless given (S2c) |
| `updateStep` | `(stepId, patch: UpdateStepInput) => Promise<RoutineStep>` | `ZodError`; `UnknownEntityType` (S2c); `StepNotFoundError` for a truly missing step (S7; was the repo's 'Row not found'; a soft-deleted step still succeeds, g2 N1); `OutsideAcceptanceWindowError` / `InvalidRoutinePolicyError` for newly added past `skip_dates` (S7) |
| `removeStep` | `(stepId) => Promise<void>` | soft-delete only. **Its completions are NOT removed** (see BR doc §3) |
| `reorderSteps` | `(routineId, orderedStepIds: string[]) => Promise<RoutineStep[]>` | foreign/unknown ids silently ignored; returns the live steps (S2c) |
| `listSteps` | `(routineId) => Promise<RoutineStep[]>` | live steps, ordered `step_order`, `created_at`, id (S2c) |

**Run / drive (S3)**: the RT-3 composition core
| Method | Signature | Notes |
|---|---|---|
| `runStep` | `(stepId, input?: { date? }) => Promise<StepRunState>` | drives the step's entity (S5c): **standard task** → start its Tasks `work` occurrence (`tasks.startTimer`, or adopt a timer started in Tasks) + attach the step · **obligation** → `completeTask` · **habit** → one native tick · **focus** → `startFocus({})` + attach · **any registered session sub-type** → `createSession(in_progress)` + attach (lifecycle-aware). `StepNotFoundError` / `EntityUnavailableError` before any occurrence stamp (a legacy null-entity row is first linked to its new Task, which persists) |
| `completeStep` | `(stepId, input?) => Promise<StepRunState>` (every step; S5c) | standard task → stop the running occurrence (time logged by Tasks), or a **bare check** = a completed `work` session (no time log); obligation → `completeTask` (TK-7); habit = runStep; focus → `completeFocus` + detach; session → `completeSession` (the owner's lifecycle). Then stamp. The Task itself is never completed for a standard task |
Target resolution (S5c, Q1/RT-4/D3): `focus` → `work` (needs its task ref) → a **registered** sub-type (`exercise`→`workout`) → task ref → habit ref → **check-off** (no ref: a Task is created + linked on add, or on first drive for a legacy row) → `EntityUnavailableError`. An unregistered `step_type` falls through to the ref. Routines registers **no** sub-type. `StepRunState.target` ∈ `task · habit · focus · session`.
`EntityUnavailableError`. `StepRunState = { step_id, date, target, status: 'done'|'advanced'|'in_progress'|'scheduled', completion, session_id?, focus_id?,
planned_block_id?, flag?: 'recurrence_regen_failed'|'effect_emit_failed' }`. `completeStep` and `runStep` both return it (S5c — no union).

**Policy evaluation (S4)**: read-only, derive-on-read
| Method | Signature | Notes |
|---|---|---|
| `evaluateRoutine` | `(routineId, input?: { date? }) => Promise<RoutineEvaluation>` | judges the occurrence date under the **user's** policy (`prefs?.policyFor`). `RoutineNotFoundError` (missing/archived; past-date reads of archived routines are a known limit), `ZodError` (date), `InvalidRoutinePolicyError` (unknown kind / non-finite threshold), a port throw propagates. Writes nothing |
`RoutineEvaluation = { routine_id, date, status: 'done'|'partial'|'not_started', percent (display), applicable, done/not_done/neutral:
RoutineStepRef[], policy_source: 'user'|'undefined', policy_note? }`. `RoutinePolicy = { completion: all_or_nothing | required_node |
threshold{percent}, miss?: { logged_skip } }` (port contract; storage = Spaces/Preferences).

**Progress + analytics (S5)**: read-only, derive-on-read
| Method | Signature | Notes |
|---|---|---|
| `getStreak` | `(routineId) => Promise<RoutineStreak>` | `{current, longest, total, policy_source, unscheduled?}`: the policy-derived READ seam Gamification pulls (D3) |
| `getAnalytics` | `(routineId, range: RoutineDateRange) => Promise<RoutineAnalytics>` | completion `{scheduled, done, missed, pending, neutral, unjudged, rate}` · step ranking · comparison with the preceding equal range. `ZodError` for a bad range |
| `progress` | `(routineId) => Promise<number \| null>` | `resolveProgress(stored/100, all-time rate)` |
Errors: `RoutineNotFoundError` · `InvalidRecurrenceRuleError` (a stored rule outside the cadence allowlist) · `InvalidRoutinePolicyError` (a malformed window).

**Completion ledger + skip** (`service.ts`)
| Method | Signature | Errors |
|---|---|---|
| `completeStep` | see Run / drive (S5c: always `StepRunState`) | — |
| `skipStep` | `(stepId, input?: { date?, reason? }) => Promise<RoutineCompletion>` | `StepNotFoundError`; `OutsideAcceptanceWindowError` (S6) |
| `planSkipDates` | `(stepId, dates: string[]) => Promise<RoutineStep>` | `StepNotFoundError`; `OutsideAcceptanceWindowError` (any past date, whole list, S6) |
| `rescheduleStep` (S6) | `(stepId, { date, slot: { start, end? } }) => Promise<StepRunState>` (`status:'scheduled'`, `planned_block_id`) | writes ONE SS-8 intent block (`planned_blocks`, target `routine_step`, `source 'routines:<D>'`, `sub_type` = the occurrence's: `work`·`focus`·registered·null for habit/obligation); a re-reschedule moves it. `StepNotFoundError` · `OutsideAcceptanceWindowError` · `EntityUnavailableError` · `NotMissedOccurrenceError` · `InvalidRescheduleSlotError` · `ZodError` (malformed slot), all before any write |
| `editCompletion` | `(stepId, date, patch: { skipped?, skip_reason?, actual_duration_minutes? }) => Promise<RoutineCompletion>` | `StepNotFoundError`; `CompletionNotFoundError`; `OutsideAcceptanceWindowError` when the patch touches `skipped` (S6) |
| `deleteCompletion` | `(stepId, date) => Promise<void>` | `CompletionNotFoundError` (does NOT check the step exists; runs under the per-step lock, S7) |
| `contributeToPurposeMetrics` (S7) | `(routineId, date) => Promise<void>` | re-drives the routine-level `contribute_purpose_metric` for a done, scheduled day (rail-idempotent); not done / no effects ⇒ no-op. `ZodError` · `RoutineNotFoundError` · `RoutineContributionError`; an evaluation failure propagates like a read (`InvalidRoutinePolicyError` · `InvalidRecurrenceRuleError`) |
| `listCompletions` | `(stepId) => Promise<RoutineCompletion[]>` | — (sorted by `completed_date`) |

**Providers + Journal (S9)** (`service.ts` + `routines/journal.ts`)
| Method | Signature | Notes |
|---|---|---|
| `dueIn` | `(range: TimeRange) => Promise<DueItem[]>` | active routines with a rule; a routine-day D is due iff some step in `stepsAsOf(D)` is still owed (D<today: make-good-admissible, no pending block, routine not done; D=today: not done/planned-skipped/blocked; D>today: not planned-skipped). Items ordered by (D, routine order); `hard_deadline` = UTC midnight; est/urgency 0. Per-routine isolated; a non-finite / reversed range ⇒ `[]`. Pure |
| `getDueReminders` | `(range) => Promise<DueItem[]>` | the SS-7 lane impl = `dueIn` after dropping closed reschedule blocks (window closed or D done; never a running make-good, never by lifecycle) to `skipped` — best-effort, per-routine isolated, idempotent |
| `summary` | `(date) => Promise<SectionData>` | `module:'routines'`, `dataPoints` completed_today/skipped_today; one `RoutineDaySummaryItem` per routine with ledger rows on the date (archived included): steps (title · skipped · skip_reason · duration) + `status`/`policy_source`/`not_done` (omitted if that routine's evaluation fails). `'empty'` for an idle day; `ZodError` for a malformed date. Pure |
| `createRoutinesJournalContribution` / `registerRoutinesJournal` / `registerRoutinesDueProvider` | module helpers | summary-only Journal contribution + ONE sessions due lane (SS-7). Shipped, not called (N5) |

`removeStep` / `archiveRoutine` also cancel the step(s)' pending reschedule blocks (S9, best-effort).

**Tags · notes · links (S8)** (`service.ts`; writes via Spaces/Notes only)
| Method | Signature | Errors / notes |
|---|---|---|
| `tagRoutine` / `tagStep` | `(id, tagId) => Promise<EntityTagRow>` | `RoutineNotFoundError` / `StepNotFoundError` (live only); `TagNotFound` for an unknown or deleted tag (no row); idempotent, a soft-deleted junction row is revived |
| `untagRoutine` / `untagStep` | `(id, tagId) => Promise<void>` | NotFound for the routine/step; no tag guard (a deleted tag stays cleanable); no-op when absent |
| `getRoutineTags` / `getStepTags` | `(id) => Promise<EntityTagRow[]>` | `notes.getTagsForEntity` ∩ LIVE tags (deleteTag doesn't cascade); never throws, unknown id ⇒ `[]`; still readable after archive |
| `getRoutineNote` / `getStepNote` | `(id) => Promise<PageRow>` | find-or-create `type 'note'` page (rule 19), `entity_type 'routine'`/`'routine_step'`; the seed name is the content H1 (title column NULL), creation-only; NotFound when archived/removed |
| `linkPage` | `(pageId, { type: 'routine'\|'routine_step', id }, context?) => Promise<EntityLinkRow>` | target guarded by type (NotFound); `pageId` not validated (no FK, the other `createLink` consumers); idempotent; `ZodError` |
| `unlinkPage` | `(pageId, target) => Promise<void>` | target guarded; no-op when absent |

**S7 effects:** with `effects?: { rail, registry }` wired, every write to the occurrence record (`completeStep`/`runStep`/`skipStep`/
`editCompletion`/`deleteCompletion`/`planSkipDates`/`updateStep{skip_dates}`) emits the routine-level `award_xp` + `contribute_purpose_metric`
(keyed `routine.id` + `completed:<date>`) when the written date is a scheduled occurrence that goes not-done → done. Reads never emit.

**S6 write guard:** `completeStep`/`runStep` (past date), `skipStep`, `planSkipDates` (any past date, whole list), `editCompletion` touching
`skipped`, and (S7) `updateStep` adding past `skip_dates` throw `OutsideAcceptanceWindowError` beyond the user's window; skip writes, and since S7
`updateStep` / `deleteCompletion`, run under the per-step lock. The make-good links the
occurrence session to D's block (`updateSession planned_block_id`) and fulfils it on done; a skip of D sets it `skipped`.

Typed errors: `RoutineNotFoundError(id)` · `StepNotFoundError(id)` · `CompletionNotFoundError(stepId, date)` · `InvalidRecurrenceRuleError(rule)`
(S2c) · `UnknownEntityType` (foundation, re-used) · `EntityUnavailableError(stepId, reason)` (S3) · `InvalidRoutinePolicyError` (S4) ·
`OutsideAcceptanceWindowError(stepId, date, windowDays)` · `NotMissedOccurrenceError(stepId, date, reason)` · `InvalidRescheduleSlotError(stepId, reason)` (S6) ·
`RoutineContributionError(routineId, date, reason)` (S7) `[FACT: types.ts]`. A malformed positional `date` to `editCompletion`/`deleteCompletion`
throws `ZodError` (S2c).
`skipStep` + `planSkipDates` replace the single `skipStep({kind})` from the 2026-10-13 seam-contract. That was a §XXVIII
deviation, grounded in RT-8 and g2-approved at S3 `[FACT: types.ts]`. Whether the governing seam-contract already has this
split is checked in reconciliation.

**Not built (governing surface):** nothing owed by the ① track. `ProviderEmitFailed` is the as-built isolation (S9); calling the register
helpers is the fe-routines entity close (N5).

### Inputs (Zod, `validators/routine.ts`)

- `CreateRoutineSchema` = all routine fields optional except `name` (`.min(1)`, S2c) · `UpdateRoutineSchema` = all optional ·
  `progress` int 0–100 (S2c) · `recurrence_rule` parse + FREQ validated at write (S2c) · `SetRoutineLifecycleSchema` (S2c).
- `AddStepSchema` = all step fields optional except `title`; `step_type` is a **plain string** (OPEN vocab).
- `CompleteStepSchema` / `SkipStepSchema` / `EditRoutineCompletionSchema` / `PlanSkipDatesSchema`.
  Dates use a module-local `CalendarDate` = `YYYY-MM-DD` shape regex (S2c; exported as `RoutineCalendarDateSchema`). Shape only, like the
  other modules.
- `RescheduleStepSchema` (S6) · `LinkRoutinePageSchema` (S8: `pageId` min 1, `target { type: 'routine'|'routine_step', id }`, `context?`).
- Enums reuse the shared tuples: `ROUTINE_LIFECYCLE`, `ROUTINE_TIME_OF_DAY`, and `MeasurementKindSchema`/`BindingModeSchema`
  re-exported from `./measurement` (no redefinition).

## 3. Structure & key data

- `service.ts`: the factory. Row→interface mappers (`toRoutine`/`toRoutineStep`/`toRoutineCompletion`, `_sync_status` union
  cast, interp §4.11) · `parseJsonArray` (defensive JSON, malformed→null) · `loadRoutineOrThrow`/`loadStepOrThrow` (fail-loud
  guards) · `findCompletion` + `upsertCompletion` (the shared complete/skip path) · `serializeRoutine`/`serializeStep` (faithful-echo
  backfill, interp §4.8) · the service object `[FACT: service.ts]`.
- `types.ts`: deps, Zod-inferred input types, filter, typed errors, the `RoutinesService` interface `[FACT: types.ts]`.
- `index.ts`: the barrel, re-exported by `@vida/core` `[FACT: services/routines/index.ts; packages/core/src/index.ts]`.
- `CLAUDE.md`: current (refreshed in S2c).

**Schema served (migration 018, the orchestration reframe)** `[FACT: db/schema/routines.ts:47-108]`:

- `routines`: `name[E]`, `description[E]`, `recurrence_rule` (RRULE), `lifecycle` ∈ {active,paused,off} NN DEFAULT active,
  `measurement_kind` NN DEFAULT `rate`, `binding_mode` nullable (NULL ⇒ derive), `progress` nullable override slot, `sort_order`, `deleted_at`.
- `routine_step`: `routine_id` (no FK), `step_order`, `step_type` (OPEN, no CHECK), `entity_type`/`entity_id` (nullable),
  `is_required`, `title[E]`, `description[E]`, `time_of_day` (nullable CHECK), `skip_dates` (JSON TEXT), `deleted_at`.
- `routine_completions`: `routine_step_id` (no FK), `completed_date` (YYYY-MM-DD), `completed_at`, `skipped`, `skip_reason[E]`,
  `actual_duration_minutes`; **UNIQUE(routine_step_id, completed_date)**; **no `deleted_at`**.

**`@vida/types` (DB-11 reconcile, done in as-built S1):** `Routine`, `RoutineStep`, `RoutineCompletion` (re-keyed to
`routine_step_id`, extends `SyncableEntity`). Retired: `RoutineAction`, `ROUTINE_ACTION_TYPE`, `ROUTINE_RECURRENCE_FREQUENCY`
`[FACT: packages/types/src/routine.ts]`. ⚠ The governing interpretation §1c still lists this reconcile as _owed_
(its baseline predates the build) → reconciliation marks it ✅.

## 4. Dependencies

**Consumes:** `drizzle-orm` (`and`/`eq`/`isNull`) · `db/repository` (`createRepository`) · `db/schema/routines` ·
`validators/routine` (→ `validators/measurement`) · `@vida/types` · **`ical.js`** (RRULE parse, S2c) · **`foundation/spaces`**
(`TaggableTypeRegistry` dep + `UnknownEntityType`, S2c) `[FACT: service.ts imports]`. **Services (S3):** `tasks` (`getTask`, `completeTask`, `utcDay`, `TaskNotFoundError`, `RecurrenceRegenError`) · `habits` (`getHabit`, `logCompletion`) ·
`sessions` (`startFocus`, `attach`, `detach`, `findOpenSessionForEntity`, `getSession`, `completeFocus`, `cancelFocus`). Spaces/Notes services,
Effect-rail, Measurement, Journals and Preferences land in S4–S9.

**Consumed by** (bounded reverse-search of `packages/` + `apps/`, not truncated):

- `packages/core/src/index.ts`: the `export * from './services/routines'` barrel line.
- **No runtime consumer.** `apps/web` composition-root does not register routines, and no other service imports it.
  (A `purposes` hit was a false positive: `PlanStepNotFoundError`.)
- Entity registry: `'routine'` + `'routine_step'` are already registered in `db/schema/_registry.ts:45-46` (D2's registry half).
  The Spaces `TaggableTypeRegistry` wire-up is not done by this service.
- **Blast radius:** a signature change breaks only the routines test file and the barrel. The future consumers are fe-routines
  (②), the journals aggregation (summary provider), the sessions due lane and Purpose contributions.

Coupling budget (constitution §6): respected. There are no reads of other modules' tables. No circular dependency.

## 5. Key states

- **Routine:** live (`deleted_at` NULL) × `lifecycle` ∈ {active, paused, off} | archived (`deleted_at` set; steps cascade-archived).
  `lifecycle` changes via `setLifecycle` (S2c) or `updateRoutine`. **Effect (S5 A3):** paused/off neutralise only undone occurrences that are
  today or still inside the user's acceptance window; a real (beyond-window) miss stays missed (RT-6 + business-rules.md:120). Editing
  `recurrence_rule` re-derives the whole history under the new rule (derive-on-read).
- **Step:** live | soft-deleted. A soft-deleted step can still be `updateStep`-ed (it gets re-stamped, ratified g2 N1).
- **Completion (per step × date):** absent | done (`skipped=false`) | logged-skip (`skipped=true`, `skip_reason`). The row flips
  in place via upsert. A **pre-planned skip** is not a completion state; it is a date in `step.skip_dates`.
- **Errors:** validation (`ZodError`) · not-found (typed: Routine / Step / Completion; generic `Row not found` on update-by-id).
- **Empty:** `listRoutines` / `listSteps` / `listCompletions` return `[]`.

## Verification (as-built, re-run at baseline)

`routines-service.test.ts`: live store (better-sqlite3 in-memory, `migrate()` applies 018), **28/28 green on Node 24 after the
merge**; after **S2c: 41/41** (+13 Gate tests) · **S3: 64/64** · **S4: 82/82** · **S5: 102/102** · tsc 0 · eslint 0 · full `@vida/core` 2050/2052 (2 = F006 vault timeouts under load; 36/36 alone) · tsc 0 · eslint 0.
⚠ Run on **Node 24**. The worktree's better-sqlite3 binary is built for ABI 137, so under `.nvmrc`'s Node 22 all 28 fail to load
the native module (environment, not code).

## Completion checklist

- [x] §1 identity + explicit "is NOT" · [x] §2 contract with [FACT] cites
- [x] §3 structure · §4 deps (consumes / consumed-by, reverse-searched) · §5 states
- [x] (DEEP) §2 error cases · §4 coupling budget respected · [ ] reference-depth analysis human-validated (Victor, at the Documentation Gate)
- [x] inherits docs/core; contradicts no level above · open items are reconciliation inputs, not load-bearing UNKNOWNs
