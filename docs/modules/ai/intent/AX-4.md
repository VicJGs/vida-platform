---
id: AX-4
kind: intent-row
module: ai
status: active
supersedes: []
summary: "An agent's callable tools are exactly its granted envelope; a tool outside it fails closed, the agent holds no ambient authority, its writes go through the module's guarded write interface, and a model call it needs is the mediated ask, so it never holds a key."
anchors: [docs/modules/ai/intent.yaml]
tokens: 118
generated: true
---
# AX-4 (intent only)

An agent's callable tools are exactly its granted envelope; a tool outside it fails closed, the agent holds no ambient authority, its writes go through the module's guarded write interface, and a model call it needs is the mediated ask, so it never holds a key.

- Proof: BR-AI-6 (no test), BR-AI-7 (no test)
- Uses: capabilities, CB-4, CB-8, effects
- Work: LIF-585

Generated from `docs/modules/ai/intent.yaml`; edit the ledger, never this unit.
