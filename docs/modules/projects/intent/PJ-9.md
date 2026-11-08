---
id: PJ-9
kind: intent-row
module: projects
status: active
supersedes: []
summary: "Deleting a project removes its milestones, their deliverables and its documents; deleting a milestone removes its deliverables, moves its sub-milestones to the top level and keeps its documents under the project; a soft delete hides the row and still syncs. What happens to the tasks is PJ-14."
anchors: [docs/modules/projects/intent.yaml, packages/core/src/services/projects/__tests__/service.test.ts]
tokens: 130
generated: true
---
# PJ-9 (tested)

Deleting a project removes its milestones, their deliverables and its documents; deleting a milestone removes its deliverables, moves its sub-milestones to the top level and keeps its documents under the project; a soft delete hides the row and still syncs. What happens to the tasks is PJ-14.

- Proof: BR-PJ-S1-6 (no test), BR-PJ-S2-5 (no test), BR-PJ-S3-5 (no test), BR-PJ-S5-4 (no test), PJ-9 (tested by name)

Generated from `docs/modules/projects/intent.yaml`; edit the ledger, never this unit.
