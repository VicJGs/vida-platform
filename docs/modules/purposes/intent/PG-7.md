---
id: PG-7
kind: intent-row
module: purposes
status: active
supersedes: []
summary: "An event-trigger write goes through the owning module's single service method on the effect rail, idempotent per effect_event_id, never a new engine; writes are sparse, and rollups and what changed derive on read from each related entity's day (PG-37)."
anchors: [docs/modules/purposes/intent.yaml]
tokens: 105
generated: true
---
# PG-7 (intent only)

An event-trigger write goes through the owning module's single service method on the effect rail, idempotent per effect_event_id, never a new engine; writes are sparse, and rollups and what changed derive on read from each related entity's day (PG-37).

- Uses: effects, measurement, journals
- Work: LIF-113

Generated from `docs/modules/purposes/intent.yaml`; edit the ledger, never this unit.
