// ============================================================================
// services/flashcards — the service (mod-knowledge #50 ① · S7)
//
// The ADR-005 reference study-method service: a thin content + interaction plugin over Knowledge's
// generic review engine. Owns ONLY the card content entity; scheduling/curves/review-log/mastery/
// grouping are the generic engine's (FC-1). Emit-only (FC-6): never writes mastery/schedule.
// Factory-object, hoisted closures, no `this.` (the ② destructure shape; the knowledge/habits precedent).
//
// Card→engine model (headline #1): a card REVIEWS a `knowledge_object`; the reviewed object id is supplied
// EXPLICITLY per card (a card has many entity_links → reverse-resolution is ambiguous). recordReview keys
// the event to the object (feeds object mastery, KN-10). `media` = json<string[]>() → serialize/parse at the
// boundary (the key_concepts precedent; the M1.0 repo does not auto-serialize non-encrypted values).
// ============================================================================

import { and, eq, isNull, type SQL } from 'drizzle-orm'
import type { Flashcard, ReviewEvent } from '@vida/types'
import { CARD_TYPE, METHOD_BINDING_TARGET_TYPE } from '@vida/types'
import { createRepository, type CreateInput, type UpdateInput } from '../../db/repository'
import { flashcards, type FlashcardRow } from '../../db/schema/knowledge'
import { tags, type EntityTagRow, type EntityLinkRow } from '../../db/schema/foundation/spaces'
import { TagNotFound } from '../../foundation/spaces'
import { DuplicateCapabilityId } from '../../foundation/capability'
import { DuplicateSubType, type SessionTypeDef } from '../../foundation/sessions'
import type { Session } from '../sessions'
import {
  CreateCardSchema,
  UpdateCardSchema,
  GenerateCardsSchema,
} from '../../validators/knowledge'
import {
  FLASHCARDS_METHOD_ID,
  REVIEW_SESSION_SUB_TYPE,
  FLASHCARD_ENTITY_TYPE,
  InvalidCardType,
  MalformedCloze,
  ReviewEmitFailed,
  FlashcardNotFoundError,
  type FlashcardsService,
  type FlashcardsServiceDeps,
  type CreateCardInput,
  type UpdateCardInput,
  type GenerateCardsInput,
  type FlashcardEntityRef,
  type ReviewOutcome,
  type DueCardRef,
  type CardFilter,
} from './types'

/** Defensive JSON read (the knowledge/habits boundary): degrade malformed JSON to null, never throw. */
function parseJsonArray<T>(value: string | null): T[] | null {
  if (value == null) return null
  try {
    return JSON.parse(value) as T[]
  } catch {
    return null
  }
}

/** A cloze card's `front` must carry ≥1 deletion mask `{{…}}` (FC-5; the mask convention is build-phase, PLAN-s7). */
const CLOZE_MASK = /\{\{.+?\}\}/

const toFlashcard = (r: FlashcardRow): Flashcard => ({
  ...r,
  // media is a json<string[]>() TEXT column (a $type lie): parse on read (the key_concepts precedent).
  media: parseJsonArray<string>(r.media as unknown as string | null),
  _sync_status: r._sync_status as Flashcard['_sync_status'],
})

/** FC-03 — the `review` Session sub-type flashcards registers. EMPTY effect envelope (headline #2): declared
 *  effects[] ⊆ allowed_effects ⊆ the shipped ceiling {attach_pomodoro, log_time}, so `[]` is envelope-legal;
 *  XP/Journal-on-drill is a deferred foundation-envelope seam. Minimal lifecycle mirrors `focus`. */
const REVIEW_SESSION_TYPE_DEF: SessionTypeDef = {
  sub_type: REVIEW_SESSION_SUB_TYPE,
  owner_module: 'flashcards',
  attachment_defaults: {},
  effects: [],
  lifecycle: {
    transitions: [
      { from: 'scheduled', to: 'in_progress', event: 'start' },
      { from: 'in_progress', to: 'completed', event: 'complete' },
    ],
  },
  permissions: { allowed_effects: [] },
  default_purpose: 'review',
}

