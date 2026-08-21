// ============================================================================
// MOD-notes ① — NotesService tests (Node / better-sqlite3, db-6 harness)
//
// Proves the spec §4 acceptance:
//   • factory returns the surface; each table gets an empty-[E] soft-delete repo
//   • page CRUD for all 6 PAGE_TYPE values; journal conflict → JournalExistsError (NP-2)
//   • createPageLink idempotent (no-op / revive-after-unlink) (NP-5)
//   • resolveWikiLink title candidates; ensureEntityNote idempotent + deterministic (NP-8)
//   • createEntityLink/getBacklinks DELEGATE to AR-6/AR-8 (no duplicated link logic)
//   • UnregisteredEntityTypeError on unregistered entity_type (page + delegated link) (NP-6)
//   • entity_tags reads (getTagsForEntity/getEntitiesByTag); tag WRITES stay AR-6
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
import { JournalExistsError, UnregisteredEntityTypeError, type NotesService } from '../types'
import { PAGE_TYPE } from '@vida/types'

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

async function setup(): Promise<{ svc: NotesService; db: DrizzleDb; driver: SqliteDriver }> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver) // all migrations incl. 003 spaces + 012 notes
  const db = createDrizzleProxy(driver)
  const registry = createTaggableTypeRegistry()
  const spaces = createSpacesService(db, 'test-device', registry)
  const backlinks = createBacklinkResolver(db, 'test-device')
  const svc = createNotesService(db, 'test-device', { spaces, backlinks, registry })
  return { svc, db, driver }
}

describe('MOD-notes ① — page CRUD + NP-2', () => {
  it('creates a page for all 6 PAGE_TYPE values', async () => {
    const { svc, driver } = await setup()
    for (const type of PAGE_TYPE) {
      const journal_date = type === 'journal' ? `2026-01-0${PAGE_TYPE.indexOf(type) + 1}` : null
      const page = await svc.createPage({ type, title: `t-${type}`, journal_date } as never)
      expect(page.id).toBeTruthy()
      expect(page.type).toBe(type)
    }
    await driver.close()
  })

  it('getPage / updatePage / softDeletePage round-trip', async () => {
    const { svc, driver } = await setup()
    const p = await svc.createPage({ type: 'note', title: 'hi' } as never)
    expect((await svc.getPage(p.id))?.title).toBe('hi')
    const up = await svc.updatePage(p.id, { title: 'bye', is_favorite: true })
    expect(up.title).toBe('bye')
    expect(up.is_favorite).toBe(true)
    await svc.softDeletePage(p.id)
    expect(await svc.getPage(p.id)).toBeNull() // findById excludes soft-deleted
    await driver.close()
  })

  it('updatePage — type ≡ validator: a normal partial round-trips; a non-updatable key is rejected', async () => {
    const { svc, driver } = await setup()
    const p = await svc.createPage({ type: 'note', title: 'x' } as never)
    // normal partial round-trips (the whitelisted fields)
    const up = await svc.updatePage(p.id, { title: 'y', icon: '📓', word_count: 3 })
    expect(up.title).toBe('y')
    expect(up.word_count).toBe(3)
    // a non-updatable key (entity_type / journal_date / deleted_at) is rejected at runtime AND not in the type
    await expect(
      svc.updatePage(p.id, { entity_type: 'task' } as never),
    ).rejects.toThrow() // .strict() ZodError — NP-2 / soft-delete integrity
    await driver.close()
  })

  it('methods survive DESTRUCTURE — no `this` binding (the ② React-Query consumption shape)', async () => {
    const { svc, driver } = await setup()
    // intra-service calls (createPage→getPageByJournalDate, ensureEntityNote→createPage)
    // must not rely on `this`, or a destructured consumer throws.
    const { createPage, ensureEntityNote } = svc
    const j = await createPage({ type: 'journal', journal_date: '2026-09-01' } as never)
    expect(j.type).toBe('journal')
    const note = await ensureEntityNote('task_note', 'task', 'task-9', { title: 'x' })
    expect(note.entity_id).toBe('task-9')
    await driver.close()
  })

  it('NP-2 — a second journal for the same date throws JournalExistsError', async () => {
    const { svc, driver } = await setup()
    await svc.createPage({ type: 'journal', journal_date: '2026-02-01' } as never)
    await expect(
      svc.createPage({ type: 'journal', journal_date: '2026-02-01' } as never),
    ).rejects.toBeInstanceOf(JournalExistsError)
    // a different date is fine
    const ok = await svc.createPage({ type: 'journal', journal_date: '2026-02-02' } as never)
    expect(ok.journal_date).toBe('2026-02-02')
    await driver.close()
  })

  it('getPagesByType / getPageByJournalDate / listPages filters', async () => {
    const { svc, driver } = await setup()
    await svc.createPage({ type: 'note', title: 'n1', is_favorite: true } as never)
    await svc.createPage({ type: 'note', title: 'n2', is_archived: true } as never)
    await svc.createPage({ type: 'journal', journal_date: '2026-03-01' } as never)
    expect(await svc.getPagesByType('note')).toHaveLength(2)
    expect((await svc.getPageByJournalDate('2026-03-01'))?.type).toBe('journal')
    expect(await svc.listPages({ favorite: true })).toHaveLength(1)
    expect(await svc.listPages({ archived: true })).toHaveLength(1)
    await driver.close()
  })
})

