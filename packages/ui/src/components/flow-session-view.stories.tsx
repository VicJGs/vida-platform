import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text } from '@tamagui/core'
import { FlowSessionView, type FlowStage, type FlowEffect } from './flow-session-view'
import { SyncStatus } from './sync-status'
import { Button } from './button'

// UI-2 · FlowSessionView stories — the component Visual Gate surface. Toggle the toolbar Theme (preset × light｜dark × density).
// The 4th archetype shell: a title-hero header + HonestProgress + the staged Timeline rail (done/current/upcoming + fulcrum)
// + per-stage body (renderStage) + standardized affordances (attach · mark-done · require-proof, emitting intents) + the
// read-only effect-rail log. MEASURE (flow-session-view.md EC-1…EC-11): serif $display title AA · progress BAR (not a text
// subtitle) 16px below · done ✓/proof · current emphasized w/ affordances · upcoming faded · effect log calm (empty teach) ·
// per-stage state degrade · type SCALE no px · preset accent flips · 375 no overflow.

const STAGES: FlowStage[] = [
  { id: 's1', label: 'Stage 1', title: 'Outline the chapter', status: 'done', proof: 'Delivered · outline.md' },
  { id: 's2', label: 'Stage 2', title: 'Draft 500 words', status: 'done', proof: 'Delivered · draft-v1.md' },
  { id: 's3', label: 'Stage 3', title: 'Record a read-through', status: 'current' },
  { id: 's4', label: 'Stage 4', title: 'Revise from the audio', status: 'upcoming' },
  { id: 's5', label: 'Stage 5', title: 'Mark the session complete', status: 'upcoming' },
]
const EFFECTS: FlowEffect[] = [
  { id: 'e1', kind: 'Logged time', detail: '25 min to “Write the book”' },
  { id: 'e2', kind: 'Measurement', detail: 'Words written +512' },
  { id: 'e3', kind: 'Experience', detail: '+15 · focus streak held' },
  { id: 'e4', kind: 'Journal', detail: 'Surfaced to today’s entry' },
]
const DESCRIPTIONS: Record<string, string> = {
  s3: 'A 2-minute audio read of the draft to catch the rhythm.',
  s4: 'Fix what the ear caught.',
  s5: 'Final proof, then close.',
}
const renderStage = (s: FlowStage) =>
  DESCRIPTIONS[s.id] ? (
    <Text fontSize="$body" color="$colorTextMuted">
      {DESCRIPTIONS[s.id]}
    </Text>
  ) : null

const noop = () => {}

const meta: Meta<typeof FlowSessionView> = {
  title: 'Platform Views/FlowSession',
  component: FlowSessionView,
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<typeof FlowSessionView>

const common = {
  title: 'Deep work — §3 draft',
  context: 'For “Write the book”',
  saveStatus: <SyncStatus status="saved" />,
  action: (
    <Button intent="ghost" size="sm" onPress={noop}>
      ⋯
    </Button>
  ),
  renderStage,
  onMarkDone: noop,
  onRequireProof: noop,
  onAttach: noop,
}

export const FlowMultiStage: Story = { args: { ...common, stages: STAGES, effects: EFFECTS } }

export const FlowSingleStage: Story = {
  args: {
    title: 'Evening check-in',
    context: 'Today',
    saveStatus: <SyncStatus status="saved" />,
    renderStage: () => (
      <Text fontSize="$body" color="$colorTextMuted">
        Mood, energy, one gratitude, one reflection.
      </Text>
    ),
    onMarkDone: noop,
    stages: [{ id: 'only', label: 'Today', title: 'Evening check-in', status: 'current' }],
    effects: [],
    effectsState: 'empty',
  },
}

export const EffectLogEmpty: Story = { args: { ...common, stages: STAGES, effects: [], effectsState: 'empty' } }

export const StageStates: Story = {
  args: {
    ...common,
    stages: [
      { id: 's1', label: 'Stage 1', title: 'Outline', status: 'done', proof: 'Delivered · outline.md' },
      { id: 's2', label: 'Stage 2', title: 'Loading stage', status: 'current', state: 'loading' },
      { id: 's3', label: 'Stage 3', title: 'Errored stage', status: 'upcoming', state: 'error' },
    ],
    effects: EFFECTS.slice(0, 2),
  },
}
