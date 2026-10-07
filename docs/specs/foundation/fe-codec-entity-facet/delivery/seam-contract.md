# fe-codec-entity-facet — Seam Contract (Decomposition Gate, Step 2)

> The two APIs that keep the planes coherent (interpretation §1 boundary). **Seam A** = the `@vida/ui` `EntityView` props
> (what a consumer passes). **Seam B** = the `apps/web` adapter that gates the editor via the FROZEN `@vida/core` registry +
> maps an entity → Seam A. Proposed here; **ratified at `/contract` (Step 4)**. Grounds: interpretation §1–§6 · slice-map
> S1–S2 · envision EC-1…EC-8 · collection-view.tsx · dashboard-view.tsx · tabs.tsx · internal/data-view.tsx ·
> schema/_registry.ts (shipped `ENTITY_TYPES`/`isEntityType`).

## Seam A — `EntityView` props (`@vida/ui`, presentational; S1)

```ts
// LOCAL union — @vida/ui is Tamagui-only. Editor state reuses the SHIPPED intra-package ViewState (dashboard-view.tsx:5
// imports it the same way) — NOT a parallel-named alias (critique B3).
type FacetMode = 'merged' | 'tabbed'
import type { ViewState } from '../internal/data-view'   // 'loading' | 'empty' | 'error' | 'success'

interface EntityViewProps {
  title: string                                  // the entity title — names the region + renders as the $display serif H1
  subtitle?: ReactNode                           // bio/summary line (type · counts · updated) — a slot
  action?: ReactNode                             // the ⋯ entity-action SLOT (a Menu trigger etc.)
  // ── the facet composition mode (EC-4) — CONTROLLED (the app owns + persists; per-instance memory R5/O4) ──
  mode: FacetMode
  onModeChange: (next: FacetMode) => void
  // ── the active facet in tabbed mode (critique B1) — deep-link to the Editor; hold position across a mode round-trip ──
  defaultFacet?: 'layout' | 'editor'             // default 'layout' (seeds Tabs defaultValue)
  activeFacet?: 'layout' | 'editor'              // optional controlled; + onActiveFacetChange. Ignored merged/page-less.
  onActiveFacetChange?: (next: 'layout' | 'editor') => void
  // ── the Layout facet (always present) — a composite the consumer builds (SummaryStrip + DashboardView + CollectionView) ──
  layout: ReactNode                              // the Layout body — self-states via its sub-shells (EC-1/EC-2)
  // ── the OPTIONAL Editor facet — PRESENCE is the registry gate (EC-3): offered iff the app passes it (Seam B) ──
  editor?: ReactNode                             // the Editor body (the entity's linked page = Canvas: Editor #7, composed)
  editorState?: ViewState                        // the Editor facet's own state (BR-2) — shell owns a calm page skeleton/
                                                 // teaching-empty/role="status" error; renders `editor` for success (EC-5)
  // ── tabbed-mode labels ──────────────────────────────────────────────────────────────────
  layoutLabel?: string                           // default 'Home'
  editorLabel?: string                           // default 'Content'
  'aria-label'?: string
  'aria-labelledby'?: string
  ref?: Ref<HTMLDivElement>                       // React-19 ref-as-prop (no forwardRef; non-generic shell)
}
```

**Contract invariants:** controlled (`mode` is a prop; no internal mode state) · `mode` + `editorState` are the app's (BR-2) ·
the registry gate = **`editor` presence** (absent → no Content tab in tabbed, no editor section in merged — EC-3) · tabbed
uses ui-1 `Tabs`, only the active panel mounts (EC-2) · merged stacks Layout + divider + Editor on one surface (EC-1) ·
the mode toggle is a visible `aria-pressed` header control (EC-4) · reflows single-column-clean at 375, centered on desktop
(EC-6) · degrade-never-crash (every editor state renders) · DIRECT semantic tokens · reduced-motion honored on Tabs motion (EC-7).

> **⚠ RESOLVED CONTRACT POINT (pinned at the Envision review; `/contract` ratifies) — the registry gate is SLOT PRESENCE,
> not a boolean.** `@vida/ui` cannot consult the `ENTITY_TYPES` registry (it lives in `@vida/core`, uncrossable). So the
> shell takes **no `hasEditor`/`pageAble` flag** — it offers the Editor facet **iff an `editor` node is passed** (the
> `collection-view.tsx:179` `onFilter != null → render Filter` precedent). The app (Seam B) runs `isEntityType()` + the page
> lookup and passes the slot or omits it. This keeps the boundary clean and makes the page-less state a pure render concern.

