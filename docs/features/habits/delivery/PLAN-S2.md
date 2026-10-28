# PLAN — S2 · Completion ledger + streak-recompute engine

# Spec: feature:mod-habits · slice S2 (§XXVI g1) · Status: draft

# Source-repo: packages/core/src/services/habits · packages/core/src/validators/habit.ts

# No-Guessing: every claim [FACT: path:line] / [INTERP] / [UNKNOWN]. Grounded per Victor's standing directive.

## 1. Identity

S2 adds the `habit_completions` ledger CRUD and the **flagship streak-recompute engine** (HB-2). Legs:
**HAB-07, HAB-08, HAB-09, HAB-10, HAB-11, HAB-12, HAB-14**. `[FACT: parts/habits.md:17-24]`
NOT in S2: backfill window policy (S3), the analytics READ surface `getStreak`/rate/mood/calendar (S4 — S2 only
KEEPS the cache fresh), any cross-module effect emit (S5), the `rate` measurement derivation (S4 design-pass).

## 2. Business Rules (S2 slice)

- **BR-S2-1 · One completion per (habit, date) — UPSERT (HB-3).** `logCompletion`/`logDetailedCompletion` on an
  existing `(habit_id, completed_date)` UPDATE that row; never a duplicate. `habit_completions` has no `deleted_at`
  → the repo uses `softDelete:false` (hard-delete ledger). `date` defaults to `asOf` (today); `count` defaults 1.
  `[FACT: business-rules.md:17-18; db/schema/habits.ts:93-114,108; parts/habits.md:17]`
- **BR-S2-2 · "Done" = `count >= target_count` (HB-5).** A completion counts as _done_ only when
  `count >= habit.target_count`. A **partial** (`count < target`) is persisted (analytics) but does NOT advance the
  streak. Over-achievement (`count > target`) is allowed and still done. `count` = repetitions (drives done);
  `value` (REAL) = measured quantity (analytics only). `[FACT: business-rules.md:22-24,61-62; parts/habits.md:18]`
- **BR-S2-3 · Break-habit semantics (HB-4).** A logged completion on a `habit_type:'break'` habit means "abstained
  today"; the streak mechanics are identical to build — a relapse is the ABSENCE of a done completion on a
  scheduled date (→ reset). Same ledger/upsert/recompute; only the meaning differs. `[FACT: business-rules.md:19-21; parts/habits.md:20]`
- **BR-S2-4 · The scheduled-occurrence predicate (HB-2/HB-6, grounded).** `isScheduledOn(habit, date)`:
  `frequency === 'daily'` → every day; else → `days_of_week` includes `weekday(date)` (0=Sun…6=Sat, matching the
  JSON `[0-6]` convention). The weekly/biweekly/monthly PERIOD is NOT a streak input — that is the documented
  `rate`-derivation design-pass (rerun §5:146), out of S2. This is the SAME predicate the S4 today-list (HB-6) will
  reuse. `[FACT: business-rules.md:12-13,25; intake/habits.md:50-51,65; conventions.md:11; realignment-master-plan/part-1.2-reruns/habits.md:146]`
- **BR-S2-5 · Streak recompute is deterministic from the ledger (HB-2 — the flagship).** On EVERY mutation
  (log/detailed/edit/delete; backfill is S3), recompute all three cache columns from the `habit_completions`
  ledger + the schedule; NEVER hand-increment. Algorithm (generalizes the checkins `computeStreak` from
  consecutive-days to consecutive-scheduled-occurrences; `asOf` injected for determinism):
  1. `doneDates` = `{ completed_date : count >= target_count }`.
  2. Walk scheduled dates ascending from the earliest `doneDate` to `asOf` (day-by-day, UTC, testing
     `isScheduledOn`), as a strict **ordered if / else-if** (branch precedence is load-bearing):
     `if (d ∈ doneDates)` → `run++`, `longest = max(longest, run)` · `else if (d === asOf)` → **skip**
     (today not yet missed — the grace analog of checkins' `gap ≤ 1`) · `else` → **`run = 0`** (a missed
     scheduled occurrence resets, no grace). The done-branch MUST precede the asOf-skip so a scheduled-AND-done
     `asOf` counts (never skipped).
  3. `current_streak` = the final `run`; `longest_streak` = the max seen.
     `[FACT: business-rules.md:12-16,64-65,83-84; conventions.md:6-8,11-12; services/checkins/service.ts:107-135]`
- **BR-S2-6 · `total_completions` = count of DONE completions.** `[INTERP grounded HB-5]` — the three counters are
  a coherent done-based cache; a partial is logged but is not "a completion" of the habit. Count of ALL ledger rows
  with `count >= target_count`, **including off-schedule done rows** (the ledger permits a completion on a
  non-scheduled date — no schedule CHECK). So `total_completions` ≠ the scheduled subset the streak walks: total =
  "how many times done, ever"; the streak counts only _scheduled_ done occurrences. `[INTERP: business-rules.md:22-24; structure-data.md:43-44]`
- **BR-S2-7 · Recompute-then-cache write.** After the ledger mutation, read the habit (frequency/days_of_week/
  target_count), recompute, and write the three cache columns via `habitsRepo.update`. The two writes are
  sequential (not one tx) — the cache is DERIVED and self-healing (HB-2: a stale/edited ledger → recompute from
  ledger, never trust the cache), so a mid-failure leaves the ledger correct and the cache re-derivable.
  `[FACT: business-rules.md:83-84; db/schema/habits.ts:73-75]`
