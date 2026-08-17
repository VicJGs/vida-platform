import { describe, expect, it } from 'vitest'
import { isFeatureEnabled } from './feature-flags'

describe('isFeatureEnabled (M1.0 stub)', () => {
  it('fails closed — every flag is OFF until Preferences lands (S2-BR-b)', () => {
    expect(isFeatureEnabled('feature_gamification')).toBe(false)
    expect(isFeatureEnabled('anything')).toBe(false)
    expect(isFeatureEnabled('')).toBe(false)
  })
})
