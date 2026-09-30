// ============================================================================
// services/knowledge — types (mod-knowledge #50 ① · S1 kinds + objects + hierarchy)
//
// Deps + the KnowledgeService interface + input types + typed errors. Factory-object
// shape, hoisted closures, no `this.` (the ② destructure-consumption shape; the
// habits/finance precedent). S1 declares the kind-registry + object-hierarchy surface;
// S2–S8 append (containers/refs/links/tags · review engine · mastery · measurement ·
// pages/compound/lab · flashcards · events) per docs/modules/knowledge/delivery/decomposition.md.
// ============================================================================

import type { z } from 'zod'
import type {
  KnowledgeObject,
  ObjectKind,
  KnowledgeContainer,
  Reference,
  CompoundSet,
  KnowledgeLabEntry,
  ReviewCurve,
  MethodBinding,
  MethodBindingTargetType,
  ReviewEvent,
  StudyTopicStatus,
  TopicDifficulty,
} from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import type { SpacesService } from '../../foundation/spaces'
import type { CapabilityDefinition } from '../../foundation/capability'
import type {
  ReviewEngine,
  DefineCurveInput,
  RegisterMethodInput,
  BindMethodInput,
  RecordReviewInput,
  DueRange,
  ReviewDueItem,
} from '../../foundation/review'
import type { BacklinkResolver } from '../search/backlink-resolver'
import type { EffectRail, EffectRegistry } from '../../foundation/effects'
import type { EntityTagRow, EntityLinkRow } from '../../db/schema/foundation/spaces'
// S6 composed substrates (all shipped): notes (pages/entity-note), ai (extension-model), ingestion (auto-populate).
import type { NotesService } from '../notes'
import type { AiService, AiRequest } from '../../foundation/ai'
import type { IngestionGuard, IngestionAct, IngestionDenyReason, LeakDisclosure } from '../../foundation/ingestion'
import type { PageRow } from '../../db/schema/notes' // typeof pages.$inferSelect — NOT re-exported from the notes barrel
import type {
  CreateObjectKindSchema,
  UpdateObjectKindSchema,
  CreateKnowledgeObjectSchema,
  UpdateKnowledgeObjectSchema,
  CreateKnowledgeContainerSchema,
  AddReferenceSchema,
  CreateLabEntrySchema,
  PromoteToObjectSchema,
} from '../../validators/knowledge'

/** The `entity_type` knowledge objects register in the shared taggable/pages registries
 *  (ADR-006 SP1 / Notes `pages`). Consumed by S2 (tags/links) + S6 (pages). */
export const KNOWLEDGE_OBJECT_ENTITY_TYPE = 'knowledge_object'

export interface KnowledgeServiceDeps {
  db: DrizzleDb
  deviceId: string
  /** AR-6 — entity-link/tag + tag WRITES (S2 delegates link/tag mutations here; the read/write-split
   *  command half). Required: linking/tagging is core to S2, not a deny-safe optional (NotesService precedent). */
  spaces: SpacesService
  /** AR-8 — entity-link READS (S2 `listLinks` delegates here; the query half). */
  backlinks: BacklinkResolver
  /** ADR-005 — the generic review engine (S3 delegates methods/curves/bindings/resolveDefaultMethod here).
   *  Required: the engine is core to Knowledge and S7/flashcards needs the SAME instance (D1). */
  review: ReviewEngine
  /** S6 KNO-28 — pages/entity-note substrate (`openObjectNote`). REQUIRED: a knowledge note is a core capability
   *  over the shipped `services/notes`, not a dormant seam (headline #2; the spaces/backlinks/review required-dep
   *  precedent — mid-build required deps are wired in the test setup, no app consumes the service in M1). */
  notes: NotesService
  /** S6 KNO-33 — AI extension-model (`assistCompoundSet`). OPTIONAL/deny-safe: opt-in, M1-dormant (askModel throws
   *  AiDenied → mapped to `ai-unavailable`); absent ⇒ `ai-unavailable` (the habits/gamification optional-port precedent). */
  ai?: AiService
  /** S6 KNO-43 — ingestion guard (`autoPopulate`). OPTIONAL/deny-safe: opt-in device-side; absent ⇒ `ingestion-unavailable`. */
  ingestion?: IngestionGuard
  /** S8 KNO-38/39/40 — the effect rail + registry (the domain-event PUSH fan-out; the registry gates the guarded
   *  emit — a non-projection effect with no handler would throw `NoEffectHandler`; the rail is the exactly-once
   *  dispatch). OPTIONAL: injected by the consuming modules (measurement/gamification) at M1.2; dormant without a
   *  registered handler (BR-KN-S8-2). Mirrors the checkins/habits effects port; the SHAPE is inlined (not a named
   *  `EffectsPort`) because `checkins` already exports that symbol and this barrel is `export *` — re-exporting a
   *  second `EffectsPort` collides at the core index (the habits "EffectsPort not re-exported" precedent). */
  effects?: { rail: EffectRail; registry: EffectRegistry }
}

