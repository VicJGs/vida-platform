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
import type { Institution, SelfTaughtPath, Program, Curriculum, Term, ProgramParentType } from '@vida/types'
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

  // --- curricula (ED-11) — fork lands in S3 ---
  createCurriculum(programId: string, input: Omit<CreateCurriculumInput, 'program_id'>): Promise<Curriculum>
  updateCurriculum(id: string, input: UpdateCurriculumInput): Promise<Curriculum>
  deleteCurriculum(id: string): Promise<void>
  getCurriculum(id: string): Promise<Curriculum | null>
  listCurriculaFor(programId: string): Promise<Curriculum[]>

  // --- terms (ED-12) — hierarchical (year ⊃ semester ⊃ term) ---
  createTerm(curriculumId: string, input: Omit<CreateTermInput, 'curriculum_id'>): Promise<Term>
  updateTerm(id: string, input: UpdateTermInput): Promise<Term>
  deleteTerm(id: string): Promise<void>
  getTerm(id: string): Promise<Term | null>
  listTermsFor(curriculumId: string): Promise<Term[]>

  // --- routing primitive (ED-3) — S2 enforces on subjects ---
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
