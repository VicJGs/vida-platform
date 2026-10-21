# Task: golive-replan
# Status: in-progress (G4 — executing the Linear ledger)
# Linear: pending (minted at G4 with the debt units — orphan-create guard)
# Profile: Project Foundation
# Scenario: Delivery Structure Reconstruction (establishment model of frontend-replan (EST → G0–G4))
# Project: M1 — Whole Manual OS
# Milestone: M1.2+ (frontend surface tier — cross-milestone)
# Isolation: worktree .claude/worktrees/golive-replan (branch golive-replan), off main @ 3b0ecc8
# Source: 2026-10-21 STRUCTURAL triage (in-session) → docs/specs/foundation/golive-replan/_index.md
# Created: 2026-10-21

## Goal
Stop the ad-hoc "go-live" drift. (1) Lock, FROM the docs, how a frontend unit must behave from now on (the
Definition of Live + an amended FE Done-when) and (2) plan + home the debt of the already-shipped half-wired
fe-* surfaces, so the OS works seamlessly and no future surface can ship half-baked.

## Triage (2026-10-21) — STRUCTURAL
Root cause: every FE-* unit's data leg was stubbed against a phantom owner and still marked Done, so "done" ≠
usable; each go-live since is minted OUTSIDE the delivery structure to repay that debt. Findings F1–F7 → `_index.md §1`.

## Parallelism
- mod-routines (backend, worktree, S3/8) continues — unaffected.
- module-go-lives queue PAUSED (superseded at G6).
- fe-calendar S5 must adopt the G0 Definition of Live before close.

## Build Steps (EST → G0–G6)
- [x] EST — master plan rev 3 (critique REVISE→SHIP · preflight BLOCKED→PASSED · Victor rev-3 correction) → APPROVED 2026-10-21
- [~] G0 — APPROVED 2026-10-21 (rev 3: ELC-1…9 + Envision-to-the-end). Repo R1–R8 APPLIED → G0 PR. Toolkit T1–T5 WAIT on T0 (Victor resolves toolkit pending work; guide --check already red pre-G0)
- [x] G1 — APPROVED 2026-10-21 · Debt census ASSEMBLED (debt-census.md + census/a–d) · critic REVISE→fixed (dedupe, backlinks→HARD-3, 6 RIDE ECs→⏳, #17 drop, ELC-6/7/8 gaps) — awaiting Victor
- [x] G2 — APPROVED 2026-10-21 · debt-plan rev 3: 7 units (notes · journals · preferences(+onboarding) · sessions(debt-only; close→fe-sessions) · notifications · gamification · shell X-CUT) + 10 re-edged; coverage 226 rows 0/0/0 — awaiting Victor
- [x] G3 — APPROVED 2026-10-21: g3-order.md · ONE structure (143, M1.2.4 #60–66, dashboard #115, HARD-4 #122←43) · MVP-PATH refreshed · g4-edge-ledger.md · 8 task files · _projects.md M1.2.4 · (was: Order + one structure + ledger (both reconstructed-structure · MVP-PATH · g4-edge-ledger.md)
- [ ] G4 — Linear reshape (Victor approves ledger → --status clean → write)
- [ ] debt-unit builds (Entity Delivery Flow ②, closing under the DoL)

## Route History
- 2026-10-21 · G3: order (g3-order.md; ⊕split dashboard sub-issue, §XXVIII encoding note) · ONE canonical structure (143 issues, M1.2.4 #65–71, dashboard #115, HARD-4 #122; GAP-1 retired; EX-1…4) · MVP-PATH refreshed (archived-inclusive census + Linear drift: LIF-237 in General project, LIF-237/239 Backlog vs merged) · g4-edge-ledger drafted. **Follow-up logged: GAP-2** (⛔ schema-amendment gates on 5 unbuilt surfaces have no issue: home them before the first of those surfaces starts).
- 2026-10-21 · G0 rev 3 (Envision delta per Victor: ECs never re-checked at the end; #150 carried 0/30, #151 SKIP dropped fe-home's) → critique REVISE→folded → **Approval 2**. Applied R1–R8 (10 files, +28/−7; one comment-only .ts). G0 PR opened. T1–T5 parked on T0.
- 2026-10-21 · EST APPROVED (rev 3). G0 opened: `process.md` authored — the Entity Live Close (ELC-1…8), stubs
  rule, wiring = the entity's closing slice, CODEC by role, debt route = the EXISTING Entity Re-scope Flow
  (entity-delivery-flow §6 / `entity-rescope` scenarios; "go-live" retired), propagation T1–T3 (toolkit) + R1–R6
  (repo). Fresh independent critic running.
- 2026-10-21 · G0 critique REVISE (5 blocking · 4 nits) → rev 2 folded all. **§XXVIII deviation on the approved
  EST:** rev 3's G0(c) gave CODEC #13 its own "four engines wired live" close, which is invented. `decisions.md:1106-1108`
  records #13 = "Option A, convention + defer live to the first consumer". Corrected in both `_index.md` and
  `process.md` §5 (#13 follows its consumers like #1–#12). Also: the HARD-4 claim was softened to "inherits the ELC at G4".
- 2026-10-21 · Minted after the STRUCTURAL triage of the go-live drift (Victor: "stop going around in circles").
  Modeled on frontend-track's establishment (G0–G6). Worktree created off origin/main.
