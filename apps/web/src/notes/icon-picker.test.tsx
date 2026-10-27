// @vitest-environment jsdom
// notes-rescope R3 · G7 · BR-R3-3 — the icon picker (test C2): a radiogroup; arrows select without saving.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { IconPickerDialog } from './icon-picker'
import { PAGE_ICONS } from './page-icons'

afterEach(cleanup)
const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

describe('IconPickerDialog', () => {
  it('a radiogroup of the curated set, the current icon checked', () => {
    const r = renderUI(<IconPickerDialog open onOpenChange={vi.fn()} current="star" onChoose={vi.fn()} />)
    const group = r.getByRole('radiogroup', { name: 'Icons' })
    expect(group.querySelectorAll('[role="radio"]').length).toBe(Object.keys(PAGE_ICONS).length)
    expect(r.getByRole('radio', { name: 'Star' }).getAttribute('aria-checked')).toBe('true')
  })

  it('arrow keys move focus + selection and write NOTHING; Enter commits once and closes', () => {
    const onChoose = vi.fn()
    const onOpenChange = vi.fn()
    const r = renderUI(<IconPickerDialog open onOpenChange={onOpenChange} current={null} onChoose={onChoose} />)
    const radios = r.getAllByRole('radio')
    radios[0]!.focus()
    fireEvent.keyDown(radios[0]!, { key: 'ArrowRight' })
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })
    expect(onChoose).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(radios[2])
    expect(radios[2]!.getAttribute('aria-checked')).toBe('true')
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' })
    expect(onChoose).toHaveBeenCalledTimes(1)
    expect(onChoose).toHaveBeenCalledWith(Object.keys(PAGE_ICONS)[2])
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('a click commits that icon', () => {
    const onChoose = vi.fn()
    const r = renderUI(<IconPickerDialog open onOpenChange={vi.fn()} current={null} onChoose={onChoose} />)
    fireEvent.click(r.getByRole('radio', { name: 'Book open' }))
    expect(onChoose).toHaveBeenCalledWith('book-open')
  })

  it('"Remove icon" only when one is set, and it writes null', () => {
    const onChoose = vi.fn()
    expect(renderUI(<IconPickerDialog open onOpenChange={vi.fn()} current={null} onChoose={onChoose} />).queryByRole('button', { name: 'Remove icon' })).toBeNull()
    cleanup()
    const r = renderUI(<IconPickerDialog open onOpenChange={vi.fn()} current="star" onChoose={onChoose} />)
    fireEvent.click(r.getByRole('button', { name: 'Remove icon' }))
    expect(onChoose).toHaveBeenCalledWith(null)
  })

  it('Esc closes without writing', () => {
    const onChoose = vi.fn()
    const onOpenChange = vi.fn()
    const r = renderUI(<IconPickerDialog open onOpenChange={onOpenChange} current={null} onChoose={onChoose} />)
    fireEvent.keyDown(r.getAllByRole('radio')[0]!, { key: 'Escape' })
    expect(onChoose).not.toHaveBeenCalled()
  })
})
