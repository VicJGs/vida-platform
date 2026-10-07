import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { DashboardView, type DashboardBlock } from './dashboard-view'
import { Button } from './button'

// UI-2 · fe-codec-dashboard · DashboardView stories — the component Visual-Gate surface. Toggle Preset × Mode × Density.
// DashboardView = the CODEC Dashboard shell ("a grid of integration blocks", decomposition.md:30 §1.2) — an RN-safe flex
// grid of size-enum span cells; each cell is a Card frame (title + ⋯ slot) with the block body via renderBlock.
//
// MEASURE (dashboard-view.md §4 / envision EC-1…EC-8): the heterogeneous span grid (sm/md/lg/full distinct · EC-1) ·
// Card cell frame + ⋯ slot (EC-2) · per-block state loading/empty/error/success INDEPENDENT (EC-3) · responsive reflow
// to single column at 375 no-overflow (EC-4/EC-8) · empty-dashboard teach (EC-5) · a lone non-full cell capped (EC-6) ·
// preset identity + dark elevation via border (EC-7). State-as-prop (BR-2). axe clean.

const Row = ({ when, what }: { when: string; what: string }) => (
  <View flexDirection="row" gap={10} paddingVertical={4}>
    <Text fontSize={13} color="$colorTextMuted" style={{ fontVariantNumeric: 'tabular-nums' }}>
      {when}
    </Text>
    <Text fontSize={13} color="$colorTextPrimary">
      {what}
    </Text>
  </View>
)
const Metric = ({ label, value }: { label: string; value: string }) => (
  <View>
    <Text
      fontFamily="$display"
      fontSize={28}
      fontWeight="700"
      color="$colorTextPrimary"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {value}
    </Text>
    <Text fontSize={12} color="$colorTextMuted">
      {label}
    </Text>
  </View>
)
const Check = ({ done, what }: { done: boolean; what: string }) => (
  <View flexDirection="row" gap={8} alignItems="center" paddingVertical={3}>
    {/* the filled vs hollow glyph carries the done state; text color stays AA-safe (signal tokens are tuned for fills,
        not text — a success-green glyph as TEXT fails 4.5). */}
    <Text fontSize={13} color={done ? '$colorTextPrimary' : '$colorTextMuted'}>
      {done ? '◉' : '○'}
    </Text>
    <Text fontSize={13} color="$colorTextPrimary">
      {what}
    </Text>
  </View>
)

// the ⋯ block-action slot (a placeholder affordance — a real Menu trigger in a consumer)
const dots = (
  <Button intent="ghost" size="sm" aria-label="Block actions">
    ⋯
  </Button>
)

// success bodies per block (the consumer's renderBlock output)
const BODIES: Record<string, React.ReactNode> = {
  schedule: (
    <View>
      <Row when="09:00" what="Deep work — dashboard shell" />
      <Row when="11:30" what="Linear algebra lecture" />
      <Row when="14:00" what="Call with the bank" />
      <Row when="18:00" what="Run — 5 km" />
    </View>
  ),
  stats: (
    <View flexDirection="row" gap={24} flexWrap="wrap">
      <Metric value="7" label="day streak" />
      <Metric value="82%" label="habits done" />
    </View>
  ),
  'day-actions': (
    <View>
      <Check done what="Morning pages" />
      <Check done={false} what="Review PRs" />
      <Check done={false} what="Water plants" />
    </View>
  ),
  reading: (
    <View
      height={120}
      borderRadius="$md"
      backgroundColor="$colorSurfaceSecondary"
      alignItems="center"
      justifyContent="center"
    >
      <Text fontSize={12} color="$colorTextMuted">
        ▁▃▅▂▇▄▆ reading pace
      </Text>
    </View>
  ),
}

const meta: Meta<typeof DashboardView> = {
  title: 'Platform Views/Dashboard',
  component: DashboardView,
  args: {
    renderBlock: (b: DashboardBlock) => BODIES[b.id] ?? null,
    'aria-label': 'Dashboard',
  },
}
export default meta
type Story = StoryObj<typeof DashboardView>

// Home — the full matrix: mixed spans × mixed per-block states (EC-1/2/3/4/6).
const HOME_BLOCKS: DashboardBlock[] = [
  { id: 'schedule', title: "Today's schedule", size: 'full', state: 'success', action: dots },
  { id: 'stats', title: 'Stats glance', size: 'sm', state: 'success', action: dots },
  { id: 'day-actions', title: 'Day actions', size: 'md', state: 'success', action: dots },
  { id: 'reading', title: 'Reading hub', size: 'lg', state: 'success', action: dots },
  { id: 'habits', title: 'Habits', size: 'md', state: 'loading', action: dots },
  { id: 'notes', title: 'Recent notes', size: 'sm', state: 'empty', action: dots },
  { id: 'sync', title: 'Sync feed', size: 'sm', state: 'error', action: dots },
]
export const Home: Story = {
  args: { title: 'Good morning, Victor', blocks: HOME_BLOCKS },
}

// Lone lg — proves EC-6: a single lg block must NOT grow to full width (the maxWidth cap).
export const LoneLargeBlock: Story = {
  args: {
    title: 'Reading',
    blocks: [{ id: 'reading', title: 'Reading hub', size: 'lg', state: 'success', action: dots }],
  },
}

// Every per-block state side by side (EC-3) — one sm block per state.
export const AllStates: Story = {
  args: {
    title: 'States',
    blocks: [
      { id: 'schedule', title: 'Success', size: 'sm', state: 'success', action: dots },
      { id: 'habits', title: 'Loading', size: 'sm', state: 'loading', action: dots },
      { id: 'notes', title: 'Empty', size: 'sm', state: 'empty', action: dots },
      { id: 'sync', title: 'Error', size: 'sm', state: 'error', action: dots },
    ],
  },
}

// Empty dashboard (EC-5).
export const EmptyDashboard: Story = {
  args: {
    title: 'Projects',
    blocks: [],
    emptyAction: (
      <View marginTop={12}>
        <Button intent="primary">Add a block</Button>
      </View>
    ),
  },
}
