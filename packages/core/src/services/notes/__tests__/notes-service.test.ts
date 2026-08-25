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
import { ZodError } from 'zod'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { createTaggableTypeRegistry } from '../../../foundation/spaces/registry'
import { createSpacesService, type SpacesService } from '../../../foundation/spaces/service'
import { createBacklinkResolver } from '../../search/backlink-resolver'
import { createNotesService } from '../service'
import { MAX_ATTACHMENT_BYTES } from '@vida/types'
import {
  JournalExistsError,
  UnregisteredEntityTypeError,
  AttachmentTooLargeError,
  type NotesService,
  type UpdatePageInput,
} from '../types'

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

async function setup(): Promise<{ svc: NotesService; db: DrizzleDb; spaces: SpacesService }> {
  await initVault() // N1: libsodium ready before the first write (hashContent stamps _sync_hash)
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver) // applies 003_spaces (tags/entity_tags/entity_links) + 012_notes → pages
  const db = createDrizzleProxy(driver)
  const registry = createTaggableTypeRegistry()
  const spaces = createSpacesService(db, 'test-device', registry)
  const backlinks = createBacklinkResolver(db, 'test-device')
  const svc = createNotesService(db, 'test-device', { spaces, backlinks, registry })
  return { svc, db, spaces } // spaces exposed for A5 tag/link seeding (createTag → tagId)
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

describe('A2 — page_links', () => {
  // Proves the A2 charter (spec §4): idempotent revive-or-noop (IR-11), context asymmetry (BR-A2-2),
  // resolve-then-soft-delete + double-unlink no-op (BR-A2-4), directional live reads (BR-A2-3), N1 smoke.

  it('creates a fresh link and round-trips it (live-DB smoke, N1 hashContent ran)', async () => {
    const { svc } = await setup()
    const link = await svc.createPageLink('a', 'b', 'ctx')
    expect(link.source_page_id).toBe('a')
    expect(link.target_page_id).toBe('b')
    expect(link.context).toBe('ctx')
    expect(link.id).toBeTruthy()
    expect(link._sync_hash).toBeTruthy() // stamped by hashContent — proves libsodium was ready
    const from = await svc.getPageLinksFrom('a')
    expect(from).toHaveLength(1)
    expect(from[0]?.id).toBe(link.id)
  })

  it('is an idempotent no-op on a duplicate (source,target) — same id, one row', async () => {
    const { svc } = await setup()
    const first = await svc.createPageLink('a', 'b')
    const second = await svc.createPageLink('a', 'b')
    expect(second.id).toBe(first.id)
    expect(await svc.getPageLinksFrom('a')).toHaveLength(1)
  })

  it('revives a soft-deleted link with the SAME id and refreshes context (IR-11 / BR-A2-2)', async () => {
    const { svc } = await setup()
    const first = await svc.createPageLink('a', 'b', 'ctx1')
    await svc.removePageLink('a', 'b')
    const revived = await svc.createPageLink('a', 'b', 'ctx2')
    expect(revived.id).toBe(first.id) // reused, not a fresh row (the FULL UNIQUE demands revive)
    expect(revived.deleted_at).toBeNull()
    expect(revived.context).toBe('ctx2') // revive re-supplies context
    expect(await svc.getPageLinksFrom('a')).toHaveLength(1)
  })

  it('leaves context untouched on a live no-op (BR-A2-2 asymmetry)', async () => {
    const { svc } = await setup()
    await svc.createPageLink('a', 'b', 'ctx1')
    const again = await svc.createPageLink('a', 'b', 'other') // live path → no rewrite
    expect(again.context).toBe('ctx1')
    expect(await svc.getPageLinksFrom('a')).toHaveLength(1)
  })

  it('removePageLink soft-deletes (excluded from reads) and a second unlink is a no-op (N7 / BR-A2-4)', async () => {
    const { svc } = await setup()
    await svc.createPageLink('a', 'b')
    await svc.removePageLink('a', 'b')
    expect(await svc.getPageLinksFrom('a')).toHaveLength(0)
    expect(await svc.getPageLinksTo('b')).toHaveLength(0)
    // idempotent unlink: no live row → no throw
    await expect(svc.removePageLink('a', 'b')).resolves.toBeUndefined()
  })

  it('reads links directionally — getPageLinksFrom (source) vs getPageLinksTo (target, reverse index)', async () => {
    const { svc } = await setup()
    await svc.createPageLink('a', 'b')
    await svc.createPageLink('a', 'c')
    await svc.createPageLink('d', 'b')
    const fromA = await svc.getPageLinksFrom('a')
    expect(fromA.map((l) => l.target_page_id).sort()).toEqual(['b', 'c'])
    const toB = await svc.getPageLinksTo('b')
    expect(toB.map((l) => l.source_page_id).sort()).toEqual(['a', 'd'])
  })
})

