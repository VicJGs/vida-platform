// ============================================================================
// SessionHud — the strip pill (fe-session-hud #16, S2). Renders a HudRead.
//
// Forms (PLAN-s2 BR-HUD-S2-*): hidden → null · idle → presentational invitation
// (M1: NOT interactive — a begin-affordance with no start flow would be a dead
// control; the live begin-link ships with #34) · active → ring + tabular time
// (+ ≥tablet: phase eyebrow, truncated title, pause/resume sibling control).
//
// The pill body is ONE real SPA link → /sessions/$id (the nav-link createLink
// idiom; plain-string `to`, never href). The pause/resume Button is a DOM SIBLING
// of the anchor (axe: no nested-interactive). Ticking digits are NOT aria-live;
// one visually-hidden polite status announces state TRANSITIONS only (empty on
// mount — the V5 "empty until the crossing" mechanism).
// ============================================================================
import { useRef } from 'react'
import { styled, Text, View, useMedia } from '@tamagui/core'
import { createLink } from '@tanstack/react-router'
import { Button } from '@vida/ui'
import { Pause, Play } from 'lucide-react'
import type { HudPhase, HudRead, HudSessionsPort, HudSource } from './types'
import { deriveHudClock, useHudClock, type HudClock } from './use-hud-clock'

export interface SessionHudProps {
  read: HudRead
  port: HudSessionsPort
  /** Test/story-only width override (the app-shell `__bp` convention) — bypasses useMedia for jsdom. */
  __compact?: boolean
}

/** Mobile-first: compact below the tablet breakpoint (the strip co-fit rule, EC-6). */
function useCompact(override?: boolean): boolean {
  const media = useMedia()
  if (override !== undefined) return override
  return !(media.tablet || media.desktop || media.wide)
}

const phaseLabel = (phase: HudPhase): string => (phase === 'focus' ? 'Focus' : 'Break')

/** The eyebrow line (BR-HUD-S2-3): frozen → Paused · complete → <Phase> · Done · countdown → phase · elapsed → kind. */
export function eyebrowFor(source: HudSource, clock: HudClock): string {
  if (source.timing.kind === 'countdown') {
    const label = phaseLabel(source.timing.phase)
    if (clock.frozen) return 'Paused'
    if (clock.complete) return `${label} · Done`
    return label
  }
  return source.kindLabel
}

