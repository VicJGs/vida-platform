---
id: SPC-2
kind: intent-row
module: spaces
status: active
supersedes: []
summary: "Taggable and linkable entity types come from one open registry; a module makes its entities taggable by registering a type, never by a schema edit, and an unregistered type is refused with a typed error."
anchors: [docs/modules/spaces/intent.yaml, packages/core/src/foundation/capability/__tests__/capability.test.ts, packages/core/src/foundation/spaces/__tests__/association-resolver.test.ts, packages/core/src/foundation/spaces/__tests__/spaces.test.ts]
tokens: 83
generated: true
---
# SPC-2 (tested)

Taggable and linkable entity types come from one open registry; a module makes its entities taggable by registering a type, never by a schema edit, and an unregistered type is refused with a typed error.

- Proof: BR-2 (tested)

Generated from `docs/modules/spaces/intent.yaml`; edit the ledger, never this unit.
