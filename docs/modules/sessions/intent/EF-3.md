---
id: EF-3
kind: intent-row
module: sessions
status: active
supersedes: []
summary: "Every non-projection effect is applied only through the handler registered for its type; an effect with no handler fails closed with NoEffectHandler and writes nothing, never a silent drop or a direct table write."
anchors: [docs/modules/sessions/intent.yaml, packages/core/src/foundation/effects/__tests__/effects.test.ts]
tokens: 88
generated: true
---
# EF-3 (tested)

Every non-projection effect is applied only through the handler registered for its type; an effect with no handler fails closed with NoEffectHandler and writes nothing, never a silent drop or a direct table write.

- Proof: EF-3 (tested by name)

Generated from `docs/modules/sessions/intent.yaml`; edit the ledger, never this unit.
