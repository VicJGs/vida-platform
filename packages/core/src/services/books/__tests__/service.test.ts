// ============================================================================
// mod-books #51 ① · S1 — Works CRUD + reframe (BOO-01/02/03/48)
//
// Node / better-sqlite3 live-store harness (mirrors knowledge/habits): REAL store, UNLOCKED vault (the sync-hash
// path runs even with empty [E]), migrate() applies 023_books so the `books` table exists. Exercises the
// encrypt/persist + reframe seams a mocked test bypasses. Maps 1:1 to PLAN-S1 §4 acceptance.
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { createBooksService } from '../service'
import type { BooksService } from '../types'
import { BookNotFoundError } from '../types'

// Better-sqlite3 driver adapter (verbatim from the knowledge harness — the full SqliteDriver surface).
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
      return db.prepare(sqlText).raw().all(...(params ?? [])) as unknown[][]
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

interface Harness {
  svc: BooksService
  db: DrizzleDb
  bsql: Database.Database
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const svc = createBooksService({ db, deviceId: 'test-device' })
  return { svc, db, bsql }
}

describe('mod-books S1 — Works CRUD + reframe', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('creates a WORK and reads it back faithfully (status default, progress null)', async () => {
    const b = await h.svc.createBook({ title: 'The Pragmatic Programmer' })
    expect(b.id).toBeTruthy()
    expect(b.title).toBe('The Pragmatic Programmer')
    expect(b.status).toBe('want_to_read') // notNull default backfilled on the echo
    expect(b.progress).toBeNull() // BR-BK-2 — derived-override, never set on create
    expect(b.author).toBeNull()
    expect(b.deleted_at).toBeNull()

    const view = await h.svc.getBook(b.id)
    expect(view).not.toBeNull()
    expect(view!.book.id).toBe(b.id)
    expect(view!.book.title).toBe('The Pragmatic Programmer')
    expect(view!.assets).toEqual([]) // S1 aggregate — assets fill at S3
    expect(view!.unifiedProgress).toBeNull() // derives at S8
  })

  it('BR-BK-2 reframe — progress stays null through create AND update (no write path)', async () => {
    const b = await h.svc.createBook({ title: 'Book', status: 'reading', total_pages: 300 })
    expect(b.progress).toBeNull()
    // There is no `progress` (nor format/current_page/genre/tags) on the update input — reframe enforced by type.
    const u = await h.svc.updateBook(b.id, { status: 'completed', rating: 5 })
    expect(u.status).toBe('completed')
    expect(u.rating).toBe(5)
    expect(u.progress).toBeNull() // still derived-null after a mutation
    expect(u.total_pages).toBe(300)
  })

  it('validates status and rating (typed async rejection)', async () => {
    await expect(h.svc.createBook({ title: 'x', status: 'invalid' as never })).rejects.toThrow()
    await expect(h.svc.createBook({ title: 'x', rating: 6 })).rejects.toThrow()
    await expect(h.svc.createBook({ title: 'x', rating: 0 })).rejects.toThrow()
    await expect(h.svc.createBook({ title: '' })).rejects.toThrow() // title min(1)
  })

  it('updateBook guards existence (BookNotFoundError)', async () => {
    await expect(h.svc.updateBook('nonexistent-id', { rating: 3 })).rejects.toBeInstanceOf(BookNotFoundError)
  })

  it('listBooks filters by status and excludes soft-deleted', async () => {
    const reading = await h.svc.createBook({ title: 'A', status: 'reading' })
    await h.svc.createBook({ title: 'B', status: 'completed' })
    await h.svc.createBook({ title: 'C', status: 'reading' })

    const all = await h.svc.listBooks()
    expect(all).toHaveLength(3)

    const onlyReading = await h.svc.listBooks({ status: 'reading' })
    expect(onlyReading).toHaveLength(2)
    expect(onlyReading.every((b) => b.status === 'reading')).toBe(true)

    await h.svc.softDeleteBook(reading.id)
    const afterDelete = await h.svc.listBooks({ status: 'reading' })
    expect(afterDelete).toHaveLength(1) // soft-deleted excluded (findWhere + explicit isNull)
    expect(await h.svc.listBooks()).toHaveLength(2)
  })

  it('softDeleteBook hides the work from getBook + guards existence', async () => {
    const b = await h.svc.createBook({ title: 'Ephemeral' })
    await h.svc.softDeleteBook(b.id)
    expect(await h.svc.getBook(b.id)).toBeNull() // findById excludes soft-deleted
    await expect(h.svc.softDeleteBook(b.id)).rejects.toBeInstanceOf(BookNotFoundError) // already gone
    await expect(h.svc.softDeleteBook('missing')).rejects.toBeInstanceOf(BookNotFoundError)
  })

  it('getCapabilities — plannable on a page basis (BK-17), readable false until assets (S3)', async () => {
    const withPages = await h.svc.createBook({ title: 'Planned', total_pages: 200 })
    const noPages = await h.svc.createBook({ title: 'TOC-less' })
    expect(await h.svc.getCapabilities(withPages.id)).toEqual({ plannable: true, readable: false })
    expect(await h.svc.getCapabilities(noPages.id)).toEqual({ plannable: false, readable: false })
    await expect(h.svc.getCapabilities('missing')).rejects.toBeInstanceOf(BookNotFoundError)
  })
})
