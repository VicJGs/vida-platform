---
id: EF-4
kind: intent-row
module: sessions
status: active
supersedes: []
summary: "The registry binds each effect type to exactly one handler, and registering a second one throws DuplicateEffectHandler instead of overriding it."
anchors: [docs/modules/sessions/intent.yaml, packages/core/src/foundation/effects/__tests__/effects.test.ts]
tokens: 71
generated: true
---
# EF-4 (tested)

The registry binds each effect type to exactly one handler, and registering a second one throws DuplicateEffectHandler instead of overriding it.

- Proof: EF-4 (tested by name)

Generated from `docs/modules/sessions/intent.yaml`; edit the ledger, never this unit.
