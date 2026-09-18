# Interpretation — xs-measurement-engine #33 (LIF-173)

> Entity Delivery Flow (recovery variant), Step 2. Built ON the Documentation Gate (Step 1 = SHIP + 4
> carry-forwards). Every claim is `[FACT: path:line]`, `[INTERPRETATION]`, or `[UNKNOWN]` — No-Guessing
> Principle. This is the yardstick the reconciliation (Step 5) and slice-map (Step 6) rest on.
>
> **Scope (authoritative):** `decomposition.md:46` — XCU-01, 02, 03, 04, 05, 06, 08, 09, 10, 11, 13, 14,
> 15, 17, and XCU-SP-33. The task-file goal prose "XCU-01…17" is loose; the decomposition roster governs
> (carry-forward #3). Excluded (homed elsewhere): XCU-07 (source modules), XCU-12 (MOD-purposes), XCU-16
> (DB-4/build), XCU-18 (economy `rules`/#85), XCU-19 (build-phase curve design-pass), XCU-20 (review-trigger).

---

## A. DEPENDENCIES — what #33 rests on (all built upstream)

- **D1 — The pure engine already exists (AR-7 Increment 3).** `normalize`/`rollup`/`resolveProgress`/
  `assertAcyclic` are shipped + tested. [FACT: `packages/core/src/foundation/measurement/engine.ts:14,38,56,65`]
  [FACT: `packages/core/src/foundation/measurement/__tests__/measurement.test.ts:18-89` — 12 tests, all 4 kinds +
  rollup edge-cases + DAG + seam]
- **D2 — The contract types already exist.** `Pursuable`, `Binding`, `EntityRef`, `NormalizeInput`,
  `MeasurementCycle`. [FACT: `packages/core/src/foundation/measurement/types.ts:16-52`]
- **D3 — The enums + validators already exist.** `MEASUREMENT_KIND {quantitative·milestone·rate·qualitative}`,
  `BINDING_MODE {manual·derived-pull·event-trigger}` in `@vida/types`; `z.enum` validators in `@vida/core`.
  [FACT: `packages/core/src/validators/measurement.ts:1-5`]
- **D4 — The source-read seam already exists (empty).** `MeasurementSourceRegistry` (advertise/query/has);
  unadvertised key ⇒ `null`. [FACT: `packages/core/src/foundation/measurement/source-registry.ts:13-35`]
- **D5 — The effect-rail (#31/#32) is built and measurement rides it.** `createEffectRail(db, registry)`,
  `deriveEffectEventId(subjectNaturalKey, transition, effectType)`, `EffectHandler = (event, tx) => Promise<void>`,
  and the fire-time gate `assertEffectPermitted`. The three keyed effect types measurement's `event-trigger`
  binding fires **already exist**: `emit_measurement_signal`, `contribute_purpose_metric`,
  `complete_habit_occurrence`. [FACT: `packages/core/src/foundation/effects/service.ts:29,42`]
  [FACT: `packages/core/src/foundation/effects/event-id.ts:20`] [FACT: `packages/core/src/foundation/effects/types.ts:21-23,53`]
  [FACT: `packages/core/src/foundation/effects/index.ts:11` — `assertEffectPermitted` exported]
- **D6 — DB-4 already landed the per-module columns.** `measurement_kind` (NN DEFAULT 'quantitative',
  replacing v1 `target_type`), `binding_mode` (nullable, NULL⇒derive), `is_higher_better`, `baseline_value`,
  `success_criteria`, `measurement_method`, and the provenance `source{manual,auto}` axis.
  [FACT: `packages/core/src/db/schema/purposes.ts:83-91`] [FACT: 13 schema files carry `measurement_kind`/
  `binding_mode` — grep `packages/core/src/db/schema/`]. Ownership boundary holds: measurement owns NO tables
  (§3.8); these columns are per-module, consumed by the engine (carry-forward #4). [FACT: `docs/core/measurement/current-spec.md:4`]

## B. NEEDS — what #33 must deliver (genuinely-owed surface, post-ratify)

The Documentation Gate established this is a **RATIFY-dominant** recovery: D1–D6 already satisfy the bulk of
the roster. The genuinely-owed surface is narrow; the reconciliation (Step 5) confirms item-by-item.

- **N1 — RATIFY the built engine against the roster.** XCU-01 (normalize), XCU-02 (qualitative→null),
  XCU-03 (rollup), XCU-04 (resolveProgress), XCU-05 (assertAcyclic), XCU-06 (seam contract), XCU-08
  (`Pursuable.progress()` contract), XCU-11 (nesting-weight resolution rule = `rollup` reads weight, NULL⇒equal),
  XCU-13 (Binding/EntityRef types), XCU-14 (enums+validators) — each must be confirmed built + tested + doc-current,
  not assumed. [FACT: engine.ts + types.ts + validators/measurement.ts + measurement.test.ts, as D1–D4]
  - **N1a — XCU-08 is CONTRACT-only in #33.** #33 delivers the `Pursuable` contract (`measurement_kind` +
    `progress(): number|null`), which is **built**. [FACT: `types.ts:16-20`] The per-module `progress()`
    **implementations** are **downstream, NOT #33** — each pursuable module implements the contract and delegates
    the math to the engine; Purpose consumes. [FACT: xcut-measurement XCU-08 candidate-home "per-module service
    (implements contract)"; `current-business-rules.md:16` (BR-8)] Step 5 must not read XCU-08 as owing module
    impls now.
  - **N1b — XCU-05's perf-envelope tail defers legitimately (out of #33).** The `assertAcyclic` **function** is
    built + tested. [FACT: `engine.ts:65-92`; `measurement.test.ts:69-86`] Its **perf-envelope** (cached-adjacency
    vs on-write DFS materialization, UNKNOWN-2) is build-phase and **depends on binding STORAGE** — but binding
    storage is contract-only in #33 (XCU-13 = types, storage deferred). [FACT: xcut-measurement XCU-13 "binding
    STORAGE is deferred"; UNKNOWN-2 :85] So the perf-envelope **cannot** resolve in #33 and defers with cause;
    the guard runs over the author-time `Binding[]` set, which is all #33 needs. Not under-scoping.
- **N2 — XCU-10: enforce the `binding_mode` ≠ provenance `source` invariant.** `binding_mode {manual·
  derived-pull·event-trigger}` (how a measurable is fed) must never collide with a value's provenance
  `source {manual·auto}` (where a recorded value came from). [FACT: `docs/core/measurement/current-business-rules.md:13`]
  **No enforcement code found in `foundation/measurement`** — grep for validation returned empty.
  [FACT: no match in `packages/core/src/foundation/measurement/` for a binding_mode/source guard]
  → **candidate GAP** (Step 5 decides: runtime validator vs structurally-satisfied-by-two-distinct-columns).
- **N3 — XCU-09: the `event-trigger` binding→effect CONTRACT (measurement side).** A measurable with
  `binding_mode = event-trigger` sets its value by firing an **existing** rail effect; measurement owns **no
  push engine**. [FACT: `docs/core/measurement/current-business-rules.md:13`; xcut-measurement XCU-09]
  → **candidate GAP**: is a measurement-side helper (map a `Binding` to an `EffectEvent` shape) owed, or is the
  contract fully discharged by riding D5's rail directly? Step 5 decides against the built rail.
- **N4 — XCU-15: engine CONSUMPTION of the restored metric fields.** `normalize` already consumes
  `is_higher_better` + `baseline_value` for `quantitative`. [FACT: `engine.ts:16-21`] `success_criteria` /
  `measurement_method` are descriptive columns (not normalization inputs) — no engine consumption owed.
  [INTERPRETATION: normalize's discriminated input has no field for them; they are display/authoring metadata]
  → likely RATIFY (consumption already built for the fields that feed math).
- **N5 — XCU-17: the no-propagation-table CONSTRAINT.** Progress is derived-on-read; deltas come from
  Journals snapshots (JR-7/8), NOT a stored propagation/cache-invalidation table. [FACT: xcut-measurement XCU-17;
  ADR-011 §3.8 Option-C rejected] Edge `xcut-measurement:XCU-17 → MOD-journals` [FACT: `decomposition.md:92`].
  → a **guardrail** (compliant iff nothing propagation-like is built); nothing to author.
- **N6 — XCU-SP-33: the Purposes-capstone laddering seam.** Universal tags are the laddering key the Purposes
  capstone uses to roll progress UP a tag hierarchy; Spaces is the substrate, measurement/Purposes owns the
  derivation. [FACT: `xcut-spaces.md:53`; INTERPRETATION-tagged there] `xs-spaces-tags-links` is **not yet
  built** (peer head, not a #33 dependency — `decomposition.md:46` deps = `XS-effect-rail` only).
  → a **documented-seam acknowledgment** for #33, not a runtime dependency; the laddering derivation itself is
  Purposes-owned (MOD-purposes, XCU-12). Step 5 confirms nothing runtime is owed here now.

## C. ORGANIZATION — where each thing lives (ADR-011 §3.8 ownership)

- **C1 — `foundation/measurement` owns:** the pure engine (`engine.ts`), the contract types (`types.ts`), the
  seam contract (`source-registry.ts`), and the `@vida/types` enums + `@vida/core` validators. **No storage.**
  [FACT: `docs/core/measurement/current-spec.md:4`; `packages/core/src/foundation/measurement/index.ts:1-8`]
- **C2 — Per-module schema owns the columns** (`measurement_kind`/`binding_mode`/metric fields) — DB-4, built. [FACT: D6]
- **C3 — `foundation/effects` owns the push side** (rail + `effect_event_id` + handler registry). Measurement's
  `event-trigger` is a CONSUMER of it, not an owner. [FACT: D5; xcut-measurement XCU-09 candidate-home]
- **C4 — Homed downstream (out of #33):** real source providers → source modules (XCU-07); `contributions`
  CRUD + laddering weight → MOD-purposes (XCU-12); nullable-progress override columns → DB-4/build (XCU-16);
  multi-condition automation → economy `rules` (XCU-18); non-linear curves + qualitative UI → build-phase
  design-pass (XCU-19); cached snapshot → review-trigger (XCU-20). [FACT: xcut-measurement §4a flag index :42-59]

## D. IMPLICIT RULES — the non-obvious invariants any #33 change must honor

- **IR-1 — Unmeasured is `null`, never `0`.** A qualitative measurable with no scale/rating, and an
  all-null/empty rollup set, both return `null` — an un-rated goal must never silently drag a parent to 0.
  [FACT: `current-business-rules.md:9,11` (BR-2/BR-3); `engine.ts:29-31,44`]
- **IR-2 — Derive-by-default; a stored value is an OVERRIDE.** `NULL ⇒ derive`. Never trust a stored counter;
  analytics are derived-on-read (SS-12 house rule). [FACT: `current-business-rules.md:12` (BR-4); `engine.ts:56-61`]
- **IR-3 — Bindings are acyclic; BOTH edge modes count.** `derived-pull` + `event-trigger` edges both enter the
  DAG guard; a cycle throws `MeasurementCycle` at author time. Economy's rule-condition + consequence-cycle
  edges reuse the same `Binding` type and compose into this guard. [FACT: `current-business-rules.md:15` (BR-7);
  `engine.ts:63-92`; `types.ts:29-33`]
- **IR-4 — Measurement owns no push engine (U-1 RESOLVED).** The `event-trigger` write is idempotent per the
  rail's **existing** `deriveEffectEventId(subjectNaturalKey, transition, effectType)` — measurement builds **no
  new hash** and **no new write path**. [FACT: `effects/event-id.ts:20`; `effects/service.ts:42`; xcut-measurement
  XCU-09 "no new engine… owns no push engine"] Resolves Documentation-Gate carry-forward #1: the corpus's U-1
  ("own hash vs reuse effect-id") is answered by XCU-09 + the now-built #32 rail — **reuse**. [FACT: xcut-measurement
  UNKNOWN-1 :84 — resolution owner "alongside effect-rail" has now fired (#32 shipped)]
- **IR-5 — Read the seam, never the table (INT-1).** A `derived-pull` measurable reads a source only via
  `MeasurementSourceRegistry.query(key)` — no direct cross-module table access; an unadvertised key ⇒ `null`,
  never a fabricated value. [FACT: `current-business-rules.md:14` (BR-6); `source-registry.ts:27-30`]
- **IR-6 — `binding_mode` (how fed) is orthogonal to `source` (whence a value came).** The two axes never
  collide; `source` stays compatible with Health's existing provenance axis. [FACT: `current-business-rules.md:13`;
  xcut-measurement XCU-10] → the invariant N2 must preserve.
- **IR-7 — No stored propagation.** Progress is never stored-and-propagated; "what changed" is a Journals-snapshot
  read, not a measurement-owned cache/invalidation table (Option C rejected). [FACT: xcut-measurement XCU-17;
  ADR-011 §3.8]
- **IR-8 — Factory-object service shape (if any service is added).** A `@vida/core` factory service uses closure
  hoisting for intra-service calls, never `this.` (breaks on the `②` destructure-consumption shape); validating
  methods are async. [FACT: memory `factory-service-no-this-for-intra-calls`; precedent `enforcer.ts` #31]
- **IR-9 — `Repository.findWhere` skips the soft-delete filter.** Any repo read over a `deleted_at` table must
  add `isNull(deleted_at)` explicitly. [FACT: memory `repository-findwhere-skips-softdelete-filter`] — applies
  only if #33 adds a repo read; likely N/A (engine is pure, no tables).

## E. Carry-forwards discharged (from the Documentation Gate)

1. **U-1 resolved** → IR-4 (reuse the #32 rail's `effect_event_id`; no new hash). ✅
2. **Grounded on post-#32 reality** → D5 cites the built rail, not the corpus's "pending" framing. ✅
3. **`decomposition.md:46` is the leg boundary** → Scope header; task-file goal prose to be tightened. ✅
4. **DB-4 columns = BUILT downstream** → D6 + C2; reconciliation treats them as built, ownership boundary holds. ✅

## F. Open items for the reconciliation (Step 5) to resolve — NOT guessed here

- **OI-1 (N2/XCU-10):** is the `binding_mode`≠`source` invariant an owed runtime validator, or structurally
  satisfied by two distinct columns + the enum validators (D3)? → decide against the built schema + validators.
- **OI-2 (N3/XCU-09):** is a measurement-side `Binding → EffectEvent` mapping helper owed, or is the contract
  fully discharged by consumers firing D5's rail directly? → decide against the built rail's API surface.
- **OI-3 (N6/XCU-SP-33):** confirm nothing runtime is owed in #33 for the laddering seam (Purposes-owned;
  spaces not yet built; not a #33 dep). → confirm as documented-seam only.

> These are **scoping decisions bounded by built facts**, not `[UNKNOWN]` voids — each has its resolution
> source named. No item in #33's roster rests on an unresolved unknown.
