// ============================================================================
// services/notifications — types (mod-notifications #53 ① · LIF-132)
//
// The Notifications MODULE surface (the ADR-013 dispatcher/surface) over the DB-4 `notifications`
// table — the terminal PURE SINK (in-degree=everything, out-degree 0). Composes the BUILT delivery
// engine (foundation/notifications #46) + effect rail + Sessions `dueIn` + Preferences; invents no
// engine. Grows one slice at a time (slice-map.md). S1 = scaffold + inbox reads + lifecycle + DB-11.
//
// Deps grow per slice (the books/habits precedent): S1 needs only { db, deviceId }; S2 adds `engine`
// + `preferences?`, S4 adds `sessions`. The factory signature extends; no breaking re-shape.
// ============================================================================

import type { MergedPreferences, Notification, NotificationType } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import type { EffectEvent, EffectTx } from '../../foundation/effects'
import type { DeliveryResult, NotificationDeliveryEngine, Platform, RoutingMeta } from '../../foundation/notifications'
import type { SessionsService, TimeRange } from '../sessions'

/** The Preferences gating read seam (NF-4): the module READS channel/quiet-hours/per-module toggles,
 *  never stores them. Deny-safe/fail-OPEN — absent ⇒ permissive (the habits prefs-port precedent;
 *  delivery gating is a user-convenience policy, not a fail-closed security gate). */
export interface NotificationsPrefsPort {
  getMergedPreferences(): Promise<MergedPreferences>
}

export interface NotificationsServiceDeps {
  db: DrizzleDb
  deviceId: string
  /** The BUILT ZK delivery engine (foundation/notifications #46). Required from S2. */
  engine: NotificationDeliveryEngine
  /** The Sessions `dueIn(range)` aggregator — the time-path agenda source (S4). Read-only (the dispatcher
   *  never writes to Sessions). "Deps grow per slice"; required from S4. */
  sessions: Pick<SessionsService, 'dueIn'>
  /** Preferences gating source (S2). Absent ⇒ permissive (fail-OPEN). */
  preferences?: NotificationsPrefsPort
}

/** Runtime context for an immediate `deliver` (S2). The CALLER resolves platform + the current local
 *  minute-of-day (the engine's TZ discipline — the backend holds no device TZ). Both optional:
 *  platform defaults to 'web' (conservative max-channel; M1 external is deny-safe anyway); an absent
 *  `nowMinuteOfDay` skips the quiet-hours check (permissive). */
export interface DeliverContext {
  platform?: Platform
  nowMinuteOfDay?: number
  /** Owner routing (ADR-003 per-user wake key) — the ONLY thing a push may carry (NF-6). Supplied by the
   *  caller when known; ABSENT at M1 (no auth/routing yet) ⇒ the off-device wake payload can't be addressed,
   *  so push honestly folds to in-app (content-blind). Wired at M2. */
  routing?: RoutingMeta
}

/** Inbox read filter (S1). `status` collapses the read/archive lifecycle; `page` is 0-based. */
export interface InboxQuery {
  status?: 'unread' | 'read' | 'archived'
  type?: NotificationType
  page?: number
}

/** Derived badge counts (NF-13 inbox) — total unread + the 3 attention types. */
export interface UnreadCounts {
  unread: number
  error: number
  warning: number
  reminder: number
}

/** The read view = the DB-11-reconciled @vida/types interface (the delivery-audit flags, metadata and
 *  effect_event_id now live on `Notification` itself, so no extension is needed). `metadata` is raw TEXT
 *  at M1 (parsing is a frontend reader convenience). */
export type NotificationView = Notification

/** The dispatcher `tick` outcome (S4) — disjoint on outcome: `fired + suppressed` = new rows materialized
 *  this tick; `skipped` = everything NOT materialized (un-pinned ∪ future ∪ duplicate ∪ unavailable-lane).
 *  `suppressed` = materialized in-app but the local OS alert was quiet-hours-suppressed. */
