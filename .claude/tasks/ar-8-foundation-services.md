# Task: ar-8-foundation-services
# Status: planned
# Linear: LIF-79
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ② Architecture Layer

## Goal
Build the cross-cutting foundation services in `@vida/core`: full-text search (over the DB-8 FTS5
tables), the backlinks / entity-link resolver, export serializers (MD/PDF/DOCX), analytics
primitives, and neural-graph data prep. Module-owned engines (journal aggregation, study planner,
points economy) live in their own module clusters — these are the shared ones.

## Dependencies
- blocked by `ar-6-spaces`  <!-- backlink resolver + neural-graph data-prep read entity_links, owned by ar-6 (Spaces tier, INT-1a). Slug→canonical map key (was ar-6-spaces-and-tags, earlier ar-2); delivery-planning-loop U1 -->
- blocked by `db-8-fts5-search`
