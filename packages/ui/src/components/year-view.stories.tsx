import type { Meta, StoryObj } from '@storybook/react-vite'
import { YearView, type YearDensity } from './year-view'

// fe-calendar #19 · S4 · year-view stories — the component Visual Gate surface. Toggle the toolbar Theme.
// MEASURE (PLAN-S4 §4 / EC-5): 12 mini-months (4-up ≥ ~600px content, 2-up at 375) · serif month headings (current
// month accented) · has (4px @ .75) vs busy (6px) dots ≥ 3:1 on the paper cell · today ringed · no day numbers / weekday
// row · leading blanks only · month heading drills in (button ≥ 44px, ring, hover) · states.

// The approved greybox shape: weekday stripes — busy on Wednesdays, activity on Thursdays + Fridays (Mon-start columns
// 3/4/5), plus a few scattered days. Today = Thu 2026-10-08.
const TODAY = '2026-10-08'
function stripes(year: number): YearDensity[] {
  const out: YearDensity[] = []
  for (let m = 0; m < 12; m++) {
    const days = new Date(year, m + 1, 0).getDate()
    for (let d = 1; d <= days; d++) {
      const wd = new Date(year, m, d).getDay()
      const date = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      if (wd === 3) out.push({ date, level: 2 })
      else if (wd === 4 || wd === 5 || (d * (m + 1)) % 11 === 0) out.push({ date, level: 1 })
    }
  }
  return out
}

const meta: Meta<typeof YearView> = {
  title: 'UI-2 / YearView',
  component: YearView,
  args: { year: 2026, density: stripes(2026), today: TODAY, 'aria-label': 'Year' },
}
export default meta
type Story = StoryObj<typeof YearView>

export const Year: Story = {}

export const SundayStart: Story = { args: { weekStartsOn: 0 } }

export const DrillIn: Story = {
  args: { onPickMonth: (m: number) => console.info(`[story] onPickMonth(${m})`) },
}

export const OtherYear: Story = { args: { year: 2027, density: stripes(2027) } }

export const Loading: Story = { args: { state: 'loading', density: [] } }

export const Empty: Story = { args: { state: 'empty', density: [] } }

export const Failed: Story = { args: { state: 'error', density: [] } }
