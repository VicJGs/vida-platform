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
import type { MergedPreferences } from '@vida/types'
import { createRepository } from '../../db/repository'
import { notifications, type NotificationRow } from '../../db/schema/notifications'
import {
  channelsFor,
  dedupKey,
  selectTier,
  type DeliveryChannel,
  type DeliveryDecision,
  type DeliveryResult,
} from '../../foundation/notifications'
import {
  INBOX_PAGE_SIZE,
  NotificationNotFoundError,
  type DeliverContext,
  type InboxQuery,
  type NotificationView,
  type NotificationsService,
  type NotificationsServiceDeps,
  type UnreadCounts,
} from './types'

// NF-4/NF-5 gating inputs the module READS from Preferences. Absent port ⇒ this permissive default
// (fail-OPEN: every channel on, no quiet window) — delivery gating is a user convenience, not a
// security gate (the habits prefs-port precedent). `[FACT: NF-4 business-rules:24-26; habits/service.ts:132]`
const PERMISSIVE_PREFS = {
  // notification_in_app deliberately omitted — NF-7 never gates in-app (always-on local channel).
  notification_push: true,
  notification_email: true,
  quiet_hours_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
  push_habits: true,
  push_tasks: true,
  push_routines: true,
  push_contacts: true,
  push_study: true,
} as const

// entity_type → the per-module push toggle (NF-5). The 5 reminder-heavy modules have a toggle; any other
// entity_type (or null) has NO per-module gate → governed only by the global `notification_push`. Study-family
// entities fold onto `push_study`. Keys verified against `db/schema/_registry.ts` ENTITY_TYPES (post-DB-4
// reframes: `routine`/`routine_step` not `routine_action`; `subject` not `course`; `knowledge_object` not
// `study_topic`; `language` dissolved into Spaces, ADR-006). `[FACT: db/schema/_registry.ts ENTITY_TYPES]`
const PUSH_TOGGLE_BY_ENTITY: Record<string, keyof typeof PERMISSIVE_PREFS> = {
  habit: 'push_habits',
  task: 'push_tasks',
  routine: 'push_routines',
  routine_step: 'push_routines',
  contact: 'push_contacts',
  session: 'push_study',
  subject: 'push_study',
  book: 'push_study',
  skill: 'push_study',
  knowledge_object: 'push_study',
}

// 'HH:MM' → local minute-of-day (0-1439); null/malformed → null. `[FACT: preferences.ts:73 'HH:MM']`
function hhmmToMinutes(v: string | null): number | null {
  if (v == null) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(v)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

// Is `minute` inside [start, end)? end < start spans midnight (the engine's bakeQuietHours discipline).
function inQuietWindow(minute: number, start: number, end: number): boolean {
  return start <= end ? minute >= start && minute < end : minute >= start || minute < end
}

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
  const { db, deviceId, engine, preferences } = deps
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

  // NF-5 — gate the ZK fidelity-max channels down to what Preferences + quiet-hours allow. in_app is
  // NEVER gated away (NF-7, the always-on local channel); push/email are gated per global toggle +
  // (push) the per-module toggle + quiet hours. Suppression ≠ loss: in-app still records.
  function gateChannels(
    zk: readonly DeliveryChannel[],
    row: NotificationRow,
    prefs: Pick<MergedPreferences, keyof typeof PERMISSIVE_PREFS>,
    nowMinuteOfDay?: number,
  ): DeliveryChannel[] {
    // Quiet hours suppress EXTERNAL delivery only (NF-5); needs a caller-resolved current minute.
    let inQuiet = false
    if (prefs.quiet_hours_enabled && nowMinuteOfDay !== undefined) {
      const start = hhmmToMinutes(prefs.quiet_hours_start)
      const end = hhmmToMinutes(prefs.quiet_hours_end)
      if (start !== null && end !== null) inQuiet = inQuietWindow(nowMinuteOfDay, start, end)
    }
    const out: DeliveryChannel[] = []
    for (const ch of zk) {
      if (ch === 'in_app') {
        out.push('in_app') // NF-7 — always, never gated
      } else if (ch === 'push') {
        const toggle = row.entity_type ? PUSH_TOGGLE_BY_ENTITY[row.entity_type] : undefined
        const perModuleOn = toggle ? prefs[toggle] : true // no per-module toggle → global governs
        if (prefs.notification_push && perModuleOn && !inQuiet) out.push('push')
      } else if (ch === 'email') {
        if (prefs.notification_email && !inQuiet) out.push('email')
      }
    }
    return out
  }

  async function deliver(id: string, ctx?: DeliverContext): Promise<DeliveryResult> {
    const row = await repo.findById(id)
    if (!row) throw new NotificationNotFoundError(id)

    const prefs = (await preferences?.getMergedPreferences()) ?? PERMISSIVE_PREFS
    // An event row carries the ADR-012 effect id (nature=event → wake_signal); a time-driven row does
    // not (nature=time_based → platform decides). Platform defaults to 'web' (conservative; M1 external
    // is deny-safe regardless). `[FACT: tiers.ts selectTier; schema effect_event_id event-only]`
    const nature = row.effect_event_id != null ? 'event' : 'time_based'
    const tier = selectTier(nature, ctx?.platform ?? 'web')
    const mode = 'standard' as const // no_third_party is an M2 opt-out posture
    const channels = gateChannels(channelsFor(tier, mode), row, prefs, ctx?.nowMinuteOfDay)
    const key = dedupKey(
      row.effect_event_id != null
        ? { kind: 'event', effectEventId: row.effect_event_id }
        : { kind: 'due', occurrenceId: row.id },
    )
    const decision: DeliveryDecision = ctx?.routing
      ? { tier, channels, mode, key, routing: ctx.routing }
      : { tier, channels, mode, key }
    // routing (userId/rooms, ADR-003) is caller-supplied; ABSENT at M1 ⇒ the engine's buildWakePayload
    // rejects the empty routing target → push folds to in-app (honest content-blind M1, NF-6). No [E]
    // content or entity refs ever ride the wire (engine-enforced). `[FACT: payload.ts:27-31]`

    const result = await engine.deliver(decision)
    // Persist the delivery-audit (NF-8) — which channels actually fired (in-app always; external only
    // when a port confirmed). Fallbacks are NOT counted as delivered.
    await repo.update(id, {
      delivered_in_app: result.inApp,
      delivered_push: result.delivered.includes('push'),
      delivered_email: result.delivered.includes('email'),
    })
    return result
  }

  return { list, unreadCounts, markRead, markAllRead, archive, archiveExpired, deliver }
}
