# Task: mod-notes-and-pages
# Profile: Add Backend Component
# Scenario: default
# Spec: docs/specs/features/mod-notes/_index.md
# Created: 2026-08-21
# Status: planned
# Cluster: M1 — Whole Manual OS
# Linear: LIF-131
# Project: M1 — Whole Manual OS
# Milestone: M1.1.1 — Hub & Foundation · Backend
# Source: reconstructed-structure.md (Phase V, LIF-110; ADR-016 model)
# Note: reshaped from mod-notes (LIF-131); prior ①/② torn down (eaf64f8); re-planned under P3 decomposition — reports reshape, not Done.

## Goal
Build the `@vida/core` Notes & Pages service (MOD-notes increment ①) — a typed page/link/tag/attachment API over the DB-4-authored `pages`/`page_links`/`entity_links`/`note_attachments` schema: page CRUD (all 6 types) with journal-date conflict (`JournalExistsError`), `page_links`/`entity_links` UNIQUE idempotence, `resolveWikiLink` + create-on-miss, client-deterministic entity-note auto-seed, today-only `/summary` 5-section aggregation, open `entity_type` registry validation, and `entity_tags` reads (AR-6 owns writes). Notes & Pages is the in-degree-14 HUB — the connective layer 12+ modules pull.

## Dependencies
- blocked by `mod-journals`
- blocked by `xs-spaces-tags-links`
- blocked by `xs-templates`
- blocked by `xs-views`
