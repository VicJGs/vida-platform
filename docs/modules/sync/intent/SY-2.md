---
id: SY-2
kind: intent-row
module: sync
status: active
supersedes: []
summary: "The engine only consumes the sync queue; the entity write and its queue row are written together by the repository, and the engine reads pending rows and, once activated, moves their status or removes them after the server acknowledges."
anchors: [docs/modules/sync/intent.yaml]
tokens: 90
generated: true
---
# SY-2 (intent only)

The engine only consumes the sync queue; the entity write and its queue row are written together by the repository, and the engine reads pending rows and, once activated, moves their status or removes them after the server acknowledges.

- Work: LIF-598

Generated from `docs/modules/sync/intent.yaml`; edit the ledger, never this unit.
