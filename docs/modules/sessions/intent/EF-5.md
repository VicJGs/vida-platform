---
id: EF-5
kind: intent-row
module: sessions
status: active
supersedes: []
summary: "Every effect type in the catalogue has exactly one class (keyed, additive, projection or intra-realm), enforced at compile time, and the catalogue is ADR-004's base types plus ADR-012's four economy and notification types. contribute_purpose_metric is retired, because no module pushes progress into Purposes, which reads each related entity through that entity's service and computes the day's progress (PG-37); the type leaves the enum, the database check and the class map, and its emits go from Tasks, Habits and Routines."
anchors: [docs/modules/sessions/intent.yaml]
tokens: 164
generated: true
---
# EF-5 (intent only)

Every effect type in the catalogue has exactly one class (keyed, additive, projection or intra-realm), enforced at compile time, and the catalogue is ADR-004's base types plus ADR-012's four economy and notification types. contribute_purpose_metric is retired, because no module pushes progress into Purposes, which reads each related entity through that entity's service and computes the day's progress (PG-37); the type leaves the enum, the database check and the class map, and its emits go from Tasks, Habits and Routines.

- Work: LIF-521

Generated from `docs/modules/sessions/intent.yaml`; edit the ledger, never this unit.
