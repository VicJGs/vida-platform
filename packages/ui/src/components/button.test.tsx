// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { UIProvider } from '../provider'
import { Button } from './button'

afterEach(cleanup)

function renderButton(ui: React.ReactElement): HTMLButtonElement {
  const { container } = render(<UIProvider>{ui}</UIProvider>)
  const btn = container.querySelector('button')
  if (btn === null) throw new Error('Button did not render a <button> element')
  return btn
}

describe('Button', () => {
  it('renders a native <button type="button"> with its label', () => {
    const btn = renderButton(<Button>Go</Button>)
    expect(btn.getAttribute('type')).toBe('button')
    expect(btn.textContent).toContain('Go')
  })

  it('disabled → native disabled (removed from tab order)', () => {
    const btn = renderButton(<Button disabled>Go</Button>)
    expect(btn.disabled).toBe(true)
  })

  // Locks the B1 fix: loading ≠ disabled — a busy button stays focusable + announced, never native-disabled.
  it('loading → aria-busy + aria-disabled, but NOT native disabled', () => {
    const btn = renderButton(<Button loading>Save</Button>)
    expect(btn.getAttribute('aria-busy')).toBe('true')
    expect(btn.getAttribute('aria-disabled')).toBe('true')
    expect(btn.disabled).toBe(false)
  })

  it('loading forces type="button" to block native form submit', () => {
    const btn = renderButton(
      <Button loading type="submit">
        Save
      </Button>,
    )
    expect(btn.getAttribute('type')).toBe('button')
  })

  it('warns when an icon-only button has no aria-label', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    renderButton(<Button leading={<span>*</span>} />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('aria-label'))
    warn.mockRestore()
  })

  it('does not warn for an icon-only button WITH aria-label', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    renderButton(<Button leading={<span>*</span>} aria-label="Star" />)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
