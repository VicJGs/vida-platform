# PLAN — S1 · Definition CRUD + validators + `@vida/types` reconcile
# Spec: feature:mod-habits · slice S1 (§XXVI g1) · Status: draft
# Source-repo: packages/core/src/services/habits · packages/core/src/validators/habit.ts · packages/types/src/habit.ts
# No-Guessing: every claim [FACT: path:line] / [INTERP] / [UNKNOWN]. Grounded per Victor's standing directive.

## 1. Identity
S1 births `createHabitsService` and the CRUD surface over the DB-4 `habits` table, plus the atomic `@vida/types`
reconcile that downstream slices depend on. Legs: **HAB-01, HAB-02, HAB-03, HAB-04, HAB-20 (axes expose/validate),
HAB-23 (habits-level restored fields), HAB-24, HAB-26 (E-seam), HAB-28**. `[FACT: parts/habits.md:11-14,20,23,24,26,28,33,38]`
NOT in S1: the completion ledger / streak engine (S2), any derivation (S4), any cross-module emit (S5). The 4 UI
view surfaces are ② `fe-habits`. `[FACT: delivery/slice-map.md]`

## 2. Business Rules (S1 slice)
- **BR-S1-1 · Enum validation (HAB-24).** `createHabit`/`updateHabit` validate via Zod (`z.enum` over the
  `@vida/types` tuples), mirroring the SQL CHECK: `habit_type∈{build,break}`, `frequency∈{daily,weekly,biweekly,
  monthly,custom}`, `time_of_day∈{morning,afternoon,evening,anytime,whole_day}`, `domain∈`LIFE_DOMAIN(8),
  `measurement_kind∈{quantitative,milestone,rate,qualitative}`, `binding_mode∈{manual,derived-pull,event-trigger}`,
  `difficulty∈{very_easy,easy,medium,hard,very_hard}`. Never a TS `enum`. `[FACT: db/schema/habits.ts:60-83; validators/habit.ts:4-6; business-rules.md:57-58]`
- **BR-S1-2 · `custom` requires `days_of_week` (IR-8, edge).** A `frequency:'custom'` habit with no `days_of_week`
  has no schedule → the create is rejected with a typed `HabitScheduleError` (it could never appear in the
  today-list, S4/HAB-05). `[FACT: business-rules.md:59-60; parts/habits.md:11,89]`
- **BR-S1-3 · Faithful create-echo (IR-2).** `Repository.create` echoes the input row, so `serializeHabit` MUST
  backfill every notNull-default column — `habit_type:'build'`, `frequency:'daily'`, `target_count:1`,
  `current_streak/longest_streak/total_completions:0`, `is_active:true`, `sort_order:0`, `measurement_kind:'rate'`,
  `time_of_day:'anytime'` — and coalesce every nullable to `null`. `[FACT: finance/service.ts:11-15,187-202; db/schema/habits.ts:60-83]`
