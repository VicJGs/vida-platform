# Current Spec — routines   (level: module · tier: DEEP)
> Language: English (code + docs agree).
> Coverage: 8/8 files read — **full** (`services/routines/{service,types,index}.ts` + `CLAUDE.md` + `__tests__/routines-service.test.ts`
> · `validators/routine.ts` · `@vida/types/routine.ts` · `db/schema/routines.ts`; ~52.7 KB).
> Inherits: `docs/core` (constitution: `business-rules.md`, `conventions.md`, `architecture/data-flow.md`) → this module.
> Last refreshed: 2026-10-22 · **S3 run/drive promoted (§XXIX)** · S2c floor conformance · earlier: entity-rescope **Step 0 BASELINE** (worktree `mod-routines` @ `0456c32`,
> = built S1–S3 `1a61189` + merged `origin/main`). Source of truth = the code (Currency Rule §XXIX).

> **Baseline note (2026-10-21).** This doc records the code AS-IS. The code was built 2026-10-13 against an
> **older 8-slice decomposition**. The governing delivery docs are now main's **9-slice** set (Victor's
> 2026-10-14 re-approval, D1–D3): `docs/features/routines/delivery/{interpretation,slice-map,seam-contract}.md`.
> The "S1/S2/S3" labels below are the **as-built** labels; how they map onto the governing slices is the job of
> the re-scope's Step 4 (`delivery/reconciliation.md`), not this doc. Implicit-rule cites use the governing
> interpretation's numbering: **interp §4.n** (the old `IR-n` labels are retired).

## 1. Identity & responsibility
The `@vida/core` **① service tier for Routines**: the cross-module *orchestrator*. A routine is a named, ordered,
recurring sequence of polymorphic steps, and each step drives a real entity elsewhere. The intended service
"composes + derives, writes almost nothing of its own" `[FACT: docs/features/routines/delivery/interpretation.md:13-15]`.

**As-built today (S1–S3):** the persistence floor only, meaning routine-definition CRUD, step CRUD + ordering + app-cascade,
and the per-step completion ledger + both skip mechanisms. `[FACT: services/routines/types.ts]`

**What it is NOT (yet / ever):**
- NOT the driver of entities. `runStep` (Sessions / Habits / Tasks composition) is unbuilt `[FACT: types.ts — no runStep]`.
- NOT a derivation engine yet. There is no `evaluateRoutine` / `progress()` / streak; `progress` is stored as the caller's value or null.
- NOT a provider yet. There is no `dueIn` / `summary` / journal / due-lane registration.
- NOT registered in the app composition-root. That happens in the routines ENTITY close (fe-routines ②), not this track
  `[FACT: docs/specs/foundation/golive-replan/process.md §4]`.
- NEVER an owner of policy config (→ Preferences/Spaces), the Scheduler (→ Sessions), XP (→ Gamification handler) or
  purpose mapping (→ Purpose) `[FACT: db/schema/routines.ts:31-34; interpretation.md §1b]`.

## 2. Contract — what it exposes / needs

