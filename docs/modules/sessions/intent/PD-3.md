---
id: PD-3
kind: intent-row
module: sessions
status: active
supersedes: []
summary: "Interval durations are Preferences-owned and the runtime only obeys them; named focus templates are focus-session presets owned by Sessions, with at most one default."
anchors: [docs/modules/sessions/intent.yaml, packages/core/src/services/sessions/__tests__/sessions-service.test.ts]
tokens: 100
generated: true
---
# PD-3 (partly tested)

Interval durations are Preferences-owned and the runtime only obeys them; named focus templates are focus-session presets owned by Sessions, with at most one default.

- Proof: BR-24 (no test), BR-29 (no test), BR-30 (no test), PD-3 (tested by name)
- Uses: preferences
- Work: LIF-433

Generated from `docs/modules/sessions/intent.yaml`; edit the ledger, never this unit.
