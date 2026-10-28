// fe-onboarding (LIF-216) · S1 — the LEFT-rail vertical stage indicator (EC-3, Victor's directive): the user always
// sees where they are in the guided-setup flow. A progress MAP, not nav (you move via Continue/Skip) — non-interactive.
// a11y: a role="list" of steps; the current step carries aria-current="step"; markers + connectors are decorative
// (aria-hidden). The accessible position is also carried by the focused step heading (FOCUS_CONTRACT.pageNav). Tokens
// only, no sub-theme (the LV-3 convention). No @vida/ui edit (BR-1).
import { Text, View, styled } from '@tamagui/core'

export type StepStatus = 'done' | 'current' | 'upcoming'

export interface StepRailStep {
  id: string
  railLabel: string
}

export interface StepRailProps {
  steps: StepRailStep[]
  /** Index of the current step; earlier = done, later = upcoming. */
  currentIndex: number
  /** 'vertical' (default, left rail ≥768) | 'horizontal' (condensed top strip <768) — EC-8. */
  orientation?: 'vertical' | 'horizontal'
  'aria-label'?: string
}

const Rail = styled(View, {
  variants: {
    orientation: {
      vertical: { flexDirection: 'column', gap: '$4', minWidth: 160 },
      horizontal: { flexDirection: 'row', gap: '$8', flexWrap: 'wrap', alignItems: 'center' },
    },
  } as const,
})

const Row = styled(View, { flexDirection: 'row', alignItems: 'center', gap: '$8' })

// The marker disc — done=filled brand + check · current=ring in brand emphasis · upcoming=muted ring.
function Marker({ status }: { status: StepStatus }) {
  const base = {
    width: 20,
    height: 20,
    borderRadius: '$full' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
  }
  if (status === 'done')
    return (
      <View {...base} backgroundColor="$colorBrandPrimary" borderColor="$colorBrandPrimary">
        <Text fontSize={11} lineHeight={11} color="$colorTextInverse">
          ✓
        </Text>
      </View>
    )
  if (status === 'current')
    return <View {...base} borderColor="$colorBrandEmphasis" backgroundColor="$colorSurfaceSecondary" />
  return <View {...base} borderColor="$colorBorderDefault" backgroundColor="$colorSurfacePrimary" />
}

export function StepRail({
  steps,
  currentIndex,
  orientation = 'vertical',
  'aria-label': ariaLabel = 'Setup progress',
}: StepRailProps) {
  return (
    <Rail orientation={orientation} role="list" aria-label={ariaLabel}>
      {steps.map((s, i) => {
        const status: StepStatus = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming'
        return (
          <Row key={s.id} role="listitem" {...(status === 'current' ? { 'aria-current': 'step' } : {})}>
            <Marker status={status} />
            <Text
              fontSize="$small"
              color={status === 'current' ? '$colorTextPrimary' : '$colorTextMuted'}
              fontWeight={status === 'current' ? '600' : '400'}
            >
              {s.railLabel}
            </Text>
          </Row>
        )
      })}
    </Rail>
  )
}

export default StepRail
