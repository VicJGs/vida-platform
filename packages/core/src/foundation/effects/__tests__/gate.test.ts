// ============================================================================
// XS-effect-rail #32 · S2 — fire-time validation gate (XCU-22)
// Pure-fn Verification Gate — no live store (a live-store integration lands in S3).
//   A1 sensitive + unconsented → throws · A2 sensitive + consented → passes
//   A3 non-sensitive → passes · A4 undefined class → passes
//   A5 projection + sensitive → passes (short-circuit) · A6 taxonomy re-export
// ============================================================================

import { describe, it, expect } from 'vitest'
import { SENSITIVE_MODULE_CLASSES } from '../../capability'
import { assertEffectPermitted, EffectConsentMissing } from '../gate'

describe('XS-effect-rail #32 · S2 — assertEffectPermitted (XCU-22)', () => {
  it('A1 — sensitive target not in consented set → throws EffectConsentMissing', () => {
    expect(() =>
      assertEffectPermitted({ consentedSensitiveModules: [] }, 'award_xp', 'finance'),
    ).toThrow(EffectConsentMissing)
  })

  it('A2 — sensitive target in consented set → passes', () => {
    expect(() =>
      assertEffectPermitted({ consentedSensitiveModules: ['finance'] }, 'award_xp', 'finance'),
    ).not.toThrow()
  })

  it('A3 — non-sensitive target → passes regardless of consent', () => {
    expect(() =>
      assertEffectPermitted({ consentedSensitiveModules: [] }, 'award_xp', 'gamification'),
    ).not.toThrow()
  })

  it('A4 — undefined moduleClass → passes', () => {
    expect(() =>
      assertEffectPermitted({ consentedSensitiveModules: [] }, 'award_xp', undefined),
    ).not.toThrow()
  })

  it('A5 — projection effect with a sensitive class → passes (short-circuit, BR-S2-4)', () => {
    expect(() =>
      assertEffectPermitted({ consentedSensitiveModules: [] }, 'surface_journal', 'health'),
    ).not.toThrow()
  })

  it('A6 — SENSITIVE_MODULE_CLASSES is re-exported from the capability barrel', () => {
    expect(SENSITIVE_MODULE_CLASSES).toEqual(['finance', 'health'])
  })

  it('carries the offending effect + module on the typed error', () => {
    try {
      assertEffectPermitted({ consentedSensitiveModules: ['health'] }, 'award_xp', 'finance')
      expect.unreachable('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(EffectConsentMissing)
      expect((e as EffectConsentMissing).effectType).toBe('award_xp')
      expect((e as EffectConsentMissing).moduleClass).toBe('finance')
    }
  })
})
