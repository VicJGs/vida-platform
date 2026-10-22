// Global Calendar surface — fe-calendar #19. The read-only lens (ADR-007) composed in the CanvasView frame: a period
// title per range + a range switcher + nav, dispatching to the active range's renderer (S1 Month · S2 Agenda · S3
// Week/Day · S4 Year · S5 Living). **S7 (the entity close):** every range reads LIVE data via `useCalendar` (the
// ProviderRead fan-out over `getServices()`); the S1–S5 fixtures serve only the DEV `?sample` gate mode (BR-CAL-S7-5,
// router-subscribed). Month unfurls a dense day in place (EC-F3); Today pulses the today mark and a range switch fades
// the region in (EC-F2). Read-only: nav/switch/unfurl are navigation, never writes (EC-12). Locale is READ from the
// Settings prefs (time_format · week_starts_on — PLAN-S3 BR-16).
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { Text, useMedia, View } from '@tamagui/core'
import {
  AgendaView,
  Button,
  CalendarView,
  CanvasView,
  type LivingDay,
  LivingView,
  Menu,
  RangeTransition,
  WeekView,
  YearView,
} from '@vida/ui'
import type { Breakpoint } from '../../shell/breakpoints'
import { type CalendarRange, useCalendarUIStore } from '../../stores/calendar-ui-store'
import { usePreferencesStore, type WeekStartsOn } from '../../stores/preferences-store'
import { MONTH_MAX_PER_DAY, spanKeys, type MonthChip } from './calendar-derive'
import { sampleFeed } from './calendar-sample'
import { useCalendar, type CalendarFeed } from './use-calendar'

const RANGES: CalendarRange[] = ['year', 'month', 'week', 'day', 'agenda', 'living']
const RANGE_LABEL: Record<CalendarRange, string> = {
  year: 'Year',
  month: 'Month',
  week: 'Week',
  day: 'Day',
  agenda: 'Agenda',
  living: 'Living',
}

// ── TZ-safe date helpers (parse 'YYYY-MM-DD' by PARTS — never new Date(str), which is UTC and off-by-one in UTC−3) ──
function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/** The first day of `d`'s week per the user's week_starts_on (0 = Sunday, 1 = Monday). */
function weekStartOf(d: Date, weekStartsOn: WeekStartsOn): Date {
  const r = new Date(d)
  r.setDate(d.getDate() - ((d.getDay() - weekStartsOn + 7) % 7))
  return r
}
const MON = { month: 'long', year: 'numeric' } as const
const WD = { weekday: 'long', month: 'short', day: 'numeric' } as const
const DM = { month: 'short', day: 'numeric' } as const

function periodLabel(range: CalendarRange, focused: Date, weekStartsOn: WeekStartsOn): string {
  if (range === 'year') return String(focused.getFullYear())
  if (range === 'month') return new Intl.DateTimeFormat('en-US', MON).format(focused)
  if (range === 'day') return new Intl.DateTimeFormat('en-US', WD).format(focused)
  // week / agenda / living → the 7-day span from the user's week start
  const { span, isCurrent } = weekSpan(focused, weekStartsOn)
  return range !== 'week' && isCurrent ? `This week · ${span}` : span
}

// The focused week's span ("Oct 12 – Oct 18, 2026") + whether it is the CURRENT week — "This week" is a claim about the
// current week only (the S1-chrome honesty rule). Shared by the period title and the Living budget label.
function weekSpan(focused: Date, weekStartsOn: WeekStartsOn): { span: string; isCurrent: boolean } {
  const first = weekStartOf(focused, weekStartsOn)
  const last = new Date(first)
  last.setDate(first.getDate() + 6)
  const span = `${new Intl.DateTimeFormat('en-US', DM).format(first)} – ${new Intl.DateTimeFormat('en-US', DM).format(last)}, ${last.getFullYear()}`
  return { span, isCurrent: toKey(first) === toKey(weekStartOf(new Date(), weekStartsOn)) }
}

