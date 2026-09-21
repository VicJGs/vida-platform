// ============================================================================
// foundation/notifications — the delivery engine (S3)
//
// XCU-02/06/07/09/10/11 (dispatch a decision to the tier's port) · XCU-15 (fail-loud
// in-app fallback) · XCU-16 (content-zero payload governance at dispatch) · XCU-17
// (no-third-party opt-out mode) · XCU-03/04/05 (local-scheduler register/cancel w/
// quiet-hours baking). Factory-of-closures (no `this`, IR-7). Holds NO enforcer/egress —
// the decision is already gated by the dispatcher (NF-5, IR-2). Deny-safe at M1.
// ============================================================================

import { bakeQuietHours, dedupKey } from './scheduling'
import { buildWakePayload } from './payload'
import { denySafeEmail, denySafeOsScheduler, denySafeWakeRelay } from './ports'
import {
  type DeliveryChannel,
  type DeliveryDecision,
  type DeliveryMode,
  type DeliveryResult,
  type DueOccurrence,
  type NotificationDeliveryEngine,
  type NotificationPorts,
  type QuietHours,
  type ScheduleResult,
} from './types'

// createNotificationDeliveryEngine — the delivery mechanism over deny-safe ports. No
// enforcer/egress params (gating is upstream, IR-2/DEL-3); M1 ports default to deny-safe.
export function createNotificationDeliveryEngine(
  ports?: NotificationPorts,
): NotificationDeliveryEngine {
  const osScheduler = ports?.osScheduler ?? denySafeOsScheduler
  const wakeRelay = ports?.wakeRelay ?? denySafeWakeRelay
  const email = ports?.email ?? denySafeEmail

  // XCU-17 — the delivery posture. `no_third_party` (opt-out) forbids every off-device
  // channel: in-app + native local-scheduled only, no observer. Mutable engine state.
  let mode: DeliveryMode = 'standard'

  const deliver = async (decision: DeliveryDecision): Promise<DeliveryResult> => {
    const delivered: DeliveryChannel[] = []
    const fallbacks: DeliveryChannel[] = []

    // XCU-02/DEL-5 — in-app is the unconditional baseline; it always succeeds first (NF-9).
    // XCU-17/DEL-8 — under opt-out, strip every off-device channel (defense-in-depth even
    // if the gated decision listed them).
    const externalOk = mode !== 'no_third_party'

    // XCU-15 / DEL-4 / BR-ND-8 — an external tier NEVER drops the alert: any failure (a
    // port returning not-delivered, a throw, or a mis-built payload with no routing) folds
    // to in-app + flag. In-app (the baseline) always survives — the promise never rejects.
    if (externalOk && decision.channels.includes('push')) {
      try {
        // XCU-08/16 — content-zero payload from routing only (throws if routing missing/dirty).
        const payload = buildWakePayload(decision.routing ?? { userId: '' })
        const { delivered: ok } = await wakeRelay.push(payload) // deny-safe M1 → false
        ;(ok ? delivered : fallbacks).push('push')
      } catch {
        fallbacks.push('push')
      }
    }

    if (externalOk && decision.channels.includes('email')) {
      try {
        const { delivered: ok } = await email.sendNudge(decision.routing?.userId ?? '') // deny-safe M1 → false
        ;(ok ? delivered : fallbacks).push('email')
      } catch {
        fallbacks.push('email')
      }
    }

    return { inApp: true, delivered, fallbacks }
  }

  const scheduleLocal = async (
    occ: DueOccurrence,
    quietHours: QuietHours,
  ): Promise<ScheduleResult> => {
    // XCU-05 — bake quiet-hours BEFORE the OS scheduler (the alert fires with the app closed).
    const baked = bakeQuietHours(occ, quietHours)
    if (baked.action === 'suppress') {
      // Recorded in-app only (NF-5 suppression = not pushed, never lost); no OS alert.
      return { action: 'suppress', scheduled: false }
    }
    // XCU-14 — register under the namespaced dedup key so scheduleLocal ↔ reschedulePlan ↔
    // dedupKey cohere (not the raw timestamp, which collides at same-ms and never matches
    // the reschedule diff). `at` reflects any quiet-hours shift (N3).
    const key = dedupKey({ kind: 'due', occurrenceId: occ.occurrenceId })
    const { scheduled, id } = await osScheduler.register({ key, at: baked.at })
    const result: ScheduleResult = { action: baked.action, scheduled, at: baked.at }
    if (id !== undefined) result.id = id
    return result
  }

  const cancelLocal = async (id: string): Promise<void> => {
    // XCU-04 — cancel half of cancel+re-register; deny-safe M1 no-op.
    await osScheduler.cancel(id)
  }

  const setDeliveryMode = (next: DeliveryMode): void => {
    mode = next
  }

  return { deliver, scheduleLocal, cancelLocal, setDeliveryMode }
}
