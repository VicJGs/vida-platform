// ============================================================================
// XS-ingestion #44 · S5 Verification Gate — integration registry + connector seams
// (XCU-14/15/16). In-memory (durable rows are M2 · U-4). Proves the S5 ledger:
//   • register + resolve an integration-identity + normalization contract
//   • a native/user-managed upgrade keeps the same identity + contract (IR-11)
//   • a user-managed connector without mediator custody is refused (XCU-16/09)
//   • deterministic list() · duplicate-identity refused · native adapter on unknown → refused
//   • typed RegistryDenied(integrationId, reason)
// ============================================================================

import { describe, it, expect } from 'vitest'
import { createIntegrationRegistry } from '../registry'
import type { IngestionSource, NormalizationContract, UserConnectorDef } from '../types'

const contract = (id = 'finance-v1'): NormalizationContract => ({
  id,
  fields: [{ name: 'amount', type: 'int' }],
  units: 'cents',
  timestamps: ['posted_at'],
  dedupKey: ['fitid'],
})
const source = (over: Partial<IngestionSource> = {}): IngestionSource => ({
  integrationId: 'acme-bank',
  layer: 'user-managed',
  normalizationContractId: 'finance-v1',
  ...over,
})

describe('createIntegrationRegistry — S5 (XCU-14/15/16)', () => {
  it('XCU-14: register + resolve an integration-identity + its normalization contract', () => {
    const reg = createIntegrationRegistry()
    reg.register(source(), contract())
    const got = reg.get('acme-bank')
    expect(got?.source.integrationId).toBe('acme-bank')
    expect(got?.contract.id).toBe('finance-v1')
    expect(reg.get('nope')).toBeNull()
  })

  it('refuses a duplicate integration-identity', () => {
    const reg = createIntegrationRegistry()
    reg.register(source(), contract())
    expect(() => reg.register(source(), contract())).toThrowError(
      expect.objectContaining({ name: 'RegistryDenied', reason: 'duplicate_identity' }),
    )
  })

  it('list() is deterministic (sorted by identity)', () => {
    const reg = createIntegrationRegistry()
    reg.register(source({ integrationId: 'zeta' }), contract())
    reg.register(source({ integrationId: 'alpha' }), contract())
    expect(reg.list().map((s) => s.integrationId)).toEqual(['alpha', 'zeta'])
  })

  it('IR-11: a native-adapter upgrade keeps the SAME identity + contract (connector migration, not data)', () => {
    const reg = createIntegrationRegistry()
    reg.register(source({ integrationId: 'acme-bank', layer: 'user-managed' }), contract())
    reg.registerNativeAdapter('acme-bank', { integrationId: 'acme-bank' })
    const got = reg.get('acme-bank')
    expect(got?.source.layer).toBe('native') // upgraded
    expect(got?.source.integrationId).toBe('acme-bank') // same identity
    expect(got?.source.normalizationContractId).toBe('finance-v1') // same contract
    expect(got?.contract.id).toBe('finance-v1')
  })

  it('XCU-15: a native adapter on an unknown integration is refused', () => {
    const reg = createIntegrationRegistry()
    expect(() => reg.registerNativeAdapter('ghost', { integrationId: 'ghost' })).toThrowError(
      expect.objectContaining({ name: 'RegistryDenied', reason: 'unknown_integration' }),
    )
  })

  it('XCU-16: a mediator-custodied user-managed connector registers at the user-managed layer', () => {
    const reg = createIntegrationRegistry()
    const def: UserConnectorDef = {
      integrationId: 'my-webhook',
      contract: contract('wh-v1'),
      credentialCustody: 'mediator',
    }
    reg.registerUserManagedConnector(def)
    expect(reg.get('my-webhook')?.source.layer).toBe('user-managed')
    expect(reg.get('my-webhook')?.contract.id).toBe('wh-v1')
  })

  it('XCU-16/09: a connector that would hold its own credential is refused', () => {
    const reg = createIntegrationRegistry()
    const def = {
      integrationId: 'leaky',
      contract: contract('leak-v1'),
      credentialCustody: 'self' as unknown as 'mediator',
    }
    expect(() => reg.registerUserManagedConnector(def)).toThrowError(
      expect.objectContaining({ name: 'RegistryDenied', reason: 'credential_not_mediated' }),
    )
  })
})
