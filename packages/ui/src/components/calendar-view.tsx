import { Fragment, useId, useMemo, type CSSProperties, type ReactElement, type ReactNode, type Ref } from 'react'
import { styled, Text, View } from '@tamagui/core'
import {
  addDays,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  isWeekend,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { type ViewState, Message, warnMissingName } from '../internal/data-view'
import { ensureCalendarMotionStyles, pulseClass } from '../internal/calendar-motion'
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
  /** Suppress the grid's own month title + nav — for hosting inside a frame that owns the period title (the
   *  fe-calendar #19 CanvasView, D4). Default false (standalone grid shows its title). */
  hideHeader?: boolean
  /** Make the grid a PROGRAMMATIC focus target (pass -1) — e.g. the #19 Year drill-in lands focus here when the button
   *  that triggered it unmounts (FOCUS_CONTRACT). Absent = not focusable (the default). A focus ring shows when focused. */
  tabIndex?: number
  /** Injection seam for "today" (marker + default month). Default new Date(), evaluated once. */
  today?: Date
  /** fe-calendar S7 (EC-F2): bump to pulse the today mark ONCE (the surface's Today button). 0 / absent = no pulse (never on
   *  mount); each new value remounts the mark, restarting the one-shot animation. Reduced motion = none (CSS @media). */
  pulseKey?: number
  /** Week start: 0=Sun, 1=Mon. Default 1. */
  weekStartsOn?: 0 | 1
  /** Max chips per day before "+K more". Default 3. */
  maxPerDay?: number
  /** fe-calendar S7 (EC-F3, the vision's "unfurl the day in place") — CONTROLLED, like `month`: the 'YYYY-MM-DD' day whose
   *  full list is unfurled below its week row. Outside the 42-day grid ⇒ nothing renders. */
  expandedDay?: string
  /** When provided, a day's "+K more" becomes a button that requests that day (or `null` to collapse — second press /
   *  Esc). Absent ⇒ "+K more" stays static text (every other consumer unchanged). */
  onExpandedDayChange?: (day: string | null) => void
  /** Renders the unfurled day's FULL item list (the consumer's anatomy — e.g. the #19 surface's dayparted rows). */
  renderExpanded?: (items: readonly T[], day: string) => ReactNode
  /** loading | error | success (empty folds into success — the grid always renders). Default 'success'. */
  state?: ViewState
  /** Slot for the error state (else a default Message). */
  error?: ReactNode
  ref?: Ref<HTMLDivElement>
  'aria-label'?: string
  'aria-labelledby'?: string
}

// ── styled hosts (unnamed → base theme; no sub-theme) ───────────────────────────────────────────────────
// The focus ring only ever shows when a consumer opts in via `tabIndex` and focuses the grid (S4 drill-in).
const CalRoot = styled(View, {
  flexDirection: 'column',
  gap: '$12',
  borderRadius: '$sm',
  focusVisibleStyle: { outlineColor: '$colorFocusRing', outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 },
})
const CalHeader = styled(View, {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '$8',
})
const Table = styled(View, { flexDirection: 'column', minWidth: 560 }) // 7×80 → forces the 375 horizontal scroll (CV-8)
const Row = styled(View, { flexDirection: 'row' })
const HeadCell = styled(View, {
  flexGrow: 1,
  flexBasis: 0,
  minWidth: 80,
  paddingVertical: '$8',
  paddingHorizontal: '$8',
  alignItems: 'flex-start',
})
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
// S7 unfurl: the "+K more" request — the year-view MonthButton UA reset; ≥44 hit height (decisions.md:82 touch floor).
const MoreButton = styled(View, {
  render: 'button',
  alignSelf: 'flex-start',
  minHeight: 44,
  minWidth: 44,
  justifyContent: 'center',
  paddingHorizontal: '$4',
  marginHorizontal: -4,
  // hover/expanded = a hairline that reads on BOTH paper tones (a bg swap was invisible on the in-month primary cell —
  // g2 review #8, §VIII); expanded keeps it on as the visual pressed state (#16). $colorTextMuted keeps the 3:1 boundary.
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'transparent',
  borderRadius: '$sm',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  hoverStyle: { borderColor: '$colorTextMuted' },
  focusVisibleStyle: { outlineColor: '$colorFocusRing', outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 },
  variants: {
    open: { true: { borderColor: '$colorTextMuted', backgroundColor: '$colorSurfacePrimary' } },
  } as const,
})
// The unfurled day: ONE cell spanning the 7 columns (aria-colspan) in its own row after the week — instant, no height
// animation (motion.md safe list).
const Expanded = styled(View, {
  flexGrow: 1,
  padding: '$12',
  gap: '$8',
  borderWidth: 0.5,
  borderColor: '$colorBorderDefault',
  backgroundColor: '$colorSurfacePrimary',
})