> **⚠ OPEN PRECISION (interpretation §6-2, `/contract` decides) — Editor facet: `ReactNode` slot vs `(state) => ReactNode`
> render-prop.** The Layout facet is a `ReactNode` slot (a self-stating composite — its sub-shells already thread their own
> state as props). The EDITOR facet is one page, so the shell CAN own its generic loading/empty/error (`editorState` + render
> the `editor` node only for `success`, the dashboard terminal-state-ownership precedent, dashboard-view.tsx:120-162) OR take
> a self-stating node. Proposed: `editor: ReactNode` + optional `editorState` (shell owns the generic page states) — leaning
> the dashboard way for a consistent calm degrade. Ratified at `/contract`.

## Seam B — the entity↔EntityView adapter (`apps/web`, pure gate + types + convention; S2)

```ts
// imports @vida/core — lives in apps/web (the Tamagui-only boundary forbids this in @vida/ui).
import { isEntityType } from '@vida/core'   // schema/_registry.ts:157 — the page-ability type-guard over ENTITY_TYPES

// THE pure gate (ships now, S2): does this entity get an Editor facet? Page-able iff the type is registered AND a page
// exists. (M1: `hasPage` from a pages lookup; the create-on-demand path is the live hook's.)
function offersEditor(entityType: string, hasPage: boolean): boolean
  // = isEntityType(entityType) && hasPage   [FACT: _registry.ts:5-158,157]

// THE CONVENTION (shape, not a shipped hook — R3): a module composes this to drive EntityView from an entity row.
interface EntityAdapter {
  // map an entity row + its page-ability + the editor node → EntityView props. The `editor` slot is included IFF
  // offersEditor(type, hasPage) — that is the registry gate (EC-3 logic; EC-3 presentation is S1).
  toEntityProps(args: {
    title: string
    subtitle?: ReactNode
    entityType: string
    hasPage: boolean
    editorNode?: ReactNode          // the composed Editor body (Canvas: Editor #7) — passed through iff offersEditor
    mode: FacetMode
  }): EntityViewProps

  // the merged/tabbed per-instance MEMORY (O4 — storage design-pass-open; CONVENTION only, not a schema).
  readMode(entityType: string, entityId: string): FacetMode    // default = the per-type default (quality-bar:127)
  persistMode(entityType: string, entityId: string, mode: FacetMode): void
}
```

**Why pure-pieces + convention, not a live hook (R3):** no *built* consumer of the Entity shell exists yet — the module
entity pages (Task, Habit, Project…) all ship after #6 (grep clean; all surface dirs `.gitkeep`). The Collection/Dashboard
adapters are the exact precedent — real pure code + types + convention ship; only the live React-Query hook defers [FACT:
fe-codec-dashboard seam-contract Seam B]. So S2 ships `offersEditor` + the `EntityAdapter` type + the memory convention + a
gate test; the live `useEntity(entityType, entityId)` hook (React Query over the entity + its `pages` row + the mode
preference) is built at the first consumer.

**Boundary facts:** `isEntityType`/`ENTITY_TYPES` are the SHIPPED frozen registry the adapter binds (interpretation §1),
never re-invented [FACT: packages/core/src/db/schema/_registry.ts:5-158]; the registry gate is resolved in `apps/web` and
expressed to the shell as `editor`-slot presence (never a flag crossing into `@vida/ui`); `mode` + `editorState` are the
app's, passed as props (BR-2); the merged/tabbed storage schema is design-pass-open (O4), never invented here.

## What this contract does NOT cover (homed elsewhere — slice-map "Out of scope")
The Editor facet BODY = the TipTap block canvas (Canvas: Editor #7, not a dep — O1) · the Layout sub-shell BODIES
(`DashboardView` #5 / `CollectionView` #4, composed — O2) · the page-ability registry itself (`@vida/core`, frozen — O3) ·
the merged/tabbed storage schema + the live `useEntity` hook (design-pass-open / first consumer — O4) · per-module entity
surfaces + data (module ② tracks — O5) · the Flow/Session shell that consumes #6 (fe-codec-flow-session #11 — O6).
