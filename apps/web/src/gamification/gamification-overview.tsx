// ============================================================================
// GamificationOverviewPanel — the Overview mode (fe-gamification ② · S1 · EC-4).
//
// The glanceable System hub, composed over the shipped @vida/ui `DashboardView` (the home-dashboard
// precedent): a Level block (the XpHero), a Currencies block (balances), a Recent-achievements block.
// DashboardView owns the per-block loading/empty/error chrome and calls `renderBlock` only for `success`
// (a block is CONTENT); each block threads its OWN state (BR-2) so a block with no data degrades locally
// while the level hero stays live. Block-empties are HONEST teaching lines — NO action buttons (the
// `+ New currency` entry is S2's working affordance; a dead button here would lie).
//
// Reward COPY only via the register (EC-10); no theming. Icons would be lucide/SVG, never emoji (EC-11) —
// S1 is text-based, so none are needed.
// ============================================================================
import type { ReactNode } from 'react'
import { Text, View } from '@tamagui/core'
import { DashboardView, type DashboardBlock } from '@vida/ui'
import type { RewardCopy } from './reward-copy'
import type { CurrencyLine, GamificationOverview, RecentUnlock } from './use-gamification'
import { XpHero } from './xp-hero'

const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const

function agoLabel(earnedAt: number, now: number): string {
  const diff = Math.max(0, now - earnedAt)
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function BalancesList({ lines }: { lines: readonly CurrencyLine[] }) {
  return (
    <View gap="$12" role="list" aria-label="Currency balances">
      {lines.map((line) => (
        <View
          key={line.def.code}
          role="listitem"
          flexDirection="row"
          justifyContent="space-between"
          alignItems="baseline"
          gap="$12"
        >
          <Text fontSize="$body" color="$colorTextPrimary">
            {line.def.name ?? line.def.code}
          </Text>
          <View flexDirection="row" alignItems="baseline" gap="$8">
            <Text fontSize="$body" color="$colorTextPrimary" style={TABULAR}>
              {line.balance.current.toLocaleString()}
            </Text>
            {line.balance.locked > 0 ? (
              <Text fontSize="$caption" color="$colorTextMuted" style={TABULAR}>
                {line.balance.locked.toLocaleString()} locked
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  )
}

function RecentUnlocksList({ unlocks, now }: { unlocks: readonly RecentUnlock[]; now: number }) {
  return (
    <View gap="$12" role="list" aria-label="Recent achievements">
      {unlocks.map((u) => (
        <View
          key={u.achievement.id}
          role="listitem"
          flexDirection="row"
          justifyContent="space-between"
          alignItems="baseline"
          gap="$12"
        >
          <View gap="$2" flex={1}>
            <Text fontSize="$body" color="$colorTextPrimary">
              {u.achievement.title}
            </Text>
            <Text fontSize="$caption" color="$colorTextMuted">
              {u.achievement.tier} · {u.achievement.category}
            </Text>
          </View>
          <Text fontSize="$caption" color="$colorTextMuted">
            {agoLabel(u.earnedAt, now)}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function GamificationOverviewPanel({
  overview,
  copy,
  now,
}: {
  overview: GamificationOverview
  copy: RewardCopy
  now: number
}) {
  const blocks: DashboardBlock[] = [
    { id: 'level', title: 'Level', size: 'lg', state: 'success' },
    { id: 'balances', title: 'Currencies', size: 'md', state: overview.balances.length > 0 ? 'success' : 'empty' },
    {
      id: 'achievements',
      title: 'Recent achievements',
      size: 'md',
      state: overview.recentUnlocks.length > 0 ? 'success' : 'empty',
    },
  ]

  const renderBlock = (b: DashboardBlock): ReactNode => {
    switch (b.id) {
      case 'level':
        return <XpHero level={overview.level} />
      case 'balances':
        return <BalancesList lines={overview.balances} />
      case 'achievements':
        return <RecentUnlocksList unlocks={overview.recentUnlocks} now={now} />
      default:
        return null
    }
  }

  const blockEmpty = (b: DashboardBlock): ReactNode => {
    const text =
      b.id === 'balances'
        ? 'Set up a currency to start earning.'
        : `Unlock your first ${copy.reward.toLowerCase()} and it appears here.`
    return (
      <Text fontSize="$small" color="$colorTextMuted">
        {text}
      </Text>
    )
  }

  return (
    <DashboardView
      title="Your System"
      blocks={blocks}
      renderBlock={renderBlock}
      blockEmpty={blockEmpty}
      aria-label="System overview"
    />
  )
}