describe('A3 — resolveWikiLink', () => {
  // Proves the A3 charter (spec §4): the match mirrors the E4 slash-menu filter — case-insensitive substring,
  // empty→all live pages, non-empty-no-match→[]; excludes soft-deleted (N7); never creates (IR-4).

  it('finds a page by case-insensitive substring of its title', async () => {
    const { svc } = await setup()
    const p = await svc.createPage({ type: 'note', title: 'Meeting Notes' })
    const hits = await svc.resolveWikiLink('meeting') // lowercase query, mixed-case title
    expect(hits.map((h) => h.id)).toContain(p.id)
  })

  it('matches mid-string (locks contains, not prefix — the E4 mirror)', async () => {
    const { svc } = await setup()
    const p = await svc.createPage({ type: 'note', title: 'Weekly Meeting Notes' })
    const hits = await svc.resolveWikiLink('meeting') // a prefix-only `q%` would MISS this
    expect(hits.map((h) => h.id)).toContain(p.id)
  })

  it('returns multiple candidates when titles collide (NP-7)', async () => {
    const { svc } = await setup()
    await svc.createPage({ type: 'note', title: 'Project' })
    await svc.createPage({ type: 'note', title: 'Project' })
    expect(await svc.resolveWikiLink('project')).toHaveLength(2)
  })

  it('excludes soft-deleted pages from candidates (N7 / BR-A3-3)', async () => {
    const { svc } = await setup()
    const p = await svc.createPage({ type: 'note', title: 'Gone' })
    expect(await svc.resolveWikiLink('gone')).toHaveLength(1)
    await svc.softDeletePage(p.id)
    expect(await svc.resolveWikiLink('gone')).toHaveLength(0)
  })

  it('empty / whitespace query → ALL live pages (mirror E4 if(!q) return items)', async () => {
    const { svc } = await setup()
    await svc.createPage({ type: 'note', title: 'One' })
    await svc.createPage({ type: 'note', title: 'Two' })
    const third = await svc.createPage({ type: 'journal', journal_date: '2026-07-07' })
    expect(await svc.resolveWikiLink('')).toHaveLength(3)
    expect(await svc.resolveWikiLink('   ')).toHaveLength(3)
    await svc.softDeletePage(third.id)
    expect(await svc.resolveWikiLink('')).toHaveLength(2)
  })

  it('non-empty query with no title hit → [] (distinct from the empty-browse)', async () => {
    const { svc } = await setup()
    await svc.createPage({ type: 'note', title: 'Alpha' })
    expect(await svc.resolveWikiLink('zzz-nope')).toHaveLength(0)
  })

  it('does NOT create on a no-match (IR-4 / BR-A3-2)', async () => {
    const { svc } = await setup()
    await svc.createPage({ type: 'note', title: 'Alpha' })
    const before = (await svc.getPagesByType('note')).length
    await svc.resolveWikiLink('zzz-nope')
    expect((await svc.getPagesByType('note')).length).toBe(before) // no stub page minted
  })

  it('searches across page types (title search is type-agnostic)', async () => {
    const { svc } = await setup()
    await svc.createPage({ type: 'journal', journal_date: '2026-08-08', title: 'Trip Log' })
    await svc.createPage({ type: 'note', title: 'Trip Ideas' })
    expect(await svc.resolveWikiLink('trip')).toHaveLength(2)
  })
})

