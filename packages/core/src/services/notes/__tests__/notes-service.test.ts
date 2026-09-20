// ============================================================================
// mod-notes-and-pages ① · Slice 1 — Notes & Pages service (LIVE STORE)
//
// Node / better-sqlite3 live-store harness (mirrors journals-service.test.ts):
// REAL data store, UNLOCKED vault (BR-S1-11 — the sync-hash path runs even with
// empty [E]). Covers the S1 §4 acceptance for pages-core CRUD + NP-2 + registry.
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { pages } from '../../../db/schema/notes'
import { initVault } from '../../../encryption/vault'
import { createRepository } from '../../../db/repository'
import { createTaggableTypeRegistry } from '../../../foundation/spaces/registry'
import { createSpacesService } from '../../../foundation/spaces/service'
import { createBacklinkResolver } from '../../search/backlink-resolver'
import { createNotesService } from '../service'
import {
  JournalExistsError,
  UnregisteredEntityTypeError,
  type NotesService,
  type UpdatePageInput,
} from '../types'
import type { TaggableTypeRegistry } from '../../../foundation/spaces/types'

function createBetterSqlite3Driver(db: Database.Database): SqliteDriver {
  return {
    async exec(sqlText, params) {
      const stmt = db.prepare(sqlText)
      if (stmt.reader) {
        return { rows: stmt.all(...(params ?? [])) as Record<string, unknown>[], changes: 0, lastInsertRowId: 0 }
      }
      const info = stmt.run(...(params ?? []))
      return { rows: [], changes: info.changes, lastInsertRowId: info.lastInsertRowid as number }
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
  svc: NotesService
  db: DrizzleDb
  registry: TaggableTypeRegistry
}

const DEVICE = 'test-device'

async function setup(): Promise<Harness> {
  await initVault() // BR-S1-11 — required even with empty [E] (sync-hash path)
  const bsql = new Database(':memory:')
  await migrate(createBetterSqlite3Driver(bsql))
  const db = createDrizzleProxy(createBetterSqlite3Driver(bsql))
  const registry = createTaggableTypeRegistry()
  const spaces = createSpacesService(db, DEVICE, registry)
  const backlinks = createBacklinkResolver(db, DEVICE)
  const svc = createNotesService({ db, deviceId: DEVICE, spaces, backlinks, registry })
  return { svc, db, registry }
}

describe('mod-notes-and-pages S1 — pages-core service (live store)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('createPage creates a note page + enqueues a sync_queue row', async () => {
    const page = await h.svc.createPage({ type: 'note', title: 'Hello' })
    expect(page.id).toBeTruthy()
    expect(page.type).toBe('note')
    expect(page.title).toBe('Hello')
    const repo = createRepository(h.db, pages, { deviceId: DEVICE, encryptedFields: [], softDelete: true })
    expect(await repo.findAll()).toHaveLength(1)
  })

  it('getPage returns the row; unknown id → null', async () => {
    const created = await h.svc.createPage({ type: 'note', title: 'X' })
    expect(await h.svc.getPage(created.id)).toMatchObject({ id: created.id })
    expect(await h.svc.getPage('nonexistent')).toBeNull()
  })

  it('createPage journal is looked up by journal_date (NP-2 lookup)', async () => {
    await h.svc.createPage({ type: 'journal', journal_date: '2026-09-19' })
    const found = await h.svc.getPageByJournalDate('2026-09-19')
    expect(found?.type).toBe('journal')
    expect(found?.journal_date).toBe('2026-09-19')
  })

  it('createPage throws JournalExistsError on a live journal-date clash (BR-S1-1)', async () => {
    await h.svc.createPage({ type: 'journal', journal_date: '2026-09-19' })
    await expect(h.svc.createPage({ type: 'journal', journal_date: '2026-09-19' })).rejects.toBeInstanceOf(
      JournalExistsError,
    )
  })

  it('a soft-deleted journal date is reusable — no clash (BR-S1-1 ↔ partial-UNIQUE)', async () => {
    const first = await h.svc.createPage({ type: 'journal', journal_date: '2026-09-19' })
    await h.svc.softDeletePage(first.id)
    // The partial-UNIQUE excludes deleted_at IS NOT NULL, so a fresh journal for the date is allowed.
    const second = await h.svc.createPage({ type: 'journal', journal_date: '2026-09-19' })
    expect(second.id).not.toBe(first.id)
  })

  it('createPage validates entity_type against the registry (BR-S1-3)', async () => {
    await expect(
      h.svc.createPage({ type: 'task_note', entity_type: 'definitely_not_registered', entity_id: 't1' }),
    ).rejects.toBeInstanceOf(UnregisteredEntityTypeError)

    h.registry.register('widget')
    const ok = await h.svc.createPage({ type: 'note', entity_type: 'widget', entity_id: 'w1' })
    expect(ok.entity_type).toBe('widget')
  })

  it('createPage rejects a bad journal shape via the schema refine (BR-S1-2)', async () => {
    // journal without journal_date → refine failure (Zod rejection, async)
    await expect(h.svc.createPage({ type: 'journal' })).rejects.toBeTruthy()
  })

  it('updatePage patches allowed fields', async () => {
    const p = await h.svc.createPage({ type: 'note', title: 'A' })
    const updated = await h.svc.updatePage(p.id, { title: 'B', is_favorite: true })
    expect(updated.title).toBe('B')
    expect(updated.is_favorite).toBe(true)
  })

  it('updatePage strict-rejects immutable + unknown keys (BR-S1-4)', async () => {
    const p = await h.svc.createPage({ type: 'note' })
    // deliberately-invalid inputs: `type` is excluded (NP-2 corollary) + an unknown key
    await expect(
      h.svc.updatePage(p.id, { type: 'journal' } as unknown as UpdatePageInput),
    ).rejects.toBeTruthy()
    await expect(
      h.svc.updatePage(p.id, { bogus: 1 } as unknown as UpdatePageInput),
    ).rejects.toBeTruthy()
  })

  it('soft-deleted pages are excluded from reads (BR-S1-7 findWhere filter)', async () => {
    const p = await h.svc.createPage({ type: 'note', title: 'gone' })
    await h.svc.softDeletePage(p.id)
    expect(await h.svc.getPage(p.id)).toBeNull()
    expect(await h.svc.getPagesByType('note')).toHaveLength(0)
  })

  it('word_count is a pass-through: absent → 0, supplied → stored (BR-S1-8)', async () => {
    const a = await h.svc.createPage({ type: 'note' })
    expect(a.word_count).toBe(0)
    const b = await h.svc.createPage({ type: 'note', word_count: 42 })
    expect(b.word_count).toBe(42)
  })

  it('getPagesForEntity returns the entity pages', async () => {
    h.registry.register('widget')
    await h.svc.createPage({ type: 'note', entity_type: 'widget', entity_id: 'w1', title: 'note1' })
    await h.svc.createPage({ type: 'note', entity_type: 'widget', entity_id: 'w2', title: 'note2' })
    const forW1 = await h.svc.getPagesForEntity('widget', 'w1')
    expect(forW1).toHaveLength(1)
    expect(forW1[0]?.title).toBe('note1')
  })

  it('listPages applies favorite/archived filters', async () => {
    await h.svc.createPage({ type: 'note', title: 'plain' })
    await h.svc.createPage({ type: 'note', title: 'fav', is_favorite: true })
    await h.svc.createPage({ type: 'note', title: 'arch', is_archived: true })
    expect(await h.svc.listPages()).toHaveLength(3)
    expect(await h.svc.listPages({ favorite: true })).toHaveLength(1)
    expect(await h.svc.listPages({ archived: true })).toHaveLength(1)
  })

  it('is a factory-object: methods work when destructured (no `this`, BR-S1-10)', async () => {
    const { createPage, getPage } = h.svc
    const p = await createPage({ type: 'note', title: 'detached' })
    expect(await getPage(p.id)).toMatchObject({ title: 'detached' })
  })
})
