# PLAN — S3 · Backfill + window policy

# Spec: feature:mod-habits · slice S3 (§XXVI g1) · Status: draft

# No-Guessing: every claim [FACT: path:line] / [INTERP] / [UNKNOWN]. Grounded per Victor's standing directive.

## 1. Identity

S3 adds `backfillCompletion` (HAB-13) — logging/editing a completion for a PAST date, recomputing streaks
(reusing the S2 engine), and rejecting a date beyond the user's configured backfill window (or in the future)
with a typed `BackfillWindowError`. The window VALUE is Preferences-owned (`habit_backfill_window_days`,
INTENDED) — S3 consumes it via a **permissive (fail-OPEN) port**. NB: this is deliberately the OPPOSITE of the
repo's fail-CLOSED "deny-safe" security ports (`effects`/`contributions`/`enforcer` deny by default) — the
backfill window is a user-owned _convenience_ policy, not a security gate, so an unconfigured window imposes no
limit. `[FACT: parts/habits.md:23; business-rules.md:42-45; contract.md:20]`
NOT in S3: the Preferences setting shape itself (Preferences build phase, `parts/habits.md:101`); reads (S4);
effects (S5).

## 2. Business Rules (S3 slice)

- **BR-S3-1 · Backfill = a dated completion in the past, recomputes streaks (HB-10).** `backfillCompletion(habitId,
pastDate, input)` routes through the SAME S2 upsert+recompute path (HB-3 upsert per (habit,date); HB-2 recompute).
  `[FACT: business-rules.md:42-45; parts/habits.md:23]`
- **BR-S3-2 · The date guard lives on the shared dated-WRITE path (not just the backfill method).** Any new dated
  completion write (`logCompletion`/`logDetailedCompletion`/`backfillCompletion`) is guarded so the window cannot be
  bypassed by passing an old/future `date` to `logCompletion`. `editCompletion`/`deleteCompletion` target an
  existing row (already within-window when logged) → NOT re-guarded. `[INTERP grounded HB-10 + the shared upsert path; services/habits/service.ts:200-207]`
- **BR-S3-3 · Reject a FUTURE date.** `date > asOf` (clock, lexical on YYYY-MM-DD) → `BackfillWindowError('future')`.
  A completion cannot be logged for a day that hasn't happened. This CLOSES the S2 future-date open state (g2
  NIT-1) — the S2 future-date test flips to assert rejection. `[INTERP grounded; services/habits/service.ts:96-100 comment]`
- **BR-S3-4 · Reject beyond the window (HB-10).** For `date < asOf`, if the Preferences port returns a window `w`
  (days), reject when `toDayNum(date) < toDayNum(asOf) − w` (day-math, not lexical) with `BackfillWindowError`.
  `w == null` (unconfigured / M1.0) → **no limit** (allow) — the window is a user-owned convenience policy, so the
  default is **FAIL-OPEN (permissive)**: never block a local write the user hasn't restricted (LF-2/HB-12), and
  never invent a hidden default limit. This is the OPPOSITE of the fail-CLOSED security ports (`effects`/
  `contributions`/`enforcer`), which deny by default. `[FACT: business-rules.md:42-45 (user owns the policy); parts/habits.md:101 (Preferences-owned, INTENDED)]`
- **BR-S3-5 · Rejection writes NO row + does not touch the cache.** The guard runs BEFORE the upsert; on reject,
  the ledger + cache are unchanged. `[FACT: business-rules.md:75 (backfill terminal state: "no change")]`

## 3. Contract (S3 — appended)

```
backfillCompletion(habitId: string, pastDate: string, input?: Omit<LogCompletionInput,'date'>): Promise<HabitCompletion>
```

- `HabitsServiceDeps.prefs?: HabitsPrefsPort` (`{ backfillWindowDays(): Promise<number | null> }`; absent → a
  permissive (fail-OPEN) port returning `null` = no limit). + `class BackfillWindowError extends Error`. `[FACT: contract.md:20,54]`

## 4. Acceptance (✓live)

- [ ] `backfillCompletion` for a past date within the window persists + recomputes the streak ✓live
- [ ] with no `prefs` port (default), any past date is allowed (unlimited) ✓live
- [ ] with a `prefs` port returning `w`, a date older than `asOf − w` → `BackfillWindowError`, no row written ✓live
- [ ] a future date → `BackfillWindowError` via ANY write path (`logCompletion` + `backfillCompletion`) ✓live
- [ ] a today (`date === asOf`) `logCompletion` still persists — the guard never rejects today (N1 boundary) ✓live
- [ ] the S2 future-date test updated to assert rejection (behavior closed by S3) ✓live
- [ ] `editCompletion`/`deleteCompletion` remain un-window-guarded (existing rows) ✓live
- [ ] `tsc` 0 · eslint 0 · full `@vida/core` suite green (no S1/S2 regression)

## 5. Implementation Prompt (ordered; cites §2)

1. **`services/habits/types.ts`** — add `HabitsPrefsPort { backfillWindowDays(): Promise<number | null> }`,
   `prefs?` on `HabitsServiceDeps`, `BackfillWindowError` (`.name` set), `backfillCompletion` on `HabitsService`.
2. **`services/habits/service.ts`** — add a permissive default `prefs = deps.prefs ?? { backfillWindowDays: async () => null }`.
   Add `assertDateWritable(date, asOf)` (BR-S3-3 future → throw, LEXICAL `date > asOf`; BR-S3-4 past-beyond-window →
   throw, DAY-MATH `toDayNum`). Call it at the TOP of `upsertCompletion` (guards log/detailed/backfill; today
   `date===asOf` passes both checks; BR-S3-2). Add `backfillCompletion(habitId, pastDate, input) =>
upsertCompletion(habitId, { ...input, date: pastDate })`. **Leave `recomputeStreak` UNCHANGED** (N2): only the
   service WRITE-path rejects future dates; the pure recompute stays defensive against a future row arriving via a
   sync merge (its `>asOf` exclusion still holds).
3. **`services/habits/__tests__/habits-service.test.ts`** — add an S3 describe block for §4; **update the S2
   future-date test** (`'a future-dated completion counts in total…'`) → assert `BackfillWindowError` (rejected).
4. Run typecheck + `test -- habits` (Node 24) + eslint. Done = §4 green → S3 Verification Gate.

## 6. Open UNKNOWNs — none (window setting shape is Preferences-owned, out of scope; consumed via the port).

## 7. Change Log

| Date       | Session               | Change                                                                                                                            |
| ---------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-23 | 2026-09-23-mod-habits | S3 PLAN — backfill + window on the shared write path; deny-safe fail-OPEN window port; closes the S2 future-date state (g2 NIT-1) |
