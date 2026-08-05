# Task: ar-8-foundation-services
# Status: completed (2026-08-05)
# Linear: LIF-79
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ② Architecture Layer
# Profile: Add Backend Component
# Scenario: Default (add-backend-component/scenarios/default.md)

## Goal
Build the cross-cutting foundation services in `@vida/core`: full-text search (over the DB-8 FTS5
tables), the backlinks / entity-link resolver, export serializers (MD/PDF/DOCX), analytics
primitives, and neural-graph data prep. Module-owned engines (journal aggregation, study planner,
points economy) live in their own module clusters — these are the shared ones.

## Dependencies
- blocked by `ar-6-spaces`  <!-- backlink resolver + neural-graph data-prep read entity_links, owned by ar-6 (Spaces tier, INT-1a). Slug→canonical map key (was ar-6-spaces-and-tags, earlier ar-2); delivery-planning-loop U1 -->
<!-- removed 2026-08-04 (delivery-order reconcile): `blocked by db-8-fts5-search` was an ILLEGAL whole-issue edge.
     DB-8 is #60 (M1.4); reconstructed-structure.md §2 (DF-3) requires every ← to point to a LOWER #. A #14 ← #60
     edge can't exist in a valid topological order — and it silently dropped AR-8 from tracker_sync's ready set,
     hiding the true M1.0 head. Per the doc, AR-8 is ⊞≥2 (DF-11): the backlink resolver / export serializers /
     analytics / neural-graph data-prep substrates build now at #14 (← AR-6 ✅); ONLY the full-text-search
     sub-part is authored (streamed) at DB-8's build (#60). So AR-8-the-issue is ← AR-6 only; the search→DB-8
     dependency is a per-substrate stream, NOT a whole-issue blocker (Outcome cell: "search sub-part → DB-8").
     NB: the tracker reads THIS file's edges, not Linear relations — no Linear edit needed (the AR-8←DB-8
     blocker relation was never created; the tracker only syncs status/identity, never relations). -->

## Increment plan (⊞≥2 — pin at build; DF-11)
- **Build now (#14, ← AR-6 ✅):** backlink / entity-link resolver · neural-graph data-prep · export serializers (MD/PDF/DOCX).
  (Analytics is NOT in AR-8 — delivery-plan §5:182 + #14 title enumerate {search, backlink, export, graph-prep}.)
- **Streamed to DB-8 (#60):** full-text search over the FTS5 tables — authored at DB-8's build, not here.

## Build Steps (⊞≥2 increments, each a full §XXVI gate)
- [x] **Increment #1 — Backlink / entity-link resolver** ✅ 2026-08-04. `services/search/backlink-resolver.ts`
      (read-only over `entity_links`: getBacklinksTo / getLinksFrom / resolveLink). Double-gated (plan critique
      REVISE→home/`!`/soft-delete-wording fixed; post-impl critique SHIP + 2 hardening tests added). @vida/core
      **177/177** · root typecheck **10/10**. Spec `docs/specs/infrastructure/ar-8-foundation-services/backlink-resolver.md`;
      currency `docs/core/backlinks/current-*`. NOT committed (working tree).
- [—] **Neural-graph data-prep — NOT an AR-8 build (already solved).** It IS the AR-6 `ViewEngine` +
      `ViewProviderRegistry` seam (ADR-007 `filter×layout×grouping`, `graph` layout) fed by per-module
      `ReadProvider`s (register at each module's build, M1.1+) + the `@vida/ui` `neural-graph` renderer (UI-2 #28).
      Building a bespoke `GraphData` service here would duplicate ADR-007/AR-6.
- [—] **Export serializers — re-homed to UI-3 (#29).** `reconstructed-structure.md #29` outcome = "block editor +
      **serializers**"; they live in `@vida/editor/src/serializers/` (ADR-001 §8), TipTap-coupled. Not a `@vida/core`
      AR-8 build. (delivery-plan §5:182 listed them under AR-8 — the older view; the reconstruction re-homes them.)
- [—] **Search (FTS5) — streamed to DB-8 (#60).**

## Closure (2026-08-05)
AR-8's `⊞≥2` pinned at its turn (DF-11), grounded in the plan, resolves to **one** bespoke `@vida/core` deliverable:
the **backlink resolver** (increment #1, done, double-gated). The other three named capabilities are homed elsewhere
*in the same plan* — graph→AR-6 Views + UI-2, export→UI-3, search→DB-8 — so nothing further is AR-8's to build at
M1.0. **LIF-79 → Done.** Unblocks HARD-3 (graph-backlinks rides the backlink resolver).
