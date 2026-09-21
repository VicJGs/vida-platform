# Task: xs-ingestion
# Profile: Add Backend Component
# Scenario: Default (Entity Delivery Flow v1)
# Status: done
# Linear: LIF-172
# Project: M1 — Whole Manual OS
# Milestone: M1.1.2 — Feature Modules · Backend
# Spec: docs/specs/foundation/xs-ingestion/service/_index.md
# Created: 2026-09-20
# Source: decomposition.md (P3) + coverage-report.md (P4 SHIP) — backend-replan

## Goal
Build the ADR-014 device-mediated ingestion service tier — the cross-cutting `foundation/ingestion`
pipeline: three-layer connector classification, on-device fetch→parse→normalize→encrypt, public-reference
bulk-fetch + provenance verify, staging/reconcile + add-only feed dedup, integration-identity +
normalization contract, and grant lifecycle (opt-in / revoke = stop-future-keep-ingested).
Covers XCU-01…05, XCU-09…16 (13 legs; ADR-014). Deny-safe/no-op ports, no schema (durable stores —
`import_staging`, `connection_config`, integration registry — = M2), mirroring the xs-egress-guard build.

## Context
Profile: Add Backend Component · Scenario: Default (Entity Delivery Flow v1)
Files involved: packages/core/src/foundation/ingestion/* (currently CLAUDE.md home only — fresh build);
  @vida/types + validators if types are owed. Composes: egress-guard (#43, XCU-06/08) · capability
  grant-enforcement (#31, XCU-07). No prior service code.
Integration points: egress-guard-service · capability/grant-enforcement (ADR-010 envelope) · effect-rail;
  first consumers = MOD-finance (CSV/OFX staging), MOD-learning (ICS feed dedup), Health/Books/Skills.

## Open Questions
- Exact M1.0/M1.1 build boundary per leg: which of the 13 XCU legs build now as pure service seams vs
  first-consumer-pull seams (resolve in the Interpretation + Decomposition gates, grounded in ADR-014 §5
  build-phase markers + the xs-egress-guard "no schema, deny-safe ports, [E] future boundary" precedent).

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| *(logged automatically by /session-log)* | | | |

## Dependencies
- (none) — deps `—` in decomposition.md:45; composes already-built egress-guard (#43) + capability (#31)

## Progress
<!-- SESSION checklist — the scenario's ## Task List (what the native panel mirrors). Session-level. -->
- [x] document-context BASELINE — ADR-014 + capability-framework X1-X11 + xcut-ingestion-ai legs + egress substrate map (Explore)
- [x] Interpretation layer — delivery/interpretation.md (Interpretation Gate: independent critic SHIP, 2 NITs folded)
- [x] Decomposition Gate — slice-map.md + seam-contract.md (Approval 1) + preflight (2 grounding fixes) + Approval 2
- [x] Per-slice service track (§XXVI + Verification Gate each) — **S1✅ S2✅ S3✅ S4✅ S5✅** (42 tests)
- [x] /critique → **SHIP** (independent critic; 13/13 legs behavioral, all ZK paths fail-closed; 3 doc-reconcile NITs folded + 1 code parity fix)
- [x] Currency Rule (§XXIX) — `docs/core/ingestion/current-{spec,business-rules}.md` born; CLAUDE.md + service/_index.md updated

## Build Steps
<!-- UNIT-level — the 5 slices from slice-map.md. All shipped on branch xs-ingestion. -->
- [x] **S1** foundation — `types.ts` + `classification.ts` (classifyLayer XCU-02 · buildDisclosure XCU-03). Pure. 9 tests.
- [x] **S2** ingestion guard core — `guard.ts` `createIngestionGuard` (XCU-01 refuse · XCU-12 opt-in · IR-2 sensitive→egress #43 · XCU-09 mediator custody · XCU-13 revoke). 11 live-store tests.
- [x] **S3** reconcile-on-import — `reconcile.ts` autoMatch/commitStaged (XCU-10) · dedupeFeed (XCU-11) · in-memory staging port. 10 tests.
- [x] **S4** public-reference — `public-reference.ts` fetchWholeSet (XCU-04) · verifyDataset (XCU-05); deny-safe/fail-closed ports. 5 tests.
- [x] **S5** integration registry — `registry.ts` createIntegrationRegistry (XCU-14 identity+contract · XCU-15 native upgrade IR-11 · XCU-16 mediator-custody). 7 tests.
- [x] Barrel wired in `@vida/core` index.ts. tsc 0 · eslint 0 · full suite **1096/1096** (+42, 0 regressions).

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-09-20 | activated the LIF-172 stub → in-progress; scaffolded forward-spec; grounded scope (fresh build, 13 XCU legs, deny-safe/no-schema per egress precedent) | Step 0 — document-context BASELINE for foundation/ingestion + composed contexts |
| 2026-09-21 | BASELINE (ADR-014 + Explore substrate map) → interpretation.md (Interpretation Gate SHIP) → slice-map + seam-contract (Approval 1 + preflight + Approval 2) → S1–S5 built (`foundation/ingestion/`, 42 tests, live-store S2) → pre-ship /critique SHIP → §XXIX currency born. tsc 0 · eslint 0 · @vida/core 1096/1096. | commit → push → PR → merge → `/task-complete xs-ingestion` (LIF-172 → Done) |

## Notes
Shape precedent: xs-egress-guard (#43, LIF-171) — the sibling cross-cutting security service built last
session (no schema, deny-safe/no-op ports, [E] future boundary, durable append-only store = M2).
