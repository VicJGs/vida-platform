import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { Menu, type MenuItem } from './menu'
import { Button } from './button'

// UI-1 · Menu stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark) to review both.
//
// MEASURE items (u7-menu.md §8 + §10/§16): the panel sits UNDER the trigger per `placement` (and FLIPS near a viewport
// edge) · item hover/roving highlight (`menu.itemBackgroundHover`) · a DANGER item's label is red (`signal.danger`) ·
// a disabled item is muted + skipped by ↑/↓ · the empty menu shows a muted "No actions" row · the panel ENTERS with
// opacity + a small translate from the trigger edge (transform/opacity only — B12), instant under reduced-motion ·
// Esc closes and returns focus to the trigger · both themes correct.

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View gap={8} marginBottom={40}>
    <Text fontSize={12} opacity={0.6} color="$colorTextPrimary">
      {label}
    </Text>
    {children}
  </View>
)

// A tiny leading glyph for the icon slot.
const Dot = ({ color = '$colorTextMuted' }: { color?: string }) => (
  <View width={14} height={14} borderRadius={7} backgroundColor={color} />
)

const ITEMS: MenuItem[] = [
  { id: 'edit', label: 'Edit', onSelect: () => {} },
  { id: 'duplicate', label: 'Duplicate', onSelect: () => {} },
  { id: 'archive', label: 'Archive', onSelect: () => {} },
  { id: 'delete', label: 'Delete', intent: 'danger', onSelect: () => {} },
]

const meta = {
  title: 'Primitives/Menu',
  component: Menu,
  // Default required props so `render`-only stories type-check; each story overrides via its own JSX.
  args: {
    items: ITEMS,
    trigger: <Button intent="secondary">Actions</Button>,
    'aria-label': 'Actions',
  },
  argTypes: {
    placement: {
      control: 'inline-radio',
      options: ['bottom-start', 'bottom-end', 'top-start', 'top-end'],
    },
  },
} satisfies Meta<typeof Menu>

export default meta
type Story = StoryObj<typeof meta>

// Playground — open it, arrow through, watch the highlight follow roving focus; delete is red.
export const Playground: Story = {
  args: { placement: 'bottom-start' },
  render: (args) => (
    <View height={320} paddingTop={24}>
      <Menu {...args} />
    </View>
  ),
}

// States — default items, a disabled one (skipped by ↑/↓), and a danger item (red label).
export const States: Story = {
  render: () => (
    <Section label="default · disabled (muted, skipped) · danger (red label) — open + arrow to see the roving highlight">
      <View height={320} paddingTop={8}>
        <Menu
          aria-label="Row actions"
          trigger={<Button intent="secondary">Row actions ▾</Button>}
          items={[
            { id: 'open', label: 'Open', onSelect: () => {} },
            { id: 'rename', label: 'Rename', onSelect: () => {} },
            { id: 'share', label: 'Share (unavailable)', disabled: true, onSelect: () => {} },
            { id: 'remove', label: 'Remove', intent: 'danger', onSelect: () => {} },
          ]}
        />
      </View>
    </Section>
  ),
}

// Leading icons — the `leading` slot.
export const WithIcons: Story = {
  render: () => (
    <Section label="leading icon slot">
      <View height={320} paddingTop={8}>
        <Menu
          aria-label="Item actions"
          trigger={<Button intent="secondary">With icons ▾</Button>}
          items={[
            { id: 'edit', label: 'Edit', leading: <Dot />, onSelect: () => {} },
            { id: 'duplicate', label: 'Duplicate', leading: <Dot />, onSelect: () => {} },
            {
              id: 'delete',
              label: 'Delete',
              intent: 'danger',
              leading: <Dot color="$colorSignalDanger" />,
              onSelect: () => {},
            },
          ]}
        />
      </View>
    </Section>
  ),
}

// Placements — the four anchor corners. `bottom-end`/`top-end` align the panel's right edge to the trigger's;
// `top-*` open UPWARD. Triggers are centred vertically so both directions have room (near a viewport edge the panel
// FLIPS to the side with space — that's by design, not a bug).
export const Placements: Story = {
  render: () => (
    <View height={520} justifyContent="center" paddingHorizontal={48}>
      <View flexDirection="row" flexWrap="wrap" gap={48}>
        {(['bottom-start', 'bottom-end', 'top-start', 'top-end'] as const).map((p) => (
          <Menu
            key={p}
            placement={p}
            aria-label={p}
            trigger={<Button intent="secondary">{p} ▾</Button>}
            items={ITEMS}
          />
        ))}
      </View>
    </View>
  ),
}

// Empty — no items → a muted, non-interactive "No actions" row.
export const Empty: Story = {
  render: () => (
    <Section label='empty — a muted "No actions" placeholder row (a real disabled menuitem, axe-clean)'>
      <View height={200} paddingTop={8}>
        <Menu aria-label="No actions" trigger={<Button intent="secondary">Empty ▾</Button>} items={[]} />
      </View>
    </Section>
  ),
}

// Controlled — external open state; onOpenChange drives the parent.
export const Controlled: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <Section label={`controlled — open: ${open}`}>
        <View height={320} paddingTop={8}>
          <Menu
            open={open}
            onOpenChange={setOpen}
            aria-label="Controlled actions"
            trigger={<Button intent="secondary">{open ? 'Close' : 'Open'} ▾</Button>}
            items={ITEMS}
          />
        </View>
      </Section>
    )
  },
}
