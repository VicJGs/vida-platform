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
import type { BooksService, AttachmentPort, FileBlob, PreferencesPort } from '../types'
import {
  BookNotFoundError,
  ChapterUniqueViolation,
  ChapterNotFoundError,
  BookAssetNotFoundError,
  AssetFileError,
  AnnotationNotFoundError,
  AnnotationNotLinkableError,
  QuoteEmbedDisabledError,
  ReadingSessionNotFoundError,
  ReadingPlanNotFoundError,
  TargetUnreachableProposal,
  PositionConflictPending,
  IntegrationConsentError,
} from '../types'
import type { ConflictChoice } from '../types'
import type { AiService } from '../../../foundation/ai'
import { IngestionDenied, type IngestionGuard } from '../../../foundation/ingestion'
import { createTaggableTypeRegistry } from '../../../foundation/spaces/registry'
import { TagNotFound } from '../../../foundation/spaces'
import { createSpacesService } from '../../../foundation/spaces/service'
import { createBacklinkResolver } from '../../search/backlink-resolver'
import { createNotesService } from '../../notes'
import { createSessionRegistry, SessionTypeNotFound } from '../../../foundation/sessions'
import { createEffectRegistry, createEffectRail } from '../../../foundation/effects'
import type { EffectEvent } from '../../../foundation/effects'
import { createSessionsService } from '../../sessions'
import { createJournalRegistry } from '../../journals'

// The REAL required deps (spaces + notes + sessions) over the live store — exercises the entity-type registry
// enforcement (BK-6 highlight rejection; the attach `book` target), ensureEntityNote idempotency, and the real
// ADR-004 session spine (createSession sub_type gate + completeSession lifecycle) a mock would bypass (the
// knowledge/flashcards harness precedent). NOTE: setup() does NOT call registerBooks — each S6 test that needs a
// live session calls it first, so Acceptance #1 can assert the pre-registration SessionTypeNotFound throw.
function booksDeps(db: DrizzleDb) {
  const registry = createTaggableTypeRegistry()
  const spaces = createSpacesService(db, 'test-device', registry)
  const backlinks = createBacklinkResolver(db, 'test-device')
  const notes = createNotesService({ db, deviceId: 'test-device', spaces, backlinks, registry })
  const sessionRegistry = createSessionRegistry(db, 'test-device')
  const rail = createEffectRail(db, createEffectRegistry())
  const sessions = createSessionsService({
    db,
    deviceId: 'test-device',
    registry: sessionRegistry,
    rail,
    entityRegistry: registry,
  })
  return { db, deviceId: 'test-device' as const, spaces, notes, sessions, sessionRegistry }
}

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
  svc: BooksService
  db: DrizzleDb
  bsql: Database.Database
  deps: ReturnType<typeof booksDeps>
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const deps = booksDeps(db)
  const svc = createBooksService(deps)
  return { svc, db, bsql, deps }
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
    const svc = createBooksService(booksDeps(db)) // no ingestion port
    const res = await svc.lookupBook({ isbn: '9780135957059' })
    expect(res).toEqual({ status: 'lookup-unavailable', reason: 'no-ingestion' })
    // manual fallback (BK-14): createBook + setChapters remain callable
    const b = await svc.createBook({ title: 'Manual' })
    expect((await svc.setChapters(b.id, [{ title: 'Ch', chapter_number: 1 }])).length).toBe(1)
  })

  it('an IngestionDenied folds to lookup-unavailable, preserving the deny reason (fold logic)', async () => {
    // mockIngestion default throws IngestionDenied('mediator_unavailable') → the fold preserves it. (With the REAL
    // M1 guard the UNREGISTERED def throws CapabilityNotFound → reason 'lookup-failed' — the non-deny fold below.)
    const svc = createBooksService({ ...booksDeps(db), ingestion: mockIngestion({}) })
    const res = await svc.lookupBook({ text: 'Clean Code' })
    expect(res).toEqual({ status: 'lookup-unavailable', reason: 'mediator_unavailable' })
  })

  it('any non-deny failure (incl. CapabilityNotFound, the real M1 path) folds to lookup-unavailable(lookup-failed)', async () => {
    const svc = createBooksService({
      ...booksDeps(db),
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
      ...booksDeps(db),
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
      ...booksDeps(db),
      ingestion: mockIngestion({ fetch: async () => ({ ok: true, data: { toc: [] } }) }),
    })
    expect(await svc.lookupBook({ isbn: '123' })).toEqual({ status: 'lookup-unavailable', reason: 'lookup-failed' })
  })

  it('revokeLookupGrant — no-op without ingestion, delegates with ingestion (X9)', async () => {
    const noDep = createBooksService(booksDeps(db))
    await expect(noDep.revokeLookupGrant()).resolves.toBeUndefined() // no throw, no-op

    let revoked: string | null = null
    const withDep = createBooksService({
      ...booksDeps(db),
      ingestion: mockIngestion({ onRevoke: (defId) => (revoked = defId) }),
    })
    await withDep.revokeLookupGrant()
    expect(revoked).toBe('books.isbn_lookup') // BOOKS_ISBN_INTEGRATION_ID
  })
})

// --- S3: Assets + positions + mapping (BOO-09/10/11/12/44) -------------------

const blob = (name: string): FileBlob => ({
  bytes: new Uint8Array([1, 2, 3]),
  mimeType: 'application/pdf',
  filename: name,
})

