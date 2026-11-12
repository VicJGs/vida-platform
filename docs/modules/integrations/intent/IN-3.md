---
id: IN-3
kind: intent-row
module: integrations
status: active
supersedes: []
summary: "An ingestion whose data scope names a sensitive module routes its outbound fetch through the egress guard, while a fetch with no sensitive read is governed by the grant alone and never over-gated."
anchors: [docs/modules/integrations/intent.yaml]
tokens: 82
generated: true
---
# IN-3 (intent only)

An ingestion whose data scope names a sensitive module routes its outbound fetch through the egress guard, while a fetch with no sensitive read is governed by the grant alone and never over-gated.

- Work: LIF-577

Generated from `docs/modules/integrations/intent.yaml`; edit the ledger, never this unit.
