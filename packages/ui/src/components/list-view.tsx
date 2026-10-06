import { type ReactElement, type ReactNode, type Ref, useId } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { type ViewState, Message, resolveDataViewState } from '../internal/data-view'

// ViewState/Message/terminal-state logic now live in internal/data-view (extracted at V3, rule of three); re-export
// ViewState so the barrel (`export { ..., type ViewState } from './list-view'`) is unchanged.
export type { ViewState }

// UI-2 · V1 · list-view — the renderer for the `list` VIEW_LAYOUT (packages/types VIEW_LAYOUT). Implements
// docs/specs/components/ui-2-platform-views/v1-list-view.md. **This unit establishes the shared data-view spine**
// (generic items<T> + renderItem + getKey + the four RENDERED terminal states) that V2–V4 reuse.
// - Pure PRESENTATIONAL: list-view owns layout + role="listitem" semantics + the terminal states; it does NOT own
//   row interactivity (the consumer's `renderItem` composes an interactive Card when a row is clickable — LV-5). This
//   avoids re-solving Card's container-vs-button problem and keeps the spine minimal.
// - state is a PROP, not derived (BR-2, the package→app boundary): the app derives via UX-4's deriveTerminalState and
//   passes it; @vida/ui is a package and cannot import an app. `ViewState` is a LOCAL union (LV-3a) — @vida/ui deps
//   are Tamagui-only, so importing @vida/core's `TerminalState` would be a wrong-direction edge; structural typing
//   makes deriveTerminalState()'s `TerminalState` assignable to `ViewState` with no import.
// - React 19 `ref`-as-prop (B2): a generic forwardRef erases <T>, and list-view is non-interactive, so no forwardRef.
// - No sub-theme (LV-3): dividers/skeleton/message use BASE semantic tokens ($colorBorderDefault /
//   $colorSurfaceSecondary / $colorTextMuted), which resolve on an unnamed styled host. Dimension props use the
//   token scale, never a sub-theme key (DEF-U8-h). No motion in V1 (LV-6).
//
// fe-codec-primitives-refinement · P1 (LIF-230) — editorial polish + alive-hooks, all PRESENTATIONAL (the primitive
// ships the hooks; the surface feeds data). Row CONTENT stays renderItem's (LV-5) — the ambient signal / typography
// live there, NOT here.
//  · sections?: grouped render + eyebrow headers (provider groups upstream, ADR-007 §3.3) — mirrors board-view's
//    BoardGroup shape + its a11y model (outer role="group" + per-section role="list" aria-labelledby, per-section
//    empty via resolveDataViewState). XOR `items`.
//  · primaryKey / primaryLabel: a GENERIC featured-row emphasis (accent left-tick + optional eyebrow); the "one thing"
//    is the consumer's semantic. activeKey: the active-row accent tick. Emphasis = a Tamagui VARIANT + DIRECT accent
//    token (no injected CSS; no bg tint — no accent-surface token exists → token-pure, no palette churn).

type Density = 'compact' | 'default' | 'spacious'

/** One PRE-GROUPED section (the provider groups — ADR-007 §3.3; list-view never does). Mirrors board's BoardGroup. */
export interface ListSection<T> {
  /** Group-by value (provider-resolved). React key per section — any string. */
  id: string
  /** Section header content (the eyebrow label). Also the section list's accessible name (aria-labelledby). */
  title: ReactNode
  /** This section's rows — already filtered + sorted upstream. */
  items: readonly T[]
}

