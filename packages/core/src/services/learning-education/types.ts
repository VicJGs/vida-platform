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
  ProgramParentType,
  CourseStatus,
} from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import type { SessionsService, Session, TimeRange } from '../sessions'
import type { SessionRegistry } from '../../foundation/sessions'
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
  // S6+ append: spaces, notes, journalRegistry, attachment?, tasks?, ai?, effects?
}

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

/** A class meeting = the base `sessions` row (lifecycle/timing) + the `class_sessions` 1:1 extension (S4).
 *  Mirrors the books `ReadingSessionView {session, reading}` shape. */
export interface ClassSessionView {
  session: Session
  classSession: ClassSession
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
