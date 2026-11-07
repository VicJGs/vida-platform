---
id: TK-7
kind: intent-row
module: tasks
status: active
supersedes: []
summary: "Only an obligation recurs; completing an obligation with a recurrence rule spawns exactly one next occurrence with the next due_date, even after a reopen and re-complete, and standard tasks never recur."
anchors: [docs/modules/tasks/intent.yaml, packages/core/src/services/tasks/__tests__/service.test.ts]
tokens: 117
generated: true
---
# TK-7 (partly tested)

Only an obligation recurs; completing an obligation with a recurrence rule spawns exactly one next occurrence with the next due_date, even after a reopen and re-complete, and standard tasks never recur.

- Proof: BR-TK-S5-1 (no test), BR-TK-S5-2 (no test), BR-TK-S5-3 (tested), BR-TK-S5-4 (no test), BR-TK-S5-5 (no test), BR-TK-S5-6 (no test)
- Work: LIF-470

Generated from `docs/modules/tasks/intent.yaml`; edit the ledger, never this unit.