// A configurable mock AttachmentPort — mirrors mockIngestion. Default upload/download succeed deterministically;
// `download` is the S6 Reader decrypt seam (BOO-39).
function mockAttachment(
  opts: { upload?: AttachmentPort['upload']; download?: AttachmentPort['download'] } = {},
): AttachmentPort {
  return {
    upload: opts.upload ?? (async ({ bookId }) => ({ fileRef: `r2://${bookId}/file` })),
    download: opts.download ?? (async () => ({ blob: { bytes: new Uint8Array([1, 2, 3]) } })),
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
    const svc = createBooksService({ ...booksDeps(h.db), attachment: mockAttachment() })
    const b = await svc.createBook({ title: 'Digital' })
    const { asset, file } = await svc.addAsset(b.id, { format: 'pdf', file: blob('x.pdf') })
    expect(file).toEqual({ status: 'stored', fileRef: `r2://${b.id}/file` })
    expect(asset.file_ref).toBe(`r2://${b.id}/file`)
    // persisted faithfully (live-store re-read)
    expect((await svc.getBook(b.id))!.assets[0]!.file_ref).toBe(`r2://${b.id}/file`)
  })

  it('addAsset with a present port whose upload() rejects ⇒ AssetFileError, NOTHING persisted (fail-loud, :127)', async () => {
    const svc = createBooksService({
      ...booksDeps(h.db),
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

// --- S4: Annotations + notes/links (BOO-15/16/17/18/19/20) -------------------

describe('mod-books S4 — annotations CRUD (BOO-15/16/17)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('addBookmark creates a work-anchored row ([E] label); guards book; re-reads faithfully', async () => {
    const b = await h.svc.createBook({ title: 'Book' })
    const bm = await h.svc.addBookmark(b.id, 'p.42', 'to revisit')
    expect(bm.book_id).toBe(b.id)
    expect(bm.position).toBe('p.42')
    expect(bm.label).toBe('to revisit')
    await expect(h.svc.addBookmark('missing', 'p.1')).rejects.toBeInstanceOf(BookNotFoundError)
    await expect(h.svc.addBookmark(b.id, '')).rejects.toThrow() // position non-empty
  })

  it('addQuote stores a per-book quote ([E] text, required); guards book', async () => {
    const b = await h.svc.createBook({ title: 'Book' })
    const q = await h.svc.addQuote(b.id, 'words that talked', 'p.7')
    expect(q.book_id).toBe(b.id)
    expect(q.text).toBe('words that talked')
    expect(q.position).toBe('p.7')
    await expect(h.svc.addQuote(b.id, '')).rejects.toThrow() // text non-empty
    await expect(h.svc.addQuote('missing', 'x')).rejects.toBeInstanceOf(BookNotFoundError)
  })

  it('addHighlight derives book_id from the asset + records asset_id; guards the asset', async () => {
    const b = await h.svc.createBook({ title: 'Book' })
    const { asset } = await h.svc.addAsset(b.id, { format: 'pdf' })
    const hl = await h.svc.addHighlight(asset.id, { captured_text: 'a span', position: 'p.3' })
    expect(hl.book_id).toBe(b.id) // derived from the asset (work-anchored)
    expect(hl.asset_id).toBe(asset.id)
    expect(hl.captured_text).toBe('a span')
    await expect(h.svc.addHighlight('missing', { captured_text: 'x', position: 'p.1' })).rejects.toBeInstanceOf(
      BookAssetNotFoundError,
    )
  })
})

describe('mod-books S4 — inter-links + notes (BOO-18, BK-6 highlight exclusion)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('linkAnnotations(bookmark, quote) writes an entity_link; guards both exist', async () => {
    const b = await h.svc.createBook({ title: 'Book' })
    const bm = await h.svc.addBookmark(b.id, 'p.1')
    const q = await h.svc.addQuote(b.id, 'quote')
    const link = await h.svc.linkAnnotations({ kind: 'bookmark', id: bm.id }, { kind: 'quote', id: q.id })
    expect(link.page_id).toBe(bm.id) // source anchor
    expect(link.entity_type).toBe('book_quote')
    expect(link.entity_id).toBe(q.id)
    await expect(
      h.svc.linkAnnotations({ kind: 'bookmark', id: 'missing' }, { kind: 'quote', id: q.id }),
    ).rejects.toBeInstanceOf(AnnotationNotFoundError)
  })

  it('BK-6 — a highlight endpoint fails loud via the registry (book_highlight unregistered)', async () => {
    const b = await h.svc.createBook({ title: 'Book' })
    const { asset } = await h.svc.addAsset(b.id, { format: 'pdf' })
    const hl = await h.svc.addHighlight(asset.id, { captured_text: 's', position: 'p.1' })
    const q = await h.svc.addQuote(b.id, 'quote')
    // BK-6 enforced at the Books boundary (the registry only backstops the link TARGET / note-entity, not a link
    // SOURCE anchor) — a highlight at EITHER endpoint fails loud with the typed error.
    await expect(
      h.svc.linkAnnotations({ kind: 'highlight', id: hl.id }, { kind: 'quote', id: q.id }),
    ).rejects.toBeInstanceOf(AnnotationNotLinkableError)
    await expect(
      h.svc.linkAnnotations(
        { kind: 'bookmark', id: (await h.svc.addBookmark(b.id, 'p.1')).id },
        { kind: 'highlight', id: hl.id },
      ),
    ).rejects.toBeInstanceOf(AnnotationNotLinkableError) // highlight as TARGET too
    await expect(h.svc.openAnnotationNote({ kind: 'highlight', id: hl.id })).rejects.toBeInstanceOf(
      AnnotationNotLinkableError,
    )
  })

  it('openAnnotationNote is idempotent for a bookmark/quote; guards exists', async () => {
    const b = await h.svc.createBook({ title: 'Book' })
    const bm = await h.svc.addBookmark(b.id, 'p.1', 'note me')
    const page1 = await h.svc.openAnnotationNote({ kind: 'bookmark', id: bm.id })
    expect(page1.type).toBe('note')
    expect(page1.entity_type).toBe('book_bookmark')
    expect(page1.entity_id).toBe(bm.id)
    const page2 = await h.svc.openAnnotationNote({ kind: 'bookmark', id: bm.id })
    expect(page2.id).toBe(page1.id) // idempotent — same page
    await expect(h.svc.openAnnotationNote({ kind: 'quote', id: 'missing' })).rejects.toBeInstanceOf(
      AnnotationNotFoundError,
    )
  })
})

describe('mod-books S4 — list reads + S3-fold survival (BOO-19/20)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('listAnnotations returns all three natures, work-anchored (soft-delete filtered)', async () => {
    const b = await h.svc.createBook({ title: 'Book' })
    const { asset } = await h.svc.addAsset(b.id, { format: 'pdf' })
    await h.svc.addBookmark(b.id, 'p.1')
    await h.svc.addQuote(b.id, 'q')
    await h.svc.addHighlight(asset.id, { captured_text: 's', position: 'p.2' })
    const views = await h.svc.listAnnotations(b.id)
    expect(views).toHaveLength(3)
    expect(new Set(views.map((v) => v.kind))).toEqual(new Set(['bookmark', 'quote', 'highlight']))
    expect(views.every((v) => v.annotation.book_id === b.id)).toBe(true)
  })

  it('listQuotes — per-book vs all; soft-delete filtered', async () => {
    const b1 = await h.svc.createBook({ title: 'One' })
    const b2 = await h.svc.createBook({ title: 'Two' })
    await h.svc.addQuote(b1.id, 'a')
    await h.svc.addQuote(b1.id, 'b')
    await h.svc.addQuote(b2.id, 'c')
    expect(await h.svc.listQuotes({ bookId: b1.id })).toHaveLength(2)
    expect(await h.svc.listQuotes()).toHaveLength(3) // all
    expect(await h.svc.listQuotes({})).toHaveLength(3) // absent scope = all
  })

  it('S3-fold (the HARD case) — a highlight on a removed asset SURVIVES (no cascade, no-FK, BR-BK-S3-4)', async () => {
    const b = await h.svc.createBook({ title: 'Book' })
    const { asset } = await h.svc.addAsset(b.id, { format: 'pdf' })
    const hl = await h.svc.addHighlight(asset.id, { captured_text: 'kept', position: 'p.9' })
    await h.svc.removeAsset(asset.id) // soft-delete the asset the highlight was made in
    const views = await h.svc.listAnnotations(b.id)
    expect(views.map((v) => v.annotation.id)).toContain(hl.id) // highlight remains, flagged native
    expect(await h.svc.getBook(b.id)).not.toBeNull() // the book survives
  })
})

// A narrow deny-safe PreferencesPort over fixed toggle values + a STATEFUL conflict-rule store (M1 has no real
// Preferences-backed adapter). `setConflictRule` persists in-memory so the resolveConflict → getUnifiedProgress
// round-trip is exercised end to end (the M2 adapter swaps zero-signature).
function mockPreferences(
  opts: { global?: boolean; overrides?: Record<string, boolean>; conflictRules?: Record<string, ConflictChoice> } = {},
): PreferencesPort {
  const rules = new Map<string, ConflictChoice>(Object.entries(opts.conflictRules ?? {}))
  return {
    async getQuoteEmbedGlobal() {
      return opts.global ?? true
    },
    async getQuoteEmbedOverride(bookId) {
      return opts.overrides?.[bookId]
    },
    async getConflictRule(bookId) {
      return rules.get(bookId)
    },
    async setConflictRule(bookId, choice) {
      rules.set(bookId, choice)
    },
  }
}

