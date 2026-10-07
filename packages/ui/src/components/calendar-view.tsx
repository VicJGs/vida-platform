import { useMemo, type CSSProperties, type ReactElement, type ReactNode, type Ref } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { addDays, addMonths, format, isSameDay, isSameMonth, isWeekend, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { type ViewState, Message, warnMissingName } from '../internal/data-view'
import { Button } from './button'

// UI-2 · V4 · calendar-view — the renderer for the `calendar` VIEW_LAYOUT. Implements
// docs/specs/components/ui-2-platform-views/v4-calendar-view.md. A month grid that buckets dated items onto days.
// **Diverges from the linear-list spine:** a calendar is a 2D date grid → it renders as a role="table" (NOT a list),
// and "empty" is a designed grid-with-no-chips state (NOT a status message). So it reuses the spine's PIECES
// (ViewState, Message, warnMissingName, ref-prop, base tokens) but NOT resolveDataViewState (its empty→status role is
// wrong here). Pure display: `month` is CONTROLLED (no useState); nav buttons render only when `onMonthChange` is given.
// - TZ-SAFE keying (B1): a 'YYYY-MM-DD' string is the day key AS-IS (never new Date(str) — UTC-midnight off-by-one in
//   a negative-offset zone); a Date → format(d,'yyyy-MM-dd') (local). Grid cell key = the same local format.
// - fe-codec-primitives-refinement P5 (LIF-230): editorial Layer-1 refinement (chrome only, no interface change) —
//   serif $heading/500 title · uppercase tracked weekday eyebrows (CSS textTransform, DOM stays "Mon") · $small tabular
//   day figures · today = accent number + underline (vida-cal-today) in $colorBrandEmphasis (the higher-contrast brand
//   step — brandPrimary fell < 4.5 AA on a weekend/oos $colorSurfaceSecondary cell, Visual-Gate-caught), not a filled blob · weekend/oos paper tone via
//   $colorSurfaceSecondary (number colour differentiates) · "+K more" eyebrow. TZ keying / 42-cell grid / roles untouched.

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

export interface CalendarViewProps<T> {
  items: readonly T[]
  /** Maps an item to its day — a Date or a 'YYYY-MM-DD' string. REQUIRED (the calendar's date field). */
  getDate: (item: T) => Date | string
  /** Renders one item as a day-cell chip. */
  renderItem: (item: T, index: number) => ReactNode
  getKey: (item: T, index: number) => string
  /** The displayed month (CONTROLLED — no internal state; default startOfMonth(today)). `month` alone = a static
   *  externally-controlled month; neither `month` nor `onMonthChange` = the current month, no nav. */
  month?: Date
  /** When provided, prev/next nav buttons render + call this; when absent, no buttons (pure display). */
  onMonthChange?: (month: Date) => void
  /** Injection seam for "today" (marker + default month). Default new Date(), evaluated once. */
  today?: Date
  /** Week start: 0=Sun, 1=Mon. Default 1. */
  weekStartsOn?: 0 | 1
  /** Max chips per day before "+K more". Default 3. */
  maxPerDay?: number
  /** loading | error | success (empty folds into success — the grid always renders). Default 'success'. */
  state?: ViewState
  /** Slot for the error state (else a default Message). */
  error?: ReactNode
  ref?: Ref<HTMLDivElement>
  'aria-label'?: string
  'aria-labelledby'?: string
}

// ── styled hosts (unnamed → base theme; no sub-theme) ───────────────────────────────────────────────────
const CalRoot = styled(View, { flexDirection: 'column', gap: '$12' })
const CalHeader = styled(View, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '$8' })
const Table = styled(View, { flexDirection: 'column', minWidth: 560 }) // 7×80 → forces the 375 horizontal scroll (CV-8)
const Row = styled(View, { flexDirection: 'row' })
const HeadCell = styled(View, { flexGrow: 1, flexBasis: 0, minWidth: 80, paddingVertical: '$8', paddingHorizontal: '$8', alignItems: 'flex-start' })
const Day = styled(View, {
  flexGrow: 1,
  flexBasis: 0,
  minWidth: 80,
  minHeight: 92,
  padding: '$8',
  gap: '$4',
  borderWidth: 0.5,
  borderColor: '$colorBorderDefault',
  // P5: a 3-state paper tone from the 2-step surface scale (oos > weekend). Both land on $colorSurfaceSecondary — the
  // mockup's "$colorSurfaceSecondary family" (calendar-refinement.html:152); the DAY NUMBER colour differentiates
  // weekend (primary ink = this month) from out-of-month (muted = faint). A plain in-month weekday passes no tone.
  variants: {
    tone: {
      weekend: { backgroundColor: '$colorSurfaceSecondary' },
      oos: { backgroundColor: '$colorSurfaceSecondary' },
    },
  } as const,
})
// P5: today = an editorial "moment" mark — the accent number carries a short accent underline (the wrapper's
// borderBottom under the digit; RN has no ::after), REPLACING the filled brand blob. Keeps `vida-cal-today` (test hook).
const TodayMark = styled(View, {
  alignSelf: 'flex-start',
  borderBottomWidth: 2,
  borderBottomColor: '$colorBrandEmphasis',
  paddingBottom: 2,
})
const SkeletonBar = styled(View, { height: '$12', borderRadius: '$md', backgroundColor: '$colorSurfaceSecondary' })

