// ============================================================================
// MOD-notes ① · slice A1 — NotesService tests (Node / better-sqlite3, db-6 harness)
//
// Proves the A1 charter (spec §4):
//   • createPage all 6 types; NP-2 duplicate-journal → JournalExistsError
//   • D-1 create-fresh journal after soft-delete of the prior date
//   • updatePage .strict() (IR-9) + missing-id → /Row not found/
//   • softDeletePage excluded from every read (N7)
//   • getPagesForEntity / listPages favorite/archived; listPages({tag}) fail-loud (BR-A1-7)
//   • live-DB smoke: real createPage round-trips → hashContent ran (N1 guard)
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { createTaggableTypeRegistry } from '../../../foundation/spaces/registry'
import { createSpacesService } from '../../../foundation/spaces/service'
import { createBacklinkResolver } from '../../search/backlink-resolver'
import { createNotesService } from '../service'
import { JournalExistsError, type NotesService, type UpdatePageInput } from '../types'

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

async function setup(): Promise<{ svc: NotesService; db: DrizzleDb }> {
  await initVault() // N1: libsodium ready before the first write (hashContent stamps _sync_hash)
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver) // applies 012_notes → pages + idx_pages_journal_unique
  const db = createDrizzleProxy(driver)
  const registry = createTaggableTypeRegistry()
  const spaces = createSpacesService(db, 'test-device', registry)
  const backlinks = createBacklinkResolver(db, 'test-device')
  const svc = createNotesService(db, 'test-device', { spaces, backlinks, registry })
  return { svc, db }
}

const PAGE_TYPES = [
  'journal',
  'note',
  'task_note',
  'task_group_note',
  'milestone_note',
  'deliverable_note',
] as const

describe('A1 — pages CRUD', () => {
  it('creates each of the 6 page types', async () => {
    const { svc } = await setup()
    for (const [i, type] of PAGE_TYPES.entries()) {
      const input =
        type === 'journal'
          ? { type, journal_date: `2026-03-0${i + 1}` }
          : { type }
      const row = await svc.createPage(input)
      expect(row.type).toBe(type)
      expect(row.id).toBeTruthy()
    }
  })

  it('live-DB smoke: a real createPage round-trips (N1 hashContent ran)', async () => {
    const { svc } = await setup()
    const created = await svc.createPage({ type: 'note', title: 'hello' })
    expect(created._sync_hash).toBeTruthy() // stamped by hashContent — proves libsodium was ready
    const fetched = await svc.getPage(created.id)
    expect(fetched?.id).toBe(created.id)
    expect(fetched?.title).toBe('hello')
  })

  it('rejects a duplicate live journal for the same date (NP-2 → JournalExistsError)', async () => {
    const { svc } = await setup()
    await svc.createPage({ type: 'journal', journal_date: '2026-04-01' })
    await expect(svc.createPage({ type: 'journal', journal_date: '2026-04-01' })).rejects.toBeInstanceOf(
      JournalExistsError,
    )
    await expect(svc.createPage({ type: 'journal', journal_date: '2026-04-01' })).rejects.toMatchObject({
      journalDate: '2026-04-01',
    })
  })

  it('allows a fresh journal for a date whose prior journal was soft-deleted (D-1)', async () => {
    const { svc } = await setup()
    const first = await svc.createPage({ type: 'journal', journal_date: '2026-05-05' })
    await svc.softDeletePage(first.id)
    const second = await svc.createPage({ type: 'journal', journal_date: '2026-05-05' })
    expect(second.id).not.toBe(first.id)
    // the live journal for that date is now the SECOND, not the resurrected first (D-1 completeness)
    expect((await svc.getPageByJournalDate('2026-05-05'))?.id).toBe(second.id)
  })

  it('rejects the journal_date ⇔ journal invariant (createPageSchema.refine)', async () => {
    const { svc } = await setup()
    // non-journal MUST NOT carry a journal_date
    await expect(svc.createPage({ type: 'note', journal_date: '2026-01-01' })).rejects.toThrow()
    // journal MUST carry a journal_date
    await expect(svc.createPage({ type: 'journal' })).rejects.toThrow()
  })

  it('getPage returns null for a never-existed id', async () => {
    const { svc } = await setup()
    expect(await svc.getPage('never-existed')).toBeNull()
  })

  it('updatePage patches a note and rejects unknown/immutable keys (.strict, IR-9)', async () => {
    const { svc } = await setup()
    const note = await svc.createPage({ type: 'note', title: 'a' })
    const updated = await svc.updatePage(note.id, { title: 'b' })
    expect(updated.title).toBe('b')
    // .strict() rejects `type` (immutable identity) and any unknown key
    await expect(
      svc.updatePage(note.id, { type: 'journal' } as unknown as UpdatePageInput),
    ).rejects.toThrow()
  })

  it('updatePage on a missing id rejects /Row not found/', async () => {
    const { svc } = await setup()
    await expect(svc.updatePage('does-not-exist', { title: 'x' })).rejects.toThrow(/Row not found/)
  })

  it('softDeletePage removes the row from every read (N7)', async () => {
    const { svc } = await setup()
    const note = await svc.createPage({ type: 'note', title: 'gone' })
    await svc.softDeletePage(note.id)
    expect(await svc.getPage(note.id)).toBeNull()
    expect(await svc.getPagesByType('note')).toHaveLength(0)
  })

  it('getPageByJournalDate returns the live journal or null', async () => {
    const { svc } = await setup()
    expect(await svc.getPageByJournalDate('2026-06-06')).toBeNull()
    const j = await svc.createPage({ type: 'journal', journal_date: '2026-06-06' })
    expect((await svc.getPageByJournalDate('2026-06-06'))?.id).toBe(j.id)
  })

  it('getPagesForEntity returns only matching, non-deleted pages', async () => {
    const { svc } = await setup()
    await svc.createPage({ type: 'task_note', entity_type: 'task', entity_id: 't1' })
    await svc.createPage({ type: 'task_note', entity_type: 'task', entity_id: 't2' })
    const forT1 = await svc.getPagesForEntity('task', 't1')
    expect(forT1).toHaveLength(1)
    expect(forT1[0]?.entity_id).toBe('t1')
  })

  it('listPages filters by favorite/archived and fails loud on {tag} (BR-A1-7)', async () => {
    const { svc } = await setup()
    await svc.createPage({ type: 'note', title: 'fav', is_favorite: true })
    await svc.createPage({ type: 'note', title: 'plain' })
    const favs = await svc.listPages({ favorite: true })
    expect(favs).toHaveLength(1)
    expect(favs[0]?.title).toBe('fav')
    expect(await svc.listPages({})).toHaveLength(2)
    expect(() => svc.listPages({ tag: 'x' })).toThrow(/A5/)
  })

  it('listPages combines favorite AND archived (multi-cond path)', async () => {
    const { svc } = await setup()
    await svc.createPage({ type: 'note', title: 'fav+arch', is_favorite: true, is_archived: true })
    await svc.createPage({ type: 'note', title: 'fav-only', is_favorite: true })
    await svc.createPage({ type: 'note', title: 'arch-only', is_archived: true })
    const both = await svc.listPages({ favorite: true, archived: true })
    expect(both).toHaveLength(1)
    expect(both[0]?.title).toBe('fav+arch')
  })
})
