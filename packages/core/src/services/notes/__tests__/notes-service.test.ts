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
  InvalidPageContentError,
  JournalExistsError,
  PageNotFoundError,
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

interface Harness {
  svc: NotesService
  db: DrizzleDb
  registry: TaggableTypeRegistry
  spaces: ReturnType<typeof createSpacesService>
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
  return { svc, db, registry, spaces }
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

  it('ensureJournal creates the day page once, titled by its date (NP-8/NP-2)', async () => {
    const first = await h.svc.ensureJournal('2026-10-21')
    expect(first.type).toBe('journal')
    expect(first.journal_date).toBe('2026-10-21')
    expect(first.title).toBe('2026-10-21')
    const second = await h.svc.ensureJournal('2026-10-21')
    expect(second.id).toBe(first.id) // idempotent — returns the same row, never a clash
  })

  it('ensureJournal returns a pre-existing journal page for the date', async () => {
    const created = await h.svc.createPage({ type: 'journal', journal_date: '2026-10-22' })
    const ensured = await h.svc.ensureJournal('2026-10-22')
    expect(ensured.id).toBe(created.id)
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
    await expect(h.svc.updatePage(p.id, { type: 'journal' } as unknown as UpdatePageInput)).rejects.toBeTruthy()
    await expect(h.svc.updatePage(p.id, { bogus: 1 } as unknown as UpdatePageInput)).rejects.toBeTruthy()
    // BR-NEU-4 (IR-7): `content` is NOT a metadata patch — it is excluded from updatePage's strict whitelist.
    await expect(h.svc.updatePage(p.id, { content: '{}' } as unknown as UpdatePageInput)).rejects.toBeTruthy()
  })

