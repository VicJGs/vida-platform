# Reconciliation — xs-measurement-engine #33 (LIF-173)

> Entity Delivery Flow (recovery variant), Step 5. Exhaustive DRY sweep of **built code vs the interpretation**
> (`interpretation.md`), item-by-item, each cross-checked code ↔ doc layer and tagged plane {backend|shared}.
> Buckets: ✅ aligned · ❌ wrong · 📄 undocumented · 🕳 gap · ⛔ ungated-owed. Composes `/audit-existing` +
> `victor:impact-scan`. Exit condition = a DRY pass (zero new items on a full re-sweep).
>
> **Plane note:** #33 is pure-backend (no frontend/shared surface) — every row is `{backend}`. Envision Gate
> skipped (stated: pure-backend, no rendered surface).

---

## Ledger — the 15 legs of `decomposition.md:46` + the built substrate

| Leg | Intent (interpretation ref) | Built state (code FACT) | Doc layer (FACT) | Bucket |
|-----|-----------------------------|-------------------------|-------------------|:------:|
| **XCU-01** normalize (per-kind → [0,1]/null) | N1 | `engine.ts:14-33` — 4 kinds, direction-aware, clamped | spec:12 · BR-1 · tested `measurement.test.ts:18-44` | ✅ aligned |
| **XCU-02** qualitative-unmeasured → null | N1 | `engine.ts:29-31` — no scale/rating ⇒ null | BR-2 (:9) · tested `:38` | ✅ aligned |
| **XCU-03** fractal weighted rollup | N1 | `engine.ts:38-53` — Σ(p×w)/Σw, null-exclusion, all-null⇒null | BR-3 (:10-11) · tested `:45-59` | ✅ aligned |
| **XCU-04** resolveProgress (derive-by-default) | N1/IR-2 | `engine.ts:56-61` — NULL⇒derive, stored=override | BR-4 (:12) · tested `:62-68` | ✅ aligned |
| **XCU-05** assertAcyclic (DAG guard) | N1/N1b/IR-3 | `engine.ts:65-92` — both edge modes, throws `MeasurementCycle` | BR-7 (:15) · tested `:69-86` | ✅ aligned (perf-envelope deferred-with-cause, N1b) |
| **XCU-06** source-read seam (contract) | N1/IR-5 | `source-registry.ts:13-35` — advertise/query/has, empty, unadvertised⇒null | BR-6 (:14) · tested `:87` | ✅ aligned (real sources = XCU-07, downstream) |
| **XCU-08** `Pursuable.progress()` contract | N1a | `types.ts:16-20` — `measurement_kind` + `progress()` | BR-8 (:16) | ✅ aligned (CONTRACT only; per-module impls downstream) |
| **XCU-09** event-trigger rides existing rail | N3/IR-4/OI-2 | rail built `effects/service.ts:29,42`; 3 keyed effect types `effects/types.ts:21-23`; `deriveEffectEventId` `event-id.ts:20`; `EffectEvent` `types.ts:37` | BR-5 (:13) · xcut-measurement XCU-09 | ✅ aligned (contract discharged; no push engine; no helper writable/owed — OI-2) |
| **XCU-10** `binding_mode` ≠ provenance `source` | N2/IR-6/OI-1 | `binding_mode` on pursuable rows (`habits.ts:80`, `health-core.ts:161`); `source` on value rows (`purposes.ts:133`, `health-core.ts:85`) — **different tables**; distinct z.enums | current-BR:13 · xcut-measurement XCU-10 | ✅ aligned (structurally satisfied; no runtime validator writable/owed — OI-1) |
| **XCU-11** nesting-weight resolution rule | N1 | `engine.ts:47-49` — rollup reads `weight`, NULL/0⇒equal-weight | ADR-011 §3.3 · tested `:49` | ✅ aligned (rule engine-owned; column = DB-4) |
| **XCU-13** `Binding` + `EntityRef` types | N1/IR-3 | `types.ts:22-33` — owned here; economy reuses | spec:13 · BR-7 | ✅ aligned (storage deferred by design) |
| **XCU-14** enums + z.enum validators | N1 | `@vida/types` MEASUREMENT_KIND/BINDING_MODE; `validators/measurement.ts:1-5` | spec:11 · xcut-measurement XCU-14 | ✅ aligned (columns landed DB-4, C2) |
| **XCU-15** engine consumes restored metric fields | N4 | `engine.ts:16-21` consumes `is_higher_better`+`baseline_value`; `success_criteria`/`measurement_method` = descriptive (no `NormalizeInput` field `types.ts:36-42`) | ADR-011 §3.1 | ✅ aligned (math fields consumed; descriptive fields need no consumption) |
| **XCU-17** no-propagation constraint | N5/IR-7 | *nothing propagation-like exists* — progress derived-on-read; no cache/invalidation table | xcut-measurement XCU-17 · `decomposition.md:92` (→ MOD-journals) | ✅ aligned (guardrail honored; deltas = Journals-owned, downstream) |
| **XCU-SP-33** Purposes-capstone laddering seam | N6/OI-3 | the AR-6 tag substrate the seam rides IS built (`foundation/spaces`); the `rollup` it ladders over IS built (`engine.ts:38`); the laddering *derivation* is Purposes-owned (XCU-12→MOD-purposes). The P3 `xs-spaces-tags-links` module issue is a peer head (unbuilt) but is NOT a #33 dep (`decomposition.md:46` deps = XS-effect-rail only) | xcut-spaces:53 (INTERPRETATION) | ✅ aligned (documented-seam only; substrate built, derivation downstream; nothing runtime owed in #33) |