/** S2 — a polymorphic link/tag target or member (entityType is validated fail-loud by `spaces`). Local by
 *  design (F3): NOT the `foundation/spaces` `TaggableRef`, whose only export path is the association-resolver
 *  barrel this slice deliberately does not compose — keeps the dep surface `{SpacesService, BacklinkResolver}`. */
export interface KnowledgeEntityRef {
  entityType: string
  entityId: string
}

// --- Zod-inferred input shapes (validators/knowledge.ts) --------------------
export type CreateObjectKindInput = z.infer<typeof CreateObjectKindSchema>
export type UpdateObjectKindInput = z.infer<typeof UpdateObjectKindSchema>
export type CreateKnowledgeObjectInput = z.infer<typeof CreateKnowledgeObjectSchema>
export type UpdateKnowledgeObjectInput = z.infer<typeof UpdateKnowledgeObjectSchema>
export type CreateKnowledgeContainerInput = z.infer<typeof CreateKnowledgeContainerSchema>
export type AddReferenceInput = z.infer<typeof AddReferenceSchema>
// S6
export type CreateLabEntryInput = z.infer<typeof CreateLabEntrySchema>
export type PromoteToObjectInput = z.infer<typeof PromoteToObjectSchema>

// --- S6 service-layer types (NOT @vida/types — the MasterySource precedent) --

/** S6 (KNO-31) — the structured compound-set spec (rules/methods/params). Opaque by design: `@vida/types`
 *  `CompoundSet.spec` is a `string` at rest (the [E] JSON blob); the builder accepts this structured shape and
 *  serializes it at the write boundary. Internals are the user's open rules, not modeled here (headline #5). */
export type CompoundSetSpec = Record<string, unknown>

/** S6 (KNO-33) — the deny-safe AI-assist outcome. `ai-unavailable` is the M1 default (no `ai` dep) OR a caught
 *  `AiDenied` (askModel throws on every deny path). `suggestion` = `AiResponse.content`. */
export type AiAssistResult =
  | { status: 'ready'; suggestion: string }
  | { status: 'ai-unavailable'; reason?: string }

/** S6 (KNO-37) — the DB-8 search seam. FTS5 `fts_knowledge` is unbuilt → a loud typed unavailable state (the
 *  platform-wide `'search-unavailable'` convention, apps/web command-bar), never a silent empty list. Extends when
 *  DB-8 lands (a `results` variant). */
export type KnowledgeSearchResult = { status: 'search-unavailable' }

/** S6 (KNO-43) — the deny-safe auto-population outcome, mapped from the ingestion guard's `IngestionDecision`.
 *  `parser-unavailable` = a PERMITTED act with no source parser built (the real M1 seam); `refused` = the guard
 *  denied (refuse-not-downgrade); `ingestion-unavailable` = no `ingestion` dep wired. */
export type AutoPopulateResult =
  | { status: 'refused'; reason: IngestionDenyReason; disclosure?: LeakDisclosure }
  | { status: 'parser-unavailable' }
  | { status: 'ingestion-unavailable' }

/** S8 (KNO-38/39) — the dated Journal digest: the day's objects-created + reviews-recorded counts. Feeds the
 *  `registerKnowledgeJournal` summary contribution (BR-KN-S8-5/6). Service-layer shape (not `@vida/types`). */
