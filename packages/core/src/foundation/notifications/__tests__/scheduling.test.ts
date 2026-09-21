// ============================================================================
// XS-notifications-delivery #46 · S2 Verification Gate — scheduling derivations
// (XCU-05 / XCU-04 / XCU-14 / XCU-18). PURE slice — no live store (deterministic).
// Proves the slice-map S2 ledger:
//   • bakeQuietHours: outside window → schedule · inside+suppress → suppress ·
//     inside+shift → shift to window end · disabled → schedule · midnight-spanning window
//   • reschedulePlan: cancels dropped, registers new, leaves unchanged untouched
//   • dedupKey: event passes the ADR-012 id through · due keys by occurrence · stable · namespaced
//   • shouldMaterialize: fires at/after due, not before
// ============================================================================

import { describe, it, expect } from 'vitest'
import {
  bakeQuietHours,
  reschedulePlan,
  dedupKey,
  shouldMaterialize,
} from '../scheduling'
import type { DueOccurrence, QuietHours, RegisteredReminder } from '../types'

const AT = 1_700_000_000_000 // a fixed Unix ms for determinism
const occ = (minuteOfDay: number, at = AT): DueOccurrence => ({ occurrenceId: 'o1', at, minuteOfDay })
// quiet 22:00 (1320) → 07:00 (420), spans midnight
const NIGHT = (policy: 'shift' | 'suppress'): QuietHours => ({
  enabled: true,
  startMinute: 1320,
  endMinute: 420,
  policy,
})

describe('XS-notifications-delivery S2 — bakeQuietHours (XCU-05 bake at registration)', () => {
  it('schedules as-is when quiet hours are disabled', () => {
    const qh: QuietHours = { enabled: false, startMinute: 1320, endMinute: 420, policy: 'shift' }
    expect(bakeQuietHours(occ(1380), qh)).toEqual({ action: 'schedule', at: AT })
  })

  it('schedules as-is when the fire is OUTSIDE the quiet window', () => {
    expect(bakeQuietHours(occ(600), NIGHT('shift'))).toEqual({ action: 'schedule', at: AT }) // 10:00
  })

  it('suppresses a fire inside quiet hours when policy=suppress (recorded in-app only)', () => {
    expect(bakeQuietHours(occ(1380), NIGHT('suppress'))).toEqual({ action: 'suppress' }) // 23:00
  })

  it('shifts a fire inside quiet hours to the window end when policy=shift', () => {
    // 23:00 (1380) inside 22:00→07:00; end 07:00 → minutes to end = (420-1380+1440)%1440 = 480
    const r = bakeQuietHours(occ(1380), NIGHT('shift'))
    expect(r).toEqual({ action: 'shift', at: AT + 480 * 60_000 })
  })

  it('handles a fire in the pre-dawn tail of a midnight-spanning window (03:00 → shift to 07:00)', () => {
    // 03:00 (180) inside; minutes to end = (420-180+1440)%1440 = 240
    expect(bakeQuietHours(occ(180), NIGHT('shift'))).toEqual({ action: 'shift', at: AT + 240 * 60_000 })
  })

  it('treats a zero-width window as never quiet', () => {
    const qh: QuietHours = { enabled: true, startMinute: 480, endMinute: 480, policy: 'suppress' }
    expect(bakeQuietHours(occ(480), qh)).toEqual({ action: 'schedule', at: AT })
  })
})

describe('XS-notifications-delivery S2 — reschedulePlan (XCU-04 cancel + re-register)', () => {
  const prev: RegisteredReminder[] = [
    { id: 'os-1', key: 'due:a' },
    { id: 'os-2', key: 'due:b' },
  ]

  it('cancels dropped occurrences and registers new ones, leaving unchanged untouched', () => {
    const next: RegisteredReminder[] = [
      { id: 'os-2', key: 'due:b' }, // unchanged
      { id: 'new', key: 'due:c' }, // new
    ]
    const plan = reschedulePlan(prev, next)
    expect(plan.cancel).toEqual(['os-1']) // 'due:a' dropped
    expect(plan.register).toEqual([{ id: 'new', key: 'due:c' }])
  })

  it('is a no-op delta when nothing changed', () => {
    expect(reschedulePlan(prev, prev)).toEqual({ cancel: [], register: [] })
  })

  it('cancels all when next is empty', () => {
    expect(reschedulePlan(prev, [])).toEqual({ cancel: ['os-1', 'os-2'], register: [] })
  })
})

describe('XS-notifications-delivery S2 — dedupKey (XCU-14 idempotency, N3 pass-through)', () => {
  it('passes the ADR-012 effect_event_id through for an event (no re-hash)', () => {
    expect(dedupKey({ kind: 'event', effectEventId: 'evt-42' })).toBe('event:evt-42')
  })

  it('keys a due reminder by its occurrence id', () => {
    expect(dedupKey({ kind: 'due', occurrenceId: 'occ-7' })).toBe('due:occ-7')
  })

  it('is deterministic (same source → same key across calls, once across devices)', () => {
    const s = { kind: 'event', effectEventId: 'evt-42' } as const
    expect(dedupKey(s)).toBe(dedupKey(s))
  })

  it('namespaces so an event id and a due id never collide', () => {
    expect(dedupKey({ kind: 'event', effectEventId: 'x' })).not.toBe(
      dedupKey({ kind: 'due', occurrenceId: 'x' }),
    )
  })
})

describe('XS-notifications-delivery S2 — shouldMaterialize (XCU-18 materialize-at-fire)', () => {
  it('materializes at/after the due time, not before (NF-3 no phantom future rows)', () => {
    expect(shouldMaterialize(100, 100)).toBe(true)
    expect(shouldMaterialize(100, 101)).toBe(true)
    expect(shouldMaterialize(100, 99)).toBe(false)
  })
})
