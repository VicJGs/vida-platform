// ============================================================================
// useCalendar — the Global Calendar's LIVE data plane (fe-calendar #19 · S7, the entity-close slice; PLAN-S7 BR-1…6,
// R2/R13b). The deferred canvas-adapter hook (canvas/adapter.ts) — #19 is its first consumer.
//
// `calendarQueries` (PURE) names the reads each range needs as React Query options over `getServices()` (BR-RT-3: a
// local core service, never HTTP). Every read is on the BR-CAL-S7-6 allowlist — the Calendar is a READ-ONLY lens
// (EC-12); writes are the owning modules' capabilities. `useCalendar` runs them through `useQueries`, derives the
// renderer feed via `calendar-derive`, and reports an honest state per lane (BR-3, G17): a lane's error degrades
// that lane; the due-work region's PER-LANE error is unreachable (`dueIn` swallows a throwing lane — sessions
// service.ts:732-739; homed to sessions-rescope LIF-248), a whole-`dueIn` rejection still reaches `error`.
//
// `enabled:false` (the surface's DEV `?sample` mode) runs nothing — the sample feed is the surface's (BR-5).
// ============================================================================
import { useMemo } from 'react'
import { useQueries, type UseQueryResult } from '@tanstack/react-query'
import type { DueItem } from '@vida/core'
import type { AgendaDay, CalChip, HabitThread, LivingDay, PurposeBudget, TimedBlock, YearDensity } from '@vida/ui'
import { getServices, type Services } from '../../db/composition-root'
import { parseContent } from '../../notes/live-mappers'
import {
  dateLaneBounds,
  doneByDay,
  localBounds,
  openWindows,
  placeDue,
  recordLine,
  spanKeys,
  toAgendaDays,
  toBudget,
  toKey,
  toLivingDays,
  toMonthChips,
  toThreads,
  toTimedBlocks,
  toWeekAllDay,
  toYearDensity,
  type AvailabilityRow,
  type CalendarRange,
  type ExceptionRow,
  type HabitGridRow,
  type MonthChip,
  type PurposeRow,
  type TaskRow,
} from './calendar-derive'

/** The services the lens reads — nothing else is reachable from a calendar query. */
export type CalendarServices = Pick<Services, 'sessions' | 'habits' | 'tasks' | 'purposes' | 'notes'>
export type CalState = 'loading' | 'empty' | 'error' | 'success'

export type Lane =
  | 'dueDate'
  | 'dueLocal'
  | 'openTasks'
  | 'completed'
  | 'habits'
  | 'purposes'
  | 'availability'
  | 'exceptions'
  | 'journal'
  | 'focus'

/** R2/R10 — the reads each range needs (the open-tasks join rides every range that shows due work). */
export const LANES_BY_RANGE: Record<CalendarRange, readonly Lane[]> = {
  month: ['dueDate', 'dueLocal', 'openTasks'],
  year: ['dueDate', 'dueLocal', 'openTasks'],
  week: ['dueDate', 'dueLocal', 'openTasks', 'habits'],
  day: ['dueDate', 'dueLocal', 'openTasks', 'habits'],
  agenda: ['dueDate', 'dueLocal', 'openTasks', 'habits'],
  living: [
    'dueDate',
    'dueLocal',
    'openTasks',
    'completed',
    'habits',
    'purposes',
    'availability',
    'exceptions',
    'journal',
    'focus',
  ],
}

export interface CalendarQuery {
  lane: Lane
  queryKey: readonly unknown[]
  queryFn: () => Promise<unknown>
}

