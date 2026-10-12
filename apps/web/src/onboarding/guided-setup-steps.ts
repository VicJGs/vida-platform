// fe-onboarding (LIF-216) · S1 — the guided-setup flow step model. Data/logic only; the chrome renders it
// (the steps.ts/onboarding.tsx split precedent). The NET-NEW optional guided setup (surface-map.md:34; p5
// specimen:164 "pick your modules & theme — optional, skippable"). Copy is sentence-case + honest (VOICE);
// lintCopy-clean — M1.0 local-first, no ZK/encryption/cloud claim (BR-4; voice/voice-copy.ts). Step BODIES
// (module picker · theme picker) are injected by S2/S3; S1 owns the model + the frame.

export type GuidedSetupStepId = 'modules' | 'theme' | 'done'
/** `pick` = an optional selection step (skippable body) · `complete` = the terminal hand-off. */
export type GuidedSetupStepKind = 'pick' | 'complete'

export interface GuidedSetupStep {
  readonly id: GuidedSetupStepId
  readonly kind: GuidedSetupStepKind
  /** The short LEFT-rail label (EC-3). */
  readonly railLabel: string
  /** The step heading (serif H1; focus target per step — FOCUS_CONTRACT.pageNav). */
  readonly title: string
  /** The teaching lead under the heading. */
  readonly body: string
}

export const GUIDED_SETUP_STEPS: readonly GuidedSetupStep[] = [
  {
    id: 'modules',
    kind: 'pick',
    railLabel: 'Modules',
    title: "Pick what you'll use",
    body: 'Turn on the areas you want in your sidebar. You can enable or hide any of these later in Settings — nothing is locked in.',
  },
  {
    id: 'theme',
    kind: 'pick',
    railLabel: 'Theme',
    title: 'Make it yours',
    body: 'Choose a look. It previews instantly, and you can change it anytime.',
  },
  {
    id: 'done',
    kind: 'complete',
    railLabel: 'Done',
    title: "You're set",
    // Local-first honest (EC-6/EC-7) — no encryption/ZK claim at M1.0.
    body: 'Your workspace is ready on this device. Everything you picked is changeable anytime.',
  },
] as const
