# Spec: feature:mod-habits
<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->
Status: draft            <!-- draft → approved → implemented -->
Source-repo: packages/core/src/services/habits
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-09-23-mod-habits (§7)

<!--
  FORWARD spec — written BEFORE the thing is built. §1–§4 = DESCRIPTION; §5 = executable PROMPT.
  Governed by the No-Guessing Principle. This is the STUB scaffolded at /task-new; §2–§6 are written
  for real by the loop's PLAN step (/documentation-component) after the Entity Delivery Flow front
  matter (interpretation.md + slice-map.md) is approved. The Entity Delivery Flow authors the
  per-slice `service/` spec set under docs/features/habits/delivery/ — this _index links them.
-->

## 1. Identity
The **Habits module** ① backend service tier — the platform's recurring-behavior tracker. The user
defines behaviors to **build** (positive) or **break** (negative), schedules them by recurrence +
time-of-day, checks them off, and watches **streaks**, completion rates, and mood trends accumulate.
`createHabitsService` owns 2 tables — `habits` (definition · recurrence · build/break · domain ·
denormalized streak cache) and `habit_completions` (per-date completion ledger with quantity + mood)
— and composes the foundation (Repository/Drizzle · EffectRegistry · measurement engine) plus the
cross-module seams. `[FACT: docs/features/habits/identity.md; ADR-002 §5.5]`

**What it is NOT.** Not the Routines action-list nor the Tasks deadline tracker (behavior recurrence
only); not the Gamification engine (emits `grant_currency(XP)`, never writes `consequence_ledger`, R2);
not the Purpose-metrics owner (a completion *contributes* via the weighted `contributions` primitive,
metric owned by Purpose, HB-8); not a notes store (linked `pages` row) nor its own tag vocabulary
(consumes `entity_tags`). ② `fe-habits` (LIF-182) owns all 4 UI view surfaces — out of scope here.
`[FACT: docs/features/habits/identity.md]`

## 2. Business Rules
[FILL IN — written by the PLAN step after the Decomposition Gate; promote per-slice invariants from the
`service/` spec set. Terminal states, quantified-completion validation, streak recomputation semantics,
build-vs-break, effect-emission guard, contributions weighting — all cited to the aspect corpus + ADRs.]

## 3. Contract
[FILL IN — the `createHabitsService` factory API (operations · signatures · inputs/outputs · typed
errors). Authored via /api-contract at Step 4, per slice, against the seam-contract.md the UI consumes.]

## 4. Acceptance
[FILL IN — testable DoD per slice; each item a checkbox. Includes live-store Verification Gate PASS.]

## 5. Implementation Prompt
[FILL IN — per-slice numbered build sequence, authored as each slice's IMPLEMENTATION-PLAN clears
Approval 2. Cites §1–§4; nothing invented at build time.]

## 6. Open UNKNOWNs / Decisions Needed
- [UNKNOWN: resolved at the Decomposition Gate (Step 2)] the slice roster + ratify-vs-decide per slice,
  grounded in `docs/features/habits/delivery/` + the decomposition/traceability corpus.

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-09-23 | 2026-09-23-mod-habits | initial draft (stub + home) |
