---
id: DLV-12
kind: intent-row
module: notifications
status: active
supersedes: []
summary: "Each product shape delivers a time-based reminder its own way; the localhost web product the user runs on their machine delivers it locally, with no server; the desktop and mobile apps register each upcoming reminder with the native local scheduler ahead of its time, with quiet hours baked in per the user's shift or suppress choice, and reschedule (cancel and re-register) when the schedule or the quiet hours change; only the server product, which serves the web and manages its information, adds the wake signal."
anchors: [docs/modules/notifications/intent.yaml]
tokens: 243
generated: true
---
# DLV-12 (intent only)

Each product shape delivers a time-based reminder its own way; the localhost web product the user runs on their machine delivers it locally, with no server; the desktop and mobile apps register each upcoming reminder with the native local scheduler ahead of its time, with quiet hours baked in per the user's shift or suppress choice, and reschedule (cancel and re-register) when the schedule or the quiet hours change; only the server product, which serves the web and manages its information, adds the wake signal.

- Uses: preferences, PR-13, sessions, DLV-4, DLV-5, DLV-13
- Work: LIF-402
- Open: How the localhost product fires a reminder when it isn't open (a background task is the Integrations feature), where the user's shift or suppress choice lives, and whether the native scheduler port lands with LIF-151 or with the desktop and mobile apps.

Generated from `docs/modules/notifications/intent.yaml`; edit the ledger, never this unit.