  it('writePageContent persists the editor body via its own path (BR-NEU-3/4)', async () => {
    const p = await h.svc.createPage({ type: 'note', title: 'writable' })
    const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }] }
    const saved = await h.svc.writePageContent(p.id, doc as unknown as Parameters<typeof h.svc.writePageContent>[1])
    expect(saved.content).toBe(JSON.stringify(doc))
    const reread = await h.svc.getPage(p.id)
    expect(reread?.content).toBe(JSON.stringify(doc))
    expect(reread?.updated_at).toBeGreaterThanOrEqual(p.updated_at)
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

  // ── S2: entity notes + attachments ──────────────────────────────

  it('ensureEntityNote is idempotent — 2nd call returns the same row (BR-S2-1)', async () => {
    h.registry.register('task')
    const seed = { title: 'Task 1', type: 'task', status: 'open' }
    const first = await h.svc.ensureEntityNote('task_note', 'task', 't1', seed)
    const second = await h.svc.ensureEntityNote('task_note', 'task', 't1', seed)
    expect(second.id).toBe(first.id)
    expect(await h.svc.getPagesForEntity('task', 't1')).toHaveLength(1)
  })

  it('ensureEntityNote seed content is deterministic — equal seed → identical content (BR-S2-2)', async () => {
    h.registry.register('task')
    const seed = { title: 'T', type: 'task', status: 'open', priority: 'high' }
    const a = await h.svc.ensureEntityNote('task_note', 'task', 'e1', seed)
    const b = await h.svc.ensureEntityNote('task_note', 'task', 'e2', seed)
    expect(a.content).toBe(b.content)
    expect(a.content).toContain('"type":"doc"') // a valid EditorDocument (D-S2-1)
  })

  it('ensureEntityNote key order does not affect content (sorted dynamic keys, R1)', async () => {
    h.registry.register('task')
    const a = await h.svc.ensureEntityNote('task_note', 'task', 'k1', { title: 'X', beta: '2', alpha: '1' })
    const b = await h.svc.ensureEntityNote('task_note', 'task', 'k2', { title: 'X', alpha: '1', beta: '2' })
    expect(a.content).toBe(b.content)
  })

  it('ensureEntityNote rejects an unregistered entity_type (BR-S2-4)', async () => {
    await expect(
      h.svc.ensureEntityNote('task_note', 'not_registered_type', 'x', { title: 'x' }),
    ).rejects.toBeInstanceOf(UnregisteredEntityTypeError)
  })

  it('addAttachment stores a blob; getAttachments round-trips the bytes (BR-S2-5)', async () => {
    const page = await h.svc.createPage({ type: 'note', title: 'with-file' })
    const bytes = new Uint8Array([1, 2, 3, 4])
    const att = await h.svc.addAttachment(page.id, {
      filename: 'a.bin',
      mimeType: 'application/octet-stream',
      encryptedBlob: bytes,
      sizeBytes: 4,
    })
    expect(att.page_id).toBe(page.id)
    const list = await h.svc.getAttachments(page.id)
    expect(list).toHaveLength(1)
    expect(Array.from(list[0]!.encrypted_blob)).toEqual([1, 2, 3, 4])
  })

  it('removeAttachment soft-deletes — getAttachments excludes it (BR-S2-6/7)', async () => {
    const page = await h.svc.createPage({ type: 'note' })
    const att = await h.svc.addAttachment(page.id, {
      filename: 'b.bin',
      mimeType: 'application/octet-stream',
      encryptedBlob: new Uint8Array([9]),
      sizeBytes: 1,
    })
    await h.svc.removeAttachment(att.id)
    expect(await h.svc.getAttachments(page.id)).toHaveLength(0)
  })

  // ── S3: page-links + wiki resolution ────────────────────────────

  it('createPageLink is idempotent — 2nd call returns the same row, no duplicate (BR-S3-1)', async () => {
    const a = await h.svc.createPage({ type: 'note', title: 'A' })
    const b = await h.svc.createPage({ type: 'note', title: 'B' })
    const first = await h.svc.createPageLink(a.id, b.id)
    const second = await h.svc.createPageLink(a.id, b.id)
    expect(second.id).toBe(first.id)
    expect(await h.svc.getPageLinksFrom(a.id)).toHaveLength(1)
  })

  it('createPageLink REVIVES a soft-deleted link (same id, deleted_at cleared) (BR-S3-1)', async () => {
    const a = await h.svc.createPage({ type: 'note', title: 'A' })
    const b = await h.svc.createPage({ type: 'note', title: 'B' })
    const first = await h.svc.createPageLink(a.id, b.id)
    await h.svc.removePageLink(a.id, b.id)
    expect(await h.svc.getPageLinksFrom(a.id)).toHaveLength(0)
    const revived = await h.svc.createPageLink(a.id, b.id)
    expect(revived.id).toBe(first.id) // same row revived, NOT a new one
    expect(revived.deleted_at).toBeNull()
    expect(await h.svc.getPageLinksFrom(a.id)).toHaveLength(1)
  })

  it('removePageLink is a no-op when absent (BR-S3-2)', async () => {
    const a = await h.svc.createPage({ type: 'note' })
    const b = await h.svc.createPage({ type: 'note' })
    await expect(h.svc.removePageLink(a.id, b.id)).resolves.toBeUndefined()
  })

  it('getPageLinksFrom/To read the correct direction, excluding soft-deleted (BR-S3-3)', async () => {
    const a = await h.svc.createPage({ type: 'note' })
    const b = await h.svc.createPage({ type: 'note' })
    await h.svc.createPageLink(a.id, b.id)
    expect(await h.svc.getPageLinksFrom(a.id)).toHaveLength(1)
    expect(await h.svc.getPageLinksTo(b.id)).toHaveLength(1)
    expect(await h.svc.getPageLinksTo(a.id)).toHaveLength(0)
  })

  it('resolveWikiLink returns title-substring candidates, excluding soft-deleted + null-title (BR-S3-4)', async () => {
    await h.svc.createPage({ type: 'note', title: 'Meeting notes' })
    await h.svc.createPage({ type: 'note', title: 'Meeting agenda' })
    await h.svc.createPage({ type: 'note', title: 'Grocery list' })
    const gone = await h.svc.createPage({ type: 'note', title: 'Meeting archived' })
    await h.svc.softDeletePage(gone.id)
    await h.svc.createPage({ type: 'note' }) // null title — never matches
    const hits = await h.svc.resolveWikiLink('Meeting')
    expect(hits.map((p) => p.title).sort()).toEqual(['Meeting agenda', 'Meeting notes'])
  })

  // ── S4: delegation facade + registry ────────────────────────────

  it('createEntityLink delegates to AR-6 and appears in getEntityLinksFrom + getBacklinks (BR-S4-1/2/3/4)', async () => {
    h.registry.register('task')
    const page = await h.svc.createPage({ type: 'task_note', entity_type: 'task', entity_id: 't1' })
    const link = await h.svc.createEntityLink(page.id, 'task', 't1')
    expect(link.page_id).toBe(page.id)
    expect(await h.svc.getEntityLinksFrom(page.id)).toHaveLength(1)
    const back = await h.svc.getBacklinks('task', 't1')
    expect(back.entityLinks).toHaveLength(1)
    expect(back.pageLinks).toHaveLength(0) // a non-page entity id → no page-links (D-S4-2)
  })

  it('createEntityLink rejects an unregistered entity_type with the NOTES error (BR-S4-1)', async () => {
    const page = await h.svc.createPage({ type: 'note' })
    await expect(h.svc.createEntityLink(page.id, 'nope_type', 'x')).rejects.toBeInstanceOf(UnregisteredEntityTypeError)
  })

  it('getBacklinks merges page-links for a page target (BR-S4-4)', async () => {
    const a = await h.svc.createPage({ type: 'note', title: 'A' })
    const b = await h.svc.createPage({ type: 'note', title: 'B' })
    await h.svc.createPageLink(a.id, b.id)
    const back = await h.svc.getBacklinks('note', b.id)
    expect(back.pageLinks).toHaveLength(1) // A→B page-link surfaced via getPageLinksTo(b.id)
  })

  it('removeEntityLink drops the link from getBacklinks (BR-S4-2)', async () => {
    h.registry.register('task')
    const page = await h.svc.createPage({ type: 'task_note', entity_type: 'task', entity_id: 't2' })
    await h.svc.createEntityLink(page.id, 'task', 't2')
    await h.svc.removeEntityLink(page.id, 'task', 't2')
    expect((await h.svc.getBacklinks('task', 't2')).entityLinks).toHaveLength(0)
  })

  it('getTagsForEntity / getEntitiesByTag read entity_tags (AR-6 owns writes) (BR-S4-5)', async () => {
    h.registry.register('task')
    const tag = await h.spaces.createTag({ name: 'urgent' })
    await h.spaces.tagEntity(tag.id, 'task', 't3')
    const tags = await h.svc.getTagsForEntity('task', 't3')
    expect(tags).toHaveLength(1)
    expect(tags[0]!.tag_id).toBe(tag.id)
    const entities = await h.svc.getEntitiesByTag(tag.id)
    expect(entities).toHaveLength(1)
    expect(entities[0]!.entity_id).toBe('t3')
  })
})

