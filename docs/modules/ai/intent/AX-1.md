---
id: AX-1
kind: intent-row
module: ai
status: active
supersedes: []
summary: "A model call runs in one of two modes the user picks per use, on the device (the user's own local model, nothing leaves the vault) or in the cloud with the user's own key (a scoped slice sent from the device straight to the provider); no server sees either, the device is preferred, and a call is never upgraded to the cloud silently."
anchors: [docs/modules/ai/intent.yaml]
tokens: 135
generated: true
---
# AX-1 (intent only)

A model call runs in one of two modes the user picks per use, on the device (the user's own local model, nothing leaves the vault) or in the cloud with the user's own key (a scoped slice sent from the device straight to the provider); no server sees either, the device is preferred, and a call is never upgraded to the cloud silently.

- Proof: BR-AI-1 (no test), BR-AI-2 (no test), BR-AI-8 (no test), BR-AI-11 (no test)
- Work: LIF-585

Generated from `docs/modules/ai/intent.yaml`; edit the ledger, never this unit.
