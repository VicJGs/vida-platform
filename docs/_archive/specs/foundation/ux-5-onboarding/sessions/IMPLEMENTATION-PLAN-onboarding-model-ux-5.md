# IMPLEMENTATION-PLAN — UX-5 Onboarding Model (gate 2 · build steps)

**Approved SPEC:** `PLAN-onboarding-model-ux-5.md` (Approval 1). This is the self-sufficient build prompt.
Deliverable = design model: 2 data/logic files + tests + layer doc + architecture doc. No rendered component.

---

## Build steps (in order)

### Step 1 — `apps/web/src/onboarding/steps.ts` (the ordered step model)

```ts
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
  { id: 'welcome', kind: 'intro', copy: { m1: 'Vida — your life, in one place, on your device.' } },
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
      m1: 'Your local vault is ready on this device.', // confirmation, NOT "create" (BR-4 step-3 honesty)
      m3: 'Create the passphrase that unlocks your vault.',
    },
  },
  { id: 'ready', kind: 'complete', copy: { m1: "You're all set. Welcome to Vida." } },
] as const
```

### Step 2 — `apps/web/src/onboarding/first-run.ts` (the boundary contract)

```ts
// UX-5 (LIF-94) — first-run boundary contract. Pure logic + data; UI-4 wires it into App.tsx.
//
// The onboarding gate keys ONLY on this marker. WorkerDbClient.exists('vida')
// [apps/web/src/db/client.ts:120] is the DB-lifecycle signal (open-vs-create) and is NOT the
// onboarding trigger: on first launch open() migrates the DB, so exists() is already true while
// this marker is unset — they disagree by design. Keying the branch on exists() would make
// onboarding never show.
//
// DISTINCT from `UserProfile.onboarding_completed` [packages/types/src/entities/user.ts:61] — that
// is the SYNCED, cross-device *user* flag (a `SyncableEntity` field; its table lands with the
// user_profile module, M1.1+). THIS is a DEVICE-LOCAL "this device finished first-run" marker in
// `app_state` (never synced). The colon-namespaced key makes the locality explicit; reconciling the
// two (does a synced user flag suppress a new device's first-run?) is a UX-5b / M1.1 concern, not M1.0.

/** Reserved DEVICE-LOCAL app_state key [packages/core/src/db/schema/foundation/app-state.ts:18-21]. */
export const FIRST_RUN_COMPLETE_KEY = 'first_run:completed'

/** Value written on completion. app_state stores TEXT values. */
export const FIRST_RUN_COMPLETE_VALUE = '1'

/** First run iff the marker is not the completion value (absent, empty, or anything else). */
export function isFirstRun(flag: string | undefined): boolean {
  return flag !== FIRST_RUN_COMPLETE_VALUE
}

/** Documents the App.tsx seam UI-4 implements — as data, so the contract is inspectable/testable. */
export interface FirstRunBranch {
  readonly file: string
  readonly at: string
  readonly signalKey: typeof FIRST_RUN_COMPLETE_KEY
}

export const FIRST_RUN_BRANCH: FirstRunBranch = {
  file: 'apps/web/src/App.tsx',
  at: 'dbReady === true branch, before <RouterProvider>',
  signalKey: FIRST_RUN_COMPLETE_KEY,
}
```

### Step 3 — `apps/web/src/onboarding/first-run.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { isFirstRun, FIRST_RUN_COMPLETE_KEY, FIRST_RUN_COMPLETE_VALUE, FIRST_RUN_BRANCH } from './first-run'

describe('isFirstRun', () => {
  it('is true when the marker is absent', () => expect(isFirstRun(undefined)).toBe(true))
  it('is true for empty / non-completion values', () => {
    expect(isFirstRun('')).toBe(true)
    expect(isFirstRun('0')).toBe(true)
  })
  it('is false only for the completion value', () => expect(isFirstRun(FIRST_RUN_COMPLETE_VALUE)).toBe(false))
})

describe('FIRST_RUN_BRANCH', () => {
  it('keys on the device-local first-run marker, not exists()', () => {
    expect(FIRST_RUN_BRANCH.signalKey).toBe(FIRST_RUN_COMPLETE_KEY)
  })
})
```

### Step 4 — `apps/web/src/onboarding/steps.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { ONBOARDING_STEPS, type OnboardingStepKind } from './steps'

const KINDS: readonly OnboardingStepKind[] = ['intro', 'explain', 'vault-create', 'complete']

describe('ONBOARDING_STEPS', () => {
  it('has four ordered steps with unique ids', () => {
    expect(ONBOARDING_STEPS).toHaveLength(4)
    expect(new Set(ONBOARDING_STEPS.map((s) => s.id)).size).toBe(4)
  })
  it('starts at welcome and every kind is valid', () => {
    expect(ONBOARDING_STEPS[0].id).toBe('welcome')
    for (const s of ONBOARDING_STEPS) expect(KINDS).toContain(s.kind)
  })
  it('has complete as the terminal step, and no deferred step is terminal', () => {
    const last = ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1]
    expect(last.kind).toBe('complete')
    expect(last.deferredImpl).toBeUndefined()
    const deferredIdx = ONBOARDING_STEPS.findIndex((s) => s.deferredImpl !== undefined)
    if (deferredIdx !== -1) expect(deferredIdx).toBeLessThan(ONBOARDING_STEPS.length - 1)
  })
  it('gives every step an M1.0 copy claim', () => {
    for (const s of ONBOARDING_STEPS) expect(s.copy.m1.length).toBeGreaterThan(0)
  })
})
```

### Step 5 — `apps/web/src/onboarding/CLAUDE.md`

Layer doc matching the `nav`/`shell`/`state-conventions` siblings: what the layer is (the UX-5 first-run
onboarding _model_, not chrome — UI-4 renders), the pattern (typed data + pure logic, **no barrel — import
specific files, STANDARDS §XX**), key files (`steps.ts`, `first-run.ts`), the two-signal rule, and the deferred
seams (AR-3/UX-5b/M3).

### Step 6 — `docs/core/architecture/onboarding.md` (+ README row)

The durable architecture doc: purpose/scope, the 4-step flow model, the first-run boundary contract (incl. the
two-signal independence), the BR-4 copy-honesty contract (M1.0 local-first vs M3 ZK), the deferred-seam register,
a11y/responsive rules (FOCUS_CONTRACT reuse; no-Escape; PRIMARY_TEST_WIDTHS + CONTENT_MAX_WIDTH), and Consumption
(UI-4 renders the screens + wires the App.tsx branch + the completion write; UX-5b/M3 flips the encryption-active
signal + adds unlock). Add a row to `docs/core/architecture/README.md`.

### Step 7 — §XXIX currency

Check for `apps/web` context `current-*` docs; refresh if the model changes them, else mark current. Commit docs with code.

---

## Acceptance → build-step map

A1→S1 · A2→S2 · A3→S1/S6 (seam register) · A4→S1/S6 (copy) · A5→S2/S6 (reuse+no-Escape) · A6→S1–S4 (typecheck+tests) · A7→S6 · A8→S7.

## Verify (done-gate)

`pnpm --filter @vida/web typecheck` (0 err) · `pnpm --filter @vida/web test` (green, new tests pass) · root `pnpm typecheck` unregressed · no rendered surface / no Visual Gate. No edits to `App.tsx`/`routes.tsx`/schema.