export function createFlashcardsService(deps: FlashcardsServiceDeps): FlashcardsService {
  const { db, deviceId, review, spaces, backlinks, sessions, sessionRegistry } = deps

  const cardsRepo = createRepository(db, flashcards, { deviceId, softDelete: true, encryptedFields: [] })
  const tagsRepo = createRepository(db, tags, { deviceId, softDelete: true, encryptedFields: [] })

  // --- validation helpers (FC-05) -------------------------------------------
  function assertCardType(cardType: string): void {
    if (!(CARD_TYPE as readonly string[]).includes(cardType)) throw new InvalidCardType(cardType)
  }
  function assertClozeMask(cardType: string, front: string): void {
    if (cardType === 'cloze' && !CLOZE_MASK.test(front)) throw new MalformedCloze()
  }

  async function assertCardExists(id: string): Promise<FlashcardRow> {
    const row = await cardsRepo.findById(id)
    if (row == null) throw new FlashcardNotFoundError(id)
    return row
  }

  // --- FC-02: registration (call-once, idempotent-safe) ---------------------
  async function registerFlashcards(): Promise<void> {
    // (a) the study_method capability — roles ride config_schema (headline #3); empty envelope built by the engine.
    try {
      await review.registerMethod({
        id: FLASHCARDS_METHOD_ID,
        config_schema: { roles: ['retention', 'gathering'] },
      })
    } catch (err) {
      if (!(err instanceof DuplicateCapabilityId)) throw err // already registered → no-op (call-once)
    }
    // (b) the `review` Session sub-type — two registries, two dup errors (BR-S7-4).
    try {
      await sessionRegistry.register(REVIEW_SESSION_TYPE_DEF)
    } catch (err) {
      if (!(err instanceof DuplicateSubType)) throw err
    }
  }

  // --- FC-01/05/12: card content --------------------------------------------
  async function createCard(input: CreateCardInput): Promise<Flashcard> {
    const v = CreateCardSchema.parse(input)
    assertCardType(v.card_type) // FC-5 (before the DB CHECK)
    assertClozeMask(v.card_type, v.front)
    const row = await cardsRepo.create({
      front: v.front,
      back: v.back,
      hint: v.hint ?? null,
      explanation: v.explanation ?? null,
      card_type: v.card_type as Flashcard['card_type'], // validated ∈ CARD_TYPE above
      // json<string[]> write boundary (see file header): stringify + one cast, here only.
      media: (v.media != null ? JSON.stringify(v.media) : null) as unknown as string[] | null,
      is_suspended: v.is_suspended ?? false, // notNull default — backfill (create echoes input)
      sort_order: v.sort_order ?? 0, // notNull default — backfill
      deleted_at: null, // faithful echo (a new row is not deleted)
    } satisfies CreateInput<typeof flashcards>)
    return toFlashcard(row)
  }

  async function updateCard(id: string, patch: UpdateCardInput): Promise<Flashcard> {
    const v = UpdateCardSchema.parse(patch)
    const existing = await assertCardExists(id)
    if (v.card_type !== undefined) assertCardType(v.card_type)
    // Re-validate the cloze mask against the effective (new-or-existing) type + front.
    const effectiveType = v.card_type ?? existing.card_type
    const effectiveFront = v.front ?? existing.front
    assertClozeMask(effectiveType, effectiveFront)
    const dbPatch: Record<string, unknown> = {}
    if (v.front !== undefined) dbPatch.front = v.front
    if (v.back !== undefined) dbPatch.back = v.back
    if (v.hint !== undefined) dbPatch.hint = v.hint
    if (v.explanation !== undefined) dbPatch.explanation = v.explanation
    if (v.card_type !== undefined) dbPatch.card_type = v.card_type
    if (v.media !== undefined) dbPatch.media = v.media != null ? JSON.stringify(v.media) : null
    if (v.is_suspended !== undefined) dbPatch.is_suspended = v.is_suspended
    if (v.sort_order !== undefined) dbPatch.sort_order = v.sort_order
    await cardsRepo.update(id, dbPatch as UpdateInput<typeof flashcards>)
    const updated = await cardsRepo.findById(id) // re-read for a faithful full row (update echoes only the patch)
    return toFlashcard(updated as FlashcardRow)
  }

  async function getCard(id: string): Promise<Flashcard | null> {
    const row = await cardsRepo.findById(id)
    return row ? toFlashcard(row) : null
  }

  async function listCards(filter: CardFilter = {}): Promise<Flashcard[]> {
    const clauses: SQL[] = [isNull(flashcards.deleted_at)] // findWhere skips the soft-delete filter
    if (filter.cardType !== undefined) clauses.push(eq(flashcards.card_type, filter.cardType))
    if (filter.isSuspended !== undefined) clauses.push(eq(flashcards.is_suspended, filter.isSuspended))
    const rows = await cardsRepo.findWhere(clauses.length === 1 ? clauses[0]! : and(...clauses)!)
    return rows.map(toFlashcard)
  }

  async function deleteCard(id: string): Promise<void> {
    await assertCardExists(id)
    await cardsRepo.delete(id) // soft delete
  }

  // --- FC-11: universal citizen (tags + links) ------------------------------
  async function tagCard(cardId: string, tagId: string): Promise<EntityTagRow> {
    await assertCardExists(cardId)
    // Create-path silent-orphan guard (the S2 precedent): spaces.tagEntity blind-inserts the tag_id, so verify
    // the tag resolves to a LIVE tags row first ([[spaces-junctions-split-read-write-tagentity-blind-inserts]]).
    if ((await tagsRepo.findById(tagId)) == null) throw new TagNotFound(tagId)
    return spaces.tagEntity(tagId, FLASHCARD_ENTITY_TYPE, cardId)
  }

  async function linkCard(
    cardId: string,
    targetRef: FlashcardEntityRef,
    context?: string | null,
  ): Promise<EntityLinkRow> {
    await assertCardExists(cardId)
    // Source anchor = the card id in page_id (plain TEXT, no FK). spaces validates targetRef.entityType (fail-loud
    // UnknownEntityType) + is idempotent. This is how a card records its reviewed knowledge_object (headline #1).
    return spaces.createLink(cardId, targetRef.entityType, targetRef.entityId, context ?? null)
  }

  async function listCardLinks(cardId: string): Promise<EntityLinkRow[]> {
    return backlinks.getLinksFrom(cardId) // raw reader (NotesService precedent); already soft-delete filtered
  }

  // --- FC-04/08: gather -----------------------------------------------------
  async function generateCards(input: GenerateCardsInput): Promise<Flashcard[]> {
    const v = GenerateCardsSchema.parse(input)
    const created: Flashcard[] = []
    for (const item of v.items) {
      const card = await createCard(item) // validates each (InvalidCardType/MalformedCloze) — fail-fast, no silent drop
      // FC-7 — keep the source as an entity_links provenance ref (card = the source anchor). FC-8: a later source
      // delete leaves this link dangling (no-op loud — spaces never resurrects, never errors the card).
      await spaces.createLink(card.id, v.sourceRef.entityType, v.sourceRef.entityId, 'generated-from')
      created.push(card)
    }
    return created
    // NB: GenerateSourceUnreadable is the FC-04 error for the future READ-the-source variant (deferred, headline #5);
    // the decoupled M1 build takes caller-supplied content, so there is no source read to fail here.
  }

  // --- FC-03/06: run (a review Session) --------------------------------------
  async function startReview(cardIds: string[]): Promise<Session> {
    const session = await sessions.createSession({
      sub_type: REVIEW_SESSION_SUB_TYPE,
      scheduling_mode: 'ad_hoc',
      status: 'in_progress',
    })
    // ADR-004 — the run's targets are the cards (entity_type='flashcard', instance level).
    for (const cardId of cardIds) {
      await sessions.attach(session.session.id, FLASHCARD_ENTITY_TYPE, cardId, 'instance')
    }
    return session
  }

  async function completeReview(sessionId: string, outcomes: ReviewOutcome[]): Promise<ReviewEvent[]> {
    const events: ReviewEvent[] = []
    for (const o of outcomes) {
      try {
        // FC-6 emit-only: one review_event per card, keyed to the EXPLICIT reviewed object (headline #1). Direct
        // engine write (NOT a session EffectType); co-transactionally enqueues sync_queue.
        const ev = await review.recordReview({
          objectId: o.objectId,
          methodId: FLASHCARDS_METHOD_ID,
          quality: o.quality ?? null,
        })
        events.push(ev)
      } catch (err) {
        throw new ReviewEmitFailed(o.cardId, err) // FC-10: surfaced, never silently dropped (mastery depends on it)
      }
    }
    // A mid-loop throw leaves already-emitted events persisted (each is its own co-tx) + the session
    // in_progress (completeSession skipped) — acceptable (FC-10: surfaced, never dropped; durable retry = the
    // ADR-003/M4 seam). Retry is idempotency-safe: review_events are append-only + mastery is derive-on-read, so a
    // replayed earlier outcome is harmless.
    await sessions.completeSession(sessionId) // fires nothing in M1 (empty envelope, headline #2)
    return events
  }

  // --- FC-07/09: due-queue (reads Knowledge's provider, FC-9) ----------------
  async function dueCards(items: DueCardRef[], at?: number): Promise<Flashcard[]> {
    const due: Flashcard[] = []
    for (const { cardId, objectId } of items) {
      const card = await cardsRepo.findById(cardId)
      if (card == null || card.is_suspended) continue // missing/suspended excluded (FC-12)
      // FC-7 CardNotBound — the reviewed object must carry a method_binding. Its level is POSITIONAL (no attribute,
      // the S5 spine fact), so probe every target level; no binding on any ⇒ excluded (not scheduled until bound;
      // still visible in browse/manage — an exclusion CONDITION, not a thrown error, contract.md:36).
      let bound = false
      for (const targetType of METHOD_BINDING_TARGET_TYPE) {
        if ((await review.listBindings(targetType, objectId)).length > 0) {
          bound = true
          break
        }
      }
      if (!bound) continue
      if (await review.dueIn(objectId, at)) due.push(toFlashcard(card))
    }
    return due
  }

  return {
    registerFlashcards,
    createCard,
    updateCard,
    getCard,
    listCards,
    deleteCard,
    tagCard,
    linkCard,
    listCardLinks,
    generateCards,
    startReview,
    completeReview,
    dueCards,
  }
}
