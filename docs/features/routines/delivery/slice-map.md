<!-- Slice Map — features/routines · Entity Delivery Flow ① · Step 2 Decomposition Gate -->
<!-- Each slice tagged backend|frontend|shared. ① = backend (this task). ② UI = P6 (separate). -->
<!-- Ratifies the interpretation.md §3 preview against ROU-01…33 coverage. -->

# Slice Map — Routines (① backend)

> **⏸ PAUSED (Victor, 2026-10-14) — pending `mod-tasks` (#65 / LIF-142).** Decomposition approved; build deferred so Tasks
> ships first (D1 below). Resume after mod-tasks: `tasks` becomes a **required** `TasksService` dep; reconcile signatures then.

> **Scope:** the `@vida/core` RoutineService tier over the BUILT schema (migration 018, 3 tables). 0 service code today.
> **Out of scope (② UI / P6, ADR-020):** today-list grouping chrome, per-step live-entity render, standalone-page
> analytics render, drag-reorder chrome, the alarm/timeframe surface. `[FACT: backend-intent/parts/routines.md:5]`
> **Envision Gate:** N/A (pure backend — renders no surface). Any ② affordance is handed to add-frontend-component at P6.

## Gate decisions (carried from interpretation.md §5 — Victor approves)
- **D1** — RESOLVED (Victor, 2026-10-14): **build Tasks (#65) first**, then resume routines with a **required** `tasks: TasksService`
  dep (not a deny-safe port). Routines paused; see banner above. `[DECISION: Victor 2026-10-14]`
- **D2** — register `'routine'` + `'routine_step'` into the TaggableTypeRegistry; notes/pages/links target = `routine_step`
  (+ `routine` group-level); retire the pre-reframe `routine_action` token. `[FACT: _registry.ts:46]`
- **D3** — two-seam completion: a **step** completion drives the entity (fires ITS effects); the **routine-level** policy-`done`
  emits the routine's `award_xp` + `contribute_purpose_metric`; streak exposed as a READ seam (no advertise).

## Factory (established S1, used throughout)
`createRoutinesService(deps): RoutinesService` — `deps = { db, deviceId, spaces: SpacesService, notes: NotesService,
registry: TaggableTypeRegistry, sessions: SessionsService, habits?: HabitsService, tasks?: TasksPort,
effects?: EffectsPort, measurementSources?: MeasurementSourceRegistry, prefs?: RoutinesPrefsPort }`.
Required foundation services non-optional; cross-module drivers + rail + prefs are **deny-safe optionals**. `[FACT: services/projects/types.ts:21]`

## Slices (all `backend`; each closes with the per-slice Verification Gate — live-store, no batching)

| # | Slice | ROU rows | Why this boundary · key seam |
|---|-------|----------|------------------------------|
| **S1** | **Foundation — Routine+Step CRUD, lifecycle, DB-11 reconcile, type registration** | 01,02,03,04,05,06,14,17,29,33 | The floor every later slice stands on. `@vida/types` reconcile (add `Routine`/`RoutineStep`, re-key `RoutineCompletion`→`routine_step_id`, retire POC enums, fix validators) + factory + repos over `routines`/`routine_step` + CRUD + lifecycle + app-layer cascade + register `'routine'/'routine_step'` (D2) + pursuable-axes & open-vocab `step_type` validation. |
| **S2** | **Completion ledger + skip mechanics** | 08(ledger),09,31 | `routine_completions` repo + the two distinct skip mechanisms (planned `skip_dates` vs logged `skipped`+`skip_reason`) + `UNIQUE(routine_step_id, completed_date)` merge. The ledger records actionable/no-entity step completions + skips — NOT driven-entity completions (those live on the entity, RT-3). |
| **S3** | **Run/drive — the RT-3 composition core** | 07,08(drive),11,30a | `runStep` resolves the driven entity and launches its Session sub-type (`sessions.createSession`) OR native completion (`habits.logCompletion`) OR the deny-safe `TasksPort` (D1); returns live state; **never writes a parallel record**. `EntityUnavailable` typed state for missing/deleted/absent-port. The single most load-bearing slice. |
| **S4** | **Policy evaluation derivation** | 12,24,30b | `evaluateRoutine(date) → {done\|partial, percent, done[], not_done[]}` applying `completion_policy` (all-or-nothing · required-node · threshold) **read from prefs config** (ROU-24), never hardcoded; `PolicyUndefined`→shipped default+flag; **always persist/return the partial** (RT-5 gratitude rule). |
| **S5** | **Progress + analytics derivation** | 13,15,16,18 | `progress()` via `measurement.resolveProgress(stored, derive)` (override slot); streak/rate/ranking/time-comparison **recompute from the ledger** (no cache); miss + acceptance-window computation; the **policy-derived streak as a READ seam** Gamification pulls (not the Habits rule, not advertise). |
| **S6** | **Reschedule / alarm (Scheduler)** | 10,28 | `rescheduleStep` asks the Sessions Scheduler for an open fitting slot (availability); `OutsideAcceptanceWindow` typed rejection. Broad cadence (day/week/month/year) resolved **through** the Scheduler — routines owns no scheduler. |
| **S7** | **Effect emission + Purpose contribution** | 21,22 | On routine-level `done` (D3): emit `award_xp` (additive) + `contribute_purpose_metric` (keyed) via `effects.rail.applyEffect` (idempotent by `effect_event_id`); **Routines writes no XP/ledger/metric** — the registered handler does. Contribution rides `contributions` (M7, Purpose-owned); guard against owning apex/rollup tables. |
| **S8** | **Tags + Notes** | 23,25,26 | `entity_tags` consume via `spaces.tagEntity` (routines as consumer of the registered types); routine/step notes via `notes.ensureEntityNote(pageType,'routine_step',id,seed)` + `entity_links`; saved-views cited-as-consumed (ADR-007, deferred pass). |
| **S9** | **Provider + Journal closer (the ① closer)** | 19,20,30c,32 | `dueIn(range)` + `summary(date)` occurrence derivation (aggregator — read live, mirror nothing); expose `getDueReminders(range)`; ship `routines/journal.ts` = `createRoutinesJournalContribution` + `registerRoutinesJournal(registry, svc)` + `registerRoutinesDueProvider(sessions, svc)`; `ProviderEmitFailed` isolation. Confirms the `[E]` empty-seam (32) holds end-to-end. |

**Coverage check:** ROU-01…33 all homed (32 = the empty-`[E]` seam, held across every slice; 30 split a/b/c across S3/S4/S9 by error type). ✓

## Sequencing rationale
- **Dependency order:** S1 (tables/types) → S2 (ledger) → S3 (drive) are the spine; S4–S5 derive over S2's ledger;
  S6 composes Scheduler; S7 emits on S4's `done`; S8 cross-cuts; S9 registers providers over everything.
- **Each slice is independently live-store verifiable** — a real SQLite write path exercises the encrypt/persist seam a
  mock hides (the per-slice Verification Gate is blocking; no owed gates). `[FACT: scenario Step 9]`
- **Worktree-isolated build** — a peer session was active this session; isolate into `.claude/worktrees/mod-routines`
  before S1 implementation. [[parallel-session-shared-tree-collision-use-worktree]]
