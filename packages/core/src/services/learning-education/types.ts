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
  ProgramParentType,
  CourseStatus,
} from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
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
} from '../../validators/learning'

export interface LearningEducationServiceDeps {
  db: DrizzleDb
  deviceId: string
  // S4+ append: spaces, notes, sessions, sessionRegistry, journalRegistry, ics?, attachment?, tasks?, ai?, effects?
}

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
