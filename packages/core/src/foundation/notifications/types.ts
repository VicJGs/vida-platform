// ============================================================================
// foundation/notifications — types (XS-notifications-delivery #46 · ADR-013 · XCU-01…12,14-18)
//
// The zero-knowledge notification DELIVERY engine — how a notification reaches the
// user off-device WITHOUT the server ever reading it. Three tiers chosen by
// (nature × platform): in-app (always, fully local) · local-scheduled OS alert
// (time-based, native only) · content-free wake-signal (event cross-device, and web
// time-based). It DECIDES + routes; it holds no credential, makes no network call,
// authors NO schema. The real reach (Expo/Tauri/Web-Push, the Hono server wake-relay,
// email) + the delivery-audit/push-token columns are M2 (behind the ports).
//
// Boundary (ADR-013 §3.6): this OWNS the delivery mechanism. It does NOT own the
// notification records / dispatch / gating (MOD-notifications), *what/when* due
// (MOD-notifications + Sessions dueIn), or channel/quiet-hours CONFIG (Preferences).
// The decision reaching `deliver` is ALREADY GATED by the dispatcher (NF-5) — this
// engine holds no enforcer/egress. Spec: docs/specs/foundation/xs-notifications-delivery/.
//
// This file grows one slice at a time (ai/ingestion precedent). S1 = tier routing,
// channel matrix, content-minimal payload contract.
// ============================================================================

// XCU-01 — the three delivery tiers. In-app is the always-on baseline every
// notification has; the OFF-DEVICE/scheduled tier is `local_scheduled` (native,
// time-based) or `wake_signal` (event cross-device, and web time-based).
// `[FACT: ADR-013 §3.1 L41-47 (tier table); xcut-notifications.md:28]`
export const DELIVERY_TIERS = ['in_app', 'local_scheduled', 'wake_signal'] as const
export type DeliveryTier = (typeof DELIVERY_TIERS)[number]

// The nature of a notification — the routing axis paired with platform. A
// time-based reminder is pre-known (via the dueIn agenda); an event is reactive.
// `[FACT: ADR-013 §3.1 L47 "a reminder … is pre-known → local-scheduled; an event …
// is reactive → wake-signal"; NF-2 business-rules:16-19 (two production paths)]`
export const NOTIFICATION_NATURES = ['time_based', 'event'] as const
export type NotificationNature = (typeof NOTIFICATION_NATURES)[number]

// The delivering platform. Native = ios/android/desktop (reliable OS local
// scheduling); web = the exception (no reliable background local scheduling →
// falls to wake-signal). `[FACT: ADR-013 §3.2 L49 "Web is the exception"; §5 CLIENT L115]`
export const PLATFORMS = ['ios', 'android', 'desktop', 'web'] as const
export type Platform = (typeof PLATFORMS)[number]

// XCU-12 — the channel matrix under ZK, collapsed from v1's four channels: in-app
// (full) · push (wake-only) · email (generic nudge). SMS is DROPPED (un-encryptable,
// carrier-plaintext) — it is a removed vocabulary, never a disabled member (IR-8).
// `[FACT: ADR-013 §3.4 L59; NF-6 business-rules:31-35]`
export const DELIVERY_CHANNELS = ['in_app', 'push', 'email'] as const
export type DeliveryChannel = (typeof DELIVERY_CHANNELS)[number]

// XCU-17 — the delivery posture. `standard` uses every ZK-valid channel for the
// tier; `no_third_party` (the opt-out mode) runs in-app + native local-scheduled
// ONLY — no APNs/FCM, no email, no server relay: no third-party observer ever.
// `[FACT: ADR-013 §3.5 L67, L108 (explicitly accepted); xcut-notifications.md:44]`
export const DELIVERY_MODES = ['standard', 'no_third_party'] as const
export type DeliveryMode = (typeof DELIVERY_MODES)[number]

// XCU-08 / XCU-16 — the owner ROUTING metadata the server legitimately holds
// (per-user room routing, ADR-003) — the ONLY thing a wake push may carry. It
// names WHOM to wake, never WHAT. `[FACT: ADR-013 §3.3 L55 "owner routing metadata
// the server legitimately holds, never contents"; §3.6 L72]`
export interface RoutingMeta {
  /** The per-user routing key ADR-003 already maintains (rooms by user). */
  userId: string
  /** Optional: the closed devices to wake (device-identifier class, ADR-003). */
  targetDeviceIds?: string[]
}

