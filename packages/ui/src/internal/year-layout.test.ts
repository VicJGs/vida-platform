// TZ guard: a negative-offset zone is where the 'YYYY-MM-DD'→UTC off-by-one bites. Set before any Date use.
process.env.TZ = 'America/Sao_Paulo'
import { describe, expect, it } from 'vitest'
import { buildYear, indexDensity, resolveYear } from './year-layout'

// fe-calendar #19 · S4 — the pure mini-month geometry + density guards behind YearView (PLAN-S4 BR-3/10).
const NOW = new Date(2026, 9, 20, 12)

describe('resolveYear (BR-10)', () => {
  it('passes a valid year through, no warning', () => {
    expect(resolveYear(2026, NOW)).toEqual({ year: 2026 })
    expect(resolveYear(1000, NOW)).toEqual({ year: 1000 })
    expect(resolveYear(9999, NOW)).toEqual({ year: 9999 })
  })
  it('falls back to now’s year + warns on a non-integer / out-of-range year', () => {
    for (const bad of [50, 10000, 2026.5, Number.NaN]) {
      const r = resolveYear(bad, NOW)
      expect(r.year).toBe(2026)
      expect(r.warning).toMatch(/year/)
    }
  })
})

describe('buildYear (BR-3)', () => {
  const y2026 = buildYear(2026, 1)

  it('12 months, Jan→Dec', () => {
    expect(y2026.map((m) => m.month)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })
  it('leading offset follows the week start (2026-10-01 is a Thursday)', () => {
    expect(y2026[9].offset).toBe(3)
    expect(buildYear(2026, 0)[9].offset).toBe(4)
  })
  it('days-in-month incl. leap years', () => {
    expect(y2026[1].days).toBe(28)
    expect(buildYear(2028, 1)[1].days).toBe(29)
    expect(y2026[0].days).toBe(31)
    expect(y2026[3].days).toBe(30)
  })
  it('every row has 7 slots; spacers lead and trail, days in between', () => {
    for (const m of y2026) {
      for (const row of m.rows) expect(row).toHaveLength(7)
      const slots = m.rows.flat()
      const days = slots.filter((s) => s.kind === 'day')
      expect(days).toHaveLength(m.days)
      expect(slots.findIndex((s) => s.kind === 'day')).toBe(m.offset)
    }
  })
  it('day keys are YYYY-MM-DD by calendar fields, columns 1-based + offset-aware', () => {
    const oct = y2026[9].rows.flat().filter((s) => s.kind === 'day')
    expect(oct[0]).toMatchObject({ key: '2026-10-01', day: 1, col: 4, weekday: 4 })
    expect(oct[30]).toMatchObject({ key: '2026-10-31', day: 31 })
    const sunOct1 = buildYear(2026, 0)[9].rows.flat().find((s) => s.kind === 'day')
    expect(sunOct1).toMatchObject({ key: '2026-10-01', col: 5 })
  })
  it('pads a 4-digit year (setFullYear — never the 1900+y mapping)', () => {
    const y1000 = buildYear(1000, 1)
    const first = y1000[0].rows.flat().find((s) => s.kind === 'day')
    expect(first).toMatchObject({ key: '1000-01-01' })
  })
})

describe('indexDensity (BR-10)', () => {
  it('maps level 1/2 by date and drops level 0 silently', () => {
    const r = indexDensity(2026, [
      { date: '2026-10-08', level: 2 },
      { date: '2026-10-09', level: 1 },
      { date: '2026-10-10', level: 0 },
    ])
    expect([...r.byDate]).toEqual([
      ['2026-10-08', 2],
      ['2026-10-09', 1],
    ])
    expect(r.warnings).toEqual([])
  })
  it('skips + warns: other year · malformed · impossible date · bad level', () => {
    const r = indexDensity(2026, [
      { date: '2025-12-31', level: 1 },
      { date: '2026-1-5', level: 1 },
      { date: '2026-02-30', level: 2 },
      { date: '2026-03-01', level: 3 as 0 },
    ])
    expect(r.byDate.size).toBe(0)
    expect(r.warnings).toHaveLength(4)
  })
  it('a duplicate date keeps the MAX level + warns (never hides activity)', () => {
    const r = indexDensity(2026, [
      { date: '2026-05-04', level: 2 },
      { date: '2026-05-04', level: 1 },
    ])
    expect(r.byDate.get('2026-05-04')).toBe(2)
    expect(r.warnings).toHaveLength(1)
  })
})
