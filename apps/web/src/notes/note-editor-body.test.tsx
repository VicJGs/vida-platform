// @vitest-environment jsdom
// ============================================================================
// notes-rescope R0 · EC-33 / BR-R0-1 — NoteEditorBody never edits or writes an unreadable body (PLAN-R0 test 10).
// The editor is mocked to a probe that exposes its props, so both entry paths are driven deterministically:
// malformed-at-load (no editor mounts) and the editor's own `onInvalidContent` (the switch after mount).
// ============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from '@vida/ui'
import type { EditorDocument } from '@vida/types'
import type { NoteEntityData } from './use-note-entity'

const writeSpy = vi.fn<(id: string, doc: EditorDocument) => Promise<unknown>>()
vi.mock('../db/composition-root', () => ({
  getServices: () => Promise.resolve({ notes: { writePageContent: (id: string, d: EditorDocument) => writeSpy(id, d) } }),
}))

interface ProbeProps {
  onChange?: (doc: EditorDocument) => void
  onInvalidContent?: (e: Error) => void
}
let probe: ProbeProps = {}
vi.mock('@vida/editor', () => ({
  VidaEditor: (props: ProbeProps) => {
    probe = props
    return <div data-testid="editor" />
  },
  toMarkdown: (doc: { content: unknown[] }) => `md:${doc.content.length}`,
}))

const downloadSpy = vi.fn()
vi.mock('./export-copy', () => ({
  copyFilename: (title: string, ext: string) => `${title}.${ext}`,
  downloadText: (...a: unknown[]) => downloadSpy(...a),
}))

import { NoteEditorBody } from './note-editor-body'

const edited: EditorDocument = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }] }

function page(over: Partial<NoteEntityData>): NoteEntityData {
  return {
    id: 'p1', type: 'note', title: 'Plan', content: null, contentStatus: 'absent', rawContent: null,
    favorite: false, archived: false, updated: 'now', journalDate: null, icon: null, cover: null, ...over,
  }
}

function renderBody(p: NoteEntityData) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <UIProvider>
        <NoteEditorBody page={p} />
      </UIProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  probe = {}
  writeSpy.mockReset()
  writeSpy.mockResolvedValue(undefined)
  downloadSpy.mockReset()
})
afterEach(cleanup)

describe('NoteEditorBody — EC-33 unreadable content (notes-rescope R0)', () => {
  it('malformed at load (shape-invalid bytes) → the read-only notice, NO editor, only the lossless export', () => {
    const raw = '{"type":"doc"}' // what parseContentResult really tags `malformed` (a doc without content)
    const { queryByTestId, getByRole, getByText, queryByText } = renderBody(page({ contentStatus: 'malformed', rawContent: raw }))
    expect(queryByTestId('editor')).toBeNull()
    expect(getByRole('heading', { level: 2 }).textContent).toBe('This page can’t be opened for editing')
    // The live region carries the sentence only — no controls inside it (they'd be read out as part of the message).
    const status = getByRole('status')
    expect(status.textContent).toContain('Nothing will be overwritten')
    expect(status.querySelector('button')).toBeNull()
    expect(getByText('Export a copy')).not.toBeNull()
    expect(queryByText('Export as Markdown')).toBeNull()
  })

  it('bytes that are not JSON → only the lossless "Export a copy"', () => {
    const { getByText, queryByText } = renderBody(page({ contentStatus: 'malformed', rawContent: '{not json' }))
    expect(getByText('Export a copy')).not.toBeNull()
    expect(queryByText('Export as Markdown')).toBeNull()
  })

  it('"Export a copy" downloads the stored bytes as .json; Markdown as .md (the editor-detected path)', () => {
    const raw = '{"type":"doc","content":[{"type":"paragraph"}]}'
    const { getByText } = renderBody(page({ contentStatus: 'ok', content: JSON.parse(raw) as EditorDocument, rawContent: raw }))
    act(() => probe.onInvalidContent?.(new Error('Invalid content')))
    act(() => getByText('Export a copy').click())
    expect(downloadSpy).toHaveBeenLastCalledWith('Plan.json', raw, 'application/json')
    act(() => getByText('Export as Markdown').click())
    expect(downloadSpy).toHaveBeenLastCalledWith('Plan.md', 'md:1', 'text/markdown')
  })

  it('the editor reports invalid content → switches to the notice and LOCKS the write seam', async () => {
    const raw = '{"type":"doc","content":[{"type":"futureBlock"}]}'
    const { getByTestId, queryByTestId, getByRole } = renderBody(
      page({ contentStatus: 'ok', content: JSON.parse(raw) as EditorDocument, rawContent: raw }),
    )
    expect(getByTestId('editor')).not.toBeNull()
    const { onChange, onInvalidContent } = probe
    act(() => {
      onInvalidContent?.(new Error('Invalid content'))
      onChange?.(edited) // a stray emit after the error must not be written
    })
    expect(queryByTestId('editor')).toBeNull()
    expect(getByRole('heading', { level: 2 }).textContent).toContain('can’t be opened')
    expect(getByRole('status').textContent).toContain('Nothing will be overwritten')
    await act(async () => {
      await new Promise((r) => setTimeout(r, 700))
    })
    expect(writeSpy).not.toHaveBeenCalled()
  })

  it('a readable page mounts the editor and still persists edits (no regression)', async () => {
    renderBody(page({ contentStatus: 'absent' }))
    act(() => {
      probe.onChange?.({ type: 'doc', content: [{ type: 'paragraph' }] }) // mount echo → baseline
      probe.onChange?.(edited)
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 700))
    })
    expect(writeSpy).toHaveBeenCalledWith('p1', edited)
  })
})
