// ============================================================================
// NotificationsSurface — the `/notifications` route (fe-notifications ② · S1). The System's out-loud
// voice as a multi-lens surface: the user picks how they hear it (Margin · Dispatches · Constellation).
// S1 ships the shared chrome + the lens switcher + the flagship Margin lens + the full 8-state; S2/S3
// add the other two renderers. Data is honest-empty (M1) with a `?sample` DEV populate for the gate.
// ============================================================================
import { type ReactNode, useMemo, useState } from 'react'
import { Text, View } from '@tamagui/core'
import { Button, EmptyState } from '@vida/ui'
import type { Notification } from '@vida/types'
import { toAttentionModel, type NotificationLens } from './attention-model'
import { ConstellationLens } from './lens-constellation'
import { DispatchesLens } from './lens-dispatches'
import { MarginLens } from './lens-margin'
import { useNotificationLens } from './use-notification-lens'
import { useNotifications } from './use-notifications'

type StatusFilter = 'all' | 'unread' | 'archived'

const LENS_LABEL: Record<NotificationLens, string> = {
  margin: 'The Margin',
  dispatches: 'Dispatches',
  constellation: 'Constellation',
}

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: 'All',
  unread: 'Unread',
  archived: 'Archived',
}

function matchesStatus(r: Notification, s: StatusFilter): boolean {
  if (s === 'archived') return r.is_archived
  if (s === 'unread') return !r.is_read && !r.is_archived
  return !r.is_archived // 'all' = the active inbox (archived excluded)
}

function hhmm(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** A labelled segmented control (role=toolbar, aria-pressed) — the collection-switcher precedent, not Tabs. */
function Segmented<T extends string>({
  label,
  value,
  options,
  labelOf,
  onChange,
}: {
  label: string
  value: T
  options: readonly T[]
  labelOf: (v: T) => string
  onChange: (v: T) => void
}) {
  return (
    <View flexDirection="row" gap="$8" alignItems="center" role="toolbar" aria-label={label}>
      {options.map((o) => {
        const active = o === value
        return (
          <Button key={o} intent={active ? 'secondary' : 'ghost'} size="small" aria-pressed={active} onPress={() => onChange(o)}>
            {labelOf(o)}
          </Button>
        )
      })}
    </View>
  )
}

function Skeleton() {
  return (
    <View gap="$16" paddingTop="$12" aria-busy="true" aria-label="Loading notifications">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} flexDirection="row" gap="$12" alignItems="flex-start">
          <View width={68} height={10} borderRadius={4} backgroundColor="$colorSurfaceSecondary" marginTop={5} />
          <View width={9} height={9} borderRadius={99} backgroundColor="$colorSurfaceSecondary" marginTop={5} />
          <View flex={1} gap="$8">
            <View height={13} width="55%" borderRadius={4} backgroundColor="$colorSurfaceSecondary" />
            <View height={10} width="80%" borderRadius={4} backgroundColor="$colorSurfaceSecondary" />
          </View>
        </View>
      ))}
    </View>
  )
}

function ErrorView() {
  return (
    <View gap="$12" paddingVertical="$24" role="status">
      <Text fontSize="$body" fontFamily="$display" color="$colorTextPrimary">
        We couldn't load your notifications
      </Text>
      <Text fontSize="$small" color="$colorTextMuted">
        Your data is safe on this device — this is only the inbox view.
      </Text>
      <View flexDirection="row">
        <Button intent="secondary" size="small">
          Retry
        </Button>
      </View>
    </View>
  )
}

