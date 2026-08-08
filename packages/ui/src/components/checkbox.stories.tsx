import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Text, View } from '@tamagui/core'
import { Checkbox } from './checkbox'

// UI-1 · Checkbox stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark) to review both
// modes. Value states (unchecked/checked/indeterminate) render explicitly; hover/focus/active are verified live
// (hover the mouse, Tab to focus, Space/click) — no static story without a pseudo-forcing addon.
//
// The MEASURE items for this gate (u3-checkbox.md §8): (1) checkmark scale+opacity on toggle; (2) dash on
// indeterminate; (3) focus ring on the BOX (not the label); (4) danger border on invalid; (5) checked × hover × dark
// overlay perceptibility (F#8 — border-strengthen fallback if under-perceptible).

const meta = {
  title: 'Primitives/Checkbox',
  component: Checkbox,
  args: { label: 'Accept terms', size: 'md' },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    checked: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
    invalid: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View gap={8}>
    <Text fontSize={12} opacity={0.6} color="$colorTextPrimary">
      {label}
    </Text>
    <View flexDirection="row" alignItems="center" gap={24}>
      {children}
    </View>
  </View>
)

// Default — driven by controls (Storybook args). Uncontrolled so click toggles.
export const Playground: Story = {}

// The three value states side by side (the checkbox's defining axis).
export const ValueStates: Story = {
  render: (args) => (
    <View gap={20}>
      <Row label="unchecked · checked · indeterminate">
        <Checkbox {...args} label="Unchecked" defaultChecked={false} indeterminate={false} />
        <Checkbox {...args} label="Checked" defaultChecked indeterminate={false} />
        <Checkbox {...args} label="Indeterminate" indeterminate />
      </Row>
    </View>
  ),
}

// Sizes × value — measure box scaling (16/20/24 dp) and checkmark proportion.
export const Sizes: Story = {
  render: () => (
    <View gap={20}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Row key={size} label={size}>
          <Checkbox size={size} label="Off" defaultChecked={false} />
          <Checkbox size={size} label="On" defaultChecked />
          <Checkbox size={size} label="Mixed" indeterminate />
        </Row>
      ))}
    </View>
  ),
}

// States — disabled (both values), invalid (danger border), required.
export const States: Story = {
  render: () => (
    <View gap={20}>
      <Row label="disabled">
        <Checkbox label="Disabled off" disabled defaultChecked={false} />
        <Checkbox label="Disabled on" disabled defaultChecked />
        <Checkbox label="Disabled mixed" disabled indeterminate />
      </Row>
      <Row label="invalid (danger border)">
        <Checkbox label="Required, unchecked" invalid required defaultChecked={false} />
        <Checkbox label="Invalid + checked" invalid defaultChecked />
      </Row>
    </View>
  ),
}

// No label → aria-label required. Focus ring must land on the box.
export const NoLabel: Story = {
  render: () => (
    <Row label="unlabeled (aria-label) — Tab to see the ring on the box">
      <Checkbox aria-label="Select row 1" defaultChecked={false} />
      <Checkbox aria-label="Select row 2" defaultChecked />
    </Row>
  ),
}

// Controlled — proves onCheckedChange round-trips (parent owns state).
export const Controlled: Story = {
  render: () => {
    const ControlledDemo = () => {
      const [on, setOn] = useState(false)
      return <Checkbox label={on ? 'On' : 'Off'} checked={on} onCheckedChange={setOn} />
    }
    return <ControlledDemo />
  },
}
