// Global Calendar surface — fe-calendar #19 · S1. The read-only lens (ADR-007) composed in the CanvasView frame:
// a period title per range + a range switcher + nav, dispatching to the active range's renderer. S1 ships the frame,
// the switcher/nav, and Month (CalendarView headerless, D4); S2 Agenda; S3 Week/Day (WeekView); S4 Year (YearView,
// a month drills into Month); S5 Living (LivingView — all six ranges live); S7 replaces the fixtures with the live `useCalendar` ProviderRead fan-out. Read-only: nav/switch are
// navigation, no writes (EC-12). Locale is READ from the Settings prefs (time_format · week_starts_on — PLAN-S3 BR-16).
import { useEffect, useMemo, useRef } from 'react'
import { Text, useMedia, View } from '@tamagui/core'
import {
  AgendaView,
  type AgendaDay,
  Button,
  type CalChip,
  CalendarView,
  CanvasView,
  type HabitThread,
  type LivingDay,
  LivingView,
  type PurposeBudget,
  Menu,
  type TimedBlock,
  WeekView,
  type YearDensity,
  YearView,
} from '@vida/ui'
import type { Breakpoint } from '../../shell/breakpoints'
import { type CalendarRange, useCalendarUIStore } from '../../stores/calendar-ui-store'
import { usePreferencesStore, type WeekStartsOn } from '../../stores/preferences-store'

const RANGES: CalendarRange[] = ['year', 'month', 'week', 'day', 'agenda', 'living']
const RANGE_LABEL: Record<CalendarRange, string> = {
  year: 'Year', month: 'Month', week: 'Week', day: 'Day', agenda: 'Agenda', living: 'Living',
}
// Purpose colour is USER DATA (hex) threaded as a prop — never a theme token. (S7 reads the real purpose colour.)
const PURPOSE = { career: '#2563EB', health: '#5F6E3E', growth: '#B23733', admin: '#64748B' } as const

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
/** The 7 'YYYY-MM-DD' keys of `focused`'s week, in display order. */
function weekKeys(focused: Date, weekStartsOn: WeekStartsOn): string[] {
  const start = weekStartOf(focused, weekStartsOn)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return toKey(d)
  })
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

// ── S1 fixture (S7 replaces with useCalendar) ──
type MonthEv = { id: string; date: string; title: string; color: string }
function monthFixture(focused: Date): MonthEv[] {
  const y = focused.getFullYear()
  const m = String(focused.getMonth() + 1).padStart(2, '0')
  const on = (d: number) => `${y}-${m}-${String(d).padStart(2, '0')}`
  return [
    { id: 'e1', date: on(5), title: 'Re-plan draft', color: PURPOSE.career },
    { id: 'e2', date: on(6), title: '1:1 Ana', color: PURPOSE.career },
    { id: 'e3', date: on(8), title: 'Deep work', color: PURPOSE.admin },
    { id: 'e4', date: on(8), title: 'Send proposal', color: PURPOSE.career },
    { id: 'e5', date: on(15), title: 'Design sync', color: PURPOSE.career },
    { id: 'e6', date: on(22), title: 'Read ch.5', color: PURPOSE.growth },
  ]
}

