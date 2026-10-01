# Task: frontend-replan (G0–G6) — surface-first frontend re-plan

# Profile: Project Foundation Setup
# Scenario: Milestone Delivery Planning
# Linear: (create at G6 reshape — supersedes the 24 fe-* LIF-178…201)
# Created: 2026-09-30
# Worktree: .claude/worktrees/frontend-track (branch worktree-frontend-track, off main)

## Goal
Execute the frontend re-plan established 2026-09-30 in
`docs/specs/foundation/frontend-replan/_index.md` — surface-first, coverage-gated — via the
G0→G6 gate sequence, then run per-surface builds (3-lens audit → build → Visual Gate → PR → merge).

## Dependencies
Blocked by: none (all M1.2.1 foundation backend twins merged to main).

## Gate sequence (from _index.md §5)
- [ ] G0 — Lock the process (§2) as the Tier-1 flow doc → `frontend-replan/process.md`
- [ ] G1 — Quality-Bar gate → `frontend-quality-bar/_index.md` (independent adversarial critic)
- [ ] G2 — Surface harvest → `frontend-replan/surface-map.md` (3-lens audit fills the unannounced)
- [ ] G3 — Composition map → `frontend-replan/decomposition.md` + `traceability.md`
- [ ] G4 — Coverage gate → `frontend-replan/coverage-report.md` + `tools/frontend-intent/` set-cover
- [ ] G5 — Order → surface `#` sequence into `reconstructed-structure.md`
- [ ] G6 — Linear reshape (⚠ semi-destructive, Victor-approval-gated) → `g6-edge-ledger.md`
- [ ] builds — per-surface 3-lens audit → build → Visual Gate → PR → merge

## Open decisions carried into G0/G1 (from _index.md §7)
1. Aesthetic & density direction (power-tool vs calm) — Victor input at G0/G1.
2. Spaces bar timing — build seam now or defer (PARKED→M1.1)?
3. Standards-bar home — repo-level extending global (recommended; confirm G1).
4. The ≥2-paths surfacing rule — ratify as a G4 criterion, or replace.
5. Sketch-gaps to hunt in G1 — perf budgets, reduced-motion, i18n/RTL, empty/error copy, dark-mode, focus, offline/optimistic, responsive.

## Build Steps
(filled per gate as executed — currently: G0 in progress)

## Route History
- 2026-09-30 — session start; profile Project Foundation / Milestone Delivery Planning; G0 begun.