export interface ListViewProps<T> {
  /** The rows (flat mode). Empty + state='success' self-heals to the empty render + dev-warns (LV-7). XOR `sections`. */
  items?: readonly T[]
  /** Grouped mode: pre-grouped sections with eyebrow headers. XOR `items` (dev-warns if both). */
  sections?: readonly ListSection<T>[]
  /** Renders one row's CONTENT (list-view owns the role="listitem" wrapper). Compose an interactive Card here when
   *  the row is clickable; the ambient signal / typography are the consumer's (LV-5). */
  renderItem: (item: T, index: number) => ReactNode
  /** Stable key per row (a UUIDv7 id). REQUIRED — never an index. */
  getKey: (item: T, index: number) => string
  /** Resolved state (the app derives via deriveTerminalState + passes it — BR-2). Default 'success'. */
  state?: ViewState
  /** Slot for the empty state (else a default). */
  empty?: ReactNode
  /** Slot for the error state (else a default). */
  error?: ReactNode
  /** Skeleton row count while loading. Default 5. */
  loadingCount?: number
  /** Between-row GAP (not per-row padding — a row's inset is its renderItem's, LV-4). Default 'default'. */
  density?: Density
  /** Hairline separators between rows. Default false. */
  dividers?: boolean
  /** getKey value of the FEATURED row → a generic emphasis affordance (accent tick + optional eyebrow). No-op + warns
   *  if it matches no row. The "one thing" SEMANTIC is the consumer's; the primitive ships a neutral "emphasize" mark. */
  primaryKey?: string
  /** Optional eyebrow rendered above the featured row (e.g. "The one thing"). Only meaningful with `primaryKey`. */
  primaryLabel?: ReactNode
  /** getKey value of the active row → the accent left-tick (visual-only; no aria-selected — the consumer owns selection). */
  activeKey?: string
  /** React 19 ref-as-prop → the container element (B2). */
  ref?: Ref<HTMLDivElement>
  /** Accessible name for the list (required in list/loading states — dev-warns if absent). */
  'aria-label'?: string
  'aria-labelledby'?: string
}

// ── styled hosts (unnamed → base theme; no sub-theme, LV-3) ─────────────────────────────────────────────
const ListRoot = styled(View, {
  flexDirection: 'column',
  variants: {
    // Density = the between-row GAP via the $space scale (mirrors Card's padding scale), NOT per-row padding (LV-4).
    density: {
      compact: { gap: '$8' },
      default: { gap: '$12' },
      spacious: { gap: '$24' },
    },
  } as const,
  defaultVariants: { density: 'default' },
})

// The grouped outer container (role="group") — gap BETWEEN sections (larger than the row gap). P1 sections mode.
const SectionGroup = styled(View, { flexDirection: 'column', gap: '$24' })

// Eyebrow section header: uppercase, tracked, muted caption — the editorial group label. DIRECT semantic tokens.
const SectionHeader = styled(Text, {
  fontFamily: '$body',
  fontSize: '$caption',
  fontWeight: '600',
  color: '$colorTextMuted',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  marginBottom: '$8',
})

// Eyebrow above the featured row (accent-toned to read as "featured"). P1 primaryLabel.
const PrimaryEyebrow = styled(Text, {
  fontFamily: '$body',
  fontSize: '$caption',
  fontWeight: '600',
  color: '$colorBrandPrimary',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  marginBottom: '$4',
})

const ListRow = styled(View, {
  variants: {
    // Hairline separator; only the bottom edge width+color is set (LV-4), so it can't cross-talk with the emphasis tick.
    dividers: {
      true: { borderBottomWidth: 1, borderBottomColor: '$colorBorderDefault' },
    },
    // Featured/active emphasis = a 3px accent LEFT border (the Toast left-accent precedent, as a token-pure variant —
    // no bg tint, no injected CSS). paddingLeft gives the content room so it doesn't butt the tick.
    emphasized: {
      true: { borderLeftWidth: 3, borderLeftColor: '$colorBrandPrimary', paddingLeft: '$8' },
    },
  } as const,
})

// A static placeholder bar — fixed height (density affects the gap, not the bar, LV-4); no shimmer (B12 / reduced-
// motion safe — the UX-4 §3.1 recipe). $md radius via the token scale (DEF-U8-h).
const SkeletonRow = styled(View, {
  height: '$24',
  borderRadius: '$md',
  backgroundColor: '$colorSurfaceSecondary',
})

