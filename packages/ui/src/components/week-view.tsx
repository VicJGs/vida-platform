import { useId, type CSSProperties, type ReactElement, type ReactNode, type Ref } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { format } from 'date-fns'
import { type ViewState, Message, warnMissingName } from '../internal/data-view'
import { formatHour, HOUR_PX, layoutDay, normalizeSpan, type Span, windowFor } from '../internal/week-layout'

// fe-calendar #19 · S3 — week-view, the Week AND Day range renderer (Day = this with one column — EC-4).
// Spec: docs/specs/foundation/fe-calendar/delivery/PLAN-S3-week-day-renderer.md (→ ui-2 v11-week-view.md).
// PRESENTATIONAL + read-only (EC-12): blocks arrive pre-bucketed by `day`; this only POSITIONS them. No intents, no
// interactive descendants — the one tab stop is the Week scroll region (navigation, WCAG 2.1.1).
// - Never assume time (IR-6): only real-clock items are blocks; dated-but-untimed items are all-day chips.
// - A11y: the drawn grid (gutter, hour lines, bars) is aria-hidden; each day column's blocks are a role="list" that is a
//   SIBLING of the hidden hour layer (never under it), named by its column header.
// - Geometry lives in internal/week-layout (validate → renderable set → window → layout).
// - TZ-safe: 'YYYY-MM-DD' parsed by parts into a LOCAL Date; `today` matched by string equality.

/** An all-day chip — dated-but-untimed items (tasks, dayparted habits/routines). Undated in the strip (the approved shape). */
export interface CalChip {
  id: string
  title: ReactNode
  /** Purpose colour — USER DATA (hex), never a theme token. Absent → muted dot. */
  color?: string
}

export interface TimedBlock {
  id: string
  title: ReactNode
  /** Purpose colour — USER DATA (hex). Absent → muted bar. */
  color?: string
  /** 'YYYY-MM-DD' — must be one of `days` (else skipped + dev-warn). */
  day: string
  /** Fractional local clock hour in [0, 24); 9.5 = 09:30. */
  startHour: number
  /** Absent → +1h. Clamped to 24 (multi-day spans are the provider's to split). */
  endHour?: number
}

export interface WeekViewProps {
  /** 'YYYY-MM-DD' in display order. 7 → Week, 1 → Day (column count = days.length). */
  days: readonly string[]
  blocks: readonly TimedBlock[]
  /** Chips for the one all-day strip on top. Absent/empty → no strip. */
  allDay?: readonly CalChip[]
  /** 'YYYY-MM-DD'. Marks the column (accent number + underline + ", today"). */
  today?: string
  /** MINIMUM visible window, integer hours, half-open [start, end). Default [8, 20]. Grows to fit every block. */
  hours?: readonly [number, number]
  /** user_preferences.time_format. Default '24h'. */
  timeFormat?: '12h' | '24h'
  /** loading | empty | error | success. Default 'success' (success with nothing renderable self-heals to empty). */
  state?: ViewState
  /** Slot for the empty state (else the designed empty grid). */
  empty?: ReactNode
  /** Slot for the error state (else a default Message). */
  error?: ReactNode
  ref?: Ref<HTMLDivElement>
  'aria-label'?: string
  'aria-labelledby'?: string
}

const GUTTER = 64
const COL_MIN = 80
const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/

// sr-only — visually hidden but announced (the neural-graph NG-5 recipe).
const SR_ONLY: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
}

