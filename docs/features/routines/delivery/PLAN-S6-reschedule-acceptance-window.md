<!-- Forward spec — Routines ① S6 · Per-Step Build Gate (§XXVI) · authored before implementation -->
<!-- Reschedule, routine-owned legs only: the acceptance window guards every make-good/skip write; slot placement is the Scheduler's (M1.2). -->

# PLAN S6 — Reschedule + the acceptance-window write guard

> Slice-map S6 (amended by R3). ROU-10 (`rescheduleStep`), ROU-28 (cadence through the Scheduler; the expansion is already S5's) + ledger row A19.
> Grounded in `delivery/interpretation.md` (R3), the S5 acceptance-window procedure (BR-RT-S5a-3), the seam, and the docs below. Closes with
> the live-store Verification Gate.

## 1a. Context docs
`docs/modules/routines/current-*` were promoted at S5 (`156d423`) → **current**.

## Grounding — two distinct, separately-owned things
- **Make-good** is a routine write: completing or logging a **missed occurrence after its day**. The user's window governs it.
  - "the acceptance window — how long a miss stays **make-good-able / reschedulable** … before it is a real miss" (RT-6; intake Q3).
  - "**`OutsideAcceptanceWindow`** — a make-good/reschedule past the window → **rejected, no state change**" (`contract.md:55`).
  - "A **miss/skip** outside the acceptance window is **rejected with a typed error** (RT-6), not silently absorbed" (`business-rules.md:120`).
  - "Skip / reschedule step: outside acceptance window → typed toast, **no change**" (BR terminal table, `business-rules.md:113`).
  - → **Routine-owned and built here.**
- **Reschedule into an open slot** is the **Scheduler's**: "reschedule asks the Scheduler for an open, fitting slot in the day" (`contract.md:19`;
  ROU-10 "Routines owns no scheduler"). Placement persists as Sessions `planned_blocks` / the `rescheduled` lifecycle state, and the G5 placement
  algorithm is `⚠ INTENDED-later → M1.2` (R3; `m1.1-delivery-plan.md:247`). Sessions exposes no planned-block write API today, so **routines cannot
  persist a placement in M1** → a borrowed leg (slice-map §Borrowed legs).
- **No invented window:** the window is the user's (`RoutinePolicy.miss.acceptance_window_days`, S5). With no window, no write is judged "past the
  window" (as in S5, a miss without a window is never a real miss).

## ⟲ §XXVIII amendment for Victor to ratify: R3 / seam:68 / slice-map:47,59
R3 (`interpretation.md:210-211`), the seam (`seam-contract.md:68`, "moves the occurrence to the CALLER-given date/slot") and the slice-map (`:47`, `:59`
"S6 ships caller-date reschedule"), approved at the Re-scope Gate, say S6 **moves a missed occurrence to a caller-given date/slot**. The facts say that
move **cannot be persisted in M1**:
- `routine_completions` has no slot or target-date column, and `UNIQUE(routine_step_id, completed_date)` cannot represent an occurrence moved to another
  day (`db/schema/routines.ts:70-106`);
- the docs scope a reschedule **"within the day"**: the Scheduler places it in an open, fitting slot (RT-4, `business-rules.md:28`; intake Q1), so the
  day-grain occurrence date never changes;
- the slot lives in Sessions `planned_blocks` (table exists, migration 010) with **no write API** (`services/sessions/service.ts:119-173`), and placement
  is `⚠ INTENDED-later → M1.2` (`m1.1-delivery-plan.md:247`).

**Proposed amendment:** in M1, `rescheduleStep(stepId, date)` takes the **missed occurrence's date** (not a target date). It validates that the occurrence
is make-good-able (window + "is pending") and returns its make-good due item (read-only). The within-the-day slot placement is the borrowed Scheduler leg
(M1.2), and the make-good itself is `completeStep(stepId, {date})`. **If Victor rejects this,** the alternative is a Sessions planned-block write API
(Sessions scope) or an ADR-002 amendment, neither of which is routines' to author.

## Scope (in S6)
| # | Ledger | Change |
|---|---|---|
| 1 | — | **`OutsideAcceptanceWindowError(stepId, date, window)`** (seam `OutsideAcceptanceWindow`, the module's `*Error` naming) |
| 2 | BR:120 / contract:55 | **The write guard** (rules W1–W3). Guarded writes: `completeStep` and `runStep` with a past `input.date` · logged `skipStep` · `planSkipDates` (any past date in the list) · `editCompletion` when the patch changes `skipped` (a skip/un-skip is a skip, BR:120). **Not guarded** (GROUNDED, `business-rules.md:104` RT-14/G7 "editing/deleting a past completion re-derives all analytics"): `deleteCompletion` and edits that don't touch `skipped` |
| 3 | A19 | **`rescheduleStep(stepId, date): Promise<DueItem>`** per the amendment above: `date` = the missed occurrence. Valid iff S5 classifies that occurrence **`pending`** (missed or undone, still inside the window) — today included. Returns `{ source_module:'routines', ref_id: \`${stepId}|${date}\`, label: step.title, est_minutes: 0, urgency: 0, hard_deadline? }`, with `hard_deadline` = **UTC midnight of `addDays(date, window)`** (the last make-good day, the tasks/purposes precedent `tasks/service.ts:789-791`). Omitted with no window. `ref_id` = `stepId|date`, the scheme S9 `dueIn` will share. **No persistence** |
| 4 | — | **`NotMissedOccurrenceError(stepId, date, status)`**: `rescheduleStep` for a date S5 doesn't classify `pending` (done, neutral/planned-skip/paused, unjudged, beyond the window → that one is `OutsideAcceptanceWindowError` instead, a future date, or a date that isn't an occurrence; an unscheduled routine has no occurrences, per S5) |
| 5 | seam/docs | seam `rescheduleStep` note (no persistence in M1; placement = borrowed leg); slice-map S6 row; `current-*` (§XXIX) |

