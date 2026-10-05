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

import type { Notification, NotificationType } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'

export interface NotificationsServiceDeps {
  db: DrizzleDb
  deviceId: string
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

export const INBOX_PAGE_SIZE = 50

// --- errors -----------------------------------------------------------------
/** A mutation targeted a notification id that does not exist. */
export class NotificationNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Notification not found: ${id}`)
    this.name = 'NotificationNotFoundError'
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
}
