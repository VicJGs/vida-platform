import { useEffect, useRef, useState, type ReactElement, type ReactNode, type Ref } from 'react'
import { styled, Text, useTheme, View } from '@tamagui/core'
import { Button } from './button'
import { shadow } from '../themes/shadow'

// UI-2 · V5 · pomodoro-widget — the interactive timer widget @vida/ui ships (ADR-008:35). A single-interval,
// self-timing countdown with a DEFERRED session-engine seam. Implements
// docs/specs/components/ui-2-platform-views/v5-pomodoro-widget.md. NOT a data-view.
// - Drift-free (PW-1): timing from an `endAtRef` timestamp; the interval is armed IMPERATIVELY in run() (the toast.tsx
//   arm() precedent) and the ~250ms tick reads endAtRef.current (never a stale closure) + the stable setRemainingMs —
//   NO useEffect deps on countdown state (that would re-arm every tick, the Toast bug).
// - status is held as BOTH state (renders controls) AND statusRef (read synchronously by the tick latch); the single
//   setStatus() helper writes BOTH so they never desync (PW-1b).
// - onComplete fires exactly once via a one-way latch; contractual order: setStatus(idle)→clear→setRemainingMs(0)→
//   set completion msg→onComplete() LAST.
// - The SESSION (lifecycle/persistence/effects/phase-sequencing) is MOD-sessions' (ADR-004) — this widget only emits
//   lifecycle intents via callbacks (PW-3) + owns the ephemeral countdown. It self-names (composed aria-label), so
//   warnMissingName is moot here.
// - fe-codec-controls-refinement P1 (LIF-231): aesthetic refinement + the v5-deferred (§6) progress RING.
//   L1 polish: tabular-figure countdown (v5 §4:144 spec'd-but-unbuilt), eyebrow phase label, 6px hairline track,
//   resting card elevation. L2: `progress?: 'bar' | 'ring'` (default 'bar', non-breaking). The ring colors resolve via
//   useTheme().get('web') — the Tamagui-documented call for SVG (a $token attr renders colorless; a hard-coded hex would
//   reintroduce the Neural-Graph conformance gap). Timer/latch/controls logic UNTOUCHED.

export type PomodoroPhase = 'focus' | 'short-break' | 'long-break'
type Status = 'idle' | 'running' | 'paused'
const DEFAULT_DURATION = 25 * 60 * 1000
const TICK = 250

export interface PomodoroWidgetProps {
  /** Interval length in ms (> 0). Default 25min. Changing it RESETS the timer (the phase-advance seam; a mid-run
   *  change dev-warns + discards the run). */
  durationMs?: number
  /** Display label for the current interval (the engine owns real phase semantics). Default 'focus'. */
  phase?: PomodoroPhase
  /** Optional context label (e.g. the linked task/class name). */
  label?: ReactNode
  /** Start counting on mount. Default false. */
  autoStart?: boolean
  onStart?: () => void
  onPause?: () => void
  onResume?: () => void
  onReset?: () => void
  onSkip?: () => void
  /** Fires once when remaining reaches 0 (the engine persists the completed session + effects + picks next phase). */
  onComplete?: () => void
  /** Progress indicator FORM (presentation only — same stepped update either way). 'bar' = the linear track (default,
   *  non-breaking); 'ring' = a circular progress ring around the time (the v5 §6 deferred visual). */
  progress?: 'bar' | 'ring'
  ref?: Ref<HTMLDivElement>
  'aria-label'?: string
}

const pad2 = (n: number) => String(n).padStart(2, '0')

