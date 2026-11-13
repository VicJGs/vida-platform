---
id: BL-7
kind: intent-row
module: graph
status: active
supersedes: []
summary: "The resolver is the documented read through which every module asks what links to an entity and what a page links to; no module reads the entity links table directly or keeps a cross-module copy, and an unknown source yields an empty list, never an invented value."
anchors: [docs/modules/graph/intent.yaml, packages/core/src/services/search/__tests__/backlink-resolver.test.ts]
tokens: 100
generated: true
---
# BL-7 (tested)

The resolver is the documented read through which every module asks what links to an entity and what a page links to; no module reads the entity links table directly or keeps a cross-module copy, and an unknown source yields an empty list, never an invented value.

- Proof: BL-7 (tested by name)

Generated from `docs/modules/graph/intent.yaml`; edit the ledger, never this unit.
