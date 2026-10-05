// ============================================================================
// mod-learning-education #52 ① · S1 — Hierarchy spine + routing (ED-2/ED-3/ED-11/ED-12)
//
// Node / better-sqlite3 live-store harness (mirrors books/knowledge/habits): REAL store, UNLOCKED vault (the
// sync-hash path runs even with empty [E]), migrate() applies 024_learning_education so the hierarchy tables
// exist. Exercises the encrypt/persist + no-FK parent-validation + routing seams a mocked test bypasses.
// Maps 1:1 to slice-map S1 + seam-contract (hierarchy CRUD + resolveParentChain).
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { createLearningEducationService } from '../service'
import { createSessionRegistry, SessionTypeNotFound, type SessionRegistry } from '../../../foundation/sessions'
import { createEffectRegistry, createEffectRail } from '../../../foundation/effects'
import { createTaggableTypeRegistry } from '../../../foundation/spaces/registry'
import { createSessionsService, type SessionsService } from '../../sessions'
import {
  type LearningEducationService,
  type IcsFetchPort,
  type RawIcsEvent,
  InstitutionNotFoundError,
  SelfTaughtPathNotFoundError,
  ProgramNotFoundError,
  CurriculumNotFoundError,
  TermNotFoundError,
  SubjectNotFoundError,
  UnroutedSubjectError,
  TemplateImmutableError,
  IcsUnavailableError,
  IcsSyncError,
  IcsFeedNotFoundError,
  IcsEventNotFoundError,
  GradingWeightError,
  AssessmentNotFoundError,
  GradingComponentNotFoundError,
} from '../types'

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
      return db.prepare(sqlText).raw().all(...(params ?? [])) as unknown[][]
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
  svc: LearningEducationService
  db: DrizzleDb
  bsql: Database.Database
  sessions: SessionsService
  sessionRegistry: SessionRegistry
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  // S4 — compose the REAL sessions substrate (the books/knowledge harness precedent): a `class` meeting is a base
  // `sessions` row + the 1:1 `class_sessions` extension, so the service needs a live SessionsService + registry.
  const entityRegistry = createTaggableTypeRegistry()
  const sessionRegistry = createSessionRegistry(db, 'test-device')
  const rail = createEffectRail(db, createEffectRegistry())
  const sessions = createSessionsService({
    db,
    deviceId: 'test-device',
    registry: sessionRegistry,
    rail,
    entityRegistry,
  })
  const svc = createLearningEducationService({ db, deviceId: 'test-device', sessions, sessionRegistry })
  return { svc, db, bsql, sessions, sessionRegistry }
}

describe('mod-learning-education S1 — hierarchy spine + routing', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // --- institutions + self-taught (ED-2) ------------------------------------
  it('creates + reads an institution (live persist)', async () => {
    const inst = await h.svc.createInstitution({ name: 'MIT', description: 'formal' })
    expect(inst.id).toBeTruthy()
    expect(inst.name).toBe('MIT')
    expect(inst.deleted_at).toBeNull()
    // live persistence probe — read back from the real store
    const read = await h.svc.getInstitution(inst.id)
    expect(read?.name).toBe('MIT')
    expect(await h.svc.listInstitutions()).toHaveLength(1)
  })

  it('creates a self-taught path (SEPARATE table from institutions, ED-2/H2)', async () => {
    const path = await h.svc.createSelfTaughtPath({ name: 'Self-study: Rust' })
    expect(path.id).toBeTruthy()
    // separate stores — an institution list is unaffected
    expect(await h.svc.listInstitutions()).toHaveLength(0)
    expect(await h.svc.listSelfTaughtPaths()).toHaveLength(1)
  })

  it('updates + soft-deletes an institution; delete on a missing id throws', async () => {
    const inst = await h.svc.createInstitution({ name: 'MIT' })
    const upd = await h.svc.updateInstitution(inst.id, { name: 'MIT (renamed)' })
    expect(upd.name).toBe('MIT (renamed)')
    await h.svc.deleteInstitution(inst.id)
    expect(await h.svc.getInstitution(inst.id)).toBeNull() // soft-deleted → filtered from reads
    await expect(h.svc.updateInstitution(inst.id, { name: 'x' })).rejects.toThrow(InstitutionNotFoundError)
    await expect(h.svc.deleteInstitution('nope')).rejects.toThrow(InstitutionNotFoundError)
  })

  // --- programs (ED-2) — parent must resolve (fail-loud, no-FK service-enforced) ---
  it('creates a program under an institution', async () => {
    const inst = await h.svc.createInstitution({ name: 'MIT' })
    const prog = await h.svc.createProgram({ type: 'institution', id: inst.id }, { name: 'BSc CS' })
    expect(prog.parent_type).toBe('institution')
    expect(prog.parent_id).toBe(inst.id)
    const listed = await h.svc.listProgramsFor({ type: 'institution', id: inst.id })
    expect(listed).toHaveLength(1)
  })

  it('creates a program under a self-taught path', async () => {
    const path = await h.svc.createSelfTaughtPath({ name: 'Self: ML' })
    const prog = await h.svc.createProgram({ type: 'self_taught', id: path.id }, { name: 'ML track' })
    expect(prog.parent_type).toBe('self_taught')
    expect(await h.svc.listProgramsFor({ type: 'self_taught', id: path.id })).toHaveLength(1)
  })

  it('rejects a program whose parent does not resolve (ED-2 fail-loud)', async () => {
    await expect(
      h.svc.createProgram({ type: 'institution', id: 'ghost' }, { name: 'orphan' }),
    ).rejects.toThrow(InstitutionNotFoundError)
    await expect(
      h.svc.createProgram({ type: 'self_taught', id: 'ghost' }, { name: 'orphan' }),
    ).rejects.toThrow(SelfTaughtPathNotFoundError)
  })

  // --- curricula (ED-11) — program must resolve; fork is S3 -----------------
  it('creates a curriculum under a program; forked_from_id null on scratch build', async () => {
    const inst = await h.svc.createInstitution({ name: 'MIT' })
    const prog = await h.svc.createProgram({ type: 'institution', id: inst.id }, { name: 'BSc CS' })
    const cur = await h.svc.createCurriculum(prog.id, { name: '2026 plan', is_template: true })
    expect(cur.program_id).toBe(prog.id)
    expect(cur.forked_from_id).toBeNull()
    expect(cur.is_template).toBe(true)
    expect(await h.svc.listCurriculaFor(prog.id)).toHaveLength(1)
  })

  it('rejects a curriculum whose program does not resolve', async () => {
    await expect(h.svc.createCurriculum('ghost', { name: 'orphan' })).rejects.toThrow(ProgramNotFoundError)
  })

  // --- terms (ED-12) — hierarchical year ⊃ semester ⊃ term ------------------
  it('creates hierarchical terms (year → semester) with parent_term_id', async () => {
    const inst = await h.svc.createInstitution({ name: 'MIT' })
    const prog = await h.svc.createProgram({ type: 'institution', id: inst.id }, { name: 'BSc CS' })
    const cur = await h.svc.createCurriculum(prog.id, { name: '2026' })
    const year = await h.svc.createTerm(cur.id, { level: 'year', name: 'Year 1' })
    const sem = await h.svc.createTerm(cur.id, { level: 'semester', name: 'Fall', parent_term_id: year.id })
    expect(sem.parent_term_id).toBe(year.id)
    expect(sem.level).toBe('semester')
    expect(await h.svc.listTermsFor(cur.id)).toHaveLength(2)
  })

  it('rejects a term with an unresolvable curriculum or parent term', async () => {
    const inst = await h.svc.createInstitution({ name: 'MIT' })
    const prog = await h.svc.createProgram({ type: 'institution', id: inst.id }, { name: 'p' })
    const cur = await h.svc.createCurriculum(prog.id, { name: 'c' })
    await expect(h.svc.createTerm('ghost', { level: 'year', name: 'y' })).rejects.toThrow(CurriculumNotFoundError)
    await expect(
      h.svc.createTerm(cur.id, { level: 'semester', name: 's', parent_term_id: 'ghost' }),
    ).rejects.toThrow(TermNotFoundError)
  })

  // --- resolveParentChain (ED-3) — the routing primitive S2 enforces --------
  it('resolves a full chain (term → curriculum → program)', async () => {
    const inst = await h.svc.createInstitution({ name: 'MIT' })
    const prog = await h.svc.createProgram({ type: 'institution', id: inst.id }, { name: 'p' })
    const cur = await h.svc.createCurriculum(prog.id, { name: 'c' })
    const term = await h.svc.createTerm(cur.id, { level: 'term', name: 't' })
    const res = await h.svc.resolveParentChain({ termId: term.id })
    expect(res.ok).toBe(true)
    expect(res.term?.id).toBe(term.id)
    expect(res.curriculum?.id).toBe(cur.id) // derived from the term's curriculum_id
    expect(res.program?.id).toBe(prog.id)
  })

  it('resolves a curriculum-only chain (A1 — term skipped)', async () => {
    const inst = await h.svc.createInstitution({ name: 'MIT' })
    const prog = await h.svc.createProgram({ type: 'institution', id: inst.id }, { name: 'p' })
    const cur = await h.svc.createCurriculum(prog.id, { name: 'c' })
    const res = await h.svc.resolveParentChain({ curriculumId: cur.id })
    expect(res.ok).toBe(true)
    expect(res.term).toBeNull()
    expect(res.curriculum?.id).toBe(cur.id)
    expect(res.program?.id).toBe(prog.id)
  })

  it('reports ok:false for an unresolvable ref, and for a term/curriculum mismatch', async () => {
    const inst = await h.svc.createInstitution({ name: 'MIT' })
    const prog = await h.svc.createProgram({ type: 'institution', id: inst.id }, { name: 'p' })
    const curA = await h.svc.createCurriculum(prog.id, { name: 'A' })
    const curB = await h.svc.createCurriculum(prog.id, { name: 'B' })
    const term = await h.svc.createTerm(curA.id, { level: 'term', name: 't' })

    expect((await h.svc.resolveParentChain({ curriculumId: 'ghost' })).ok).toBe(false)
    expect((await h.svc.resolveParentChain({ termId: 'ghost' })).ok).toBe(false)
    // term belongs to curA but caller asserts curB → inconsistent chain
    expect((await h.svc.resolveParentChain({ termId: term.id, curriculumId: curB.id })).ok).toBe(false)
  })

  it('empty ref resolves ok with all nulls (A1 — the caller/S2 decides the min policy)', async () => {
    const res = await h.svc.resolveParentChain({})
    expect(res.ok).toBe(true)
    expect(res.curriculum).toBeNull()
    expect(res.term).toBeNull()
    expect(res.program).toBeNull()
  })
})

