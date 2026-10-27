// fe-calendar S7 (ELC-3, PLAN-S7 G3/BR-7) — the composition root's PURE half, `composeServices(db, deviceId)`, over a live
// better-sqlite3 vault (real migrations, real Drizzle proxy): the five calendar services construct after notes/journals,
// and the Calendar's due-work feed — `sessions.dueIn` — returns the three registered lanes (tasks · purposes ·
// relationships), the first-consumer-pull registrations (sessions current-spec:164-168).
import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, initVault, migrate } from '@vida/core'
import { createBetterSqlite3Driver } from './test-driver'
import { composeServices } from './composition-root'

async function compose() {
  const driver = createBetterSqlite3Driver(new Database(':memory:'))
  await migrate(driver)
  await initVault() // libsodium for the unkeyed _sync_hash on every write (BR-RT-COMPROOT)
  return composeServices(createDrizzleProxy(driver), 'device-test')
}

// UTC-midnight bounds — the date lanes' window convention (sessions current-spec:168)
const day = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d)
const WEEK = { start: day(2026, 10, 5), end: day(2026, 10, 11) + 86_399_999 }

describe('composeServices (the composition root, pure half)', () => {
  it('constructs notes + journals + the five calendar services', async () => {
    const s = await compose()
    expect(Object.keys(s).sort()).toEqual([
      'habits',
      'journals',
      'notes',
      'purposes',
      'relationships',
      'sessions',
      'tasks',
    ])
  })

  it('sessions.dueIn returns every registered lane: tasks (due + scheduled-only) · purposes · relationships', async () => {
    const s = await compose()
    await s.tasks.createTask({ title: 'Send proposal', due_date: '2026-10-08' })
    await s.tasks.createTask({ title: 'Deep work', scheduled_date: '2026-10-09' })
    await s.purposes.createTarget({ title: 'Read 24 books', next_review_date: '2026-10-08' })
    const c = await s.relationships.createContact({ first_name: 'Ana' })
    await s.relationships.createReminder({ contact_id: c.id, title: 'Call Ana', reminder_date: '2026-10-10' })

    const items = await s.sessions.dueIn(WEEK)
    expect(items.map((i) => `${i.source_module}:${i.label}`).sort()).toEqual([
      'purposes:Read 24 books',
      'relationships:Call Ana',
      'tasks:Deep work',
      'tasks:Send proposal',
    ])
    // the due task carries its date anchor; the scheduled-only task has none (G5 — placed via the listTasks join)
    expect(items.find((i) => i.label === 'Send proposal')?.hard_deadline).toBe(day(2026, 10, 8))
    expect(items.find((i) => i.label === 'Deep work')?.hard_deadline).toBeUndefined()
  })
})
