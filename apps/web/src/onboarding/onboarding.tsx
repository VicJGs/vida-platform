// UI-4 · S4 (LIF-89) — the first-run onboarding screens. A full-viewport, boot-phase takeover (renders OUTSIDE
// AppShell, before the router — S4-BR-h) shown once per device. Composes UI-1 Button + Tamagui Text/View on DS
// tokens (BR-1 — no packages/ui edit, no new @vida/ui component). Renders ONBOARDING_STEPS' `m1` copy only
// (M1.0 copy-honesty, BR-6/S4-BR-e): the `vault` step is a CONFIRMATION — no input, no crypto. Focus moves to
// each step's <h1> (FOCUS_CONTRACT.pageNav); there is NO Escape handler (a boot gate is not an overlay — S4-BR-f).
import { useLayoutEffect, useRef, useState } from 'react'
import { styled, Text, View, useMedia } from '@tamagui/core'
import { Button, useReducedMotion } from '@vida/ui'
import { CONTENT_MAX_WIDTH, SIDE_PADDING } from '../shell/breakpoints'
import { ONBOARDING_STEPS, type OnboardingStepKind } from './steps'

// Semantic landmark + heading — `render:'<tag>'` emits a real element (a runtime `tag` prop is NOT honoured; the
// app-shell.tsx region + dialog.tsx `DialogTitle = styled(Text,{render:'h2'})` precedent). The <h1> is
// programmatically focusable (tabIndex -1 + ref) so each step transition announces (S4-BR-f).
const OnboardingMain = styled(View, { render: 'main' })
const Heading = styled(Text, { render: 'h1' })

// The button label per step kind — the model owns headings/body copy; the button label is the render layer's
// (onboarding.md:44-49 intents; S4-BR-f). Not a fork.
const PRIMARY_LABEL: Record<OnboardingStepKind, string> = {
  intro: 'Get started',
  explain: 'Continue',
  'vault-create': 'Continue',
  complete: 'Enter Vida',
}

export interface OnboardingProps {
  /** Write the completion marker + hand off to the app. Rejects → the screen shows a retryable error (S4-BR-d). */
  onComplete: () => Promise<void>
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [index, setIndex] = useState(0)
  const reduced = useReducedMotion()
  const media = useMedia()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const headingRef = useRef<HTMLElement | null>(null)

  // FOCUS_CONTRACT.pageNav: focus the step heading on mount + every advance. The step group is keyed on `index`,
  // so the heading remounts each step and the ref reattaches; this effect re-fires and lands focus (S4-BR-f, FOLD-3).
  useLayoutEffect(() => {
    headingRef.current?.focus()
  }, [index])

  // Per-breakpoint gutter from SIDE_PADDING (BR-3; jsdom matchMedia stub → mobile). `wide` reuses the desktop gutter.
  const gutter =
    media.desktop || media.wide ? SIDE_PADDING.desktop : media.tablet ? SIDE_PADDING.tablet : SIDE_PADDING.mobile

  const step = ONBOARDING_STEPS[index]
  // Defensive only (index is always in [0, ONBOARDING_STEPS.length)); placed AFTER all hooks so it is not a
  // conditional hook call. Future-proofs the parked noUncheckedIndexedAccess flip (S4-BR: gate-2).
  if (!step) return null

  function advance() {
    if (submitting) return // re-entrancy guard: a double-click must not double-write (S4-BR-d, M1)
    if (step.kind === 'complete') {
      setSubmitting(true)
      setError(null)
      onComplete().catch(() => {
        // Never strand: surface a retryable error + re-enable the button; status stays 'onboarding' (S4-BR-d).
        setError('Could not finish setup. Please try again.')
        setSubmitting(false)
      })
      return
    }
    setIndex((i) => i + 1)
  }

  return (
    <OnboardingMain
      height="100vh"
      width="100%"
      alignItems="center"
      justifyContent="center"
      paddingHorizontal={gutter}
      paddingVertical="$32"
      backgroundColor="$colorSurfacePrimary"
    >
      {/* Keyed on `index`: the step group remounts per step, replaying the enter motion + reattaching the heading
          ref. Motion is opacity/transform only (B12), DS-3 `moderate`, instant under reduced motion (S4-BR-g). */}
      <View
        key={index}
        width="100%"
        maxWidth={CONTENT_MAX_WIDTH}
        alignItems="center"
        gap="$24"
        animation={reduced ? undefined : 'moderate'}
        enterStyle={reduced ? undefined : { opacity: 0, y: 8 }}
        opacity={1}
        y={0}
      >
        <Heading
          ref={headingRef}
          tabIndex={-1}
          fontFamily="$display"
          fontSize="$display"
          color="$colorTextPrimary"
          textAlign="center"
        >
          {step.copy.m1}
        </Heading>

        {/* Decorative progress dots — aria-hidden; the accessible heading + focus convey position to AT. */}
        <View flexDirection="row" gap="$8" aria-hidden>
          {ONBOARDING_STEPS.map((s, i) => (
            <View
              key={s.id}
              width={8}
              height={8}
              borderRadius="$full"
              backgroundColor={i === index ? '$colorBrandPrimary' : '$colorBorderDefault'}
            />
          ))}
        </View>

        {error ? (
          <Text role="alert" color="$colorSignalDanger" textAlign="center">
            {error}
          </Text>
        ) : null}

        <Button intent="primary" size="lg" onPress={advance} loading={submitting} disabled={submitting}>
          {PRIMARY_LABEL[step.kind]}
        </Button>
      </View>
    </OnboardingMain>
  )
}

export default Onboarding