/** PURE — the query set for a range (R13b). `load` = `getServices` in the app; a composed test vault in BR-6's proof. */
export function calendarQueries(
  range: CalendarRange,
  focusedDate: string,
  weekStartsOn: 0 | 1,
  today: string,
  load: () => Promise<CalendarServices>,
): CalendarQuery[] {
  const keys = spanKeys(range, focusedDate, weekStartsOn)
  const from = keys[0]
  const to = keys[keys.length - 1]
  const past = keys.filter((k) => k < today)
  const fns: Record<Lane, Omit<CalendarQuery, 'lane'>> = {
    dueDate: {
      queryKey: ['calendar', 'due', 'date', from, to],
      queryFn: async () => (await load()).sessions.dueIn(dateLaneBounds(keys)),
    },
    dueLocal: {
      queryKey: ['calendar', 'due', 'local', from, to],
      queryFn: async () => (await load()).sessions.dueIn(localBounds(keys)),
    },
    openTasks: {
      queryKey: ['calendar', 'tasks', 'open'],
      queryFn: async () => (await load()).tasks.listTasks({ open: true }),
    },
    completed: {
      queryKey: ['calendar', 'tasks', 'completed'],
      queryFn: async () => (await load()).tasks.listTasks({ completed: true }),
    },
    habits: {
      queryKey: ['calendar', 'habits', from, to],
      queryFn: async () => (await load()).habits.getCompletionGrid({ from, to }),
    },
    purposes: { queryKey: ['calendar', 'purposes'], queryFn: async () => (await load()).purposes.listPurposes() },
    availability: {
      queryKey: ['calendar', 'availability'],
      queryFn: async () => (await load()).sessions.listAvailability(),
    },
    exceptions: {
      queryKey: ['calendar', 'exceptions'],
      queryFn: async () => (await load()).sessions.listAvailabilityExceptions(),
    },
    journal: {
      queryKey: ['calendar', 'journal', from, today],
      queryFn: async () => {
        const s = await load()
        const out: Record<string, string | null> = {}
        for (const d of past) {
          const page = await s.notes.getPageByJournalDate(d) // non-creating (EC-12 — never ensureJournal)
          out[d] = page ? recordLine(parseContent(page.content)) : null
        }
        return out
      },
    },
    focus: {
      queryKey: ['calendar', 'focus', from, today],
      queryFn: async () => {
        const s = await load()
        const out: Record<string, number> = {}
        for (const d of past) out[d] = (await s.sessions.getSessionAnalytics(localBounds([d]))).totalFocusSeconds
        return out
      },
    },
  }
  return LANES_BY_RANGE[range].map((lane) => ({ lane, ...fns[lane] }))
}

export interface CalendarFeed {
  /** The active range region's state. */
  state: CalState
  today: string
  month?: MonthChip[]
  agenda?: AgendaDay[]
  week?: { allDay: CalChip[]; blocks: TimedBlock[] }
  year?: YearDensity[]
  /** Lanes are OPTIONAL — absent = that source is unavailable (an honest "unavailable right now", never blank). */
  living?: { days: LivingDay[]; threads?: HabitThread[]; budget?: PurposeBudget[] }
}

export interface UseCalendarOptions {
  /** false → no reads (the surface's DEV `?sample` mode). Default true. */
  enabled?: boolean
  timeFormat?: '12h' | '24h'
  /** Injection seam for "now" (tests). */
  now?: Date
}

const dev = process.env.NODE_ENV !== 'production'

function laneState(rs: ReadonlyArray<UseQueryResult<unknown> | undefined>): CalState {
  if (rs.some((r) => r?.isError)) return 'error'
  if (rs.some((r) => r == null || r.isPending)) return 'loading'
  return 'success'
}
/** Still waiting on ANY lane — checked on its own so one fast error never hides a lane still loading (g2 #4). */
function pending(rs: ReadonlyArray<UseQueryResult<unknown> | undefined>): boolean {
  return rs.some((r) => r == null || r.isPending)
}

