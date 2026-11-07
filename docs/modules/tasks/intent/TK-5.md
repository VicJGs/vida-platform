---
id: TK-5
kind: intent-row
module: tasks
status: active
supersedes: []
summary: "Time is one ledger; actual_minutes is the sum of the task's task_time_logs, written only by the log_time effect of the work session the timer opens, never a direct client write, and a task may opt out of time tracking (no logs, no rollup)."
anchors: [docs/modules/tasks/intent.yaml]
tokens: 119
generated: true
---
# TK-5 (intent only)

Time is one ledger; actual_minutes is the sum of the task's task_time_logs, written only by the log_time effect of the work session the timer opens, never a direct client write, and a task may opt out of time tracking (no logs, no rollup).

- Proof: BR-TK-S4-1 (no test), BR-TK-S4-2 (no test), BR-TK-S4-3 (no test), BR-TK-S4-4 (no test)
- Uses: sessions
- Work: LIF-469

Generated from `docs/modules/tasks/intent.yaml`; edit the ledger, never this unit.
