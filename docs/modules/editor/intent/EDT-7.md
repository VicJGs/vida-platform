---
id: EDT-7
kind: intent-row
module: editor
status: active
supersedes: []
summary: "A module renders its own live body for its block inside the editor through renderers the host passes; a block without one shows an honest placeholder (available when its module ships) and never crashes."
anchors: [docs/modules/editor/intent.yaml, packages/editor/src/extensions/integration-blocks.test.tsx]
tokens: 101
generated: true
---
# EDT-7 (partly tested)

A module renders its own live body for its block inside the editor through renderers the host passes; a block without one shows an honest placeholder (available when its module ships) and never crashes.

- Proof: BR-E5-1 (tested), BR-E5-3 (tested)
- Uses: notes, capabilities
- Work: LIF-607

Generated from `docs/modules/editor/intent.yaml`; edit the ledger, never this unit.
