// ============================================================================
// XS-notifications-delivery #46 · S1 Verification Gate — tier routing + channel matrix
// (XCU-01 / XCU-12 / XCU-17). PURE slice — no live store (deterministic, no I/O).
// Proves the slice-map S1 ledger:
//   • selectTier: time-based×native → local_scheduled · time-based×web → wake_signal
//     · event×any → wake_signal
//   • channelsFor: wake_signal → in-app+push+email · local_scheduled/in_app → in-app only
//     · no_third_party → in-app only (drops every off-device channel) · NEVER 'sms'
// ============================================================================

import { describe, it, expect } from 'vitest'
import { selectTier, channelsFor } from '../tiers'
import { DELIVERY_TIERS, DELIVERY_CHANNELS, NOTIFICATION_NATURES, PLATFORMS, type Platform } from '../types'

const NATIVE: Platform[] = ['ios', 'android', 'desktop']

describe('XS-notifications-delivery S1 — selectTier (XCU-01 nature × platform)', () => {
  it('routes a time-based reminder on a NATIVE device to local_scheduled', () => {
    for (const p of NATIVE) expect(selectTier('time_based', p)).toBe('local_scheduled')
  })

  it('routes a time-based reminder on WEB to wake_signal (web has no local scheduling)', () => {
    expect(selectTier('time_based', 'web')).toBe('wake_signal')
  })

  it('routes an EVENT to wake_signal on every platform', () => {
    for (const p of PLATFORMS) expect(selectTier('event', p)).toBe('wake_signal')
  })

  it('only ever returns an off-device/scheduled tier (never in_app — that is the baseline)', () => {
    for (const n of NOTIFICATION_NATURES) {
      for (const p of PLATFORMS) {
        const t = selectTier(n, p)
        expect(['local_scheduled', 'wake_signal']).toContain(t)
        expect(t).not.toBe('in_app')
      }
    }
  })
})

describe('XS-notifications-delivery S1 — channelsFor (XCU-12 matrix, XCU-17 opt-out)', () => {
  it('wake_signal in standard mode uses in-app + push (wake-only) + email (generic)', () => {
    expect(channelsFor('wake_signal', 'standard')).toEqual(['in_app', 'push', 'email'])
  })

  it('local_scheduled and in_app compose locally — in-app channel only', () => {
    expect(channelsFor('local_scheduled', 'standard')).toEqual(['in_app'])
    expect(channelsFor('in_app', 'standard')).toEqual(['in_app'])
  })

  it('no_third_party (opt-out) collapses EVERY tier to in-app only — no push, no email, no server', () => {
    for (const t of DELIVERY_TIERS) {
      const ch = channelsFor(t, 'no_third_party')
      expect(ch).toEqual(['in_app'])
      expect(ch).not.toContain('push')
      expect(ch).not.toContain('email')
    }
  })

  it('NEVER emits an sms channel in any (tier × mode) combination (IR-8)', () => {
    expect(DELIVERY_CHANNELS as readonly string[]).not.toContain('sms')
    for (const t of DELIVERY_TIERS) {
      for (const m of ['standard', 'no_third_party'] as const) {
        expect(channelsFor(t, m)).not.toContain('sms' as never)
      }
    }
  })

  it('always includes in-app (the unconditional baseline, DEL-5)', () => {
    for (const t of DELIVERY_TIERS) {
      for (const m of ['standard', 'no_third_party'] as const) {
        expect(channelsFor(t, m)).toContain('in_app')
      }
    }
  })
})
