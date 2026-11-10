---
id: NF-6
kind: intent-row
module: notifications
status: active
supersedes: []
summary: "Push is a content-free wake signal and the device composes the notification after it syncs and decrypts; the server never sees a title, message or subject link, email is a generic nudge only and there is no `sms`."
anchors: [docs/modules/notifications/intent.yaml, packages/core/src/services/notifications/__tests__/notifications-service.test.ts]
tokens: 108
generated: true
---
# NF-6 (tested)

Push is a content-free wake signal and the device composes the notification after it syncs and decrypts; the server never sees a title, message or subject link, email is a generic nudge only and there is no `sms`.

- Proof: BR-NT-S2-6 (no test), BR-ND-3 (no test), NF-6 (tested by name)
- Uses: DLV-2, DLV-3, encryption

Generated from `docs/modules/notifications/intent.yaml`; edit the ledger, never this unit.
