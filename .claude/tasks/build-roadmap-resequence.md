# Task: build-roadmap-resequence
# Profile: Project Foundation Setup
# Scenario: Build Roadmap
# Spec: docs/specs/features/build-roadmap-resequence/_index.md
# Created: 2026-07-23
# Status: in-progress
# Cluster: General_Vida

## Goal
Re-sequence the Phase-1.0 build roadmap to features-first per ADR-017 (defer encryption/sync/auth),
then re-cluster and re-projectize the deliverables into the tracker.

## Context
Profile: Project Foundation Setup → Scenario: Build Roadmap
Files involved: docs/roadmap.md, docs/core/decisions/ADR-017/016/001/003, .claude/tasks/*,
  _clusters.md, .claude/tasks/.tracker-map.json
Integration points: existing Linear projects (① Database · ② Architecture · ③ Design System · ④ UI
  · ⑤ UX = the OLD layer-first clusters this task reshapes); tracker map; 35 existing issues LIF-61…95

## Open Questions
- Does features-first collapse the ⑤-cluster layer structure into feature clusters, or keep layers as
  cross-cutting tiers under feature phases? (to resolve at Step 3 decomposition)
- Which single feature is the FIRST deliverable slice (the web-SPA tester vehicle)? (Step 1 intent)

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| *(logged automatically by /session-log)* | | | |

## Progress
<!-- SESSION checklist — the scenario's ## Task List (what the native panel mirrors). Session-level. -->
- [ ] Ground: survey the ADRs + per-context docs + dependency graph as the patch source
- [ ] Capture build intent (phases + deliverable categories) — full intent, ⚠ INTENDED-IMMATURE flagged
- [ ] Docs pass: patch intent vs ground truth; resolve dependencies; quantify the integration register
- [ ] Build the tiered dependency map + phase slices + cluster structure; fix the critical path
- [ ] Write docs/roadmap.md (spine · dep map · clusters · Linear mapping · sequencing · integrations)
- [ ] Foundation gate BEFORE any push: checklist + independent critic on roadmap AND graph
- [ ] Projectize: one task file per deliverable + _clusters.md; verify tracker_sync --status clean
- [ ] Gated /track-sync (cluster-first, relayed approvals); delete stale relations before re-sync
- [ ] Accept & log: record verdict + tracker IDs; /session-log; file toolkit follow-ups

## Build Steps
<!-- UNIT-level — mirrors the active spec's §5 Implementation Prompt; what victor:execute-plan-* works.
     Filled when the unit's spec §5 is approved. Distinct from ## Progress (connected-build-loop, R1). -->
- [ ] [filled from the spec §5 once planned]

## Plan
<!-- Only for a SPEC-LESS small task (§XXVI LITE): victor:planning writes its plan here instead of a spec. -->

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-07-23 | initialized task + scaffolded spec stub; profile switched to Project Foundation / Build Roadmap | Step 0 — ground in the architecture (ADRs + dep-graph survey) |
| 2026-07-23 | REFRAME (Victor): code is stale life_os residue, architecture never derived from current docs, early module docs need re-run. Framing held (decision C). Ran 4-agent read-only current-state baseline → persisted `docs/specs/foundation/current-state-baseline/baseline.md`. Findings: ~99% of code predates the doc foundation; architecture incoherent with ADRs 004–017; early docs stale (re-run warranted); ~74% of Structural Foundation unbuilt. | Enter §XXVI planning gate: draw a plan FROM the baseline. |
| 2026-07-23 | Authored the MASTER PLAN (`docs/specs/foundation/realignment-master-plan/_index.md`) — gating+phasing system, 3 sequential parts (docs→structure→roadmap). Ran independent adversarial /critique → REVISE (B1 ADR-016 violation + B2–B4 + N1–N4); fixed all. **Victor APPROVED at gate 1.** This task is now the master foundation-realignment campaign; the roadmap resequence is Part 3. | **NEXT SESSION: execute Part 0** — `/new-scenario project-foundation documentation-realignment` + build the gated `docs/specs/foundation/capability-framework.md` (every ADR-004–015 capability + mechanical predicate). Then Part 1 (docs realignment). |

## Notes
- This is a RE-SEQUENCE of an existing roadmap (docs/roadmap.md, 35 issues LIF-61…95), not a from-zero
  roadmap. Deliverables unchanged; order/clustering inverted to features-first per ADR-017.
