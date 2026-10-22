// fe-calendar S7 — BR-CAL-S7-6 / EC-12: the Global Calendar is a READ-ONLY lens, proven on a real composed vault (R13c).
// Node env: `composeServices` over the spying better-sqlite3 driver → seed real rows → ARM the spy → for every range ×
// a past/current/future period, await every `calendarQueries` queryFn directly (a throw inside React Query would be
// swallowed into an error lane, so the proof never goes through a component). Two independent nets:
//   1. the DRIVER sees zero INSERT/UPDATE/DELETE/REPLACE on ANY method (Drizzle routes SQL via `values`/`exec` too);
//   2. a recording Proxy sees zero calls to a service method outside the read allowlist.
import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, initVault, migrate } from '@vida/core'
import { createBetterSqlite3Driver } from '../../db/test-driver'
import { composeServices } from '../../db/composition-root'
import { calendarQueries, LANES_BY_RANGE, type CalendarServices } from './use-calendar'
import type { CalendarRange } from './calendar-derive'

const ALLOW: Record<keyof CalendarServices, ReadonlySet<string>> = {
  sessions: new Set(['dueIn', 'listAvailability', 'listAvailabilityExceptions', 'getSessionAnalytics']),
  habits: new Set(['getCompletionGrid']),
  tasks: new Set(['listTasks']),
  purposes: new Set(['listPurposes']),
  notes: new Set(['getPageByJournalDate']),
}
const WRITE = /^\s*(insert|update|delete|replace)\b/i

describe('the calendar data plane is read-only (BR-CAL-S7-6 · EC-12)', () => {
  it('every range × period: no write SQL on any driver method, no non-allowlisted service call', async () => {
    let armed = false
    const writes: string[] = []
    const driver = createBetterSqlite3Driver(new Database(':memory:'), (sql) => {
      if (armed && WRITE.test(sql)) writes.push(sql)
    })
    await migrate(driver)
    await initVault()
    const s = composeServices(createDrizzleProxy(driver), 'device-test')

    // seed real rows on every lane the lens reads
    await s.tasks.createTask({ title: 'Send proposal', due_date: '2026-10-06', kind: 'obligation' })
    await s.tasks.createTask({ title: 'Deep work', scheduled_date: '2026-10-08' })
    await s.purposes.createPurpose({ title: 'Be present' })
    await s.purposes.createTarget({ title: 'Read 24 books', next_review_date: '2026-10-07' })
    const c = await s.relationships.createContact({ first_name: 'Ana' })
    await s.relationships.createReminder({ contact_id: c.id, title: 'Call Ana', reminder_date: '2026-10-09' })
    const h = await s.habits.createHabit({ name: 'Meditate' })
    await s.habits.logCompletion(h.id, { date: '2026-10-06' })
    const done = await s.tasks.createTask({ title: 'Ship the draft', due_date: '2026-10-05' })
    await s.tasks.completeTask(done.id)
    const page = await s.notes.ensureJournal('2026-10-06')
    await s.notes.writePageContent(page.id, {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A good, quiet start.' }] }],
    })
    await s.sessions.setAvailability({ day_of_week: 4, start_time: '14:00', end_time: '16:00' })
    await s.sessions.addAvailabilityException({ exception_date: '2026-10-09', is_available: false })

    const calls: string[] = []
    const record = <T extends object>(name: keyof CalendarServices, target: T): T =>
      new Proxy(target, {
        get(t, prop, recv) {
          const v = Reflect.get(t, prop, recv)
          if (typeof v !== 'function') return v
          return (...args: unknown[]) => {
            if (!ALLOW[name].has(String(prop))) calls.push(`${name}.${String(prop)}`)
            return (v as (...a: unknown[]) => unknown).apply(t, args)
          }
        },
      })
    const lens: CalendarServices = {
      sessions: record('sessions', s.sessions),
      habits: record('habits', s.habits),
      tasks: record('tasks', s.tasks),
      purposes: record('purposes', s.purposes),
      notes: record('notes', s.notes),
    }

    armed = true
    let ran = 0
    const seen: Record<string, unknown> = {} // the seeded Living week's results, per lane
    for (const range of Object.keys(LANES_BY_RANGE) as CalendarRange[]) {
      for (const focused of ['2026-09-15', '2026-10-08', '2026-11-20']) {
        for (const q of calendarQueries(range, focused, 1, '2026-10-08', async () => lens)) {
          const out = await q.queryFn()
          if (range === 'living' && focused === '2026-10-08') seen[q.lane] = out
          ran++
        }
      }
    }
    armed = false

    // the proof ran over DATA, not over empty reads (g2 review #9) — every seeded lane answered with rows
    const rows = (lane: string) => (seen[lane] as unknown[] | undefined)?.length ?? 0
    expect(rows('dueDate')).toBeGreaterThan(0)
    expect(rows('openTasks')).toBeGreaterThan(0)
    expect(rows('completed')).toBe(1)
    expect(rows('habits')).toBe(1)
    expect(rows('purposes')).toBe(1)
    expect(rows('availability')).toBe(1)
    expect(rows('exceptions')).toBe(1)
    expect((seen.journal as Record<string, string | null>)['2026-10-06']).toBe('A good, quiet start.')

    expect(ran).toBeGreaterThan(40)
    expect(writes).toEqual([])
    expect(calls).toEqual([])
  })
})
