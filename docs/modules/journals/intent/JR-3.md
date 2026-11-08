---
id: JR-3
kind: intent-row
module: journals
status: active
supersedes: []
summary: "Modules contribute through a registry and the journal names no module; each module registers a journal contribution, and the engine iterates the registry, so adding a module never edits the journal."
anchors: [docs/modules/journals/intent.yaml, packages/core/src/services/journals/__tests__/registry.test.ts]
tokens: 92
generated: true
---
# JR-3 (tested)

Modules contribute through a registry and the journal names no module; each module registers a journal contribution, and the engine iterates the registry, so adding a module never edits the journal.

- Proof: BR-S1-1 (tested), BR-S1-2 (tested), BR-S1-3 (tested)

Generated from `docs/modules/journals/intent.yaml`; edit the ledger, never this unit.
