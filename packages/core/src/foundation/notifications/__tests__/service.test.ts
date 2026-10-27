// ============================================================================
// XS-notifications-delivery #46 · S3 Verification Gate — delivery dispatch
// (XCU-02/03/04/05/06/07/09/10/11/15/16/17). PURE slice — no live store (no DB/schema
// at M1; gating is upstream, NF-5). Proves the slice-map S3 ledger with spy + deny-safe
// port doubles:
//   • deny-safe default port → not-delivered → in-app fallback (loud, DEL-4)
//   • a working spy port receives the content-zero payload + reports delivered
//   • no_third_party (opt-out) NEVER invokes an off-device port (DEL-8)
//   • scheduleLocal bakes quiet-hours: suppress → no OS call; schedule/shift → OS register
//   • in-app is always the baseline (DEL-5)
// ============================================================================

import { describe, it, expect, vi } from 'vitest'
import { createNotificationDeliveryEngine } from '../service'
import type { DeliveryDecision, NotificationPorts, QuietHours, WakePayload } from '../types'

const wakeDecision = (over: Partial<DeliveryDecision> = {}): DeliveryDecision => ({
  tier: 'wake_signal',
  channels: ['in_app', 'push', 'email'],
  mode: 'standard',
  key: 'due:1',
  routing: { userId: 'u1' },
  ...over,
})

describe('XS-notifications-delivery S3 — deliver (deny-safe M1 default)', () => {
  it('with no ports, external channels fall back to in-app (loud), in-app always true (DEL-4/DEL-5)', async () => {
    const engine = createNotificationDeliveryEngine() // deny-safe defaults
    const r = await engine.deliver(wakeDecision())
    expect(r.inApp).toBe(true)
    expect(r.delivered).toEqual([])
    expect(r.fallbacks).toEqual(['push', 'email'])
  })

  it('a push decision with MISSING routing folds to in-app fallback, never rejects (B1/BR-ND-8)', async () => {
    // a working port — the fold is triggered by the un-buildable content-zero payload, not the port
    const engine = createNotificationDeliveryEngine({
      wakeRelay: { push: async () => ({ delivered: true }) },
    })
    const r = await engine.deliver({
      tier: 'wake_signal',
      channels: ['in_app', 'push'],
      mode: 'standard',
      key: 'due:x',
      // no routing
    })
    expect(r).toEqual({ inApp: true, delivered: [], fallbacks: ['push'] })
  })

  it('an external port that THROWS folds to in-app fallback, never rejects (B1)', async () => {
    const engine = createNotificationDeliveryEngine({
      wakeRelay: {
        push: async () => {
          throw new Error('network down')
        },
      },
    })
    const r = await engine.deliver(wakeDecision({ channels: ['in_app', 'push'] }))
    expect(r).toEqual({ inApp: true, delivered: [], fallbacks: ['push'] })
  })
})

describe('XS-notifications-delivery S3 — deliver (spy ports, real reach shape)', () => {
  it('routes a wake push to the port with a CONTENT-ZERO payload (XCU-08/16)', async () => {
    let seen: WakePayload | undefined
    const ports: NotificationPorts = {
      wakeRelay: { push: async (p) => ((seen = p), { delivered: true }) },
      email: { sendNudge: async () => ({ delivered: true }) },
    }
    const engine = createNotificationDeliveryEngine(ports)
    const r = await engine.deliver(wakeDecision())
    expect(r.delivered).toEqual(['push', 'email'])
    expect(r.fallbacks).toEqual([])
    expect(seen).toEqual({ kind: 'wake', userId: 'u1' }) // no content/type/entity
  })

  it('a failed external port folds back to in-app + flags it (XCU-15)', async () => {
    const ports: NotificationPorts = {
      wakeRelay: { push: async () => ({ delivered: false }) }, // fails
      email: { sendNudge: async () => ({ delivered: true }) },
    }
    const r = await createNotificationDeliveryEngine(ports).deliver(wakeDecision())
    expect(r.delivered).toEqual(['email'])
    expect(r.fallbacks).toEqual(['push'])
  })

  it('local_scheduled / in-app-only decision touches no off-device port', async () => {
    const push = vi.fn(async () => ({ delivered: true }))
    const engine = createNotificationDeliveryEngine({ wakeRelay: { push } })
    const r = await engine.deliver({
      tier: 'local_scheduled',
      channels: ['in_app'],
      mode: 'standard',
      key: 'due:2',
    })
    expect(push).not.toHaveBeenCalled()
    expect(r).toEqual({ inApp: true, delivered: [], fallbacks: [] })
  })
})

describe('XS-notifications-delivery S3 — setDeliveryMode / opt-out (XCU-17/DEL-8)', () => {
  it('no_third_party NEVER invokes an off-device port, even if the decision lists them', async () => {
    const push = vi.fn(async () => ({ delivered: true }))
    const sendNudge = vi.fn(async () => ({ delivered: true }))
    const engine = createNotificationDeliveryEngine({ wakeRelay: { push }, email: { sendNudge } })
    engine.setDeliveryMode('no_third_party')
    const r = await engine.deliver(wakeDecision()) // channels still list push+email
    expect(push).not.toHaveBeenCalled()
    expect(sendNudge).not.toHaveBeenCalled()
    expect(r).toEqual({ inApp: true, delivered: [], fallbacks: [] })
  })
})

describe('XS-notifications-delivery S3 — scheduleLocal (XCU-03/05 bake then register)', () => {
  const NIGHT: QuietHours = { enabled: true, startMinute: 1320, endMinute: 420, policy: 'suppress' }
  const AT = 1_700_000_000_000

  it('suppresses inside quiet hours WITHOUT calling the OS scheduler (in-app only)', async () => {
    const register = vi.fn(async () => ({ scheduled: true, id: 'os-1' }))
    const engine = createNotificationDeliveryEngine({
      osScheduler: { register, cancel: async () => {} },
    })
    const r = await engine.scheduleLocal({ occurrenceId: 'o1', at: AT, minuteOfDay: 1380 }, NIGHT) // 23:00 inside
    expect(register).not.toHaveBeenCalled()
    expect(r).toEqual({ action: 'suppress', scheduled: false })
  })

  it('registers under the NAMESPACED dedup key (not the raw timestamp) when outside quiet hours (B2)', async () => {
    const register = vi.fn(async () => ({ scheduled: true, id: 'os-9' }))
    const engine = createNotificationDeliveryEngine({
      osScheduler: { register, cancel: async () => {} },
    })
    const r = await engine.scheduleLocal({ occurrenceId: 'o7', at: AT, minuteOfDay: 600 }, NIGHT) // 10:00 outside
    expect(register).toHaveBeenCalledWith({ key: 'due:o7', at: AT }) // coheres with dedupKey/reschedulePlan
    expect(r).toEqual({ action: 'schedule', scheduled: true, at: AT, id: 'os-9' })
  })

  it('deny-safe default scheduler makes no call and reports not-scheduled', async () => {
    const engine = createNotificationDeliveryEngine()
    const r = await engine.scheduleLocal({ occurrenceId: 'o1', at: AT, minuteOfDay: 600 }, NIGHT)
    expect(r).toEqual({ action: 'schedule', scheduled: false, at: AT })
  })

  it('cancelLocal is a deny-safe no-op with no port', async () => {
    await expect(createNotificationDeliveryEngine().cancelLocal('os-1')).resolves.toBeUndefined()
  })
})
