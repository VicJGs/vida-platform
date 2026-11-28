---
id: EF-9
kind: intent-row
module: sessions
status: active
supersedes: []
summary: "The fire-time consent gate rejects a non-projection effect aimed at a sensitive module (Finance, Health) that the caller's consented set lacks, with EffectConsentMissing and no write; the caller supplies the consented set and the module class, never inferred, and producers never call it."
anchors: [docs/modules/sessions/intent.yaml, packages/core/src/foundation/effects/__tests__/gate.test.ts]
tokens: 113
generated: true
---
# EF-9 (tested)

The fire-time consent gate rejects a non-projection effect aimed at a sensitive module (Finance, Health) that the caller's consented set lacks, with EffectConsentMissing and no write; the caller supplies the consented set and the module class, never inferred, and producers never call it.

- Proof: EF-9 (tested by name)
- Uses: finance, health

Generated from `docs/modules/sessions/intent.yaml`; edit the ledger, never this unit.
