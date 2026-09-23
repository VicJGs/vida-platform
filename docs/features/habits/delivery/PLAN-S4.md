# PLAN — S4 · Derived reads: today-list + analytics + M5 seam
# Spec: feature:mod-habits · slice S4 (§XXVI g1) · Status: draft
# No-Guessing: every claim [FACT: path:line] / [INTERP] / [UNKNOWN]. Grounded per Victor's standing directive.

## 1. Identity
S4 adds the read-only derived surface: `getTodayHabits` (HAB-05) + `getStreak`/`getCompletionRate`/`getMoodTrend`/
`getCalendar` (HAB-15), all derived-from-ledger/cache. These ARE the ADR-011 **M5 measure read seam** (R7) —
`streak(habit)`/completion-rate advertised as queryable measures Journal/Purpose read THROUGH. `[FACT: parts/habits.md:15,25; contract.md:20-24]`
NOT in S4: any WRITE (S1–S3 own writes); the today-list 3 display modes / charts render (② fe-habits); the
pursuable `rate` MEASURE VALUE + goal-vs-habit target model (the design-pass, rerun §5:146); effects (S5).

## 2. Business Rules (S4 slice)
- **BR-S4-1 · `getTodayHabits` is a computed schedule read (HB-6).** Returns the active (`is_active`, not deleted)
  habits scheduled for `asOf` (reuses the S2 `isScheduledOn`). Each carries its `time_of_day`; the **grouping into
  Calendar/List/Checkbox modes is ② fe-habits** — the service returns the flat due-today `Habit[]`, never stored.
  `[FACT: business-rules.md:25-27; conventions.md:19; parts/habits.md:15]`
- **BR-S4-2 · `getStreak` reads the cache.** Returns `{ current, longest, total }` from the habit's
  `current_streak`/`longest_streak`/`total_completions` (S2 keeps them fresh; HB-2). Not a re-walk. `[FACT: contract.md:23; services/habits/service.ts (S2 cache)]`
- **BR-S4-3 · `getCompletionRate` = done ÷ scheduled in range.** Over an inclusive `{from,to}` window: count
  scheduled occurrences (isScheduledOn) and done ones (a completion with `count>=target` on a scheduled date);
  `rate = done/scheduled` (null when `scheduled==0` — the legitimate "nothing scheduled" empty state, never a
  silent 0). `[INTERP grounded HB-5 + isScheduledOn; contract.md:22]`
- **BR-S4-4 · `getMoodTrend` = the per-completion mood points in range.** Returns `{date, mood_before, mood_after,
  ease_rating, satisfaction}[]` (nulls preserved) for completions in `[from,to]`, ascending — the charts are ②.
  `[FACT: contract.md:22; business-rules.md:28-30]`
- **BR-S4-5 · `getCalendar` = the month's completions.** Returns `{date, count, done}[]` for completions in a
  `YYYY-MM` month (for the calendar view render, ②). `[FACT: contract.md:24; identity.md:20]`
- **BR-S4-6 · M5 seam (R7).** `getStreak` + `getCompletionRate` ARE the queryable-measure read seam Journal/Purpose
  consume — a read-through, not a cross-module table read. S4 exposes them; the pursuable `rate` MEASURE VALUE
  (measurement-engine) + goal-vs-habit target model stay the documented design-pass. `[FACT: parts/habits.md:25,66; rerun §5:146]`
- **BR-S4-7 · Reads are pure, no writes.** No ledger/cache mutation; missing habit → the reads return an empty/zero
  shape or throw consistently (see §3). `[FACT: business-rules.md:74 (analytics terminal states)]`

## 3. Contract (S4 — appended; DTOs service-local, @vida/types untouched, the finance-S3 precedent)
```
getTodayHabits(): Promise<Habit[]>                                  // active + scheduled for asOf
getStreak(habitId: string): Promise<{ current: number; longest: number; total: number }>
getCompletionRate(habitId: string, range: { from: string; to: string }): Promise<{ scheduled: number; done: number; rate: number | null }>
getMoodTrend(habitId: string, range: { from: string; to: string }): Promise<MoodPoint[]>          // MoodPoint = {date, mood_before, mood_after, ease_rating, satisfaction}
getCalendar(habitId: string, month: string): Promise<CalendarDay[]>                                // CalendarDay = {date, count, done}
```
`getStreak`/rate/mood/calendar on a missing (or soft-deleted) habit → `Habit not found` (loadHabitOrThrow, S2
precedent). `getTodayHabits` over an empty set → `[]`. `[FACT: services/finance/types.ts:103-183 (service-local DTO precedent)]`

## 4. Acceptance (✓live)
- [ ] `getTodayHabits` returns only active habits scheduled today; excludes off-schedule + soft-deleted ✓live
- [ ] `getTodayHabits` excludes a non-scheduled-today habit + a `weekly` habit with null `days_of_week` (no schedule; the `custom`-empty case is unreachable — createHabit rejects it, BR-S1-2) ✓live
- [ ] `getStreak` reflects the cache after S2 mutations ✓live
- [ ] `getCompletionRate` = done/scheduled over a range; `scheduled==0` → `rate: null` (not 0) ✓live
- [ ] `getMoodTrend` returns the range's mood points ascending, nulls preserved ✓live
- [ ] `getCalendar` returns a month's completions with `done` = `count>=target` ✓live
- [ ] a read on a missing habit throws `not found` (getStreak/rate/mood/calendar) ✓live
- [ ] `tsc` 0 · eslint 0 · full `@vida/core` suite green

## 5. Implementation Prompt (ordered; cites §2)
1. **`services/habits/types.ts`** — add DTOs `StreakSummary`, `CompletionRate`, `MoodPoint`, `CalendarDay`, and the
   5 method sigs on `HabitsService`. (Service-local DTOs; `@vida/types` untouched — the finance-S3 precedent.)
2. **`services/habits/service.ts`** — add the 5 read methods. `getTodayHabits`: read ROWS directly —
   `habitsRepo.findWhere(and(isNull(deleted_at), eq(is_active, true)))` — filter with the existing
   `isScheduledOn(row, clock())` (ONE predicate; do NOT route through `listHabits`, whose `Habit[]` has a parsed
   `number[]` days_of_week incompatible with `isScheduledOn(HabitRow)`; do NOT add a second Habit overload — g1
   NIT-1/2), then `toHabit`. IR-8: a `custom` habit with empty `days_of_week` simply never matches (the predicate's
   `[].includes(...)` → false). `getStreak`: read the habit, return the 3 cache fields. `getCompletionRate`: walk
   scheduled days in `[from,to]`, count done (reuse the S2 done-gate + day iteration). `getMoodTrend`/`getCalendar`:
   `findWhere` completions in range, map to the DTO. All read-only. `loadHabitOrThrow` guards the per-habit reads.
3. **`services/habits/__tests__/habits-service.test.ts`** — add an S4 describe block for §4 (deterministic clock).
4. Run typecheck + `test -- habits` (Node 24) + eslint. Done = §4 green → S4 Verification Gate.

## 6. Open UNKNOWNs
- [UNKNOWN → design-pass, NOT S4] the pursuable `rate` MEASURE value + goal-vs-habit target model (rerun §5:146).
  S4 ships `getCompletionRate` (analytics ratio) + advertises the M5 seam; it does NOT compute the measurement-engine
  `rate` measure. Flagged, not built.

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-09-23 | 2026-09-23-mod-habits | S4 PLAN — read-only derived surface + M5 seam; grouping/charts = ②; pursuable rate measure = design-pass |
