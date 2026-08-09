// Pure — env `node`. Locks the step-model integrity the UI-4 renderer relies on.
import { describe, expect, it } from 'vitest'

import { ONBOARDING_STEPS, type OnboardingStepKind } from './steps'

const KINDS: readonly OnboardingStepKind[] = ['intro', 'explain', 'vault-create', 'complete']

describe('ONBOARDING_STEPS', () => {
  it('has four ordered steps with unique ids', () => {
    expect(ONBOARDING_STEPS).toHaveLength(4)
    expect(new Set(ONBOARDING_STEPS.map((s) => s.id)).size).toBe(4)
  })
  it('starts at welcome and every kind is valid', () => {
    expect(ONBOARDING_STEPS[0].id).toBe('welcome')
    for (const s of ONBOARDING_STEPS) expect(KINDS).toContain(s.kind)
  })
  it('has complete as the terminal step, and no deferred step is terminal', () => {
    const last = ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1]
    expect(last.kind).toBe('complete')
    expect(last.deferredImpl).toBeUndefined()
    const deferredIdx = ONBOARDING_STEPS.findIndex((s) => s.deferredImpl !== undefined)
    if (deferredIdx !== -1) expect(deferredIdx).toBeLessThan(ONBOARDING_STEPS.length - 1)
  })
  it('gives every step an M1.0 copy claim', () => {
    for (const s of ONBOARDING_STEPS) expect(s.copy.m1.length).toBeGreaterThan(0)
  })
})
