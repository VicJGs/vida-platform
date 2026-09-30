// ============================================================================
// services/flashcards — types (mod-knowledge #50 ① · S7 Flashcards sub-service)
//
// The ADR-005 reference implementation of a study-method service: a thin content + interaction
// plugin riding Knowledge's generic review engine. Flashcards owns ONLY the card content entity;
// scheduling / curves / review-log / mastery / grouping are the generic engine's (FC-1, never here).
// Factory-object shape, hoisted closures, no `this.` (the ② destructure-consumption shape).
//
// Card→engine model (PLAN-s7 headline #1, gate-confirmed): a card REVIEWS a `knowledge_object`; the
// binding/schedule lives on that object (METHOD_BINDING_TARGET_TYPE has no card level). The reviewed
// object id is supplied EXPLICITLY per card (a card has many entity_links; reverse-resolution is
// ambiguous). recordReview keys the event to the object → feeds object mastery (KN-10). Emit-only (FC-6).
// ============================================================================

import type { z } from 'zod'
import type { Flashcard, ReviewEvent } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import type { ReviewEngine } from '../../foundation/review'
import type { SpacesService } from '../../foundation/spaces'
import type { BacklinkResolver } from '../search/backlink-resolver'
import type { SessionsService, Session } from '../sessions'
import type { SessionRegistry } from '../../foundation/sessions'
import type { EntityTagRow, EntityLinkRow } from '../../db/schema/foundation/spaces'
import type { CreateCardSchema, UpdateCardSchema, GenerateCardsSchema } from '../../validators/knowledge'

/** FC-02 — the study-method capability id flashcards registers (`kind='study_method'`). */
export const FLASHCARDS_METHOD_ID = 'flashcards'
/** FC-03 — the Session sub-type flashcards registers + runs a drill as (ADR-004). A shipped
 *  `SESSION_SUB_TYPE` member, but NOT in the shipped registry roster → must be registered (SS-5). */
export const REVIEW_SESSION_SUB_TYPE = 'review'
/** The `entity_type` a card registers as in the shared tag/link registries (SP1/SP2, pre-seeded
 *  in `_registry.ts`). Consumed by FC-11 (tag/link) + FC-04 (source provenance). */
export const FLASHCARD_ENTITY_TYPE = 'flashcard'

export interface FlashcardsServiceDeps {
  db: DrizzleDb
  deviceId: string
  /** ADR-005 — the generic review engine (recordReview / dueIn / listBindings / registerMethod). Required. */
  review: ReviewEngine
  /** AR-6 — entity-link/tag WRITES (FC-04 source link, FC-11 tag/link). Required. */
  spaces: SpacesService
  /** AR-8 — entity-link READS (FC-11 listCardLinks). Required. */
  backlinks: BacklinkResolver
  /** ADR-004 — the review-session run surface (FC-03 create/complete/attach). Required. */
  sessions: SessionsService
  /** AR-5 — the session-type registry (FC-03 registers the `review` sub-type, SS-5). Required. */
  sessionRegistry: SessionRegistry
}

/** A polymorphic link target (FC-11) — entityType validated fail-loud by `spaces`. Local (the S2 precedent). */
export interface FlashcardEntityRef {
  entityType: string
  entityId: string
}

/** FC-03 — one review outcome. `objectId` = the reviewed `knowledge_object` (explicit per card, headline #1);
 *  `quality` = the 0–5 signal (nullable — a non-graded emit). `cardId` is carried for error context (ReviewEmitFailed). */
export interface ReviewOutcome {
  cardId: string
  objectId: string
  quality?: number | null
}

/** FC-07/09 — a due-queue ref: the card + its reviewed object (explicit; the object carries the binding). */
export interface DueCardRef {
  cardId: string
  objectId: string
}

/** listCards filter (FC-12) — browse/manage by type + suspended flag. */
export interface CardFilter {
  cardType?: Flashcard['card_type']
  isSuspended?: boolean
}

// --- Zod-inferred input shapes ----------------------------------------------
export type CreateCardInput = z.infer<typeof CreateCardSchema>
export type UpdateCardInput = z.infer<typeof UpdateCardSchema>
export type GenerateCardsInput = z.infer<typeof GenerateCardsSchema>

// --- typed errors (FC contract error cases) ---------------------------------

/** FC-05 — `card_type` outside CARD_TYPE (author-time, before the DB CHECK). */
export class InvalidCardType extends Error {
  constructor(public readonly cardType: string) {
    super(`Invalid card type: ${cardType}`)
    this.name = 'InvalidCardType'
  }
}

