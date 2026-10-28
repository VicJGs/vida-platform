# PLAN (§XXVI g1) — AR-7 Increment 3: the `measurement` engine

> AR-7 ⊞4, increment 3 of 4 (`effects ✅ → capability ✅ → measurement → economy`). Profile: Add Backend Component.
> §2.1-gathered; every shape `[FACT: file:line]`. Rides increment 1 (`EFFECT_TYPE` push side). Owning ADR: ADR-011.

## §1. Scope — a contract + pure engine, NO tables (the ADR-011 §3.8 grain)

**Is (build-now):** the universal measurability CONTRACT + pure engine — `foundation/measurement` +
`@vida/types` enums + `@vida/core` validators. **No migration** (measurement owns no tables — §3.8).

**Is NOT (deferred, cited — all homed in §6):**

- `measurement_kind`/`binding_mode` **columns on pursuable entities** — per-module, Stream ii (DB-4). [FACT: ADR-011 §3.4; ADR-002 §5.20:3797]
- **`contributions` table** — Purpose-domain (MOD-purposes), not a universal primitive. [FACT: ADR-011 §3.8:73]
- **Stored progress → nullable amendment** (`purposes.progress` etc.) — per-entity, per-module. [FACT: ADR-011 §3.2:48]
- **measurement-source registry RUNTIME** (real sources: Finance `net_worth`, Habits `streak`, …) — built with those modules (first-consumer-pull). [FACT: ADR-011 §3.6/§3.8:76]
- **Per-kind non-linear curves · qualitative status-ladder→value UI · `derive()` hash · DAG traversal perf-envelope** — build-phase. [FACT: ADR-011 §3.8:76, §3.7:68]
- **Multi-condition / user-authored automation** — ⚠ INTENDED-later. [FACT: ADR-011 §3.8:76]

**Baseline (live floor):** `foundation/measurement/` = CLAUDE.md stub only (grep clean); no `MEASUREMENT_KIND`/
`BINDING_MODE` enum; the effect rail already ships `emit_measurement_signal`/`contribute_purpose_metric` (increment 1)
— measurement's `event-trigger` push rides those, **no new engine** [FACT: ADR-011 §3.5:62]. Pattern precedents:
enums = DB-9 `as const` tuple + z.enum; empty-registry seam = `views/provider-registry.ts` (AR-6); pure-engine = `views/engine.ts`.

## §2. Business rules

- **BR-1 (measurement_kind — §3.1).** Four kinds `{quantitative·milestone·rate·qualitative}`, each normalizing to
  `[0,1]`: quantitative = direction-aware `clamp((current−baseline)/(target−baseline))` (uses `is_higher_better`);
  milestone = `done?1:0` or `n_done/n`; rate = completion-rate/streak-vs-goal; qualitative = `rating/scale_max`. [FACT: ADR-011 §3.1:37-42]
- **BR-2 (qualitative-unmeasured — §3.1).** A `qualitative` measurable with **no scale set** is **`null` (unmeasured)**,
  **never coerced to 0** — an un-rated goal cannot drag a parent down. [FACT: ADR-011 §3.1:44]
- **BR-3 (fractal rollup — §3.3).** `progress = Σ(child.progress × weight) / Σ weight`; a `NULL`/`0` weight ⇒
  **equal-weight** (`1/n`); weights need not sum to 100. `null`-progress children are excluded from the rollup (BR-2). [FACT: ADR-011 §3.3:50]
- **BR-4 (derive-by-default — §3.2).** Progress is **derived-on-read**; a stored value is an **override** (`NULL ⇒ derive`).
  The engine computes; it never stores a counter. [FACT: ADR-011 §3.2:48]
- **BR-5 (binding_mode — §3.5).** Three modes `{manual·derived-pull·event-trigger}`. `event-trigger` fires an
  existing rail effect (increment 1), **no new engine**. [FACT: ADR-011 §3.5:59-62]
- **BR-6 (measurement-source read seam — §3.6).** A read contract (advertise + query), **no direct table access**
  (INT-1). Ships the **interface + empty registry**; real sources deferred. A source outage → last-known + flag. [FACT: ADR-011 §3.6:66]
