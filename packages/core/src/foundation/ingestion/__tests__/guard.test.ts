// ============================================================================
// XS-ingestion #44 · S2 Verification Gate — the ingestion guard core (XCU-01/09/12/13)
//
// Live-store smoke on the REAL data store (better-sqlite3 + migrations + Repository),
// not fixtures: the enforcer's external_in boolean reads a real `capability_grants`
// row seeded via the Repository, and the egress delegation runs the BUILT egress
// guard #43. Proves the slice-map S2 ledger:
//   • permit path returns a decision + honest-leak disclosure (XCU-03/12)
//   • external_in_not_granted (off by default) · server_proxy_refused (XCU-01 refuse)
//   • sensitive-read fetch routes to egress #43 (IR-2/XCU-08): permit w/ consent+init;
//     deny w/o user-initiation; deny w/o per-target egress consent
//   • revokeIntegration halts future + never purges (XCU-13 keep-ingested)
//   • fetchThroughMediator: mediator_unavailable (M1 deny-safe) · denied act → IngestionDenied
//   • typed IngestionDenied(defId, reason)
// ============================================================================

import { describe, it, expect, beforeAll } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { createRepository } from '../../../db/repository'
import { capabilityGrants } from '../../../db/schema/foundation/capability'
import { initVault } from '../../../encryption/vault'
import { createCapabilityRegistry } from '../../capability/registry'
import { createCapabilityEnforcer, canonicalEnvelopeHash } from '../../capability/enforcer'
import { type CapabilityDefinition, type GrantEnvelope } from '../../capability/types'
import { createEgressGuard } from '../../egress'
import type { EgressConsentPort } from '../../egress'
import { createIngestionGuard } from '../guard'
import { type IngestionAct, type IngestionMediatorPort, type IngestionSource } from '../types'

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
  return { db, registry, enforcer }
}

const userDef = (over: Partial<CapabilityDefinition> = {}): CapabilityDefinition => ({
  id: 'my_connector',
  kind: 'widget',
  render_targets: ['inline'],
  bindings: ['habit'],
  effects: ['award_xp'],
  terminal_states: { inline: ['loading', 'empty', 'error', 'success'] },
  is_user_type: true,
  ...over,
})

async function seedGrant(
  db: Awaited<ReturnType<typeof harness>>['db'],
  defId: string,
  env: Partial<GrantEnvelope>,
) {
  const repo = createRepository(db, capabilityGrants, {
    deviceId: 'device-1',
    encryptedFields: [],
    softDelete: true,
  })
  await repo.create({
    capability_def_id: defId,
    granted_bindings: JSON.stringify([]),
    granted_effects: JSON.stringify([]),
    media_ok: false,
    external_in_ok: env.external_in_ok ?? false,
    external_out_ok: env.external_out_ok ?? false,
    consented_sensitive_modules: JSON.stringify(env.consented_sensitive_modules ?? []),
    granted_envelope_hash: canonicalEnvelopeHash(userDef()),
  })
}

const source = (over: Partial<IngestionSource> = {}): IngestionSource => ({
  integrationId: 'acme-bank',
  layer: 'native',
  normalizationContractId: 'finance-v1',
  ...over,
})
const act = (over: Partial<IngestionAct> = {}): IngestionAct => ({
  defId: 'my_connector',
  source: source(),
  dataScope: { sensitiveModules: [] },
  ...over,
})
const yesConsent: EgressConsentPort = { async hasTargetConsent() { return true } }

beforeAll(async () => {
  await initVault()
})