// A plain GENERIC function component — preserves <T> (forwardRef would erase it). React 19 spreads `ref` as a prop.
export function ListView<T>({
  items,
  sections,
  renderItem,
  getKey,
  state = 'success',
  empty,
  error,
  loadingCount = 5,
  density = 'default',
  dividers = false,
  primaryKey,
  primaryLabel,
  activeKey,
  ref,
  ...rest
}: ListViewProps<T>): ReactElement {
  const r = rest as Record<string, unknown>
  const baseId = useId() // stable per-instance prefix for section-header → section-list aria-labelledby wiring
  const isSectioned = sections != null
  // Flat list of all rows (summed across sections) — for the spine's count + the primary/active match warns.
  const allItems: readonly T[] = isSectioned ? sections.flatMap((s) => s.items) : (items ?? [])

  // Dev-time contract guards (DCE'd in prod). XOR + no-match warns (the LV-7 guard family).
  if (process.env.NODE_ENV !== 'production') {
    if (items != null && sections != null)
      // eslint-disable-next-line no-console
      console.warn('[vida/ui] ListView: pass `items` OR `sections`, not both — `sections` wins.')
    if (primaryKey != null && !allItems.some((it, i) => getKey(it, i) === primaryKey))
      // eslint-disable-next-line no-console
      console.warn('[vida/ui] ListView: `primaryKey` matches no row — the emphasis is a no-op.')
    if (activeKey != null && !allItems.some((it, i) => getKey(it, i) === activeKey))
      // eslint-disable-next-line no-console
      console.warn('[vida/ui] ListView: `activeKey` matches no row — the tick is a no-op.')
  }

  // Shared spine (internal/data-view): computes role + effectiveEmpty and fires the LV-7 + accessible-name dev-warns.
  const { role: baseRole, effectiveEmpty } = resolveDataViewState({
    state,
    itemCount: allItems.length,
    ariaLabel: r['aria-label'] as string | undefined,
    ariaLabelledby: r['aria-labelledby'] as string | undefined,
    name: 'ListView',
  })

  // Render ONE row (listitem) — the primary eyebrow lives INSIDE the listitem (valid list a11y); emphasis via variant.
  const renderRow = (item: T, index: number): ReactElement => {
    const key = getKey(item, index)
    const isPrimary = primaryKey != null && key === primaryKey
    const isActive = activeKey != null && key === activeKey
    return (
      <ListRow key={key} role="listitem" dividers={dividers} emphasized={isPrimary || isActive}>
        {isPrimary && primaryLabel != null ? <PrimaryEyebrow>{primaryLabel}</PrimaryEyebrow> : null}
        {renderItem(item, index)}
      </ListRow>
    )
  }

  // ── loading → skeleton rows (data-independent; flat even in sections mode) ───────────────────────────
  if (state === 'loading') {
    return (
      <ListRoot ref={ref} {...rest} role="list" aria-busy={true} density={density}>
        {Array.from({ length: loadingCount }, (_, i) => (
          <ListRow key={`skeleton-${i}`} role="listitem" aria-hidden>
            <SkeletonRow />
          </ListRow>
        ))}
      </ListRoot>
    )
  }

  // ── error / empty → a role="status" region (NOT a role="list" with zero items — trips axe) ───────────
  if (state === 'error') {
    return (
      <ListRoot ref={ref} {...rest} role="status" density={density}>
        {error ?? <Message>Couldn&rsquo;t load.</Message>}
      </ListRoot>
    )
  }
  if (effectiveEmpty) {
    return (
      <ListRoot ref={ref} {...rest} role="status" density={density}>
        {empty ?? <Message>Nothing here yet.</Message>}
      </ListRoot>
    )
  }

  // ── success · sectioned → outer role="group" + per-section (eyebrow header + role="list") ────────────
  // The board-view model rotated vertical [board-view.tsx:193-221]: each section reuses resolveDataViewState for its
  // own role + per-section empty; the group is named by the list's aria-label/labelledby (warned above by the spine).
  if (isSectioned) {
    return (
      // Computed role AFTER {...rest} so it wins (N1).
      <SectionGroup ref={ref} {...rest} role="group">
        {sections.map((section, sIdx) => {
          const headerId = `${baseId}-s-${sIdx}`
          const colState: ViewState = section.items.length === 0 ? 'empty' : 'success'
          const { role: secRole, effectiveEmpty: secEmpty } = resolveDataViewState({
            state: colState,
            itemCount: section.items.length,
            ariaLabelledby: headerId,
            name: 'ListView',
          })
          return (
            <View key={section.id}>
              <SectionHeader id={headerId}>{section.title}</SectionHeader>
              <ListRoot role={secRole} aria-labelledby={headerId} density={density}>
                {secEmpty ? (
                  <Message>Nothing here yet.</Message>
                ) : (
                  section.items.map((item, i) => renderRow(item, i))
                )}
              </ListRoot>
            </View>
          )
        })}
      </SectionGroup>
    )
  }

  // ── success · flat → role="list" of rows ─────────────────────────────────────────────────────────────
  return (
    // Computed role/aria-busy AFTER {...rest} so state wins (N1, card precedent).
    <ListRoot ref={ref} {...rest} role={baseRole} density={density}>
      {(items ?? []).map((item, i) => renderRow(item, i))}
    </ListRoot>
  )
}
