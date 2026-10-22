import type { Meta, StoryObj } from '@storybook/react-vite'
import { LivingView, type HabitThread, type LivingDay, type PurposeBudget } from './living-view'

// fe-calendar #19 · S5 · living-view stories — the component Visual Gate surface. Toggle the toolbar Theme.
// MEASURE (PLAN-S5 §4 / EC-6..EC-10): ④ budget (6h · "0h · none yet" in emphasis · "unmeasured") · ② threads (filled /
// dotted / ring / faded + the 2px connector, nodes spread, streak right) · day Cards past faded · today warm edge ·
// future plain · the open-time offer (read-only; button only with a handler) · "SLIPPING" + ⤻ · region scroll < 1028.

// The approved greybox week (Oct 5–11 2026; Thu 8 = today) — the concept board's data (:169-222).
const P = { career: '#1D4ED8', health: '#5A6B3F', growth: '#9A2A2A', admin: '#64748B' }
const BUDGET: PurposeBudget[] = [
  { id: 'c', name: 'Career', color: P.career, hours: 6, fraction: 1 },
  { id: 'h', name: 'Health', color: P.health, hours: 0, fraction: 0 },
  { id: 'g', name: 'Growth', color: P.growth, hours: 4, fraction: 0.67 },
  { id: 'a', name: 'Admin', color: P.admin, hours: 2, fraction: 0.33 },
]
const THREADS: HabitThread[] = [
  { id: 'm', name: 'Meditate', color: P.health, days: ['kept', 'kept', 'kept', 'today', 'future', 'future', 'future'], streak: '12-day streak' },
  { id: 'r', name: 'Read 20 min', color: P.growth, days: ['kept', 'missed', 'kept', 'today', 'future', 'future', 'future'], streak: 'broke Tue · back on' },
]
const DAYS: LivingDay[] = [
  { date: '2026-10-05', kind: 'past', record: 'Shipped the re-plan draft — a good, quiet start.', done: [{ id: 'a1', title: 'Re-plan draft', color: P.career }, { id: 'a2', title: 'Morning check-in', color: P.health }, { id: 'a3', title: 'Spanish', color: P.growth }], focus: '2h40 deep focus' },
  { date: '2026-10-06', kind: 'past', record: 'Caught the finance import up; lighter afternoon.', done: [{ id: 'b1', title: '1:1 with Ana', color: P.career }, { id: 'b2', title: 'Weekly review', color: P.admin }], focus: '1h10 focus' },
  { date: '2026-10-07', kind: 'past', record: 'A slow one — read, and let the rest drift.', done: [{ id: 'c1', title: 'Read ch. 4', color: P.growth }], focus: '0h focus' },
  {
    date: '2026-10-08',
    kind: 'today',
    entries: [
      { kind: 'item', item: { id: 't1', title: 'Deep work', time: '09:00', color: P.career } },
      { kind: 'open', label: '2h open', hint: 'slot deep work or a study session?' },
      { kind: 'item', item: { id: 't2', title: 'Send proposal', color: P.career, slipping: true } },
      { kind: 'item', item: { id: 't3', title: 'Gym', time: '18:00', color: P.health } },
    ],
  },
  { date: '2026-10-09', kind: 'future', intent: 'Wrap the week, review what moved.', plan: [{ id: 'f1', title: 'Design sync', time: '11:00', color: P.career }, { id: 'f2', title: 'Read', color: P.growth }] },
  { date: '2026-10-10', kind: 'future', intent: 'Rest. Nothing owed.', plan: [{ id: 'g1', title: 'Family lunch', color: P.health }] },
  { date: '2026-10-11', kind: 'future', intent: 'Plan the week ahead.', plan: [{ id: 'h1', title: 'Weekly review', color: P.admin }] },
]

const meta: Meta<typeof LivingView> = {
  title: 'UI-2 / LivingView',
  component: LivingView,
  args: { days: DAYS, budget: BUDGET, threads: THREADS, weekLabel: 'This week', 'aria-label': 'Living' },
}
export default meta
type Story = StoryObj<typeof LivingView>

export const Living: Story = {}

export const UnmeasuredAndUnavailable: Story = {
  args: {
    budget: [{ id: 'c', name: 'Career', color: P.career, hours: 3, fraction: 0.5, stale: true }, { id: 'l', name: 'Learning', color: P.admin, hours: null, fraction: null }],
    threads: undefined,
  },
}

export const OpenTimeWithHandler: Story = {
  args: { onSlotOpenTime: (date: string) => console.info(`[story] onSlotOpenTime(${date})`) },
}

// A past week: every day is a record, no today Card, no "today" thread node (temporal asymmetry, EC-8).
export const PastWeek: Story = {
  args: {
    weekLabel: 'Sep 28 – Oct 4, 2026',
    days: ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'].map((date, i) => ({
      date,
      kind: 'past' as const,
      record: i % 2 ? 'Steady, nothing loud.' : 'A good, quiet day.',
      done: [{ id: `p${i}`, title: 'Morning check-in', color: P.health }],
      focus: '1h focus',
    })),
    threads: THREADS.map((t) => ({ ...t, days: t.days.map((s) => (s === 'today' || s === 'future' ? 'kept' : s)), streak: undefined })),
  },
}

// A future week: every day is an intention, no today Card, every thread node upcoming.
export const FutureWeek: Story = {
  args: {
    weekLabel: 'Oct 12 – Oct 18, 2026',
    days: ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'].map((date, i) => ({
      date,
      kind: 'future' as const,
      intent: i === 5 ? 'Rest.' : 'Keep the rhythm.',
      plan: [{ id: `q${i}`, title: 'Deep work', time: '09:00', color: P.career }],
    })),
    threads: THREADS.map((t) => ({ ...t, days: t.days.map(() => 'future' as const), streak: undefined })),
  },
}

export const Loading: Story = { args: { state: 'loading', budget: [], threads: [], days: DAYS.map(({ date, kind }) => ({ date, kind })) } }
export const Empty: Story = { args: { state: 'empty', budget: [], threads: [], days: DAYS.map(({ date, kind }) => ({ date, kind })) } }
export const Failed: Story = { args: { state: 'error' } }
/** S7 (V13 amendments): a non-daily habit's rest days (`off` — a small solid dot, never a miss) + no colour source (the
 *  neutral muted ink, D-S6-DEV-2) — the live M1 shape, since purposes/habits carry no colour column. */
export const RestDaysNoColour: Story = {
  args: {
    budget: BUDGET.map(({ color: _c, ...b }) => ({ ...b, hours: null, fraction: null })),
    threads: [{ id: 'gym', name: 'Gym', days: ['kept', 'off', 'missed', 'today', 'off', 'future', 'future'], streak: '3-day streak' }],
  },
}
