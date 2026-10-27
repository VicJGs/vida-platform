import { useEffect, useId, useState, type ReactNode, type Ref } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { Button } from './button'
import { Menu } from './menu'
import { EmptyState } from './empty-state'
import { warnMissingName, type ViewState } from '../internal/data-view'

// ============================================================================
// CollectionView — the CODEC Collection shell (fe-codec-collection S1).
// "A Saved View rendered in a view-mode" — the workhorse archetype shell
// (decomposition.md:29 §1.2). COMPOSES the 7 shipped view-mode renderers via a
// render-prop; it is NOT a renderer (it never renders rows). Presentational,
// state-as-prop (BR-2); @vida/ui has no @vida/core / @vida/types dep, so the
// `layout` type is a LOCAL union ≡ VIEW_LAYOUT (the ViewState-local precedent).
// Spec: docs/specs/components/ui-2-platform-views/collection-view.md.
//
// NON-GENERIC: the shell holds no `items` (the consumer's `renderView` owns the
// data + the renderer's real props), so there is no <T> to erase → a plain
// component + React-19 ref-as-prop (no forwardRef needed). The data-specific
// prop shapes (table→columns, board→groups, graph→nodes…) stay in renderView.
// ============================================================================

/** LOCAL union ≡ @vida/types VIEW_LAYOUT — @vida/ui is Tamagui-only (no @vida/types dep); structural typing makes a real
 *  `ViewLayout` value assignable with no import (the `ViewState` precedent, internal/data-view.tsx). */
export type ViewLayout = 'list' | 'table' | 'board' | 'gallery' | 'calendar' | 'graph' | 'timeline'

/** Layouts whose `empty` is a DESIGNED structure (keep the renderer's own empty) rather than an absence (→ the
 *  teaching-invitation EmptyState). `calendar`'s empty is the month grid with no chips [calendar-view.tsx]. A single
 *  documented rule (not per-consumer) — the critic's empty-ownership contract point, resolved (collection-view.md). */
const DESIGNED_EMPTY_LAYOUTS: readonly ViewLayout[] = ['calendar']

/** The `tablet` breakpoint (config.media `tablet: { minWidth: 768 }`) — below it, the switcher condenses to a Menu.
 *  A bespoke matchMedia hook (mirrors `use-reduced-motion.ts`) read AT RENDER — Tamagui's `useMedia()` inits its media
 *  state at config-import time, so it isn't movable by a test matchMedia mock; this is. Defaults to the full toolbar
 *  when matchMedia is absent (SSR/none) — all controls visible rather than hidden behind a menu. */
