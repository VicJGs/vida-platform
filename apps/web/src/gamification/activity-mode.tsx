// ============================================================================
// ActivityMode — the Activity mode (fe-gamification ② · S5 · EC-8).
//
// The consequence-ledger HISTORY over the shipped @vida/ui `CollectionView` (the slice-map's mandated shell):
// CollectionView owns the title/count/8-state via `renderView`; the body holds a FLAT, reverse-chronological
// `ListView` + the pager (50/page). Read-only — a history has no create affordance, so there is no `+ New`
// (no dead buttons). Icons are Lucide (EC-11, never emoji). Data is stubbed vs the seam (IR-G1); the enriched
// ledger read is the unbuilt ①-tier F-S5-1 seam (use-activity.ts).
// ============================================================================
import { Text, View } from '@tamagui/core'
import { Button, CollectionView, EmptyState, ListView, type ViewLayout, type ViewState } from '@vida/ui'
import type { ConsequenceKind } from '@vida/types'
import { Lock, Minus, Plus, Share2 } from 'lucide-react'
import type { ComponentType } from 'react'
import { collapseToTerminal } from '../state-conventions/interaction-state'
import { PAGE_SIZE, useActivity, type ActivityEntry } from './use-activity'

const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const
const LAYOUTS: readonly ViewLayout[] = ['list']

// Absolute, concise date-time — native `Intl.DateTimeFormat`, the apps/web convention (home-surface.tsx:36);
// date-fns is not in apps/web's deps. Deterministic for a fixed `at`, so `?sample` stays Gate-stable (BR-S5-8).
// Two formatters so a multi-year ledger stays unambiguous: the year is shown ONLY for entries outside `now`'s year.
const DATE_TIME = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const DATE_TIME_YEAR = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const formatAt = (at: number, now: number): string =>
  (new Date(at).getFullYear() === new Date(now).getFullYear() ? DATE_TIME : DATE_TIME_YEAR).format(at)

/** Kind → label + Lucide glyph. The LABEL carries direction (BR-S5-3 — never color or an asserted ± sign). */
const KIND_LABEL: Record<ConsequenceKind, string> = {
  earn: 'Earned',
  lock: 'Locked',
  spend: 'Spent',
  distribute: 'Distributed',
}
const KIND_ICON: Record<ConsequenceKind, ComponentType<{ size?: number; 'aria-hidden'?: boolean }>> = {
  earn: Plus,
  lock: Lock,
  spend: Minus,
  distribute: Share2,
}

/** One ledger event: [glyph] Label · magnitude + currency (primary) / absolute time · source (secondary). */
function ActivityRow({ entry, now }: { entry: ActivityEntry; now: number }) {
  const Icon = KIND_ICON[entry.kind]
  const label = KIND_LABEL[entry.kind]
  const currency = entry.currencyName ?? entry.currencyCode
  return (
    <View gap="$4">
      <View flexDirection="row" alignItems="center" gap="$8">
        <Icon size={14} aria-hidden />
        <Text fontSize="$body" color="$colorTextPrimary">
          {label}
        </Text>
        <Text fontSize="$body" color="$colorTextPrimary" style={TABULAR}>
          {entry.amount.toLocaleString()} {currency}
        </Text>
      </View>
      <View flexDirection="row" alignItems="baseline" gap="$8" flexWrap="wrap">
        <Text fontSize="$caption" color="$colorTextMuted" style={TABULAR}>
          {formatAt(entry.at, now)}
        </Text>
        <Text fontSize="$caption" color="$colorTextMuted">
          · {entry.source}
        </Text>
      </View>
    </View>
  )
}

/** The paginated-list pager (EC-8, 50/page) — shown whenever there is data; prev/next disabled at the bounds. */
function Pager({ index, count, total, onPage }: { index: number; count: number; total: number; onPage: (i: number) => void }) {
  const start = index * PAGE_SIZE + 1
  const end = Math.min(total, start + PAGE_SIZE - 1)
  return (
    <View flexDirection="row" alignItems="center" justifyContent="space-between" gap="$12" role="group" aria-label="Pagination">
      <Text fontSize="$caption" color="$colorTextMuted" style={TABULAR}>
        {start}–{end} of {total}
      </Text>
      {count > 1 ? (
        <View flexDirection="row" gap="$8">
          <Button intent="ghost" size="small" disabled={index === 0} onPress={() => onPage(index - 1)} aria-label="Previous page">
            Previous
          </Button>
          <Button intent="ghost" size="small" disabled={index >= count - 1} onPress={() => onPage(index + 1)} aria-label="Next page">
            Next
          </Button>
        </View>
      ) : null}
    </View>
  )
}

export function ActivityMode() {
  const data = useActivity()

  const renderView = (_layout: ViewLayout, state: ViewState) => (
    <ListView<ActivityEntry>
      items={data.entries}
      renderItem={(entry) => <ActivityRow entry={entry} now={data.now} />}
      getKey={(entry) => entry.id}
      state={state}
      aria-label="Activity"
    />
  )

  return (
    <View gap="$16">
      <CollectionView
        title="Activity"
        count={data.total}
        layout="list"
        layouts={LAYOUTS}
        onLayoutChange={() => {}}
        state={collapseToTerminal(data.state)}
        renderView={renderView}
        // Read-only history → an activity-honest empty (the shell default "Items you add will show up here" promises
        // a create affordance Activity does not have — g2 S5 finding #1 / BR-S5-2). No action button.
        empty={
          <EmptyState title="No activity yet" titleLevel={3}>
            <Text fontSize="$small" color="$colorTextMuted">
              As your System earns, locks, spends, and shares currency, every event will appear here.
            </Text>
          </EmptyState>
        }
        aria-label="Activity"
      />
      {data.total > 0 ? <Pager index={data.page.index} count={data.page.count} total={data.total} onPage={data.setPage} /> : null}
    </View>
  )
}

export default ActivityMode
