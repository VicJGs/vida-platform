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

import { eq, and, or, isNull, inArray, gte, lte, type SQL } from 'drizzle-orm'
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
  Assessment,
  EducationMeasurement,
  SubjectDocument,
  Task,
  ReadingPlan,
  EffectType,
} from '@vida/types'
import type { PageRow } from '../../db/schema/notes'
import { createRepository, type CreateInput } from '../../db/repository'
import { normalize, rollup } from '../../foundation/measurement'
import {
  institutions,
  selfTaught,
  programs,
  curricula,
  terms,
  subjects,
  subjectSchedules,
  classSessions,
  icsFeedConfigs,
  icsSyncedEvents,
  gradingSystems,
  gradingComponents,
  assessments,
  educationMeasurements,
  subjectDocuments,
  type InstitutionRow,
  type SelfTaughtRow,
  type ProgramRow,
  type CurriculumRow,
  type TermRow,
  type SubjectRow,
  type SubjectScheduleRow,
  type ClassSessionRow,
  type IcsFeedConfigRow,
  type IcsSyncedEventRow,
  type GradingSystemRow,
  type GradingComponentRow,
  type AssessmentRow,
  type EducationMeasurementRow,
  type SubjectDocumentRow,
} from '../../db/schema/learning'
import { tags, type EntityTagRow, type EntityLinkRow } from '../../db/schema/foundation/spaces'
import { DuplicateSubType, type SessionTypeDef } from '../../foundation/sessions'
import { TagNotFound } from '../../foundation/spaces'
import {
  CreateInstitutionSchema,
  UpdateInstitutionSchema,
  CreateSelfTaughtPathSchema,
  UpdateSelfTaughtPathSchema,
  CreateProgramSchema,
  UpdateProgramSchema,
  CreateCurriculumSchema,
  UpdateCurriculumSchema,
  ForkCurriculumSchema,
  CreateTermSchema,
  UpdateTermSchema,
  CreateSubjectSchema,
  UpdateSubjectSchema,
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
  type CreateSubjectInput,
  type UpdateSubjectInput,
  type ForkCurriculumInput,
  type SubjectFilter,
  type SetScheduleInput,
  type CreateClassSessionInput,
  type ClassSessionView,
  type TimeRange,
  type AddFeedInput,
  type MatchEventInput,
  type SyncResult,
  type RawIcsEvent,
  type GradingScopeRef,
  type GradingSystemView,
  type CreateGradingSystemInput,
  type CreateAssessmentInput,
  type RecordResultInput,
  type ListAssessmentsFilter,
  type GradeResult,
  type GradeFlag,
  type GpaRef,
  type GpaResult,
  type MeasurementRef,
  type SetMeasurementInput,
  type AddDocumentInput,
  type EducationEntityRef,
  type VaultView,
  type SubjectMastery,
  type EducationDayDigest,
  InstitutionNotFoundError,
  SelfTaughtPathNotFoundError,
  ProgramNotFoundError,
  CurriculumNotFoundError,
  TermNotFoundError,
  SubjectNotFoundError,
  UnroutedSubjectError,
  IcsUnavailableError,
  IcsSyncError,
  IcsFeedNotFoundError,
  IcsEventNotFoundError,
  GradingWeightError,
  AssessmentNotFoundError,
  GradingComponentNotFoundError,
  DocumentFileError,
  ConflictingFileSourceError,
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
// DEFENSIVE json-as-text parse (R10 / the books parseJsonObject · preferences · checkins precedent): `metadata`
// is a superseded v1 generic slot most likely to hold a NON-JSON legacy string — a bare JSON.parse would crash
// every getSubject/listSubjects read. Malformed ⇒ null, never throw. [[json-t-columns-need-service-serialize-in-m10]]
const parseMetadata = (value: string | null): Record<string, unknown> | null => {
  if (value == null) return null
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}
// subjects: `status`/`course_type`/`degree_tier`/`_sync_status` are plain-text union casts; `metadata` parsed above.
const toSubject = (r: SubjectRow): Subject => ({
  ...r,
  status: r.status as Subject['status'],
  course_type: r.course_type as Subject['course_type'],
  degree_tier: r.degree_tier as Subject['degree_tier'],
  metadata: parseMetadata(r.metadata),
  _sync_status: r._sync_status as Subject['_sync_status'],
})
// S4 mappers — only the plain-text `source`/`_sync_status` need the union cast.
const toSubjectSchedule = (r: SubjectScheduleRow): SubjectSchedule => ({
  ...r,
  source: r.source as SubjectSchedule['source'],
  _sync_status: r._sync_status as SubjectSchedule['_sync_status'],
})
const toClassSession = (r: ClassSessionRow): ClassSession => ({
  ...r,
  _sync_status: r._sync_status as ClassSession['_sync_status'],
})
// S5 mappers — `metadata` defensive-parsed (R10, the toSubject precedent); `raw_event`/`last_error` are free-form
// `[E]` text (pass-through); only `_sync_status` needs the union cast.
const toIcsFeedConfig = (r: IcsFeedConfigRow): IcsFeedConfig => ({
  ...r,
  metadata: parseMetadata(r.metadata),
  _sync_status: r._sync_status as IcsFeedConfig['_sync_status'],
})
const toIcsSyncedEvent = (r: IcsSyncedEventRow): IcsSyncedEvent => ({
  ...r,
  _sync_status: r._sync_status as IcsSyncedEvent['_sync_status'],
})
// S6 mappers — `scale_config` defensive-parsed (R10, the metadata precedent); `scope`/`scale_type`/`component_type`
// are plain-text union casts; `weight`/`max_points` are plain integers (no cast).
const toGradingSystem = (r: GradingSystemRow): GradingSystem => ({
  ...r,
  scope: r.scope as GradingSystem['scope'],
  scale_type: r.scale_type as GradingSystem['scale_type'],
  scale_config: parseMetadata(r.scale_config),
  _sync_status: r._sync_status as GradingSystem['_sync_status'],
})
const toGradingComponent = (r: GradingComponentRow): GradingComponent => ({
  ...r,
  component_type: r.component_type as GradingComponent['component_type'],
  _sync_status: r._sync_status as GradingComponent['_sync_status'],
})
// S7 mapper — `type`/`modality`/`source`/`_sync_status` are plain-text union casts; `score`/`weight`/`max_points`
// are plain integers (no cast); `title`/`description` are [E] text pass-through (M1.0 set=[]).
const toAssessment = (r: AssessmentRow): Assessment => ({
  ...r,
  type: r.type as Assessment['type'],
  modality: r.modality as Assessment['modality'],
  source: r.source as Assessment['source'],
  _sync_status: r._sync_status as Assessment['_sync_status'],
})
// S8 mapper — `ref_type`/`measurement_kind`/`binding_mode`/`_sync_status` are plain-text union casts; `progress` is a
// plain integer (no cast).
const toEducationMeasurement = (r: EducationMeasurementRow): EducationMeasurement => ({
  ...r,
  ref_type: r.ref_type as EducationMeasurement['ref_type'],
  measurement_kind: r.measurement_kind as EducationMeasurement['measurement_kind'],
  binding_mode: r.binding_mode as EducationMeasurement['binding_mode'],
  _sync_status: r._sync_status as EducationMeasurement['_sync_status'],
})
// S9 — `_sync_status` needs the union cast; `encrypted_blob` is typed `{} | null` by Drizzle's mode-less `blob()`
// (the DB-4 schema owns that choice, learning.ts:319) but is a `Buffer` (⊂ `Uint8Array`) at runtime from the SQLite
// driver → a sound cast to the interface field; `storage_ref`/`doc_type`/`description` pass through.
const toSubjectDocument = (r: SubjectDocumentRow): SubjectDocument => ({
  ...r,
  encrypted_blob: (r.encrypted_blob as Uint8Array | null) ?? null,
  _sync_status: r._sync_status as SubjectDocument['_sync_status'],
})

// IR/BR-LE-S4-2 — the `class` Session sub-type Education registers. A TRANSCRIPTION of ADR-004 §3.2:
// `effects:[]` (§3.2.2 + C-E2 — Education is a non-feeder; any completion grant rides the base sub-type),
// the shared lifecycle (§3.2.3 scheduled→in_progress→completed), `allowed_effects:[]` (§3.2.4 — a module
// envelope ⊆ shipped; `∅` subset-legal). `default_purpose` OMITTED (no Education doc fixes a class purpose;
// optional dim — No-Guessing). Mirrors the books `READING_SESSION_TYPE_DEF`. [slice-map.md:21; seam-contract.md:41]
const CLASS_SESSION_TYPE_DEF: SessionTypeDef = {
  sub_type: 'class',
  owner_module: 'learning-education',
  attachment_defaults: {},
  effects: [],
  lifecycle: {
    transitions: [
      { from: 'scheduled', to: 'in_progress', event: 'start' },
      { from: 'in_progress', to: 'completed', event: 'complete' },
    ],
  },
  permissions: { allowed_effects: [] },
}

export function createLearningEducationService(deps: LearningEducationServiceDeps): LearningEducationService {
  const { db, deviceId, sessions, sessionRegistry, ics, spaces, notes, attachment, tasks, books, knowledge, effects } =
    deps

  // All 5 hierarchy tables have `deleted_at` → softDelete:true. M1.0 encryptedFields:[] (the [E]
  // name/description fields pass through; real field-level encryption lands at M3).
  const institutionsRepo = createRepository(db, institutions, { deviceId, softDelete: true, encryptedFields: [] })
  const selfTaughtRepo = createRepository(db, selfTaught, { deviceId, softDelete: true, encryptedFields: [] })
  const programsRepo = createRepository(db, programs, { deviceId, softDelete: true, encryptedFields: [] })
  const curriculaRepo = createRepository(db, curricula, { deviceId, softDelete: true, encryptedFields: [] })
  const termsRepo = createRepository(db, terms, { deviceId, softDelete: true, encryptedFields: [] })
  const subjectsRepo = createRepository(db, subjects, { deviceId, softDelete: true, encryptedFields: [] })
  // S4 — subject_schedules has deleted_at (softDelete:true); class_sessions is a session extension with NO
  // deleted_at (softDelete:false; the base `sessions` owns lifecycle, BR-ED-7). `location` is [E] but M1.0 set=[].
  const subjectSchedulesRepo = createRepository(db, subjectSchedules, {
    deviceId,
    softDelete: true,
    encryptedFields: [],
  })
  const classSessionsRepo = createRepository(db, classSessions, { deviceId, softDelete: false, encryptedFields: [] })
  // S5 — ICS tables have NO deleted_at (X8 add-only / X9 revoke-via-is_active) → softDelete:false.
  const icsFeedConfigsRepo = createRepository(db, icsFeedConfigs, { deviceId, softDelete: false, encryptedFields: [] })
  const icsSyncedEventsRepo = createRepository(db, icsSyncedEvents, {
    deviceId,
    softDelete: false,
    encryptedFields: [],
  })
  // S6 — grading tables both have deleted_at → softDelete:true.
  const gradingSystemsRepo = createRepository(db, gradingSystems, { deviceId, softDelete: true, encryptedFields: [] })
  const gradingComponentsRepo = createRepository(db, gradingComponents, {
    deviceId,
    softDelete: true,
    encryptedFields: [],
  })
  // S7 — assessments has deleted_at → softDelete:true. `title`/`description` are [E] but M1.0 set=[].
  const assessmentsRepo = createRepository(db, assessments, { deviceId, softDelete: true, encryptedFields: [] })
  // S8 — education_measurements has deleted_at → softDelete:true; no [E] fields.
  const educationMeasurementsRepo = createRepository(db, educationMeasurements, {
    deviceId,
    softDelete: true,
    encryptedFields: [],
  })
  // S9 — subject_documents has NO deleted_at (the PJ-8 vault pattern) → softDelete:false. `title`/`description` are
  // [E] but M1.0 set=[]. `tagsRepo` is READ-only (the BR-LE-S9-4 resolve guard; tag/link WRITES delegate to `spaces`,
  // the knowledge S2 precedent).
  const subjectDocumentsRepo = createRepository(db, subjectDocuments, {
    deviceId,
    softDelete: false,
    encryptedFields: [],
  })
  const tagsRepo = createRepository(db, tags, { deviceId, softDelete: true, encryptedFields: [] })

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
      and(isNull(programs.deleted_at), eq(programs.parent_type, parent.type), eq(programs.parent_id, parent.id)) as SQL,
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

  // ---- curriculum fork (ED-11 · A3 · H10 — S3) ------------------------------
  // Deep-copies a curriculum's LIVE terms + subjects into a NEW tree with a `forked_from_id` lineage pointer.
  // The source is NEVER mutated — every write targets a new row (BR-LE-S3-2, so "base never mutated on fork" is
  // structural, not a runtime guard; `TemplateImmutableError` is exported vocabulary with no wired throw, R9).
  // The copy is a working instance: `is_template:false` — a newly-created curriculum takes the F5 structural
  // default "a new curriculum is not a template" (BR-LE-S3-3). Per-row, no-FK eventually-consistent (R5).
  async function forkCurriculum(sourceId: string, input: ForkCurriculumInput = {}): Promise<Curriculum> {
    const src = await curriculaRepo.findById(sourceId) // findById filters deleted_at → missing/soft-deleted ⇒ null
    if (!src) throw new CurriculumNotFoundError(sourceId)
    const v = ForkCurriculumSchema.parse(input)

    const newCurriculum = await curriculaRepo.create({
      program_id: src.program_id,
      name: v.name ?? src.name,
      description: src.description,
      forked_from_id: sourceId, // lineage pointer (ED-11); no-FK, may dangle if the base is later deleted
      is_template: false, // BR-LE-S3-3 — the fork is a working instance, not a template
      deleted_at: null,
    } satisfies CreateInput<typeof curricula>)

    // Terms — two-pass so `parent_term_id` remaps to the CLONED parent's new id (no ordering assumption).
    const srcTerms = await termsRepo.findWhere(and(isNull(terms.deleted_at), eq(terms.curriculum_id, sourceId)) as SQL)
    const termIdMap = new Map<string, string>()
    for (const t of srcTerms) {
      const nt = await termsRepo.create({
        curriculum_id: newCurriculum.id,
        level: t.level,
        parent_term_id: null, // set in pass 2
        name: t.name,
        start_date: t.start_date,
        end_date: t.end_date,
        deleted_at: null,
      } satisfies CreateInput<typeof terms>)
      termIdMap.set(t.id, nt.id)
    }
    for (const t of srcTerms) {
      if (t.parent_term_id == null) continue
      const newId = termIdMap.get(t.id)
      const newParent = termIdMap.get(t.parent_term_id) // parent not in the live set ⇒ stays null (BR-LE-S3-4)
      if (newId != null && newParent != null) {
        await termsRepo.update(newId, { parent_term_id: newParent })
      }
    }

    // Subjects — the complete set: `curriculum_id = source` OR `term_id ∈ {source live terms}` (BR-LE-S3-6).
    // One `or()` query ⇒ each row returned once (no dedupe needed); empty term set short-circuits `inArray` (N2).
    const liveTermIds = srcTerms.map((t) => t.id)
    const subjectClause =
      liveTermIds.length > 0
        ? or(eq(subjects.curriculum_id, sourceId), inArray(subjects.term_id, liveTermIds))
        : eq(subjects.curriculum_id, sourceId)
    const srcSubjects = await subjectsRepo.findWhere(and(isNull(subjects.deleted_at), subjectClause) as SQL)
    for (const s of srcSubjects) {
      await subjectsRepo.create({
        title: s.title,
        description: s.description,
        provider: s.provider,
        instructor: s.instructor,
        url: s.url,
        metadata: s.metadata, // PRESERVED verbatim (N1 — diverges from createSubject's null)
        course_type: s.course_type,
        status: s.status,
        progress: null, // R2/M3 — a derived override, never cloned (BR-LE-S3-5)
        total_modules: s.total_modules,
        completed_modules: s.completed_modules,
        start_date: s.start_date,
        end_date: s.end_date,
        target_completion: s.target_completion,
        estimated_hours: s.estimated_hours,
        rating: s.rating,
        // SHAPE-preserving (BR-LE-S3-5): remap only refs that were SET; leave a null ref null.
        curriculum_id: s.curriculum_id == null ? null : newCurriculum.id,
        term_id: s.term_id == null ? null : (termIdMap.get(s.term_id) ?? null),
        degree_tier: s.degree_tier,
        deleted_at: null,
      } satisfies CreateInput<typeof subjects>)
    }

    return toCurriculum(newCurriculum)
  }

  // ---- terms (ED-12) — curriculum (and optional parent term) must resolve ---
  async function createTerm(curriculumId: string, input: Omit<CreateTermInput, 'curriculum_id'>): Promise<Term> {
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
    const rows = await termsRepo.findWhere(and(isNull(terms.deleted_at), eq(terms.curriculum_id, curriculumId)) as SQL)
    return rows.map(toTerm)
  }

  // ---- subjects (ED-3) — routing ENFORCED; progress NEVER settable (R2/M3) --
  // Routing policy (doc-reconciled): a GIVEN routing ref (curriculum_id and/or term_id) MUST resolve to a live,
  // consistent chain, else UnroutedSubjectError. An EMPTY routing (neither given) is ALLOWED — a lone subject,
  // organized into a curriculum later. Grounding: the built DB-4 schema makes curriculum_id nullable "per A1
  // optional depth" (learning.ts:100, the authoritative artifact) + subjects are "sparse and progressively
  // fillable" (identity.md:49-50, ED-14). The pre-DB-4 "never an orphaned flat list" (business-rules ED-3)
  // targets the v2 anti-pattern (a courses list with no routing CAPABILITY), not a creation-time mandate.
  // Never auto-derives a ref (No-Guessing).
  async function assertRouting(curriculumId: string | null, termId: string | null): Promise<void> {
    if (curriculumId == null && termId == null) return // A1 collapsed — allowed
    const chain = await resolveParentChain({ curriculumId, termId })
    if (!chain.ok) throw new UnroutedSubjectError(`curriculum_id=${curriculumId}, term_id=${termId}`)
  }
  async function createSubject(input: CreateSubjectInput): Promise<Subject> {
    const v = CreateSubjectSchema.parse(input)
    await assertRouting(v.curriculum_id ?? null, v.term_id ?? null)
    const row = await subjectsRepo.create({
      title: v.title,
      description: v.description ?? null,
      provider: v.provider ?? null,
      instructor: v.instructor ?? null,
      url: v.url ?? null,
      metadata: null, // superseded generic slot — not a write input at S2 (toSubject parses legacy reads)
      course_type: v.course_type ?? null,
      status: v.status ?? 'not_started', // notNull default — backfilled on the create-echo
      progress: null, // R2/M3 — never settable; derived on read (S8)
      total_modules: v.total_modules ?? null,
      completed_modules: v.completed_modules ?? null,
      start_date: v.start_date ?? null,
      end_date: v.end_date ?? null,
      target_completion: v.target_completion ?? null,
      estimated_hours: v.estimated_hours ?? null,
      rating: v.rating ?? null,
      curriculum_id: v.curriculum_id ?? null,
      term_id: v.term_id ?? null,
      degree_tier: v.degree_tier ?? null,
      deleted_at: null,
    } satisfies CreateInput<typeof subjects>)
    return toSubject(row)
  }
  async function updateSubject(id: string, input: UpdateSubjectInput): Promise<Subject> {
    const v = UpdateSubjectSchema.parse(input)
    const existing = await subjectsRepo.findById(id)
    if (!existing) throw new SubjectNotFoundError(id)
    // Re-routing: if either ref is being changed, re-validate the resulting chain (R2 — the final pair).
    if (v.curriculum_id !== undefined || v.term_id !== undefined) {
      const nextCurriculum = v.curriculum_id !== undefined ? (v.curriculum_id ?? null) : existing.curriculum_id
      const nextTerm = v.term_id !== undefined ? (v.term_id ?? null) : existing.term_id
      await assertRouting(nextCurriculum, nextTerm)
    }
    const row = await subjectsRepo.update(id, {
      ...(v.title !== undefined ? { title: v.title } : {}),
      ...(v.description !== undefined ? { description: v.description ?? null } : {}),
      ...(v.provider !== undefined ? { provider: v.provider ?? null } : {}),
      ...(v.instructor !== undefined ? { instructor: v.instructor ?? null } : {}),
      ...(v.url !== undefined ? { url: v.url ?? null } : {}),
      ...(v.course_type !== undefined ? { course_type: v.course_type ?? null } : {}),
      ...(v.status !== undefined ? { status: v.status } : {}),
      ...(v.total_modules !== undefined ? { total_modules: v.total_modules ?? null } : {}),
      ...(v.completed_modules !== undefined ? { completed_modules: v.completed_modules ?? null } : {}),
      ...(v.start_date !== undefined ? { start_date: v.start_date ?? null } : {}),
      ...(v.end_date !== undefined ? { end_date: v.end_date ?? null } : {}),
      ...(v.target_completion !== undefined ? { target_completion: v.target_completion ?? null } : {}),
      ...(v.estimated_hours !== undefined ? { estimated_hours: v.estimated_hours ?? null } : {}),
      ...(v.rating !== undefined ? { rating: v.rating ?? null } : {}),
      ...(v.curriculum_id !== undefined ? { curriculum_id: v.curriculum_id ?? null } : {}),
      ...(v.term_id !== undefined ? { term_id: v.term_id ?? null } : {}),
      ...(v.degree_tier !== undefined ? { degree_tier: v.degree_tier ?? null } : {}),
      // progress NEVER in the patch (R2/M3)
    })
    return toSubject(row)
  }
  async function deleteSubject(id: string): Promise<void> {
    if (!(await subjectsRepo.findById(id))) throw new SubjectNotFoundError(id)
    await subjectsRepo.delete(id)
  }
  async function getSubject(id: string): Promise<Subject | null> {
    const row = await subjectsRepo.findById(id)
    return row ? toSubject(row) : null
  }
  async function listSubjects(filter: SubjectFilter = {}): Promise<Subject[]> {
    const clauses: SQL[] = [isNull(subjects.deleted_at) as SQL]
    if (filter.curriculumId != null) clauses.push(eq(subjects.curriculum_id, filter.curriculumId) as SQL)
    if (filter.termId != null) clauses.push(eq(subjects.term_id, filter.termId) as SQL)
    if (filter.status != null) clauses.push(eq(subjects.status, filter.status) as SQL)
    const rows = await subjectsRepo.findWhere(and(...clauses) as SQL)
    return rows.map(toSubject)
  }

  // ---- routing primitive (ED-3) — enforced by createSubject/updateSubject ---
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

  // ---- schedule & class sessions (S4 — ED-4/ED-5) ---------------------------

  // BR-LE-S4-1 — register the `class` sub-type (call-once, idempotent). A 2nd call throws DuplicateSubType → no-op.
  // `createClassSession` → `sessions.createSession('class')` throws SessionTypeNotFound until this runs (the books
  // registerBooks precedent, service.ts registerBooks).
  async function registerLearningEducation(): Promise<void> {
    try {
      await sessionRegistry.register(CLASS_SESSION_TYPE_DEF)
    } catch (err) {
      if (!(err instanceof DuplicateSubType)) throw err
    }
  }

  // BR-LE-S4-3 — one schedule per subject (UNIQUE). Upsert: update the live row's source if present, else create.
  // findWhere skips the soft-delete filter ([[repository-findwhere-skips-softdelete-filter]]) → filter deleted_at here.
  async function setSchedule(subjectId: string, input: SetScheduleInput): Promise<SubjectSchedule> {
    const v = SetScheduleSchema.parse(input)
    if (!(await subjectsRepo.findById(subjectId))) throw new SubjectNotFoundError(subjectId)
    const existing = await subjectSchedulesRepo.findWhere(
      and(eq(subjectSchedules.subject_id, subjectId), isNull(subjectSchedules.deleted_at)) as SQL,
    )
    if (existing[0]) {
      const row = await subjectSchedulesRepo.update(existing[0].id, { source: v.source })
      return toSubjectSchedule(row)
    }
    const row = await subjectSchedulesRepo.create({
      subject_id: subjectId,
      source: v.source,
      deleted_at: null,
    } satisfies CreateInput<typeof subjectSchedules>)
    return toSubjectSchedule(row)
  }

  // Resolve a base session into a ClassSessionView pair; returns null when the base no longer resolves
  // (soft-deleted — the base owns lifecycle, BR-LE-S4-6).
  async function toView(row: ClassSessionRow): Promise<ClassSessionView | null> {
    const session = await sessions.getSession(row.session_id)
    if (session == null) return null
    return { session, classSession: toClassSession(row) }
  }

  // BR-LE-S4-4/S4-5 — a class meeting = base `sessions`(sub_type='class') + the 1:1 extension + the subject target.
  // Three writes (createSession's own tx · the extension · the attach); an orphan is harmless + re-drivable (no-FK,
  // eventually-consistent — the books startSession shape, BR-LE-S3-7). `started_at` carries the meeting time (B1).
  async function createClassSession(subjectId: string, input: CreateClassSessionInput): Promise<ClassSessionView> {
    const v = CreateClassSessionSchema.parse(input)
    if (!(await subjectsRepo.findById(subjectId))) throw new SubjectNotFoundError(subjectId)
    const session = await sessions.createSession({
      sub_type: 'class',
      scheduling_mode: v.scheduling_mode ?? 'attended',
      status: v.status ?? 'scheduled',
      started_at: v.started_at,
      ended_at: v.ended_at ?? null,
    })
    const classSession = await classSessionsRepo.create({
      session_id: session.session.id,
      subject_id: subjectId,
      schedule_id: v.schedule_id ?? null,
      source_event_id: v.source_event_id ?? null,
      location: v.location ?? null,
    } satisfies CreateInput<typeof classSessions>)
    // Attach the subject as the ADR-004 §3.2.1 target ("this session is about X"). `subject` is a registered type.
    await sessions.attach(session.session.id, 'subject', subjectId, 'instance')
    return { session, classSession: toClassSession(classSession) }
  }

  // BR-LE-S4-6 — a subject's class meetings (class_sessions has no deleted_at; a soft-deleted BASE is excluded via toView).
  async function listSessions(subjectId: string): Promise<ClassSessionView[]> {
    const rows = await classSessionsRepo.findWhere(eq(classSessions.subject_id, subjectId) as SQL)
    const views = await Promise.all(rows.map(toView))
    return views.filter((view): view is ClassSessionView => view !== null)
  }

  // BR-LE-S4-6 — cross-subject weekly schedule: base `started_at` ∈ [range.start, range.end], INCLUSIVE on both ends
  // to match the shared `TimeRange` contract (sessions/types.ts:219 "both ends inclusive"; dueIn/getSessionAnalytics
  // use gte/lte) — no silent divergence from the reused primitive. A soft-deleted base is dropped by toView; a null
  // `started_at` is dropped here (defensive — S4's createClassSession always sets started_at, so this is reachable
  // only via a later base-session edit, never via S4's own surface).
  async function getWeeklySchedule(range: TimeRange): Promise<ClassSessionView[]> {
    const rows = await classSessionsRepo.findAll()
    const views = await Promise.all(rows.map(toView))
    return views
      .filter((view): view is ClassSessionView => view !== null)
      .filter((view) => {
        const at = view.session.session.started_at
        return at != null && at >= range.start && at <= range.end
      })
      .sort((a, b) => (a.session.session.started_at ?? 0) - (b.session.session.started_at ?? 0))
  }

  // ===========================================================================
  // S5 — ICS feeds + events (ED-6 · X1/X2/X5/X8/X9/X10) — add-only; fetch deny-safe
  // ===========================================================================

  // ED-6/X2 — register a feed. All notNull-with-default columns are backfilled in the create input: `create()`
  // echoes the input and does NOT read back DB column defaults ([[repository-create-returns-input-row-not-db-defaults]]),
  // so omitting them would return `is_active`/`auto_create_sessions`/`sync_interval_hours` as undefined (the Row type
  // lies). The backfilled values equal the DB defaults — no behavioural divergence (this corrects preflight N2).
  async function addFeed(input: AddFeedInput): Promise<IcsFeedConfig> {
    const v = AddFeedSchema.parse(input)
    const row = await icsFeedConfigsRepo.create({
      feed_url: v.url,
      feed_name: v.feed_name ?? null,
      is_active: true,
      // Stored now; the event→class-session auto-create fires only on the M2 sync path (created_session_id stays null at M1).
      auto_create_sessions: v.auto_create_sessions ?? false,
      default_subject_id: v.default_subject_id ?? null,
      sync_interval_hours: 6, // FACT default §5.18 (schema:119) — backfilled for a faithful returned row
      last_synced_at: null,
      last_error: null,
      metadata: null,
    } satisfies CreateInput<typeof icsFeedConfigs>)
    return toIcsFeedConfig(row)
  }

  // X1/X8/X10/R9 — sync a feed. Deny-safe: the live fetch+parse is M2 (ADR-014), so an absent `ics?` port fails loud
  // (a sync that cannot run must not silently return empty/stale). A PRESENT port that throws ⇒ persist `last_error`
  // BEFORE throwing `IcsSyncError` (never silent-stale). Success ⇒ clear `last_error` + stamp `last_synced_at`, then
  // add-only upsert on the UNIQUE(feed_id,uid) natural key (already-present ⇒ skip; never overwrite/delete, X8).
  async function syncFeed(feedId: string): Promise<SyncResult> {
    const feed = await icsFeedConfigsRepo.findById(feedId)
    if (!feed) throw new IcsFeedNotFoundError(feedId)
    if (!ics) throw new IcsUnavailableError(feedId)
    let events: RawIcsEvent[]
    try {
      events = await ics.fetchFeed(feed.feed_url)
    } catch (err) {
      const cause = err instanceof Error ? err.message : String(err)
      await icsFeedConfigsRepo.update(feedId, { last_error: cause })
      throw new IcsSyncError(feedId, cause)
    }
    // Dedup against every existing event for this feed (ignored rows count — X8 keeps them out of re-sync).
    const existing = await icsSyncedEventsRepo.findWhere(eq(icsSyncedEvents.feed_id, feedId) as SQL)
    const seen = new Set(existing.map((e) => e.uid))
    let added = 0
    let skipped = 0
    for (const ev of events) {
      if (seen.has(ev.uid)) {
        skipped++
        continue
      }
      await icsSyncedEventsRepo.create({
        feed_id: feedId,
        uid: ev.uid,
        summary: ev.summary ?? null,
        description: ev.description ?? null,
        location: ev.location ?? null,
        start_time: ev.start_time,
        end_time: ev.end_time ?? null,
        recurrence_rule: ev.recurrence_rule ?? null,
        matched_subject_id: null, // unmatched until matchEvent (R7)
        created_session_id: null, // auto-create is the M2 sync path (addFeed stores the intent)
        is_ignored: false,
        raw_event: ev.raw_event ?? null,
      } satisfies CreateInput<typeof icsSyncedEvents>)
      seen.add(ev.uid)
      added++
    }
    await icsFeedConfigsRepo.update(feedId, { last_error: null, last_synced_at: Date.now() })
    return { added, skipped }
  }

  // X5 — match an event to a subject. Returns the updated event only; it never spawns a class session at M1 (the
  // event→session path is the M2 sync). `SubjectNotFoundError` if the subject is unknown (fail-loud, no dangling ref).
  async function matchEvent(eventId: string, input: MatchEventInput): Promise<IcsSyncedEvent> {
    const v = MatchEventSchema.parse(input)
    if (!(await icsSyncedEventsRepo.findById(eventId))) throw new IcsEventNotFoundError(eventId)
    if (!(await subjectsRepo.findById(v.subject_id))) throw new SubjectNotFoundError(v.subject_id)
    const row = await icsSyncedEventsRepo.update(eventId, { matched_subject_id: v.subject_id })
    return toIcsSyncedEvent(row)
  }

  // X8 — ignore an event (never delete). Keeps the dedup key present so re-syncs skip it.
  async function ignoreEvent(eventId: string): Promise<void> {
    if (!(await icsSyncedEventsRepo.findById(eventId))) throw new IcsEventNotFoundError(eventId)
    await icsSyncedEventsRepo.update(eventId, { is_ignored: true })
  }

  // X9 — revoke/restore a feed via `is_active` (never delete).
  async function setFeedActive(feedId: string, active: boolean): Promise<IcsFeedConfig> {
    if (!(await icsFeedConfigsRepo.findById(feedId))) throw new IcsFeedNotFoundError(feedId)
    const row = await icsFeedConfigsRepo.update(feedId, { is_active: active })
    return toIcsFeedConfig(row)
  }

  async function listFeeds(): Promise<IcsFeedConfig[]> {
    const rows = await icsFeedConfigsRepo.findAll()
    return rows.map(toIcsFeedConfig)
  }

  // R7 — all events (ignored + unmatched) so the UI surfaces unmatched ones for manual match.
  async function listEvents(feedId: string): Promise<IcsSyncedEvent[]> {
    const rows = await icsSyncedEventsRepo.findWhere(eq(icsSyncedEvents.feed_id, feedId) as SQL)
    return rows.map(toIcsSyncedEvent)
  }

  // ===========================================================================
  // S6 — grading systems + components (ED-7 · H3) — the grade builder
  // ===========================================================================

  // Fail-loud scope resolution (the BR-LE-S1-2 create-time convention) — a grading system never references a
  // non-existent institution/program/subject (no-FK, so the service enforces it).
  async function assertScopeExists(scope: GradingScopeRef): Promise<void> {
    if (scope.type === 'institution') {
      if (!(await institutionsRepo.findById(scope.id))) throw new InstitutionNotFoundError(scope.id)
    } else if (scope.type === 'program') {
      if (!(await programsRepo.findById(scope.id))) throw new ProgramNotFoundError(scope.id)
    } else {
      if (!(await subjectsRepo.findById(scope.id))) throw new SubjectNotFoundError(scope.id)
    }
  }

  // ED-7/H3 — build a grading system + its components. Validates scope + the weight rule BEFORE any write, so a
  // rejected system leaves zero partial rows. Weight rule (contract.md:63): the non-null component weights, if any
  // are given, must sum to exactly 100% (10000 bp) — flagged (`GradingWeightError`), NEVER normalized; a fully
  // unweighted set (all null — pass_fail/points) is unconstrained. `scale_config` serialized `[E]` JSON (R10).
  // Per-row component writes, no outer tx — an orphan is harmless + re-drivable (no-FK eventually-consistent, the
  // S4/S5 precedent). The scope override-resolution (which system applies to a subject) is S7's concern, not here.
  async function createGradingSystem(
    scope: GradingScopeRef,
    input: CreateGradingSystemInput,
  ): Promise<GradingSystemView> {
    const v = CreateGradingSystemSchema.parse(input)
    await assertScopeExists(scope)
    const weights = v.components.map((c) => c.weight).filter((w): w is number => w != null)
    if (weights.length > 0) {
      const sum = weights.reduce((a, b) => a + b, 0)
      if (sum !== 10000) throw new GradingWeightError(sum)
    }
    const system = await gradingSystemsRepo.create({
      scope: scope.type,
      scope_id: scope.id,
      name: v.name,
      description: v.description ?? null,
      scale_type: v.scale_type,
      scale_config: v.scale_config != null ? JSON.stringify(v.scale_config) : null,
      deleted_at: null,
    } satisfies CreateInput<typeof gradingSystems>)
    const components: GradingComponentRow[] = []
    for (const c of v.components) {
      components.push(
        await gradingComponentsRepo.create({
          grading_system_id: system.id,
          component_type: c.component_type,
          name: c.name ?? null,
          weight: c.weight ?? null,
          max_points: c.max_points ?? null,
          deleted_at: null,
        } satisfies CreateInput<typeof gradingComponents>),
      )
    }
    return { system: toGradingSystem(system), components: components.map(toGradingComponent) }
  }

  // A system + its live components (findWhere skips the soft-delete filter → filter deleted_at explicitly, the S4
  // precedent [[repository-findwhere-skips-softdelete-filter]]). `findById` already excludes a soft-deleted system.
  async function getGradingSystem(id: string): Promise<GradingSystemView | null> {
    const system = await gradingSystemsRepo.findById(id)
    if (!system) return null
    const components = await gradingComponentsRepo.findWhere(
      and(eq(gradingComponents.grading_system_id, id), isNull(gradingComponents.deleted_at)) as SQL,
    )
    return { system: toGradingSystem(system), components: components.map(toGradingComponent) }
  }

  // Live grading systems for a scope (multiple allowed — "create or inherit"; override-resolution is S7's).
  async function listGradingSystems(scope: GradingScopeRef): Promise<GradingSystem[]> {
    const rows = await gradingSystemsRepo.findWhere(
      and(
        eq(gradingSystems.scope, scope.type),
        eq(gradingSystems.scope_id, scope.id),
        isNull(gradingSystems.deleted_at),
      ) as SQL,
    )
    return rows.map(toGradingSystem)
  }

  // ===========================================================================
  // S7 — assessments + grade/GPA compute (ED-8 · ED-7 compute · AI6)
  // ===========================================================================

  // BR-LE-S7-3 — the applicable grading system by NEAREST scope: subject → program → institution. Institution is
  // DERIVED from the program (ParentChainResolution has no institution field): `program.parent_type==='institution' ?
  // program.parent_id : none` (a self_taught-rooted program stops at program — self_taught ∉ GRADING_SCOPE). >1 live
  // system at the chosen scope ⇒ pick most-recently-created (created_at desc, id tie-break) + `ambiguous` flag.
  async function pickSystem(
    systems: GradingSystem[],
    scope: GradingScope,
  ): Promise<{ system: GradingSystem; components: GradingComponent[]; scope: GradingScope; ambiguous: boolean }> {
    const chosen = [...systems].sort((a, b) => b.created_at - a.created_at || (a.id < b.id ? 1 : -1))[0]!
    const view = await getGradingSystem(chosen.id)
    // getGradingSystem re-reads live; chosen came from a live list, so view is non-null (defensive fallback: chosen).
    return {
      system: view?.system ?? chosen,
      components: view?.components ?? [],
      scope,
      ambiguous: systems.length > 1,
    }
  }
  async function resolveGradingSystem(subjectId: string): Promise<{
    system: GradingSystem
    components: GradingComponent[]
    scope: GradingScope
    ambiguous: boolean
  } | null> {
    const atSubject = await listGradingSystems({ type: 'subject', id: subjectId })
    if (atSubject.length > 0) return pickSystem(atSubject, 'subject')
    const subjectRow = await subjectsRepo.findById(subjectId)
    if (!subjectRow) return null // defensive — callers guard first
    const subject = toSubject(subjectRow)
    const chain = await resolveParentChain({
      curriculumId: subject.curriculum_id,
      termId: subject.term_id,
    })
    const program = chain.program
    if (program) {
      const atProgram = await listGradingSystems({ type: 'program', id: program.id })
      if (atProgram.length > 0) return pickSystem(atProgram, 'program')
      if (program.parent_type === 'institution') {
        const atInstitution = await listGradingSystems({ type: 'institution', id: program.parent_id })
        if (atInstitution.length > 0) return pickSystem(atInstitution, 'institution')
      }
    }
    return null
  }

  // ED-8 — an assessment attaches to a subject. Fail-loud on the subject + (when given) the grading component (the
  // create-time no-FK integrity convention, BR-LE-S7-1). `source` backfilled to 'manual' so the create-echoed row is
  // faithful (create-returns-input-row). `score` starts null — the grade derives, never stored (BR-LE-S7-2).
  async function createAssessment(subjectId: string, input: CreateAssessmentInput): Promise<Assessment> {
    const v = CreateAssessmentSchema.parse(input)
    if (!(await subjectsRepo.findById(subjectId))) throw new SubjectNotFoundError(subjectId)
    if (v.grading_component_id != null) {
      if (!(await gradingComponentsRepo.findById(v.grading_component_id)))
        throw new GradingComponentNotFoundError(v.grading_component_id)
    }
    const row = await assessmentsRepo.create({
      subject_id: subjectId,
      type: v.type,
      grading_component_id: v.grading_component_id ?? null,
      title: v.title ?? null,
      description: v.description ?? null,
      date: v.date ?? null,
      weight: v.weight ?? null,
      max_points: v.max_points ?? null,
      modality: v.modality ?? null,
      score: null,
      source: v.source ?? 'manual',
      deleted_at: null,
    } satisfies CreateInput<typeof assessments>)
    return toAssessment(row)
  }

  // ED-8 — record the raw result. Sets `score` ONLY; there is no stored grade to update (BR-LE-S7-2). Fail-loud on
  // an unknown id (a real throw site — unlike the dropped S4 ClassSessionNotFoundError).
  // S10 emit-only measurement fan-out (BR-LE-S10-5) — mirrors books `fanOutReadingCompletion`. ONE member:
  // `emit_measurement_signal` (a keyed measurement signal); NEVER award_xp/grant_currency (C-E2 — Education is not an
  // economy feeder). Occurrence grain = the assessment id (exactly-once per ADR-004 §3.2.5; a re-recorded score derives
  // the same effect_event_id → rail no-op, correct for a derive-on-read measure). DORMANT at M1 (no rail/handler wired).
  const ASSESSMENT_RECORDED_TRANSITION = 'assessment.recorded'
  const ASSESSMENT_RECORDED_EFFECTS: readonly EffectType[] = ['emit_measurement_signal']
  const fanOutAssessmentRecorded = async (assessmentId: string, subjectId: string): Promise<void> => {
    if (!effects) return // M1 default: no rail wired → the whole fan-out is dormant
    for (const effectType of ASSESSMENT_RECORDED_EFFECTS) {
      // Dormant guard: a keyed effect with no handler would throw NoEffectHandler (effects/service.ts).
      if (!effects.registry.resolve(effectType)) continue
      try {
        await effects.rail.applyEffect({
          subjectNaturalKey: assessmentId,
          transition: ASSESSMENT_RECORDED_TRANSITION,
          effectType,
          targetRef: subjectId,
        })
      } catch {
        // Post-commit, failure-isolated: the recorded result stands; a handler throw is non-fatal.
      }
    }
  }

  async function recordResult(assessmentId: string, input: RecordResultInput): Promise<Assessment> {
    const v = RecordResultSchema.parse(input)
    // Capture the guard row (NOT discarded) — `update` echoes only {score}, so `subject_id` for the S10 fan-out
    // comes from here (unchanged by a score write). BR-LE-S10-5.
    const existing = await assessmentsRepo.findById(assessmentId)
    if (!existing) throw new AssessmentNotFoundError(assessmentId)
    const row = await assessmentsRepo.update(assessmentId, { score: v.score })
    await fanOutAssessmentRecorded(assessmentId, existing.subject_id) // emit-only, dormant at M1, post-commit, isolated
    return toAssessment(row)
  }

  // Live assessments by subject / type / date range (inclusive). findWhere skips the soft-delete filter → isNull
  // explicit. `date` is nullable calendar TEXT; a range query excludes undated rows (NULL compares out — intended).
  async function listAssessments(filter: ListAssessmentsFilter = {}): Promise<Assessment[]> {
    const v = ListAssessmentsSchema.parse(filter)
    const conds: SQL[] = [isNull(assessments.deleted_at) as SQL]
    if (v.subject_id != null) conds.push(eq(assessments.subject_id, v.subject_id))
    if (v.type != null) conds.push(eq(assessments.type, v.type))
    if (v.range != null) {
      conds.push(gte(assessments.date, v.range.start))
      conds.push(lte(assessments.date, v.range.end))
    }
    const rows = await assessmentsRepo.findWhere(and(...conds) as SQL)
    return rows.map(toAssessment)
  }

  // BR-LE-S7-4 — the subject's grade, DERIVED on read via the resolved system + the measurement engine's two-level
  // rollup. Never throws on missing data (fail-soft-with-flag); throws only on an unknown subject. Partial, never
  // fabricated (business-rules.md:92).
  async function computeGrade(subjectId: string): Promise<GradeResult> {
    if (!(await subjectsRepo.findById(subjectId))) throw new SubjectNotFoundError(subjectId)
    const resolved = await resolveGradingSystem(subjectId)
    if (!resolved) {
      return {
        subjectId,
        grade: null,
        scaleType: null,
        scaleConfig: null,
        systemId: null,
        systemScope: null,
        components: [],
        flags: ['no-system'],
      }
    }
    const flags: GradeFlag[] = []
    if (resolved.ambiguous) flags.push('ambiguous-system')
    const assessed = (
      await assessmentsRepo.findWhere(and(eq(assessments.subject_id, subjectId), isNull(assessments.deleted_at)) as SQL)
    ).map(toAssessment)
    const componentIds = new Set(resolved.components.map((c) => c.id))

    // (a)+(b) per component: normalize each scored assessment to [0,1], then equal-weight rollup → component progress.
    let hasMissingScale = false
    const componentResults = resolved.components.map((c) => {
      const scored = assessed.filter((a) => a.grading_component_id === c.id && a.score !== null)
      const normalized = scored
        .map((a) => {
          const max = a.max_points ?? c.max_points
          if (max == null) {
            hasMissingScale = true
            return null
          }
          // score > max (extra credit) clamps to 1.0 via the engine (no >100% fabrication, N3).
          return normalize({
            kind: 'quantitative',
            current: a.score as number,
            baseline: 0,
            target: max,
            isHigherBetter: true,
          })
        })
        .filter((n): n is number => n !== null)
      const progress = rollup(normalized.map((n) => ({ progress: n, weight: null })))
      return {
        componentId: c.id,
        componentType: c.component_type,
        weight: c.weight,
        progress,
        assessmentCount: normalized.length,
      }
    })

    // B3 — a scored assessment whose component id is null OR ∉ the resolved system is excluded + flagged (never silent).
    const hasUnmapped = assessed.some(
      (a) => a.score !== null && (a.grading_component_id === null || !componentIds.has(a.grading_component_id)),
    )
    if (hasUnmapped) flags.push('unmapped-assessments')
    if (hasMissingScale) flags.push('missing-scale')
    if (componentResults.some((cr) => cr.progress === null)) flags.push('incomplete')

    // (c) subject grade = weighted rollup of component progress (null-progress components excluded by the engine).
    const grade = rollup(componentResults.map((cr) => ({ progress: cr.progress, weight: cr.weight })))
    return {
      subjectId,
      grade,
      scaleType: resolved.system.scale_type,
      scaleConfig: resolved.system.scale_config,
      systemId: resolved.system.id,
      systemScope: resolved.scope,
      components: componentResults,
      flags,
    }
  }

  // BR-LE-S7-5 — GPA across a term/curriculum = equal-weight rollup of per-subject grades (no credit-hours exist →
  // equal weight is the engine default). `flagged` whenever any subject is missing/partial; never fabricated.
  async function computeGPA(ref: GpaRef): Promise<GpaResult> {
    let subjectRows
    if (ref.type === 'term') {
      if (!(await termsRepo.findById(ref.id))) throw new TermNotFoundError(ref.id)
      subjectRows = await subjectsRepo.findWhere(and(eq(subjects.term_id, ref.id), isNull(subjects.deleted_at)) as SQL)
    } else {
      if (!(await curriculaRepo.findById(ref.id))) throw new CurriculumNotFoundError(ref.id)
      // The S3 fork union: curriculum_id === id OR term_id ∈ the curriculum's live terms (empty ⇒ short-circuit).
      const liveTerms = await termsRepo.findWhere(and(eq(terms.curriculum_id, ref.id), isNull(terms.deleted_at)) as SQL)
      const liveTermIds = liveTerms.map((t) => t.id)
      const clause =
        liveTermIds.length > 0
          ? or(eq(subjects.curriculum_id, ref.id), inArray(subjects.term_id, liveTermIds))
          : eq(subjects.curriculum_id, ref.id)
      subjectRows = await subjectsRepo.findWhere(and(clause, isNull(subjects.deleted_at)) as SQL)
    }
    const perSubject: GpaResult['perSubject'] = []
    for (const sr of subjectRows) {
      const g = await computeGrade(sr.id)
      perSubject.push({ subjectId: sr.id, grade: g.grade, flags: g.flags })
    }
    const gpa = rollup(perSubject.map((p) => ({ progress: p.grade, weight: null })))
    const flagged = perSubject.length === 0 || perSubject.some((p) => p.grade === null || p.flags.length > 0)
    return { ref, gpa, flagged, perSubject }
  }

  // ===========================================================================
  // S8 — education measurement (ED-10 · M1/M2/M3): the Education-forged measure, derive-on-read
  // ===========================================================================

  // The single live measurement row for a ref (findWhere skips the soft-delete filter → isNull explicit).
  async function findMeasurement(ref: MeasurementRef): Promise<EducationMeasurementRow | null> {
    const rows = await educationMeasurementsRepo.findWhere(
      and(
        eq(educationMeasurements.ref_type, ref.type),
        eq(educationMeasurements.ref_id, ref.id),
        isNull(educationMeasurements.deleted_at),
      ) as SQL,
    )
    return rows[0] ?? null
  }

  // The subjects under a program = the union over the program's live curricula of (curriculum_id === c.id OR
  // term_id ∈ c's live terms) — the S7 computeGPA / S3 fork union, iterated per curriculum (BR-LE-S8-6).
  async function programSubjectIds(programId: string): Promise<string[]> {
    const curriculaRows = await listCurriculaFor(programId)
    const ids = new Set<string>()
    for (const c of curriculaRows) {
      const liveTerms = await termsRepo.findWhere(and(eq(terms.curriculum_id, c.id), isNull(terms.deleted_at)) as SQL)
      const liveTermIds = liveTerms.map((t) => t.id)
      const clause =
        liveTermIds.length > 0
          ? or(eq(subjects.curriculum_id, c.id), inArray(subjects.term_id, liveTermIds))
          : eq(subjects.curriculum_id, c.id)
      const subs = await subjectsRepo.findWhere(and(clause, isNull(subjects.deleted_at)) as SQL)
      for (const s of subs) ids.add(s.id)
    }
    return [...ids]
  }

  // Derive progress in [0,1] (the engine's native unit); null = unmeasured. Subject: derived-pull/no-mode ⇒ grade;
  // manual/event-trigger ⇒ null. Program: equal-weight rollup of its subjects' [0,1] progress (BR-LE-S8-5/6).
  // `measurement_kind` is NOT consulted — the M1 derivation is kind-agnostic (B1).
  async function deriveProgress01(
    ref: MeasurementRef,
    bindingMode: EducationMeasurement['binding_mode'],
  ): Promise<number | null> {
    if (ref.type === 'program') {
      const subjectIds = await programSubjectIds(ref.id)
      const children: { progress: number | null; weight: number | null }[] = []
      for (const sid of subjectIds) {
        const p = await getProgress({ type: 'subject', id: sid }) // 0–100 | null
        children.push({ progress: p === null ? null : p / 100, weight: null })
      }
      return rollup(children)
    }
    // subject
    if (bindingMode === 'manual' || bindingMode === 'event-trigger') return null // no auto-derivation at M1
    // 'derived-pull' or null (derive-by-default) ⇒ the grade is Education's progress signal
    return (await computeGrade(ref.id)).grade
  }

  // ED-10 — configure the measure for a subject/program (one per ref, upsert). Guards the ref (fail-loud). Updates
  // kind/mode on an existing row (preserves the `progress` override); creates with progress null otherwise.
  async function setMeasurement(ref: MeasurementRef, input: SetMeasurementInput): Promise<EducationMeasurement> {
    const v = SetMeasurementSchema.parse(input)
    if (ref.type === 'subject') {
      if (!(await subjectsRepo.findById(ref.id))) throw new SubjectNotFoundError(ref.id)
    } else {
      if (!(await programsRepo.findById(ref.id))) throw new ProgramNotFoundError(ref.id)
    }
    const existing = await findMeasurement(ref)
    if (existing) {
      const row = await educationMeasurementsRepo.update(existing.id, {
        measurement_kind: v.measurement_kind,
        binding_mode: v.binding_mode ?? null,
      })
      return toEducationMeasurement(row)
    }
    const row = await educationMeasurementsRepo.create({
      ref_type: ref.type,
      ref_id: ref.id,
      measurement_kind: v.measurement_kind,
      binding_mode: v.binding_mode ?? null,
      progress: null,
      deleted_at: null,
    } satisfies CreateInput<typeof educationMeasurements>)
    return toEducationMeasurement(row)
  }

  // ED-10 — progress DERIVED on read (integer 0–100 | null). Inlines resolveProgress §3.2 (stored-override wins, else
  // derive) because the stored override is 0–100 while the engine derives in [0,1] (the books getUnifiedProgress
  // precedent, BR-LE-S8-3/4). No measurement row ⇒ null (unmeasured).
  async function getProgress(ref: MeasurementRef): Promise<number | null> {
    const row = await findMeasurement(ref)
    if (!row) return null
    if (row.progress != null) return Math.max(0, Math.min(100, row.progress)) // stored override wins (0–100)
    const d = await deriveProgress01(ref, row.binding_mode as EducationMeasurement['binding_mode']) // [0,1] | null
    return d === null ? null : Math.round(d * 100)
  }

  // ---- vault + tags/links (S9 — ED-13 · ED-16 · SP1 · PJ-8) -----------------
  // ED-13 — add a document to the per-subject vault. File routing (BR-LE-S9-2): `storage_ref` → as-is; a `file` + a
  // present `attachment` port → R2 (upload FIRST so nothing persists on failure, the books addAsset precedent); a
  // `file` + no port → INLINE `encrypted_blob` (local-first ED-16, no throw — the inline column IS the local path);
  // neither → a metadata-only reference row. A PRESENT port that rejects ⇒ DocumentFileError (business-rules.md:89).
  async function addDocument(subjectId: string, input: AddDocumentInput): Promise<SubjectDocument> {
    const { file, ...meta } = input // split the raw bytes off the validated metadata (the books AddAssetSchema split)
    const v = AddDocumentSchema.parse(meta)
    if (file && v.storage_ref != null) throw new ConflictingFileSourceError()
    if (!(await subjectsRepo.findById(subjectId))) throw new SubjectNotFoundError(subjectId)
    let storageRef: string | null = v.storage_ref ?? null
    let encryptedBlob: Uint8Array | null = null
    if (file) {
      if (attachment) {
        try {
          const res = await attachment.upload({ file, subjectId })
          storageRef = res.fileRef
        } catch (e) {
          // A real R2/encrypt error is NOT the absent-state — fail loud, persist nothing (BR-LE-S9-2).
          throw new DocumentFileError(subjectId, e)
        }
      } else {
        encryptedBlob = file.bytes // deny-safe inline fallback (local-first ED-16)
      }
    }
    const row = await subjectDocumentsRepo.create({
      subject_id: subjectId,
      title: v.title,
      description: v.description ?? null,
      doc_type: v.doc_type ?? null,
      encrypted_blob: encryptedBlob,
      storage_ref: storageRef,
    } satisfies CreateInput<typeof subjectDocuments>)
    return toSubjectDocument(row)
  }

  // LEA-44 — read the subject vault: documents (sorted by created_at — findWhere has no orderBy, the books
  // listAnnotations precedent) + the subject's `pages` notes, together. `subject_documents` has no deleted_at, so no
  // soft-delete filter; `getPagesForEntity` already excludes deleted pages (returned raw — the NotesService convention).
  async function getVault(subjectId: string): Promise<VaultView> {
    if (!(await subjectsRepo.findById(subjectId))) throw new SubjectNotFoundError(subjectId)
    const docRows = await subjectDocumentsRepo.findWhere(eq(subjectDocuments.subject_id, subjectId))
    const documents = [...docRows].sort((a, b) => a.created_at - b.created_at).map(toSubjectDocument)
    const notesRows: PageRow[] = await notes.getPagesForEntity('subject', subjectId)
    return { documents, notes: notesRows }
  }

  // SP1 — tag an Education-scoped entity. spaces.tagEntity blind-inserts an unresolved tag_id (the create-path
  // silent-orphan gap), so guard the tag resolves FIRST (BR-LE-S9-4, the knowledge tagMembership precedent). The
  // entityType is registry-checked inside spaces.tagEntity (UnknownEntityType). Remove stays the SpacesService surface.
  async function tagEntity(ref: EducationEntityRef, tagId: string): Promise<EntityTagRow> {
    if ((await tagsRepo.findById(tagId)) == null) throw new TagNotFound(tagId)
    return spaces.tagEntity(tagId, ref.entityType, ref.entityId)
  }

  // SP4 — link two Education-scoped entities. entity_links is page→entity, so the source entity id rides the generic
  // `page_id` anchor slot (plain TEXT, no FK — the knowledge linkObjects precedent, BR-LE-S9-5). spaces.createLink
  // asserts the TARGET entityType is registered. NOTE: `from.entityType` is informational-only — entity_links has no
  // companion source-type column, so only `from.entityId` is persisted (the source type is neither stored nor validated).
  async function linkEntities(
    from: EducationEntityRef,
    to: EducationEntityRef,
    context?: string | null,
  ): Promise<EntityLinkRow> {
    return spaces.createLink(from.entityId, to.entityType, to.entityId, context ?? null)
  }

  // ---- cross-module consume + Journal digest (S10) --------------------------
  // ED-9 — homework via the Tasks→Education port. Deny-safe: absent ⇒ [] (Tasks owns the entity, C-HW; BR-LE-S10-1).
  async function listEducationTasks(subjectRef: string): Promise<Task[]> {
    if (!tasks) return []
    return tasks.listForEducation(subjectRef)
  }

  // BK-12 — passthrough to Books `getPlansForConsumer`. Deny-safe: absent ⇒ [] (BR-LE-S10-2). `subjectId` reserved (the
  // book↔subject filter needs the mapping consumable = M2); M1 returns all active plans.
  async function getBookPlansForSubject(_subjectId: string): Promise<ReadingPlan[]> {
    if (!books) return []
    return books.getPlansForConsumer()
  }

  // KN-10 — consume Knowledge's mastery leaf. Deny-safe: absent ⇒ all-null SubjectMastery (unmeasured; BR-LE-S10-3).
  // Education owns any rollup (M1 = passthrough; enriching assessmentResults is the Knowledge-owned reverse-wire, M2).
  async function getMasteryForSubject(subjectId: string): Promise<SubjectMastery> {
    if (!knowledge) return { objectMastery: null, assessmentResults: null, paceVsSyllabus: null }
    return knowledge.getMasterySource(subjectId)
  }

  // BR-LE-S10-4 — the day's Education recap: class sessions whose `started_at` ∈ the day + assessments due (dated) that
  // day. Feeds the Journal `/summary` PULL (contract.md:57). `getWeeklySchedule` is ms-ranged; convert the calendar date
  // to the UTC day window. `listAssessments({range})` filters the calendar `date` column (start==end == the day).
  async function getDayEducationDigest(date: string): Promise<EducationDayDigest> {
    const dayStart = Date.parse(`${date}T00:00:00.000Z`)
    const dayEnd = dayStart + 86_399_999 // inclusive end of the UTC day (getWeeklySchedule is inclusive both ends)
    const classSessions = (await getWeeklySchedule({ start: dayStart, end: dayEnd })).length
    const dueAssessments = (await listAssessments({ range: { start: date, end: date } })).length
    return { classSessions, dueAssessments }
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
    forkCurriculum,
    createTerm,
    updateTerm,
    deleteTerm,
    getTerm,
    listTermsFor,
    createSubject,
    updateSubject,
    deleteSubject,
    getSubject,
    listSubjects,
    resolveParentChain,
    registerLearningEducation,
    setSchedule,
    createClassSession,
    listSessions,
    getWeeklySchedule,
    addFeed,
    syncFeed,
    matchEvent,
    ignoreEvent,
    setFeedActive,
    listFeeds,
    listEvents,
    createGradingSystem,
    getGradingSystem,
    listGradingSystems,
    createAssessment,
    recordResult,
    listAssessments,
    computeGrade,
    computeGPA,
    setMeasurement,
    getProgress,
    addDocument,
    getVault,
    tagEntity,
    linkEntities,
    listEducationTasks,
    getBookPlansForSubject,
    getMasteryForSubject,
    getDayEducationDigest,
  }
}
