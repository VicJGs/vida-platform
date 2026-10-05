// ============================================================================
// services/learning-education — types (mod-learning-education #52 ① · the Learning hub service tier)
//
// Deps + the LearningEducationService interface + input/view types + typed errors. Factory-object shape,
// hoisted closures, no `this.` (the ② destructure-consumption shape; the books/knowledge/habits precedent).
// S1 declares the hierarchy-CRUD surface (institutions · self_taught · programs · curricula · terms) + the
// `resolveParentChain` routing primitive S2 enforces. S2–S10 APPEND (subjects+DB-11 · fork · schedule/sessions ·
// ICS · grading · assessments/GPA · measurement · vault · cross-module+Journal) per
// docs/features/learning/education/delivery/slice-map.md. Deps grow the same way — S1 needs only { db, deviceId };
// later slices add spaces/notes/sessions/sessionRegistry/journalRegistry + the optional deny-safe ports
// (ics?/attachment?/tasks?/ai?) + the dormant effects? seam.
//
// The 7 Education entity_types (subject/institution/program/curriculum/term/assessment/subject_document) are
// ALREADY registered at DB-4 #12 (db/schema/_registry.ts:100-106) — this tier composes them, never re-registers.
// ============================================================================

import type { z } from 'zod'
import type {
  Institution,
  SelfTaughtPath,
  Program,
  Curriculum,
  Term,
  Subject,
  SubjectSchedule,
  ClassSession,
  IcsFeedConfig,
  IcsSyncedEvent,
  GradingSystem,
  GradingComponent,
  GradingScope,
  GradingComponentType,
  GradingScaleType,
  Assessment,
  EducationMeasurement,
  SubjectDocument,
  MeasurementRefType,
  ProgramParentType,
  CourseStatus,
} from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import type { SessionsService, Session, TimeRange } from '../sessions'
import type { SessionRegistry } from '../../foundation/sessions'
import type { SpacesService } from '../../foundation/spaces'
import type { NotesService } from '../notes'
import type { EntityTagRow, EntityLinkRow } from '../../db/schema/foundation/spaces'
import type { PageRow } from '../../db/schema/notes'
import type {
  CreateInstitutionSchema,
  UpdateInstitutionSchema,
  CreateSelfTaughtPathSchema,
  UpdateSelfTaughtPathSchema,
  CreateProgramSchema,
  UpdateProgramSchema,
  CreateCurriculumSchema,
  UpdateCurriculumSchema,
  CreateTermSchema,
  UpdateTermSchema,
  CreateSubjectSchema,
  UpdateSubjectSchema,
  ForkCurriculumSchema,
  SetScheduleSchema,
  CreateClassSessionSchema,
  AddFeedSchema,
  MatchEventSchema,
  CreateGradingSystemSchema,
  CreateAssessmentSchema,
  RecordResultSchema,
  ListAssessmentsSchema,
  SetMeasurementSchema,
  AddDocumentSchema,
} from '../../validators/learning'

/** A raw calendar event as returned by the M2 ICS fetch boundary — the parse/normalize happens device-side
 *  (ADR-014), so the port hands the service already-shaped events. `uid` is the ICS natural key (X8 dedup). */
export interface RawIcsEvent {
  uid: string
  summary?: string | null
  description?: string | null
  location?: string | null
  start_time: number
  end_time?: number | null
  recurrence_rule?: string | null
  /** The full serialized ICS VEVENT (stored `[E]` as `raw_event`). */
  raw_event?: string | null
}

/** The deny-safe ICS fetch port (S5). The device-mediated network fetch + ICS parse is **M2** (ADR-014 X1);
 *  at M1 this port is injected ABSENT ⇒ `syncFeed` throws `IcsUnavailableError`. A PRESENT port that throws
 *  during fetch ⇒ the feed's `last_error` is written then `IcsSyncError` is thrown (never silent-stale).
 *  `[seam-contract.md ICS; interpretation.md:52-54]` */
export interface IcsFetchPort {
  fetchFeed(url: string): Promise<RawIcsEvent[]>
}

