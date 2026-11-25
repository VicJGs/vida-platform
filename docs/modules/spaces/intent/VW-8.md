---
id: VW-8
kind: intent-row
module: spaces
status: active
supersedes: []
summary: "A view's filter follows one grammar (ADR-007 §3.6) whose tags every provider applies the same way (nested, any, all, none), each provider advertises the fields, operators and roles it supports (§3.7), and a condition a provider can't apply is ignored for that type and named in degraded, never dropping the type, unless the view opts to exclude it."
anchors: [docs/modules/spaces/intent.yaml, packages/core/src/foundation/views/__tests__/filter-grammar.test.ts]
tokens: 127
generated: true
---
# VW-8 (partly tested)

A view's filter follows one grammar (ADR-007 §3.6) whose tags every provider applies the same way (nested, any, all, none), each provider advertises the fields, operators and roles it supports (§3.7), and a condition a provider can't apply is ignored for that type and named in degraded, never dropping the type, unless the view opts to exclude it.

- Proof: VW-8 (tested by name)
- Work: LIF-358

Generated from `docs/modules/spaces/intent.yaml`; edit the ledger, never this unit.
