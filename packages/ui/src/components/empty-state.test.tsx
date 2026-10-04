// @vitest-environment jsdom
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { Text } from '@tamagui/core'
import { UIProvider } from '../provider'
import { EmptyState } from './empty-state'
import { Button } from './button'

afterEach(cleanup)

function renderEmpty(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}

describe('EmptyState', () => {
  it('is a role=group named by its title (aria-labelledby)', () => {
    const { getByRole } = renderEmpty(<EmptyState title="Your Finance is a clean page." />)
    // The group's accessible name resolves from the title via aria-labelledby.
    expect(getByRole('group', { name: 'Your Finance is a clean page.' })).not.toBeNull()
  })

  it('renders the title as a heading, aria-level 2 by default', () => {
    const { getByRole } = renderEmpty(<EmptyState title="No tasks yet." />)
    expect(getByRole('heading', { level: 2, name: 'No tasks yet.' })).not.toBeNull()
  })

  it('honours a titleLevel override', () => {
    const { getByRole } = renderEmpty(<EmptyState title="Nested empty" titleLevel={3} />)
    expect(getByRole('heading', { level: 3, name: 'Nested empty' })).not.toBeNull()
  })

  it('renders the teaching body, action, and guided-setup slots', () => {
    const { getByText, getByRole } = renderEmpty(
      <EmptyState
        title="Your Finance is a clean page."
        action={
          <Button intent="primary" onPress={() => {}}>
            Import statement
          </Button>
        }
        guidedSetup={<Text>Start guided setup</Text>}
      >
        Import a bank statement to reconcile, or add an account by hand.
      </EmptyState>,
    )
    expect(getByText(/reconcile/)).not.toBeNull()
    expect(getByRole('button', { name: 'Import statement' })).not.toBeNull()
    expect(getByText('Start guided setup')).not.toBeNull()
  })

  it('renders the icon decoratively (aria-hidden)', () => {
    const { getByText } = renderEmpty(<EmptyState title="Clean page" icon={<Text>◷</Text>} />)
    const glyph = getByText('◷')
    // The glyph sits inside an aria-hidden wrapper → not in the accessibility tree.
    expect(glyph.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('omits optional slots when not provided (title-only is valid)', () => {
    const { queryByRole } = renderEmpty(<EmptyState title="Just a title" />)
    expect(queryByRole('button')).toBeNull()
  })

  it('warns in dev when title is empty (it names the region + teaches)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderEmpty(<EmptyState title="   " />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`title` is required'))
    warn.mockRestore()
  })

  it('forwards the ref to the DOM element', () => {
    const ref = createRef<HTMLDivElement>()
    renderEmpty(<EmptyState ref={ref} title="Ref test" />)
    expect(ref.current).not.toBeNull()
  })
})