/** The outcome of a `syncFeed` run (S5). `added` = net-new events inserted; `skipped` = already-present by the
 *  UNIQUE(feed_id,uid) natural key (add-only dedup, X8). */
export interface SyncResult {
  added: number
  skipped: number
}

export interface LearningEducationServiceDeps {
  db: DrizzleDb
  deviceId: string
  /** AR-5 SessionsService (BUILT, injected) — `createSession('class')` + `attach` + `getSession` (S4). */
  sessions: SessionsService
  /** AR-5 SessionRegistry (BUILT, injected) — `registerLearningEducation` registers the `class` sub-type (S4). */
  sessionRegistry: SessionRegistry
  /** Deny-safe ICS fetch port (S5) — ABSENT at M1 (live fetch = M2, ADR-014 X1). `syncFeed` throws
   *  `IcsUnavailableError` when unset. The configs/events schema + add-only dedup are fully M1. */
  ics?: IcsFetchPort
  /** SpacesService (BUILT, injected) — the entity_tags/entity_links WRITE surface (S9). REQUIRED: tagging/linking
   *  is core to S9, not deny-safe optional (the knowledge S2 "spaces required" precedent). */
  spaces: SpacesService
  /** NotesService (BUILT, injected) — `getPagesForEntity` for the vault's notes (S9). REQUIRED (the vault reads
   *  notes + documents together, LEA-44). */
  notes: NotesService
  /** Deny-safe attachment/R2 upload port (S9) — ABSENT at M1 (the real R2 pipeline = M2, ADR-003). When absent a
   *  `file` is stored INLINE (`encrypted_blob`, local-first ED-16); a PRESENT port that rejects ⇒ `DocumentFileError`
   *  (the business-rules.md:89 "decrypt/R2 error → typed" state). */
  attachment?: EducationAttachmentPort
  // S10 append: journalRegistry, tasks?, ai?, effects?
}

/** Raw file bytes handed to the vault (S9). NOT a validated value (the books `FileBlob` precedent — bytes, not a
 *  value); `mimeType`/`filename` are optional and NOT persisted (the `subject_documents` row has no mime column).
 *  Named `EducationFileBlob` (not `FileBlob`) to avoid the flat `@vida/core` barrel collision with the books
 *  `FileBlob` — the `HabitDateRange` rename-on-collision precedent. */
export interface EducationFileBlob {
  bytes: Uint8Array
  mimeType?: string
  filename?: string
}

/** The deny-safe R2 upload seam (S9, subject-keyed). A present port uploads the encrypted file + returns its stable
 *  R2 ref; a rejection is a real R2/encrypt error ⇒ fail-loud `DocumentFileError`. Absent ⇒ inline fallback (no
 *  throw). Only `upload` is needed in S9 (Education has no Reader/download slice). M2 provides the real pipeline
 *  (zero-signature swap). Subject-keyed `upload` ≠ the books book-keyed one, so NOT reused — named
 *  `EducationAttachmentPort` to avoid the flat-barrel collision. `[seam-contract.md:23; books/types.ts:121]` */
export interface EducationAttachmentPort {
  upload(input: { file: EducationFileBlob; subjectId: string }): Promise<{ fileRef: string }>
}

/** An Education-scoped entity reference for tagging/linking (S9). `entityType` must be a registered taggable type
 *  (SpacesService backstops via `assertRegistered`). */
export interface EducationEntityRef {
  entityType: string
  entityId: string
}

/** The per-subject vault read (S9, LEA-44) — documents + notes together. `documents` are the service's own mapped
 *  entity; `notes` are foreign `pages` rows passed through raw (the NotesService convention). */
export interface VaultView {
  documents: SubjectDocument[]
  notes: PageRow[]
}

/** `addDocument` input (S9) — validated metadata (`AddDocumentSchema`) + the raw `file` (split off before parse).
 *  `file` and `storage_ref` are mutually exclusive (enforced in the service). */
export type AddDocumentInput = z.input<typeof AddDocumentSchema> & { file?: EducationFileBlob }

// Re-export the reused sessions `TimeRange` so S4 consumers (getWeeklySchedule) import it from this barrel.
export type { TimeRange } from '../sessions'

