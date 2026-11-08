---
id: PJ-2
kind: intent-row
module: projects
status: active
supersedes: []
summary: "A project has four levels, Project > Milestone > Deliverable > Task; a milestone belongs to one project and nests under a milestone of the same project with no cycle, a deliverable sits under exactly one milestone, and a task sits under the project, a milestone or a deliverable through the Tasks parent links (the deliverable link is PJ-13; every milestone has a deliverable, PJ-35)."
anchors: [docs/modules/projects/intent.yaml]
tokens: 153
generated: true
---
# PJ-2 (intent only)

A project has four levels, Project > Milestone > Deliverable > Task; a milestone belongs to one project and nests under a milestone of the same project with no cycle, a deliverable sits under exactly one milestone, and a task sits under the project, a milestone or a deliverable through the Tasks parent links (the deliverable link is PJ-13; every milestone has a deliverable, PJ-35).

- Proof: BR-PJ-S2-1 (no test), BR-PJ-S2-2 (no test), BR-PJ-S2-3 (no test), BR-PJ-S3-1 (no test)
- Uses: tasks, TK-2

Generated from `docs/modules/projects/intent.yaml`; edit the ledger, never this unit.
