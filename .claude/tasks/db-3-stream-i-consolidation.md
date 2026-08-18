# Task: db-3-stream-i-consolidation
# Status: planned
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
- [ ] **P1 · Intent intake** — `/document-context database-layer` (refresh current-*) → `/documentation-component` unit
      spec from §5.20 Stream (i) FULL set (11 remaining ADD tables + session sub-types + AMENDs + RETIRE reconcile).
- [ ] **P2 · Current-state read** — diff `core/src/db/schema/**` vs the intent set → authored ✓ / missing ✗ / shape-open ⏳.
- [ ] **P3 · Plan (double-gate)** — resolve shape-open (`store`, `rules`, `planned_blocks`) from ADR intent; decide each
      session sub-type (author now vs defer-to-consumer, recorded); PLAN→critique→Approval 1→preflight→critique→Approval 2.
- [ ] **P4 · Implement** — hand-written SQL migration (ADR-016) + Drizzle table modules + `ENTITY_TYPES` appends.
- [ ] **P5 · Foundation-soundness verify** — post-impl critique + §XXIX currency promote + confirm DB-4/M1.1 consumers
      find every substrate table they need. Then mark DB-3 Done (tracker --sync).

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
