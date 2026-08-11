import { type CSSProperties, type ReactElement, type ReactNode, type Ref } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { type ViewState, Message, resolveDataViewState } from '../internal/data-view'

// UI-2 · V3 · timeline — the renderer for the `timeline` VIEW_LAYOUT. Implements
// docs/specs/components/ui-2-platform-views/v3-timeline.md (Part B). **V1's data-view spine (via internal/data-view)
// laid out as a CONTINUOUS vertical rail** — the temporal analogue of list (Tasks/Projects timeline, CRM interaction
// timeline).
// - Continuous rail (B1): TimelineRoot has NO gap; inter-item spacing is the Content column's paddingBottom, so the
//   rail columns sit FLUSH and their full-height lines meet into one unbroken rail (an absolute line scoped to an
//   item cannot cross a root `gap`). The dot is at a FIXED top offset (12; center=18) so no layout measurement is
//   needed; the line trims to the dot at the sequence ends (4-branch, lone item → no line).
// - The temporal `getLabel` is REAL content (not aria-hidden), first in the listitem; only the rail is decorative.
// - Reuses the whole spine: role="list"/listitem + state-dependent role, resolveDataViewState (dev-warns), React-19
//   ref-prop. No sub-theme, no motion, no new dep.

type Density = 'compact' | 'default' | 'spacious'

// density = the between-row gap, applied as Content paddingBottom (NOT root gap — keeps the rail continuous).
const GAP = { compact: '$8', default: '$12', spacious: '$24' } as const

export interface TimelineProps<T> {
  items: readonly T[]
  renderItem: (item: T, index: number) => ReactNode
  getKey: (item: T, index: number) => string
  /** Optional temporal label rendered as real content beside each marker (e.g. a formatted date). */
  getLabel?: (item: T, index: number) => ReactNode
  state?: ViewState
  empty?: ReactNode
  error?: ReactNode
  loadingCount?: number
  density?: Density
  ref?: Ref<HTMLDivElement>
  'aria-label'?: string
  'aria-labelledby'?: string
}

// ── styled hosts (unnamed → base theme; no sub-theme) ───────────────────────────────────────────────────
const TimelineRoot = styled(View, { flexDirection: 'column' }) // NO gap (continuity — B1); role set per state
const TimelineItem = styled(View, { flexDirection: 'row' })

// Rail column: fixed width, stretches to the full padded row height so its line reaches the (flush) next item.
const Rail = styled(View, { width: '$24', position: 'relative', alignSelf: 'stretch' })
// The connecting line — centered; top/bottom/height set per-item (first/mid/last trim) via inline style.
const RailLine = styled(View, { position: 'absolute', left: '50%', marginLeft: -1, width: 2, backgroundColor: '$colorBorderDefault' })
// The marker dot — a 12×12 circle at a fixed top offset (center = 18px), above the line (local stack).
const RailDot = styled(View, {
  position: 'absolute',
  left: '50%',
  marginLeft: -6,
  top: 12,
  width: 12,
  height: 12,
  borderRadius: '$full',
  backgroundColor: '$colorTextMuted',
  zIndex: 1,
})
const Content = styled(View, { flex: 1 })
const Label = styled(Text, { fontFamily: '$body', fontSize: '$small', color: '$colorTextMuted', marginBottom: 2 })
const SkeletonBar = styled(View, { height: '$24', borderRadius: '$md', backgroundColor: '$colorSurfaceSecondary' })

// A plain GENERIC function component — preserves <T> (forwardRef would erase it). React 19 spreads `ref` as a prop.
export function Timeline<T>({
  items,
  renderItem,
  getKey,
  getLabel,
  state = 'success',
  empty,
  error,
  loadingCount = 5,
  density = 'default',
  ref,
  ...rest
}: TimelineProps<T>): ReactElement {
  const r = rest as Record<string, unknown>
  const { role, effectiveEmpty } = resolveDataViewState({
    state,
    itemCount: items.length,
    ariaLabel: r['aria-label'] as string | undefined,
    ariaLabelledby: r['aria-labelledby'] as string | undefined,
    name: 'Timeline',
  })
  const gap = GAP[density]

  let body: ReactNode
  if (state === 'loading') {
    body = Array.from({ length: loadingCount }, (_, i) => {
      const isLast = i === loadingCount - 1
      return (
        <TimelineItem key={`skeleton-${i}`} role="listitem" aria-hidden>
          <Rail>
            <RailDot className="vida-timeline-dot" />
          </Rail>
          <Content paddingBottom={isLast ? 0 : gap}>
            <SkeletonBar />
          </Content>
        </TimelineItem>
      )
    })
  } else if (state === 'error') {
    body = error ?? <Message>Couldn&rsquo;t load.</Message>
  } else if (effectiveEmpty) {
    body = empty ?? <Message>Nothing here yet.</Message>
  } else {
    body = items.map((item, i) => {
      const isFirst = i === 0
      const isLast = i === items.length - 1
      // 4-branch line trim (lone item → no line — else a spurious dangling nub); dot-center = 18.
      const lineStyle: CSSProperties | null =
        isFirst && isLast
          ? null
          : isFirst
            ? { top: 18, bottom: 0 }
            : isLast
              ? { top: 0, height: 18 }
              : { top: 0, bottom: 0 }
      return (
        <TimelineItem key={getKey(item, i)} role="listitem">
          <Rail aria-hidden>
            {lineStyle && <RailLine className="vida-timeline-line" style={lineStyle} />}
            <RailDot className="vida-timeline-dot" />
          </Rail>
          <Content paddingBottom={isLast ? 0 : gap}>
            {getLabel && <Label>{getLabel(item, i)}</Label>}
            {renderItem(item, i)}
          </Content>
        </TimelineItem>
      )
    })
  }

  return (
    // Computed role/aria-busy AFTER {...rest} so state wins (N1, card precedent).
    <TimelineRoot ref={ref} {...rest} role={role} aria-busy={state === 'loading' ? true : undefined}>
      {body}
    </TimelineRoot>
  )
}
