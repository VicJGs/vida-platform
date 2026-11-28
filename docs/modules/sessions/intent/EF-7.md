---
id: EF-7
kind: intent-row
module: sessions
status: active
supersedes: []
summary: "The applied_effects ledger is device-local; it carries no sync columns and never enters the sync queue, so it guards replay on one device and cross-device convergence rides the output rows (EF-12)."
anchors: [docs/modules/sessions/intent.yaml, packages/core/src/foundation/effects/__tests__/effects.test.ts]
tokens: 87
generated: true
---
# EF-7 (tested)

The applied_effects ledger is device-local; it carries no sync columns and never enters the sync queue, so it guards replay on one device and cross-device convergence rides the output rows (EF-12).

- Proof: EF-7 (tested by name)
- Uses: sync

Generated from `docs/modules/sessions/intent.yaml`; edit the ledger, never this unit.
