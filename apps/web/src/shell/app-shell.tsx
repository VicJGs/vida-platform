// UI-4 · S1 (LIF-89) — the app-shell frame. Renders the five shell regions (shell/regions.ts) in the documented
// responsive layout on @vida/ui tokens. S1 is the SCAFFOLD: each region is a labeled placeholder slot that the later
// units fill — S2 (module dock + global bar content), S3 (command-bar overlay), S4 (onboarding). The active breakpoint
// is read reactively via Tamagui `useMedia()` (never stored — regions.ts:67); `__bp` is a test/story override so jsdom
// can assert per-breakpoint reflow without a `matchMedia` layout engine. Chrome only — no module content, no routing.
import type { ReactNode } from 'react'
import { styled, Text, View, useMedia } from '@tamagui/core'
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

function RegionLabel({ children }: { children: ReactNode }) {
  return (
    <Text fontSize={12} color="$colorTextMuted" padding={8}>
      {children}
    </Text>
  )
}

export function AppShell({ children, __bp }: AppShellProps) {
  const bp = useActiveBreakpoint(__bp)
  const dock = dockStateAt(bp) // 'drawer' | 'rail' | 'sidebar'
  const overlay = overlayModeAt(bp) // 'sheet' | 'centered'
  const globalBarMode = GLOBAL_BAR_MODE[bp] // 'condensed' | 'full'
  const showSpaces = isRegionVisibleAt('spacesBar', bp)
  const gutter = contentGutterAt(bp)

  return (
    <View flex={1} minHeight="100vh" flexDirection="row" backgroundColor="$colorSurfacePrimary">
      {/* Module dock. Drawer (mobile): off-canvas (absolute, slid out) so it takes no content width — the open
          toggle is S2's. Rail/sidebar (tablet+): an in-flow aside whose width reflows 64 → 240. */}
      {dock === 'drawer' ? (
        <DockNav
          aria-label="Modules"
          data-region="moduleDock"
          data-dock-state={dock}
          position="absolute"
          top={0}
          bottom={0}
          left={0}
          width={DOCK_WIDTH.sidebar}
          x={-DOCK_WIDTH.sidebar}
          backgroundColor="$colorSurfaceSecondary"
          zIndex={LAYERING.modalHost}
        >
          <RegionLabel>Dock · drawer</RegionLabel>
        </DockNav>
      ) : (
        <DockNav
          aria-label="Modules"
          data-region="moduleDock"
          data-dock-state={dock}
          width={DOCK_WIDTH[dock]}
          borderRightWidth={1}
          borderColor="$colorBorderDefault"
          backgroundColor="$colorSurfaceSecondary"
          zIndex={LAYERING.stickyBars}
        >
          <RegionLabel>Dock · {dock}</RegionLabel>
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
          <RegionLabel>Global bar · {globalBarMode}</RegionLabel>
        </BarHeader>

        {/* Spaces bar — a reserved seam, present tablet+ (unmounted on mobile per REGION_VISIBILITY). */}
        {showSpaces ? (
          <SpacesNav
            aria-label="Spaces"
            data-region="spacesBar"
            height={SPACES_BAR_HEIGHT}
            paddingHorizontal={gutter}
            justifyContent="center"
            borderBottomWidth={1}
            borderColor="$colorBorderDefault"
          >
            <RegionLabel>Spaces bar</RegionLabel>
          </SpacesNav>
        ) : null}

        {/* Content — the routed Outlet, centered to the 1280 max-width with per-breakpoint gutters. */}
        <ContentMain data-region="content" flex={1} minHeight={0} paddingHorizontal={gutter} alignItems="center">
          <View width="100%" maxWidth={CONTENT_MAX_WIDTH} flex={1}>
            {children}
          </View>
        </ContentMain>
      </View>

      {/* Overlay/modal host — empty in S1 (S3 command-bar + dialogs mount here). Unlabeled: an empty landmark would
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
