---
id: VW-4
kind: intent-row
module: spaces
status: active
supersedes: []
summary: "A cross-module view fans out to each entity type's registered read provider and merges the results, never reading another module's tables; a type with no provider degrades to a note and an empty contribution."
anchors: [docs/modules/spaces/intent.yaml, packages/core/src/foundation/spaces/__tests__/spaces.test.ts]
tokens: 88
generated: true
---
# VW-4 (tested)

A cross-module view fans out to each entity type's registered read provider and merges the results, never reading another module's tables; a type with no provider degrades to a note and an empty contribution.

- Proof: BR-11 (tested)
- Uses: SPC-15

Generated from `docs/modules/spaces/intent.yaml`; edit the ledger, never this unit.
