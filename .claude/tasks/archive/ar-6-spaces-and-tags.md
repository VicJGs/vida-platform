# Task: ar-6-spaces-and-tags
# Status: planned
# Cluster: M1.0 Boot & Connective Base
# Milestone: Substrates
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ② Architecture Layer (ADR-006)

## Goal
Build the Spaces + universal tags substrate (ADR-006): the `entity_tags` / `entity_links`
association engine that sits beneath Notes & Pages and lets any entity be tagged, linked, and
composed into user-defined Spaces. The polymorphic association layer the whole platform's
backlinks and neural graph read from.

## Dependencies
- blocked by `db-6-repository-layer`
- blocked by `db-9-enums-and-zod-validators`
<!-- reconciled 2026-07-27 (dep-reconcile triage): was `blocked by ar-2` only (under-specified). The spaces/tags/
     links association engine persists through the repository (DB-6) and needs canonical enums/Zod (DB-9); its own
     tables (entity_tags/spaces/views) are the DB-3 stream slice, co-built. ar-2 transitive via db-6. -->