// S2 agenda fixture — the focused week (from the user's week start), shaped like the approved greybox: a dayparted "today" mix (timed ·
// all-day · Must/Can · done), sparser flat days, one empty day (skipped by the renderer). Dayparts are pre-assigned
// here exactly as S7's useCalendar will (bands <12 / 12–17:59 / ≥18; all-day default = morning).
function agendaFixture(focused: Date, weekStartsOn: WeekStartsOn): { days: AgendaDay[]; today: string } {
  const keys = weekKeys(focused, weekStartsOn)
  const on = (offset: number) => keys[offset]
  const today = toKey(new Date())
  // The rich mix sits on TODAY when today is in the focused week, so its daypart grouping shows. In any other week it
  // sits on the 4th day and renders FLAT — correct: no day there is today, and only today is dayparted (BR-CAL-S2-2).
  const todayOffset = [0, 1, 2, 3, 4, 5, 6].find((o) => on(o) === today)
  const rich = todayOffset ?? 3
  const sparse = [0, 1, 2, 3, 4, 5, 6].filter((o) => o !== rich)
  const day = (offset: number, items: AgendaDay['items']): AgendaDay => ({ date: on(offset), items })
  const days: AgendaDay[] = [
    day(sparse[0], [{ id: 'm1', title: '1:1 with Ana', daypart: 'morning', time: '11:00', done: false, color: PURPOSE.career }]),
    day(sparse[1], []),
    day(sparse[3], [
      { id: 'f1', title: 'Design sync', daypart: 'morning', time: '11:00', done: false, color: PURPOSE.career },
      { id: 'f2', title: 'Weekly review', daypart: 'morning', weight: 'can', color: PURPOSE.admin },
    ]),
    day(sparse[4], [{ id: 's1', title: 'Family lunch', daypart: 'afternoon', time: '12:00', done: false, color: PURPOSE.health }]),
    day(rich, [
      { id: 't1', title: 'Morning check-in', daypart: 'morning', done: true },
      { id: 't2', title: 'Finish the re-plan draft', daypart: 'morning', time: '09:30', weight: 'must', color: PURPOSE.career },
      { id: 't3', title: 'Spanish, daily session', daypart: 'morning', weight: 'can', color: PURPOSE.growth },
      { id: 't4', title: 'Call Mariana', daypart: 'afternoon', time: '17:00', done: false, color: PURPOSE.career },
      { id: 't5', title: 'Read ch. 4 — Systems', daypart: 'evening', weight: 'can', color: PURPOSE.growth },
      { id: 't6', title: 'Log yesterday’s expenses', daypart: 'evening', weight: 'can', color: PURPOSE.admin },
    ]),
  ]
  // Display order = date order (the provider orders upstream; the renderer never sorts).
  days.sort((a, b) => a.date.localeCompare(b.date))
  return { today, days }
}

// S3 week/day fixture — the approved greybox shape (Re-plan draft · Deep work · Design sync, a Gym evening, an overlap
// pair + a short block on the rich day) over the focused week. Chips are DATED here only so the Day range can filter
// them — the renderer's chips are undated (the approved one-row strip); S7's useCalendar does this selection.
type DatedChip = CalChip & { day: string }
function weekFixture(focused: Date, weekStartsOn: WeekStartsOn): { days: string[]; blocks: TimedBlock[]; chips: DatedChip[]; today: string } {
  const days = weekKeys(focused, weekStartsOn)
  const today = toKey(new Date())
  const rich = days.includes(today) ? today : days[3]
  const others = days.filter((d) => d !== rich)
  const blocks: TimedBlock[] = [
    { id: 'w1', title: 'Re-plan draft', day: others[0], startHour: 9, color: PURPOSE.career },
    { id: 'w2', title: 'Gym', day: others[2], startHour: 18, color: PURPOSE.health },
    { id: 'w3', title: 'Design sync', day: others[3], startHour: 11, color: PURPOSE.career },
    { id: 'r1', title: 'Deep work', day: rich, startHour: 9, endHour: 10.5, color: PURPOSE.admin },
    { id: 'r2', title: 'Call Mariana', day: rich, startHour: 10, endHour: 11, color: PURPOSE.career },
    { id: 'r3', title: 'Stand-up', day: rich, startHour: 14, endHour: 14.5, color: PURPOSE.career },
  ]
  const chips: DatedChip[] = [
    { id: 'c1', title: 'Spanish session', color: PURPOSE.growth, day: rich },
    { id: 'c2', title: 'Read ch. 4', color: PURPOSE.growth, day: others[1] },
  ]
  return { days, blocks, chips, today }
}

// S4 year fixture — the approved greybox's weekday stripes over the focused year: busy Wednesdays, activity on
// Thursdays + Fridays, a few scattered days. S7's useCalendar derives the real has/busy levels.
function yearFixture(focused: Date): YearDensity[] {
  const y = focused.getFullYear()
  const out: YearDensity[] = []
  for (let m = 0; m < 12; m++) {
    const days = new Date(y, m + 1, 0).getDate()
    for (let d = 1; d <= days; d++) {
      const wd = new Date(y, m, d).getDay()
      const date = toKey(new Date(y, m, d))
      if (wd === 3) out.push({ date, level: 2 })
      else if (wd === 4 || wd === 5 || (d * (m + 1)) % 11 === 0) out.push({ date, level: 1 })
    }
  }
  return out
}