// ── styled hosts (unnamed → base theme; no sub-theme) ───────────────────────────────────────────────────
const Root = styled(View, {
  flexDirection: 'column',
  alignItems: 'center',
  gap: '$12',
  padding: '$24',
  borderWidth: 1,
  borderColor: '$colorBorderDefault',
  borderRadius: '$lg',
  backgroundColor: '$colorSurfacePrimary',
})
// PhaseLabel = the editorial EYEBROW (caption · uppercase · wide tracking · muted) — the codec views-pass vocabulary.
const PhaseLabel = styled(Text, {
  fontFamily: '$body',
  fontSize: '$caption',
  letterSpacing: '$wide',
  color: '$colorTextMuted',
  textTransform: 'uppercase',
})
const ContextLabel = styled(Text, { fontFamily: '$body', fontSize: '$caption', color: '$colorTextMuted' })
const Time = styled(Text, {
  fontFamily: '$display',
  fontSize: '$display',
  fontWeight: '600',
  color: '$colorTextPrimary',
})
// 6px hairline track (L1c; was 8). Progress fill steps per tick (no CSS transition, PW-5/B12-safe).
const Track = styled(View, {
  width: '100%',
  height: 6,
  borderRadius: '$full',
  backgroundColor: '$colorSurfaceSecondary',
  overflow: 'hidden',
})
const Fill = styled(View, { height: '100%', borderRadius: '$full', backgroundColor: '$colorBrandPrimary' })
const Controls = styled(View, { flexDirection: 'row', gap: '$8' })
const Complete = styled(Text, {
  fontFamily: '$body',
  fontSize: '$small',
  fontWeight: '600',
  color: '$colorBrandPrimary',
})

// ── ProgressRing (L2) — a circular progress indicator around the time. aria-hidden (role="timer" + mm:ss announce
// progress). Colors via useTheme().get('web') — the Tamagui-documented SVG call [getThemeProxied.d.ts ThemeGettable.get];
// a $token SVG attr renders colorless, a hard-coded hex would reintroduce the Neural-Graph conformance gap. The arc
// steps per tick (React value update of strokeDashoffset — never a CSS transition, so no motion/reduced-motion concern).
const RING_SIZE = 120
const RING_STROKE = 8

function ProgressRing({ value, children }: { value: number; children: ReactNode }): ReactElement {
  const theme = useTheme()
  const r = (RING_SIZE - RING_STROKE) / 2
  const circumference = 2 * Math.PI * r
  const center = RING_SIZE / 2
  const track = theme.colorSurfaceSecondary?.get('web')
  const accent = theme.colorBrandPrimary?.get('web')
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
          strokeDashoffset={circumference * (1 - value)}
        />
      </svg>
      {children}
    </View>
  )
}