describe('MOD-notes ① — page_links idempotency (NP-5)', () => {
  it('createPageLink twice is an idempotent no-op — one live row', async () => {
    const { svc, driver } = await setup()
    const a = await svc.createPage({ type: 'note', title: 'a' } as never)
    const b = await svc.createPage({ type: 'note', title: 'b' } as never)
    const l1 = await svc.createPageLink(a.id, b.id)
    const l2 = await svc.createPageLink(a.id, b.id) // must NOT throw
    expect(l2.id).toBe(l1.id)
    expect(await svc.getPageLinksFrom(a.id)).toHaveLength(1)
    expect(await svc.getPageLinksTo(b.id)).toHaveLength(1)
    await driver.close()
  })

  it('re-link after unlink revives the row (no raw UNIQUE collision)', async () => {
    const { svc, driver } = await setup()
    const a = await svc.createPage({ type: 'note', title: 'a' } as never)
    const b = await svc.createPage({ type: 'note', title: 'b' } as never)
    const first = await svc.createPageLink(a.id, b.id)
    await svc.removePageLink(a.id, b.id)
    expect(await svc.getPageLinksFrom(a.id)).toHaveLength(0) // soft-deleted, excluded
    const revived = await svc.createPageLink(a.id, b.id)
    expect(revived.id).toBe(first.id)
    expect(revived.deleted_at).toBeNull()
    expect(await svc.getPageLinksFrom(a.id)).toHaveLength(1)
    await driver.close()
  })
})

describe('MOD-notes ① — resolveWikiLink + ensureEntityNote (NP-7/NP-8)', () => {
  it('resolveWikiLink returns title candidates', async () => {
    const { svc, driver } = await setup()
    await svc.createPage({ type: 'note', title: 'Spanish grammar' } as never)
    await svc.createPage({ type: 'note', title: 'Spanish verbs' } as never)
    await svc.createPage({ type: 'note', title: 'French' } as never)
    expect(await svc.resolveWikiLink('Spanish')).toHaveLength(2)
    expect(await svc.resolveWikiLink('French')).toHaveLength(1)
    await driver.close()
  })

  it('ensureEntityNote is idempotent + deterministic (same seed → identical content)', async () => {
    const { svc, driver } = await setup()
    const seed = { title: 'Buy milk', type: 'task', status: 'not_started', date: '2026-04-01' }
    const first = await svc.ensureEntityNote('task_note', 'task', 'task-1', seed)
    const again = await svc.ensureEntityNote('task_note', 'task', 'task-1', seed)
    expect(again.id).toBe(first.id) // idempotent — never a second note
    expect(await svc.getPagesForEntity('task', 'task-1')).toHaveLength(1)
    // deterministic: a different entity with the SAME seed → identical content string
    const other = await svc.ensureEntityNote('task_note', 'task', 'task-2', seed)
    expect(other.content).toBe(first.content)
    await driver.close()
  })

  it('ensureEntityNote rejects an unregistered entity_type (NP-6)', async () => {
    const { svc, driver } = await setup()
    await expect(
      svc.ensureEntityNote('task_note', 'not_a_type', 'x', { title: 'y' }),
    ).rejects.toBeInstanceOf(UnregisteredEntityTypeError)
    await driver.close()
  })
})