describe('A4 — ensureEntityNote', () => {
  // Proves the A4 charter (spec §4): idempotent type-keyed seed of a *_note; content = a deterministic minimal
  // TipTap doc (NP-8/conventions:7); no registry guard (N3); soft-deleted → create-fresh.

  it('creates a *_note on first call and seeds content as a TipTap doc', async () => {
    const { svc } = await setup()
    const row = await svc.ensureEntityNote('task_note', 'task', 't1', { title: 'Buy milk', status: 'todo' })
    expect(row.type).toBe('task_note')
    expect(row.entity_type).toBe('task')
    expect(row.entity_id).toBe('t1')
    expect(row.content).toBeTruthy()
    const doc = JSON.parse(row.content!) as { type: string; content: unknown }
    expect(doc.type).toBe('doc')
    expect(row.content).toContain('Buy milk')
    expect(row.content).toContain('todo')
  })

  it('is idempotent — a second identical call returns the SAME id, one row', async () => {
    const { svc } = await setup()
    const first = await svc.ensureEntityNote('task_note', 'task', 't1', { title: 'x' })
    const second = await svc.ensureEntityNote('task_note', 'task', 't1', { title: 'x' })
    expect(second.id).toBe(first.id)
    expect(await svc.getPagesForEntity('task', 't1')).toHaveLength(1)
  })

  it('keys idempotency on type — a different-type page on the same entity does not satisfy the request', async () => {
    const { svc } = await setup()
    const stub = await svc.createPage({ type: 'note', entity_type: 'task', entity_id: 't1', title: 'stub' })
    const note = await svc.ensureEntityNote('task_note', 'task', 't1', { title: 'x' })
    expect(note.type).toBe('task_note')
    expect(note.id).not.toBe(stub.id)
    expect(await svc.getPagesForEntity('task', 't1')).toHaveLength(2)
  })

  it('produces deterministic content — same seed → identical content string (across entities)', async () => {
    const { svc } = await setup()
    const seed = { title: 'T', type: 'task', status: 'done', dates: '2026-08-08' }
    const a = await svc.ensureEntityNote('task_note', 'task', 'a', seed)
    const b = await svc.ensureEntityNote('task_note', 'task', 'b', seed)
    expect(a.content).toBe(b.content)
  })

  it('renders fields in the fixed declared order regardless of seed key order', async () => {
    const { svc } = await setup()
    // Scrambled insertion order → the summary must still be `title · type · status · dates`.
    const row = await svc.ensureEntityNote('task_note', 'task', 't1', {
      status: 's',
      dates: 'd',
      type: 't',
      title: 'ti',
    })
    expect(row.content).toContain('ti · t · s · d')
  })

  it('does NOT guard the entity_type against the registry (N3)', async () => {
    const { svc } = await setup()
    const row = await svc.ensureEntityNote('task_note', 'unregistered_type', 'x', { title: 'y' })
    expect(row.entity_type).toBe('unregistered_type')
  })

  it('creates a fresh note after the prior one was soft-deleted', async () => {
    const { svc } = await setup()
    const first = await svc.ensureEntityNote('task_note', 'task', 't1', { title: 'x' })
    await svc.softDeletePage(first.id)
    const second = await svc.ensureEntityNote('task_note', 'task', 't1', { title: 'x' })
    expect(second.id).not.toBe(first.id)
  })
})

