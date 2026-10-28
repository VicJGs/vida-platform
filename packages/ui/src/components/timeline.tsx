import { type CSSProperties, type ReactElement, type ReactNode, type Ref } from 'react'
import { styled, Text, useTheme, View } from '@tamagui/core'
import { type ViewState, Message, resolveDataViewState } from '../internal/data-view'

// UI-2 · V3 · timeline — the renderer for the `timeline` VIEW_LAYOUT. Implements
// docs/specs/components/ui-2-platform-views/v3-timeline.md (Part B) + the fe-codec-primitives-refinement P3 pass
// (docs/specs/foundation/fe-codec-primitives-refinement/phases/P3-timeline.md). **V1's data-view spine laid out as a
// CONTINUOUS vertical rail** — the temporal analogue of list (Tasks/Projects timeline, CRM interaction timeline).
// - Continuous rail (B1): TimelineRoot has NO gap; inter-item spacing is the Content column's paddingBottom, so the
//   rail columns sit FLUSH and their full-height lines meet into one unbroken rail (an absolute line scoped to an
//   item cannot cross a root `gap`). The dot is at a FIXED top offset (12; center=18) so no layout measurement is
//   needed; the line trims to the dot at the sequence ends (4-branch, lone item → no line).
// - P3 editorial lift: the date moves to a right-aligned LEFT GUTTER (serif $display + tabular + an optional eyebrow
//   kicker), rendered only when getLabel/getEyebrow is given (else the 2-col layout, back-compat); the resting dot is
//   HOLLOW (surface fill + muted ring).
// - P3 now-awareness (alive-hook, opt-in): `getTemporalState` tones the rail DOT — present = accent dot + soft ring,
//   future = faded dot (the DATE is held at full opacity so AA holds, the Card BR-C-7a pattern; the title fade is the
//   consumer's renderItem, LV-5). `nowFulcrum` splices ONE accent "now" divider before the first non-past item; the
//   4-branch trim runs over the COMBINED sequence (items + fulcrum pseudo-row) so the rail connects THROUGH it.
// - The temporal date is REAL content (not aria-hidden), first in the listitem; only the rail is decorative.
// - Reuses the whole spine: role="list"/listitem + state-dependent role, resolveDataViewState (dev-warns), React-19
//   ref-prop. No sub-theme, no motion, no new dep.

/** The three temporal positions a consumer declares per item (it knows "now"; the renderer never reads a clock). */
export type TemporalState = 'past' | 'present' | 'future'

type Density = 'compact' | 'default' | 'spacious'

// density = the between-row gap, applied as Content paddingBottom (NOT root gap — keeps the rail continuous).
const GAP = { compact: '$8', default: '$12', spacious: '$24' } as const

// The fulcrum's React key — a NUL-prefixed sentinel so it can never collide with a consumer `getKey` output.
const FULCRUM_KEY = '\u0000now-fulcrum'

