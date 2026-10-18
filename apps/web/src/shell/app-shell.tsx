// fe-shell (#14) · S2 (LIF-199) — the CODEC shell FRAME. Reshapes the ui-4/ux-3 five-region shell into the
// macOS/iPadOS dock⇄float inspector model (`delivery/envision.md` M1–M7). S2 builds the FRAME ONLY:
//   • a reserved top strip (the persistent bar — serif wordmark + System/Modules panel toggles + #15/#16 slots) — EC-7,
//   • a full-bleed, 1280-centered Content <Outlet/> inset below the strip — EC-9,
//   • an overlay host for ⌘K/modals — EC-8.
// The dock⇄float PANELS the toggles open are S3 (docked-inline) / S4 (floating-overlay); their bodies + the Bar-1
// content (#15) / Session HUD (#16) / ⌘K registry (#17) inject through the slots — empty-but-functional in #14.
// `[FACT: delivery/slice-map.md:19 S2; seam-contract.md §C; envision.md EC-7/8/9]`. Chrome only — composes @vida/ui + DS tokens.
import { useEffect, useRef, type ReactNode } from 'react'
import { styled, Text, View, useMedia } from '@tamagui/core'
import { LayoutDashboard, LayoutGrid, type LucideIcon } from 'lucide-react'
import { Button } from '@vida/ui'
import { useAppShellUIStore } from '../stores/app-shell-ui-store'
import { type Breakpoint } from './breakpoints'
import {
  CONTENT_MAX_WIDTH,
  DEFAULT_PLACEMENT,
  LAYERING,
  PANEL_IDS,
  contentGutterAt,
  contentVInsetAt,
  overlayModeAt,
  reservedTopInset,
  type PanelEdge,
  type PanelId,
} from './regions'
import { ShellPanel, panelDomId } from './shell-panel'
import { stubShellPrefs, type ShellPrefsRead } from './shell-prefs'

// Semantic landmarks — `render: '<tag>'` makes the styled View emit a real HTML element (the UI-1 Card header/footer
// precedent; a runtime `tag` prop is NOT honoured). The top strip is a top-level `<header>` → `role="banner"`; the
// content region is `<main>`. (The panels' own `<nav>` landmarks arrive with S3/S4.)
const BarHeader = styled(View, { render: 'header' })
const ContentMain = styled(View, { render: 'main' })

/** Human label for each nav-panel toggle (envision M1: System · Modules). */
const PANEL_LABEL: Record<PanelId, string> = { system: 'System', modules: 'Modules' }

/** Toggle glyph for the CONDENSED (mobile <768) icon-only form — a real lucide icon (shell icon pattern, tints via the
 *  ghost Button's `currentColor`), never emoji. The label stays visible at ≥768; at ≤375 it collapses to the icon so
 *  Bar 1 (#15) co-fits the strip. System = the global/inspector surface · Modules = the module grid. (fe-shell-scope S3.) */
const PANEL_ICON: Record<PanelId, LucideIcon> = { system: LayoutDashboard, modules: LayoutGrid }

/**
 * The #14 panel BODY = an empty-but-functional placeholder (envision L4): two muted lines so the panel has real
 * content-fit dimension at the Visual Gate. The real bodies — the grouped module nav (`modules`) + the #15 global
 * surfaces (`system`) — are the re-home follow-up (shell/CLAUDE.md), NOT S3.
 */
function PanelBodyPlaceholder({ id }: { id: PanelId }) {
  return (
    <>
      <Text fontFamily="$body" fontSize="$small" color="$colorTextMuted">
        {PANEL_LABEL[id]} panel
      </Text>
      <Text fontFamily="$body" fontSize="$caption" color="$colorTextMuted">
        Empty-but-functional — content lands with #15/#16.
      </Text>
    </>
  )
}

