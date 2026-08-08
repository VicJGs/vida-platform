import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Text, View } from '@tamagui/core'
import { Select } from './select'

// UI-1 · Select stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark) to review both
// modes. Open the panel (click / Enter / ↓) to review: active highlight (hover or ↑/↓), the selected check, disabled
// options, the danger border (invalid), the placeholder (empty), flip-up (Bottom story), and dark-mode panel elevation.
//
// MEASURE items (u4-select.md §8): open panel over content · active-highlight · selected check · disabled option ·
// invalid border · placeholder muted · flip-up when no room below · horizontal clamp · panelBackground across the portal.

const FRUITS = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
  { value: 'elderberry', label: 'Elderberry' },
]

const meta = {
  title: 'Primitives/Select',
  component: Select,
  args: { options: FRUITS, placeholder: 'Choose a fruit', size: 'md', 'aria-label': 'Fruit' },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    invalid: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View gap={8}>
    <Text fontSize={12} opacity={0.6} color="$colorTextPrimary">
      {label}
    </Text>
    <View flexDirection="row" alignItems="flex-start" gap={24}>
      {children}
    </View>
  </View>
)

// Default — driven by controls. Uncontrolled so selecting updates the value.
export const Playground: Story = {}

// empty (placeholder) vs selected — the two resting states.
export const ValueStates: Story = {
  render: (args) => (
    <Row label="empty (placeholder) · selected">
      <View width={220}>
        <Select {...args} />
      </View>
      <View width={220}>
        <Select {...args} defaultValue="cherry" />
      </View>
    </Row>
  ),
}

export const Sizes: Story = {
  render: () => (
    <View gap={20} width={220}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Row key={size} label={size}>
          <View width={220}>
            <Select options={FRUITS} size={size} defaultValue="apple" aria-label={`Fruit ${size}`} />
          </View>
        </Row>
      ))}
    </View>
  ),
}

export const States: Story = {
  render: () => (
    <View gap={20}>
      <Row label="invalid (danger border)">
        <View width={220}>
          <Select options={FRUITS} invalid required placeholder="Required" aria-label="Required fruit" />
        </View>
      </Row>
      <Row label="disabled">
        <View width={220}>
          <Select options={FRUITS} disabled defaultValue="banana" aria-label="Disabled fruit" />
        </View>
      </Row>
      <Row label="with a disabled option (Cherry) — skipped by keyboard nav">
        <View width={220}>
          <Select
            aria-label="Fruit with disabled option"
            placeholder="Open me"
            options={[
              { value: 'apple', label: 'Apple' },
              { value: 'banana', label: 'Banana' },
              { value: 'cherry', label: 'Cherry (out of stock)', disabled: true },
              { value: 'date', label: 'Date' },
            ]}
          />
        </View>
      </Row>
    </View>
  ),
}

// Controlled — proves onValueChange round-trips (parent owns state).
export const Controlled: Story = {
  render: () => {
    const Demo = () => {
      const [v, setV] = useState<string | undefined>(undefined)
      return (
        <View gap={8} width={220}>
          <Select options={FRUITS} value={v} onValueChange={setV} placeholder="Pick one" aria-label="Controlled fruit" />
          <Text fontSize={12} color="$colorTextMuted">
            value: {v ?? '(none)'}
          </Text>
        </View>
      )
    }
    return <Demo />
  },
}

// A long list — panel gets maxHeight + scroll; active option scrolls into view on ↑/↓.
export const LongList: Story = {
  render: () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ value: `opt-${i}`, label: `Option ${i + 1}` }))
    return (
      <View width={220}>
        <Select options={many} placeholder="40 options (scrolls)" aria-label="Long list" />
      </View>
    )
  },
}

// Anchored at the viewport bottom — the panel must FLIP UP (measure this in the gate).
export const FlipUp: Story = {
  render: (args) => (
    <View height="90vh" justifyContent="flex-end">
      <View width={220}>
        <Select {...args} placeholder="Opens upward" aria-label="Flip up" />
      </View>
    </View>
  ),
}
