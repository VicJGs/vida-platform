<!-- Forward spec — Routines ① S6 · Per-Step Build Gate (§XXVI) · authored before implementation · v3 (SS-8 shape, g1 folded) -->
<!-- Reschedule = a planned_block (intent) for the occurrence in a caller-given slot; the make-good creates the occurrence session carrying planned_block_id (SS-8). The acceptance window guards every make-good/skip/reschedule write. -->

# PLAN S6 — Reschedule (SS-8 intent block) + the acceptance-window write guard (v3)

> Slice-map S6 (amended by R3). ROU-10 (`rescheduleStep`), ROU-28 + ledger row A19. Base: S5c `46db9d6` (`current-*` → **current**).
> **v1** (no persistence) was revised by Victor 2026-10-22: routines start sessions. **v2** created the scheduled session at reschedule time;
> that was my own framing, not a doc rule, and g1 showed it can't be consumed (focus, TAS-12, time log). **v3** follows SS-8 literally.

## Grounding

- **What a reschedule is.** A missed occurrence moved to an open slot, then completed: RT-4 (`business-rules.md:26-29`; intake Q1 `:129`).
  The window bounds how long a miss stays "make-good-able / **reschedulable** (one week · N days)" (RT-6 `:35-37`; Q3 `:149-150`). Beyond it:
  `OutsideAcceptanceWindow`, "rejected, no state change" (`contract.md:55`; `business-rules.md:113,120`).
- **How it persists: SS-8** (`sessions-and-scheduling/business-rules.md:46-49`): "A block records the _plan_ (when/duration/window);
  completing it calls the owner's `createSession()`, which instantiates the sub-type carrying `planned_block_id`. The block is never itself the
  log." **SS-7** (`:42-45`): a block for module work **points at** the owner's item, it doesn't mirror it, and the engine (Sessions) owns
  `planned_blocks`. So:
  - the reschedule = a `planned_blocks` row targeting `('routine_step', stepId)`, written through Sessions;
  - the make-good = routines (the owner) runs its S5c drive, which creates the occurrence session, and links it with `planned_block_id`.
- **Not the M1.2 bridge.** The homed SS-8 bridge is the Planner's _generated_ blocks (`activatePlan` writes none; placement algorithm,
  recalc → M1.2, `sessions-and-scheduling/current-spec.md:154-157`). This slice writes one owner-made block for a caller-given slot
  (R3/seam `:68`/slice-map `:48`, approved at the Re-scope Gate); auto-placement stays the borrowed leg (slice-map `:60`). Nothing re-homed.
- **The Sessions surface this needs doesn't exist** (no block write, no block lookup). **R1 first-consumer-pull** (`gap2-schema-gates.md:9`):
  it lands with its first consumer, the `findOpenSessionForEntity` precedent (added by Tasks). Thin CRUD on an existing table, no algorithm.
