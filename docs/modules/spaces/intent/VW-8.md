---
id: VW-8
kind: intent-row
module: spaces
status: active
supersedes: []
summary: "A view's filter follows one grammar (ADR-007 §3.6) whose tags every provider applies the same way (nested, any, all, none), each provider advertises the fields, operators and roles it supports (§3.7), and a condition a provider can't apply is ignored for that type and named in degraded, never dropping the type, unless the view opts to exclude it."
anchors: [docs/modules/spaces/intent.yaml]
tokens: 119
generated: true
---
# VW-8 (intent only)

A view's filter follows one grammar (ADR-007 §3.6) whose tags every provider applies the same way (nested, any, all, none), each provider advertises the fields, operators and roles it supports (§3.7), and a condition a provider can't apply is ignored for that type and named in degraded, never dropping the type, unless the view opts to exclude it.

- Work: LIF-358

Generated from `docs/modules/spaces/intent.yaml`; edit the ledger, never this unit.