describe('MOD-notes ① — NP-6 registry validation on pages', () => {
  it('createPage with an unregistered entity_type throws UnregisteredEntityTypeError', async () => {
    const { svc, driver } = await setup()
    await expect(
      svc.createPage({ type: 'note', entity_type: 'not_a_type', entity_id: 'x' } as never),
    ).rejects.toBeInstanceOf(UnregisteredEntityTypeError)
    await driver.close()
  })
})

describe('MOD-notes ① — facade delegates to AR-6/AR-8', () => {
  it('createEntityLink → AR-6 write, getBacklinks/getEntityLinksFrom → AR-8 read', async () => {
    const { svc, driver } = await setup()
    const page = await svc.createPage({ type: 'note', title: 'p' } as never)
    const link = await svc.createEntityLink(page.id, 'task', 'task-1', 'ctx')
    expect(link.page_id).toBe(page.id)
    const backlinks = await svc.getBacklinks('task', 'task-1')
    expect(backlinks.map((l) => l.id)).toContain(link.id)
    const from = await svc.getEntityLinksFrom(page.id)
    expect(from.map((l) => l.id)).toContain(link.id)
    // remove → gone from the read side
    await svc.removeEntityLink(page.id, 'task', 'task-1')
    expect(await svc.getBacklinks('task', 'task-1')).toHaveLength(0)
    await driver.close()
  })

  it('createEntityLink with an unregistered entity_type throws UnregisteredEntityTypeError', async () => {
    const { svc, driver } = await setup()
    const page = await svc.createPage({ type: 'note', title: 'p' } as never)
    await expect(
      svc.createEntityLink(page.id, 'not_a_type', 'x'),
    ).rejects.toBeInstanceOf(UnregisteredEntityTypeError)
    await driver.close()
  })
})

describe('MOD-notes ① — entity_tags reads (AR-6 owns writes)', () => {
  it('getTagsForEntity / getEntitiesByTag reflect AR-6 tag writes', async () => {
    const { svc, db, driver } = await setup()
    const spaces = createSpacesService(db, 'test-device', createTaggableTypeRegistry())
    const tag = await spaces.createTag({ name: 'important' })
    await spaces.tagEntity(tag.id, 'task', 'task-1')
    const tags = await svc.getTagsForEntity('task', 'task-1')
    expect(tags.map((t) => t.tag_id)).toContain(tag.id)
    const entities = await svc.getEntitiesByTag(tag.id)
    expect(entities.map((e) => e.entity_id)).toContain('task-1')
    await driver.close()
  })
})

describe('MOD-notes ① — attachments', () => {
  it('addAttachment / getAttachments / removeAttachment', async () => {
    const { svc, driver } = await setup()
    const page = await svc.createPage({ type: 'note', title: 'p' } as never)
    const att = await svc.addAttachment(page.id, {
      filename: 'a.png',
      mime_type: 'image/png',
      encrypted_blob: Buffer.from([1, 2, 3]),
      size_bytes: 3,
    })
    expect((await svc.getAttachments(page.id)).map((a) => a.id)).toContain(att.id)
    await svc.removeAttachment(att.id)
    expect(await svc.getAttachments(page.id)).toHaveLength(0)
    await driver.close()
  })
})
