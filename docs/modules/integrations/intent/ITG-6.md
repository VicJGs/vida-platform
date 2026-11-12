---
id: ITG-6
kind: intent-row
module: integrations
status: active
supersedes: []
summary: "A fetch is itself an outbound request, so a capability holding a sensitive read and any outside grant takes the union of consents, and its fetch's address and parameters are treated as egress."
anchors: [docs/modules/integrations/intent.yaml]
tokens: 86
generated: true
---
# ITG-6 (intent only)

A fetch is itself an outbound request, so a capability holding a sensitive read and any outside grant takes the union of consents, and its fetch's address and parameters are treated as egress.

- Uses: IN-3, EG-4
- Work: LIF-577

Generated from `docs/modules/integrations/intent.yaml`; edit the ledger, never this unit.
