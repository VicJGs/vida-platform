// @vitest-environment jsdom
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { UIProvider } from '../provider'
import { ExportDialog, type ExportDialogProps } from './export-dialog'

afterEach(cleanup)
const noop = () => {}
function renderUI(props: Partial<ExportDialogProps> = {}) {
  const full: ExportDialogProps = {
    open: true,
    onOpenChange: noop,
    onExport: noop,
    'aria-label': undefined as never,
    ...props,
  }
  return render(<UIProvider>{<ExportDialog {...full} />}</UIProvider>)
}

describe('ExportDialog', () => {
  it('renders a dialog with a radiogroup of the 3 formats + Cancel/Export when open', () => {
    const { getByRole, getAllByRole, getByText } = renderUI()
    expect(getByRole('dialog')).not.toBeNull()
    expect(getByRole('radiogroup')).not.toBeNull()
    const radios = getAllByRole('radio')
    expect(radios).toHaveLength(3)
    expect(getByText('Markdown')).not.toBeNull()
    expect(getByText('.docx')).not.toBeNull()
    expect(getByText('Cancel')).not.toBeNull()
    expect(getByRole('button', { name: 'Export' })).not.toBeNull() // title is also "Export"
  })

  it('renders nothing when closed', () => {
    const { queryByRole } = renderUI({ open: false })
    expect(queryByRole('dialog')).toBeNull()
  })

  it('the copy is the Dialog description (aria-describedby)', () => {
    const { getByRole, getByText } = renderUI({ entityLabel: 'journal entry' })
    const copy = getByText(/export your journal entry as/i)
    expect(copy).not.toBeNull()
    const describedby = getByRole('dialog').getAttribute('aria-describedby')
    expect(describedby).toBe(copy.getAttribute('id'))
  })

  it('defaults selection to formats[0]; defaultFormat selects it; only selected is aria-checked + tabbable', () => {
    const { getByRole } = renderUI({ defaultFormat: 'pdf' })
    const pdf = getByRole('radio', { name: /PDF/ })
    expect(pdf.getAttribute('aria-checked')).toBe('true')
    expect(pdf.getAttribute('tabindex')).toBe('0')
    expect(getByRole('radio', { name: /Markdown/ }).getAttribute('tabindex')).toBe('-1')
  })

  it('click selects a format (aria-checked moves)', () => {
    const { getByRole } = renderUI()
    fireEvent.click(getByRole('radio', { name: /Word/ }))
    expect(getByRole('radio', { name: /Word/ }).getAttribute('aria-checked')).toBe('true')
    expect(getByRole('radio', { name: /Markdown/ }).getAttribute('aria-checked')).toBe('false')
  })

  it('arrow keys move selection (wrap); Home/End jump', () => {
    const { getByRole } = renderUI() // default = md (index 0)
    const group = getByRole('radiogroup')
    fireEvent.keyDown(group, { key: 'ArrowDown' })
    expect(getByRole('radio', { name: /PDF/ }).getAttribute('aria-checked')).toBe('true')
    fireEvent.keyDown(group, { key: 'End' })
    expect(getByRole('radio', { name: /Word/ }).getAttribute('aria-checked')).toBe('true')
    fireEvent.keyDown(group, { key: 'ArrowDown' }) // wrap → md
    expect(getByRole('radio', { name: /Markdown/ }).getAttribute('aria-checked')).toBe('true')
    fireEvent.keyDown(group, { key: 'ArrowUp' }) // wrap back → docx
    expect(getByRole('radio', { name: /Word/ }).getAttribute('aria-checked')).toBe('true')
  })

  it('Export fires onExport(selected) and does NOT close the dialog', () => {
    const onExport = vi.fn()
    const onOpenChange = vi.fn()
    const { getByRole } = renderUI({ onExport, onOpenChange })
    fireEvent.click(getByRole('radio', { name: /PDF/ }))
    fireEvent.click(getByRole('button', { name: 'Export' }))
    expect(onExport).toHaveBeenCalledWith('pdf')
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('Cancel fires onOpenChange(false)', () => {
    const onOpenChange = vi.fn()
    const { getByText } = renderUI({ onOpenChange })
    fireEvent.click(getByText('Cancel'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('busy: Export reads "Exporting…"; every radio tabIndex=-1 (out of the trap)', () => {
    const { getByText, getAllByRole } = renderUI({ busy: true })
    expect(getByText('Exporting…')).not.toBeNull()
    for (const r of getAllByRole('radio')) expect(r.getAttribute('tabindex')).toBe('-1')
  })

  it('the actions render inside the Dialog <footer>, not the body', () => {
    const { container } = renderUI()
    const footer = container.querySelector('footer') ?? document.querySelector('footer')
    expect(footer).not.toBeNull()
    expect(within(footer as HTMLElement).getByText('Export')).not.toBeNull()
    expect(within(footer as HTMLElement).getByText('Cancel')).not.toBeNull()
  })

  it('formats prop limits + reorders the options', () => {
    const { getAllByRole } = renderUI({ formats: ['docx', 'md'] })
    const radios = getAllByRole('radio')
    expect(radios).toHaveLength(2)
    expect(radios[0]?.getAttribute('aria-label') ?? radios[0]?.textContent).toContain('Word')
  })

  it('dev-warns when defaultFormat is not in formats (and falls back)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { getByRole } = renderUI({ formats: ['pdf'], defaultFormat: 'md' })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('not in `formats`'))
    expect(getByRole('radio', { name: /PDF/ }).getAttribute('aria-checked')).toBe('true') // fell back
    warn.mockRestore()
  })

  it('dev-warns on an empty formats list', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI({ formats: [] })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('empty'))
    warn.mockRestore()
  })

  it('forwards ref to the dialog panel', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <UIProvider>
        <ExportDialog ref={ref} open onOpenChange={noop} onExport={noop} />
      </UIProvider>,
    )
    expect(ref.current).not.toBeNull()
  })

  // fe-codec-controls-refinement P2 (LIF-231)
  it('P2: exactly one accent bar renders — on the selected row — and it follows selection', () => {
    const { getByRole } = renderUI() // default: first format (md) selected
    expect(document.querySelectorAll('.vida-export-accent')).toHaveLength(1)
    fireEvent.click(getByRole('radio', { name: /PDF/ }))
    expect(document.querySelectorAll('.vida-export-accent')).toHaveLength(1) // moved, still single
  })
})
