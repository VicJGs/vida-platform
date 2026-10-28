// ============================================================================
// mod-knowledge #50 ① · S7 — Flashcards sub-service (LIF-128)
//
// Node / better-sqlite3 live-store harness (mirrors the knowledge harness): REAL store, UNLOCKED vault,
// migrate() applies 022_knowledge (flashcards) + the review/sessions/spaces substrates. Covers the S7
// Verification Gate: card CRUD + faithful echo + media JSON round-trip + card_type validation (FC-05) ·
// registration (FC-02) · review-session run + one-event-per-card emit (FC-03/06) · due-queue with
// CardNotBound exclusion (FC-07/09) · tags/links (FC-11) · generateCards + dangling source (FC-04/08) ·
// ReviewEmitFailed (FC-10) + co-transactional sync_queue enqueue.
//
// objectId is a no-FK review-target ref (BR-S4-1) → synthetic object ids keep this suite decoupled from a
// live knowledge service (the card→object model, headline #1).
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { syncQueue } from '../../../db/schema'
import { createTaggableTypeRegistry } from '../../../foundation/spaces/registry'
import { createSpacesService } from '../../../foundation/spaces/service'
import { TagNotFound } from '../../../foundation/spaces/types'
import { createCapabilityRegistry } from '../../../foundation/capability'
import { createReviewEngine, type ReviewEngine } from '../../../foundation/review'
import { createSessionRegistry } from '../../../foundation/sessions'
import { createEffectRegistry, createEffectRail } from '../../../foundation/effects'
import { createBacklinkResolver } from '../../search/backlink-resolver'
import { createSessionsService } from '../../sessions'
import {
  createFlashcardsService,
  InvalidCardType,
  MalformedCloze,
  ReviewEmitFailed,
  FlashcardNotFoundError,
  FLASHCARDS_METHOD_ID,
  type FlashcardsService,
  type FlashcardsServiceDeps,
} from '../index'

const DEVICE = 'test-device'

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
  svc: FlashcardsService
  db: DrizzleDb
  bsql: Database.Database
  review: ReviewEngine
  deps: FlashcardsServiceDeps
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const registry = createTaggableTypeRegistry()
  const spaces = createSpacesService(db, DEVICE, registry)
  const backlinks = createBacklinkResolver(db, DEVICE)
  const capability = createCapabilityRegistry(db, DEVICE)
  const review = createReviewEngine(db, DEVICE, { capability })
  const sessionRegistry = createSessionRegistry(db, DEVICE)
  const rail = createEffectRail(db, createEffectRegistry())
  const sessions = createSessionsService({
    db,
    deviceId: DEVICE,
    registry: sessionRegistry,
    rail,
    entityRegistry: registry,
  })
  const deps: FlashcardsServiceDeps = { db, deviceId: DEVICE, review, spaces, backlinks, sessions, sessionRegistry }
  const svc = createFlashcardsService(deps)
  await svc.registerFlashcards() // most tests need the study_method + the 'review' sub-type
  return { svc, db, bsql, review, deps }
}

