---
id: DSG-2
kind: intent-row
module: shell
status: active
supersedes: []
summary: "Tokens are three layers that never skip one; primitives are literals, semantics reference primitives and components reference semantics, and a literal outside the primitives, a skipped layer, a dangling reference or an empty layer fails the build with its cause named."
anchors: [docs/modules/shell/intent.yaml, packages/ui/src/themes/build-tokens.test.ts]
tokens: 107
generated: true
---
# DSG-2 (partly tested)

Tokens are three layers that never skip one; primitives are literals, semantics reference primitives and components reference semantics, and a literal outside the primitives, a skipped layer, a dangling reference or an empty layer fails the build with its cause named.

- Proof: DSG-2 (tested by name)
- Work: LIF-592

Generated from `docs/modules/shell/intent.yaml`; edit the ledger, never this unit.