/** 18px ring — track hairline + state-toned arc via CSS vars (the pomodoro SVG stroke="var()" precedent). */
function HudRing({ clock, hollow }: { clock: HudClock | null; hollow?: boolean }) {
  const r = 7
  const c = 2 * Math.PI * r
  const progress = hollow || !clock ? 0 : clock.progress
  const arc = Math.max(0, Math.min(progress, 1)) * c
  const arcColor = clock?.frozen ? 'var(--colorTextMuted)' : 'var(--colorBrandPrimary)'
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

// The pill anchor — DS tokens only (the nav-link NavAnchor pattern, pill-scaled: the strip row is 52/56
// tall, so the pill is a compact inset, not a 44px standalone target — it sits inside the reserved strip).
const PillAnchor = styled(View, {
  render: 'a',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$8',
  paddingHorizontal: '$8',
  paddingVertical: '$4',
  borderRadius: '$md',
  cursor: 'pointer',
  focusVisibleStyle: { outlineColor: '$colorFocusRing', outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 },
  hoverStyle: { backgroundColor: '$colorSurfaceSecondary' },
})

const PillLink = createLink(PillAnchor)

/** Visually-hidden (the standard clip pattern) — the one polite announcer (BR-HUD-S2-8). */
const srOnly = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const

/** The idle invitation — presentational in M1 (BR-HUD-S2-2): hollow ring + muted invitation ≥tablet. */
function IdleHud({ compact }: { compact: boolean }) {
  return (
    <View flexDirection="row" alignItems="center" gap="$8" paddingHorizontal="$8" paddingVertical="$4">
      <HudRing clock={null} hollow />
      {compact ? null : (
        <Text fontSize={13} color="$colorTextMuted">
          Begin a session
        </Text>
      )}
    </View>
  )
}

function stateKey(source: HudSource, clock: HudClock): string {
  if (source.timing.kind === 'elapsed') return 'running'
  if (clock.frozen) return 'paused'
  if (clock.complete) return `${phaseLabel(source.timing.phase).toLowerCase()} complete`
  return 'running'
}

/** The active pill — hooks live here so SessionHud's early returns never change hook order. */
function ActiveHud({ source, port, compact }: { source: HudSource; port: HudSessionsPort; compact: boolean }) {
  const clock = useHudClock(source.timing)

  // Transition announcer: empty on mount, fills only when the observed state CHANGES (g1 fold / V5 mechanism).
  const prevState = useRef<string | null>(null)
  const announceRef = useRef('')
  const key = stateKey(source, clock)
  if (prevState.current !== null && prevState.current !== key) {
    announceRef.current = key === 'running' ? 'Session running' : `Session ${key}`
  }
  prevState.current = key

  // In ?sample mode the deep-link PRESERVES the sample param so /sessions/$id lands on the sampled
  // runtime page (seam §D, g1-B5). Live mode carries nothing.
  const sample =
    process.env.NODE_ENV !== 'production' && typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('sample')
      : null
  const to = `/sessions/${source.sessionId}${sample ? `?sample=${sample}` : ''}`

  const eyebrow = eyebrowFor(source, clock)
  const stateWord = clock.frozen ? 'Paused' : clock.complete ? 'Completed' : 'Active'
  const ariaLabel = `${stateWord} session: ${eyebrow} — ${source.title}, ${clock.display}${
    source.timing.kind === 'countdown' && !clock.complete ? ' remaining' : ''
  }. Open session.`

  const showPause = !compact && source.canPause && !clock.complete

  return (
    <View flexDirection="row" alignItems="center" gap="$4">
      {/* UA :any-link paints `color: blue` + an anchor-level underline that DRAWS ACROSS in-flow descendants —
          a child's textDecorationLine:'none' cannot cancel an ancestor decoration (measured: anchor computed
          underline/blue while every child span was token-correct+deco-none). Reset at the anchor itself via the
          DOM style (textDecoration isn't a Tamagui View prop). */}
      <PillLink to={to} aria-label={ariaLabel} style={{ textDecoration: 'none', color: 'inherit' }}>
        <HudRing clock={clock} />
        <Text
          fontSize={14}
          color={clock.frozen ? '$colorTextMuted' : '$colorTextPrimary'}
          textDecorationLine="none"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {clock.display}
        </Text>
        {compact ? null : (
          <View flexDirection="row" alignItems="center" gap="$8" maxWidth={260} overflow="hidden">
            <Text
              fontSize={11}
              letterSpacing={1}
              textTransform="uppercase"
              color="$colorTextMuted"
              textDecorationLine="none"
              flexShrink={0}
            >
              {eyebrow}
            </Text>
            <Text
              fontSize={13}
              color="$colorTextMuted"
              textDecorationLine="none"
              style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}
            >
              {source.title}
            </Text>
          </View>
        )}
      </PillLink>
      {showPause ? (
        <Button
          intent="ghost"
          size="sm"
          aria-label={clock.frozen ? 'Resume session' : 'Pause session'}
          leading={clock.frozen ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
          onPress={() => {
            void (clock.frozen ? port.resumeFocus(source.sessionId) : port.pauseFocus(source.sessionId))
          }}
        />
      ) : null}
      <span role="status" aria-live="polite" style={srOnly}>
        {announceRef.current}
      </span>
    </View>
  )
}

/** The Session HUD — renders a HudRead (hidden → null; idle → invitation; active → the pill). */
export function SessionHud({ read, port, __compact }: SessionHudProps) {
  const compact = useCompact(__compact)
  if (read.kind === 'hidden') return null
  if (read.kind === 'idle') return <IdleHud compact={compact} />
  return <ActiveHud source={read.source} port={port} compact={compact} />
}

// Re-export for the S2 gate harness (derive a static clock without mounting the ticking hook).
export { deriveHudClock }
