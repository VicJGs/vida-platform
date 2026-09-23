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

### S2–S5 (pending)
`logCompletion`/`logDetailedCompletion`/`editCompletion`/`deleteCompletion` + streak engine (S2) ·
`backfillCompletion` (S3) · `getTodayHabits`/`getStreak`/`getCompletionRate`/`getMoodTrend`/`getCalendar` (S4) ·
effect fan-out + `contributeToPurposeMetrics`/`getEntityTags` + `registerHabitsJournal`/`registerHabitsEffects` (S5).

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
