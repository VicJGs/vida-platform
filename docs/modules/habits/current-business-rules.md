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

## S2 — Completion ledger + streak-recompute engine

- **BR-HB-10 · One completion per (habit, date) — UPSERT (HB-3).** `logCompletion`/`logDetailedCompletion` on an
  existing `(habit_id, completed_date)` UPDATE that row (only the sent keys); never a duplicate. `date` defaults to
  the clock (today); `count` defaults 1. The ledger has no `deleted_at` → `softDelete:false` (hard delete). `[FACT: services/habits/service.ts:200-207; db/schema/habits.ts:108-111]`
- **BR-HB-11 · "Done" = `count >= target_count` (HB-5).** Only a done completion advances the streak; a partial is
  persisted (analytics) but does not. `value` (REAL) is analytics-only. `[FACT: services/habits/service.ts:82]`
- **BR-HB-12 · Scheduled occurrence = `days_of_week` (HB-2/HB-6).** `isScheduledOn`: `daily` → every day; else →
  `weekday(date) ∈ days_of_week` (0=Sun). The weekly/biweekly/monthly PERIOD is the `rate`-derivation design-pass
  (rerun §5:146), NOT a streak input. Shared with the S4 today-list. `[FACT: services/habits/service.ts:71-75; business-rules.md:12-13; realignment .../part-1.2-reruns/habits.md:146]`
- **BR-HB-13 · Streak recompute is deterministic from the ledger (HB-2).** On every log/detailed/edit/delete,
  recompute all three cache columns by walking scheduled dates earliest-done→asOf: done → run++/longest=max;
  `asOf` not-done → grace-skip; elapsed scheduled miss → reset 0 (no grace). `asOf` injected via the `clock` dep.
  Generalizes the checkins `computeStreak`. `[FACT: services/habits/service.ts:79-101; checkins/service.ts:113-135]`
- **BR-HB-14 · `total_completions` = all done rows (incl. off-schedule).** ≠ the scheduled subset the streak walks;
  a future-dated done row counts in total but is excluded from the walk (hasn't happened). `[FACT: services/habits/service.ts:82,96-100]`
- **BR-HB-15 · Cache is a self-healing projection (BR-S2-7).** The ledger mutation + cache write are sequential
  (not one tx); a stale cache re-derives on the next mutation (HB-2 self-heal). `[FACT: services/habits/service.ts:184-188]`
- **BR-HB-16 · Ratings 1–5 (HB-7).** `logDetailedCompletion` validates `mood_before/mood_after/ease_rating/
  satisfaction ∈ 1–5` (Zod, the enforced service guard — SQL CHECK is migration-only). `[FACT: validators/habit.ts:56-67]`
- **BR-HB-17 · Fail-loud on missing parent/row.** log/edit/delete on a missing (or soft-deleted) habit throw
  `Habit not found` (no orphan completion — no FK guards it); edit/delete on a missing completion throw. `[FACT: services/habits/service.ts:177-181,247-249,257-259]`

## S3 — Backfill + window policy

- **BR-HB-18 · Backfill = a past-dated completion, recomputes streaks (HB-10).** `backfillCompletion(habitId,
  pastDate, input)` routes through the shared S2 upsert+recompute path. `[FACT: services/habits/service.ts:290]`
- **BR-HB-19 · The date guard is on the shared write path.** `assertDateWritable(date, asOf)` runs at the top of
  `upsertCompletion` — so `logCompletion`/`logDetailedCompletion`/`backfillCompletion` are all guarded and can't be
  bypassed; `editCompletion`/`deleteCompletion` (existing rows) are not. `[FACT: services/habits/service.ts:205-225]`
- **BR-HB-20 · Reject future dates (BR-S3-3).** `date > asOf` (lexical) → `BackfillWindowError` — a completion can't
  be logged for a day that hasn't happened. `[FACT: services/habits/service.ts:206]`
- **BR-HB-21 · Window is FAIL-OPEN / permissive (HB-10).** The window value comes from a Preferences port
  (`habit_backfill_window_days`, Preferences-owned); unconfigured (`null`) → NO limit (allow). This is deliberately
  the OPPOSITE of the fail-closed security ports — the window is a user convenience policy the user owns, never a
  hidden default limit. Beyond `asOf − w` (day-math) → `BackfillWindowError`. `[FACT: services/habits/service.ts:110-112,206-212; business-rules.md:42-45]`
- **BR-HB-22 · Reject → no row, no cache change (BR-S3-5).** The guard precedes any write. `[FACT: business-rules.md:75; services/habits/service.ts:220]`

## S4 — Derived reads + M5 seam (read-only)

- **BR-HB-23 · `getTodayHabits` — computed schedule read (HB-6).** Active, non-deleted habits scheduled for today
  (`isScheduledOn` over rows); returns flat `Habit[]` (grouping into display modes is ②). `[FACT: services/habits/service.ts]`
- **BR-HB-24 · `getStreak` reads the cache (HB-2).** Returns `{current, longest, total}` from the S2-maintained
  cache; not a re-walk; no write. `[FACT: services/habits/service.ts]`
- **BR-HB-25 · `getCompletionRate` = done ÷ scheduled over a range.** Counts scheduled occurrences + done ones in
  `[from,to]`; off-schedule done rows are in NEITHER count; `rate = null` when `scheduled==0` (nothing due — not a
  silent 0). `[INTERP grounded HB-5; services/habits/service.ts]`
- **BR-HB-26 · `getMoodTrend` / `getCalendar`.** Mood points (nulls preserved, ascending) / month completions
  (`done = count>=target`) over the ledger — the charts/calendar render is ②. `[FACT: services/habits/service.ts]`
- **BR-HB-27 · M5 measure read seam (R7).** `getStreak`/`getCompletionRate` ARE the queryable measures
  Journal/Purpose read through. The pursuable `rate` MEASURE VALUE + goal-vs-habit target model remain the
  documented design-pass (rerun §5:146) — NOT built here. `[FACT: parts/habits.md:25,66; rerun §5:146]`
- **BR-HB-28 · Reads are pure + fail-loud.** No mutation; per-habit reads throw `Habit not found` on a missing/
  soft-deleted habit. `[FACT: services/habits/service.ts]`

## S5 (pending)
Effect fan-out (`complete_habit_occurrence`/`contribute_purpose_metric`/`award_xp`) + cross-module seams
(entity_tags/pages/project_habits) + `registerHabitsJournal`/`registerHabitsEffects`.
