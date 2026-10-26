<!-- Forward spec — Routines ① S7 · Per-Step Build Gate (§XXVI) · authored before implementation -->
<!-- Routine-level award_xp + contribute_purpose_metric on the ledger write that reaches policy-done (D3, rule 21), guarded + post-commit. -->

# PLAN S7 — Routine-level effect emission (D3)

> Slice-map S7: ROU-21, ROU-22 · ledger A26 (routine-level effects) + C7 (the N8 producer guard). Base: S6 `23aba04` (`current-*` → **current**).

## Grounding
- **What fires.** D3: a routine reaching done emits the routine-level `award_xp` and `contribute_purpose_metric` through `effects.rail`, and
  never writes XP or the ledger itself (interpretation `:104`, rule 2 `:117`; seam `:119` "routines emits effects; Gamification owns
  `consequence_ledger`").
  - **No `emit_measurement_signal`.** RT-19: the routine "advertises no M5 source, outside the applies-to set" (`business-rules.md:89-90`);
    rule 12 ("advertise no M5 source"); D3 lists exactly two effects. Its measure is a `derived-pull` READ (identity `:37`, contract `:23`).
- **Key.** The key is `subjectNaturalKey = routine.id` +
  `transition = 'completed:<date>'` (the habits key shape, `habits/service.ts:145-149`). `award_xp` is additive: an undo after done does not
  retract it, the same as habits.
- **Which done** (S4 E7, pre-declared, `PLAN-S4:118-123`):
  - emit only for `status === 'done'`, under either `policy_source`;
  - `partial` + `'undefined'` never emits;
  - a later policy change never emits for past dates.
- **When — rule 21** (`interpretation.md:156-160`, Interpretation Gate; slice-map S7 row `:49`): the trigger is a **write path**, never
  `evaluateRoutine` (a read). The effects fire "on the ledger write that makes the routine's evaluation **reach** policy-done for that
  date": the not-done → done transition of D, evaluated before and after the write inside the per-step lock. Reads stay pure (E7,
  BR-RT-S4e-6, S5).