### Composition
`createRoutinesService(deps: RoutinesServiceDeps): RoutinesService`: a factory-object with hoisted closures and no `this.`.
`RoutinesServiceDeps = { db: DrizzleDb; deviceId: string; clock?: () => string; registry: TaggableTypeRegistry; tasks: TasksService;
sessions: SessionsService; habits?: HabitsService }` (S3 added `tasks`/`sessions` required, `habits` optional; default `clock` = tasks' `utcDay`) (`registry` added in
S2c: validates a step's `entity_type`; required per the approved seam) `[FACT: types.ts RoutinesServiceDeps]`.
- `clock` defaults to `utcDay(Date.now())` (tasks' public helper, S3), i.e. **today's UTC calendar day** `[FACT: service.ts]`.
- **Factory vs the governing shape:** `registry` (S2c), `tasks`/`sessions` (required) and `habits?` (S3) have landed. `spaces`/`notes`/`effects?`/`prefs?`
  land in S4–S8.

Repositories (DB-6 generic Repository, `encryptedFields: []`, the M1.0 dormant `[E]` seam) `[FACT: service.ts]`:
| Repo | Table | softDelete |
|---|---|---|
| `routinesRepo` | `routines` | true |
| `stepsRepo` | `routine_step` | true |
| `completionsRepo` | `routine_completions` | **false** (ledger, hard delete) |

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
| `updateStep` | `(stepId, patch: UpdateStepInput) => Promise<RoutineStep>` | `ZodError`; `UnknownEntityType` (S2c); `Row not found` |
| `removeStep` | `(stepId) => Promise<void>` | soft-delete only. **Its completions are NOT removed** (see BR doc §3) |
| `reorderSteps` | `(routineId, orderedStepIds: string[]) => Promise<RoutineStep[]>` | foreign/unknown ids silently ignored; returns the live steps (S2c) |
| `listSteps` | `(routineId) => Promise<RoutineStep[]>` | live steps, ordered `step_order`, `created_at`, id (S2c) |

**Run / drive (S3)**: the RT-3 composition core
| Method | Signature | Notes |
|---|---|---|
| `runStep` | `(stepId, input?: { date? }) => Promise<StepRunState>` | drives the step's target: task → `completeTask` (or reflect if already completed) · habit → one `logCompletion` tick · focus → `startFocus({})` + attach to the `routine_step` (or re-entry) · actionable → ledger done. `StepNotFoundError` / `EntityUnavailableError` before any routine write |
| `completeStep` (driven) | `(stepId, input?) => Promise<StepRunState>` | task/habit = runStep; focus → `completeFocus` + stamp (duration from the focus) + best-effort detach. Actionable steps still return the `RoutineCompletion` |
Target precedence: `step_type='focus'` → focus · `entity_type` task/habit with an id → that · no entity and no type → actionable · else
`EntityUnavailableError`. `StepRunState = { step_id, date, target, status: 'done'|'advanced'|'in_progress', completion, session_id?, focus_id?,
flag? }`. `isStepRunState` narrows the completeStep union.

**Completion ledger + skip** (`service.ts`)
| Method | Signature | Errors |
|---|---|---|
| `completeStep` | `(stepId, input?: { date?, actual_duration_minutes? }) => Promise<RoutineCompletion \| StepRunState>` | `StepNotFoundError`; `EntityUnavailableError` (driven, S3). Actionable → the ledger row; driven → drive first, then stamp (see Run / drive) |
| `skipStep` | `(stepId, input?: { date?, reason? }) => Promise<RoutineCompletion>` | `StepNotFoundError` |
| `planSkipDates` | `(stepId, dates: string[]) => Promise<RoutineStep>` | `StepNotFoundError` |
| `editCompletion` | `(stepId, date, patch: { skipped?, skip_reason?, actual_duration_minutes? }) => Promise<RoutineCompletion>` | `StepNotFoundError`; `CompletionNotFoundError` |
| `deleteCompletion` | `(stepId, date) => Promise<void>` | `CompletionNotFoundError` (does NOT check the step exists) |
| `listCompletions` | `(stepId) => Promise<RoutineCompletion[]>` | — (sorted by `completed_date`) |

Typed errors: `RoutineNotFoundError(id)` · `StepNotFoundError(id)` · `CompletionNotFoundError(stepId, date)` · `InvalidRecurrenceRuleError(rule)`
(S2c) · `UnknownEntityType` (foundation, re-used) · `EntityUnavailableError(stepId, reason)` (S3) `[FACT: types.ts]`. A malformed positional `date` to `editCompletion`/`deleteCompletion`
throws `ZodError` (S2c).
`skipStep` + `planSkipDates` replace the single `skipStep({kind})` from the 2026-10-13 seam-contract. That was a §XXVIII
deviation, grounded in RT-8 and g2-approved at S3 `[FACT: types.ts]`. Whether the governing seam-contract already has this
split is checked in reconciliation.

**Not built (governing surface, per `delivery/seam-contract.md`):** `evaluateRoutine`, `progress`,
streak/rate analytics, `rescheduleStep`, effect emission, tags/notes consumption, `dueIn`/`summary`/`getDueReminders`, journal +
due-provider registration, and the typed errors `OutsideAcceptanceWindow` / `PolicyUndefined` / `ProviderEmitFailed`.

### Inputs (Zod, `validators/routine.ts`)
- `CreateRoutineSchema` = all routine fields optional except `name` (`.min(1)`, S2c) · `UpdateRoutineSchema` = all optional ·
  `progress` int 0–100 (S2c) · `recurrence_rule` parse + FREQ validated at write (S2c) · `SetRoutineLifecycleSchema` (S2c).
- `AddStepSchema` = all step fields optional except `title`; `step_type` is a **plain string** (OPEN vocab).
- `CompleteStepSchema` / `SkipStepSchema` / `EditRoutineCompletionSchema` / `PlanSkipDatesSchema`.
  Dates use a module-local `CalendarDate` = `YYYY-MM-DD` shape regex (S2c; exported as `RoutineCalendarDateSchema`). Shape only, like the
  other modules.
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
`[FACT: packages/types/src/routine.ts]`. ⚠ The governing interpretation §1c still lists this reconcile as *owed*
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
  `lifecycle` currently changes only via `updateRoutine`. It has **no behavioral effect yet**; "paused/off generate no misses"
  (RT-6) needs the unbuilt miss derivation.
- **Step:** live | soft-deleted. A soft-deleted step can still be `updateStep`-ed (it gets re-stamped, ratified g2 N1).
- **Completion (per step × date):** absent | done (`skipped=false`) | logged-skip (`skipped=true`, `skip_reason`). The row flips
  in place via upsert. A **pre-planned skip** is not a completion state; it is a date in `step.skip_dates`.
- **Errors:** validation (`ZodError`) · not-found (typed: Routine / Step / Completion; generic `Row not found` on update-by-id).
- **Empty:** `listRoutines` / `listSteps` / `listCompletions` return `[]`.

## Verification (as-built, re-run at baseline)
`routines-service.test.ts`: live store (better-sqlite3 in-memory, `migrate()` applies 018), **28/28 green on Node 24 after the
merge**; after **S2c: 41/41** (+13 Gate tests) · full `@vida/core` 2050/2052 (2 = F006 vault timeouts under load; 36/36 alone) · tsc 0 · eslint 0.
⚠ Run on **Node 24**. The worktree's better-sqlite3 binary is built for ABI 137, so under `.nvmrc`'s Node 22 all 28 fail to load
the native module (environment, not code).

## Completion checklist
- [x] §1 identity + explicit "is NOT" · [x] §2 contract with [FACT] cites
- [x] §3 structure · §4 deps (consumes / consumed-by, reverse-searched) · §5 states
- [x] (DEEP) §2 error cases · §4 coupling budget respected · [ ] reference-depth analysis human-validated (Victor, at the Documentation Gate)
- [x] inherits docs/core; contradicts no level above · open items are reconciliation inputs, not load-bearing UNKNOWNs