// "+K more" — the shared eyebrow (static text, or the label inside the S7 unfurl button).
const MoreLabel = styled(Text, {
  fontSize: '$caption',
  lineHeight: '$caption',
  color: '$colorTextMuted',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
})

// Web horizontal scroll for the 375 baseline (CV-8): the 560-min table scrolls rather than crushing to ~53px columns.
const SCROLL_X: CSSProperties = { overflowX: 'auto', maxWidth: '100%' }

export function CalendarView<T>({
  items,
  getDate,
  renderItem,
  getKey,
  month: monthProp,
  onMonthChange,
  hideHeader = false,
  today: todayProp,
  pulseKey,
  weekStartsOn = 1,
  maxPerDay = 3,
  expandedDay,
  onExpandedDayChange,
  renderExpanded,
  state = 'success',
  error,
  ref,
  ...rest
}: CalendarViewProps<T>): ReactElement {
  ensureCalendarMotionStyles()
  const r = rest as Record<string, unknown>
  const expandedId = `${useId()}-expanded`
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
      {!hideHeader && (
        <CalHeader>
          <Text
            className="vida-cal-title"
            fontFamily="$display"
            fontSize="$heading"
            fontWeight="500"
            letterSpacing={-0.3}
            color="$colorTextPrimary"
          >
            {format(month, 'MMMM yyyy')}
          </Text>
          {onMonthChange && (
            <View flexDirection="row" gap="$8">
              <Button
                intent="ghost"
                size="sm"
                aria-label="Previous month"
                onPress={() => onMonthChange(subMonths(month, 1))}
              >
                ‹
              </Button>
              <Button
                intent="ghost"
                size="sm"
                aria-label="Next month"
                onPress={() => onMonthChange(addMonths(month, 1))}
              >
                ›
              </Button>
            </View>
          )}
        </CalHeader>
      )}

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

          {Array.from({ length: 6 }, (_, week) => {
            const weekDays = days.slice(week * 7, week * 7 + 7)
            const open =
              onExpandedDayChange != null && renderExpanded != null && !loading
                ? weekDays.find((d) => format(d, 'yyyy-MM-dd') === expandedDay)
                : undefined
            return (
              <Fragment key={week}>
                <Row role="row">
                  {weekDays.map((day) => {
                    const inMonth = isSameMonth(day, month)
                    const isToday = isSameDay(day, today)
                    const tone = !inMonth ? 'oos' : isWeekend(day) ? 'weekend' : undefined
                    const dayKey = format(day, 'yyyy-MM-dd')
                    const dayItems = buckets.get(dayKey) ?? EMPTY
                    const overflow = dayItems.length - maxPerDay
                    const isOpen = open != null && dayKey === expandedDay
                    return (
                      <Day
                        key={day.getTime()}
                        role="cell"
                        aria-label={`${format(day, 'd MMMM yyyy')}${isToday ? ', today' : ''}`}
                        tone={tone}
                      >
                        {isToday ? (
                          <TodayMark key={pulseKey ?? 0} className={pulseClass(pulseKey, 'vida-cal-today')}>
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
                            {overflow > 0 &&
                              (onExpandedDayChange != null && renderExpanded != null ? (
                                <MoreButton
                                  open={isOpen}
                                  className="vida-cal-more-button"
                                  aria-label={`Show all ${dayItems.length} items, ${format(day, 'd MMMM yyyy')}`}
                                  aria-expanded={isOpen}
                                  aria-controls={isOpen ? expandedId : undefined}
                                  onPress={() => onExpandedDayChange(isOpen ? null : dayKey)}
                                  onKeyDown={(e: { key: string }) => {
                                    if (e.key === 'Escape' && isOpen) onExpandedDayChange(null)
                                  }}
                                >
                                  <MoreLabel>+{overflow} more</MoreLabel>
                                </MoreButton>
                              ) : (
                                <MoreLabel className="vida-cal-more">+{overflow} more</MoreLabel>
                              ))}
                          </>
                        )}
                      </Day>
                    )
                  })}
                </Row>
                {open != null && renderExpanded != null ? (
                  <Row role="row" className="vida-cal-expanded-row">
                    <Expanded
                      id={expandedId}
                      role="cell"
                      aria-colspan={7}
                      aria-label={`All items, ${format(open, 'd MMMM yyyy')}`}
                    >
                      {renderExpanded(
                        (buckets.get(format(open, 'yyyy-MM-dd')) ?? EMPTY).map(([item]) => item),
                        format(open, 'yyyy-MM-dd'),
                      )}
                    </Expanded>
                  </Row>
                ) : null}
              </Fragment>
            )
          })}
        </Table>
      </View>
    </CalRoot>
  )
}
