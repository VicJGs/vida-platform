// ============================================================================
// XpHero — the level + XP-to-next hero (fe-gamification ② · S1 · EC-4).
//
// XP is an honest BAR (the shipped `HonestProgress`) under every preset. The game-preset RING branch is retired
// with the `game` theme family (LIF-679: `game` is a module, not a theme). The UI does NO level math — it renders
// the LevelProgress the seam supplies (IR-G3).
// ============================================================================
import { Text, View } from '@tamagui/core'
import { HonestProgress } from '@vida/ui'
import type { LevelProgress } from './use-gamification'

const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const

/** The honest XP-to-next caption. */
function toNextLabel(level: LevelProgress): string {
  if (level.nextLevelAt === null) return 'Max level reached'
  const toNext = Math.max(0, level.nextLevelAt - level.total)
  return `${toNext.toLocaleString()} XP to level ${level.info.level + 1}`
}

export function XpHero({ level }: { level: LevelProgress }) {
  const caption = toNextLabel(level)

  return (
    <View gap="$16" paddingVertical="$8">
      <View flexDirection="row" alignItems="baseline" gap="$12">
        <Text fontSize="$display" fontFamily="$display" color="$colorTextPrimary" style={TABULAR}>
          Level {level.info.level}
        </Text>
        <Text fontSize="$small" color="$colorTextMuted">
          {level.info.title}
        </Text>
      </View>
      <HonestProgress label={caption} value={level.fraction} />
    </View>
  )
}
