---
id: NF-1
kind: intent-row
module: notifications
status: active
supersedes: []
summary: "Notifications reads every module through seams and writes only its own rows; nothing in Vida depends on it, so it can be switched off and no core function breaks."
anchors: [docs/modules/notifications/intent.yaml, packages/core/src/services/notifications/__tests__/notifications-service.test.ts]
tokens: 87
generated: true
---
# NF-1 (tested)

Notifications reads every module through seams and writes only its own rows; nothing in Vida depends on it, so it can be switched off and no core function breaks.

- Proof: BR-NT-S1-1 (no test), BR-NT-S3-4 (no test), NF-1 (tested by name)

Generated from `docs/modules/notifications/intent.yaml`; edit the ledger, never this unit.