- **BR-7 (DAG guard — §3.7).** Bindings are acyclic; a cycle (counting both `derived-pull` and `event-trigger`
  edges) is rejected with a typed error. Ships the guard mechanism (`assertAcyclic(Binding[])`, DFS) + the `Binding`
  TYPE (so economy's rule-conditions + consequence-cycle edges compose into this guard, ADR-012 extends §3.7); the
  perf-envelope + binding storage are build-phase/DB-4. [FACT: ADR-011 §3.7:68; ADR-012 §3.5 extends §3.7]
- **BR-8 (progress() contract — §3.4).** A `Pursuable` declares its `measurement_kind` + computes `progress(): [0,1]`.
  The substrate OWNS the contract (a TS interface); Purpose consumes it. [FACT: ADR-011 §3.4:57]

## §3. Contract (shapes — cited)

### 3.1 `@vida/types` enums + validators

- `MEASUREMENT_KIND = ['quantitative','milestone','rate','qualitative'] as const` · `BINDING_MODE = ['manual','derived-pull','event-trigger'] as const` (+ derived types). z.enum validators in `core/validators`. **No enum-parity row** (no scalar CHECK column — measurement owns no tables).

### 3.2 The engine — `foundation/measurement/engine.ts` (pure functions)

- `normalize(kind, inputs): number | null` — per BR-1/BR-2. Inputs a discriminated union per kind
  (`{kind:'quantitative', current, baseline, target, isHigherBetter}` · `{kind:'milestone', done}|{nDone,n}` ·
  `{kind:'rate', value}` · `{kind:'qualitative', rating?, scaleMax?}`). Basic normalization only (curves deferred).
- `rollup(children: { progress: number | null; weight?: number | null }[]): number | null` — BR-3: exclude
  `null`-progress children; `NULL`/`0` weight ⇒ equal; `Σ(p×w)/Σw`; **empty/all-null set ⇒ `null`** (unmeasured,
  consistent with BR-2 — an all-unmeasured parent is not "measured at 0").
- `resolveProgress(stored: number | null, derive: () => number | null): number | null` — BR-4 (NULL ⇒ derive).

### 3.3 Contracts + seam — `foundation/measurement/types.ts` + `source-registry.ts`

- `Pursuable` interface (`measurement_kind` + `progress()`), `MeasurementKind`/`BindingMode` re-exports.
- **`Binding` type** (F2 — owned now so economy's `rules` condition reuses it, not re-invents): `interface EntityRef
{ type: string; id: string }` · `interface Binding { mode: BindingMode; source: EntityRef; target: EntityRef }`.
  The binding **TYPE is contract (owned here)**; binding **STORAGE** (columns on pursuable entities) defers to DB-4.
- `MeasurementSourceRegistry` (advertise/query; empty seam, `views/provider-registry` shape) — BR-6.
- `assertAcyclic(bindings: Binding[]): void` (derives the edge set from source→target internally, both mode
  edge-types; DFS; typed `MeasurementCycle` error) — BR-7. Economy's `consequence→source→condition` edges compose
  into this same guard (ADR-012 extends §3.7), not a parallel one.
- Typed errors: `MeasurementCycle · UnknownMeasurementKind` (as needed).
- Barrels: `foundation/measurement/index.ts`, `@vida/core`; `@vida/types` += measurement enums.

## §4. Acceptance

1. `MEASUREMENT_KIND` + `BINDING_MODE` tuples + z.enum validators; root typecheck 10/10; `@vida/core` typecheck 0. **No migration** (assert none added; runner unchanged at 5).
2. Tests (`__tests__/measurement.test.ts`): normalize each kind (incl. quantitative direction, milestone n/m, qualitative-unmeasured→null BR-2); rollup (equal-weight default, weighted, null-exclusion, empty); resolveProgress NULL⇒derive; assertAcyclic accepts a DAG + rejects a cycle (both edge types).
3. `@vida/core` suite green; existing suites unbroken.
4. Pure engine (no DB writes, no tables); every shape cited; deferrals homed (§6).

## §5. Implementation Prompt (→ IMPL-PLAN at gate 2)

`@vida/types` measurement enums (+barrel) → `core/validators` z.enums → `foundation/measurement/types.ts`
(Pursuable, errors) → `engine.ts` (normalize/rollup/resolveProgress) → `source-registry.ts` (empty seam) +
`assertAcyclic` → `index.ts` barrels + `@vida/core` → `__tests__/measurement.test.ts` → typecheck + tests.
Then §XXIX Currency → `docs/core/measurement/current-*` + layer-doc.

## §6. Deferral-homing check (Phase-3 discipline — every deferral has an issue home)

| Deferred                                                                    | Home                                                                                    | Basis                                                                                           |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `measurement_kind`/`binding_mode` columns · nullable-progress amendment     | pursuable **MOD-\*** (tasks #37·habits #38·purposes #46·…) via **DB-4 #10** (Stream ii) | first-consumer-pull; ADR-011 §3.4                                                               |
| `contributions` table                                                       | **MOD-purposes #46** (Purpose-domain)                                                   | ADR-011 §3.8:73                                                                                 |
| measurement-source registry runtime (real sources)                          | the source **MOD-\*** (finance/habits/health/projects) at their build                   | first-consumer-pull; §3.6                                                                       |
| non-linear curves · qualitative UI · DAG perf-envelope                      | **build-phase** within the consuming module builds                                      | §3.8:76 / §3.7:68                                                                               |
| **multi-condition** automation (the `IF cond AND cond THEN` rule mechanism) | **ADR-012 `rules`** — the **economy increment (next)** / §5.20:3780                     | ADR-012 §3.5 (condition = an ADR-011 binding); rules are **headless, not render-Blocks** (§3.9) |
| the **user-authored/sandbox** wrapping any such rule runs under             | **#85 CAP-authoring** (ADR-010 surface)                                                 | ADR-012 §3.9 (reuse the sandbox, not the render model)                                          |
