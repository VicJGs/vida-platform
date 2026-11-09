---
id: RL-5
kind: intent-row
module: relationships
status: active
supersedes: []
summary: "Relationship health is derived on read and never stored; it comes from the time since the last interaction against the cadence and the recent sentiment, weighted by closeness (inner tiers penalize neglect more), banded Healthy, At-risk or Overdue, new for a contact with no interactions, and a network's health aggregates its members. It is a derived analytic, never an ADR-011 pursuable or a measurement source."
anchors: [docs/modules/relationships/intent.yaml]
tokens: 156
generated: true
---
# RL-5 (intent only)

Relationship health is derived on read and never stored; it comes from the time since the last interaction against the cadence and the recent sentiment, weighted by closeness (inner tiers penalize neglect more), banded Healthy, At-risk or Overdue, new for a contact with no interactions, and a network's health aggregates its members. It is a derived analytic, never an ADR-011 pursuable or a measurement source.

- Proof: BR-RL-S6-1 (no test), BR-RL-S6-2 (no test), BR-RL-S6-3 (no test), BR-RL-S6-4 (no test)

Generated from `docs/modules/relationships/intent.yaml`; edit the ledger, never this unit.
