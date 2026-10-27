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
  steps. **Ranking = the routine's steps ranked by completion over the range.** The G1 all-routines "analytics page" ranks _routines_ by composing
  each routine's `getAnalytics().completion.rate` on the ② surface (no extra ① op; the frozen seam already covers it).
  _[INTERP, grounded in the BR table, the seam and v1's action granularity.]_
- **Shape precedent:** habits `StreakSummary {current, longest, total}` · `CompletionRate {scheduled, done, rate|null}` ("`rate` null when nothing
  is due — not a silent 0") `[FACT: services/habits/types.ts:60-75]`.
- **progress() (ROU-13, ADR-011 M3):** `resolveProgress(stored, derive)`. `stored` = the 0–100 override (projects `/100` precedent
  `services/projects/service.ts:483`); `derive` = the routine's natural `rate` measure (RT-19 "completion frequency over its cadence").

## Scope (in S5)

| #   | Ledger | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | —      | **Occurrence classification** (internal): each occurrence date ∈ `done · missed · pending · neutral · unjudged` (rules A1–A5)                                                                                                                                                                                                                                                                                                                             |
| 2   | A22    | **`getStreak(routineId): Promise<RoutineStreak>`**: the policy-derived READ seam (D3)                                                                                                                                                                                                                                                                                                                                                                     |
| 3   | A22    | **`getAnalytics(routineId, range): Promise<RoutineAnalytics>`**: completion rate · step ranking · time-period comparison                                                                                                                                                                                                                                                                                                                                  |
| 4   | A21    | **`progress(routineId): Promise<number \| null>`** via `resolveProgress`                                                                                                                                                                                                                                                                                                                                                                                  |
| 5   | policy | **`RoutinePolicy.miss` becomes `{ logged_skip?: 'neutral'\|'not_done'; acceptance_window_days?: number }`**: both optional (a user may set a window without a logged-skip choice; S4 E2 is unchanged when `logged_skip` is absent). The window is type-checked: a non-integer, negative or non-finite value → `InvalidRoutinePolicyError` (the S4 threshold precedent). _[INTERP-minimal: Q3 "one week · N days · …"; a day count covers both examples.]_ |
| 6   | seam   | Amend the seam with the exact shapes + renames: `completionRate→completion`, `timePeriodComparison→comparison`, `TimeRange→RoutineDateRange` (`seam-contract.md:81`)                                                                                                                                                                                                                                                                                      |
| 7   | perf   | **One load per call:** policy, all steps, the ledger rows for `[from, to]` and the reflection data are loaded **once**; every day is classified in memory through a pure day-judgment extracted from S4's `evaluateRoutine` (both share it, no behaviour change to S4)                                                                                                                                                                                    |
| 8   | §XXIX  | Amend `docs/modules/routines/current-*` (incl. the stale "lifecycle has no behavioural effect yet") and record that editing `recurrence_rule` re-derives history under the new rule                                                                                                                                                                                                                                                                       |

## Types (net-new)

```ts
export interface RoutineDateRange {
  from: string
  to: string
} // YYYY-MM-DD inclusive (habits HabitDateRange precedent)
export type OccurrenceStatus = 'done' | 'missed' | 'pending' | 'neutral' | 'unjudged'
export interface RoutineStreak {
  current: number
  longest: number
  total: number // habits StreakSummary shape
  policy_source: 'user' | 'undefined' // 'undefined' ⇒ some occurrence couldn't be judged (A4)
  unscheduled?: true // no recurrence_rule ⇒ no occurrences (A6)
}
export interface RoutineCompletionRate {
  scheduled: number
  done: number
  missed: number
  pending: number
  neutral: number
  unjudged: number
  rate: number | null // done / (done + missed); null when that is 0 (nothing judged due)
}
export interface RoutineStepRank {
  step_id: string
  title: string
  done: number
  applicable: number
  rate: number | null
}
export interface RoutineAnalytics {
  range: RoutineDateRange
  completion: RoutineCompletionRate
  ranking: RoutineStepRank[] // steps by rate desc, then done desc, then sequence
  comparison: { previous: RoutineDateRange; completion: RoutineCompletionRate; rate_delta: number | null }
  policy_source: 'user' | 'undefined'
  unscheduled?: true
}
// RoutinePolicy.miss → { logged_skip?: 'neutral' | 'not_done'; acceptance_window_days?: number }   (scope 5)
```

## Rules

- **A1 · Occurrences.** `recurrence_rule` is expanded with `ical.js` from DTSTART = `utcDay(created_at)` _[INTERP: the schema has no start column,
  `db/schema/routines.ts:46-60`]_. Three fixes for the iterator's behaviour:
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
  _(Withdrawn draft: "no lifecycle history ⇒ ADR-002 amendment candidate". The docs already settle it; no new column is owed.)_

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
  flags). `total` = all done occurrences. _[INTERP-minimal: of Q3's "how misses count", this slice reads exactly two things, the acceptance window and
  the logged-skip treatment; any further miss rule is the user's to add through the port.]_

- **A5b · `policy_source` (same meaning as S4):** `'undefined'` iff `policyFor` returned null **or** any visited occurrence is unjudged; else `'user'`.
- **A6 · No `recurrence_rule`** ⇒ no occurrences: streak `{0,0,0}`, rate null, `unscheduled: true` (no cadence invented).
- **A7 · Completion rate** = `done / (done + missed)`; pending, neutral and unjudged are excluded; `null` when the denominator is 0. _(This deviates on
  purpose from habits' `done/scheduled`: routines have pending/unjudged days that habits don't.)_
- **A8 · Step ranking** over the **days A7 judges** (done or missed): per step in that day's as-of set, `done` = judged days it was done, `applicable` =
  judged days it was applicable; `rate = done/applicable | null`. Sorted by rate desc (null last), then done desc, then `bySequence`.
- **A9 · Time-period comparison:** A7 over the **immediately preceding range of equal length**; a previous range wholly before DTSTART has no
  occurrences ⇒ its rate is null ⇒ `rate_delta` null. _[INVENTED-minimal: "time-period comparison" (ROU-15, v1 TimePeriodComparison) has no in-repo
  formula; period-over-period is the minimal reading.]_
- **A10 · progress().** `resolveProgress(stored == null ? null : stored / 100, () => allTimeRate)`. _[INTERP: `allTimeRate` = A7 from DTSTART to today;
  ADR-011:41 "rate = completion-rate / streak-vs-goal" and there is no goal value, so completion-rate it is.]_ The override always wins (M3).
- **A11 · Read-only + bounded.** No writes, no effects. Each call does one policy read, one steps read, one ledger read for the range, and one
  reflection read per driven step (tasks once each; habits per month). Classification is in memory.

## Verification Gate (blocking — live store, Node 24, real better-sqlite3, the S3/S4 harness; `Date.now` pinned)

1. **Occurrences:** `FREQ=DAILY` 5 days → 5; `FREQ=DAILY;BYDAY=MO,WE` and `FREQ=WEEKLY;BYDAY=MO,WE` with a **Tuesday creation day** → no Tuesday;
   `FREQ=WEEKLY` (no BYDAY) from Tuesday → Tuesdays; `FREQ=HOURLY;INTERVAL=8` → one per day, no throw; future days excluded;
   `DAILY;BYDAY=MO,WE;COUNT=3` → exactly 3 real occurrences; `MONTHLY;BYMONTHDAY=-1` from 10-31 keeps 10-31; `YEARLY;BYMONTH=2;BYMONTHDAY=29` → no
   03-01; **`FREQ=DAILY;BYMONTHDAY=-1` / `DAILY;BYDAY=2MO` / `WEEKLY;BYWEEKNO=10` → `InvalidRecurrenceRuleError` at `createRoutine` and on read of a
   pre-stored rule (no hang).**
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

| Layer                                             | Specified?                                                                                                                                                                                    | Where                       |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Backend (in-process, read-only; no endpoint/auth) | ✅ `getStreak`, `getAnalytics`, `progress`, types, rules A1–A11                                                                                                                               | §Types · §Rules             |
| Database                                          | ✅ reads only: `routines`, `routine_step` (all, as-of), `routine_completions` for `[from,to]`. No writes, **no schema change** (A3 uses the acceptance-window procedure, no lifecycle column) | A1–A11                      |
| Integration                                       | ✅ reflection via `tasks.getTask` / `habits.getCalendar` (public); policy via `prefs.policyFor`; occurrences via `ical.js`                                                                    | A1, A2                      |
| Durable-doc invariants                            | ✅ derive-not-cache (BR-RT-S1-3) · S4e-1…6 reused unchanged through the shared pure day-judgment · planned skip neutral · RT-6 lifecycle                                                      | `current-business-rules.md` |

**Assumptions pinned:**

1. **Occurrence expansion: probed against ical.js 2.2.1 (Node 24, 2026-10-22) before relying on it.**
   - With a **date-only** DTSTART, the phantom start date appears **only** when an explicit BY-part filters a broader FREQ. `FREQ=DAILY;BYDAY=MO,WE`
     from a Tuesday yields the Tuesday first. `WEEKLY;BYDAY=MO,WE`, `MONTHLY;BYMONTHDAY=15` and `YEARLY;BYMONTH=3` yield no phantom.
     `FREQ=WEEKLY` with no BYDAY correctly inherits DTSTART's weekday.
   - **Mechanism (step-5 corrected):** the explicit BY-part check runs on **every** yield, not just the first. Every real occurrence passes it, and it
     also filters ical.js mis-yields (e.g. `YEARLY;BYMONTH=2;BYMONTHDAY=29` → a false 2027-03-01). Parts checked: `BYDAY` weekday (ordinal prefix
     ignored), `BYMONTHDAY` (**negative values resolved**: `v<0 ⇒ daysInMonth+v+1`, so `MONTHLY;BYMONTHDAY=-1` from 10-31 keeps its real start) and
     `BYMONTH` (which also catches the `MONTHLY;BYMONTH=3` / `WEEKLY;BYMONTH=3` phantoms). No part ⇒ accepted.
     _(A "second iterator anchored the day before" was rejected: it breaks implicit-weekday rules like `FREQ=WEEKLY`.)_
   - **COUNT:** when the phantom first yield is dropped and the rule has `COUNT`, expansion is rebuilt with `COUNT + 1`, so the rule still yields its
     declared number (probe: `DAILY;BYDAY=MO,WE;COUNT=3` → 10-20 phantom, 10-21, 10-26 ⇒ with count+1 → 10-21, 10-26, 10-28). `UNTIL` needs nothing.
   - **Non-terminating rules (BLOCKING, probed):** ical.js 2.2.1 **hangs forever inside `next()`** for valid RFC rules: `FREQ=DAILY;BYMONTHDAY=-1`,
     `FREQ=DAILY;BYDAY=2MO`, `FREQ=WEEKLY;BYWEEKNO=10` (killed after 4 s). It also mis-expands `YEARLY;BYDAY=20MO` (every Monday) and silently yields
     nothing for `YEARLY;BYWEEKNO=10`. A date bound can't help, because the hang is inside the library. **`assertExpandable(rule)`** therefore throws the
     existing `InvalidRecurrenceRuleError` for: an ordinal `BYDAY` (e.g. `2MO`, `-1FR`) outside `MONTHLY`; any `BYWEEKNO`; a negative `BYMONTHDAY` with
     `DAILY` or a sub-daily FREQ. It runs **at write** (it tightens S2c's `assertValidRrule`, BR-RT-S2c-5) **and before every expansion** (an old stored
     rule never freezes a read). _Cross-module note for Victor: tasks' `nextOccurrence` (`services/tasks/service.ts:161`) has the same hang exposure; out
     of scope here._
   - **Sub-daily FREQs** (SECONDLY/MINUTELY/HOURLY) **throw** on a date-only DTSTART ("Same occurrence found twice"), so they use a **date-time**
     DTSTART `T00:00:00Z`, and their yields collapse to distinct `YYYY-MM-DD`.
2. **Calendar-day arithmetic:** `addDays(ymd, n)` via `Date.UTC(y, m-1, d+n)` → `YYYY-MM-DD` from the UTC fields (no local time).
3. `RoutineDateRange` is Zod-validated: both `YYYY-MM-DD`, `from <= to`, else `ZodError`.
4. **The shared pure day-judgment:** `judgeDay(stepsAll, rowsByStepDate, reflection, policy, date)` → the S4 `RoutineEvaluation` body; `evaluateRoutine`
   becomes load-then-`judgeDay` (behaviour unchanged, the S4 suite is the regression check).
5. **Reflection data per call:** task rows **memoised per distinct task id** (`getTask` once per id, not per step × date); habit calendars cached per
   (habit, month) across the whole range.
6. **Ledger range read:** one query `completed_date BETWEEN from AND to` ∧ `routine_step_id IN (ids)`.
7. `today = clock()`. `getStreak` covers DTSTART..today; `getAnalytics` covers the caller's range clamped to ≤ today; `comparison.previous` = the
   preceding range of the same day count.
8. `progress` stored int → `/100`; the result passes through `resolveProgress` unchanged.
9. Gate 15 asserts boundedness as **equal `db.select` call counts for a 30-day vs a 60-day streak**, using a fixture of actionable/focus/task steps only
   (habit calendars are per month, so they legitimately scale with months). Repository calls `db.select()` at call time (`db/repository.ts:362,380`).
10. The acceptance window is validated on the **S5 reads** that consume it (`getStreak`/`getAnalytics`/`progress`); `evaluateRoutine` (S4) doesn't read
    the window, so a malformed window doesn't affect it.

## Implementation plan (§5, worked via `victor:execute-plan-code`)

1. **Tests first (red):** Gate 1–16 in a new `S5 — progress + analytics` block (`Date.now` pinned; stub prefs ports).
2. **validators:** `RoutineDateRangeSchema` (refine `from <= to`).
3. **types.ts + index.ts:** `RoutineDateRange` · `OccurrenceStatus` · `RoutineStreak` · `RoutineCompletionRate` · `RoutineStepRank` · `RoutineAnalytics` ·
   `RoutinePolicy.miss` widened (both fields optional) · `getStreak`/`getAnalytics`/`progress` on the interface.
   4a. **service.ts — refactor only:** extract `judgeDay` + a range-map `completionsOn(stepIds, from, to)`; `evaluateRoutine` = load + `judgeDay`. **The S4 83-test
   suite must be green here** (commit point), before any S5 code.
   4b. **service.ts — S5:** `assertExpandable` (at write + before expansion) · `occurrences(rule, dtstart, from, to)` (every-yield BY-part check incl. negative
   BYMONTHDAY; COUNT+1 rebuild; date-time start for sub-daily; distinct dates) · `addDays` · memoised `getTask` · `loadWindow(routineId, from, to)` ·
   `classifyOccurrence` (A2–A4 + window validation) · `streakOf` · `rateOf` · `rankSteps` · `getStreak` / `getAnalytics` / `progress`. **Gate point = 2–4b.**
4. **Docs:** the seam shapes + renames (`completionRate→completion`, `timePeriodComparison→comparison`, `TimeRange→RoutineDateRange`); the
   current-spec "lifecycle has no behavioural effect yet" line → A3; the `setLifecycle` comment "vacuous until then" (`types.ts`) → A3; record that editing `recurrence_rule` re-derives history.
5. **Gates:** tsc 0 · eslint 0 · routines suite · full `@vida/core` sequential · g2 · /critique · §XXIX.

## Addendum — g2 code review (post-implementation; §XXVIII)

**§XXVIII deviation — the hang guard is an ALLOWLIST, not a denylist.** g2 found the denylist incomplete: `FREQ=DAILY;BYMONTH=2;BYMONTHDAY=30` still hung
(re-probed), `WEEKLY;BYMONTHDAY=-1` / `DAILY;BYYEARDAY=100` passed the write and then threw an untyped `Error` at iterator construction, and the guard
wrongly rejected valid `YEARLY;BYMONTH=5;BYDAY=-1MO`. Grounding: **RT-11** makes a routine's cadence day-grain ("day · day+timeframe-of-week ·
day+time-of-month · day+time-of-year"). So `assertExpandable` accepts only:

- `FREQ` ∈ DAILY/WEEKLY/MONTHLY/YEARLY. Sub-daily FREQs are rejected, which also removes the unbounded per-second/minute expansion cost.
- Per-FREQ BY-parts that were probed to expand correctly: DAILY/WEEKLY `BYDAY` (weekday) + `BYMONTH`; MONTHLY `BYDAY` (incl. ordinal) + `BYMONTHDAY`
  (±) + `BYSETPOS` + `BYMONTH`; YEARLY `BYMONTH` + `BYDAY` (ordinal only with BYMONTH) + `BYMONTHDAY` + `BYYEARDAY`.
- Rejected: impossible BYMONTH/BYMONTHDAY pairs; iterator-construction errors are mapped to `InvalidRecurrenceRuleError`.

It runs at write (tightening BR-RT-S2c-5) and before every expansion.
**Fixed:**

- `addDays` keeps years 0–99 literal (`setUTCFullYear` + `toISOString`).
- `classify` applies paused/off first: everything not already a real miss is neutral, even a day S4 couldn't judge.
- `getAnalytics` expands **once** over the range + comparison range and splits.
- `loadWindow` takes the already-loaded routine (one routine read) and skips the step/ledger reads for an unscheduled routine.
- The day judgments run in parallel, sharing the memo and calendar caches.

**Recorded, not changed:** the ical.js/day helpers duplicate private code in tasks/books/relationships, and tasks' `nextOccurrence` has the same hang
exposure without this guard. A shared recurrence module would fix both, but it is cross-module (Tasks) scope, so it goes to Victor.
**Tests:** allowlist cases (9 rejected shapes incl. sub-daily, last-Monday-of-May accepted) + year-0050 arithmetic + the paused/undefined-day case → routines
**102/102** · tsc 0 · eslint 0.

## Addendum — final /critique (REVISE → fixed)

The first allowlist still accepted hanging rules: `DAILY;INTERVAL=7;BYDAY=MO` hangs **depending on the creation weekday** (from a Thursday DTSTART).
Rules that throw at iterator construction (`MONTHLY;BYDAY=6FR`, BYYEARDAY+BYMONTH) passed the write and failed every read, and ordinals mis-expanded
(`YEARLY;BYMONTH=1;BYDAY=20MO`, `MONTHLY;BYSETPOS=5;BYDAY=FR`).
**Fix: the MINIMAL RT-11 allowlist**:

- `DAILY[;INTERVAL]`;
- `WEEKLY[;INTERVAL][;BYDAY=weekdays]`;
- `MONTHLY[;INTERVAL][;BYMONTHDAY=±1..31 | ;BYDAY=±1..5 ordinals]`;
- `YEARLY[;INTERVAL][;BYMONTH[;BYMONTHDAY | ;BYDAY ordinal]]`;
- (+ COUNT/UNTIL/WKST).

**Every allowed form was probed across 9 DTSTARTs (all weekdays + month-ends): 145 shapes, 0 hang, 0 error.** Also:

- a trial iterator build at write (construction errors are typed and rejected on save);
- the nth-weekday ordinal is checked in the every-yield filter;
- 0 values and negative impossible pairs are rejected;
- `rankSteps` has no type assertions;
- two stale "lands with S5" doc lines are fixed.

Routines **102/102** · tsc 0 · eslint 0.

## Step-5 critique (folded): REVISE → 3 blocking fixed (non-terminating ical.js rules guarded by `assertExpandable` at write + before expansion; COUNT+1

rebuild after a phantom drop; negative BYMONTHDAY resolved) + 4 non-blocking (BY-part check on every yield; `getTask` memo + gate-15 fixture without
habits; step 4 split into a green-S4 refactor commit then S5 code; stale `types.ts` comment + window validated on S5 reads only)

## g1 critique (folded): REVISE → 5 blocking fixed (today pending; ical.js DTSTART/BYxxx/sub-daily; the inherited task-reflection limit restated +

tested; `miss` fields optional + window validated; one-load bounded evaluation) + 7 non-blocking (ranking grounded in v1 action granularity + the G1
page composes on ②; `longest` with unjudged; lifecycle via the RT-6/Q3 acceptance-window procedure (real misses are final; pause affects only make-good-able days); `policy_source` = S4 meaning; ranking over judged days; A7
deviation from habits stated; seam renames + §XXIX row)

## Out of scope (homed)

Reschedule (S6, consumes the same window and its BR:120 rejection) · emitting rewards on done (S7) · providers (S9) ·
the policy's storage/UI (Spaces/Preferences).
