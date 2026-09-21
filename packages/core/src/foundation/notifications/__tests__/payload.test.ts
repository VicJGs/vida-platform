// ============================================================================
// XS-notifications-delivery #46 · S1 Verification Gate — content-minimal payload
// (XCU-08 / XCU-16). PURE slice. Proves the content-zero invariant (DEL-1/IR-3):
//   • buildWakePayload returns routing-only { kind:'wake', userId, targetDeviceIds? }
//   • it REFUSES every forbidden content/type/entity key, loud, carrying the field
//   • it refuses a missing routing target (fail-loud, not a silent empty payload)
// ============================================================================

import { describe, it, expect } from 'vitest'
import { buildWakePayload } from '../payload'
import { FORBIDDEN_PAYLOAD_KEYS, PayloadNotContentFree, type RoutingMeta } from '../types'

describe('XS-notifications-delivery S1 — buildWakePayload (XCU-08 content-zero)', () => {
  it('builds a content-free wake payload from owner routing metadata only', () => {
    const p = buildWakePayload({ userId: 'u1' })
    expect(p).toEqual({ kind: 'wake', userId: 'u1' })
  })

  it('passes targetDeviceIds (closed devices to wake) through', () => {
    const p = buildWakePayload({ userId: 'u1', targetDeviceIds: ['d1', 'd2'] })
    expect(p).toEqual({ kind: 'wake', userId: 'u1', targetDeviceIds: ['d1', 'd2'] })
  })

  it('carries NO content/type/entity field — the payload has exactly the routing shape', () => {
    const p = buildWakePayload({ userId: 'u1', targetDeviceIds: ['d1'] })
    expect(Object.keys(p).sort()).toEqual(['kind', 'targetDeviceIds', 'userId'])
  })

  it('REFUSES every forbidden key, loud, carrying the offending field (IR-3)', () => {
    for (const key of FORBIDDEN_PAYLOAD_KEYS) {
      const dirty = { userId: 'u1', [key]: 'leak' } as unknown as RoutingMeta
      expect(() => buildWakePayload(dirty)).toThrowError(PayloadNotContentFree)
      try {
        buildWakePayload(dirty)
      } catch (e) {
        expect(e).toBeInstanceOf(PayloadNotContentFree)
        expect((e as PayloadNotContentFree).field).toBe(key)
      }
    }
  })

  it('ignores a forbidden key set to undefined (absent, not a leak)', () => {
    const p = buildWakePayload({ userId: 'u1', title: undefined } as unknown as RoutingMeta)
    expect(p).toEqual({ kind: 'wake', userId: 'u1' })
  })

  it('refuses a missing routing target, fail-loud', () => {
    expect(() => buildWakePayload({ userId: '' })).toThrowError(PayloadNotContentFree)
    expect(() => buildWakePayload({} as unknown as RoutingMeta)).toThrowError(PayloadNotContentFree)
  })
})
