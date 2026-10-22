import { describe, expect, it } from 'vitest'
import { formatHour, HOUR_PX, layoutDay, normalizeSpan, windowFor } from './week-layout'

// fe-calendar #19 · S3 — the pure time-column geometry behind WeekView (PLAN-S3 BR-3/6/7/8).
const span = (start: number, end: number) => ({ start, end })

describe('formatHour (BR-3)', () => {
  it('24h: HH:mm, rounded to the minute (never "09:60")', () => {
    expect(formatHour(9.5, '24h', 'start')).toBe('09:30')
    expect(formatHour(9.9999, '24h', 'start')).toBe('10:00')
    expect(formatHour(0, '24h', 'start')).toBe('00:00')
  })
  it('a start clamps to 23:59; an end may read 24:00', () => {
    expect(formatHour(23.9999, '24h', 'start')).toBe('23:59')
    expect(formatHour(24, '24h', 'end')).toBe('24:00')
  })
  it('12h: h:mm am|pm with minutes always, incl. midnight/noon edges', () => {
    expect(formatHour(13.5, '12h', 'start')).toBe('1:30 pm')
    expect(formatHour(9, '12h', 'start')).toBe('9:00 am')
    expect(formatHour(0, '12h', 'start')).toBe('12:00 am')
    expect(formatHour(12, '12h', 'start')).toBe('12:00 pm')
    expect(formatHour(12.5, '12h', 'start')).toBe('12:30 pm')
    expect(formatHour(23.9999, '12h', 'start')).toBe('11:59 pm')
    expect(formatHour(24, '12h', 'end')).toBe('12:00 am')
  })
  it('gutter: whole hours; 12h drops ":00"', () => {
    expect(formatHour(8, '24h', 'gutter')).toBe('08:00')
    expect(formatHour(8, '12h', 'gutter')).toBe('8 am')
    expect(formatHour(12, '12h', 'gutter')).toBe('12 pm')
    expect(formatHour(0, '12h', 'gutter')).toBe('12 am')
  })
})

describe('normalizeSpan (BR-7)', () => {
  it('absent end → +1h', () => expect(normalizeSpan(9)).toEqual({ start: 9, end: 10, endFixed: false }))
  it('end ≤ start or non-finite → +1h, flagged', () => {
    expect(normalizeSpan(9, 8)).toEqual({ start: 9, end: 10, endFixed: true })
    expect(normalizeSpan(9, Number.NaN)).toEqual({ start: 9, end: 10, endFixed: true })
  })
  it('end > 24 clamps to 24 (multi-day spans are the provider’s to split)', () => {
    expect(normalizeSpan(22, 27)).toEqual({ start: 22, end: 24, endFixed: false })
    expect(normalizeSpan(23.5)).toEqual({ start: 23.5, end: 24, endFixed: false })
  })
  it('a non-finite or out-of-[0,24) start is not renderable', () => {
    expect(normalizeSpan(Number.NaN)).toBeNull()
    expect(normalizeSpan(-1)).toBeNull()
    expect(normalizeSpan(24)).toBeNull()
  })
})

describe('windowFor (BR-6)', () => {
  it('default [8,20] when every span fits', () => {
    expect(windowFor([span(9, 10)])).toEqual({ window: [8, 20], hoursInvalid: false })
  })
  it('auto-extends to show early and late spans (minimum window, never a clip)', () => {
    expect(windowFor([span(6.5, 7.5), span(21, 22)]).window).toEqual([6, 22])
  })
  it('a late short span extends by its DRAWN end, clamped to 24', () => {
    expect(windowFor([span(23.8, 23.9)]).window).toEqual([8, 24])
  })
  it('invalid hours → default + flagged', () => {
    expect(windowFor([], [8.5, 20])).toEqual({ window: [8, 20], hoursInvalid: true })
    expect(windowFor([], [20, 8])).toEqual({ window: [8, 20], hoursInvalid: true })
    expect(windowFor([], [-1, 20])).toEqual({ window: [8, 20], hoursInvalid: true })
    expect(windowFor([], [6, 18])).toEqual({ window: [6, 18], hoursInvalid: false })
  })
  it('stays finite on an empty renderable set', () => {
    expect(windowFor([]).window).toEqual([8, 20])
  })
})

describe('layoutDay (BR-7/8)', () => {
  const W = [8, 20] as const
  const lanesOf = (out: ReturnType<typeof layoutDay>) => out.map((o) => [o.lane, o.lanes])

  it('no overlap → one lane each, full width', () => {
    expect(lanesOf(layoutDay([span(9, 10), span(10, 11)], W))).toEqual([[0, 1], [0, 1]])
  })
  it('an overlapping pair → 2 lanes', () => {
    expect(lanesOf(layoutDay([span(9, 11), span(10, 12)], W))).toEqual([[0, 2], [1, 2]])
  })
  it('a chain A∩B, B∩C, A∌C → 2 lanes, C reuses lane 0', () => {
    expect(lanesOf(layoutDay([span(9, 10.5), span(10, 12), span(11, 12)], W))).toEqual([[0, 2], [1, 2], [0, 2]])
  })
  it('a cluster ends where overlap ends — a later lone block is full width again', () => {
    expect(lanesOf(layoutDay([span(9, 10), span(9.5, 10.5), span(15, 16)], W))).toEqual([[0, 2], [1, 2], [0, 1]])
  })
  it('a 3-way mutual overlap → 3 lanes', () => {
    expect(lanesOf(layoutDay([span(9, 11), span(9.5, 11), span(10, 11)], W))).toEqual([[0, 3], [1, 3], [2, 3]])
  })
  it('identical starts → longer first lane-wise, input order preserved in the output', () => {
    const out = layoutDay([span(9, 9.5), span(9, 11)], W)
    expect(out.map((o) => o.item.end)).toEqual([9.5, 11])
    expect(lanesOf(out)).toEqual([[1, 2], [0, 2]])
  })
  it('drawn extent: a 09:00–09:15 block (drawn 24px) and a 09:15 block → 2 lanes', () => {
    expect(lanesOf(layoutDay([span(9, 9.25), span(9.25, 10)], W))).toEqual([[0, 2], [1, 2]])
  })
  it('late clamp BEFORE clustering: 23:15–23:45 + 23:50 → 2 lanes, both inside the grid', () => {
    const out = layoutDay([span(23.25, 23.75), span(23 + 50 / 60, 24)], [8, 24])
    expect(lanesOf(out)).toEqual([[0, 2], [1, 2]])
    const gridH = (24 - 8) * HOUR_PX
    for (const o of out) expect(o.top + o.height).toBeLessThanOrEqual(gridH)
  })
  it('geometry: top/height from the window at HOUR_PX, min 24px', () => {
    const [a, b] = layoutDay([span(9.5, 11), span(14, 14.1)], W)
    expect(a.top).toBe(1.5 * HOUR_PX)
    expect(a.height).toBe(1.5 * HOUR_PX)
    expect(b.height).toBe(24)
  })
  it('compact = drawn height < 44 OR ≥ 3 lanes (the ONE rule)', () => {
    expect(layoutDay([span(9, 10)], W)[0].compact).toBe(false) // 48px
    expect(layoutDay([span(9, 9.75)], W)[0].compact).toBe(true) // 36px
    const three = layoutDay([span(9, 10), span(9, 10), span(9, 10)], W)
    expect(three.every((o) => o.compact)).toBe(true) // 1h but a ⅓ lane
  })
})