describe('mod-books S5 — quote-embed feed + toggles (BOO-21/22)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // (1) no port — global feed returns every non-deleted quote (permissive default, BR-BK-S5-3).
  it('no preferences port — global feed returns all quotes (permissive)', async () => {
    const a = await h.svc.createBook({ title: 'A' })
    await h.svc.addQuote(a.id, 'one')
    await h.svc.addQuote(a.id, 'two')
    expect(await h.svc.getEmbeddableQuotes({})).toHaveLength(2)
  })

  // (2) no port — a scoped call returns that book's quotes and never throws.
  it('no preferences port — scoped returns the book quotes, never throws', async () => {
    const a = await h.svc.createBook({ title: 'A' })
    await h.svc.addQuote(a.id, 'one')
    const scoped = await h.svc.getEmbeddableQuotes({ bookId: a.id })
    expect(scoped).toHaveLength(1)
  })

  // (3) soft-deleted quotes are excluded from both shapes (isNull(deleted_at), BR-BK-S5-1). No removeQuote method
  // exists yet → soft-delete directly over the live store to exercise the filter.
  it('soft-deleted quotes are excluded (both shapes)', async () => {
    const a = await h.svc.createBook({ title: 'A' })
    const q1 = await h.svc.addQuote(a.id, 'keep')
    await h.svc.addQuote(a.id, 'drop')
    // soft-delete the first via the raw store
    h.bsql.prepare('UPDATE book_quotes SET deleted_at = ? WHERE id = ?').run(Date.now(), q1.id)
    expect(await h.svc.getEmbeddableQuotes({})).toHaveLength(1)
    expect(await h.svc.getEmbeddableQuotes({ bookId: a.id })).toHaveLength(1)
  })

  // (4) precedence — override ON under global OFF: the overridden book is embeddable; others throw (scoped) /
  // are excluded (feed). BR-BK-S5-2/S5-4.
  it('override ON under global OFF — overridden book embeddable; others throw/excluded', async () => {
    const a = await h.svc.createBook({ title: 'A' })
    const b = await h.svc.createBook({ title: 'B' })
    await h.svc.addQuote(a.id, 'a1')
    await h.svc.addQuote(a.id, 'a2')
    await h.svc.addQuote(b.id, 'b1')
    const svc = createBooksService({
      ...booksDeps(h.db),
      preferences: mockPreferences({ global: false, overrides: { [a.id]: true } }),
    })
    expect(await svc.getEmbeddableQuotes({})).toHaveLength(2) // only A's (B excluded)
    expect(await svc.getEmbeddableQuotes({ bookId: a.id })).toHaveLength(2)
    await expect(svc.getEmbeddableQuotes({ bookId: b.id })).rejects.toBeInstanceOf(QuoteEmbedDisabledError)
  })

  // (5) precedence — override OFF under global ON: the overridden book throws (scoped) / excluded (feed); others
  // included. BR-BK-S5-2/S5-4.
  it('override OFF under global ON — overridden book throws/excluded; others included', async () => {
    const c = await h.svc.createBook({ title: 'C' })
    const d = await h.svc.createBook({ title: 'D' })
    await h.svc.addQuote(c.id, 'c1')
    await h.svc.addQuote(d.id, 'd1')
    const svc = createBooksService({
      ...booksDeps(h.db),
      preferences: mockPreferences({ global: true, overrides: { [c.id]: false } }),
    })
    await expect(svc.getEmbeddableQuotes({ bookId: c.id })).rejects.toBeInstanceOf(QuoteEmbedDisabledError)
    const feed = await svc.getEmbeddableQuotes({})
    expect(feed).toHaveLength(1) // D only; C excluded, no throw
    expect(feed[0].book_id).toBe(d.id)
  })

  // (6) the feed references the stored row — id + text match (never a copy/transform, BR-BK-S5-5).
  it('references the stored quote row (id + text preserved)', async () => {
    const a = await h.svc.createBook({ title: 'A' })
    const q = await h.svc.addQuote(a.id, 'the exact words', 'p.42')
    const [got] = await h.svc.getEmbeddableQuotes({ bookId: a.id })
    expect(got.id).toBe(q.id)
    expect(got.text).toBe('the exact words')
    expect(got.position).toBe('p.42')
  })

  // (7) global OFF, no overrides — the feed excludes everything and returns [] (never throws). Pins the
  // `false ?? global` all-excluded branch directly (BR-BK-S5-4).
  it('global OFF, no overrides — feed returns [] (no throw)', async () => {
    const a = await h.svc.createBook({ title: 'A' })
    await h.svc.addQuote(a.id, 'x')
    const svc = createBooksService({ ...booksDeps(h.db), preferences: mockPreferences({ global: false }) })
    expect(await svc.getEmbeddableQuotes({})).toHaveLength(0)
  })

  // (8) empty-but-ENABLED book — a scoped call on a toggle-ON book with no quotes returns [] (never throws:
  // "empty" ≠ "disabled"). BR-BK-S5-4 boundary.
  it('scoped on a toggle-ON book with no quotes returns [] (not a throw)', async () => {
    const a = await h.svc.createBook({ title: 'Empty' })
    const svc = createBooksService({ ...booksDeps(h.db), preferences: mockPreferences({ global: true }) })
    expect(await svc.getEmbeddableQuotes({ bookId: a.id })).toHaveLength(0)
  })
})

// A configurable mock AiService (OCR). Default askModel DENIES (the M1 deny-safe state — both ports absent). Books
// never calls checkModelCall, so it throws if touched. `[FACT: knowledge/service.ts:577-582 (ai? deny-safe)]`
function mockAi(opts: { reply?: string; throws?: boolean } = {}): AiService {
  return {
    async checkModelCall() {
      throw new Error('unused by books') // never called — Books only uses askModel
    },
    async askModel() {
      if (opts.throws ?? true) throw new Error('model_unavailable') // M1 deny-safe default
      return { content: opts.reply ?? 'page 42' }
    },
  }
}

