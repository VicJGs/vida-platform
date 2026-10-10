# fe-codec-seams #13 — Seam Contract (Decomposition Gate, Step 2)

> The `@vida/core` API surface each seam exposes to apps/web, and the **consumption convention** #13 documents for it.
> All APIs are **built + exported** (except Templates — barrel gap, closed by S2). No live hook ships here (IR-1/H4):
> the convention names the shape; the first consumer builds the React Query hook over it. Every row [FACT: path:line].

## §0. Shared service-access SHAPE (type + convention; live deferred — IR-1)
- A consumer obtains an engine via an **access convention** `useXService()` whose live body (factory instantiation over
  the main-thread Drizzle-proxy) is **deferred to UI-3/first-consumer** [FACT: db/client.ts:44; db/CLAUDE.md].
- Factories, for reference (all take `db: DrizzleDb, deviceId: string`): `createViewsService` · `createViewEngine(registry?)`
  · `createViewProviderRegistry` · `createSpacesService(db,deviceId,registry)` · `createTaggableTypeRegistry` ·
  `createCapabilityRegistry` · `createCapabilityEnforcer(db,deviceId,registry)` · `createOfferedSetResolver(db,registry)`
  · `createTemplatesService` [FACT: views/service.ts:16; views/engine.ts:22; views/provider-registry.ts:12;
  spaces/service.ts:38; capability/registry.ts:49; enforcer.ts:103; offered-set.ts:17; templates/service.ts:24].
- **Convention:** reads go through React Query over a `ProviderRead<T> = () => Promise<T>` seam; no `useProviderRead`
  hook [FACT: s5-conventions.md:63-70].

## §A. SavedView seam (ADR-007) — barrel-exported [FACT: index.ts:118]
- **Types:** `ViewRow{id, space_id (null=global), name, layout:ViewLayout, filter/grouping/sort:JSON-TEXT}` [FACT:
  schema/foundation/spaces.ts:113-128]; `ViewFilter`·`ViewGrouping`·`ReadProvider{entityType, list(filter)}`·
  `ResolvedView{rows, groups, state:'loading'|'empty'|'error'|'success', degraded}` [FACT: views/types.ts:10-60].
- **Engine:** `ViewEngine.resolve(view:ViewRow): Promise<ResolvedView>` — fans filter to each registered provider,
  merges, groups, degrades missing providers (BR-11, never throws) [FACT: views/engine.ts:22-82].
- **Registry:** `ViewProviderRegistry{register, get, list}` — ships EMPTY; modules register at their build [FACT:
  provider-registry.ts:12-31; views/CLAUDE.md].
- **CRUD:** `ViewsService{createView, updateView, deleteView, getView, cloneView}` [FACT: views/service.ts:16-98].
- **Consumption convention (#13):** register a `ReadProvider` per entity_type → `engine.resolve(view)` →
  `toCollectionChrome(view, resolved)` drives `CollectionView`; layout switch persists via `ViewsService.updateView`
  (a view-config write, never an entity write — IR-2) [FACT: collection/adapter.ts:1-94].

## §B. Capability/Block seam (ADR-008) — barrel-exported [FACT: index.ts:124]
- **Definition:** `CapabilityDefinition{id, kind, render_targets:('inline'|'standalone')[], bindings, effects,
  config_schema?, terminal_states}` [FACT: capability/types.ts:1-141]; `TERMINAL_STATE=['loading','empty','error',
  'success']`.
- **Registry:** `CapabilityRegistry{register, get, list}`; `SHIPPED_CAPABILITIES`=`habit_logger` only (M1) [FACT:
  registry.ts:49-134].
- **Enforcer:** `CapabilityEnforcer{checkAction, assertPermitted, getGrant, isEnvelopeCurrent, grant, revoke}`;
  fail-closed [FACT: enforcer.ts:103-229].
- **Offered-set:** `OfferedSetResolver.resolveOfferedSet(spaceId, surface:'inline'|'standalone')` — inline=union across
  inline-capable defs; standalone=the Space's `enabled_blocks` palette [FACT: offered-set.ts:17-49].
- **Render surfaces:** `@vida/editor` = inline (TipTap node + slash-menu); `@vida/ui` = standalone (widget) [FACT:
  ADR-008:104-109; editor/extensions/integration-blocks.tsx; dashboard/adapter.ts].
- **Consumption convention (#13):** standalone — `resolveOfferedSet(space,'standalone')` → add-menu; `toBlocks(instances,
  registry, states)` gates on `isStandalone` + degrades unresolvable [FACT: dashboard/adapter.ts:1-116]. inline — the
  editor registry drives the slash-menu [FACT: editor/slash-commands.ts]. `enabled_blocks`(palette) ≠
  `block_instances`(placements) (IR-3).

## §C. Template seam (ADR-009) — **NOT yet barrel-exported (S2 closes)** [FACT: index.ts absent; templates/index.ts]
- **Types:** `InstantiationResult{status, seeded, flagged:FlaggedMember[]}`; errors `TemplateNotFound`·
  `TemplateCaptureError` [FACT: templates/types.ts:1-51]. `TemplateRow{id, name, bundle:JSON-TEXT (opaque)}` [FACT:
  schema/foundation/templates.ts:15-22].
- **CRUD (built):** `TemplatesService{createTemplate, listTemplates, getTemplate, deleteTemplate}` — no `updateTemplate`
  (fork model) [FACT: templates/service.ts:24-59].
- **Deferred in `@vida/core` (NOT #13):** `captureFromSpace` + `instantiate` fork execution + `listShipped` (S3–S5,
  first-consumer-pull) [FACT: templates/CLAUDE.md].
- **Consumption convention (#13):** barrel export (S2) → import `TemplatesService` from `@vida/core`; list templates →
  present → instantiate = a deep-copy fork with **no back-link** (IR-5); flagged members = capability-absent-on-device,
  rendered as a degraded note [FACT: ADR-009 §1; templates/types.ts FlaggedMember].

## §D. Spaces seam (ADR-006) — barrel-exported [FACT: index.ts:117]
- **Types:** `TaggableTypeRegistry{register, isRegistered, list}`; `CreateSpaceInput`; `SpaceRow{id, root_tag_id, name,
  icon?, default_view_id?, parent_space_id?}` [FACT: spaces/types.ts:10-71; schema/foundation/spaces.ts:82-95].
- **Service:** `SpacesService` — tags `{createTag,updateTag,deleteTag}`, entity-tags `{tagEntity,untagEntity}` (idem),
  entity-links `{createLink,removeLink}` (idem), spaces `{createSpace,updateSpace,deleteSpace}` (cycle-guarded),
  palette `{addEnabledBlock,removeEnabledBlock}` (idem) [FACT: spaces/service.ts:38-241].
- **Association resolver:** `AssociationResolver.resolveAssociations(ref, mode:'unified'|'separate')` [FACT:
  association-resolver.ts:76-146].
- **Consumption convention (#13):** `SpacesService` access via §0; a Space = `{root tag · Views · enabled Blocks ·
  name}`; `enabled_blocks` curation gates *adding*, never force-deletes placements [FACT: ADR-008:128-140]. Scope-STATE
  (#15) + the page (#20) are out of scope.

## §E. What #13 does NOT contract (out of scope — see slice-map)
Live service bootstrap (UI-3) · capture/instantiate execution (`@vida/core` S3–S5) · scope state (#15) · Spaces page
(#20) · per-module providers (#27+) · per-surface live hooks (first consumers) · any rendered surface.
