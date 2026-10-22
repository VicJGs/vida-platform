// ============================================================================
// calendar-derive — the Global Calendar's PURE derivations (fe-calendar #19 · S7, PLAN-S7-entity-close.md G5–G11 + §2b
// R1–R10, BR-CAL-S7-1/4). Every number/state the six @vida/ui renderers show is computed HERE, never in @vida/ui
// (seam-contract §B). No React, no I/O — `use-calendar.ts` feeds it the service reads.
//
// TIMEZONE (G7 — the user's timezone, their location): every day key is built from LOCAL calendar fields (never
// `toISOString()` on a local instant); the DATE LANES (tasks · purposes · relationships) anchor `hard_deadline` at the
// item's UTC-midnight date, so their day = the UTC date of that anchor (TZ-free); INSTANT sources (planned blocks,
// focus, completions) are bucketed by the LOCAL day. Formatters are built per call (no module-scope Intl — R13e).
// ============================================================================
import type { Daypart } from '@vida/types'
import type { DueItem, HabitsService, PurposesService, SessionsService, TasksService, TimeRange } from '@vida/core'
import type {
  AgendaDay,
  AgendaItem,
  CalChip,
  HabitThread,
  LivingDay,
  LivingItem,
  PurposeBudget,
  ThreadState,
  TimedBlock,
  TodayEntry,
  YearDensity,
} from '@vida/ui'

// Row types, derived from the service signatures the hook consumes (exactly what arrives).
export type TaskRow = Awaited<ReturnType<TasksService['listTasks']>>[number]
export type HabitGridRow = Awaited<ReturnType<HabitsService['getCompletionGrid']>>[number]
export type AvailabilityRow = Awaited<ReturnType<SessionsService['listAvailability']>>[number]
export type ExceptionRow = Awaited<ReturnType<SessionsService['listAvailabilityExceptions']>>[number]
export type PurposeRow = Awaited<ReturnType<PurposesService['listPurposes']>>[number]

/** CalendarView's chip cap before "+K more" — passed explicitly to the Month grid AND the Year "busy" threshold, so
 *  "busy" = the day Month would crush (G10/R10). */
export const MONTH_MAX_PER_DAY = 3
/** The platform TERMINAL convention — each module defines it locally (tasks/projects/purposes service.ts). */
const TERMINAL = new Set(['completed', 'cancelled'])
const DAY_MS = 86_400_000

// ── strings (BR-CAL-S7-10 / R14 — one map, ready for the pt-BR pass) ──────────────────────────────────────
export const STRINGS = {
  streak: (n: number) => `${n}-day streak`,
  open: (label: string) => `${label} open`,
  openHint: 'Slot deep work, study or a habit',
  focus: (label: string) => `${label} focus`,
} as const

// ── day keys (local calendar fields) ─────────────────────────────────────────────────────────────────────
export function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/** 'YYYY-MM-DD' → a LOCAL Date at noon (never `new Date(str)` — UTC midnight shifts the day in UTC−3). */
export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}
export function addDaysKey(key: string, n: number): string {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}
export function weekStartKey(key: string, weekStartsOn: 0 | 1): string {
  const d = fromKey(key)
  return addDaysKey(key, -((d.getDay() - weekStartsOn + 7) % 7))
}

// ── spans (R10) ──────────────────────────────────────────────────────────────────────────────────────────
export type CalendarRange = 'year' | 'month' | 'week' | 'day' | 'agenda' | 'living'

/** The visible day keys of a range around `focused` (Month = the 42-cell grid for `weekStartsOn`). */
export function spanKeys(range: CalendarRange, focused: string, weekStartsOn: 0 | 1): string[] {
  const run = (start: string, n: number) => Array.from({ length: n }, (_, i) => addDaysKey(start, i))
  if (range === 'day') return [focused]
  if (range === 'week' || range === 'agenda' || range === 'living') return run(weekStartKey(focused, weekStartsOn), 7)
  if (range === 'month') return run(weekStartKey(`${focused.slice(0, 7)}-01`, weekStartsOn), 42)
  const y = Number(focused.slice(0, 4))
  const days = (Date.UTC(y + 1, 0, 1) - Date.UTC(y, 0, 1)) / DAY_MS
  return run(`${y}-01-01`, days)
}