// XCU-08 — the content-minimal wake payload: routing only, zero `[E]` content, zero
// `type`, zero subject entity. `kind:'wake'` marks it a content-free "sync now"
// signal. This is the ZK payload CONTRACT ADR-013 owns. `[FACT: ADR-013 §3.3 L53,
// §3.5 L61-65, §3.6 L70; xcut-notifications.md:35]`
export interface WakePayload {
  kind: 'wake'
  userId: string
  targetDeviceIds?: string[]
}

// The keys a payload may NEVER carry — the content-zero guard's denylist (IR-3).
// A caller passing any of these (e.g. via an untyped object) is refused loud, not
// silently stripped. `[FACT: ADR-013 §3.5 L61-65 (never exposed: content/type/entity)]`
export const FORBIDDEN_PAYLOAD_KEYS = [
  'title',
  'message',
  'body',
  'content',
  'type',
  'entity_type',
  'entity_id',
  'entityType',
  'entityId',
  'action_url',
  'actionUrl',
  'action_label',
] as const

// Thrown when the payload builder is handed a content/type/entity field — the
// content-zero invariant refused it (fail-loud, parity with EgressDenied). (IR-3/DEL-1)
export class PayloadNotContentFree extends Error {
  readonly field: string
  constructor(field: string) {
    super(`Wake payload may not carry '${field}' — content-zero (ADR-013 §3.5)`)
    this.name = 'PayloadNotContentFree'
    this.field = field
  }
}

// ─── S2 — scheduling derivations (XCU-05 · XCU-04 · XCU-14 · XCU-18) ───
// Pure math the local-scheduled tier needs BEFORE it touches any OS scheduler.

// XCU-05 — the user's quiet-hours setting, read from Preferences §5.17 (`quiet_hours_*`);
// delivery only READS it (NF-4). Times are LOCAL minutes-of-day (0-1439) — the CALLER
// resolves the TZ (the calendar-view TZ-safe-keying discipline), so the derivation stays
// pure + deterministic. `policy` = what to do with a reminder landing inside (shift vs
// suppress "per the user's setting"; the shift-vs-suppress runtime is build-phase INTERP).
// `[FACT: ADR-013 §3.2 L51; §5.17 quiet_hours_*; NF-4 business-rules:24-26; xcut-notifications.md:32]`
export interface QuietHours {
  enabled: boolean
  /** inclusive local minute-of-day the quiet window opens (0-1439). */
  startMinute: number
  /** exclusive local minute-of-day the quiet window closes; < start = spans midnight. */
  endMinute: number
  policy: 'shift' | 'suppress'
}

// A due reminder occurrence derived over the Sessions `dueIn` agenda (NF-3). `occurrenceId`
// is its stable id (feeds the XCU-14 dedup namespace so scheduleLocal ↔ reschedulePlan ↔
// dedupKey cohere); `at` is the absolute fire time (Unix ms); `minuteOfDay` is its LOCAL
// minute-of-day (caller-resolved, TZ-safe). `[FACT: xcut-notifications.md:19-21; NF-3:20-23; NF-8]`
export interface DueOccurrence {
  occurrenceId: string
  at: number
  minuteOfDay: number
}

// XCU-05 — the baking result. `schedule` (register at `at`) · `shift` (register at the
// shifted `at`, end of the quiet window) · `suppress` (no OS alert; recorded in-app only).
export type QuietHoursResult =
  | { action: 'schedule'; at: number }
  | { action: 'shift'; at: number }
  | { action: 'suppress' }

// XCU-04 — a reminder already registered with the OS scheduler: its OS handle `id` +
// the idempotency `key` that identifies the underlying occurrence (dedupKey).
export interface RegisteredReminder {
  id: string
  key: string
}

// XCU-04 — the reschedule delta: OS handles to cancel + occurrences to (re)register.
export interface ReschedulePlan {
  cancel: string[]
  register: RegisteredReminder[]
}

// XCU-14 — the idempotency source. An EVENT carries the ADR-012 deterministic
// `effectEventId` (NF-8 Additive) — passed THROUGH, never re-hashed (the effect rail
// owns the key, N3). A time-based fire is keyed by its `dueIn` occurrence id.
// `[FACT: NF-8 business-rules:39-42; ADR-012 §3.1; xcut-notifications.md:41]`
export type DedupSource = { kind: 'event'; effectEventId: string } | { kind: 'due'; occurrenceId: string }

