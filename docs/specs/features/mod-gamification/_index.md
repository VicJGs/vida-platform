# Spec: feature:mod-gamification
<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->
Status: draft            <!-- draft → approved → implemented -->
Source-repo: packages/core/src/modules/gamification
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-09-22-mod-gamification (§7)

<!--
  FORWARD spec — written BEFORE the thing is built. §1–§4 = DESCRIPTION; §5 = executable PROMPT.
  Governed by the No-Guessing Principle. This is the STUB scaffolded at /task-new; §2–§6 are written
  for real by the loop's PLAN step (/documentation-component) after the Entity Delivery Flow front
  matter (interpretation.md + slice-map.md) is approved. The Entity Delivery Flow authors the
  per-slice `service/` spec set under docs/features/gamification/delivery/ — this _index links them.
-->

## 1. Identity
The **Gamification module ("the System")** backend service tier — the OS's behavioral incentive &
consequence engine. Rules ride ADR-011 bindings; consequences ride the ADR-004 §3.2.5 effect rail
(grant/lock currency · move_money via Finance's guarded handler · surface_notification). Multi-currency
economy over the ADR-012 DB-3 spine (`currencies`/`consequence_ledger`/`store`/`rules`) with four
DERIVED per-currency quantities (to-distribute · earned · locked · current); achievements = predicates
over the measurement seam + event stream. `[FACT: docs/features/gamification/identity.md]`

**What it is NOT:** not the meaning plane (Purposes) · not a new engine (rides ADR-011/ADR-004, no new
event bus) · not the owner of streaks/signals (module-owned, read via measurement seam) · not Finance
(money moves only through Finance's guarded handler) · not an ADR-008 capability/Block (headless
automation, reuses the ADR-010 envelope not the render model). `[FACT: identity.md "What it is NOT"]`

## 2. Business Rules
[FILL IN — via /documentation-component after the Decomposition Gate. Source: docs/features/gamification/business-rules.md + intake RESOLUTION.]

## 3. Contract
[FILL IN — the `createGamificationService` factory surface + per-slice operations. Source: docs/features/gamification/contract.md + delivery/seam-contract.md.]

## 4. Acceptance
[FILL IN — testable DoD per slice; live-store Verification Gate per slice.]
- [ ] ...

## 5. Implementation Prompt
[FILL IN — per-slice, from the approved slice-map. Mirrors the task's ## Build Steps.]

## 6. Notes
Entity Delivery Flow front matter lives at `docs/features/gamification/delivery/` (interpretation.md ·
slice-map.md · seam-contract.md · service/ spec set) — authored at Steps 1–2 before this spec is filled.

## 7. Sessions
- 2026-09-22-mod-gamification — task init + spec stub scaffolded.
