# foundation/measurement — substrate (ADR-011)
# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this substrate is
Universal measurability (measurement_kind x binding_mode, nullable NULL=>derive) + contributions weighted polymorphic rollup

## Owning ADR
ADR-011

## Capabilities (framework §3)
M1 M2 M3 M4 M5 M7

## Status
Built by AR-7 Increment 3 (2026-08-03). Contract + pure engine, **NO tables** (§3.8): `MEASUREMENT_KIND` +
`BINDING_MODE` enums · `engine.ts` (normalize/rollup/resolveProgress/assertAcyclic) · `types.ts` (Pursuable, Binding,
NormalizeInput, MeasurementCycle) · `source-registry.ts` (empty read seam). Currency: `docs/core/measurement/current-*`.
Deferred (all homed, DF-12): kind/mode columns → DB-4/MOD-*; contributions → MOD-purposes; real sources →
source modules; curves/UI → build-phase; multi-condition automation → ADR-012 rules (economy). No migration added.
