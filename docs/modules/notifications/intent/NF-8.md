---
id: NF-8
kind: intent-row
module: notifications
status: active
supersedes: []
summary: "An event notification converges to one row by its deterministic effect_event_id, and a due reminder is keyed by its due occurrence, so a retry or two devices waking fire it once."
anchors: [docs/modules/notifications/intent.yaml, packages/core/src/services/notifications/__tests__/notifications-service.test.ts]
tokens: 119
generated: true
---
# NF-8 (partly tested)

An event notification converges to one row by its deterministic effect_event_id, and a due reminder is keyed by its due occurrence, so a retry or two devices waking fire it once.

- Proof: BR-NT-S3-2 (no test), BR-NT-S3-3 (no test), BR-NT-S4-4 (no test), BR-NT-S4-5 (no test), BR-ND-6 (no test), NF-8 (tested by name)
- Uses: effects, DLV-6
- Work: LIF-533

Generated from `docs/modules/notifications/intent.yaml`; edit the ledger, never this unit.
