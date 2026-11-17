---
id: EDT-8
kind: intent-row
module: editor
status: active
supersedes: []
summary: "An inline block's configuration lives in its node attributes per its config schema and round-trips losslessly for the declared schema; each block is identified by its block type when read back."
anchors: [docs/modules/editor/intent.yaml, packages/editor/src/slash-commands.test.ts]
tokens: 93
generated: true
---
# EDT-8 (partly tested)

An inline block's configuration lives in its node attributes per its config schema and round-trips losslessly for the declared schema; each block is identified by its block type when read back.

- Proof: BR-E5-2 (no test), BR-E5-5 (tested)
- Uses: capabilities

Generated from `docs/modules/editor/intent.yaml`; edit the ledger, never this unit.
