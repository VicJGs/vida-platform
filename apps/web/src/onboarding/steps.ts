// UX-5 (LIF-94) — first-run onboarding step model. Design data; UI-4 renders the screens.
// No React here. Encodes the ordered steps + the BR-4 copy-honesty contract per step.

export type OnboardingStepKind = 'intro' | 'explain' | 'vault-create' | 'complete'

/** What a step's copy MAY assert (BR-4), per platform posture. M1.0 = encryption off. */
export interface OnboardingCopyContract {
  /** M1.0 (encryption off): the honest claim available now. */
  readonly m1: string
  /** M3+ (AR-3 live, gated by an encryption-active signal — UX-5b): the fuller claim. */
  readonly m3?: string
}

export interface OnboardingStep {
  readonly id: string
  readonly kind: OnboardingStepKind
  /** Present in the model but impl-deferred downstream (AR-3 / UX-5b / M3). */
  readonly deferredImpl?: 'vault-key' | 'passphrase'
  readonly copy: OnboardingCopyContract
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: 'welcome',
    kind: 'intro',
    copy: { m1: 'Vida — your life, in one place, on your device.' },
  },
  {
    id: 'privacy',
    kind: 'explain',
    copy: {
      m1: 'Vida is local-first: your data lives on this device. Encryption arrives as the platform hardens.',
      m3: 'Your data is encrypted on your device and never leaves in plaintext — only you hold the keys.',
    },
  },
  {
    id: 'vault',
    kind: 'vault-create',
    deferredImpl: 'vault-key',
    copy: {
      // Confirmation, NOT "create" — in M1.0 no key is created, so implying an action would violate BR-4.
      m1: 'Your local vault is ready on this device.',
      m3: 'Create the passphrase that unlocks your vault.',
    },
  },
  {
    id: 'ready',
    kind: 'complete',
    copy: { m1: "You're all set. Welcome to Vida." },
  },
] as const
