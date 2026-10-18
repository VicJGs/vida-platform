// ============================================================================
// AchievementsMode — the Achievements mode (fe-gamification ② · S3 · EC-6).
//
// ALL achievements by category × tier, earned + locked + progress, over the mandated `CollectionView` — the
// first genuine 2-layout mode: **calm = list · game = trophy wall** (gallery). The default layout is PRESET-keyed
// (game → gallery, else list — the S1 ring idiom), and the CollectionView switcher lets the user override.
//
// Tier is conveyed by a LABEL (the reliable non-color signal) + a brand-accent Lucide `Medal` ring (earned) /
// muted (locked) — NO bronze/silver/gold palette (none exists; inventing one violates EC-11 token-purity — a
// Figma/M4 concern). "Progress toward locked" renders deny-safe (present ⇒ a HonestProgress bar) — never derived
// (IR-G3). Earned vs locked: the medal dims (chrome), the title holds full opacity (AA — the Card BR-C-7a lesson).
// ============================================================================
import { useState } from 'react'
import { Text, View } from '@tamagui/core'
import { CollectionView, GalleryView, HonestProgress, ListView, type ViewLayout, type ViewState } from '@vida/ui'
import { Medal } from 'lucide-react'
import { collapseToTerminal } from '../state-conventions/interaction-state'
import { useActivePreset } from './use-active-preset'
import { useAchievements, type AchievementRow } from './use-achievements'

const LAYOUTS: readonly ViewLayout[] = ['list', 'gallery']
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** A locked achievement's progress, deny-safe: a bar when the (future) tracking provides it, else "Locked". */
function LockedStatus({ row }: { row: AchievementRow }) {
  if (row.progress) {
    const { current, target } = row.progress
    return <HonestProgress label={`${current} / ${target}`} value={target > 0 ? current / target : 0} />
  }
  return (
    <Text fontSize="$caption" color="$colorTextMuted">
      Locked
    </Text>
  )
}

/** The trophy-wall medal: a ringed Lucide Medal — brand accent when earned, muted when locked (the ring + icon are
 *  the chrome that dims; the label carries the tier/state, so color is never the sole signal). */
function TierMedal({ earned }: { earned: boolean }) {
  return (
    <View
      width={48}
      height={48}
      borderRadius={999}
      borderWidth={2}
      borderColor={earned ? '$colorBrandPrimary' : '$colorBorderDefault'}
      alignItems="center"
      justifyContent="center"
      color={earned ? '$colorBrandPrimary' : '$colorTextMuted'}
    >
      <Medal size={24} aria-hidden />
    </View>
  )
}

/** Gallery (trophy-wall) tile: medal + title + "tier · category" + earned/locked state. */
function AchievementTile({ row }: { row: AchievementRow }) {
  const { achievement, earned } = row
  return (
    <View gap="$8" alignItems="center" padding="$12" borderWidth={1} borderColor="$colorBorderDefault" borderRadius="$lg">
      <TierMedal earned={earned} />
      <View gap="$2" alignItems="center">
        <Text fontSize="$body" color="$colorTextPrimary" numberOfLines={2} style={{ textAlign: 'center' }}>
          {achievement.title}
        </Text>
        <Text fontSize="$caption" color="$colorTextMuted">
          {cap(achievement.tier)} · {achievement.category}
        </Text>
      </View>
      {earned ? (
        <Text fontSize="$caption" color="$colorBrandPrimary">
          Earned
        </Text>
      ) : (
        <View width="100%">
          <LockedStatus row={row} />
        </View>
      )}
    </View>
  )
}

/** List row: title + tier + earned/locked (the calm layout). */
function AchievementListRow({ row }: { row: AchievementRow }) {
  const { achievement, earned } = row
  return (
    <View flexDirection="row" justifyContent="space-between" alignItems="center" gap="$12">
      <View gap="$2" flex={1}>
        <Text fontSize="$body" color="$colorTextPrimary">
          {achievement.title}
        </Text>
        <Text fontSize="$caption" color="$colorTextMuted">
          {cap(achievement.tier)} · {achievement.category}
        </Text>
      </View>
      <View width={160} alignItems="flex-end">
        {earned ? (
          <Text fontSize="$caption" color="$colorBrandPrimary">
            Earned
          </Text>
        ) : (
          <View width="100%">
            <LockedStatus row={row} />
          </View>
        )}
      </View>
    </View>
  )
}

export function AchievementsMode() {
  const data = useAchievements()
  const preset = useActivePreset()
  // Default layout follows the active preset (game → trophy wall); the switcher override wins once set (S1 idiom).
  const [override, setOverride] = useState<ViewLayout | null>(null)
  const layout: ViewLayout = override ?? (preset === 'game' ? 'gallery' : 'list')

  const renderView = (l: ViewLayout, state: ViewState) =>
    l === 'gallery' ? (
      <GalleryView<AchievementRow>
        items={data.rows}
        renderItem={(row) => <AchievementTile row={row} />}
        getKey={(row) => row.achievement.id}
        state={state}
        minTileWidth={160}
        aria-label="Achievements"
      />
    ) : (
      <ListView<AchievementRow>
        sections={data.groups.map((g) => ({ id: g.category, title: g.label, items: g.rows }))}
        renderItem={(row) => <AchievementListRow row={row} />}
        getKey={(row) => row.achievement.id}
        state={state}
        aria-label="Achievements"
      />
    )

  return (
    <CollectionView
      title="Achievements"
      count={data.total}
      layout={layout}
      layouts={LAYOUTS}
      onLayoutChange={setOverride}
      state={collapseToTerminal(data.state)}
      renderView={renderView}
      aria-label="Achievements"
    />
  )
}

export default AchievementsMode
