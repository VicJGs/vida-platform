// ============================================================================
// XS-egress-guard #43 · S1 Verification Gate — egress-mediation service (XCU-06)
//
// Live-store smoke on the REAL data store (better-sqlite3 + migration 005 + Repository),
// not fixtures: the enforcer's external_out boolean + sensitive checks read a real
// `capability_grants` row seeded via the Repository. Proves the slice-map S1 ledger:
//   • never-auto-transmit (IR-2) · target-unresolved (R-3) · external_out boolean (INV-2)
//   • sensitive-union across checks (INV-3) · per-target consent (R-2) · fail-closed (INV-1)
//   • checkEgress is PURE — no audit write (PF-1); assert persists once
//   • unionConsented reflects the sensitive×external union · typed EgressDenied(defId,reason)
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
import { CapabilityNotFound, type CapabilityDefinition, type GrantEnvelope } from '../../capability/types'
import { createEgressGuard } from '../service'
import {
  EgressDenied,
  type EgressAct,
  type EgressAuditRecord,
  type EgressConsentPort,
  type EgressTarget,
  type FetchEgressAct,
  type UserInitiationProof,
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
  return { db, registry, enforcer }
}

// A user def whose declaration hash the seeded grant must match (else envelope_changed).
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

const target = (over: Partial<EgressTarget> = {}): EgressTarget => ({
  integrationId: 'acme-bank',
  kind: 'external_system',
  label: 'ACME Bank',
  ...over,
})
const userInit = (): UserInitiationProof => ({ kind: 'user_action', at: 1000 })
const act = (over: Partial<EgressAct> = {}): EgressAct => ({
  defId: 'my_connector',
  target: target(),
  slice: { summary: 'account balance', sensitiveModules: [] },
  userInitiation: userInit(),
  ...over,
})
const yesConsent: EgressConsentPort = { async hasTargetConsent() { return true } }
function capturingAudit() {
  const entries: EgressAuditRecord[] = []
  return { entries, port: { async record(e: EgressAuditRecord) { entries.push(e) } } }
}

beforeAll(async () => {
  await initVault()
})

describe('createEgressGuard — pre-enforcer guards (fail-closed, no store touch)', () => {
  it('IR-2: an act without a user-initiation proof denies not_user_initiated', async () => {
    const { enforcer } = await harness()
    const guard = createEgressGuard(enforcer, { consent: yesConsent })
    // Deliberately type-violating input: a JS caller could omit the proof; the guard must still fail closed.
    const bad = { ...act(), userInitiation: undefined } as unknown as EgressAct
    expect(await guard.checkEgress(bad)).toEqual({ permitted: false, reason: 'not_user_initiated' })
  })

  it('R-3: an unresolved target integrationId denies target_unresolved', async () => {
    const { enforcer } = await harness()
    const guard = createEgressGuard(enforcer, { consent: yesConsent })
    const d = await guard.checkEgress(act({ target: target({ integrationId: '' }) }))
    expect(d).toEqual({ permitted: false, reason: 'target_unresolved' })
  })
})

describe('createEgressGuard — enforcer boolean + union (live store, INV-2/INV-3)', () => {
  it('external_out not granted → external_out_not_granted', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'my_connector', { external_out_ok: false })
    const guard = createEgressGuard(enforcer, { consent: yesConsent })
    const d = await guard.checkEgress(act())
    expect(d).toEqual({ permitted: false, reason: 'external_out_not_granted' })
  })

  it('INV-3: a sensitive slice without its consent → sensitive_consent_missing (union half absent)', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'my_connector', { external_out_ok: true, consented_sensitive_modules: [] })
    const guard = createEgressGuard(enforcer, { consent: yesConsent })
    const d = await guard.checkEgress(act({ slice: { summary: 'net worth', sensitiveModules: ['finance'] } }))
    expect(d).toEqual({ permitted: false, reason: 'sensitive_consent_missing' })
  })

  it('INV-1/R-2: boolean + union pass but no per-target consent → target_consent_missing (deny-safe default)', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'my_connector', { external_out_ok: true, consented_sensitive_modules: ['finance'] })
    const guard = createEgressGuard(enforcer) // default deny-safe consent port
    const d = await guard.checkEgress(act({ slice: { summary: 'net worth', sensitiveModules: ['finance'] } }))
    expect(d).toEqual({ permitted: false, reason: 'target_consent_missing' })
  })
})

