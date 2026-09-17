// ============================================================================
// XS-capability #31 · S3 Verification Gate — offered-set resolver
//
// Live-store smoke (better-sqlite3 + migration + Repository). Proves XCU-SP-29 teeth-split:
//   • inline = UNION (non-restrictive, ignores the Space palette)
//   • standalone = RESTRICT to the Space's active space_enabled_blocks palette
//   • empty palette → [] · stale palette ref → excluded (graceful) · soft-deleted entry → excluded
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { and, eq, isNull } from 'drizzle-orm'
import { createDrizzleProxy, type SqliteDriver } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { createRepository } from '../../../db/repository'
import { spaceEnabledBlocks } from '../../../db/schema/foundation/spaces'
import { initVault } from '../../../encryption/vault'
import { createCapabilityRegistry } from '../registry'
import { createOfferedSetResolver } from '../offered-set'
import type { CapabilityDefinition } from '../types'

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

async function harness() {
  await initVault()
  const sqlite = new Database(':memory:')
  const driver = createBetterSqlite3Driver(sqlite)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const registry = createCapabilityRegistry(db, 'device-1')
  const resolver = createOfferedSetResolver(db, registry)
  return { db, registry, resolver }
}

const ALL_TS = ['loading', 'empty', 'error', 'success'] as const
// terminal_states must cover EVERY render target (BR-4), so derive it from render_targets.
const userDef = (over: Partial<CapabilityDefinition> = {}): CapabilityDefinition => {
  const render_targets = over.render_targets ?? ['inline']
  return {
    id: 'my_widget',
    kind: 'widget',
    render_targets,
    bindings: ['habit'],
    effects: ['award_xp'],
    terminal_states: Object.fromEntries(render_targets.map((t) => [t, [...ALL_TS]])),
    is_user_type: true,
    ...over,
  }
}

async function enablePalette(
  db: Awaited<ReturnType<typeof harness>>['db'],
  spaceId: string,
  defId: string,
) {
  const repo = createRepository(db, spaceEnabledBlocks, {
    deviceId: 'device-1',
    encryptedFields: [],
    softDelete: true,
  })
  return repo.create({ space_id: spaceId, capability_def_id: defId })
}

const ids = (defs: CapabilityDefinition[]) => defs.map((d) => d.id).sort()

describe('OfferedSetResolver (S3 — XCU-SP-29 teeth-split)', () => {
  it('inline = union: every inline-capable def, regardless of the Space palette', async () => {
    const { registry, resolver } = await harness()
    // shipped habit_logger has ['inline','standalone']; add an inline-only user def.
    await registry.register(userDef({ id: 'inline_only', render_targets: ['inline'] }))
    // No palette enabled for 'space-x' at all — inline is still non-restrictive.
    const offered = await resolver.resolveOfferedSet('space-x', 'inline')
    expect(ids(offered)).toEqual(['habit_logger', 'inline_only'])
  })

  it('standalone = restrict to the Space palette (and standalone-capable)', async () => {
    const { db, registry, resolver } = await harness()
    await registry.register(
      userDef({ id: 'standalone_widget', render_targets: ['standalone'] }),
    )
    await registry.register(userDef({ id: 'inline_only', render_targets: ['inline'] }))
    // Enable both in space-1's palette.
    await enablePalette(db, 'space-1', 'standalone_widget')
    await enablePalette(db, 'space-1', 'inline_only')

    const offered = await resolver.resolveOfferedSet('space-1', 'standalone')
    // inline_only is in the palette but NOT standalone-capable → excluded.
    expect(ids(offered)).toEqual(['standalone_widget'])
  })

  it('standalone: a Space with no palette → empty (restrictive)', async () => {
    const { registry, resolver } = await harness()
    await registry.register(userDef({ id: 'standalone_widget', render_targets: ['standalone'] }))
    expect(await resolver.resolveOfferedSet('space-empty', 'standalone')).toEqual([])
  })

  it('standalone: a stale palette ref (unknown def) is excluded, not thrown', async () => {
    const { db, registry, resolver } = await harness()
    await registry.register(userDef({ id: 'standalone_widget', render_targets: ['standalone'] }))
    await enablePalette(db, 'space-1', 'standalone_widget')
    await enablePalette(db, 'space-1', 'ghost_def') // no such def in the registry
    const offered = await resolver.resolveOfferedSet('space-1', 'standalone')
    expect(ids(offered)).toEqual(['standalone_widget']) // ghost excluded, no throw
  })

  it('standalone: a soft-deleted palette entry is excluded', async () => {
    const { db, registry, resolver } = await harness()
    await registry.register(userDef({ id: 'standalone_widget', render_targets: ['standalone'] }))
    const row = await enablePalette(db, 'space-1', 'standalone_widget')
    // Soft-delete the palette entry.
    const repo = createRepository(db, spaceEnabledBlocks, {
      deviceId: 'device-1',
      encryptedFields: [],
      softDelete: true,
    })
    await repo.delete(row.id)
    expect(await resolver.resolveOfferedSet('space-1', 'standalone')).toEqual([])

    // Sanity: the row is soft-deleted (deleted_at set), not hard-deleted.
    const live = await db
      .select()
      .from(spaceEnabledBlocks)
      .where(
        and(
          eq(spaceEnabledBlocks.space_id, 'space-1'),
          isNull(spaceEnabledBlocks.deleted_at),
        ),
      )
      .all()
    expect(live).toHaveLength(0)
  })
})
