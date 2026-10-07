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
    {/* Story-label scaffolding — a muted token at FULL opacity (opacity:0.6 dipped to ~4.48 in quietDesk/light, an
        axe color-contrast flag on the harness chrome, not the Card). */}
    <Text fontSize={12} color="$colorTextMuted">
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

// ── fe-codec-primitives-refinement · P2 — the editorial content vocabulary + the Layer-2 alive-hooks ──────────────
// The editorial typography (eyebrow · serif title · tabular meta) is CONSUMER-COMPOSED via slots (Card ships the chrome);
// the Ring is a consumer-fed `metric`. Token-driven (conic-gradient reads the CSS vars → reacts to preset + mode).
const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <Text
    fontFamily="$body"
    fontSize={11}
    fontWeight="700"
    color="$colorTextMuted"
    textTransform="uppercase"
    letterSpacing={1.4}
  >
    {children}
  </Text>
)
const SerifTitle = ({ children }: { children: React.ReactNode }) => (
  <Text fontFamily="$display" fontSize={18} fontWeight="500" color="$colorTextPrimary" letterSpacing={-0.2}>
    {children}
  </Text>
)
const TabularMeta = ({ children }: { children: React.ReactNode }) => (
  <Text fontSize={13} color="$colorTextMuted" style={{ fontVariantNumeric: 'tabular-nums' }}>
    {children}
  </Text>
)
// A glanceable progress ring (the `metric` slot). Conic-gradient reads token CSS vars; the hole uses the surface token.
const Ring = ({ value }: { value: number }) => (
  <View
    width={40}
    height={40}
    borderRadius={9999}
    alignItems="center"
    justifyContent="center"
    style={{ background: `conic-gradient(var(--color-brand-primary) ${value}%, var(--color-surface-secondary) 0)` }}
  >
    <View
      width={30}
      height={30}
      borderRadius={9999}
      backgroundColor="$colorSurfacePrimary"
      alignItems="center"
      justifyContent="center"
    >
      <Text fontSize={11} fontWeight="700" color="$colorTextPrimary" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Text>
    </View>
  </View>
)

// Editorial composition — eyebrow + serif title (in header) · Ring metric (top-right) · headerDivider · tabular footer.
export const EditorialComposition: Story = {
  render: () => (
    <Section label="editorial — eyebrow · serif title · ring metric · header divider · tabular meta">
      <View width={360}>
        <Card
          status="calm"
          headerDivider
          header={
            <View gap={2}>
              <Eyebrow>Career</Eyebrow>
              <SerifTitle>Ship the primitives</SerifTitle>
            </View>
          }
          metric={<Ring value={68} />}
          footer={<TabularMeta>Updated 2 hours ago · 12 tasks</TabularMeta>}
        >
          <Body>Revenue is up 12% versus last month across all tracked accounts.</Body>
        </Card>
      </View>
    </Section>
  ),
}

// Alive — the `status` signal set + the `metric` ring (the micro-dashboard). calm · warm · faded · neutral.
export const Alive: Story = {
  render: () => (
    <Section label="alive — status: calm · warm · faded · neutral (+ ring metric)">
      <View width={240}>
        <Card status="calm" header={<SerifTitle>On track</SerifTitle>} metric={<Ring value={68} />}>
          <TabularMeta>Last touched 1d ago</TabularMeta>
        </Card>
      </View>
      <View width={240}>
        <Card status="warm" header={<SerifTitle>Cooling</SerifTitle>} metric={<Ring value={30} />}>
          <TabularMeta>Last touched 12d ago</TabularMeta>
        </Card>
      </View>
      <View width={240}>
        <Card status="faded" header={<SerifTitle>Neglected</SerifTitle>}>
          <TabularMeta>Last touched 94d ago</TabularMeta>
        </Card>
      </View>
      <View width={240}>
        <Card status="neutral" header={<SerifTitle>Neutral</SerifTitle>}>
          <TabularMeta>No signal</TabularMeta>
        </Card>
      </View>
    </Section>
  ),
}

// Repeated rows — the BR-C-11 landmark cell: N interactive cards each with header + footer. header/footer are plain
// <div>s now, so there are NO duplicate banner/contentinfo landmarks (the exact P1-gate violation shape). axe must be 0.
export const RepeatedRows: Story = {
  render: () => (
    <View role="list" aria-label="Projects" width={420} gap={12}>
      {[
        { id: '1', title: 'Primitives', meta: '3 of 5 complete', status: 'calm' as const },
        { id: '2', title: 'App shell', meta: '1 of 4 complete', status: 'warm' as const },
        { id: '3', title: 'Sync scaffolding', meta: 'not started', status: 'neutral' as const },
        { id: '4', title: 'Archived spike', meta: 'closed', status: 'faded' as const },
      ].map((row) => (
        <View key={row.id} role="listitem">
          <Card
            interactive
            onPress={() => {}}
            status={row.status}
            header={<SerifTitle>{row.title}</SerifTitle>}
            footer={<TabularMeta>{row.meta}</TabularMeta>}
          >
            <Body>A repeated row — header/footer are non-landmark regions (BR-C-11).</Body>
          </Card>
        </View>
      ))}
    </View>
  ),
}