export interface KnowledgeDayDigest {
  objectsCreated: number
  reviewsRecorded: number
}

/** listContainers filter (KNO-14) — the query half; the view-regroup RENDER is P6. */
export interface ContainerFilter {
  containerType?: KnowledgeContainer['container_type']
}

/** listObjects filter (KNO-07) — narrow the catalog read by hierarchy/kind/status. Container/tag
 *  grouping is S2 (entity_tags); search is S6 (FTS5). */
export interface ObjectFilter {
  kindId?: string
  parentObjectId?: string | null
  status?: StudyTopicStatus
  difficulty?: TopicDifficulty
}

/** S5 (KNO-25) — the KN-10 cross-module mastery SOURCE Knowledge exposes to Education. The three
 *  compounded signals from `business-rules.md` KN-10:51-55 / `intake:215-221`. Service-layer shape (not
 *  `@vida/types`). In M1.0 only `objectMastery` is measurable; `assessmentResults` (KNO-27) +
 *  `paceVsSyllabus` (KNO-26) are deny-safe `null` — Education's assessments + syllabus-as-calendar entities
 *  are not built (forward deps; No-Guessing — never fabricated). `null` = unmeasured, the KNO-42 flag. */
export interface MasterySource {
  /** Signal 1 — Subject-level object mastery, rolled up the `parent_object_id` spine (KNO-24). 0–100 | null. */
  objectMastery: number | null
  /** Signal 2 (KNO-27) — assessment/self-test outcomes. `null` until Education's assessments entity exists. */
  assessmentResults: number | null
  /** Signal 3 (KNO-26) — acquiring on/ahead of schedule vs the subject's syllabus-as-calendar. `null` until
   *  Education's syllabus entity exists (never invent a schedule to measure against). */
  paceVsSyllabus: number | null
}

// --- typed errors (KNO-41) ---------------------------------------------------

/** KNO-06/05/12 — a knowledge object id did not resolve. */
export class KnowledgeObjectNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Knowledge object not found: ${id}`)
    this.name = 'KnowledgeObjectNotFoundError'
  }
}

/** KNO-08 — a `kind_id` did not resolve in the registry (integrity at write). */
export class ObjectKindNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Object kind not found: ${id}`)
    this.name = 'ObjectKindNotFoundError'
  }
}

/** KNO-08 — a `parent_object_id` did not resolve (integrity at write). */
export class InvalidParentRefError extends Error {
  constructor(public readonly id: string) {
    super(`Parent object not found: ${id}`)
    this.name = 'InvalidParentRefError'
  }
}

/** KNO-08 — setting `parent_object_id` would create a cycle (self-parent or an ancestor loop). */
export class HierarchyCycleError extends Error {
  constructor(public readonly reason: string) {
    super(`Hierarchy cycle: ${reason}`)
    this.name = 'HierarchyCycleError'
  }
}

/** KNO-13/41 — a `containerId` did not resolve (integrity at membership write). */
export class KnowledgeContainerNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Knowledge container not found: ${id}`)
    this.name = 'KnowledgeContainerNotFoundError'
  }
}

/** KNO-30/41 — a `references` row id did not resolve (distinct from the object error for catch-precision). */
export class ReferenceNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Reference not found: ${id}`)
    this.name = 'ReferenceNotFoundError'
  }
}

