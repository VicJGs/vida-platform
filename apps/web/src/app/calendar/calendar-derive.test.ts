// fe-calendar S7 — calendar-derive under BOTH a negative and a positive UTC offset (R13e / memory: the gate is TZ-blind).
// The zone switches per describe block; every Date is built INSIDE a test (never at collection time).
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { DueItem } from '@vida/core'
import {
  dateLaneBounds,
  daypartOfHabit,
  doneByDay,
  focusLabel,
  isSlipping,
  localBounds,
  MONTH_MAX_PER_DAY,
  openWindows,
  placeDue,
  recordLine,
  spanKeys,
  threadState,
  toAgendaDays,
  toBudget,
  toLivingDays,
  toThreads,
  toTimedBlocks,
  toWeekAllDay,
  toYearDensity,
  todayEntries,
  type AvailabilityRow,
  type ExceptionRow,
  type HabitGridRow,
  type PurposeRow,
  type TaskRow,
} from './calendar-derive'

const utc = (k: string) => Date.UTC(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, Number(k.slice(8, 10)))
const due = (source: string, ref: string, label: string, hard?: number, est = 0): DueItem => ({
  source_module: source,
  ref_id: ref,
  label,
  est_minutes: est,
  urgency: 0,
  ...(hard != null ? { hard_deadline: hard } : null),
})
const task = (id: string, p: Partial<TaskRow> = {}): TaskRow =>
  ({
    id,
    title: id,
    due_date: null,
    scheduled_date: null,
    kind: 'standard',
    status: 'todo',
    completed_at: null,
    ...p,
  }) as TaskRow
const habit = (id: string, days: HabitGridRow['days'], p: Record<string, unknown> = {}): HabitGridRow =>
  ({ habit: { id, name: id, time_of_day: 'morning', current_streak: 0, ...p }, days }) as unknown as HabitGridRow

// The approved greybox week: Mon 5 – Sun 11 Oct 2026, Thu 8 = today.
const WEEK = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']
const TODAY = '2026-10-08'