/** The date lanes' window: pure UTC-midnight bounds of the first/last day (sessions current-spec:168). */
export function dateLaneBounds(keys: readonly string[]): TimeRange {
  const utc = (k: string) => Date.UTC(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, Number(k.slice(8, 10)))
  return { start: utc(keys[0]), end: utc(keys[keys.length - 1]) + DAY_MS - 1 }
}
/** The instant lane's window: the user's local midnight of the first day → the end of the last day. */
export function localBounds(keys: readonly string[]): TimeRange {
  const start = fromKey(keys[0])
  start.setHours(0, 0, 0, 0)
  const end = fromKey(keys[keys.length - 1])
  end.setHours(23, 59, 59, 999)
  return { start: start.getTime(), end: end.getTime() }
}
/** The UTC date of a UTC-midnight anchor — TZ-free (the anchor IS a date). */
const utcDate = (ms: number) => new Date(ms).toISOString().slice(0, 10)

// ── G5/G6/R2 placement ───────────────────────────────────────────────────────────────────────────────────
export interface Placed {
  /** `${ref_id}:${date}` — unique per day (a both-dates task / repeated relationship groups share a ref_id, R3). */
  key: string
  refId: string
  source: string
  title: string
  date: string
  /** Present for a timed (sessions) item — local fractional hours. */
  startHour?: number
  endHour?: number
  /** Present for a `tasks` item that matched the open-tasks join. */
  task?: TaskRow
}

export interface PlaceInput {
  keys: readonly string[]
  /** `sessions.dueIn(dateLaneBounds)` — only non-`sessions` items are used. */
  dateLane: readonly DueItem[]
  /** `sessions.dueIn(localBounds)` — only `sessions` items are used. */
  instantLane: readonly DueItem[]
  openTasks: readonly TaskRow[]
  today: string
  /** dropped-item counter for the DEV warning (an item with no placeable date). */
  onDrop?: (item: DueItem) => void
}

/** Place every due item on its day(s) inside the span. Returns day key → items in lane order. */
export function placeDue({ keys, dateLane, instantLane, openTasks, today, onDrop }: PlaceInput): Map<string, Placed[]> {
  const inSpan = new Set(keys)
  const out = new Map<string, Placed[]>(keys.map((k) => [k, []]))
  const tasksById = new Map(openTasks.map((t) => [t.id, t]))
  const seen = new Set<string>()
  const put = (p: Placed) => {
    if (!inSpan.has(p.date) || seen.has(p.key)) return
    seen.add(p.key)
    out.get(p.date)?.push(p)
  }
  const first = keys[0]
  for (const item of dateLane) {
    if (item.source_module === 'sessions') continue
    const base = { refId: item.ref_id, source: item.source_module, title: item.label }
    const task = item.source_module === 'tasks' ? tasksById.get(item.ref_id) : undefined
    if (task) {
      // every tasks item → its row → each of due/scheduled that falls in the span (R2/G5)
      for (const d of new Set([task.due_date, task.scheduled_date])) {
        if (d) put({ ...base, key: `${item.ref_id}:${d}`, date: d, task })
      }
      continue
    }
    if (item.hard_deadline == null) {
      onDrop?.(item)
      continue
    }
    let date = utcDate(item.hard_deadline)
    // carry-forward (REL-36) only for a date BEFORE the span → today when today is visible, else dropped
    if (date < first) {
      if (item.source_module !== 'relationships' || !inSpan.has(today)) continue
      date = today
    }
    put({ ...base, key: `${item.ref_id}:${date}`, date })
  }
  for (const item of instantLane) {
    if (item.source_module !== 'sessions') continue
    if (item.hard_deadline == null) {
      onDrop?.(item)
      continue
    }
    const start = new Date(item.hard_deadline - item.est_minutes * 60_000)
    const end = new Date(item.hard_deadline)
    const hours = (d: Date) => d.getHours() + d.getMinutes() / 60
    const date = toKey(start)
    put({
      key: `${item.ref_id}:${date}`,
      refId: item.ref_id,
      source: 'sessions',
      title: item.label,
      date,
      startHour: hours(start),
      endHour: toKey(end) === date ? hours(end) || 24 : 24,
    })
  }
  return out
}

// ── per-range shapes ─────────────────────────────────────────────────────────────────────────────────────
export interface MonthChip extends CalChip {
  date: string
}
export function toMonthChips(placed: Map<string, Placed[]>): MonthChip[] {
  return [...placed.values()].flat().map((p) => ({ id: p.key, title: p.title, date: p.date }))
}

