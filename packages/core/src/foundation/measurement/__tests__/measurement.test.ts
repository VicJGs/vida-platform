// ============================================================================
// AR-7 Increment 3 — measurability engine tests (pure functions, no DB)
//
// Proves the ADR-011 contract:
//   • normalize each kind (direction-aware quantitative · n-of-m milestone ·
//     rate clamp · qualitative rating/scale · qualitative-unmeasured → null BR-2)
//   • fractal rollup (equal-weight default · weighted · null-exclusion · all-null → null)
//   • resolveProgress NULL⇒derive
//   • assertAcyclic accepts a DAG, rejects a cycle (both edge modes)
//   • measurement-source seam: advertise/query, unadvertised ⇒ null
// ============================================================================

import { describe, it, expect } from 'vitest'
import { normalize, rollup, resolveProgress, assertAcyclic } from '../engine'
import { MeasurementCycle, type Binding } from '../types'
import { createMeasurementSourceRegistry } from '../source-registry'

describe('normalize (§3.1)', () => {
  it('quantitative: direction-aware, clamped', () => {
    expect(normalize({ kind: 'quantitative', current: 5, baseline: 0, target: 10, isHigherBetter: true })).toBe(0.5)
    // lower-is-better (e.g. lose weight 90 → 80): current 85 = halfway
    expect(normalize({ kind: 'quantitative', current: 85, baseline: 90, target: 80, isHigherBetter: false })).toBe(0.5)
    // clamp beyond target
    expect(normalize({ kind: 'quantitative', current: 20, baseline: 0, target: 10, isHigherBetter: true })).toBe(1)
    // degenerate baseline==target
    expect(normalize({ kind: 'quantitative', current: 10, baseline: 10, target: 10, isHigherBetter: true })).toBe(1)
  })
  it('milestone: done and n-of-m', () => {
    expect(normalize({ kind: 'milestone', done: true })).toBe(1)
    expect(normalize({ kind: 'milestone', done: false })).toBe(0)
    expect(normalize({ kind: 'milestone', nDone: 3, n: 4 })).toBe(0.75)
    expect(normalize({ kind: 'milestone', nDone: 0, n: 0 })).toBe(0)
  })
  it('rate: clamped ratio', () => {
    expect(normalize({ kind: 'rate', value: 0.42 })).toBe(0.42)
    expect(normalize({ kind: 'rate', value: 1.5 })).toBe(1)
  })
  it('qualitative: rating/scale, and unmeasured → null (BR-2, never 0)', () => {
    expect(normalize({ kind: 'qualitative', rating: 3, scaleMax: 5 })).toBe(0.6)
    expect(normalize({ kind: 'qualitative' })).toBeNull() // no scale set
    expect(normalize({ kind: 'qualitative', scaleMax: 5 })).toBeNull() // no rating yet
  })
})

describe('rollup (§3.3)', () => {
  it('equal-weight by default (all null weights → mean)', () => {
    expect(rollup([{ progress: 0.2 }, { progress: 0.8 }])).toBeCloseTo(0.5)
  })
  it('respects explicit weights', () => {
    // (1*3 + 0*1) / (3+1) = 0.75
    expect(
      rollup([
        { progress: 1, weight: 3 },
        { progress: 0, weight: 1 },
      ]),
    ).toBe(0.75)
  })
  it('excludes null-progress children (unmeasured cannot drag down)', () => {
    expect(rollup([{ progress: 1 }, { progress: null }])).toBe(1)
  })
  it('all-null / empty set → null (not 0)', () => {
    expect(rollup([{ progress: null }, { progress: null }])).toBeNull()
    expect(rollup([])).toBeNull()
  })
})

describe('resolveProgress (§3.2)', () => {
  it('NULL ⇒ derive; a stored value overrides', () => {
    expect(resolveProgress(null, () => 0.4)).toBe(0.4)
    expect(resolveProgress(0.9, () => 0.4)).toBe(0.9)
  })
})

describe('assertAcyclic (§3.7)', () => {
  const ref = (id: string) => ({ type: 'goal', id })
  it('accepts a DAG', () => {
    const dag: Binding[] = [
      { mode: 'derived-pull', source: ref('a'), target: ref('b') },
      { mode: 'event-trigger', source: ref('b'), target: ref('c') },
    ]
    expect(() => assertAcyclic(dag)).not.toThrow()
  })
  it('rejects a cycle spanning both edge modes', () => {
    const cyclic: Binding[] = [
      { mode: 'event-trigger', source: ref('a'), target: ref('b') },
      { mode: 'derived-pull', source: ref('b'), target: ref('a') },
    ]
    expect(() => assertAcyclic(cyclic)).toThrow(MeasurementCycle)
  })
})

describe('measurement-source seam (§3.6)', () => {
  it('advertise/query; an unadvertised key ⇒ null (never fabricated)', () => {
    const reg = createMeasurementSourceRegistry()
    reg.advertise('net_worth', () => 12345)
    expect(reg.has('net_worth')).toBe(true)
    expect(reg.query('net_worth')).toBe(12345)
    expect(reg.query('body_weight')).toBeNull()
  })
})
