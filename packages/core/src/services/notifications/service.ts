// ============================================================================
// services/notifications — the service (mod-notifications #53 ①)
//
// S1 (scaffold + inbox reads + lifecycle + DB-11 reconcile). Factory-object, hoisted closures,
// no `this.` (the ② destructure shape; the habits/checkins precedent). Persistence: DB-6 Repository,
// encryptedFields:[] M1.0 pass-through (the [E] title/message/action_label/metadata boundary → M3/DB-5).
//   notifications → softDelete:false (NO deleted_at — read→archive→expire→purge lifecycle, NF-13).
//
// Reads go through findWhere/findById (REAL DB reads → faithful values; boolInt maps 0/1↔boolean).
// Mutations go through repo.update, which RE-READS the full persisted row (repository.ts:437) → its
// return is faithful (unlike create()'s input-echo). toView() picks exactly the @vida/types interface
// fields, dropping _sync_* + any phantom column (the drizzle-row-≠-interface seam).
// ============================================================================

import { and, eq, lte, type SQL } from 'drizzle-orm'
import { createRepository } from '../../db/repository'
import { notifications, type NotificationRow } from '../../db/schema/notifications'
import {
  INBOX_PAGE_SIZE,
  NotificationNotFoundError,
  type InboxQuery,
  type NotificationView,
  type NotificationsService,
  type NotificationsServiceDeps,
  type UnreadCounts,
} from './types'

// --- Row → @vida/types interface (explicit pick: drops _sync_*/phantom cols) ---
function toView(r: NotificationRow): NotificationView {
  return {
    id: r.id,
    type: r.type, // enumText yields the NotificationType union (not widened string) — no cast needed
    title: r.title,
    message: r.message,
    action_url: r.action_url,
    action_label: r.action_label,
    entity_type: r.entity_type,
    entity_id: r.entity_id,
    is_read: r.is_read,
    read_at: r.read_at,
    is_archived: r.is_archived,
    archived_at: r.archived_at,
    expires_at: r.expires_at,
    delivered_in_app: r.delivered_in_app,
    delivered_push: r.delivered_push,
    delivered_email: r.delivered_email,
    metadata: r.metadata,
    effect_event_id: r.effect_event_id,
    created_at: r.created_at,
  }
}

export function createNotificationsService(deps: NotificationsServiceDeps): NotificationsService {
  const { db, deviceId } = deps
  const repo = createRepository(db, notifications, {
    deviceId,
    encryptedFields: [], // M1.0 pass-through; [E] title/message/action_label/metadata → M3/DB-5
    softDelete: false, // NO deleted_at — archive/expire/purge lifecycle (NF-13)
  })

  // status → the lifecycle clause (unread/read exclude archived; archived ignores read-state).
  function statusClause(status: InboxQuery['status']): SQL[] {
    if (status === 'unread') return [eq(notifications.is_read, false), eq(notifications.is_archived, false)]
    if (status === 'read') return [eq(notifications.is_read, true), eq(notifications.is_archived, false)]
    if (status === 'archived') return [eq(notifications.is_archived, true)]
    return []
  }

  async function list(q?: InboxQuery): Promise<NotificationView[]> {
    const clauses = statusClause(q?.status)
    if (q?.type) clauses.push(eq(notifications.type, q.type))
    const rows = clauses.length > 0 ? await repo.findWhere(and(...clauses) as SQL) : await repo.findAll()
    const sorted = [...rows].sort((a, b) => b.created_at - a.created_at) // newest-first
    const page = q?.page ?? 0
    return sorted.slice(page * INBOX_PAGE_SIZE, page * INBOX_PAGE_SIZE + INBOX_PAGE_SIZE).map(toView)
  }

  async function unreadCounts(): Promise<UnreadCounts> {
    const rows = await repo.findWhere(
      and(eq(notifications.is_read, false), eq(notifications.is_archived, false)) as SQL,
    )
    return {
      unread: rows.length,
      error: rows.filter((r) => r.type === 'error').length,
      warning: rows.filter((r) => r.type === 'warning').length,
      reminder: rows.filter((r) => r.type === 'reminder').length,
    }
  }

  async function markRead(id: string): Promise<NotificationView> {
    const existing = await repo.findById(id)
    if (!existing) throw new NotificationNotFoundError(id)
    if (existing.is_read) return toView(existing) // idempotent — don't re-stamp read_at
    return toView(await repo.update(id, { is_read: true, read_at: Date.now() }))
  }

  async function markAllRead(): Promise<number> {
    const unread = await repo.findWhere(
      and(eq(notifications.is_read, false), eq(notifications.is_archived, false)) as SQL,
    )
    const now = Date.now()
    for (const r of unread) {
      await repo.update(r.id, { is_read: true, read_at: now })
    }
    return unread.length
  }

  async function archive(id: string): Promise<NotificationView> {
    const existing = await repo.findById(id)
    if (!existing) throw new NotificationNotFoundError(id)
    if (existing.is_archived) return toView(existing) // idempotent
    return toView(await repo.update(id, { is_archived: true, archived_at: Date.now() }))
  }

  async function archiveExpired(now: number = Date.now()): Promise<number> {
    // expires_at ≤ now AND not already archived → auto-archive (NF-13). NULL expires_at never matches.
    const expired = await repo.findWhere(
      and(lte(notifications.expires_at, now), eq(notifications.is_archived, false)) as SQL,
    )
    for (const r of expired) {
      await repo.update(r.id, { is_archived: true, archived_at: now })
    }
    return expired.length
  }

  return { list, unreadCounts, markRead, markAllRead, archive, archiveExpired }
}