describe('A5 — tag reads + link/tag facade', () => {
  // Proves the A5 charter (spec §4): net-new entity_tags reads (B1); the AR-6 write facade with IR-2/C5
  // registry pre-validation (create/tag only); the AR-8 read delegate; and the ①-composed getBacklinks merge.

  it('reads tags (net-new B1): tagEntity then getTagsForEntity / getEntitiesByTag; untag excludes (N7)', async () => {
    const { svc, spaces } = await setup()
    const tag = await spaces.createTag({ name: 'work' }) // AR-6 owns tag CRUD; Notes only associates + reads
    await svc.tagEntity(tag.id, 'note', 'n1')
    expect(await svc.getTagsForEntity('note', 'n1')).toHaveLength(1)
    const byTag = await svc.getEntitiesByTag(tag.id)
    expect(byTag.map((r) => r.entity_id)).toContain('n1')
    await svc.untagEntity(tag.id, 'note', 'n1')
    expect(await svc.getTagsForEntity('note', 'n1')).toHaveLength(0)
    expect(await svc.getEntitiesByTag(tag.id)).toHaveLength(0)
  })

  it('createEntityLink delegates to AR-6 and is idempotent (revive-or-noop)', async () => {
    const { svc } = await setup()
    const page = await svc.createPage({ type: 'note', title: 'src' })
    const link = await svc.createEntityLink(page.id, 'note', 'n1')
    expect(link.page_id).toBe(page.id)
    expect(link.entity_type).toBe('note')
    const again = await svc.createEntityLink(page.id, 'note', 'n1')
    expect(again.id).toBe(link.id) // AR-6 idempotent no-op
  })

  it('pre-validates entity_type on create/tag (IR-2 → UnregisteredEntityTypeError); remove/untag are no-op', async () => {
    const { svc, spaces } = await setup()
    const page = await svc.createPage({ type: 'note', title: 'src' })
    const tag = await spaces.createTag({ name: 't' })
    // create/tag reject an unregistered type
    await expect(svc.createEntityLink(page.id, 'nope', 'x')).rejects.toBeInstanceOf(UnregisteredEntityTypeError)
    await expect(svc.createEntityLink(page.id, 'nope', 'x')).rejects.toMatchObject({ entityType: 'nope' })
    await expect(svc.tagEntity(tag.id, 'nope', 'x')).rejects.toBeInstanceOf(UnregisteredEntityTypeError)
    // a REGISTERED type succeeds
    await expect(svc.createEntityLink(page.id, 'note', 'n1')).resolves.toBeTruthy()
    // remove/untag do NOT validate (mirror AR-6) → no throw for an unregistered type
    await expect(svc.removeEntityLink(page.id, 'nope', 'x')).resolves.toBeUndefined()
    await expect(svc.untagEntity(tag.id, 'nope', 'x')).resolves.toBeUndefined()
  })

  it('getEntityLinksFrom delegates to AR-8 (entity_links from a page)', async () => {
    const { svc } = await setup()
    const page = await svc.createPage({ type: 'note', title: 'src' })
    await svc.createEntityLink(page.id, 'note', 'n1')
    const links = await svc.getEntityLinksFrom(page.id)
    expect(links.map((l) => l.entity_id)).toContain('n1')
  })

  it('getBacklinks merges entity_links (AR-8) + page_links (A2), kept typed-distinct', async () => {
    const { svc } = await setup()
    const target = await svc.createPage({ type: 'note', title: 'target' })
    const source = await svc.createPage({ type: 'note', title: 'source' })
    await svc.createEntityLink(source.id, 'note', target.id) // entity_link → target
    await svc.createPageLink(source.id, target.id) // page_link → target
    const bl = await svc.getBacklinks('note', target.id)
    expect(bl.entityLinks).toHaveLength(1)
    expect(bl.pageLinks).toHaveLength(1)
    // a NON-page entity: the entity-link branch works, pageLinks empty (no page↔page links to a task id)
    await svc.createEntityLink(source.id, 'task', 't1')
    const blTask = await svc.getBacklinks('task', 't1')
    expect(blTask.entityLinks).toHaveLength(1)
    expect(blTask.pageLinks).toHaveLength(0)
  })
})

