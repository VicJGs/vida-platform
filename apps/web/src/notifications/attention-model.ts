// ============================================================================
// fe-notifications ② · S1 — the attention model (pure, one-model-three-renderers).
//
// Splits the inbox into what the System is ANTICIPATING vs what has SETTLED, resolves each row's
// display vocabulary (relative time · severity marker · NOT-25 dangling · System voice · life-area),
// and groups by area for the Constellation lens. PURE + unit-testable; the three lenses are renderers
// over this single model. The @vida/core↔@vida/ui crossing (service types → Tamagui-ready props) lives
// here in apps/web (the collection-adapter precedent, BR-2). `[FACT: apps/web/src/collection/CLAUDE.md]`
//
// Anticipations do NOT come from notification rows: the dispatcher never writes a row before fire time
// (NF-3 derive-until-fire, no phantom future inbox). They derive from the Sessions `dueIn` agenda —
// honest-empty at M1, `?sample` for the gate, live swap deferred to the first consumer.
// `[FACT: docs/modules/notifications/current-business-rules.md BR-NT-S4-3; seam-contract.md]`
// ============================================================================
import type { Notification, NotificationType } from '@vida/types'

export type NotificationLens = 'margin' | 'dispatches' | 'constellation'
export const NOTIFICATION_LENSES: readonly NotificationLens[] = ['margin', 'dispatches', 'constellation']

/** A not-yet-fired reminder from the Sessions `dueIn` agenda — the "above now" anticipations. */
export interface UpcomingItem {
  id: string
  type: NotificationType
  title: string
  /** the System voice line (optional). */
  voice: string | null
  /** life-area label (from the source module / entity_type). */
  entity: string | null
  /** fire instant (Unix ms), strictly in the future at read time. */
  dueAt: number
}

/** A resolved entry the lenses render. Severity is a semantic token + a `warm` flag (error/warning only);
 *  the other four types read through shape + position, not hue alone (EC-5). */
export interface AttentionEntry {
  id: string
  type: NotificationType
  title: string
  voice: string | null
  entity: string | null
  /** "in 6h" (anticipated) or "5h ago" (settled). */
  relTime: string
  /** semantic color token for the marker glyph. */
  marker: string
  /** error/warning → a small warm glyph; the rest stay quiet. */
  warm: boolean
  /** NOT-25 — the linked subject is gone → render "no longer available", never a live link. */
  dangling: boolean
  isRead: boolean
  anticipated: boolean
}

export interface AttentionArea {
  area: string
  entries: AttentionEntry[]
}

export interface AttentionModel {
  anticipated: AttentionEntry[]
  settled: AttentionEntry[]
  byArea: AttentionArea[]
}

// --- severity vocabulary (shape + token, never hue alone) ------------------------------------------
const MARKER: Record<NotificationType, { color: string; warm: boolean }> = {
  info: { color: '$colorTextMuted', warm: false },
  success: { color: '$colorSignalSuccess', warm: false },
  warning: { color: '$colorBrandEmphasis', warm: true },
  error: { color: '$colorSignalDanger', warm: true },
  reminder: { color: '$colorBrandPrimary', warm: false },
  achievement: { color: '$colorBrandPrimary', warm: false },
}

// entity_type → human life-area label. Unmapped → "General".
const AREA_LABEL: Record<string, string> = {
  habit: 'Habits',
  task: 'Tasks',
  routine: 'Routines',
  routine_step: 'Routines',
  contact: 'Relationships',
  project: 'Projects',
  deliverable: 'Projects',
  milestone: 'Projects',
  session: 'Study',
  subject: 'Study',
  book: 'Study',
  skill: 'Study',
  knowledge_object: 'Study',
  transaction: 'Finance',
  account: 'Finance',
}

function areaOf(entityType: string | null): string {
  if (!entityType) return 'General'
  return AREA_LABEL[entityType] ?? 'General'
}

const MIN = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

/** Relative past, e.g. "just now" · "5h ago" · "2d ago". */
export function relPast(at: number, now: number): string {
  const d = Math.max(0, now - at)
  if (d < 45 * MIN) return 'just now'
  if (d < DAY) return `${Math.round(d / HOUR)}h ago`
  return `${Math.round(d / DAY)}d ago`
}

/** Relative future, e.g. "soon" · "in 6h" · "in 2d". */
export function relFuture(at: number, now: number): string {
  const d = Math.max(0, at - now)
  if (d < 45 * MIN) return 'soon'
  if (d < DAY) return `in ${Math.round(d / HOUR)}h`
  return `in ${Math.round(d / DAY)}d`
}

/** NOT-25 — an action_url that points at a deleted subject is "dangling". At M1 (no live subject lookup)
 *  a row flagged `_dangling` in metadata is honored; otherwise a present action_url is treated as live.
 *  The live subject-existence check lands with the composition root. `[FACT: BR-NT-S5-5; NOT-25]` */
function isDangling(row: Notification): boolean {
  if (!row.action_url) return false
  if (!row.metadata) return false
  try {
    return (JSON.parse(row.metadata) as { _dangling?: boolean })._dangling === true
  } catch {
    return false
  }
}

function settledEntry(row: Notification, now: number): AttentionEntry {
  const m = MARKER[row.type]
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    voice: row.message,
    entity: row.entity_type ? areaOf(row.entity_type) : null,
    relTime: relPast(row.created_at, now),
    marker: m.color,
    warm: m.warm,
    dangling: isDangling(row),
    isRead: row.is_read,
    anticipated: false,
  }
}

function upcomingEntry(item: UpcomingItem, now: number): AttentionEntry {
  const m = MARKER[item.type]
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    voice: item.voice,
    entity: item.entity ? areaOf(item.entity) : null,
    relTime: relFuture(item.dueAt, now),
    marker: m.color,
    warm: m.warm,
    dangling: false,
    isRead: false,
    anticipated: true,
  }
}

/** Build the attention model. `rows` = fired notifications (settled, newest-first already); `upcoming` =
 *  the dueIn agenda (anticipations, soonest-first). PURE — `now` is injected (Date.now() is forbidden in
 *  pure modules and must stay testable). */
export function toAttentionModel(rows: readonly Notification[], upcoming: readonly UpcomingItem[], now: number): AttentionModel {
  const anticipated = [...upcoming].sort((a, b) => a.dueAt - b.dueAt).map((u) => upcomingEntry(u, now))
  const settled = [...rows].sort((a, b) => b.created_at - a.created_at).map((r) => settledEntry(r, now))

  const areas = new Map<string, AttentionEntry[]>()
  for (const e of settled) {
    const key = e.entity ?? 'General'
    const bucket = areas.get(key)
    if (bucket) bucket.push(e)
    else areas.set(key, [e])
  }
  const byArea: AttentionArea[] = [...areas.entries()].map(([area, entries]) => ({ area, entries }))

  return { anticipated, settled, byArea }
}