// --- input types (derived from the Zod schemas) ------------------------------
export type CreateInstitutionInput = z.input<typeof CreateInstitutionSchema>
export type UpdateInstitutionInput = z.input<typeof UpdateInstitutionSchema>
export type CreateSelfTaughtPathInput = z.input<typeof CreateSelfTaughtPathSchema>
export type UpdateSelfTaughtPathInput = z.input<typeof UpdateSelfTaughtPathSchema>
export type CreateProgramInput = z.input<typeof CreateProgramSchema>
export type UpdateProgramInput = z.input<typeof UpdateProgramSchema>
export type CreateCurriculumInput = z.input<typeof CreateCurriculumSchema>
export type UpdateCurriculumInput = z.input<typeof UpdateCurriculumSchema>
export type CreateTermInput = z.input<typeof CreateTermSchema>
export type UpdateTermInput = z.input<typeof UpdateTermSchema>
export type CreateSubjectInput = z.input<typeof CreateSubjectSchema>
export type UpdateSubjectInput = z.input<typeof UpdateSubjectSchema>
/** Fork options (S3). `name` overrides the copy's name; omitted ⇒ the source curriculum's name. */
export type ForkCurriculumInput = z.input<typeof ForkCurriculumSchema>
/** Schedule source selection (S4). One schedule per subject (UNIQUE). */
export type SetScheduleInput = z.input<typeof SetScheduleSchema>
/** Class-meeting creation (S4). `started_at` = the meeting time (required, B1); status/mode default in the service. */
export type CreateClassSessionInput = z.input<typeof CreateClassSessionSchema>
/** Add an ICS feed config (S5). `url` free-form `[E]`; `is_active`/`auto_create_sessions` default at the DB. */
export type AddFeedInput = z.input<typeof AddFeedSchema>
/** Match a synced event to a subject (S5). */
export type MatchEventInput = z.input<typeof MatchEventSchema>
/** Create a grading system + its weighted components in one call (S6). `scale_config` is an object, serialized `[E]`. */
export type CreateGradingSystemInput = z.input<typeof CreateGradingSystemSchema>
/** Create a subject-attached assessment (S7). `source` optional → service backfills 'manual'. */
export type CreateAssessmentInput = z.input<typeof CreateAssessmentSchema>
/** Record the raw result on an assessment (S7) — the grade derives, nothing stored. */
export type RecordResultInput = z.input<typeof RecordResultSchema>
/** Filter `listAssessments` (S7) — all optional; an empty filter lists every live assessment. */
export type ListAssessmentsFilter = z.input<typeof ListAssessmentsSchema>
/** Configure the Education-forged measure for a subject/program (S8). `measurement_kind` required; `binding_mode` omittable ⇒ derive. */
export type SetMeasurementInput = z.input<typeof SetMeasurementSchema>

/** A class meeting = the base `sessions` row (lifecycle/timing) + the `class_sessions` 1:1 extension (S4).
 *  Mirrors the books `ReadingSessionView {session, reading}` shape. */
export interface ClassSessionView {
  session: Session
  classSession: ClassSession
}

/** A grading system's scope (S6, ED-7) — the institution/program/subject it belongs to (no FK; a `subject` scope
 *  OVERRIDES the broader one, resolved by the consumer not stored). */
export interface GradingScopeRef {
  type: GradingScope
  id: string
}

/** A grading system + its weighted components (S6). The composite shape `createGradingSystem` returns and
 *  `getGradingSystem` reads — enriches the seam's `→ GradingSystem` (the `ClassSessionView` precedent). */
export interface GradingSystemView {
  system: GradingSystem
  components: GradingComponent[]
}

// --- S7 grade/GPA compute results (the ② seam surface — PLAN §3b) ------------
/** A reason a computed grade is partial/qualified (BR-LE-S7-4). Compute never throws on missing data — it flags
 *  (business-rules.md:92 "a flagged partial, never a wrong number"). */
