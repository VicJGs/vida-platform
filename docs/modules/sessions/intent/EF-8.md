---
id: EF-8
kind: intent-row
module: sessions
status: active
supersedes: []
summary: "A handler receives the rail's active transaction and co-writes through it, never opening its own; a handler throw rolls back both its write and the ledger row."
anchors: [docs/modules/sessions/intent.yaml]
tokens: 72
generated: true
---
# EF-8 (intent only)

A handler receives the rail's active transaction and co-writes through it, never opening its own; a handler throw rolls back both its write and the ledger row.

- Work: LIF-613

Generated from `docs/modules/sessions/intent.yaml`; edit the ledger, never this unit.