/** FC-05 — a `cloze` card whose `front` carries no cloze deletion mask (`{{…}}`). */
export class MalformedCloze extends Error {
  constructor(public readonly cardId?: string) {
    super(`Cloze card front carries no cloze deletion mask ({{…}})`)
    this.name = 'MalformedCloze'
  }
}

// FC-07 CardNotBound is a CONDITION, not a thrown error — `contract.md:36` "(FC-2, not an error state)":
// a card whose reviewed object has no `method_binding` is deliberately EXCLUDED from the due-queue (still
// visible in browse/manage), never a thrown error. Enforced as an exclusion in `dueCards`, no Error class.

/** FC-10 — a `review_event` emit failed; surfaced (never silently dropped; mastery depends on it). */
export class ReviewEmitFailed extends Error {
  constructor(
    public readonly cardId: string,
    public readonly cause?: unknown,
  ) {
    super(`Review event emit failed for card: ${cardId}`)
    this.name = 'ReviewEmitFailed'
  }
}

/** FC-04 — a gather source could not be read (partial results surfaced, never a silent no-op). */
export class GenerateSourceUnreadable extends Error {
  constructor(public readonly source: string) {
    super(`Generate source unreadable: ${source}`)
    this.name = 'GenerateSourceUnreadable'
  }
}

/** FC-01 — a `flashcards` row id did not resolve. */
export class FlashcardNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Flashcard not found: ${id}`)
    this.name = 'FlashcardNotFoundError'
  }
}

export interface FlashcardsService {
  /** FC-02 — call-once wiring: register the `flashcards` study_method capability (roles retention+gathering in
   *  `config_schema`) + the `review` Session sub-type (empty effect envelope — XP/Journal deferred). Guards both
   *  `DuplicateCapabilityId` (capability registry) + `DuplicateSubType` (session registry). */
  registerFlashcards(): Promise<void>

  // ── FC-01/05/12: card content ──────────────────────────────────────
  /** FC-01/05 — create a card; validates `card_type` (InvalidCardType) + cloze mask (MalformedCloze); `media`
   *  json boundary. `mastery`/schedule are NEVER on the card (FC-6). */
  createCard(input: CreateCardInput): Promise<Flashcard>
  updateCard(id: string, patch: UpdateCardInput): Promise<Flashcard>
  getCard(id: string): Promise<Flashcard | null>
  listCards(filter?: CardFilter): Promise<Flashcard[]>
  deleteCard(id: string): Promise<void>

  // ── FC-11: universal citizen (tags + links) ────────────────────────
  /** FC-11 — tag a card via the shared entity_tags primitive (entity_type='flashcard'); guards the tag resolves. */
  tagCard(cardId: string, tagId: string): Promise<EntityTagRow>
  /** FC-11 — link a card to any registered entity (incl. the reviewed knowledge_object) via entity_links. */
  linkCard(cardId: string, targetRef: FlashcardEntityRef, context?: string | null): Promise<EntityLinkRow>
  /** FC-11 — a card's outbound links (raw row; the NotesService raw-reader pattern). */
  listCardLinks(cardId: string): Promise<EntityLinkRow[]>

  // ── FC-04/08: gather ───────────────────────────────────────────────
  /** FC-04 — create cards from caller-supplied content + keep the source as an entity_links provenance ref
   *  (FC-8: a later source delete leaves the link dangling, no-op loud). Decoupled (headline #5). */
  generateCards(input: GenerateCardsInput): Promise<Flashcard[]>

  // ── FC-03/06: run (a review Session) ───────────────────────────────
  /** FC-03 — start a `review` Session over the given cards (attaches each as an instance target). */
  startReview(cardIds: string[]): Promise<Session>
  /** FC-03/06 — emit one `review_event` per card (direct recordReview keyed to the explicit reviewed `objectId`),
   *  then complete the session. Emit-only; a failed emit throws `ReviewEmitFailed`. */
  completeReview(sessionId: string, outcomes: ReviewOutcome[]): Promise<ReviewEvent[]>

  // ── FC-07/09: due-queue (reads Knowledge's provider) ───────────────
  /** FC-07/09 — the due cards among `items`: excludes suspended cards + cards whose object has no binding
   *  (CardNotBound); includes those whose object is due (`review.dueIn`). Flashcards owns no scheduler (FC-9). */
  dueCards(items: DueCardRef[], at?: number): Promise<Flashcard[]>
}
