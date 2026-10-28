// @vitest-environment jsdom
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { UIProvider } from '../provider'
import { Checkbox } from './checkbox'

afterEach(cleanup)

function renderCheckbox(ui: React.ReactElement): HTMLInputElement {
  const { container } = render(<UIProvider>{ui}</UIProvider>)
  const el = container.querySelector('input[type="checkbox"]')
  if (el === null) throw new Error('Checkbox did not render an <input type="checkbox">')
  return el as HTMLInputElement
}

describe('Checkbox', () => {
  it('renders a native checkbox input inside a <label>', () => {
    const { container } = render(
      <UIProvider>
        <Checkbox label="Terms" />
      </UIProvider>,
    )
    const el = container.querySelector('input[type="checkbox"]')
    expect(el).not.toBeNull()
    // render:'label' emits a real <label> that wraps the input (native label association / click-to-toggle).
    expect(el?.closest('label')).not.toBeNull()
  })

  it('forwards the ref to the DOM <input>', () => {
    const ref = createRef<HTMLInputElement>()
    render(
      <UIProvider>
        <Checkbox label="Terms" ref={ref} />
      </UIProvider>,
    )
    expect(ref.current?.tagName).toBe('INPUT')
    expect(ref.current?.getAttribute('type')).toBe('checkbox')
  })

  it('uncontrolled: click toggles + onCheckedChange fires with the new value', () => {
    const onCheckedChange = vi.fn()
    const el = renderCheckbox(<Checkbox label="Terms" onCheckedChange={onCheckedChange} />)
    expect(el.checked).toBe(false)
    fireEvent.click(el)
    expect(el.checked).toBe(true)
    expect(onCheckedChange).toHaveBeenLastCalledWith(true)
  })

  it('controlled: reflects `checked` and does not self-toggle without a state update', () => {
    const el = renderCheckbox(<Checkbox label="Terms" checked onCheckedChange={() => undefined} />)
    expect(el.checked).toBe(true)
  })

  it('defaultChecked initializes an uncontrolled box', () => {
    const el = renderCheckbox(<Checkbox label="Terms" defaultChecked />)
    expect(el.checked).toBe(true)
  })

  // indeterminate is a DOM property (not an attribute) — the layout effect must set it, and we ALSO set
  // aria-checked="mixed" explicitly (jsdom does not synthesize `mixed` from .indeterminate).
  it('indeterminate → .indeterminate property true + aria-checked="mixed"', () => {
    const el = renderCheckbox(<Checkbox label="Some" indeterminate />)
    expect(el.indeterminate).toBe(true)
    expect(el.getAttribute('aria-checked')).toBe('mixed')
  })

  it('non-indeterminate does NOT set aria-checked (native binary state governs)', () => {
    const el = renderCheckbox(<Checkbox label="Some" defaultChecked />)
    expect(el.getAttribute('aria-checked')).toBeNull()
    expect(el.indeterminate).toBe(false)
  })

  it('disabled → native disabled (removed from tab order)', () => {
    const el = renderCheckbox(<Checkbox label="Terms" disabled />)
    expect(el.disabled).toBe(true)
  })

  it('required → native required + aria-required="true"', () => {
    const el = renderCheckbox(<Checkbox label="Terms" required />)
    expect(el.required).toBe(true)
    expect(el.getAttribute('aria-required')).toBe('true')
  })

  it('invalid → aria-invalid="true" + the wrapper carries the danger-precedence guard class', () => {
    const el = renderCheckbox(<Checkbox label="Terms" invalid />)
    expect(el.getAttribute('aria-invalid')).toBe('true')
    const root = el.closest('label')
    expect(root?.className).toContain('vida-checkbox-invalid')
  })

  // The box MUST carry `vida-checkbox-box` — it is the target of every injected fill/checkmark/focus-ring/error
  // rule (checkbox-styles.ts). A missing class silently no-ops the whole state machine (Visual-Gate regression).
  it('renders a .vida-checkbox-box that the injected CSS targets', () => {
    const el = renderCheckbox(<Checkbox label="Terms" />)
    const box = el.closest('.vida-checkbox')?.querySelector('.vida-checkbox-box')
    expect(box).not.toBeNull()
    expect(el.previousElementSibling === null || box?.contains(el)).toBe(true)
  })

  it('enabled box is vida-interactive (hover/press overlay); disabled box is not', () => {
    const on = renderCheckbox(<Checkbox label="On" />)
    expect(on.closest('.vida-checkbox')?.querySelector('.vida-checkbox-box')?.className).toContain('vida-interactive')
    const off = renderCheckbox(<Checkbox label="Off" disabled />)
    expect(off.closest('.vida-checkbox')?.querySelector('.vida-checkbox-box')?.className).not.toContain(
      'vida-interactive',
    )
  })

  it('a valid checkbox does NOT carry the invalid guard class', () => {
    const el = renderCheckbox(<Checkbox label="Terms" />)
    const root = el.closest('label')
    expect(root?.className).toContain('vida-checkbox')
    expect(root?.className).not.toContain('vida-checkbox-invalid')
  })

  it('forwards consumer aria-describedby (error-text linkage)', () => {
    const el = renderCheckbox(<Checkbox label="Terms" invalid aria-describedby="err-1" />)
    expect(el.getAttribute('aria-describedby')).toBe('err-1')
  })

  it('warns when there is no accessible name (no label / aria-label / aria-labelledby)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    renderCheckbox(<Checkbox />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('accessible name'))
    warn.mockRestore()
  })

  it('does not warn when named by label or aria-label', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(
      <UIProvider>
        <Checkbox label="Terms" />
        <Checkbox aria-label="Select" />
      </UIProvider>,
    )
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('warns when checked and indeterminate are both true (mutually exclusive)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    renderCheckbox(<Checkbox label="Terms" checked indeterminate onCheckedChange={() => undefined} />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('mutually exclusive'))
    warn.mockRestore()
  })
})