describe('mod-learning-education S2 — subjects + routing enforcement', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // a small hierarchy fixture
  async function fixture() {
    const inst = await h.svc.createInstitution({ name: 'MIT' })
    const prog = await h.svc.createProgram({ type: 'institution', id: inst.id }, { name: 'BSc CS' })
    const cur = await h.svc.createCurriculum(prog.id, { name: '2026' })
    const term = await h.svc.createTerm(cur.id, { level: 'term', name: 'Fall' })
    return { inst, prog, cur, term }
  }

  it('creates a lone subject with NO routing (A1 fully collapsed — allowed)', async () => {
    const s = await h.svc.createSubject({ title: 'Loose study' })
    expect(s.id).toBeTruthy()
    expect(s.curriculum_id).toBeNull()
    expect(s.term_id).toBeNull()
    expect(s.status).toBe('not_started') // notNull default backfilled
    const read = await h.svc.getSubject(s.id) // live persist probe
    expect(read?.title).toBe('Loose study')
  })

  it('creates a subject routed to a curriculum', async () => {
    const { cur } = await fixture()
    const s = await h.svc.createSubject({ title: 'Algorithms', curriculum_id: cur.id, degree_tier: 'bachelor' })
    expect(s.curriculum_id).toBe(cur.id)
    expect(s.degree_tier).toBe('bachelor')
  })

  it('creates a subject routed via a term (term implies its curriculum)', async () => {
    const { cur, term } = await fixture()
    const s = await h.svc.createSubject({ title: 'Compilers', term_id: term.id, curriculum_id: cur.id })
    expect(s.term_id).toBe(term.id)
  })

  it('rejects a subject whose routing does not resolve (UnroutedSubjectError)', async () => {
    await expect(h.svc.createSubject({ title: 'orphan', curriculum_id: 'ghost' })).rejects.toThrow(
      UnroutedSubjectError,
    )
    await expect(h.svc.createSubject({ title: 'orphan', term_id: 'ghost' })).rejects.toThrow(UnroutedSubjectError)
  })

  it('rejects a subject with a term/curriculum mismatch', async () => {
    const { prog, term } = await fixture()
    const otherCur = await h.svc.createCurriculum(prog.id, { name: 'other' })
    await expect(
      h.svc.createSubject({ title: 'x', term_id: term.id, curriculum_id: otherCur.id }),
    ).rejects.toThrow(UnroutedSubjectError)
  })

  it('never lets progress be set (R2/M3 — derived, created null)', async () => {
    const s = await h.svc.createSubject({ title: 'x' } as never)
    expect(s.progress).toBeNull()
    // even if a caller force-passes progress, the schema parse drops it (not in CreateSubjectSchema)
    const s2 = await h.svc.createSubject({ title: 'y', progress: 80 } as never)
    expect(s2.progress).toBeNull()
  })

  it('course_type is a nullable subject modality (R6)', async () => {
    const s = await h.svc.createSubject({ title: 'x', course_type: 'hybrid' })
    expect(s.course_type).toBe('hybrid')
    const s2 = await h.svc.createSubject({ title: 'y' })
    expect(s2.course_type).toBeNull()
  })

  it('updates a subject; re-routing to a bad ref is rejected; progress stays underived', async () => {
    const { cur } = await fixture()
    const s = await h.svc.createSubject({ title: 'x', curriculum_id: cur.id })
    const upd = await h.svc.updateSubject(s.id, { title: 'x2', status: 'in_progress' })
    expect(upd.title).toBe('x2')
    expect(upd.status).toBe('in_progress')
    expect(upd.progress).toBeNull() // never settable, even on update
    await expect(h.svc.updateSubject(s.id, { curriculum_id: 'ghost' })).rejects.toThrow(UnroutedSubjectError)
    await expect(h.svc.updateSubject('nope', { title: 'z' })).rejects.toThrow(SubjectNotFoundError)
    // force-passed progress on UPDATE is stripped by Zod (not in UpdateSubjectSchema) — stays null
    const forced = await h.svc.updateSubject(s.id, { progress: 99 } as never)
    expect(forced.progress).toBeNull()
  })

  it('metadata read is defensive — a non-JSON legacy value parses to null, never crashes (R10)', async () => {
    const s = await h.svc.createSubject({ title: 'x' })
    // simulate a legacy/malformed metadata row via a raw write, then read through the mapper
    h.bsql.prepare('UPDATE subjects SET metadata = ? WHERE id = ?').run('not-json{', s.id)
    const read = await h.svc.getSubject(s.id)
    expect(read?.metadata).toBeNull() // defensive parse → null, no throw
  })

  it('soft-deletes a subject; delete on a missing id throws', async () => {
    const s = await h.svc.createSubject({ title: 'x' })
    await h.svc.deleteSubject(s.id)
    expect(await h.svc.getSubject(s.id)).toBeNull()
    await expect(h.svc.deleteSubject(s.id)).rejects.toThrow(SubjectNotFoundError)
  })

  it('listSubjects filters by curriculum, term, and status (deleted_at filtered — R4)', async () => {
    const { cur, term } = await fixture()
    const a = await h.svc.createSubject({ title: 'A', curriculum_id: cur.id, status: 'in_progress' })
    await h.svc.createSubject({ title: 'B', term_id: term.id, curriculum_id: cur.id })
    const loose = await h.svc.createSubject({ title: 'C' })

    expect(await h.svc.listSubjects()).toHaveLength(3)
    expect(await h.svc.listSubjects({ curriculumId: cur.id })).toHaveLength(2)
    expect(await h.svc.listSubjects({ termId: term.id })).toHaveLength(1)
    expect(await h.svc.listSubjects({ status: 'in_progress' })).toHaveLength(1)

    await h.svc.deleteSubject(a.id)
    expect(await h.svc.listSubjects({ curriculumId: cur.id })).toHaveLength(1) // soft-deleted filtered out
    void loose
  })
})

