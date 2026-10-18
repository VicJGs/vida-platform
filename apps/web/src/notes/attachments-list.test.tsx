// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { AttachmentsView } from './attachments-list'
import type { AttachmentItem } from './attachments'

afterEach(cleanup)
const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

const items: AttachmentItem[] = [
  { id: 'a', filename: 'brief.pdf', mime: 'application/pdf', sizeBytes: 248_000 },
  { id: 'b', filename: 'shot.png', mime: 'image/png', sizeBytes: 1_540_000 },
]
const noop = () => {}

describe('AttachmentsView (S6 — EC-8)', () => {
  it('empty → honest message + Add affordance (no dead state)', () => {
    const { getByText, getByRole } = renderUI(<AttachmentsView attachments={[]} state="empty" onAdd={noop} onRemove={noop} />)
    expect(getByText('No attachments yet.')).not.toBeNull()
    expect(getByRole('button', { name: 'Add attachment' })).not.toBeNull()
  })

  it('error → calm status', () => {
    const { getByRole } = renderUI(<AttachmentsView attachments={[]} state="error" onAdd={noop} onRemove={noop} />)
    expect(getByRole('status').textContent).toContain('Couldn’t load attachments')
  })

  it('loading → aria-busy', () => {
    const { container } = renderUI(<AttachmentsView attachments={[]} state="loading" onAdd={noop} onRemove={noop} />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('populated → a list of rows with filename + human-readable size', () => {
    const { getAllByRole, getByText } = renderUI(<AttachmentsView attachments={items} state="populated" onAdd={noop} onRemove={noop} />)
    expect(getAllByRole('listitem')).toHaveLength(2)
    expect(getByText('brief.pdf')).not.toBeNull()
    expect(getByText('242.2 KB')).not.toBeNull() // 248000 / 1024
    expect(getByText('1.5 MB')).not.toBeNull()
  })

  it('Add fires onAdd; per-row Remove fires onRemove(id)', () => {
    const onAdd = vi.fn()
    const onRemove = vi.fn()
    const { getByRole } = renderUI(<AttachmentsView attachments={items} state="populated" onAdd={onAdd} onRemove={onRemove} />)
    fireEvent.click(getByRole('button', { name: 'Add attachment' }))
    expect(onAdd).toHaveBeenCalledOnce()
    fireEvent.click(getByRole('button', { name: 'Remove shot.png' }))
    expect(onRemove).toHaveBeenCalledWith('b')
  })

  it('EC-22 — rows carry file-type Lucide icons (svg)', () => {
    const { container } = renderUI(<AttachmentsView attachments={items} state="populated" onAdd={noop} onRemove={noop} />)
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0)
  })
})
