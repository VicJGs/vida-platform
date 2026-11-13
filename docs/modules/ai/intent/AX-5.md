---
id: AX-5
kind: intent-row
module: ai
status: active
supersedes: []
summary: "Prompt injection is bounded; content from an untrusted origin carries its provenance into the prompt (an unknown origin is untrusted), and an injected tool call still meets the tool gate and the egress gate, so it can't widen the scope or invent a target."
anchors: [docs/modules/ai/intent.yaml]
tokens: 106
generated: true
---
# AX-5 (intent only)

Prompt injection is bounded; content from an untrusted origin carries its provenance into the prompt (an unknown origin is untrusted), and an injected tool call still meets the tool gate and the egress gate, so it can't widen the scope or invent a target.

- Proof: BR-AI-9 (no test)
- Uses: AX-4, EG-5
- Work: LIF-585

Generated from `docs/modules/ai/intent.yaml`; edit the ledger, never this unit.
