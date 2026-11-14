---
id: EF-2
kind: intent-row
module: sessions
status: active
supersedes: []
summary: "The effect_event_id is derived from the event's stable identity (subject natural key, transition, effect type), so the same outcome gets the same id on any device and on every retry; it is never random."
anchors: [docs/modules/sessions/intent.yaml]
tokens: 83
generated: true
---
# EF-2 (intent only)

The effect_event_id is derived from the event's stable identity (subject natural key, transition, effect type), so the same outcome gets the same id on any device and on every retry; it is never random.

- Work: LIF-613

Generated from `docs/modules/sessions/intent.yaml`; edit the ledger, never this unit.
