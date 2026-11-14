---
id: EF-9
kind: intent-row
module: sessions
status: active
supersedes: []
summary: "The fire-time consent gate rejects a non-projection effect aimed at a sensitive module (Finance, Health) that the caller's consented set lacks, with EffectConsentMissing and no write; the caller supplies the consented set and the module class, never inferred, and producers never call it."
anchors: [docs/modules/sessions/intent.yaml]
tokens: 110
generated: true
---
# EF-9 (intent only)

The fire-time consent gate rejects a non-projection effect aimed at a sensitive module (Finance, Health) that the caller's consented set lacks, with EffectConsentMissing and no write; the caller supplies the consented set and the module class, never inferred, and producers never call it.

- Uses: finance, health
- Work: LIF-613

Generated from `docs/modules/sessions/intent.yaml`; edit the ledger, never this unit.