describe('A6 — note_attachments', () => {
  // Proves the A6 charter (spec §4): CRUD over note_attachments (blob + thumbnail, empty-[E] pass-through),
  // page-scoped reads, soft-delete, and the ADR-003:185 25 MB per-attachment limit (fail-loud).

  it('creates an attachment and round-trips the blob (live-DB smoke, N1)', async () => {
    const { svc } = await setup()
    const page = await svc.createPage({ type: 'note', title: 'p' })
    const row = await svc.addAttachment(page.id, {
      filename: 'a.png',
      mime_type: 'image/png',
      encrypted_blob: new Uint8Array([1, 2, 3]),
      size_bytes: 3,
    })
    expect(row.page_id).toBe(page.id)
    expect(row.filename).toBe('a.png')
    expect(row.mime_type).toBe('image/png')
    expect(row.size_bytes).toBe(3)
    expect(row.id).toBeTruthy()
    expect(row._sync_hash).toBeTruthy()
    const [fetched] = await svc.getAttachments(page.id)
    // a Uint8Array write reads back as a Buffer — byte-equal but not `===`; compare via spread.
    expect([...(fetched!.encrypted_blob as Uint8Array)]).toEqual([1, 2, 3])
  })

  it('persists an attachment with no thumbnail (thumbnail_blob null on re-read)', async () => {
    const { svc } = await setup()
    const page = await svc.createPage({ type: 'note', title: 'p' })
    await svc.addAttachment(page.id, {
      filename: 'b.txt',
      mime_type: 'text/plain',
      encrypted_blob: new Uint8Array([9]),
      size_bytes: 1,
    })
    // Assert the PERSISTED value (DB re-read) — the create-return leaves an unprovided nullable col undefined.
    const [fetched] = await svc.getAttachments(page.id)
    expect(fetched!.thumbnail_blob).toBeNull()
  })

  it('rejects an attachment over the 25 MB limit; accepts one exactly at it (ADR-003:185, boundary >)', async () => {
    const { svc } = await setup()
    const page = await svc.createPage({ type: 'note', title: 'p' })
    const tiny = new Uint8Array([0]) // the guard reads size_bytes, not the blob length
    await expect(
      svc.addAttachment(page.id, {
        filename: 'big',
        mime_type: 'application/octet-stream',
        encrypted_blob: tiny,
        size_bytes: MAX_ATTACHMENT_BYTES + 1,
      }),
    ).rejects.toBeInstanceOf(AttachmentTooLargeError)
    await expect(
      svc.addAttachment(page.id, {
        filename: 'big',
        mime_type: 'application/octet-stream',
        encrypted_blob: tiny,
        size_bytes: MAX_ATTACHMENT_BYTES + 1,
      }),
    ).rejects.toMatchObject({ sizeBytes: MAX_ATTACHMENT_BYTES + 1 })
    // exactly at the limit succeeds (boundary is `>`, not `>=`)
    await expect(
      svc.addAttachment(page.id, {
        filename: 'edge',
        mime_type: 'application/octet-stream',
        encrypted_blob: tiny,
        size_bytes: MAX_ATTACHMENT_BYTES,
      }),
    ).resolves.toBeTruthy()
  })

  it('getAttachments returns only the given page attachments', async () => {
    const { svc } = await setup()
    const a = await svc.createPage({ type: 'note', title: 'a' })
    const b = await svc.createPage({ type: 'note', title: 'b' })
    const blob = new Uint8Array([1])
    await svc.addAttachment(a.id, { filename: '1', mime_type: 'x', encrypted_blob: blob, size_bytes: 1 })
    await svc.addAttachment(a.id, { filename: '2', mime_type: 'x', encrypted_blob: blob, size_bytes: 1 })
    await svc.addAttachment(b.id, { filename: '3', mime_type: 'x', encrypted_blob: blob, size_bytes: 1 })
    expect(await svc.getAttachments(a.id)).toHaveLength(2)
  })

  it('removeAttachment soft-deletes (excluded from getAttachments, N7/NP-9)', async () => {
    const { svc } = await setup()
    const page = await svc.createPage({ type: 'note', title: 'p' })
    const row = await svc.addAttachment(page.id, {
      filename: 'gone',
      mime_type: 'x',
      encrypted_blob: new Uint8Array([1]),
      size_bytes: 1,
    })
    await svc.removeAttachment(row.id)
    expect(await svc.getAttachments(page.id)).toHaveLength(0)
  })
})

