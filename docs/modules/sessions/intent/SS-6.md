---
id: SS-6
kind: intent-row
module: sessions
status: active
supersedes: []
summary: "A session never affects an entity it is not attached to, two types never count the same event twice (deterministic effect_event_id over the applied_effects ledger), and a permission violation is a hard, logged rejection."
anchors: [docs/modules/sessions/intent.yaml, packages/core/src/foundation/sessions/__tests__/registry.test.ts]
tokens: 101
generated: true
---
# SS-6 (partly tested)

A session never affects an entity it is not attached to, two types never count the same event twice (deterministic effect_event_id over the applied_effects ledger), and a permission violation is a hard, logged rejection.

- Proof: BR-4 (tested), BR-9 (no test)
- Uses: effects
- Work: LIF-447

Generated from `docs/modules/sessions/intent.yaml`; edit the ledger, never this unit.
