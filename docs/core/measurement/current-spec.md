# foundation/measurement — Current Spec

> Durable contract for the measurability engine (AR-7 Increment 3). Owning ADR: ADR-011.
> Kept current with `packages/core/src/foundation/measurement/`. **No tables, no migration** (§3.8).

## What it is
The universal measurability CONTRACT + pure engine — the `progress()`/rollup machinery every pursuable entity and
Purpose's `contributions` feed later. Rides increment-1's rail for the `event-trigger` push side. Owns no storage.

## Surface (`@vida/core`, `@vida/types`)
- **Enums:** `MEASUREMENT_KIND {quantitative·milestone·rate·qualitative}` · `BINDING_MODE {manual·derived-pull·event-trigger}` (@vida/types) + z.enum validators. No enum-parity row (no scalar CHECK — no tables).
- **Engine (pure, `engine.ts`):** `normalize(NormalizeInput): number|null` (per-kind, BR-1/BR-2) · `rollup(children): number|null` (BR-3) · `resolveProgress(stored, derive): number|null` (BR-4) · `assertAcyclic(Binding[]): void` (BR-7, throws `MeasurementCycle`).
- **Contracts (`types.ts`):** `Pursuable` (measurement_kind + progress()) · `Binding {mode, source, target}` + `EntityRef` (owned here; economy reuses) · `NormalizeInput` discriminated union.
- **Read seam (`source-registry.ts`):** `MeasurementSourceRegistry` (advertise/query/has) — empty; unadvertised key ⇒ null.

## Tests
`foundation/measurement/__tests__/measurement.test.ts` (12) — normalize per kind, rollup (equal/weighted/null-exclusion/all-null→null), resolveProgress, assertAcyclic DAG+cycle, source seam.

## Deferred
See current-business-rules.md § Deferred (all homed).