export type GradeFlag =
  | 'no-system' // no grading system resolves (subject→program→institution all empty)
  | 'ambiguous-system' // >1 live system at the chosen scope; most-recent picked (BR-LE-S7-3)
  | 'incomplete' // ≥1 component has no scored assessment (excluded from the rollup)
  | 'unmapped-assessments' // ≥1 assessment has a null OR foreign grading_component_id (excluded, B3)
  | 'missing-scale' // ≥1 scored assessment has no max_points anywhere (can't normalize)

/** The derived grade for a subject (S7). `grade` is normalized [0,1]; the scale-label mapping (A–F/0–10) is the
 *  display tier's (②/M-later, BR-LE-S7-6) — this carries `scaleType` + parsed `scaleConfig` for it. */
export interface GradeResult {
  subjectId: string
  grade: number | null
  scaleType: GradingScaleType | null
  scaleConfig: Record<string, unknown> | null
  systemId: string | null
  systemScope: GradingScope | null
  components: {
    componentId: string
    componentType: GradingComponentType
    weight: number | null
    progress: number | null
    assessmentCount: number
  }[]
  flags: GradeFlag[]
}

/** What a GPA rolls up over (S7) — a term or a whole curriculum's subjects. */
export interface GpaRef {
  type: 'term' | 'curriculum'
  id: string
}

/** What an Education measure/progress attaches to (S8) — a subject or a program (ED-10; MEASUREMENT_REF_TYPE). */
export interface MeasurementRef {
  type: MeasurementRefType
  id: string
}

/** The derived GPA across a term/curriculum (S7) — equal-weight rollup of per-subject grades; `flagged` whenever
 *  any subject is missing/partial. Never a fabricated number (business-rules.md:92). */
export interface GpaResult {
  ref: GpaRef
  gpa: number | null
  flagged: boolean
  perSubject: { subjectId: string; grade: number | null; flags: GradeFlag[] }[]
}

/** Filter for `listSubjects` (ED-3 routing). All optional — an empty filter lists every live subject. */
export interface SubjectFilter {
  curriculumId?: string
  termId?: string
  status?: CourseStatus
}

/** How a program names its parent (ED-2) — an institution OR a self_taught row. */
export interface ParentRef {
  type: ProgramParentType
  id: string
}

/** The result of resolving a routing chain (ED-3). `ok` = every GIVEN ref resolved to a live row.
 *  S2's `createSubject` uses this to decide `UnroutedSubjectError`; S1 only resolves + reports. */
export interface ParentChainResolution {
  ok: boolean
  curriculum: Curriculum | null
  term: Term | null
  /** The program at the top of the resolved chain (via curriculum), when resolvable. */
  program: Program | null
}

export interface LearningEducationService {
  // --- institutions (ED-2) ---
  createInstitution(input: CreateInstitutionInput): Promise<Institution>
  updateInstitution(id: string, input: UpdateInstitutionInput): Promise<Institution>
  deleteInstitution(id: string): Promise<void>
  getInstitution(id: string): Promise<Institution | null>
  listInstitutions(): Promise<Institution[]>

  // --- self-taught paths (ED-2/H2) ---
  createSelfTaughtPath(input: CreateSelfTaughtPathInput): Promise<SelfTaughtPath>
  updateSelfTaughtPath(id: string, input: UpdateSelfTaughtPathInput): Promise<SelfTaughtPath>
  deleteSelfTaughtPath(id: string): Promise<void>
  getSelfTaughtPath(id: string): Promise<SelfTaughtPath | null>
  listSelfTaughtPaths(): Promise<SelfTaughtPath[]>

  // --- programs (ED-2) — parent must resolve (fail-loud, the BookNotFound precedent) ---
  createProgram(parent: ParentRef, input: Omit<CreateProgramInput, 'parent_type' | 'parent_id'>): Promise<Program>
  updateProgram(id: string, input: UpdateProgramInput): Promise<Program>
  deleteProgram(id: string): Promise<void>
  getProgram(id: string): Promise<Program | null>
  listProgramsFor(parent: ParentRef): Promise<Program[]>

