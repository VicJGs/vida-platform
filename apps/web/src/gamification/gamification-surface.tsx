// ============================================================================
// GamificationSurface — the `/gamification` route (fe-gamification ② · S1). "The System": a MULTI-MODE
// TOP VIEW (IA §4; hasMultiModeTopView, no routed detail pages — content lives in the modes). S1 ships the
// shared chrome + the 5-mode switcher (EC-3) + the Overview mode (EC-4) + the deny-safe persona→reward-copy
// framing (EC-10). S2–S5 fill Currencies · Achievements · Rules(+Flow) · Activity.
//
// Modes are governed by the per-module VIEWS review (ADR-007 §3.6 / IA §4); an unpopulated mode renders the
// 8-state canon via the shipped `EmptyState` (fe-codec-patterns) — a teaching line describing what the mode
// will hold, with NO action buttons (each mode's working entry points arrive with its own slice). The
// switcher is ui-1 `Tabs` (role=tablist): modes are DIFFERENT content (the entity-view precedent — the
// inverse of the collection-view toolbar, which swaps layouts of the SAME data). Only the active panel mounts.
//
// Data is type-correct against the ① seam, STUBBED at M1 (IR-G1); `?sample`/`?force` DEV gate hooks only.
// ============================================================================
import type { ReactNode } from 'react'
import { Text, View } from '@tamagui/core'
import { Button, EmptyState, Tabs } from '@vida/ui'
import { AchievementsMode } from './achievements-mode'
import { CurrenciesMode } from './currencies-mode'
import { GamificationOverviewPanel } from './gamification-overview'
import { RulesMode } from './rules-mode'
import { rewardCopy } from './reward-copy'
import { useGamification } from './use-gamification'
import { usePersona } from './use-persona'

const MODES = ['overview', 'currencies', 'achievements', 'rules', 'activity'] as const
type Mode = (typeof MODES)[number]

function OverviewSkeleton() {
  return (
    <View gap="$16" paddingTop="$12" aria-busy="true" aria-label="Loading your System">
      <View height={132} width={132} borderRadius={99} backgroundColor="$colorSurfaceSecondary" alignSelf="center" />
      <View flexDirection="row" gap="$16" flexWrap="wrap">
        {[0, 1].map((i) => (
          <View key={i} flex={1} minWidth={220} height={120} borderRadius="$lg" backgroundColor="$colorSurfaceSecondary" />
        ))}
      </View>
    </View>
  )
}

function OverviewError() {
  return (
    <View gap="$12" paddingVertical="$24" role="status">
      <Text fontSize="$body" fontFamily="$display" color="$colorTextPrimary">
        We couldn't load your System
      </Text>
      <Text fontSize="$small" color="$colorTextMuted">
        Your data is safe on this device — this is only the dashboard view.
      </Text>
      <View flexDirection="row">
        <Button intent="secondary" size="small">
          Retry
        </Button>
      </View>
    </View>
  )
}

/** An honest not-yet-built mode: the governed 8-state `EmptyState` describing what the mode holds (no action). */
function ModeEmpty({ title, body }: { title: string; body: string }) {
  return (
    <EmptyState title={title} titleLevel={3}>
      <Text fontSize="$small" color="$colorTextMuted">
        {body}
      </Text>
    </EmptyState>
  )
}

export function GamificationSurface() {
  const data = useGamification()
  const register = usePersona()
  const copy = rewardCopy(register)

  const label: Record<Mode, string> = {
    overview: 'Overview',
    currencies: 'Currencies',
    achievements: 'Achievements',
    rules: copy.rules, // EC-10: Rules ↔ Quests
    activity: 'Activity',
  }
  const items = MODES.map((m) => ({ value: m, label: label[m] }))

  let overviewBody: ReactNode
  if (data.state === 'loading') overviewBody = <OverviewSkeleton />
  else if (data.state === 'error') overviewBody = <OverviewError />
  else overviewBody = <GamificationOverviewPanel overview={data.overview} copy={copy} now={data.now} />

  return (
    <View maxWidth={880} width="100%" marginHorizontal="auto" padding="$24" gap="$24">
      {/* title-hero header (the fix-entity-view-header canonical: serif title alone + one quiet line, $16 rhythm) */}
      <View gap="$16">
        <Text fontSize="$display" fontFamily="$display" color="$colorTextPrimary">
          The System
        </Text>
        <Text fontSize="$small" color="$colorTextMuted">
          Your levels, currencies, and achievements — the shape of your momentum.
        </Text>
      </View>

      <Tabs items={items} defaultValue="overview" aria-label="System views">
        <Tabs.Panel value="overview">{overviewBody}</Tabs.Panel>
        <Tabs.Panel value="currencies">
          <CurrenciesMode />
        </Tabs.Panel>
        <Tabs.Panel value="achievements">
          <AchievementsMode />
        </Tabs.Panel>
        <Tabs.Panel value="rules">
          <RulesMode />
        </Tabs.Panel>
        <Tabs.Panel value="activity">
          <ModeEmpty title="Activity" body="A running history of everything your System has earned, locked, spent, and shared." />
        </Tabs.Panel>
      </Tabs>
    </View>
  )
}

export default GamificationSurface
