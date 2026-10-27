<!-- CURRENT spec — module: habits · living doc (§XXIX). Promoted from the MOD-habits ① build (LIF-125).
     As-built service contract; refreshed per slice. Scope so far: S1. -->

# Habits — Current Spec (① backend service tier)

> Status: ① in progress — S1 landed. Home: `packages/core/src/services/habits/`. Schema: `db/schema/habits.ts`
> (`017_habits`). Types/validators: `@vida/types/habit.ts` + `@vida/core/validators/habit.ts`.
> ② `fe-habits` (LIF-182) owns the UI. Intent authority: the `docs/features/habits/` aspect corpus.

## Composition

`createHabitsService(deps: HabitsServiceDeps): HabitsService` — factory-object, hoisted closures, no `this.`.
Deps: `{ db: DrizzleDb; deviceId: string }` (S2–S5 append optional deny-safe ports: effects · contributions ·
prefs · associations · notes). Repo: `createRepository(db, habits, { deviceId, encryptedFields: [], softDelete: true })`.
`[FACT: packages/core/src/services/habits/service.ts:39-42; types.ts:14-22]`

## Operations (as-built)

### S1 — definition CRUD

| Method            | Signature                                         | Notes                                                                               |
| ----------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `createHabit`     | `(input: CreateHabitInput) => Promise<Habit>`     | Zod-validated; `HabitScheduleError` on custom-without-days; faithful echo (BR-HB-3) |
| `updateHabit`     | `(id, patch: UpdateHabitInput) => Promise<Habit>` | partial patch; re-validates; patch-level schedule guard; `Row not found` if missing |
| `softDeleteHabit` | `(id) => Promise<void>`                           | sets `deleted_at`; ledger untouched (BR-HB-5)                                       |
| `getHabit`        | `(id) => Promise<Habit \| null>`                  | excludes soft-deleted                                                               |
| `listHabits`      | `(filter?: HabitFilter) => Promise<Habit[]>`      | `HabitFilter { is_active?, domain?, habit_type? }`; explicit `isNull(deleted_at)`   |

### S2 — completion ledger + streak recompute

| Method                  | Signature                                                                | Notes                                                       |
| ----------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `logCompletion`         | `(habitId, input?: {date?, count?, value?}) => Promise<HabitCompletion>` | UPSERT per (habit,date) (HB-3); recomputes streak cache     |
| `logDetailedCompletion` | `(habitId, input) => Promise<HabitCompletion>`                           | + mood/ease/satisfaction (1–5) / location / completion_time |
| `editCompletion`        | `(habitId, date, patch) => Promise<HabitCompletion>`                     | re-derives counters; throws if completion missing           |
| `deleteCompletion`      | `(habitId, date) => Promise<void>`                                       | hard delete (ledger); re-derives counters                   |

The streak cache (`current_streak`/`longest_streak`/`total_completions`) is a projection recomputed on every
mutation — `isScheduledOn` (daily→all; else→`days_of_week` weekday) + a done-gate (`count>=target`) + the
grace/reset walk. `asOf` injected via the optional `clock` dep (default today). `HabitsServiceDeps` gains `clock?`.

### S3 — backfill + window

| Method               | Signature                                                 | Notes                                                                                       |
| -------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `backfillCompletion` | `(habitId, pastDate, input?) => Promise<HabitCompletion>` | past-date completion + recompute; rejects future / beyond-window with `BackfillWindowError` |

Adds `HabitsServiceDeps.prefs?: HabitsPrefsPort` (`{ backfillWindowDays(): Promise<number|null> }`) — **permissive
(fail-OPEN)** default: null window = no limit. The not-future + within-window guard (`assertDateWritable`) runs on
the shared completion write path (log/detailed/backfill), never on edit/delete. `BackfillWindowError` exported.

### S4 — derived reads + M5 seam (read-only)

