// fe-onboarding (LIF-216) · S2 — the Step 1 module enable-set picker body (EC-4). Mounts into the S1 frame's
// `renderStepBody` seam for the `modules` step. The dock roster (grouped by ModuleGroup) as `aria-pressed` toggle
// chips; an ENABLE-SET (which modules the user wants on), NOT nav placement. Optional — the frame owns Continue/Skip.
// `ModulePickerView` is PURE (state-as-prop) so S4 can lift the selection to the flow / live seam; `ModulePicker` is
// the thin hook shell for the in-flow mount + the Visual Gate. Tokens only, no @vida/ui edit (BR-1).
import { useId } from 'react'
import { Text, View, styled } from '@tamagui/core'
import { getDockModuleGroups, type DockModuleGroup } from './modules'
import { useModuleSelection } from './use-module-selection'

// A toggle chip = a real <button> (native Enter/Space) carrying `aria-pressed`. §VIII focus ring (never suppressed).
// On = brand fill + inverse text; off = secondary surface + primary text. An instant state swap (B12 — no animation).
const ToggleChip = styled(View, {
  render: 'button',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$8',
  paddingVertical: '$8',
  paddingHorizontal: '$12',
  borderRadius: '$full',
  borderWidth: 1,
  cursor: 'pointer',
  userSelect: 'none',
  focusVisibleStyle: { outlineColor: '$colorFocusRing', outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 },
  variants: {
    on: {
      true: { backgroundColor: '$colorBrandPrimary', borderColor: '$colorBrandPrimary' },
      false: { backgroundColor: '$colorSurfaceSecondary', borderColor: '$colorBorderDefault' },
    },
  } as const,
})

// The leading on/off marker (StepRail's Marker idiom): on = inverse ✓ on the brand fill; off = a muted ring.
// Decorative only — the on/off STATE is carried by the chip's `aria-pressed`; aria-hidden keeps the ✓ out of the
// button's accessible name (which must stay the bare module label).
function ChipMarker({ on }: { on: boolean }) {
  const base = { width: 16, height: 16, borderRadius: '$full' as const, alignItems: 'center' as const, justifyContent: 'center' as const }
  if (on)
    return (
      <View {...base} aria-hidden borderWidth={1} borderColor="$colorTextInverse">
        <Text fontSize={10} lineHeight={10} color="$colorTextInverse">✓</Text>
      </View>
    )
  return <View {...base} aria-hidden borderWidth={2} borderColor="$colorBorderDefault" />
}

function ModuleToggle({ module, on, onToggle }: { module: { key: string; label: string }; on: boolean; onToggle: (key: string) => void }) {
  return (
    <ToggleChip type="button" on={on} aria-pressed={on} onPress={() => onToggle(module.key)}>
      <ChipMarker on={on} />
      <Text fontSize="$small" fontWeight="500" color={on ? '$colorTextInverse' : '$colorTextPrimary'}>
        {module.label}
      </Text>
    </ToggleChip>
  )
}

function ModuleGroupSection({ group, enabled, onToggle }: { group: DockModuleGroup; enabled: Record<string, boolean>; onToggle: (key: string) => void }) {
  const headingId = useId()
  return (
    <View role="group" aria-labelledby={headingId} gap="$12">
      <Text id={headingId} fontSize="$caption" fontWeight="600" color="$colorTextMuted" textTransform="uppercase" letterSpacing={0.4}>
        {group.label}
      </Text>
      <View flexDirection="row" flexWrap="wrap" gap="$8">
        {group.modules.map((m) => (
          <ModuleToggle key={m.key} module={m} on={enabled[m.key] === true} onToggle={onToggle} />
        ))}
      </View>
    </View>
  )
}

export interface ModulePickerViewProps {
  /** The grouped dock roster to offer. */
  groups: readonly DockModuleGroup[]
  /** The current enable-set (module key → on). */
  enabled: Record<string, boolean>
  /** Flip one module. */
  onToggle: (moduleKey: string) => void
  'aria-label'?: string
}

/** Pure, state-as-prop — grouped toggle chips. S4 can lift `enabled`/`onToggle` to the flow or the live seam. */
export function ModulePickerView({ groups, enabled, onToggle, 'aria-label': ariaLabel = 'Modules to enable' }: ModulePickerViewProps) {
  return (
    <View role="group" aria-label={ariaLabel} gap="$24">
      {groups.map((g) => (
        <ModuleGroupSection key={g.group} group={g} enabled={enabled} onToggle={onToggle} />
      ))}
    </View>
  )
}

/** The in-flow mount (S1 `renderStepBody`) + Visual-Gate harness: wires the in-memory selection to the pure view. */
export function ModulePicker() {
  const { enabled, toggle } = useModuleSelection()
  return <ModulePickerView groups={getDockModuleGroups()} enabled={enabled} onToggle={toggle} />
}

export default ModulePicker
