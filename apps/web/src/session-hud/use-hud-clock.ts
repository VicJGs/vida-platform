// ============================================================================
// useHudClock — the drift-free HUD clock (fe-session-hud #16, S1).
//
// Pure core (`deriveHudClock`/`formatHudTime`) + a thin ticking wrapper. Every tick
// RE-DERIVES from timestamps (never decrements state) — the V5 pomodoro endAtRef
// discipline: a missed/late tick self-corrects, and the interval is armed once per
// `timing` change, never per countdown value (BR-HUD-S1-5).
//
// Semantics (all doc-fixed — seam-contract §D):
// - paused (countdown.pausedAt set): the clock does not tick forward — shown remaining
//   is the constant endAt − pausedAt; the ring holds (PD-5).
// - zero-cross: HOLDS 00:00 + complete=true, ring full — the V5 hold-complete precedent
//   (EC-3c). Interval-boundary behaviour is PD-7 preference-owned and engine-driven;
//   the HUD owns no advance intent and never invents overtime.
// - elapsed: honest count-up, progress 0 (S2 renders ring-as-glyph, no arc).
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import type { HudTiming } from './types'

export interface HudClock {
  /** `m:ss` under an hour, `h:mm:ss` at/over — tabular-rendered by S2. */
  display: string
  /** 0..1 ring progress (countdown only; elapsed ⇒ 0; complete ⇒ 1). */
  progress: number
  /** Zero-crossed countdown — held at 00:00 awaiting the engine/user advance (EC-3c). */
  complete: boolean
  /** Paused countdown — display and progress are constant (PD-5). */
  frozen: boolean
}

/** Duration → display. Durations only, TZ-neutral by construction; negatives clamp to 0:00. */
export function formatHudTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad2 = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`
}

let warnedZeroDuration = false

/** The pure projection of (timing, now) — HudClock holds no state of its own (BR-HUD-S1-9). */
export function deriveHudClock(timing: HudTiming, now: number): HudClock {
  if (timing.kind === 'elapsed') {
    return { display: formatHudTime(Math.max(0, now - timing.startedAt)), progress: 0, complete: false, frozen: false }
  }
  const { endAt, durationSeconds, pausedAt } = timing
  if (durationSeconds <= 0 && process.env.NODE_ENV !== 'production' && !warnedZeroDuration) {
    warnedZeroDuration = true // once per load — derive runs every tick (g2 nit c)
    console.warn(`[session-hud] countdown with durationSeconds=${durationSeconds} — progress disabled`)
  }
  const frozen = pausedAt != null
  const effectiveNow = frozen ? pausedAt : now
  const remainingMs = Math.max(0, endAt - effectiveNow)
  const complete = !frozen && endAt - effectiveNow <= 0
  const durationMs = durationSeconds * 1000
  const rawProgress = durationMs > 0 ? (durationMs - remainingMs) / durationMs : 0
  const progress = complete ? 1 : Math.min(1, Math.max(0, rawProgress))
  return { display: formatHudTime(remainingMs), progress, complete, frozen }
}

const clockEqual = (a: HudClock, b: HudClock) =>
  a.display === b.display && a.progress === b.progress && a.complete === b.complete && a.frozen === b.frozen

/** Value key — the effect must re-arm on timing VALUES, never object identity (a consumer may rebuild an
 *  equal timing per render; an identity dep would re-arm the interval on every tick-driven re-render). */
const timingKey = (t: HudTiming): string =>
  t.kind === 'countdown' ? `c:${t.phase}:${t.endAt}:${t.durationSeconds}:${t.pausedAt ?? ''}` : `e:${t.startedAt}`

/**
 * The ticking wrapper. Arms ONE ~1s interval per timing VALUE (re-derive on change is immediate);
 * each tick re-derives from the ref'd timing + Date.now() and bails state-equal results (a frozen or
 * complete clock does not re-render per tick).
 */
export function useHudClock(timing: HudTiming): HudClock {
  const [clock, setClock] = useState<HudClock>(() => deriveHudClock(timing, Date.now()))
  const timingRef = useRef(timing)
  timingRef.current = timing
  const key = timingKey(timing)

  useEffect(() => {
    setClock((prev) => {
      const next = deriveHudClock(timingRef.current, Date.now())
      return clockEqual(prev, next) ? prev : next
    })
    const id = setInterval(() => {
      setClock((prev) => {
        const next = deriveHudClock(timingRef.current, Date.now())
        return clockEqual(prev, next) ? prev : next
      })
    }, 1000)
    return () => clearInterval(id)
    // Value-keyed by design (BR-HUD-S1-5): `key` IS `timing` serialized — depending on the object
    // identity would re-arm the interval on every tick-driven re-render.
  }, [key])

  return clock
}