// ── notes-rescope R0 · data safety (PLAN-R0 §4 A, tests 1–4) ─────────────────
describe('notes-rescope R0 — data safety (live store)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })
  const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }] }
  type Doc = Parameters<NotesService['writePageContent']>[1]
  const bytes = {
    filename: 'a.bin',
    mimeType: 'application/octet-stream',
    encryptedBlob: new Uint8Array([1]),
    sizeBytes: 1,
  }

  async function deletedPage() {
    const p = await h.svc.createPage({ type: 'note', title: 'gone' })
    await h.svc.softDeletePage(p.id)
    return p
  }

  it('writePageContent / updatePage reject a soft-deleted page with PageNotFoundError (BR-R0-5)', async () => {
    const p = await deletedPage()
    await expect(h.svc.writePageContent(p.id, doc as unknown as Doc)).rejects.toBeInstanceOf(PageNotFoundError)
    await expect(h.svc.updatePage(p.id, { title: 'x' })).rejects.toBeInstanceOf(PageNotFoundError)
  })

  it('writePageContent / updatePage reject an unknown id with PageNotFoundError (BR-R0-5)', async () => {
    await expect(h.svc.writePageContent('nope', doc as unknown as Doc)).rejects.toBeInstanceOf(PageNotFoundError)
    await expect(h.svc.updatePage('nope', { title: 'x' })).rejects.toBeInstanceOf(PageNotFoundError)
  })

  it('addAttachment · createPageLink (either end) · createEntityLink reject a deleted page (BR-R0-5)', async () => {
    h.registry.register('task')
    const live = await h.svc.createPage({ type: 'note', title: 'live' })
    const gone = await deletedPage()
    await expect(h.svc.addAttachment(gone.id, bytes)).rejects.toBeInstanceOf(PageNotFoundError)
    await expect(h.svc.createPageLink(gone.id, live.id)).rejects.toBeInstanceOf(PageNotFoundError)
    await expect(h.svc.createPageLink(live.id, gone.id)).rejects.toBeInstanceOf(PageNotFoundError)
    await expect(h.svc.createEntityLink(gone.id, 'task', 't1')).rejects.toBeInstanceOf(PageNotFoundError)
  })

  it('createEntityLink keeps the BR-S4-1 order: an unregistered type fails before the page check', async () => {
    const gone = await deletedPage()
    await expect(h.svc.createEntityLink(gone.id, 'nope_type', 'x')).rejects.toBeInstanceOf(UnregisteredEntityTypeError)
  })

  it('typed errors carry a stable .name + the page id (BR-S1-6 convention)', async () => {
    const err = await h.svc.writePageContent('nope', doc as unknown as Doc).catch((e: unknown) => e)
    expect(err).toMatchObject({ name: 'PageNotFoundError', pageId: 'nope' })
  })

  it.each([
    ['non-doc root', { type: 'paragraph' }],
    ['doc without content', { type: 'doc' }],
    ['child without a type', { type: 'doc', content: [{ text: 'x' }] }],
  ])('writePageContent rejects a %s with InvalidPageContentError; the row is unchanged (BR-R0-6)', async (_l, bad) => {
    const p = await h.svc.createPage({ type: 'note', title: 'keep' })
    await h.svc.writePageContent(p.id, doc as unknown as Doc)
    const err = await h.svc.writePageContent(p.id, bad as unknown as Doc).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(InvalidPageContentError)
    expect(err).toMatchObject({ name: 'InvalidPageContentError', pageId: p.id })
    expect((await h.svc.getPage(p.id))?.content).toBe(JSON.stringify(doc))
  })

  it('createPage rejects non-JSON and non-doc content (BR-R0-6 on the create path)', async () => {
    await expect(h.svc.createPage({ type: 'note', content: 'not json' })).rejects.toBeTruthy()
    await expect(h.svc.createPage({ type: 'note', content: '{"type":"paragraph"}' })).rejects.toBeTruthy()
    await expect(h.svc.createPage({ type: 'note', content: JSON.stringify(doc) })).resolves.toBeTruthy()
  })

  // G16 / BR-R0-4b: seeds must pass the EDITOR's schema check — ≥1 block, no empty text node.
  function hasEmptyText(n: unknown): boolean {
    const node = n as { type?: string; text?: string; content?: unknown[] }
    if (node.type === 'text' && node.text === '') return true
    return (node.content ?? []).some(hasEmptyText)
  }

  it.each([
    ['empty seed', {}],
    ['empty title', { title: '' }],
    ['title only', { title: 'Chapter 1' }],
    ['full seed', { title: 'T', type: 'feature', status: 'open', priority: 2 }],
  ])('ensureEntityNote with a %s stores an editor-valid doc (BR-R0-4b)', async (_l, seed) => {
    h.registry.register('book_bookmark')
    const page = await h.svc.ensureEntityNote('note', 'book_bookmark', `e-${_l}`, seed)
    const stored = JSON.parse(page.content ?? 'null') as { type: string; content: unknown[] }
    expect(stored.type).toBe('doc')
    expect(stored.content.length).toBeGreaterThanOrEqual(1)
    expect(hasEmptyText(stored)).toBe(false)
  })
})

