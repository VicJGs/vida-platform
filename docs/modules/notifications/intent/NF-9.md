---
id: NF-9
kind: intent-row
module: notifications
status: active
supersedes: []
summary: "A fire succeeds on the device first, and the row with its read and archive state syncs to the other devices, so reading it on one clears it on the rest."
anchors: [docs/modules/notifications/intent.yaml, packages/core/src/services/notifications/__tests__/notifications-service.test.ts]
tokens: 83
generated: true
---
# NF-9 (tested)

A fire succeeds on the device first, and the row with its read and archive state syncs to the other devices, so reading it on one clears it on the rest.

- Proof: BR-NT-S3-5 (no test), NF-9 (tested by name)
- Uses: sync

Generated from `docs/modules/notifications/intent.yaml`; edit the ledger, never this unit.