export function NotificationsSurface() {
  const data = useNotifications()
  const { lens, setLens } = useNotificationLens()
  const [status, setStatus] = useState<StatusFilter>('all')
  // Optimistic-LOCAL lifecycle: the UI responds immediately; the durable write binds to the composition
  // root with reads (deferred). Session-only at M1 (resets on reload, like every M1 write) — honest, NOT
  // a faked "saved". `[FACT: seam-contract.md "writes deferred-live"]`
  const [overlay, setOverlay] = useState<{ read: ReadonlySet<string>; archived: ReadonlySet<string> }>({ read: new Set(), archived: new Set() })

  const rows = useMemo<Notification[]>(
    () => data.rows.map((r) => (overlay.read.has(r.id) || overlay.archived.has(r.id) ? { ...r, is_read: r.is_read || overlay.read.has(r.id), is_archived: r.is_archived || overlay.archived.has(r.id) } : r)),
    [data.rows, overlay],
  )
  const unread = useMemo(() => rows.filter((r) => !r.is_read && !r.is_archived).length, [rows])

  // the status filter is a Margin-only control; the other lenses always show the active inbox.
  const effectiveStatus: StatusFilter = lens === 'margin' ? status : 'all'
  const filtered = useMemo(() => rows.filter((r) => matchesStatus(r, effectiveStatus)), [rows, effectiveStatus])
  const model = useMemo(
    // anticipations only belong to the active inbox, not the archived/read views.
    () => toAttentionModel(filtered, effectiveStatus === 'all' ? data.upcoming : [], data.now),
    [filtered, data.upcoming, data.now, effectiveStatus],
  )

  const onMarkRead = (id: string) => setOverlay((o) => ({ ...o, read: new Set(o.read).add(id) }))
  const onArchive = (id: string) => setOverlay((o) => ({ ...o, archived: new Set(o.archived).add(id) }))
  const onMarkAllRead = () => setOverlay((o) => ({ ...o, read: new Set([...o.read, ...rows.filter((r) => !r.is_read && !r.is_archived).map((r) => r.id)]) }))

  const totallyEmpty = model.anticipated.length === 0 && model.settled.length === 0

  let body: ReactNode
  if (data.state === 'loading') {
    body = <Skeleton />
  } else if (data.state === 'error') {
    body = <ErrorView />
  } else if (totallyEmpty) {
    body = (
      <EmptyState title={status === 'archived' ? 'Nothing archived' : "You're all caught up"} titleLevel={3}>
        <Text fontSize="$small" color="$colorTextMuted">
          {status === 'archived' ? 'Archived notifications will appear here.' : 'New notifications will appear here.'}
        </Text>
      </EmptyState>
    )
  } else if (lens === 'dispatches') {
    body = <DispatchesLens model={model} now={data.now} onMarkRead={onMarkRead} onArchive={onArchive} />
  } else if (lens === 'constellation') {
    body = <ConstellationLens model={model} />
  } else {
    body = <MarginLens model={model} nowLabel={hhmm(data.now)} onMarkRead={onMarkRead} onArchive={onArchive} />
  }

  return (
    <View maxWidth={720} width="100%" marginHorizontal="auto" padding="$24" gap="$16">
      {/* header */}
      <View flexDirection="row" justifyContent="space-between" alignItems="flex-start" gap="$12" flexWrap="wrap">
        <View gap="$8">
          <Text fontSize="$display" fontFamily="$display" color="$colorTextPrimary">
            Notifications
          </Text>
          <View flexDirection="row" alignItems="center" gap="$8">
            {unread > 0 ? <View width={7} height={7} borderRadius={99} backgroundColor="$colorBrandPrimary" /> : null}
            <Text fontSize="$small" color="$colorTextMuted">
              {unread > 0 ? `${unread} unread` : 'All caught up'}
            </Text>
          </View>
        </View>
        {unread > 0 ? (
          <Button intent="ghost" size="small" onPress={onMarkAllRead}>
            Mark all read
          </Button>
        ) : null}
      </View>

      {/* controls: lens switcher + status filter */}
      <View flexDirection="row" justifyContent="space-between" alignItems="center" gap="$12" flexWrap="wrap">
        <Segmented label="Choose a view" value={lens} options={['margin', 'dispatches', 'constellation']} labelOf={(l) => LENS_LABEL[l]} onChange={setLens} />
        {lens === 'margin' ? (
          <Segmented label="Filter by status" value={status} options={['all', 'unread', 'archived']} labelOf={(s) => STATUS_LABEL[s]} onChange={setStatus} />
        ) : null}
      </View>

      {body}
    </View>
  )
}

export default NotificationsSurface
