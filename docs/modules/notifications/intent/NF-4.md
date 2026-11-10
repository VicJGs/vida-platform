---
id: NF-4
kind: intent-row
module: notifications
status: active
supersedes: []
summary: "Channels, quiet hours and the per-module push toggles belong to Preferences; Notifications reads them at each delivery and stores none of them, and with no Preferences port every channel is on."
anchors: [docs/modules/notifications/intent.yaml]
tokens: 97
generated: true
---
# NF-4 (intent only)

Channels, quiet hours and the per-module push toggles belong to Preferences; Notifications reads them at each delivery and stores none of them, and with no Preferences port every channel is on.

- Proof: BR-NT-S2-1 (no test), BR-NT-S2-8 (no test)
- Uses: preferences, PR-11

Generated from `docs/modules/notifications/intent.yaml`; edit the ledger, never this unit.
