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
import type { BooksService, AttachmentPort, FileBlob } from '../types'
import {
  BookNotFoundError,
  ChapterUniqueViolation,
  ChapterNotFoundError,
  BookAssetNotFoundError,
  AssetFileError,
} from '../types'
import { IngestionDenied, type IngestionGuard } from '../../../foundation/ingestion'

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

// --- S2: Chapters/TOC + ISBN lookup (BOO-05/06/07/08) -----------------------

// A configurable mock IngestionGuard — exercises both the deny-safe fold and the (M2-shaped) ready path.
function mockIngestion(opts: {
  fetch?: IngestionGuard['fetchThroughMediator']
  onRevoke?: (defId: string) => void
}): IngestionGuard {
  return {
    async checkIngestion() {
      return { permitted: true }
    },
    async assertIngestionPermitted() {
      return { permitted: true }
    },
    async revokeIntegration(defId: string) {
      opts.onRevoke?.(defId)
    },
    fetchThroughMediator:
      opts.fetch ??
      (async (act) => {
        throw new IngestionDenied(act.defId, 'mediator_unavailable')
      }),
  }
}

describe('mod-books S2 — Chapters/TOC (BOO-05/06)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('setChapters creates a flat TOC, returned ordered by chapter_number', async () => {
    const b = await h.svc.createBook({ title: 'Book' })
    const chapters = await h.svc.setChapters(b.id, [
      { title: 'Two', chapter_number: 2, start_page: 11, estimated_reading_minutes: 20 },
      { title: 'One', chapter_number: 1, start_page: 1 },
    ])
    expect(chapters.map((c) => c.chapter_number)).toEqual([1, 2]) // sorted
    expect(chapters[0]!.title).toBe('One')
    expect(chapters[1]!.estimated_reading_minutes).toBe(20)
    expect(chapters.every((c) => c.is_completed === false)).toBe(true) // notNull default backfilled
    expect(chapters.every((c) => c.book_id === b.id)).toBe(true)
  })

  it('setChapters guards book existence (BookNotFoundError)', async () => {
    await expect(h.svc.setChapters('missing', [{ title: 'x', chapter_number: 1 }])).rejects.toBeInstanceOf(
      BookNotFoundError,
    )
  })

  it('setChapters rejects an in-array duplicate chapter_number (ChapterUniqueViolation)', async () => {
    const b = await h.svc.createBook({ title: 'Book' })
    await expect(
      h.svc.setChapters(b.id, [
        { title: 'A', chapter_number: 1 },
        { title: 'B', chapter_number: 1 },
      ]),
    ).rejects.toBeInstanceOf(ChapterUniqueViolation)
    // nothing persisted — the pre-check runs before any write
    expect((await h.svc.getCapabilities(b.id)).plannable).toBe(false)
  })

  it('setChapters validates each seed (empty title rejected)', async () => {
    const b = await h.svc.createBook({ title: 'Book' })
    await expect(h.svc.setChapters(b.id, [{ title: '', chapter_number: 1 }])).rejects.toThrow()
  })

  it('setChapters is a declarative upsert: PRESERVES completion, PRUNES absent, OVERWRITES structural', async () => {
    const b = await h.svc.createBook({ title: 'Book' })
    const initial = await h.svc.setChapters(b.id, [
      { title: 'Intro', chapter_number: 1 },
      { title: 'Middle', chapter_number: 2 },
      { title: 'End', chapter_number: 3 },
    ])
    // complete chapter 2
    const ch2 = initial.find((c) => c.chapter_number === 2)!
    await h.svc.markChapterComplete(ch2.id, true)

    // re-set: edit ch1 title, keep ch2 (completed), drop ch3, add ch4
    const after = await h.svc.setChapters(b.id, [
      { title: 'Introduction', chapter_number: 1 }, // structural overwrite
      { title: 'Middle', chapter_number: 2 }, // survives
      { title: 'Appendix', chapter_number: 4 }, // new
    ])
    expect(after.map((c) => c.chapter_number)).toEqual([1, 2, 4]) // ch3 pruned
    expect(after.find((c) => c.chapter_number === 1)!.title).toBe('Introduction') // overwritten
    const survived = after.find((c) => c.chapter_number === 2)!
    expect(survived.id).toBe(ch2.id) // same row (upsert, not re-create)
    expect(survived.is_completed).toBe(true) // tracking PRESERVED across the re-set (anti-lost)
    expect(survived.completed_at).not.toBeNull()
    expect(after.find((c) => c.chapter_number === 4)!.is_completed).toBe(false) // new row fresh
  })

  it('markChapterComplete toggles is_completed/completed_at and guards existence', async () => {
    const b = await h.svc.createBook({ title: 'Book' })
    const [ch] = await h.svc.setChapters(b.id, [{ title: 'Ch', chapter_number: 1 }])
    const done = await h.svc.markChapterComplete(ch!.id, true)
    expect(done.is_completed).toBe(true)
    expect(done.completed_at).not.toBeNull()
    const undone = await h.svc.markChapterComplete(ch!.id, false)
    expect(undone.is_completed).toBe(false)
    expect(undone.completed_at).toBeNull()
    await expect(h.svc.markChapterComplete('missing', true)).rejects.toBeInstanceOf(ChapterNotFoundError)
  })

  it('N3 — a TOC-only book (no total_pages, ≥1 chapter) is plannable', async () => {
    const b = await h.svc.createBook({ title: 'TOC-only' }) // no total_pages
    expect((await h.svc.getCapabilities(b.id)).plannable).toBe(false)
    await h.svc.setChapters(b.id, [{ title: 'Ch1', chapter_number: 1 }])
    expect((await h.svc.getCapabilities(b.id)).plannable).toBe(true) // TOC is a page basis
  })
})

