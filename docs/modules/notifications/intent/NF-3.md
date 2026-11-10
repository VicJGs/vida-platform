---
id: NF-3
kind: intent-row
module: notifications
status: active
supersedes: []
summary: "Upcoming reminders are derived from the due agenda and never stored; a row materializes only when a reminder actually fires, so the table is the history of what already fired."
anchors: [docs/modules/notifications/intent.yaml, packages/core/src/foundation/notifications/__tests__/scheduling.test.ts, packages/core/src/services/notifications/__tests__/notifications-service.test.ts]
tokens: 153
generated: true
---
# NF-3 (partly tested)

Upcoming reminders are derived from the due agenda and never stored; a row materializes only when a reminder actually fires, so the table is the history of what already fired.

- Proof: BR-NT-S4-2 (no test), BR-NT-S4-3 (no test), BR-ND-7 (no test), NF-3 (tested by name)
- Uses: sessions, SS-7, DLV-7
- Work: LIF-534
- Open: Which instant a due item fires at (its own reminder time or a lane's lead time) and in which time zone, since habits, check-ins and contact reminders have a time of day.

Generated from `docs/modules/notifications/intent.yaml`; edit the ledger, never this unit.
