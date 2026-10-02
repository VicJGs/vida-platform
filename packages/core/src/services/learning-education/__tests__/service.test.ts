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