// S5 living fixture — the approved greybox week over the focused week. Each day's KIND comes from today (past < today <
// future by key), so a past or future week renders honestly: no today Card, no "today" thread node. S7's useCalendar
// derives all of this (record lines, thread states, budget, open time, slip flag) from the module reads.
const PAST_DAYS: Pick<LivingDay, 'record' | 'done' | 'focus'>[] = [
  { record: 'Shipped the re-plan draft — a good, quiet start.', done: [{ id: 'p1', title: 'Re-plan draft', color: PURPOSE.career }, { id: 'p2', title: 'Morning check-in', color: PURPOSE.health }], focus: '2h40 deep focus' },
  { record: 'Caught the finance import up; lighter afternoon.', done: [{ id: 'p3', title: '1:1 with Ana', color: PURPOSE.career }], focus: '1h10 focus' },
  { record: 'A slow one — read, and let the rest drift.', done: [{ id: 'p4', title: 'Read ch. 4', color: PURPOSE.growth }], focus: '0h focus' },
]
const FUTURE_DAYS: Pick<LivingDay, 'intent' | 'plan'>[] = [
  { intent: 'Wrap the week, review what moved.', plan: [{ id: 'f1', title: 'Design sync', time: '11:00', color: PURPOSE.career }] },
  { intent: 'Rest. Nothing owed.', plan: [{ id: 'f2', title: 'Family lunch', color: PURPOSE.health }] },
  { intent: 'Plan the week ahead.', plan: [{ id: 'f3', title: 'Weekly review', color: PURPOSE.admin }] },
]
function livingFixture(focused: Date, weekStartsOn: WeekStartsOn): { days: LivingDay[]; threads: HabitThread[]; budget: PurposeBudget[] } {
  const keys = weekKeys(focused, weekStartsOn)
  const today = toKey(new Date())
  const kindOf = (k: string): LivingDay['kind'] => (k < today ? 'past' : k === today ? 'today' : 'future')
  const days: LivingDay[] = keys.map((date, i) => {
    const kind = kindOf(date)
    if (kind === 'past') return { date, kind, ...PAST_DAYS[i % PAST_DAYS.length] }
    if (kind === 'future') return { date, kind, ...FUTURE_DAYS[i % FUTURE_DAYS.length] }
    return {
      date,
      kind,
      entries: [
        { kind: 'item', item: { id: 't1', title: 'Deep work', time: '09:00', color: PURPOSE.career } },
        { kind: 'open', label: '2h open', hint: 'slot deep work or a study session?' },
        { kind: 'item', item: { id: 't2', title: 'Send proposal', color: PURPOSE.career, slipping: true } },
        { kind: 'item', item: { id: 't3', title: 'Gym', time: '18:00', color: PURPOSE.health } },
      ],
    }
  })
  const state = (i: number, missOn?: number) => {
    const k = days[i].kind
    return k === 'today' ? 'today' : k === 'future' ? 'future' : i === missOn ? 'missed' : 'kept'
  }
  // The streak copy must agree with the nodes: the miss sits on the week's 2nd day, named from its real weekday — and
  // only when that day is already past (a future week / an early today has no miss to report).
  const missOn = 1
  const missed = days[missOn].kind === 'past'
  const missDay = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(parseKey(keys[missOn]))
  const threads: HabitThread[] = [
    { id: 'h1', name: 'Meditate', color: PURPOSE.health, days: days.map((_, i) => state(i)), streak: '12-day streak' },
    {
      id: 'h2',
      name: 'Read 20 min',
      color: PURPOSE.growth,
      days: days.map((_, i) => state(i, missOn)),
      streak: missed ? `broke ${missDay} · back on` : '3-day streak',
    },
  ]
  const budget: PurposeBudget[] = [
    { id: 'b1', name: 'Career', color: PURPOSE.career, hours: 6, fraction: 1 },
    { id: 'b2', name: 'Health', color: PURPOSE.health, hours: 0, fraction: 0 },
    { id: 'b3', name: 'Growth', color: PURPOSE.growth, hours: 4, fraction: 0.67 },
    { id: 'b4', name: 'Admin', color: PURPOSE.admin, hours: 2, fraction: 0.33 },
  ]
  return { days, threads, budget }
}

export interface CalendarSurfaceProps {
  /** Test/story-only breakpoint override (mirrors AppShell.__bp) — bypasses useMedia so jsdom can assert the condense. */
  __bp?: Breakpoint
}