// ── notes-rescope R3 · icon / cover domains (A-4) + the thumbnail-only read (PLAN-R3 G4/G5/G10 · IMPL R-7) ──────────
describe('notes-rescope R3 — icon/cover domains on create AND update; getAttachmentThumbnail', () => {
  let h: Harness
  let sql: string[]
  beforeEach(async () => {
    await initVault()
    const bsql = new Database(':memory:')
    await migrate(createBetterSqlite3Driver(bsql))
    sql = []
    const base = createBetterSqlite3Driver(bsql)
    const spy: SqliteDriver = {
      ...base,
      exec: (s, p) => (sql.push(s), base.exec(s, p)),
      query: (s, p) => (sql.push(s), base.query(s, p)),
      values: (s, p) => (sql.push(s), base.values(s, p)),
    }
    const db = createDrizzleProxy(spy)
    const registry = createTaggableTypeRegistry()
    const spaces = createSpacesService(db, DEVICE, registry)
    const backlinks = createBacklinkResolver(db, DEVICE)
    h = { svc: createNotesService({ db, deviceId: DEVICE, spaces, backlinks, registry }), db, registry, spaces }
  })

  const VALID_ICONS = ['star', 'book-open', 'heart-pulse', 'a1']
  const BAD_ICONS = ['Star', '⭐', 'book_open', '-star', 'star-', 'a'.repeat(65), 'javascript:alert(1)']
  const VALID_COVERS = [
    'https://example.com/a.png',
    'http://localhost:5173/__e2e/cover.png',
    'attachment:0190a1b2-c3d4',
  ]
  const BAD_COVERS = [
    'javascript:alert(1)',
    'data:image/png;base64,AAA',
    'ftp://x/y.png',
    'attachment:',
    `https://x/${'a'.repeat(2040)}`,
    'https://a b',
  ]

  it.each(VALID_ICONS)('icon %s is accepted on create and update', async (icon) => {
    const p = await h.svc.createPage({ type: 'note', title: 'i', icon })
    expect(p.icon).toBe(icon)
    expect((await h.svc.updatePage(p.id, { icon })).icon).toBe(icon)
  })
  it.each(BAD_ICONS)('icon %s is rejected on create and update', async (icon) => {
    await expect(h.svc.createPage({ type: 'note', title: 'i', icon })).rejects.toThrow()
    const p = await h.svc.createPage({ type: 'note', title: 'i' })
    await expect(h.svc.updatePage(p.id, { icon })).rejects.toThrow()
  })
  it.each(VALID_COVERS)('cover %s is accepted on create and update', async (cover_image) => {
    const p = await h.svc.createPage({ type: 'note', title: 'c', cover_image })
    expect(p.cover_image).toBe(cover_image)
    expect((await h.svc.updatePage(p.id, { cover_image })).cover_image).toBe(cover_image)
  })
  it.each(BAD_COVERS)('cover %s is rejected on create and update', async (cover_image) => {
    await expect(h.svc.createPage({ type: 'note', title: 'c', cover_image })).rejects.toThrow()
    const p = await h.svc.createPage({ type: 'note', title: 'c' })
    await expect(h.svc.updatePage(p.id, { cover_image })).rejects.toThrow()
  })
  it('null clears icon and cover', async () => {
    const p = await h.svc.createPage({ type: 'note', title: 'x', icon: 'star', cover_image: 'https://e.com/a.png' })
    const cleared = await h.svc.updatePage(p.id, { icon: null, cover_image: null })
    expect(cleared.icon).toBeNull()
    expect(cleared.cover_image).toBeNull()
  })

  it('getAttachmentThumbnail returns only the thumbnail bytes — the full blob is never selected', async () => {
    const page = await h.svc.createPage({ type: 'note', title: 'img' })
    const att = await h.svc.addAttachment(page.id, {
      filename: 'p.png',
      mimeType: 'image/png',
      encryptedBlob: new Uint8Array([1, 2, 3]),
      thumbnailBlob: new Uint8Array([7, 7]),
      sizeBytes: 3,
    })
    sql.length = 0
    const thumb = await h.svc.getAttachmentThumbnail(att.id)
    expect(thumb && Array.from(thumb)).toEqual([7, 7])
    expect(sql.join('\n')).toContain('thumbnail_blob')
    expect(sql.join('\n')).not.toContain('encrypted_blob')
  })
  it('getAttachmentThumbnail → null with no thumbnail, an unknown id, or a removed attachment', async () => {
    const page = await h.svc.createPage({ type: 'note', title: 'img' })
    const noThumb = await h.svc.addAttachment(page.id, {
      filename: 'a.bin',
      mimeType: 'image/png',
      encryptedBlob: new Uint8Array([1]),
      sizeBytes: 1,
    })
    expect(await h.svc.getAttachmentThumbnail(noThumb.id)).toBeNull()
    expect(await h.svc.getAttachmentThumbnail('nope')).toBeNull()
    const gone = await h.svc.addAttachment(page.id, {
      filename: 'b.png',
      mimeType: 'image/png',
      encryptedBlob: new Uint8Array([1]),
      thumbnailBlob: new Uint8Array([2]),
      sizeBytes: 1,
    })
    await h.svc.removeAttachment(gone.id)
    expect(await h.svc.getAttachmentThumbnail(gone.id)).toBeNull()
  })
})
