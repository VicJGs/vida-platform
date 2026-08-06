import type { Meta, StoryObj } from '@storybook/react-vite'
import { View } from '@tamagui/core'
import { Button } from './button'

// UI-1 · Button stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark) to review
// both modes. Resting states (default/disabled/loading) are shown explicitly; hover/focus/active are verified
// live (hover the mouse, Tab to focus, press) — they have no static story without a pseudo-forcing addon.
//
// KNOWN addon-a11y flag (expected, NOT a U1 defect): filled `danger` fails AA contrast (white on
// signal.danger #EF4444 ≈ 3.5:1). This is a provisional-palette item deferred to the DS-2 brand pass
// (ds-5 button.md:63-68, acceptance :108 — filled-danger is withheld until a danger.600 emphasis token
// meets AA). The check is left ON (honest) rather than suppressed.

const meta = {
  title: 'Primitives/Button',
  component: Button,
  args: { children: 'Button', intent: 'primary', size: 'md' },
  argTypes: {
    intent: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

const Row = ({ children }: { children: React.ReactNode }) => (
  <View flexDirection="row" alignItems="center" gap={12} flexWrap="wrap">
    {children}
  </View>
)

// A tiny inline icon to exercise the leading/trailing slots.
const Dot = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="6" fill="currentColor" />
  </svg>
)

export const Playground: Story = {}

export const Intents: Story = {
  render: (args) => (
    <Row>
      <Button {...args} intent="primary">
        Primary
      </Button>
      <Button {...args} intent="secondary">
        Secondary
      </Button>
      <Button {...args} intent="ghost">
        Ghost
      </Button>
      <Button {...args} intent="danger">
        Danger
      </Button>
    </Row>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <Row>
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
    </Row>
  ),
}

export const WithIcons: Story = {
  render: (args) => (
    <Row>
      <Button {...args} leading={<Dot />}>
        Leading
      </Button>
      <Button {...args} trailing={<Dot />}>
        Trailing
      </Button>
      <Button {...args} intent="ghost" leading={<Dot />} aria-label="Icon only" />
    </Row>
  ),
}

export const Disabled: Story = { args: { disabled: true } }

export const Loading: Story = {
  render: (args) => (
    <Row>
      <Button {...args} loading>
        Saving
      </Button>
      <Button {...args} intent="secondary" loading>
        Saving
      </Button>
    </Row>
  ),
}

export const FullWidth: Story = {
  args: { fullWidth: true },
  render: (args) => (
    <View width={320}>
      <Button {...args} />
    </View>
  ),
}

// Intents × resting states — the at-a-glance matrix for the Visual Gate (review in both themes).
export const Matrix: Story = {
  render: () => {
    const intents = ['primary', 'secondary', 'ghost', 'danger'] as const
    return (
      <View gap={12}>
        {intents.map((intent) => (
          <Row key={intent}>
            <Button intent={intent}>Default</Button>
            <Button intent={intent} disabled>
              Disabled
            </Button>
            <Button intent={intent} loading>
              Loading
            </Button>
            <Button intent={intent} leading={<Dot />}>
              Icon
            </Button>
          </Row>
        ))}
      </View>
    )
  },
}
