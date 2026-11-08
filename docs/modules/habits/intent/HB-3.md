---
id: HB-3
kind: intent-row
module: habits
status: active
supersedes: []
summary: "A habit has at most one completion per date; logging a date already logged updates that row, never adds a second."
anchors: [docs/modules/habits/intent.yaml, packages/core/src/services/habits/__tests__/habits-service.test.ts]
tokens: 67
generated: true
---
# HB-3 (tested)

A habit has at most one completion per date; logging a date already logged updates that row, never adds a second.

- Proof: BR-HB-10 (no test), HB-3 (tested by name)

Generated from `docs/modules/habits/intent.yaml`; edit the ledger, never this unit.
