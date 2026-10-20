// ============================================================================
// Session HUD seam types (fe-session-hud #16, S1) — seam-contract §A/§B.
//
// Mirror-by-value: NO `@vida/core` import (the flow-adapter discipline). The live
// binding derives these from the sessions service + the shared focus-runtime
// client store (seam-contract §A — the ticking clock is client-ephemeral BY
// DESIGN; the persisted model never promised a reconstructable mid-interval clock).
// ============================================================================

/** Mirror-by-value of `@vida/ui` PomodoroPhase — a break interval is a first-class countdown (PD-4, EC-3d). */
export type HudPhase = 'focus' | 'short-break' | 'long-break'

export type HudTiming =
  | {
      /** A timed focus-runtime interval (focus OR break). */
      kind: 'countdown'
      phase: HudPhase
      /** Epoch ms — the CURRENT interval's end. */
      endAt: number
      /** The interval's planned length — the ring-progress denominator. */
      durationSeconds: number
      /**
       * Epoch ms — set while the focus runtime is paused. Frozen remaining = endAt − pausedAt
       * (endAt is stale during a pause by construction: total_pause_seconds folds in only on resume).
       */
      pausedAt?: number
    }
  /** Any un-timed in_progress session — honest count-up, no invented remaining-time (EC-3b). */
  | { kind: 'elapsed'; startedAt: number }

export interface HudSource {
  /** Deep-link target `/sessions/$id` (EC-3). */
  sessionId: string
  /** The eyebrow — a plain sub_type/purpose label, e.g. "Focus", "Work". */
  kindLabel: string
  /** The session title (the pill truncates). */
  title: string
  timing: HudTiming
  // No `paused` boolean — paused is DERIVED (`timing.kind === 'countdown' && timing.pausedAt != null`)
  // so it can never desync from the clock. Generic sessions can never be paused (SESSION_STATUS has no
  // 'paused'; pause exists only in the focus runtime).
  /** True iff a focus runtime row backs this session — gates the in-strip pause/resume control (EC-5). */
  canPause: boolean
}

/**
 * Tri-state read (g1-B4): idle-VISIBLE is representable without a signature change.
 * M1 stub → 'hidden'; DEV `?sample=idle` → 'idle'; live → 'hidden' | active (then 'idle'
 * once a start-capable flow ships, fe-sessions #34).
 */
export type HudRead =
  | { kind: 'hidden' } // M1 prod — the HUD renders nothing (Envision answer 1)
  | { kind: 'idle' } // the designed invitation (DEV ?sample in M1; live post-#34)
  | { kind: 'active'; source: HudSource }

export type ActiveSessionRead = () => Promise<HudRead>

/** The HUD's write port — the HUD never writes; intents bind to the sessions service at the live swap (§B). */
export interface HudSessionsPort {
  pauseFocus(id: string): Promise<void>
  resumeFocus(id: string): Promise<void>
}
