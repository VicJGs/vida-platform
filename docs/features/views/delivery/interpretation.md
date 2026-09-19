# xs-views — Interpretation Layer (Entity Re-scope recovery, Step 2)

> Makes the implicit explicit from the gated source (ADR-007 · `parts/xcut-views.md` · `docs/core/spaces/current-*`
> · built `foundation/views/*`). Every claim is `[FACT: path:line]`, `[INTERP]`, or `[UNKNOWN]`. Feeds the
> Reconciliation ledger (Step 4). Head **#35 XS-views**, M1.1.1 Backend, build-deps: none.

## 0. The #35-position invariant (the gating fact all seam rulings rest on)

xs-views sits at **#35 with zero build-deps** — *before* XS-templates (#36), MOD-journals (#39), and every
ReadProvider-registering module. `[FACT: reconstructed-structure.md:97; decomposition.md:50 (deps —)]`

**Consequence (binding on this reconciliation):** any leg whose realization needs a not-yet-built consumer
(a registered provider, a template pipeline, journal-contribution) can only be a **documented seam** here —
never wired code. Building it now would require guessing an interface that does not yet exist (violates
No-Guessing). A later reader must NOT re-open XCU-13/14/SP-34 as "missing code" — they are seams *by
topological construction*, and that is the reason on the page.

## 1. DEPENDENCIES (what xs-views rests on — all already built)

- **DB-6 Repository** → co-transactional `sync_queue`; `ViewsService` mutates only through it. `[FACT: service.ts:44-45]`
- **`views` table** (`schema/foundation/spaces.ts`, migration 003): `space_id?` · `name`[E] · `layout` (CHECK=`VIEW_LAYOUT`) · `filter`/`grouping`/`sort` (JSON TEXT) · `_sync_*` + `deleted_at`. `[FACT: current-spec.md:18]`
- **`VIEW_LAYOUT`** (`@vida/types/src/view.ts`) → `z.enum` in `validators/view.ts`, parity-tested vs the SQL CHECK. `[FACT: validators/view.ts:6; current-spec.md:22]`
- **ADR-006 spaces substrate** — a Space-owned view points at `spaces`; a single-root-tag filter = a Space's emergent contents. `[FACT: ADR-007:8,59]`
- **INT-1** — the engine reads other modules ONLY through registered `ReadProvider`s, never their tables. `[FACT: ADR-007:78-82; current-business-rules.md BR-11]`

## 2. NEEDS (what a downstream consumer needs from xs-views)

- A single saved-view primitive (filter × layout × grouping), Space-owned or global. `[FACT: ADR-007:15,45]`
- CRUD + clone over that primitive. `[FACT: ADR-007:19; service.ts:44-73]` `[extend: cloneView — §4]`
- A read-provider registry (V4/R7 seam) modules register into at THEIR build. `[FACT: provider-registry.ts:18]`
- A resolution engine: fan-out → merge → group → terminal-state, degrade-never-crash. `[FACT: engine.ts:37-78]`

## 3. ORGANIZATION (where it lives — no `docs/core/views/`)

Spaces owns ADR-006 + ADR-007, so the durable views contract lives in **`docs/core/spaces/current-spec.md`
+ `current-business-rules.md` (BR-8…BR-13)** — there is no `docs/core/views/current-*`. `[FACT: xcut-views.md:8-9]`
The Currency Rule (§XXIX) at close refreshes the **spaces** current-* for the views delta.
Code lives at `packages/core/src/foundation/views/`. `[FACT: current-spec.md:24]`

## 4. LEG ADJUDICATION (ratify · extend · seam) — the reconciliation input

**Ratified (FACT, built, ✅):** XCU-01–04 (CRUD), 07 (registry), 08 (ReadProvider iface), 09 (resolve/fan/merge),
10 (grouping/ungrouped), 11 (terminal-state), 12 (graceful-degrade), 15–20 (invariants V1/V2/V3/V5 + collapse +
sync), 22 (emergent-Space view = filter=root-tag, reuses XCU-09). **15 legs.** `[FACT: engine.ts, service.ts, types.ts, provider-registry.ts as cited in xcut-views.md:14-35]`

