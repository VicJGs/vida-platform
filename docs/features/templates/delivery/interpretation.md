# xs-templates — Interpretation Layer (Entity Re-scope recovery, Step 2)

> Makes the implicit explicit from the gated source (ADR-009 · `parts/xcut-templates.md` · `decomposition.md:49`
> · `docs/core/spaces/current-*` · built `db/schema/foundation/templates.ts`). Every claim is `[FACT: path:line]`,
> `[INTERP]`, or `[UNKNOWN]`. Feeds the Reconciliation ledger (Step 4). Head **#36 XS-templates**, M1.1.1 Backend,
> build-deps: xs-capability · xs-spaces-tags-links · xs-views (all ✅). Roster = 14 legs (`decomposition.md:49`):
> `xcut-templates` XCU-01…13 + `xcut-spaces` XCU-SP-31.

## 0. The #36-position invariant (the gating fact all seam rulings rest on)

xs-templates sits at **#36**, AFTER its build-deps xs-capability (#31), xs-spaces-tags-links (#34), xs-views (#35)
— **all built** — but **BEFORE every module that owns seedable entities** (MOD-tasks, MOD-habits, MOD-notes,
MOD-languages, MOD-health, …). `[FACT: reconstructed-structure.md:98; decomposition.md:49 (runtime read-seams: —)]`

**Consequence (binding on this reconciliation):** the bundle's authored **SKELETON** — root tag(s), views,
enabled-capability palette + config, child-Space structure — is forkable/capturable **now**, because Spaces,
Views, and Capability tiers are built. But the bundle's **SEED ENTITIES** (a starter `tasks` row, a Knowledge
kind, an empty logger target) and the **per-entity deep-copy WRITERS** belong to modules that **do not yet
exist**. Therefore:
- **Capture of seed entities** and **fork execution of seed entities** can only be a **documented WRITE SEAM**
  here — a registry owning modules register their capture-reader + fork-writer into at THEIR build
  (first-consumer-pull, ADR-019). `[INTERP: from the #36 position + INT-1 read-provider precedent]`
- Building those writers now would require guessing a `tasks`/`habits` creation interface that does not yet
  exist (violates No-Guessing). A later reader must NOT re-open the seam legs as "missing code" — they are
  seams **by topological construction**, and that is the reason on the page.

**This is the WRITE analogue of xs-views' READ seam.** Views registered `ReadProvider`s (modules push values
out); templates registers **entity WRITERS** (the fork pushes entities in). Same registry shape, opposite data
flow. `[FACT: foundation/measurement/source-registry.ts:21 createMeasurementSourceRegistry (read seam); foundation/views provider-registry (read seam)]`

## 1. DEPENDENCIES (what xs-templates rests on — all already built)

- **`templates` store table** (`db/schema/foundation/templates.ts`, migration `011_templates.ts`, registered):
  `id` · `name`[E] · `bundle`[E] (opaque serialized seed bundle) · `_sync_*` + `deleted_at`. `[FACT: db/schema/foundation/templates.ts:1-26; migrations/011_templates.ts]`
- **DB-6 Repository** → co-transactional `sync_queue`; the store mutates only through it; inherits the empty `[E]`
  set at M1.0. `[FACT: xs-views service.ts:44-45 precedent; XCU-09]`
