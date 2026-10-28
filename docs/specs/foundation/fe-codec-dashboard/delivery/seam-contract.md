# fe-codec-dashboard — Seam Contract (Decomposition Gate, Step 2)

> The two APIs that keep the planes coherent (interpretation §1 boundary). **Seam A** = the `@vida/ui` `DashboardView` props
> (what a consumer passes). **Seam B** = the `apps/web` adapter that maps the SHIPPED capability canon → Seam A. Proposed
> here; **ratified at `/contract` (Step 4)**. Grounds: interpretation §1–§3 · slice-map S1–S2 · envision EC-1…EC-8 ·
> gallery-view grid · card.tsx · internal/data-view.tsx · capability.ts (shipped `block_instances`).

## Seam A — `DashboardView` props (`@vida/ui`, presentational; S1)

```ts
// LOCAL unions — @vida/ui is Tamagui-only (no @vida/core/@vida/types dep); the ViewState-local precedent.
type CellSize = 'sm' | 'md' | 'lg' | 'full'
// structurally ≡ internal/data-view.tsx `ViewState` (byte-identical) — a PARALLEL local declaration (the Tamagui-only
// boundary forbids importing it across packages, but the renderer-state canon is identical).
type BlockState = 'loading' | 'empty' | 'error' | 'success'

interface DashboardBlock {
  id: string
  title: string // the cell header label
  size: CellSize // the span (EC-1/EC-6) — resolved by the app (Seam B), a placement attr
  state: BlockState // this block's OWN terminal state (EC-3) — the app derives (8-state), passes it
  action?: ReactNode // the ⋯ block-action SLOT (a Menu trigger etc.); the shell renders the slot, not a menu
}

interface DashboardViewProps {
  title: string // names the region + the heading
  blocks: readonly DashboardBlock[]
  renderBlock: (block: DashboardBlock) => ReactNode // the SUCCESS body only (see the ownership rule below)
  // ── slots + a11y ───────────────────────────────────────────────────────────────────────
  empty?: ReactNode // empty-DASHBOARD override (default = EmptyState, EC-5)
  emptyAction?: ReactNode // the add affordance inside the empty-dashboard state
  blockLoading?: (block: DashboardBlock) => ReactNode // optional per-block skeleton override (default = generic skeleton rows)
  blockEmpty?: (block: DashboardBlock) => ReactNode // optional per-block empty override (default = Message/EmptyState)
  blockError?: (block: DashboardBlock) => ReactNode // optional per-block error override (default = role="status" Message)
  'aria-label'?: string
  'aria-labelledby'?: string
  ref?: Ref<HTMLDivElement> // React-19 ref-as-prop (no forwardRef; non-generic shell)
}
```

**The span model (EC-1/EC-6/EC-8) — a `size`→flex resolution (gallery-view precedent, numbers tuned at `/contract`):**

```ts
// per-span flex cell — flexShrink:1 EXPLICIT (RNW defaults 0); minWidth = mobile-safe floor; maxWidth = the CAP that
// stops a lone non-`full` cell growing to full (EC-6). full = fills the row.
const SPAN: Record<CellSize, { grow: number; basis: string; min: number; max?: number }> = {
  sm: { grow: 1, basis: '25%', min: 200, max: 360 },
  md: { grow: 2, basis: '42%', min: 280, max: 520 },
  lg: { grow: 3, basis: '60%', min: 320, max: 760 }, // min < 375 content width (EC-8)
  full: { grow: 4, basis: '100%', min: 280 }, // no cap — fills
}
```

**Contract invariants:** controlled (`blocks`/per-block `state` are props; no internal state) · `size` + `state` per block
are the app's (BR-2) · the grid is RN-safe flex, never CSS grid (EC-1/EC-4) · a per-span `maxWidth` caps lone cells (EC-6) ·
floors single-column cleanly at 375 (EC-4/EC-8) · degrade-never-crash (every per-block state renders) · DIRECT semantic
tokens · reduced-motion honored.

> **⚠ RESOLVED CONTRACT POINT (pinned at the Envision review; `/contract` ratifies) — terminal-state OWNERSHIP.**
> A dashboard block is **consumer CONTENT, not a self-stated component** (a render-prop body is dumber than a full
> renderer). So **the SHELL owns the generic terminal states** — it renders a calm skeleton (`loading`), a teaching empty
> (`empty`), and a `role="status"` error (`error`) UNIFORMLY across every cell, and calls `renderBlock` **only for
> `success`**. This gives a dashboard-wide consistent degrade (EC-3) and keeps `renderBlock` simple (success body only).
> Per-block overrides (`blockLoading`/`blockEmpty`/`blockError`) are OPTIONAL escape hatches (a `chartBlock`/`timelineBlock`
> may want a shape-specific skeleton — editor.ts:34-35). **This EXTENDS Collection's shell-owned-empty to all three generic
> states** (Collection already shell-owns `empty` + `error`-when-overridden; the genuine delta here is `loading` +
> `error`-by-default) [FACT: collection-view.tsx:148-159] — correct because the ownership differs (component vs content).

