// ============================================================================
// services/learning-education — service (mod-learning-education #52 ① · S1: hierarchy spine + routing)
//
// `createLearningEducationService` — the Learning hub ① backend over DB-4 024_learning_education (15 tables).
// S1 ships CRUD for the 5 hierarchy tables (institutions · self_taught · programs · curricula · terms) + the
// `resolveParentChain` routing primitive S2 enforces. Factory-object, hoisted closures, no `this.`.
//
// Patterns (books/knowledge/habits precedent):
// - one `createRepository` per table; all 5 have `deleted_at` → softDelete:true; M1.0 encryptedFields:[] (the
//   [E] name/description fields pass through — real field encryption = M3).
// - create() echoes the input → backfill nullable defaults for a faithful returned row (create-returns-input-row).
// - row→interface mappers cast the plain-text `_sync_status` to the union (drizzle-row-not-assignable-to-interface).
// - NO FK (ADR-016 §3.4): parent integrity is enforced in the SERVICE on create (fail-loud NotFound, the
//   BookNotFound precedent) — a dangling ref is never written, but the DB holds no constraint.
// ============================================================================

import { eq, and, isNull, type SQL } from 'drizzle-orm'
import type { Institution, SelfTaughtPath, Program, Curriculum, Term } from '@vida/types'
import { createRepository, type CreateInput } from '../../db/repository'
import {
  institutions,
  selfTaught,
  programs,
  curricula,
  terms,
  type InstitutionRow,
  type SelfTaughtRow,
  type ProgramRow,
  type CurriculumRow,
  type TermRow,
} from '../../db/schema/learning'
import {
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
import {
  type LearningEducationService,
  type LearningEducationServiceDeps,
  type ParentRef,
  type ParentChainResolution,
  type CreateInstitutionInput,
  type UpdateInstitutionInput,
  type CreateSelfTaughtPathInput,
  type UpdateSelfTaughtPathInput,
  type CreateProgramInput,
  type UpdateProgramInput,
  type CreateCurriculumInput,
  type UpdateCurriculumInput,
  type CreateTermInput,
  type UpdateTermInput,
  InstitutionNotFoundError,
  SelfTaughtPathNotFoundError,
  ProgramNotFoundError,
  CurriculumNotFoundError,
  TermNotFoundError,
} from './types'

// --- row→interface mappers (only the plain-text `_sync_status` needs the union cast) ---
const toInstitution = (r: InstitutionRow): Institution => ({
  ...r,
  _sync_status: r._sync_status as Institution['_sync_status'],
})
const toSelfTaughtPath = (r: SelfTaughtRow): SelfTaughtPath => ({
  ...r,
  _sync_status: r._sync_status as SelfTaughtPath['_sync_status'],
})
const toProgram = (r: ProgramRow): Program => ({
  ...r,
  _sync_status: r._sync_status as Program['_sync_status'],
})
const toCurriculum = (r: CurriculumRow): Curriculum => ({
  ...r,
  _sync_status: r._sync_status as Curriculum['_sync_status'],
})
const toTerm = (r: TermRow): Term => ({
  ...r,
  _sync_status: r._sync_status as Term['_sync_status'],
})

export function createLearningEducationService(
  deps: LearningEducationServiceDeps,
): LearningEducationService {
  const { db, deviceId } = deps

  // All 5 hierarchy tables have `deleted_at` → softDelete:true. M1.0 encryptedFields:[] (the [E]
  // name/description fields pass through; real field-level encryption lands at M3).
  const institutionsRepo = createRepository(db, institutions, { deviceId, softDelete: true, encryptedFields: [] })
  const selfTaughtRepo = createRepository(db, selfTaught, { deviceId, softDelete: true, encryptedFields: [] })
  const programsRepo = createRepository(db, programs, { deviceId, softDelete: true, encryptedFields: [] })
  const curriculaRepo = createRepository(db, curricula, { deviceId, softDelete: true, encryptedFields: [] })
  const termsRepo = createRepository(db, terms, { deviceId, softDelete: true, encryptedFields: [] })

  // ---- institutions (ED-2) --------------------------------------------------
  async function createInstitution(input: CreateInstitutionInput): Promise<Institution> {
    const v = CreateInstitutionSchema.parse(input)
    const row = await institutionsRepo.create({
      name: v.name,
      description: v.description ?? null,
      deleted_at: null,
    } satisfies CreateInput<typeof institutions>)
    return toInstitution(row)
  }
  async function updateInstitution(id: string, input: UpdateInstitutionInput): Promise<Institution> {
    const v = UpdateInstitutionSchema.parse(input)
    if (!(await institutionsRepo.findById(id))) throw new InstitutionNotFoundError(id)
    const row = await institutionsRepo.update(id, {
      ...(v.name !== undefined ? { name: v.name } : {}),
      ...(v.description !== undefined ? { description: v.description ?? null } : {}),
    })
    return toInstitution(row)
  }
  async function deleteInstitution(id: string): Promise<void> {
    if (!(await institutionsRepo.findById(id))) throw new InstitutionNotFoundError(id)
    await institutionsRepo.delete(id)
  }
  async function getInstitution(id: string): Promise<Institution | null> {
    const row = await institutionsRepo.findById(id)
    return row ? toInstitution(row) : null
  }
  async function listInstitutions(): Promise<Institution[]> {
    return (await institutionsRepo.findAll()).map(toInstitution)
  }

  // ---- self-taught paths (ED-2/H2) -----------------------------------------
  async function createSelfTaughtPath(input: CreateSelfTaughtPathInput): Promise<SelfTaughtPath> {
    const v = CreateSelfTaughtPathSchema.parse(input)
    const row = await selfTaughtRepo.create({
      name: v.name,
      description: v.description ?? null,
      deleted_at: null,
    } satisfies CreateInput<typeof selfTaught>)
    return toSelfTaughtPath(row)
  }
  async function updateSelfTaughtPath(id: string, input: UpdateSelfTaughtPathInput): Promise<SelfTaughtPath> {
    const v = UpdateSelfTaughtPathSchema.parse(input)
    if (!(await selfTaughtRepo.findById(id))) throw new SelfTaughtPathNotFoundError(id)
    const row = await selfTaughtRepo.update(id, {
      ...(v.name !== undefined ? { name: v.name } : {}),
      ...(v.description !== undefined ? { description: v.description ?? null } : {}),
    })
    return toSelfTaughtPath(row)
  }
  async function deleteSelfTaughtPath(id: string): Promise<void> {
    if (!(await selfTaughtRepo.findById(id))) throw new SelfTaughtPathNotFoundError(id)
    await selfTaughtRepo.delete(id)
  }
  async function getSelfTaughtPath(id: string): Promise<SelfTaughtPath | null> {
    const row = await selfTaughtRepo.findById(id)
    return row ? toSelfTaughtPath(row) : null
  }
  async function listSelfTaughtPaths(): Promise<SelfTaughtPath[]> {
    return (await selfTaughtRepo.findAll()).map(toSelfTaughtPath)
  }

  // ---- programs (ED-2) — parent (institution|self_taught) must resolve ------
  async function assertParentExists(parent: ParentRef): Promise<void> {
    if (parent.type === 'institution') {
      if (!(await institutionsRepo.findById(parent.id))) throw new InstitutionNotFoundError(parent.id)
    } else {
      if (!(await selfTaughtRepo.findById(parent.id))) throw new SelfTaughtPathNotFoundError(parent.id)
    }
  }
  async function createProgram(
    parent: ParentRef,
    input: Omit<CreateProgramInput, 'parent_type' | 'parent_id'>,
  ): Promise<Program> {
    const v = CreateProgramSchema.parse({ ...input, parent_type: parent.type, parent_id: parent.id })
    await assertParentExists(parent) // fail-loud: never write an orphan program (ED-2; no-FK, service-enforced)
    const row = await programsRepo.create({
      parent_type: v.parent_type,
      parent_id: v.parent_id,
      name: v.name,
      description: v.description ?? null,
      deleted_at: null,
    } satisfies CreateInput<typeof programs>)
    return toProgram(row)
  }
  async function updateProgram(id: string, input: UpdateProgramInput): Promise<Program> {
    const v = UpdateProgramSchema.parse(input)
    if (!(await programsRepo.findById(id))) throw new ProgramNotFoundError(id)
    const row = await programsRepo.update(id, {
      ...(v.name !== undefined ? { name: v.name } : {}),
      ...(v.description !== undefined ? { description: v.description ?? null } : {}),
    })
    return toProgram(row)
  }
  async function deleteProgram(id: string): Promise<void> {
    if (!(await programsRepo.findById(id))) throw new ProgramNotFoundError(id)
    await programsRepo.delete(id)
  }
  async function getProgram(id: string): Promise<Program | null> {
    const row = await programsRepo.findById(id)
    return row ? toProgram(row) : null
  }
  async function listProgramsFor(parent: ParentRef): Promise<Program[]> {
    // findWhere skips the soft-delete filter → filter deleted_at explicitly (R4).
    const rows = await programsRepo.findWhere(
      and(
        isNull(programs.deleted_at),
        eq(programs.parent_type, parent.type),
        eq(programs.parent_id, parent.id),
      ) as SQL,
    )
    return rows.map(toProgram)
  }

  // ---- curricula (ED-11) — program must resolve; fork lands in S3 ----------
  async function createCurriculum(
    programId: string,
    input: Omit<CreateCurriculumInput, 'program_id'>,
  ): Promise<Curriculum> {
    const v = CreateCurriculumSchema.parse({ ...input, program_id: programId })
    if (!(await programsRepo.findById(programId))) throw new ProgramNotFoundError(programId)
    const row = await curriculaRepo.create({
      program_id: v.program_id,
      name: v.name,
      description: v.description ?? null,
      forked_from_id: null, // S3 fork sets this; a scratch-built curriculum has no lineage
      is_template: v.is_template ?? false,
      deleted_at: null,
    } satisfies CreateInput<typeof curricula>)
    return toCurriculum(row)
  }
  async function updateCurriculum(id: string, input: UpdateCurriculumInput): Promise<Curriculum> {
    const v = UpdateCurriculumSchema.parse(input)
    if (!(await curriculaRepo.findById(id))) throw new CurriculumNotFoundError(id)
    const row = await curriculaRepo.update(id, {
      ...(v.name !== undefined ? { name: v.name } : {}),
      ...(v.description !== undefined ? { description: v.description ?? null } : {}),
      ...(v.is_template !== undefined ? { is_template: v.is_template } : {}),
    })
    return toCurriculum(row)
  }
  async function deleteCurriculum(id: string): Promise<void> {
    if (!(await curriculaRepo.findById(id))) throw new CurriculumNotFoundError(id)
    await curriculaRepo.delete(id)
  }
  async function getCurriculum(id: string): Promise<Curriculum | null> {
    const row = await curriculaRepo.findById(id)
    return row ? toCurriculum(row) : null
  }
  async function listCurriculaFor(programId: string): Promise<Curriculum[]> {
    const rows = await curriculaRepo.findWhere(
      and(isNull(curricula.deleted_at), eq(curricula.program_id, programId)) as SQL,
    )
    return rows.map(toCurriculum)
  }

  // ---- terms (ED-12) — curriculum (and optional parent term) must resolve ---
  async function createTerm(
    curriculumId: string,
    input: Omit<CreateTermInput, 'curriculum_id'>,
  ): Promise<Term> {
    const v = CreateTermSchema.parse({ ...input, curriculum_id: curriculumId })
    if (!(await curriculaRepo.findById(curriculumId))) throw new CurriculumNotFoundError(curriculumId)
    if (v.parent_term_id != null && !(await termsRepo.findById(v.parent_term_id))) {
      throw new TermNotFoundError(v.parent_term_id)
    }
    const row = await termsRepo.create({
      curriculum_id: v.curriculum_id,
      level: v.level,
      parent_term_id: v.parent_term_id ?? null,
      name: v.name,
      start_date: v.start_date ?? null,
      end_date: v.end_date ?? null,
      deleted_at: null,
    } satisfies CreateInput<typeof terms>)
    return toTerm(row)
  }
  async function updateTerm(id: string, input: UpdateTermInput): Promise<Term> {
    const v = UpdateTermSchema.parse(input)
    if (!(await termsRepo.findById(id))) throw new TermNotFoundError(id)
    if (v.parent_term_id != null && !(await termsRepo.findById(v.parent_term_id))) {
      throw new TermNotFoundError(v.parent_term_id)
    }
    const row = await termsRepo.update(id, {
      ...(v.name !== undefined ? { name: v.name } : {}),
      ...(v.level !== undefined ? { level: v.level } : {}),
      ...(v.parent_term_id !== undefined ? { parent_term_id: v.parent_term_id ?? null } : {}),
      ...(v.start_date !== undefined ? { start_date: v.start_date ?? null } : {}),
      ...(v.end_date !== undefined ? { end_date: v.end_date ?? null } : {}),
    })
    return toTerm(row)
  }
  async function deleteTerm(id: string): Promise<void> {
    if (!(await termsRepo.findById(id))) throw new TermNotFoundError(id)
    await termsRepo.delete(id)
  }
  async function getTerm(id: string): Promise<Term | null> {
    const row = await termsRepo.findById(id)
    return row ? toTerm(row) : null
  }
  async function listTermsFor(curriculumId: string): Promise<Term[]> {
    const rows = await termsRepo.findWhere(
      and(isNull(terms.deleted_at), eq(terms.curriculum_id, curriculumId)) as SQL,
    )
    return rows.map(toTerm)
  }

  // ---- routing primitive (ED-3) — S2 enforces on subjects -------------------
  // Resolves whatever refs are given to live rows; `ok` = every GIVEN ref resolved. The program is read via the
  // resolved curriculum (a term's curriculum takes precedence when both are given and agree). No ref given ⇒
  // ok:true, all null (A1 — the caller/S2 decides the "must have at least one" policy).
  async function resolveParentChain(ref: {
    curriculumId?: string | null
    termId?: string | null
  }): Promise<ParentChainResolution> {
    let term: Term | null = null
    let curriculum: Curriculum | null = null
    let ok = true

    if (ref.termId != null) {
      const row = await termsRepo.findById(ref.termId)
      if (!row) ok = false
      else term = toTerm(row)
    }
    // A term carries its own curriculum_id; prefer it, then fall back to an explicit curriculumId.
    const curriculumId = term?.curriculum_id ?? ref.curriculumId ?? null
    if (curriculumId != null) {
      const row = await curriculaRepo.findById(curriculumId)
      if (!row) ok = false
      else curriculum = toCurriculum(row)
    }
    // If both a termId and a curriculumId were given and disagree, the chain is inconsistent.
    if (ref.termId != null && ref.curriculumId != null && term != null && term.curriculum_id !== ref.curriculumId) {
      ok = false
    }

    let program: Program | null = null
    if (curriculum != null) {
      const row = await programsRepo.findById(curriculum.program_id)
      if (row) program = toProgram(row)
    }

    return { ok, curriculum, term, program }
  }

  return {
    createInstitution,
    updateInstitution,
    deleteInstitution,
    getInstitution,
    listInstitutions,
    createSelfTaughtPath,
    updateSelfTaughtPath,
    deleteSelfTaughtPath,
    getSelfTaughtPath,
    listSelfTaughtPaths,
    createProgram,
    updateProgram,
    deleteProgram,
    getProgram,
    listProgramsFor,
    createCurriculum,
    updateCurriculum,
    deleteCurriculum,
    getCurriculum,
    listCurriculaFor,
    createTerm,
    updateTerm,
    deleteTerm,
    getTerm,
    listTermsFor,
    resolveParentChain,
  }
}