describe('mod-books S2 — ISBN lookup port (BOO-07/08), deny-safe', () => {
  let bsql: Database.Database
  let db: DrizzleDb

  beforeEach(async () => {
    await initVault()
    bsql = new Database(':memory:')
    const driver = createBetterSqlite3Driver(bsql)
    await migrate(driver)
    db = createDrizzleProxy(driver)
  })

  it('no ingestion dep ⇒ lookup-unavailable(no-ingestion); manual fallback still works', async () => {
    const svc = createBooksService({ db, deviceId: 'test-device' }) // no ingestion port
    const res = await svc.lookupBook({ isbn: '9780135957059' })
    expect(res).toEqual({ status: 'lookup-unavailable', reason: 'no-ingestion' })
    // manual fallback (BK-14): createBook + setChapters remain callable
    const b = await svc.createBook({ title: 'Manual' })
    expect((await svc.setChapters(b.id, [{ title: 'Ch', chapter_number: 1 }])).length).toBe(1)
  })

  it('an IngestionDenied folds to lookup-unavailable, preserving the deny reason (fold logic)', async () => {
    // mockIngestion default throws IngestionDenied('mediator_unavailable') → the fold preserves it. (With the REAL
    // M1 guard the UNREGISTERED def throws CapabilityNotFound → reason 'lookup-failed' — the non-deny fold below.)
    const svc = createBooksService({ db, deviceId: 'test-device', ingestion: mockIngestion({}) })
    const res = await svc.lookupBook({ text: 'Clean Code' })
    expect(res).toEqual({ status: 'lookup-unavailable', reason: 'mediator_unavailable' })
  })

  it('any non-deny failure (incl. CapabilityNotFound, the real M1 path) folds to lookup-unavailable(lookup-failed)', async () => {
    const svc = createBooksService({
      db,
      deviceId: 'test-device',
      ingestion: mockIngestion({
        fetch: async () => {
          throw new Error('network boom')
        },
      }),
    })
    const res = await svc.lookupBook({ isbn: '123' })
    expect(res).toEqual({ status: 'lookup-unavailable', reason: 'lookup-failed' })
  })

  it('a working mediator yields ready + the normalized payload (M2-shaped path)', async () => {
    const svc = createBooksService({
      db,
      deviceId: 'test-device',
      ingestion: mockIngestion({
        fetch: async () => ({
          ok: true,
          data: {
            metadata: { title: 'Refactoring', author: 'Fowler', isbn: '9780134757599', total_pages: 448 },
            toc: [{ title: 'Principles', chapter_number: 1 }],
          },
        }),
      }),
    })
    const res = await svc.lookupBook({ isbn: '9780134757599' })
    expect(res.status).toBe('ready')
    if (res.status === 'ready') {
      expect(res.metadata.title).toBe('Refactoring')
      expect(res.metadata.total_pages).toBe(448)
      expect(res.toc).toHaveLength(1)
    }
  })

  it('a malformed mediator payload (no metadata) folds fail-closed to lookup-unavailable', async () => {
    // The M2 ready-branch shape guard: a payload missing `metadata` never yields { status:'ready', metadata:undefined }.
    const svc = createBooksService({
      db,
      deviceId: 'test-device',
      ingestion: mockIngestion({ fetch: async () => ({ ok: true, data: { toc: [] } }) }),
    })
    expect(await svc.lookupBook({ isbn: '123' })).toEqual({ status: 'lookup-unavailable', reason: 'lookup-failed' })
  })

  it('revokeLookupGrant — no-op without ingestion, delegates with ingestion (X9)', async () => {
    const noDep = createBooksService({ db, deviceId: 'test-device' })
    await expect(noDep.revokeLookupGrant()).resolves.toBeUndefined() // no throw, no-op

    let revoked: string | null = null
    const withDep = createBooksService({
      db,
      deviceId: 'test-device',
      ingestion: mockIngestion({ onRevoke: (defId) => (revoked = defId) }),
    })
    await withDep.revokeLookupGrant()
    expect(revoked).toBe('books.isbn_lookup') // BOOKS_ISBN_INTEGRATION_ID
  })
})

