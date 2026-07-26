# Task: db-8-fts5-search
# Status: planned
# Cluster: M1.0 Boot & Connective Base
# Milestone: Boot & DB spine
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ① Database Layer

## Goal
Stand up FTS5 virtual tables (pages, tasks, contacts, courses + new `fts_knowledge`) with
rebuild-on-vault-unlock, since the plaintext index can only exist while the vault is open. Add the
keyed blind index (`category_bidx`, BLAKE2b, F7/D7) for equality lookups over encrypted columns
without leaking plaintext. Feeds the AR-8 search service.

## Dependencies
- blocked by `db-4-per-domain-schema`
- blocked by `db-6-repository-layer`
