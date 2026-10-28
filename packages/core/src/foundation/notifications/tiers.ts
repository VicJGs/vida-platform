// ============================================================================
// foundation/notifications — tier routing + channel matrix (S1)
//
// XCU-01 (tier selection by nature × platform) · XCU-12 (channel matrix, no-SMS) ·
// XCU-17 (opt-out mode collapses to no-third-party). Pure + deterministic — no
// enforcer, no egress, no ports, no I/O. Twin of ai/modes.ts.
// ============================================================================

import type { DeliveryChannel, DeliveryMode, DeliveryTier, NotificationNature, Platform } from './types'

// The off-device/scheduled tier — one of `local_scheduled` | `wake_signal`. In-app
// is NOT selected here: it is the unconditional baseline (DEL-5) always present at
// delivery, so tier selection only chooses the path BEYOND in-app.
export type PrimaryTier = Extract<DeliveryTier, 'local_scheduled' | 'wake_signal'>

function isNative(platform: Platform): boolean {
  return platform !== 'web'
}

// XCU-01 — choose the primary tier by (nature × platform):
//  • a time-based reminder on a NATIVE device → `local_scheduled` (the OS fires it
//    locally at due time, even closed/offline — server-free, fully ZK).
//  • a time-based reminder on WEB → `wake_signal` (browsers have no reliable
//    background local scheduling → service-worker + Web Push).
//  • an EVENT (any platform) → `wake_signal` (a change on device A surfaces on B).
// In-app underlies all three always.
// `[FACT: ADR-013 §3.1 L41-47 (tier table + "the tier is a property of the
// notification AND platform"); §3.2 L49 (web exception); NF-2/NF-6]`
export function selectTier(nature: NotificationNature, platform: Platform): PrimaryTier {
  if (nature === 'time_based' && isNative(platform)) return 'local_scheduled'
  return 'wake_signal'
}

// XCU-12 / XCU-17 — the ZK-valid channel set for a (tier, mode). In-app is always
// present (DEL-5). Only the `wake_signal` tier reaches off-device (push wake-only +
// email generic opt-in); `local_scheduled` composes locally (in-app fidelity). The
// `no_third_party` mode drops EVERY off-device channel → in-app only (DEL-8). SMS is
// never a member (IR-8). The dispatcher's per-channel enable/opt-in gate (NF-5) is
// applied UPSTREAM; this returns the fidelity-maximum the ZK rule permits.
// `[FACT: ADR-013 §3.4 L59 (channel matrix); §3.5 L67 (opt-out mode); NF-6 business-rules:31-38]`
export function channelsFor(tier: DeliveryTier, mode: DeliveryMode): DeliveryChannel[] {
  // Opt-out: no APNs/FCM, no email, no server relay — in-app is the only channel.
  if (mode === 'no_third_party') return ['in_app']
  switch (tier) {
    case 'wake_signal':
      // push = wake-only; email = generic opt-in nudge; in-app baseline.
      return ['in_app', 'push', 'email']
    case 'local_scheduled':
    case 'in_app':
      // Native OS-local alert / in-app: composed on-device, no third party.
      return ['in_app']
  }
}
