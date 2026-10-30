# Task: frontend-track
# Status: in-progress
# Linear: LIF-202
# Profile: Project Foundation  (→ Add Frontend Component per fe-X build)
# Scenario: Milestone Delivery Planning
# Project: M1 — Whole Manual OS
# Milestone: M1.2+ (frontend surface tier — cross-milestone)
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
- [x] G0 — lock the process (Five Planes + 4 stages + 3-lens audit) → `frontend-replan/process.md` ✅ 2026-09-30
- [x] G1 — Quality-Bar gate ✅ 2026-10-01 (critic REVISE→SHIP)
- [x] G2 — Surface harvest ✅ 2026-10-01 (~30 surfaces · 8 systemic · codec-first BUILD-SHAPE)
- [x] G3 — Composition map + traceability ✅ 2026-10-01
- [x] G4 — Coverage gate ✅ 2026-10-01 (set-cover 59/59 · ≥2-paths RATIFIED)
- [x] G5 — Order (42-unit build sequence) ✅ 2026-10-01
- [x] G6 — Linear reshape ✅ **EXECUTED 2026-10-02 from main** (20 created LIF-202…221 · 4 retired · 4 renamed · 0 dangling)
- [ ] per-surface builds (3-lens audit → build → Visual Gate → PR → merge)  ← NEXT (head: fe-codec-theme LIF-213)

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
- 2026-10-02 · **G6 LINEAR RESHAPE EXECUTED from main.** Branch disposition: ff-merged `worktree-frontend-track` → main
  (one append-conflict in `.claude/docs/decisions.md` resolved keep-both); mod-books already merged (PR #70) → main clean.
  Reconciled the pre-staged files vs runbook §2 (Step 6/7): dry-run caught 3 gaps — 3 spurious creates, 4 retired files
  still live, and 15 survivors never re-scoped. Fixes: renamed 4 survivors to surface slugs (fe-journals→fe-home,
  fe-preferences→fe-settings, fe-shell-integration-wiring→fe-shell, fe-health-core→fe-health; LIF preserved + map re-keyed),
  archived 4 retirees + frontend-replan, reshaped hard-4 BR-6 to 28 surfaces, homed frontend-track to a new cross-milestone.
  Executed: `--retire` ×4 (LIF-189/186/184/185 → Canceled) → `--sync --allow-orphan-create` (guard tripped on 3 pre-existing
  backend orphans LIF-79/159/160, verified unrelated) → **created LIF-202…221** (20) + milestone `M1.2+ (frontend surface
  tier — cross-milestone)` → converged 0-create/115-exist, 0 dangling → `--pull`. Executed-ledger in `g6-edge-ledger.md §6`.
  Commits `0c06884` (merge) · `186987b` (prep) · `62e4d57` (write-back) · `d39e68b` (ledger) · `cf628ee` (session) → **PR #71 MERGED** (`6240917`).
- 2026-10-02 · **FOLLOW-UPS + CLEANUP (Victor-authorized).** 3 orphans triaged: LIF-79 (ar-8) + LIF-159 (m1-foundation-closeout)
  → **Done** (work merged, status stuck); LIF-160 (core-vault-init) → **claimed** with an M3.0 stub (legit future issue).
  **Batch G:** deleted the 4 stale `hard-4-polish` → Canceled-issue blocker relations via GraphQL `issueRelationDelete`
  (verified 0 remain). Committed on `frontend-reshape-followups` → **PR #72 MERGED** (`20ba8f6`). Cleanup: removed the
  worktree + deleted both merged branches (local + remote). Verified: 0 orphans · 0 dangling · local main == origin/main.
  **Next: per-surface builds, head fe-codec-theme (LIF-213).**