describe('A7 — summary config', () => {
  it('setSummaryConfig writes + getSummaryConfig round-trips (live-DB smoke, N1)', async () => {
    const { svc } = await setup()
    const page = await svc.createPage({ type: 'journal', journal_date: '2026-08-24' })
    const row = await svc.setSummaryConfig(page.id, { showHabits: true, showTasks: false })
    // stored as a stringified JSON blob (IR-8), not a structured column
    expect(typeof row.summary_config).toBe('string')
    expect(await svc.getSummaryConfig(page.id)).toEqual({ showHabits: true, showTasks: false })
  })

  it('getSummaryConfig returns null when unset', async () => {
    const { svc } = await setup()
    const page = await svc.createPage({ type: 'note', title: 'no config' })
    expect(await svc.getSummaryConfig(page.id)).toBeNull()
  })

  it('getSummaryConfig returns null for an absent page (read, not fail-loud)', async () => {
    const { svc } = await setup()
    expect(await svc.getSummaryConfig('missing-id')).toBeNull()
  })

  it('setSummaryConfig on a missing page rejects (Row not found, fail-loud)', async () => {
    const { svc } = await setup()
    await expect(svc.setSummaryConfig('missing-id', {})).rejects.toThrow(/Row not found/)
  })

  it('setSummaryConfig rejects an invalid config (ZodError, fail-loud) — no persist', async () => {
    const { svc } = await setup()
    const page = await svc.createPage({ type: 'note', title: 'p' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberately-invalid input for the fail-loud path
    await expect(svc.setSummaryConfig(page.id, { showHabits: 'yes' } as any)).rejects.toBeInstanceOf(ZodError)
    expect(await svc.getSummaryConfig(page.id)).toBeNull() // the rejected write never persisted
  })

  it('empty config round-trips ({} is distinct from null/unset)', async () => {
    const { svc } = await setup()
    const page = await svc.createPage({ type: 'note', title: 'p' })
    await svc.setSummaryConfig(page.id, {})
    expect(await svc.getSummaryConfig(page.id)).toEqual({})
  })

  it('getSummaryConfig FAILS LOUD on a corrupt stored value (BR-A7-3, not masked to null)', async () => {
    const { svc } = await setup()
    // updatePage accepts summary_config as a raw string (validators/note.ts:58) → the reachable corrupt-write path.
    // A config read must throw on a corrupt persisted value (contract.md:33 fail-loud), NOT swallow it to null — this
    // locks out a regression that reintroduces a try/catch→null (which would keep every other A7 case green).
    const malformed = await svc.createPage({ type: 'note', title: 'malformed' })
    await svc.updatePage(malformed.id, { summary_config: 'not json {' })
    await expect(svc.getSummaryConfig(malformed.id)).rejects.toThrow() // JSON.parse → SyntaxError

    const wrongShape = await svc.createPage({ type: 'note', title: 'wrong-shape' })
    await svc.updatePage(wrongShape.id, { summary_config: '{"showHabits":"yes"}' })
    await expect(svc.getSummaryConfig(wrongShape.id)).rejects.toBeInstanceOf(ZodError) // parses, fails validation
  })
})

describe('A8 — cascade cleanup', () => {
  it('full cascade soft-deletes the page and every satellite (live-DB smoke, N1)', async () => {
    const { svc, spaces } = await setup()
    const p = await svc.createPage({ type: 'note', title: 'P' })
    const q = await svc.createPage({ type: 'note', title: 'Q' })
    await svc.createPageLink(p.id, q.id) // P → Q (outgoing)
    await svc.createPageLink(q.id, p.id) // Q → P (incoming — target side)
    await svc.createEntityLink(p.id, 'note', 'ent-x') // P's outgoing entity_link
    const tag = await spaces.createTag({ name: 'work' })
    await svc.tagEntity(tag.id, 'note', p.id) // an entity_tag ON P
    await svc.addAttachment(p.id, {
      filename: 'a',
      mime_type: 'x',
      encrypted_blob: new Uint8Array([1]),
      size_bytes: 1,
    })

    // pre-state: every satellite is seeded live → the post-delete emptiness below is non-vacuous.
    expect(await svc.getPageLinksFrom(p.id)).toHaveLength(1)
    expect(await svc.getEntityLinksFrom(p.id)).toHaveLength(1)
    expect(await svc.getTagsForEntity('note', p.id)).toHaveLength(1)
    expect(await svc.getAttachments(p.id)).toHaveLength(1)

    await svc.softDeletePage(p.id)

    expect(await svc.getPage(p.id)).toBeNull()
    expect(await svc.getPageLinksFrom(p.id)).toHaveLength(0)
    expect(await svc.getPageLinksTo(p.id)).toHaveLength(0) // Q → P cleaned (both FK sides)
    expect(await svc.getEntityLinksFrom(p.id)).toHaveLength(0)
    expect(await svc.getTagsForEntity('note', p.id)).toHaveLength(0)
    expect(await svc.getAttachments(p.id)).toHaveLength(0)
  })

  it('self-link (P→P) is cleaned exactly once (no double-delete)', async () => {
    const { svc } = await setup()
    const p = await svc.createPage({ type: 'note', title: 'P' })
    await svc.createPageLink(p.id, p.id) // self-link: appears as both source and target
    await expect(svc.softDeletePage(p.id)).resolves.toBeUndefined()
    expect(await svc.getPageLinksFrom(p.id)).toHaveLength(0)
  })

  it('backlinks INTO P survive — only the page_id side cascades', async () => {
    const { svc } = await setup()
    const p = await svc.createPage({ type: 'note', title: 'P' })
    const x = await svc.createPage({ type: 'note', title: 'X' })
    await svc.createEntityLink(x.id, 'note', p.id) // X links TO P (page_id = X, entity_id = P)
    await svc.softDeletePage(p.id)
    // X's own outgoing link is untouched — the cascade only cleans P's OUTGOING links (page_id = P).
    expect(await svc.getEntityLinksFrom(x.id)).toHaveLength(1)
  })

  it('re-drive is idempotent — a second softDeletePage does not throw (BR-A8-5)', async () => {
    const { svc } = await setup()
    const p = await svc.createPage({ type: 'note', title: 'P' })
    const q = await svc.createPage({ type: 'note', title: 'Q' })
    await svc.createPageLink(p.id, q.id)
    await svc.softDeletePage(p.id)
    await expect(svc.softDeletePage(p.id)).resolves.toBeUndefined()
  })

  it('fail-loud: a satellite failure rejects, leaves the page LIVE + re-drivable (BR-A8-5)', async () => {
    const { svc, spaces } = await setup()
    const p = await svc.createPage({ type: 'note', title: 'P' })
    const tag = await spaces.createTag({ name: 'work' })
    await svc.tagEntity(tag.id, 'note', p.id)
    await svc.addAttachment(p.id, { filename: 'a', mime_type: 'x', encrypted_blob: new Uint8Array([1]), size_bytes: 1 })

    // Inject a fault in the entity_tags cleanup step (runs BEFORE attachments + the page delete). Since the notes
    // service captured this same `spaces` object as `deps.spaces`, reassigning the method faults the running cascade.
    const realUntag = spaces.untagEntity.bind(spaces)
    spaces.untagEntity = () => Promise.reject(new Error('boom'))

    await expect(svc.softDeletePage(p.id)).rejects.toThrow('boom')
    expect(await svc.getPage(p.id)).not.toBeNull() // page deleted LAST → survives the mid-cascade failure
    expect(await svc.getAttachments(p.id)).toHaveLength(1) // fail-loud halted before the downstream steps

    // re-drive with the fault cleared → the cascade completes idempotently (IR-13 re-drive).
    spaces.untagEntity = realUntag
    await expect(svc.softDeletePage(p.id)).resolves.toBeUndefined()
    expect(await svc.getPage(p.id)).toBeNull()
    expect(await svc.getTagsForEntity('note', p.id)).toHaveLength(0)
    expect(await svc.getAttachments(p.id)).toHaveLength(0)
  })

  it('unrelated rows are untouched by the cascade', async () => {
    const { svc, spaces } = await setup()
    const p = await svc.createPage({ type: 'note', title: 'P' })
    const s = await svc.createPage({ type: 'note', title: 'S' }) // sibling, unrelated
    const t = await svc.createPage({ type: 'note', title: 'T' })
    await svc.createPageLink(s.id, t.id) // S's own link
    await svc.createEntityLink(s.id, 'note', 'ent-s')
    const tag = await spaces.createTag({ name: 'personal' })
    await svc.tagEntity(tag.id, 'note', s.id)
    await svc.addAttachment(s.id, { filename: 'b', mime_type: 'x', encrypted_blob: new Uint8Array([2]), size_bytes: 1 })

    await svc.softDeletePage(p.id)

    expect(await svc.getPage(s.id)).not.toBeNull()
    expect(await svc.getPageLinksFrom(s.id)).toHaveLength(1)
    expect(await svc.getEntityLinksFrom(s.id)).toHaveLength(1)
    expect(await svc.getTagsForEntity('note', s.id)).toHaveLength(1)
    expect(await svc.getAttachments(s.id)).toHaveLength(1)
  })
})
