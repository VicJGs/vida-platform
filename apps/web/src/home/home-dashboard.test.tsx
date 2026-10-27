// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import {
  DEFAULT_HOME_WIDGETS,
  HOME_WIDGET_ID,
  HomeDashboard,
  renderHomeWidget,
  useHomeWidgets,
  type HomeWidget,
} from './home-dashboard'

afterEach(cleanup)

const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

describe('HomeDashboard (S1)', () => {
  it('EC-4 — renders a standalone-widget grid across the OS domains', () => {
    const { getByText, getByRole } = renderUI(
      <HomeDashboard widgets={useHomeWidgets()} renderWidget={renderHomeWidget} />,
    )
    // the dashboard region + heading
    expect(getByRole('region')).not.toBeNull()
    expect(getByText('Your day across the OS')).not.toBeNull()
    // the OS-domain cells (the personalized grid)
    for (const title of [
      'Today across the OS',
      'Finances',
      'Tasks',
      'Habits',
      'Projects',
      'Purposes',
      'Dreams',
      'Schedule',
    ]) {
      expect(getByText(title)).not.toBeNull()
    }
    // the standalone placeholder body (the renderWidget seam) describes what the widget will show — no faked data
    expect(getByText('Net worth · cash flow · accounts')).not.toBeNull()
  })

  it('DEFAULT_HOME_WIDGETS covers every HOME_WIDGET_ID exactly once', () => {
    const ids = DEFAULT_HOME_WIDGETS.map((w) => w.id).sort()
    expect(ids).toEqual([...HOME_WIDGET_ID].sort())
  })

  it('EC-5 — one widget degrades (error) while siblings stay live (never a blank Home)', () => {
    const widgets: HomeWidget[] = [
      { id: 'finance', title: 'Finances', size: 'md', state: 'error', hint: 'Net worth · cash flow · accounts' },
      { id: 'tasks', title: 'Tasks', size: 'sm', state: 'success', hint: 'Progress · due today · overdue' },
    ]
    const { getByText, getByRole } = renderUI(<HomeDashboard widgets={widgets} renderWidget={renderHomeWidget} />)
    // the errored widget shows the shell's calm status, the sibling renders its body
    expect(getByText('Couldn’t load this block.')).not.toBeNull()
    expect(getByText('Progress · due today · overdue')).not.toBeNull()
    expect(getByRole('status')).not.toBeNull()
  })

  it('threads loading/empty states through DashboardView (shell-owned)', () => {
    const widgets: HomeWidget[] = [
      { id: 'habits', title: 'Habits', size: 'sm', state: 'loading', hint: 'Streaks · today’s completions' },
      { id: 'dreams', title: 'Dreams', size: 'sm', state: 'empty', hint: 'Bucket list · saving progress · steps' },
    ]
    const { container, getByText } = renderUI(<HomeDashboard widgets={widgets} renderWidget={renderHomeWidget} />)
    // loading → an aria-busy skeleton region exists; empty → the shell's muted "Nothing here yet."
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(getByText('Nothing here yet.')).not.toBeNull()
  })
})