export interface AppShellProps {
  /** The routed `<Outlet/>` — rendered full-bleed, 1280-centered, inset below the reserved top strip. */
  children?: ReactNode
  /** #15 (fe-shell-scope) — scope selector + global surfaces (incl. the ⌘K trigger). Injected into the bar; empty in #14. */
  bar1Slot?: ReactNode
  /** #15 (fe-shell-scope, S3) — the expanded System-panel BODY (scope + labeled surfaces). Default ⇒ PanelBodyPlaceholder.
   *  Additive + defaulted ⇒ existing callers + shell tests stay green; `modules` keeps the placeholder (separate re-home). */
  systemPanelSlot?: ReactNode
  /** #16 (fe-session-hud) — the Session HUD. Injected into the bar; empty in #14. */
  hudSlot?: ReactNode
  /** #17 — ⌘K / modals. Mounted in the overlay host; self-portaling overlays still render to `<body>` (S3-BR-i). */
  overlaySlot?: ReactNode
  /** The `nav_preferences` placement-read seam (S5). Default = the M1 stub (→ DEFAULT). The live `nav_preferences`
   *  provider swaps in here at the first consumer (envision L5); write-back is deferred (seam-contract §D). */
  shellPrefs?: ShellPrefsRead
  /** Test/story-only breakpoint override — bypasses `useMedia()` so jsdom can assert reflow deterministically. */
  __bp?: Breakpoint
}

/** Resolve the active breakpoint from Tamagui's media state (mobile-first: the largest matching wins). */
function useActiveBreakpoint(override?: Breakpoint): Breakpoint {
  const media = useMedia()
  if (override) return override
  if (media.wide) return 'wide'
  if (media.desktop) return 'desktop'
  if (media.tablet) return 'tablet'
  return 'mobile'
}

