// Foundation substrate: the ZK notification DELIVERY engine (XS-notifications-delivery #46 · ADR-013 · XCU-01…12,14-18).
// Three tiers by (nature × platform): in-app (always, local) · local-scheduled OS alert (native, time-based) ·
// content-free wake-signal (event cross-device, and web time-based). Content-zero payload; channel matrix in-app-full/
// push-wake-only/email-generic/no-SMS; opt-out (no-third-party) mode. DECIDES + routes; holds no credential, makes no
// network call, authors NO schema — real reach (Expo/Tauri/Web-Push, Hono wake-relay, email) + audit/token columns are
// M2 (behind the ports). Gating is upstream (MOD-notifications dispatcher, NF-5) — no enforcer/egress here.
// This barrel grows one slice at a time. S1 = tier routing, channel matrix, content-minimal payload contract.
export * from './types'
export { selectTier, channelsFor, type PrimaryTier } from './tiers'
export { buildWakePayload } from './payload'
export { bakeQuietHours, reschedulePlan, dedupKey, shouldMaterialize } from './scheduling'
export { denySafeOsScheduler, denySafeWakeRelay, denySafeEmail } from './ports'
export { createNotificationDeliveryEngine } from './service'