// ============================================================================
// S3 — Curriculum fork + lineage (ED-11 · A3 · H10). Deep-copy terms/subjects into a new tree with a
// `forked_from_id` lineage pointer; base never mutated (by construction); `TemplateImmutableError` exported
// vocabulary (R9, no wired throw). Maps 1:1 to PLAN §4 acceptance (14 cases).
// ============================================================================
describe('mod-learning-education S3 — curriculum fork + lineage (ED-11/A3/H10)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // A program + source curriculum with 2 terms (term2 nested under term1) + 3 subjects:
  //   sA → curriculum-only · sB → curriculum + term2 · sC → term-only (curriculum_id null, term_id=term2).
  async function sourceTree(opts: { isTemplate?: boolean } = {}) {
    const inst = await h.svc.createInstitution({ name: 'MIT' })
    const prog = await h.svc.createProgram({ type: 'institution', id: inst.id }, { name: 'BSc CS' })
    const cur = await h.svc.createCurriculum(prog.id, { name: 'CS Core', is_template: opts.isTemplate ?? false })
    const term1 = await h.svc.createTerm(cur.id, { level: 'year', name: 'Year 1' })
    const term2 = await h.svc.createTerm(cur.id, { level: 'semester', name: 'Sem 1', parent_term_id: term1.id })
    const sA = await h.svc.createSubject({ title: 'Algorithms', curriculum_id: cur.id, status: 'in_progress' })
    const sB = await h.svc.createSubject({ title: 'Calculus', curriculum_id: cur.id, term_id: term2.id })
    const sC = await h.svc.createSubject({ title: 'Seminar', term_id: term2.id }) // term-only
    return { prog, cur, term1, term2, sA, sB, sC }
  }

  it('1 — deep-copies curriculum + live terms + all subjects into a new tree', async () => {
    const { cur } = await sourceTree()
    const fork = await h.svc.forkCurriculum(cur.id)
    expect(fork.id).not.toBe(cur.id)
    expect(fork.forked_from_id).toBe(cur.id)
    expect(fork.is_template).toBe(false)
    expect(fork.program_id).toBe(cur.program_id)
    expect(await h.svc.listTermsFor(fork.id)).toHaveLength(2)
    expect(await h.svc.listSubjects()).toHaveLength(6) // 3 source + 3 cloned (incl. the term-only sC)
    expect(await h.svc.listSubjects({ curriculumId: fork.id })).toHaveLength(2) // sA + sB clones
  })

  it('2 — remaps a nested parent_term_id to the CLONED parent id', async () => {
    const { cur, term1 } = await sourceTree()
    const fork = await h.svc.forkCurriculum(cur.id)
    const newTerms = await h.svc.listTermsFor(fork.id)
    const root = newTerms.find((t) => t.parent_term_id == null)!
    const nested = newTerms.find((t) => t.parent_term_id != null)!
    expect(nested.parent_term_id).toBe(root.id) // cloned parent, NOT the source's
    expect(nested.parent_term_id).not.toBe(term1.id)
    expect(nested.level).toBe('semester')
  })

  it('3 — remaps subject routing to the new curriculum/terms', async () => {
    const { cur } = await sourceTree()
    const fork = await h.svc.forkCurriculum(cur.id)
    const nested = (await h.svc.listTermsFor(fork.id)).find((t) => t.parent_term_id != null)!
    const curRouted = await h.svc.listSubjects({ curriculumId: fork.id })
    expect(curRouted.map((s) => s.title).sort()).toEqual(['Algorithms', 'Calculus'])
    for (const s of curRouted) expect(s.curriculum_id).toBe(fork.id)
    const calc = curRouted.find((s) => s.title === 'Calculus')!
    expect(calc.term_id).toBe(nested.id) // remapped
  })

  it('4 — every cloned row gets a fresh id (none shared with the source)', async () => {
    const { cur, term1, term2, sA, sB } = await sourceTree()
    const fork = await h.svc.forkCurriculum(cur.id)
    const srcIds = new Set([cur.id, term1.id, term2.id, sA.id, sB.id])
    expect(srcIds.has(fork.id)).toBe(false)
    for (const t of await h.svc.listTermsFor(fork.id)) expect(srcIds.has(t.id)).toBe(false)
    for (const s of await h.svc.listSubjects({ curriculumId: fork.id })) expect(srcIds.has(s.id)).toBe(false)
  })

  it('5 — the source tree is byte-unchanged after fork (base never mutated)', async () => {
    const { cur, term1 } = await sourceTree()
    await h.svc.forkCurriculum(cur.id)
    const srcCur = await h.svc.getCurriculum(cur.id)
    expect(srcCur?.is_template).toBe(false)
    expect(srcCur?.forked_from_id).toBeNull() // the source is not itself a fork
    expect(await h.svc.listTermsFor(cur.id)).toHaveLength(2)
    expect(await h.svc.listSubjects({ curriculumId: cur.id })).toHaveLength(2)
    const srcNested = (await h.svc.listTermsFor(cur.id)).find((t) => t.parent_term_id != null)!
    expect(srcNested.parent_term_id).toBe(term1.id) // source linkage intact
  })

  it('6 — clone resets progress to null yet preserves metadata (load-bearing via a raw seed)', async () => {
    const { cur, sA } = await sourceTree()
    // Seed a NON-null progress + real metadata on the source (raw write bypasses the never-settable guard) so
    // this test can actually distinguish "reset to null" from "copied the source value", and prove metadata
    // survives the fork (N1). Without the seed the source progress is already null and the test is trivial.
    h.bsql.prepare('UPDATE subjects SET progress = ?, metadata = ? WHERE id = ?').run(42, '{"note":"keep"}', sA.id)
    const fork = await h.svc.forkCurriculum(cur.id)
    const clone = (await h.svc.listSubjects({ curriculumId: fork.id })).find((s) => s.title === 'Algorithms')!
    expect(clone.progress).toBeNull() // RESET (R2/M3) — not copied; the source is 42
    expect(clone.metadata).toEqual({ note: 'keep' }) // PRESERVED verbatim (N1 — unlike createSubject's null)
    expect((await h.svc.getSubject(sA.id))?.progress).toBe(42) // source untouched → distinguishes reset from copy
  })

  it('7 — a term-only subject keeps curriculum_id null; term_id remapped (shape preserved)', async () => {
    const { cur } = await sourceTree()
    const fork = await h.svc.forkCurriculum(cur.id)
    const nested = (await h.svc.listTermsFor(fork.id)).find((t) => t.parent_term_id != null)!
    const seminar = (await h.svc.listSubjects({ termId: nested.id })).find((s) => s.title === 'Seminar')!
    expect(seminar.curriculum_id).toBeNull() // NOT normalized to fork.id
    expect(seminar.term_id).toBe(nested.id)
  })

  it('8 — soft-deleted source terms/subjects are NOT copied', async () => {
    const { cur, term2, sA } = await sourceTree()
    await h.svc.deleteTerm(term2.id) // soft-delete the nested leaf term
    await h.svc.deleteSubject(sA.id) // soft-delete a subject
    const fork = await h.svc.forkCurriculum(cur.id)
    expect(await h.svc.listTermsFor(fork.id)).toHaveLength(1) // only term1 survived
    const curRouted = await h.svc.listSubjects({ curriculumId: fork.id })
    expect(curRouted.map((s) => s.title)).toEqual(['Calculus']) // sB; sA deleted, sC was term-only on a dead term
    // sB's term (term2) was soft-deleted → not in the clone map → its term_id drops to null (BR-LE-S3-5 subject-side)
    expect(curRouted[0]!.term_id).toBeNull()
  })

  it('9 — a term whose parent was soft-deleted gets parent_term_id null on the clone', async () => {
    const { cur, term1 } = await sourceTree()
    await h.svc.deleteTerm(term1.id) // term2.parent_term_id now points at a soft-deleted parent
    const fork = await h.svc.forkCurriculum(cur.id)
    const newTerms = await h.svc.listTermsFor(fork.id)
    expect(newTerms).toHaveLength(1) // only term2 is live
    expect(newTerms[0]!.parent_term_id).toBeNull() // dangling parent → null (no-FK tolerance)
  })

  it('10 — name override vs source name', async () => {
    const { cur } = await sourceTree()
    expect((await h.svc.forkCurriculum(cur.id, { name: 'My CS Plan' })).name).toBe('My CS Plan')
    expect((await h.svc.forkCurriculum(cur.id)).name).toBe(cur.name) // 'CS Core'
  })

  it('11 — fork on a missing or soft-deleted source throws CurriculumNotFoundError', async () => {
    const { cur } = await sourceTree()
    await expect(h.svc.forkCurriculum('nope')).rejects.toThrow(CurriculumNotFoundError)
    await h.svc.deleteCurriculum(cur.id)
    await expect(h.svc.forkCurriculum(cur.id)).rejects.toThrow(CurriculumNotFoundError)
  })

  it('12 — forking a template yields a non-template copy; the base template is unchanged', async () => {
    const { cur } = await sourceTree({ isTemplate: true })
    expect((await h.svc.getCurriculum(cur.id))?.is_template).toBe(true)
    const fork = await h.svc.forkCurriculum(cur.id)
    expect(fork.is_template).toBe(false) // BR-LE-S3-3 (F5 structural default)
    expect(fork.forked_from_id).toBe(cur.id)
    expect((await h.svc.getCurriculum(cur.id))?.is_template).toBe(true) // base untouched
  })

  it('13 — forking an empty curriculum copies just the curriculum (no crash)', async () => {
    const inst = await h.svc.createInstitution({ name: 'MIT' })
    const prog = await h.svc.createProgram({ type: 'institution', id: inst.id }, { name: 'BSc' })
    const empty = await h.svc.createCurriculum(prog.id, { name: 'Empty' })
    const fork = await h.svc.forkCurriculum(empty.id)
    expect(fork.forked_from_id).toBe(empty.id)
    expect(await h.svc.listTermsFor(fork.id)).toHaveLength(0)
    expect(await h.svc.listSubjects({ curriculumId: fork.id })).toHaveLength(0)
  })

  it('14 — TemplateImmutableError is exported vocabulary (R9); updateCurriculum on a template still succeeds', async () => {
    expect(typeof TemplateImmutableError).toBe('function')
    const err = new TemplateImmutableError('x')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('TemplateImmutableError')
    // No wired throw this slice: updating a template is NOT blocked (BR-LE-S3-2b / R9).
    const { cur } = await sourceTree({ isTemplate: true })
    const upd = await h.svc.updateCurriculum(cur.id, { name: 'Renamed Template' })
    expect(upd.name).toBe('Renamed Template')
  })
})