describe.each(['America/Sao_Paulo', 'Asia/Tokyo'])('calendar-derive in %s', (tz) => {
  let saved: string | undefined
  beforeAll(() => {
    saved = process.env.TZ
    process.env.TZ = tz
    // the TZ guard is LIVE (g2 review #10): a worker that ignored the switch would silently run in the host zone
    expect(new Date(2026, 9, 8).getTimezoneOffset()).toBe(tz === 'Asia/Tokyo' ? -540 : 180)
  })
  afterAll(() => {
    process.env.TZ = saved
  })

  describe('spans (R10)', () => {
    it('week/agenda/living = the focused week for weekStartsOn; day = the day', () => {
      expect(spanKeys('week', '2026-10-08', 1)).toEqual(WEEK)
      expect(spanKeys('living', '2026-10-08', 0)[0]).toBe('2026-10-04') // Sunday start
      expect(spanKeys('day', '2026-10-08', 1)).toEqual(['2026-10-08'])
    })
    it('month = the 42-cell grid; year = every day of the year', () => {
      const m = spanKeys('month', '2026-10-20', 1)
      expect(m).toHaveLength(42)
      expect(m[0]).toBe('2026-09-28') // Monday before Oct 1 (a Thursday)
      expect(spanKeys('year', '2026-03-01', 1)).toHaveLength(365)
      expect(spanKeys('year', '2028-03-01', 1)).toHaveLength(366)
    })
    it('date-lane bounds are pure UTC midnights; local bounds are the user’s midnights', () => {
      expect(dateLaneBounds(WEEK)).toEqual({ start: utc('2026-10-05'), end: utc('2026-10-11') + 86_399_999 })
      const l = localBounds(WEEK)
      expect(new Date(l.start).getHours()).toBe(0)
      expect(new Date(l.start).getDate()).toBe(5)
      expect(new Date(l.end).getDate()).toBe(11)
    })
  })

  describe('placeDue (G5 · R2)', () => {
    const run = (dateLane: DueItem[], openTasks: TaskRow[] = [], instantLane: DueItem[] = [], today = TODAY) => {
      const dropped: string[] = []
      const m = placeDue({ keys: WEEK, dateLane, instantLane, openTasks, today, onDrop: (i) => dropped.push(i.ref_id) })
      const flat = [...m.entries()].flatMap(([d, xs]) => xs.map((x) => `${d}:${x.title}`))
      return { m, flat, dropped }
    }
    it('a task lands on EACH of its due/scheduled days in span (scheduled-in · due-outside included)', () => {
      const t1 = task('both', { due_date: '2026-10-09', scheduled_date: '2026-10-06' })
      const t2 = task('schedOnly', { scheduled_date: '2026-10-07' })
      const t3 = task('dueLater', { due_date: '2026-11-02', scheduled_date: '2026-10-10' })
      const { flat } = run(
        [
          due('tasks', 'both', 'both', utc('2026-10-09')),
          due('tasks', 'schedOnly', 'schedOnly'),
          due('tasks', 'dueLater', 'dueLater', utc('2026-11-02')),
        ],
        [t1, t2, t3],
      )
      expect(flat.sort()).toEqual(['2026-10-06:both', '2026-10-07:schedOnly', '2026-10-09:both', '2026-10-10:dueLater'])
    })
    it('a tasks item that misses the join falls back to its hard_deadline date; none → dropped', () => {
      const { flat, dropped } = run([due('tasks', 'gone', 'gone', utc('2026-10-06')), due('tasks', 'gone2', 'gone2')])
      expect(flat).toEqual(['2026-10-06:gone'])
      expect(dropped).toEqual(['gone2'])
    })
    it('purposes/relationships by their UTC-midnight date — never shifted by the zone', () => {
      const { flat } = run([
        due('purposes', 'p', 'Review', utc('2026-10-05')),
        due('relationships', 'r', 'Call Ana', utc('2026-10-11')),
      ])
      expect(flat).toEqual(['2026-10-05:Review', '2026-10-11:Call Ana'])
    })
    it('carry-forward: a pre-span relationships nudge → today (once); an in-span nudge stays; out-of-span future dropped', () => {
      const { flat } = run([
        due('relationships', 'old', 'Old friend', utc('2026-09-01')),
        due('relationships', 'mid', 'Mid-week', utc('2026-10-06')),
        due('purposes', 'oldp', 'Old review', utc('2026-09-01')),
        due('relationships', 'next', 'Next week', utc('2026-10-14')),
      ])
      expect(flat.sort()).toEqual(['2026-10-06:Mid-week', '2026-10-08:Old friend'])
      const notVisible = run([due('relationships', 'old', 'Old friend', utc('2026-09-01'))], [], [], '2026-12-01')
      expect(notVisible.flat).toEqual([])
    })
    it('sessions items: date lane ignores them; the instant lane places them by the LOCAL start', () => {
      const end = new Date(2026, 9, 7, 23, 30).getTime() // 23:30 local on the 7th, a 90-min block
      const { m, flat } = run(
        [due('sessions', 'x', 'ignored', utc('2026-10-06'))],
        [],
        [due('sessions', 'b', 'Deep work', end, 90)],
      )
      expect(flat).toEqual(['2026-10-07:Deep work'])
      const p = m.get('2026-10-07')?.[0]
      expect(p?.startHour).toBe(22)
      expect(p?.endHour).toBe(23.5)
    })
    it('the zone edges leak nothing: the week’s first day (Tokyo) and last day (São Paulo) keep their own items only', () => {
      // a date-lane item dated the day BEFORE / AFTER the span is never pulled in by a mixed bound (gate-1 delta #2)
      const { flat } = run([
        due('purposes', 'before', 'Before', utc('2026-10-04')),
        due('purposes', 'first', 'First', utc('2026-10-05')),
        due('purposes', 'last', 'Last', utc('2026-10-11')),
        due('purposes', 'after', 'After', utc('2026-10-12')),
      ])
      expect(flat).toEqual(['2026-10-05:First', '2026-10-11:Last'])
    })

    it('keys are ref:date — a both-dates task never collides', () => {
      const t = task('both', { due_date: '2026-10-09', scheduled_date: '2026-10-06' })
      const { m } = run([due('tasks', 'both', 'both', utc('2026-10-09'))], [t])
      const keys = [...m.values()].flat().map((p) => p.key)
      expect(new Set(keys).size).toBe(keys.length)
    })
  })

  describe('per-range shapes', () => {
    const placedWith = (n: number, date = '2026-10-06') =>
      placeDue({
        keys: WEEK,
        dateLane: Array.from({ length: n }, (_, i) => due('purposes', `p${i}`, `R${i}`, utc(date))),
        instantLane: [],
        openTasks: [],
        today: TODAY,
      })
    it('Year density: 1 = has, 2 = more than Month shows', () => {
      expect(toYearDensity(placedWith(MONTH_MAX_PER_DAY))).toEqual([{ date: '2026-10-06', level: 1 }])
      expect(toYearDensity(placedWith(MONTH_MAX_PER_DAY + 1))).toEqual([{ date: '2026-10-06', level: 2 }])
    })
    it('timed blocks only from timed items; all-day strip = untimed + scheduled habits, weekday-prefixed in Week', () => {
      const m = placedWith(1)
      expect(toTimedBlocks(m)).toEqual([])
      const grid = [habit('Gym', [{ date: '2026-10-06', scheduled: true, count: 0, done: false }])]
      const week = toWeekAllDay(m, grid, WEEK).map((c) => c.title)
      expect(week).toHaveLength(2)
      expect(week.every((t) => /^\S+ · /.test(String(t)))).toBe(true)
      expect(toWeekAllDay(m, grid, ['2026-10-06']).map((c) => c.title)).toEqual(['R0', 'Gym'])
    })
    it('Agenda: obligation → must, standard → no weight; habits by time_of_day; today always present', () => {
      const ob = task('Pay tax', { due_date: '2026-10-06', kind: 'obligation' })
      const st = task('Email', { due_date: '2026-10-06' })
      const m = placeDue({
        keys: WEEK,
        dateLane: [due('tasks', ob.id, 'Pay tax', utc('2026-10-06')), due('tasks', st.id, 'Email', utc('2026-10-06'))],
        instantLane: [],
        openTasks: [ob, st],
        today: TODAY,
      })
      const grid = [
        habit('Run', [{ date: '2026-10-06', scheduled: true, count: 1, done: true }], { time_of_day: 'evening' }),
      ]
      const days = toAgendaDays(m, grid, WEEK, TODAY, '24h')
      expect(days.map((d) => d.date)).toEqual(['2026-10-06', TODAY])
      const items = days[0].items
      expect(items.find((i) => i.title === 'Pay tax')?.weight).toBe('must')
      expect(items.find((i) => i.title === 'Email')?.weight).toBeUndefined()
      expect(items.find((i) => i.title === 'Run')).toMatchObject({ daypart: 'evening', done: true })
      expect(daypartOfHabit('anytime')).toBe('morning')
      expect(daypartOfHabit('whole_day')).toBe('morning')
    })
  })

  describe('Living', () => {
    it('threadState (BR-CAL-S6-7): done → kept · today · future · scheduled past → missed · else off', () => {
      expect(threadState({ date: '2026-10-05', scheduled: false, done: true }, TODAY)).toBe('kept')
      expect(threadState({ date: TODAY, scheduled: true, done: false }, TODAY)).toBe('today')
      expect(threadState({ date: TODAY, scheduled: true, done: true }, TODAY)).toBe('kept')
      expect(threadState({ date: '2026-10-09', scheduled: true, done: false }, TODAY)).toBe('future')
      expect(threadState({ date: '2026-10-06', scheduled: true, done: false }, TODAY)).toBe('missed')
      expect(threadState({ date: '2026-10-06', scheduled: false, done: false }, TODAY)).toBe('off')
    })
    it('threads carry no colour (no source) and the streak only when > 0', () => {
      const g = [habit('Gym', [], { current_streak: 3 }), habit('Read', [])]
      const t = toThreads(g, WEEK, TODAY)
      expect(t[0]).toMatchObject({ name: 'Gym', streak: '3-day streak' })
      expect(t[0]).not.toHaveProperty('color')
      expect(t[1]).not.toHaveProperty('streak')
      expect(t[0].days).toHaveLength(7)
    })
    it('budget: non-terminal purposes, unmeasured, title → name', () => {
      const p = (id: string, status: string) => ({ id, title: `T${id}`, status }) as PurposeRow
      expect(toBudget([p('a', 'in_progress'), p('b', 'completed'), p('c', 'cancelled')])).toEqual([
        { id: 'a', name: 'Ta', hours: null, fraction: null },
      ])
    })
    it('slip: overdue, or scheduled past its due — null-guarded', () => {
      expect(isSlipping({ due_date: '2026-10-07', scheduled_date: null }, TODAY)).toBe(true)
      expect(isSlipping({ due_date: '2026-10-09', scheduled_date: '2026-10-10' }, TODAY)).toBe(true)
      expect(isSlipping({ due_date: '2026-10-09', scheduled_date: '2026-10-08' }, TODAY)).toBe(false)
      expect(isSlipping({ due_date: null, scheduled_date: '2026-10-01' }, TODAY)).toBe(false)
    })
    it('open windows (R4): weekly free − blackouts; exception closed/partial; from now', () => {
      const dow = new Date(2026, 9, 8).getDay()
      const w = (s: string, e: string, ok = true) =>
        ({ day_of_week: dow, start_time: s, end_time: e, is_available: ok }) as AvailabilityRow
      const x = (p: Partial<ExceptionRow>) =>
        ({ exception_date: TODAY, is_available: false, start_time: null, end_time: null, ...p }) as ExceptionRow
      expect(openWindows([w('09:00', '12:00'), w('10:00', '11:00', false)], [], TODAY, 0)).toEqual([
        [540, 600],
        [660, 720],
      ])
      expect(openWindows([w('09:00', '12:00')], [], TODAY, 600)).toEqual([[600, 720]]) // from now (10:00)
      expect(openWindows([w('09:00', '12:00')], [x({})], TODAY, 0)).toEqual([]) // whole day closed
      expect(
        openWindows(
          [w('09:00', '12:00')],
          [x({ is_available: true, start_time: '14:00', end_time: '15:00' })],
          TODAY,
          0,
        ),
      ).toEqual([[840, 900]])
      expect(openWindows([w('09:00', '12:00')], [x({ start_time: '09:00', end_time: '10:00' })], TODAY, 0)).toEqual([
        [600, 720],
      ])
      expect(openWindows([{ ...w('09:00', '12:00'), day_of_week: (dow + 1) % 7 }], [], TODAY, 0)).toEqual([])
    })
    it('today entries (R5): timed + open by start, untimed after, slip-only appended once, deduped', () => {
      const t = task('Send', { due_date: '2026-10-06', scheduled_date: TODAY })
      const placed =
        placeDue({
          keys: WEEK,
          dateLane: [due('tasks', 'Send', 'Send', utc('2026-10-06'))],
          instantLane: [due('sessions', 'b', 'Deep work', new Date(2026, 9, 8, 11).getTime(), 120)],
          openTasks: [t, task('Late', { due_date: '2026-10-01' })],
          today: TODAY,
        }).get(TODAY) ?? []
      const e = todayEntries(placed, [t, task('Late', { due_date: '2026-10-01' })], TODAY, [[14 * 60, 16 * 60]], '24h')
      expect(
        e.map((x) => (x.kind === 'open' ? `open:${x.label}` : `${x.item.title}${x.item.slipping ? '!' : ''}`)),
      ).toEqual(['Deep work', 'open:2h open', 'Send!', 'Late!'])
    })
    it('D-S7-DEV-4: a past-in-week RELATIONSHIPS item carries into today (plain, never slipping); purposes do not', () => {
      const placed = placeDue({
        keys: WEEK,
        dateLane: [
          due('relationships', 'ana', 'Call Ana', utc('2026-10-06')),
          due('purposes', 'rev', 'Quarterly review', utc('2026-10-06')),
          due('relationships', 'fut', 'Lunch Bia', utc('2026-10-10')),
        ],
        instantLane: [],
        openTasks: [],
        today: TODAY,
      })
      const days = toLivingDays({
        days: WEEK,
        today: TODAY,
        placed,
        grid: [],
        openTasks: [],
        done: new Map(),
        records: new Map(),
        focus: new Map(),
        open: [],
        timeFormat: '24h',
      })
      const todayCol = days.find((d) => d.kind === 'today')
      const titles = (todayCol?.entries ?? []).map((e) =>
        e.kind === 'item' ? `${e.item.title}${e.item.slipping ? '!' : ''}` : 'open',
      )
      expect(titles).toEqual(['Call Ana']) // carried, plain; the purposes review is NOT carried; the future nudge stays future
      expect(days.find((d) => d.date === '2026-10-10')?.plan?.map((p) => p.title)).toEqual(['Lunch Bia'])
      // the past column stays a record — the carried nudge is not drawn there
      expect(days.find((d) => d.date === '2026-10-06')).not.toHaveProperty('plan')
    })

    it('done by the LOCAL day of completed_at (a 22:30 completion stays on its day)', () => {
      const at = new Date(2026, 9, 6, 22, 30).getTime()
      const m = doneByDay([task('Late night', { completed_at: at, status: 'completed' })], WEEK)
      expect(m.get('2026-10-06')?.map((i) => i.title)).toEqual(['Late night'])
    })
    it('record line = the first paragraph (not a heading); focus label only when > 0', () => {
      const doc = {
        type: 'doc',
        content: [
          { type: 'heading', content: [{ type: 'text', text: 'Template' }] },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'A ' },
              { type: 'text', text: 'quiet day.' },
            ],
          },
        ],
      }
      expect(recordLine(doc)).toBe('A quiet day.')
      expect(recordLine(null)).toBeNull()
      expect(focusLabel(0)).toBeNull()
      expect(focusLabel(9600)).toBe('2h 40m focus')
      // rounded FIRST — never "60m" / "1h 60m" (g2 review #6)
      expect(focusLabel(3590)).toBe('1h focus')
      expect(focusLabel(7190)).toBe('2h focus')
    })
  })
})
