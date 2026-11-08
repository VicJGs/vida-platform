---
id: HB-1
kind: intent-row
module: habits
status: active
supersedes: []
summary: "A habit's name, description, unit, cue, reward and success_criteria and a completion's location are encrypted client-side [E]; habit_type, frequency, days_of_week, domain, time_of_day and the counters are plaintext config, and tags are entity_tags rows, not an inline column. M1 is a pass-through."
anchors: [docs/modules/habits/intent.yaml]
tokens: 110
generated: true
---
# HB-1 (intent only)

A habit's name, description, unit, cue, reward and success_criteria and a completion's location are encrypted client-side [E]; habit_type, frequency, days_of_week, domain, time_of_day and the counters are plaintext config, and tags are entity_tags rows, not an inline column. M1 is a pass-through.

- Uses: encryption
- Work: LIF-67

Generated from `docs/modules/habits/intent.yaml`; edit the ledger, never this unit.
