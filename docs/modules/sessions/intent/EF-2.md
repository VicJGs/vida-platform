---
id: EF-2
kind: intent-row
module: sessions
status: active
supersedes: []
summary: "The effect_event_id is derived from the event's stable identity (subject natural key, transition, effect type), so the same outcome gets the same id on any device and on every retry; it is never random."
anchors: [docs/modules/sessions/intent.yaml, packages/core/src/foundation/effects/__tests__/effects.test.ts]
tokens: 85
generated: true
---
# EF-2 (tested)

The effect_event_id is derived from the event's stable identity (subject natural key, transition, effect type), so the same outcome gets the same id on any device and on every retry; it is never random.

- Proof: EF-2 (tested by name)

Generated from `docs/modules/sessions/intent.yaml`; edit the ledger, never this unit.