  // --- curricula (ED-11) — CRUD (S1) + fork (S3) ---
  createCurriculum(programId: string, input: Omit<CreateCurriculumInput, 'program_id'>): Promise<Curriculum>
  updateCurriculum(id: string, input: UpdateCurriculumInput): Promise<Curriculum>
  deleteCurriculum(id: string): Promise<void>
  getCurriculum(id: string): Promise<Curriculum | null>
  listCurriculaFor(programId: string): Promise<Curriculum[]>
  /** S3 — deep-copy a curriculum's live terms + subjects into a new tree with a `forked_from_id` lineage
   *  pointer; the copy is a working instance (`is_template=false`, BR-LE-S3-3). The source is never mutated
   *  (BR-LE-S3-2). Throws `CurriculumNotFoundError` if the source is missing/soft-deleted. */
  forkCurriculum(sourceId: string, input?: ForkCurriculumInput): Promise<Curriculum>

  // --- terms (ED-12) — hierarchical (year ⊃ semester ⊃ term) ---
  createTerm(curriculumId: string, input: Omit<CreateTermInput, 'curriculum_id'>): Promise<Term>
  updateTerm(id: string, input: UpdateTermInput): Promise<Term>
  deleteTerm(id: string): Promise<void>
  getTerm(id: string): Promise<Term | null>
  listTermsFor(curriculumId: string): Promise<Term[]>

  // --- subjects (ED-3) — the study unit; routing ENFORCED via resolveParentChain ---
  createSubject(input: CreateSubjectInput): Promise<Subject>
  updateSubject(id: string, input: UpdateSubjectInput): Promise<Subject>
  deleteSubject(id: string): Promise<void>
  getSubject(id: string): Promise<Subject | null>
  listSubjects(filter?: SubjectFilter): Promise<Subject[]>

  // --- routing primitive (ED-3) — enforced by createSubject/updateSubject ---
  resolveParentChain(ref: { curriculumId?: string | null; termId?: string | null }): Promise<ParentChainResolution>

  // --- schedule & class sessions (S4 — ED-4/ED-5) ---
  /** Register the `class` session sub-type (call-once, idempotent; `DuplicateSubType` → no-op). Must run before
   *  `createClassSession`, which otherwise surfaces `SessionTypeNotFound` from the registry (BR-LE-S4-1). */
  registerLearningEducation(): Promise<void>
  /** Upsert the subject's single schedule source (one row per subject, UNIQUE). `SubjectNotFoundError` if unknown. */
  setSchedule(subjectId: string, input: SetScheduleInput): Promise<SubjectSchedule>
  /** Create a class meeting: base `sessions` (`sub_type='class'`) + the 1:1 extension + attach the subject as the
   *  §3.2.1 target. `started_at` carries the meeting time (B1). `SubjectNotFoundError` if unknown. */
  createClassSession(subjectId: string, input: CreateClassSessionInput): Promise<ClassSessionView>
  /** All class meetings for a subject (soft-deleted base sessions excluded). */
  listSessions(subjectId: string): Promise<ClassSessionView[]>
  /** Cross-subject weekly schedule — class meetings whose base `started_at` ∈ [range.start, range.end). */
  getWeeklySchedule(range: TimeRange): Promise<ClassSessionView[]>

  // --- ICS feeds + events (S5 — ED-6 · X1/X2/X5/X8/X9/X10) — add-only; fetch deny-safe ---
  /** Register a calendar feed (ED-6/X2). Stores `auto_create_sessions` (the event→class-session auto-create fires
   *  only on the M2 sync path — at M1 `created_session_id` stays null). `is_active`/`auto_create_sessions` default
   *  at the DB column. */
  addFeed(input: AddFeedInput): Promise<IcsFeedConfig>
  /** Sync a feed's events (X1/X8/X10). **Deny-safe:** the `ics?` port absent ⇒ `IcsUnavailableError` (live fetch =
   *  M2). A present port that throws ⇒ the feed's `last_error` is written then `IcsSyncError` (never silent-stale).
   *  Success ⇒ `last_error` cleared, `last_synced_at` stamped, events add-only upserted on UNIQUE(feed_id,uid)
   *  (already-present or `is_ignored` ⇒ skipped). `IcsFeedNotFoundError` if the feed is unknown. */
  syncFeed(feedId: string): Promise<SyncResult>
  /** Match a synced event to a subject (X5). Returns the updated event (never spawns a session at M1 — auto-create
   *  is the M2 sync path). `IcsEventNotFoundError` if unknown. */
  matchEvent(eventId: string, input: MatchEventInput): Promise<IcsSyncedEvent>
  /** Ignore a synced event (X8) — sets `is_ignored` (never deletes; dedup keeps it out of future syncs).
   *  `IcsEventNotFoundError` if unknown. */
  ignoreEvent(eventId: string): Promise<void>
  /** Revoke/restore a feed (X9) — sets `is_active` (never deletes). `IcsFeedNotFoundError` if unknown. */
  setFeedActive(feedId: string, active: boolean): Promise<IcsFeedConfig>
  /** All feed configs (active + revoked). */
  listFeeds(): Promise<IcsFeedConfig[]>
  /** All synced events for a feed (ignored + unmatched included — the UI surfaces unmatched for manual match, R7). */
  listEvents(feedId: string): Promise<IcsSyncedEvent[]>

