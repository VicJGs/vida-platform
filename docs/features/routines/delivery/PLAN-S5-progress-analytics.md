<!-- Forward spec — Routines ① S5 · Per-Step Build Gate (§XXVI) · authored before implementation -->
<!-- Progress + analytics: derive-on-read from S4's evaluation over the routine's occurrences. No cache, no policy values invented. -->

# PLAN S5 — Progress + analytics (streak · rate · ranking · time-period comparison · misses)

> Slice-map S5. ROU-13 (`progress()`), ROU-15 (streak / rate / ranking / time-period comparison), ROU-16 (policy-derived streak, the READ
> seam Gamification pulls, D3), ROU-18 (miss + acceptance-window computation) + ledger rows A21, A22. Grounded in `delivery/interpretation.md`
> (rules 3, 12 · R3), the S4 evaluation (`PLAN-S4-policy-evaluation.md` E1–E8, incl. its S5 notes), the seam, and the docs below. Closes with
> the live-store Verification Gate.

## 1a. Context docs
`docs/modules/routines/current-*` were promoted at S4 (`91e727b`) → **current**.

## Grounding
- **Derive, never cache** (RT-14, ROU-15, rule 3): every number is recomputed from the ledger via S4's `evaluateRoutine`. Editing a past
  completion re-derives everything. No streak or rate column exists (`db/schema/routines.ts:59`, the `progress` override slot only).
- **The streak is POLICY-derived, not the Habits rule** (RT-7, intake Q4 "dissolved into user-config"; ROU-16). Gamification READS it
  (`getStreak`); routines advertises no M5 source (rule 12).
- **Misses are user-personalized** (intake Q3: "the user controls how misses count AND the acceptance window (one week · N days · …)";
  RT-6: "paused/off routines generate no misses"). As in S4, **routines hardcodes no policy values**: the window comes from the user's policy, and
  without it a past undone occurrence cannot be called a "real miss" (flagged, not guessed).
- **Cadence:** occurrences are expanded from `recurrence_rule` with the canonical `ical.js` (R3; ADR-001:137), building `YYYY-MM-DD` from the
  calendar fields (never `toISOString()` of a local time: the tasks g2 B1 lesson). The anchor (DTSTART) is the routine's creation day
  (`utcDay(created_at)`).