// ===========================================================================
// S4 — Schedule + class sessions (register `class` sub-type) · ED-4/ED-5 · BR-LE-S4-*
// ===========================================================================
describe('mod-learning-education S4 — schedule + class sessions', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  async function aSubject(title = 'Algorithms') {
    return h.svc.createSubject({ title }) // empty routing allowed (A1)
  }

  // --- registration (BR-LE-S4-1/S4-2) ---------------------------------------
  it('createClassSession before registration surfaces SessionTypeNotFound (ordering)', async () => {
    const subj = await aSubject()
    const err = await h.svc.createClassSession(subj.id, { started_at: Date.now() }).catch((e: unknown) => e as Error)
    expect(err).toBeInstanceOf(SessionTypeNotFound)
  })

  it('registerLearningEducation is idempotent — a 2nd call is a no-op (no throw)', async () => {
    await h.svc.registerLearningEducation()
    await expect(h.svc.registerLearningEducation()).resolves.toBeUndefined()
  })

  it('registers the `class` sub-type as an ADR-004 §3.2 transcription (effects:[] / allowed_effects:[])', async () => {
    await h.svc.registerLearningEducation()
    const def = await h.sessionRegistry.get('class')
    expect(def.sub_type).toBe('class')
    expect(def.owner_module).toBe('learning-education')
    expect(def.effects).toEqual([])
    expect(def.permissions.allowed_effects).toEqual([])
    expect(def.default_purpose).toBeUndefined() // B2 — omitted (No-Guessing)
  })

  // --- setSchedule (BR-LE-S4-3) ---------------------------------------------
  it('setSchedule creates one row; a 2nd call UPDATES (UNIQUE honored, one row)', async () => {
    const subj = await aSubject()
    const s1 = await h.svc.setSchedule(subj.id, { source: 'manual' })
    expect(s1.source).toBe('manual')
    const s2 = await h.svc.setSchedule(subj.id, { source: 'ics' })
    expect(s2.id).toBe(s1.id) // same row, updated
    expect(s2.source).toBe('ics')
  })

  it('setSchedule on an unknown subject throws SubjectNotFoundError', async () => {
    const err = await h.svc.setSchedule('missing', { source: 'manual' }).catch((e: unknown) => e as Error)
    expect(err).toBeInstanceOf(SubjectNotFoundError)
  })

  // --- createClassSession (BR-LE-S4-4/S4-5) ---------------------------------
  it('createClassSession composes a base `class` session + the 1:1 extension + the subject target', async () => {
    await h.svc.registerLearningEducation()
    const subj = await aSubject()
    const at = Date.now()
    const view = await h.svc.createClassSession(subj.id, { started_at: at, location: 'Room 101' })
    // base spine
    expect(view.session.session.sub_type).toBe('class')
    expect(view.session.session.started_at).toBe(at)
    expect(view.session.session.status).toBe('scheduled') // default
    // extension keyed session_id
    expect(view.classSession.session_id).toBe(view.session.session.id)
    expect(view.classSession.subject_id).toBe(subj.id)
    expect(view.classSession.location).toBe('Room 101')
    // the subject is attached as the §3.2.1 target
    const targets = await h.svc.listSessions(subj.id)
    expect(targets).toHaveLength(1)
  })

  it('createClassSession on an unknown subject throws SubjectNotFoundError', async () => {
    await h.svc.registerLearningEducation()
    const err = await h.svc
      .createClassSession('missing', { started_at: Date.now() })
      .catch((e: unknown) => e as Error)
    expect(err).toBeInstanceOf(SubjectNotFoundError)
  })

  // --- listSessions (BR-LE-S4-6) --------------------------------------------
  it('listSessions returns a subject sessions and excludes a soft-deleted base', async () => {
    await h.svc.registerLearningEducation()
    const subj = await aSubject()
    const a = await h.svc.createClassSession(subj.id, { started_at: Date.now() })
    await h.svc.createClassSession(subj.id, { started_at: Date.now() + 1000 })
    expect(await h.svc.listSessions(subj.id)).toHaveLength(2)
    // soft-delete the BASE session of one meeting → excluded from the derived read (base owns lifecycle, BR-LE-S4-6).
    await h.sessions.softDeleteSession(a.session.session.id)
    const after = await h.svc.listSessions(subj.id)
    expect(after).toHaveLength(1)
    expect(after[0].session.session.id).not.toBe(a.session.session.id)
  })

  // --- getWeeklySchedule (BR-LE-S4-6) ---------------------------------------
  it('getWeeklySchedule returns cross-subject meetings in range (inclusive both ends), sorted, excluding out-of-range', async () => {
    await h.svc.registerLearningEducation()
    const math = await aSubject('Math')
    const phys = await aSubject('Physics')
    const base = 1_700_000_000_000
    const end = base + 5000
    await h.svc.createClassSession(math.id, { started_at: base }) // exactly start — included (inclusive)
    await h.svc.createClassSession(phys.id, { started_at: base + 1000 })
    await h.svc.createClassSession(math.id, { started_at: end }) // exactly end — included (inclusive, matches TimeRange)
    await h.svc.createClassSession(math.id, { started_at: end + 1 }) // just past end — excluded
    const week = await h.svc.getWeeklySchedule({ start: base, end })
    // both boundaries render; the out-of-range one does not
    expect(week.map((v) => v.session.session.started_at)).toEqual([base, base + 1000, end])
    // cross-subject
    expect(new Set(week.map((v) => v.classSession.subject_id))).toEqual(new Set([math.id, phys.id]))
  })
})

describe('mod-learning-education S5 — ICS feeds + events (ED-6 · X1/X2/X5/X8/X9/X10)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // A stub `ics?` port over the SAME live store — proves the M1 add-only dedup logic (interpretation.md:54) that a
  // port-absent service can never reach. `createLearningEducationService` is cheap to re-instantiate on the same db.
  function withIcs(events: RawIcsEvent[] | (() => Promise<RawIcsEvent[]>)): LearningEducationService {
    const port: IcsFetchPort = {
      fetchFeed: async () => (typeof events === 'function' ? events() : events),
    }
    return createLearningEducationService({
      db: h.db,
      deviceId: 'test-device',
      sessions: h.sessions,
      sessionRegistry: h.sessionRegistry,
      ics: port,
    })
  }

  const anEvent = (uid: string, over: Partial<RawIcsEvent> = {}): RawIcsEvent => ({
    uid,
    summary: `Lecture ${uid}`,
    start_time: 1_700_000_000_000,
    ...over,
  })

  // --- addFeed (ED-6/X2) ----------------------------------------------------
  it('addFeed stores the feed with DB-default-equal backfill (is_active=true, auto_create_sessions=false)', async () => {
    const feed = await h.svc.addFeed({ url: 'webcal://calendar.ics' })
    expect(feed.feed_url).toBe('webcal://calendar.ics')
    expect(feed.is_active).toBe(true)
    expect(feed.auto_create_sessions).toBe(false) // stored; auto-create is the M2 sync path
    expect(feed.sync_interval_hours).toBe(6) // faithful returned row (create echoes input, not DB defaults)
    expect(feed.last_synced_at).toBeNull()
    expect(feed.default_subject_id).toBeNull()
  })

  it('addFeed persists auto_create_sessions + default_subject_id when given', async () => {
    const subj = await h.svc.createSubject({ title: 'Chemistry' })
    const feed = await h.svc.addFeed({ url: 'u', auto_create_sessions: true, default_subject_id: subj.id })
    const [stored] = await h.svc.listFeeds()
    expect(stored.id).toBe(feed.id)
    expect(stored.auto_create_sessions).toBe(true)
    expect(stored.default_subject_id).toBe(subj.id)
  })

  // --- syncFeed deny-safe (X1/R9) -------------------------------------------
  it('syncFeed with the ics? port ABSENT throws IcsUnavailableError (live fetch = M2)', async () => {
    const feed = await h.svc.addFeed({ url: 'u' })
    const err = await h.svc.syncFeed(feed.id).catch((e: unknown) => e as Error)
    expect(err).toBeInstanceOf(IcsUnavailableError)
  })

  it('syncFeed on an unknown feed throws IcsFeedNotFoundError (before the port check)', async () => {
    const err = await h.svc.syncFeed('missing').catch((e: unknown) => e as Error)
    expect(err).toBeInstanceOf(IcsFeedNotFoundError)
  })

  // --- syncFeed success + add-only dedup (X8/X10) ---------------------------
  it('syncFeed (stub port) adds events, stamps last_synced_at, clears last_error', async () => {
    const feed = await h.svc.addFeed({ url: 'u' })
    const svcIcs = withIcs([anEvent('a'), anEvent('b')])
    const res = await svcIcs.syncFeed(feed.id)
    expect(res).toEqual({ added: 2, skipped: 0 })
    const events = await h.svc.listEvents(feed.id)
    expect(events).toHaveLength(2)
    expect(new Set(events.map((e) => e.uid))).toEqual(new Set(['a', 'b']))
    // events start unmatched (R7) and not ignored
    expect(events.every((e) => e.matched_subject_id === null && !e.is_ignored)).toBe(true)
    expect(events.every((e) => e.created_session_id === null)).toBe(true) // auto-create is M2
    const [stored] = await h.svc.listFeeds()
    expect(stored.last_synced_at).not.toBeNull()
    expect(stored.last_error).toBeNull()
  })

  it('syncFeed is add-only: a re-sync skips events already present by UNIQUE(feed_id,uid)', async () => {
    const feed = await h.svc.addFeed({ url: 'u' })
    await withIcs([anEvent('a'), anEvent('b')]).syncFeed(feed.id)
    // second sync returns a+b (dup) plus a new c → only c is added
    const res = await withIcs([anEvent('a'), anEvent('b'), anEvent('c')]).syncFeed(feed.id)
    expect(res).toEqual({ added: 1, skipped: 2 })
    expect(await h.svc.listEvents(feed.id)).toHaveLength(3)
  })

  it('syncFeed dedup counts an IGNORED event as present — a re-sync never resurrects it (X8)', async () => {
    const feed = await h.svc.addFeed({ url: 'u' })
    await withIcs([anEvent('a')]).syncFeed(feed.id)
    const [ev] = await h.svc.listEvents(feed.id)
    await h.svc.ignoreEvent(ev.id)
    const res = await withIcs([anEvent('a')]).syncFeed(feed.id)
    expect(res).toEqual({ added: 0, skipped: 1 })
    const events = await h.svc.listEvents(feed.id)
    expect(events).toHaveLength(1)
    expect(events[0].is_ignored).toBe(true)
  })

  // --- syncFeed fetch failure (never silent-stale) --------------------------
  it('syncFeed persists last_error BEFORE throwing IcsSyncError when the port throws', async () => {
    const feed = await h.svc.addFeed({ url: 'u' })
    const svcIcs = withIcs(() => Promise.reject(new Error('network down')))
    const err = await svcIcs.syncFeed(feed.id).catch((e: unknown) => e as Error)
    expect(err).toBeInstanceOf(IcsSyncError)
    const [stored] = await h.svc.listFeeds()
    expect(stored.last_error).toBe('network down') // written before the throw — never silent-stale
    expect(stored.last_synced_at).toBeNull() // failure did not stamp success
  })

  // --- matchEvent (X5) ------------------------------------------------------
  it('matchEvent sets matched_subject_id and returns the event (never spawns a session at M1)', async () => {
    const feed = await h.svc.addFeed({ url: 'u' })
    await withIcs([anEvent('a')]).syncFeed(feed.id)
    const subj = await h.svc.createSubject({ title: 'Biology' })
    const [ev] = await h.svc.listEvents(feed.id)
    const matched = await h.svc.matchEvent(ev.id, { subject_id: subj.id })
    expect(matched.matched_subject_id).toBe(subj.id)
    expect(matched.created_session_id).toBeNull() // no session spawned (M2 auto-create path)
    // no class session was created as a side effect
    expect(await h.svc.listSessions(subj.id)).toHaveLength(0)
  })

  it('matchEvent on an unknown event throws IcsEventNotFoundError', async () => {
    const subj = await h.svc.createSubject({ title: 'Bio' })
    const err = await h.svc.matchEvent('missing', { subject_id: subj.id }).catch((e: unknown) => e as Error)
    expect(err).toBeInstanceOf(IcsEventNotFoundError)
  })

  it('matchEvent to an unknown subject throws SubjectNotFoundError (no dangling ref)', async () => {
    const feed = await h.svc.addFeed({ url: 'u' })
    await withIcs([anEvent('a')]).syncFeed(feed.id)
    const [ev] = await h.svc.listEvents(feed.id)
    const err = await h.svc.matchEvent(ev.id, { subject_id: 'missing' }).catch((e: unknown) => e as Error)
    expect(err).toBeInstanceOf(SubjectNotFoundError)
  })

  // --- ignoreEvent / setFeedActive (X8/X9 — never delete) -------------------
  it('ignoreEvent sets is_ignored without deleting the row', async () => {
    const feed = await h.svc.addFeed({ url: 'u' })
    await withIcs([anEvent('a')]).syncFeed(feed.id)
    const [ev] = await h.svc.listEvents(feed.id)
    await h.svc.ignoreEvent(ev.id)
    const events = await h.svc.listEvents(feed.id)
    expect(events).toHaveLength(1) // still present (X8 — never delete)
    expect(events[0].is_ignored).toBe(true)
  })

  it('ignoreEvent on an unknown event throws IcsEventNotFoundError', async () => {
    const err = await h.svc.ignoreEvent('missing').catch((e: unknown) => e as Error)
    expect(err).toBeInstanceOf(IcsEventNotFoundError)
  })

  it('setFeedActive revokes/restores via is_active without deleting (X9)', async () => {
    const feed = await h.svc.addFeed({ url: 'u' })
    const revoked = await h.svc.setFeedActive(feed.id, false)
    expect(revoked.is_active).toBe(false)
    expect(await h.svc.listFeeds()).toHaveLength(1) // still present (never deleted)
    const restored = await h.svc.setFeedActive(feed.id, true)
    expect(restored.is_active).toBe(true)
  })

  it('setFeedActive on an unknown feed throws IcsFeedNotFoundError', async () => {
    const err = await h.svc.setFeedActive('missing', false).catch((e: unknown) => e as Error)
    expect(err).toBeInstanceOf(IcsFeedNotFoundError)
  })

  // --- listEvents (R7) ------------------------------------------------------
  it('listEvents returns ignored + unmatched events (UI surfaces unmatched for manual match)', async () => {
    const feed = await h.svc.addFeed({ url: 'u' })
    await withIcs([anEvent('a'), anEvent('b')]).syncFeed(feed.id)
    const [first] = await h.svc.listEvents(feed.id)
    await h.svc.ignoreEvent(first.id)
    const all = await h.svc.listEvents(feed.id)
    expect(all).toHaveLength(2) // both surface, ignored included
  })
})

