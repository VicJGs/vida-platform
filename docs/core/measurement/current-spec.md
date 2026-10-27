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

## Ratified

- **2026-09-18 · xs-measurement-engine #33 (LIF-173) — FULL RATIFY, no code change.** The AR-7 Increment-3
  substrate was confirmed to satisfy all 15 in-issue legs of `decomposition.md:46` (XCU-01,02,03,04,05,06,08,09,
  10,11,13,14,15,17,SP-33); independently adversarially verified; 12 tests green + typecheck clean. Proof set:
  `docs/features/measurement/delivery/{interpretation,reconciliation,slice-map}.md`.
- _Downstream now available_ (navigational — ownership boundary unchanged, §3.8 no tables): the per-module
  `measurement_kind`/`binding_mode`/metric columns landed in **DB-4** (`db/schema/*`), and the `event-trigger`
  push side rides the **#31/#32 effect rail** (`emit_measurement_signal`/`contribute_purpose_metric` live).
