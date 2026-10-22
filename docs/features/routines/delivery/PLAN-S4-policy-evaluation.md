<!-- Forward spec — Routines ① S4 · Per-Step Build Gate (§XXVI) · authored before implementation -->
<!-- Policy evaluation: derive-on-read over the ledger, with the USER's policy. No hardcoded policy values. -->

# PLAN S4 — Policy evaluation (`evaluateRoutine`)

> Slice-map S4. ROU-12 (`evaluateRoutine`), ROU-24 (policy is configuration), ROU-30b (`PolicyUndefined`) + ledger row A20 and the R4
> seam amendment. Grounded in `delivery/interpretation.md` (rules 3, 4 · R4), the amended `delivery/seam-contract.md`, and the docs below.
> Closes with the live-store Verification Gate.

## 1a. Context docs
`docs/modules/routines/current-*` were promoted at S3 (`8b1fb85`) → **current**.

## Grounding — the policy is the USER's (doc-fixed; Victor confirmed 2026-10-22)
- **The done rule, the miss policy and the acceptance window are user-defined.** Intake Q2: "The 'done' rule is USER-DEFINED … the user picks his
  policy per his method: all-or-nothing · required-node · threshold/partial". Q3: "Miss-computation is user-personalized: the user controls how
  misses count AND the acceptance window (one week · N days · …)" `[FACT: docs/intake/routines.md:141-150]`.
- **Where defaults come from:** Spaces records Routines as a "major personalization consumer". The completion, miss and acceptance-window
  policies are a **Spaces personalization surface**, with templates/presets (SP5) as the "ship defaults, user personalizes everything"
  mechanism `[FACT: docs/intake/spaces.md:178-185]`. So **routines hardcodes no policy values**; it reads the user's policy through
  `prefs?: RoutinesPrefsPort` (the habits `HabitsPrefsPort` port precedent `services/habits/types.ts:36-46`). *(This supersedes interp R4's
  "shipped default values = a Victor call at this PLAN", which was drift.)*
- **No policy resolved** (`PolicyUndefined`, contract.md:56): routines returns the honest, policy-independent evaluation and **flags** it
  (`policy_source: 'undefined'`).
  - "What was done" is **always** returned (RT-5, "never discarded").
  - Two judgments hold under **every** doc policy and need no configuration: **all applicable steps done ⇒ `done`** (meets all-or-nothing,
    so it meets required-node and any threshold ≤ 100%) and **none done ⇒ `not_started`**.
  - Anything in between is `partial` + the flag: the consumer knows the done-judgment needs the user's policy.
- **Derive, never cache (rule 3, RT-14), over "the ledger + driven-step occurrences"** (approved slice-map S4, `slice-map.md:45`). A step is done if
  the routine stamped it (S3 stamps when the driven entity is done; actionable steps stamp directly), **or** its driven entity is done for that date.
  That is RT-3 "the routine reflects the entity" (PLAN-S3: "further reps go through the habit's own detailed logging, and the step reflects them").
  RT-5's "persisted" is the per-step ledger rows; the evaluation itself is never stored.
- **Planned skip = neutral** (RT-8, the one default the docs state): a step with `date ∈ skip_dates` is excluded from the applicable set.

