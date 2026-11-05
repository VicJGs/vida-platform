---
id: SS-9
kind: intent-row
module: sessions
status: active
supersedes: []
summary: "Availability windows and exceptions are Planner-owned scheduling input; Routines may preset recurring windows, and attended sessions consume availability while planned ones fill it."
anchors: [docs/modules/sessions/intent.yaml, packages/core/src/services/sessions/__tests__/sessions-service.test.ts]
tokens: 103
generated: true
---
# SS-9 (partly tested)

Availability windows and exceptions are Planner-owned scheduling input; Routines may preset recurring windows, and attended sessions consume availability while planned ones fill it.

- Proof: BR-26 (no test), BR-27 (no test), BR-28 (no test), SS-9 (tested by name)
- Uses: routines
- Work: LIF-442

Generated from `docs/modules/sessions/intent.yaml`; edit the ledger, never this unit.
