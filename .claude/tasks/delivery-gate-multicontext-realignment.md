# Task: delivery-gate-multicontext-realignment
# Profile: Project Foundation
# Scenario: default
# Spec: docs/specs/fixes/delivery-gate-multicontext-realignment/
# Created: 2026-08-02
# Status: done (2026-08-02 · commit 403d25f · branch fix/delivery-gate-multicontext-realignment, not merged)
# Linear: (none — meta/governance fix, not a Linear issue; mirrors delivery-structure-reconstruction)

## Goal
Re-align the half-baked delivery-gate spec: the per-issue canonical flow (`delivery-plan §2:48-50`) silently
assumes **issue = one build-context**, so a multi-substrate issue (AR-7 = 4 foundation substrates) has no
gating rule. Write the per-substrate increment rule, flag it as a structural defect (DF-10), and close the breach
for peers (AR-8, HARD-2, and any future multi-substrate issue). Documentation-only — no build code.

## Phase
Phase 1 of this session. **Blocks AR-7** (ar-7-capability-registry) — AR-7 inherits the corrected gating and
resumes as 4 gated increments once this lands. Separate phase — no AR-7 build content mixes in here.

## Triage
STRUCTURAL (victor:triage, 2026-08-02). Diagnosis = `docs/specs/fixes/delivery-gate-multicontext-realignment/PLAN.md`
(gate 1, APPROVED 2026-08-02). Gate depth: **full §XXVI double-gate** (Victor's call — rewrites governing plan rules).

## Discriminator (grounded, for the IMPL-PLAN)
- Census counts **declared Home paths** (`tracker_sync.py:941-944`), so home-count over-triggers (DB-9 = 2 homes, 1 deliverable). NOT the rule.
- Rule anchor: **one gated increment per authored INDEPENDENT substrate** (own owning-ADR + own `foundation/<x>` home + independently buildable/testable). Tightly-coupled substrates may be **explicitly folded** into one increment (the plan's existing "Views (ADR-007, folded)→AR-6" precedent). Structure **marks** each issue's increment-count. Integration-class issues that WIRE already-built contexts (HARD-2) are not per-substrate — one gate.
- AR-7 = 4 (effects→capability→measurement→economy; no folds; real internal DAG). AR-8 = ≥2 (pin at AR-8's turn). AR-6/DB-9 stay 1 (folded / coupled).

## Progress
- [x] Triage → diagnosis persisted + APPROVED (gate 1)
- [x] IMPLEMENTATION-PLAN (gate 2) — exact edits + discriminator pinned (Rev 2)
- [x] /critique gate-2 (independent) → REVISE (2 blockers + 2 majors) → Rev 2 → re-critique SHIP
- [x] /preflight gate-2 → PASSED
- [x] Approval 2 (Victor, 2026-08-02)
- [x] Implement doc edits (delivery-plan §2/§3 + reconstructed-structure §3 DF-11 + ⊞N glossary + rows)
- [x] Acceptance verified: #5 grep-placement clean · #6 live census AR-7 miss4/AR-8 miss2/DB-9 aligned2 · DF-11 unique
- [x] Commit docs alone — branch `fix/delivery-gate-multicontext-realignment` @ 403d25f (gitleaks clean; not merged/pushed)
- [x] Un-block AR-7 → resume Phase 2

## Outcome
DF-11 written. The multi-substrate increment rule + **enforced** gate-1 substrate-count precondition now live in
`delivery-plan §2/§3`; `⊞N` marks AR-7 ⊞4 / AR-8 ⊞≥2; fold test derived objectively (verified vs shipped
views→spaces import). Breach closed at class level (unmarked multi-home issue is now rejectable at gate-1), not just AR-7.
Follow-up (out of repo): whether `tracker_sync --next` should emit per-increment sub-heads (~/dev-toolkit / ADR-015).

## Build Steps
_(pending gate 2)_

## Route History
- 2026-08-02 — opened from AR-7 triage (STRUCTURAL); separate phase per Victor; blocks AR-7.
