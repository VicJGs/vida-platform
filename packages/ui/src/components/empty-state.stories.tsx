import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { EmptyState } from './empty-state'
import { Button } from './button'

// fe-codec-patterns · S3 — EmptyState stories = the component Visual Gate surface. Toggle the toolbar Theme
// (light｜dark) AND Preset (reader｜editorial｜quietDesk) to review the matrix.
//
// MEASURE (s3-empty-state.md §4): the teaching anatomy (art · heading · body · actions · guided) · tokens swap with
// mode + preset (no hard-coded color) · body measure capped (~60ch) · the heading reads as a heading (SR) · the
// "honest invitation, never 'No data available'" voice · responsive 375/768/1440 (resize the viewport).

const meta = {
  title: 'Patterns/EmptyState',
  component: EmptyState,
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

// The P5 specimen's cold-start Finance surface (p5-discover-own-specimen.html:159-166) — the full anatomy.
export const ColdStart: Story = {
  args: {
    icon: <Text fontSize={40}>◷</Text>,
    title: 'Your Finance is a clean page.',
    children:
      "Import a bank statement to reconcile automatically, or add your first account by hand. Nothing's required — start where you like.",
    action: (
      <>
        <Button intent="primary" onPress={() => {}}>
          Import statement
        </Button>
        <Button intent="ghost" onPress={() => {}}>
          Add account
        </Button>
      </>
    ),
    guidedSetup: (
      <Text fontSize="$small" color="$colorTextMuted">
        Prefer a hand?{' '}
        <Text color="$colorBrandPrimary" tag="span">
          Start guided setup →
        </Text>{' '}
        (optional, skippable)
      </Text>
    ),
  },
}

// Minimal — title + one action only (a leaf list's empty slot).
export const Minimal: Story = {
  args: {
    title: 'No tasks yet.',
    children: 'Tasks you add — or that flow in from projects and learning — show up here.',
    action: (
      <Button intent="primary" onPress={() => {}}>
        Add a task
      </Button>
    ),
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
    icon: <Text fontSize={40}>✎</Text>,
    title: 'Nothing here to read yet.',
    children: 'Add a book or import a reading list to start your shelf.',
    action: (
      <Button intent="primary" onPress={() => {}}>
        Add a book
      </Button>
    ),
  },
}
