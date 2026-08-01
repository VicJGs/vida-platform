# Task: db-8-fts5-search
# Status: planned
# Linear: LIF-70
# Project: M1 — Whole Manual OS
# Milestone: M1.4 — Internal-Integration Hardening
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ① Database Layer

## Goal
Stand up FTS5 virtual tables (pages, tasks, contacts, courses + new `fts_knowledge`) with
rebuild-on-vault-unlock, since the plaintext index can only exist while the vault is open. Add the
keyed blind index (`category_bidx`, BLAKE2b, F7/D7) for equality lookups over encrypted columns
without leaking plaintext. Feeds the AR-8 search service.

## Dependencies
- blocked by `db-4-per-domain-schema`
- blocked by `db-7-migrations-runner`  <!-- was db-6: FTS5 tables are DDL via the runner; populate-on-unlock (db-6 decrypt seam) is gated on a vault-unlock that is M3 (UX-5b) — illegal M1.0←M3 edge removed 2026-07-28 dep-graph-validation -->

The db-6 populate path is an M3 impl dependency, not an M1.0 build-order blocker.