describe('mod-learning-education S6 — grading systems + components (ED-7 · H3)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  async function aSubjectScope(title = 'Algorithms') {
    const subj = await h.svc.createSubject({ title })
    return { type: 'subject' as const, id: subj.id }
  }

  const comp = (component_type: 'homework' | 'exam' | 'quiz', weight: number | null, max_points?: number) => ({
    component_type,
    weight,
    ...(max_points != null ? { max_points } : {}),
  })

  // --- createGradingSystem happy path (weights sum 100%) --------------------
  it('createGradingSystem builds the system + components; weights summing to 100% pass', async () => {
    const scope = await aSubjectScope()
    const view = await h.svc.createGradingSystem(scope, {
      name: 'Standard',
      scale_type: 'numeric',
      components: [comp('homework', 3000), comp('exam', 7000)],
    })
    expect(view.system.scope).toBe('subject')
    expect(view.system.scope_id).toBe(scope.id)
    expect(view.system.scale_type).toBe('numeric')
    expect(view.components).toHaveLength(2)
    expect(view.components.every((c) => c.grading_system_id === view.system.id)).toBe(true)
    // persisted + readable
    const got = await h.svc.getGradingSystem(view.system.id)
    expect(got?.components).toHaveLength(2)
  })

  it('scale_config round-trips through JSON serialize/parse (custom scale)', async () => {
    const scope = await aSubjectScope()
    const cfg = { bands: [{ min: 90, grade: 'A' }, { min: 80, grade: 'B' }] }
    const view = await h.svc.createGradingSystem(scope, {
      name: 'Custom',
      scale_type: 'custom',
      scale_config: cfg,
      components: [comp('exam', 10000)],
    })
    expect(view.system.scale_config).toEqual(cfg)
    const got = await h.svc.getGradingSystem(view.system.id)
    expect(got?.system.scale_config).toEqual(cfg)
  })

  // --- weight rule (contract.md:63 — flag, never normalize) -----------------
  it('weights summing ≠ 100% throw GradingWeightError (never normalized)', async () => {
    const scope = await aSubjectScope()
    const err = await h.svc
      .createGradingSystem(scope, {
        name: 'Bad',
        scale_type: 'numeric',
        components: [comp('homework', 3000), comp('exam', 4000)], // 70%
      })
      .catch((e: unknown) => e as Error)
    expect(err).toBeInstanceOf(GradingWeightError)
    // nothing was persisted (validated before any write)
    expect(await h.svc.listGradingSystems(scope)).toHaveLength(0)
  })

  it('an all-null-weight system (pass_fail / points) is unconstrained — no error', async () => {
    const scope = await aSubjectScope()
    const view = await h.svc.createGradingSystem(scope, {
      name: 'Pass/Fail',
      scale_type: 'pass_fail',
      components: [comp('exam', null, 100), comp('quiz', null, 50)],
    })
    expect(view.components).toHaveLength(2)
    expect(view.components.every((c) => c.weight === null)).toBe(true)
  })

  it('a system with no components is allowed (empty builder)', async () => {
    const scope = await aSubjectScope()
    const view = await h.svc.createGradingSystem(scope, { name: 'Empty', scale_type: 'letter', components: [] })
    expect(view.components).toHaveLength(0)
  })

  it('a single weight of exactly 100% passes; a mixed weight+null set sums only the non-null weights', async () => {
    const scope = await aSubjectScope()
    const view = await h.svc.createGradingSystem(scope, {
      name: 'Mixed',
      scale_type: 'numeric',
      components: [comp('exam', 10000), comp('homework', null, 20)], // non-null sum = 10000 → ok
    })
    expect(view.components).toHaveLength(2)
  })

  // --- scope validation (fail-loud, no dangling ref) ------------------------
  it('an unknown institution/program/subject scope throws the matching NotFoundError', async () => {
    const e1 = await h.svc
      .createGradingSystem({ type: 'institution', id: 'ghost' }, { name: 'x', scale_type: 'letter', components: [] })
      .catch((e: unknown) => e as Error)
    expect(e1).toBeInstanceOf(InstitutionNotFoundError)
    const e2 = await h.svc
      .createGradingSystem({ type: 'program', id: 'ghost' }, { name: 'x', scale_type: 'letter', components: [] })
      .catch((e: unknown) => e as Error)
    expect(e2).toBeInstanceOf(ProgramNotFoundError)
    const e3 = await h.svc
      .createGradingSystem({ type: 'subject', id: 'ghost' }, { name: 'x', scale_type: 'letter', components: [] })
      .catch((e: unknown) => e as Error)
    expect(e3).toBeInstanceOf(SubjectNotFoundError)
  })

  // --- weight:0 is a non-null weighted component (distinct from unset) -------
  it('a lone weight:0 component is flagged (0 ≠ 100%) — 0 is a weight, not "unset"', async () => {
    const scope = await aSubjectScope()
    const err = await h.svc
      .createGradingSystem(scope, { name: 'Zero', scale_type: 'numeric', components: [comp('exam', 0)] })
      .catch((e: unknown) => e as Error)
    expect(err).toBeInstanceOf(GradingWeightError)
  })

  // --- getGradingSystem / listGradingSystems --------------------------------
  it('getGradingSystem returns null for an unknown id', async () => {
    expect(await h.svc.getGradingSystem('missing')).toBeNull()
  })

  it('getGradingSystem excludes a soft-deleted component (deleted_at filter)', async () => {
    const scope = await aSubjectScope()
    const view = await h.svc.createGradingSystem(scope, {
      name: 'S',
      scale_type: 'numeric',
      components: [comp('homework', 3000), comp('exam', 7000)],
    })
    expect((await h.svc.getGradingSystem(view.system.id))?.components).toHaveLength(2)
    // genuinely soft-delete one component in the live store, then assert it drops out of the view
    const victim = view.components[0].id
    h.bsql.prepare('UPDATE grading_components SET deleted_at = ? WHERE id = ?').run(Date.now(), victim)
    const after = await h.svc.getGradingSystem(view.system.id)
    expect(after?.components).toHaveLength(1)
    expect(after?.components[0].id).not.toBe(victim)
  })

  it('listGradingSystems filters by scope + scope_id', async () => {
    const scopeA = await aSubjectScope('Math')
    const scopeB = await aSubjectScope('Physics')
    await h.svc.createGradingSystem(scopeA, { name: 'A', scale_type: 'letter', components: [] })
    await h.svc.createGradingSystem(scopeA, { name: 'A2', scale_type: 'numeric', components: [] })
    await h.svc.createGradingSystem(scopeB, { name: 'B', scale_type: 'letter', components: [] })
    expect(await h.svc.listGradingSystems(scopeA)).toHaveLength(2)
    expect(await h.svc.listGradingSystems(scopeB)).toHaveLength(1)
  })
})

