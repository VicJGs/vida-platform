---
id: SPC-1
kind: intent-row
module: spaces
status: active
supersedes: []
summary: "A tag attaches to any entity in Vida through one universal entity_tags primitive; there is no page-only tag path and no per-module tag table, and tagging and untagging are idempotent by business key, reviving a soft-deleted row and soft-deleting on remove."
anchors: [docs/modules/spaces/intent.yaml, packages/core/src/foundation/spaces/__tests__/spaces.test.ts]
tokens: 115
generated: true
---
# SPC-1 (tested)

A tag attaches to any entity in Vida through one universal entity_tags primitive; there is no page-only tag path and no per-module tag table, and tagging and untagging are idempotent by business key, reviving a soft-deleted row and soft-deleting on remove.

- Proof: BR-1 (no test), BR-14 (no test), BR-15 (no test), SPC-1 (tested by name)
- Uses: notes

Generated from `docs/modules/spaces/intent.yaml`; edit the ledger, never this unit.