// --- S3: Assets + positions + mapping (BOO-09/10/11/12/44) -------------------

const blob = (name: string): FileBlob => ({ bytes: new Uint8Array([1, 2, 3]), mimeType: 'application/pdf', filename: name })

// A configurable mock AttachmentPort — mirrors mockIngestion. Default upload succeeds with a deterministic ref.
function mockAttachment(opts: { upload?: AttachmentPort['upload'] } = {}): AttachmentPort {
  return {
    upload: opts.upload ?? (async ({ bookId }) => ({ fileRef: `r2://${bookId}/file` })),
  }
}

describe('mod-books S3 — Assets + positions (BOO-09/10/11)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('addAsset without an attachment port ⇒ attachment-unavailable, file_ref null, asset still created (BK-17)', async () => {
    const b = await h.svc.createBook({ title: 'Book' })
    const { asset, file } = await h.svc.addAsset(b.id, { format: 'physical' })
    expect(file).toEqual({ status: 'attachment-unavailable' })
    expect(asset.file_ref).toBeNull()
    expect(asset.format).toBe('physical')
    expect(asset.book_id).toBe(b.id)
    // surfaced on the aggregate (N1) + flips readable true (BOO-48)
    const view = await h.svc.getBook(b.id)
    expect(view!.assets).toHaveLength(1)
    expect(view!.assets[0]!.id).toBe(asset.id)
    expect((await h.svc.getCapabilities(b.id)).readable).toBe(true)
  })

  it('addAsset with a present port + file ⇒ stored + file_ref persisted', async () => {
    const svc = createBooksService({ db: h.db, deviceId: 'test-device', attachment: mockAttachment() })
    const b = await svc.createBook({ title: 'Digital' })
    const { asset, file } = await svc.addAsset(b.id, { format: 'pdf', file: blob('x.pdf') })
    expect(file).toEqual({ status: 'stored', fileRef: `r2://${b.id}/file` })
    expect(asset.file_ref).toBe(`r2://${b.id}/file`)
    // persisted faithfully (live-store re-read)
    expect((await svc.getBook(b.id))!.assets[0]!.file_ref).toBe(`r2://${b.id}/file`)
  })

  it('addAsset with a present port whose upload() rejects ⇒ AssetFileError, NOTHING persisted (fail-loud, :127)', async () => {
    const svc = createBooksService({
      db: h.db,
      deviceId: 'test-device',
      attachment: mockAttachment({
        upload: async () => {
          throw new Error('R2 down')
        },
      }),
    })
    const b = await svc.createBook({ title: 'Doomed' })
    await expect(svc.addAsset(b.id, { format: 'epub', file: blob('x.epub') })).rejects.toBeInstanceOf(AssetFileError)
    // no dangling asset row
    expect((await svc.getBook(b.id))!.assets).toHaveLength(0)
    expect((await svc.getCapabilities(b.id)).readable).toBe(false)
  })

  it('addAsset guards the book exists + validates format', async () => {
    await expect(h.svc.addAsset('missing', { format: 'pdf' })).rejects.toBeInstanceOf(BookNotFoundError)
    const b = await h.svc.createBook({ title: 'Book' })
    await expect(h.svc.addAsset(b.id, { format: 'cassette' as never })).rejects.toThrow()
  })

  it('updatePosition sets the single native position (SSOT) + re-reads; guards exists', async () => {
    const b = await h.svc.createBook({ title: 'Book' })
    const { asset } = await h.svc.addAsset(b.id, { format: 'audiobook' })
    const updated = await h.svc.updatePosition(asset.id, '00:52:13')
    expect(updated.native_position).toBe('00:52:13')
    expect((await h.svc.getBook(b.id))!.assets[0]!.native_position).toBe('00:52:13')
    await expect(h.svc.updatePosition('missing', '1')).rejects.toBeInstanceOf(BookAssetNotFoundError)
    await expect(h.svc.updatePosition(asset.id, '')).rejects.toThrow() // non-empty
  })

  it('removeAsset soft-deletes; asset drops from getBook, book still resolves; guards exists', async () => {
    const b = await h.svc.createBook({ title: 'Book' })
    const { asset: a1 } = await h.svc.addAsset(b.id, { format: 'physical' })
    const { asset: a2 } = await h.svc.addAsset(b.id, { format: 'pdf' })
    expect((await h.svc.getBook(b.id))!.assets).toHaveLength(2)
    await h.svc.removeAsset(a1.id)
    const view = await h.svc.getBook(b.id)
    expect(view).not.toBeNull() // the book survives
    expect(view!.assets.map((a) => a.id)).toEqual([a2.id]) // only the live asset
    expect((await h.svc.getCapabilities(b.id)).readable).toBe(true) // a2 still live
    await h.svc.removeAsset(a2.id)
    expect((await h.svc.getCapabilities(b.id)).readable).toBe(false) // last copy gone → not readable
    await expect(h.svc.removeAsset(a1.id)).rejects.toBeInstanceOf(BookAssetNotFoundError) // already gone
    await expect(h.svc.removeAsset('missing')).rejects.toBeInstanceOf(BookAssetNotFoundError)
  })
})

