// Pure — env `node`. Locks the ≥2-reachable-paths floor + dedupe + the typed error.
import { describe, expect, it } from 'vitest'
import { createReachabilityRegistry, UnreachableCapabilityError, type ReachPath } from './reachability-registry'

describe('createReachabilityRegistry', () => {
  it('dedupes repeated (capability, path) registrations', () => {
    const reg = createReachabilityRegistry()
    reg.register('tasks.create', 'dock')
    reg.register('tasks.create', 'dock')
    reg.register('tasks.create', 'command-bar')
    expect([...reg.getReach('tasks.create')].sort()).toEqual(['command-bar', 'dock'])
  })

  it('isReachable is true only at ≥2 distinct paths', () => {
    const reg = createReachabilityRegistry()
    expect(reg.isReachable('x')).toBe(false) // none
    reg.register('x', 'dock')
    expect(reg.isReachable('x')).toBe(false) // one
    reg.register('x', 'link')
    expect(reg.isReachable('x')).toBe(true) // two
  })

  it('assertReachable throws below the floor, passes at ≥2', () => {
    const reg = createReachabilityRegistry()
    reg.register('solo', 'dock')
    expect(() => reg.assertReachable('solo')).toThrow(UnreachableCapabilityError)
    expect(() => reg.assertReachable('missing')).toThrow(UnreachableCapabilityError)
    reg.register('solo', 'command-bar')
    expect(() => reg.assertReachable('solo')).not.toThrow()
  })

  it('the error names the capability + its current paths', () => {
    const reg = createReachabilityRegistry()
    reg.register('solo', 'dock')
    try {
      reg.assertReachable('solo')
      throw new Error('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(UnreachableCapabilityError)
      const err = e as UnreachableCapabilityError
      expect(err.capabilityId).toBe('solo')
      expect(err.paths).toEqual<ReachPath[]>(['dock'])
      expect(err.message).toMatch(/≥2/)
    }
  })

  it('registries are independent (factory, not a global singleton)', () => {
    const a = createReachabilityRegistry()
    const b = createReachabilityRegistry()
    a.register('x', 'dock')
    expect(b.getReach('x')).toEqual([])
  })
})