describe('mod-learning-education S7 — assessments + grade/GPA compute (ED-8 · ED-7 compute · AI6)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // A subject + a 2-component weighted system (hw 30% / exam 70%, both max_points 100 unless overridden).
  async function subjectWithSystem(opts?: { weights?: [number | null, number | null]; max?: [number?, number?] }) {
    const subj = await h.svc.createSubject({ title: 'Algorithms' })
    const view = await h.svc.createGradingSystem(
      { type: 'subject', id: subj.id },
      {
        name: 'Std',
        scale_type: 'numeric',
        components: [
          { component_type: 'homework', weight: opts?.weights?.[0] ?? 3000, max_points: opts?.max?.[0] ?? 100 },
          { component_type: 'exam', weight: opts?.weights?.[1] ?? 7000, max_points: opts?.max?.[1] ?? 100 },
        ],
      },
    )
    return { subjectId: subj.id, hw: view.components[0], exam: view.components[1], system: view.system }
  }
  // create + record an assessment mapped to a component.
  async function recorded(
    subjectId: string,
    componentId: string | null,
    score: number,
    extra?: { max_points?: number; type?: 'exam' | 'quiz' | 'test' },
  ) {
    const a = await h.svc.createAssessment(subjectId, {
      type: extra?.type ?? 'exam',
      grading_component_id: componentId,
      ...(extra?.max_points != null ? { max_points: extra.max_points } : {}),
    })
    return h.svc.recordResult(a.id, { score })
  }

  // --- createAssessment ------------------------------------------------------
  it('createAssessment writes a row (score null, source defaults manual) mapped to a component', async () => {
    const { subjectId, hw } = await subjectWithSystem()
    const a = await h.svc.createAssessment(subjectId, { type: 'exam', grading_component_id: hw.id })
    expect(a.subject_id).toBe(subjectId)
    expect(a.score).toBeNull()
    expect(a.source).toBe('manual') // service backfill, not the DB default (create-echoes-input)
    expect(a.grading_component_id).toBe(hw.id)
  })

  it('createAssessment on an unknown subject → SubjectNotFoundError', async () => {
    await expect(h.svc.createAssessment('ghost', { type: 'exam' })).rejects.toThrow(SubjectNotFoundError)
  })

  it('createAssessment with an unresolvable grading_component_id → GradingComponentNotFoundError', async () => {
    const { subjectId } = await subjectWithSystem()
    await expect(
      h.svc.createAssessment(subjectId, { type: 'exam', grading_component_id: 'ghost' }),
    ).rejects.toThrow(GradingComponentNotFoundError)
  })

  it('createAssessment accepts a null grading_component_id (unmapped is allowed)', async () => {
    const { subjectId } = await subjectWithSystem()
    const a = await h.svc.createAssessment(subjectId, { type: 'work', grading_component_id: null })
    expect(a.grading_component_id).toBeNull()
  })

  // --- recordResult ----------------------------------------------------------
  it('recordResult sets the score only and returns the updated assessment', async () => {
    const { subjectId, exam } = await subjectWithSystem()
    const a = await h.svc.createAssessment(subjectId, { type: 'exam', grading_component_id: exam.id })
    const updated = await h.svc.recordResult(a.id, { score: 88 })
    expect(updated.id).toBe(a.id)
    expect(updated.score).toBe(88)
  })

  it('recordResult on an unknown id → AssessmentNotFoundError', async () => {
    await expect(h.svc.recordResult('ghost', { score: 50 })).rejects.toThrow(AssessmentNotFoundError)
  })

  // --- listAssessments -------------------------------------------------------
  it('listAssessments filters by subject / type / date range and excludes soft-deleted', async () => {
    const { subjectId, hw, exam } = await subjectWithSystem()
    await h.svc.createAssessment(subjectId, { type: 'exam', grading_component_id: exam.id, date: '2026-03-10' })
    await h.svc.createAssessment(subjectId, { type: 'quiz', grading_component_id: hw.id, date: '2026-05-20' })
    const other = await h.svc.createSubject({ title: 'Other' })
    await h.svc.createAssessment(other.id, { type: 'exam' })

    expect(await h.svc.listAssessments({ subject_id: subjectId })).toHaveLength(2)
    expect(await h.svc.listAssessments({ subject_id: subjectId, type: 'quiz' })).toHaveLength(1)
    const inRange = await h.svc.listAssessments({ subject_id: subjectId, range: { start: '2026-01-01', end: '2026-04-01' } })
    expect(inRange).toHaveLength(1)
    expect(inRange[0].type).toBe('exam')

    // soft-delete one in the live store → drops out
    const all = await h.svc.listAssessments({ subject_id: subjectId })
    h.bsql.prepare('UPDATE assessments SET deleted_at = ? WHERE id = ?').run(Date.now(), all[0].id)
    expect(await h.svc.listAssessments({ subject_id: subjectId })).toHaveLength(1)
  })

  // --- computeGrade: happy + flags ------------------------------------------
  it('computeGrade weighted happy path: hw 80/100 ×0.3 + exam 90/100 ×0.7 = 0.87', async () => {
    const { subjectId, hw, exam } = await subjectWithSystem()
    await recorded(subjectId, hw.id, 80)
    await recorded(subjectId, exam.id, 90)
    const g = await h.svc.computeGrade(subjectId)
    expect(g.grade).toBeCloseTo(0.87, 5)
    expect(g.flags).toHaveLength(0)
    expect(g.systemScope).toBe('subject')
    expect(g.systemId).not.toBeNull()
  })

  it('computeGrade flags incomplete when a component has no scored assessment', async () => {
    const { subjectId, exam } = await subjectWithSystem()
    await recorded(subjectId, exam.id, 90) // hw unscored
    const g = await h.svc.computeGrade(subjectId)
    expect(g.flags).toContain('incomplete')
    expect(g.grade).toBeCloseTo(0.9, 5) // only exam counted (un-rated hw excluded)
  })

  it('computeGrade with no system anywhere → grade null + no-system', async () => {
    const subj = await h.svc.createSubject({ title: 'Ungraded' })
    const g = await h.svc.computeGrade(subj.id)
    expect(g.grade).toBeNull()
    expect(g.flags).toEqual(['no-system'])
    expect(g.systemId).toBeNull()
  })

  it('computeGrade flags unmapped-assessments for a null grading_component_id', async () => {
    const { subjectId, exam } = await subjectWithSystem()
    await recorded(subjectId, exam.id, 90)
    await recorded(subjectId, null, 50) // scored but unmapped
    const g = await h.svc.computeGrade(subjectId)
    expect(g.flags).toContain('unmapped-assessments')
  })

  it('computeGrade flags unmapped-assessments for a FOREIGN component id (B3 — never silent)', async () => {
    const { subjectId, exam } = await subjectWithSystem()
    // a component that belongs to a DIFFERENT subject's system
    const other = await subjectWithSystem()
    await recorded(subjectId, exam.id, 90)
    await recorded(subjectId, other.hw.id, 50) // non-null id, but ∉ this subject's resolved system
    const g = await h.svc.computeGrade(subjectId)
    expect(g.flags).toContain('unmapped-assessments')
  })

  it('computeGrade flags missing-scale when a scored assessment has no max anywhere', async () => {
    // a component with NO max_points (pass_fail/points-less) + an assessment with no max → cannot normalize
    const subj = await h.svc.createSubject({ title: 'Scaleless' })
    const view = await h.svc.createGradingSystem(
      { type: 'subject', id: subj.id },
      { name: 'S', scale_type: 'pass_fail', components: [{ component_type: 'exam', weight: 10000 }] },
    )
    await recorded(subj.id, view.components[0].id, 90) // no assessment max either
    const g = await h.svc.computeGrade(subj.id)
    expect(g.flags).toContain('missing-scale')
  })

  it('computeGrade uses the assessment max_points over the component template (more-specific-wins)', async () => {
    // single component weighted 100%, component max 100; assessment overrides max to 50 → 40/50 = 0.8 (not 0.4)
    const subj = await h.svc.createSubject({ title: 'One' })
    const view = await h.svc.createGradingSystem(
      { type: 'subject', id: subj.id },
      { name: 'S', scale_type: 'numeric', components: [{ component_type: 'exam', weight: 10000, max_points: 100 }] },
    )
    await recorded(subj.id, view.components[0].id, 40, { max_points: 50 })
    const g = await h.svc.computeGrade(subj.id)
    expect(g.grade).toBeCloseTo(0.8, 5)
  })

  it('computeGrade clamps score > maxPoints to 1.0 (extra credit, N3)', async () => {
    const subj = await h.svc.createSubject({ title: 'Extra' })
    const view = await h.svc.createGradingSystem(
      { type: 'subject', id: subj.id },
      { name: 'S', scale_type: 'numeric', components: [{ component_type: 'exam', weight: 10000, max_points: 100 }] },
    )
    await recorded(subj.id, view.components[0].id, 110)
    const g = await h.svc.computeGrade(subj.id)
    expect(g.grade).toBe(1)
  })

  it('computeGrade with a system but no assessments → grade null (never 0)', async () => {
    const { subjectId } = await subjectWithSystem()
    const g = await h.svc.computeGrade(subjectId)
    expect(g.grade).toBeNull()
    expect(g.flags).toContain('incomplete')
  })

  it('computeGrade flags ambiguous-system when >1 live system at the chosen scope (picks one, does not throw)', async () => {
    const subj = await h.svc.createSubject({ title: 'Dup' })
    const scope = { type: 'subject' as const, id: subj.id }
    const s1 = await h.svc.createGradingSystem(scope, { name: 'S1', scale_type: 'numeric', components: [{ component_type: 'exam', weight: 10000, max_points: 100 }] })
    const s2 = await h.svc.createGradingSystem(scope, { name: 'S2', scale_type: 'letter', components: [{ component_type: 'exam', weight: 10000, max_points: 100 }] })
    const g = await h.svc.computeGrade(subj.id)
    expect(g.flags).toContain('ambiguous-system')
    expect([s1.system.id, s2.system.id]).toContain(g.systemId)
  })

  it('computeGrade result shape matches §3b (components breakdown + scale metadata)', async () => {
    const { subjectId, hw, exam } = await subjectWithSystem()
    await recorded(subjectId, hw.id, 80)
    await recorded(subjectId, exam.id, 90)
    const g = await h.svc.computeGrade(subjectId)
    expect(g).toMatchObject({ subjectId, scaleType: 'numeric', scaleConfig: null })
    expect(g.components).toHaveLength(2)
    const examRow = g.components.find((c) => c.componentId === exam.id)!
    expect(examRow).toMatchObject({ componentType: 'exam', weight: 7000, assessmentCount: 1 })
    expect(examRow.progress).toBeCloseTo(0.9, 5)
  })

  it('computeGrade on an unknown subject → SubjectNotFoundError', async () => {
    await expect(h.svc.computeGrade('ghost')).rejects.toThrow(SubjectNotFoundError)
  })

  // --- computeGrade: scope inheritance (BR-LE-S7-3) --------------------------
  it('computeGrade inherits the PROGRAM system when the subject has none', async () => {
    const inst = await h.svc.createInstitution({ name: 'MIT' })
    const prog = await h.svc.createProgram({ type: 'institution', id: inst.id }, { name: 'BSc' })
    const cur = await h.svc.createCurriculum(prog.id, { name: 'c' })
    const subj = await h.svc.createSubject({ title: 'Algo', curriculum_id: cur.id })
    const sys = await h.svc.createGradingSystem(
      { type: 'program', id: prog.id },
      { name: 'ProgSys', scale_type: 'numeric', components: [{ component_type: 'exam', weight: 10000, max_points: 100 }] },
    )
    await recorded(subj.id, sys.components[0].id, 70)
    const g = await h.svc.computeGrade(subj.id)
    expect(g.systemScope).toBe('program')
    expect(g.systemId).toBe(sys.system.id)
    expect(g.grade).toBeCloseTo(0.7, 5)
  })

  it('computeGrade inherits the INSTITUTION system up the chain', async () => {
    const inst = await h.svc.createInstitution({ name: 'MIT' })
    const prog = await h.svc.createProgram({ type: 'institution', id: inst.id }, { name: 'BSc' })
    const cur = await h.svc.createCurriculum(prog.id, { name: 'c' })
    const subj = await h.svc.createSubject({ title: 'Algo', curriculum_id: cur.id })
    await h.svc.createGradingSystem(
      { type: 'institution', id: inst.id },
      { name: 'InstSys', scale_type: 'letter', components: [{ component_type: 'exam', weight: 10000, max_points: 100 }] },
    )
    const g = await h.svc.computeGrade(subj.id)
    expect(g.systemScope).toBe('institution')
  })

  it('a subject-scope system WINS over program/institution', async () => {
    const inst = await h.svc.createInstitution({ name: 'MIT' })
    const prog = await h.svc.createProgram({ type: 'institution', id: inst.id }, { name: 'BSc' })
    const cur = await h.svc.createCurriculum(prog.id, { name: 'c' })
    const subj = await h.svc.createSubject({ title: 'Algo', curriculum_id: cur.id })
    await h.svc.createGradingSystem({ type: 'institution', id: inst.id }, { name: 'I', scale_type: 'letter', components: [] })
    await h.svc.createGradingSystem({ type: 'subject', id: subj.id }, { name: 'Sub', scale_type: 'numeric', components: [] })
    const g = await h.svc.computeGrade(subj.id)
    expect(g.systemScope).toBe('subject')
  })

  it('inheritance stops at program for a self_taught-rooted program (no institution tier, no crash)', async () => {
    const path = await h.svc.createSelfTaughtPath({ name: 'Self: Rust' })
    const prog = await h.svc.createProgram({ type: 'self_taught', id: path.id }, { name: 'Rust track' })
    const cur = await h.svc.createCurriculum(prog.id, { name: 'c' })
    const subj = await h.svc.createSubject({ title: 'Ownership', curriculum_id: cur.id })
    const g = await h.svc.computeGrade(subj.id) // no system anywhere → no-system, resolved without touching institution
    expect(g.flags).toEqual(['no-system'])
  })

  // --- computeGPA ------------------------------------------------------------
  it('computeGPA over a TERM rolls up its subjects equal-weight', async () => {
    const inst = await h.svc.createInstitution({ name: 'MIT' })
    const prog = await h.svc.createProgram({ type: 'institution', id: inst.id }, { name: 'BSc' })
    const cur = await h.svc.createCurriculum(prog.id, { name: 'c' })
    const term = await h.svc.createTerm(cur.id, { level: 'semester', name: 'Fall' })
    const mkGraded = async (title: string, score: number) => {
      const s = await h.svc.createSubject({ title, term_id: term.id, curriculum_id: cur.id })
      const sys = await h.svc.createGradingSystem({ type: 'subject', id: s.id }, { name: title, scale_type: 'numeric', components: [{ component_type: 'exam', weight: 10000, max_points: 100 }] })
      await recorded(s.id, sys.components[0].id, score)
      return s
    }
    await mkGraded('A', 80) // 0.8
    await mkGraded('B', 100) // 1.0
    const gpa = await h.svc.computeGPA({ type: 'term', id: term.id })
    expect(gpa.gpa).toBeCloseTo(0.9, 5) // equal-weight (0.8+1.0)/2
    expect(gpa.flagged).toBe(false)
    expect(gpa.perSubject).toHaveLength(2)
  })

  it('computeGPA over a CURRICULUM unions curriculum_id + term subjects', async () => {
    const inst = await h.svc.createInstitution({ name: 'MIT' })
    const prog = await h.svc.createProgram({ type: 'institution', id: inst.id }, { name: 'BSc' })
    const cur = await h.svc.createCurriculum(prog.id, { name: 'c' })
    const term = await h.svc.createTerm(cur.id, { level: 'semester', name: 'Fall' })
    const graded = async (opts: { curriculum_id?: string; term_id?: string }, score: number) => {
      const s = await h.svc.createSubject({ title: 'X', ...opts })
      const sys = await h.svc.createGradingSystem({ type: 'subject', id: s.id }, { name: 'X', scale_type: 'numeric', components: [{ component_type: 'exam', weight: 10000, max_points: 100 }] })
      await recorded(s.id, sys.components[0].id, score)
    }
    await graded({ curriculum_id: cur.id }, 60) // direct curriculum child
    await graded({ term_id: term.id, curriculum_id: cur.id }, 100) // via term
    const gpa = await h.svc.computeGPA({ type: 'curriculum', id: cur.id })
    expect(gpa.perSubject).toHaveLength(2)
    expect(gpa.gpa).toBeCloseTo(0.8, 5)
  })

  it('computeGPA is flagged when any subject is partial/missing', async () => {
    const inst = await h.svc.createInstitution({ name: 'MIT' })
    const prog = await h.svc.createProgram({ type: 'institution', id: inst.id }, { name: 'BSc' })
    const cur = await h.svc.createCurriculum(prog.id, { name: 'c' })
    const term = await h.svc.createTerm(cur.id, { level: 'semester', name: 'Fall' })
    const graded = await h.svc.createSubject({ title: 'Graded', term_id: term.id, curriculum_id: cur.id })
    const sys = await h.svc.createGradingSystem({ type: 'subject', id: graded.id }, { name: 'G', scale_type: 'numeric', components: [{ component_type: 'exam', weight: 10000, max_points: 100 }] })
    await recorded(graded.id, sys.components[0].id, 90)
    await h.svc.createSubject({ title: 'NoSystem', term_id: term.id, curriculum_id: cur.id }) // no system → partial
    const gpa = await h.svc.computeGPA({ type: 'term', id: term.id })
    expect(gpa.flagged).toBe(true)
    expect(gpa.perSubject).toHaveLength(2)
  })

  it('computeGPA over an empty subject set → gpa null, flagged true', async () => {
    const inst = await h.svc.createInstitution({ name: 'MIT' })
    const prog = await h.svc.createProgram({ type: 'institution', id: inst.id }, { name: 'BSc' })
    const cur = await h.svc.createCurriculum(prog.id, { name: 'c' })
    const term = await h.svc.createTerm(cur.id, { level: 'semester', name: 'Empty' })
    const gpa = await h.svc.computeGPA({ type: 'term', id: term.id })
    expect(gpa.gpa).toBeNull()
    expect(gpa.flagged).toBe(true)
    expect(gpa.perSubject).toHaveLength(0)
  })

  it('computeGPA on an unknown term/curriculum → typed NotFound', async () => {
    await expect(h.svc.computeGPA({ type: 'term', id: 'ghost' })).rejects.toThrow(TermNotFoundError)
    await expect(h.svc.computeGPA({ type: 'curriculum', id: 'ghost' })).rejects.toThrow(CurriculumNotFoundError)
  })
})

