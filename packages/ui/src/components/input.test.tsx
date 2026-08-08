// @vitest-environment jsdom
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { UIProvider } from '../provider'
import { Input } from './input'

afterEach(cleanup)

function renderInput(ui: React.ReactElement): HTMLInputElement {
  const { container } = render(<UIProvider>{ui}</UIProvider>)
  const el = container.querySelector('input')
  if (el === null) throw new Error('Input did not render an <input> element')
  return el
}

describe('Input', () => {
  // VERIFY 1 — a core styled(View,{render:'input'}) forwards controlled props to the DOM node.
  it('renders a native <input> and forwards the controlled value', () => {
    const el = renderInput(<Input aria-label="Name" value="Ada" onChangeText={() => undefined} />)
    expect(el.tagName).toBe('INPUT')
    expect(el.value).toBe('Ada')
  })

  it('forwards the full type union (not just password) to the DOM type attr', () => {
    const el = renderInput(<Input aria-label="Email" type="email" />)
    expect(el.getAttribute('type')).toBe('email')
  })

  it('type="password" masks', () => {
    const el = renderInput(<Input aria-label="Password" type="password" />)
    expect(el.getAttribute('type')).toBe('password')
  })

  it('onChangeText fires with the typed value', () => {
    const onChangeText = vi.fn()
    const el = renderInput(<Input aria-label="Name" onChangeText={onChangeText} />)
    fireEvent.change(el, { target: { value: 'Grace' } })
    expect(onChangeText).toHaveBeenCalledWith('Grace')
  })

  // VERIFY 1 — forwardRef lands on the DOM <input> (so consumers can .focus()).
  it('forwards the ref to the DOM <input>', () => {
    const ref = createRef<HTMLInputElement>()
    render(
      <UIProvider>
        <Input aria-label="Name" ref={ref} />
      </UIProvider>,
    )
    expect(ref.current?.tagName).toBe('INPUT')
  })

  it('disabled → native disabled (removed from tab order)', () => {
    const el = renderInput(<Input aria-label="Name" disabled />)
    expect(el.disabled).toBe(true)
  })

  it('invalid → aria-invalid="true"', () => {
    const el = renderInput(<Input aria-label="Name" invalid />)
    expect(el.getAttribute('aria-invalid')).toBe('true')
  })

  it('readOnly → native readOnly + aria-readonly', () => {
    const el = renderInput(<Input aria-label="Name" readOnly />)
    expect(el.readOnly).toBe(true)
    expect(el.getAttribute('aria-readonly')).toBe('true')
  })

  it('required → aria-required="true"', () => {
    const el = renderInput(<Input aria-label="Name" required />)
    expect(el.getAttribute('aria-required')).toBe('true')
  })

  it('forwards consumer aria-describedby (error-text linkage)', () => {
    const el = renderInput(<Input aria-label="Name" invalid aria-describedby="err-1" />)
    expect(el.getAttribute('aria-describedby')).toBe('err-1')
  })

  // Locks error-over-focus PRECEDENCE (jsdom can't compute :has()/:focus-visible, but it can assert the two hooks the
  // guarantee rests on): the frame carries `vida-input-invalid` (the `:not(.vida-input-invalid)` guard that stops the
  // injected focus-border from overriding danger) AND Tamagui emits the danger border. Guards against a regression
  // dropping either. (Post-impl critique + focus-visible reconcile.)
  it('invalid frame carries the guard class + the danger border (error precedence)', () => {
    const el = renderInput(<Input aria-label="Name" invalid />)
    const frame = el.parentElement
    if (frame === null) throw new Error('Input frame not found')
    expect(frame.className).toContain('vida-input-invalid')
    expect(frame.className).toContain('borderError')
  })

  it('a valid frame does NOT carry the invalid guard class', () => {
    const el = renderInput(<Input aria-label="Name" />)
    const frame = el.parentElement
    if (frame === null) throw new Error('Input frame not found')
    expect(frame.className).toContain('vida-input-frame')
    expect(frame.className).not.toContain('vida-input-invalid')
  })

  it('warns when there is no accessible name (no id / aria-label / aria-labelledby)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    renderInput(<Input placeholder="Search" />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('accessible name'))
    warn.mockRestore()
  })

  it('does not warn when named (aria-label or id)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(
      <UIProvider>
        <Input aria-label="Name" />
        <Input id="email" />
      </UIProvider>,
    )
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
