import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { AgendaView, type AgendaDay } from './agenda-view'
import { type ViewState } from './list-view'

// fe-calendar #19 · S2 · agenda-view stories — the component Visual Gate surface. Toggle the toolbar Theme.
// MEASURE (PLAN-S2 §4 / EC-3): day rail (serif tabular number · weekday eyebrow · TODAY accent) · ONLY today grouped
// Morning → Afternoon → Evening; other days flat · timed (tabular) vs "All day" · Must (accent) / Can (muted) tags ·
// done = struck + muted · purpose dots (user hex) · checkbox render-when-handler (intent only) · states · 375 reflow
// (rail stacks above items).

// The approved greybox week (Oct 5–11 2026; Thu 8 = today; Wed has nothing → skipped).
const TODAY = '2026-10-08'
const PURPOSE = { career: '#2563EB', health: '#5F6E3E', growth: '#B23733' }
const WEEK: AgendaDay[] = [
  {
    date: '2026-10-08',
    items: [
      { id: 'b', title: 'Morning check-in', daypart: 'morning', done: true },
      {
        id: 'c',
        title: 'Finish the re-plan draft',
        daypart: 'morning',
        time: '09:30',
        weight: 'must',
        color: PURPOSE.career,
      },
      { id: 's', title: 'Spanish, daily session', daypart: 'morning', weight: 'can', color: PURPOSE.growth },
      { id: 'd', title: 'Call Mariana', daypart: 'afternoon', time: '17:00', done: false, color: PURPOSE.career },
      { id: 'a', title: 'Read ch. 4 — Systems', daypart: 'evening', weight: 'can' },
      { id: 'x', title: 'Log yesterday’s expenses', daypart: 'evening', weight: 'can' },
    ],
  },
  {
    date: '2026-10-09',
    items: [
      { id: 'e', title: 'Design sync', daypart: 'morning', time: '11:00', done: false, color: PURPOSE.career },
      { id: 'f', title: 'Weekly review', daypart: 'evening', weight: 'can' },
    ],
  },
  {
    date: '2026-10-10',
    items: [
      { id: 'g', title: 'Family lunch', daypart: 'afternoon', time: '12:00', done: false, color: PURPOSE.health },
    ],
  },
]

type PlaygroundArgs = { state: ViewState; interactive: boolean }
const meta: Meta<PlaygroundArgs> = {
  title: 'Platform Views/Agenda',
  argTypes: {
    state: { control: 'select', options: ['loading', 'empty', 'error', 'success'] },
    interactive: { control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<PlaygroundArgs>

// A stateful wrapper stands in for the OWNING MODULE: the renderer only emits the intent; this flips the data.
function Owned({ state, interactive }: PlaygroundArgs) {
  const [days, setDays] = useState(WEEK)
  const toggle = (id: string) =>
    setDays((ds) => ds.map((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)) })))
  return (
    <View width={880} maxWidth="100%">
      <AgendaView
        days={days}
        today={TODAY}
        state={state}
        onToggleItem={interactive ? toggle : undefined}
        aria-label="Agenda"
      />
    </View>
  )
}

export const Playground: Story = {
  args: { state: 'success', interactive: true },
  render: (args) => <Owned {...args} />,
}

// No handler → no interactive control; done still reads (strike + sr-only).
export const ReadOnly: Story = { render: () => <Owned state="success" interactive={false} /> }

export const TerminalStates: Story = {
  render: () => (
    <View gap={32} width={880} maxWidth="100%">
      {(['loading', 'empty', 'error'] as const).map((s) => (
        <View key={s} gap={8}>
          <Text fontSize={12} opacity={0.6} color="$colorTextPrimary">
            {s}
          </Text>
          <AgendaView days={s === 'loading' ? [] : WEEK} today={TODAY} state={s} aria-label={`Agenda ${s}`} />
        </View>
      ))}
    </View>
  ),
}

// 375 — the rail reflows ABOVE the items (D-S2-DEV-2), so the title keeps a readable measure.
export const Narrow: Story = {
  render: () => (
    <View width={343}>
      <AgendaView days={WEEK} today={TODAY} onToggleItem={() => {}} aria-label="Agenda" />
    </View>
  ),
}
