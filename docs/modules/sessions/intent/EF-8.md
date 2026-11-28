---
id: EF-8
kind: intent-row
module: sessions
status: active
supersedes: []
summary: "A handler receives the rail's active transaction and co-writes through it, never opening its own; a handler throw rolls back both its write and the ledger row."
anchors: [docs/modules/sessions/intent.yaml, packages/core/src/foundation/effects/__tests__/effects.test.ts]
tokens: 74
generated: true
---
# EF-8 (tested)

A handler receives the rail's active transaction and co-writes through it, never opening its own; a handler throw rolls back both its write and the ledger row.

- Proof: EF-8 (tested by name)

Generated from `docs/modules/sessions/intent.yaml`; edit the ledger, never this unit.