const TABLET_MIN_WIDTH = 768
function useTabletUp(): boolean {
  const [tabletUp, setTabletUp] = useState(() =>
    typeof window === 'undefined' || typeof window.matchMedia !== 'function'
      ? true
      : window.matchMedia(`(min-width: ${TABLET_MIN_WIDTH}px)`).matches,
  )
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(`(min-width: ${TABLET_MIN_WIDTH}px)`)
    const onChange = () => setTabletUp(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return tabletUp
}

const LAYOUT_LABEL: Record<ViewLayout, string> = {
  list: 'List',
  table: 'Table',
  board: 'Board',
  gallery: 'Gallery',
  calendar: 'Calendar',
  graph: 'Graph',
  timeline: 'Timeline',
}

export interface CollectionViewProps {
  /** The collection's name (e.g. 'Tasks') — a string so it can name the region (aria-labelledby) + render as the title. */
  title: string
  /** notes-rescope R3: the title element (`tabIndex=-1`) — a focus target (e.g. after a recovered read). */
  titleRef?: Ref<HTMLElement>
  /** Result count — shown only in `success` (honest; `—` otherwise, no fake number while loading/empty/error). */
  count?: number
  /** The current view-mode (CONTROLLED — the app owns the state + persists via ViewsService). */
  layout: ViewLayout
  /** The AVAILABLE view-modes (a subset of the 7); array order = the switcher display order. */
  layouts: readonly ViewLayout[]
  /** A view-config change (NOT an entity write) — the app persists via ViewsService + re-resolves (Seam B). */
  onLayoutChange: (next: ViewLayout) => void
  /** Renders the ACTIVE layout's renderer with its real props — keeps CollectionView agnostic of the 7 differing shapes
   *  (table→columns, board→groups+renderCard, graph→nodes/edges…) AND free of any @vida/core type. `state` is threaded. */
  renderView: (layout: ViewLayout, state: ViewState) => ReactNode
  /** Resolved terminal state (the app derives via the 8-state machine + passes it — BR-2). */
  state: ViewState
  /** OPTIONAL collection-level empty override (default = a teaching-invitation EmptyState) — ignored for a
   *  DESIGNED_EMPTY_LAYOUT (calendar keeps its grid). */
  empty?: ReactNode
  /** OPTIONAL error override (default = the active renderer's own error via renderView). */
  error?: ReactNode
  // ── S2: view-config chrome ENTRY POINTS (the logic is the app's / ViewsService's, NOT here) ──
  /** Opens the filter editor (filtering is the View Engine's). Omit → no Filter control. */
  onFilter?: () => void
  /** A filter is applied → a badge on the Filter control. */
  filterActive?: boolean
  /** DISPLAY of the current sort, e.g. 'Due ↑' (the sort is resolved upstream). */
  sortLabel?: ReactNode
  /** Opens the sort control. Omit → no Sort control. */
  onSort?: () => void
  /** The `+` — create/clone a SavedView (ViewsService). Omit → no new-view control. */
  onNewView?: () => void
  /** Accessible name for the region (defaults to the visible title via aria-labelledby). */
  'aria-label'?: string
  'aria-labelledby'?: string
  /** React-19 ref-as-prop → the region element. */
  ref?: Ref<HTMLDivElement>
}

// ── styled hosts (unnamed → base theme; no sub-theme — the LV-3 convention) ─────────────────────────────
const CollectionRoot = styled(View, { flexDirection: 'column', gap: '$12', width: '100%' })
const ChromeRow = styled(View, {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '$8',
})
const TitleGroup = styled(View, { flexDirection: 'row', alignItems: 'baseline', gap: '$8' })
// The view-config entry points (S2) — right-aligned in the chrome row; wraps before crushing at narrow widths.
const ChromeActions = styled(View, { flexDirection: 'row', alignItems: 'center', gap: '$4', flexWrap: 'wrap' })
// The switcher toolbar (tablet+). Mobile condenses to a Menu (shell global-bar control-reflow precedent).
const SwitcherBar = styled(View, { flexDirection: 'row', alignItems: 'center', gap: '$4' })

export function CollectionView({
  title,
  titleRef,
  count,
  layout,
  layouts,
  onLayoutChange,
  renderView,
  state,
  empty,
  error,
  onFilter,
  filterActive,
  sortLabel,
  onSort,
  onNewView,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ref,
}: CollectionViewProps) {
  // The visible title names the region when no explicit name is given (the data-view accessible-name convention).
  const titleId = useId()
  const resolvedLabelledby = ariaLabelledby ?? (ariaLabel == null ? titleId : undefined)
  if (process.env.NODE_ENV !== 'production') warnMissingName('CollectionView', ariaLabel, resolvedLabelledby)

  // Condense the switcher below tablet (<768) — a row of controls reflows to an overflow/menu (shell-layout.md:67),
  // NOT wrap (no precedent) and NOT horizontal-scroll (that's the wide-DATA pattern). ≥44×44 targets hold either way.
  const condensed = !useTabletUp()

  // ── body: state → renderer, with the resolved empty-ownership rule (collection-view.md) ──────────────
  const designedEmpty = DESIGNED_EMPTY_LAYOUTS.includes(layout)
  let body: ReactNode
  if (state === 'empty' && !designedEmpty) {
    // Consistent collection-level teaching-invitation empty (EC-3) — consumer override wins; else a generic default.
    body = empty ?? (
      <EmptyState title="Nothing here yet">Items you add will show up here.</EmptyState>
    )
  } else if (state === 'error' && error != null) {
    body = error // consumer error override; else the renderer owns its own error (calm role="status", degrade-never-crash)
  } else {
    // success · loading · (calendar-)empty · error-without-override → the renderer owns the state
    body = renderView(layout, state)
  }

  return (
    <CollectionRoot
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      aria-labelledby={resolvedLabelledby}
    >
      {/* chrome row 1 — title + honest count (left) · the view-config entry points (right, S2) */}
      <ChromeRow>
        <TitleGroup>
          <Text id={titleId} ref={titleRef as never} tabIndex={-1} fontFamily="$display" fontSize="$h3" color="$colorTextPrimary">
            {title}
          </Text>
          <Text fontSize="$small" color="$colorTextMuted">
            {state === 'success' && count != null ? `${count} ${count === 1 ? 'item' : 'items'}` : '—'}
          </Text>
        </TitleGroup>
        {/* S2 — Filter · Sort · + new-view. ENTRY POINTS only (logic is the app's); ACTIVE in every state (EC-2:
            the 8-state owns no chrome rule; the honesty bar forbids fake spinners, not active controls). */}
        {(onFilter != null || onSort != null || onNewView != null) && (
          <ChromeActions>
            {onFilter != null && (
              <Button size="sm" intent="ghost" onPress={onFilter}>
                {filterActive === true ? 'Filter •' : 'Filter'}
              </Button>
            )}
            {onSort != null && (
              <Button size="sm" intent="ghost" onPress={onSort}>
                {sortLabel != null ? <>Sort: {sortLabel}</> : 'Sort'}
              </Button>
            )}
            {onNewView != null && (
              <Button size="sm" intent="ghost" onPress={onNewView} aria-label="New view">
                +
              </Button>
            )}
          </ChromeActions>
        )}
      </ChromeRow>

      {/* chrome row 2 — the view-mode switcher: a labeled toolbar (tablet+) / a condensed Menu (<768) */}
      {condensed ? (
        <View>
          <Menu
            aria-label="View mode"
            trigger={<Button size="sm" intent="ghost">{`View: ${LAYOUT_LABEL[layout]}`}</Button>}
            items={layouts.map((l) => ({
              id: l,
              label: LAYOUT_LABEL[l],
              // a check marks the active layout in the condensed menu (the toolbar uses the filled button instead)
              leading: l === layout ? <Text color="$colorTextPrimary">✓</Text> : <Text> </Text>,
              onSelect: () => onLayoutChange(l),
            }))}
          />
        </View>
      ) : (
        <SwitcherBar role="toolbar" aria-label="View mode">
          {layouts.map((l) => (
            <Button
              key={l}
              size="sm"
              intent={l === layout ? 'primary' : 'ghost'}
              aria-pressed={l === layout}
              onPress={() => onLayoutChange(l)}
            >
              {LAYOUT_LABEL[l]}
            </Button>
          ))}
        </SwitcherBar>
      )}

      {/* the active renderer (or the collection-level empty) */}
      <View>{body}</View>
    </CollectionRoot>
  )
}
