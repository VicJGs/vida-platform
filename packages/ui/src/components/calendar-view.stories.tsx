import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { CalendarView } from './calendar-view'
import { type ViewState } from './list-view'

// UI-2 · V4 · calendar-view stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark).
// A month grid (role="table") that buckets dated items onto days. Diverges from the linear spine: empty = the grid
// with no chips (not a message); a table, not a list.
//
// MEASURE (v4-calendar-view.md §4 + P5 refinement): 6×7 grid (stable height) · serif $heading title · UPPERCASE tracked
// weekday eyebrows (left-set) · $small tabular day figures · TODAY = accent number + underline (not a filled blob) ·
// weekend + out-of-month = $colorSurfaceSecondary paper (oos number muted, weekend ink) · accent-dot chips + eyebrow
// "+K more" · month nav (WithNav) · loading skeleton grid · error status · empty = grid (not a message) · dark mode ·
// narrow → horizontal scroll (375, CV-8).

type Evt = { id: string; on: string; title: string; soft?: boolean }
// August 2026 (today = Aug 10) — a deterministic month for the gate.
const MONTH = new Date(2026, 7, 1)
const TODAY = new Date(2026, 7, 10)
const EVENTS: Evt[] = [
  { id: '1', on: '2026-08-03', title: 'Kickoff' },
  { id: '2', on: '2026-08-10', title: 'Design review' },
  { id: '3', on: '2026-08-10', title: 'Standup', soft: true },
  { id: '4', on: '2026-08-10', title: 'Ship V3' },
  { id: '5', on: '2026-08-10', title: 'Retro', soft: true },
  { id: '6', on: '2026-08-18', title: 'Demo' },
  { id: '7', on: '2026-08-27', title: 'Release', soft: true },
  { id: '8', on: '2026-08-01', title: 'Month start' }, // boundary — must land on Aug 1
]
// The event chip is the CONSUMER's renderItem (GV-1/LV-5 boundary) — NOT calendar-view code. The refined editorial
// chip: an accent category DOT + a sans caption in ink (token-pure, no hard-coded hue — a `soft` event gets a muted dot).
const chip = (e: Evt) => (
  <View flexDirection="row" alignItems="center" gap={5}>
    <View width={5} height={5} borderRadius={999} backgroundColor={e.soft ? '$colorTextMuted' : '$colorBrandPrimary'} />
    <Text fontSize="$caption" color="$colorTextPrimary" numberOfLines={1}>
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

// Today on a weekend cell — exercises the brand ACCENT NUMBER on a $colorSurfaceSecondary (weekend) surface, the P5 AA
// case the default month (today = Mon, paper) doesn't cover. Aug 8 2026 is a Saturday.
export const TodayOnWeekend: Story = {
  render: () => (
    <View width={760} maxWidth="100%">
      <CalendarView<Evt>
        items={EVENTS}
        getDate={(e) => e.on}
        getKey={(e) => e.id}
        renderItem={chip}
        month={MONTH}
        today={new Date(2026, 7, 8)}
        aria-label="Schedule"
      />
    </View>
  ),
}

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
