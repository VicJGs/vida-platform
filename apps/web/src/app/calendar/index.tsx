// Global Calendar surface — fe-calendar #19 · S1. The read-only lens (ADR-007) composed in the CanvasView frame:
// a period title per range + a range switcher + nav, dispatching to the active range's renderer. S1 ships the frame,
// the switcher/nav, and Month (CalendarView headerless, D4); S2 Agenda; S3 Week/Day (WeekView); S4–S5 plug in the
// rest; S7 replaces the fixtures with the live `useCalendar` ProviderRead fan-out. Read-only: nav/switch are
// navigation, no writes (EC-12). Locale is READ from the Settings prefs (time_format · week_starts_on — PLAN-S3 BR-16).
import { useMemo } from 'react'
import { Text, useMedia, View } from '@tamagui/core'
import {
  AgendaView,
  type AgendaDay,
  Button,
  type CalChip,
  CalendarView,
  CanvasView,
  EmptyState,
  Menu,
  type TimedBlock,
  WeekView,
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
  const first = weekStartOf(focused, weekStartsOn)
  const last = new Date(first)
  last.setDate(first.getDate() + 6)
  const span = `${new Intl.DateTimeFormat('en-US', DM).format(first)} – ${new Intl.DateTimeFormat('en-US', DM).format(last)}, ${last.getFullYear()}`
  // "This week" is a claim about the CURRENT week — any other focused week gets the bare span (the Week range's form).
  const isCurrentWeek = toKey(first) === toKey(weekStartOf(new Date(), weekStartsOn))
  return range !== 'week' && isCurrentWeek ? `This week · ${span}` : span
}

// Month/year steps clamp the day to the target month's length — a bare setMonth on Jan 31 lands on "Feb 31" = Mar 3
// and skips February.
function addMonthsClamped(d: Date, months: number): Date {
  const first = new Date(d.getFullYear(), d.getMonth() + months, 1)
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), last))
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
        ) : range === 'week' || range === 'day' ? (
          <WeekRange range={range} focused={focused} weekStartsOn={weekStartsOn} timeFormat={timeFormat} />
        ) : (
          <EmptyState title={`${RANGE_LABEL[range]} view`} titleLevel={3}>
            <Text fontSize="$small" color="$colorTextMuted">This range ships in a later slice of #19 (S4–S5). The frame, switcher, Month, Week, Day, and Agenda are live.</Text>
          </EmptyState>
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