export function AppShell({
  children,
  bar1Slot,
  systemPanelSlot,
  hudSlot,
  overlaySlot,
  shellPrefs = stubShellPrefs,
  __bp,
}: AppShellProps) {
  const bp = useActiveBreakpoint(__bp)
  const gutter = contentGutterAt(bp)
  const vinset = contentVInsetAt(bp) // top+bottom content breathing room below the strip (24/32/40, 4pt grid)
  const topInset = reservedTopInset(bp) // EC-7 — the reserved strip's height; content insets below it
  const overlay = overlayModeAt(bp) // 'sheet' (mobile) | 'centered' (tablet+)

  // The dock⇄float arrangement (S1 store, app-owned R5). S3 renders the DOCKED panels the toggles reveal (content
  // beside) + wires the mode/edge intents live (store actions from S1); the FLOATING render is S4.
  const placement = useAppShellUIStore((s) => s.placement)
  const togglePanel = useAppShellUIStore((s) => s.togglePanel)
  const setPanelMode = useAppShellUIStore((s) => s.setPanelMode)
  const setPanelEdge = useAppShellUIStore((s) => s.setPanelEdge)
  const setPlacement = useAppShellUIStore((s) => s.setPlacement)

  // S5 · persist-read seam — hydrate the store from `shellPrefs` (nav_preferences) ONCE, COLD-BOOT ONLY (B1): apply the
  // read result only while the store is still at the initial DEFAULT_PLACEMENT ref, so an already-set arrangement (a
  // live consumer or a test that setState'd placement) is NEVER clobbered by the async stub. M1 stub → DEFAULT (a
  // functional no-op that activates the read path); the live provider + write-back land at the first consumer (L5).
  const hydratedRef = useRef(false)
  useEffect(() => {
    if (hydratedRef.current) return // run once (also survives StrictMode's dev double-invoke)
    hydratedRef.current = true
    if (useAppShellUIStore.getState().placement !== DEFAULT_PLACEMENT) return // untouched-only
    // No `active`/cleanup cancel — StrictMode's fake cleanup would cancel the real read; the re-check below is the guard
    // (a zustand write is safe regardless of mount state), so the live seam hydrates in dev AND prod.
    void shellPrefs().then((p) => {
      if (useAppShellUIStore.getState().placement === DEFAULT_PLACEMENT) setPlacement(p)
    })
  }, [shellPrefs, setPlacement])

  // Refs to the bar toggles so a docked panel's ✕-close returns focus to its originating toggle (§XIV focus mgmt, N2).
  const toggleRefs = useRef<Record<PanelId, HTMLButtonElement | null>>({ system: null, modules: null })

  // The open+floating panels (S4) — rendered as modal drawers in the below-strip float layer (NOT docked). The float
  // panel self-owns scrim + focus capture/trap/restore; app-shell owns the inert background (below).
  const floatPanels = PANEL_IDS.filter((id) => placement[id].mode === 'float' && placement[id].open)
  const anyFloatOpen = floatPanels.length > 0

  // G1 — while a float drawer is open, the content/docked wrapper (NOT the top strip) is inert + aria-hidden (modal
  // background). Applied imperatively via a ref (the Dialog `setAttribute` precedent — RNW may not forward `inert`).
  const bgRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const bg = bgRef.current
    if (!bg) return
    if (!anyFloatOpen) return
    const prevAriaHidden = bg.getAttribute('aria-hidden')
    const hadInert = bg.hasAttribute('inert')
    bg.setAttribute('aria-hidden', 'true')
    bg.setAttribute('inert', '')
    return () => {
      if (prevAriaHidden === null) bg.removeAttribute('aria-hidden')
      else bg.setAttribute('aria-hidden', prevAriaHidden)
      if (!hadInert) bg.removeAttribute('inert')
    }
  }, [anyFloatOpen])

  // Render one DOCKED panel (ShellPanel, dock branch). Used inside an edge cluster.
  // The `system` panel renders the injected #15 body (scope + surfaces); `modules` keeps the placeholder (its module-nav
  // re-home is a separate unit). Shared by the docked + float render sites so both homes stay in lockstep (seam-contract §C).
  function panelBody(id: PanelId): ReactNode {
    return id === 'system' ? (systemPanelSlot ?? <PanelBodyPlaceholder id={id} />) : <PanelBodyPlaceholder id={id} />
  }

  function renderDockedPanel(id: PanelId): ReactNode {
    return (
      <ShellPanel
        key={id}
        id={id}
        title={PANEL_LABEL[id]}
        placement={placement[id]}
        onSetMode={(m) => setPanelMode(id, m)}
        onSetEdge={(e) => setPanelEdge(id, e)}
        onClose={() => {
          togglePanel(id)
          toggleRefs.current[id]?.focus()
        }}
      >
        {panelBody(id)}
      </ShellPanel>
    )
  }

  // Fold the open+docked panels AROUND the content so it sits beside them (EC-2), DOCK-TOGETHER by edge (EC-4): panels
  // sharing an edge render as ONE cluster, stacked along the cross axis (L/R edge → a column of panels; T/B → a row);
  // the cluster is content-fit (flexGrow/Shrink:0) and sits flush at the edge, Content beside. Different-edge groups nest
  // (PANEL_IDS-first-seen edge order). ⚠ RNW flex-collapse guard (BR-S3-9): every content-carrying flex child keeps
  // `flex=1 minHeight=0 minWidth=0` so a `column` flip can't collapse it to height 0.
  function foldDocked(base: ReactNode): ReactNode {
    const byEdge = new Map<PanelEdge, PanelId[]>()
    for (const id of PANEL_IDS) {
      const p = placement[id]
      if (p.mode !== 'dock' || !p.open) continue // float render = S4; closed panels don't mount
      const list = byEdge.get(p.edge)
      if (list) list.push(id)
      else byEdge.set(p.edge, [id])
    }
    let node = base
    for (const [edge, ids] of byEdge) {
      const isSideBySide = edge === 'left' || edge === 'right' // container row; T/B → column
      const panelFirst = edge === 'left' || edge === 'top'
      // The dock-together cluster: panels at this edge stacked along the CROSS axis of the container.
      const cluster = (
        <View
          key={edge}
          data-dock-edge={edge}
          flexGrow={0}
          flexShrink={0}
          flexDirection={isSideBySide ? 'column' : 'row'}
        >
          {ids.map((id) => renderDockedPanel(id))}
        </View>
      )
      node = (
        <View flex={1} minHeight={0} minWidth={0} flexDirection={isSideBySide ? 'row' : 'column'}>
          {panelFirst ? cluster : null}
          {node}
          {panelFirst ? null : cluster}
        </View>
      )
    }
    return node
  }

  return (
    // Bounded to the viewport (height 100vh + overflow hidden) so Content scrolls INDEPENDENTLY beneath the pinned
    // top strip — the strip stays put, Content owns its own overflow, and floating panels/overlays (S4/#17) layer on top.
    <View height="100vh" overflow="hidden" flexDirection="column" backgroundColor="$colorSurfacePrimary">
      {/* EC-7 · the reserved top strip — the persistent bar. A top-level <header> ⇒ role="banner". Content and any
          docked-panel header (S3) inset BELOW it, so a control never collides with content. */}
      <BarHeader
        data-region="topStrip"
        data-top-inset={topInset}
        height={topInset}
        flexDirection="row"
        alignItems="center"
        gap="$12"
        paddingHorizontal={gutter}
        borderBottomWidth={1}
        borderColor="$colorBorderDefault"
        backgroundColor="$colorSurfacePrimary"
        zIndex={LAYERING.stickyBars}
      >
        {/* Serif wordmark — EC-11 preset identity: `$display` flips Spectral/Fraunces/Source-Serif per preset. */}
        <Text
          data-region="wordmark"
          fontFamily="$display"
          fontSize="$subheading"
          color="$colorTextPrimary"
          userSelect="none"
        >
          Vida
        </Text>

        {/* System / Modules panel toggles — flip `placement[id].open` (S1 store). Now a docked panel RENDERS (S3), the
            toggle is a DISCLOSURE: `aria-expanded` reflects open; `aria-controls` points at the rendered docked panel
            (omitted while floating — the float render + its id arrive in S4). g2 S2 forward-note. */}
        <View flexDirection="row" alignItems="center" gap="$8" data-region="panelToggles">
          {PANEL_IDS.map((id) => {
            const p = placement[id]
            // ≤375 the strip is tight (wordmark + both toggles + Bar 1 #15 + HUD #16): collapse the toggle to its icon
            // (label → aria-label) so Bar 1 co-fits (S3 Visual-Gate-caught). Text label stays at ≥768 (desktop unchanged).
            const ToggleIcon = PANEL_ICON[id]
            const iconOnly = bp === 'mobile'
            return (
              <Button
                key={id}
                ref={(el) => {
                  toggleRefs.current[id] = el as HTMLButtonElement | null
                }}
                intent="ghost"
                size="md"
                aria-label={iconOnly ? PANEL_LABEL[id] : undefined}
                leading={iconOnly ? <ToggleIcon size={18} aria-hidden="true" /> : undefined}
                // Disclosure — S4 widened from docked-only to BOTH modes: an open panel always renders a region
                // (docked inline OR floating drawer), both carrying `panelDomId(id)`. `aria-expanded` is honest for both.
                aria-expanded={p.open}
                aria-controls={p.open ? panelDomId(id) : undefined}
                // A float panel is a modal dialog ⇒ signal it (g2 S4 CONFIRMED-6).
                aria-haspopup={p.mode === 'float' ? 'dialog' : undefined}
                // While ANY float drawer is open, the bar leaves the keyboard tab order so the drawer's focus trap is
                // COMPLETE (no tabbable sibling) + consistent with aria-modal (g2 S4 CONFIRMED-1/2). Still pointer-
                // clickable (re-toggle) + `.focus()`-able (focus-return on close).
                tabIndex={anyFloatOpen ? -1 : undefined}
                onPress={() => togglePanel(id)}
              >
                {iconOnly ? undefined : PANEL_LABEL[id]}
              </Button>
            )
          })}
        </View>

        {/* #15 — Bar-1 content (scope selector + global surfaces incl. the ⌘K trigger). Empty-but-functional in #14:
            `flex={1}` claims the row's free space so the HUD sits hard-right even while the slot is empty. */}
        <View flex={1} minWidth={0} flexDirection="row" alignItems="center" data-region="bar1Slot">
          {bar1Slot}
        </View>

        {/* #16 — the Session HUD. Empty-but-functional slot in #14. */}
        <View flexDirection="row" alignItems="center" data-region="hudSlot">
          {hudSlot}
        </View>
      </BarHeader>

      {/* The below-strip region (position:relative) hosts the docked composition + the float drawer layer. */}
      <View flex={1} minHeight={0} position="relative">
        {/* EC-2/EC-9 · the content/docked wrapper — the inert target while a float drawer is open (G1). `foldDocked`
            wraps Content so every open+docked panel sits flush at its edge with Content beside (EC-2); no docked panels ⇒
            Content is the wrapper's sole child. `minHeight/minWidth:0` let Content shrink beside a docked panel + survive
            a `column` flip (BR-S3-9). */}
        <View
          ref={(el) => {
            bgRef.current = (el as unknown as HTMLElement | null) ?? null
          }}
          flex={1}
          minHeight={0}
          minWidth={0}
          flexDirection="column"
        >
          {foldDocked(
            <ContentMain
              data-region="content"
              flex={1}
              minHeight={0}
              minWidth={0}
              overflowY="auto"
              paddingHorizontal={gutter}
              paddingVertical={vinset}
              alignItems="center"
            >
              <View width="100%" maxWidth={CONTENT_MAX_WIDTH} flex={1}>
                {children}
              </View>
            </ContentMain>,
          )}
        </View>

        {/* EC-3/EC-6 · the FLOAT drawer layer — an absolute overlay over the below-strip region (so Content keeps its
            width underneath, M3). Each open+floating panel brings its own scrim + modal drawer (ShellPanel float). At
            `$overlay` (above content; ⌘K's Dialog self-portals to <body> at `$modal`, so it still wins). Mounted only
            when a float panel is open.
            ⚠ Concurrent floats (two scrims/traps) are a KNOWN S5 concern but UI-UNREACHABLE in S4: once one panel floats,
            the inert wrapper (G1) covers the docked region, so a 2nd panel can only be opened DOCKED-inside-inert — its
            Float control is never reachable. Two floats are only state-reachable via the hydration seam; S5 coordinates
            dock-together + multi-panel. (So we render every floatPanel — no silent-drop guard that S5 would have to undo.) */}
        {anyFloatOpen ? (
          <View
            data-region="floatLayer"
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            zIndex={LAYERING.overlayHost}
          >
            {floatPanels.map((id) => (
              <ShellPanel
                key={id}
                id={id}
                title={PANEL_LABEL[id]}
                placement={placement[id]}
                onSetMode={(m) => setPanelMode(id, m)}
                onSetEdge={(e) => setPanelEdge(id, e)}
                // Dismiss (Esc/scrim/✕ all route here) → close + RETURN focus to the bar toggle. Reliable for every open
                // path incl. the in-panel Dock→Float switch (g2 S4 #1 — capture-restore would grab <body> there).
                onClose={() => {
                  togglePanel(id)
                  toggleRefs.current[id]?.focus()
                }}
              >
                {panelBody(id)}
              </ShellPanel>
            ))}
          </View>
        ) : null}
      </View>

      {/* EC-8 · Overlay host — ⌘K / modals mount here at the `$overlay` z, above Content (and above the S4 panels).
          `data-overlay-mode` drives sheet (mobile) vs centered (tablet+). UI-1 overlays SELF-PORTAL to <body> (Dialog's
          own portal root), so this region's DOM stays empty (S3-BR-i); `pointerEvents:none` keeps the empty marker from
          ever blocking the content beneath. Unlabeled: an empty landmark would announce falsely. */}
      <View
        data-region="overlayHost"
        data-overlay-mode={overlay}
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        pointerEvents="none"
        zIndex={LAYERING.overlayHost}
      >
        {overlaySlot}
      </View>
    </View>
  )
}
