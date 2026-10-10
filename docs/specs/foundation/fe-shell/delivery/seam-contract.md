# Seam Contract — fe-shell (CODEC #14)

> Entity Delivery Flow ② · Step 2. The contracts the shell exposes/consumes. PROPOSED — refined per slice at `/contract`.
> fe-shell is presentational chrome in `apps/web/src/shell`; the "seams" are the placement MODEL, the `ShellPanel`
> component contract, the injection SLOTS (#15/#16/#17), and the `nav_preferences` `ProviderRead`.

## A · Placement model (S1 — `shell/regions.ts`, data/logic only)
```ts
type PanelId = 'system' | 'modules'
type PanelMode = 'dock' | 'float'
type Edge = 'left' | 'right' | 'top' | 'bottom'
interface PanelPlacement { mode: PanelMode; edge: Edge; open: boolean }
type ShellPlacement = Record<PanelId, PanelPlacement>

// content-fit + reflow predicates (the typed model the chrome renders against)
const DEFAULT_PLACEMENT: ShellPlacement // both closed, dock/left (envision L1)
function panelAxis(edge: Edge): 'vertical' | 'horizontal'      // L/R→vertical, T/B→horizontal (EC-5)
function isOverlay(p: PanelPlacement): boolean                  // mode==='float' (EC-3)
function reservedTopInset(bp: Breakpoint): number              // the reserved strip (EC-7)
```
Extends `app-shell-ui-store` (app-owned, R5): `placement: ShellPlacement` + `setPanelMode/​setPanelEdge/​togglePanel`.
Current breakpoint stays `useMedia()` (never stored).

## B · `ShellPanel` component (S3/S4 — `shell/shell-panel.tsx`, apps/web)
```ts
interface ShellPanelProps {
  id: PanelId
  title: ReactNode               // 'System' | 'Modules' (wordmark-adjacent)
  placement: PanelPlacement      // from the store (BR-2 state-as-prop)
  children: ReactNode            // the panel BODY slot — #15 (system) / nav (modules) inject here
  onSetMode?: (m: PanelMode) => void   // Dock ⇄ Float   (intent only, R5/IR-5)
  onSetEdge?: (e: Edge) => void        // rearrange to an edge (intent only)
  onClose?: () => void
}
```
- **Docked** (`mode:'dock'`): inline flush, no scrim, no elevation; content sits beside (EC-2).
- **Floating** (`mode:'float'`): overlay — scrim + `shadow.overlay` Level-3; Esc/click-scrim/re-toggle → `onClose`;
  focus→trigger (EC-3/EC-6).
- Header = two tidy rows (grip+title+✕ · `Dock|Float` + 4-edge picker), **contained, no overflow** (EC-4/EC-7).
- Content-fit: sizes to `children` (2–3 col / 1–4 row); edge only when needed (EC-5).

## C · Frame slots (S2 — `shell/app-shell.tsx`)
```ts
interface AppShellProps {
  children: ReactNode            // the routed <Outlet/> (full-bleed, 1280-centered)
  bar1Slot?: ReactNode           // #15 — scope selector + 6 global surfaces (empty-but-functional placeholder in #14)
  hudSlot?: ReactNode            // #16 — Session HUD (placeholder in #14)
  overlaySlot?: ReactNode        // #17 — ⌘K / modals mount into the overlay host
}
```
The persistent bar renders the wordmark + `System`/`Modules` toggles + a ⌘K slot; Content full-bleed below the reserved
top strip; Overlay host hosts `overlaySlot`.

## D · Consumed seam — `nav_preferences` (L5, `ProviderRead`)
```ts
// read placement prefs; M1 STUB → DEFAULT_PLACEMENT (deny-safe; live persistence = first consumer)
type ShellPrefsRead = ProviderRead<ShellPlacement>
```
Never a direct table read (`providers/CLAUDE.md`); a write-intent seam the live hook binds later.

## Two refinements already pinned (vs the pre-envision draft)
1. The panels are **dock⇄float** (not fixed/inline-only nor overlay-only) — the macOS-inspector model (envision M1–M3).
2. **Bottom** is a first-class edge (envision M4 / EC-4); the full set is Left·Right·Top·Bottom.

## Deviations / open
- `ShellPanel` stays in `apps/web/src/shell` (one consumer, ui-4 BR-1) — not a `@vida/ui` component. If a 2nd consumer
  appears, re-home (rule-of-three).
- `ShellPlacement`/`Edge` are local `apps/web/src/shell` types (no `@vida/types` dep — the Tamagui-only boundary).
- #15/#16/#17 contents are slots; their real content + live `nav_preferences` persistence are those units' / first consumer's.
