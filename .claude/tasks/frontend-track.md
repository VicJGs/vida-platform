# Task: frontend-track
# Status: in-progress
# Linear: (campaign — no single issue; the 24 fe-* are LIF-178…201)
# Profile: Project Foundation  (→ Add Frontend Component per fe-X build)
# Scenario: Milestone Delivery Planning
# Project: M1 — Whole Manual OS
# Milestone: M1.2.* — Frontend track
# Isolation: worktree .claude/worktrees/frontend-track (branch worktree-frontend-track), off main
# Source: PLAN-p6-frontend-track.md · reconstructed-structure.md (FE #64–87) · view-intent-harvest.md

## Goal
Establish + deliver the FRONTEND track for the whole OS (② UI tier over the finished
① services), without touching the backend (built in a separate session). Two-tier intake:
Tier-1 GLOBAL frontend intake (focus + path + shared patterns) → Tier-2 per-module specs
at each fe-X build.

## Procedure (established 2026-09-30, with Victor)
- **Tier 1 — Global Frontend Intake** (once, upfront, collaborative): whole-OS vision,
  screen-archetype catalog, cross-module systems, delivery path, quality bar/guardrails,
  per-module spec template. I derive from docs → Victor refines. §XXVI-gated.
- **Tier 2 — Per-module fe-X build** (Entity Delivery Flow ②, add-frontend-component):
  per-module spec composed FROM the Tier-1 catalog → §XXVI double-gate → implement →
  Visual Gate → §XXIX currency. Own branch → PR → merge.

## Parallelism (why this is safe)
- Each fe-X `blocked by: mod-X` — a frontend twin starts only after its backend ① is DONE.
- HARD-4 (#95) ← all 24 fe-* + hardening → "M1 done = both tracks" (ADR-019 §3.2). M1 cannot
  false-close. Coverage gate (P4/P6) = every intent leg homed (nothing forgotten).
- Frozen-contract discipline: once fe-X starts, mod-X's §XXIX current-* is its frozen contract.

## Ready-set (backends merged to main @ ffdb61d)
- fe-finance (LIF-180) · fe-habits (LIF-182) · fe-journals (LIF-187) · fe-gamification (LIF-181)
  · fe-knowledge (LIF-188) — twins merged.
- fe-integrations-ai-surfaces (LIF-186) — XS deps done.
- fe-shell-integration-wiring (LIF-199) — UI/UX done; DB-8 live-search forward-ref only.
- (grows as more mod-* merge)

## Build Steps (the G0–G6 establishment sequence — see frontend-replan/_index.md)
- [x] ESTABLISHMENT — master plan authored + gated (critique REVISE→6 fixed→SHIP · preflight PASSED)
- [ ] **G0** — lock the process (Five Planes + 4 stages + 3-lens audit) → `frontend-replan/process.md`  ← NEXT, fresh session
- [ ] G1 — Quality-Bar gate (reconcile STANDARDS + sketch + Vida-context; sketch=input not authority) → `frontend-quality-bar/`
- [ ] G2 — Surface harvest (page/tab/panel map; 3-lens audit fills the unannounced) → `frontend-replan/surface-map.md`
- [ ] G3 — Composition map (surface ↔ backend capabilities, many-to-many)
- [ ] G4 — Coverage gate (every capability surfaces ≥1×; nothing left behind; set-cover + independent critic)
- [ ] G5 — Order (foundation surfaces first, dependency-correct)
- [ ] G6 — Linear reshape (edge-ledger → retire 24 module-twin fe-* → create surface issues; VICTOR-APPROVAL-GATED)
- [ ] per-surface builds (3-lens audit → build → Visual Gate → PR → merge)

## Route History
- 2026-09-30 · ESTABLISHMENT SESSION. Established the surface-first frontend re-plan with Victor across a long
  design conversation. Key resolutions: (1) two-tier→gate model; (2) frontend unit = SURFACE not module-twin
  (the P6 24 fe-* grain repeats the backend per-module mistake — Victor's Calendar/Schedule-tab example);
  (3) process = ISO 9241-210 / Garrett Five Planes → Foundation→Organization→Presentation→Development +
  the 3-lens gap audit (WRONG/MISSING/OVERFLOWING) with the Visual Gate as final input (Victor's methodology:
  docs don't hold all intent → the flow NOTICES gaps vs the standards bar); (4) all M1.2.1 foundation backends
  verified merged to main → foundation buildable; (5) quality-bar needs a gate (sketch may have left info
  behind). Created isolated worktree off main (branch worktree-frontend-track); locked per-issue-branch → PR →
  merge. Authored `docs/specs/foundation/frontend-replan/_index.md`; independent adversarial critique REVISE→6
  fixed (G6 edge-ledger · "222 legs = floor not ceiling" · web-only scope · process-gated guarantee · P6 credit
  · gate output homes) → SHIP; preflight PASSED. **Next: G0 in a fresh session.**
