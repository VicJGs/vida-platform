import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { Tabs } from './tabs'

// UI-1 · Tabs stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark) to review both.
//
// MEASURE items (u6-tabs.md §8 + §10/§16): the 1px baseline rule under the strip · muted vs active label colour ·
// the indicator sitting UNDER the active tab · the indicator SLIDING (transform) when you arrow/click between tabs —
// and RESIZING instantly to the new tab's width (never a left/width crawl) · focus ring (Tab to the strip, arrow
// between) · a disabled tab (muted, skipped by arrows) · Tab moves focus INTO the panel · vertical orientation ·
// sizes · a loading panel (consumer skeleton + aria-busy).

const Body = ({ children }: { children: React.ReactNode }) => (
  <Text fontSize={14} color="$colorTextMuted">
    {children}
  </Text>
)
const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View gap={8} marginBottom={32}>
    <Text fontSize={12} opacity={0.6} color="$colorTextPrimary">
      {label}
    </Text>
    {children}
  </View>
)

const ITEMS = [
  { value: 'overview', label: 'Overview' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'reports', label: 'Reports' },
  { value: 'settings', label: 'Settings' },
]

const meta = {
  title: 'Primitives/Tabs',
  component: Tabs,
  // Default required props so `render`-only stories type-check; each story overrides via its own JSX.
  args: { items: ITEMS, children: null },
  argTypes: {
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

// Playground — drive orientation/size from the controls; arrow/click to watch the indicator slide + resize.
export const Playground: Story = {
  args: { orientation: 'horizontal', size: 'md' },
  render: (args) => (
    <View width={520}>
      <Tabs {...args} items={ITEMS} defaultValue="overview">
        <Tabs.Panel value="overview">
          <Body>Overview — the whole picture at a glance.</Body>
        </Tabs.Panel>
        <Tabs.Panel value="analytics">
          <Body>Analytics — charts and trends over time.</Body>
        </Tabs.Panel>
        <Tabs.Panel value="reports">
          <Body>Reports — export and share.</Body>
        </Tabs.Panel>
        <Tabs.Panel value="settings">
          <Body>Settings — configure the workspace.</Body>
        </Tabs.Panel>
      </Tabs>
    </View>
  ),
}

// States — the indicator under the active tab, muted vs active labels, a disabled tab (arrows skip it).
export const States: Story = {
  render: () => (
    <Section label="default · active (indicator) · disabled (muted, skipped by ←/→) — arrow between to see the slide">
      <View width={520}>
        <Tabs
          items={[
            { value: 'a', label: 'Active + first' },
            { value: 'b', label: 'Second' },
            { value: 'c', label: 'Disabled', disabled: true },
            { value: 'd', label: 'Last' },
          ]}
          defaultValue="a"
        >
          <Tabs.Panel value="a">
            <Body>Panel A. Use ←/→ to move — the disabled tab is skipped; Tab moves focus in here.</Body>
          </Tabs.Panel>
          <Tabs.Panel value="b">
            <Body>Panel B.</Body>
          </Tabs.Panel>
          <Tabs.Panel value="c">
            <Body>Panel C (unreachable — its tab is disabled).</Body>
          </Tabs.Panel>
          <Tabs.Panel value="d">
            <Body>Panel D.</Body>
          </Tabs.Panel>
        </Tabs>
      </View>
    </Section>
  ),
}

// Sizes — padding + label scale.
export const Sizes: Story = {
  render: () => (
    <View gap={32}>
      {(['sm', 'md', 'lg'] as const).map((s) => (
        <Section key={s} label={`size: ${s}`}>
          <View width={480}>
            <Tabs items={ITEMS} defaultValue="overview" size={s}>
              {ITEMS.map((it) => (
                <Tabs.Panel key={it.value} value={it.value}>
                  <Body>{it.label} panel.</Body>
                </Tabs.Panel>
              ))}
            </Tabs>
          </View>
        </Section>
      ))}
    </View>
  ),
}

// Vertical — arrow keys become ↑/↓, indicator + baseline on the inline-start edge.
export const Vertical: Story = {
  render: () => (
    <Section label="orientation: vertical — ↑/↓ move; indicator on the left edge">
      <View width={520}>
        <Tabs items={ITEMS} defaultValue="analytics" orientation="vertical">
          {ITEMS.map((it) => (
            <Tabs.Panel key={it.value} value={it.value}>
              <Body>{it.label} panel content.</Body>
            </Tabs.Panel>
          ))}
        </Tabs>
      </View>
    </Section>
  ),
}

// Controlled — external state; onValueChange drives the parent.
export const Controlled: Story = {
  render: () => {
    const [tab, setTab] = useState('analytics')
    return (
      <Section label={`controlled — current: ${tab}`}>
        <View width={520}>
          <Tabs items={ITEMS} value={tab} onValueChange={setTab}>
            {ITEMS.map((it) => (
              <Tabs.Panel key={it.value} value={it.value}>
                <Body>{it.label} — controlled by the parent.</Body>
              </Tabs.Panel>
            ))}
          </Tabs>
        </View>
      </Section>
    )
  },
}

// Loading — consumer-composed: a skeleton as the panel's children + aria-busy passthrough (DEF-U6-c). Static bars
// (no shimmer — B12 / reduced-motion safe).
export const LoadingPanel: Story = {
  render: () => (
    <Section label="loading — consumer skeleton in a panel + aria-busy (DEF-U6-c)">
      <View width={520}>
        <Tabs items={ITEMS} defaultValue="reports">
          <Tabs.Panel value="overview">
            <Body>Overview.</Body>
          </Tabs.Panel>
          <Tabs.Panel value="analytics">
            <Body>Analytics.</Body>
          </Tabs.Panel>
          <Tabs.Panel value="reports" aria-busy>
            <View gap={8} paddingTop={4}>
              <View height={12} width="60%" borderRadius={4} backgroundColor="$colorSurfaceSecondary" />
              <View height={12} width="90%" borderRadius={4} backgroundColor="$colorSurfaceSecondary" />
              <View height={12} width="75%" borderRadius={4} backgroundColor="$colorSurfaceSecondary" />
            </View>
          </Tabs.Panel>
          <Tabs.Panel value="settings">
            <Body>Settings.</Body>
          </Tabs.Panel>
        </Tabs>
      </View>
    </Section>
  ),
}
