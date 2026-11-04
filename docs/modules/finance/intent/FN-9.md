---
id: FN-9
kind: intent-row
module: finance
status: active
supersedes: []
summary: "External ingestion is device-only under ADR-014 (X1/X5/X8); imports reconcile through import_staging and commit only on user confirm."
anchors: [docs/modules/finance/intent.yaml, packages/core/src/services/finance/__tests__/finance-service.test.ts]
tokens: 99
generated: true
---
# FN-9 (partly tested)

External ingestion is device-only under ADR-014 (X1/X5/X8); imports reconcile through import_staging and commit only on user confirm.

- Proof: BR-S5-4 (no test), BR-S5-5 (tested)
- Work: LIF-143
- Open: The third-party aggregator path (a documented ZK dent) needs its own decision.

Generated from `docs/modules/finance/intent.yaml`; edit the ledger, never this unit.
