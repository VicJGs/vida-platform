import type { Meta, StoryObj } from '@storybook/react-vite'
import { WeekView, type CalChip, type TimedBlock } from './week-view'

// fe-calendar #19 · S3 · week-view stories — the component Visual Gate surface. Toggle the toolbar Theme.
// MEASURE (PLAN-S3 §4 / EC-4): 64px gutter of hour labels · headed day columns (eyebrow weekday + serif tabular number;
// today = accent + underline) · the one all-day strip · blocks by hour (purpose bar, time over title; compact one-row
// under 44px or ≥3 lanes) · overlap lanes never intersect · Day = one column · the Week region scrolls + takes focus at
// 375 · states.

// The approved greybox week (Oct 5–11 2026; Thu 8 = today) + the mockup's 18:00 Gym, an overlap pair, a short block.
const TODAY = '2026-10-08'
const WEEK = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']
const PURPOSE = { career: '#2563EB', health: '#5F6E3E', growth: '#B23733', admin: '#64748B' }
const BLOCKS: TimedBlock[] = [
  { id: 'm', title: 'Re-plan draft', day: '2026-10-05', startHour: 9, color: PURPOSE.career },
  { id: 'w', title: 'Gym', day: '2026-10-07', startHour: 18, color: PURPOSE.health },
  { id: 't', title: 'Deep work', day: TODAY, startHour: 9, endHour: 10.5, color: PURPOSE.admin },
  { id: 't2', title: 'Call Mariana', day: TODAY, startHour: 10, endHour: 11, color: PURPOSE.career },
  { id: 't3', title: 'Stand-up', day: TODAY, startHour: 14, endHour: 14.5, color: PURPOSE.career },
  { id: 'f', title: 'Design sync', day: '2026-10-09', startHour: 11, color: PURPOSE.career },
]
const CHIPS: CalChip[] = [
  { id: 'c1', title: 'Spanish session', color: PURPOSE.growth },
  { id: 'c2', title: 'Read ch. 4', color: PURPOSE.growth },
]

const meta: Meta<typeof WeekView> = {
  title: 'UI-2 / WeekView',
  component: WeekView,
  args: { days: WEEK, blocks: BLOCKS, allDay: CHIPS, today: TODAY, 'aria-label': 'Week' },
}
export default meta
type Story = StoryObj<typeof WeekView>

export const Week: Story = {}

export const Day: Story = {
  args: { days: [TODAY], blocks: BLOCKS.filter((b) => b.day === TODAY), 'aria-label': 'Day' },
}

export const Overlap: Story = {
  args: {
    days: [TODAY],
    'aria-label': 'Day',
    blocks: [
      { id: 'a', title: 'Workshop', day: TODAY, startHour: 9, endHour: 11, color: PURPOSE.career },
      { id: 'b', title: 'Office hours', day: TODAY, startHour: 9.5, endHour: 11, color: PURPOSE.growth },
      { id: 'c', title: 'Coffee', day: TODAY, startHour: 10, endHour: 11, color: PURPOSE.health },
      { id: 'd', title: 'Quick check', day: TODAY, startHour: 12, endHour: 12.25, color: PURPOSE.admin },
      { id: 'e', title: 'Follow-up', day: TODAY, startHour: 12.25, endHour: 13, color: PURPOSE.admin },
    ],
  },
}

export const ExtendedWindow: Story = {
  args: {
    blocks: [
      ...BLOCKS,
      { id: 'run', title: 'Morning run', day: '2026-10-06', startHour: 6.5, endHour: 7.25, color: PURPOSE.health },
      { id: 'late', title: 'Call with Lisbon', day: '2026-10-10', startHour: 21, color: PURPOSE.career },
    ],
  },
}

export const TwelveHour: Story = { args: { timeFormat: '12h' } }

export const Loading: Story = { args: { blocks: [], allDay: [], state: 'loading' } }
export const Empty: Story = { args: { blocks: [], allDay: [], state: 'empty' } }
// not `Error` — that would shadow the global constructor
export const Failed: Story = { args: { blocks: [], allDay: [], state: 'error' } }
