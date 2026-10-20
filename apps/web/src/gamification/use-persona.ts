// ============================================================================
// usePersona — the deny-safe Preferences `persona` read → reward REGISTER (fe-gamification ② · S1 · EC-10).
//
// GM-16 / interpretation §7: `persona`/`motivation_style` are PREFERENCES-owned (single-writer, ADR-012 §3.10);
// the user-facing setter is `fe-settings` (LIF-193, Backlog). This surface only READS the key — deny-safe: the
// port is absent at M1, so it returns `null` ⇒ the NEUTRAL register (the calmer default). Never throws, never
// writes, never owns framing (that is Preferences/Onboarding's — the System is explicitly not the framing owner).
//
// Live swap: read `persona`/`motivation_style` from the Preferences service through a deny-safe port
//   const prefs = usePreferences()            // composition root (deferred)
//   return toRegister(prefs.data?.persona ?? null)
// — one binding change; the register mapping below is the stable contract.
//
// DEV/gate: `?persona=game|neutral` forces a register so the blocking Visual Gate can prove BOTH copy registers
// (the game-tone copy has no live source until fe-settings). Off in production.
// ============================================================================
import type { RewardRegister } from './reward-copy'

/** Map a Preferences `persona`/`motivation_style` to the reward register. The game-tone register is for the
 *  game-like audience (students/teens, interpretation §7); every other value — and ABSENT — is neutral.
 *  NB: M1 maps only `student` → game (non-load-bearing — the live value is `null` until fe-settings). The full
 *  persona→register table (which personas/motivation_styles map to game) is a fe-settings-era decision. */
export function toRegister(persona: string | null | undefined): RewardRegister {
  return persona === 'student' ? 'game' : 'neutral'
}

function devRegister(): RewardRegister | null {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return null
  const p = new URLSearchParams(window.location.search).get('persona')
  return p === 'game' || p === 'neutral' ? p : null
}

/** The reward register for the System's copy. M1 = neutral (no live persona until fe-settings); deny-safe. */
export function usePersona(): RewardRegister {
  return devRegister() ?? 'neutral'
}
