// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import type { EditorDocument } from '@vida/types'
import { CanvasEditor, type CanvasEditorProps } from './canvas-editor'

afterEach(cleanup)

const DOC: EditorDocument = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'seeded body' }] }] }

function renderCanvas(props: Partial<CanvasEditorProps> = {}) {
  return render(
    <UIProvider>
      <CanvasEditor title="Weekly Review" eyebrow="Note" {...props} />
    </UIProvider>,
  )
}

describe('CanvasEditor', () => {
  it('renders the masthead title + eyebrow (names the region)', () => {
    const { getByText } = renderCanvas({ meta: 'Edited just now' })
    expect(getByText('Weekly Review')).toBeTruthy()
    expect(getByText('Note')).toBeTruthy()
    expect(getByText('Edited just now')).toBeTruthy()
  })

  it('success → hosts the VidaEditor (chrome=bare frame present)', async () => {
    const { container } = renderCanvas({ doc: DOC })
    await waitFor(() => expect(container.querySelector('.vida-editor-frame')).not.toBeNull())
    // The editor sits inside the notebook page wrapper (the sheet).
    expect(container.querySelector('.vida-canvas-editor-page .vida-editor-frame')).not.toBeNull()
    await waitFor(() => expect(container.querySelector('.ProseMirror')?.textContent).toContain('seeded body'))
  })

  it('empty → teaching EmptyState, no editor mounted', () => {
    const { getByText, container } = renderCanvas({ state: 'empty' })
    expect(getByText('A blank page')).toBeTruthy()
    expect(container.querySelector('.vida-editor-frame')).toBeNull()
  })

  it('error → calm privacy-preserving message, no editor mounted', () => {
    const { getByText, container } = renderCanvas({ state: 'error' })
    expect(getByText(/Your words are safe/)).toBeTruthy()
    expect(container.querySelector('.vida-editor-frame')).toBeNull()
  })

  it('loading → skeleton, editor NOT mounted (EC-6)', () => {
    const { container } = renderCanvas({ state: 'loading' })
    expect(container.querySelector('.vida-editor-frame')).toBeNull()
  })

  it('syncState renders the SyncStatus chip; omitted → no chip', () => {
    const { getByText, rerender } = renderCanvas({ syncState: 'saved' })
    expect(getByText('Saved on this device')).toBeTruthy()
    rerender(
      <UIProvider>
        <CanvasEditor title="Weekly Review" />
      </UIProvider>,
    )
    expect(() => getByText('Saved on this device')).toThrow()
  })

  it('forwards onChange from edits (wired to the editor)', async () => {
    const onChange = vi.fn()
    const { container } = renderCanvas({ doc: DOC, onChange })
    await waitFor(() => expect(container.querySelector('.ProseMirror')).not.toBeNull())
    // onChange echoes once on mount when Tiptap normalizes the seed (BR-E1-1) — proves the wire.
    await waitFor(() => expect(onChange).toHaveBeenCalled())
  })
})
