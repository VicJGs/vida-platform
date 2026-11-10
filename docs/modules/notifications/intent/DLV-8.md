---
id: DLV-8
kind: intent-row
module: notifications
status: active
supersedes: []
summary: "Any external port that doesn't deliver (the deny-safe default included) folds back to in-app and flags it; in-app is the unconditional baseline and a delivery never rejects."
anchors: [docs/modules/notifications/intent.yaml, packages/core/src/foundation/notifications/__tests__/service.test.ts]
tokens: 78
generated: true
---
# DLV-8 (tested)

Any external port that doesn't deliver (the deny-safe default included) folds back to in-app and flags it; in-app is the unconditional baseline and a delivery never rejects.

- Proof: BR-ND-8 (tested)

Generated from `docs/modules/notifications/intent.yaml`; edit the ledger, never this unit.
