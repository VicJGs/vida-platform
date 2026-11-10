---
id: NF-2
kind: intent-row
module: notifications
status: active
supersedes: []
summary: "A notification comes either from the surface_notification effect (a thing happened) or from the dispatcher firing a due reminder read from the Sessions due agenda (a thing is due); both land as one row shape in one stream, and no module writes the table directly."
anchors: [docs/modules/notifications/intent.yaml, packages/core/src/services/notifications/__tests__/notifications-service.test.ts]
tokens: 121
generated: true
---
# NF-2 (tested)

A notification comes either from the surface_notification effect (a thing happened) or from the dispatcher firing a due reminder read from the Sessions due agenda (a thing is due); both land as one row shape in one stream, and no module writes the table directly.

- Proof: BR-NT-S3-1 (no test), BR-NT-S4-1 (no test), NF-2 (tested by name)
- Uses: effects, sessions, SS-7

Generated from `docs/modules/notifications/intent.yaml`; edit the ledger, never this unit.
