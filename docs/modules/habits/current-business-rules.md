<!-- CURRENT business rules — module: habits · living doc (§XXIX). Promoted from the MOD-habits ① build
     (LIF-125). Cite code [FACT: path:line]. As-built; refreshed per slice. Scope so far: S1. -->

# Habits — Current Business Rules

> Status: ① backend in progress — **S1 (definition CRUD + `@vida/types` reconcile) landed**. S2–S5 append.
> Authority for intent: `docs/features/habits/{identity,business-rules,contract,structure-data,conventions}.md`
> + `docs/specs/foundation/backend-intent/parts/habits.md` (HAB-01…28). This doc records what the CODE enforces.

## S1 — Definition CRUD (`createHabitsService`)

- **BR-HB-1 · Enum validation (HAB-24).** `createHabit`/`updateHabit` validate every enum via Zod
  (`CreateHabitSchema`/`UpdateHabitSchema`, `z.enum` over the `@vida/types` tuples) — `habit_type`, `frequency`,
  `time_of_day`, `domain`, `measurement_kind`, `binding_mode`, `difficulty`. `[FACT: packages/core/src/validators/habit.ts:29-52; services/habits/service.ts:86,95]`
- **BR-HB-2 · `custom` frequency requires `days_of_week`.** A create (or a patch setting `frequency:'custom'`)
  with no `days_of_week` is refused with `HabitScheduleError` — never silently persisted (it could never enter the
  today-list). The update guard checks the PATCH, not the merged row. `[FACT: services/habits/service.ts:82-86,95-98,116-120; types.ts:34-39]`
- **BR-HB-3 · Faithful create-echo.** `Repository.create` echoes the input row, so `serializeHabit` backfills every
  notNull-default (`habit_type:'build'`, `frequency:'daily'`, `target_count:1`, streak cache `0`, `is_active:true`,
  `sort_order:0`, `measurement_kind:'rate'`, `time_of_day:'anytime'`) and coalesces every nullable to `null`. `[FACT: services/habits/service.ts:47-70]`
- **BR-HB-4 · Streak cache is read-only in S1.** `current_streak`/`longest_streak`/`total_completions` are written
  at `0` on create and NEVER recomputed here — the cache is derived-from-ledger; recompute is S2 (HB-2). `[FACT: services/habits/service.ts:60-62]`
- **BR-HB-5 · Soft-delete preserves the ledger.** `softDeleteHabit` sets `deleted_at` (Repository `softDelete:true`)
  and hides the habit from `getHabit`/`listHabits`; it does NOT touch `habit_completions`. No hard-delete surface
  exists in M1.0, so the HB-11 hard-delete cascade is not exercised here. `[FACT: services/habits/service.ts:100-102; db/schema/habits.ts:84]`
- **BR-HB-6 · Soft-deleted rows never leak.** `listHabits` adds `isNull(deleted_at)` as the first, unconditional
  clause (findWhere does not auto-filter); `getHabit` relies on `findById`'s built-in exclusion. `[FACT: services/habits/service.ts:112-121]`
- **BR-HB-7 · JSON boundary.** `days_of_week`/`times_of_day` serialize to JSON TEXT on write and parse on read;
  the read is defensive (malformed JSON degrades to `null`, never throws). `[FACT: services/habits/service.ts:31-45,52,56]`
- **BR-HB-8 · `[E]` pass-through (M1.0).** The habits repo registers `encryptedFields:[]` though
  `name/description/unit/cue/reward/success_criteria` are `[E]`; field-level wiring → M3/DB-5. `[FACT: services/habits/service.ts:41; db/schema/habits.ts:35-37,56-82]`
- **BR-HB-9 · Not-found is fail-loud.** `updateHabit`/`softDeleteHabit` on a missing id throw the Repository's
  `Row not found` — no bespoke not-found error, no silent no-op. `[FACT: packages/core/src/db/repository.ts:412-414]`
- **Terminal states (S1):** `listHabits` → empty `[]` | rows | typed read error; `getHabit` → `null` | row;
  `createHabit`/`updateHabit` → row | `ZodError`/`HabitScheduleError`. `[FACT: docs/features/habits/business-rules.md:68-76]`

## S2–S5 (pending)
Completion ledger + streak recompute engine · backfill + window · derived reads (today-list/analytics/M5) ·
effect fan-out + cross-module seams — appended as each slice's Verification Gate passes.
