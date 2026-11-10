---
id: DLV-13
kind: intent-row
module: notifications
status: active
supersedes: []
summary: "With the server product, the wake signal reaches closed devices; on a blob's arrival the server's wake relay sends a content-minimal push to the user's registered devices (push tokens on the device registry), the device syncs and composes the notification locally, the web the server serves uses a service worker with Web Push, and email sends the generic nudge."
anchors: [docs/modules/notifications/intent.yaml]
tokens: 156
generated: true
---
# DLV-13 (intent only)

With the server product, the wake signal reaches closed devices; on a blob's arrival the server's wake relay sends a content-minimal push to the user's registered devices (push tokens on the device registry), the device syncs and composes the notification locally, the web the server serves uses a service worker with Web Push, and email sends the generic nudge.

- Uses: sync, encryption, DLV-3
- Work: LIF-151
- Open: The push vendor and the email provider, and whether the email nudge rides LIF-151 too.

Generated from `docs/modules/notifications/intent.yaml`; edit the ledger, never this unit.