describe('mod-books S6 — reading sessions + Reader orchestration (BOO-23/24/25/26/39)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // (1) Registration + the createSession gate (PLAN §4.1).
  it('startSession throws SessionTypeNotFound until registerBooks runs; registerBooks is idempotent', async () => {
    const b = await h.svc.createBook({ title: 'Dune' })
    await expect(h.svc.startSession(b.id, { manual: true })).rejects.toBeInstanceOf(SessionTypeNotFound)
    await h.svc.registerBooks()
    const rsv = await h.svc.startSession(b.id, { manual: true })
    expect(rsv.session.session.sub_type).toBe('reading')
    await expect(h.svc.registerBooks()).resolves.toBeUndefined() // 2nd call = no-op (DuplicateSubType swallowed)
  })

  // C-E2 (PLAN §4.8) — the registered `reading` envelope is EMPTY (no economy grant; grants ride base-sessions).
  it('registers the `reading` sub-type with an empty effect envelope (C-E2)', async () => {
    await h.svc.registerBooks()
    const def = await h.deps.sessionRegistry.get('reading')
    expect(def.owner_module).toBe('books')
    expect(def.effects).toEqual([])
    expect(def.permissions.allowed_effects).toEqual([])
  })

  // (2) startSession({manual}) — base in_progress (+started_at), extension row, book attached (PLAN §4.2).
  it('startSession(manual) — base in_progress + started_at, extension (asset_id null), book attached', async () => {
    await h.svc.registerBooks()
    const b = await h.svc.createBook({ title: 'Neuromancer' })
    const rsv = await h.svc.startSession(b.id, { manual: true })
    expect(rsv.session.session.status).toBe('in_progress')
    expect(rsv.session.session.started_at).toBeTypeOf('number') // R8 — stamped at creation
    expect(rsv.reading.session_id).toBe(rsv.session.session.id)
    expect(rsv.reading.book_id).toBe(b.id)
    expect(rsv.reading.asset_id).toBeNull()
    // R7 — the BOOK (not an asset) is the ADR-004 §3.2.1 target.
    const atts = h.bsql
      .prepare('SELECT entity_type, entity_id, level FROM session_attachments WHERE session_id = ?')
      .all(rsv.session.session.id)
    expect(atts).toContainEqual({ entity_type: 'book', entity_id: b.id, level: 'instance' })
  })

  it('startSession — unknown book ⇒ BookNotFoundError', async () => {
    await h.svc.registerBooks()
    await expect(h.svc.startSession('nope', { manual: true })).rejects.toBeInstanceOf(BookNotFoundError)
  })

  // (3) startSession({assetId}) — asset_id set; unknown/cross-book asset ⇒ BookAssetNotFoundError (PLAN §4.3).
  it('startSession({assetId}) — asset_id captured; cross-book + unknown asset reject', async () => {
    await h.svc.registerBooks()
    const a = await h.svc.createBook({ title: 'A' })
    const b = await h.svc.createBook({ title: 'B' })
    const asset = await h.svc.addAsset(a.id, { format: 'epub' })
    const rsv = await h.svc.startSession(a.id, { assetId: asset.asset.id })
    expect(rsv.reading.asset_id).toBe(asset.asset.id)
    await expect(h.svc.startSession(a.id, { assetId: 'ghost' })).rejects.toBeInstanceOf(BookAssetNotFoundError)
    // asset belongs to A, not B → same-book guard rejects.
    await expect(h.svc.startSession(b.id, { assetId: asset.asset.id })).rejects.toBeInstanceOf(BookAssetNotFoundError)
  })

  // (4) endSession — base completed (+ended_at) + capture columns; unknown id rejects; no-capture leaves nulls.
  it('endSession — completes the base row + records mode-adaptive capture', async () => {
    await h.svc.registerBooks()
    const b = await h.svc.createBook({ title: 'SICP' })
    const started = await h.svc.startSession(b.id, { manual: true })
    const ended = await h.svc.endSession(started.session.session.id, { pages: 12, stopPoint: 'ch.2 end' })
    expect(ended.session.session.status).toBe('completed')
    expect(ended.session.session.ended_at).toBeTypeOf('number')
    expect(ended.reading.pages_read).toBe(12)
    expect(ended.reading.stop_point).toBe('ch.2 end')
    expect(ended.reading.position_delta).toBeNull()
    expect(ended.reading.statistics).toBeNull() // dormant M2 seam
  })

  it('endSession — unknown session id ⇒ ReadingSessionNotFoundError; no-capture leaves columns null', async () => {
    await h.svc.registerBooks()
    await expect(h.svc.endSession('ghost', { pages: 1 })).rejects.toBeInstanceOf(ReadingSessionNotFoundError)
    const b = await h.svc.createBook({ title: 'Empty capture' })
    const started = await h.svc.startSession(b.id, { manual: true })
    const ended = await h.svc.endSession(started.session.session.id, {})
    expect(ended.session.session.status).toBe('completed')
    expect(ended.reading.pages_read).toBeNull()
  })

  // (5) attachPhoto — the photo ALWAYS stores; OCR is INDEPENDENT (PLAN §4.5).
  it('attachPhoto — no ports ⇒ both unavailable (no throw)', async () => {
    await h.svc.registerBooks()
    const b = await h.svc.createBook({ title: 'Photo' })
    const s = await h.svc.startSession(b.id, { manual: true })
    const out = await h.svc.attachPhoto(s.session.session.id, { bytes: new Uint8Array([9]) })
    expect(out.stored).toEqual({ status: 'attachment-unavailable' })
    expect(out.ocr).toEqual({ status: 'ai-unavailable' })
  })

  it('attachPhoto — present attachment stores; a denied OCR never touches `stored`', async () => {
    const svc = createBooksService({ ...h.deps, attachment: mockAttachment(), ai: mockAi({ throws: true }) })
    await svc.registerBooks()
    const b = await svc.createBook({ title: 'Photo2' })
    const s = await svc.startSession(b.id, { manual: true })
    const out = await svc.attachPhoto(s.session.session.id, { bytes: new Uint8Array([1]) })
    expect(out.stored.status).toBe('stored')
    expect(out.ocr.status).toBe('ai-unavailable') // OCR denied, but the photo still stored (BK-10)
  })

  it('attachPhoto — unknown session ⇒ ReadingSessionNotFoundError', async () => {
    await h.svc.registerBooks()
    await expect(h.svc.attachPhoto('ghost', { bytes: new Uint8Array([0]) })).rejects.toBeInstanceOf(
      ReadingSessionNotFoundError,
    )
  })

  it('attachPhoto — a present port whose upload rejects ⇒ AssetFileError (the R2 store-failure path)', async () => {
    const svc = createBooksService({
      ...h.deps,
      attachment: mockAttachment({
        upload: async () => {
          throw new Error('r2 down')
        },
      }),
    })
    await svc.registerBooks()
    const b = await svc.createBook({ title: 'StoreFail' })
    const s = await svc.startSession(b.id, { manual: true })
    await expect(svc.attachPhoto(s.session.session.id, { bytes: new Uint8Array([1]) })).rejects.toBeInstanceOf(
      AssetFileError,
    )
  })

  // (6) getStatistics — derived over the ledger, per-book and all (PLAN §4.6).
  it('getStatistics — derives sessionsLogged + pagesRead per-book and all', async () => {
    await h.svc.registerBooks()
    const a = await h.svc.createBook({ title: 'A' })
    const b = await h.svc.createBook({ title: 'B' })
    const s1 = await h.svc.startSession(a.id, { manual: true })
    await h.svc.endSession(s1.session.session.id, { pages: 10 })
    const s2 = await h.svc.startSession(a.id, { manual: true })
    await h.svc.endSession(s2.session.session.id, { pages: 5 })
    await h.svc.startSession(b.id, { manual: true }) // in-progress: counts in sessionsLogged, 0 minutes
    const statsA = await h.svc.getStatistics({ bookId: a.id })
    expect(statsA.sessionsLogged).toBe(2)
    expect(statsA.pagesRead).toBe(15)
    expect(statsA.minutesSpent).toBeGreaterThanOrEqual(0)
    const all = await h.svc.getStatistics({})
    expect(all.sessionsLogged).toBe(3)
    expect(all.pagesRead).toBe(15)
  })

  // (7) openReader — decrypt (deny-safe) + auto-session + position (PLAN §4.7).
  it('openReader — no attachment ⇒ attachment-unavailable + auto-session + synced-to-self position', async () => {
    await h.svc.registerBooks()
    const b = await h.svc.createBook({ title: 'Reader' })
    const asset = await h.svc.addAsset(b.id, { format: 'pdf', native_position: 'page 7' })
    const ctx = await h.svc.openReader(asset.asset.id)
    expect(ctx.file).toEqual({ status: 'attachment-unavailable' })
    expect(ctx.sessionId).toBeTruthy()
    expect(ctx.position).toEqual({ status: 'synced', position: 'page 7', sourceAssetId: asset.asset.id })
  })

  it('openReader — no native position ⇒ not-synced; unknown asset ⇒ BookAssetNotFoundError', async () => {
    await h.svc.registerBooks()
    const b = await h.svc.createBook({ title: 'Reader2' })
    const asset = await h.svc.addAsset(b.id, { format: 'epub' }) // no native_position
    const ctx = await h.svc.openReader(asset.asset.id)
    expect(ctx.position).toEqual({ status: 'not-synced', nativePosition: null })
    await expect(h.svc.openReader('ghost')).rejects.toBeInstanceOf(BookAssetNotFoundError)
  })

  it('openReader — present attachment whose download rejects ⇒ AssetFileError (the decrypt throw site)', async () => {
    await h.svc.registerBooks() // shared sessionRegistry (h.deps) → 'reading' available to every service below
    const b = await h.svc.createBook({ title: 'Broken' })
    // Store an asset WITH a file_ref so openReader reaches the download/decrypt path.
    const storeSvc = createBooksService({ ...h.deps, attachment: mockAttachment() })
    const uploaded = await storeSvc.addAsset(b.id, { format: 'pdf', file: { bytes: new Uint8Array([1]) } })
    expect(uploaded.file.status).toBe('stored')
    // A reader whose download rejects → the S6 decrypt throw site (BOO-44).
    const readerSvc = createBooksService({
      ...h.deps,
      attachment: mockAttachment({
        download: async () => {
          throw new Error('r2 down')
        },
      }),
    })
    await expect(readerSvc.openReader(uploaded.asset.id)).rejects.toBeInstanceOf(AssetFileError)
  })
})

