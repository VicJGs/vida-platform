---
id: RT-1
kind: intent-row
module: routines
status: active
supersedes: []
summary: "A routine's name and description, a step's title and description and a completion's skip_reason are encrypted client-side [E]; lifecycle, the recurrence rule, step type and order, time_of_day, skip_dates and dates are plaintext config. M1 is a pass-through."
anchors: [docs/modules/routines/intent.yaml]
tokens: 101
generated: true
---
# RT-1 (intent only)

A routine's name and description, a step's title and description and a completion's skip_reason are encrypted client-side [E]; lifecycle, the recurrence rule, step type and order, time_of_day, skip_dates and dates are plaintext config. M1 is a pass-through.

- Uses: encryption
- Work: LIF-67

Generated from `docs/modules/routines/intent.yaml`; edit the ledger, never this unit.