## Scope (in S4)
| # | Ledger | Change |
|---|---|---|
| 1 | A2 (S4 dep) | Factory gains **`prefs?: RoutinesPrefsPort`** (optional, seam). Absent ⇒ every evaluation is `policy_source:'undefined'` |
| 2 | A20 | **`evaluateRoutine(routineId, date?): Promise<RoutineEvaluation>`** (date default = `clock()`, `YYYY-MM-DD`-validated) |
| 3 | R4 seam | **`RoutineEvaluation.policy_source: 'user' \| 'undefined'`** (the seam's `'user'\|'default'` is amended: there is no routines-side default) |
| 4 | — | **`RoutinePolicy` + `RoutinesPrefsPort` types**: the port contract Spaces/Preferences will implement |
| 5 | doc drift | **Amend every "falls back to the shipped default" line** to "the shipped default = Spaces templates/presets (SP5, `intake/spaces.md:183-185`); routines reads the user's policy and flags `policy_source:'undefined'` when none resolves": `contract.md:56` · `seam-contract.md` (prefs dep, `RoutineEvaluation`, `PolicyUndefined`) · `slice-map.md` S4 ("Victor sets the shipped default values") · interp rule 4 + R4 · `current-business-rules.md` · annotate ROU-24 / ROU-30 |
| 6 | seam | **List every `RoutineEvaluation` addition** in the seam: optional `date`, `routine_id`, `date`, `applicable`, `neutral`, `policy_note`, `StepRef`, `policy_source` |

## Types (net-new)
```ts
// The user's policy (intake Q2/Q3). Minimal shape covering exactly what S4 consumes; storage is Spaces/Preferences-owned.
export type CompletionRule =
  | { kind: 'all_or_nothing' }                  // every applicable step done
  | { kind: 'required_node' }                   // every applicable is_required step done
  | { kind: 'threshold'; percent: number }      // done/applicable ≥ percent/100 (user-set; no routines-side range invented)
export interface RoutinePolicy {
  completion: CompletionRule
  /** The miss policy (Q3 "how misses count"). S4 reads only how a LOGGED skip counts (RT-8). The acceptance window's encoding is
   *  deferred to S5, its first consumer (Q3 "one week · N days · …" is open-ended). */
  miss?: { logged_skip: 'neutral' | 'not_done' }
}
export interface RoutinesPrefsPort {
  /** The user's policy for this routine, or null when none is configured (→ PolicyUndefined, flagged). Per-routine lookup:
   *  whether Preferences stores one global policy or per-routine overrides is the owner's choice behind this port. */
  policyFor(routineId: string): Promise<RoutinePolicy | null>
}
export interface StepRef { step_id: string; title: string }
export interface RoutineEvaluation {
  routine_id: string
  date: string
  status: 'done' | 'partial' | 'not_started'
  percent: number                 // round(100 × done / applicable); 0 when applicable = 0
  applicable: number              // live steps minus neutral ones
  done: StepRef[]                 // RT-5 — always returned, never discarded
  not_done: StepRef[]
  neutral: StepRef[]              // planned skips (+ logged skips when the user's policy says 'neutral')
  policy_source: 'user' | 'undefined'
  policy_note?: 'no_required_steps' | 'required_steps_all_neutral'   // see rule E5
}
```
*`miss.logged_skip` is **[INTERP — minimal]**: the docs name the miss policy ("how misses count", RT-8 "an unplanned no-show counts per
policy") but not its encoding. This is the smallest encoding that expresses it, and the port owner may refine it. No values are set here.*

## Operation flow + rules
- **E1 · Inputs.**
  - `loadRoutineOrThrow(id)`: a missing/archived routine → `RoutineNotFoundError`. **Known limit:** RT-17 keeps an archived routine's ledger,
    so past-date reads of an archived routine (Journal/analytics) are not served here; this is recorded for S5/S9.
  - `date` validated (`ZodError`).
  - `policy = prefs ? await prefs.policyFor(id) : null`. A port throw propagates (fail loud, the habits precedent).
- **E1b · The step set as of `date`** (RT-5 "never discarded"; no retroactive change). All of the routine's steps (`findWhere` by `routine_id`, no
  soft-delete filter), kept when `utcDay(created_at) <= date` AND (`deleted_at == null` OR `utcDay(deleted_at) > date`), **plus** any step that
  has a ledger row on `date`. A step deleted after D keeps its D result; a step added after D doesn't lower D's result. *(One row per (step, date) is
  guaranteed by `uq_routine_completions_date`, `db/schema/routines.ts:106`.)*
- **E2 · Classify each step for the date** (first match wins):
  - **neutral:** `date ∈ step.skip_dates` (planned, RT-8); or its ledger row is a logged skip and `policy?.miss?.logged_skip === 'neutral'`.
  - **done:** its ledger row exists and is not skipped; **or** its driven entity is done for `date` (read-only, through the owners' public APIs):
    - task step: `tasks.getTask(id)?.status === 'completed'` (the S3 TERMINAL reflection);
    - habit step: the habit's day for `date` has `done` (`habits.getCalendar(habitId, month)` → the `CalendarDay` for `date`, HB-5).
    - Focus and actionable steps have no reflection source, so the ledger only. A missing entity or an absent `habits` dep means "not done by
      reflection" (no throw: evaluation is read-only and degrades per step).
  - **not_done:** otherwise (incl. a logged skip under `'not_done'` or an undefined policy).
- **E3 · applicable = done + not_done; `percent` = `applicable ? round(100·done/applicable) : 0`, for display only.**
- **E4 · Status with a user policy (`policy_source:'user'`)**, in precedence order:
  1. `applicable = 0` ⇒ `'not_started'`.
  2. The rule is met ⇒ `'done'`:
     - all_or_nothing: `not_done` is empty.
     - threshold: the **exact ratio**, `done × 100 >= rule.percent × applicable`. Never the rounded percent: 2/3 against 67 is not met. A user
       threshold of 0 is honoured as written, so 0 done is `'done'`.
     - required_node: E5.
  3. The rule is unmet: `done = 0` ⇒ `'not_started'`, else `'partial'`.
- **E5 · required_node needs ≥1 applicable `is_required` step.** Otherwise the rule can't be applied and evaluation falls to E6 with a note:
  - `'no_required_steps'`: the routine has no required step (a configuration gap);
  - `'required_steps_all_neutral'`: its required steps are all neutral today (e.g. planned-skipped, not a misconfiguration).
- **E6 · Status with no policy (`policy_source:'undefined'`):** `applicable = 0 or done = 0 ⇒ 'not_started'` · `not_done` empty ⇒ `'done'`
  (meets every doc policy) · else `'partial'` (flagged).
- **E7 · Read-only.** No writes, no effects. Lifecycle does not change the evaluation (RT-6 limits paused/off to misses, S5). **Pre-declared for S7**
  (rule 21, D3):
  - routine-level effects emit only for `status === 'done'`, under either `policy_source` (all-done is policy-independent, so it is safe);
  - `'partial'` + `'undefined'` never emits;
  - a later policy change never emits for past dates;
  - S7 decides whether a reflection-only done (fix E2, no routine write behind it) emits.
- **E8 · Not schedule-aware.** `evaluateRoutine` judges the steps for the date it is given; whether that date is an occurrence of
  `recurrence_rule` is the occurrence derivation's job (S5/S9). *[INTERP: ROU-12 "at the timeframe's end"; the caller picks the occurrence.]*
  **For S5:** `applicable = 0` is a **neutral** day, never a miss.

## Verification Gate (blocking — live store, Node 24, real better-sqlite3, real tasks/habits/sessions harness from S3)
1. **No policy (no port):** 3 actionable steps, 0 done → `not_started`; 1 done → `partial` + `policy_source:'undefined'`, correct `done`/`not_done`,
   `percent` 33; 3 done → `done`.
2. **all_or_nothing (port):** 2/3 → `partial`; 3/3 → `done`; `policy_source:'user'`.
3. **threshold:** 60 with 2/3 → `done`; **67 with 2/3 → `partial`** (exact ratio, not the rounded 67); 100 behaves like all-or-nothing; **0 with 0 done → `done`**
   (user threshold honoured).
4. **required_node:** required done + another not done → `done`; required not done → `partial`; no required steps → `'undefined'` +
   `'no_required_steps'`; the only required step planned-skipped → `'undefined'` + `'required_steps_all_neutral'`.
5. **Planned skip neutral:** B has `skip_dates=[date]` → excluded (`applicable` 2), in `neutral`; all-or-nothing with A and C done → `done`.
6. **Logged skip:** `miss.logged_skip:'neutral'` → excluded; `'not_done'` → undone (`partial`); undefined policy → undone.
7. **Reflection (fix E2):** a habit reaching its target **in Habits** (not via the routine) → its step done; a task completed **in Tasks** → done; a habit
   below target → not done; a task step whose task was deleted → not done, no throw.
8. **As-of step set (fix E1b):** a step done on D then soft-deleted after D → still in D's `done[]`; a step added after D → absent from D's evaluation.
9. **No applicable steps** → `not_started`, percent 0, applicable 0.
10. **Errors:** archived/missing routine → `RoutineNotFoundError`; a bad date → `ZodError`; a port throw propagates.
11. **Read-only:** `sync_queue` count unchanged by `evaluateRoutine`.
12. **Partial always returned (RT-5):** a `partial` evaluation lists every done step under every policy kind.
Gates: tsc 0 · eslint 0 · routines suite green · full `@vida/core` sequential · g2 · /critique · §XXIX.

## g1 critique (folded): REVISE → 4 blocking fixed (reflection per the slice-map "ledger + driven-step occurrences"; exact-ratio threshold; as-of-date
step set; every contradicting "shipped default" line amended) + 7 non-blocking (miss sub-object, window deferred to S5; E4 precedence + threshold 0;
two policy notes; S7 emission pre-declared; S5 neutral-day note; seam additions listed; archived past-date limit recorded)

## Out of scope (homed)
Streak / rate / miss computation + the acceptance window's use (S5) · reschedule (S6) · routine-level effects on done (S7) · the Spaces/Preferences
policy storage + personalization UI + templates/presets (the owners; port only here).
