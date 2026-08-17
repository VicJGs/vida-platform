// UI-4 · S1 (LIF-89) — the app-shell frame. Renders the five shell regions (shell/regions.ts) in the documented
// responsive layout on @vida/ui tokens. S1 is the SCAFFOLD: each region is a labeled placeholder slot that the later
// units fill — S2 (module dock + global bar content), S3 (command-bar overlay), S4 (onboarding). The active breakpoint
// is read reactively via Tamagui `useMedia()` (never stored — regions.ts:67); `__bp` is a test/story override so jsdom
// can assert per-breakpoint reflow without a `matchMedia` layout engine. Chrome only — no module content, no routing.
import type { ReactNode } from 'react'
import { styled, View, useMedia } from '@tamagui/core'
import { useReducedMotion } from '@vida/ui'
import { useAppShellUIStore } from '../stores/app-shell-ui-store'
import { type Breakpoint } from './breakpoints'
import {
  CONTENT_MAX_WIDTH,
  GLOBAL_BAR_MODE,
  LAYERING,
  contentGutterAt,
  dockStateAt,
  isRegionVisibleAt,
  overlayModeAt,
} from './regions'
import { GlobalBar } from './global-bar'
import { ModuleDock } from './module-dock'
import { useNavDrawer } from './use-nav-drawer'

// The shell's own structural dimensions (px) — layout constants of the chrome design, not DS spacing tokens
// (the gallery `minTileWidth` / tabs-indicator precedent: layout numbers stay numbers). Spacing/gutter/z/color/radius
// resolve to DS tokens (BR-2); these region sizes are the frame's geometry.
const DOCK_WIDTH = { sidebar: 240, rail: 64 } as const
const GLOBAL_BAR_HEIGHT = 56
const SPACES_BAR_HEIGHT = 40

// Semantic landmark regions — `render: '<tag>'` makes the styled View emit a real HTML element (the UI-1 Card
// header/footer precedent; a runtime `tag` prop is NOT honoured). `<nav>` for the dock + spaces bar, `<header>` for
// the global bar, `<main>` for the content region — the app-shell landmark structure (§XIV / shell-layout.md).
const DockNav = styled(View, { render: 'nav' })
const BarHeader = styled(View, { render: 'header' })
const SpacesNav = styled(View, { render: 'nav' })
const ContentMain = styled(View, { render: 'main' })

