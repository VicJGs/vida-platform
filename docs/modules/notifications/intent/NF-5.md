---
id: NF-5
kind: intent-row
module: notifications
status: active
supersedes: []
summary: "Before delivering, the dispatcher checks the channel, the per-module toggle and quiet hours; a suppressed notification is still recorded in-app, so suppression means not pushed or emailed, never lost."
anchors: [docs/modules/notifications/intent.yaml, packages/core/src/services/notifications/__tests__/notifications-service.test.ts]
tokens: 126
generated: true
---
# NF-5 (partly tested)

Before delivering, the dispatcher checks the channel, the per-module toggle and quiet hours; a suppressed notification is still recorded in-app, so suppression means not pushed or emailed, never lost.

- Proof: BR-NT-S2-2 (no test), BR-NT-S2-3 (no test), BR-NT-S2-4 (no test), BR-NT-S2-5 (no test), BR-NT-S4-6 (no test), NF-5 (tested by name)
- Uses: preferences, PR-13
- Work: LIF-479

Generated from `docs/modules/notifications/intent.yaml`; edit the ledger, never this unit.
