// Shell region + reflow model — UX-3 (LIF-92). This is UX-3's NOVEL design content: how each shell region composes
// and reflows across the design.md §X breakpoints. (The breakpoint/container VALUES live in breakpoints.ts, applied
// from design.md; the reflow BEHAVIOUR here is not in any standard — it is the shell's own layout design.)
// Data-only, imports ONLY ./breakpoints. Rendering is UI-4; this is the typed model UI-4 renders against.
import { type Breakpoint, BREAKPOINT_ORDER, CONTENT_MAX_WIDTH, SIDE_PADDING } from './breakpoints'

/** The persistent regions of the shell frame. `[FACT: ia.md:98-107,152-154]` */
export type ShellRegion = 'moduleDock' | 'globalBar' | 'spacesBar' | 'content' | 'overlayHost'

/** The module dock's three responsive forms. The dock ⇒ the left sidebar the `isSidebarOpen` UI state governs. */
export type DockState = 'drawer' | 'rail' | 'sidebar'

/** The overlay/modal host's two responsive forms. */
export type OverlayMode = 'sheet' | 'centered'

/** Dock reflow: off-canvas drawer (mobile) → collapsed icon rail (tablet) → full sidebar (desktop+). */
export const DOCK_STATE: Record<Breakpoint, DockState> = {
  mobile: 'drawer',
  tablet: 'rail',
  desktop: 'sidebar',
  wide: 'sidebar',
}

/** Overlay host: full-screen sheet on mobile, centered overlay from tablet up. */
export const OVERLAY_MODE: Record<Breakpoint, OverlayMode> = {
  mobile: 'sheet',
  tablet: 'centered',
  desktop: 'centered',
  wide: 'centered',
}

/** Global bar: condensed on mobile (⌘K → search icon + overflow), full from tablet up. */
export const GLOBAL_BAR_MODE: Record<Breakpoint, 'condensed' | 'full'> = {
  mobile: 'condensed',
  tablet: 'full',
  desktop: 'full',
  wide: 'full',
}

/**
 * Per-region visibility across breakpoints. The Spaces bar is HIDDEN on mobile and a reserved (empty in M1.0) region
 * from tablet up — its content lands with the Spaces module (M1.1). Every other region is present at every width.
 */
export const REGION_VISIBILITY: Record<ShellRegion, Record<Breakpoint, boolean>> = {
  moduleDock: { mobile: true, tablet: true, desktop: true, wide: true },
  globalBar: { mobile: true, tablet: true, desktop: true, wide: true },
  spacesBar: { mobile: false, tablet: true, desktop: true, wide: true },
  content: { mobile: true, tablet: true, desktop: true, wide: true },
  overlayHost: { mobile: true, tablet: true, desktop: true, wide: true },
}

/**
 * Layering & elevation — REFERENCES into the DS token scales (resolved by the renderer, not numbers here).
 * `[FACT: tokens.ts:9 zIndex; design.md §V radius+elevation]`. Sticky bars at `$sticky`; the overlay host at
 * `$overlay`, the modal host at `$modal`; overlay radii modal `$lg`(12) / drawer `$xl`(16); Level-3 elevation
 * (dark mode replaces shadow with border + bg per design.md §V:193).
 */
export const LAYERING = {
  stickyBars: '$sticky',
  overlayHost: '$overlay',
  modalHost: '$modal',
  overlayRadius: { modal: '$lg', drawer: '$xl' },
  elevation: 'level-3',
} as const

/**
 * The RESERVED shell UI-state shape UI-4 implements (types only — no zustand here). The current breakpoint is read
 * reactively via Tamagui `useMedia()`, NOT stored. UI-4 extends `stores/app-shell-ui-store.ts` with these; UX-3 does
 * not modify the store. `[FACT: PLAN §2g; app-shell-ui-store.ts]`
 */
export interface ShellUIStateContract {
  /** Full sidebar (desktop) expanded vs collapsed — the existing `app-shell-ui-store` field. */
  isSidebarOpen: boolean
  /** The mobile off-canvas dock drawer open/closed. */
  isMobileNavOpen: boolean
}

/** The module dock's state at a given breakpoint. */
export function dockStateAt(bp: Breakpoint): DockState {
  return DOCK_STATE[bp]
}

