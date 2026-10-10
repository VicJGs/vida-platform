# fe-codec-seams #13 — Slice Map (Decomposition Gate, Step 2) · Decide-mode (grain) / Ratify-mode (scope)

> **Unit grain is doc-fixed** (Wave-0 codec unit #13, "Composition seams", 4 engines) [FACT:
> reconstructed-structure.md:33; g6-reshape-runbook.md:43]; the **scope is ratified** to Option A (convention + defer
> live) by the doc-resolved fork (interpretation §4 IR-1); the **internal slicing is proposed** (Decide-mode).
> **No Visual Gate** — the unit renders nothing new (envision SKIP). Grounds: interpretation.md §1–§5 ·
> seam-contract.md · ADR-006/007/008/009 · the shipped collection/dashboard adapters · the ProviderRead/db-worker FACTs.

## Scope posture (the doc-resolved fork, recorded so the gate ratifies not re-opens)
**Option A — Convention + defer live.** #13 ships seam contracts + consumption conventions + the Templates barrel fix +
the Templates/Spaces consumption modules + RATIFY of the shipped Collection/Dashboard adapters. The **live** main-thread
service bootstrap (AR-4's throwing `exec`/`values`/`batch` Drizzle-proxy) stays homed to **UI-3/entity-CRUD** and is
pulled by the **first consumer**. Three resolving tests [FACT: db/CLAUDE.md "deferred to entity-CRUD, UI-3/M1.1+";
reconstructed-structure.md:44 "#13 (ProviderRead)"; s5-conventions.md:63-70]. NOT a manufactured deferral — the genuine
net-new is in §Slices (interpretation §2).

## Gate-resolved homings (read from the docs — not decisions)
- **H1 — #13 is a seam/convention layer, renders nothing.** Renderers=#3, shells=#4–#12, Spaces page=#20, Calendar=#19
  own all pixels [FACT: reconstructed-structure.md:23-33,44-45].
- **H2 — #7 does not block the convention deliverable.** The block registry #13 wires already ships in `@vida/editor`
  (standard+integration blocks) [FACT: editor/extensions/standard-blocks.ts:24-30; integration-blocks.tsx; commands.ts:
  8-107]. #7's aesthetic ② pass is orthogonal (interpretation §1a).
- **H3 — View (read-only) and Capability (interactive write) stay separate primitives** [FACT: quality-bar §4.3;
  ADR-007 §3.3 vs ADR-008 §3.2] → separate seams, but grouped by *consumption shape* into slices (read vs portability).
- **H4 — the apps/web pieces ship as type+convention, no live hook** (first-consumer-pull) [FACT: collection
  slice-map H4; s5-conventions.md:63-70] → **Verification Gate, no Visual Gate.**
- **H5 — the live bootstrap is deferred to its documented home** (IR-1) — #13 writes the access SHAPE only.

## Slices

### S1 — Read-consumption seams: SavedView + Capability/Block · `apps/web` · RATIFY + convention
**Does:** (a) **RATIFY** the two shipped adapters against the live engine APIs — the Collection adapter
(`toCollectionChrome`·`bindViewConfigWrites`·`createCollectionAdapter`) vs `ViewsService`/`ViewEngine`/`ResolvedView`
[FACT: apps/web/src/collection/adapter.ts:1-94; views/engine.ts:22-82; views/service.ts:16-98], and the Dashboard
adapter (`toBlocks`·`isStandalone`·`parseBlockConfig`) vs `CapabilityRegistry`/`OfferedSetResolver` [FACT:
apps/web/src/dashboard/adapter.ts:1-116; capability/registry.ts:49-134; offered-set.ts:17-49]. (b) Author the
**provider-registry wiring convention** (how a module registers a `ReadProvider{entityType,list}` + resolves a view;
degrade-never-crash BR-11) [FACT: views/provider-registry.ts:12-31; types.ts:22-27]. (c) Author the **inline↔standalone
placement convention** (`render_targets` gate; offered-set: inline=union, standalone=Space palette; `enabled_blocks` ≠
`block_instances`) [FACT: ADR-008:104-140; offered-set.ts:26-46]. (d) Define the shared **service-access SHAPE** the
whole unit references (`useXService()` type+convention; live instantiation deferred per IR-1).
**Touches:** `apps/web/src/seams/` (or extend `collection/`+`dashboard/` CLAUDE.md) — a convention module + `.test.ts`
+ a layer `CLAUDE.md`; `seam-contract.md` §A/§B.
**Invariants:** no live hook (type+convention); adapters RATIFIED not rewritten; View carries no entity write (IR-2);
degrade-never-crash (IR-4); `enabled_blocks`≠`block_instances` (IR-3).
**Done when (Verification Gate — no Visual Gate):** the adapters + conventions type-compile against the real
`@vida/core` engine exports; a convention test proves a `ResolvedView`→Collection-props mapping + a standalone
offered-set→add-menu derivation; `tsc` 0; `@vida/web` tests green; `/critique` SHIP.

### S2 — Portability seams: Template + Spaces · `@vida/core` (1 line) + `apps/web` · NET-NEW + convention
**Does:** (a) **Barrel export fix** — add `export * from './foundation/templates'` to `@vida/core` so a consumer can
import `TemplatesService` from the public surface [FACT: packages/core/src/index.ts — templates absent; templates/
index.ts exists] + a barrel re-export test. (b) The **fork-on-instantiate consumption convention** — how a surface
lists/instantiates a template (`InstantiationResult{status,seeded,flagged}`; no back-link; capture/instantiate EXECUTION
stays `@vida/core` S3–S5 deferred) [FACT: templates/service.ts:24-59; templates/types.ts; ADR-009 §1]. (c) The **Spaces
consumption convention** — `SpacesService` access + the `enabled_blocks` offered-set shape (membership = root-tag;
palette curation gates *adding*, not placements) [FACT: spaces/service.ts:38-241; ADR-008:128-140]. Scope-STATE and the
Spaces page are NOT here (→ #15/#20).
**Touches:** `packages/core/src/index.ts` (+ a barrel test); `apps/web/src/seams/` templates+spaces convention module +
`.test.ts`; `seam-contract.md` §C/§D.
**Invariants:** barrel fix is additive (no API change); fork has no `template_id` link (IR-5); instantiate/capture
execution deferred (not reimplemented); Spaces scope-state/page out of scope; type+convention (no live hook).
**Done when (Verification Gate — no Visual Gate):** Templates imports from `@vida/core`; the fork + spaces conventions
type-compile against the real services; a convention test proves a template-list→instantiate-shape + an
`enabled_blocks` offered-set derivation; `tsc` 0 (core + web); tests green; `/critique` SHIP.

## Dependency order
**S1 → S2.** S1 defines the shared service-access SHAPE + the two read-consumption seams that have shipped adapters to
ratify; S2 adds the two portability seams (the genuine net-new) + the barrel fix, referencing S1's access SHAPE. No
Visual Gate on either (H4).

## Out of scope (doc-homed, NOT deferred-to-avoid-work)
- **Live main-thread service bootstrap** (the AR-4 Drizzle-proxy `exec`/`values`/`batch`) → UI-3/entity-CRUD/first
  consumer (IR-1) [FACT: db/client.ts:44; db/CLAUDE.md].
- **Template capture + instantiate EXECUTION** → `@vida/core` templates S3–S5 (first-consumer-pull) [FACT:
  templates/CLAUDE.md].
- **The `Spaces:` scope selector + global scope state** → #15 `fe-shell-scope` [FACT: g6-reshape-runbook.md:49;
  decomposition.md:53].
- **The Spaces page (list/create/edit)** → #20 `fe-spaces-page` [FACT: g6-reshape-runbook.md:54].
- **Per-module `ReadProvider` implementations + concrete data wiring** → each module's ② track (#27+) [FACT:
  views/CLAUDE.md "modules register at their build"; decomposition.md:80-105].
- **Per-surface live hooks** (`useCollection`·`useDashboard`·`useView`) → first consumers (#20/#27+) [FACT: collection
  CLAUDE.md; dashboard CLAUDE.md].
- **Any new rendered surface / visual spec** → the consuming shells/pages (H1).

## Envision coverage
**Gate SKIPPED** (envision.md — no user affordance; renders nothing). No `structural` EC set → no Visual-Gate MUSTs.
Every slice closes on a **Verification Gate**. Coverage N/A by construction (a wiring/convention unit).
