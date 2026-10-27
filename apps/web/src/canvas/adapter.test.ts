// Pure — env `node` (no jsdom). Locks the Canvas↔CanvasView adapter (S2): the header mapping (title = user-named surface,
// EC-5/A) + the measure-driven progress resolver (R9/R9a — bar style AND label follow measurement_kind; unmeasured → no
// bar). The live useVisionBoard/useCalendar hooks are deferred (see ./CLAUDE.md).
import { describe, expect, it } from 'vitest'
import { type SavedViewLike, createCanvasAdapter, resolveMeasureProgress, toCanvasHeader } from './adapter'

const VIEW: SavedViewLike = { id: 'v1', name: 'Before I die' }

describe('toCanvasHeader', () => {
  it('uses the user-named surface as the title (never the month) — EC-5/A', () => {
    expect(toCanvasHeader(VIEW, 'Vision board')).toEqual({
      eyebrow: 'Vision board',
      title: 'Before I die',
      meta: undefined,
    })
  })
  it('carries an optional meta line', () => {
    expect(toCanvasHeader({ id: 'c', name: 'My calendar' }, 'Calendar', 'Today · Mon 10 Aug').meta).toBe(
      'Today · Mon 10 Aug',
    )
  })
})

describe('resolveMeasureProgress — measure-driven (R9/R9a)', () => {
  it('milestone → steps bar + "N of M steps"', () => {
    expect(resolveMeasureProgress({ kind: 'milestone', done: 2, total: 5 })).toEqual({
      showBar: true,
      fraction: 0.4,
      label: '2 of 5 steps',
    })
  })
  it('milestone with total 0 → no divide-by-zero (fraction 0)', () => {
    expect(resolveMeasureProgress({ kind: 'milestone', done: 0, total: 0 })).toEqual({
      showBar: true,
      fraction: 0,
      label: '0 of 0 steps',
    })
  })
  it('quantitative → value/target bar + "X of Y" (+ unit)', () => {
    expect(resolveMeasureProgress({ kind: 'quantitative', value: 4000, target: 10000, unit: ' kg' })).toEqual({
      showBar: true,
      fraction: 0.4,
      label: '4,000 kg of 10,000 kg',
    })
  })
  it('quantitative clamps a past-target value to 1', () => {
    expect(resolveMeasureProgress({ kind: 'quantitative', value: 120, target: 100 }).fraction).toBe(1)
  })
  it('rate → percent label from the normalized fraction', () => {
    expect(resolveMeasureProgress({ kind: 'rate', fraction: 0.8 })).toEqual({
      showBar: true,
      fraction: 0.8,
      label: '80%',
    })
  })
  it('qualitative → NO bar, the state is the label', () => {
    expect(resolveMeasureProgress({ kind: 'qualitative', state: 'Someday' })).toEqual({
      showBar: false,
      fraction: null,
      label: 'Someday',
    })
  })
  it('unmeasured (kind null) → NO bar, NO label', () => {
    expect(resolveMeasureProgress({ kind: null })).toEqual({ showBar: false, fraction: null, label: null })
  })
})

describe('createCanvasAdapter', () => {
  it('exposes the pure pieces', () => {
    const a = createCanvasAdapter()
    expect(a.toCanvasHeader(VIEW, 'Vision board').title).toBe('Before I die')
    expect(a.resolveMeasureProgress({ kind: 'rate', fraction: 0.5 }).label).toBe('50%')
  })
})
