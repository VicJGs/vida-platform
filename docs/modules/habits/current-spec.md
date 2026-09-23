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
| Method | Signature | Notes |
|--------|-----------|-------|
| `createHabit` | `(input: CreateHabitInput) => Promise<Habit>` | Zod-validated; `HabitScheduleError` on custom-without-days; faithful echo (BR-HB-3) |
| `updateHabit` | `(id, patch: UpdateHabitInput) => Promise<Habit>` | partial patch; re-validates; patch-level schedule guard; `Row not found` if missing |
| `softDeleteHabit` | `(id) => Promise<void>` | sets `deleted_at`; ledger untouched (BR-HB-5) |
| `getHabit` | `(id) => Promise<Habit \| null>` | excludes soft-deleted |
| `listHabits` | `(filter?: HabitFilter) => Promise<Habit[]>` | `HabitFilter { is_active?, domain?, habit_type? }`; explicit `isNull(deleted_at)` |

### S2 — completion ledger + streak recompute
| Method | Signature | Notes |
|--------|-----------|-------|
| `logCompletion` | `(habitId, input?: {date?, count?, value?}) => Promise<HabitCompletion>` | UPSERT per (habit,date) (HB-3); recomputes streak cache |
| `logDetailedCompletion` | `(habitId, input) => Promise<HabitCompletion>` | + mood/ease/satisfaction (1–5) / location / completion_time |
| `editCompletion` | `(habitId, date, patch) => Promise<HabitCompletion>` | re-derives counters; throws if completion missing |
| `deleteCompletion` | `(habitId, date) => Promise<void>` | hard delete (ledger); re-derives counters |

The streak cache (`current_streak`/`longest_streak`/`total_completions`) is a projection recomputed on every
mutation — `isScheduledOn` (daily→all; else→`days_of_week` weekday) + a done-gate (`count>=target`) + the
grace/reset walk. `asOf` injected via the optional `clock` dep (default today). `HabitsServiceDeps` gains `clock?`.

### S3 — backfill + window
| Method | Signature | Notes |
|--------|-----------|-------|
| `backfillCompletion` | `(habitId, pastDate, input?) => Promise<HabitCompletion>` | past-date completion + recompute; rejects future / beyond-window with `BackfillWindowError` |

Adds `HabitsServiceDeps.prefs?: HabitsPrefsPort` (`{ backfillWindowDays(): Promise<number|null> }`) — **permissive
(fail-OPEN)** default: null window = no limit. The not-future + within-window guard (`assertDateWritable`) runs on
the shared completion write path (log/detailed/backfill), never on edit/delete. `BackfillWindowError` exported.

### S4–S5 (pending)
`getTodayHabits`/`getStreak`/`getCompletionRate`/`getMoodTrend`/`getCalendar` (S4) · effect fan-out +
`contributeToPurposeMetrics`/`getEntityTags` + `registerHabitsJournal`/`registerHabitsEffects` (S5).

## Types & typed errors
- `@vida/types` `Habit` (reconciled: +`measurement_kind`/`binding_mode`/`success_criteria`/`difficulty`, −`tags`),
  `HabitCompletion` (+`updated_at`/`location`/`completion_time`). `[FACT: packages/types/src/habit.ts:41-101]`
- `CreateHabitInput`/`UpdateHabitInput` = `z.infer<CreateHabitSchema|UpdateHabitSchema>`.
- `HabitScheduleError` (custom-without-days). Not-found → Repository `Row not found` (no bespoke error).

## Verification (S1)
Repo typecheck 11/11 · `@vida/core` 1285 (→ +2 folds) · eslint 0 · 10 habits + 12 introspection live-store tests
(better-sqlite3 + `migrate()` 017 + `initVault()`). `[FACT: services/habits/__tests__/habits-service.test.ts]`

## Change Log
| Date | Slice | Change |
|------|-------|--------|
| 2026-09-23 | S1 | born — definition CRUD + `@vida/types` reconcile; §XXVI g1 SHIP + Verification Gate + g2 code-review SHIP (3 NITs folded) |
| 2026-09-23 | S2 | completion ledger + streak-recompute engine; §XXVI g1 SHIP (streak algo hand-walked) + Verification Gate (35 habits tests, @vida/core 1297) + g2 code-review SHIP (future-date comment + 2 hardening tests folded) |
| 2026-09-23 | S3 | backfill + window (permissive fail-OPEN Preferences port); future/beyond-window reject; §XXVI g1 REVISE→fixed (fail-OPEN vs deny-safe terminology) + Verification Gate (41 habits tests, @vida/core 1305) + g2 code-review SHIP (clock-hoist folded) |