  // --- grading systems + components (S6 — ED-7 · H3) ---
  /** Build a grading system + its weighted components in one call (ED-7). Validates the scope entity exists
   *  (fail-loud: `Institution`/`Program`/`SubjectNotFoundError` by `scope.type`) and the weight rule (non-null
   *  weights, if any, must sum to 100% / 10000 bp — else `GradingWeightError`, never normalized) BEFORE any write.
   *  `scale_config` is serialized `[E]` JSON. Returns the `{system, components}` view. */
  createGradingSystem(scope: GradingScopeRef, input: CreateGradingSystemInput): Promise<GradingSystemView>
  /** A grading system + its live components, or null if unknown/soft-deleted. */
  getGradingSystem(id: string): Promise<GradingSystemView | null>
  /** All live grading systems for a scope (ED-7) — systems only; components via `getGradingSystem`. */
  listGradingSystems(scope: GradingScopeRef): Promise<GradingSystem[]>

  // --- assessments + grade/GPA compute (S7 — ED-8 · ED-7 compute · AI6) ---
  /** Create a subject-attached assessment (ED-8). Fail-loud: unknown subject → `SubjectNotFoundError`; a given-but-
   *  unresolvable `grading_component_id` → `GradingComponentNotFoundError`; a null one is allowed. `score` starts null;
   *  `source` backfills to 'manual' service-side (BR-LE-S7-1). */
  createAssessment(subjectId: string, input: CreateAssessmentInput): Promise<Assessment>
  /** Record the raw result on an assessment (ED-8). Sets `score` ONLY — the grade is derived, never stored
   *  (BR-LE-S7-2). Unknown id → `AssessmentNotFoundError`. */
  recordResult(assessmentId: string, input: RecordResultInput): Promise<Assessment>
  /** Live assessments filtered by subject / type / date range (inclusive); soft-deleted excluded. An empty/omitted
   *  filter lists every live assessment (the `listSubjects` precedent). */
  listAssessments(filter?: ListAssessmentsFilter): Promise<Assessment[]>
  /** The subject's grade, DERIVED on read via the resolved grading system + the measurement engine (BR-LE-S7-3/4).
   *  Never throws on missing data — returns a flagged partial (`GradeResult.flags`). Unknown subject →
   *  `SubjectNotFoundError`. */
  computeGrade(subjectId: string): Promise<GradeResult>
  /** The GPA across a term/curriculum (BR-LE-S7-5) — equal-weight rollup of per-subject grades, `flagged` when
   *  partial, never fabricated. Unknown ref → `TermNotFoundError`/`CurriculumNotFoundError`. */
  computeGPA(ref: GpaRef): Promise<GpaResult>