/** G10/R10 — level per day over the SAME item set Month renders; busy = more than Month shows. */
export function toYearDensity(placed: Map<string, Placed[]>): YearDensity[] {
  const out: YearDensity[] = []
  for (const [date, items] of placed) {
    if (items.length === 0) continue
    out.push({ date, level: items.length > MONTH_MAX_PER_DAY ? 2 : 1 })
  }
  return out
}

export function toTimedBlocks(placed: Map<string, Placed[]>): TimedBlock[] {
  return [...placed.values()]
    .flat()
    .flatMap((p) =>
      p.startHour == null
        ? []
        : [{ id: p.key, title: p.title, day: p.date, startHour: p.startHour, endHour: p.endHour }],
    )
}

/** R3 — Week/Day all-day strip: untimed due items + scheduled habits; Week chips carry a weekday prefix (undated strip). */
export function toWeekAllDay(
  placed: Map<string, Placed[]>,
  grid: readonly HabitGridRow[],
  days: readonly string[],
): CalChip[] {
  // one locale with the rest of the surface ('en-US' — the strings map is the pt-BR seam, BR-10); built per call (R13e)
  const prefix = days.length > 1
  const label = (date: string, title: string) =>
    prefix ? `${new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(fromKey(date))} · ${title}` : title
  const out: CalChip[] = []
  for (const date of days) {
    for (const p of placed.get(date) ?? [])
      if (p.startHour == null) out.push({ id: p.key, title: label(date, p.title) })
    for (const row of grid) {
      const d = row.days.find((x) => x.date === date)
      if (d?.scheduled) out.push({ id: `${row.habit.id}:${date}`, title: label(date, row.habit.name) })
    }
  }
  return out
}

/** D1 bands (seam-contract §Open: <12 morning · 12–17:59 afternoon · ≥18 evening). */
export function daypartOfHour(h: number): Daypart {
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
}
/** A habit's `time_of_day` → a daypart; anytime/whole_day → the all-day default band (morning, D1). */
export function daypartOfHabit(tod: string | null | undefined): Daypart {
  return tod === 'afternoon' || tod === 'evening' || tod === 'morning' ? tod : 'morning'
}
export function formatTime(h: number, timeFormat: '12h' | '24h'): string {
  const hh = Math.floor(h)
  const mm = String(Math.round((h - hh) * 60)).padStart(2, '0')
  if (timeFormat === '24h') return `${String(hh).padStart(2, '0')}:${mm}`
  return `${hh % 12 === 0 ? 12 : hh % 12}:${mm} ${hh < 12 ? 'AM' : 'PM'}`
}

/** G8/G9 — Agenda days: due items (timed → band, untimed → morning) + scheduled habits; obligation → must. */
export function toAgendaDays(
  placed: Map<string, Placed[]>,
  grid: readonly HabitGridRow[],
  days: readonly string[],
  today: string,
  timeFormat: '12h' | '24h',
): AgendaDay[] {
  return days
    .map((date) => {
      const items: AgendaItem[] = []
      for (const p of placed.get(date) ?? []) {
        items.push({
          id: p.key,
          title: p.title,
          daypart: p.startHour != null ? daypartOfHour(p.startHour) : 'morning',
          ...(p.startHour != null ? { time: formatTime(p.startHour, timeFormat) } : null),
          ...(p.task?.kind === 'obligation' ? { weight: 'must' as const } : null),
        })
      }
      for (const row of grid) {
        const d = row.days.find((x) => x.date === date)
        if (!d?.scheduled && !d?.done) continue
        items.push({
          id: `${row.habit.id}:${date}`,
          title: row.habit.name,
          daypart: daypartOfHabit(row.habit.time_of_day),
          done: d.done,
        })
      }
      return { date, items }
    })
    .filter((d) => d.items.length > 0 || d.date === today)
}

// ── Living (G11 · R1 · R4 · R5 · R6 · R7) ────────────────────────────────────────────────────────────────
/** BR-CAL-S6-7: done → kept · today → today · future → future · scheduled ∧ past → missed · else off. */
export function threadState(day: { date: string; scheduled: boolean; done: boolean }, today: string): ThreadState {
  if (day.done) return 'kept'
  if (day.date === today) return 'today'
  if (day.date > today) return 'future'
  return day.scheduled ? 'missed' : 'off'
}
export function toThreads(grid: readonly HabitGridRow[], days: readonly string[], today: string): HabitThread[] {
  return grid.map((row) => ({
    id: row.habit.id,
    name: row.habit.name,
    days: days.map((date) => {
      const d = row.days.find((x) => x.date === date)
      return threadState({ date, scheduled: d?.scheduled ?? false, done: d?.done ?? false }, today)
    }),
    ...(row.habit.current_streak > 0 ? { streak: STRINGS.streak(row.habit.current_streak) } : null),
  }))
}