- **BR-S2-8 · Ratings validation (HB-7).** `logDetailedCompletion` validates `mood_before/mood_after/ease_rating/
satisfaction` ∈ 1–5 (Zod, mirroring the SQL CHECK); a value out of range → typed validation error. `count`,
  `value`, `location`, `completion_time` are the other detailed fields. `[FACT: business-rules.md:28-30; db/schema/habits.ts:101-107; parts/habits.md:19]`
- **BR-S2-9 · Faithful echo + row→interface.** `serializeCompletion` backfills `count:1` default + coalesces
  nullables (`value/mood_*/location/completion_time → null`); `toCompletion(r)` casts `_sync_status`. No JSON cols
  on this table. `[FACT: db/schema/habits.ts:99-107; finance serialize precedent]`
- **Terminal states:** log/edit/backfill → success (persisted + streak recomputed) | typed error (revert, no silent
  loss). `[FACT: business-rules.md:72,79-80]`

## 3. Contract (S2 — appended to `HabitsService`)

```
logCompletion(habitId: string, input?: { date?: string; count?: number; value?: number | null }): Promise<HabitCompletion>
logDetailedCompletion(habitId: string, input: { date?: string; count?: number; value?: number | null;
  mood_before?: number | null; mood_after?: number | null; ease_rating?: number | null; satisfaction?: number | null;
  location?: string | null; completion_time?: number | null }): Promise<HabitCompletion>
editCompletion(habitId: string, date: string, patch: {...same optional fields...}): Promise<HabitCompletion>
deleteCompletion(habitId: string, date: string): Promise<void>
```

All four recompute the streak cache (BR-S2-5/7). Validators: `CreateCompletionSchema`/`UpdateCompletionSchema` in
`validators/habit.ts` (ratings 1–5). No new typed error (Zod covers validation; not-found on edit/delete →
Repository throw). `[FACT: contract.md:15-19; finance no-bespoke-not-found precedent]`

## 4. Acceptance (✓live = live-store test)

- [ ] `logCompletion` creates a row; re-logging the same date UPSERTs (1 row, updated) ✓live
- [ ] `logCompletion` with `count >= target` advances `current_streak`; a partial (`count < target`) does NOT ✓live
- [ ] consecutive scheduled days done → streak increments; a missed elapsed scheduled day → resets to 0 ✓live
- [ ] `asOf` scheduled AND done → counts toward `current_streak` (done-branch precedes the asOf-skip, NIT-1) ✓live
- [ ] a `custom`+`days_of_week` habit counts only its scheduled weekdays (an off-day gap does not break) ✓live
- [ ] today scheduled-but-not-done does NOT zero a prior streak (grace) ✓live
- [ ] `longest_streak` holds the all-time max across a reset ✓live
- [ ] `total_completions` counts done rows ✓live
- [ ] break-habit streak advances on logged abstain-days identically ✓live
- [ ] `logDetailedCompletion` persists mood/ratings; a rating out of 1–5 → validation error ✓live
- [ ] `editCompletion` / `deleteCompletion` re-derive all three counters ✓live
- [ ] `tsc --noEmit` 0 · eslint 0 · full `@vida/core` suite green (no S1 regression)

## 5. Implementation Prompt (ordered; cites §2; nothing invented)

1. **`validators/habit.ts`** — add `CompletionFields` (`count` int, `value` num nullable, `mood_*`/`ease_rating`/
   `satisfaction` `z.number().int().min(1).max(5).nullable()`, `location` str nullable, `completion_time` int
   nullable, `date`/`completed_date` calendarDate) → `CreateCompletionSchema`/`UpdateCompletionSchema`. Satisfies BR-S2-1/8. `[FACT: db/schema/habits.ts:99-107]`
2. **`services/habits/types.ts`** — append `HabitCompletion` return + input types (`LogCompletionInput`,
   `DetailedCompletionInput`, `EditCompletionInput`) + the 4 method signatures on `HabitsService`. `[FACT: contract.md:15-19]`
3. **`services/habits/service.ts`** — add `completionsRepo = createRepository(db, habitCompletions,
{ deviceId, encryptedFields: [], softDelete: false })`. Add pure helpers: `weekday(date)`, `isScheduledOn(habit,
date)` (BR-S2-4), `recomputeStreak(habit, completions, asOf)` (BR-S2-5, returns `{current, longest, total}`),
   `serializeCompletion`/`toCompletion` (BR-S2-9). Add `upsertCompletion` (find by `(habit_id, completed_date)` →
   update-or-create) used by log/detailed. After each mutation: read habit → recompute → `habitsRepo.update(habitId,
{current_streak, longest_streak, total_completions})` (BR-S2-7). Implement the 4 methods; `asOf` = today
   (`new Date().toISOString().slice(0,10)`) with an internal seam for test injection (mirror checkins). `[FACT: checkins/service.ts:107-135,439-446]`
4. **`services/habits/__tests__/habits-service.test.ts`** — add an S2 describe block covering every §4 ✓live item
   (inject `asOf` for deterministic streak dates). Reuse the harness.
5. Run: `pnpm --filter @vida/core typecheck && pnpm --filter @vida/core test -- habits` (Node 24) `&& eslint`.
   Done = §4 all green → S2 Verification Gate.

## 6. Open UNKNOWNs

- [UNKNOWN → read at impl] how checkins injects `asOf` in its service methods (the test-determinism seam) —
  mirror it (`computeCheckInStreak(asOf?)` precedent, `checkins/service.ts:439-446`).

## 7. Change Log

| Date       | Session               | Change                                                                                                                                                        |
| ---------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-23 | 2026-09-23-mod-habits | S2 PLAN drafted; streak model grounded (days_of_week schedule; period math = S4 design-pass per rerun §5:146); streak algo generalizes checkins computeStreak |
