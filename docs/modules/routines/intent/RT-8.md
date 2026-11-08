---
id: RT-8
kind: intent-row
module: routines
status: active
supersedes: []
summary: "A pre-planned skip (the step's skip_dates) and a skip logged on the day (a completion row with its reason) are distinct; a planned skip is neutral, and a logged skip counts as the miss policy says."
anchors: [docs/modules/routines/intent.yaml, packages/core/src/services/routines/__tests__/routines-service.test.ts]
tokens: 89
generated: true
---
# RT-8 (tested)

A pre-planned skip (the step's skip_dates) and a skip logged on the day (a completion row with its reason) are distinct; a planned skip is neutral, and a logged skip counts as the miss policy says.

- Proof: BR-RT-S3-3 (no test), RT-8 (tested by name)

Generated from `docs/modules/routines/intent.yaml`; edit the ledger, never this unit.