| Method              | Signature                                         | Notes                                                                                                                                                                                                               |
| ------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getTodayHabits`    | `() => Promise<Habit[]>`                          | active + scheduled-today (grouping = ②)                                                                                                                                                                             |
| `getStreak`         | `(habitId) => Promise<StreakSummary>`             | reads the cache; the M5 seam                                                                                                                                                                                        |
| `getCompletionRate` | `(habitId, {from,to}) => Promise<CompletionRate>` | done ÷ scheduled; `rate:null` when scheduled==0; the M5 seam                                                                                                                                                        |
| `getMoodTrend`      | `(habitId, {from,to}) => Promise<MoodPoint[]>`    | per-completion mood points (charts = ②)                                                                                                                                                                             |
| `getCalendar`       | `(habitId, month) => Promise<CalendarDay[]>`      | month completions (`done = count>=target`)                                                                                                                                                                          |
| `getCompletionGrid` | `({from,to}) => Promise<HabitGridRow[]>`          | fe-calendar S6 (EC-7): every active habit (sort_order, id) × every day of the inclusive range → `{habit, days:{date, scheduled, count, done}[]}`; one ledger query; inverted/malformed range ⇒ zero days (BR-HB-35) |

Service-local DTOs (`HabitDateRange`/`StreakSummary`/`CompletionRate`/`MoodPoint`/`CalendarDay`; `@vida/types`
untouched — finance-S3 precedent). `HabitDateRange` (not `DateRange`) to avoid a `@vida/core` barrel collision with
`./services/journals`. Reads are pure (no cache write); per-habit reads fail loud on a missing habit. The pursuable
`rate` MEASURE value + goal-vs-habit target model stay the documented design-pass (rerun §5:146).

### S5 — effect fan-out + cross-module seams

| Method / export                                                                          | Signature                                             | Notes                                                                                     |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `contributeToPurposeMetrics`                                                             | `(habitId, completion) => Promise<void>`              | emit `contribute_purpose_metric`; throws `MetricContributionError` on failure             |
| `getEntityTags`                                                                          | `(entityType, entityId) => Promise<TagAssociation[]>` | deny-safe → [] without a resolver (finance FIN-35)                                        |
| `linkProject`/`unlinkProject`/`listProjectsForHabit`                                     | project_habits junction (KEPT, C1)                    | `linkProject` idempotent/resurrect-aware                                                  |
| `getDayCompletionDigest`                                                                 | `(date) => Promise<{due, done}>`                      | the Journal /summary consumption shape                                                    |
| `registerHabitsJournal(registry, svc)` · `HABIT_ENTITY_TYPE` · `MetricContributionError` | exports                                               | JournalContribution (summary → due/done); no `registerHabitsEffects` (emit-only producer) |

Completion effect fan-out: a DONE completion fires `complete_habit_occurrence`/`contribute_purpose_metric`/
`award_xp` — post-commit, guarded, idempotent (rail dedup), failure-isolated — from every done-leaving mutation
(log/detailed/backfill/edit). Deps gain `effects?: EffectsPort` + `associations?: AssociationResolver` (dormant/[]).

## ① BACKEND COMPLETE (S1–S5)

`createHabitsService` over DB-4 `habits` + `habit_completions` (+ `project_habits`): definition CRUD · completion
ledger + streak engine · backfill/window · derived reads + M5 seam · effect fan-out + cross-module seams. Deferred
(homed): the `rate` measure value + goal-vs-habit target model (design-pass, rerun §5:146) · `[E]` wiring (M3/DB-5)
· backfill-window setting (Preferences) · purpose/economy handler WRITES (Purpose/Gamification, M2). ② `fe-habits`
(LIF-182) owns all UI.

## Types & typed errors

- `@vida/types` `Habit` (reconciled: +`measurement_kind`/`binding_mode`/`success_criteria`/`difficulty`, −`tags`),
  `HabitCompletion` (+`updated_at`/`location`/`completion_time`). `[FACT: packages/types/src/habit.ts:41-101]`
- `CreateHabitInput`/`UpdateHabitInput` = `z.infer<CreateHabitSchema|UpdateHabitSchema>`.
- `HabitScheduleError` (custom-without-days). Not-found → Repository `Row not found` (no bespoke error).

## Verification (S1)

Repo typecheck 11/11 · `@vida/core` 1285 (→ +2 folds) · eslint 0 · 10 habits + 12 introspection live-store tests
(better-sqlite3 + `migrate()` 017 + `initVault()`). `[FACT: services/habits/__tests__/habits-service.test.ts]`

## Change Log

| Date       | Slice | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-23 | S1    | born — definition CRUD + `@vida/types` reconcile; §XXVI g1 SHIP + Verification Gate + g2 code-review SHIP (3 NITs folded)                                                                                                                                                                                                                                                                                                                                                               |
| 2026-09-23 | S2    | completion ledger + streak-recompute engine; §XXVI g1 SHIP (streak algo hand-walked) + Verification Gate (35 habits tests, @vida/core 1297) + g2 code-review SHIP (future-date comment + 2 hardening tests folded)                                                                                                                                                                                                                                                                      |
| 2026-09-23 | S3    | backfill + window (permissive fail-OPEN Preferences port); future/beyond-window reject; §XXVI g1 REVISE→fixed (fail-OPEN vs deny-safe terminology) + Verification Gate (41 habits tests, @vida/core 1305) + g2 code-review SHIP (clock-hoist folded)                                                                                                                                                                                                                                    |
| 2026-09-23 | S4    | derived reads (today-list/streak/completion-rate/mood/calendar) + M5 seam; `rate` measure = design-pass; §XXVI g1 SHIP + Verification Gate (49 habits tests, @vida/core 1312) + g2 code-review SHIP (off-schedule-exclusion test folded; DateRange→HabitDateRange barrel-collision fix)                                                                                                                                                                                                 |
| 2026-09-23 | S5    | effect fan-out (guarded/idempotent/post-commit/isolated, on every done-leaving mutation) + entity_tags + project_habits + Journal contribution; emit-only producer (no registerHabitsEffects); §XXVI g1 REVISE→fixed (B1 edit-flip-to-done missed-fire; B2 getEntityTags signature; 4 NITs) + Verification Gate (58 habits tests, @vida/core 1322) + g2 code-review SHIP (idempotency key traced byte-by-byte). **① BACKEND COMPLETE.** EffectsPort barrel-collision (not re-exported). |