/** R6 + D-S6-DEV-1/2 — non-terminal purposes; hours/fraction honest-null ("unmeasured"), colour absent. */
export function toBudget(purposes: readonly PurposeRow[]): PurposeBudget[] {
  return purposes
    .filter((p) => !TERMINAL.has(p.status))
    .map((p) => ({ id: p.id, name: p.title, hours: null, fraction: null }))
}

/** R5 — the reduced slip flag (D5), null-guarded. */
export function isSlipping(t: Pick<TaskRow, 'due_date' | 'scheduled_date'>, today: string): boolean {
  return t.due_date != null && (t.due_date < today || (t.scheduled_date != null && t.scheduled_date > t.due_date))
}

const toMin = (hhmm: string | null | undefined): number | null => {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
}
type Interval = [number, number]
const subtract = (free: Interval[], cut: Interval): Interval[] =>
  free.flatMap(([a, b]) => {
    const [c, d] = cut
    if (d <= a || c >= b) return [[a, b] as Interval]
    return [[a, c] as Interval, [d, b] as Interval].filter(([x, y]) => y > x)
  })
const union = (xs: Interval[]): Interval[] =>
  [...xs]
    .sort((p, q) => p[0] - q[0])
    .reduce<Interval[]>((acc, [a, b]) => {
      const last = acc[acc.length - 1]
      if (last && a <= last[1]) last[1] = Math.max(last[1], b)
      else acc.push([a, b])
      return acc
    }, [])

