---
id: AX-3
kind: intent-row
module: ai
status: active
supersedes: []
summary: "A cloud model call is an egress through Integrations' egress guard (per-target consent, the union when a sensitive read joins, an audit and never automatic), and the assistant forwards only the slice its caller gives; redaction trims what is sent but never makes a call private about its own subject."
anchors: [docs/modules/ai/intent.yaml]
tokens: 128
generated: true
---
# AX-3 (intent only)

A cloud model call is an egress through Integrations' egress guard (per-target consent, the union when a sensitive read joins, an audit and never automatic), and the assistant forwards only the slice its caller gives; redaction trims what is sent but never makes a call private about its own subject.

- Proof: BR-AI-3 (no test), BR-AI-4 (no test)
- Uses: integrations, EG-1, EG-2, EG-3, EG-5
- Work: LIF-585

Generated from `docs/modules/ai/intent.yaml`; edit the ledger, never this unit.
