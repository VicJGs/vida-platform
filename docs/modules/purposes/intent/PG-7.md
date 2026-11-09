---
id: PG-7
kind: intent-row
module: purposes
status: active
supersedes: []
summary: "An event-trigger write goes through the owning module's single service method on the effect rail, idempotent per effect_event_id, never a new engine; writes are sparse, rollups derive on read, and what changed comes from journal snapshots."
anchors: [docs/modules/purposes/intent.yaml]
tokens: 102
generated: true
---
# PG-7 (intent only)

An event-trigger write goes through the owning module's single service method on the effect rail, idempotent per effect_event_id, never a new engine; writes are sparse, rollups derive on read, and what changed comes from journal snapshots.

- Uses: effects, measurement, journals
- Work: LIF-113

Generated from `docs/modules/purposes/intent.yaml`; edit the ledger, never this unit.
