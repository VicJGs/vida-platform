---
id: SS-8
kind: intent-row
module: sessions
status: active
supersedes: []
summary: "A planned_block is the plan and never the log; completing it calls the owner's createSession(), which carries planned_block_id."
anchors: [docs/modules/sessions/intent.yaml, packages/core/src/services/sessions/__tests__/sessions-service.test.ts]
tokens: 76
generated: true
---
# SS-8 (partly tested)

A planned_block is the plan and never the log; completing it calls the owner's createSession(), which carries planned_block_id.

- Proof: BR-36 (no test), SS-8 (tested by name)
- Work: LIF-442

Generated from `docs/modules/sessions/intent.yaml`; edit the ledger, never this unit.
