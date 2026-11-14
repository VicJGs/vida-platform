---
id: EF-6
kind: intent-row
module: sessions
status: active
supersedes: []
summary: "A projection effect (surface_journal, surface_calendar) writes no ledger row and invokes no handler, because Journal and Calendar aggregate at render; it never carries a persisted side effect, and a write-shaped consequence is surface_notification."
anchors: [docs/modules/sessions/intent.yaml]
tokens: 101
generated: true
---
# EF-6 (intent only)

A projection effect (surface_journal, surface_calendar) writes no ledger row and invokes no handler, because Journal and Calendar aggregate at render; it never carries a persisted side effect, and a write-shaped consequence is surface_notification.

- Uses: journals, calendar
- Work: LIF-613

Generated from `docs/modules/sessions/intent.yaml`; edit the ledger, never this unit.