export interface TimelineProps<T> {
  items: readonly T[]
  renderItem: (item: T, index: number) => ReactNode
  getKey: (item: T, index: number) => string
  /** Optional temporal label rendered in the left gutter beside each marker (e.g. a formatted date). Serif + tabular. */
  getLabel?: (item: T, index: number) => ReactNode
  /** Optional uppercase eyebrow kicker under the date in the gutter (e.g. "Today"/"Monday"). */
  getEyebrow?: (item: T, index: number) => ReactNode
  /** Now-awareness: tones the rail dot (present = accent+ring · future = faded dot). The consumer computes it. */
  getTemporalState?: (item: T, index: number) => TemporalState
  /** Render the accent "now" divider before the first non-past item (needs `getTemporalState`). The journal spine. */
  nowFulcrum?: boolean
  /** The fulcrum's gutter label. Default "now". */
  nowLabel?: ReactNode
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

// Left date gutter (P3) — fixed-width, right-aligned; the serif date + eyebrow. Rendered only when a label/eyebrow is
// given (else the row stays 2-col, back-compat). 80px holds a short serif figure + a one-word eyebrow at 375→1440
// (a layout number — the tabs indicatorStyle / gallery tileStyle precedent). paddingTop aligns the date near the dot.
const When = styled(View, { width: 80, flexShrink: 0, alignItems: 'flex-end', paddingRight: '$8', paddingTop: '$8' })

// Rail column: fixed width, stretches to the full padded row height so its line reaches the (flush) next item.
const Rail = styled(View, { width: '$24', position: 'relative', alignSelf: 'stretch' })
// The connecting line — centered; top/bottom/height set per-item (first/mid/last trim) via inline style. `tone=accent`
// = the fulcrum segment (solid brand) — a token-pure variant (the mock's gradient needs color-mix/injected CSS, dropped).
const RailLine = styled(View, {
  position: 'absolute',
  left: '50%',
  marginLeft: -1,
  width: 2,
  backgroundColor: '$colorBorderDefault',
  variants: { tone: { accent: { backgroundColor: '$colorBrandPrimary' } } } as const,
})
// The marker dot — a 12×12 circle at a fixed top offset (center = 18px), above the line (local stack). P3: a VARIANT
// host — `hollow` (default: surface fill + muted ring, the editorial marker) · `present` (accent, + a soft ring added
// inline from the theme-resolved accent) · `future` (hollow + faded — DOT ONLY, the date stays AA, BR-C-7a).
const RailDot = styled(View, {
  position: 'absolute',
  left: '50%',
  marginLeft: -6,
  top: 12,
  width: 12,
  height: 12,
  borderRadius: '$full',
  zIndex: 1,
  variants: {
    // fill + border per temporal tone; the `future` FADE is an inline opacity (deterministic + jsdom-assertable, NOT a
    // compiled variant class) — and it's on the DOT ONLY (the date is never faded — AA, BR-C-7a).
    tone: {
      hollow: { backgroundColor: '$colorSurfacePrimary', borderWidth: 2, borderColor: '$colorTextMuted' },
      present: { backgroundColor: '$colorBrandPrimary', borderWidth: 2, borderColor: '$colorBrandPrimary' },
      future: { backgroundColor: '$colorSurfacePrimary', borderWidth: 2, borderColor: '$colorTextMuted' },
    },
  } as const,
  defaultVariants: { tone: 'hollow' },
})
const Content = styled(View, { flex: 1 })
// The temporal date — P3: serif display FAMILY at $small (NOT $display SIZE = 36) + tabular figures (via inline style,
// Tamagui forwards the key — the pomodoro precedent). Full text colour (primary); never faded (AA, R2).
const Label = styled(Text, { fontFamily: '$display', fontSize: '$small', color: '$colorTextPrimary' })
// The eyebrow kicker under the date (mirrors P1's SectionHeader recipe). `tone=accent` = the fulcrum "now".
const Eyebrow = styled(Text, {
  fontFamily: '$body',
  fontSize: '$caption',
  fontWeight: '600',
  color: '$colorTextMuted',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  marginTop: 2,
  variants: { tone: { accent: { color: '$colorBrandPrimary' } } } as const,
})
const SkeletonBar = styled(View, { height: '$24', borderRadius: '$md', backgroundColor: '$colorSurfaceSecondary' })

// 4-branch line trim (computed over the RENDER sequence, so it's correct through a spliced fulcrum): lone row → no line
// (else a spurious dangling nub); first starts at the dot; last ends at the dot; middle connects flush to both. dot-center=18.
function trim(isFirst: boolean, isLast: boolean): CSSProperties | null {
  if (isFirst && isLast) return null
  if (isFirst) return { top: 18, bottom: 0 }
  if (isLast) return { top: 0, height: 18 }
  return { top: 0, bottom: 0 }
}

// A plain GENERIC function component — preserves <T> (forwardRef would erase it). React 19 spreads `ref` as a prop.
export function Timeline<T>({
  items,
  renderItem,
  getKey,
  getLabel,
  getEyebrow,
  getTemporalState,
  nowFulcrum,
  nowLabel = 'now',
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
  // Fulcrum boundary (F3/G2): the first non-`past` item; -1 = no "now" to render (all-past / no getTemporalState / no
  // items). Computed here (not in the success branch) so `hasGutter` keys on whether the fulcrum ACTUALLY renders —
  // else a no-op `nowFulcrum` would force an empty 80px gutter onto every row.
  const fulcrumAt = nowFulcrum && getTemporalState ? items.findIndex((it, i) => getTemporalState(it, i) !== 'past') : -1
  // The gutter column renders when the consumer gives a date/eyebrow — OR when the fulcrum actually renders (its "now"
  // label lives in the gutter). Absent all → the 2-col layout (back-compat with label-less timelines).
  const hasGutter = Boolean(getLabel || getEyebrow || fulcrumAt !== -1)

  // Soft accent ring for the present/fulcrum dot — a STATIC box-shadow composed from the theme-resolved accent
  // (useTheme().get('web'), the pomodoro-ring precedent; a $token can't reach an rgba shadow). jsdom/no-web → undefined
  // → the accent FILL alone marks "now" (F2 fallback). color-mix is runtime CSS (Brave/Chromium), not the token pipeline.
  const theme = useTheme()
  const accent = theme.colorBrandPrimary?.get('web')
  const ringStyle: CSSProperties | undefined = accent
    ? { boxShadow: `0 0 0 3px color-mix(in srgb, ${accent} 16%, transparent)` }
    : undefined

  let body: ReactNode
  if (state === 'loading') {
    body = Array.from({ length: loadingCount }, (_, i) => {
      const isLast = i === loadingCount - 1
      return (
        <TimelineItem key={`skeleton-${i}`} role="listitem" aria-hidden>
          {hasGutter && <When className="vida-timeline-gutter" />}
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
    // Build the RENDER sequence: items, with the fulcrum spliced before the first non-past item (`fulcrumAt`, computed
    // above — F3/G2, a total function). The 4-branch trim then runs over THIS sequence so the rail connects through it (R4).
    if (process.env.NODE_ENV !== 'production') {
      if (nowFulcrum && !getTemporalState)
        console.warn('[vida/ui] Timeline: `nowFulcrum` needs `getTemporalState` to place the "now" divider — ignored.')
      if (nowFulcrum && getTemporalState && fulcrumAt === -1)
        console.warn('[vida/ui] Timeline: `nowFulcrum` found no non-past item — no "now" boundary to render.')
      if (getTemporalState && items.filter((it, i) => getTemporalState(it, i) === 'present').length > 1)
        console.warn('[vida/ui] Timeline: more than one `present` item — the "now" marker should be a single moment.')
    }

    type Row = { fulcrum: true } | { fulcrum: false; item: T; index: number }
    const seq: Row[] = items.map((item, index) => ({ fulcrum: false as const, item, index }))
    if (fulcrumAt !== -1) seq.splice(fulcrumAt, 0, { fulcrum: true })

    body = seq.map((row, i) => {
      const lineStyle = trim(i === 0, i === seq.length - 1)
      const isLastRow = i === seq.length - 1

      if (row.fulcrum) {
        return (
          <TimelineItem key={FULCRUM_KEY} aria-hidden>
            {hasGutter && (
              <When className="vida-timeline-gutter">
                <Eyebrow tone="accent" className="vida-timeline-now">
                  {nowLabel}
                </Eyebrow>
              </When>
            )}
            <Rail>
              {lineStyle && <RailLine tone="accent" className="vida-timeline-line" style={lineStyle} />}
              <RailDot tone="present" className="vida-timeline-dot" style={ringStyle} />
            </Rail>
            <Content paddingBottom={isLastRow ? 0 : gap} />
          </TimelineItem>
        )
      }

      const { item, index } = row
      const ts = getTemporalState?.(item, index)
      const tone = ts === 'present' ? 'present' : ts === 'future' ? 'future' : 'hollow'
      // present → the soft ring (inline, theme-resolved); future → the fade (inline opacity, dot only). (F2/R2)
      const dotStyle: CSSProperties | undefined =
        ts === 'present' ? ringStyle : ts === 'future' ? { opacity: 0.55 } : undefined
      return (
        <TimelineItem key={getKey(item, index)} role="listitem">
          {hasGutter && (
            <When className="vida-timeline-gutter">
              {getLabel && (
                <Label className="vida-timeline-date" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {getLabel(item, index)}
                </Label>
              )}
              {getEyebrow && <Eyebrow className="vida-timeline-eyebrow">{getEyebrow(item, index)}</Eyebrow>}
            </When>
          )}
          <Rail aria-hidden>
            {lineStyle && <RailLine className="vida-timeline-line" style={lineStyle} />}
            <RailDot tone={tone} className="vida-timeline-dot" style={dotStyle} />
          </Rail>
          <Content paddingBottom={isLastRow ? 0 : gap}>{renderItem(item, index)}</Content>
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
