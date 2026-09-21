// ============================================================================
// XS-ai #45 · S2 Verification Gate — askModel core (XCU-22/19/27/26)
//
// Live-store smoke on the REAL data store (better-sqlite3 + migrations + Repository),
// not fixtures: the external_out boolean + sensitive union read a real
// `capability_grants` row seeded via the Repository, and the cloud gate runs the
// BUILT egress guard #43. Proves the slice-map S2 ledger:
//   • on-device: permits, egresses NOTHING (no audit), disclosure.mode='on_device'
//   • cloud permit: external_out + per-target consent + sensitive union ⇒ AI-egress
//     audit record (XCU-27); the forwarded slice == the caller's slice (scope-min XCU-19)
//   • cloud deny reasons PROPAGATE verbatim from egress #43 (external_out_not_granted ·
//     not_user_initiated · sensitive_consent_missing · target_consent_missing)
//   • askModel on-device: on_device_unavailable (M1 deny-safe, XCU-26)
//   • askModel cloud permitted-but-no-mediator: model_unavailable (M1 deny-safe, XCU-22);
//     the egress gate was still ASSERTED (audit recorded) before the mediator check
//   • askModel re-hits the egress gate every call (IR-8) · wired ports dispatch + the
//     mediator receives only (target, slice) — never a key (XCU-22 custody)
//   • typed AiDenied(defId, reason)
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
import {
  createEgressGuard,
  type EgressAuditPort,
  type EgressAuditRecord,
  type EgressConsentPort,
  type EgressSlice,
  type EgressTarget,
  type UserInitiationProof,
} from '../../egress'
import { createAiService } from '../service'
import {
  type AiMediatorPort,
  type AiOnDeviceRequest,
  type AiPorts,
  type AiRequest,
  type OnDeviceRuntimePort,
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

const userDef = (over: Partial<CapabilityDefinition> = {}): CapabilityDefinition => ({
  id: 'ai_agent',
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
  const repo = createRepository(db, capabilityGrants, { deviceId: 'device-1', encryptedFields: [], softDelete: true })
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

const MODEL: EgressTarget = { integrationId: 'anthropic', kind: 'model', label: 'Claude' }
const SLICE: EgressSlice = { summary: 'summarize my October transactions', sensitiveModules: ['finance'] }
const INIT: UserInitiationProof = { kind: 'user_action', at: 1000 }
const cloud = (over: Partial<AiRequest> = {}): AiRequest =>
  ({ defId: 'ai_agent', mode: 'cloud', target: MODEL, slice: SLICE, userInitiation: INIT, ...over }) as AiRequest
const onDeviceReq: AiOnDeviceRequest = { defId: 'ai_agent', mode: 'on_device' }

const yesConsent: EgressConsentPort = { async hasTargetConsent() { return true } }
function spyAudit(): { port: EgressAuditPort; records: EgressAuditRecord[] } {
  const records: EgressAuditRecord[] = []
  return { port: { async record(e) { records.push(e) } }, records }
}

beforeAll(async () => {
  await initVault()
})

describe('createAiService — S2 (XCU-22/19/27/26) · live store', () => {
  it('XCU-18 on-device: permits, egresses nothing (no audit), carries the on-device disclosure', async () => {
    const { enforcer } = await harness()
    const ai = createAiService(createEgressGuard(enforcer))
    const d = await ai.checkModelCall(onDeviceReq)
    expect(d.permitted).toBe(true)
    expect(d.disclosure.mode).toBe('on_device')
    expect(d.audit).toBeUndefined() // nothing left the vault → no egress record
  })

  it('XCU-19 cloud permit: external_out + consent + sensitive union ⇒ AI-egress audit; slice forwarded verbatim (scope-min)', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'ai_agent', { external_out_ok: true, consented_sensitive_modules: ['finance'] })
    const ai = createAiService(createEgressGuard(enforcer, { consent: yesConsent }))
    const d = await ai.checkModelCall(cloud())
    expect(d.permitted).toBe(true)
    expect(d.disclosure.mode).toBe('cloud')
    expect(d.audit?.target.kind).toBe('model')
    // scope-min (XCU-19): the tier forwards ONLY the caller's slice — never widens it.
    expect(d.audit?.sliceSummary).toBe(SLICE.summary)
    expect(d.audit?.sensitiveModules).toEqual(['finance'])
    expect(d.audit?.unionConsented).toBe(true)
  })

  it('cloud deny reasons propagate verbatim from egress #43 (R-4)', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    // external_out NOT granted
    await seedGrant(db, 'ai_agent', { external_out_ok: false })
    const ai1 = createAiService(createEgressGuard(enforcer, { consent: yesConsent }))
    expect((await ai1.checkModelCall(cloud())).reason).toBe('external_out_not_granted')

    // granted + sensitive, but no user-initiation ⇒ never-auto-transmit
    const noInit = cloud()
    delete (noInit as { userInitiation?: unknown }).userInitiation
    const { db: db2, registry: r2, enforcer: e2 } = await harness()
    await r2.register(userDef())
    await seedGrant(db2, 'ai_agent', { external_out_ok: true, consented_sensitive_modules: ['finance'] })
    const ai2 = createAiService(createEgressGuard(e2, { consent: yesConsent }))
    expect((await ai2.checkModelCall(noInit)).reason).toBe('not_user_initiated')

    // granted external_out but the sensitive class is NOT consented ⇒ union half fails
    const { db: db3, registry: r3, enforcer: e3 } = await harness()
    await r3.register(userDef())
    await seedGrant(db3, 'ai_agent', { external_out_ok: true, consented_sensitive_modules: [] })
    const ai3 = createAiService(createEgressGuard(e3, { consent: yesConsent }))
    expect((await ai3.checkModelCall(cloud())).reason).toBe('sensitive_consent_missing')

    // all grants present but the per-target consent port denies (M1 deny-safe default)
    const { db: db4, registry: r4, enforcer: e4 } = await harness()
    await r4.register(userDef())
    await seedGrant(db4, 'ai_agent', { external_out_ok: true, consented_sensitive_modules: ['finance'] })
    const ai4 = createAiService(createEgressGuard(e4)) // deny-safe consent
    expect((await ai4.checkModelCall(cloud())).reason).toBe('target_consent_missing')
  })

  it('askModel on-device with no runtime ⇒ AiDenied(on_device_unavailable) (M1 deny-safe)', async () => {
    const { enforcer } = await harness()
    const ai = createAiService(createEgressGuard(enforcer))
    await expect(ai.askModel(onDeviceReq)).rejects.toMatchObject({ name: 'AiDenied', reason: 'on_device_unavailable' })
  })

  it('askModel cloud permitted-but-no-mediator ⇒ model_unavailable; egress asserted (audit recorded) first', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'ai_agent', { external_out_ok: true, consented_sensitive_modules: ['finance'] })
    const audit = spyAudit()
    const ai = createAiService(createEgressGuard(enforcer, { consent: yesConsent, audit: audit.port }))
    await expect(ai.askModel(cloud())).rejects.toMatchObject({ name: 'AiDenied', reason: 'model_unavailable' })
    expect(audit.records).toHaveLength(1) // the gate was asserted + audited before the mediator check (XCU-27)
  })

  it('askModel cloud denied by egress ⇒ AiDenied carries the egress reason verbatim; nothing audited', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'ai_agent', { external_out_ok: false })
    const audit = spyAudit()
    const ai = createAiService(createEgressGuard(enforcer, { consent: yesConsent, audit: audit.port }))
    await expect(ai.askModel(cloud())).rejects.toMatchObject({ name: 'AiDenied', reason: 'external_out_not_granted' })
    expect(audit.records).toHaveLength(0) // a denied call never records a what-left row
  })

  it('IR-8: every askModel re-hits the egress gate (two permitted calls ⇒ two audit records)', async () => {
    const { db, registry, enforcer } = await harness()
    await registry.register(userDef())
    await seedGrant(db, 'ai_agent', { external_out_ok: true, consented_sensitive_modules: ['finance'] })
    const audit = spyAudit()
    const called: Array<{ target: EgressTarget; slice: EgressSlice }> = []
    const mediator: AiMediatorPort = {
      async call(target, slice) {
        called.push({ target, slice })
        return { content: 'ok' }
      },
    }
    const ai = createAiService(createEgressGuard(enforcer, { consent: yesConsent, audit: audit.port }), { mediator })
    await ai.askModel(cloud())
    await ai.askModel(cloud())
    expect(audit.records).toHaveLength(2) // re-hit, not cached
    // XCU-22 custody: the mediator receives ONLY (target, slice) — no credential ever passes through.
    expect(called).toHaveLength(2)
    expect(Object.keys(called[0]!)).toEqual(['target', 'slice'])
    expect(called[0]!.target.kind).toBe('model')
  })

  it('wired on-device runtime dispatches without any egress', async () => {
    const { enforcer } = await harness()
    const audit = spyAudit()
    const onDevice: OnDeviceRuntimePort = { async run() { return { content: 'local answer' } } }
    const ports: AiPorts = { onDevice }
    const ai = createAiService(createEgressGuard(enforcer, { audit: audit.port }), ports)
    const res = await ai.askModel(onDeviceReq)
    expect(res.content).toBe('local answer')
    expect(audit.records).toHaveLength(0) // on-device egresses nothing (ZK-safe path)
  })

  it('a garbage mode fails loud (UnknownAiMode propagates, not a policy deny)', async () => {
    const { enforcer } = await harness()
    const ai = createAiService(createEgressGuard(enforcer))
    await expect(ai.checkModelCall({ defId: 'ai_agent', mode: 'hybrid' } as unknown as AiRequest)).rejects.toMatchObject({ name: 'UnknownAiMode' })
  })
})
