import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { Switch } from './switch'

// UI-1 · Switch stories — the component Visual Gate surface (fe-settings S1, EC-3). Toggle the toolbar Theme
// (light｜dark) + switch the preset (reader/editorial/quietDesk via the <body> class) to review the on-track accent flip.
//
// MEASURE (s1-switch.md §4): off/on track + knob slide · hover border-strengthen · focus-visible ring · disabled muted ·
// invalid danger border · ON track flips per preset (editorial blue / reader oxblood / quietDesk olive) · label AA ·
// lg touch target ≈ 44×44 · reduced-motion = instant knob.

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View gap={8} marginBottom={24}>
    <Text fontSize={12} color="$colorTextMuted">
      {label}
    </Text>
    <View flexDirection="row" alignItems="center" gap={24} flexWrap="wrap">
      {children}
    </View>
  </View>
)

const meta = {
  title: 'Primitives/Switch',
  component: Switch,
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
  },
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: { label: 'Reduce motion', size: 'md' },
}

export const States: Story = {
  render: () => (
    <View gap={8}>
      <Row label="off / on">
        <Switch label="Off" />
        <Switch label="On" defaultChecked />
      </Row>
      <Row label="disabled (off / on)">
        <Switch label="Disabled off" disabled />
        <Switch label="Disabled on" disabled defaultChecked />
      </Row>
      <Row label="invalid">
        <Switch label="Invalid" invalid />
        <Switch label="Invalid on" invalid defaultChecked />
      </Row>
      <Row label="sizes (sm · md · lg)">
        <Switch aria-label="sm" size="sm" defaultChecked />
        <Switch aria-label="md" size="md" defaultChecked />
        <Switch aria-label="lg" size="lg" defaultChecked />
      </Row>
    </View>
  ),
}
