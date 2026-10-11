// fe-shell-scope (#15) · S3 — Bar 1 ASSEMBLY. Composes the S1 scope selector + the S2 global-surfaces forms into the two
// homes of the responsive-split (IR1, EC-5):
//   • `variant="strip"` → the persistent condensed/full chrome for the top strip (`bar1Slot`): scope (left) + the
//     surfaces strip (right), its mode resolved from the breakpoint (full ≥768 / condensed ≤375).
//   • `variant="panel"` → the expanded body for the System panel (`systemPanelSlot`): scope (prominent) above the
//     labeled surfaces list. (Account dropped — No-Guessing, slice-map S2.)
// Composition only — adds NO `@vida/ui` component (ui-4 BR-1). Mode is resolved HERE (one responsive truth; AppShell's
// `useMedia` precedent) and passed DOWN to the pure `GlobalSurfacesStrip`, which stays a function of its `mode` prop.
import { useMedia, View } from '@tamagui/core'
import type { Breakpoint } from './breakpoints'
import { ScopeSelector } from './scope-selector'
import { GlobalSurfacesStrip } from './global-surfaces-strip'
import { GlobalSurfacesList } from './global-surfaces-list'
import type { SpacesScopeRead } from './spaces-scope'

export interface GlobalBar1Props {
  /** `strip` = the top-strip chrome (bar1Slot); `panel` = the expanded System-panel body (systemPanelSlot). */
  variant: 'strip' | 'panel'
  /** The space-list read seam, forwarded to ScopeSelector. Default = the M1 stub (→ [] ⇒ global-only). */
  read?: SpacesScopeRead
  /** Test/story-only breakpoint override (mirrors AppShell.__bp) — bypasses useMedia so jsdom can assert strip mode. */
  __bp?: Breakpoint
}

export function GlobalBar1({ variant, read, __bp }: GlobalBar1Props) {
  const media = useMedia()

  if (variant === 'panel') {
    // Expanded System-panel body (EC-4): scope prominent, then the labeled surfaces nav. Column, min-width-safe.
    return (
      <View flexDirection="column" gap="$12" minWidth={0}>
        <ScopeSelector read={read} />
        <GlobalSurfacesList />
      </View>
    )
  }

  // strip (EC-5 top-strip home): scope left · spacer · surfaces right. Mode = full at tablet+ (≥768), else condensed.
  // The condensed scope is `compact` so Bar 1 co-fits the 375 strip beside the wordmark + panel toggles (S3 Visual-Gate).
  const isTabletUp = __bp ? __bp !== 'mobile' : media.tablet
  const mode = isTabletUp ? 'full' : 'condensed'
  return (
    <View flex={1} minWidth={0} flexDirection="row" alignItems="center" gap="$8">
      <ScopeSelector read={read} compact={!isTabletUp} />
      <View flex={1} minWidth={0} />
      <GlobalSurfacesStrip mode={mode} />
    </View>
  )
}