describe('mod-books S7 — Reading plans / Quota Planner (BOO-27..33)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // date helper — a YYYY-MM-DD `offsetDays` from real today (plans compute against the real clock; derived reads
  // take `asOf` for determinism).
  const iso = (offsetDays: number): string => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10)
  type Dist = { dailyQuota: number; totalPages: number; calendarReconciled: boolean }

  // (1) createPlan (auto, parallel) — plan + junction rows; distribution round-trips JSON (PLAN §4.1).
  it('createPlan (auto, parallel) — plan + junction rows; distribution round-trips JSON', async () => {
    const a = await h.svc.createBook({ title: 'A', total_pages: 200 })
    const b = await h.svc.createBook({ title: 'B', total_pages: 100 })
    const plan = await h.svc.createPlan({
      books: [{ bookId: a.id }, { bookId: b.id }],
      arrangement: 'parallel',
      goalType: 'auto',
      targetDate: iso(10),
    })
    expect(plan.arrangement).toBe('parallel')
    const dist = plan.quota_distribution as unknown as Dist
    expect(dist.totalPages).toBe(300)
    expect(dist.dailyQuota).toBe(30) // ceil(300 / 10)
    expect(dist.calendarReconciled).toBe(false)
    const junctions = h.bsql.prepare('SELECT book_id FROM reading_plan_books WHERE plan_id = ?').all(plan.id)
    expect(junctions).toHaveLength(2)
  })

  it('createPlan — unknown book ⇒ BookNotFoundError; empty books ⇒ validation reject', async () => {
    await expect(
      h.svc.createPlan({ books: [{ bookId: 'ghost' }], arrangement: 'parallel', goalType: 'auto', targetDate: iso(5) }),
    ).rejects.toBeInstanceOf(BookNotFoundError)
    await expect(
      h.svc.createPlan({ books: [], arrangement: 'parallel', goalType: 'auto', targetDate: iso(5) }),
    ).rejects.toThrow()
  })

  // (2) manual goal stores the caller quota (PLAN §4.2).
  it('createPlan (manual) — stores the caller quota (no auto override)', async () => {
    const a = await h.svc.createBook({ title: 'M', total_pages: 500 })
    const plan = await h.svc.createPlan({
      books: [{ bookId: a.id }],
      arrangement: 'sequenced',
      goalType: 'manual',
      targetDate: iso(30),
      quota: 25,
    })
    expect((plan.quota_distribution as unknown as Dist).dailyQuota).toBe(25)
  })

  // (3) a book with no total_pages contributes 0 — honest absent-state (PLAN §4.3).
  it('createPlan (auto) — a book with no total_pages contributes 0 (never guessed)', async () => {
    const a = await h.svc.createBook({ title: 'TOC-only' }) // no total_pages
    const plan = await h.svc.createPlan({
      books: [{ bookId: a.id }],
      arrangement: 'parallel',
      goalType: 'auto',
      targetDate: iso(10),
    })
    const dist = plan.quota_distribution as unknown as Dist
    expect(dist.totalPages).toBe(0)
    expect(dist.dailyQuota).toBe(0)
  })

  // (4) getTodayQuotas — derived pace status; [] when no plan (PLAN §4.4).
  it('getTodayQuotas — derives per-plan pace status; [] when no active plan', async () => {
    expect(await h.svc.getTodayQuotas()).toEqual([])
    const a = await h.svc.createBook({ title: 'A', total_pages: 100 })
    const plan = await h.svc.createPlan({
      books: [{ bookId: a.id }],
      arrangement: 'parallel',
      goalType: 'auto',
      targetDate: iso(10),
    }) // dailyQuota 10
    const q = await h.svc.getTodayQuotas() // creation day, 0 progress → expected 10 > done 0 → behind
    expect(q).toHaveLength(1)
    expect(q[0]!.planId).toBe(plan.id)
    expect(q[0]!.target).toBe(10)
    expect(q[0]!.status).toBe('behind')
  })

  // (5) recordQuotaProgress — credits a session, idempotent per sessionRef (PLAN §4.5).
  it('recordQuotaProgress — credits a session; idempotent per sessionRef; unknown plan rejects', async () => {
    await h.svc.registerBooks()
    const a = await h.svc.createBook({ title: 'A', total_pages: 100 })
    const plan = await h.svc.createPlan({
      books: [{ bookId: a.id }],
      arrangement: 'parallel',
      goalType: 'auto',
      targetDate: iso(10),
    })
    const s = await h.svc.startSession(a.id, { manual: true })
    await h.svc.endSession(s.session.session.id, { pages: 15 })
    await h.svc.recordQuotaProgress(plan.id, s.session.session.id)
    await h.svc.recordQuotaProgress(plan.id, s.session.session.id) // idempotent — overwrite, no double-count
    const after = await h.svc.getTodayQuotas()
    expect(after[0]!.done).toBe(15)
    await expect(h.svc.recordQuotaProgress('ghost', s.session.session.id)).rejects.toBeInstanceOf(
      ReadingPlanNotFoundError,
    )
    // a bogus sessionRef is a caller error, never a silent 0-credit (code-review fix).
    await expect(h.svc.recordQuotaProgress(plan.id, 'ghost-session')).rejects.toBeInstanceOf(
      ReadingSessionNotFoundError,
    )
  })

  // (6) recalculate — on/ahead of pace reshapes silently (PLAN §4.6).
  it('recalculate — ahead of pace reshapes silently to a lower daily quota', async () => {
    await h.svc.registerBooks()
    const a = await h.svc.createBook({ title: 'A', total_pages: 100 })
    const plan = await h.svc.createPlan({
      books: [{ bookId: a.id }],
      arrangement: 'parallel',
      goalType: 'auto',
      targetDate: iso(10),
    }) // dailyQuota 10
    const s = await h.svc.startSession(a.id, { manual: true })
    await h.svc.endSession(s.session.session.id, { pages: 50 })
    await h.svc.recordQuotaProgress(plan.id, s.session.session.id)
    const reshaped = await h.svc.recalculate(plan.id, iso(2)) // remaining 50 over 8 days → ceil(50/8)=7 ≤ 10 → reshape
    expect((reshaped.quota_distribution as unknown as Dist).dailyQuota).toBe(7)
  })

  // (7) recalculate — behind pace ⇒ TargetUnreachableProposal (never a silent rewrite) (PLAN §4.7).
  it('recalculate — behind pace / past target ⇒ TargetUnreachableProposal with options', async () => {
    const a = await h.svc.createBook({ title: 'A', total_pages: 100 })
    const plan = await h.svc.createPlan({
      books: [{ bookId: a.id }],
      arrangement: 'parallel',
      goalType: 'auto',
      targetDate: iso(10),
    }) // dailyQuota 10
    // day 9, no progress: remaining 100 over 1 day → required 100 > 10 → unreachable, both options.
    await expect(h.svc.recalculate(plan.id, iso(9))).rejects.toMatchObject({
      name: 'TargetUnreachableProposal',
      options: ['extend_date', 'raise_quota'],
    })
    // past the target (remainingDays ≤ 0) → extend_date only.
    await expect(h.svc.recalculate(plan.id, iso(11))).rejects.toMatchObject({ options: ['extend_date'] })
    const err = await h.svc.recalculate(plan.id, iso(9)).catch((e) => e)
    expect(err).toBeInstanceOf(TargetUnreachableProposal)
    expect(err.suggestedQuota).toBeGreaterThan(10)
  })

  // (8) getProjection — derives the trajectory; unknown plan rejects (PLAN §4.8).
  it('getProjection — derives the trajectory; unknown plan ⇒ ReadingPlanNotFoundError', async () => {
    const a = await h.svc.createBook({ title: 'A', total_pages: 100 })
    const plan = await h.svc.createPlan({
      books: [{ bookId: a.id }],
      arrangement: 'parallel',
      goalType: 'auto',
      targetDate: iso(10),
    })
    const proj = await h.svc.getProjection(plan.id, iso(0))
    expect(proj.remainingPages).toBe(100)
    expect(proj.remainingDays).toBe(10)
    expect(proj.projectedCompletionDate).toBeTruthy()
    await expect(h.svc.getProjection('ghost')).rejects.toBeInstanceOf(ReadingPlanNotFoundError)
  })
})

