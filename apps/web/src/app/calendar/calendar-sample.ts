// ============================================================================
// calendar-sample — the DEV/gate `?sample` feed (fe-calendar #19, BR-CAL-S7-5). The S1–S5 renderer fixtures, MOVED
// verbatim out of index.tsx at S7 so production renders live data only (ELC-4); `?sample` keeps them for the Visual
// Gate's populated cells. NOT live data — never shipped behind a prod path (the notes/home `?sample` convention).
// ============================================================================
import type { AgendaDay, CalChip, HabitThread, LivingDay, PurposeBudget, TimedBlock, YearDensity } from '@vida/ui'
import { fromKey, spanKeys, toKey, type CalendarRange, type MonthChip } from './calendar-derive'
import type { CalendarFeed } from './use-calendar'

type WeekStartsOn = 0 | 1
// Purpose colour is USER DATA (hex) — the sample's stand-in (the live feed has no colour source, D-S6-DEV-2).
const PURPOSE = { career: '#2563EB', health: '#5F6E3E', growth: '#B23733', admin: '#64748B' } as const
const parseKey = (key: string) => fromKey(key)
const weekKeys = (focused: Date, weekStartsOn: WeekStartsOn) => spanKeys('week', toKey(focused), weekStartsOn)

// ── S1 month fixture ──
function monthFixture(focused: Date): MonthChip[] {
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
    day(sparse[0], [
      { id: 'm1', title: '1:1 with Ana', daypart: 'morning', time: '11:00', done: false, color: PURPOSE.career },
    ]),
    day(sparse[1], []),
    day(sparse[3], [
      { id: 'f1', title: 'Design sync', daypart: 'morning', time: '11:00', done: false, color: PURPOSE.career },
      { id: 'f2', title: 'Weekly review', daypart: 'morning', weight: 'can', color: PURPOSE.admin },
    ]),
    day(sparse[4], [
      { id: 's1', title: 'Family lunch', daypart: 'afternoon', time: '12:00', done: false, color: PURPOSE.health },
    ]),
    day(rich, [
      { id: 't1', title: 'Morning check-in', daypart: 'morning', done: true },
      {
        id: 't2',
        title: 'Finish the re-plan draft',
        daypart: 'morning',
        time: '09:30',
        weight: 'must',
        color: PURPOSE.career,
      },
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
function weekFixture(
  focused: Date,
  weekStartsOn: WeekStartsOn,
): { days: string[]; blocks: TimedBlock[]; chips: DatedChip[]; today: string } {
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
  {
    record: 'Shipped the re-plan draft — a good, quiet start.',
    done: [
      { id: 'p1', title: 'Re-plan draft', color: PURPOSE.career },
      { id: 'p2', title: 'Morning check-in', color: PURPOSE.health },
    ],
    focus: '2h40 deep focus',
  },
  {
    record: 'Caught the finance import up; lighter afternoon.',
    done: [{ id: 'p3', title: '1:1 with Ana', color: PURPOSE.career }],
    focus: '1h10 focus',
  },
  {
    record: 'A slow one — read, and let the rest drift.',
    done: [{ id: 'p4', title: 'Read ch. 4', color: PURPOSE.growth }],
    focus: '0h focus',
  },
]
const FUTURE_DAYS: Pick<LivingDay, 'intent' | 'plan'>[] = [
  {
    intent: 'Wrap the week, review what moved.',
    plan: [{ id: 'f1', title: 'Design sync', time: '11:00', color: PURPOSE.career }],
  },
  { intent: 'Rest. Nothing owed.', plan: [{ id: 'f2', title: 'Family lunch', color: PURPOSE.health }] },
  { intent: 'Plan the week ahead.', plan: [{ id: 'f3', title: 'Weekly review', color: PURPOSE.admin }] },
]
function livingFixture(
  focused: Date,
  weekStartsOn: WeekStartsOn,
): { days: LivingDay[]; threads: HabitThread[]; budget: PurposeBudget[] } {
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

/** The whole sample feed for a range — the same `CalendarFeed` shape `useCalendar` returns (one render path). */
export function sampleFeed(range: CalendarRange, focusedKey: string, weekStartsOn: WeekStartsOn): CalendarFeed {
  const focused = parseKey(focusedKey)
  const today = toKey(new Date())
  if (range === 'month') return { state: 'success', today, month: monthFixture(focused) }
  if (range === 'agenda') return { state: 'success', today, agenda: agendaFixture(focused, weekStartsOn).days }
  if (range === 'year') return { state: 'success', today, year: yearFixture(focused) }
  if (range === 'living') return { state: 'success', today, living: livingFixture(focused, weekStartsOn) }
  const fx = weekFixture(focused, weekStartsOn)
  const blocks = range === 'week' ? fx.blocks : fx.blocks.filter((b) => b.day === focusedKey)
  const allDay = (range === 'week' ? fx.chips : fx.chips.filter((c) => c.day === focusedKey)).map(
    ({ id, title, color }): CalChip => ({ id, title, color }),
  )
  return { state: blocks.length + allDay.length ? 'success' : 'empty', today, week: { allDay, blocks } }
}