- **CapabilityService** (#31) — `resolveOfferedSet` / `checkAction` / envelope; the bundle's "enabled
  capabilities + config" IS a Space's `enabled_blocks` offered-capability palette. `[FACT: xcut-templates XCU-07; ADR-009:48-50; foundation/capability/{enforcer,offered-set}.ts]`
- **SpacesService + AssociationResolver** (#34) — root tag(s) + child-Space structure + tag/link association.
  `[FACT: xcut-templates XCU-02 "delegates → SpacesService"; ADR-009:44-50]`
- **ViewsService + `cloneView`** (#35) — bundled views; instantiate delegates view creation → `ViewsService.createView`.
  `[FACT: xcut-templates XCU-02 "delegates → ViewsService"; xs-views XCU-05]`
- **Fork stance** — ADR-009 §3.2: deep copy, fresh UUIDs (DATA-1), no `template_id`. `[FACT: ADR-009:59-65]`
- **ADR-010** owns the untrusted-import trust boundary (A1) — NOT this head. `[FACT: ADR-009:92-98; ADR-010:8; xcut-templates.md:35]`

## 2. NEEDS (what a downstream consumer needs from xs-templates)

- A `templates` store CRUD primitive (create/list/get/soft-delete user-saved rows). `[FACT: XCU-01; ADR-009:70-71]`
- A **capture transform** (`captureFromSpace`) serializing a live Space's authored skeleton → portable JSON
  bundle, enforcing the authored-vs-accumulated invariant. `[FACT: XCU-02/03/04; ADR-009:44-57,73-83]`
- An **instantiate = FORK** operation: deep-copy the bundle into fresh entities, no back-link, with declared
  terminal states (in-progress / success / partial-failure). `[FACT: XCU-05/10/11; ADR-009:59-65,108-110]`
- A **shipped-preset provider** (bundled assets) distinct from user-saved store rows. `[FACT: XCU-08; ADR-009:66-71]`
- A **preset** composition primitive (saved View + per-type defaults + optional starter Template), bound to a
  module-owned type discriminator. `[FACT: XCU-12/13; ADR-009:100-106]`

## 3. ORGANIZATION (where it lives — no `docs/core/templates/`)

Spaces owns ADR-006/007 and templates COMPOSE that tier, so the durable templates contract lives in
**`docs/core/spaces/current-spec.md` + `current-business-rules.md`** — there is no `docs/core/templates/current-*`.
`[FACT: xcut-templates.md:6-9]` The §XXIX Currency Rule at close refreshes the **spaces** current-* for the
templates delta. Code lives at **`packages/core/src/foundation/templates/`** (home dir exists, ADR-018 —
"engine authored per-feature at build phase"), mirroring `foundation/views/`, `foundation/capability/`,
`foundation/measurement/`. `[FACT: foundation/templates/CLAUDE.md:1-16; foundation/views/ precedent]`

## 4. LEG ADJUDICATION (ratify · extend · seam) — the reconciliation input

**Ratified (FACT, built, ✅) — 2 legs:**
- **XCU-06 fork-invariant** — no `template_id` FK on instantiated entities; schema-enforced **by absence**.
  `[FACT: db/schema — no template_id column anywhere; ADR-009:61-65; xcut-templates XCU-06]`
- **XCU-09 `[E]` encryption** — `name`[E] + `bundle`[E] present on the table; M1.0 **pass-through** (empty `[E]`
  set), `[E]` is the M3 target — the same ratify-as-passthrough stance as every prior XS head.
  `[FACT: db/schema/foundation/templates.ts (name/bundle marked [E]); xcut-templates XCU-09; m10 empty-encryptedFields seam]`

**Extend (build-now) — the owed service tier, operating over the BUILT Spaces/Views/Capability tiers:**
- **XCU-01 store CRUD** — `TemplatesService` create/list/get/soft-delete over the `templates` table via
  Repository. Pure service-tier; no consumer needed. `[FACT: XCU-01; ADR-009:70-71]`
- **XCU-02 `captureFromSpace` (skeleton)** — serialize root_tag + views + enabled-capability palette+config +
  child-Space structure by DELEGATING reads → Spaces/Views/Capability. Seed-**entity** capture = seam (§below).
  `[FACT: XCU-02; ADR-009:44-50]`
- **XCU-03 authored-vs-accumulated invariant** + **XCU-04 capability-config sub-invariant** — the capture
  validator: capture authored structure/config only, never accumulated runtime data; a config expressible only
  by pointing at accumulated data is not capturable. Buildable now for the skeleton it captures. `[FACT: ADR-009:53-57,73-83; XCU-03/04]`
- **XCU-05 instantiate = FORK (planner + skeleton execution)** — deep-copy the bundle: tags via Spaces, views
  via `ViewsService.createView`, palette via Capability, child spaces via Spaces — all with fresh UUIDs, no
  back-link. Seed-entity creation DELEGATES → the WRITE SEAM. `[FACT: XCU-05; ADR-009:59-65]` **U-1 resolved: DELEGATE** (§0).
- **XCU-07 bundle serializer** — the JSON document shape `{root_tag · seed entities · views · enabled_blocks ·
  child structure}`; palette shape owned by Spaces/Capability. `[FACT: XCU-07; ADR-009:48-50]`
- **XCU-08 `listShipped` asset provider** — read curated Templates from bundled assets, distinct from
  `listUserSaved` store rows. Mechanism buildable now; the M1.1 shipped-asset set is empty/thin (Languages
  starter etc. ship with their modules) → asset-source is itself a seam. `[FACT: XCU-08; ADR-009:66-71]`
- **XCU-10 terminal-state contract** + **XCU-11 partial-failure derivation** — instantiate declares
  in-progress/success/partial-failure; compute per-member which can be seeded vs which reference an absent
  capability/module (seed-what-it-can, flag-the-rest). Meaningful NOW: a skeleton-only bundle → success; a
  bundle with seed entities → partial-failure at M1.1 (structure seeded, entity members flagged). `[FACT: XCU-10/11; ADR-009:108-110]`
- **XCU-12 preset composition** + **XCU-13 preset-invariant** — a preset = saved View + per-type defaults +
  optional starter Template, bound to a module-owned type discriminator. **There is NO `presets` store table**
  (grep: only `templates`; the preset is "a saved tab + defaults over existing entities", ADR-009:105) → **no
  `PresetService` CRUD is buildable at #36** (nothing to persist; a preset IS a `views` row + a module
  discriminator like `tasks.kind`). What IS buildable now: the **preset composition TYPE + the XCU-13 invariant**
  (a preset must not be modeled as a full bundle; must not own its discriminator) as `@vida/types` + a validator.
  The tab UI render → P6; the discriminator BINDING to a module type (Tasks) → seam (no module service at #36).
  `[FACT: XCU-12/13; ADR-009:100-106,105; task.ts:18 "ADR-009 T4 preset type discriminator"; grep: no presets table]`

**Seams (ratify-as-documented — zero code; each provably blocked by #36's position):**
- **XCU-SP-31 (xcut-spaces)** — "Templates fork-on-instantiate service" — the space-tier umbrella that
  XCU-01…13 collectively realize; ratified-as-composed (no separate code). `[FACT: xcut-spaces.md:51; decomposition.md:49]`
- **Seed-entity capture + fork WRITE SEAM** (the delegated portions of XCU-02/05/08/12) — a
  `TemplateEntityWriter`/contributor registry: owning modules register `(captureReader, forkWriter)` for their
  entity types at THEIR build; empty at M1.1 → capture omits seed entities, instantiate flags them
  (partial-failure). This head authors the **registry + the seam interface**, not the writers. `[INTERP: §0; ADR-019 first-consumer-pull; measurement/effects seam precedent]`

## 5. IMPLICIT RULES (the IRs — for the reconciliation + spec §2)

- **IR-1 (skeleton-forkable / entities-seamed).** Instantiate/capture realize the Space skeleton via built
  services; seed entities route through the empty write-seam. `[INTERP: §0]`
- **IR-2 (delegation, never table reach).** Capture/fork DELEGATE to Spaces/Views/Capability services — never
  read/write their tables directly (mirrors views' INT-1). `[FACT: xcut-templates XCU-02/05 candidate homes; ADR-007 INT-1]`
- **IR-3 (fork = fresh everything).** Every instantiated entity gets a fresh UUIDv7 + fresh `_sync_*` +
  `deleted_at=null`, no `template_id`. `[FACT: ADR-009:59-65; DATA-1]`
- **IR-4 (capture excludes accumulated data — correctness property).** The capture transform must actively
  exclude runtime data; it is enforced, not free. A capture that cannot express a config without accumulated
  data must refuse (throw a typed capture error). `[FACT: ADR-009:73-83,53-57]`
- **IR-5 (degrade, never crash).** A bundle referencing an absent capability/module seeds what it can and flags
  the rest as a declared partial-failure. `[FACT: ADR-009:108-110]`
- **IR-6 (M1.0 `[E]` pass-through).** name/bundle pass through the empty `[E]` set at M1.0; M3 activates. `[FACT: XCU-09; m10 seam]`
- **IR-7 (factory-service shape).** `createTemplatesService` → object literal; intra-service calls via closures
  (no `this.`); validating methods async-reject. `[FACT: factory-service memory; prior XS heads]`

## 6. UNKNOWNs (carried — none blocking Step 4)
- Both source UNKNOWNs (U-1 own-vs-delegate; U-2 A1 home) are **RESOLVED** at the Documentation Gate (Step 1):
  U-1 = DELEGATE via write-seam (precedent); U-2 = out-of-scope, ADR-010. `[FACT: ADR-010:8; measurement/source-registry.ts:21]`
- `[UNKNOWN: shipped-asset format]` — how bundled shipped-preset assets are packaged/read (a file vs an embedded
  const) is a build-time detail resolved when the FIRST shipped preset lands (with its module), not at #36. Seam.
