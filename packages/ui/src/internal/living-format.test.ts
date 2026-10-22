import { describe, expect, it } from 'vitest'
import { formatHours } from './living-format'

// fe-calendar #19 · S5 — the purpose-budget hours formatter (PLAN-S5 BR-3 + BR-17 G5).
describe('formatHours', () => {
  it('whole hours → "6h" / "6 hours"; one → "1 hour"', () => {
    expect(formatHours(6)).toEqual({ text: '6h', sr: '6 hours' })
    expect(formatHours(1)).toEqual({ text: '1h', sr: '1 hour' })
    expect(formatHours(0)).toEqual({ text: '0h', sr: '0 hours' })
  })
  it('fractional → zero-padded minutes "2h30" / "2h05"', () => {
    expect(formatHours(2.5)).toEqual({ text: '2h30', sr: '2 hours 30 minutes' })
    expect(formatHours(2 + 5 / 60)).toEqual({ text: '2h05', sr: '2 hours 5 minutes' })
    expect(formatHours(0.5)).toEqual({ text: '0h30', sr: '30 minutes' })
    expect(formatHours(1 + 1 / 60)).toEqual({ text: '1h01', sr: '1 hour 1 minute' })
  })
  it('rounds to the minute (0.999h → "1h"; a sliver → "0h")', () => {
    expect(formatHours(0.9999)).toEqual({ text: '1h', sr: '1 hour' })
    expect(formatHours(0.001)).toEqual({ text: '0h', sr: '0 hours' })
  })
  it('non-finite / negative → null (the caller renders unmeasured + warns)', () => {
    expect(formatHours(Number.NaN)).toBeNull()
    expect(formatHours(-0.5)).toBeNull()
    expect(formatHours(Number.POSITIVE_INFINITY)).toBeNull()
  })
})