  // --- education measurement (S8 — ED-10 · M1/M2/M3) ---
  /** Configure the Education-forged measure for a subject/program (ED-10). One row per ref (upsert). `measurement_kind`
   *  required; `binding_mode` omittable ⇒ derive. Fail-loud on the ref (`SubjectNotFoundError`/`ProgramNotFoundError`).
   *  Separate storage from Projects (C-M5). `measurement_kind` is declared metadata — the M1 derivation is kind-agnostic. */
  setMeasurement(ref: MeasurementRef, input: SetMeasurementInput): Promise<EducationMeasurement>
  /** Progress for a subject/program, DERIVED on read (M3) — integer 0–100 or null (unmeasured). A stored override wins;
   *  else: a subject with `derived-pull`/no-mode pulls `computeGrade`, `manual`/`event-trigger` ⇒ null; a program rolls
   *  up its subjects (equal-weight). No measurement configured ⇒ null. */
  getProgress(ref: MeasurementRef): Promise<number | null>

  // --- vault + tags/links (S9 — ED-13 · ED-16 · SP1 · PJ-8) ---
  /** Add a document to the per-subject vault (ED-13, PJ-8). `storage_ref` → stored as-is; a `file` + a present
   *  `attachment` port → R2 (upload-first); a `file` + no port → INLINE (`encrypted_blob`, local-first ED-16); neither
   *  → a metadata-only reference row. Fail-loud on the subject (`SubjectNotFoundError`); a present port that rejects →
   *  `DocumentFileError`; `file` + `storage_ref` together → a validation error. No soft-delete (the vault has no `deleted_at`). */
  addDocument(subjectId: string, input: AddDocumentInput): Promise<SubjectDocument>
  /** Read the subject's vault (LEA-44) — documents (sorted by created_at) + its `pages` notes together. */
  getVault(subjectId: string): Promise<VaultView>
  /** Tag an Education-scoped entity (SP1). Guards the tag resolves (`TagNotFound`) BEFORE the idempotent
   *  `spaces.tagEntity` blind-insert; an unregistered `entityType` → `UnknownEntityType` (from spaces). */
  tagEntity(ref: EducationEntityRef, tagId: string): Promise<EntityTagRow>
  /** Link two Education-scoped entities (SP4). Composes `spaces.createLink` with `from.entityId` in the generic
   *  anchor slot (the knowledge `linkObjects` precedent); the TARGET `entityType` is registry-checked by spaces. */
  linkEntities(
    from: EducationEntityRef,
    to: EducationEntityRef,
    context?: string | null,
  ): Promise<EntityLinkRow>
}

// --- typed errors (fail loud — constitution §5) ------------------------------
export class InstitutionNotFoundError extends Error {
  constructor(id: string) {
    super(`Institution not found: ${id}`)
    this.name = 'InstitutionNotFoundError'
  }
}
export class SelfTaughtPathNotFoundError extends Error {
  constructor(id: string) {
    super(`Self-taught path not found: ${id}`)
    this.name = 'SelfTaughtPathNotFoundError'
  }
}
export class ProgramNotFoundError extends Error {
  constructor(id: string) {
    super(`Program not found: ${id}`)
    this.name = 'ProgramNotFoundError'
  }
}
export class CurriculumNotFoundError extends Error {
  constructor(id: string) {
    super(`Curriculum not found: ${id}`)
    this.name = 'CurriculumNotFoundError'
  }
}
export class TermNotFoundError extends Error {
  constructor(id: string) {
    super(`Term not found: ${id}`)
    this.name = 'TermNotFoundError'
  }
}
export class SubjectNotFoundError extends Error {
  constructor(id: string) {
    super(`Subject not found: ${id}`)
    this.name = 'SubjectNotFoundError'
  }
}
/** A subject's routing refs (curriculum/term) were given but do not resolve to a live, consistent chain (ED-3).
 *  An EMPTY routing (no curriculum_id, no term_id) is allowed (A1 fully collapsed) — not an error. */
export class UnroutedSubjectError extends Error {
  constructor(detail: string) {
    super(`Subject parent chain does not resolve: ${detail}`)
    this.name = 'UnroutedSubjectError'
  }
}
/** Exported typed vocabulary for "a write was attempted against an immutable curriculum template" (ED-11).
 *  Per interpretation R9, this has NO wired throw site in S3: `forkCurriculum` writes only new rows, so the
 *  base is never mutated BY CONSTRUCTION (BR-LE-S3-2) — there is nothing to throw at. It is exported so the
 *  ratified seam surface is complete and a future mutable-template-edit path (M2+) can wire it without a
 *  signature change (the `IntegrationConsentError` books-S10 precedent). `[R9; slice-map.md:20; seam-contract.md:75]` */