### Substrate-level cross-checks

| Item | Built state | Bucket |
|------|-------------|:------:|
| DB-4 per-module columns (`measurement_kind`/`binding_mode`/`is_higher_better`/`baseline_value`/`success_criteria`/`measurement_method`/`source`) | landed `purposes.ts:83-91,133` + 13 schemas | ✅ aligned (ownership boundary: measurement owns no tables, §3.8) |
| Engine test coverage | `measurement.test.ts` — 12 tests: 4 kinds + rollup 4 edge-cases + resolveProgress + DAG (DAG+cycle) + seam | ✅ aligned |
| Barrel exports | `index.ts:6-8` — types + engine + source-registry | ✅ aligned |
| Currency docs (`docs/core/measurement/current-{spec,business-rules}.md`) | present, match code | 📄 minor-lag — "Deferred → DB-4/rail" framing predates DB-4 + #32 delivery (correct as ownership boundary; a currency note is owed at Step 8) |
| Delivery docs (`delivery/{interpretation,reconciliation,slice-map}.md`) | did not exist before #33 | 📄 undocumented → **created by #33** (the recovery deliverable) |

## Buckets rollup

- ✅ **aligned: 15/15 legs + all substrate cross-checks** — the engine, contract, enums, seam, DAG guard, and the
  DB-4 columns + #32 rail that the roster's remaining legs ride are **all built and correct**.
- ❌ **wrong: 0** — no built code contradicts the interpretation.
- 🕳 **gap (owed #33 code): 0** — the two candidate gaps (N2/XCU-10, N3/XCU-09) resolved to *structurally-satisfied*
  and *contract-discharged*: neither is writable in #33 (XCU-10 has no shared row; XCU-09 forbids a new engine and
  needs a per-module firing consumer that doesn't exist yet), and both are honored by built facts.
- ⛔ **ungated-owed: 0** — no built code shipped without its gate (the AR-7 engine carries its 12-test suite).
- 📄 **undocumented: 2** — the delivery docs (created by #33) + a small currency-doc note (Step 8).

## Conclusion — **FULL RATIFY**

**#33 owes zero production code.** Every leg in `decomposition.md:46` is satisfied by the AR-7 Increment-3 engine
(built 2026-08-03), the DB-4 columns, and the #31/#32 effect rail. The genuinely-owed deliverable is the
**recovery documentation set** (this ledger + interpretation + slice-map) that *proves* the ratify, plus a §XXIX
currency note recording that the downstream the roster defers to (DB-4 columns, #32 rail) has since landed.

This is not under-scoping: the deferred legs (XCU-07/12/16/18/19/20 + per-module `progress()` impls) are **outside**
`decomposition.md:46`'s roster by design; the build-phase items that ARE in the roster (the engine functions,
XCU-05's function) are built. The roster governs.

### DRY re-sweep
A second full pass over the 15 legs + substrate surfaced **zero new items**. Exit condition met.
