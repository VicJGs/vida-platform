# Task: ux-1-information-architecture
# Profile: Generic Session
# Scenario: default
# Spec: docs/specs/foundation/ux-1-information-architecture/_index.md
# Status: in-progress
# Linear: LIF-90
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Cluster: M1 — Whole Manual OS
# Source: docs/roadmap.md → Phase 1.0 ⑤ UX
# Created: 2026-08-01

## Goal
Set the information architecture + navigation model before modules pour in: the module map, the
`nav_preferences`-backed navigation, and the routing tree. Fixes where everything lives so module
screens slot into a known structure rather than each inventing its own place. Experience-track
entry point. Root M1.0 deliverable for UX-2 (command bar), UX-3 (shell layout), UX-4 (state
conventions), UX-5 (onboarding surface); informs UI-4 (app shell).

## Dependencies
- (root — no blockers; experience-track entry point)

## Context
Profile: Generic Session (per reconstructed-structure.md:72 — UX-1 = `Generic`)
Files involved: `docs/core/architecture`, `apps/web/src` (ADR-018 home, ADR-001)
Integration points: root of UX-2/UX-3/UX-4/UX-5; informs UI-4. No build-order blockers (root).

## Open Questions
- [to be filled as they arise]

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| Profile | Generic Session | reconstructed-structure.md:72 (authoritative) buckets UX-1 → Generic; retired m1.0-delivery-plan's "add-frontend-component design-led" does not outrank it | 2026-08-01 |
| Spec bucket | foundation | matches active pattern for every M1.0 spine spec (ar-5/ar-6/db-7/ar-4) | 2026-08-01 |
| Deliverable grain | design doc + declarative nav/module-map artifact (code) | dual home reconstructed:72 + delivery-plan:242; critique caught doc-only over-narrowing | 2026-08-01 |
| **Nav axis model** | **Co-primary dual-axis** (module dock = content home · Spaces bar = cross-cutting overlays) | Victor design call; reconciles ADR-006/007 (Spaces overlays, not replacement homes) + intake SP1 (Spaces first-class axis). Spaces bar = designed seam, live M1.1 | 2026-08-01 |

## Progress
<!-- SESSION checklist — the scenario's ## Task List (what the native panel mirrors). Session-level. -->
- [x] document-context BASELINE — current-* dos contextos a tocar (ground truth p/ os gates) → `docs/specs/foundation/ux-1-information-architecture/baseline.md` (2026-08-01)
- [x] Forward spec written + Per-Step Build Gate cleared (§XXVI) — PLAN Rev 3 + IMPLEMENTATION-PLAN authored · 4 gates (PLAN critique+preflight, IMPL critique+preflight) all REVISE/BLOCKED→fixed · Approval 1 ✅ · **awaiting Approval 2**
- [x] Goal stated in one sentence before starting
- [x] Mode chosen: document-first build (design doc + typed nav-map artifact)
- [x] Work complete — 4 files created; typecheck 0, lint 0-err; boundary held (routes.tsx untouched)
- [ ] /session-end run at close — decisions and outcomes logged
- [x] Currency Rule (§XXIX) — promoted BR-NAV-1..4 → web-client-runtime/current-business-rules.md + nav/ home → current-spec.md

## Build Steps
<!-- UNIT-level — mirrors the active spec's §5 Implementation Prompt; what victor:execute-plan-* works.
     Filled when the unit's spec §5 is approved. Distinct from ## Progress (connected-build-loop, R1). -->
- [ ] [filled from the spec §5 once planned]

## Plan
<!-- Only for a SPEC-LESS small task (§XXVI LITE): victor:planning writes its plan here instead of a spec. -->

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-08-01 | initialized task (merged onto reconstruction stub LIF-90) + scaffolded spec stub | run the loop: baseline → plan (/documentation-component) → critique → preflight |
| 2026-08-01 | Step 0 baseline persisted (baseline.md — cited harvest of module map + as-built route floor + nav_preferences shape + Spaces-vs-nav + 3 open decisions) | Step 2: PLAN via /documentation-component, resolving the 3 [UNKNOWN]s (scope grain, Spaces-in-nav, nav_preferences seam) |
| 2026-08-01 | PLAN authored (gate 1) → independent critique (REVISE: fixed a fabricated routes.tsx quote, [FACT]→[INTENT] labels, dual-home grain → code artifact → FULL gate) → preflight (BLOCKED: caught AR-4 "no self-registration seam" conflict → reworded map as central data) → PASSED | Approval 1 (direction) — then IMPLEMENTATION-PLAN (gate 2) |
| 2026-08-01 | Victor: proposal too scarce → HARVESTED per-module view intent (5 parallel agents, ~22 modules → view-intent-harvest.md) → surfaced nav-axis tension (ADR-007 vs intake) → Victor chose **co-primary dual-axis** → PLAN Rev 3 (enriched scope + nav model) → re-critique (REVISE: amends-ADR-007 honesty, view-mode scope creep, harvest-is-second-hand → all fixed) | Approval 1 on Rev 3 |
| 2026-08-02 | Approval 1 ✅ + homes verified vs ADR-018/tree → IMPLEMENTATION-PLAN (gate 2) → map critique (REVISE: Bucket-List, checkins, substrates, key≠route → fixed) → Victor primary-doc audit of "NOT IN NAV" caught **Routines misclassified** (harvest misread cockpit-as-inside-Sessions) → Routines→dock, Check-ins→secondary, Gamification→conditional dock, Sessions kept dock → **Approval 2 ✅** → BUILT 4 files → typecheck/lint/boundary green → Currency promoted | /session-end + commit |

## Notes
Computed head via `tracker_sync --next` (M1 · M1.0 · highest direct-dependent count = 4). Root — no blockers.