export function PomodoroWidget({
  durationMs = DEFAULT_DURATION,
  phase = 'focus',
  label,
  autoStart = false,
  onStart,
  onPause,
  onResume,
  onReset,
  onSkip,
  onComplete,
  progress = 'bar',
  ref,
  ...rest
}: PomodoroWidgetProps): ReactElement {
  const [remainingMs, setRemainingMs] = useState(durationMs)
  const [status, setStatusState] = useState<Status>('idle')
  const [completeMsg, setCompleteMsg] = useState('')

  const endAtRef = useRef<number | undefined>(undefined)
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const statusRef = useRef<Status>('idle')
  const prevDurationRef = useRef(durationMs)
  // Latest-ref for values the ARMED tick (a start-time closure) must read fresh without re-arming.
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  if (process.env.NODE_ENV !== 'production' && durationMs <= 0)
    // eslint-disable-next-line no-console
    console.warn('[vida/ui] PomodoroWidget: `durationMs` must be > 0.')

  // The ONLY way status changes — writes the ref (synchronous, for the tick latch) + the state (for controls) together.
  const setStatus = (next: Status) => {
    statusRef.current = next
    setStatusState(next)
  }
  const clear = () => {
    if (intervalRef.current !== undefined) {
      clearInterval(intervalRef.current)
      intervalRef.current = undefined
    }
  }
  const tick = () => {
    const remaining = Math.max(0, (endAtRef.current ?? 0) - Date.now())
    if (remaining > 0) {
      setRemainingMs(remaining)
      return
    }
    // 0-crossing — one-way latch (guard first; contractual order after)
    if (statusRef.current !== 'running') return
    setStatus('idle')
    clear()
    setRemainingMs(0)
    setCompleteMsg(`${phaseRef.current ?? 'focus'} complete`)
    onCompleteRef.current?.()
  }
  const arm = () => {
    clear()
    intervalRef.current = setInterval(tick, TICK)
  }
  // Start (from idle — after a completion remaining is 0, so restart a full interval) / Resume (paused, remaining>0).
  const run = () => {
    const ms = remainingMs > 0 ? remainingMs : durationMs
    endAtRef.current = Date.now() + ms
    setCompleteMsg('')
    setStatus('running')
    arm()
  }
  const start = () => {
    onStart?.()
    run()
  }
  const resume = () => {
    onResume?.()
    run()
  }
  const pause = () => {
    clear()
    setRemainingMs(Math.max(0, (endAtRef.current ?? Date.now()) - Date.now()))
    setStatus('paused')
    onPause?.()
  }
  const reset = () => {
    clear()
    endAtRef.current = undefined
    setRemainingMs(durationMs)
    setCompleteMsg('')
    setStatus('idle')
    onReset?.()
  }
  const skip = () => {
    clear()
    endAtRef.current = undefined
    setCompleteMsg('')
    setStatus('idle')
    onSkip?.()
  }

  // durationMs change = the phase-advance seam: ATOMIC reset, gated on an ACTUAL change (skips mount), dev-warn mid-run.
  useEffect(() => {
    if (prevDurationRef.current === durationMs) return
    prevDurationRef.current = durationMs
    if (process.env.NODE_ENV !== 'production' && statusRef.current !== 'idle')
      // eslint-disable-next-line no-console
      console.warn('[vida/ui] PomodoroWidget: `durationMs` changed mid-run — the current interval was discarded.')
    clear()
    endAtRef.current = undefined
    setRemainingMs(durationMs)
    setCompleteMsg('')
    setStatus('idle')
  }, [durationMs])

  // autoStart (mount only) + unmount cleanup.
  useEffect(() => {
    if (autoStart) start()
    return () => clear()
  }, [])

  const totalSec = Math.ceil(remainingMs / 1000)
  const display = `${pad2(Math.floor(totalSec / 60))}:${pad2(totalSec % 60)}`
  // fraction = the 0–1 elapsed ratio (renamed from `progress` to free that name for the indicator-form prop).
  const fraction = durationMs > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / durationMs)) : 0
  const ariaLabel = (rest as { 'aria-label'?: string })['aria-label'] ?? `${phase} timer — ${status}`

  // Tabular figures so the serif-display countdown holds a fixed digit advance (v5 §4:144; no horizontal jitter per tick).
  const time = <Time style={{ fontVariantNumeric: 'tabular-nums' }}>{display}</Time>

  return (
    <Root ref={ref} {...rest} role="timer" aria-label={ariaLabel} style={{ boxShadow: shadow.resting }}>
      <PhaseLabel>{phase.replace('-', ' ')}</PhaseLabel>
      {label != null && <ContextLabel>{label}</ContextLabel>}
      {progress === 'ring' ? (
        <ProgressRing value={fraction}>{time}</ProgressRing>
      ) : (
        <>
          {time}
          <Track>
            <Fill className="vida-pomo-fill" style={{ width: `${fraction * 100}%` }} />
          </Track>
        </>
      )}
      <Controls>
        {status === 'idle' && (
          <Button intent="primary" onPress={start}>
            Start
          </Button>
        )}
        {status === 'running' && (
          <>
            <Button intent="secondary" onPress={pause}>
              Pause
            </Button>
            <Button intent="ghost" onPress={skip}>
              Skip
            </Button>
          </>
        )}
        {status === 'paused' && (
          <>
            <Button intent="primary" onPress={resume}>
              Resume
            </Button>
            <Button intent="ghost" onPress={reset}>
              Reset
            </Button>
            <Button intent="ghost" onPress={skip}>
              Skip
            </Button>
          </>
        )}
      </Controls>
      {/* Polite completion one-shot (empty until the 0-crossing; cleared on any transition out — PW-6). */}
      <View role="status">{completeMsg ? <Complete>{completeMsg}</Complete> : null}</View>
    </Root>
  )
}
