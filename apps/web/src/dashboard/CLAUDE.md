# apps/web/src/dashboard — the placement↔Dashboard adapter (fe-codec-dashboard S2)

The `apps/web` plane of the CODEC Dashboard shell — where `@vida/core`/`@vida/types` meet `@vida/ui`'s presentational
`DashboardView` (the Tamagui-only boundary forbids this in `@vida/ui`; BR-2, the `apps/web/src/collection` precedent).

## Files

- `adapter.ts` — the documented CONVENTION + the pure pieces a module/Space uses to drive `DashboardView`:
  - `BlockInstanceLike` — a structural projection of a `block_instances` row (`id · capability_def_id · config`; ≡ the
    relevant `schema.BlockInstanceRow` fields, decoupled from sync metadata — the `SavedViewLike` precedent).
  - `parseBlockConfig` — parse the `[E]` instance `config` JSON → the placement literals the dashboard reads (`title` +
    `size: CellSize`); TOLERANT (null/malformed → `{}`, degrade-never-crash).
  - `toCellDescriptor(instance, def, state)` — PURE: a standalone block_instance + its pre-resolved def + the app-derived
    state → a `DashboardView` cell descriptor (`title` = config ?? the capability id; `size` = config ?? `md`).
  - `isStandalone(def)` — gate: a capability is placeable on a dashboard iff its `render_targets` include `standalone`.
  - `toBlocks(instances, registry, states)` — ASYNC (resolves each def through `CapabilityRegistry.get` → Promise),
    filters to `standalone`, threads each block's derived state (default `loading`), **preserves order**, and **degrades
    an unresolvable def to a skip** (never crashes the dashboard).
  - `createDashboardAdapter()` / `DashboardAdapter` — the convention a module assembles.
- `adapter.test.ts` — pure (env `node`), proves the config parse, the standalone gate, the per-row mapping + defaults,
  and `toBlocks` (resolve/filter/state/order/degrade) against a mock registry.

## Deferred (first-consumer)

The **live `useDashboard(spaceId)` hook** — React Query over `block_instances` (by space) + the per-block data providers
(each block's own load → its `ViewState` via the 8-state machine) + these pure pieces — is built at the FIRST consumer
(Home #18 / Finance), exactly the Collection adapter's deferred `useCollection` hook. No M1.2.1 Dashboard consumer is built
yet (grep clean), so S2 ships the types + convention + pure mapping + tests, wiring nothing live.

## Out of scope (homed elsewhere)

Placement WRITES (add/remove/move/resize `block_instances`) = a **Capability** (ADR-008, O1) — never this adapter. The 11
`standalone` block WIDGETS + registry wiring (O2). Per-module/per-Space block SETS (O3).