- **BR-S1-4 · Streak cache is READ-ONLY to S1 (IR-1, C3).** `createHabit` writes the cache columns at their
  defaults (0); S1 NEVER accepts a caller-supplied streak value and NEVER recomputes (that is S2's engine). The
  cache is derived-from-ledger. `[FACT: business-rules.md:14-16; parts/habits.md:58; db/schema/habits.ts:73-75]`
- **BR-S1-5 · Soft-delete preserves the ledger (HB-11).** `softDeleteHabit` sets `deleted_at` (Repository
  `softDelete:true`) and hides the habit from `listHabits`/`getHabit`; it does NOT touch `habit_completions`.
  **The HB-11 hard-delete cascade is NOT an M1.0 operation** — no hard-delete surface is exposed (matching
  finance's soft-only S1); the cascade is app-layer behavior for a future hard delete. `[FACT: business-rules.md:46-47; db/schema/habits.ts:76,84; finance/service.ts:169]`
  *(Corrects slice-map S2 "app-layer cascade" — soft-delete does not cascade; noted there.)*
- **BR-S1-6 · `[E]` pass-through (IR-4, HAB-26).** The habits repo registers `encryptedFields:[]` in M1.0 even
  though `name/description/unit/cue/reward/success_criteria` are `[E]`; field-level wiring → M3/DB-5. `[FACT: db/schema/habits.ts:35-37,56-82]`
- **BR-S1-7 · `@vida/types` reconcile (HAB-28, IR-9).** `Habit` gains `measurement_kind`, `binding_mode`,
  `success_criteria`, `difficulty` and DROPS the retired inline `tags`; `HabitCompletion` gains `updated_at`,
  `location`, `completion_time`. In-scope now (HAB-28/HAB-23 home the authoring to "habits service / @vida/types";
  FIN-27 precedent), not a deferred DB-11 mirror-only reconcile — the schema header comment is superseded. `[FACT: parts/habits.md:33,38; db/schema/habits.ts:32-33,79-83,105-107; finance/delivery/slice-map.md:79]`
- **BR-S1-8 · Row→interface cast.** `toHabit(r)` spreads the row + casts `_sync_status` string→union (the whole-repo
  DB-11 seam); the `days_of_week`/`times_of_day` JSON-text columns parse to `number[]`/`string[]` on read and
  `JSON.stringify` on write (the checkins JSON boundary). `[FACT: finance/service.ts:100; checkins/service.ts:66-88,189-217; db/schema/habits.ts:62,67]`
- **Terminal states (S1 surface):** `listHabits` → empty (`[]`, no habits) | success (rows) | error (typed read).
  `getHabit(id)` → `null` (not found / soft-deleted) | success. `createHabit`/`updateHabit` → success | typed
  validation error (ZodError / HabitScheduleError). `[FACT: business-rules.md:68-76]`

## 3. Contract (S1)
`createHabitsService(deps: HabitsServiceDeps): HabitsService` — deps `{ db, deviceId }` (later-slice ports added
per slice). S1 methods:
```
createHabit(input: CreateHabitInput): Promise<Habit>
updateHabit(id: string, patch: UpdateHabitInput): Promise<Habit>
softDeleteHabit(id: string): Promise<void>
getHabit(id: string): Promise<Habit | null>
listHabits(filter?: HabitFilter): Promise<Habit[]>   // HabitFilter: { is_active?, domain?, habit_type? } (M1)
```
Typed errors: `HabitScheduleError` (BR-S1-2); `ZodError` (validation). No bespoke not-found error (Repository
`update`/`delete` throw on missing — finance dropped its redundant guard). `[FACT: finance/service.ts + TASKS.md finance S1 decision]`

## 4. Acceptance (S1 — every item a live-store test where marked ✓live)
- [ ] `@vida/types` `Habit` reconciled (+4 −`tags`), `HabitCompletion` (+3); `pnpm typecheck` green repo-wide (no consumer break)
- [ ] `validators/habit.ts` extended: `CreateHabitSchema`/`UpdateHabitSchema` + the 4 new enum schemas; `enum-parity.test.ts` still green
- [ ] `createHabit` persists + echoes a FAITHFUL row (defaults backfilled, nullables null) ✓live
- [ ] `createHabit` with `frequency:'custom'` + no `days_of_week` → `HabitScheduleError`, no row written ✓live
- [ ] `createHabit` with a bad enum → `ZodError` ✓live
- [ ] `updateHabit` re-validates + persists a patch; `days_of_week` round-trips through JSON ✓live
- [ ] `softDeleteHabit` hides from `listHabits`/`getHabit`; the completion ledger is untouched ✓live
- [ ] `listHabits(filter)` narrows by `is_active`/`domain`/`habit_type` ✓live
- [ ] `tsc --noEmit` 0 errors; `eslint` 0; the S1 Verification Gate (Vitest + ≥2 failure paths + live-store on migrate()'d 017, initVault() first) PASSES

## 5. Implementation Prompt (ordered; cites §2/§3; nothing invented)
1. **`packages/types/src/habit.ts`** — reconcile per BR-S1-7. Add imports `MeasurementKind, BindingMode` from
   `./measurement`; `Habit`: add `measurement_kind: MeasurementKind`, `binding_mode: BindingMode | null`,
   `success_criteria: string | null` (`@encrypted`), `difficulty: HabitDifficulty | null`; **remove** `tags`.
   `HabitCompletion`: add `updated_at: Timestamp`, `location: string | null` (`@encrypted`), `completion_time:
   Timestamp | null`. (Resolve the `time_of_day` divergence: keep `time_of_day: HabitTimeOfDay` non-null — the DB
   default 'anytime' guarantees a value; the mapper/serialize coalesce, BR-S1-3/BR-S1-8.) `[FACT: db/schema/habits.ts:66,79-83,96,105-107]`
2. **`packages/core/src/validators/habit.ts`** — extend (mirror `validators/finance.ts` structure — READ it first
   for the `Fields.partial().extend()` shape). Add `MeasurementKindSchema`/`BindingModeSchema` (re-export from
   `./measurement`), `HabitDifficultySchema`=`z.enum(HABIT_DIFFICULTY)`, `LifeDomainSchema`=`z.enum(LIFE_DOMAIN)`;
   `CreateHabitSchema` (name required; enums validated; defaults optional; `days_of_week`/`times_of_day` as
   `z.array(...)`), `UpdateHabitSchema` = partial. Satisfies BR-S1-1. `[FACT: validators/finance.ts; validators/habit.ts:1-6]`
3. **`packages/core/src/services/habits/types.ts`** — `HabitsServiceDeps { db: DrizzleDb; deviceId: string }`
   (ports appended per later slice, with comments as finance did); `CreateHabitInput`/`UpdateHabitInput` =
   `z.infer<...>`; `HabitFilter`; the `HabitsService` interface (S1 methods now, later-slice methods appended
   per slice per finance's staged interface); `HabitScheduleError` (`.name` set). Satisfies §3. `[FACT: finance/types.ts:38-101,244-333]`
4. **`packages/core/src/services/habits/service.ts`** — `createHabitsService`: destructure `{ db, deviceId }`,
   `cfg = { deviceId, encryptedFields: [], softDelete: true }`, `habitsRepo = createRepository(db, habits, cfg)`.
   `toHabit(r)` mapper (spread + `_sync_status` cast + JSON-parse `days_of_week`/`times_of_day`, BR-S1-8).
   `serializeHabit` (BR-S1-3 backfill/coalesce + JSON.stringify the arrays). `createHabit` (BR-S1-2 guard →
   `HabitScheduleError`; parse via `CreateHabitSchema`; `habitsRepo.create`), `updateHabit`, `softDeleteHabit`,
   `getHabit`, `listHabits(filter)` (findWhere + explicit `isNull(deleted_at)`, IR-3). Factory-object, hoisted
   closures, no `this.`. `[FACT: finance/service.ts:167-202; interpretation IR-2/IR-3; checkins JSON precedent]`
5. **`packages/core/src/services/habits/index.ts`** — barrel: `createHabitsService` + the `HabitsService`/deps/input
   types + `HabitScheduleError`. Register in `packages/core/src/index.ts` (READ how finance is exported). `[FACT: finance/index.ts:1-94]`
6. **`packages/core/src/services/habits/__tests__/habits-service.test.ts`** — live-store harness (better-sqlite3
   in-memory + `initVault()` + `migrate()` applies 017; the finance test setup precedent). Cover every §4 ✓live item.
7. Run: `pnpm --filter @vida/core typecheck && pnpm typecheck` (repo) `&& pnpm --filter @vida/core test` (Node 24)
   `&& pnpm --filter @vida/core lint`. Done = §4 all green → S1 Verification Gate.

## 6. Open UNKNOWNs
- [UNKNOWN → read at impl] the exact `validators/finance.ts` `Fields.partial().extend()` shape (mirror it; do not invent a divergent validator style).
- [UNKNOWN → read at impl] whether `@vida/core/index.ts` exports services individually or via a services barrel (match the finance registration exactly).

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-09-23 | 2026-09-23-mod-habits | S1 PLAN drafted from the approved decomposition + the finance S1 precedent |
