# apps/web/src/seams — Composition seams (fe-codec-seams #13)

The `apps/web` runtime-wiring + convention layer for the four `@vida/core` composition primitives — SavedView
(ADR-007) · Capability/Block (ADR-008) · Template (ADR-009) · Spaces (ADR-006). It **renders nothing**; it is the
`ProviderRead`-grade substrate the shells (#4–#12), the Spaces page (#20), the Global Calendar (#19), and the module
②-tracks (#27+) consume. Ships **type + convention only** — no live hook / service instantiation (the live main-thread
service bootstrap over the worker-db Drizzle-proxy is doc-homed to UI-3/first-consumer; `apps/web/src/db/CLAUDE.md`).

## What this ships
- `index.ts` — the **seams barrel**: one import site re-exporting the two shipped read-consumption adapters
  (`../collection/adapter` = SavedView seam, `../dashboard/adapter` = Capability/Block standalone seam). RATIFIES them
  as #13's seam surface (does not re-author — BR-S1-2).
- `index.test.ts` — the read-seam drift guard: barrel resolves + ReadProvider-registration + offered-set shapes ratify
  against the live `@vida/core` API (NOT a re-run of the adapters' behaviour tests — those live in #4/#5).
- `portability.test.ts` — the portability-seam drift guard (S2): the Template barrel export resolves at the consumer
  surface + the `InstantiationResult` + `addEnabledBlock` shapes ratify against live `@vida/core`.
- **S2 also added** `export * from './foundation/templates'` to the `@vida/core` barrel (the Template engine was built but
  unexported) — the only `@vida/core` change #13 makes.

> **All four seams covered:** S1 = read-consumption (SavedView + Capability/Block); S2 = portability (Template + Spaces).

## The conventions (how a consumer wires each seam)

### 1. Service access — via factories; injection mechanism is the consumer's choice
Each engine is obtained from its exported `@vida/core` factory (all take `db: DrizzleDb, deviceId: string` unless noted):
`createViewsService` · `createViewEngine(registry?)` · `createViewProviderRegistry` (no args) · `createSpacesService(db,
deviceId, registry)` · `createCapabilityRegistry` · `createCapabilityEnforcer(db, deviceId, registry)` ·
`createOfferedSetResolver(db, registry)`. **#13 does NOT prescribe how a consumer injects these** (React Context / a
hook / a module singleton) — the first consumer (UI-3/#27) decides, because the live instantiation needs the
main-thread Drizzle-proxy that currently throws (`db/CLAUDE.md`). Reads go through React Query over the existing
`ProviderRead<T>` seam — see `apps/web/src/providers/provider-read.ts`; do not re-invent it.
**Live wiring = the Entity Live Close.** Each engine/service is wired in the closing slice of its first consuming
entity (golive-replan G0, `docs/specs/foundation/golive-replan/process.md` ELC-3…9); #13 stays convention-only.

### 2. ReadProvider registration (SavedView seam — the gap `collection/CLAUDE.md` leaves)
The View provider registry **ships EMPTY**; each module registers its documented list/query API at its own build
(ADR-007 §3.4, INT-1 — never a direct cross-module table read):
```ts
const providers = createViewProviderRegistry()         // from @vida/core (pure, no db)
providers.register({ entityType: 'task', list: (filter) => tasks.list(filter) })  // ReadProvider
const engine = createViewEngine(providers)
const resolved = await engine.resolve(view)            // fans the filter out; degrade-never-crash (BR-11)
// then: toCollectionChrome(savedView, resolved) → CollectionView props  (see ../collection/CLAUDE.md)
```
A missing provider contributes nothing + a declared degraded note — the engine never throws mid-fan-out (BR-11).

### 3. offered-set → add-menu (Capability/Block seam — the gap `dashboard/CLAUDE.md` homes to "O2")
A Space surface derives its add-menu from the capability offered-set:
```ts
const offered = await offeredSet.resolveOfferedSet(spaceId, 'standalone')  // the Space's enabled_blocks PALETTE
// 'inline' → the union across the page's Spaces + the global editor base (non-restrictive)
```
Keep **`enabled_blocks` (the offered palette / add-menu) distinct from `block_instances` (the placements)** — curating
the palette gates *adding*, never force-deletes existing placements (ADR-008 §3.4). Standalone placements →
`toBlocks(...)` (see `../dashboard/CLAUDE.md`); inline placements → the `@vida/editor` slash-menu.

### 4. Template — fork-on-instantiate (ADR-009)
A Template is a portable seed bundle instantiated by **FORK** — a deep copy with **no `template_id` back-link** (an
instance and its source are independent from the first second):
```ts
import { createTemplatesService } from '@vida/core'          // S2 surfaced this on the barrel
const templates = createTemplatesService(db, deviceId)
const list = await templates.listTemplates()                  // present the shipped presets + user templates
// instantiate(...) / captureFromSpace(...) EXECUTION is deferred in @vida/core (S3–S5) — pulled by the first consumer.
// It returns InstantiationResult { status, seeded: string[], flagged: FlaggedMember[] } — flagged = a referenced
// capability absent on this device → render a degraded note, not a crash (IR-4/IR-5).
```
Never imply a live link to the template; the instance is a free-standing fork.

### 5. Spaces — the `enabled_blocks` palette (ADR-006/008)
A Space = `{ root tag · Views · enabled Blocks · name }`. Curate its offered palette (the add-menu source for §3):
```ts
import { createSpacesService } from '@vida/core'
const spaces = createSpacesService(db, deviceId, taggableRegistry)
await spaces.addEnabledBlock(spaceId, capabilityDefId)        // gate ADDING to the offered-set (idempotent, BR-14)
await spaces.removeEnabledBlock(spaceId, capabilityDefId)     // remove from the menu — does NOT delete placements (IR-3)
```
The **scope selector (global scope state) is #15**; the **Spaces page (list/create/edit) is #20** — not this layer.

## Invariants
- **View = read-only lens; Capability = the interactive/write mixture** — kept separate (quality-bar §4.3; ADR-008:71-77).
  The SavedView seam carries no entity write; a write (drag-to-move, inline edit) is a Capability.
- **Type + convention, no live hook** — first-consumer-pull (`ProviderRead` precedent).
- **RATIFY, don't rewrite** — the collection/dashboard adapters are frozen contracts.

## Out of scope (homed elsewhere)
Live service bootstrap → UI-3/first-consumer · per-module `ReadProvider` impls → modules #27+ · per-surface live hooks
(`useCollection`/`useDashboard`) → first consumers · Template instantiate/capture EXECUTION → `@vida/core` S3–S5 ·
scope state → #15 · Spaces page → #20.

## Verify
`pnpm --filter @vida/web test -- seams` (pure, env node).
