---
id: EF-3
kind: intent-row
module: sessions
status: active
supersedes: []
summary: "Every non-projection effect is applied only through the handler registered for its type; an effect with no handler fails closed with NoEffectHandler and writes nothing, never a silent drop or a direct table write."
anchors: [docs/modules/sessions/intent.yaml]
tokens: 85
generated: true
---
# EF-3 (intent only)

Every non-projection effect is applied only through the handler registered for its type; an effect with no handler fails closed with NoEffectHandler and writes nothing, never a silent drop or a direct table write.

- Work: LIF-613

Generated from `docs/modules/sessions/intent.yaml`; edit the ledger, never this unit.
