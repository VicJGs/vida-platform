// ============================================================================
// AssociationResolver tests — XCU-SP-27 tag/link unify⇄separate resolution
// (Node / better-sqlite3 live-store harness; real migration 003 + Repository)
//
// Proves the Verification-Gate plan (service/spec.md §Verification Gate):
//   • shape        — separate → {tags,links}; unified → one Association[] w/ kind
//   • behavioral   — same-id tag+link → TWO distinct edges (no blur/dedup, BR-4);
//                    unified order deterministic (tags before links)
//   • partiality   — non-page → links:[]; inbound-only link NOT returned (AR-8)
//   • guards       — soft-deleted excluded (IR-2); unregistered → UnknownEntityType
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { createTaggableTypeRegistry } from '../registry'
import { createSpacesService, type SpacesService } from '../service'
import {
  createAssociationResolver,
  type AssociationResolver,
  type AssociationResult,
} from '../association-resolver'
import { UnknownEntityType } from '../types'

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

async function setup(): Promise<{
  svc: SpacesService
  resolver: AssociationResolver
  driver: SqliteDriver
  db: DrizzleDb
}> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver) // app_state + 001 sync_queue + 002 sessions + 003 spaces
  const db = createDrizzleProxy(driver)
  const registry = createTaggableTypeRegistry() // seeds page/note/journal/tag/space
  return {
    svc: createSpacesService(db, 'test-device', registry),
    resolver: createAssociationResolver(db, 'test-device', registry),
    driver,
    db,
  }
}

describe('AssociationResolver — shape (unified vs separate)', () => {
  it('separate returns two typed relations; unified returns one kind-tagged set', async () => {
    const { svc, resolver, driver } = await setup()
    const tag = await svc.createTag({ name: 'work' })
    await svc.tagEntity(tag.id, 'page', 'p1') // p1 carries #work
    await svc.createLink('p1', 'note', 'n1', 'see also') // p1 → note n1

    const sep = (await resolver.resolveAssociations(
      { entityType: 'page', entityId: 'p1' },
      'separate',
    )) as Extract<AssociationResult, { mode: 'separate' }>
    expect(sep.mode).toBe('separate')
    expect(sep.tags).toEqual([{ kind: 'tag', tagId: tag.id }])
    expect(sep.links).toEqual([
      { kind: 'link', target: { entityType: 'note', entityId: 'n1' }, context: 'see also' },
    ])

    const uni = (await resolver.resolveAssociations(
      { entityType: 'page', entityId: 'p1' },
      'unified',
    )) as Extract<AssociationResult, { mode: 'unified' }>
    expect(uni.mode).toBe('unified')
    expect(uni.associations).toHaveLength(2)
    expect(uni.associations.map((a) => a.kind).sort()).toEqual(['link', 'tag'])

    await driver.close()
  })
})

describe('AssociationResolver — behavioral (INV-2 / BR-4: no blur, no dedup)', () => {
  it('a same-id tag membership AND link yield two DISTINCT edges in unified', async () => {
    const { svc, resolver, driver } = await setup()
    const tag = await svc.createTag({ name: 'topic' })
    await svc.tagEntity(tag.id, 'page', 'p1') // p1 carries the tag
    await svc.createLink('p1', 'tag', tag.id, null) // p1 also LINKS TO the tag entity (same id)

    const uni = (await resolver.resolveAssociations(
      { entityType: 'page', entityId: 'p1' },
      'unified',
    )) as Extract<AssociationResult, { mode: 'unified' }>

    // No dedup: both edges present, semantically distinct despite the shared id.
    expect(uni.associations).toHaveLength(2)
    const tagEdge = uni.associations.find((a) => a.kind === 'tag')
    const linkEdge = uni.associations.find((a) => a.kind === 'link')
    expect(tagEdge).toEqual({ kind: 'tag', tagId: tag.id })
    expect(linkEdge).toEqual({
      kind: 'link',
      target: { entityType: 'tag', entityId: tag.id },
      context: null,
    })
    // Deterministic order: tags before links.
    expect(uni.associations[0].kind).toBe('tag')
    expect(uni.associations[1].kind).toBe('link')

    await driver.close()
  })

  it('orders tags STABLY by association-row id (same order on every call)', async () => {
    const { svc, resolver, driver } = await setup()
    const a = await svc.createTag({ name: 'a' })
    const b = await svc.createTag({ name: 'b' })
    const c = await svc.createTag({ name: 'c' })
    await svc.tagEntity(b.id, 'page', 'p1')
    await svc.tagEntity(a.id, 'page', 'p1')
    await svc.tagEntity(c.id, 'page', 'p1')

    const ref = { entityType: 'page', entityId: 'p1' }
    const first = (await resolver.resolveAssociations(ref, 'separate')) as Extract<
      AssociationResult,
      { mode: 'separate' }
    >
    const second = (await resolver.resolveAssociations(ref, 'separate')) as Extract<
      AssociationResult,
      { mode: 'separate' }
    >
    // byId sorts on the fixed row id → the order is STABLE across calls (the real
    // determinism guarantee), independent of DB return order or UUIDv7 intra-ms bits.
    expect(first.tags.map((t) => t.tagId)).toEqual(second.tags.map((t) => t.tagId))
    expect(new Set(first.tags.map((t) => t.tagId))).toEqual(new Set([a.id, b.id, c.id]))

    await driver.close()
  })
})

