---
id: TK-2
kind: intent-row
module: tasks
status: active
supersedes: []
summary: "A task sets at most one of project_id, milestone_id, course_id and contact_id, and a milestone implies its project; two parent FKs are a typed MultipleParentError, and a task with none is a first-class standalone task."
anchors: [docs/modules/tasks/intent.yaml]
tokens: 89
generated: true
---
# TK-2 (intent only)

A task sets at most one of project_id, milestone_id, course_id and contact_id, and a milestone implies its project; two parent FKs are a typed MultipleParentError, and a task with none is a first-class standalone task.

- Proof: BR-TK-S1-1 (no test)

Generated from `docs/modules/tasks/intent.yaml`; edit the ledger, never this unit.
