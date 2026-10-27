# PLAN — check-ins ① · S4 Derivations

Status: draft (gate-1 = this spec) · Session: 2026-09-19-mod-check-ins · Slice: S4 (legs CHE-13, CHE-14)
No-Guessing: every claim [FACT: path:line] / [INTERP] / [UNKNOWN]. Pure read-side derivations over daily_check_ins.

## 1. Identity

Two **read-side derivations** over `daily_check_ins`: `getMoodEnergyTrend(range)` (plaintext mood/energy series
for the dashboard) and `computeCheckInStreak()` (consecutive-day streak). Pure computation — **no writes**.
**What it is NOT:** not a `user_profile` write (E9 — the streak is check-ins-owned, DERIVED; never written to
`user_profile.check_in_streak*`, `entities/user.ts:58-60`); not a persisted cache (read-side per call — the
delivery-plan §9:175 "DERIVED-in-service, no schema column"); not cross-module (S5).

## 2. Business Rules

- **CHE-13 — mood/energy trend from PLAINTEXT scales (CK-1).** `getMoodEnergyTrend({from,to})` reads entries in
  the inclusive date range and returns their `date`/`check_in_type`/`mood_score`/`energy_level` points (the
  plaintext columns that exist for this reason). Empty range → empty points ("not enough data" is the ② UI
  state). `[FACT: business-rules CK-1; parts CHE-13; check-ins.ts:52-53]`
- **CHE-14 — DERIVED consecutive-day streak, NO write (E9), today-relative current.** `computeCheckInStreak(asOf?)`
  reads `daily_check_ins`, computes over the set of DISTINCT check-in DATES (a day with ANY check-in counts once):
  `longest_streak` = the longest run of consecutive calendar days (all-time); `current_streak` = the run ending
  at the latest date **only if that date is contiguous to now** (`asOf` or `asOf − 1`), **else `0`** (a broken
  streak is 0, never a stale count — CK-27/§5 "never a wrong number"); `last_check_in_date` = the latest date (or
  null on an empty store). `asOf` defaults to today (`YYYY-MM-DD`), **injected** so the pure helper stays
  deterministic (no `Date.now()` inside it). NEVER writes `user_profile` (CK-11/E9). `[FACT: parts CHE-14; seam-contract computeCheckInStreak(asOf?); business-rules CK-11,74; delivery-plan §9:256-257]`
- **Fail-loud (CK-27/§5):** a read error propagates (typed) — never a wrong number silently. The "flagged
  partial" terminal state is a ② UI concern; ① computes from the rows or throws. `[FACT: business-rules.md:74]`
- **Persistence:** reuse the S2 `dailyRepo` (softDelete:false, encryptedFields:[]); reads are plain clauses (no
  `deleted_at`). Consecutive-day math is pure over `YYYY-MM-DD` strings (calendar dates, date-fns or a small
  pure helper). `[FACT: check-ins.ts:61; conventions.md:37]`

## 3. Contract (types.ts append — service-local derived-result types; no @vida/types home)

```ts
interface MoodEnergyPoint {
  date: string
  check_in_type: CheckInType
  mood_score: number | null
  energy_level: number | null
}
interface MoodEnergyTrend {
  points: MoodEnergyPoint[]
} // sorted by date asc
interface StreakResult {
  current_streak: number
  longest_streak: number
  last_check_in_date: string | null
}

interface CheckInsService {
  // + S4 methods
  getMoodEnergyTrend(range: { from: string; to: string }): Promise<MoodEnergyTrend> // CHE-13
  computeCheckInStreak(asOf?: string): Promise<StreakResult> // CHE-14 (asOf = YYYY-MM-DD, default today)
}
// pure, testable: computeStreak(dates: string[], asOf: string): StreakResult
```

`StreakResult` mirrors the E9 `check_in_streak`/`longest_check_in_streak`/`last_check_in_date` names
(`entities/user.ts:58-60`) — but is DERIVED, never persisted there.

## 4. Acceptance

- [ ] getMoodEnergyTrend returns range-filtered points sorted by date; empty range → `{points: []}`.
- [ ] computeCheckInStreak: empty store → `{current_streak:0, longest_streak:0, last_check_in_date:null}`.
- [ ] streak counts DISTINCT dates (two types on one day = 1 day); longest run correct across a gap.
- [ ] `current_streak` is today-relative: full run when the latest date is `asOf`/`asOf−1`; **0 when broken** (latest date older than `asOf−1`).
- [ ] no `user_profile` write occurs (E9) — verified (no user_profile repo touched).
- [ ] tsc 0 · ESLint clean.
- [ ] **Verification Gate:** Vitest — pure streak helper unit cases (empty, single, consecutive, gap, multi-type-same-day) + live-store smoke (seed entries → trend + streak).

## 5. Implementation Prompt

1. `types.ts` — append `MoodEnergyPoint`/`MoodEnergyTrend`/`StreakResult` + the 2 method signatures.
2. `service.ts` — extract a PURE helper `computeStreak(dates: string[]): StreakResult` (distinct-sort-run over YYYY-MM-DD) for testability; `getMoodEnergyTrend` reuses the range read (like listCheckIns) → map to points; `computeCheckInStreak` reads all entries → `computeStreak(distinct dates)`. No writes.
3. `__tests__` — pure `computeStreak` cases + live-store smoke (§4), assert no user_profile write.
4. `pnpm --filter @vida/core test` + `tsc --noEmit` → §4 done-check. Currency Rule: refresh current-spec.

## 6. Open UNKNOWNs

- [none blocking] — `current_streak` semantics = the run ending at the most recent check-in date (INTERP grounded in "consecutive-day streak"); asOf-relative liveness (is today included) is a ② concern, not needed for the derived value.

## 7. Change Log

| Date       | Session                  | Change        |
| ---------- | ------------------------ | ------------- |
| 2026-09-19 | 2026-09-19-mod-check-ins | S4 PLAN draft |