- **Ranking + time-period comparison** sit on the **per-routine** standalone page (routines BR terminal table: "Per-routine standalone page … streak/
  trend/calendar + ranking/time-comparison"; intake G1/G7 "bring back v1's ranking + time-period comparison analytics"), and the seam's
  `getAnalytics(routineId, range)` returns `ranking`. v1 had a separate RoutineAnalytics page with Ranking and TimePeriodComparison
  (`intake/routines.md:17-18`), but v1's "routines" were individual `routine_actions` (§B note 3), the reframe's **steps**, so v1 ranked what are now
  steps. **Ranking = the routine's steps ranked by completion over the range.** The G1 all-routines "analytics page" ranks *routines* by composing
  each routine's `getAnalytics().completion.rate` on the ② surface (no extra ① op; the frozen seam already covers it).
  *[INTERP, grounded in the BR table, the seam and v1's action granularity.]*
- **Shape precedent:** habits `StreakSummary {current, longest, total}` · `CompletionRate {scheduled, done, rate|null}` ("`rate` null when nothing
  is due — not a silent 0") `[FACT: services/habits/types.ts:60-75]`.
- **progress() (ROU-13, ADR-011 M3):** `resolveProgress(stored, derive)`. `stored` = the 0–100 override (projects `/100` precedent
  `services/projects/service.ts:483`); `derive` = the routine's natural `rate` measure (RT-19 "completion frequency over its cadence").

## Scope (in S5)
| # | Ledger | Change |
|---|---|---|
| 1 | — | **Occurrence classification** (internal): each occurrence date ∈ `done · missed · pending · neutral · unjudged` (rules A1–A5) |
| 2 | A22 | **`getStreak(routineId): Promise<RoutineStreak>`**: the policy-derived READ seam (D3) |
| 3 | A22 | **`getAnalytics(routineId, range): Promise<RoutineAnalytics>`**: completion rate · step ranking · time-period comparison |
| 4 | A21 | **`progress(routineId): Promise<number \| null>`** via `resolveProgress` |
| 5 | policy | **`RoutinePolicy.miss` becomes `{ logged_skip?: 'neutral'\|'not_done'; acceptance_window_days?: number }`**: both optional (a user may set a window without a logged-skip choice; S4 E2 is unchanged when `logged_skip` is absent). The window is type-checked: a non-integer, negative or non-finite value → `InvalidRoutinePolicyError` (the S4 threshold precedent). *[INTERP-minimal: Q3 "one week · N days · …"; a day count covers both examples.]* |
| 6 | seam | Amend the seam with the exact shapes + renames: `completionRate→completion`, `timePeriodComparison→comparison`, `TimeRange→RoutineDateRange` (`seam-contract.md:81`) |
| 7 | perf | **One load per call:** policy, all steps, the ledger rows for `[from, to]` and the reflection data are loaded **once**; every day is classified in memory through a pure day-judgment extracted from S4's `evaluateRoutine` (both share it, no behaviour change to S4) |
| 8 | §XXIX | Amend `docs/modules/routines/current-*` (incl. the stale "lifecycle has no behavioural effect yet") and record that editing `recurrence_rule` re-derives history under the new rule |

## Types (net-new)
```ts
export interface RoutineDateRange { from: string; to: string }           // YYYY-MM-DD inclusive (habits HabitDateRange precedent)
export type OccurrenceStatus = 'done' | 'missed' | 'pending' | 'neutral' | 'unjudged'
export interface RoutineStreak {
  current: number; longest: number; total: number                     // habits StreakSummary shape
  policy_source: 'user' | 'undefined'                                 // 'undefined' ⇒ some occurrence couldn't be judged (A4)
  unscheduled?: true                                                  // no recurrence_rule ⇒ no occurrences (A6)
}
export interface RoutineCompletionRate {
  scheduled: number; done: number; missed: number; pending: number; neutral: number; unjudged: number
  rate: number | null                                                 // done / (done + missed); null when that is 0 (nothing judged due)
}
export interface RoutineStepRank { step_id: string; title: string; done: number; applicable: number; rate: number | null }
export interface RoutineAnalytics {
  range: RoutineDateRange
  completion: RoutineCompletionRate
  ranking: RoutineStepRank[]                                          // steps by rate desc, then done desc, then sequence
  comparison: { previous: RoutineDateRange; completion: RoutineCompletionRate; rate_delta: number | null }
  policy_source: 'user' | 'undefined'
  unscheduled?: true
}
// RoutinePolicy.miss → { logged_skip?: 'neutral' | 'not_done'; acceptance_window_days?: number }   (scope 5)
```

## Rules
- **A1 · Occurrences.** `recurrence_rule` is expanded with `ical.js` from DTSTART = `utcDay(created_at)` *[INTERP: the schema has no start column,
  `db/schema/routines.ts:46-60`]*. Three fixes for the iterator's behaviour:
  - it always yields DTSTART first (`services/tasks/service.ts:157-159`), so a yielded date is kept only if it **matches the rule** (checked via
    `ICAL.Recur` on the date, so a Tuesday creation day under `BYDAY=MO,WE` is not a phantom occurrence);
  - sub-daily FREQs collapse to **distinct dates**;
  - iteration breaks once a date exceeds `min(to, today)`, so future dates are never classified.

  A soft-deleted routine → `RoutineNotFoundError` (the S4 known limit). Editing `recurrence_rule` re-derives history under the new rule (derive-on-read).
- **A2 · Per occurrence, the S4 day judgment decides done** (the same pure function `evaluateRoutine` uses):
  - `status === 'done'` → **done**;
  - `applicable === 0` → **neutral** (S4's S5 note; also a day before any step existed);
  - else → A3–A5.

  **Inherited recorded limit (S4 E2, rule 22):** a completed task step reflects as done on every later date, so it counts done in streak/rate/progress
  until the task is reopened. This is tested and noted in the durable docs.
- **A3 · Lifecycle, applied through the acceptance-window procedure (RT-6 + Q3 + `business-rules.md:120`; Victor 2026-10-22).** A miss stays
  make-good-able only inside the user's window; beyond it, "it is a real miss", and "a miss/skip outside the acceptance window is **rejected** … not
  silently absorbed". So a real miss is **final**. "Paused/off routines generate no misses" therefore applies only to occurrences that are **not yet
  real misses**:
  - current `lifecycle` `paused`/`off` ⇒ an undone occurrence that is **today** or still **inside the window** is **neutral** (no miss generated);
  - an occurrence already **beyond the window** stays **missed**: a later pause cannot absorb it.

  This closes the "pause to erase past misses" exploit without lifecycle history or a schema amendment.
  *(Withdrawn draft: "no lifecycle history ⇒ ADR-002 amendment candidate". The docs already settle it; no new column is owed.)*
- **A4 · Pending vs missed vs unjudged** (the user's window, Q3):
  - **today** (`date === clock()`) undone ⇒ **pending**, regardless of window (RT-5 "at the timeframe's end": the day isn't over);
  - a **past** undone day with `date + acceptance_window_days ≥ today` (calendar-day arithmetic on `YYYY-MM-DD`, not ms) ⇒ **pending**; beyond it ⇒ **missed**;
  - a past undone day with **no window** in the user's policy (or no policy), or an S4 day that is `partial` **and** `'undefined'` ⇒ **unjudged**.
  - No window value is invented.
- **A5 · Streak (policy-derived; RT-7, Q4, ROU-16).** `current`: walk occurrences newest → oldest:
  - done +1; neutral and pending skipped;
  - **missed breaks**;
  - **unjudged stops the walk** (an honest "can't say") and flags.

  `longest`: scan all occurrences. Done extends the run; neutral/pending are skipped; missed **and** unjudged end the run (the scan continues; unjudged
  flags). `total` = all done occurrences. *[INTERP-minimal: of Q3's "how misses count", this slice reads exactly two things, the acceptance window and
  the logged-skip treatment; any further miss rule is the user's to add through the port.]*
- **A5b · `policy_source` (same meaning as S4):** `'undefined'` iff `policyFor` returned null **or** any visited occurrence is unjudged; else `'user'`.
- **A6 · No `recurrence_rule`** ⇒ no occurrences: streak `{0,0,0}`, rate null, `unscheduled: true` (no cadence invented).
- **A7 · Completion rate** = `done / (done + missed)`; pending, neutral and unjudged are excluded; `null` when the denominator is 0. *(This deviates on
  purpose from habits' `done/scheduled`: routines have pending/unjudged days that habits don't.)*
- **A8 · Step ranking** over the **days A7 judges** (done or missed): per step in that day's as-of set, `done` = judged days it was done, `applicable` =
  judged days it was applicable; `rate = done/applicable | null`. Sorted by rate desc (null last), then done desc, then `bySequence`.
- **A9 · Time-period comparison:** A7 over the **immediately preceding range of equal length**; a previous range wholly before DTSTART has no
  occurrences ⇒ its rate is null ⇒ `rate_delta` null. *[INVENTED-minimal: "time-period comparison" (ROU-15, v1 TimePeriodComparison) has no in-repo
  formula; period-over-period is the minimal reading.]*
- **A10 · progress().** `resolveProgress(stored == null ? null : stored / 100, () => allTimeRate)`. *[INTERP: `allTimeRate` = A7 from DTSTART to today;
  ADR-011:41 "rate = completion-rate / streak-vs-goal" and there is no goal value, so completion-rate it is.]* The override always wins (M3).
- **A11 · Read-only + bounded.** No writes, no effects. Each call does one policy read, one steps read, one ledger read for the range, and one
  reflection read per driven step (tasks once each; habits per month). Classification is in memory.

## Verification Gate (blocking — live store, Node 24, real better-sqlite3, the S3/S4 harness; `Date.now` pinned)
1. **Occurrences:** `FREQ=DAILY` 5 days → 5; `FREQ=WEEKLY;BYDAY=MO,WE` with a **Tuesday creation day** → no phantom Tuesday; `FREQ=HOURLY` → one per
   day; future days excluded.
2. **Streak with a window:** done, done, missed, done, done → `current` 2, `longest` 2, `total` 4.
3. **Pending:** today undone with **no window** → pending (the streak carries over it); yesterday undone with a 3-day window → pending.
4. **Neutral / lifecycle (A3):** a planned-skip day skipped. A `paused` routine: undone **today** and **in-window** days → neutral, but a day already
   **beyond the window** stays **missed** (a pause can't absorb a real miss: the exploit is closed).
5. **Unjudged:** no window and a past undone day → the walk stops, `'undefined'`; `longest` with an unjudged day in the middle ends that run and flags.
6. **policy_source:** no policy + every day done → `'undefined'` (A5b); a user policy + all days judged → `'user'`.
7. **Unscheduled:** no rule → `{0,0,0}`, `unscheduled: true`, rate null.
8. **Rate:** 3 done, 1 missed, 1 pending → 0.75; nothing judged → null.
9. **Ranking:** over judged days only: A 4/4, C 2/3, B 2/4 → A, C, B; ties → done desc, then sequence.
10. **Comparison:** equal preceding range; a previous range before DTSTART → its rate null, `rate_delta` null.
11. **progress():** stored 40 → 0.4; stored null → the all-time rate; unscheduled → null.
12. **Re-derive:** delete a past completion → streak/rate/progress change.
13. **Inherited limit:** a completed task step counts done on later days (documented behaviour asserted).
14. **Window validation:** `acceptance_window_days` NaN / −1 / 1.5 → `InvalidRoutinePolicyError`; a policy with only a window (no `logged_skip`) works.
15. **Bounded queries:** a 60-day daily routine with 5 steps → `getStreak` issues one ledger range read (spy on the read path), not one per day.
16. **Errors / read-only:** archived → `RoutineNotFoundError`; a bad range (from > to, or a malformed date) → `ZodError`; `sync_queue` unchanged.
Gates: tsc 0 · eslint 0 · routines suite green · full `@vida/core` sequential · g2 · /critique · §XXIX.

## Preflight (gate 2): `/preflight` PASSED, 0 gaps (after Approval 1, 2026-10-22)
| Layer | Specified? | Where |
|---|---|---|
| Backend (in-process, read-only; no endpoint/auth) | ✅ `getStreak`, `getAnalytics`, `progress`, types, rules A1–A11 | §Types · §Rules |
| Database | ✅ reads only: `routines`, `routine_step` (all, as-of), `routine_completions` for `[from,to]`. No writes, **no schema change** (A3 uses the acceptance-window procedure, no lifecycle column) | A1–A11 |
| Integration | ✅ reflection via `tasks.getTask` / `habits.getCalendar` (public); policy via `prefs.policyFor`; occurrences via `ical.js` | A1, A2 |
| Durable-doc invariants | ✅ derive-not-cache (BR-RT-S1-3) · S4e-1…6 reused unchanged through the shared pure day-judgment · planned skip neutral · RT-6 lifecycle | `current-business-rules.md` |

**Assumptions pinned:**
1. **Rule-membership of DTSTART (A1):** the iterator's first yield is DTSTART; it is kept only if a **second iterator anchored one day before DTSTART**
   also yields DTSTART (i.e. the rule genuinely produces it). This is probed against ical.js 2.2.1 at step 4 before relying on it (the S2c "verify the
   library" lesson); if the probe disagrees, the mechanism is replaced, recorded as §XXVIII, and the gate test is unchanged.
2. **Calendar-day arithmetic:** `addDays(ymd, n)` via `Date.UTC(y, m-1, d+n)` → `YYYY-MM-DD` from the UTC fields (no local time).
3. `RoutineDateRange` is Zod-validated: both `YYYY-MM-DD`, `from <= to`, else `ZodError`.
4. **The shared pure day-judgment:** `judgeDay(stepsAll, rowsByStepDate, reflection, policy, date)` → the S4 `RoutineEvaluation` body; `evaluateRoutine`
   becomes load-then-`judgeDay` (behaviour unchanged, the S4 suite is the regression check).
5. **Reflection data per call:** task rows fetched **once per distinct task id**; habit calendars cached per (habit, month) across the whole range.
6. **Ledger range read:** one query `completed_date BETWEEN from AND to` ∧ `routine_step_id IN (ids)`.
7. `today = clock()`. `getStreak` covers DTSTART..today; `getAnalytics` covers the caller's range clamped to ≤ today; `comparison.previous` = the
   preceding range of the same day count.
8. `progress` stored int → `/100`; the result passes through `resolveProgress` unchanged.
9. Gate 15 asserts boundedness as **equal `db.select` call counts for a 30-day vs a 60-day streak** (independent of day count).

## Implementation plan (§5, worked via `victor:execute-plan-code`)
1. **Tests first (red):** Gate 1–16 in a new `S5 — progress + analytics` block (`Date.now` pinned; stub prefs ports).
2. **validators:** `RoutineDateRangeSchema` (refine `from <= to`).
3. **types.ts + index.ts:** `RoutineDateRange` · `OccurrenceStatus` · `RoutineStreak` · `RoutineCompletionRate` · `RoutineStepRank` · `RoutineAnalytics` ·
   `RoutinePolicy.miss` widened (both fields optional) · `getStreak`/`getAnalytics`/`progress` on the interface.
4. **service.ts:** the ical.js membership probe (assumption 1) · `occurrences(rule, dtstart, from, to)` · `addDays` · extract `judgeDay` (S4 refactor) ·
   `loadWindow(routineId, from, to)` · `classifyOccurrence` (A2–A4 + window validation) · `streakOf` · `rateOf` · `rankSteps` · `getStreak` / `getAnalytics` /
   `progress`. **Gate point = steps 2–4** (S4's 83 tests must stay green across the refactor).
5. **Docs:** the seam shapes + renames (`completionRate→completion`, `timePeriodComparison→comparison`, `TimeRange→RoutineDateRange`); the
   current-spec "lifecycle has no behavioural effect yet" line → A3; record that editing `recurrence_rule` re-derives history.
6. **Gates:** tsc 0 · eslint 0 · routines suite · full `@vida/core` sequential · g2 · /critique · §XXIX.

## g1 critique (folded): REVISE → 5 blocking fixed (today pending; ical.js DTSTART/BYxxx/sub-daily; the inherited task-reflection limit restated +
tested; `miss` fields optional + window validated; one-load bounded evaluation) + 7 non-blocking (ranking grounded in v1 action granularity + the G1
page composes on ②; `longest` with unjudged; lifecycle via the RT-6/Q3 acceptance-window procedure (real misses are final; pause affects only make-good-able days); `policy_source` = S4 meaning; ranking over judged days; A7
deviation from habits stated; seam renames + §XXIX row)

## Out of scope (homed)
Reschedule (S6, consumes the same window and its BR:120 rejection) · emitting rewards on done (S7) · providers (S9) ·
the policy's storage/UI (Spaces/Preferences).