describe('mod-learning-education S8 — education measurement (ED-10 · M1/M2/M3)', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // A subject with a single-component 100% system (max 100), one assessment recorded at `score` → grade = score/100.
  async function gradedSubject(score: number, title = 'Graded') {
    const subj = await h.svc.createSubject({ title })
    const view = await h.svc.createGradingSystem(
      { type: 'subject', id: subj.id },
      { name: 'S', scale_type: 'numeric', components: [{ component_type: 'exam', weight: 10000, max_points: 100 }] },
    )
    const a = await h.svc.createAssessment(subj.id, { type: 'exam', grading_component_id: view.components[0].id })
    await h.svc.recordResult(a.id, { score })
    return subj.id
  }

  // --- setMeasurement --------------------------------------------------------
  it('setMeasurement creates one row (progress null, binding_mode null when omitted)', async () => {
    const subj = await h.svc.createSubject({ title: 'M' })
    const m = await h.svc.setMeasurement({ type: 'subject', id: subj.id }, { measurement_kind: 'quantitative' })
    expect(m.ref_type).toBe('subject')
    expect(m.ref_id).toBe(subj.id)
    expect(m.measurement_kind).toBe('quantitative')
    expect(m.binding_mode).toBeNull()
    expect(m.progress).toBeNull()
  })

  it('setMeasurement is one-per-ref upsert (2nd call updates kind/mode, still one row)', async () => {
    const subj = await h.svc.createSubject({ title: 'M' })
    const ref = { type: 'subject' as const, id: subj.id }
    const first = await h.svc.setMeasurement(ref, { measurement_kind: 'quantitative' })
    const second = await h.svc.setMeasurement(ref, { measurement_kind: 'milestone', binding_mode: 'derived-pull' })
    expect(second.id).toBe(first.id) // same row updated
    expect(second.measurement_kind).toBe('milestone')
    expect(second.binding_mode).toBe('derived-pull')
  })

  it('setMeasurement on an unknown subject/program → typed NotFound', async () => {
    await expect(
      h.svc.setMeasurement({ type: 'subject', id: 'ghost' }, { measurement_kind: 'quantitative' }),
    ).rejects.toThrow(SubjectNotFoundError)
    await expect(
      h.svc.setMeasurement({ type: 'program', id: 'ghost' }, { measurement_kind: 'quantitative' }),
    ).rejects.toThrow(ProgramNotFoundError)
  })

  it('setMeasurement requires measurement_kind (Zod parse error when omitted)', async () => {
    const subj = await h.svc.createSubject({ title: 'M' })
    // @ts-expect-error — measurement_kind is required; omitting it must fail at parse
    await expect(h.svc.setMeasurement({ type: 'subject', id: subj.id }, {})).rejects.toThrow()
  })

  // --- getProgress: subject --------------------------------------------------
  it('getProgress with no measurement row → null (unmeasured)', async () => {
    const subj = await h.svc.createSubject({ title: 'Unconfigured' })
    expect(await h.svc.getProgress({ type: 'subject', id: subj.id })).toBeNull()
  })

  it('getProgress subject derived-pull → round(grade×100); grade 0.87 → 87', async () => {
    // 30/70 system, hw 80 + exam 90 → 0.87
    const subj = await h.svc.createSubject({ title: 'G' })
    const view = await h.svc.createGradingSystem(
      { type: 'subject', id: subj.id },
      {
        name: 'S',
        scale_type: 'numeric',
        components: [
          { component_type: 'homework', weight: 3000, max_points: 100 },
          { component_type: 'exam', weight: 7000, max_points: 100 },
        ],
      },
    )
    await h.svc.recordResult((await h.svc.createAssessment(subj.id, { type: 'quiz', grading_component_id: view.components[0].id })).id, { score: 80 })
    await h.svc.recordResult((await h.svc.createAssessment(subj.id, { type: 'exam', grading_component_id: view.components[1].id })).id, { score: 90 })
    await h.svc.setMeasurement({ type: 'subject', id: subj.id }, { measurement_kind: 'quantitative', binding_mode: 'derived-pull' })
    expect(await h.svc.getProgress({ type: 'subject', id: subj.id })).toBe(87)
  })

  it('getProgress subject with binding_mode null (derive-by-default) also pulls the grade', async () => {
    const sid = await gradedSubject(70)
    await h.svc.setMeasurement({ type: 'subject', id: sid }, { measurement_kind: 'quantitative' }) // no mode
    expect(await h.svc.getProgress({ type: 'subject', id: sid })).toBe(70)
  })

  it('getProgress subject manual / event-trigger → null (no auto-derivation at M1)', async () => {
    const sid = await gradedSubject(90)
    await h.svc.setMeasurement({ type: 'subject', id: sid }, { measurement_kind: 'quantitative', binding_mode: 'manual' })
    expect(await h.svc.getProgress({ type: 'subject', id: sid })).toBeNull()
    await h.svc.setMeasurement({ type: 'subject', id: sid }, { measurement_kind: 'quantitative', binding_mode: 'event-trigger' })
    expect(await h.svc.getProgress({ type: 'subject', id: sid })).toBeNull()
  })

  it('getProgress subject derived-pull but UNGRADED → null (never 0)', async () => {
    const subj = await h.svc.createSubject({ title: 'NoGrade' })
    await h.svc.setMeasurement({ type: 'subject', id: subj.id }, { measurement_kind: 'quantitative', binding_mode: 'derived-pull' })
    expect(await h.svc.getProgress({ type: 'subject', id: subj.id })).toBeNull()
  })

  it('a stored progress override (0–100) wins over derivation', async () => {
    const sid = await gradedSubject(90)
    const m = await h.svc.setMeasurement({ type: 'subject', id: sid }, { measurement_kind: 'quantitative', binding_mode: 'derived-pull' })
    // no M1 setter for the override → set it directly in the live store
    h.bsql.prepare('UPDATE education_measurements SET progress = ? WHERE id = ?').run(42, m.id)
    expect(await h.svc.getProgress({ type: 'subject', id: sid })).toBe(42) // override, not the derived 90
  })

  // --- getProgress: program rollup -------------------------------------------
  it('getProgress program → equal-weight rollup of its subjects (80 & 100 → 90)', async () => {
    const inst = await h.svc.createInstitution({ name: 'MIT' })
    const prog = await h.svc.createProgram({ type: 'institution', id: inst.id }, { name: 'BSc' })
    const cur = await h.svc.createCurriculum(prog.id, { name: 'c' })
    const mkMeasured = async (score: number) => {
      const subj = await h.svc.createSubject({ title: `S${score}`, curriculum_id: cur.id })
      const view = await h.svc.createGradingSystem(
        { type: 'subject', id: subj.id },
        { name: 'S', scale_type: 'numeric', components: [{ component_type: 'exam', weight: 10000, max_points: 100 }] },
      )
      await h.svc.recordResult((await h.svc.createAssessment(subj.id, { type: 'exam', grading_component_id: view.components[0].id })).id, { score })
      await h.svc.setMeasurement({ type: 'subject', id: subj.id }, { measurement_kind: 'quantitative', binding_mode: 'derived-pull' })
    }
    await mkMeasured(80)
    await mkMeasured(100)
    await h.svc.setMeasurement({ type: 'program', id: prog.id }, { measurement_kind: 'quantitative' })
    expect(await h.svc.getProgress({ type: 'program', id: prog.id })).toBe(90)
  })

  it('getProgress program with no subjects → null (rollup of empty)', async () => {
    const inst = await h.svc.createInstitution({ name: 'MIT' })
    const prog = await h.svc.createProgram({ type: 'institution', id: inst.id }, { name: 'BSc' })
    await h.svc.createCurriculum(prog.id, { name: 'c' })
    await h.svc.setMeasurement({ type: 'program', id: prog.id }, { measurement_kind: 'quantitative' })
    expect(await h.svc.getProgress({ type: 'program', id: prog.id })).toBeNull()
  })

  it('getProgress program whose subjects all derive null → null (rollup of all-null, not 0)', async () => {
    const inst = await h.svc.createInstitution({ name: 'MIT' })
    const prog = await h.svc.createProgram({ type: 'institution', id: inst.id }, { name: 'BSc' })
    const cur = await h.svc.createCurriculum(prog.id, { name: 'c' })
    // a subject that EXISTS under the program but has no measurement row → getProgress(subject) = null
    await h.svc.createSubject({ title: 'Unmeasured', curriculum_id: cur.id })
    await h.svc.setMeasurement({ type: 'program', id: prog.id }, { measurement_kind: 'quantitative' })
    expect(await h.svc.getProgress({ type: 'program', id: prog.id })).toBeNull()
  })
})
