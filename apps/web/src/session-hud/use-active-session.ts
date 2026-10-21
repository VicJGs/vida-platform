// ============================================================================
// useActiveSession — the Session HUD's data seam (fe-session-hud #16, S1).
//
// Same stub discipline as useFlowSession/useNoteEntity: M1 has no apps/web `@vida/core`
// composition root and the worker-RPC Drizzle `values` seam throws — the data leg is
// DEFERRED. M1 DEFAULT = {kind:'hidden'} (the HUD renders NOTHING in prod — Envision
// answer 1: no dead "Begin" affordance). DEV `?sample=<form>` seeds each designed form.
// Resolution and failure BOTH render as hidden (+ dev-warn on failure) — a strip
// indicator never shows loading/error chrome (BR-HUD-S1-6b), which keeps the live async
// swap zero-signature.
//
// Live swap (the seam-contract §A two-source model — the UI signature is stable):
//   1. ① read (F-HUD-1): `findActiveSession()` on the sessions service — which session,
//      spine started_at (⇒ honest `elapsed`), focus row when present. Does NOT exist yet
//      (SessionsService has getSession(id) only).
//   2. ② shared focus-runtime client store (ships with the first live timer DRIVER):
//      the ticking interval truth (endAt/phase/pausedAt) — client-ephemeral BY DESIGN
//      (V5 owns the ephemeral countdown; PD-11 derived-on-read). Cold boot/reload
//      mid-interval ⇒ no client clock ⇒ serve `elapsed` and withhold countdown.
//   const { data, isError } = useQuery({ queryKey: ['active-session'], queryFn: findActiveSession })
//   const read = isError || !data ? HIDDEN : toHudRead(data, focusRuntimeStore.current)
//   const port = { pauseFocus: sessions.pauseFocus, resumeFocus: sessions.resumeFocus }
// ============================================================================
import type { HudRead, HudSessionsPort, HudSource, HudTiming } from './types'

export interface UseActiveSession {
  /** The resolved read — `hidden` in M1 prod (and during/instead of a failed live resolve). */
  read: HudRead
  /** The HUD's write port (no-op-safe in M1; the real service binds at the live swap — EC-5). */
  port: HudSessionsPort
}

/** M1 no-op-safe port — logged in DEV; mutates nothing until the live swap (the HUD never writes). */
const noopPort: HudSessionsPort = {
  pauseFocus: async (id) => {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[session-hud] no-op pauseFocus(${id}) — live swap pending`)
    }
  },
  resumeFocus: async (id) => {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[session-hud] no-op resumeFocus(${id}) — live swap pending`)
    }
  },
}

const HIDDEN: HudRead = { kind: 'hidden' }

export type HudSampleForm = 'idle' | 'focus' | 'break' | 'elapsed' | 'paused' | 'complete'

/** DEV/gate sample gate (NOT live data) — the use-flow-session idiom, value-carrying. */
function devSampleForm(search?: string): HudSampleForm | null {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return null
  const value = new URLSearchParams(search ?? window.location.search).get('sample')
  switch (value) {
    case 'idle':
    case 'focus':
    case 'break':
    case 'elapsed':
    case 'paused':
    case 'complete':
      return value
    default:
      return null
  }
}

function sampleSource(kindLabel: string, title: string, timing: HudTiming, canPause: boolean): HudSource {
  return { sessionId: 'sample-session', kindLabel, title, timing, canPause }
}

/** The 6 designed demo reads (idle + the 5 active forms), timestamped off `now` so each renders mid-state. */
export function sampleHudRead(form: HudSampleForm, now: number): HudRead {
  switch (form) {
    case 'idle':
      return { kind: 'idle' }
    case 'focus':
      return {
        kind: 'active',
        source: sampleSource(
          'Focus',
          'Deep work — Vida platform',
          { kind: 'countdown', phase: 'focus', endAt: now + 1_062_000, durationSeconds: 1500 },
          true,
        ),
      }
    case 'break':
      return {
        kind: 'active',
        source: sampleSource(
          'Break',
          'Deep work — Vida platform',
          { kind: 'countdown', phase: 'short-break', endAt: now + 180_000, durationSeconds: 300 },
          true,
        ),
      }
    case 'elapsed':
      return {
        kind: 'active',
        source: sampleSource(
          'Work',
          'Reconcile the ledger',
          { kind: 'elapsed', startedAt: now - 4_032_000 }, // 1:07:12 in
          false, // generic in_progress — SESSION_STATUS has no 'paused'
        ),
      }
    case 'paused':
      return {
        kind: 'active',
        source: sampleSource(
          'Focus',
          'Deep work — Vida platform',
          { kind: 'countdown', phase: 'focus', endAt: now + 630_000, durationSeconds: 1500, pausedAt: now },
          true,
        ),
      }
    case 'complete':
      return {
        kind: 'active',
        source: sampleSource(
          'Focus',
          'Deep work — Vida platform',
          { kind: 'countdown', phase: 'focus', endAt: now - 5_000, durationSeconds: 1500 },
          true,
        ),
      }
  }
}

// Per-form capture (g2 F1): a sample read is built ONCE per page load and reused across renders — a fresh
// `Date.now()` per render would slide `endAt`/`startedAt` every render, value-change the timing key, re-arm
// the clock, and pin the demo countdown forever. Captured once, the demo genuinely ticks (and the focus
// sample eventually crosses into the held complete form — an honest live walk of EC-3c). Module-level (not
// useMemo) so the hook stays a plain function, the use-flow-session precedent.
const sampleCache = new Map<HudSampleForm, HudRead>()
function cachedSampleRead(form: HudSampleForm): HudRead {
  let read = sampleCache.get(form)
  if (!read) {
    read = sampleHudRead(form, Date.now())
    sampleCache.set(form, read)
  }
  return read
}

/**
 * The HUD's data hook. M1: `hidden` by default; DEV `?sample=<form>` seeds the designed forms.
 * The live swap keeps this exact signature (see the header).
 *
 * `search` (optional): the CURRENT search string from a REACTIVE source (the surface passes the router's
 * subscribed `location.searchStr`). A bare `window.location.search` read is render-time-only — a client-side
 * pushState re-renders NOTHING, so the live-shell sample walk never mounted (S3 gate catch); jsdom tests
 * missed it because every mount started with the URL pre-set.
 */
export function useActiveSession(search?: string): UseActiveSession {
  const form = devSampleForm(search)
  if (form) {
    return { read: cachedSampleRead(form), port: noopPort }
  }
  return { read: HIDDEN, port: noopPort }
}
