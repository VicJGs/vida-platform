# Unit: storage-master-plan (foundation · planning)

> Thin index (session-split form). Deep content in `sessions/`.

## Identity
- **What:** the two governing artifacts of the from-zero storage rebuild — **ADR-016** (durable decision) +
  **storage-build-plan.md** (the master table ledger + phase sequence + per-table-gate template).
- **Why:** DB-1 shipped the primitives; the campaign now needs a locked plan before DB-2…DB-11 + ~130 per-table
  gates run — otherwise they drift. Formalizes `docs/infrastructure/storage-rebuild-strategy.md` through the gate.
- **Type:** planning / foundation (non-code deliverable; artifacts are docs).
- **Grounding:** the reconciliation + §5.20 + the 24 `structure-data.md` docs (No-Guessing).

## Acceptance
See PLAN §4.

## Status
**Done — both gates cleared** (Approval 1: fork A; Approval 2: artifacts). ADR-016 (SHIP) + storage-build-plan.md
(REVISE → 8 ledger fixes applied). Independent critique both gates.

## Gate files
- **Gate 1 — PLAN:** [`sessions/PLAN-2026-07-22-storage-master-plan.md`](sessions/PLAN-2026-07-22-storage-master-plan.md) — Approval 1 (fork A) ✓
- **Gate 2 — authored artifacts:** [ADR-016](../../../core/decisions/ADR-016-storage-layer-rebuild-from-zero.md) + [storage-build-plan.md](../../../infrastructure/storage-build-plan.md) — Approval 2 ✓

## Ground truth
`docs/infrastructure/storage-rebuild-strategy.md` · `database-schema-reconciliation.md` · ADR-002 §5.20 ·
`docs/features/*/structure-data.md` (24) · `.adr/ADR-000-template.md`.
