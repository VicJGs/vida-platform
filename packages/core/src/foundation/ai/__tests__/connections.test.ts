// ============================================================================
// XS-ai #45 · S4 Verification Gate — ai_connections config registry (XCU-25)
//
// PURE slice — in-memory registry, no live DB (durable ai_connections = M2).
// Proves the slice-map S4 ledger:
//   • register/get/list deterministic (sorted list, ingestion-registry parity)
//   • the config carries NO key; a non-mediator key custody is REFUSED (key_not_mediated)
//   • a garbage mode fails loud (UnknownAiMode)
//   • the requested-not-guaranteed no-train flag is preserved verbatim
//   • typed AiConnectionDenied(integrationId, reason)
// ============================================================================

import { describe, it, expect } from 'vitest'
import { createAiConnectionRegistry } from '../connections'
import { AiConnectionDenied, UnknownAiMode, type AiConnection } from '../types'

const conn = (over: Partial<AiConnection> = {}): AiConnection => ({
  integrationId: 'anthropic',
  mode: 'cloud',
  provider: 'anthropic',
  defaultScope: 'finance-summary',
  requestedNoTrain: true,
  keyCustody: 'mediator',
  ...over,
})

describe('createAiConnectionRegistry — S4 (XCU-25)', () => {
  it('registers + gets a mediator-custodied connection; the config carries no key field', () => {
    const reg = createAiConnectionRegistry()
    const saved = reg.register(conn())
    expect(saved).toEqual(conn())
    expect(reg.get('anthropic')).toEqual(conn())
    expect(Object.keys(saved)).not.toContain('key')
    expect(Object.keys(saved)).not.toContain('encrypted_key')
  })

  it('XCU-25: a non-mediator key custody is refused (key_not_mediated), fail-closed', () => {
    const reg = createAiConnectionRegistry()
    expect(() => reg.register(conn({ keyCustody: 'inline' as AiConnection['keyCustody'] }))).toThrowError(
      AiConnectionDenied,
    )
    try {
      reg.register(conn({ integrationId: 'openai', keyCustody: 'sandbox' as AiConnection['keyCustody'] }))
    } catch (e) {
      expect(e).toBeInstanceOf(AiConnectionDenied)
      expect((e as AiConnectionDenied).reason).toBe('key_not_mediated')
      expect((e as AiConnectionDenied).integrationId).toBe('openai')
    }
    expect(reg.list()).toHaveLength(0) // nothing persisted on refusal
  })

  it('fails loud on a garbage mode (UnknownAiMode propagates)', () => {
    const reg = createAiConnectionRegistry()
    expect(() => reg.register(conn({ mode: 'server' as AiConnection['mode'] }))).toThrowError(UnknownAiMode)
  })

  it('preserves the requested-not-guaranteed no-train flag verbatim (both values)', () => {
    const reg = createAiConnectionRegistry()
    reg.register(conn({ integrationId: 'a', requestedNoTrain: true }))
    reg.register(conn({ integrationId: 'b', requestedNoTrain: false }))
    expect(reg.get('a')?.requestedNoTrain).toBe(true)
    expect(reg.get('b')?.requestedNoTrain).toBe(false)
  })

  it('supports both modes (on_device connection needs no cloud provider semantics)', () => {
    const reg = createAiConnectionRegistry()
    reg.register(conn({ integrationId: 'local-llama', mode: 'on_device', provider: 'llama.cpp' }))
    expect(reg.get('local-llama')?.mode).toBe('on_device')
  })

  it('list is deterministic (sorted by integrationId)', () => {
    const reg = createAiConnectionRegistry()
    reg.register(conn({ integrationId: 'zeta' }))
    reg.register(conn({ integrationId: 'alpha' }))
    reg.register(conn({ integrationId: 'mid' }))
    expect(reg.list().map((c) => c.integrationId)).toEqual(['alpha', 'mid', 'zeta'])
  })

  it('get returns null for an unknown connection', () => {
    expect(createAiConnectionRegistry().get('nope')).toBeNull()
  })
})
