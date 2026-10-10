// Global Calendar surface — fe-calendar #19 · S1. The read-only lens (ADR-007) composed in the CanvasView frame:
// a period title per range + a range switcher + nav, dispatching to the active range's renderer. S1 ships the frame,
// the switcher/nav, and Month (CalendarView headerless, D4); S2–S5 plug in the other range renderers; S7 replaces the
// S1 fixture with the live `useCalendar` ProviderRead fan-out. Read-only: nav/switch are navigation, no writes (EC-12).
import { useMemo } from 'react'
import { Text, View } from '@tamagui/core'
import { Button, CalendarView, CanvasView, EmptyState } from '@vida/ui'
import { type CalendarRange, useCalendarUIStore } from '../../stores/calendar-ui-store'

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
function mondayOf(d: Date): Date {
  const r = new Date(d)
  r.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return r
}
const MON = { month: 'long', year: 'numeric' } as const
const WD = { weekday: 'long', month: 'short', day: 'numeric' } as const
const DM = { month: 'short', day: 'numeric' } as const

function periodLabel(range: CalendarRange, focused: Date): string {
  if (range === 'year') return String(focused.getFullYear())
  if (range === 'month') return new Intl.DateTimeFormat('en-US', MON).format(focused)
  if (range === 'day') return new Intl.DateTimeFormat('en-US', WD).format(focused)
  // week / agenda / living → the Mon–Sun span
  const mon = mondayOf(focused)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const span = `${new Intl.DateTimeFormat('en-US', DM).format(mon)} – ${new Intl.DateTimeFormat('en-US', DM).format(sun)}, ${sun.getFullYear()}`
  return range === 'week' ? span : `This week · ${span}` // agenda / living
}

function shift(range: CalendarRange, focused: Date, dir: -1 | 1): Date {
  const r = new Date(focused)
  if (range === 'year') r.setFullYear(focused.getFullYear() + dir)
  else if (range === 'month') r.setMonth(focused.getMonth() + dir)
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

export default function CalendarSurface() {
  const { range, focusedDate, setRange, setFocusedDate } = useCalendarUIStore()
  const focused = useMemo(() => parseKey(focusedDate), [focusedDate])
  const title = periodLabel(range, focused)

  const switcher = (
    <View role="toolbar" aria-label="Calendar range" flexDirection="row" gap="$4" flexWrap="wrap" borderWidth={1} borderColor="$colorBorderDefault" borderRadius="$md" padding="$4">
      {RANGES.map((r) => (
        <Button key={r} size="sm" intent={r === range ? 'primary' : 'ghost'} aria-pressed={r === range} onPress={() => setRange(r)}>
          {RANGE_LABEL[r]}
        </Button>
      ))}
    </View>
  )
  const nav = (
    <View flexDirection="row" gap="$4" alignItems="center">
      <Button size="sm" intent="ghost" aria-label="Previous" onPress={() => setFocusedDate(toKey(shift(range, focused, -1)))}>‹</Button>
      <Button size="sm" intent="ghost" onPress={() => setFocusedDate(toKey(new Date()))}>Today</Button>
      <Button size="sm" intent="ghost" aria-label="Next" onPress={() => setFocusedDate(toKey(shift(range, focused, 1)))}>›</Button>
    </View>
  )

  return (
    <View padding="$24" backgroundColor="$colorSurfacePrimary">
      <CanvasView
        eyebrow="Calendar"
        title={title}
        aria-label={`Calendar — ${title}`}
        actions={<View flexDirection="row" gap="$12" alignItems="center" flexWrap="wrap">{switcher}{nav}</View>}
      >
        {range === 'month' ? (
          <CalendarView<MonthEv>
            items={monthFixture(focused)}
            getDate={(i) => i.date}
            getKey={(i) => i.id}
            month={new Date(focused.getFullYear(), focused.getMonth(), 1)}
            today={new Date()}
            hideHeader
            aria-label="Month grid"
            renderItem={(i) => (
              <View flexDirection="row" alignItems="center" gap="$4">
                <View width={7} height={7} borderRadius="$full" backgroundColor={i.color} />
                <Text fontSize="$caption" color="$colorTextPrimary">{i.title}</Text>
              </View>
            )}
          />
        ) : (
          <EmptyState title={`${RANGE_LABEL[range]} view`} titleLevel={3}>
            <Text fontSize="$small" color="$colorTextMuted">This range ships in a later slice of #19 (S2–S5). The frame, switcher, and Month are live.</Text>
          </EmptyState>
        )}
      </CanvasView>
    </View>
  )
}
