// LIF-389 #2 — the /tasks row label (pure): "new" when the task was never edited (updated_at === created_at), else
// "edited <time>" with the last edit time in LOCAL time. Run under BOTH a negative and a positive UTC offset (the
// calendar-derive.test.ts idiom: the date gate is TZ-blind, so a UTC slip must be caught here).
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { taskEditLabel } from './task-edit-label'

// 2026-10-08T02:30:00Z → 23:30 on Oct 7 in São Paulo (UTC−03), 11:30 on Oct 8 in Tokyo (UTC+09). UTC shows 02:30.
const EDITED_AT = Date.UTC(2026, 9, 8, 2, 30, 0)
const CREATED_AT = Date.UTC(2026, 9, 1, 12, 0, 0)
const LOCAL_TIME: Record<string, string> = { 'America/Sao_Paulo': '23:30', 'Asia/Tokyo': '11:30' }

describe.each(['America/Sao_Paulo', 'Asia/Tokyo'])('LIF-389 #2 — taskEditLabel in %s', (tz) => {
  let saved: string | undefined
  beforeAll(() => {
    saved = process.env.TZ
    process.env.TZ = tz
    // the TZ guard is LIVE: a worker that ignored the switch would silently run in the host zone
    expect(new Date(EDITED_AT).getTimezoneOffset()).toBe(tz === 'Asia/Tokyo' ? -540 : 180)
  })
  afterAll(() => {
    if (saved === undefined) delete process.env.TZ
    else process.env.TZ = saved
  })

  it('LIF-389 #2 — a never-edited task (updated_at === created_at) is labelled "new"', () => {
    expect(taskEditLabel({ created_at: CREATED_AT, updated_at: CREATED_AT })).toBe('new')
  })

  it('LIF-389 #2 — an edited task is labelled "edited <time>" with its last edit time in LOCAL time, not UTC', () => {
    const label = taskEditLabel({ created_at: CREATED_AT, updated_at: EDITED_AT })
    expect(label).toMatch(/^edited /)
    expect(label).toContain(LOCAL_TIME[tz])
    expect(label).not.toContain('02:30') // the UTC wall time
  })
})
