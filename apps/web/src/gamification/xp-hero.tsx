// ============================================================================
// XpHero — the level + XP-to-next hero (fe-gamification ② · S1 · EC-4).
//
// The register expression of progress (interpretation §7): the global `game` preset shows XP as a RING; the
// calm presets (reader/editorial/quietDesk) as an honest BAR. Keyed to the ACTIVE preset (useActivePreset —
// a read, not a theming decision; GM-16). The UI does NO level math — it renders the LevelProgress the seam
// supplies (IR-G3). Honest progress only: the bar is the shipped `HonestProgress`; the ring never fakes a
// fraction (it draws exactly `level.fraction`).
//
// Ring colors via useVidaTheme().get('web') — the Tamagui-documented SVG call (the pomodoro-ring precedent;
// a $token SVG attr renders colorless). The ring is aria-hidden; the visible caption carries the meaning for
// SR (the pomodoro role=timer + mm:ss precedent). No animation (a static arc set once — no motion concern).
// ============================================================================
import type { ReactNode } from 'react'
import { Text, View } from '@tamagui/core'
import { HonestProgress, useVidaTheme } from '@vida/ui'
import { useActivePreset } from './use-active-preset'
import type { LevelProgress } from './use-gamification'

const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const

const RING_SIZE = 132
const RING_STROKE = 9

/** The game-preset ring: two SVG circles (track + accent arc), colors resolved for SVG via get('web'). */
function XpRing({ fraction, children }: { fraction: number; children: ReactNode }) {
  const theme = useVidaTheme()
  const r = (RING_SIZE - RING_STROKE) / 2
  const circumference = 2 * Math.PI * r
  const center = RING_SIZE / 2
  const track = theme.colorSurfaceSecondary?.get('web')
  const accent = theme.colorBrandPrimary?.get('web')
  const clamped = Math.min(1, Math.max(0, fraction))
  return (
    <View width={RING_SIZE} height={RING_SIZE} alignItems="center" justifyContent="center">
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        aria-hidden
        style={{ position: 'absolute', transform: 'rotate(-90deg)' }}
      >
        <circle cx={center} cy={center} r={r} fill="none" stroke={track} strokeWidth={RING_STROKE} />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
        />
      </svg>
      {children}
    </View>
  )
}

function LevelGlyph({ level, title }: { level: number; title: string }) {
  return (
    <View alignItems="center" gap="$4">
      <Text fontSize="$display" fontFamily="$display" color="$colorTextPrimary" style={TABULAR}>
        {level}
      </Text>
      <Text fontSize="$small" color="$colorTextMuted">
        {title}
      </Text>
    </View>
  )
}

/** The honest XP-to-next caption (also the ring's SR equivalent). */
function toNextLabel(level: LevelProgress): string {
  if (level.nextLevelAt === null) return 'Max level reached'
  const toNext = Math.max(0, level.nextLevelAt - level.total)
  return `${toNext.toLocaleString()} XP to level ${level.info.level + 1}`
}

export function XpHero({ level }: { level: LevelProgress }) {
  const preset = useActivePreset()
  const caption = toNextLabel(level)

  if (preset === 'game') {
    return (
      <View alignItems="center" gap="$12" paddingVertical="$8">
        <XpRing fraction={level.fraction}>
          <LevelGlyph level={level.info.level} title={level.info.title} />
        </XpRing>
        {/* the ring is decorative (aria-hidden); this plain line is its SR-readable equivalent — NOT a live
            region (nothing announces on change here; it's read in reading order, the level glyph above it) */}
        <Text fontSize="$small" color="$colorTextMuted" style={TABULAR}>
          {caption}
        </Text>
      </View>
    )
  }

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
