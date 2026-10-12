// fe-onboarding (LIF-216) · S1 — the guided-setup flow state machine. Pure step navigation + the terminal hand-off;
// NO persistence (module/theme write seams are S2/S3). `complete`/`skipAll` both finalize via onComplete() with a
// re-entrancy guard + retryable error (the onboarding.tsx S4-BR-d precedent). Never-a-wall (EC-2): skipAll finalizes
// immediately from any step.
import { useCallback, useRef, useState } from 'react'
import type { GuidedSetupStep } from './guided-setup-steps'

export interface UseGuidedSetup {
  readonly index: number
  readonly step: GuidedSetupStep
  readonly isLast: boolean
  readonly submitting: boolean
  readonly error: string | null
  /** Advance to the next step (the primary action on a `pick` step). */
  readonly next: () => void
  /** Go back one step (no-op on the first). */
  readonly back: () => void
  /** Skip this step's selection — advance without choosing (EC-2). */
  readonly skipStep: () => void
  /** Abandon setup from any step — finalize immediately (EC-2, never-a-wall). */
  readonly skipAll: () => void
  /** Finalize from the `complete` step (the "Enter Vida" action). */
  readonly complete: () => void
}

export function useGuidedSetup({
  steps,
  onComplete,
}: {
  steps: readonly GuidedSetupStep[]
  /** Write the completion hand-off + leave the flow. Rejects → a retryable error is surfaced. */
  onComplete: () => Promise<void>
}): UseGuidedSetup {
  const [index, setIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // In-flight latch: guards same-tick re-entrancy a `submitting`-state check misses (its closure is stale within a tick).
  const inFlight = useRef(false)

  // index is always in [0, len) — next/back clamp. Placed as a guarded read (the parked noUncheckedIndexedAccess flip).
  const step = steps[index] ?? steps[0]!
  const isLast = index === steps.length - 1

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, steps.length - 1)), [steps.length])
  const back = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), [])
  const skipStep = next

  const finalize = useCallback(() => {
    if (inFlight.current) return // re-entrancy: a double-press must not double-finalize (S4-BR-d)
    inFlight.current = true
    setSubmitting(true)
    setError(null)
    onComplete().catch(() => {
      // Never strand: surface a retryable error + re-enable (allow a retry). On success the parent unmounts the flow.
      inFlight.current = false
      setError('Could not finish setup. Please try again.')
      setSubmitting(false)
    })
  }, [onComplete])

  return { index, step, isLast, submitting, error, next, back, skipStep, skipAll: finalize, complete: finalize }
}