export function useCalendar(
  range: CalendarRange,
  focusedDate: string,
  weekStartsOn: 0 | 1,
  { enabled = true, timeFormat = '24h', now }: UseCalendarOptions = {},
): CalendarFeed {
  const at = now ?? new Date()
  const today = toKey(at)
  const queries = calendarQueries(range, focusedDate, weekStartsOn, today, getServices)
  const results = useQueries({
    queries: queries.map((q) => ({ queryKey: q.queryKey, queryFn: q.queryFn, enabled })),
  })
  const lane = (l: Lane) => {
    const i = queries.findIndex((q) => q.lane === l)
    return i < 0 ? undefined : results[i]
  }
  const data = <T>(l: Lane): T | undefined => lane(l)?.data as T | undefined
  const keys = useMemo(() => spanKeys(range, focusedDate, weekStartsOn), [range, focusedDate, weekStartsOn])

  const dueState = laneState([lane('dueDate'), lane('dueLocal'), lane('openTasks')])
  const dueDate = data<DueItem[]>('dueDate')
  const dueLocal = data<DueItem[]>('dueLocal')
  const openTasks = data<TaskRow[]>('openTasks')
  const placed = useMemo(
    () =>
      placeDue({
        keys,
        dateLane: dueDate ?? [],
        instantLane: dueLocal ?? [],
        openTasks: openTasks ?? [],
        today,
        onDrop: dev
          ? (i) => console.warn(`[calendar] dropped a ${i.source_module} due item with no placeable date (${i.ref_id})`)
          : undefined,
      }),
    [keys, dueDate, dueLocal, openTasks, today],
  )
  // a degraded optional lane reads as "nothing" for the composite views (the habits strip), "unavailable" for Living
  const grid = lane('habits')?.isSuccess ? (data<HabitGridRow[]>('habits') ?? []) : []

  if (!enabled) return { state: 'loading', today }
  if (dueState !== 'success') return { state: dueState, today }

  // BR-3: never compute 'empty' from a lane that hasn't answered — the habits strip waits; an ERROR degrades (no habits)
  const habitsLane = lane('habits')
  if ((range === 'week' || range === 'day' || range === 'agenda') && pending([habitsLane]))
    return { state: 'loading', today }
  switch (range) {
    case 'month': {
      return { state: 'success', today, month: toMonthChips(placed) } // the grid's empty is designed (never a status)
    }
    case 'year': {
      const year = toYearDensity(placed)
      return { state: year.length ? 'success' : 'empty', today, year }
    }
    case 'week':
    case 'day': {
      const days = range === 'day' ? [focusedDate] : keys
      const allDay = toWeekAllDay(placed, grid, days)
      const blocks = toTimedBlocks(placed).filter((b) => days.includes(b.day))
      return { state: allDay.length + blocks.length ? 'success' : 'empty', today, week: { allDay, blocks } }
    }
    case 'agenda': {
      const agenda = toAgendaDays(placed, grid, keys, today, timeFormat)
      return { state: agenda.some((d) => d.items.length) ? 'success' : 'empty', today, agenda }
    }
    case 'living': {
      const habits = habitsLane
      const purposes = lane('purposes')
      // every Living lane answers before the week renders (no late pop-in). An error DEGRADES that lane: threads/budget
      // → "unavailable right now" (absent); the open-time / record / done / focus lines → simply not drawn (LivingView
      // has no per-line unavailable affordance — recorded in the S7 ELC record; never a fabricated value).
      const livingLanes = [
        habits,
        purposes,
        lane('completed'),
        lane('journal'),
        lane('focus'),
        lane('availability'),
        lane('exceptions'),
      ]
      if (pending(livingLanes)) return { state: 'loading', today }
      const open =
        lane('availability')?.isSuccess && lane('exceptions')?.isSuccess
          ? openWindows(
              data<AvailabilityRow[]>('availability') ?? [],
              data<ExceptionRow[]>('exceptions') ?? [],
              today,
              at.getHours() * 60 + at.getMinutes(),
            )
          : []
      const days = toLivingDays({
        days: keys,
        today,
        placed,
        grid,
        openTasks: openTasks ?? [],
        done: doneByDay(data<TaskRow[]>('completed') ?? [], keys),
        records: new Map(Object.entries(data<Record<string, string | null>>('journal') ?? {})),
        focus: new Map(Object.entries(data<Record<string, number>>('focus') ?? {})),
        open,
        timeFormat,
      })
      const threads = habits?.isSuccess ? toThreads(grid, keys, today) : undefined
      const budget = purposes?.isSuccess ? toBudget(data<PurposeRow[]>('purposes') ?? []) : undefined
      // what LivingView actually DRAWS — a placed PAST-day item is not drawn (a past column is a record, EC-8)
      const anything =
        (threads?.length ?? 0) > 0 ||
        (budget?.length ?? 0) > 0 ||
        days.some((d) => d.record || d.done?.length || d.focus || d.entries?.length || d.plan?.length)
      return {
        state: anything || threads == null || budget == null ? 'success' : 'empty',
        today,
        living: { days, threads, budget },
      }
    }
  }
}