describe('createEgressGuard — permit path + audit (PF-1, INV-5)', () => {
  it('permits a non-sensitive egress; unionConsented=false; assert persists once', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'my_connector', { external_out_ok: true })
    const audit = capturingAudit()
    const guard = createEgressGuard(enforcer, { consent: yesConsent, audit: audit.port })
    const rec = await guard.assertEgressPermitted(act())
    expect(rec.sliceSummary).toBe('account balance')
    expect(rec.unionConsented).toBe(false)
    expect(rec.target.integrationId).toBe('acme-bank')
    expect(audit.entries).toHaveLength(1) // persisted exactly once
  })

  it('permits a sensitive egress with the union satisfied; unionConsented=true', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'my_connector', { external_out_ok: true, consented_sensitive_modules: ['finance'] })
    const guard = createEgressGuard(enforcer, { consent: yesConsent })
    const rec = await guard.assertEgressPermitted(
      act({ slice: { summary: 'net worth', sensitiveModules: ['finance'] } }),
    )
    expect(rec.unionConsented).toBe(true)
    expect(rec.sensitiveModules).toEqual(['finance'])
  })

  it('PF-1: checkEgress is PURE — a permitted check writes NO audit row', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'my_connector', { external_out_ok: true })
    const audit = capturingAudit()
    const guard = createEgressGuard(enforcer, { consent: yesConsent, audit: audit.port })
    const d = await guard.checkEgress(act())
    expect(d.permitted).toBe(true)
    expect(audit.entries).toHaveLength(0) // no persistence on the check path
  })
})

describe('createEgressGuard — typed errors + INV-7', () => {
  it('assertEgressPermitted throws EgressDenied carrying defId + reason', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'my_connector', { external_out_ok: false })
    const guard = createEgressGuard(enforcer, { consent: yesConsent })
    await expect(guard.assertEgressPermitted(act())).rejects.toMatchObject({
      name: 'EgressDenied',
      defId: 'my_connector',
      reason: 'external_out_not_granted',
    })
    await expect(guard.assertEgressPermitted(act())).rejects.toBeInstanceOf(EgressDenied)
  })

  it('INV-7: an unresolvable def propagates CapabilityNotFound (a bug, not a policy deny)', async () => {
    const { enforcer } = await harness()
    const guard = createEgressGuard(enforcer, { consent: yesConsent })
    await expect(guard.checkEgress(act({ defId: 'ghost' }))).rejects.toBeInstanceOf(CapabilityNotFound)
  })
})

// ============================================================================
// S2 Verification Gate — compositional treat-fetch-as-egress (XCU-08, INV-4/R-4)
// "A fetch is an outbound request" — the same gate, with the fetch URL/params as the
// audited slice. Sensitive-read fetch ⇒ union-gated; non-sensitive fetch ⇒ boolean only.
// ============================================================================

const fetchAct = (over: Partial<FetchEgressAct> = {}): FetchEgressAct => ({
  defId: 'my_connector',
  source: target({ integrationId: 'rulepack-cdn', kind: 'webhook', label: 'Rule-pack CDN' }),
  fetchParams: 'GET /rulepack?jurisdiction=BR',
  slice: { summary: 'ignored — fetchParams is authoritative', sensitiveModules: [] },
  userInitiation: userInit(),
  ...over,
})

describe('assertFetchEgress — a fetch is an egress act (XCU-08)', () => {
  it('a sensitive-read fetch is union-gated: denies when the sensitive consent is absent', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    // external_out granted, but the sensitive module ('finance') is NOT consented → union fails.
    await seedGrant(db, 'my_connector', { external_out_ok: true, consented_sensitive_modules: [] })
    const guard = createEgressGuard(enforcer, { consent: yesConsent })
    await expect(
      guard.assertFetchEgress(fetchAct({ slice: { summary: '', sensitiveModules: ['finance'] } })),
    ).rejects.toMatchObject({ name: 'EgressDenied', reason: 'sensitive_consent_missing' })
  })

  it('a sensitive-read fetch permits with the union satisfied; fetchParams become the audited slice', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'my_connector', { external_out_ok: true, consented_sensitive_modules: ['finance'] })
    const guard = createEgressGuard(enforcer, { consent: yesConsent })
    const rec = await guard.assertFetchEgress(fetchAct({ slice: { summary: '', sensitiveModules: ['finance'] } }))
    expect(rec.sliceSummary).toBe('GET /rulepack?jurisdiction=BR') // the exfil channel is captured to audit
    expect(rec.unionConsented).toBe(true)
    expect(rec.target.integrationId).toBe('rulepack-cdn')
  })

  it('a non-sensitive fetch is gated by the external_out boolean only (no union)', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'my_connector', { external_out_ok: true })
    const guard = createEgressGuard(enforcer, { consent: yesConsent })
    const rec = await guard.assertFetchEgress(fetchAct()) // sensitiveModules: []
    expect(rec.unionConsented).toBe(false)
    expect(rec.sliceSummary).toBe('GET /rulepack?jurisdiction=BR')
  })

  it('a non-sensitive fetch still denies when external_out is not granted', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'my_connector', { external_out_ok: false })
    const guard = createEgressGuard(enforcer, { consent: yesConsent })
    await expect(guard.assertFetchEgress(fetchAct())).rejects.toMatchObject({
      reason: 'external_out_not_granted',
    })
  })
})
