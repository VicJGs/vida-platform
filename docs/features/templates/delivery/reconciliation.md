# xs-templates — Reconciliation Ledger (Entity Re-scope recovery, Step 4)

> Built-vs-docs sweep of the templates substrate, item by item, each cross-checked code ↔ its doc layer.
> **Single-plane (backend)** — the Envision Gate SKIPPED (pure-backend foundation service, no user surface at
> #36; the preset TAB is P6), so there are no frontend/shared rows. Buckets: ✅ aligned · ❌ wrong ·
> 📄 undocumented · 🕳 gap · ⛔ ungated-owed. Exit condition = a DRY pass (zero new items). Grounding:
> `interpretation.md` §4. **Inverse of xs-views** — this head is build-heavy (3 ratify / 11 extend).

## A. Substrate (built at the schema-foundation phase — DB-4 / M1.0)

| Item | Built? (code) | Doc | Bucket |
|------|---------------|-----|--------|
| `templates` table (id · name[E] · bundle[E] · _sync_* · deleted_at) | `db/schema/foundation/templates.ts:1-26` | ADR-009:70-71 §3.3; xcut-templates.md:8 | ✅ (built+gated, DB-4) |
| migration `011_templates` (registered in `ALL_MIGRATIONS`) | `migrations/011_templates.ts`; `runner.ts` | m1.0-closeout.md:7 | ✅ |
| notes-introspection/enum parity coverage of mig 011 | enum test refs mig 011 | — | ✅ (parity green, 893/893) |

## B. The 14 legs (decomposition.md:49 — xcut-templates XCU-01…13 + xcut-spaces XCU-SP-31)

| Leg | Built? (code) | Doc | Bucket |
|-----|---------------|-----|--------|
| XCU-01 store CRUD (create/list/get/soft-delete) | **absent** (no `TemplatesService`) | ADR-009:70-71; xcut-templates XCU-01 | **🕳 gap → build** |
| XCU-02 `captureFromSpace` transform (skeleton) | absent | ADR-009:44-50; XCU-02 | **🕳 gap → build** (seed-entity portion = seam) |
| XCU-03 authored-vs-accumulated capture invariant | absent | ADR-009:73-83; XCU-03 | **🕳 gap → build** |
| XCU-04 capability-config sub-invariant | absent | ADR-009:53-57; XCU-04 | **🕳 gap → build** |
| XCU-05 instantiate = FORK (planner + skeleton exec) | absent | ADR-009:59-65; XCU-05 | **🕳 gap → build** (entity-writer = seam; U-1 DELEGATE) |
| XCU-06 fork-invariant (no `template_id` FK) | **built by absence** (no such column anywhere) | ADR-009:61-65; XCU-06 | **✅** (schema-enforced) |
| XCU-07 bundle serializer (JSON doc, not live FKs) | absent | ADR-009:48-50; XCU-07 | **🕳 gap → build** |
| XCU-08 `listShipped` bundled-asset provider | absent | ADR-009:66-71; XCU-08 | **🕳 gap → build** (asset-source = seam) |
| XCU-09 name/bundle `[E]` field-encryption | **built** (marked `[E]` on table), M1.0 pass-through (empty `[E]` set) | ADR-009:70-71; XCU-09; [[m10 empty-encryptedFields seam]] | **✅** (ratify-as-passthrough; M3 target) |
| XCU-10 terminal-state contract (in-progress/success/partial-failure) | absent | ADR-009:108-110; XCU-10 | **🕳 gap → build** |
| XCU-11 partial-failure derivation (per-member presence) | absent | ADR-009:108-110; XCU-11 (INTERP) | **🕳 gap → build** |
| XCU-12 preset composition (type + XCU-13 invariant) | absent; **no `presets` store** (grep: only `templates`) | ADR-009:100-106,105; XCU-12 | **🕳 gap → build** (type+invariant only; CRUD n/a — no store; tab→P6, discriminator→module seam) |
| XCU-13 preset-invariant (not a bundle; no own discriminator) | absent | ADR-009:100-106; XCU-13 | **🕳 gap → build** (validator) |
| XCU-SP-31 templates fork-on-instantiate service (umbrella) | realized by XCU-01…13 collectively | xcut-spaces.md:51; decomposition.md:49 | **✅** (umbrella; no separate code) |

**Seam legs (documented, zero code — blocked by #36's position, `interpretation.md` §0):**
- **Seed-entity capture + fork WRITE SEAM** (delegated portions of XCU-02/05) — the `TemplateEntityWriter`
  registry; empty at M1.1; owning modules register `(captureReader, forkWriter)` at THEIR build (ADR-019). This
  head authors the **registry + interface**, not the writers. `[INTERP: interpretation.md §0; measurement/effects seam precedent]`
- **Shipped-asset source** (XCU-08) — the packaged format of a bundled preset resolves when the first shipped
  preset lands with its module; `listShipped` reads an empty/injected asset set now. `[FACT: interpretation.md §6]`
- **Preset tab UI + discriminator binding** (XCU-12 remainder) — P6 (render) + module-owned discriminator
  (`task.ts:18`); no module service at #36. `[FACT: xcut-templates XCU-12 SPLIT row; task.ts:18]`

## C. Built-symbols → leg map (no undocumented code)

The `templates` substrate exports only `templatesTable` / `TemplateRow` / `TemplateInsert` (schema) — all map to
the substrate row (XCU-01/06/09). **0 📄 undocumented.** No `TemplatesService`, no template types in `@vida/types`,
no validators exist yet → nothing built-but-undocumented. `[FACT: Step 0 substrate map]`

## D. Gating status (⛔ check)

The `templates` table + migration 011 were authored under the DB-4 per-domain schema build (§XXVI double-gate +
introspection parity, LATEST_VERSION includes 011). Every built item in §A/§B is gated. **0 ⛔ ungated-owed.**
Every 🕳 gap leg is net-new → each runs its own §XXVI gate + per-slice Verification Gate (Step 6).

## E. Verdict — CORRECTED 2026-09-19 (Victor drift-catch: first-consumer-pull mis-scoped)

**The correction.** `decomposition.md:49` lists xs-templates' **runtime read-seams as "—" (none)**; the
template-capable surfaces (capability-framework.md:239, T1 applies-to) are **modules** (Languages/Health/Skills/
Routines/Duties/Bucket List/Tasks) — **none built at M1.1**; ADR-019 §3.5 builds a substrate feature **when its
first consumer needs it**. Therefore **capture, instantiate-execution, shipped-asset-source, and the preset
primitive have NO M1.1 consumer → they are first-consumer-pull SEAMS**, not build-now legs. My first draft
over-scoped them as an 11-leg "extend" service; that was the drift (it manufactured a need for sibling read
methods that dissolves once capture is correctly a seam).

- **✅ Ratify: 3 legs** — XCU-06 (fork-invariant by absence) · XCU-09 (`[E]` M1.0 pass-through) · XCU-SP-31
  (umbrella) **+ substrate** (table + migration 011). **0 ❌ wrong.**
- **✅ Build-now (consumer-independent, DONE): 2 slices** — S1 (types: `TemplateBundle` envelope + `INSTANTIATION_STATUS`
  + errors, XCU-07-envelope/XCU-10-type) · S2 (store CRUD `TemplatesService`, XCU-01). These are the store
  substrate's own types + access layer — the only pieces needing no module consumer.
- **🌱 First-consumer-pull SEAMS (documented, 0 code at #36; pulled by the first module):**
  - **XCU-02 capture transform + XCU-03/04 authored-vs-accumulated invariant + XCU-07 serializer** — enforced
    AT capture-time (T3); the transform reads a live *module* Space (none exist) → pulled by the first
    save-as-template. The invariant can't be a standalone validator now (it must inspect concrete member shapes,
    which are the serializer = seam). `[FACT: capability-framework.md:135 T3 "enforced at capture-time"; :239 (modules); decomposition.md:49 read-seams "—"]`
  - **XCU-05 instantiate execution + XCU-11 partial-failure derivation** — deep-copies into *module* entities via
    writers that don't exist → pulled by the first instantiate consumer. (XCU-10 terminal-state TYPE is built in S1.)
  - **XCU-08 shipped-asset source** — curated Templates are bundled assets that ship WITH their module (Languages
    starter etc.); none at M1.1 → the asset source is pulled by the first shipped preset.
  - **XCU-12/13 preset primitive** — T4 applies-to "modules with a type discriminator (Tasks/Duties)"; the tab is
    P6. No module discriminator at #36 → seam.
- **📄 undocumented: 0 · ⛔ ungated-owed: 0. DRY pass:** re-sweep of `foundation/templates/*` + `@vida/types` +
  `validators/*` surfaced zero further built items.

**Corrected shape: RATIFY (3 + substrate) + BUILD (S1 types ✅ · S2 store CRUD ✅) + DOCUMENTED SEAMS (capture ·
instantiate-exec · shipped-source · preset — all first-consumer-pull).** No sibling-service changes; no capture/
instantiate/preset code at #36. → Step 5 Re-scope Gate (re-run) for approval.