/** KNO-35/36/41 — a `knowledge_lab_entries` row id did not resolve. */
export class LabEntryNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Knowledge lab entry not found: ${id}`)
    this.name = 'LabEntryNotFoundError'
  }
}

/** KNO-36/41 (BR-S6-9) — promote requires a concluded entry; `conclusion` is still null. */
export class LabEntryNotConcludedError extends Error {
  constructor(public readonly id: string) {
    super(`Knowledge lab entry not concluded: ${id}`)
    this.name = 'LabEntryNotConcludedError'
  }
}

/** KNO-36/41 (BR-S6-9) — promote is one-shot; the entry already carries a `promoted_object_id`. */
export class LabEntryAlreadyPromotedError extends Error {
  constructor(public readonly id: string) {
    super(`Knowledge lab entry already promoted: ${id}`)
    this.name = 'LabEntryAlreadyPromotedError'
  }
}

export interface KnowledgeService {
  // ── S1: kind registry ────────────────────────────────────────────
  /** KNO-03 — seed topic/concept(understand)/definition(memorize) as editable/removable defaults.
   *  Idempotent: no-ops unless the registry is EMPTY (a fully-cleared registry re-seeds — defaults
   *  are removable, BR-S1-2). NOT an is_default probe. */
  seedDefaultKinds(): Promise<void>
  /** KNO-01 — create a user-extensible kind (FLAT registry, no parent_kind_id). */
  createKind(input: CreateObjectKindInput): Promise<ObjectKind>
  /** KNO-02 — read the kind registry (soft-delete filtered). */
  listKinds(): Promise<ObjectKind[]>

  // ── S1: object hierarchy CRUD ─────────────────────────────────────
  /** KNO-04 — create an object nested under a Topic via `parent_object_id`. Rejects an unresolved
   *  `kind_id` (ObjectKindNotFoundError) or `parent_object_id` (InvalidParentRefError). `mastery_level`
   *  is DERIVED (KN-9) — not settable. */
  createObject(input: CreateKnowledgeObjectInput): Promise<KnowledgeObject>
  /** KNO-05 — mutate an object; re-checks kind + a parent change (existence + cycle). `mastery_level`
   *  cannot be set (omitted from the schema, KN-9). */
  updateObject(id: string, patch: UpdateKnowledgeObjectInput): Promise<KnowledgeObject>
  /** KNO-06 — read one object. */
  getObject(id: string): Promise<KnowledgeObject | null>
  /** KNO-07 — list/query objects by kind/parent/status/difficulty (soft-delete filtered). */
  listObjects(filter?: ObjectFilter): Promise<KnowledgeObject[]>
  /** KNO-04 (CRUD) — soft-delete an object (habits soft-delete precedent). */
  deleteObject(id: string): Promise<void>

  // ── S2: containers (KNO-12/14) ────────────────────────────────────
  /** KNO-12 — create a Module/Area/Subject container. Nesting rides entity_tags, not parent_id (KN-7). */
  createContainer(input: CreateKnowledgeContainerInput): Promise<KnowledgeContainer>
  /** KNO-14 — list containers (query half; view-regroup RENDER is P6). Soft-delete filtered. */
  listContainers(filter?: ContainerFilter): Promise<KnowledgeContainer[]>
  /** Companion — soft-delete a container (guard-exists → KnowledgeContainerNotFoundError). */
  deleteContainer(id: string): Promise<void>

  // ── S2: references (KNO-29/30) ────────────────────────────────────
  /** KNO-29 — add a first-class Reference to an object (replaces resource_urls). Rejects an unresolved object. */
  addReference(objectId: string, input: AddReferenceInput): Promise<Reference>
  /** KNO-30 — list an object's live references. */
  listReferences(objectId: string): Promise<Reference[]>
  /** Companion — soft-delete a reference. */
  removeReference(id: string): Promise<void>

  // ── S2: cross-module links (KNO-10/11) ────────────────────────────
  /** KNO-10 — link an object to any registered entity via entity_links (never resource_type). Source anchor =
   *  the object id (page_id). Rejects an unresolved object; an unregistered targetRef.entityType throws
   *  UnknownEntityType (delegated to spaces). KNO-11 — call N times for many book links. */
  linkObject(objectId: string, targetRef: KnowledgeEntityRef, context?: string | null): Promise<EntityLinkRow>
  /** KNO-10 — remove a link (guard-exists on the object; spaces resolve-then-soft-delete). */
  unlinkObject(objectId: string, targetRef: KnowledgeEntityRef): Promise<void>
  /** KNO-10 — an object's outbound links (raw row; the NotesService raw-reader pattern). */
  listLinks(objectId: string): Promise<EntityLinkRow[]>

  // ── S2: tag membership (KNO-13/45) ────────────────────────────────
  /** KNO-13 — record container membership as an entity_tags row (scoped tag). Rejects an unresolved container
   *  or scopedTag (create-path silent-orphan guard, BR-S2-8b). Many-to-many (KN-7). */
  tagMembership(containerId: string, memberRef: KnowledgeEntityRef, scopedTag: string): Promise<EntityTagRow>
  /** KNO-13 — remove a membership (guard-exists on the container; scopedTag NOT guarded — remove stays cleanable). */
  untagMembership(containerId: string, memberRef: KnowledgeEntityRef, scopedTag: string): Promise<void>
  /** KNO-13/45 — list the members carrying a scoped tag (list-by-tag read; NotesService getEntitiesByTag precedent). */
  listMemberships(scopedTag: string): Promise<EntityTagRow[]>

  // ── S3: review engine ① — methods + curves + bindings (delegates to `review`) ──
  /** KNO-15 — read the `study_method` partition of the capability registry. */
  listMethods(): Promise<CapabilityDefinition[]>
  /** KNO-16 — register a `study_method` capability (empty envelope). */
  registerMethod(input: RegisterMethodInput): Promise<CapabilityDefinition>
  /** KNO-17 — read live scheduling curves. */
  listCurves(): Promise<ReviewCurve[]>
  /** KNO-18 — define a user curve (SM-2 preset seed defers to S4). */
  defineCurve(input: DefineCurveInput): Promise<ReviewCurve>
  /** Companion — soft-delete a curve (guard → ReviewCurveNotFoundError). */
  removeCurve(id: string): Promise<void>
  /** KNO-19 — bind a method(+curve) polymorphically at a spine level. */
  bindMethod(input: BindMethodInput): Promise<MethodBinding>
  /** Companion / S4 due-queue input — bindings at a target level. */
  listBindings(targetType: MethodBindingTargetType, targetId: string): Promise<MethodBinding[]>
  /** Companion — soft-delete a binding (guard → MethodBindingNotFoundError). */
  unbindMethod(id: string): Promise<void>
  /** KNO-20 — resolve a kind's default method (2-tier: `default_method_id` else null). Looks the kind up
   *  (→ ObjectKindNotFoundError on miss) then delegates to the pure engine resolver. */
  resolveDefaultMethod(kindId: string): Promise<string | null>

  // ── S4: review engine ② — record + due + derive + rollup ───────────────────
  /** KNO-22 — append a review outcome (delegates to the engine; mastery is derive-on-read). */
  recordReview(input: RecordReviewInput): Promise<ReviewEvent>
  /** KNO-21 — due-queue provider across bound targets (delegates). */
  getDue(range: DueRange, opts?: { level?: MethodBindingTargetType }): Promise<ReviewDueItem[]>
  /** KNO-21 — is a single object due as of `at` (delegates). */
  dueIn(objectId: string, at?: number): Promise<boolean>
  /** KNO-23 — leaf mastery (0–100) derived on read; null when unmeasured (delegates to the engine). */
  deriveMastery(objectId: string): Promise<number | null>
  /** KNO-24 — mastery rolled UP the `parent_object_id` spine (kind→Topic→Unit→Subject) via measurement.rollup;
   *  null when the node + subtree are all unmeasured. Guards an unresolved object. */
  rollupMastery(objectId: string): Promise<number | null>

  // ── S5: cross-module measurement source (KNO-25/26/27/42) ───────────────────
  /** KNO-25 — the KN-10 mastery SOURCE provided to Education (Education owns the Program-level rollup).
   *  `subjectRef` = the Subject-level `knowledge_object` id on the `parent_object_id` spine
   *  (`structure-data.md:28-30`) — NOT the `container_type='subject'` container. Subject-level-ness is
   *  positional (no level attribute; kinds seed topic/concept/definition), so the ref is trusted from the
   *  caller. Composes `rollupMastery` for `objectMastery`; the other two signals are deny-safe `null` (M1.0
   *  forward-dep seams). Throws `KnowledgeObjectNotFoundError` on an unresolved ref (via rollupMastery). */
  getMasterySource(subjectRef: string): Promise<MasterySource>

  // ── S6: Pages-notes (KNO-28) ──────────────────────────────────────
  /** KNO-28 — create/return the object's knowledge note: a `pages` row keyed on `entity_type='knowledge_object'`
   *  (the KN-5 distinguisher; PageType `'note'`), via `notes.ensureEntityNote` (idempotent). NEVER a `knowledge_notes`
   *  insert (retired, KN-5). Guards the object → `KnowledgeObjectNotFoundError`. */
  openObjectNote(objectId: string): Promise<PageRow>

  // ── S6: Compound sets (KNO-31/32) ─────────────────────────────────
  /** KNO-31 — build a per-consumer compound set (`is_default:false`); `spec` serialized to the opaque [E] JSON column
   *  at the write boundary (@vida/types keeps it `string` at rest). `consumer_module` OPEN. */
  buildCompoundSet(consumerModule: string, spec?: CompoundSetSpec | null, name?: string | null): Promise<CompoundSet>
  /** KNO-32 — anti-lost + idempotent (KN-11): return the consumer's existing default set, else create a default
   *  (`is_default:true`) so no user is forced to personalize. */
  applyDefaultCompoundSet(consumerModule: string): Promise<CompoundSet>
  /** KNO-31 companion — the consumer's live sets (soft-delete filtered). */
  listCompoundSets(consumerModule: string): Promise<CompoundSet[]>

  // ── S6: AI-assist (KNO-33) — extension-model, deny-safe ───────────
  /** KNO-33 — opt-in, consent-gated AI-assist for the compound-set build. Composes the optional `ai` dep against the
   *  `askModel` contract (throws `AiDenied` → mapped). Absent `ai` ⇒ `ai-unavailable`. The caller supplies the
   *  `AiRequest` (mode + consent proof); Knowledge never auto-applies a suggestion and never holds a model key. */
  assistCompoundSet(consumerModule: string, req: AiRequest): Promise<AiAssistResult>

  // ── S6: Knowledge Lab (KNO-34/35/36) ──────────────────────────────
  /** KNO-34 — start a lab entry (hypothesis + own-module `data_refs`). `data_refs` serialized at the boundary. */
  createLabEntry(input: CreateLabEntryInput): Promise<KnowledgeLabEntry>
  /** KNO-35 — set the conclusion on an entry (guards exists → `LabEntryNotFoundError`). */
  concludeLabEntry(id: string, conclusion: string): Promise<KnowledgeLabEntry>
  /** KNO-36 — promote a **concluded** (`LabEntryNotConcludedError` else), **un-promoted**
   *  (`LabEntryAlreadyPromotedError` else) entry into a catalog object (title=hypothesis, description=conclusion);
   *  stamps `promoted_object_id`. The `lab.concluded` EVENT fan-out is S8. */
  promoteToObject(entryId: string, input: PromoteToObjectInput): Promise<KnowledgeObject>
  /** KNO-34 companion — live lab entries (soft-delete filtered; `data_refs` parsed). */
  listLabEntries(): Promise<KnowledgeLabEntry[]>

  // ── S6: Search seam (KNO-37) — DB-8 deferred ──────────────────────
  /** KNO-37 — FTS5 `fts_knowledge` is unbuilt (DB-8) → `{status:'search-unavailable'}` (loud, typed, never silent). */
  searchKnowledge(query: string): Promise<KnowledgeSearchResult>

  // ── S6: Auto-population seam (KNO-43) — ingestion, deny-safe ───────
  /** KNO-43 — opt-in device-side auto-population. Maps the optional `ingestion` guard's decision: permitted ⇒
   *  `parser-unavailable` (source parsers deferred), denied ⇒ `refused` (refuse-not-downgrade), absent ⇒
   *  `ingestion-unavailable`. */
  autoPopulate(act: IngestionAct): Promise<AutoPopulateResult>

  // ── S8: Journal digest (KNO-38/39) ────────────────────────────────
  /** KNO-38/39 — the day's objects-created + reviews-recorded counts (UTC-day window of the `YYYY-MM-DD` date;
   *  the habits:79/checkins:104 date→ms convention). Feeds the `registerKnowledgeJournal` summary (BR-KN-S8-5/6). */
  getDayKnowledgeDigest(date: string): Promise<KnowledgeDayDigest>
}
