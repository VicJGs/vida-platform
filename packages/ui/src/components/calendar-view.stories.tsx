import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { CalendarView } from './calendar-view'
import { type ViewState } from './list-view'

// UI-2 · V4 · calendar-view stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark).
// A month grid (role="table") that buckets dated items onto days. Diverges from the linear spine: empty = the grid
// with no chips (not a message); a table, not a list.
//
// MEASURE (v4-calendar-view.md §4): 6×7 grid (stable height) · weekday headers · muted out-of-month days · TODAY
// marker (brand badge) · item chips + "+K more" overflow · month nav (WithNav story) · loading skeleton grid · error
// status message · empty = grid (not a message) · dark mode · resize narrow → horizontal scroll (375, CV-8).

type Evt = { id: string; on: string; title: string; hue: string }
// August 2026 (today = Aug 10) — a deterministic month for the gate.
const MONTH = new Date(2026, 7, 1)
const TODAY = new Date(2026, 7, 10)
const EVENTS: Evt[] = [
  { id: '1', on: '2026-08-03', title: 'Kickoff', hue: '#6366f1' },
  { id: '2', on: '2026-08-10', title: 'Design review', hue: '#10b981' },
  { id: '3', on: '2026-08-10', title: 'Standup', hue: '#f59e0b' },
  { id: '4', on: '2026-08-10', title: 'Ship V3', hue: '#06b6d4' },
  { id: '5', on: '2026-08-10', title: 'Retro', hue: '#ef4444' },
  { id: '6', on: '2026-08-18', title: 'Demo', hue: '#8b5cf6' },
  { id: '7', on: '2026-08-27', title: 'Release', hue: '#ec4899' },
  { id: '8', on: '2026-08-01', title: 'Month start', hue: '#14b8a6' }, // boundary — must land on Aug 1
]
const chip = (e: Evt) => (
  <View backgroundColor={e.hue} borderRadius={4} paddingHorizontal={4} paddingVertical={1}>
    <Text fontSize={11} color="#fff" numberOfLines={1}>
      {e.title}
    </Text>
  </View>
)

type PlaygroundArgs = { state: ViewState; weekStartsOn: 0 | 1; maxPerDay: number }
const meta: Meta<PlaygroundArgs> = {
  title: 'Platform Views/Calendar',
  argTypes: {
    state: { control: 'select', options: ['loading', 'empty', 'error', 'success'] },
    weekStartsOn: { control: 'inline-radio', options: [0, 1] },
    maxPerDay: { control: { type: 'range', min: 1, max: 5, step: 1 } },
  },
}
export default meta
type Story = StoryObj<PlaygroundArgs>

export const Playground: Story = {
  args: { state: 'success', weekStartsOn: 1, maxPerDay: 3 },
  render: (args) => (
    <View width={760} maxWidth="100%">
      <CalendarView<Evt>
        items={EVENTS}
        getDate={(e) => e.on}
        getKey={(e) => e.id}
        renderItem={chip}
        month={MONTH}
        today={TODAY}
        state={args.state}
        weekStartsOn={args.weekStartsOn}
        maxPerDay={args.maxPerDay}
        aria-label="Schedule"
      />
    </View>
  ),
}

// With nav — a stateful wrapper drives the controlled month via onMonthChange.
function NavDemo() {
  const [month, setMonth] = useState(MONTH)
  return (
    <View width={760} maxWidth="100%">
      <CalendarView<Evt>
        items={EVENTS}
        getDate={(e) => e.on}
        getKey={(e) => e.id}
        renderItem={chip}
        month={month}
        today={TODAY}
        onMonthChange={setMonth}
        aria-label="Schedule"
      />
    </View>
  )
}
export const WithNav: Story = { render: () => <NavDemo /> }

export const TerminalStates: Story = {
  render: () => (
    <View gap={32} width={760} maxWidth="100%">
      {(['loading', 'empty', 'error'] as const).map((s) => (
        <View key={s} gap={8}>
          <Text fontSize={12} opacity={0.6} color="$colorTextPrimary">
            {s === 'empty' ? 'empty (= grid, no chips — NOT a message)' : s}
          </Text>
          <CalendarView<Evt>
            items={s === 'empty' ? [] : EVENTS}
            getDate={(e) => e.on}
            getKey={(e) => e.id}
            renderItem={chip}
            month={MONTH}
            today={TODAY}
            state={s}
            aria-label="Schedule"
          />
        </View>
      ))}
    </View>
  ),
}