**Extend (build-now — the ONE code slice):**
- **XCU-05 `cloneView`** — a first-class `ViewsService` method: read source `views` row → `createView` an
  **independent copy** (ADR-009 fork stance), overriding `space_id` for global↔Space. Pure service-tier (source
  and target are both `views` rows — needs NO consumer, not blocked by #35). `[FACT: ADR-007:50-51 "clones a
  global into a Space or vice-versa (clone = independent copy)"; ADR-007:19; §3.2]` Consumer-side create-from-source
  is **rejected** — it re-implements copy logic per consumer, breaking the "one primitive" principle. `[FACT: ADR-007:45 §3.1]`

**Seams (ratify-as-documented — zero code; each provably blocked by #35 or explicitly deferred by ADR):**
- **XCU-06 default-view seed** → ADR-009 Templates (#36). The default-view SET ships as a Template seed bundle,
  captured/instantiated by `TemplateService` which **DELEGATES → ViewsService.createView**. xs-views owns the
  `createView` mechanism (XCU-01, built); it authors NO seed. `[FACT: XCU-SP-31 "Template = {root tag + seed
  entities + views + enabled_blocks}"; xcut-templates XCU-02 "captureFromSpace delegates → ViewsService";
  xcut-templates XCU-08 "OS ships curated Templates as BUNDLED ASSETS" = listShipped; ADR-009 Builds-on ADR-007]`
  *(Doc-fixed, not a decision — Victor drift-catch on an earlier 3-way framing.)*
- **XCU-13 per-type predicate + opt-in "exclude"** → contract-only. The delegation contract is documented; the
  exclude-flag + per-type matching are predicate-DSL semantics **explicitly deferred to build-time**. The built
  whole-filter pass-through satisfies the ratified contract. `[FACT: ADR-007:66-72 (contract); ADR-007:96 +
  current-spec.md:34 (grammar → build-time)]`
- **XCU-14 layout field-declaration** → seam (P6/renderer), grounded — NOT waved away by the #35 invariant.
  ADR-007:94 defers each layout's **visual/interaction spec** to build-time; :106/127 frame "layout/field
  compatibility" as "real surface to **design and support**". The static `LAYOUT_FIELD_REQUIREMENTS` map
  (calendar→date, gallery→image, board→group-by) is **renderer knowledge** (part of that visual spec) → P6,
  not substrate — authoring it here would be mis-homed. The availability-derivation half additionally needs
  per-entity-type field metadata from ReadProviders that don't exist at #35. `[FACT: ADR-007:60-64,94,106,127]`
  - **BR-10 reconcile:** `current-business-rules.md:17` tags "a layout's missing field → degraded, never crash"
    to *ViewEngine*, but the tag is imprecise. The built engine is **layout-agnostic** (grouping is "independent
    of layout", `types.ts:17`; `engine.ts` never reads `layout`), so the "never crash" half holds **by
    construction** — the engine cannot crash on a field it never inspects. The "layout unavailable/degraded"
    *affordance* is the renderer's (P6, the only tier that knows what a layout needs to render). No engine code owed. `[FACT: engine.ts:37-78 (no layout branch); types.ts:17]`
- **XCU-SP-34 dueIn()/journal-contribution consumption** → documented consumption seam. journal-contribution =
  Journals (#39, not built at #35); the ViewEngine fan-out mechanism (XCU-09) IS built — the specific aggregator
  providers register at Sessions/Journals builds (INT-1). Mirrors #33's XCU-SP-33 seam ruling. `[FACT: XCU-SP-34
  (INTERP, aggregators cross-cutting-owned); ADR-007:78-82]`

**Boundary (correctly out of the 22):** XCU-21 nav/default-view preference → Preferences. `[FACT: xcut-views.md:34; decomposition.md:50 omits XCU-21]`

## 5. IMPLICIT RULES (surfaced, each cited)

- **IR-1** `cloneView` must produce an independent copy — no `template_id`/source back-link (ADR-009 fork stance; ZK-clean, edits never conflict). `[FACT: ADR-007:50-51 (view clone = independent copy, "consistent with ADR-009's fork stance"); ADR-009 title]`
- **IR-2** A cloned view is itself syncable → the clone write flows through the Repository → `sync_queue` like any create. `[FACT: service.ts:44-45; current-business-rules.md BR-13]`
- **IR-3** `cloneView` inherits the M1.0 empty-`[E]` pass-through — `name`/filter values plaintext now, `[E]` is the M3 target. `[FACT: service.ts:45; current-business-rules.md BR-12/BR-13]`
- **IR-4** Clone must NOT deep-copy through a not-yet-existing template bundle — it is a views-only row-to-row copy; the template *bundle* clone is XS-templates' (#36) concern. `[INTERP from the #35 invariant §0 + XCU-SP-31 ownership]`
- **IR-5** Clone mints **fresh** sync metadata + a fresh UUIDv7 — it must NOT copy source `_sync_*`/`deleted_at` (the `create` path already generates these; stated so no one "copies all columns"). `[FACT: service.ts:48-56 (create mints fresh); current-spec.md:18 (per-row `_sync_*`)]`
- **IR-6** Clone does NOT auto-wire `spaces.default_view_id` — a cloned-into-Space view is a plain member, not the opener; wiring the opener is a separate `updateView`/create→create→update (XCU-02/BR-9). `[FACT: ADR-007:53-54; current-business-rules.md BR-9]`

## 6. UNKNOWNs remaining after this layer

- None blocking. All 5 P1-corpus UNKNOWNs (`xcut-views.md:73-77`) resolve above via cite + the #35 invariant.
  `cloneView`'s method-vs-consumer UNKNOWN → resolved (service method, §4). The other four → documented seams.
