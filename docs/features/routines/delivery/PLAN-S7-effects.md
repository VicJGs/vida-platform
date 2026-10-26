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
- **Authority = D3** (`interpretation.md:182-184`, approved by Victor 2026-10-14): "The routine-level **policy-done** emits the routine's
  `award_xp` + `contribute_purpose_metric`." RT-7 / ROU-21: "a routine-completion event fires `grant_currency(XP)`". The trigger is the
  routine **reaching policy-done**, whatever made it done: a routine write, or an entity completed in its own module that the routine
  reflects (RT-3, S4 E2). **⟲ §XXVIII amendment of rule 21:** rule 21's "fire on the ledger write" was my `[INTERP, habits precedent]`
  (`:156-160`, "the exact write path is pinned in the effects slice PLAN"). It narrowed D3 to routine writes and is corrected here.
- **Detection — every read stays pure.** E7 / BR-RT-S4e-6 ("Read-only. No writes, no effects"), the S5 read-only rule and rule 21's
  "Evaluation is a read" all stand. Routines has no documented listener on other modules. So a reflected done is settled by **one
  explicit, effectful operation**, not by reads:
  - **Writes (any date):** inside the per-step lock, D is evaluated before and after the write; not-done → done ⇒ emit (the transition).
  - **`settleToday(routineId)`:** if today is a scheduled occurrence and is done (any cause, D3), emit; the rail dedups. Called by the
    surface that renders the routine/Journal day (composition-root wiring = fe-routines entity close, the N5 "shipped, not called"
    pattern of S9).
- **Occurrence-gated** (S4 E8 "the caller picks the occurrence"; S5 A6 "no rule ⇒ no occurrences"): emission, on writes and on settle,
  requires `date ∈ occurrences(recurrence_rule)`. No rule ⇒ nothing emits. So a routine-day emits the same way whichever path reaches it.
- **E7 kept by construction.** E7 forbids a policy-change emit for past dates. With no per-day prior state, a past day's cause can't be told
  apart, so past days emit **only** through a write's transition; `settleToday` covers today only (not yet judged final, `classify` keeps
  today `pending`, `service.ts:1102`).
- **Recorded limit (raised at Approval 1):** a reflected completion on a past day emits nothing if the routine never settled that day. This
  is E7 enforced without per-day prior state. Examples: a habit backfilled in Habits for yesterday, or habits ticked on a day the
  routine/Journal wasn't opened. Meanwhile a make-good through `completeStep(D)` does emit (it is a write transition).
- **⟲ §XXVIII amendments (Approval 1):**
  1. **Rule 21** (`interpretation.md:156-160`, `[INTERP]`) "fire on the ledger write" → "fire on the write's not-done→done transition,
     **plus** `settleToday` for a reflected done today" (under D3);
  2. **slice-map S7 row** (`:49`) "on the write that reaches policy-done" → the same, plus occurrence gating and `settleToday`.

  No read rule is amended.
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
| 3a | D3 | **`settleToday(routineId): Promise<{ emitted: EffectType[]; failed: EffectType[] }>`**: `RoutineNotFoundError` (archived/missing); guard first (no `effects` / no resolvable type ⇒ `{[],[]}`, zero reads); today ∈ occurrences and `status === 'done'` ⇒ fire both effects, isolated; failures are returned, never thrown (the caller can flag; the next settle retries, because a handler throw rolls back the rail's `applied_effects` insert) |
| 3b | G8 | `StepRunState.flag` += `'effect_emit_failed'` (set when an effect handler threw on a drive); `contributeToPurposeMetrics(routineId, date)`, re-drivable: `RoutineNotFoundError`; not done ⇒ no-op; guarded; a throw ⇒ `RoutineContributionError(routineId, date, cause)`. Seam + typed-error list updated |
| 4 | docs | seam `effects` dep (as-built) · slice-map S7 row · `current-*` (§XXIX) · routines `CLAUDE.md` |

## Rules
- **F1 · Transition only (writes) · done-today (settle) · occurrences only.** A write emits iff D is an occurrence and went not-`done` → `done`
  (E7: either `policy_source`; partial + undefined never). `settleToday` emits iff today is an occurrence and `done`. A failing evaluation (e.g. a malformed policy) skips emission: the write already persisted (rule 13), and the error
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
6. **Reflected completion emits via `settleToday` (D3):**
   - a habit step completed in Habits today → `settleToday(rid)` emits once; a second settle → `{emitted:[], failed:[]}` with no new grant;
   - an obligation completed in Tasks today → settle emits once;
   - a habit completed in Habits yesterday and never settled → nothing ever emits for yesterday (the recorded limit).
6a. **E7:** the threshold is loosened so a past day becomes done → no path emits for it; loosened so today becomes done → `settleToday` emits.
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
- **G2 · Settle guard:** no `effects` ⇒ `settleToday` makes no rail calls. A throwing handler ⇒ `failed` lists it, and the next settle
  applies it once.
- **G3 · Occurrence gating:** a write that completes a non-occurrence day (Tue for `WEEKLY;BYDAY=MO`) emits nothing; a routine with no rule
  emits nothing on writes or settle.
- **G4 · Archived:** `settleToday` → `RoutineNotFoundError`, no emit.
- **G5 · `updateStep`** that only removes a skip date → no evaluation, no emit.

**G8 residual (stated):** the flag channel exists on drives only. The other writes isolate silently, as habits' auto path does. A failed
`award_xp` on a past-date write is not re-driven (the transition doesn't recur). `contribute_purpose_metric` has the re-drivable
`contributeToPurposeMetrics`, and today's grants self-heal through `settleToday`.

## Out of scope (homed)
Calling `settleToday` from the rendered day (composition root, fe-routines entity close, N5) · Gamification's handlers / `consequence_ledger` (Gamification module) · the Purposes contribution handler and the `contributions` junction
(Purposes, ADR-011) · composition-root wiring of `effects` (fe-routines entity close, process §4) · providers/fan-out (S9).

## g1 critique (folded): REVISE
**3 blocking:**
- B1 emit on the transition for writes (E7), and the reflection case: Victor said "check the documentation", and D3 answers it (→ today-settle + rule-21 amendment);
- B2 failures flagged + a re-drivable contribution (G8, the habits precedent);
- B3 the trigger set grounded in the occurrence record (+`updateStep{skip_dates}`, +`deleteCompletion`), and VG3 corrected.

**Non-blocking, folded:** N1 guard first · N2 null `routine_id` · N3 spy filter · N4 RT-19 grounding · N5 future dates stated · N6 gates · N7 concurrency.

## g1 re-check (folded): REVISE
- B1: the amendment is declared in full; reads stay pure, so only rule 21 and the slice-map S7 row change.
- B2: read-settle replaced by an explicit `settleToday`.
- B3: occurrence gating.
- Non-blocking, folded: N1 (the limit reworded and raised) · N2 (G8 residual stated) · N3 (RT-5 citation dropped) · N4 · gates G1–G5.
