// ============================================================================
// XS-templates #36 · S2 Verification Gate — templates store CRUD (XCU-01)
//
// Live-store smoke on the REAL data store (better-sqlite3 + migration 011 + Repository),
// not fixtures. Proves the slice-map S2 ledger:
//   • create → list → get → soft-delete round-trip on `templates`
//   • getTemplate on an absent/deleted id rejects TemplateNotFound
//   • listTemplates excludes a soft-deleted row (findAll → isNull(deleted_at))
//   • create enqueues a sync_queue insert row (co-transactional write path)
//   • bundle persists as the stringified envelope and round-trips
// initVault() IS required: empty encryptedFields skips field encryption, but the
// Repository still computes each row's _sync_hash via vault.hashContent, which
// asserts the vault is initialized (the empty-[E] seam is about field crypto only).
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { and, eq } from 'drizzle-orm'
import { createDrizzleProxy, type SqliteDriver } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { syncQueue } from '../../../db/schema/foundation/sync-queue'
import { createTemplatesService, type TemplatesService } from '../service'
import { TemplateNotFound } from '../types'
import type { TemplateBundle } from '@vida/types'

function createBetterSqlite3Driver(db: Database.Database): SqliteDriver {
  return {
    async exec(sqlText, params) {
      const stmt = db.prepare(sqlText)
      if (stmt.reader) {
        const rows = stmt.all(...(params ?? [])) as Record<string, unknown>[]
        return { rows, changes: 0, lastInsertRowId: 0 }
      }
      const info = stmt.run(...(params ?? []))
      return { rows: [], changes: info.changes, lastInsertRowId: info.lastInsertRowid }
    },
    async run(sqlText, params) {
      if (!params || params.length === 0) db.exec(sqlText)
      else db.prepare(sqlText).run(...params)
    },
    async query(sqlText, params) {
      return db.prepare(sqlText).all(...(params ?? [])) as never
    },
    async values(sqlText, params) {
      return db
        .prepare(sqlText)
        .raw()
        .all(...(params ?? [])) as unknown[][]
    },
    async batch(statements) {
      for (const s of statements) {
        if (s.params && s.params.length > 0) db.prepare(s.sql).run(...s.params)
        else db.exec(s.sql)
      }
    },
    async close() {
      db.close()
    },
  }
}

const bundle = (): TemplateBundle => ({
  root_tag: { name: 'Languages' },
  seed_entities: [],
  views: [{ name: 'All', layout: 'list' }],
  enabled_blocks: [{ capability_def_id: 'cap_1' }],
})

let svc: TemplatesService
let db: ReturnType<typeof createDrizzleProxy>

beforeEach(async () => {
  await initVault()
  const sqlite = new Database(':memory:')
  const driver = createBetterSqlite3Driver(sqlite)
  await migrate(driver)
  db = createDrizzleProxy(driver)
  svc = createTemplatesService(db, 'device-1')
})

describe('xs-templates S2 — store CRUD', () => {
  it('creates a template with a fresh id and round-trips the bundle', async () => {
    const b = bundle()
    const row = await svc.createTemplate({ name: 'Languages starter', bundle: b })
    expect(row.id).toBeTruthy()
    expect(row.name).toBe('Languages starter')
    expect(JSON.parse(row.bundle)).toEqual(b)
  })

  it('lists created templates and excludes soft-deleted ones', async () => {
    const a = await svc.createTemplate({ name: 'A', bundle: bundle() })
    const c = await svc.createTemplate({ name: 'C', bundle: bundle() })
    expect((await svc.listTemplates()).map((r) => r.id).sort()).toEqual([a.id, c.id].sort())

    await svc.deleteTemplate(a.id)
    const after = await svc.listTemplates()
    expect(after.map((r) => r.id)).toEqual([c.id])
  })

  it('gets a template by id', async () => {
    const a = await svc.createTemplate({ name: 'A', bundle: bundle() })
    expect((await svc.getTemplate(a.id)).name).toBe('A')
  })

  it('rejects getTemplate on an absent id', async () => {
    await expect(svc.getTemplate('nope')).rejects.toBeInstanceOf(TemplateNotFound)
  })

  it('rejects getTemplate on a soft-deleted id', async () => {
    const a = await svc.createTemplate({ name: 'A', bundle: bundle() })
    await svc.deleteTemplate(a.id)
    await expect(svc.getTemplate(a.id)).rejects.toBeInstanceOf(TemplateNotFound)
  })

  it('enqueues a sync_queue create row on create (co-transactional write path)', async () => {
    const a = await svc.createTemplate({ name: 'A', bundle: bundle() })
    const rows = await db
      .select()
      .from(syncQueue)
      .where(and(eq(syncQueue.table_name, 'templates'), eq(syncQueue.row_id, a.id)))
    expect(rows.some((r) => r.operation === 'create')).toBe(true)
  })
})
