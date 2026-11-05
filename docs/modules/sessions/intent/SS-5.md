---
id: SS-5
kind: intent-row
module: sessions
status: active
supersedes: []
summary: "A user-created type may attach to any entity and declare effects only inside its permission envelope, and sensitive-module effects (Finance, Health) need explicit opt-in consent."
anchors: [docs/modules/sessions/intent.yaml, packages/core/src/foundation/sessions/__tests__/registry.test.ts]
tokens: 93
generated: true
---
# SS-5 (partly tested)

A user-created type may attach to any entity and declare effects only inside its permission envelope, and sensitive-module effects (Finance, Health) need explicit opt-in consent.

- Proof: BR-4 (tested), BR-6 (no test), BR-12 (no test)
- Uses: finance, health

Generated from `docs/modules/sessions/intent.yaml`; edit the ledger, never this unit.
