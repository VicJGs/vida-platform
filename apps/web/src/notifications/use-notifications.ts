// ============================================================================
// useNotifications — the notifications DATA seam (fe-notifications ② · S1). The notes-surface
// precedent: M1 returns the honest DEFAULT (empty); the live swap is drop-in, zero signature change.
//
// M1 DEFAULT = empty (there are no notifications until the live data plane lands; a live
// `NotificationsService.list()` would throw today on the worker-RPC Drizzle `values` seam).
// Live swap:
//   const { data: rows } = useQuery({ queryKey: ['notifications','list'], queryFn: () => svc.list() })
//   const { data: counts } = useQuery({ queryKey: ['notifications','unread'], queryFn: () => svc.unreadCounts() })
//   const { data: upcoming } = useQuery({ queryKey: ['sessions','dueIn'], queryFn: () => sessions.dueIn(window) })
//
// `upcoming` (The Margin's anticipations) is the Sessions `dueIn` agenda — NOT notification rows
// (NF-3: no phantom future rows). Honest-empty at M1; the live swap reads dueIn at the first consumer.
//
// A DEV-ONLY sample (NOT shipped live data) renders populated states for the blocking Visual Gate,
// gated behind `?sample` in DEV only.
// ============================================================================
import type { Notification } from '@vida/types'
import { deriveInteractionState, type InteractionState } from '../state-conventions/interaction-state'
import type { UpcomingItem } from './attention-model'

export interface UnreadCounts {
  unread: number
  error: number
  warning: number
  reminder: number
}

export interface NotificationsData {
  rows: readonly Notification[]
  upcoming: readonly UpcomingItem[]
  counts: UnreadCounts
  state: InteractionState
  /** the reference instant the lenses compute relative time against (sample uses a fixed ref so the
   *  Visual Gate is deterministic; live uses Date.now()). */
  now: number
}

// --- DEV/gate sample (never shipped live) ---------------------------------------------------------
const NOW_REF = 1_760_000_000_000 // fixed reference so the gate is deterministic (no Date.now() in a module)

const SAMPLE_ROWS: readonly Notification[] = [
  mkRow('s1', 'achievement', 'Reading streak reached seven days', 'one week strong', 'habit', NOW_REF - 5 * 3_600_000, false),
  mkRow('s2', 'error', "A write didn't complete", 'saved locally — nothing was lost', null, NOW_REF - 26 * 3_600_000, false),
  mkRow('s3', 'warning', 'Two deliverables slipped past due', 'in Thesis', 'deliverable', NOW_REF - 2 * 86_400_000, true),
  mkRow('s4', 'success', 'Milestone reached', 'no longer available', 'milestone', NOW_REF - 3 * 86_400_000, true, true),
  mkRow('s5', 'info', 'Welcome to Vida', 'everything here lives on your device', null, NOW_REF - 7 * 86_400_000, true),
]

const SAMPLE_UPCOMING: readonly UpcomingItem[] = [
  { id: 'u1', type: 'reminder', title: 'Statement closes', voice: "you'll want to look", entity: 'transaction', dueAt: NOW_REF + 6 * 3_600_000 },
  { id: 'u2', type: 'reminder', title: 'Standup', voice: 'with the design team', entity: 'session', dueAt: NOW_REF + 2 * 3_600_000 },
]

function mkRow(
  id: string,
  type: Notification['type'],
  title: string,
  message: string | null,
  entity_type: string | null,
  created_at: number,
  is_read: boolean,
  dangling = false,
): Notification {
  return {
    id,
    type,
    title,
    message,
    action_url: dangling ? '/x/deleted' : entity_type ? `/x/${id}` : null,
    action_label: null,
    entity_type,
    entity_id: entity_type ? `${id}-ref` : null,
    is_read,
    read_at: is_read ? created_at + 1000 : null,
    is_archived: false,
    archived_at: null,
    expires_at: null,
    delivered_in_app: true,
    delivered_push: false,
    delivered_email: false,
    metadata: dangling ? JSON.stringify({ _dangling: true }) : null,
    effect_event_id: null,
    created_at,
  }
}

function sampleCounts(rows: readonly Notification[]): UnreadCounts {
  const unread = rows.filter((r) => !r.is_read && !r.is_archived)
  return {
    unread: unread.length,
    error: unread.filter((r) => r.type === 'error').length,
    warning: unread.filter((r) => r.type === 'warning').length,
    reminder: unread.filter((r) => r.type === 'reminder').length,
  }
}

const EMPTY_COUNTS: UnreadCounts = { unread: 0, error: 0, warning: 0, reminder: 0 }

function devSampleActive(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('sample')
  )
}

// settled rows drive the surface's terminal state (an empty agenda alone is still an empty inbox).
function stateOf(rows: readonly Notification[]): InteractionState {
  return deriveInteractionState({ isPending: false, isError: false, data: rows }, (d) => d.length === 0)
}

// DEV/gate-only: force a terminal state the honest-empty seam can't otherwise reach (loading/error),
// so the blocking Visual Gate can prove all 8 states. Off in prod.
function forcedState(): InteractionState | null {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return null
  const f = new URLSearchParams(window.location.search).get('force')
  return f === 'loading' || f === 'error' ? f : null
}

/** M1 default (honest-empty) + the DEV/gate sample. `state` is derived via the shipped 8-state canon;
 *  the surface collapses it to a terminal rendering. */
export function useNotifications(): NotificationsData {
  const forced = forcedState()
  if (forced) return { rows: [], upcoming: [], counts: EMPTY_COUNTS, state: forced, now: NOW_REF }
  if (devSampleActive()) {
    return { rows: SAMPLE_ROWS, upcoming: SAMPLE_UPCOMING, counts: sampleCounts(SAMPLE_ROWS), state: stateOf(SAMPLE_ROWS), now: NOW_REF }
  }
  return { rows: [], upcoming: [], counts: EMPTY_COUNTS, state: stateOf([]), now: Date.now() }
}