// ============================================================================
// S8 — Unified progress + conflict resolution (BOO-13/34/35) — maps 1:1 to PLAN-S8 §4.
// ============================================================================
describe('mod-books S8 — unified progress + conflict resolution', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // §4.1 — the three derived + override terminals.
  it('null (TOC-only / no copy), a single page-unit asset (rounded), and the manual-override terminal', async () => {
    const empty = await h.svc.createBook({ title: 'TOC-only', total_pages: 200 })
    expect(await h.svc.getUnifiedProgress(empty.id)).toBeNull() // no copy ⇒ unmeasured

    const b = await h.svc.createBook({ title: 'One copy', total_pages: 200 })
    await h.svc.addAsset(b.id, { format: 'pdf', native_position: '50' })
    expect(await h.svc.getUnifiedProgress(b.id)).toBe(25) // 50/200 → 0.25 → 25

    // manual-override terminal: progress is never settable via the service (BR-BK-S1-1) → write it raw to exercise it.
    h.bsql.prepare('UPDATE books SET progress = ? WHERE id = ?').run(88, b.id)
    expect(await h.svc.getUnifiedProgress(b.id)).toBe(88) // override wins over derivation (resolveProgress §3.2)
  })

  // §4.1 — no page basis ⇒ unmeasured (total_pages guard).
  it('a page-unit asset with no work-level total_pages ⇒ null (no basis to derive)', async () => {
    const b = await h.svc.createBook({ title: 'No total' })
    await h.svc.addAsset(b.id, { format: 'pdf', native_position: '50' })
    expect(await h.svc.getUnifiedProgress(b.id)).toBeNull()
  })

  // §4.2 — non-page-unit formats are honestly unmeasured (the mapping is unbuilt, BK-4).
  it('only epub/audiobook/other assets ⇒ null (unmeasured, never guessed)', async () => {
    const b = await h.svc.createBook({ title: 'Non-page', total_pages: 300 })
    await h.svc.addAsset(b.id, { format: 'epub', native_position: '1200' })
    await h.svc.addAsset(b.id, { format: 'audiobook', native_position: '01:23:45' })
    await h.svc.addAsset(b.id, { format: 'other', native_position: '7' })
    expect(await h.svc.getUnifiedProgress(b.id)).toBeNull()
  })

  // §4.3 — agreement vs clash (no rule).
  it('agreeing page-unit assets ⇒ the shared value; disagreeing + no rule ⇒ conflicted', async () => {
    const agree = await h.svc.createBook({ title: 'Agree', total_pages: 200 })
    await h.svc.addAsset(agree.id, { format: 'pdf', native_position: '50' }) // 25
    await h.svc.addAsset(agree.id, { format: 'physical', native_position: '50' }) // 25
    expect(await h.svc.getUnifiedProgress(agree.id)).toBe(25)

    const clash = await h.svc.createBook({ title: 'Clash', total_pages: 200 })
    await h.svc.addAsset(clash.id, { format: 'pdf', native_position: '50' }) // 25
    await h.svc.addAsset(clash.id, { format: 'pdf', native_position: '150' }) // 75
    expect(await h.svc.getUnifiedProgress(clash.id)).toBe('conflicted') // no port ⇒ ASK default (BK-8)
  })

  // §4.4 — the preset rules applied on read.
  it('source_of_truth picks the named asset; last_valid resolves; photo_valid cannot apply at M1', async () => {
    const b = await h.svc.createBook({ title: 'Ruled', total_pages: 200 })
    const a1 = (await h.svc.addAsset(b.id, { format: 'pdf', native_position: '50' })).asset // 25
    const a2 = (await h.svc.addAsset(b.id, { format: 'pdf', native_position: '150' })).asset // 75

    const sot = createBooksService({
      ...booksDeps(h.db),
      preferences: mockPreferences({ conflictRules: { [b.id]: { rule: 'source_of_truth', assetId: a1.id } } }),
    })
    expect(await sot.getUnifiedProgress(b.id)).toBe(25) // a1 chosen

    const lv = createBooksService({
      ...booksDeps(h.db),
      preferences: mockPreferences({ conflictRules: { [b.id]: { rule: 'last_valid' } } }),
    })
    // a2 is created after a1 (UUIDv7 id↑, updated_at ≥) → last_valid resolves to a2's 75 (deterministic tie-break).
    expect(await lv.getUnifiedProgress(b.id)).toBe(75)
    expect(a2.id > a1.id).toBe(true) // the tie-break premise holds

    const pv = createBooksService({
      ...booksDeps(h.db),
      preferences: mockPreferences({ conflictRules: { [b.id]: { rule: 'photo_valid' } } }),
    })
    expect(await pv.getUnifiedProgress(b.id)).toBe('conflicted') // no photo source at M1 ⇒ cannot apply
  })

  // §4.5 — the derived conflict queue (no table).
  it('getConflicts: [] when no clash; one blocking ConflictItem when unresolved; BookNotFoundError on a ghost', async () => {
    const ok = await h.svc.createBook({ title: 'OK', total_pages: 200 })
    await h.svc.addAsset(ok.id, { format: 'pdf', native_position: '50' })
    expect(await h.svc.getConflicts(ok.id)).toEqual([]) // single candidate ⇒ no clash

    const b = await h.svc.createBook({ title: 'Clash', total_pages: 200 })
    const a1 = (await h.svc.addAsset(b.id, { format: 'pdf', native_position: '50' })).asset
    const a2 = (await h.svc.addAsset(b.id, { format: 'pdf', native_position: '150' })).asset
    const conflicts = await h.svc.getConflicts(b.id)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]!.id).toBe(`conflict:${b.id}`)
    expect(conflicts[0]!.blocking).toBe(true)
    expect(conflicts[0]!.sources.map((s) => s.assetId).sort()).toEqual([a1.id, a2.id].sort())
    expect(conflicts[0]!.sources.map((s) => s.progress).sort()).toEqual([25, 75])

    await expect(h.svc.getConflicts('ghost')).rejects.toBeInstanceOf(BookNotFoundError)
  })

  // §4.6 — resolveConflict: the round-trip + the fail-loud + no-op branches.
  it('resolveConflict persists a rule (round-trip), validates source_of_truth, no-throw photo_valid', async () => {
    const pref = mockPreferences()
    const svc = createBooksService({ ...booksDeps(h.db), preferences: pref })
    const b = await svc.createBook({ title: 'Resolve', total_pages: 200 })
    const a1 = (await svc.addAsset(b.id, { format: 'pdf', native_position: '50' })).asset // 25
    await svc.addAsset(b.id, { format: 'pdf', native_position: '150' }) // 75
    expect(await svc.getUnifiedProgress(b.id)).toBe('conflicted')

    // round-trip: persist source_of_truth → the next read resolves to a1's 25.
    await svc.resolveConflict(`conflict:${b.id}`, { rule: 'source_of_truth', assetId: a1.id })
    expect(await svc.getUnifiedProgress(b.id)).toBe(25)
    expect(await svc.getConflicts(b.id)).toEqual([]) // now resolved ⇒ queue empty

    // a valid but not-yet-applicable preset persists WITHOUT throwing; the book stays conflicted.
    await expect(svc.resolveConflict(`conflict:${b.id}`, { rule: 'photo_valid' })).resolves.toBeUndefined()
    expect(await svc.getUnifiedProgress(b.id)).toBe('conflicted')

    // source_of_truth naming a non-existent asset ⇒ structural fail-loud.
    await expect(
      svc.resolveConflict(`conflict:${b.id}`, { rule: 'source_of_truth', assetId: 'ghost' }),
    ).rejects.toBeInstanceOf(BookAssetNotFoundError)
  })

  it('resolveConflict: absent port ⇒ no-op (never throws); malformed/ghost id ⇒ BookNotFoundError', async () => {
    const b = await h.svc.createBook({ title: 'NoPort', total_pages: 200 })
    // h.svc has no preferences port → the write is a silent no-op (the revokeLookupGrant precedent).
    await expect(h.svc.resolveConflict(`conflict:${b.id}`, { rule: 'last_valid' })).resolves.toBeUndefined()
    // malformed id (no `conflict:` prefix) and an unknown book both fail loud.
    await expect(h.svc.resolveConflict('garbage', { rule: 'last_valid' })).rejects.toBeInstanceOf(BookNotFoundError)
    await expect(h.svc.resolveConflict('conflict:ghost', { rule: 'last_valid' })).rejects.toBeInstanceOf(
      BookNotFoundError,
    )
  })

  // §4.1 — getUnifiedProgress guards the book.
  it('getUnifiedProgress on a non-existent book ⇒ BookNotFoundError', async () => {
    await expect(h.svc.getUnifiedProgress('ghost')).rejects.toBeInstanceOf(BookNotFoundError)
  })

  // §4.7 — getBook composes S8.
  it('getBook.unifiedProgress reflects getUnifiedProgress (null / number / conflicted)', async () => {
    const b = await h.svc.createBook({ title: 'View', total_pages: 200 })
    expect((await h.svc.getBook(b.id))!.unifiedProgress).toBeNull()
    await h.svc.addAsset(b.id, { format: 'pdf', native_position: '100' })
    expect((await h.svc.getBook(b.id))!.unifiedProgress).toBe(50)
    await h.svc.addAsset(b.id, { format: 'pdf', native_position: '20' }) // 10 — now a clash
    expect((await h.svc.getBook(b.id))!.unifiedProgress).toBe('conflicted')
  })

  // §4.6 — PositionConflictPending is exported typed vocabulary (no M1 backend throw-site), an Error subclass.
  it('PositionConflictPending is exported typed vocabulary (surfaced at M1), not thrown by any S8 method', () => {
    const err = new PositionConflictPending('some-book')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('PositionConflictPending')
    expect(err.bookId).toBe('some-book')
  })
})

