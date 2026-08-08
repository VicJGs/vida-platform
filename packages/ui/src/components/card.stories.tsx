import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { Card } from './card'
import { Button } from './button'

// UI-1 · Card stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark) to review both
// modes. Card is a static container; its interactive states apply ONLY when `interactive`.
//
// MEASURE items (u5-card.md §8 + §10): resting surface/border/radius/padding · header + actions + footer layout ·
// hover raise (LIGHT = raised-shadow overlay fades in · DARK = the shadow self-cancels, so the border strengthens —
// confirm dark elevation reads via BORDER, not a visible drop shadow) · focus ring (Tab to a card) · disabled muted ·
// the consumer-composed empty + loading states · padding compact/default/spacious.

const Title = ({ children }: { children: React.ReactNode }) => (
  <Text fontFamily="$display" fontSize={16} fontWeight="600" color="$colorTextPrimary">
    {children}
  </Text>
)
const Body = ({ children }: { children: React.ReactNode }) => (
  <Text fontSize={14} color="$colorTextMuted">
    {children}
  </Text>
)
const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View gap={8} marginBottom={24}>
    <Text fontSize={12} opacity={0.6} color="$colorTextPrimary">
      {label}
    </Text>
    <View flexDirection="row" alignItems="flex-start" gap={24} flexWrap="wrap">
      {children}
    </View>
  </View>
)

const meta = {
  title: 'Primitives/Card',
  component: Card,
  argTypes: {
    padding: { control: 'select', options: ['compact', 'default', 'spacious'] },
    interactive: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

// Playground — drive padding/interactive/disabled from the controls.
export const Playground: Story = {
  args: { interactive: false, padding: 'default' },
  render: (args) => (
    <View width={320}>
      <Card {...args} header={<Title>Monthly report</Title>} footer={<Body>Updated 2 hours ago</Body>}>
        <Body>Revenue is up 12% versus last month across all tracked accounts.</Body>
      </Card>
    </View>
  ),
}

// Full anatomy — header + actions (top-right) + body + footer.
export const Anatomy: Story = {
  render: () => (
    <Section label="header · actions (top-right) · body · footer">
      <View width={360}>
        <Card
          header={<Title>Q3 Objectives</Title>}
          actions={
            <Button intent="ghost" size="sm" aria-label="Edit">
              Edit
            </Button>
          }
          footer={<Body>3 of 5 complete</Body>}
        >
          <Body>Ship the primitives, wire the app shell, and close the sync scaffolding.</Body>
        </Card>
      </View>
    </Section>
  ),
}

// Interactive — hover (light: shadow raise / dark: border strengthen), focus (Tab in), press, disabled.
export const Interactive: Story = {
  render: () => (
    <Section label="interactive — hover · Tab for focus ring · press · disabled">
      <View width={240}>
        <Card interactive onPress={() => {}} header={<Title>Open project</Title>}>
          <Body>Hover to raise, Tab to focus, click/Enter/Space to activate.</Body>
        </Card>
      </View>
      <View width={240}>
        <Card interactive disabled onPress={() => {}} header={<Title>Disabled</Title>}>
          <Body>Muted, not focusable, no hover.</Body>
        </Card>
      </View>
      <View width={280}>
        <Card
          interactive
          onPress={() => {}}
          header={<Title>With actions</Title>}
          actions={
            <Button intent="ghost" size="sm" onPress={() => {}} aria-label="More">
              •••
            </Button>
          }
        >
          <Body>The whole card is pressable; the action stays independent (does not fire the card).</Body>
        </Card>
      </View>
    </Section>
  ),
}

// Padding scale.
export const Padding: Story = {
  render: () => (
    <Section label="padding: compact · default · spacious">
      {(['compact', 'default', 'spacious'] as const).map((p) => (
        <View key={p} width={200}>
          <Card padding={p} header={<Title>{p[0].toUpperCase() + p.slice(1)}</Title>}>
            <Body>Inset padding {p}.</Body>
          </Card>
        </View>
      ))}
    </Section>
  ),
}

// empty — the consumer renders their empty-state as children (Card owns no `empty` prop; §2.2).
export const Empty: Story = {
  render: () => (
    <Section label="empty — consumer's empty-state in children">
      <View width={280}>
        <Card header={<Title>Recent activity</Title>}>
          <View alignItems="center" paddingVertical={24} gap={4}>
            <Body>No activity yet</Body>
            <Text fontSize={12} color="$colorTextMuted">
              Interactions will appear here.
            </Text>
          </View>
        </Card>
      </View>
    </Section>
  ),
}

// loading — consumer composition (no `loading` prop; §VIII-vs-API gap = DEF-U5-f): a skeleton as children +
// aria-busy passed through. Static bars (no shimmer — B12 / reduced-motion safe), reserving layout.
export const Loading: Story = {
  render: () => (
    <Section label="loading — consumer-composed skeleton + aria-busy (DEF-U5-f)">
      <View width={280}>
        <Card header={<Title>Loading…</Title>} aria-busy>
          <View gap={8}>
            <View height={12} width="60%" borderRadius={4} backgroundColor="$colorSurfaceSecondary" />
            <View height={12} width="90%" borderRadius={4} backgroundColor="$colorSurfaceSecondary" />
            <View height={12} width="75%" borderRadius={4} backgroundColor="$colorSurfaceSecondary" />
          </View>
        </Card>
      </View>
    </Section>
  ),
}
