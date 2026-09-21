# Task: xs-backlinks-search-export
# Status: done
# Linear: LIF-168
# Profile: Add Backend Component
# Scenario: Entity Re-scope (Entity Delivery Flow recovery variant)
# Spec: docs/specs/foundation/xs-backlinks-search-export/_index.md
# Created: 2026-09-20
# Project: M1 — Whole Manual OS
# Milestone: M1.1.2 — Feature Modules · Backend
# Source: decomposition.md (P3) + coverage-report.md (P4 SHIP) — backend-replan

## Goal
Reconcile the built AR-8 backlink resolver against its docs and re-scope the
`xs-backlinks-search-export` cross-cutting read/query service tier (backlinks · search ·
export · neural-graph data-prep) to its correct M1.1.2 boundary as a consumable
`@vida/core` service — building/ratifying each engine to the boundary the docs fix.
Legs: XCU-BSE-01…09, 25.

## Dependencies
- (none) — `#42`, ← none · 5 direct dependents

## Context
Profile: Add Backend Component · Scenario: Entity Re-scope
Milestone: M1 / M1.1.2 — Feature Modules · Backend · `#42`
Files involved:
- `packages/core/src/services/search/backlink-resolver.ts` (+ `__tests__/`) — BUILT (AR-8 #1)
- `packages/core/src/services/search/` · `services/export/` (CLAUDE.md seams)
- `@vida/editor` serializers (markdown/PDF/DOCX)
Source corpus: `docs/specs/foundation/backend-intent/parts/xcut-backlinks-search-export.md`
Ground-truth docs: `docs/core/backlinks/current-spec.md` + `current-business-rules.md` (BL-1..BL-6)
Integration points: entity_links substrate (AR-6 Spaces) · FTS5/DB-8 seam · @vida/editor export · Sigma.js graph-prep
Four engines (per source corpus):
1. Backlink resolver — BUILT (AR-8 #1)
2. FTS5 full-text search — DEFERRED (DB-8/M1.4) — `SearchProvider` seam
3. Export serializers — DEFERRED (UI-3 `@vida/editor` / per-feature)
4. Neural-graph data-prep — DEFERRED (AR-8 increment #2 / Views design-pass)

## Open Questions
- [Step 4/5] Which of the 3 deferred engines does M1.1.2 `#42` actually own vs. keep as a
  first-consumer-pull seam? (ar-8-foundation-services homed all 3 elsewhere in the plan —
  the reconciliation must confirm whether that still holds.)

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| Scenario route | Entity Re-scope | backlink-resolver already built (AR-8); reconcile-then-rescope | 2026-09-20 |
| Spec home | docs/specs/foundation/ | matches xs-capability/xs-effect-rail/xs-spaces-tags-links (foundation XS services) | 2026-09-20 |

## Progress
<!-- SESSION checklist — the scenario's ## Task List (what the native panel mirrors). Session-level. -->
- [x] Step 0 — document-context BASELINE (both planes) + cross-plane standards load — clean (resolver current-* = code)
- [x] Step 1 — ░Documentation Gate░ — SHIP (independent critic; 5 claims CONFIRMED, 0 No-Guessing violations)
- [x] Step 2 — Interpretation Layer (delivery/interpretation.md)
- [x] Step 3 — ░Interpretation Gate░ — SHIP (independent critic; 2 trivial citation fixes applied)
- [x] Step 3.5 — Envision Gate — SKIP (pure-backend; UI faces homed OUT to P6)
- [x] Step 4 — Audit / Reconciliation (delivery/reconciliation.md) — DRY: 9 ✅ aligned, 1 📄 (R7), 0 wrong/gap/owed
- [x] Step 5 — Re-scope Gate (delivery/slice-map.md) — APPROVED by Victor (1 slice: S1 R7 back-fill)
- [x] Step 6 — S1 build + Verification Gate — PASS (resolver 9/9, @vida/core 1040/1040, tsc 0, eslint 0)
- [x] Step 7 — /critique changed files → SHIP (independent post-impl critic; 4/4 axes PASS, 0 REVISE)
- [x] Step 8 — Currency Rule (§XXIX) — current-* WERE the back-fill target (BL-7 + R7 note); already current

## Build Steps
<!-- UNIT-level — S1 R7/INT-1 read-seam conformance back-fill (slice-map.md S1). -->
- [x] BL-7 (R7 read-seam conformance, INT-1) → docs/core/backlinks/current-business-rules.md
- [x] R7 note → docs/core/backlinks/current-spec.md
- [x] R7 conformance test (read-only surface guard) → backlink-resolver.test.ts (8→9)
- [x] Verification Gate: @vida/core 1040 green · tsc 0 · eslint 0
- [x] Ratify BSE-01…09 (built resolver, no code)

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-09-20 | extended the backend-replan stub (LIF-168) into a full task; routed Entity Re-scope; located built code + source corpus | Step 0 baseline → Step 1 Documentation Gate |
| 2026-09-20 | Steps 0–8: baseline clean · Doc Gate SHIP · interpretation + Interp Gate SHIP · Envision SKIP · reconciliation DRY (ratify+1 back-fill) · Re-scope Gate approved · S1 built (BL-7 + R7 note + conformance test) · Verification Gate PASS (1040 green) | Step 7 post-impl critique → commit + PR → /task-complete |

## Notes
- `#`-order head over `--next`'s xs-ingestion (routing rule §1: `#` order wins).
- ar-8-foundation-services archive: "graph-prep→AR-6 Views seam+UI-2, export→UI-3 #29,
  search→DB-8 #60 are homed elsewhere in the plan" — verify this still holds at reconciliation.
