// ============================================================================
// AR-8 · Increment #1 — BacklinkResolver tests (Node / better-sqlite3, db-6 harness)
//
// Proves the increment charter:
//   • getBacklinksTo — pages that link TO an entity (composite-key correct)
//   • getLinksFrom   — entities a given page links TO
//   • soft-delete    — a removed link (BR-15) disappears from both reads
//   • empty          — unknown entity/page → [] (never throws; no registry gate on reads)
//   • resolveLink    — exact key → row; non-matching key → null
//   • isolation      — (task,T1) must not surface for (task,T2) or (note,T1)
//   • R7 conformance — read-only surface, no write path (INT-1 / BL-7)
//
// Seeds through AR-6's real write path (SpacesService.createLink/removeLink) so the
// read side is proven against genuinely-written rows, not hand-inserted fixtures.
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { createTaggableTypeRegistry } from '../../../foundation/spaces/registry'
import { createSpacesService, type SpacesService } from '../../../foundation/spaces/service'
import { createBacklinkResolver, type BacklinkResolver } from '../backlink-resolver'

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
  resolver: BacklinkResolver
  spaces: SpacesService
  db: DrizzleDb
  driver: SqliteDriver
}> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver) // app_state + 001 sync_queue + 002 sessions + 003 spaces (entity_links)
  const db = createDrizzleProxy(driver)
  const registry = createTaggableTypeRegistry()
  registry.register('task') // entity_type is open (SP2) — register the types we link to
  registry.register('note')
  const spaces = createSpacesService(db, 'test-device', registry)
  const resolver = createBacklinkResolver(db, 'test-device')
  return { resolver, spaces, db, driver }
}

describe('AR-8 · BacklinkResolver — getBacklinksTo', () => {
  it('returns every page that links TO an entity (and only those)', async () => {
    const { resolver, spaces, driver } = await setup()
    await spaces.createLink('P1', 'task', 'T1')
    await spaces.createLink('P2', 'task', 'T1')
    await spaces.createLink('P3', 'note', 'N1') // unrelated

    const back = await resolver.getBacklinksTo('task', 'T1')
    expect(back).toHaveLength(2)
    expect(back.map((r) => r.page_id).sort()).toEqual(['P1', 'P2'])
    await driver.close()
  })
})

describe('AR-8 · BacklinkResolver — getLinksFrom', () => {
  it('returns every entity a given page links TO', async () => {
    const { resolver, spaces, driver } = await setup()
    await spaces.createLink('PX', 'task', 'T1')
    await spaces.createLink('PX', 'note', 'N1')
    await spaces.createLink('PX', 'task', 'T2')

    const out = await resolver.getLinksFrom('PX')
    expect(out).toHaveLength(3)
    expect(out.map((r) => r.entity_id).sort()).toEqual(['N1', 'T1', 'T2'])
    await driver.close()
  })
})

describe('AR-8 · BacklinkResolver — soft-delete (BR-15)', () => {
  it('excludes a removed link from both read paths', async () => {
    const { resolver, spaces, driver } = await setup()
    await spaces.createLink('P', 'task', 'T1')
    await spaces.removeLink('P', 'task', 'T1') // soft-delete (sets deleted_at)

    expect(await resolver.getBacklinksTo('task', 'T1')).toHaveLength(0)
    expect(await resolver.getLinksFrom('P')).toHaveLength(0)
    await driver.close()
  })

  it('excludes ONLY the soft-deleted link when a live one survives for the same entity', async () => {
    // Partial exclusion — proves the isNull(deleted_at) filter is selective, not "return everything".
    const { resolver, spaces, driver } = await setup()
    await spaces.createLink('P1', 'task', 'T1')
    await spaces.createLink('P2', 'task', 'T1')
    await spaces.removeLink('P1', 'task', 'T1') // remove one of the two

    const back = await resolver.getBacklinksTo('task', 'T1')
    expect(back).toHaveLength(1)
    expect(back[0].page_id).toBe('P2')
    await driver.close()
  })

  it('re-includes a revived link (createLink after removeLink — in-place revive, UNIQUE key)', async () => {
    const { resolver, spaces, driver } = await setup()
    await spaces.createLink('P', 'task', 'T1')
    await spaces.removeLink('P', 'task', 'T1')
    expect(await resolver.getBacklinksTo('task', 'T1')).toHaveLength(0)

    await spaces.createLink('P', 'task', 'T1') // revives the dead row (deleted_at → null)
    const back = await resolver.getBacklinksTo('task', 'T1')
    expect(back).toHaveLength(1)
    expect(back[0].page_id).toBe('P')
    await driver.close()
  })
})

describe('AR-8 · BacklinkResolver — empty / unknown', () => {
  it('returns [] for an unknown entity or page (never throws, no registry gate on reads)', async () => {
    const { resolver, driver } = await setup()
    expect(await resolver.getBacklinksTo('task', 'DOES-NOT-EXIST')).toEqual([])
    expect(await resolver.getBacklinksTo('never-registered-type', 'X')).toEqual([])
    expect(await resolver.getLinksFrom('NO-SUCH-PAGE')).toEqual([])
    await driver.close()
  })
})

describe('AR-8 · BacklinkResolver — resolveLink', () => {
  it('returns the single live row for an exact key, null otherwise', async () => {
    const { resolver, spaces, driver } = await setup()
    await spaces.createLink('P', 'task', 'T1', 'preview snippet')

    const hit = await resolver.resolveLink('P', 'task', 'T1')
    expect(hit).not.toBeNull()
    expect(hit?.entity_id).toBe('T1')
    expect(hit?.context).toBe('preview snippet')

    expect(await resolver.resolveLink('P', 'task', 'ZZZ')).toBeNull()
    await driver.close()
  })
})

describe('AR-8 · BacklinkResolver — composite-key isolation', () => {
  it('does not leak a link across a differing entity_type or entity_id', async () => {
    const { resolver, spaces, driver } = await setup()
    await spaces.createLink('P', 'task', 'T1')

    expect(await resolver.getBacklinksTo('task', 'T2')).toHaveLength(0) // same type, other id
    expect(await resolver.getBacklinksTo('note', 'T1')).toHaveLength(0) // other type, same id
    expect(await resolver.getBacklinksTo('task', 'T1')).toHaveLength(1) // exact
    await driver.close()
  })
})

describe('AR-8 · BacklinkResolver — R7 read-seam conformance (INT-1, BL-7)', () => {
  it('exposes ONLY the documented read surface — no write path (read-only, BL-1/BL-7)', async () => {
    // R7 (INT-1): the resolver IS the documented read API modules pull entity-link data through; it must
    // never grow a mutation method (writes are AR-6 SpacesService's, BL-1). This structurally guards BL-7 —
    // a write-shaped member appearing on the read seam is a fail-loud regression.
    const { resolver, driver } = await setup()
    const surface = Object.keys(resolver).sort()
    expect(surface).toEqual(['getBacklinksTo', 'getLinksFrom', 'resolveLink'])
    const mutators = surface.filter((k) =>
      /^(create|update|delete|remove|write|mutate|set|insert|upsert)/i.test(k),
    )
    expect(mutators).toEqual([])
    await driver.close()
  })
})
