---
id: EF-6
kind: intent-row
module: sessions
status: active
supersedes: []
summary: "A projection effect (surface_journal, surface_calendar) writes no ledger row and invokes no handler, because Journal and Calendar aggregate at render; it never carries a persisted side effect, and a write-shaped consequence is surface_notification."
anchors: [docs/modules/sessions/intent.yaml, packages/core/src/foundation/effects/__tests__/effects.test.ts]
tokens: 103
generated: true
---
# EF-6 (tested)

A projection effect (surface_journal, surface_calendar) writes no ledger row and invokes no handler, because Journal and Calendar aggregate at render; it never carries a persisted side effect, and a write-shaped consequence is surface_notification.

- Proof: EF-6 (tested by name)
- Uses: journals, calendar

Generated from `docs/modules/sessions/intent.yaml`; edit the ledger, never this unit.
