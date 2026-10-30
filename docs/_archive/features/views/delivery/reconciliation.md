# xs-views — Reconciliation Ledger (Entity Re-scope recovery, Step 4)

> Built-vs-docs sweep of the views substrate, item by item, each cross-checked code ↔ its doc layer.
> **Single-plane (backend)** — the Envision Gate SKIPPED (pure-backend substrate, no user surface), so there
> are no frontend/shared rows. Buckets: ✅ aligned · ❌ wrong · 📄 undocumented · 🕳 gap · ⛔ ungated-owed.
> Exit condition = a DRY pass (a full sweep surfacing zero new items). Grounding: `interpretation.md` §4.

## A. The 22 legs (decomposition.md:50)

| Leg                                               | Built? (code)                                   | Doc                                                                                | Bucket                              |
| ------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------- |
| XCU-01 createView                                 | `service.ts:48-56`                              | current-spec.md:24; ADR-007:19                                                     | ✅                                  |
| XCU-02 updateView (+default_view_id wire)         | `service.ts:59`                                 | BR-9                                                                               | ✅                                  |
| XCU-03 deleteView (soft-delete)                   | `service.ts:63`                                 | ADR-007:74                                                                         | ✅                                  |
| XCU-04 getView (→ ViewNotFound)                   | `service.ts:67`; `types.ts:46`                  | current-spec.md                                                                    | ✅                                  |
| **XCU-05 cloneView**                              | **absent** (only create/update/delete/get)      | ADR-007:50-51; §3.2                                                                | **🕳 gap → the one build slice**    |
| XCU-06 default-view seed                          | mechanism only (`createView`)                   | seam → ADR-009 Templates #36 (XCU-SP-31; xcut-templates XCU-02/08)                 | ✅ (seam; no code owed here)        |
| XCU-07 ViewProviderRegistry                       | `provider-registry.ts:18`                       | current-spec.md:28; ADR-007:79-82                                                  | ✅                                  |
| XCU-08 ReadProvider iface                         | `types.ts:24`                                   | ADR-007:79-82; BR-11                                                               | ✅                                  |
| XCU-09 resolve/fan/merge                          | `engine.ts:37-60`                               | current-spec.md:29                                                                 | ✅                                  |
| XCU-10 grouping/ungrouped bucket                  | `engine.ts:62-74`                               | BR-10                                                                              | ✅                                  |
| XCU-11 terminal-state (never `loading`)           | `engine.ts:76-78`                               | BR-12                                                                              | ✅                                  |
| XCU-12 graceful degrade (no-provider/throw)       | `engine.ts:47-59`; `types.ts:41`                | BR-11/BR-12                                                                        | ✅                                  |
| XCU-13 per-type predicate + opt-in exclude        | contract only (whole-filter pass-through built) | seam → predicate-DSL build-time (ADR-007:96; current-spec.md:34)                   | ✅ (contract-only; no code owed)    |
| XCU-14 layout field-declaration                   | engine is layout-agnostic (`types.ts:17`)       | seam → P6/renderer (ADR-007:94,106,127); BR-10 "never crash" holds by construction | ✅ (seam; no code owed)             |
| XCU-15 V1/BR-8 (surface = row)                    | schema-enforced                                 | BR-8                                                                               | ✅                                  |
| XCU-16 V2/BR-9 (space_id nullable)                | `views` schema                                  | BR-9                                                                               | ✅                                  |
| XCU-17 V3/BR-10 (layout CHECK + JSON)             | `validators/view.ts:6` (z.enum parity)          | current-spec.md:22                                                                 | ✅                                  |
| XCU-18 V5/BR-12/13 (name [E], M1.0 pass-through)  | `service.ts:45` (empty [E])                     | BR-12/BR-13                                                                        | ✅                                  |
| XCU-19 syncability (_sync_\* + deleted_at)        | `service.ts:44-45` (via Repository)             | current-spec.md:26                                                                 | ✅                                  |
| XCU-20 collapse of parallels (task_views retired) | single `views` primitive                        | ADR-007:9,84-85                                                                    | ✅                                  |
| XCU-22 emergent-Space view (filter=root tag)      | reuses `engine.resolve` (XCU-09)                | ADR-007:59                                                                         | ✅ (no new code — usage)            |
| XCU-SP-34 dueIn/journal-contribution consumption  | fan-out mechanism built (XCU-09)                | seam → aggregators register at Sessions/Journals builds; mirrors #33 XCU-SP-33     | ✅ (consumption seam; no code owed) |

**Boundary (out of the 22, correctly):** XCU-21 nav/default-view pref → Preferences. `[FACT: xcut-views.md:34]`

## B. Built symbols → leg map (no undocumented code)

All 16 exported symbols map to a ratified leg — **0 📄 undocumented**:
`ViewEngine`/`createViewEngine`→09-12 · `ViewFilter`/`ViewGrouping`→01/09 · `ReadProvider`→08 · `ViewState`→11 ·
`ResolvedGroup`/`ResolvedView`→09-12 · `ViewNotFound`→04 · `NoProviderForEntityType` (direct-lookup variant,
`types.ts:53-59`)→08/12 · `ViewProviderRegistry`/`createViewProviderRegistry`→07 ·
`CreateViewInput`/`ViewsService`/`createViewsService`→01-04 · `ViewLayoutSchema`→17.

## C. Gating status (⛔ check)

The AR-6 views substrate was authored under AR-6's §XXVI double-gate + 3 independent critiques (ar-6-spaces
session; spaces 14/14 green). Every built leg above was gated against V1–V5 (= the corpus legs). **0 ⛔ ungated-owed.**
`cloneView` (XCU-05) is net-new → runs its own §XXVI gate + Verification Gate (Step 6).

## D. Verdict

- **✅ aligned: 21** (15 built-FACT + 4 documented seams + 1 usage + XCU-06 mechanism) — **0 ❌ wrong.**
- **🕳 gap: 1** — XCU-05 `cloneView` (the only owed code).
- **📄 undocumented: 0 · ⛔ ungated-owed: 0.**
- **DRY pass:** a second full sweep of `foundation/views/*` + `validators/view.ts` against ADR-007 + the 22 legs
  surfaced **zero new items**. Ledger exhaustive.

**Shape: RATIFY (21) + one thin EXTEND (`cloneView`).** One slice → Step 5 Re-scope Gate.