export default function CalendarSurface({ __bp }: CalendarSurfaceProps = {}) {
  const { range, focusedDate, setRange, setFocusedDate } = useCalendarUIStore()
  const weekStartsOn = usePreferencesStore((s) => s.weekStartsOn)
  const timeFormat = usePreferencesStore((s) => s.timeFormat)
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
    setRange('month')
  }

  // Range chrome: lg buttons (48px ≥ the 44×44 touch floor at every width, decisions.md:82) with ≥8px gaps. Below 768
  // the 6-range toolbar condenses to a Menu (EC-1, the CollectionView condense) so the actions slot fits a 375 masthead.
  const switcher = isTabletUp ? (
    <View role="toolbar" aria-label="Calendar range" flexDirection="row" gap="$8" flexWrap="wrap" borderWidth={1} borderColor="$colorBorderDefault" borderRadius="$md" padding="$4">
      {RANGES.map((r) => (
        <Button key={r} size="lg" intent={r === range ? 'primary' : 'ghost'} aria-pressed={r === range} onPress={() => setRange(r)}>
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
        onSelect: () => setRange(r),
      }))}
    />
  )
  const nav = (
    <View flexDirection="row" gap="$8" alignItems="center">
      <Button size="lg" intent="ghost" aria-label="Previous" onPress={() => setFocusedDate(toKey(shift(range, focused, -1)))}>‹</Button>
      <Button size="lg" intent="ghost" onPress={() => setFocusedDate(toKey(new Date()))}>Today</Button>
      <Button size="lg" intent="ghost" aria-label="Next" onPress={() => setFocusedDate(toKey(shift(range, focused, 1)))}>›</Button>
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
        actions={<>{switcher}{nav}</>}
      >
        {range === 'month' ? (
          <CalendarView<MonthEv>
            ref={monthRef}
            // programmatic focus target for the Year drill-in (not a tab stop); CalendarView rings it when focused
            tabIndex={-1}
            items={monthFixture(focused)}
            getDate={(i) => i.date}
            getKey={(i) => i.id}
            month={new Date(focused.getFullYear(), focused.getMonth(), 1)}
            today={new Date()}
            weekStartsOn={weekStartsOn}
            hideHeader
            aria-label="Month grid"
            renderItem={(i) => (
              <View flexDirection="row" alignItems="center" gap="$4">
                <View width={7} height={7} borderRadius="$full" backgroundColor={i.color} />
                <Text fontSize="$caption" color="$colorTextPrimary">{i.title}</Text>
              </View>
            )}
          />
        ) : range === 'agenda' ? (
          // No onToggleItem: the completion capability (Tasks/Habits/Routines) isn't wired in M1, and a no-op handler
          // would render focusable checkboxes that do nothing. Absent ⇒ the renderer's read-only done-state (deny-safe);
          // the intent surface is fixed in AgendaView, so S7 just passes the owning capability (seam-contract.md:100).
          <AgendaView {...agendaFixture(focused, weekStartsOn)} aria-label="Agenda" />
        ) : range === 'year' ? (
          <YearView
            year={focused.getFullYear()}
            density={yearFixture(focused)}
            today={toKey(new Date())}
            weekStartsOn={weekStartsOn}
            onPickMonth={pickMonth}
            aria-label="Year"
          />
        ) : range === 'week' || range === 'day' ? (
          <WeekRange range={range} focused={focused} weekStartsOn={weekStartsOn} timeFormat={timeFormat} />
        ) : (
          // No onSlotOpenTime: the slotting capability (Sessions/Planner) isn't wired in M1 — absent ⇒ the open-time
          // offer is a read-only reveal, never a dead button (deny-safe, seam-contract.md:110-113).
          <LivingView
            {...livingFixture(focused, weekStartsOn)}
            weekLabel={livingWeekLabel}
            aria-label="Living"
          />
        )}
      </CanvasView>
    </View>
  )
}

// Week = the 7 days; Day = the focused day alone (WeekView with one column — EC-4). The Day branch selects that day's
// blocks + chips (the provider's job in S7); the renderer gets undated chips either way.
function WeekRange({
  range,
  focused,
  weekStartsOn,
  timeFormat,
}: {
  range: 'week' | 'day'
  focused: Date
  weekStartsOn: WeekStartsOn
  timeFormat: '12h' | '24h'
}) {
  const fx = weekFixture(focused, weekStartsOn)
  const focusedKey = toKey(focused)
  const days = range === 'week' ? fx.days : [focusedKey]
  const blocks = range === 'week' ? fx.blocks : fx.blocks.filter((b) => b.day === focusedKey)
  const chips = (range === 'week' ? fx.chips : fx.chips.filter((c) => c.day === focusedKey)).map(
    ({ id, title, color }): CalChip => ({ id, title, color }),
  )
  return (
    <WeekView
      days={days}
      blocks={blocks}
      allDay={chips}
      today={fx.today}
      timeFormat={timeFormat}
      // a Day with nothing on it is the designed empty grid, not a success-with-nothing
      state={blocks.length + chips.length === 0 ? 'empty' : 'success'}
      aria-label={range === 'week' ? 'Week' : 'Day'}
    />
  )
}
