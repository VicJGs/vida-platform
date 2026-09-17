// ============================================================================
// XS-capability #31 · S1 Verification Gate — enforcement decision core + grant reads
//
// Live-store smoke on the REAL data store (better-sqlite3 + migration 005 + Repository),
// not fixtures. Proves the slice-map S1 ledger:
//   • shipped-def bypass (INV-2) · no-grant fail-closed (INV-1) · per-action gates
//   • envelope_changed on declaration drift (INV-6) · canonicalEnvelopeHash symmetry (IR-3)
//   • sensitive-consent gate + compositional union across checks (INV-5) · typed CapabilityDenied
// ============================================================================

import { describe, it, expect, beforeAll } from 'vitest'
import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { createDrizzleProxy, type SqliteDriver } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { createRepository } from '../../../db/repository'
import { capabilityGrants } from '../../../db/schema/foundation/capability'
import { syncQueue } from '../../../db/schema/foundation/sync-queue'
import { initVault } from '../../../encryption/vault'
import { createCapabilityRegistry } from '../registry'
import { createCapabilityEnforcer, canonicalEnvelopeHash } from '../enforcer'
import {
  CapabilityDenied,
  CapabilityNotFound,
  GrantExceedsDeclaration,
  type CapabilityAction,
  type CapabilityDefinition,
  type GrantEnvelope,
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

async function harness() {
  await initVault()
  const sqlite = new Database(':memory:')
  const driver = createBetterSqlite3Driver(sqlite)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const registry = createCapabilityRegistry(db, 'device-1')
  const enforcer = createCapabilityEnforcer(db, 'device-1', registry)
  return { db, driver, registry, enforcer }
}

// A valid USER def: effects ∪ bindings ⊆ shipped union {complete_habit_occurrence, award_xp, habit}.
const userDef = (over: Partial<CapabilityDefinition> = {}): CapabilityDefinition => ({
  id: 'my_widget',
  kind: 'widget',
  render_targets: ['inline'],
  bindings: ['habit'],
  effects: ['award_xp'],
  terminal_states: { inline: ['loading', 'empty', 'error', 'success'] },
  is_user_type: true,
  ...over,
})

// Insert a grant row directly (grant() is S2) — the live-store write path.
async function seedGrant(
  db: Awaited<ReturnType<typeof harness>>['db'],
  defId: string,
  env: Partial<GrantEnvelope>,
  hash: string,
) {
  const repo = createRepository(db, capabilityGrants, {
    deviceId: 'device-1',
    encryptedFields: [],
    softDelete: true,
  })
  await repo.create({
    capability_def_id: defId,
    granted_bindings: JSON.stringify(env.granted_bindings ?? []),
    granted_effects: JSON.stringify(env.granted_effects ?? []),
    media_ok: env.media_ok ?? false,
    external_in_ok: env.external_in_ok ?? false,
    external_out_ok: env.external_out_ok ?? false,
    consented_sensitive_modules: JSON.stringify(env.consented_sensitive_modules ?? []),
    granted_envelope_hash: hash,
  })
}

describe('canonicalEnvelopeHash (IR-3 — declaration only, symmetric)', () => {
  // canonicalEnvelopeHash uses the keyless BLAKE2b primitive → needs libsodium loaded (A2).
  beforeAll(async () => {
    await initVault()
  })

  it('is order-independent over bindings + effects', () => {
    const a = canonicalEnvelopeHash({ bindings: ['habit', 'task'], effects: ['award_xp', 'log_time'] })
    const b = canonicalEnvelopeHash({ bindings: ['task', 'habit'], effects: ['log_time', 'award_xp'] })
    expect(a).toBe(b)
  })

  it('ignores render_targets (a CB2 change is not a privilege change)', () => {
    // Same bindings/effects, different render targets → same hash.
    const base = canonicalEnvelopeHash({ bindings: ['habit'], effects: ['award_xp'] })
    const def1 = userDef({ render_targets: ['inline'] })
    const def2 = userDef({ render_targets: ['inline', 'standalone'] })
    expect(canonicalEnvelopeHash(def1)).toBe(base)
    expect(canonicalEnvelopeHash(def2)).toBe(base)
  })

  it('changes when a binding/effect changes (drift is detectable)', () => {
    const a = canonicalEnvelopeHash({ bindings: ['habit'], effects: ['award_xp'] })
    const b = canonicalEnvelopeHash({ bindings: ['habit', 'task'], effects: ['award_xp'] })
    expect(a).not.toBe(b)
  })
})

describe('CapabilityEnforcer — decision core (S1)', () => {
  it('INV-2: a shipped/trusted def bypasses — allowed with no grant', async () => {
    const { enforcer } = await harness()
    const d = await enforcer.checkAction('habit_logger', { type: 'effect', effect: 'award_xp' })
    expect(d).toEqual({ allowed: true })
  })

  it('INV-1: a user def with no grant fails closed → no_grant', async () => {
    const { registry, enforcer } = await harness()
    await registry.register(userDef())
    const d = await enforcer.checkAction('my_widget', { type: 'effect', effect: 'award_xp' })
    expect(d).toEqual({ allowed: false, reason: 'no_grant' })
  })

  it('an unresolvable defId throws CapabilityNotFound (a bug, not a policy deny)', async () => {
    const { enforcer } = await harness()
    await expect(
      enforcer.checkAction('nope', { type: 'media' }),
    ).rejects.toBeInstanceOf(CapabilityNotFound)
  })

  it('effect: in granted set → allow; outside → not_in_envelope', async () => {
    const { db, registry, enforcer } = await harness()
    const def = userDef()
    await registry.register(def)
    await seedGrant(db, 'my_widget', { granted_effects: ['award_xp'] }, canonicalEnvelopeHash(def))

    expect(await enforcer.checkAction('my_widget', { type: 'effect', effect: 'award_xp' })).toEqual({
      allowed: true,
    })
    expect(await enforcer.checkAction('my_widget', { type: 'effect', effect: 'log_time' })).toEqual({
      allowed: false,
      reason: 'not_in_envelope',
    })
  })

  it('binding: in granted set → allow; outside → not_in_envelope', async () => {
    const { db, registry, enforcer } = await harness()
    const def = userDef()
    await registry.register(def)
    await seedGrant(db, 'my_widget', { granted_bindings: ['habit'] }, canonicalEnvelopeHash(def))

    expect(await enforcer.checkAction('my_widget', { type: 'binding', entityType: 'habit' })).toEqual({
      allowed: true,
    })
    expect(await enforcer.checkAction('my_widget', { type: 'binding', entityType: 'task' })).toEqual({
      allowed: false,
      reason: 'not_in_envelope',
    })
  })

  it('media: gated by media_ok', async () => {
    const { db, registry, enforcer } = await harness()
    const def = userDef()
    await registry.register(def)
    await seedGrant(db, 'my_widget', { media_ok: false }, canonicalEnvelopeHash(def))
    expect(await enforcer.checkAction('my_widget', { type: 'media' })).toEqual({
      allowed: false,
      reason: 'media_not_granted',
    })
  })

  it('sensitive: known class needs consent; non-sensitive class needs none', async () => {
    const { db, registry, enforcer } = await harness()
    const def = userDef()
    await registry.register(def)
    await seedGrant(
      db,
      'my_widget',
      { consented_sensitive_modules: ['health'] },
      canonicalEnvelopeHash(def),
    )
    expect(
      await enforcer.checkAction('my_widget', { type: 'sensitive', moduleClass: 'health' }),
    ).toEqual({ allowed: true })
    expect(
      await enforcer.checkAction('my_widget', { type: 'sensitive', moduleClass: 'finance' }),
    ).toEqual({ allowed: false, reason: 'sensitive_consent_missing' })
    // 'projects' is not a sensitive class → no consent gate.
    expect(
      await enforcer.checkAction('my_widget', { type: 'sensitive', moduleClass: 'projects' }),
    ).toEqual({ allowed: true })
  })

  it('external: boolean gate (in/out); INV-5 union present when sensitive + external both consented', async () => {
    const { db, registry, enforcer } = await harness()
    const def = userDef()
    await registry.register(def)
    // Dual grant: sensitive consent + external_out → the exfiltration channel is fully consented (union present).
    await seedGrant(
      db,
      'my_widget',
      { external_out_ok: true, external_in_ok: false, consented_sensitive_modules: ['health'] },
      canonicalEnvelopeHash(def),
    )
    expect(
      await enforcer.checkAction('my_widget', { type: 'external_out', target: 'https://x' }),
    ).toEqual({ allowed: true }) // union present → allowed
    expect(
      await enforcer.checkAction('my_widget', { type: 'external_in', source: 'https://y' }),
    ).toEqual({ allowed: false, reason: 'not_in_envelope' }) // external_in not granted
    // The sensitive read still needs its own consent — the union is enforced across the two checks.
    expect(
      await enforcer.checkAction('my_widget', { type: 'sensitive', moduleClass: 'finance' }),
    ).toEqual({ allowed: false, reason: 'sensitive_consent_missing' })
  })

  it('INV-6: a stale envelope hash → envelope_changed (fail closed until re-grant)', async () => {
    const { db, registry, enforcer } = await harness()
    const def = userDef() // declares bindings ['habit']
    await registry.register(def)
    // Grant hashed against a DIFFERENT (grown) declaration → drift.
    const staleHash = canonicalEnvelopeHash({ bindings: ['habit', 'task'], effects: ['award_xp'] })
    await seedGrant(db, 'my_widget', { granted_effects: ['award_xp'] }, staleHash)

    expect(await enforcer.isEnvelopeCurrent('my_widget')).toBe(false)
    expect(await enforcer.checkAction('my_widget', { type: 'effect', effect: 'award_xp' })).toEqual({
      allowed: false,
      reason: 'envelope_changed',
    })
  })

  it('isEnvelopeCurrent: true when the hash matches; false with no grant', async () => {
    const { db, registry, enforcer } = await harness()
    const def = userDef()
    await registry.register(def)
    expect(await enforcer.isEnvelopeCurrent('my_widget')).toBe(false) // no grant yet
    await seedGrant(db, 'my_widget', { granted_effects: ['award_xp'] }, canonicalEnvelopeHash(def))
    expect(await enforcer.isEnvelopeCurrent('my_widget')).toBe(true)
  })

  it('getGrant: returns the parsed grant, or null when none', async () => {
    const { db, registry, enforcer } = await harness()
    const def = userDef()
    await registry.register(def)
    expect(await enforcer.getGrant('my_widget')).toBeNull()
    await seedGrant(
      db,
      'my_widget',
      { granted_bindings: ['habit'], granted_effects: ['award_xp'], media_ok: true },
      canonicalEnvelopeHash(def),
    )
    const grant = await enforcer.getGrant('my_widget')
    expect(grant).toMatchObject({
      capability_def_id: 'my_widget',
      granted_bindings: ['habit'],
      granted_effects: ['award_xp'],
      media_ok: true,
    })
  })

  it('assertPermitted: throws typed CapabilityDenied on deny; resolves on allow', async () => {
    const { db, registry, enforcer } = await harness()
    const def = userDef()
    await registry.register(def)
    await seedGrant(db, 'my_widget', { granted_effects: ['award_xp'] }, canonicalEnvelopeHash(def))

    await expect(
      enforcer.assertPermitted('my_widget', { type: 'effect', effect: 'award_xp' }),
    ).resolves.toBeUndefined()
    await expect(
      enforcer.assertPermitted('my_widget', { type: 'effect', effect: 'log_time' }),
    ).rejects.toMatchObject({ name: 'CapabilityDenied', reason: 'not_in_envelope' })
    await expect(
      enforcer.assertPermitted('my_widget', { type: 'effect', effect: 'log_time' }),
    ).rejects.toBeInstanceOf(CapabilityDenied)
  })

  it('P1: an unrecognized action fails closed (deny), never crashes', async () => {
    const { db, registry, enforcer } = await harness()
    const def = userDef()
    await registry.register(def)
    await seedGrant(db, 'my_widget', { granted_effects: ['award_xp'] }, canonicalEnvelopeHash(def))
    // A malformed action arriving from an untyped boundary must deny, not throw a TypeError.
    const d = await enforcer.checkAction(
      'my_widget',
      { type: 'bogus' } as unknown as CapabilityAction,
    )
    expect(d).toEqual({ allowed: false, reason: 'not_in_envelope' })
  })
})

describe('CapabilityEnforcer — grant lifecycle (S2)', () => {
  const envelope: GrantEnvelope = {
    granted_bindings: ['habit'],
    granted_effects: ['award_xp'],
    media_ok: false,
    external_in_ok: false,
    external_out_ok: false,
    consented_sensitive_modules: [],
  }

  it('grant persists, stamps the declaration hash, and is current', async () => {
    const { registry, enforcer } = await harness()
    const def = userDef()
    await registry.register(def)

    const g = await enforcer.grant('my_widget', { ...envelope, granted_effects: ['award_xp'] })
    expect(g).toMatchObject({ capability_def_id: 'my_widget', granted_bindings: ['habit'] })
    expect(g.granted_envelope_hash).toBe(canonicalEnvelopeHash(def)) // symmetric
    expect(await enforcer.isEnvelopeCurrent('my_widget')).toBe(true)
  })

  it('grant enqueues a co-transactional sync_queue row', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await enforcer.grant('my_widget', { ...envelope, granted_effects: ['award_xp'] })
    const queued = await db
      .select()
      .from(syncQueue)
      .where(eq(syncQueue.table_name, 'capability_grants'))
      .all()
    expect(queued).toHaveLength(1)
  })

  it('INV-3: a grant exceeding the declaration → GrantExceedsDeclaration', async () => {
    const { registry, enforcer } = await harness()
    await registry.register(userDef()) // declares bindings ['habit'], effects ['award_xp']
    await expect(
      enforcer.grant('my_widget', { ...envelope, granted_bindings: ['habit', 'task'] }),
    ).rejects.toBeInstanceOf(GrantExceedsDeclaration)
    await expect(
      enforcer.grant('my_widget', { ...envelope, granted_effects: ['award_xp', 'log_time'] }),
    ).rejects.toBeInstanceOf(GrantExceedsDeclaration)
  })

  it('grant on an unknown def → CapabilityNotFound', async () => {
    const { enforcer } = await harness()
    await expect(
      enforcer.grant('nope', { ...envelope, granted_effects: ['award_xp'] }),
    ).rejects.toBeInstanceOf(CapabilityNotFound)
  })

  it('end-to-end: grant → checkAction allows the granted action', async () => {
    const { registry, enforcer } = await harness()
    await registry.register(userDef())
    // No grant yet → fail closed.
    expect(await enforcer.checkAction('my_widget', { type: 'effect', effect: 'award_xp' })).toEqual({
      allowed: false,
      reason: 'no_grant',
    })
    await enforcer.grant('my_widget', { ...envelope, granted_effects: ['award_xp'] })
    // Now allowed.
    await expect(
      enforcer.assertPermitted('my_widget', { type: 'effect', effect: 'award_xp' }),
    ).resolves.toBeUndefined()
  })

  it('revoke: next check fails closed (no_grant); getGrant → null; idempotent', async () => {
    const { registry, enforcer } = await harness()
    await registry.register(userDef())
    await enforcer.grant('my_widget', { ...envelope, granted_effects: ['award_xp'] })

    await enforcer.revoke('my_widget')
    expect(await enforcer.getGrant('my_widget')).toBeNull()
    expect(await enforcer.checkAction('my_widget', { type: 'effect', effect: 'award_xp' })).toEqual({
      allowed: false,
      reason: 'no_grant',
    })
    await expect(enforcer.revoke('my_widget')).resolves.toBeUndefined() // idempotent no-op
  })

  it('re-grant: exactly one active grant survives (the newest)', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await enforcer.grant('my_widget', { ...envelope, granted_effects: ['award_xp'] })
    await enforcer.grant('my_widget', {
      ...envelope,
      granted_bindings: ['habit'],
      granted_effects: [],
      media_ok: true,
    })
    // Exactly one ACTIVE grant (findWhere excludes the soft-deleted old one).
    const active = await db
      .select()
      .from(capabilityGrants)
      .where(eq(capabilityGrants.capability_def_id, 'my_widget'))
      .all()
    const live = active.filter((r) => r.deleted_at === null)
    expect(live).toHaveLength(1)
    const g = await enforcer.getGrant('my_widget')
    expect(g?.media_ok).toBe(true) // the newest grant won
  })
})