export interface TickResult {
  evaluated: number
  fired: number
  suppressed: number
  skipped: number
}

export const INBOX_PAGE_SIZE = 50

/** The content a caller / producer supplies to raise a notification (S3). The single write path's input;
 *  also the shape a producer puts on the `surface_notification` effect payload. `effect_event_id` is NOT
 *  here — the event path derives it from the event triple; the time path leaves it null. */
export interface FireInput {
  type: NotificationType
  title: string
  message?: string | null
  action_url?: string | null
  action_label?: string | null
  entity_type?: string | null
  entity_id?: string | null
  expires_at?: number | null
  /** stringified JSON TEXT ([E]) — the reader parses it. */
  metadata?: string | null
}

// --- errors -----------------------------------------------------------------
/** A mutation targeted a notification id that does not exist. */
export class NotificationNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Notification not found: ${id}`)
    this.name = 'NotificationNotFoundError'
  }
}

/** The PUBLIC `fire` (time path) rejects an unusable input (fail-loud — no rail tx to roll back). The EVENT
 *  path never throws this (NF-1 pure sink: a malformed payload is skipped, never rolls back the trigger). */
export class InvalidNotificationError extends Error {
  constructor(reason: string) {
    super(`Invalid notification: ${reason}`)
    this.name = 'InvalidNotificationError'
  }
}

// --- service surface (S1 subset; later slices extend) ------------------------
export interface NotificationsService {
  /** Inbox list, newest-first, filtered by status/type, paged (S1). */
  list(q?: InboxQuery): Promise<NotificationView[]>
  /** Derived unread badge counts (S1). */
  unreadCounts(): Promise<UnreadCounts>
  /** Mark one notification read (sets read_at); throws NotificationNotFoundError (S1). */
  markRead(id: string): Promise<NotificationView>
  /** Mark every unread notification read; returns the count marked (S1). */
  markAllRead(): Promise<number>
  /** Archive one notification (sets archived_at); throws NotificationNotFoundError (S1). */
  archive(id: string): Promise<NotificationView>
  /** Auto-archive rows whose expires_at ≤ now (NF-13); returns the count archived (S1). */
  archiveExpired(now?: number): Promise<number>
  /** Gate a materialized row against Preferences, route it through the delivery engine, and persist the
   *  delivery-audit (delivered_in_app/push/email). In-app always fires (NF-7); external channels are
   *  gated (NF-5) + deny-safe at M1. Throws NotificationNotFoundError on a missing id (S2). */
  deliver(id: string, ctx?: DeliverContext): Promise<DeliveryResult>
  /** The PUBLIC single write path (time-driven, NF-2): create a row (effect_event_id null) then dispatch
   *  per Preferences. Throws InvalidNotificationError on an unusable input. Returns the delivered view (S3). */
  fire(input: FireInput, ctx?: DeliverContext): Promise<NotificationView>
  /** The EVENT single write path — the `surface_notification` Additive rail handler (NF-2/NF-8). Co-writes
   *  the row in the rail's tx via createInTx (idempotent per effect_event_id). PURE SINK (NF-1): a malformed
   *  payload is SKIPPED, never thrown — notifications must never roll back the triggering write (S3). */
  applyNotificationEffect(event: EffectEvent, tx: EffectTx): Promise<void>
  /** The headless time-driven dispatcher (S4/NF-2). Reads `sessions.dueIn(range)` and materializes ONLY
   *  already-due, time-pinned (`hard_deadline`) occurrences into inbox rows (NF-3 derive-until-fire — no
   *  phantom future inbox), deduping per occurrence in-service. Arms the local OS alert via the engine
   *  (deny-safe at M1). Failure-isolated: a throwing `dueIn` or a bad item never crashes the tick. Returns
   *  the `TickResult` accounting. `range` defaults to `{ start: 0, end: now }`; `now` defaults to `Date.now()`. */
  tick(range?: TimeRange, now?: number): Promise<TickResult>
}