/** The overlay/modal host's mode at a given breakpoint. */
export function overlayModeAt(bp: Breakpoint): OverlayMode {
  return OVERLAY_MODE[bp]
}

/** Whether a region is present at a given breakpoint. */
export function isRegionVisibleAt(region: ShellRegion, bp: Breakpoint): boolean {
  return REGION_VISIBILITY[region][bp]
}

/**
 * Content side padding (gutter) at a breakpoint. `wide` shares the desktop gutter (32); the content's 1280 centered
 * max-width ({@link CONTENT_MAX_WIDTH}) is a GLOBAL rule, not a per-breakpoint toggle. `[FACT: design.md §X:224-227]`
 */
export function contentGutterAt(bp: Breakpoint): number {
  return SIDE_PADDING[bp === 'wide' ? 'desktop' : bp]
}

/** Re-export so consumers get the global content cap alongside the region model. */
export { CONTENT_MAX_WIDTH }

/** All regions, in a stable order — for iteration by the renderer. */
export const SHELL_REGIONS: readonly ShellRegion[] = [
  'moduleDock',
  'globalBar',
  'spacesBar',
  'content',
  'overlayHost',
]

/** Re-export the breakpoint order so the renderer can drive both from one import. */
export { BREAKPOINT_ORDER }

// ── fe-shell (#14) · the dock⇄float panel placement model ─────────────────────────────────────────────────────────
// The CODEC reshape of the shell nav: the two bars become macOS/iPadOS-inspector panels — each toggles between DOCKED
// (inline, content beside) and FLOATING (overlay over full-bleed content), rearrangeable to any edge, content-fit.
// `[FACT: delivery/envision.md M1–M7; frontend-quality-bar §4.1:103; p6-organization-map.html:135]`. Data-only (as the
// rest of this file); the chrome (app-shell.tsx / shell-panel.tsx) renders against it. Bar 1/HUD/⌘K CONTENT is #15/#16/#17.

/** The two user-rearrangeable nav panels. `system` = scope + global surfaces (#15 content); `modules` = the grouped nav. */
export type PanelId = 'system' | 'modules'
/** Docked = inline flush in the frame (content beside); floating = overlay over full-bleed content (scrim + elevation). */
export type PanelMode = 'dock' | 'float'
/** The edge a panel is pinned/floated at — any of the four (M4 / EC-4, incl. bottom). */
export type PanelEdge = 'left' | 'right' | 'top' | 'bottom'

/** One panel's placement: its mode, its edge, and whether it is currently open. */
export interface PanelPlacement {
  mode: PanelMode
  edge: PanelEdge
  open: boolean
}
/** Per-panel placement — the session arrangement (app-owned, R5); hydrated from `nav_preferences` (M1 stub → DEFAULT). */
export type ShellPlacement = Record<PanelId, PanelPlacement>

/** Cold-start default (M1 / envision L1): both panels CLOSED, docked to the left — content full-bleed until toggled. */
export const DEFAULT_PLACEMENT: ShellPlacement = {
  system: { mode: 'dock', edge: 'left', open: false },
  modules: { mode: 'dock', edge: 'left', open: false },
}

/** All panel ids, stable order, for iteration by the renderer. */
export const PANEL_IDS: readonly PanelId[] = ['system', 'modules']

/** A panel's content axis: Left/Right stack vertically; Top/Bottom lay out horizontally (content-fit, EC-5). */
export function panelAxis(edge: PanelEdge): 'vertical' | 'horizontal' {
  return edge === 'top' || edge === 'bottom' ? 'horizontal' : 'vertical'
}

/** Whether a placement renders as an OVERLAY (floating, scrim + elevation) vs INLINE (docked, content beside). */
export function isOverlay(p: PanelPlacement): boolean {
  return p.mode === 'float'
}

/**
 * The reserved top strip (the persistent bar). Content AND any DOCKED-panel header inset below it, so a control never
 * collides with content (M7 / EC-7). On the §IV 4pt grid; the condensed mobile bar is a touch shorter.
 */
export function reservedTopInset(bp: Breakpoint): number {
  return bp === 'mobile' ? 52 : 56 // 13×4 · 14×4
}