describe('createIngestionGuard — S2 (XCU-01/09/12/13) · live store', () => {
  it('XCU-12 opt-in: a granted external_in, non-sensitive act permits + returns the disclosure', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'my_connector', { external_in_ok: true })
    const guard = createIngestionGuard(enforcer, createEgressGuard(enforcer))

    const decision = await guard.checkIngestion(act())
    expect(decision.permitted).toBe(true)
    expect(decision.disclosure?.layer).toBe('native')
    expect(decision.disclosure?.serverPosture).toBe('blind')
  })

  it('XCU-12 off-by-default: no grant ⇒ external_in_not_granted (still carries the disclosure)', async () => {
    const { registry, enforcer } = await harness()
    await registry.register(userDef())
    const guard = createIngestionGuard(enforcer, createEgressGuard(enforcer))

    const decision = await guard.checkIngestion(act())
    expect(decision.permitted).toBe(false)
    expect(decision.reason).toBe('external_in_not_granted')
    expect(decision.disclosure).toBeDefined()
  })

  it('XCU-01 refuse-not-downgrade: a server-plaintext-only fetch is refused', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'my_connector', { external_in_ok: true })
    const guard = createIngestionGuard(enforcer, createEgressGuard(enforcer))

    const decision = await guard.checkIngestion(act({ requiresServerPlaintext: true }))
    expect(decision.permitted).toBe(false)
    expect(decision.reason).toBe('server_proxy_refused')
  })

  it('IR-2/XCU-08: a sensitive-read fetch with user-initiation + egress consent permits (via egress #43)', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'my_connector', {
      external_in_ok: true,
      external_out_ok: true,
      consented_sensitive_modules: ['finance'],
    })
    const guard = createIngestionGuard(enforcer, createEgressGuard(enforcer, { consent: yesConsent }))

    const decision = await guard.checkIngestion(
      act({ dataScope: { sensitiveModules: ['finance'] }, userInitiation: { kind: 'user_action', at: 1000 } }),
    )
    expect(decision.permitted).toBe(true)
  })

  it('IR-2: a sensitive-read fetch WITHOUT user-initiation ⇒ sensitive_egress_unconsented (never-auto-transmit)', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'my_connector', { external_in_ok: true, external_out_ok: true, consented_sensitive_modules: ['finance'] })
    const guard = createIngestionGuard(enforcer, createEgressGuard(enforcer, { consent: yesConsent }))

    const decision = await guard.checkIngestion(act({ dataScope: { sensitiveModules: ['finance'] } }))
    expect(decision.permitted).toBe(false)
    expect(decision.reason).toBe('sensitive_egress_unconsented')
  })

  it('IR-2: a sensitive-read fetch without per-target egress consent ⇒ sensitive_egress_unconsented (deny-safe port)', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'my_connector', { external_in_ok: true, external_out_ok: true, consented_sensitive_modules: ['finance'] })
    // egress guard with the DEFAULT deny-safe consent port (no consent adapter) ⇒ per-target consent fails.
    const guard = createIngestionGuard(enforcer, createEgressGuard(enforcer))

    const decision = await guard.checkIngestion(
      act({ dataScope: { sensitiveModules: ['finance'] }, userInitiation: { kind: 'user_action', at: 1000 } }),
    )
    expect(decision.permitted).toBe(false)
    expect(decision.reason).toBe('sensitive_egress_unconsented')
  })

  it('assertIngestionPermitted throws IngestionDenied(defId, reason) on deny', async () => {
    const { registry, enforcer } = await harness()
    await registry.register(userDef())
    const guard = createIngestionGuard(enforcer, createEgressGuard(enforcer))

    await expect(guard.assertIngestionPermitted(act())).rejects.toMatchObject({
      name: 'IngestionDenied',
      defId: 'my_connector',
      reason: 'external_in_not_granted',
    })
  })

  it('XCU-13 revoke halts future fetch (fail-closed) and never purges ingested data', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'my_connector', { external_in_ok: true })
    const guard = createIngestionGuard(enforcer, createEgressGuard(enforcer))

    expect((await guard.checkIngestion(act())).permitted).toBe(true)
    await guard.revokeIntegration('my_connector')
    // future fetch now denied (stop-future); the revoke touched only the grant — no data-row API exists here,
    // so already-ingested rows are keep-ingested by construction.
    const after = await guard.checkIngestion(act())
    expect(after.permitted).toBe(false)
    expect(after.reason).toBe('external_in_not_granted')
  })

  it('XCU-09 fetchThroughMediator: M1 has no mediator ⇒ mediator_unavailable (deny-safe, no network call)', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'my_connector', { external_in_ok: true })
    const guard = createIngestionGuard(enforcer, createEgressGuard(enforcer))

    await expect(guard.fetchThroughMediator(act(), { path: '/tx' })).rejects.toMatchObject({
      name: 'IngestionDenied',
      reason: 'mediator_unavailable',
    })
  })

  it('XCU-09 fetchThroughMediator: a DENIED act never reaches the mediator (IngestionDenied first)', async () => {
    const { registry, enforcer } = await harness()
    await registry.register(userDef())
    let called = false
    const mediator: IngestionMediatorPort = {
      async fetchFromSource() {
        called = true
        return { ok: true, data: null }
      },
    }
    const guard = createIngestionGuard(enforcer, createEgressGuard(enforcer), { mediator })

    // no grant ⇒ denied before the mediator is consulted (a denied ingestion never gets a credential).
    await expect(guard.fetchThroughMediator(act(), { path: '/tx' })).rejects.toMatchObject({
      reason: 'external_in_not_granted',
    })
    expect(called).toBe(false)
  })

  it('XCU-09 fetchThroughMediator: a permitted act with a wired mediator returns the result', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'my_connector', { external_in_ok: true })
    const mediator: IngestionMediatorPort = {
      async fetchFromSource(integrationId) {
        return { ok: true, data: { integrationId } }
      },
    }
    const guard = createIngestionGuard(enforcer, createEgressGuard(enforcer), { mediator })

    const result = await guard.fetchThroughMediator(act(), { path: '/tx' })
    expect(result.ok).toBe(true)
    expect(result.data).toEqual({ integrationId: 'acme-bank' })
  })
})
