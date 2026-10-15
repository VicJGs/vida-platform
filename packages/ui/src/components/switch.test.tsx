// @vitest-environment jsdom
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { UIProvider } from '../provider'
import { Switch } from './switch'

afterEach(cleanup)

function renderSwitch(ui: React.ReactElement): HTMLInputElement {
  const { container } = render(<UIProvider>{ui}</UIProvider>)
  const el = container.querySelector('input[type="checkbox"]')
  if (el === null) throw new Error('Switch did not render an <input type="checkbox">')
  return el as HTMLInputElement
}

describe('Switch', () => {
  it('renders a native checkbox input with role="switch" inside a <label>', () => {
    const el = renderSwitch(<Switch label="Reduce motion" />)
    expect(el.getAttribute('role')).toBe('switch')
    expect(el.closest('label')).not.toBeNull()
  })

  it('forwards the ref to the DOM <input>', () => {
    const ref = createRef<HTMLInputElement>()
    render(
      <UIProvider>
        <Switch label="Reduce motion" ref={ref} />
      </UIProvider>,
    )
    expect(ref.current?.tagName).toBe('INPUT')
    expect(ref.current?.getAttribute('role')).toBe('switch')
  })

  it('uncontrolled: click toggles + onCheckedChange fires with the new value', () => {
    const onCheckedChange = vi.fn()
    const el = renderSwitch(<Switch label="Reduce motion" onCheckedChange={onCheckedChange} />)
    expect(el.checked).toBe(false)
    fireEvent.click(el)
    expect(el.checked).toBe(true)
    expect(onCheckedChange).toHaveBeenLastCalledWith(true)
  })

  it('controlled: reflects `checked` and does not self-toggle without a state update', () => {
    const el = renderSwitch(<Switch label="Reduce motion" checked onCheckedChange={() => undefined} />)
    expect(el.checked).toBe(true)
  })

  it('defaultChecked initializes an uncontrolled switch', () => {
    const el = renderSwitch(<Switch label="Reduce motion" defaultChecked />)
    expect(el.checked).toBe(true)
  })

  it('disabled → native disabled (removed from tab order; real browsers do not activate)', () => {
    // jsdom's fireEvent.click toggles a disabled checkbox (spec-divergent), so the house idiom asserts the native
    // `disabled` attribute (checkbox.test.tsx:74) — which removes it from the tab order and blocks real activation.
    const el = renderSwitch(<Switch label="Reduce motion" disabled />)
    expect(el.disabled).toBe(true)
  })

  it('invalid sets aria-invalid', () => {
    const el = renderSwitch(<Switch label="Reduce motion" invalid />)
    expect(el.getAttribute('aria-invalid')).toBe('true')
  })

  it('label-click toggles the switch (native association)', () => {
    const onCheckedChange = vi.fn()
    const { getByText } = render(
      <UIProvider>
        <Switch label="Reduce motion" onCheckedChange={onCheckedChange} />
      </UIProvider>,
    )
    fireEvent.click(getByText('Reduce motion'))
    expect(onCheckedChange).toHaveBeenLastCalledWith(true)
  })

  it('warns when no accessible name is provided', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(
      <UIProvider>
        <Switch />
      </UIProvider>,
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('accessible name'))
    warn.mockRestore()
  })

  it('does not warn when an aria-label is provided', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(
      <UIProvider>
        <Switch aria-label="Reduce motion" />
      </UIProvider>,
    )
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
