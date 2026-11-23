import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Text, View } from '@tamagui/core'
import { Select } from './select'
import { controlKey, useWriteBack } from '../../.storybook/controls'

// UI-1 · Select stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark) to review both
// modes. Open the panel (click / Enter / ↓) to review: active highlight (hover or ↑/↓), the selected check, disabled
// options, the danger border (invalid), the placeholder (empty), flip-up (Bottom story), and dark-mode panel elevation.
//
// MEASURE items: open panel over content · active-highlight · selected check · disabled option ·
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
// `value` and `defaultValue` pick from the options; `(none)` leaves the select empty or uncontrolled.
const FRUIT_VALUE = {
  control: { type: 'select' as const },
  options: ['(none)', ...FRUITS.map((f) => f.value)],
  mapping: { '(none)': undefined },
}

export const Playground: Story = {
  argTypes: { value: FRUIT_VALUE, defaultValue: FRUIT_VALUE },
  // Remount when a default prop changes (it only applies on mount) or a controlled prop is set or cleared.
  render: function Render(args) {
    const onValueChange = useWriteBack('value', args.value)
    return (
      <View width={240}>
        <Select key={controlKey(args.defaultValue, args.value === undefined)} {...args} onValueChange={onValueChange} />
      </View>
    )
  },
}

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
  parameters: { controls: { disable: true } }, // a fixed showcase: it ignores args
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
  parameters: { controls: { disable: true } }, // a fixed showcase: it ignores args
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
  parameters: { controls: { disable: true } }, // a fixed showcase: it ignores args
  render: () => {
    const Demo = () => {
      const [v, setV] = useState<string | undefined>(undefined)
      return (
        <View gap={8} width={220}>
          <Select
            options={FRUITS}
            value={v}
            onValueChange={setV}
            placeholder="Pick one"
            aria-label="Controlled fruit"
          />
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
  parameters: { controls: { disable: true } }, // a fixed showcase: it ignores args
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
