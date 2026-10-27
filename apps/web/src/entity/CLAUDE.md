# apps/web/src/entity — the Entity↔EntityView adapter (fe-codec-entity-facet S2)

## What this is
The `apps/web` plane of the CODEC Entity shell (#6). The ONLY place `@vida/core`'s page-ability registry
(`schema.isEntityType` / `ENTITY_TYPES`, ADR-006 SP2) meets `@vida/ui`'s presentational `EntityView` — the Tamagui-only
boundary forbids this in `@vida/ui` (BR-2). The collection/dashboard adapter precedent.

## Pattern in use
- **`offersEditor(entityType, hasPage)`** — the "registry-gated editor" gate: page-able IFF the type is registered AND a
  page exists. `@vida/ui` can't consult the registry, so the gate lives here and resolves to `editor`-slot presence.
- **`offersPageEditor(pageType)`** (notes-rescope R1, NP-10) — the PAGE-surface gate: every `PAGE_TYPE` member offers the
  editor. A source picks it with `gate: 'page'` (`hasPage` ignored); the default `'entity'` keeps `offersEditor`. Note pages use
  `'page'` — the four `*_note` types are page types but not registered entity types.
- **`action`** — the ⋯ slot (save status + menu) passed straight through to `EntityView.action`.
- **`toEntityProps(src)`** — the pure mapping entity → `EntityViewProps`; passes the `editor` slot **only when the gate is
  open** (a non-page-able entity gets no editor → the shell shows no Content tab/section).
- **`EntityModeStore`** — the merged/tabbed per-instance memory CONVENTION (storage is design-pass-open, O4;
  `createInMemoryEntityModeStore` is the testable reference impl, NOT the durable storage).
- **Deferred:** the live `useEntity(entityType, entityId)` hook (React Query → the entity + its `pages` row + the mode
  preference) is built at the FIRST consumer — no entity-page is built yet (R3).

## Imports
- `schema` (namespace) from `@vida/core` — `@vida/core` exposes the schema/registry as `export * as schema` (barrel), so
  `schema.isEntityType`, `type schema.EntityType`. NOT a bare named import.
- `EntityViewProps` / `FacetMode` / `Facet` from `@vida/ui` (the shell's Seam A).

## Spec
`docs/specs/components/ui-2-platform-views/entity-view.md` · delivery `docs/specs/foundation/fe-codec-entity-facet/`.
