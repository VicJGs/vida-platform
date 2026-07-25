# Task: storage-master-plan
# Status: done   (ADR-016 + storage-build-plan.md authored + both gates cleared + committed 58dc813 · 2026-07-22)
# Profile: Generic Coding Session
# Scenario: Default
# Cluster: ⓪ Storage rebuild — campaign strategy
# Source: docs/infrastructure/storage-rebuild-strategy.md (intake) · DB-1 close-out follow-up

## Goal
Author the two governing artifacts of the from-zero storage rebuild, **following the planning gate**, grounded in the
documentation (No-Guessing):
1. **ADR-016 — Storage Layer Rebuild from Zero** (`docs/core/decisions/ADR-016-*.md`): the durable decision — why
   from-zero · schema/ topology · locked patterns · per-table gating protocol · **RESOLVES the DDL-generation fork**
   (hand-written SQL vs drizzle-kit hybrid).
2. **storage-build-plan.md** (`docs/infrastructure/`): the master plan — full table ledger (~130-150 tables from
   Stream i §5.20 + the 24 structure-data docs, FK-dependency order, ✓/⏳/↔) + table-spec template + phase sequence +
   context machinery.

Governs DB-2…DB-11 + every per-table gate.

## Dependencies
- DB-1 (done — primitives shipped, commit b234e85).