## Seam B — the placement↔Dashboard adapter (`apps/web`, pure mapping + types + convention; S2)

> **S2 shipped — /contract refinements (currency):** the impl projects a structural `BlockInstanceLike`
> (`id · capability_def_id · config`) instead of importing `schema.BlockInstanceRow` (the `SavedViewLike` precedent —
> decoupled + testable), and `CapabilityDefLike` drops the `title` below because the shipped `CapabilityDefinition` has
> **no `title`** (so `toCellDescriptor` falls back `config.title ?? def.id`). See `apps/web/src/dashboard/adapter.ts` +
> `apps/web/src/dashboard/CLAUDE.md`.

```ts
// imports @vida/core/@vida/types — lives in apps/web (the Tamagui-only boundary forbids this in @vida/ui).
// ⚠ the DB row type ships, but the @vida/core barrel exposes the schema as a NAMESPACE (index.ts:62 `export * as schema`),
// so it is `schema.BlockInstanceRow`, NOT a bare named import. The capability registry/service IS flat-exported (index.ts:124).
import { schema, type CapabilityRegistry } from '@vida/core' // schema.blockInstances/BlockInstanceRow + the registry
import type { RenderTarget } from '@vida/types' // capability.ts: 'inline' | 'standalone'
type BlockInstanceRow = schema.BlockInstanceRow // ≡ the shipped row (capability.ts:66)

// a capability definition's dashboard-relevant face — structurally ≡ the shipped `CapabilityDefinition` (registry.ts:60-62),
// kept local for decoupling (the adapter only needs id/title/render_targets).
interface CapabilityDefLike {
  id: string
  title: string
  render_targets: readonly RenderTarget[] // must include 'standalone' to live on a dashboard
}

// THE pure mapping (ships now, S2): a standalone block_instances row + its PRE-RESOLVED def → a DashboardView cell
// descriptor. `size` is a PLACEMENT attr read from the instance `config` JSON (capability.ts:39-41; ADR-008:122-124) with a
// per-def default; `state` is derived by the 8-state machine from the block's own data load, passed as a prop (BR-2).
function toCellDescriptor(instance: BlockInstanceRow, def: CapabilityDefLike, state: BlockState): DashboardBlock

// THE CONVENTION (shape, not a shipped hook — R3): a module/Space composes this to drive DashboardView.
interface DashboardAdapter {
  // map the placed standalone instances → the shell's blocks. ASYNC — registry.get/list return Promises (registry.ts:53,55),
  // so defs are resolved through the registry before the pure per-row toCellDescriptor runs.
  toBlocks(
    instances: readonly BlockInstanceRow[],
    registry: CapabilityRegistry,
    states: Record<string, BlockState>,
  ): Promise<DashboardBlock[]>
  // placement writes (add / remove / move / resize) are a CAPABILITY — a block_instances write — NOT here (O1).
}
```

**Why pure-pieces + convention, not a live hook (R3):** no _built_ consumer of the Dashboard exists yet — Home #18 /
Finance / Health / the modules all ship after #5 (grep clean; all surface dirs `.gitkeep`). The Collection adapter is the
exact precedent — it ships real pure code (`toCollectionChrome`, `bindViewConfigWrites`, …) + types + convention, and
defers only the live `useCollection` React-Query hook [FACT: apps/web/src/collection/adapter.ts:36-92]. So S2 ships
`toCellDescriptor`/`toBlocks` + the `DashboardAdapter` type + a mapping test; the live `useDashboard(spaceId)` hook (React
Query over the per-block providers + `block_instances`) is built at the first consumer.

**Boundary facts:** `size` is a placement attr (instance config / def default) — resolved in `apps/web`, passed as a prop;
`state` is derived via the 8-state machine per block, passed as a prop (BR-2); `block_instances`/`capability_definitions`/
`CapabilityRegistry`/`RenderTarget` are the SHIPPED canon the adapter binds (interpretation §1), never re-invented;
placement writes are a Capability (O1), never this adapter.

## What this contract does NOT cover (homed elsewhere — slice-map "Out of scope")

Placement edit / `block_instances` writes (a Capability, O1) · the 11 `standalone` block widgets + registry wiring (O2) ·
per-module/per-Space block sets + live data wiring + the live `useDashboard` hook (module ② track / first consumer, O3) ·
the Home arrangement toggle (O4) · the Spaces page (O5) · the other archetype shells (O6).