// Month/year steps clamp the day to the target month's length — a bare setMonth on Jan 31 lands on "Feb 31" = Mar 3
// and skips February.
// The same clamp serves the Year drill-in (`clampToMonth`): Mar 31 → February lands on Feb 28, not Mar 3.
function clampToMonth(d: Date, year: number, month: number): Date {
  const last = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(d.getDate(), last))
}
function addMonthsClamped(d: Date, months: number): Date {
  const first = new Date(d.getFullYear(), d.getMonth() + months, 1)
  return clampToMonth(d, first.getFullYear(), first.getMonth())
}

function shift(range: CalendarRange, focused: Date, dir: -1 | 1): Date {
  const r = new Date(focused)
  if (range === 'year') return addMonthsClamped(focused, dir * 12)
  else if (range === 'month') return addMonthsClamped(focused, dir)
  else if (range === 'day') r.setDate(focused.getDate() + dir)
  else r.setDate(focused.getDate() + dir * 7) // week / agenda / living
  return r
}

export interface CalendarSurfaceProps {
  /** Test/story-only breakpoint override (mirrors AppShell.__bp) — bypasses useMedia so jsdom can assert the condense. */
  __bp?: Breakpoint
}

export default function CalendarSurface({ __bp }: CalendarSurfaceProps = {}) {
  const { range, focusedDate, expandedDay, setRange, setFocusedDate, setExpandedDay } = useCalendarUIStore()
  const weekStartsOn = usePreferencesStore((s) => s.weekStartsOn)
  const timeFormat = usePreferencesStore((s) => s.timeFormat)
  // DEV/gate `?sample` (BR-CAL-S7-5): subscribe to the ROUTER's location — a bare window.location read is render-time-only
  // (the session-hud S3 catch). Prod never takes the sample path (vite statically replaces NODE_ENV).
  const search = useRouterState({ select: (s) => s.location.searchStr })
  const sample = process.env.NODE_ENV !== 'production' && new URLSearchParams(search).has('sample')
  const live = useCalendar(range, focusedDate, weekStartsOn, { enabled: !sample, timeFormat })
  const feed: CalendarFeed = sample ? sampleFeed(range, focusedDate, weekStartsOn) : live
  // EC-F2 today pulse (R9) — a local counter: each Today press bumps `n` and ARMS it; every navigation / range switch
  // DISARMS it in the same event (batched → one render), so a remounted today mark never replays it — even after
  // Next → Previous lands back on the very same view (g2 review #1). Disarmed/never pressed = key 0 (no mount animation).
  const [pulse, setPulse] = useState({ n: 0, armed: false })
  const pulseKey = pulse.armed ? pulse.n : 0
  const disarm = () => setPulse((p) => (p.armed ? { ...p, armed: false } : p))
  const goRange = (r: CalendarRange) => {
    disarm()
    setRange(r)
  }
  const media = useMedia()
  const isTabletUp = __bp ? __bp !== 'mobile' : media.tablet
  const focused = useMemo(() => parseKey(focusedDate), [focusedDate])
  const title = periodLabel(range, focused, weekStartsOn)
  const focusedWeek = weekSpan(focused, weekStartsOn)
  const livingWeekLabel = focusedWeek.isCurrent ? 'This week' : focusedWeek.span

  // Year drill-in → Month. The pressed month button unmounts with YearView, so focus would fall to <body>; per the
  // FOCUS_CONTRACT (state-conventions §5 — an in-surface view swap is the `tabChange → panel` transition) the Month grid
  // takes focus once it renders. Only the drill moves focus; the range switcher keeps focus on its own toggle.
  const monthRef = useRef<HTMLDivElement>(null)
  const focusMonthAfterDrill = useRef(false)
  useEffect(() => {
    if (range === 'month' && focusMonthAfterDrill.current) {
      focusMonthAfterDrill.current = false
      monthRef.current?.focus()
    }
  }, [range])
  const pickMonth = (month: number) => {
    focusMonthAfterDrill.current = true
    setFocusedDate(toKey(clampToMonth(focused, focused.getFullYear(), month)))
    goRange('month')
  }

  // Range chrome: lg buttons (48px ≥ the 44×44 touch floor at every width, decisions.md:82) with ≥8px gaps. Below 768
  // the 6-range toolbar condenses to a Menu (EC-1, the CollectionView condense) so the actions slot fits a 375 masthead.
  const switcher = isTabletUp ? (
    <View
      role="toolbar"
      aria-label="Calendar range"
      flexDirection="row"
      gap="$8"
      flexWrap="wrap"
      borderWidth={1}
      borderColor="$colorBorderDefault"
      borderRadius="$md"
      padding="$4"
    >
      {RANGES.map((r) => (
        <Button
          key={r}
          size="lg"
          intent={r === range ? 'primary' : 'ghost'}
          aria-pressed={r === range}
          onPress={() => goRange(r)}
        >
          {RANGE_LABEL[r]}
        </Button>
      ))}
    </View>
  ) : (
    <Menu
      aria-label="Calendar range"
      trigger={<Button size="lg" intent="ghost">{`Range: ${RANGE_LABEL[range]}`}</Button>}
      items={RANGES.map((r) => ({
        id: r,
        label: RANGE_LABEL[r],
        // the active range carries a check (the toolbar's aria-pressed has no menu-item equivalent; the trigger label
        // names the active range for assistive tech)
        leading: r === range ? <Text color="$colorTextPrimary">✓</Text> : <Text> </Text>,
        onSelect: () => goRange(r),
      }))}
    />
  )
  const nav = (
    <View flexDirection="row" gap="$8" alignItems="center">
      <Button
        size="lg"
        intent="ghost"
        aria-label="Previous"
        onPress={() => {
          disarm()
          setFocusedDate(toKey(shift(range, focused, -1)))
        }}
      >
        ‹
      </Button>
      <Button
        size="lg"
        intent="ghost"
        onPress={() => {
          setFocusedDate(toKey(new Date()))
          setPulse((p) => ({ n: p.n + 1, armed: true }))
        }}
      >
        Today
      </Button>
      <Button
        size="lg"
        intent="ghost"
        aria-label="Next"
        onPress={() => {
          disarm()
          setFocusedDate(toKey(shift(range, focused, 1)))
        }}
      >
        ›
      </Button>
    </View>
  )

  return (
    <View padding="$24" backgroundColor="$colorSurfacePrimary">
      <CanvasView
        eyebrow="Calendar"
        title={title}
        aria-label={`Calendar — ${title}`}
        // Direct children of the frame's wrapping actions slot, so the nav reflows under the switcher when they don't
        // fit on one row (768 toolbar; 375 in wide-chrome presets).
        actions={
          <>
            {switcher}
            {nav}
          </>
        }
      >
        <RangeTransition transitionKey={range}>
          <RangeBody
            range={range}
            focused={focused}
            focusedDate={focusedDate}
            feed={feed}
            weekStartsOn={weekStartsOn}
            timeFormat={timeFormat}
            pulseKey={pulseKey}
            expandedDay={expandedDay}
            setExpandedDay={setExpandedDay}
            monthRef={monthRef}
            pickMonth={pickMonth}
            livingWeekLabel={livingWeekLabel}
          />
        </RangeTransition>
      </CanvasView>
    </View>
  )
}

