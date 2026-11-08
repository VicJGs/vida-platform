---
id: PJ-3
kind: intent-row
module: projects
status: active
supersedes: []
summary: "Progress is derived bottom-up on read (task, deliverable, milestone, project); the stored progress is a nullable manual override that wins when set, children weigh by their nesting_weight (empty means equal), an unmeasured child is left out and flags the rollup partial, and an all-unmeasured set is null, never 0. The project to purpose step is weighted by the contribution percentage, not by counting."
anchors: [docs/modules/projects/intent.yaml, packages/core/src/services/projects/__tests__/service.test.ts]
tokens: 181
generated: true
---
# PJ-3 (tested)

Progress is derived bottom-up on read (task, deliverable, milestone, project); the stored progress is a nullable manual override that wins when set, children weigh by their nesting_weight (empty means equal), an unmeasured child is left out and flags the rollup partial, and an all-unmeasured set is null, never 0. The project to purpose step is weighted by the contribution percentage, not by counting.

- Proof: BR-PJ-S1-2 (no test), BR-PJ-S2-6 (no test), BR-PJ-S4-1 (no test), BR-PJ-S4-2 (no test), BR-PJ-S4-3 (no test), BR-PJ-S4-4 (no test), BR-PJ-S4-5 (no test), PJ-3 (tested by name)
- Uses: measurement, purposes

Generated from `docs/modules/projects/intent.yaml`; edit the ledger, never this unit.