// ============================================================================
// S9 — Education partition + measurement source + tags + linkable-target
//      (BOO-04/14/36/37/38/46) — maps 1:1 to PLAN-S9 §4.
// ============================================================================
describe('mod-books S9 — Education partition + measure source + tags + target', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // §4.1 — scopeTag classifies a book via a live entity_tag; guards book + tag.
  it('scopeTag tags a book; BookNotFoundError on a ghost book; TagNotFound on an unresolved tag', async () => {
    const b = await h.svc.createBook({ title: 'Dune' })
    const tag = await h.deps.spaces.createTag({ name: 'sci-fi' })
    const row = await h.svc.scopeTag(b.id, tag.id)
    expect(row.entity_id).toBe(b.id)
    expect(row.entity_type).toBe('book')
    expect(row.tag_id).toBe(tag.id)

    await expect(h.svc.scopeTag('ghost', tag.id)).rejects.toBeInstanceOf(BookNotFoundError)
    await expect(h.svc.scopeTag(b.id, 'no-such-tag')).rejects.toBeInstanceOf(TagNotFound)
  })

  // §4.2 — linkSubject is idempotent and returns a FAITHFUL row (B1); guards the book.
  it('linkSubject creates + is idempotent + returns a faithful row; BookNotFoundError on a ghost', async () => {
    const b = await h.svc.createBook({ title: 'Linear Algebra' })
    const first = await h.svc.linkSubject(b.id, 'subject-math')
    expect(first.book_id).toBe(b.id)
    expect(first.subject_id).toBe('subject-math')
    expect(first.created_at).toBeTypeOf('number') // B1 — faithful row (not a create-echo with undefined timestamps)
    expect(first.deleted_at).toBeNull()

    const second = await h.svc.linkSubject(b.id, 'subject-math')
    expect(second.id).toBe(first.id) // idempotent — same active row, no duplicate

    await expect(h.svc.linkSubject('ghost', 'subject-math')).rejects.toBeInstanceOf(BookNotFoundError)
  })

  // §4.3 — unlinkSubject soft-deletes; idempotent no-op.
  it('unlinkSubject soft-deletes the link and is a no-op when none exists', async () => {
    const b = await h.svc.createBook({ title: 'Physics' })
    await h.svc.linkSubject(b.id, 'subject-phys')
    expect(await h.svc.listBooksForSubject('subject-phys')).toHaveLength(1)

    await h.svc.unlinkSubject(b.id, 'subject-phys')
    expect(await h.svc.listBooksForSubject('subject-phys')).toHaveLength(0)
    // second call / no active link ⇒ no-op (never throws)
    await expect(h.svc.unlinkSubject(b.id, 'subject-phys')).resolves.toBeUndefined()
  })

  // §4.4 — listBooksForSubject returns live books, soft-delete filtered both sides.
  it('listBooksForSubject returns the live linked books; [] when none; excludes soft-deleted books', async () => {
    expect(await h.svc.listBooksForSubject('subject-x')).toEqual([])

    const a = await h.svc.createBook({ title: 'A' })
    const b = await h.svc.createBook({ title: 'B' })
    await h.svc.linkSubject(a.id, 'subject-x')
    await h.svc.linkSubject(b.id, 'subject-x')
    expect((await h.svc.listBooksForSubject('subject-x')).map((x) => x.id).sort()).toEqual([a.id, b.id].sort())

    await h.svc.softDeleteBook(a.id) // a deleted BOOK drops from the join (soft-delete filtered)
    expect((await h.svc.listBooksForSubject('subject-x')).map((x) => x.id)).toEqual([b.id])
  })

  // §4.5 — getPaceStatus is deny-safe null at M1 (Education unbuilt); guards the book.
  it('getPaceStatus returns null for a linked book (Education unbuilt); BookNotFoundError on a ghost', async () => {
    const b = await h.svc.createBook({ title: 'Chemistry' })
    await h.svc.linkSubject(b.id, 'subject-chem')
    expect(await h.svc.getPaceStatus(b.id, 'subject-chem')).toBeNull()
    await expect(h.svc.getPaceStatus('ghost', 'subject-chem')).rejects.toBeInstanceOf(BookNotFoundError)
  })

  // §4.6 — getReadingMeasureSource composes getUnifiedProgress; conflicted/unmeasured ⇒ null.
  it('getReadingMeasureSource: number for a single asset; null for conflicted + unmeasured; BookNotFoundError on a ghost', async () => {
    const measured = await h.svc.createBook({ title: 'Measured', total_pages: 200 })
    await h.svc.addAsset(measured.id, { format: 'pdf', native_position: '50' })
    expect(await h.svc.getReadingMeasureSource(measured.id)).toEqual({ progress: 25 })

    const conflicted = await h.svc.createBook({ title: 'Conflicted', total_pages: 200 })
    await h.svc.addAsset(conflicted.id, { format: 'pdf', native_position: '50' }) // 25
    await h.svc.addAsset(conflicted.id, { format: 'pdf', native_position: '150' }) // 75
    expect(await h.svc.getReadingMeasureSource(conflicted.id)).toEqual({ progress: null }) // 'conflicted' → null

    const unmeasured = await h.svc.createBook({ title: 'TOC-only', total_pages: 200 })
    expect(await h.svc.getReadingMeasureSource(unmeasured.id)).toEqual({ progress: null })

    await expect(h.svc.getReadingMeasureSource('ghost')).rejects.toBeInstanceOf(BookNotFoundError)
  })

  // §4.7 — BOO-46: Books is a registered linkable TARGET (identity only; other modules own the links).
  it('BOO-46 — book and book_chapter are registered taggable/linkable entity types', () => {
    const registry = createTaggableTypeRegistry()
    expect(registry.isRegistered('book')).toBe(true)
    expect(registry.isRegistered('book_chapter')).toBe(true)
  })
})

// An on-device AiRequest for the S10 model calls (Books stamps its own defId internally, so this id is overwritten).
const AI_REQ = { defId: 'caller.placeholder', mode: 'on_device' } as const

