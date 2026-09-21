// ============================================================================
// foundation/notifications — deny-safe default ports (S3)
//
// The M1 fail-closed defaults for every real-reach port: they make NO network call
// and report not-delivered / not-scheduled. The engine falls back to in-app (DEL-4),
// so a notification is never silently dropped — it just doesn't reach off-device until
// M2 injects the real reach (Expo/Tauri · Hono wake-relay · Web Push · email), with NO
// signature change (IR-7). `[FACT: ADR-013 §5 L111-115; memory deny-safe-port-build-shape]`
// ============================================================================

import type { EmailPort, OsSchedulerPort, WakeRelayPort } from './types'

export const denySafeOsScheduler: OsSchedulerPort = {
  register: async () => ({ scheduled: false }),
  cancel: async () => {},
}

export const denySafeWakeRelay: WakeRelayPort = {
  push: async () => ({ delivered: false }),
}

export const denySafeEmail: EmailPort = {
  sendNudge: async () => ({ delivered: false }),
}
