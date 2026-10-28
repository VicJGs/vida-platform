// @vitest-environment jsdom
// notes-rescope R3 · G9 · BR-R3-4 — the cover picker (test C3).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from '@vida/ui'
import { CoverPickerDialog } from './cover-picker'

afterEach(cleanup)
const renderUI = (ui: React.ReactNode) =>
  render(
    <UIProvider>
      <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>
    </UIProvider>,
  )

describe('CoverPickerDialog', () => {
  it('an invalid link shows an inline error and writes nothing', () => {
    const onChoose = vi.fn()
    const r = renderUI(<CoverPickerDialog open onOpenChange={vi.fn()} pageId="p1" current={null} onChoose={onChoose} />)
    fireEvent.change(r.getByRole('textbox', { name: 'Image link' }), { target: { value: 'javascript:alert(1)' } })
    fireEvent.click(r.getByRole('button', { name: 'Use link' }))
    expect(onChoose).not.toHaveBeenCalled()
    expect(r.getByRole('textbox', { name: 'Image link' }).getAttribute('aria-invalid')).toBe('true')
    expect(r.getByText('Enter an image link starting with http:// or https://')).not.toBeNull()
  })

  it('a valid link writes it and closes', () => {
    const onChoose = vi.fn()
    const onOpenChange = vi.fn()
    const r = renderUI(
      <CoverPickerDialog open onOpenChange={onOpenChange} pageId="p1" current={null} onChoose={onChoose} />,
    )
    fireEvent.change(r.getByRole('textbox', { name: 'Image link' }), { target: { value: ' https://e.com/c.png ' } })
    fireEvent.click(r.getByRole('button', { name: 'Use link' }))
    expect(onChoose).toHaveBeenCalledWith('https://e.com/c.png')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('the attachment section shows the honest empty line while attachments are not live (R4)', () => {
    const r = renderUI(<CoverPickerDialog open onOpenChange={vi.fn()} pageId="p1" current={null} onChoose={vi.fn()} />)
    expect(r.getByText('No image attachments on this page yet.')).not.toBeNull()
  })

  it('"Remove cover" only when set, and it writes null', () => {
    const onChoose = vi.fn()
    expect(
      renderUI(
        <CoverPickerDialog open onOpenChange={vi.fn()} pageId="p1" current={null} onChoose={onChoose} />,
      ).queryByRole('button', { name: 'Remove cover' }),
    ).toBeNull()
    cleanup()
    const r = renderUI(
      <CoverPickerDialog open onOpenChange={vi.fn()} pageId="p1" current="https://e.com/c.png" onChoose={onChoose} />,
    )
    fireEvent.click(r.getByRole('button', { name: 'Remove cover' }))
    expect(onChoose).toHaveBeenCalledWith(null)
  })
})