export class TemplateImmutableError extends Error {
  constructor(id: string) {
    super(`Curriculum is an immutable template: ${id}`)
    this.name = 'TemplateImmutableError'
  }
}
// --- S5 ICS errors (all have a real M1 throw site) ---------------------------
/** The deny-safe `ics?` fetch port is absent — a live sync cannot proceed (live fetch = M2, ADR-014 X1/R9).
 *  Fail-loud: a read that cannot produce a result throws rather than silently returning stale/empty. */
export class IcsUnavailableError extends Error {
  constructor(feedId: string) {
    super(`ICS fetch is unavailable (live sync is M2): ${feedId}`)
    this.name = 'IcsUnavailableError'
  }
}
/** A PRESENT `ics?` port threw during fetch/parse — the feed's `last_error` is persisted BEFORE this throws, so
 *  the failure is never silent-stale (seam-contract.md ICS). */
export class IcsSyncError extends Error {
  constructor(feedId: string, cause: string) {
    super(`ICS sync failed for feed ${feedId}: ${cause}`)
    this.name = 'IcsSyncError'
  }
}
export class IcsFeedNotFoundError extends Error {
  constructor(id: string) {
    super(`ICS feed not found: ${id}`)
    this.name = 'IcsFeedNotFoundError'
  }
}
export class IcsEventNotFoundError extends Error {
  constructor(id: string) {
    super(`ICS synced event not found: ${id}`)
    this.name = 'IcsEventNotFoundError'
  }
}
// --- S6 grading error (real throw site in createGradingSystem) ----------------
/** A grading system's non-null component weights do not sum to 100% (10000 bp). Flagged, never normalized
 *  (ED-7 / contract.md:63). */
export class GradingWeightError extends Error {
  constructor(sumBp: number) {
    super(`Grading component weights must sum to 100% (10000 bp); got ${sumBp} bp`)
    this.name = 'GradingWeightError'
  }
}
// --- S7 assessment errors (both have a real M1 throw site, unlike the dropped S4 ClassSessionNotFoundError) --------
/** `recordResult` / `listAssessments`-adjacent — the assessment id does not resolve to a live row. */
export class AssessmentNotFoundError extends Error {
  constructor(id: string) {
    super(`Assessment not found: ${id}`)
    this.name = 'AssessmentNotFoundError'
  }
}
/** `createAssessment` was given a `grading_component_id` that does not resolve to a live `grading_components` row
 *  (the create-time no-FK integrity convention, BR-LE-S7-1; a null id is allowed, not an error). */
export class GradingComponentNotFoundError extends Error {
  constructor(id: string) {
    super(`Grading component not found: ${id}`)
    this.name = 'GradingComponentNotFoundError'
  }
}
// --- S9 vault error (real throw site: a PRESENT attachment port whose upload rejects — unlike the dropped S4
// ClassSessionNotFoundError, and NOT the drifted seam-contract `AttachmentUnavailable` which has no M1 throw site:
// an absent port falls back to inline). This IS the business-rules.md:89 "decrypt/R2 error → typed" state (the
// books `AssetFileError` precedent). ---------------------------------------------------------------------------
export class DocumentFileError extends Error {
  constructor(subjectId: string, cause?: unknown) {
    super(`Vault document file upload failed for subject ${subjectId}`)
    this.name = 'DocumentFileError'
    if (cause !== undefined) this.cause = cause
  }
}
/** `addDocument` was given BOTH an inline `file` and a pre-uploaded `storage_ref` — the two storage sources are
 *  mutually exclusive (seam-contract.md:64 `file?|storageRef?`). Typed (not a plain Error) for constitution §5
 *  consistency with the rest of the module. Real throw site: the pre-write guard in `addDocument`. */
export class ConflictingFileSourceError extends Error {
  constructor() {
    super('addDocument: `file` and `storage_ref` are mutually exclusive')
    this.name = 'ConflictingFileSourceError'
  }
}
