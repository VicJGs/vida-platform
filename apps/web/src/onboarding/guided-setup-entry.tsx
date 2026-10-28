// fe-onboarding (LIF-216) · S4 — the two guided-setup REACH surfaces (EC-1). Both are opt-in, never a wall (IR2).
// Copy is sentence-case + honest (lintCopy-clean — M1 local-first, no ZK/cloud claim, BR-4). Composes @vida/ui only (BR-1).
import { Text, View, styled } from '@tamagui/core'
import { Button, EmptyState } from '@vida/ui'

// A self-owned full-viewport surface (the onboarding.tsx takeover precedent) so the invitation never paints on a bare body.
const Surface = styled(View, {
  minHeight: '100vh',
  width: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '$32',
  backgroundColor: '$colorSurfacePrimary',
})

/**
 * Reach path (a) — the post-first-run INVITATION: a one-time opt-in offered right after onboarding completes. Teaching
 * EmptyState; the primary way in sits in the `guidedSetup` slot, with a persistent "Skip for now" so it is never a wall.
 */
export function GuidedSetupInvitation({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <Surface>
      <View maxWidth={440} width="100%">
        <EmptyState
          title="Make Vida yours"
          titleLevel={1}
          action={
            <Button intent="ghost" size="lg" onPress={onSkip}>
              Skip for now
            </Button>
          }
          guidedSetup={
            <Button intent="primary" size="lg" onPress={onStart}>
              Set up your workspace
            </Button>
          }
        >
          <Text fontSize="$body" color="$colorTextMuted" textAlign="center" maxWidth="40ch">
            Pick the areas you want in your sidebar and choose a look. It takes a minute, and you can change everything
            later.
          </Text>
        </EmptyState>
      </View>
    </Surface>
  )
}

/**
 * Reach path (b) — the `EmptyState.guidedSetup` slot content for empty module surfaces. A module surface drops this into
 * its own EmptyState's `guidedSetup` slot; pressing it opens the same flow. (Consumption by each module surface lands
 * with those surfaces; S4 ships the reusable entry + registers the path.)
 */
export function GuidedSetupSlotButton({
  onStart,
  label = 'Set up your modules',
}: {
  onStart: () => void
  label?: string
}) {
  return (
    <Button intent="secondary" size="md" onPress={onStart}>
      {label}
    </Button>
  )
}
