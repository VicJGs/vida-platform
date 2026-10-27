// @vitest-environment jsdom
// notes-rescope R1 · G5/G6 — PageActions: the save chip + the ⋯ menu (only with items, BR-R1-6).
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { PageActions } from './page-actions'
import { __resetSaveStatus, setSaveStatus } from './save-status'

beforeEach(() => __resetSaveStatus())
afterEach(cleanup)
const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

describe('PageActions', () => {
  it('shows "Saved on this device" and NO ⋯ when there are no items (no dead affordance)', () => {
    const { getByText, queryByRole } = renderUI(<PageActions pageId="p1" locked={false} items={[]} />)
    expect(getByText('Saved on this device')).not.toBeNull()
    expect(queryByRole('button', { name: 'Page actions' })).toBeNull()
  })

  it('renders the ⋯ menu button once an item exists', () => {
    const { getByRole } = renderUI(
      <PageActions pageId="p1" locked={false} items={[{ id: 'rename', label: 'Rename', onSelect: () => {} }]} />,
    )
    const trigger = getByRole('button', { name: 'Page actions' })
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
  })

  it('follows the store: a failed write reads "Couldn\'t save on this device"', () => {
    const { getByText } = renderUI(<PageActions pageId="p1" locked={false} items={[]} />)
    act(() => setSaveStatus('p1', 'error'))
    expect(getByText("Couldn't save on this device")).not.toBeNull()
  })

  it('hides the chip on a locked page — the EC-33 notice is the only status (host prop or store)', () => {
    const a = renderUI(<PageActions pageId="p1" locked items={[]} />)
    expect(a.queryByRole('status')).toBeNull()
    a.unmount()
    setSaveStatus('p2', 'locked')
    const b = renderUI(<PageActions pageId="p2" locked={false} items={[]} />)
    expect(b.queryByRole('status')).toBeNull()
  })
})
