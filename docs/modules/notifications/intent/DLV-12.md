---
id: DLV-12
kind: intent-row
module: notifications
status: active
supersedes: []
summary: "On a native device the dispatcher registers each upcoming time-based reminder with the local scheduler ahead of its time, with quiet hours baked in per the user's shift or suppress choice, and reschedules (cancel and re-register) when the schedule or the quiet hours change; on the web the reminder falls to the wake signal."
anchors: [docs/modules/notifications/intent.yaml]
tokens: 163
generated: true
---
# DLV-12 (intent only)

On a native device the dispatcher registers each upcoming time-based reminder with the local scheduler ahead of its time, with quiet hours baked in per the user's shift or suppress choice, and reschedules (cancel and re-register) when the schedule or the quiet hours change; on the web the reminder falls to the wake signal.

- Uses: preferences, PR-13, sessions, DLV-4, DLV-5
- Work: LIF-402
- Open: Where the user's shift or suppress choice lives, and whether the native scheduler port lands with LIF-151 or with the desktop venue.

Generated from `docs/modules/notifications/intent.yaml`; edit the ledger, never this unit.
