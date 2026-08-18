# Task: db-3-stream-i-consolidation
# Status: in-progress
# Profile: add-backend-component
# Scenario: add-backend-component (schema-foundation build — 5-phase lifecycle)
# Linear: LIF-65
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: ADR-002 §5.20 Stream (i) · flow: docs/roadmap/schema-foundation-build-flow.md
<!-- Model B (upfront foundation) decided 2026-08-18: DB-3 is a REAL gated build head, not a stream.
     Run the 5-phase lifecycle in docs/roadmap/schema-foundation-build-flow.md §2. -->

## Goal
Author the **full Stream (i) substrate schema** (ADR-002 §5.20) as a self-contained, gated M1.0 foundation build —
the substrate the per-domain schema (DB-4) and every M1.1+ module hangs off. 11 of the §5.20 ADD line-items are already
authored (AR-5/6/7); this issue authors the **11 remaining substrate tables**, reconciles the RETIRE set, and
classifies the session sub-type extensions + column-level AMENDs. See the flow doc §3 for the verified ledger.

## Intent source (Phase 1)
- **ADR-002 §5.20 Stream (i)** — the enumerated ADD / RETIRE / AMEND ledger (authoritative).
- Cross-check each table's amending ADR (ADR-004/005/009/011/012) for shape.

## Dependencies
- blocked by `db-1-schema-primitives` (✅ done)

## Build Steps (the 5-phase lifecycle — docs/roadmap/schema-foundation-build-flow.md §2)
- [x] **P1 · Intent intake** (2026-08-18) — (1a) refreshed `database-layer` current-* to code-as-is: added the AR-5/6/7
      `foundation/` inventory (15 substrate tables, migrations 002–006) + corrected DB-3 scope to the 11 remaining ADD
      tables + a business-rules boundary note. (1b) authored the unit-spec intake
      `docs/specs/foundation/db-3-stream-i-substrate/_index.md` — the FULL §5.20 Stream (i) set: 11 ADD tables (shapes +
      readiness), session sub-type extensions (defer decision → P3), column-level AMENDs (classified: ~all → DB-4/DB-2,
      DB-3 owns ≈0 directly), RETIRE reconcile (verify-absent). No schema authored. **Next: P2 current-state read.**
- [x] **P2 · Current-state read** (2026-08-18) — verified on disk: all 11 ADD tables ABSENT ✗ (DB-3 authors each);
      RETIRE set all absent ✓ (`xp_history` in economy.ts:3 is a supersession comment, not a table); session sub-types
      none authored ✗ (P3 decides). Baseline = clean greenfield, purely additive (migration 007+); no divergent
      authoring to reconcile. Appended as the spec's Phase-2 section. **Next: P3 plan double-gate.**
- [x] **P3 · Plan (double-gate)** (2026-08-18) — PLAN + IMPLEMENTATION-PLAN authored (`sessions/`). Shape-open resolved:
      `store`/`rules` from ADR-012 §3.5/§3.9 (overlay/consequence encoding [INTERP] build-phase), `planned_blocks` model
      spine (ADR-004 §3.1). Cross-domain refs = plain TEXT no FK (codebase pattern — dissolved the ordering concern). All
      6 session sub-types DEFERRED to DB-4 (ADR-004 §3.1). AMENDs: DB-3 owns 0. Independent critique **SHIP** (4 MATERIAL
      label-fixes applied) → preflight **PASSED** (index gap folded) → gate-2 **SHIP** (`order`→`sort_order` reconciled).
- [x] **P4 · Implement** (2026-08-18) — migrations 007–011 (hand-written SQL, ADR-016) + 4 new Drizzle modules + `store`/
      `rules` on economy.ts + enum tuples (new `@vida/types/purpose.ts` + appends) + validators + `ENTITY_TYPES` +11 +
      enum-parity fixture +10. Green: root typecheck 11/11 · `@vida/core` 193 tests.
- [x] **P5 · Foundation-soundness verify** (2026-08-18) — post-impl critique caught 1 MATERIAL (`planned_blocks.sub_type`
      hard CHECK vs the SS-5/BR-6 OPEN-vocab contract) → FIXED (dropped CHECK, code+migration+parity+PLAN, re-green
      19+6 tests). §XXIX currency promoted (`database-layer/current-*` INTENT→FACT + DB-3 section). Foundation-readiness
      VERIFIED (DB-4 Purpose/Knowledge/Finance consumers find every table). **DB-3 DONE — M1.0 schema foundation complete.**

## The 11 remaining substrate tables (verified vs §5.20 — flow doc §3)
`planned_blocks` · `templates` · `review_curves` · `method_bindings` · `review_events` · `values` · `contributions` ·
`purpose_reviews` · `plan_steps` · `store` (shape-open) · `rules` (shape-open).
⚠ Corrected vs the earlier drifted list: **+`values`, +`review_events`**; **−`topic_reviews`** (that's DB-4/Stream ii);
**−`measurement`** (a column AMEND, not a table).

## Route History
- 2026-08-01: created as a `# Stream: true` non-head (Model A).
- 2026-08-18: **re-chartered as a real gated build head (Model B)** — Victor's schema-foundation blueprint. Stream
  header removed; profile add-backend-component; 5-phase Build Steps; ledger corrected vs ADR-002 §5.20. Flow:
  `docs/roadmap/schema-foundation-build-flow.md`. NOT started — runs in its own clean-context session.
- 2026-08-18: **BUILT + DONE** in one clean-context session — ran the full 5-phase lifecycle (P1 intake → P2
  current-state → P3 double-gate → P4 implement → P5 verify). 11 tables authored (migrations 007–011); root typecheck
  11/11 · @vida/core 193 tests. Post-impl deviation (`planned_blocks.sub_type` CHECK vs OPEN-vocab) caught + fixed
  per §XXVIII. Spec: `docs/specs/foundation/db-3-stream-i-substrate/`. Branch `db-3-stream-i-consolidation` (NOT
  committed yet — pending Victor). **Next: DB-4 per-domain schema (LIF-66, #10), same 5-phase lifecycle.**