- **Where the occurrence day D lives (derived).** A slot can fall on a later day inside the window, and the make-good stamps D (U1: the
  ledger row is (step, D)). No column holds D; a new column is excluded by **R3** ("schema is owned by the M1 foundation… MOD units build
  services over them", `gap2-schema-gates.md:16-18`; `scheduling.ts:6-7`: the aggregator extends columns at its own build); same-day-only is
  excluded by **Q3/RT-6**. That leaves the block's documented provenance column: `source = 'routines:<D>'`. Lookup is by exact match;
  one parser maps block → D.

## Scope

| #   | Ledger               | Change                                                                                                                                                                                                                                                                                                                                                               |
| --- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | —                    | **Sessions (R1):** `planBlock(input)` · `updatePlannedBlock(id, patch: {scheduled_start?, scheduled_end?, status?})` · `softDeletePlannedBlock(id)` · `listPlannedBlocksForTarget(type, id)` (live only). `sub_type` registry-validated when given. **`dueIn` filters `status ∈ {planned, scheduled}`**: fulfilled/skipped intent isn't due (SS-8: intent ↔ reality) |
| 2   | —                    | **Errors:** `OutsideAcceptanceWindowError(stepId, date, windowDays)` · `NotMissedOccurrenceError(stepId, date, reason)` · `InvalidRescheduleSlotError(stepId, reason)`                                                                                                                                                                                               |
| 3   | BR:120 / contract:55 | **Write guard** W1–W3 (as v1, already accepted)                                                                                                                                                                                                                                                                                                                      |
| 4   | A19                  | **`rescheduleStep(stepId, {date, slot:{start, end?}}): Promise<StepRunState>`** (status `'scheduled'`, `planned_block_id`): rules R1–R4                                                                                                                                                                                                                              |
| 5   | —                    | **Make-good fulfils the block** (R5)                                                                                                                                                                                                                                                                                                                                 |
| 6   | —                    | **Skip cancels the block** (R6)                                                                                                                                                                                                                                                                                                                                      |
| 7   | seam/docs            | seam ⟲ `rescheduleStep` amendment (was `(stepId, date): Promise<DueItem>`) + 3 typed errors · slice-map S6 row · routines `current-*` and Sessions `current-spec`/`contract.md` for the 4 methods + the `dueIn` filter (§XXIX)                                                                                                                                       |

## Rules

- **W1–W3 (guard).**
  - Load the step first: `StepNotFoundError` precedes any window error.
  - Only for `D < today`: read the user's policy and validate its window (malformed → `InvalidRoutinePolicyError`); `window === undefined` ⇒ no guard.
  - Beyond = `addDays(D, window) < today` (the S5 real-miss predicate).
  - Guarded: `completeStep`/`runStep` (past D), logged `skipStep`, `planSkipDates` (any past date; rejected whole), and `editCompletion` touching `skipped`.
  - Not guarded: `deleteCompletion` and other edits (RT-14/G7, `business-rules.md:104`).
  - The guard runs before any drive or write and ignores lifecycle (a real miss is final, S5 A3).
- **R1 · Reschedulable = make-good-admissible, at step level** (a reschedule is a scheduled make-good). All must hold, else
  `NotMissedOccurrenceError(reason)`:
  - D ≤ today;
  - D is an occurrence of the rule;
  - the step is in `stepsAsOf(D)`;
  - D is not planned-skipped;
  - the step is not done on D (`isDoneOn`);
  - the routine was active on D (A3: paused/off ⇒ neutral).

  The W2 window check runs first (beyond ⇒ `OutsideAcceptanceWindowError`). No window ⇒ any past undone D is admissible: the same rule
  `completeStep` follows (W1). A D with a logged skip is admissible; a make-good flips it to done (BR-RT-S3-2).

- **R2 · Slot.**
  - `start`, and `end > start` when given, are Unix ms; `start ≥ now`.
  - The slot's day S (the same day function as `clock()`) satisfies `S ≥ D`, and with a window `S ≤ addDays(D, window)` (the last make-good day).
  - Else `InvalidRescheduleSlotError`.
- **R3 · The block** = `planBlock({ scheduled_start, scheduled_end, sub_type, target_type:'routine_step', target_id: stepId, source:'routines:'+D })`
  (status = the column default `planned`). `sub_type` is the occurrence's: `work` (task/check-off) · `focus` · the registered sub-type ·
  null (habit/obligation). A check-off step with no Task yet is linked first (`linkCheckoffTask`, S5c). Nothing else is written: no session
  and no ledger row.
- **R4 · One pending block per (step, D).** `rescheduleStep` runs under `serialized(stepId)`. If a live `planned`/`scheduled` block exists for
  `routines:<D>`, it is moved (`updatePlannedBlock` slot), not duplicated.
- **R5 · Make-good fulfils it.** `runStep`/`completeStep(D)` run the **unchanged** S5c drive. Then, best-effort after the durable drive + stamp:
  - the occurrence session is linked (`updateSession(id, {planned_block_id, scheduling_mode:'planned'})`), including the focus timer's spine;
  - on `done`, the block → `fulfilled`. A `runStep` that starts a session links it but doesn't fulfil; a habit `advanced` result doesn't fulfil.
  - **R5b · A linked session belongs to its block's D.**
    - `runStep(D)` links the session it starts to D's block at once, inside the per-step lock.
    - Every open- or finished-session path stamps the occurrence day **D'** read from that session's block (`planned_block_id` → the
      block's `source` → `blockDate`), and only otherwise uses its S5c day. The paths are: `driveTask` with `open`, `driveSession` with
      `open`, `completeFocusStep`, and `settleFinishedFocus`.
    - So a `completeStep(today)` that meets D's running make-good completes **D** and leaves today untouched (the returned
      `state.date` = D).
    - A focus make-good started on S > D stamps D.
- **R6 · Skip cancels it.** Best-effort after the durable write: a logged `skipStep(D)`, `editCompletion(D,{skipped:true})`, or
  `planSkipDates` covering D sets D's pending block → `skipped`.
- **R7 · Atomicity.** `rescheduleStep` writes only the block (one write) or a slot move (one update), plus, for a not-yet-linked check-off step, the S5c migrate-on-touch (`linkCheckoffTask`, self-compensating). There is no other multi-write.

## Types

```ts
export interface RescheduleStepInput {
  date: string
  slot: { start: number; end?: number }
}
// StepRunState.status += 'scheduled'; StepRunState += planned_block_id?: string
// RoutinesService += rescheduleStep(stepId, input): Promise<StepRunState>
// SessionsService += planBlock · updatePlannedBlock · softDeletePlannedBlock · listPlannedBlocksForTarget
```

## Verification Gate (live store, Node 24, the S3–S5c harness, `Date.now` pinned)

1. **Guard:** window 2, today 10-26: `completeStep`/`runStep(10-23)` rejected, no row, no `work` session, task timer not started;
   10-24 (boundary) ok; today ok.
2. **Skips:**
   - logged `skipStep` beyond the window → rejected;
   - `planSkipDates(['10-20','10-30'])` → rejected whole;
   - `editCompletion` beyond `{skipped}` → rejected; `{actual_duration_minutes}` → ok;
   - `deleteCompletion` beyond → ok.
3. **No window ⇒ no guard;** malformed window → `InvalidRoutinePolicyError` on a past write; a today write succeeds.
4. **Reschedule a task step:** an in-window miss → one `planned` block (`target routine_step`, `source routines:D`, `sub_type work`);
   no session, no ledger row; the block appears in `sessions.dueIn` for the slot.
5. **Make-good:** `completeStep(D)` → one completed `work` session with `planned_block_id` = the block, block `fulfilled`, D `done` in
   `getAnalytics`, the block gone from `dueIn`. `runStep(D)` → session linked, block still `planned`.
6. **Re-reschedule moves** the slot (one block); a double-tap (concurrent calls) → one block.
   6b. **R5b isolation:** `runStep(D)`, then `completeStep(today)` → D done, block fulfilled, today untouched; for `work` and a running-capable
   `review`. Two pending Ds stay separate. A focus make-good run on S > D, then complete → D stamped, block fulfilled.
7. **Rejections, no write:**
   - beyond the window → `OutsideAcceptanceWindowError`;
   - `NotMissedOccurrenceError` for: done step, planned-skip, paused day, not an occurrence, future;
   - `InvalidRescheduleSlotError` for: slot before now, slot day < D, slot past the last make-good day;
   - `EntityUnavailableError` for: a non-drivable step (work without a task, half ref, unregistered sub-type with no ref), a habit with
     no `habits` dep, an unwired timer;
   - obligation → block `sub_type` null.
8. **Step level:** a threshold-done day with this step undone → reschedulable; no window + past undone → reschedulable.
9. **Targets:**
   - focus → block `sub_type focus`; a make-good run → complete links the timer spine and fulfils;
   - registered `review` (both lifecycles);
   - habit → `sub_type` null; a target-3 habit `advanced` doesn't fulfil, done does;
   - a check-off step without a Task gets linked first.
10. **Skip cancels:** logged skip / `editCompletion{skipped:true}` / `planSkipDates([D])` → block `skipped`, gone from `dueIn`.
11. **Sessions additions:**
    - each method round-trips;
    - `listPlannedBlocksForTarget` excludes soft-deleted blocks;
    - `planBlock` rejects an unregistered `sub_type`;
    - `dueIn` excludes fulfilled/skipped blocks (the sessions suite stays green).

Gates: tsc 0 · eslint 0 · routines + sessions suites · full `@vida/core` · g2 · /critique · §XXIX.

## Out of scope (homed)

- Auto-placement (G5) and recalc → `⚠ INTENDED-later` M1.2 (slice-map `:60`).
- **S9 input:** routines' own `dueIn` must not double-list D's occurrence and its block.
- Effects → S7.
- A stale `planned` block past its window → the Sessions edge-case rule: a block "whose target due-work vanished… resolves to **empty** and is
  auto-dropped/flagged, never a dangling row (SS-7 live-read)" (`sessions-and-scheduling/business-rules.md:72-74`). The closed window is
  the vanished due-work. The owner's live read is routines' `dueIn` provider → **S9** (drops/flags its own expired blocks).
- Cascade on `removeStep`/archive → S8.

## g1 critique (v2, folded into v3): REVISE

**8 blocking.** v3 adopts the SS-8 shape (block now, session at make-good), which dissolves:

- B1 (focus can't be consumed);
- B3 (TAS-12 bypass);
- B4 (0-minute time log);
- B8 (`runStep` on `review`);
- B2 (occurrence isolation).

The rest are fixed directly:

- B5 → step-level admissibility;
- B6 → the `dueIn` status filter;
- B7 → `softDeletePlannedBlock` + `serialized`.

**Grounding notes:**

- G1 → SS-8/SS-7 cited.
- G2 → D-link derived (R3 + Q3), no longer a fork.
- G3 → docs scope.
- G4 → skip cancel ordering and coverage.
- G5 → dropped (no session is created at reschedule).
- G6 → homed to S9 by `sessions-and-scheduling/business-rules.md:72-74`.
- G7 → edge cases.
- G8 → S9 input.

## Approval 1 — Victor 2026-10-22 ("Approved", v3)

## /preflight — PASSED

- **Frontend:** none (backend slice).
- **Backend:**
  - Operations typed: `rescheduleStep` plus the 4 Sessions methods.
  - Errors defined: 3 new; `StepNotFoundError` / `InvalidRoutinePolicyError` reused.
  - Auth: N/A (local-first, single user).
- **Database:** no schema change (R3).
  - Writes: `planned_blocks` (create / update / soft-delete); `sessions.planned_block_id` (via `updateSession`, verified `sessions/service.ts:343-354`).
  - Reads: `routine_completions` / `routine_step`.
  - `planned_blocks` has `deleted_at` → the repo soft-deletes (`:199`).
- **Integration:** routines → Sessions through the existing `sessions` dep; Sessions → `planned_blocks` through `plannedBlocksRepo`.
- **Ground truth:** routines `current-spec`/`current-business-rules` (S5c), Sessions SS-7/SS-8/edge-case `:72-74`. No conflict.
- **Assumptions (each grounded):**
  1. Day = `utcDay` (the module's `clock()` convention; the timezone question is settled).
  2. "Active on D" = the current lifecycle, the S5 `classify` precedent (`service.ts:999-1003`); there is no lifecycle history.
  3. `planBlock` validates `sub_type` with `registry.get` (the `createSession` precedent, `:284`).
  4. The make-good link/fulfil is best-effort after the durable stamp ([[best-effort-side-effect-after-durable-write-own-try]]).
  5. `stepsAsOf` with this step's ledger row set decides step membership on D.

## Implementation plan (§5)

1. **Tests first (red).** Routines Verification Gate 1–10 and Sessions gate 11, in the S3–S5c harness and the sessions suite.
2. **Sessions (R1)** (gate point: the sessions suite green):
   - `types.ts`: `PlanBlockInput`, `PlannedBlockPatch`.
   - `validators/session.ts`: `PlanBlockSchema` (int `scheduled_start`, `scheduled_end > start`) + `PlannedBlockPatchSchema`
     (status via `PlannedBlockStatusSchema`), the `CreateSessionSchema` precedent. `target_type` is validated through
     `entityRegistry.isRegistered` (BR-6, the `attach` precedent).
   - `service.ts`:
     - `planBlock` (registry-validates `sub_type`);
     - `updatePlannedBlock`;
     - `softDeletePlannedBlock`;
     - `listPlannedBlocksForTarget` (filters `deleted_at`, since `findWhere` skips the soft-delete filter);
     - `dueIn` filter `status ∈ {planned, scheduled}`.
3. **Routines types / validators / index:**
   - the 3 errors;
   - `RescheduleStepInput` + `RescheduleStepSchema` (`date` CalendarDate; `slot.start` int; `slot.end` int optional);
   - `StepRunState.status` += `'scheduled'`, + `planned_block_id?`;
   - barrel exports (grep collisions first, [[barrel-export-star-collides-with-services-on-generic-names]]). The routines barrel is explicit:
     add the 3 errors + `RescheduleStepInput` by name.
   - tsc stays red from step 3 until 4c (the new interface member); step gate points are vitest-only until then.
4. **Routines service.**
   - **a. Guard.** `assertWritable(step, date)`: `D < today` → `prefs.policyFor(step.routine_id)` (no routine load). The window is
     validated by **one helper shared with `loadWindow`** (extracted from `service.ts:980-984`, so the two can't drift). Beyond ⇒
     `OutsideAcceptanceWindowError`. The skip-carrying writes (`skipStep` / `planSkipDates` / `editCompletion`) move under
     `serialized(stepId)`, so a skip can't race a reschedule. Wired into:
     - `completeStep` / `runStep`, inside `serialized`, before the drive;
     - `skipStep`, before `upsertCompletion`;
     - `planSkipDates`, every past date, before the write;
     - `editCompletion`, when `'skipped' in p`.
   - **b. Blocks.** `blockSource(D)` / `blockDate(source)`; `pendingBlock(stepId, D)` = a live block targeting `('routine_step', stepId)` with `source === blockSource(D)` and status `planned` / `scheduled`.
   - **c. `rescheduleStep`.**
     1. Parse, then `serialized(stepId)`, then load the step, then the guard.
     2. **Resolve the target** (`resolveTarget`); any write comes after this:
        - unresolvable, or habit with no `habits` dep → `EntityUnavailableError`;
        - task → `tasks.getTask` kind: obligation → `sub_type` null; standard → `work`, and an unregistered `work` (timer unwired) →
          `EntityUnavailableError`;
        - check-off → `work`, `target` `task`, set directly (the step row is stale after `linkCheckoffTask`).
     3. R1 admissibility: an occurrence on D (single-day `occurrences`) · `stepsAsOf` · not in `skip_dates` · `!isDoneOn` · routine active.
     4. R2 slot. One time source: `Date.now()` for `start ≥ now`; S = `utcDay(start)`, the `clock()` convention.
     5. Link a check-off step to its Task.
     6. Move the existing block, or `planBlock`.
     7. Return `{ step_id, date: D, target, status:'scheduled', completion: null, planned_block_id }`.
   - **d0. R5b day attribution.** `blockOfSession(session)` → D' or null, a read through `listPlannedBlocksForTarget('routine_step',
stepId)` matched by id. It is used in `driveTask` (`open`), `driveSession` (`open`), `completeFocusStep`, and `settleFinishedFocus`
     (the stamp day and the returned `date`).
   - **d. Make-good hook.** Runs **inside** the `serialized` callback after `driveStep`, keyed on the returned `state.date`, and also on
     the already-done early returns (a retry re-settles a swallowed fulfil). Best-effort:
     - with a `session_id` → `updateSession({planned_block_id, scheduling_mode:'planned'})`;
     - when `status === 'done'` → block `fulfilled`.
   - **e. Skip hooks.** Best-effort after the write; the block → `skipped`:
     - `skipStep(D)`;
     - `editCompletion(D, {skipped:true})`;
     - `planSkipDates` for each date that has a pending block.

   Gate point: the routines suite green after 4a (no regressions), then after 4e.

5. **Docs (row 7).**
   - Seam ⟲ `rescheduleStep` + the typed errors.
   - The slice-map S6 row.
   - Sessions `contract.md` + `current-spec` (4 methods, `dueIn` filter).
   - Routines `current-spec` / `current-business-rules` (§XXIX).
   - `routines/CLAUDE.md`.
6. **Gates:** tsc · eslint · routines + sessions · full core · g2 · /critique · §XXIX.

## Step-5 critique (folded): REVISE

**3 blocking:**

- B1 focus stamped on the slot day → R5b;
- B2 the open-session paths aren't keyed by date → R5b + gate 6b;
- B3 `rescheduleStep` resolves no target → 4c.2 + the gate-7 cases.

**Non-blocking, all folded:**

- the hook inside the lock, keyed on `state.date`, also on done paths;
- skip writes serialized;
- R4/4b status wording;
- the guard reads prefs only, via a shared window helper;
- Sessions Zod schemas + `target_type` registry check;
- the R7 wording;
- one time source;
- the tsc-red note.

Note: `softDeletePlannedBlock` has no S6 consumer; kept as approved v3 scope.