describe('mod-knowledge S7 — flashcards sub-service', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  const basic = { front: 'Q', back: 'A', card_type: 'basic' as const }

  // --- FC-01/05/12: card content --------------------------------------------
  it('createCard persists + faithful echo (defaults backfilled) + media JSON round-trip', async () => {
    const card = await h.svc.createCard({ ...basic, media: ['img1', 'img2'] })
    expect(card.front).toBe('Q')
    expect(card.card_type).toBe('basic')
    expect(card.is_suspended).toBe(false) // notNull default backfilled
    expect(card.sort_order).toBe(0)
    expect(card.media).toEqual(['img1', 'img2']) // json<string[]> parsed on read
  })

  it('createCard rejects an unknown card_type → InvalidCardType (before the DB CHECK)', async () => {
    await expect(h.svc.createCard({ ...basic, card_type: 'wormhole' })).rejects.toBeInstanceOf(InvalidCardType)
  })

  it('a cloze card without a {{…}} mask → MalformedCloze; with a mask → ok (FC-05)', async () => {
    await expect(h.svc.createCard({ front: 'plain text', back: 'A', card_type: 'cloze' })).rejects.toBeInstanceOf(
      MalformedCloze,
    )
    const ok = await h.svc.createCard({ front: 'The {{capital}} of France', back: 'Paris', card_type: 'cloze' })
    expect(ok.card_type).toBe('cloze')
  })

  it('listCards filters by card_type + is_suspended; soft-delete hides', async () => {
    const c1 = await h.svc.createCard(basic)
    await h.svc.createCard({ front: 'C', back: 'D', card_type: 'reversed' })
    expect(await h.svc.listCards({ cardType: 'basic' })).toHaveLength(1)
    await h.svc.updateCard(c1.id, { is_suspended: true })
    expect(await h.svc.listCards({ isSuspended: true })).toHaveLength(1)
    await h.svc.deleteCard(c1.id)
    expect((await h.svc.listCards()).some((c) => c.id === c1.id)).toBe(false)
    await expect(h.svc.deleteCard('ghost')).rejects.toBeInstanceOf(FlashcardNotFoundError)
  })

  // --- FC-02: registration ---------------------------------------------------
  it('registerFlashcards registers the study_method capability (roles in config_schema) + is idempotent', async () => {
    const methods = await h.review.listMethods()
    const fc = methods.find((m) => m.id === FLASHCARDS_METHOD_ID)
    expect(fc).toBeDefined()
    expect((fc!.config_schema as { roles?: string[] })?.roles).toEqual(['retention', 'gathering'])
    await expect(h.svc.registerFlashcards()).resolves.toBeUndefined() // 2nd call no-op (idempotent)
  })

  // --- FC-03/06: run ---------------------------------------------------------
  it('startReview creates a review session + completeReview emits one review_event per card (object-keyed)', async () => {
    const c1 = await h.svc.createCard(basic)
    const c2 = await h.svc.createCard({ front: 'X', back: 'Y', card_type: 'basic' })
    const session = await h.svc.startReview([c1.id, c2.id])
    expect(session.session.id).toBeTruthy()
    const events = await h.svc.completeReview(session.session.id, [
      { cardId: c1.id, objectId: 'obj-1', quality: 5 },
      { cardId: c2.id, objectId: 'obj-2', quality: 3 },
    ])
    expect(events).toHaveLength(2)
    expect(events[0]!.object_id).toBe('obj-1')
    expect(events[0]!.method_id).toBe(FLASHCARDS_METHOD_ID)
    // the session is completed
    const done = await h.deps.sessions.getSession(session.session.id)
    expect(done!.session.status).toBe('completed')
  })

  // --- FC-10: emit failure surfaced -----------------------------------------
  it('a failed review_event emit surfaces ReviewEmitFailed (never silently dropped)', async () => {
    const throwingReview = {
      ...h.review,
      recordReview: async () => {
        throw new Error('boom')
      },
    } as unknown as ReviewEngine
    const svc = createFlashcardsService({ ...h.deps, review: throwingReview })
    const card = await h.svc.createCard(basic)
    await expect(
      svc.completeReview('any-session', [{ cardId: card.id, objectId: 'obj-1', quality: 5 }]),
    ).rejects.toBeInstanceOf(ReviewEmitFailed)
  })

  // --- FC-07/09: due-queue ---------------------------------------------------
  it('dueCards includes a card whose object is BOUND + due; excludes an unbound object (CardNotBound) + suspended', async () => {
    const bound = await h.svc.createCard(basic)
    const unbound = await h.svc.createCard({ front: 'U', back: 'V', card_type: 'basic' })
    const suspended = await h.svc.createCard({ front: 'S', back: 'T', card_type: 'basic', is_suspended: true })
    // bind a method+curve to obj-bound (targetType positional — 'topic' here)
    await h.review.bindMethod({ targetType: 'topic', targetId: 'obj-bound', methodId: FLASHCARDS_METHOD_ID })
    const due = await h.svc.dueCards([
      { cardId: bound.id, objectId: 'obj-bound' }, // bound + never-reviewed ⇒ due now
      { cardId: unbound.id, objectId: 'obj-unbound' }, // no binding ⇒ CardNotBound, excluded
      { cardId: suspended.id, objectId: 'obj-bound' }, // suspended ⇒ excluded
    ])
    const ids = due.map((c) => c.id)
    expect(ids).toContain(bound.id)
    expect(ids).not.toContain(unbound.id)
    expect(ids).not.toContain(suspended.id)
  })

  // --- FC-11: tags + links ---------------------------------------------------
  it('tagCard guards the tag resolves + tags via entity_tags; linkCard + listCardLinks round-trip', async () => {
    const card = await h.svc.createCard(basic)
    await expect(h.svc.tagCard(card.id, 'ghost-tag')).rejects.toBeInstanceOf(TagNotFound)
    const tag = await h.deps.spaces.createTag({ name: 'tag-1' }) // returns the generated id (S2 precedent)
    const tagRow = await h.svc.tagCard(card.id, tag.id)
    expect(tagRow.entity_type).toBe('flashcard')
    expect(tagRow.entity_id).toBe(card.id)
    await h.svc.linkCard(card.id, { entityType: 'knowledge_object', entityId: 'obj-1' }, 'reviews')
    const links = await h.svc.listCardLinks(card.id)
    expect(links.some((l) => l.entity_id === 'obj-1')).toBe(true)
    await expect(h.svc.tagCard('ghost', 'tag-1')).rejects.toBeInstanceOf(FlashcardNotFoundError)
  })

  // --- FC-04/08: gather ------------------------------------------------------
  it('generateCards creates cards + links each to the source; a link to a non-existent source is a valid dangling ref (FC-08)', async () => {
    // FC-08: the decoupled model has no knowledge-service dep, so it cannot (and never does) delete a source object.
    // The source ref is a no-FK `entity_id` with no cascade → a link to a source that does not exist (here `def-1`
    // was never a real knowledge_objects row) is a structurally valid DANGLING ref: it persists (never auto-removed)
    // and the card is fully intact. This is exactly the post-source-delete state, reproduced by construction.
    const cards = await h.svc.generateCards({
      sourceRef: { entityType: 'knowledge_object', entityId: 'def-1' },
      items: [
        { front: 'term1', back: 'def1', card_type: 'basic' },
        { front: 'term2', back: 'def2', card_type: 'basic' },
      ],
    })
    expect(cards).toHaveLength(2)
    const links = await h.svc.listCardLinks(cards[0]!.id)
    const dangling = links.find((l) => l.entity_id === 'def-1')
    expect(dangling).toBeDefined() // the dangling source link persists (no cascade)
    expect(dangling!.deleted_at).toBeNull() // never auto-removed
    expect(await h.svc.getCard(cards[0]!.id)).not.toBeNull() // the card is unaffected
  })

  // --- co-transactional sync_queue enqueue ----------------------------------
  it('createCard co-transactionally enqueues a sync_queue row (ADR-004 §3.4)', async () => {
    const card = await h.svc.createCard(basic)
    const q = await h.db.select().from(syncQueue).where(eq(syncQueue.row_id, card.id)).all()
    expect(q.length).toBeGreaterThanOrEqual(1)
  })
})
