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
import {
  type LearningEducationService,
  InstitutionNotFoundError,
  SelfTaughtPathNotFoundError,
  ProgramNotFoundError,
  CurriculumNotFoundError,
  TermNotFoundError,
  SubjectNotFoundError,
  UnroutedSubjectError,
  TemplateImmutableError,
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
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const svc = createLearningEducationService({ db, deviceId: 'test-device' })
  return { svc, db, bsql }
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
