import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { Input } from './input'

// UI-1 · Input stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark) to review both
// modes. Resting states (default/disabled/invalid/readOnly/empty) show explicitly; hover/focus/active are verified
// live (hover the mouse, Tab/click to focus, type) — no static story without a pseudo-forcing addon.
//
// `loading` is NOT a prop (contract input.md:11-28 has none; :40 realizes it via "(trailing slot)"): the consumer
// puts a spinner in `trailing` + sets `aria-busy`. The Loading story demonstrates exactly that.

const meta = {
  title: 'Primitives/Input',
  component: Input,
  args: { placeholder: 'Type here…', size: 'md', 'aria-label': 'Demo input' },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    type: { control: 'select', options: ['text', 'email', 'password', 'number', 'tel', 'url'] },
    invalid: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

const Col = ({ children }: { children: React.ReactNode }) => (
  <View gap={12} width={280}>
    {children}
  </View>
)

// Inline icons for the slots (no icon primitive yet).
const Search = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
    <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)
// A spinner for the async-validate loading state (lives in the `trailing` slot, per the contract).
const Spinner = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
    <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 12 12"
        to="360 12 12"
        dur="0.8s"
        repeatCount="indefinite"
      />
    </path>
  </svg>
)

export const Playground: Story = {}

export const Sizes: Story = {
  render: (args) => (
    <Col>
      <Input {...args} size="sm" placeholder="Small" />
      <Input {...args} size="md" placeholder="Medium" />
      <Input {...args} size="lg" placeholder="Large" />
    </Col>
  ),
}

export const WithValue: Story = { args: { value: 'Ada Lovelace' } }

export const Empty: Story = {
  // empty state — placeholder shown in muted text, never as the value.
  args: { value: '', placeholder: 'Placeholder (muted, not the value)' },
}

export const WithSlots: Story = {
  render: (args) => (
    <Col>
      <Input {...args} leading={<Search />} placeholder="Leading icon" />
      <Input {...args} trailing={<Search />} placeholder="Trailing icon" />
    </Col>
  ),
}

export const Password: Story = { args: { type: 'password', value: 'hunter2' } }

export const Invalid: Story = {
  // error state — danger border + aria-invalid; the error TEXT is consumer-owned (linked via aria-describedby).
  render: (args) => (
    <Col>
      <Input {...args} invalid value="not-an-email" aria-describedby="demo-err" />
      {/* Error text is CONSUMER-owned (contract: Input forwards aria-describedby; a FormField wrapper renders this). */}
      <Text id="demo-err" color="$colorSignalDanger" fontFamily="$body" fontSize="$caption">
        Enter a valid email address.
      </Text>
    </Col>
  ),
}

export const Disabled: Story = { args: { disabled: true, value: 'Disabled' } }

export const ReadOnly: Story = { args: { readOnly: true, value: 'Read only' } }

export const Loading: Story = {
  // loading — spinner in the trailing slot + aria-busy (contract input.md:40; no `loading` prop).
  args: { value: 'checking…', trailing: <Spinner />, 'aria-busy': true },
}

// States matrix — the at-a-glance Visual Gate surface (review in both themes).
export const Matrix: Story = {
  render: () => (
    <Col>
      <Input aria-label="Default" placeholder="Default" />
      <Input aria-label="Filled" value="With value" />
      <Input aria-label="Invalid" invalid value="Invalid" />
      <Input aria-label="Disabled" disabled value="Disabled" />
      <Input aria-label="Read only" readOnly value="Read only" />
      <Input aria-label="With slots" leading={<Search />} trailing={<Spinner />} placeholder="Slots" />
    </Col>
  ),
}