describe('AssociationResolver — partiality (INV-7: outgoing half only)', () => {
  it('a non-page entity resolves its tags but has no outbound links', async () => {
    const { svc, resolver, driver } = await setup()
    const tag = await svc.createTag({ name: 'ref' })
    await svc.tagEntity(tag.id, 'note', 'n1') // tag a NOTE (never a page_id source)

    const sep = (await resolver.resolveAssociations(
      { entityType: 'note', entityId: 'n1' },
      'separate',
    )) as Extract<AssociationResult, { mode: 'separate' }>
    expect(sep.tags).toEqual([{ kind: 'tag', tagId: tag.id }])
    expect(sep.links).toEqual([]) // entity_links is page-anchored; n1 authors none

    await driver.close()
  })

  it('an INBOUND-only link is NOT returned (that is AR-8)', async () => {
    const { svc, resolver, driver } = await setup()
    await svc.createLink('p1', 'note', 'n2', null) // p1 → n2 : n2 is the TARGET

    const sep = (await resolver.resolveAssociations(
      { entityType: 'note', entityId: 'n2' }, // ask for n2's OWN associations
      'separate',
    )) as Extract<AssociationResult, { mode: 'separate' }>
    expect(sep.links).toEqual([]) // inbound (what links to n2) is AR-8, never here
    expect(sep.tags).toEqual([])

    await driver.close()
  })
})

describe('AssociationResolver — guards', () => {
  it('excludes soft-deleted tag and link rows (IR-2)', async () => {
    const { svc, resolver, driver } = await setup()
    const t1 = await svc.createTag({ name: 'keep' })
    const t2 = await svc.createTag({ name: 'drop' })
    await svc.tagEntity(t1.id, 'page', 'p1')
    await svc.tagEntity(t2.id, 'page', 'p1')
    await svc.untagEntity(t2.id, 'page', 'p1') // soft-delete
    await svc.createLink('p1', 'note', 'nA', null)
    await svc.createLink('p1', 'note', 'nB', null)
    await svc.removeLink('p1', 'note', 'nB') // soft-delete

    const sep = (await resolver.resolveAssociations(
      { entityType: 'page', entityId: 'p1' },
      'separate',
    )) as Extract<AssociationResult, { mode: 'separate' }>
    expect(sep.tags).toEqual([{ kind: 'tag', tagId: t1.id }]) // t2 excluded
    expect(sep.links).toEqual([
      { kind: 'link', target: { entityType: 'note', entityId: 'nA' }, context: null },
    ]) // nB excluded

    await driver.close()
  })

  it('throws UnknownEntityType for an unregistered entity_type (IR-3 / BR-2)', async () => {
    const { resolver, driver } = await setup()
    await expect(
      resolver.resolveAssociations({ entityType: 'nonesuch', entityId: 'x' }, 'separate'),
    ).rejects.toBeInstanceOf(UnknownEntityType)
    await driver.close()
  })
})
