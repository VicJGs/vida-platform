import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { EmptyState } from './empty-state'
import { Button } from './button'
import { slot } from '../../.storybook/controls'

// fe-codec-patterns · S3 — EmptyState stories = the component Visual Gate surface. Toggle the toolbar Theme
// (light｜dark) AND Preset (reader｜editorial｜quietDesk) to review the matrix.
//
// MEASURE: the teaching anatomy (art · heading · body · actions · guided) · tokens swap with
// mode + preset (no hard-coded color) · body measure capped (~60ch) · the heading reads as a heading (SR) · the
// "honest invitation, never 'No data available'" voice · responsive 375/768/1440 (resize the viewport).

// The node props are selects of named samples (see .storybook/controls.tsx), so every story's controls stay live.
const meta = {
  title: 'Patterns/EmptyState',
  component: EmptyState,
  argTypes: {
    children: { control: 'text' },
    icon: slot({ none: null, clock: <Text fontSize={40}>◷</Text>, pen: <Text fontSize={40}>✎</Text> }),
    action: slot({
      none: null,
      'import or add': (
        <>
          <Button intent="primary" onPress={() => {}}>
            Import statement
          </Button>
          <Button intent="ghost" onPress={() => {}}>
            Add account
          </Button>
        </>
      ),
      'add a task': (
        <Button intent="primary" onPress={() => {}}>
          Add a task
        </Button>
      ),
      'add a book': (
        <Button intent="primary" onPress={() => {}}>
          Add a book
        </Button>
      ),
    }),
    guidedSetup: slot({
      none: null,
      link: (
        <Text fontSize="$small" color="$colorTextMuted">
          Prefer a hand?{' '}
          <Text color="$colorBrandPrimary" tag="span">
            Start guided setup →
          </Text>{' '}
          (optional, skippable)
        </Text>
      ),
    }),
  },
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

// The P5 specimen's cold-start Finance surface (p5-discover-own-specimen.html:159-166) — the full anatomy.
export const ColdStart: Story = {
  args: {
    icon: 'clock',
    title: 'Your Finance is a clean page.',
    children:
      "Import a bank statement to reconcile automatically, or add your first account by hand. Nothing's required — start where you like.",
    action: 'import or add',
    guidedSetup: 'link',
  },
}

// Minimal — title + one action only (a leaf list's empty slot).
export const Minimal: Story = {
  args: {
    icon: 'none',
    title: 'No tasks yet.',
    children: 'Tasks you add — or that flow in from projects and learning — show up here.',
    action: 'add a task',
    guidedSetup: 'none',
  },
}

// In context — inside a bordered region, as it sits in a data-view's empty slot.
export const InDataViewSlot: Story = {
  render: (args) => (
    <View
      width="100%"
      maxWidth={640}
      borderWidth={1}
      borderColor="$colorBorderDefault"
      borderRadius="$lg"
      backgroundColor="$colorSurfacePrimary"
    >
      <EmptyState {...args} />
    </View>
  ),
  args: {
    icon: 'pen',
    title: 'Nothing here to read yet.',
    children: 'Add a book or import a reading list to start your shelf.',
    action: 'add a book',
    guidedSetup: 'none',
  },
}
