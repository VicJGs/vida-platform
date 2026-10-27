// @vitest-environment jsdom
// notes-rescope R3 · G13 · critique I2 — the Rename dialog writes only a changed title.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { RenameDialog } from './rename-dialog'

afterEach(cleanup)
const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

describe('RenameDialog', () => {
  it('Save with an unchanged title writes nothing (and closes)', () => {
    const onSave = vi.fn()
    const onOpenChange = vi.fn()
    const r = renderUI(<RenameDialog open onOpenChange={onOpenChange} value="Same" onSave={onSave} />)
    fireEvent.click(r.getByRole('button', { name: 'Save' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
  it('Enter saves a changed title once', () => {
    const onSave = vi.fn()
    const r = renderUI(<RenameDialog open onOpenChange={vi.fn()} value="Old" onSave={onSave} />)
    const input = r.getByRole('textbox', { name: 'Page title' })
    fireEvent.change(input, { target: { value: 'New' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith('New')
  })
})
