// fe-onboarding (LIF-216) · S1 — the guided-setup flow FRAME. Two columns: the LEFT-rail stage indicator (StepRail,
// EC-3) + the content pane (step heading + injected body + footer). Never-a-wall (EC-2): Continue / Skip this step /
// a persistent "Skip setup →". Honest completion (EC-6) → Enter Vida. Focus moves to the step <h1> on each advance
// (FOCUS_CONTRACT.pageNav). Responsive (EC-8): rail is a left column ≥768, a top strip <768. Reduced-motion aware.
// Composes @vida/ui + Tamagui only (BR-1). Step BODIES are injected by S2/S3 via renderStepBody.
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { Text, View, styled, useMedia } from '@tamagui/core'
import { Button, useReducedMotion } from '@vida/ui'
import { CONTENT_MAX_WIDTH } from '../shell/breakpoints'
import { GUIDED_SETUP_STEPS, type GuidedSetupStep } from './guided-setup-steps'
import { useGuidedSetup } from './use-guided-setup'
import { StepRail } from './step-rail'

// tabIndex=-1 + programmatic focus for the SR step announcement (FOCUS_CONTRACT.pageNav). It is never keyboard-reachable,
// so the visible focus outline carries no user value and reads as a jarring full-width box — suppress it (the
// skip-to-heading convention); the announcement still fires on focus.
const Heading = styled(Text, { render: 'h1', outlineStyle: 'none' })

export interface GuidedSetupProps {
  /** Finalize + leave the flow (write the hand-off). Rejects → a retryable error shows. */
  onComplete: () => Promise<void>
  /** Inject a `pick` step's body (S2 module picker · S3 theme picker). Absent → a teaching placeholder (S1). */
  renderStepBody?: (step: GuidedSetupStep) => ReactNode
  steps?: readonly GuidedSetupStep[]
  'aria-label'?: string
}

// Self-contained focused flow — owns its surface (the onboarding.tsx takeover precedent) so dark text never lands on a
// bare body. minHeight fills the mount; content taller than the viewport still scrolls.
const Surface = styled(View, { minHeight: '100vh', width: '100%', backgroundColor: '$colorSurfacePrimary' })
const Root = styled(View, { width: '100%', maxWidth: CONTENT_MAX_WIDTH, marginHorizontal: 'auto', paddingHorizontal: '$16', paddingVertical: '$32' })

export function GuidedSetup({ onComplete, renderStepBody, steps = GUIDED_SETUP_STEPS, 'aria-label': ariaLabel = 'Guided setup' }: GuidedSetupProps) {
  const { index, step, submitting, error, next, skipStep, skipAll, complete } = useGuidedSetup({ steps, onComplete })
  const reduced = useReducedMotion()
  const media = useMedia()
  const headingRef = useRef<HTMLElement | null>(null)
  const sideBySide = media.tablet || media.desktop || media.wide

  // FOCUS_CONTRACT.pageNav — focus the step heading on mount + every advance (keyed remount reattaches the ref).
  useLayoutEffect(() => {
    headingRef.current?.focus()
  }, [index])

  const isComplete = step.kind === 'complete'

  return (
    <Surface>
      <Root role="region" aria-label={ariaLabel}>
      <View flexDirection={sideBySide ? 'row' : 'column'} gap="$32" alignItems="flex-start">
        {/* LEFT rail (≥768) / top strip (<768) — EC-3 + EC-8 */}
        <View {...(sideBySide ? { width: 180, flexShrink: 0 } : { width: '100%' })}>
          <StepRail steps={steps.map((s) => ({ id: s.id, railLabel: s.railLabel }))} currentIndex={index} orientation={sideBySide ? 'vertical' : 'horizontal'} />
        </View>

        {/* content pane — drop flex-grow when stacked to a column (RNW flex-collapse guard, EC-8;
            [[flex1-child-collapses-to-height-0-in-column-under-rnw]]). */}
        <View {...(sideBySide ? { flex: 1 } : { width: '100%' })} minWidth={0} gap="$24">
          {/* keyed remount per step → replays enter motion + reattaches the heading ref */}
          <View
            key={index}
            gap="$16"
            animation={reduced ? undefined : 'moderate'}
            enterStyle={reduced ? undefined : { opacity: 0, y: 8 }}
            opacity={1}
            y={0}
          >
            <Heading ref={headingRef} tabIndex={-1} fontFamily="$display" fontSize="$display" color="$colorTextPrimary">
              {step.title}
            </Heading>
            <Text fontSize="$body" color="$colorTextMuted" maxWidth="60ch">
              {step.body}
            </Text>

            {/* step body — S2/S3 inject; S1 placeholder for pick steps (complete has no body control) */}
            {!isComplete && (
              <View>
                {renderStepBody?.(step) ?? (
                  <View borderWidth={1} borderColor="$colorBorderDefault" borderRadius="$md" padding="$16" backgroundColor="$colorSurfaceSecondary">
                    <Text fontSize="$small" color="$colorTextMuted">The {step.railLabel.toLowerCase()} picker mounts here.</Text>
                  </View>
                )}
              </View>
            )}

            {/* Deliberate divergence from onboarding.tsx's $colorSignalDanger (g2 N2): muted = the calm VOICE, and it's
                AA-safe — the provisional danger token (#ef4444 = 3.63) fails AA on this surface. role="alert" still
                announces the failure; the message sits directly above the retry button. */}
            {error ? (
              <Text role="alert" fontSize="$small" color="$colorTextMuted">
                {error}
              </Text>
            ) : null}
          </View>

          {/* footer — never-a-wall (EC-2). Primary = Enter Vida on complete, else Continue. */}
          <View flexDirection="row" alignItems="center" gap="$12" flexWrap="wrap">
            <Button intent="primary" size="lg" onPress={isComplete ? complete : next} loading={submitting} disabled={submitting}>
              {isComplete ? 'Enter Vida' : 'Continue'}
            </Button>
            {!isComplete && (
              <Button intent="ghost" size="lg" onPress={skipStep}>
                Skip this step
              </Button>
            )}
            <View flex={1} minWidth={0} />
            {!isComplete && (
              <Button intent="ghost" size="sm" onPress={skipAll} disabled={submitting}>
                Skip setup →
              </Button>
            )}
          </View>
        </View>
      </View>
      </Root>
    </Surface>
  )
}

export default GuidedSetup