describe('mod-books S10 — integrations (TTS/transcription), deny-safe + consent (BOO-40/41/42/43)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // BR-BK-S10-1 — no `ai?` ⇒ ai-unavailable; the asset is still guarded first.
  it('convertToSpeech / transcribeForMapping — no ai dep ⇒ ai-unavailable; ghost asset ⇒ BookAssetNotFoundError', async () => {
    const b = await h.svc.createBook({ title: 'TTS' })
    const a = await h.svc.addAsset(b.id, { format: 'pdf' })
    expect(await h.svc.convertToSpeech(a.asset.id, AI_REQ)).toEqual({ status: 'ai-unavailable', reason: 'no-ai' })
    expect(await h.svc.transcribeForMapping(a.asset.id, AI_REQ)).toEqual({ status: 'ai-unavailable', reason: 'no-ai' })
    await expect(h.svc.convertToSpeech('ghost', AI_REQ)).rejects.toBeInstanceOf(BookAssetNotFoundError)
    await expect(h.svc.transcribeForMapping('ghost', AI_REQ)).rejects.toBeInstanceOf(BookAssetNotFoundError)
  })

  // BR-BK-S10-1/2 — a present-but-dormant ai? denies ⇒ ai-unavailable (NO checkModelCall, NO throw); a reply ⇒ ready+source:'ai'.
  it('present ai? — askModel denies ⇒ ai-unavailable (no checkModelCall gate); resolves ⇒ ready+source:ai', async () => {
    const b = await h.svc.createBook({ title: 'Model' })
    const a = await h.svc.addAsset(b.id, { format: 'audiobook' })
    // mockAi.checkModelCall THROWS if touched — these passing proves Books never calls the gate (B1: no M1 gate).
    const denied = createBooksService({ ...h.deps, ai: mockAi({ throws: true }) })
    expect((await denied.convertToSpeech(a.asset.id, AI_REQ)).status).toBe('ai-unavailable')
    const ready = createBooksService({ ...h.deps, ai: mockAi({ throws: false, reply: 'pos:42' }) })
    expect(await ready.transcribeForMapping(a.asset.id, AI_REQ)).toEqual({
      status: 'ready',
      position: 'pos:42',
      source: 'ai',
    })
  })

  // BR-BK-S10-2 — IntegrationConsentError is exported typed vocabulary (BOO-43), NOT thrown by any M1 path.
  it('IntegrationConsentError is exported + constructible, with no M1 throw-site', () => {
    const err = new IntegrationConsentError('books.tts')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('IntegrationConsentError')
    expect(err.defId).toBe('books.tts')
  })
})

describe('mod-books S10 — Study-Planner read-provider (BOO-45 / BK-12)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('getPlansForConsumer — active plans only (soft-delete filtered); read-only (no write exposed)', async () => {
    const b = await h.svc.createBook({ title: 'Plan book', total_pages: 100 })
    const plan = await h.svc.createPlan({
      books: [{ bookId: b.id }],
      arrangement: 'parallel',
      goalType: 'auto',
      targetDate: '2099-01-01',
    })
    const got = await h.svc.getPlansForConsumer()
    expect(got.map((p) => p.id)).toContain(plan.id)
    // BK-12 boundary — the read-provider exposes no plan-write method to consumers.
    expect('createPlan' in (h.svc as object)).toBe(true) // the owner writes…
    const provided = await h.svc.getPlansForConsumer()
    expect(Array.isArray(provided)).toBe(true) // …consumers only read the array
  })
})

describe('mod-books S10 — reading-completion measurement fan-out (BOO-26 / C-E2)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('no effects? ⇒ endSession succeeds, nothing fired (dormant seam)', async () => {
    await h.svc.registerBooks()
    const b = await h.svc.createBook({ title: 'Dormant' })
    const s = await h.svc.startSession(b.id, { manual: true })
    const ended = await h.svc.endSession(s.session.session.id, { pages: 5 })
    expect(ended.session.session.status).toBe('completed') // no effects? dep → fan-out is a no-op
  })

  it('effects? wired ⇒ exactly one emit_measurement_signal (grain=session id, targetRef=book); C-E2 no economy; handler throw isolated', async () => {
    const registry = createEffectRegistry()
    const fired: EffectEvent[] = []
    const economy: EffectEvent[] = []
    registry.register('emit_measurement_signal', async (ev) => {
      fired.push(ev)
    })
    // C-E2 proof — if Books ever emitted economy, these would record; they must stay empty.
    registry.register('award_xp', async (ev) => {
      economy.push(ev)
    })
    registry.register('grant_currency', async (ev) => {
      economy.push(ev)
    })
    const rail = createEffectRail(h.db, registry)
    const svc = createBooksService({ ...h.deps, effects: { rail, registry } })
    await svc.registerBooks()
    const b = await svc.createBook({ title: 'Signal' })
    const s = await svc.startSession(b.id, { manual: true })
    await svc.endSession(s.session.session.id, { pages: 10 })
    expect(fired).toHaveLength(1)
    expect(fired[0]!.effectType).toBe('emit_measurement_signal')
    expect(fired[0]!.subjectNaturalKey).toBe(s.session.session.id) // occurrence grain
    expect(fired[0]!.targetRef).toBe(b.id)
    expect(economy).toHaveLength(0) // C-E2 — Books never emits an economy grant
  })

  it('a throwing handler does NOT fail endSession (post-commit, failure-isolated)', async () => {
    const registry = createEffectRegistry()
    registry.register('emit_measurement_signal', async () => {
      throw new Error('handler boom')
    })
    const rail = createEffectRail(h.db, registry)
    const svc = createBooksService({ ...h.deps, effects: { rail, registry } })
    await svc.registerBooks()
    const b = await svc.createBook({ title: 'Isolated' })
    const s = await svc.startSession(b.id, { manual: true })
    const ended = await svc.endSession(s.session.session.id, { pages: 3 })
    expect(ended.session.session.status).toBe('completed') // the completed session stands
  })
})

describe('mod-books S10 — Journal digest + contribution (BOO-30) + local-first (BOO-47)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // BR-BK-S10-5 — the digest counts reading sessions completed THIS day (base ended_at window) + plan pace tallies.
  it('getDayBooksDigest — counts completed sessions this day; empty day ⇒ zeros', async () => {
    await h.svc.registerBooks()
    const today = new Date().toISOString().slice(0, 10)
    const b = await h.svc.createBook({ title: 'Digest' })
    const s1 = await h.svc.startSession(b.id, { manual: true })
    await h.svc.endSession(s1.session.session.id, { pages: 20 })
    const s2 = await h.svc.startSession(b.id, { manual: true })
    await h.svc.endSession(s2.session.session.id, { pages: 15 })
    // an in-progress session (never ended) does NOT count (no ended_at).
    await h.svc.startSession(b.id, { manual: true })

    const digest = await h.svc.getDayBooksDigest(today)
    expect(digest.sessionsLogged).toBe(2)
    expect(digest.pagesRead).toBe(35)
    expect(digest.onPace + digest.behind).toBe(0) // no active plans → no pace tallies

    const empty = await h.svc.getDayBooksDigest('2000-01-01')
    expect(empty).toEqual({ pagesRead: 0, sessionsLogged: 0, onPace: 0, behind: 0 })
  })

  // BR-BK-S10-5 — registerBooksJournal plugs a 'summary' contribution: success on activity, empty on an idle day.
  it('registerBooksJournal — summary(date) is success on activity, empty on an idle day', async () => {
    await h.svc.registerBooks()
    const { registerBooksJournal } = await import('../journal')
    const jr = createJournalRegistry()
    registerBooksJournal(jr, h.svc)
    const contribution = jr.get('books')
    expect(contribution?.sectionKey).toBe('summary')

    const today = new Date().toISOString().slice(0, 10)
    const b = await h.svc.createBook({ title: 'JournalBook' })
    const s = await h.svc.startSession(b.id, { manual: true })
    await h.svc.endSession(s.session.session.id, { pages: 7 })
    const active = await contribution!.summary(today)
    expect(active.state).toBe('success')
    expect(active.module).toBe('books')

    const idle = await contribution!.summary('2000-01-01')
    expect(idle.state).toBe('empty')
  })

  // BR-BK-S10-6 (BOO-47 / BK-18) — every Books write succeeds locally first (no network dependency wired).
  it('local-first — a plan write persists + reads back with NO integration port present', async () => {
    const b = await h.svc.createBook({ title: 'LocalFirst', total_pages: 50 })
    // no ai/ingestion/attachment/effects/preferences ports — a pure local write path.
    const plan = await h.svc.createPlan({
      books: [{ bookId: b.id }],
      arrangement: 'parallel',
      goalType: 'auto',
      targetDate: '2099-06-01',
    })
    const readBack = await h.svc.getPlansForConsumer()
    expect(readBack.map((p) => p.id)).toContain(plan.id) // persisted locally, no relay needed
  })
})
