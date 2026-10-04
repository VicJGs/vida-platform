import type { Meta, StoryObj } from '@storybook/react-vite'
import { View } from '@tamagui/core'
import { SyncStatus, HonestProgress } from './sync-status'

// fe-codec-patterns · S4 — SyncStatus + HonestProgress stories = the Visual Gate surface. Toggle the toolbar
// Preset × Theme. MEASURE (s4-sync-status.md §4): the dot SIGNAL tokens hold across presets (preset-invariant);
// label + surface swap with mode; calm never-alarming chip; honest determinate + indeterminate progress; AA on the
// label both modes. HONESTY: copy says "Saved on this device", never "synced to cloud"; no "Saving…" state.

const meta = {
  title: 'Patterns/SyncStatus',
  component: SyncStatus,
} satisfies Meta<typeof SyncStatus>

export default meta
type Story = StoryObj<typeof meta>

export const Saved: Story = { args: { state: 'saved' } }
export const Errored: Story = { args: { state: 'error' } }

export const Matrix: StoryObj = {
  render: () => (
    <View gap={16} width={360}>
      <SyncStatus state="saved" />
      <SyncStatus state="error" />
      <HonestProgress label="Rebuilding search index…" value={0.35} />
      <HonestProgress label="Exporting your notes…" value={0.8} />
      <HonestProgress label="Unlocking your vault…" indeterminate />
    </View>
  ),
}
