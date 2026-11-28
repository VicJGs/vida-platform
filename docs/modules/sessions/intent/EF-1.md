---
id: EF-1
kind: intent-row
module: sessions
status: active
supersedes: []
summary: "An effect applies at most once per effect_event_id, effect type and target; a second identical event applies nothing, fires no handler and returns applied false."
anchors: [docs/modules/sessions/intent.yaml, packages/core/src/foundation/effects/__tests__/effects.test.ts]
tokens: 75
generated: true
---
# EF-1 (tested)

An effect applies at most once per effect_event_id, effect type and target; a second identical event applies nothing, fires no handler and returns applied false.

- Proof: EF-1 (tested by name)

Generated from `docs/modules/sessions/intent.yaml`; edit the ledger, never this unit.
