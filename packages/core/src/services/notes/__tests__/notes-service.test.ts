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
