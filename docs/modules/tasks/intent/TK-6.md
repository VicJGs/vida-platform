---
id: TK-6
kind: intent-row
module: tasks
status: active
supersedes: []
summary: "A task is complete when status is completed and completed_at is set, and reopening clears it; the completion is the task's event trigger and fires the S4 effects through the rail, idempotently, so in the app the tasks service is composed with the effect rail."
anchors: [docs/modules/tasks/intent.yaml]
tokens: 130
generated: true
---
# TK-6 (intent only)

A task is complete when status is completed and completed_at is set, and reopening clears it; the completion is the task's event trigger and fires the S4 effects through the rail, idempotently, so in the app the tasks service is composed with the effect rail.

- Proof: BR-TK-S3-1 (no test), BR-TK-S3-2 (no test), BR-TK-S3-3 (no test), BR-TK-S3-5 (no test), BR-TK-S3-6 (no test)
- Uses: sessions
- Work: LIF-450

Generated from `docs/modules/tasks/intent.yaml`; edit the ledger, never this unit.