describe('mod-books S3 — cross-format mapping absent-state (BOO-12, BK-4 fail-loud)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('getMappedPosition NEVER guesses — always not-synced at M1, carrying the TARGET native position', async () => {
    const b = await h.svc.createBook({ title: 'Multi-format' })
    const { asset: audio } = await h.svc.addAsset(b.id, { format: 'audiobook' })
    const { asset: pdf } = await h.svc.addAsset(b.id, { format: 'pdf' })
    await h.svc.updatePosition(audio.id, '00:52:13')
    await h.svc.updatePosition(pdf.id, '318')
    const mapped = await h.svc.getMappedPosition(audio.id, pdf.id)
    expect(mapped.status).toBe('not-synced') // mapping algorithm unbuilt — never a guessed `synced`
    if (mapped.status === 'not-synced') expect(mapped.nativePosition).toBe('318') // the TARGET's own native position
  })

  it('getMappedPosition carries null when the target has no native position yet', async () => {
    const b = await h.svc.createBook({ title: 'Book' })
    const { asset: a } = await h.svc.addAsset(b.id, { format: 'audiobook' })
    const { asset: target } = await h.svc.addAsset(b.id, { format: 'pdf' }) // no position set
    const mapped = await h.svc.getMappedPosition(a.id, target.id)
    expect(mapped).toEqual({ status: 'not-synced', nativePosition: null })
  })

  it('getMappedPosition guards both assets exist + same book', async () => {
    const b1 = await h.svc.createBook({ title: 'One' })
    const b2 = await h.svc.createBook({ title: 'Two' })
    const { asset: a } = await h.svc.addAsset(b1.id, { format: 'pdf' })
    const { asset: foreign } = await h.svc.addAsset(b2.id, { format: 'pdf' })
    await expect(h.svc.getMappedPosition(a.id, 'missing')).rejects.toBeInstanceOf(BookAssetNotFoundError)
    await expect(h.svc.getMappedPosition('missing', a.id)).rejects.toBeInstanceOf(BookAssetNotFoundError)
    // a cross-WORK map is nonsensical → target treated as not-found
    await expect(h.svc.getMappedPosition(a.id, foreign.id)).rejects.toBeInstanceOf(BookAssetNotFoundError)
  })

  it('getMappedPosition treats a soft-deleted target as not-found (findById excludes it)', async () => {
    const b = await h.svc.createBook({ title: 'Book' })
    const { asset: a } = await h.svc.addAsset(b.id, { format: 'audiobook' })
    const { asset: target } = await h.svc.addAsset(b.id, { format: 'pdf' })
    await h.svc.removeAsset(target.id) // soft-delete
    await expect(h.svc.getMappedPosition(a.id, target.id)).rejects.toBeInstanceOf(BookAssetNotFoundError)
  })
})

describe('mod-books S3 — B1 fold: chapter READ path on getBook', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('getBook surfaces the TOC ordered by chapter_number + the AssetFileError class is constructible', async () => {
    const b = await h.svc.createBook({ title: 'Book' })
    await h.svc.setChapters(b.id, [
      { title: 'Two', chapter_number: 2 },
      { title: 'One', chapter_number: 1 },
    ])
    const view = await h.svc.getBook(b.id)
    expect(view!.chapters.map((c) => c.chapter_number)).toEqual([1, 2]) // ordered (B1)
    expect(view!.chapters[0]!.title).toBe('One')
    // BOO-44 — the typed file error is a real, constructible class (decrypt throw site = S6)
    const err = new AssetFileError('decrypt failed', new Error('bad key'))
    expect(err).toBeInstanceOf(AssetFileError)
    expect(err.name).toBe('AssetFileError')
  })
})
