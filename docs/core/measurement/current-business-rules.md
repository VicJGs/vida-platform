# foundation/measurement — Current Business Rules

> Durable invariants for the measurability engine (AR-7 Increment 3). Owning ADR: ADR-011.
> Kept current with `packages/core/src/foundation/measurement/`. Contract + pure engine — NO tables (§3.8).

- **BR-1 (measurement_kind — §3.1).** Four kinds normalize to `[0,1]`: quantitative = direction-aware
  `clamp` over `(current,baseline,target,isHigherBetter)`; milestone = `done?1:0` or `nDone/n`; rate = clamped ratio;
  qualitative = `rating/scaleMax`.
- **BR-2 (qualitative-unmeasured — §3.1:44).** No scale (or no rating) ⇒ **`null` (unmeasured)**, never `0`.
- **BR-3 (fractal rollup — §3.3).** `Σ(child×w)/Σw`; NULL/0 weight ⇒ equal-weight (1/n); **null-progress children
  excluded**; empty/all-null set ⇒ **`null`** (an all-unmeasured parent is not measured-at-0).
- **BR-4 (derive-by-default — §3.2).** Progress is derived-on-read; a stored value is an override (`NULL ⇒ derive`). Never a stored counter.
- **BR-5 (binding_mode — §3.5).** `{manual·derived-pull·event-trigger}`; event-trigger fires an existing rail effect (increment 1) — no new engine.
- **BR-6 (source read seam — §3.6).** advertise + query, no direct table access (INT-1). Empty seam; an unadvertised key ⇒ `null`, never fabricated. Real sources deferred.
- **BR-7 (DAG guard — §3.7).** `assertAcyclic(Binding[])` rejects a cycle (both mode edge-types) with `MeasurementCycle`. The `Binding` type is contract (economy's rule-conditions + consequence-cycle edges reuse it). Perf-envelope + binding storage deferred.
- **BR-8 (progress() contract — §3.4).** A `Pursuable` declares `measurement_kind` + computes `progress()`. The substrate owns the contract; Purpose consumes it.

## Deferred (not in this increment — all homed, DF-12 + §6)

`measurement_kind`/`binding_mode` columns + nullable-progress → per-module (DB-4 Stream ii). `contributions` →
MOD-purposes. Real measurement sources → source modules (first-consumer-pull). Non-linear curves · qualitative UI ·
DAG perf-envelope → build-phase. Multi-condition automation → **ADR-012 `rules` (economy increment)**; its
user-authored/sandbox wrapping → #85 CAP-authoring.
