// ============================================================================
// THROWAWAY — Envision Gate greybox for fe-session-hud #16 (deleted after the gate).
// Greybox fidelity: layout / affordance / state, composed from real tokens + @vida/ui
// primitives. NOT the implementation.
//
// Lead proposal — "the OS's pulse", hard-right in the reserved top strip (hudSlot):
//   idle     →  hollow ring + (≥tablet) a quiet "Begin a session" invitation
//   running  →  living progress ring + tabular time + (≥tablet) stage eyebrow · title
//               + inline pause — the whole pill deep-links to /sessions/$id
//   paused   →  ring+time fall to muted ink, eyebrow says PAUSED, affordance = resume
//   ≤375     →  ring + time only (the strip co-fit rule the toggles/Bar-1 already obey)
// ============================================================================
import { Text, View, useMedia } from '@tamagui/core'
import { Button } from '@vida/ui'
import { Pause, Play } from 'lucide-react'

export type HudState = 'idle' | 'running' | 'paused'

/** Mirrors app-shell's private useActiveBreakpoint (mobile-first, largest match wins). */
function useCompact(): boolean {
  const media = useMedia()
  return !media.tablet && !media.desktop && !media.wide
}

function Ring({ state, progress }: { state: HudState; progress: number }) {
  // 18px ring, hairline track + accent arc — the pomodoro-ring language, SVG stroke via CSS var
  // (the pomodoro SVG stroke="var()" precedent; resolves per active preset/mode).
  const r = 7
  const c = 2 * Math.PI * r
  const arc = state === 'idle' ? 0 : Math.max(0.02, Math.min(progress, 1)) * c
  const arcColor = state === 'running' ? 'var(--colorBrandPrimary)' : 'var(--colorTextMuted)'
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx={9} cy={9} r={r} fill="none" stroke="var(--colorBorderDefault)" strokeWidth={2} />
      {arc > 0 ? (
        <circle
          cx={9}
          cy={9}
          r={r}
          fill="none"
          stroke={arcColor}
          strokeWidth={2}
          strokeDasharray={`${arc} ${c - arc}`}
          strokeLinecap="round"
          transform="rotate(-90 9 9)"
        />
      ) : null}
    </svg>
  )
}

export interface SessionHudGreyboxProps {
  state: HudState
  /** fake data */
  kind?: string
  title?: string
  remaining?: string
  progress?: number
  onTogglePause?: () => void
}

export function SessionHudGreybox({
  state,
  kind = 'Focus',
  title = 'Deep work — Vida platform',
  remaining = '17:42',
  progress = 0.42,
  onTogglePause,
}: SessionHudGreyboxProps) {
  const compact = useCompact()

  if (state === 'idle') {
    return (
      <View
        role="link"
        tabIndex={0}
        aria-label="No active session — begin one"
        flexDirection="row"
        alignItems="center"
        gap="$8"
        paddingHorizontal="$8"
        paddingVertical="$4"
        borderRadius="$4"
        cursor="pointer"
        hoverStyle={{ backgroundColor: '$colorSurfaceSecondary' }}
        focusVisibleStyle={{ outlineWidth: 2, outlineStyle: 'solid', outlineColor: '$colorFocusRing', outlineOffset: 2 }}
      >
        <Ring state="idle" progress={0} />
        {compact ? null : (
          <Text fontSize={13} color="$colorTextMuted">
            Begin a session
          </Text>
        )}
      </View>
    )
  }

  const paused = state === 'paused'
  return (
    <View flexDirection="row" alignItems="center" gap="$4">
      <View
        role="link"
        tabIndex={0}
        aria-label={`${paused ? 'Paused' : 'Active'} session: ${kind} — ${title}, ${remaining} remaining. Open session.`}
        flexDirection="row"
        alignItems="center"
        gap="$8"
        paddingHorizontal="$8"
        paddingVertical="$4"
        borderRadius="$4"
        cursor="pointer"
        hoverStyle={{ backgroundColor: '$colorSurfaceSecondary' }}
        focusVisibleStyle={{ outlineWidth: 2, outlineStyle: 'solid', outlineColor: '$colorFocusRing', outlineOffset: 2 }}
      >
        <Ring state={state} progress={progress} />
        <Text
          fontSize={14}
          color={paused ? '$colorTextMuted' : '$colorTextPrimary'}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {remaining}
        </Text>
        {compact ? null : (
          <View flexDirection="row" alignItems="center" gap="$8" maxWidth={260} overflow="hidden">
            <Text fontSize={11} letterSpacing={1} textTransform="uppercase" color="$colorTextMuted" flexShrink={0}>
              {paused ? 'Paused' : kind}
            </Text>
            <Text
              fontSize={13}
              color="$colorTextMuted"
              numberOfLines={1}
              style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}
            >
              {title}
            </Text>
          </View>
        )}
      </View>
      {compact ? null : (
        <Button
          intent="ghost"
          size="sm"
          aria-label={paused ? 'Resume session' : 'Pause session'}
          leading={paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
          onPress={onTogglePause}
        />
      )}
    </View>
  )
}
