// @vitest-environment jsdom
// Force a non-UTC zone BEFORE the module loads, so the local-vs-UTC divergence is deterministic
// (the date gate is TZ-blind — [[date-code-needs-tz-forced-tests]]). America/Sao_Paulo = UTC−03.
process.env.TZ = 'America/Sao_Paulo'

import { describe, expect, it } from 'vitest'
import { todayLocalYmd } from './use-journal-entry'

describe('todayLocalYmd — local calendar date, never UTC', () => {
  it('uses LOCAL calendar fields (deterministic cross-machine via a local-constructed Date)', () => {
    // new Date(y, m, d, …) is constructed in LOCAL time → local getters are fixed regardless of the host TZ.
    const d = new Date(2026, 9, 20, 23, 0, 0) // local 2026-10-20 23:00
    expect(todayLocalYmd(d)).toBe('2026-10-20')
  })

  it('differs from toISOString() (UTC) when the instant straddles UTC midnight — the bug this guards', () => {
    // 2026-10-21T02:00Z is still 2026-10-20 23:00 in BRT (−03). The UTC-day bug would return '2026-10-21'.
    const d = new Date('2026-10-21T02:00:00Z')
    expect(todayLocalYmd(d)).toBe('2026-10-20')
    expect(d.toISOString().slice(0, 10)).toBe('2026-10-21') // proves local ≠ UTC
  })

  it('zero-pads month and day', () => {
    expect(todayLocalYmd(new Date(2026, 0, 5, 12, 0, 0))).toBe('2026-01-05')
  })
})
