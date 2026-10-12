// fe-onboarding (LIF-216) · S4 — the guided-setup LAUNCH phase (ephemeral UI state, BR-RT-6 — never persisted). A tiny
// shared store so BOTH reach paths drive the one overlay mount in App.tsx: the post-first-run invitation (opened by the
// onboarding-completion handoff) and the in-app `EmptyState.guidedSetup` slot (opened from anywhere inside the router).
// IR2: guided setup is OPT-IN + skippable — never a mandatory boot gate. `dismiss` returns to the app from any phase.
import { create } from 'zustand'

/** `none` = app only · `invited` = the one-time post-first-run opt-in overlay · `running` = the guided-setup flow. */
export type GuidedSetupPhase = 'none' | 'invited' | 'running'

interface GuidedSetupState {
  phase: GuidedSetupPhase
  /** Offer the one-time post-first-run invitation (called from the onboarding completion handoff). */
  invite: () => void
  /** Open the guided-setup flow (from the invitation's "Set up" or the in-app EmptyState slot). */
  start: () => void
  /** Leave guided setup — skip the invitation or finish/skip the flow. Back to the app. */
  dismiss: () => void
}

export const useGuidedSetupStore = create<GuidedSetupState>((set) => ({
  phase: 'none',
  invite: () => set({ phase: 'invited' }),
  start: () => set({ phase: 'running' }),
  dismiss: () => set({ phase: 'none' }),
}))