// Web horizontal scroll for the 375 baseline (CV-8): the 560-min table scrolls rather than crushing to ~53px columns.
const SCROLL_X: CSSProperties = { overflowX: 'auto', maxWidth: '100%' }

export function CalendarView<T>({
  items,
  getDate,
  renderItem,
  getKey,
  month: monthProp,
  onMonthChange,
  today: todayProp,
  weekStartsOn = 1,
  maxPerDay = 3,
  state = 'success',
  error,
  ref,
  ...rest
}: CalendarViewProps<T>): ReactElement {
  const r = rest as Record<string, unknown>
  const today = todayProp ?? new Date()
  const month = monthProp ?? startOfMonth(today)

  // A name is required whenever the table renders (loading + success), not for the error status message.
  if (state !== 'error')
    warnMissingName('CalendarView', r['aria-label'] as string | undefined, r['aria-labelledby'] as string | undefined)

  // ── grid: always exactly 42 days from the week-start (stable 6×7 height) ────────────────────────────
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn })
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)), [gridStart.getTime()])

  // ── bucket items by TZ-safe local day key (B1) → [item, originalIndex][] ─────────────────────────────
  const EMPTY = useMemo<ReadonlyArray<readonly [T, number]>>(() => [], [])
  const buckets = useMemo(() => {
    const m = new Map<string, Array<[T, number]>>()
    items.forEach((item, index) => {
      const d = getDate(item)
      const keyStr = typeof d === 'string' ? (DATE_KEY.test(d) ? d : null) : format(d, 'yyyy-MM-dd')
      if (keyStr == null) return // malformed string → silently dropped (no crash, no mis-bucket)
      const arr = m.get(keyStr)
      if (arr) arr.push([item, index])
      else m.set(keyStr, [[item, index]])
    })
    return m
  }, [items, getDate])

  // ── error → a status message (not the grid) ─────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <CalRoot ref={ref} {...rest} role="status">
        {error ?? <Message>Couldn&rsquo;t load.</Message>}
      </CalRoot>
    )
  }

  const loading = state === 'loading'
  const weekdayLabels = days.slice(0, 7).map((d) => format(d, 'EEE'))

  return (
    <CalRoot ref={ref} {...rest} role="table" aria-busy={loading ? true : undefined}>
      <CalHeader>
        <Text className="vida-cal-title" fontFamily="$display" fontSize="$heading" fontWeight="500" letterSpacing={-0.3} color="$colorTextPrimary">
          {format(month, 'MMMM yyyy')}
        </Text>
        {onMonthChange && (
          <View flexDirection="row" gap="$8">
            <Button intent="ghost" size="sm" aria-label="Previous month" onPress={() => onMonthChange(subMonths(month, 1))}>
              ‹
            </Button>
            <Button intent="ghost" size="sm" aria-label="Next month" onPress={() => onMonthChange(addMonths(month, 1))}>
              ›
            </Button>
          </View>
        )}
      </CalHeader>

      <View style={SCROLL_X}>
        <Table>
          <Row role="row">
            {weekdayLabels.map((w, i) => (
              <HeadCell key={i} role="columnheader">
                <Text
                  className="vida-cal-weekday"
                  fontSize="$caption"
                  color="$colorTextMuted"
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing={0.8}
                >
                  {w}
                </Text>
              </HeadCell>
            ))}
          </Row>

          {Array.from({ length: 6 }, (_, week) => (
            <Row key={week} role="row">
              {days.slice(week * 7, week * 7 + 7).map((day) => {
                const inMonth = isSameMonth(day, month)
                const isToday = isSameDay(day, today)
                const tone = !inMonth ? 'oos' : isWeekend(day) ? 'weekend' : undefined
                const dayItems = buckets.get(format(day, 'yyyy-MM-dd')) ?? EMPTY
                const overflow = dayItems.length - maxPerDay
                return (
                  <Day key={day.getTime()} role="cell" aria-label={format(day, 'd MMMM yyyy')} tone={tone}>
                    {isToday ? (
                      <TodayMark className="vida-cal-today">
                        <Text
                          className="vida-cal-daynum"
                          fontSize="$small"
                          color="$colorBrandEmphasis"
                          fontWeight="600"
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {format(day, 'd')}
                        </Text>
                      </TodayMark>
                    ) : (
                      <Text
                        className="vida-cal-daynum"
                        fontSize="$small"
                        color={inMonth ? '$colorTextPrimary' : '$colorTextMuted'}
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {format(day, 'd')}
                      </Text>
                    )}
                    {loading ? (
                      <SkeletonBar aria-hidden />
                    ) : (
                      <>
                        {dayItems.slice(0, maxPerDay).map(([item, index]) => (
                          <View key={getKey(item, index)}>{renderItem(item, index)}</View>
                        ))}
                        {overflow > 0 && (
                          <Text
                            className="vida-cal-more"
                            fontSize="$caption"
                            color="$colorTextMuted"
                            fontWeight="600"
                            textTransform="uppercase"
                            letterSpacing={0.8}
                          >
                            +{overflow} more
                          </Text>
                        )}
                      </>
                    )}
                  </Day>
                )
              })}
            </Row>
          ))}
        </Table>
      </View>
    </CalRoot>
  )
}
