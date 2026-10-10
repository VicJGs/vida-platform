// fe-shell (#14) · S2 (LIF-199) — the CODEC shell FRAME. Reshapes the ui-4/ux-3 five-region shell into the
// macOS/iPadOS dock⇄float inspector model (`delivery/envision.md` M1–M7). S2 builds the FRAME ONLY:
//   • a reserved top strip (the persistent bar — serif wordmark + System/Modules panel toggles + #15/#16 slots) — EC-7,
//   • a full-bleed, 1280-centered Content <Outlet/> inset below the strip — EC-9,
//   • an overlay host for ⌘K/modals — EC-8.
// The dock⇄float PANELS the toggles open are S3 (docked-inline) / S4 (floating-overlay); their bodies + the Bar-1
// content (#15) / Session HUD (#16) / ⌘K registry (#17) inject through the slots — empty-but-functional in #14.
// `[FACT: delivery/slice-map.md:19 S2; seam-contract.md §C; envision.md EC-7/8/9]`. Chrome only — composes @vida/ui + DS tokens.
import type { ReactNode } from 'react'
import { styled, Text, View, useMedia } from '@tamagui/core'
import { Button } from '@vida/ui'
import { useAppShellUIStore } from '../stores/app-shell-ui-store'
import { type Breakpoint } from './breakpoints'
import { CONTENT_MAX_WIDTH, LAYERING, PANEL_IDS, contentGutterAt, overlayModeAt, reservedTopInset, type PanelId } from './regions'

// Semantic landmarks — `render: '<tag>'` makes the styled View emit a real HTML element (the UI-1 Card header/footer
// precedent; a runtime `tag` prop is NOT honoured). The top strip is a top-level `<header>` → `role="banner"`; the
// content region is `<main>`. (The panels' own `<nav>` landmarks arrive with S3/S4.)
const BarHeader = styled(View, { render: 'header' })
const ContentMain = styled(View, { render: 'main' })

/** Human label for each nav-panel toggle (envision M1: System · Modules). */
const PANEL_LABEL: Record<PanelId, string> = { system: 'System', modules: 'Modules' }

export interface AppShellProps {
  /** The routed `<Outlet/>` — rendered full-bleed, 1280-centered, inset below the reserved top strip. */
  children?: ReactNode
  /** #15 (fe-shell-scope) — scope selector + global surfaces (incl. the ⌘K trigger). Injected into the bar; empty in #14. */
  bar1Slot?: ReactNode
  /** #16 (fe-session-hud) — the Session HUD. Injected into the bar; empty in #14. */
  hudSlot?: ReactNode
  /** #17 — ⌘K / modals. Mounted in the overlay host; self-portaling overlays still render to `<body>` (S3-BR-i). */
  overlaySlot?: ReactNode
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

export function AppShell({ children, bar1Slot, hudSlot, overlaySlot, __bp }: AppShellProps) {
  const bp = useActiveBreakpoint(__bp)
  const gutter = contentGutterAt(bp)
  const topInset = reservedTopInset(bp) // EC-7 — the reserved strip's height; content insets below it
  const overlay = overlayModeAt(bp) // 'sheet' (mobile) | 'centered' (tablet+)

  // The dock⇄float arrangement (S1 store, app-owned R5). S2 only needs `open` (to drive the toggles' pressed state);
  // the panels those toggles reveal are rendered in S3/S4.
  const placement = useAppShellUIStore((s) => s.placement)
  const togglePanel = useAppShellUIStore((s) => s.togglePanel)

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
        <Text data-region="wordmark" fontFamily="$display" fontSize="$subheading" color="$colorTextPrimary" userSelect="none">
          Vida
        </Text>

        {/* System / Modules panel toggles — flip `placement[id].open` (S1 store). The panels they reveal are S3/S4;
            at S2 the toggle is a valid stand-alone toggle button (`aria-pressed`), wired but opening nothing yet. */}
        <View flexDirection="row" alignItems="center" gap="$8" data-region="panelToggles">
          {PANEL_IDS.map((id) => (
            <Button key={id} intent="ghost" size="md" aria-pressed={placement[id].open} onPress={() => togglePanel(id)}>
              {PANEL_LABEL[id]}
            </Button>
          ))}
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

      {/* EC-9 · Content — the routed Outlet, full-bleed, centered to the 1280 max-width with per-breakpoint gutters.
          `minHeight:0` lets it shrink inside the bounded column so its own `overflowY:auto` (not the page) scrolls. */}
      <ContentMain
        data-region="content"
        flex={1}
        minHeight={0}
        overflowY="auto"
        paddingHorizontal={gutter}
        alignItems="center"
      >
        <View width="100%" maxWidth={CONTENT_MAX_WIDTH} flex={1}>
          {children}
        </View>
      </ContentMain>

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
