---
id: SY-1
kind: intent-row
module: sync
status: active
supersedes: []
summary: "Until sync is activated, the sync engine does no network I/O; its flush loop exists but every transport, push and pull step is inert, so nothing leaves the device."
anchors: [docs/modules/sync/intent.yaml, packages/core/src/sync/__tests__/scaffold.test.ts]
tokens: 74
generated: true
---
# SY-1 (tested)

Until sync is activated, the sync engine does no network I/O; its flush loop exists but every transport, push and pull step is inert, so nothing leaves the device.

- Proof: SY-1 (tested by name)

Generated from `docs/modules/sync/intent.yaml`; edit the ledger, never this unit.