type RegionState = 'loading' | 'empty' | 'error' | 'success'

// The active range's renderer, fed by the live (or DEV sample) `CalendarFeed`. Each renderer owns its terminal states
// (state-as-prop, BR-2); write intents stay ABSENT (deny-safe — no dead controls, seam-contract.md:135-138).
function RangeBody({
  range,
  focused,
  focusedDate,
  feed,
  weekStartsOn,
  timeFormat,
  pulseKey,
  expandedDay,
  setExpandedDay,
  monthRef,
  pickMonth,
  livingWeekLabel,
}: {
  range: CalendarRange
  focused: Date
  focusedDate: string
  feed: CalendarFeed
  weekStartsOn: WeekStartsOn
  timeFormat: '12h' | '24h'
  pulseKey: number
  expandedDay: string | null
  setExpandedDay: (day: string | null) => void
  monthRef: React.RefObject<HTMLDivElement | null>
  pickMonth: (month: number) => void
  livingWeekLabel: string
}) {
  const state: RegionState = feed.state
  const today = parseKey(feed.today)
  if (range === 'month') {
    return (
      <CalendarView<MonthChip>
        ref={monthRef}
        // programmatic focus target for the Year drill-in (not a tab stop); CalendarView rings it when focused
        tabIndex={-1}
        items={feed.month ?? []}
        getDate={(i) => i.date}
        getKey={(i) => i.id}
        month={new Date(focused.getFullYear(), focused.getMonth(), 1)}
        today={today}
        weekStartsOn={weekStartsOn}
        maxPerDay={MONTH_MAX_PER_DAY}
        // the grid's empty is designed (never a status) — only loading/error reach it
        state={state === 'loading' || state === 'error' ? state : 'success'}
        hideHeader
        aria-label="Month grid"
        // EC-F3 — unfurl a dense day in place (the store collapses it on a month change, R8)
        expandedDay={expandedDay ?? undefined}
        onExpandedDayChange={setExpandedDay}
        renderExpanded={(items, day) => (
          <AgendaView
            days={[
              {
                date: day,
                items: items.map((i) => ({ id: i.id, title: i.title, color: i.color, daypart: 'morning' as const })),
              },
            ]}
            aria-label={`Everything on ${new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(parseKey(day))}`}
          />
        )}
        pulseKey={pulseKey}
        renderItem={(i) => (
          <View flexDirection="row" alignItems="center" gap="$4">
            <View width={7} height={7} borderRadius="$full" backgroundColor={i.color ?? '$colorTextMuted'} />
            <Text fontSize="$caption" color="$colorTextPrimary">
              {i.title}
            </Text>
          </View>
        )}
      />
    )
  }
  if (range === 'agenda') {
    // No onToggleItem: the completion capability (Tasks/Habits/Routines) isn't wired in M1 — absent ⇒ the renderer's
    // read-only done-state (deny-safe; a no-op handler would render dead checkboxes).
    return (
      <AgendaView days={feed.agenda ?? []} today={feed.today} state={state} pulseKey={pulseKey} aria-label="Agenda" />
    )
  }
  if (range === 'year') {
    return (
      <YearView
        year={focused.getFullYear()}
        density={feed.year ?? []}
        today={feed.today}
        weekStartsOn={weekStartsOn}
        onPickMonth={pickMonth}
        state={state}
        pulseKey={pulseKey}
        aria-label="Year"
      />
    )
  }
  if (range === 'week' || range === 'day') {
    return (
      <WeekView
        days={range === 'week' ? spanKeys('week', focusedDate, weekStartsOn) : [focusedDate]}
        blocks={feed.week?.blocks ?? []}
        allDay={feed.week?.allDay ?? []}
        today={feed.today}
        timeFormat={timeFormat}
        state={state}
        pulseKey={pulseKey}
        aria-label={range === 'week' ? 'Week' : 'Day'}
      />
    )
  }
  // Living. While loading / on error the 7 day Cards still need their kinds (the skeleton keeps the week's shape).
  const days: LivingDay[] =
    feed.living?.days ??
    spanKeys('living', focusedDate, weekStartsOn).map((date) => ({
      date,
      kind: date < feed.today ? 'past' : date === feed.today ? 'today' : 'future',
    }))
  // No onSlotOpenTime: the slotting capability (Sessions/Planner) isn't wired in M1 — absent ⇒ a read-only reveal.
  return (
    <LivingView
      days={days}
      threads={state === 'loading' ? [] : feed.living?.threads}
      budget={state === 'loading' ? [] : feed.living?.budget}
      weekLabel={livingWeekLabel}
      state={state}
      pulseKey={pulseKey}
      aria-label="Living"
    />
  )
}