export interface AppShellProps {
  /** Rendered into the `content` region — the router `<Outlet/>` (mounted from routes.tsx RootComponent). */
  children?: ReactNode
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

export function AppShell({ children, __bp }: AppShellProps) {
  const bp = useActiveBreakpoint(__bp)
  const dock = dockStateAt(bp) // 'drawer' | 'rail' | 'sidebar'
  const overlay = overlayModeAt(bp) // 'sheet' | 'centered'
  const globalBarMode = GLOBAL_BAR_MODE[bp] // 'condensed' | 'full'
  const showSpaces = isRegionVisibleAt('spacesBar', bp)
  const gutter = contentGutterAt(bp)

  // S2: mobile drawer open/close + its focus/inert/Esc a11y (the hook is idle unless the drawer form is active).
  const isMobileNavOpen = useAppShellUIStore((s) => s.isMobileNavOpen)
  const setMobileNavOpen = useAppShellUIStore((s) => s.setMobileNavOpen)
  const reduced = useReducedMotion()
  const drawerOpen = dock === 'drawer' && isMobileNavOpen
  const { drawerRef } = useNavDrawer(drawerOpen, () => setMobileNavOpen(false))

  return (
    // The frame is bounded to the viewport (height 100vh + overflow hidden) so each region scrolls INDEPENDENTLY —
    // the dock and content have their own overflow, the global bar stays put, and the off-canvas drawer is clipped
    // when closed. (S1 used minHeight:100vh to FILL; S2's real dock content can exceed the viewport, so it must also
    // BOUND — else the bottom modules fall below the fold with no scroll. Visual-Gate finding, 2026-08-16.)
    <View flex={1} height="100vh" overflow="hidden" flexDirection="row" backgroundColor="$colorSurfacePrimary">
      {/* Module dock. Drawer (mobile): off-canvas (absolute) — S2 slides it in on `isMobileNavOpen` (transform x,
          animated moderate / instant under reduced-motion) with a scrim behind; `inert` while closed (useNavDrawer)
          so its links leave the tab order. Rail/sidebar (tablet+): an in-flow aside whose width reflows 64 → 240. */}
      {dock === 'drawer' ? (
        <>
          {drawerOpen ? (
            <View
              data-region="navScrim"
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              backgroundColor="$colorSurfaceInverse"
              opacity={0.4}
              zIndex={LAYERING.overlayHost}
              onPress={() => setMobileNavOpen(false)}
            />
          ) : null}
          <DockNav
            ref={drawerRef}
            aria-label="Modules"
            aria-hidden={drawerOpen ? undefined : true}
            data-region="moduleDock"
            data-dock-state={dock}
            position="absolute"
            top={0}
            bottom={0}
            left={0}
            width={DOCK_WIDTH.sidebar}
            x={drawerOpen ? 0 : -DOCK_WIDTH.sidebar}
            animation={reduced ? undefined : 'moderate'}
            overflowY="auto"
            backgroundColor="$colorSurfaceSecondary"
            zIndex={LAYERING.modalHost}
          >
            <ModuleDock dock={dock} bp={bp} />
          </DockNav>
        </>
      ) : (
        <DockNav
          aria-label="Modules"
          data-region="moduleDock"
          data-dock-state={dock}
          width={DOCK_WIDTH[dock]}
          borderRightWidth={1}
          borderColor="$colorBorderDefault"
          overflowY="auto"
          backgroundColor="$colorSurfaceSecondary"
          zIndex={LAYERING.stickyBars}
        >
          <ModuleDock dock={dock} bp={bp} />
        </DockNav>
      )}

      {/* Main column: global bar → optional spaces bar → content outlet. minWidth 0 lets it shrink beside the dock. */}
      <View flex={1} flexDirection="column" minWidth={0}>
        <BarHeader
          data-region="globalBar"
          data-bar-mode={globalBarMode}
          height={GLOBAL_BAR_HEIGHT}
          paddingHorizontal={gutter}
          justifyContent="center"
          borderBottomWidth={1}
          borderColor="$colorBorderDefault"
          backgroundColor="$colorSurfacePrimary"
          zIndex={LAYERING.stickyBars}
        >
          <GlobalBar mode={globalBarMode} onOpenMobileNav={() => setMobileNavOpen(true)} />
        </BarHeader>

        {/* Spaces bar — a reserved, empty seam, present tablet+ (unmounted on mobile per REGION_VISIBILITY). Content
            lands with the Spaces module (M1.1); S2 renders it labeled but content-free (S2-BR-i). */}
        {showSpaces ? (
          <SpacesNav
            aria-label="Spaces"
            data-region="spacesBar"
            height={SPACES_BAR_HEIGHT}
            paddingHorizontal={gutter}
            justifyContent="center"
            borderBottomWidth={1}
            borderColor="$colorBorderDefault"
          />
        ) : null}

        {/* Content — the routed Outlet, centered to the 1280 max-width with per-breakpoint gutters. */}
        <ContentMain data-region="content" flex={1} minHeight={0} overflowY="auto" paddingHorizontal={gutter} alignItems="center">
          <View width="100%" maxWidth={CONTENT_MAX_WIDTH} flex={1}>
            {children}
          </View>
        </ContentMain>
      </View>

      {/* Overlay/modal host — empty until S3 (command-bar + dialogs mount here). Unlabeled: an empty landmark would
          announce falsely (S1-BR-h). pointerEvents none so the empty host never blocks the content beneath. */}
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
      />
    </View>
  )
}
