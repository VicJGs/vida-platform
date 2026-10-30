---
Date: 2026-07-22
Task: db-2-sync-metadata-columns
Issue: LIF-64
Profile: Generic Coding Session / Default
Cluster: ① Database Layer · Phase 1.0
Status: in_progress
---

Task initialized. Goal: amend the shared `syncColumns` primitive to the FINAL sync-metadata
set — add `_sync_field_ts` (ADR-003 §17), settle the `effect_event_id` idempotency columns'
home (ADR-004 F1), and pin the HLC representation of `_sync_lww_ts` / `_sync_field_ts` (F6/D4-d).

Origin: pre-existing planned stub (2026-07-20) activated + enriched. Merged its ADR-003 §17 /
ADR-004 F1 / HLC F6-D4-d scope and the Phase-1-localhost framing into the full task structure.

Ground-truth anchor found this session: **ADR-002 §5.20 owed-tables ledger
(ADR-002-data-model.md:3790-3794)** lists DB-2's exact scope. Key boundary surfaced:
`_sync_field_ts` is universal (→ `syncColumns` spread) but `effect_event_id` is NOT (only on
effect-triggering + UNIQUE effect-output rows) — must not land in the shared spread.

Spec stub scaffolded: docs/specs/foundation/db-2-sync-metadata-columns/_index.md.

Next step: run the Per-Step Build Gate — `/document-context` baseline on the db/schema context
→ PLAN (/documentation-component) resolving the HLC representation UNKNOWN against ADR-003 §17
→ /critique → APPROVAL 1.