function parseLocalDate(key: string): Date | null {
  const m = DATE_KEY.exec(key)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

function warn(msg: string): void {
  console.warn(`[vida/ui] WeekView: ${msg}`)
}

// ── styled hosts (unnamed → base theme; DIRECT semantic tokens, no sub-theme) ─────────────────────────────
// position:relative on the root AND the scroll region: the sr-only spans are position:absolute, and an absolute child
// is only clipped by overflow:auto when its containing block is INSIDE the scroller — without it the ", today" span
// escaped the region and widened the page at 375 (Visual-Gate-caught; jsdom can't see it).
const WeekRoot = styled(View, { flexDirection: 'column', position: 'relative' })
// The Week grid's horizontal scroll region — keyboard-reachable so Thu–Sun aren't mouse-only at 375 (axe
// scrollable-region-focusable). Day has none (one column always fits).
const ScrollRegion = styled(View, {
  position: 'relative',
  overflowX: 'auto',
  overflowY: 'hidden',
  borderRadius: '$sm',
  focusVisibleStyle: { outlineColor: '$colorFocusRing', outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 },
})
const Grid = styled(View, { flexDirection: 'column' })
const Row = styled(View, { flexDirection: 'row' })
const GutterCell = styled(View, { width: GUTTER, flexShrink: 0, paddingRight: '$8' })
// flexShrink:1 is explicit — RNW defaults it to 0 (the gallery-view lesson).
const DayCol = styled(View, { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 })
const Eyebrow = styled(Text, {
  fontFamily: '$body',
  fontSize: '$caption',
  lineHeight: '$caption',
  fontWeight: '600',
  color: '$colorTextMuted',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
})
const TodayMark = styled(View, {
  alignSelf: 'flex-start',
  borderBottomWidth: 2,
  borderBottomColor: '$colorBrandEmphasis',
  paddingBottom: 2,
})
const Dot = styled(View, { width: 8, height: 8, borderRadius: '$full', flexShrink: 0 })
const SkeletonBar = styled(View, { borderRadius: '$sm', backgroundColor: '$colorSurfaceSecondary' })
// The visible block — the listitem wraps it with a 1px side inset so adjacent lanes keep a 2px gutter.
const BlockBox = styled(View, {
  position: 'relative',
  flex: 1,
  overflow: 'hidden',
  borderRadius: '$sm',
  backgroundColor: '$colorSurfaceSecondary',
  paddingLeft: '$8',
  paddingRight: '$4',
  paddingVertical: 2,
})
const Bar = styled(View, { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 })

export function WeekView({
  days,
  blocks,
  allDay,
  today,
  hours,
  timeFormat = '24h',
  state = 'success',
  empty,
  error,
  ref,
  ...rest
}: WeekViewProps): ReactElement {
  const r = rest as Record<string, unknown>
  const baseId = useId()
  const multi = days.length > 1
  const dev = process.env.NODE_ENV !== 'production'

  // validate → renderable set (BR-12: effectiveEmpty + the window only ever see renderable blocks)
  const dayIndex = new Map(days.map((d, i) => [d, i]))
  const perDay: (Span & { block: TimedBlock; endFixed: boolean })[][] = days.map(() => [])
  for (const block of blocks) {
    const col = dayIndex.get(block.day)
    if (col === undefined) {
      if (dev) warn(`block "${block.id}" day "${block.day}" is not in \`days\` — skipped.`)
      continue
    }
    const s = normalizeSpan(block.startHour, block.endHour)
    if (s === null) {
      if (dev) warn(`block "${block.id}" startHour ${block.startHour} is outside [0, 24) — skipped.`)
      continue
    }
    if (s.endFixed && dev) warn(`block "${block.id}" endHour ${block.endHour} is not after startHour — drawn as 1h.`)
    perDay[col].push({ start: s.start, end: s.end, block, endFixed: s.endFixed })
  }
  const chips = allDay ?? []
  const renderable = perDay.reduce((n, d) => n + d.length, 0) + chips.length
  const effectiveEmpty = state === 'empty' || (state === 'success' && renderable === 0)
  const { window: win, hoursInvalid } = windowFor(perDay.flat(), hours)
  const [h0, h1] = state === 'loading' ? windowFor([], hours).window : win

  if (dev) {
    if (hoursInvalid) warn('`hours` must be integers with 0 ≤ start < end ≤ 24 — using [8, 20].')
    if (state === 'success' && renderable === 0) warn('state="success" with nothing to render — pass state="empty".')
    if (state === 'loading' && blocks.length > 0) warn('state="loading" with `blocks` present — a stale render.')
    if (state === 'empty' && renderable > 0) warn('state="empty" with items present — they are not rendered.')
    if (state !== 'error' && !(effectiveEmpty && empty != null))
      warnMissingName('WeekView', r['aria-label'] as string | undefined, r['aria-labelledby'] as string | undefined)
  }

  if (state === 'error') {
    return (
      <WeekRoot ref={ref} {...rest} role="status">
        {error ?? <Message>Couldn&rsquo;t load.</Message>}
      </WeekRoot>
    )
  }
  if (effectiveEmpty && empty != null) {
    return (
      <WeekRoot ref={ref} {...rest} role="status">
        {empty}
      </WeekRoot>
    )
  }

  const loading = state === 'loading'
  // nothing is drawn in loading (skeleton) or empty (the designed empty grid) — never items under a "Nothing scheduled"
  const showItems = !loading && !effectiveEmpty
  const hourRows = Array.from({ length: h1 - h0 }, (_, i) => h0 + i)
  const gridHeight = (h1 - h0) * HOUR_PX
  const headerId = (i: number) => `${baseId}-h-${i}`
  const allDayId = `${baseId}-ad`

  const header = (
    <Row borderBottomWidth={1} borderBottomColor="$colorBorderDefault" paddingBottom="$8">
      <GutterCell aria-hidden />
      {days.map((day, i) => {
        const local = parseLocalDate(day)
        const isToday = today != null && day === today
        const num = (
          <Text
            fontFamily="$display"
            fontSize="$subheading"
            lineHeight="$subheading"
            fontWeight="500"
            color={isToday ? '$colorBrandEmphasis' : '$colorTextPrimary'}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {local ? format(local, 'd') : day}
          </Text>
        )
        return (
          <DayCol key={`${day}-${i}`} minWidth={multi ? COL_MIN : 0} alignItems={multi ? 'center' : 'flex-start'}>
            {/* the list's NAME is one explicit sr-only string ("Thu 8, today") — not derived from the visual header's
                inline layout, which engines join differently ("Thu8" in jsdom) */}
            <span id={headerId(i)} style={SR_ONLY}>
              {local ? `${format(local, 'EEE')} ${format(local, 'd')}` : day}
              {isToday ? ', today' : ''}
            </span>
            <View aria-hidden alignItems={multi ? 'center' : 'flex-start'} gap="$4">
              {local ? <Eyebrow>{format(local, 'EEE')}</Eyebrow> : null}
              {isToday ? <TodayMark className="vida-week-today">{num}</TodayMark> : num}
            </View>
          </DayCol>
        )
      })}
    </Row>
  )

  const allDayStrip =
    showItems && chips.length > 0 ? (
      <Row borderBottomWidth={1} borderBottomColor="$colorBorderDefault" paddingVertical="$8">
        <GutterCell>
          <Eyebrow id={allDayId} textAlign="right">
            All day
          </Eyebrow>
        </GutterCell>
        <View role="list" aria-labelledby={allDayId} flex={1} flexDirection="row" flexWrap="wrap" columnGap="$16" rowGap="$4">
          {chips.map((chip, i) => (
            <View key={`${chip.id}-${i}`} role="listitem" flexDirection="row" alignItems="center" gap="$8">
              <Dot aria-hidden backgroundColor={chip.color ?? '$colorTextMuted'} />
              <Text fontFamily="$body" fontSize="$small" lineHeight="$small" color="$colorTextPrimary">
                {chip.title}
              </Text>
            </View>
          ))}
        </View>
      </Row>
    ) : null

  const body = (
    <Row height={gridHeight}>
      <GutterCell aria-hidden position="relative">
        {hourRows.map((h) => (
          <Text
            key={h}
            position="absolute"
            top={(h - h0) * HOUR_PX + 4}
            right="$8"
            fontFamily="$body"
            fontSize="$caption"
            lineHeight="$caption"
            color="$colorTextMuted"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatHour(h, timeFormat, 'gutter')}
          </Text>
        ))}
      </GutterCell>
      {days.map((day, i) => {
        const placed = showItems ? layoutDay(perDay[i], [h0, h1]) : []
        return (
          <DayCol
            key={`${day}-${i}`}
            minWidth={multi ? COL_MIN : 0}
            position="relative"
            borderLeftWidth={1}
            borderLeftColor="$colorBorderDefault"
          >
            {/* the drawn hour lines — a SIBLING of the block list, so hiding it never hides a listitem */}
            <View aria-hidden position="absolute" top={0} right={0} bottom={0} left={0}>
              {hourRows.map((h) => (
                <View
                  key={h}
                  position="absolute"
                  left={0}
                  right={0}
                  top={(h - h0) * HOUR_PX}
                  borderTopWidth={1}
                  borderTopColor="$colorBorderDefault"
                />
              ))}
            </View>
            {loading && i < 3 ? (
              <SkeletonBar aria-hidden position="absolute" left={4} right={4} top={(i + 1) * HOUR_PX + 4} height={HOUR_PX - 8} />
            ) : null}
            {placed.length > 0 ? (
              <View role="list" aria-labelledby={headerId(i)} position="absolute" top={0} right={0} bottom={0} left={0}>
                {placed.map(({ item, top, height, lane, lanes, compact }, k) => {
                  const b = item.block
                  const startLabel = formatHour(item.start, timeFormat, 'start')
                  // a range only when the data HAS a real end — a contradictory end fell back to +1h for drawing,
                  // which must never be shown as if it were data (IR-6)
                  const time =
                    b.endHour !== undefined && !item.endFixed
                      ? `${startLabel}–${formatHour(item.end, timeFormat, 'end')}`
                      : startLabel
                  const shortTime = compact || lanes >= 2
                  return (
                    <View
                      key={`${b.id}-${k}`}
                      role="listitem"
                      className="vida-week-block"
                      position="absolute"
                      top={top}
                      height={height}
                      paddingHorizontal={1}
                      // per-instance lane geometry as inline style (the gallery-view `tileStyle` precedent) — a
                      // per-value atomic class for every lane fraction would be churn, and the gate probes read it
                      style={{ left: `${(lane / lanes) * 100}%`, width: `${100 / lanes}%` }}
                    >
                      <BlockBox
                        className="vida-week-block-box"
                        flexDirection={compact ? 'row' : 'column'}
                        alignItems={compact ? 'center' : 'stretch'}
                        gap={compact ? '$4' : 0}
                      >
                        <Bar aria-hidden backgroundColor={b.color ?? '$colorTextMuted'} />
                        {/* compact or shared-column blocks show only the start (a range wraps in a ½-column lane and
                            pushes the title out — D-S3-DEV-1); the full range always stays in the accessible text */}
                        <Text
                          aria-hidden={shortTime && time !== startLabel ? true : undefined}
                          numberOfLines={1}
                          fontFamily="$body"
                          fontSize="$caption"
                          lineHeight="$caption"
                          color="$colorTextMuted"
                          flexShrink={0}
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {shortTime ? startLabel : time}
                        </Text>
                        {shortTime && time !== startLabel ? <span style={SR_ONLY}>{time}</span> : null}
                        <span style={SR_ONLY}> </span>
                        <Text
                          fontFamily="$body"
                          fontSize={compact ? '$caption' : '$small'}
                          lineHeight={compact ? '$caption' : '$small'}
                          color="$colorTextPrimary"
                          // regular: as many $small (21px) title lines as fit under the 17px time line + 4px padding
                          numberOfLines={compact ? 1 : Math.max(1, Math.floor((height - 4 - 17) / 21))}
                          flexShrink={1}
                          minWidth={0}
                        >
                          {b.title}
                        </Text>
                      </BlockBox>
                    </View>
                  )
                })}
              </View>
            ) : null}
          </DayCol>
        )
      })}
    </Row>
  )

  const grid = (
    <Grid minWidth={multi ? GUTTER + COL_MIN * days.length : undefined}>
      {header}
      {allDayStrip}
      {body}
      {effectiveEmpty ? (
        <span role="status" style={SR_ONLY}>
          Nothing scheduled.
        </span>
      ) : null}
    </Grid>
  )

  return (
    <WeekRoot ref={ref} {...rest} role="group" aria-busy={loading || undefined}>
      {multi ? (
        <ScrollRegion tabIndex={0} role="region" aria-label="Week grid">
          {grid}
        </ScrollRegion>
      ) : (
        grid
      )}
    </WeekRoot>
  )
}
