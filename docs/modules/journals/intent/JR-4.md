---
id: JR-4
kind: intent-row
module: journals
status: active
supersedes: []
summary: "The user picks, per module and per data point, what the journal shows; each contribution advertises its data points, the selection filters the summary, and a per-journal override in summary_config, generalized from the five fixed toggles to a per-module selection, wins over the global default."
anchors: [docs/modules/journals/intent.yaml, packages/core/src/services/journals/__tests__/dashboard.test.ts]
tokens: 121
generated: true
---
# JR-4 (partly tested)

The user picks, per module and per data point, what the journal shows; each contribution advertises its data points, the selection filters the summary, and a per-journal override in summary_config, generalized from the five fixed toggles to a per-module selection, wins over the global default.

- Proof: BR-S2-3 (tested), BR-S2-4 (tested)
- Uses: notes
- Work: LIF-407

Generated from `docs/modules/journals/intent.yaml`; edit the ledger, never this unit.
