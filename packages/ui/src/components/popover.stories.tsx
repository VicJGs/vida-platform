import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { Popover } from './popover'
import { Button } from './button'
import { Input } from './input'

// UI-1 · Popover stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark) to review both.
//
// MEASURE items (u9-popover.md §9 + popover.md): the panel is a non-modal surface anchored to the trigger with an
// ARROW pointing at it · it enters with opacity + scale(0.96→1) FROM the anchor edge (transform/opacity only — B12,
// instant under reduced motion) · focus MOVES into the panel (the first input focuses) but is NOT trapped — Tab out
// of the panel CLOSES it (the page behind stays interactive) · Esc closes + returns focus to the trigger · all 8
// placements resolve and FLIP near a viewport edge (left/right included) · both themes correct.

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View gap={8} marginBottom={40}>
    <Text fontSize={12} opacity={0.6} color="$colorTextPrimary">
      {label}
    </Text>
    {children}
  </View>
)

// A little interactive content block — proves the popover is NON-modal + interactive (focusable inputs inside).
const FilterContent = () => (
  <View gap={12} width={240}>
    <Text fontSize={14} fontWeight="600" color="$colorTextPrimary">
      Filter
    </Text>
    <Input placeholder="Search…" aria-label="Search" />
    <View flexDirection="row" gap={8} justifyContent="flex-end">
      <Button intent="ghost" size="sm">
        Reset
      </Button>
      <Button intent="primary" size="sm">
        Apply
      </Button>
    </View>
  </View>
)

const meta = {
  title: 'Primitives/Popover',
  component: Popover,
  args: {
    trigger: <Button intent="secondary">Open popover ▾</Button>,
    'aria-label': 'Details',
    children: (
      <View width={240} gap={8}>
        <Text fontSize={14} fontWeight="600" color="$colorTextPrimary">
          Popover title
        </Text>
        <Text fontSize={13} color="$colorTextMuted">
          Non-modal content anchored to the trigger. The page behind stays interactive.
        </Text>
      </View>
    ),
  },
  argTypes: {
    placement: {
      control: 'inline-radio',
      options: ['top', 'bottom', 'left', 'right', 'bottom-start', 'bottom-end', 'top-start', 'top-end'],
    },
  },
} satisfies Meta<typeof Popover>

export default meta
type Story = StoryObj<typeof meta>

// Playground — open it; the arrow points at the trigger; the panel enters with scale+fade from the anchor edge.
export const Playground: Story = {
  args: { placement: 'bottom' },
  render: (args) => (
    <View height={360} justifyContent="center" alignItems="center">
      <Popover {...args} />
    </View>
  ),
}

// Interactive content — a filter form INSIDE the popover. Focus enters the Search input; Tab through it; Tab past the
// last control CLOSES the popover (non-modal, not trapped). The page behind stays live.
export const InteractiveContent: Story = {
  render: () => (
    <Section label="non-modal · interactive — focus enters the Search field; Tab out of the panel closes it; the input below stays reachable">
      <View height={360} gap={16} alignItems="flex-start">
        <Popover aria-label="Filter" trigger={<Button intent="secondary">Filter ▾</Button>}>
          <FilterContent />
        </Popover>
        <Input placeholder="A field behind the popover (still interactive)" aria-label="Behind" />
      </View>
    </Section>
  ),
}

// Placements — all 8 anchors. left/right anchor to the SIDE (horizontal primary axis); each arrow points at its
// trigger. Near a viewport edge the panel FLIPS to the side with space (by design).
export const Placements: Story = {
  render: () => (
    <View height={560} justifyContent="center" paddingHorizontal={64}>
      <View flexDirection="row" flexWrap="wrap" gap={56}>
        {(['top', 'bottom', 'left', 'right', 'bottom-start', 'bottom-end', 'top-start', 'top-end'] as const).map((p) => (
          <Popover
            key={p}
            placement={p}
            aria-label={p}
            trigger={<Button intent="secondary">{p} ▾</Button>}
          >
            <View width={180}>
              <Text fontSize={13} color="$colorTextPrimary">
                placement=&quot;{p}&quot;
              </Text>
            </View>
          </Popover>
        ))}
      </View>
    </View>
  ),
}

// Loading — consumer-composed (no `loading` prop): a spinner/skeleton passed as children with aria-busy on it.
export const Loading: Story = {
  render: () => (
    <Section label="loading — consumer-composed skeleton in children (no loading prop; DEF-U9-c)">
      <View height={300} alignItems="flex-start">
        <Popover aria-label="Loading details" trigger={<Button intent="secondary">Load ▾</Button>}>
          <View width={220} gap={8} aria-busy="true">
            <View height={12} borderRadius={4} backgroundColor="$colorBorderDefault" />
            <View height={12} width="80%" borderRadius={4} backgroundColor="$colorBorderDefault" />
            <View height={12} width="60%" borderRadius={4} backgroundColor="$colorBorderDefault" />
          </View>
        </Popover>
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
        <View height={320} alignItems="flex-start">
          <Popover
            open={open}
            onOpenChange={setOpen}
            aria-label="Controlled"
            trigger={<Button intent="secondary">{open ? 'Close' : 'Open'} ▾</Button>}
          >
            <View width={220}>
              <Text fontSize={13} color="$colorTextPrimary">
                Controlled popover content.
              </Text>
            </View>
          </Popover>
        </View>
      </Section>
    )
  },
}