/** R4 — today's free windows from `nowMin` to midnight (minutes since local midnight). */
export function openWindows(
  weekly: readonly AvailabilityRow[],
  exceptions: readonly ExceptionRow[],
  today: string,
  nowMin: number,
): Interval[] {
  const dow = fromKey(today).getDay() // 0 = Sunday — the platform convention
  const ex = exceptions.filter((e) => e.exception_date === today)
  if (ex.some((e) => !e.is_available && toMin(e.start_time) == null)) return [] // whole day closed
  // a timed exception → its [start, end) window, or null (whole-day / malformed)
  const windowOf = (e: ExceptionRow): Interval | null => {
    const a = toMin(e.start_time)
    const b = toMin(e.end_time)
    return a != null && b != null && b > a ? [a, b] : null
  }
  const partial = ex.flatMap((e) => {
    const w = e.is_available ? windowOf(e) : null
    return w ? [w] : []
  })
  let free: Interval[] = partial.length
    ? partial
    : weekly
        .filter((w) => w.day_of_week === dow && w.is_available)
        .flatMap((w) => {
          const a = toMin(w.start_time)
          const b = toMin(w.end_time)
          return a != null && b != null && b > a ? [[a, b] as Interval] : []
        })
  free = union(free)
  const blackouts: Interval[] = [
    ...(partial.length ? [] : weekly.filter((w) => w.day_of_week === dow && !w.is_available)).map(
      (w) => [toMin(w.start_time) ?? 0, toMin(w.end_time) ?? 0] as Interval,
    ),
    ...ex.flatMap((e) => {
      const w = e.is_available ? null : windowOf(e)
      return w ? [w] : []
    }),
  ]
  for (const cut of blackouts) free = subtract(free, cut)
  return subtract(free, [0, nowMin]).filter(([a, b]) => b > a)
}
export function formatDuration(min: number): string {
  // round FIRST — 59.8 min is "1h", never "60m" / "1h 60m" (g2 review #6)
  const total = Math.round(min)
  const h = Math.floor(total / 60)
  const m = total % 60
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`
}

/** R5 — today's ordered entries: timed items + the open block by start; untimed after; slip-only tasks deduped. */
export function todayEntries(
  placedToday: readonly Placed[],
  openTasks: readonly TaskRow[],
  today: string,
  open: Interval[],
  timeFormat: '12h' | '24h',
): TodayEntry[] {
  const seen = new Set<string>()
  const timed: Array<{ at: number; entry: TodayEntry }> = []
  const untimed: TodayEntry[] = []
  for (const p of placedToday) {
    seen.add(p.refId)
    const item: LivingItem = {
      id: p.key,
      title: p.title,
      ...(p.startHour != null ? { time: formatTime(p.startHour, timeFormat) } : null),
      ...(p.task && isSlipping(p.task, today) ? { slipping: true } : null),
    }
    if (p.startHour != null) timed.push({ at: p.startHour * 60, entry: { kind: 'item', item } })
    else untimed.push({ kind: 'item', item })
  }
  const total = open.reduce((s, [a, b]) => s + (b - a), 0)
  if (total > 0)
    timed.push({
      at: open[0][0],
      entry: { kind: 'open', label: STRINGS.open(formatDuration(total)), hint: STRINGS.openHint },
    })
  for (const t of openTasks) {
    if (seen.has(t.id) || !isSlipping(t, today)) continue
    seen.add(t.id)
    untimed.push({ kind: 'item', item: { id: `${t.id}:slip`, title: t.title, slipping: true } })
  }
  return [...timed.sort((a, b) => a.at - b.at).map((x) => x.entry), ...untimed]
}

/** R1 — completed tasks by the LOCAL day of `completed_at` (the user's day, not the UTC day). */
export function doneByDay(completed: readonly TaskRow[], days: readonly string[]): Map<string, LivingItem[]> {
  const inSpan = new Set(days)
  const out = new Map<string, LivingItem[]>()
  for (const t of completed) {
    if (t.completed_at == null) continue
    const d = toKey(new Date(t.completed_at))
    if (!inSpan.has(d)) continue
    out.set(d, [...(out.get(d) ?? []), { id: `${t.id}:done`, title: t.title }])
  }
  return out
}

/** R14 — the first PARAGRAPH's text of a TipTap doc (a heading is not the record line). */
export function recordLine(doc: { content?: readonly unknown[] } | null | undefined): string | null {
  const text = (n: unknown): string => {
    const node = n as { text?: string; content?: unknown[] }
    return node.text ?? (node.content ?? []).map(text).join('')
  }
  for (const n of doc?.content ?? []) {
    if ((n as { type?: string }).type !== 'paragraph') continue
    const t = text(n).trim()
    if (t) return t
  }
  return null
}

export function focusLabel(seconds: number): string | null {
  return seconds > 0 ? STRINGS.focus(formatDuration(seconds / 60)) : null
}

export interface LivingInput {
  days: readonly string[]
  today: string
  placed: Map<string, Placed[]>
  grid: readonly HabitGridRow[]
  openTasks: readonly TaskRow[]
  done: Map<string, LivingItem[]>
  records: ReadonlyMap<string, string | null>
  focus: ReadonlyMap<string, number>
  open: Interval[]
  timeFormat: '12h' | '24h'
}
/** The 7 Living day columns — temporal asymmetry (past record · today live · future intention). */
export function toLivingDays(i: LivingInput): LivingDay[] {
  return i.days.map((date): LivingDay => {
    const items = i.placed.get(date) ?? []
    if (date < i.today) {
      const kept = i.grid.flatMap((r) =>
        r.days.some((d) => d.date === date && d.done) ? [{ id: `${r.habit.id}:${date}`, title: r.habit.name }] : [],
      )
      const done = [...(i.done.get(date) ?? []), ...kept]
      const record = i.records.get(date) ?? null
      const focus = focusLabel(i.focus.get(date) ?? 0)
      return {
        date,
        kind: 'past',
        ...(record ? { record } : null),
        ...(done.length ? { done } : null),
        ...(focus ? { focus } : null),
      }
    }
    if (date === i.today) {
      // D-S7-DEV-4 (Victor-approved 2026-10-22): an uncompleted RELATIONSHIPS item from an earlier day of the week carries
      // into today — the lane's own "overdue carries forward" rule (REL-36, relationships/service.ts:525-531). A past
      // column is a record (EC-8), so without this the nudge would show nowhere in Living. Plain entry, never `slipping`
      // (that flag is task drift, D5); purposes reviews have no carry-forward rule → not carried.
      const carried = i.days
        .filter((d) => d < i.today)
        .flatMap((d) => (i.placed.get(d) ?? []).filter((p) => p.source === 'relationships'))
      return {
        date,
        kind: 'today',
        entries: todayEntries([...items, ...carried], i.openTasks, i.today, i.open, i.timeFormat),
      }
    }
    const plan = items.map((p) => ({
      id: p.key,
      title: p.title,
      ...(p.startHour != null ? { time: formatTime(p.startHour, i.timeFormat) } : null),
    }))
    return { date, kind: 'future', ...(plan.length ? { plan } : null) }
  })
}