// ─── S3 — delivery dispatch: deny-safe ports · fallback→in-app · opt-out (XCU-03,06,07,09,10,11,15,16,17) ───

// The ALREADY-GATED decision the dispatcher (MOD-notifications, NF-5) hands to `deliver`.
// The engine executes it — it does NOT re-gate (no enforcer/egress, IR-2). `channels` is
// the post-gating enabled set; `routing` is required for an off-device push (a wake_signal
// push composes the content-free payload from it). `[FACT: NF-5 business-rules:27-30; ADR-013 §3.6 L74]`
export interface DeliveryDecision {
  tier: DeliveryTier
  channels: DeliveryChannel[]
  mode: DeliveryMode
  key: string
  /** Required for an off-device push (wake_signal); absent for in-app/local-scheduled. */
  routing?: RoutingMeta
}

// The result of `deliver`. `inApp` is always true (the unconditional baseline, DEL-5);
// `delivered` = external channels a port confirmed; `fallbacks` = external channels that
// failed → folded back to in-app + flagged (fail-loud, DEL-4). `[FACT: XCU-15; NF-7 business-rules:36-38,85]`
export interface DeliveryResult {
  inApp: true
  delivered: DeliveryChannel[]
  fallbacks: DeliveryChannel[]
}

// XCU-03 — the OS local-scheduler registration request (bake result already applied).
export interface ScheduleRequest {
  key: string
  at: number
}

// XCU-05/XCU-03 — the outcome of `scheduleLocal`: `scheduled` via the OS port (deny-safe
// M1 → false), `suppressed` when quiet-hours baked to suppress (in-app only), plus the
// applied action. `id` is the OS handle when scheduled.
export interface ScheduleResult {
  action: QuietHoursResult['action']
  scheduled: boolean
  /** the registered fire time (Unix ms) on schedule/shift — reflects any quiet-hours shift (N3). */
  at?: number
  id?: string
}

// ── Ports (injected; M1 default = deny-safe/fail-closed — no network call). M2 wires the
// real reach (Expo/Tauri local scheduler · Hono server wake-relay · Web Push · email
// provider) with NO signature change (IR-7). `[FACT: ADR-013 §5 L111-115; xcut-notifications.md:52]`

// XCU-03 — native OS local scheduler (Expo Notifications / Tauri). Server-free, ZK.
export interface OsSchedulerPort {
  register(req: ScheduleRequest): Promise<{ scheduled: boolean; id?: string }>
  cancel(id: string): Promise<void>
}

// XCU-06/07/09/10 — the wake-signal transmit: online → ADR-003 relay; closed → server
// wake-relay (Hono, M2) sends a content-minimal OS push; web → service-worker + Web Push.
// The port receives ONLY the content-free payload. `[FACT: ADR-013 §3.3 L53-57; §5 SERVER L114]`
export interface WakeRelayPort {
  push(payload: WakePayload): Promise<{ delivered: boolean }>
}

// XCU-11 — the generic content-free email nudge ("activity in Vida — open the app"),
// opt-in. Carries zero `[E]` detail. `[FACT: ADR-013 §3.4 L59]`
export interface EmailPort {
  sendNudge(userId: string): Promise<{ delivered: boolean }>
}

export interface NotificationPorts {
  osScheduler?: OsSchedulerPort
  wakeRelay?: WakeRelayPort
  email?: EmailPort
}

// The delivery engine surface consumed by MOD-notifications (#53) + Sessions.
export interface NotificationDeliveryEngine {
  /** XCU-02/06/07/09/10/11/15/16/17 — execute an already-gated decision; in-app always;
   *  off-device via deny-safe ports; any failure → in-app fallback + flag. */
  deliver(decision: DeliveryDecision): Promise<DeliveryResult>
  /** XCU-03/05 — bake quiet-hours then register with the OS scheduler (deny-safe M1). */
  scheduleLocal(occ: DueOccurrence, quietHours: QuietHours): Promise<ScheduleResult>
  /** XCU-04 — cancel a registered OS alert (deny-safe M1 no-op). */
  cancelLocal(id: string): Promise<void>
  /** XCU-17 — set the delivery posture; `no_third_party` never touches an off-device port. */
  setDeliveryMode(mode: DeliveryMode): void
}