## Rules
- **W1 · Inputs.** `step = loadStepOrThrow(stepId)` first (BR-RT-S3-4: a missing step is `StepNotFoundError`). **Only when the write's date `D < today`**:
  the routine's policy is read and the window validated with the S5 check (malformed → `InvalidRoutinePolicyError`). A malformed window never blocks a
  today/future write. `window === undefined` ⇒ no guard.
- **W2 · Beyond the window = `addDays(D, window) < today`.** This is the **same date predicate** S5 uses for a real miss (also habits'
  `assertDateWritable`, `habits/service.ts:254`); the boundary day is still make-good-able. *Known asymmetry, accepted:* S5 also keeps a day it can't
  judge (partial + undefined policy) `unjudged` rather than missed. S6 still rejects a make-good beyond the window for such a day, because the window has
  closed regardless of the judgment (BR:120 is about the date, not the verdict).
- **W3 · Order + no state change.** The guard runs after parsing/step loading and **before** any entity drive (S3) or ledger write. A habit's own
  `BackfillWindowError` can still follow when the routine window is wider than the habit's backfill window (S3 propagates it, no stamp).
- **W4 · Reschedule:** W1–W2, then the S5 classification of `date` (one-day `judgeOccurrences`): `pending` ⇒ the due item; beyond the window ⇒
  `OutsideAcceptanceWindowError`; anything else ⇒ `NotMissedOccurrenceError`. Read-only.
- **W5 · Lifecycle:** the guard ignores lifecycle (a real miss is final, S5 A3). A paused routine's in-window days are `neutral` in S5, so they are not
  reschedulable (`NotMissedOccurrenceError`).

## Types
```ts
export class OutsideAcceptanceWindowError extends Error {
  constructor(public readonly stepId: string, public readonly date: string, public readonly windowDays: number)
}
export class NotMissedOccurrenceError extends Error {
  constructor(public readonly stepId: string, public readonly date: string, public readonly status: string)
}
// RoutinesService += rescheduleStep(stepId: string, date: string): Promise<DueItem>   (DueItem from ../sessions)
```

## Verification Gate (blocking — live store, Node 24, real better-sqlite3, the S3–S5 harness; `Date.now` pinned)
1. **completeStep / runStep guard:** window 2, today 10-26: D=10-23 → `OutsideAcceptanceWindowError`, no row (both ops); D=10-24 (the boundary) → ok;
   today/future → ok.
2. **Guard before a drive:** a task step with D beyond the window → rejected, and **the task is not completed**.
3. **Skips:** logged `skipStep` beyond → rejected; `planSkipDates(['10-20','10-30'])` with 10-20 beyond → rejected whole (no partial write);
   `editCompletion(D beyond, {skipped:true})` and `{skipped:false}` → rejected; `{actual_duration_minutes: 5}` → ok; `deleteCompletion` beyond → ok.
4. **No window ⇒ no guard;** a malformed window → `InvalidRoutinePolicyError` on a **past-date** write, but a **today** write succeeds.
5. **Paused:** a beyond-window write on a paused routine is still rejected (W5).
6. **Habits interaction:** routine window 30, a habit with a narrower backfill window → the routine guard passes, the habit's `BackfillWindowError`
   propagates, no stamp.
7. **rescheduleStep:** a pending (in-window, undone) occurrence → the due item (`ref_id` `stepId|date`, `urgency` 0, `est_minutes` 0, `hard_deadline` =
   UTC midnight of `addDays(D, window)`); no write. Beyond the window → `OutsideAcceptanceWindowError`. A done date, a planned-skip date, a paused
   in-window date, a non-occurrence (Tuesday for `WEEKLY;BYDAY=MO`), a future date, an unscheduled routine → `NotMissedOccurrenceError`. No window
   (past undone ⇒ `unjudged`) → `NotMissedOccurrenceError`; today undone → the due item without `hard_deadline`.
8. **Make-good agrees with S5:** an in-window missed day completed via `completeStep(D)` becomes `done` in `getAnalytics`.
9. **Ordering:** a missing step → `StepNotFoundError` before the window error.
Gates: tsc 0 · eslint 0 · routines suite green · full `@vida/core` sequential · g2 · /critique · §XXIX.

## g1 critique (folded): REVISE → 1 blocking (the R3/seam/slice-map "caller-date move" contradiction raised as an explicit §XXVIII amendment for
Victor) + 9 non-blocking (BR:104 grounds the delete/edit exemption; "same date predicate" + the unjudged asymmetry stated; window validated only on
past-date writes; reschedule valid iff S5 says `pending`, with one `NotMissedOccurrenceError`; `ref_id` = `stepId|date` and `hard_deadline` = UTC midnight of
the last make-good day; habits interaction; gate cases added; scope row split)

## Out of scope (homed)
Slot placement (`planned_blocks`, the session `rescheduled` state, the G5 algorithm) → Sessions Scheduler, `⚠ INTENDED-later` M1.2 (borrowed leg) ·
surfacing pending make-goods on the Calendar/Journal (S9 `dueIn` / `getDueReminders`) · effects (S7).