- **Reflection-only done → no emission** (rule 21 + slice-map S7; this answers S4 E7's "S7 decides" item). A day that becomes done with no
  routine write behind it has no write to fire on. The step's own entity still fires its own effects on its own key (D3, F4).
- **E7** (`PLAN-S4:118-123`) holds by construction: emission only on a write's transition, so a later policy change never emits for past dates.
- **Occurrence-gated** (S4 E8 "the caller picks the occurrence"; S5 A6 "no rule ⇒ no occurrences"): emission requires
  `date ∈ occurrences(recurrence_rule)`, so a routine-day behaves the same in emission and in analytics. No rule ⇒ nothing emits.
- **Idempotency** is also the rail's (`subjectNaturalKey | transition | effectType | targetRef`, composite PK on `applied_effects`).
  A day undone and re-done re-transitions, but the same key dedups it: one grant per routine-day. Habits' "every done-leaving mutation"
  stance is not borrowed: habits has no policy layer, so E7 can't arise there.
- **Failure is flagged, never silently dropped** (`business-rules.md:122-123` [G8]: "the contribution/emit is **flagged**"). This mirrors
  habits (habits BR:81-82; HAB-17/19, `habits/service.ts:398-407`). Like habits, the auto path is isolated, and failures surface two ways:
  - on the drive's `StepRunState.flag` (the `recurrence_regen_failed` channel, `routines/types.ts:191-192`);
  - through a **re-drivable** `contributeToPurposeMetrics(routineId, date)` that throws a typed `RoutineContributionError`.

## Scope
| # | Ledger | Change |
|---|---|---|
| 1 | C7 | `RoutinesServiceDeps.effects?: { rail: EffectRail; registry: EffectRegistry }` (seam `:28`); dormant when absent |
| 2 | A26 | `withEmission(step, dates, write)`, the transition gate:<br>1. **Guard first** (N1): no `effects` dep, no resolvable type, or a null `routine_id` ⇒ run the write only, with zero extra reads.<br>2. Evaluate each date (internal `judgeDay`, as `evaluateRoutine`).<br>3. Run the write.<br>4. Re-evaluate, and for each date that went not-done → done, fire `award_xp` then `contribute_purpose_metric`: guard `resolve`, then `applyEffect({ subjectNaturalKey: routineId, transition: 'completed:'+date, effectType, targetRef: routineId })`, each in its own try/catch.<br>5. Return the failures for the flag |
| 3 | A26 | **Wired on every write to the occurrence record** (interpretation §3 "Occurrence record" = `routine_completions` incl. logged skips + `skip_dates`), inside the per-step lock:<br>• `completeStep` / `runStep`: before = `input.date`; after = the stamped `state.date` (R5b), whose own before-state is read before the drive;<br>• `skipStep` · `editCompletion`;<br>• `deleteCompletion` (moved under `serialized`): deleting a non-neutral skipped row of a step outside D's base set can drop it from `stepsAsOf`, so D can reach done;<br>• `planSkipDates` and `updateStep` with `skip_dates` in the patch, for each newly added date.<br>Not wired: other step CRUD and `rescheduleStep`, which don't write the occurrence record |
| 3b | G8 | `StepRunState.flag` += `'effect_emit_failed'` (set when an effect handler threw on a drive); `contributeToPurposeMetrics(routineId, date)`, re-drivable: `RoutineNotFoundError`; not done ⇒ no-op; guarded; a throw ⇒ `RoutineContributionError(routineId, date, cause)`. Seam + typed-error list updated |
| 4 | docs | seam `effects` dep (as-built) · slice-map S7 row · `current-*` (§XXIX) · routines `CLAUDE.md` |

## Rules
- **F1 · Transition only, occurrences only.** A write emits iff D is an occurrence and went not-`done` → `done` (E7: either
  `policy_source`; partial + undefined never). A failing evaluation (e.g. a malformed policy) skips emission: the write already persisted (rule 13), and the error
  still surfaces on reads.
- **F2 · Key.** `routine.id` + `completed:<date>`, targetRef `routine.id`, no payload (the habits/tasks precedent; the handler reads the
  date from the transition). One routine-day = one grant: an undo then re-do re-transitions but dedups on the same key (additive, never
  retracted). Future-dated writes (an existing S3 capability) emit on their date; there is no doc basis to restrict them.
- **F2b · Concurrency.** Writes to different steps of one routine hold different locks. Both may see the transition, and the rail's
  composite PK dedups. Residual risk: none beyond a no-op second `applyEffect`.
- **F3 · Guarded + isolated.** No `effects` dep ⇒ nothing. No handler for a type ⇒ skip that type. A handler throw ⇒ swallowed per type;
  the write's result is unchanged.
- **F4 · No double-count with the entities** (ADR-004 §3.2.4, U1). The routine's effects key on `routine.id`. A step's entity fires its
  own effects on its own key (the habit's `completed:<date>`, the task's completion, the session's declared effects). Different subjects,
  so no event is counted twice.
- **F5 · Lifecycle-independent.** E7: lifecycle doesn't change the evaluation, so a paused routine whose day reaches done emits (paused
  only neutralises misses, RT-6).

## Verification Gate (live store, Node 24, the S3–S6 harness; spy handlers registered in the shared effect registry)
Spies are filtered by `subjectNaturalKey === routine.id` (the shared registry also receives task/habit calls).
1. **Done emits once:** 2-step all-or-nothing routine. Completing step 1 → nothing. Completing step 2 → one `award_xp` + one
   `contribute_purpose_metric`, both with `subjectNaturalKey = routine.id`, `transition = completed:D`, `targetRef = routine.id`.
   Re-completing a step → no new call (no transition; `rail.applyEffect` spy call-count proves the service gate).
2. **Partial never emits:** threshold 100 with 1 of 2 done → nothing. Undefined policy + partial → nothing.
3. **Reached via skip:**
   - all-or-nothing + `miss.logged_skip:'neutral'`: step 1 done (partial, nothing), then `skipStep(step2)` → emits;
   - `planSkipDates(step2, [today])` → emits even under an undefined policy (a planned skip is always neutral);
   - `updateStep(step2, {skip_dates:[today]})` → emits;
   - undefined policy + logged skip → nothing (a logged skip counts as not-done without a policy).
3b. **E7:** D partial under threshold 100; the policy moves to 50 (D now done, nothing emitted); a later duration-only `editCompletion` on D
   → still nothing.
3c. **Edits and delete:** `editCompletion` un-skip reaching done → emits; `deleteCompletion` of a skipped row that drops a step from D's
   set → emits; a threshold case where a neutral skip lifts the ratio over the bar → emits.
4. **Guarded:** no `effects` dep → writes succeed, nothing emitted. A registry with only `award_xp` → only `award_xp`. A throwing handler →
   the write still returns its normal result and the row persists.
5. **Undo doesn't retract; re-done doesn't re-grant:** done → emitted → `deleteCompletion` (not done) → re-complete → still exactly 1
   grant per type.
6. **Reflection-only done (rule 21):** a habit step completed in Habits → the day is done in `evaluateRoutine`, and nothing is emitted for the
   routine (the habit's own effects fire on the habit's key). A later `completeStep` on that already-done day → still nothing (no transition).
6a. **E7:** the threshold is loosened so a past day becomes done → nothing emits; a later duration-only edit on that day → still nothing.
6b. **Flagged:** a throwing `contribute_purpose_metric` handler → the drive returns `flag:'effect_emit_failed'` with the row persisted;
   `contributeToPurposeMetrics(rid, D)` → `RoutineContributionError`; on a not-done day → no-op.
6c. **Null `routine_id`** step → writes succeed, no evaluation, no emit.
7. **R5b date:** a make-good completed under today's date for D emits `completed:D`.
8. **Entity effects unaffected:** an obligation step's task `award_xp` still fires keyed on the task (existing test), and the routine's fires
   keyed on the routine: two subjects, one each.
9. **Paused** routine reaching done emits.

Gates: tsc 0 · eslint 0 · routines suite · full `@vida/core` · g2 · /critique · §XXIX.

**Additional gates (re-check):**
- **G1 · Read purity:** `evaluateRoutine` / `getStreak` / `getAnalytics` / `progress` never call the rail (spy count 0), with effects wired
  and today done.
- **G3 · Occurrence gating:** a write that completes a non-occurrence day (Tue for `WEEKLY;BYDAY=MO`) emits nothing; a routine with no rule
  emits nothing on writes or settle.
- **G5 · `updateStep`** that only removes a skip date → no evaluation, no emit.

**G8 residual (stated):** the flag channel exists on drives only. The other writes isolate silently, as habits' auto path does. A failed
`award_xp` is not re-driven (the transition doesn't recur); `contribute_purpose_metric` has the re-drivable `contributeToPurposeMetrics`.

## Out of scope (homed)
Gamification's handlers / `consequence_ledger` (Gamification module) · the Purposes contribution handler and the `contributions` junction
(Purposes, ADR-011) · composition-root wiring of `effects` (fe-routines entity close, process §4) · providers/fan-out (S9).

## g1 critique (folded): REVISE
**3 blocking:**
- B1 emit on the transition for writes (E7); the reflection case is answered by rule 21 (Victor: "check the documentation");
- B2 failures flagged + a re-drivable contribution (G8, the habits precedent);
- B3 the trigger set grounded in the occurrence record (+`updateStep{skip_dates}`, +`deleteCompletion`), and VG3 corrected.

**Non-blocking, folded:** N1 guard first · N2 null `routine_id` · N3 spy filter · N4 RT-19 grounding · N5 future dates stated · N6 gates · N7 concurrency.

## g1 re-check (folded): REVISE
- B1/B2: reverted to the documented trigger (Victor 2026-10-26: "everything is described in the documentation"). Rule 21 decides the
  reflection case, so there is no amendment, no read-settle and no `settleToday`; reads stay pure.
- B3: occurrence gating.
- Non-blocking, folded: N1 (the limit reworded and raised) · N2 (G8 residual stated) · N3 (RT-5 citation dropped) · N4 · gates G1–G5.

## Approval 1 — Victor 2026-10-26 ("Approved")

## /preflight — PASSED
- **Frontend:** none.
- **Backend:**
  - New dep `effects?: { rail: EffectRail; registry: EffectRegistry }` (inline shape: the `EffectsPort` name is owned by checkins, a barrel collision, per memory).
  - New op `contributeToPurposeMetrics(routineId, date): Promise<void>`.
  - New error `RoutineContributionError(routineId, date, cause)`.
  - `StepRunState.flag` += `'effect_emit_failed'`.
  - Auth N/A.
- **Database:** no schema change. Writes go through the rail only (`applied_effects` + the handlers' own tables; routines never writes XP, rule 2).
- **Integration:** routines → `effects.rail.applyEffect`, guarded by `registry.resolve` (N8).
- **Ground truth:** routines current-* (S6). No conflict; reads stay pure (BR-RT-S4e-6).
- **Assumptions (grounded):**
  1. "Done" = `judgeDay(...).status === 'done'` under the user's policy at write time.
  2. The occurrence check reuses `occurrences(rule, utcDay(created_at), D, D)` (the S5/S6 expansion).
  3. Precedence when a drive hits both failures: `recurrence_regen_failed` wins, because it is the entity's failure; the contribution stays
     re-drivable through `contributeToPurposeMetrics`.
  4. Found while grounding: `updateStep{skip_dates}` is a skip write that S6's guard missed. It gets the same W1–W3 guard here (BR:120),
     alongside its new emission wiring.

## Implementation plan (§5) — v2 (step-5 critique folded)
1. **Tests first (red) + harness:**
   - `setup()` passes `effects: { rail, registry }` (opt-out `effects:false` for VG4) and returns `rail`.
   - Routines calls `deps.effects.rail.applyEffect(...)` (no destructured method), so `vi.spyOn(rail, 'applyEffect')` works.
   - Spy handlers for both types are registered on the fresh registry passed through `setup({ effectRegistry })` (the test-#13 pattern).
     Tasks only *emits* `award_xp`, so there is no duplicate registration.
   - Counts are filtered by `subjectNaturalKey === rid`. Tests pin `Date.now` before `createRoutine`, so DTSTART ≤ D and occurrence
     gating isn't vacuous.
   - VG6 asserts only the routine side (habits is built without `effects`).
   - Tests cover VG 1–9, 3b, 3c, 6, 6a, 6b, 6c, G1/G3/G5, plus:
     - cross-midnight focus → `completed:<yesterday>` (B1);
     - deleting a row of a step soft-deleted on D (B2);
     - `planSkipDates` with several dates (occurrence and non-occurrence days, one already present);
     - a stamping `runStep` (obligation);
     - flag precedence (both failures);
     - `contributeToPurposeMetrics`: `ZodError` on a malformed date, `RoutineNotFoundError`, no-op without `effects`;
     - `updateStep` ordering (`StepNotFoundError` before the window error) and a malformed threshold (write persists, no emit);
     - VG5 counts handler calls, not `applyEffect` calls.
2. **Types/index + service skeleton (one gated step, green):**
   - `effects?` dep; `StepRunState.flag` union; `RoutineContributionError`; explicit barrel names;
   - `contributeToPurposeMetrics` implemented in full here (step 3d below), so tsc stays green.
3. **Service:**
   - **a. Emission context** (guard first: no `effects`, no resolvable type, or a null `routine_id` ⇒ none, zero reads).
     - Load the routine (a missing routine ⇒ none). No rule ⇒ none (no step reads).
     - Read the policy and `all` (`findWhere` incl. soft-deleted).
     - `doneOn(date)` = occurrence check (cheap, first) → `completionsBetween` → `judgeDay` with a fresh `Reflection`.
     - **Every read is wrapped (N2):** a throw in the before- or after-evaluation ⇒ no emission. The write always runs and returns.
   - **b. Drives (`completeStep` / `runStep`), around `driveStep` only, inside the lock** (emission and `settleBlock` are independent;
     `settleBlock` writes no occurrence record):
     1. Before the drive: `before(D)` for the input date. Obligation and habit drives change reflection, so this is a real pre-write read.
     2. `stamp` records the step's prior ledger row in a per-call holder scoped to the per-step lock.
     3. After the drive: if nothing was stamped (`completion == null`, e.g. `in_progress`), no date is evaluated.
     4. If `state.date === D`: `after(D)` via fresh reads → transition check.
     5. If `state.date ≠ D` (R5b / cross-midnight focus): D wasn't written and is skipped. The target is non-reflecting (work / session /
        focus; only obligation and habit reflect, and both stamp D), so `before(state.date)` = `judgeDay` over the fresh post-write rows with
        this step's entry swapped for the recorded prior row (or removed). This is exact. `after(state.date)` = the fresh read.
     6. Skip the after-read for a date already done before (done → done never emits).
   - **c. Other writes** (fresh `all` + rows + `Reflection` for after; only routine and policy are reused, N1):
     - `skipStep` · `editCompletion`: D.
     - `deleteCompletion`, moved under `serialized`. Zod → find the step **without** the soft-delete filter (`findWhere(eq(routineStep.id,
       …))`, the rule-7 exception) → `CompletionNotFoundError` → delete. An absent step only skips emission. No window guard (S6 leaves
       it unguarded).
     - `planSkipDates`: one `completionsBetween(min, max)`, evaluating only newly added occurrence dates.
     - **`updateStep`, under `serialized` (N3):**
       1. parse and `assertEntityType`;
       2. `loadStepOrThrow`: `StepNotFoundError` (was a generic `Row not found`, a recorded behaviour change);
       3. the W1–W3 guard on **newly added** past `skip_dates` only, always (with or without `effects`). This deliberately differs from
          `planSkipDates`: `updateStep` replaces the whole array, so an old past date must not block an unrelated edit;
       4. write;
       5. emission over the newly added dates.
   - **d. `contributeToPurposeMetrics(routineId, date)`:**
     1. `RoutineCalendarDateSchema.parse(date)`, then `loadRoutineOrThrow`;
     2. no `effects` / no handler ⇒ no-op;
     3. not an occurrence, or not done ⇒ no-op;
     4. `applyEffect` (rail-idempotent);
     5. a throw ⇒ `RoutineContributionError`.
   - **e. Flag:** a drive whose emission had a failure sets `flag:'effect_emit_failed'` unless `recurrence_regen_failed` is already set.

   Gate point: the full routines suite green.
4. **Docs:**
   - seam: the `effects` dep as-built, `contributeToPurposeMetrics`, `RoutineContributionError`, and `updateStep`'s new errors
     (`StepNotFoundError` · `OutsideAcceptanceWindowError` · `InvalidRoutinePolicyError`);
   - the slice-map S7 row;
   - routines `current-spec` / `current-business-rules` (BR-RT-S7-*) (§XXIX);
   - `routines/CLAUDE.md`.
5. **Gates:** tsc · eslint · routines suite · full core · g2 · /critique · §XXIX.

**Cost with effects wired:** a write costs about 2×(4 + reflecting steps) reads; there is an early exit with no rule, and no after-read when D
was already done. With no `effects` dep: zero.

## Step-5 critique (folded): REVISE
- **B1:** the stamped date's before-state is rebuilt from the prior-row holder.
- **B2:** `deleteCompletion` finds the step without the soft-delete filter.
- **Non-blocking:** N1 fresh after-reads · N2 before-read throw isolation · N3 `updateStep` guard order/scope · N4 harness · N5 merged step 2 ·
  gate gaps · minor.
