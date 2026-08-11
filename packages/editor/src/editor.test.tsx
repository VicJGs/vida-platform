// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRef } from 'react'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UIProvider } from '@vida/ui'
import type { EditorDocument } from '@vida/types'
import { VidaEditor, assertEditorDocument, type VidaEditorHandle } from './editor'

afterEach(cleanup)

function docOf(text: string): EditorDocument {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }
}

function renderEditor(props: Partial<React.ComponentProps<typeof VidaEditor>> = {}) {
  const ref = createRef<VidaEditorHandle>()
  const onChange = vi.fn()
  const utils = render(
    <UIProvider>
      <VidaEditor ref={ref} aria-label="Note body" onChange={onChange} {...props} />
    </UIProvider>,
  )
  return { ref, onChange, ...utils }
}

// immediatelyRender:false defers the first render to a post-mount effect, so the textbox appears asynchronously —
// waitFor(getByRole('textbox')) is the guard (never a synchronous query right after render). §7.6 gate-2 note 7.
async function findTextbox(container: HTMLElement): Promise<HTMLElement> {
  return waitFor(() => {
    const el = container.querySelector<HTMLElement>('.ProseMirror')
    if (el === null) throw new Error('editor not mounted yet')
    return el
  })
}

describe('VidaEditor', () => {
  it('renders a role=textbox with an accessible name (aria-label)', async () => {
    const { container } = renderEditor()
    const pm = await findTextbox(container)
    expect(pm.getAttribute('role')).toBe('textbox')
    expect(pm.getAttribute('aria-multiline')).toBe('true')
    expect(pm.getAttribute('aria-label')).toBe('Note body')
    expect(pm.getAttribute('contenteditable')).toBe('true')
  })

  it('editable={false} → not editable, no caret', async () => {
    const { container } = renderEditor({ editable: false })
    const pm = await findTextbox(container)
    expect(pm.getAttribute('contenteditable')).toBe('false')
  })

  it('shows the placeholder text on the empty node', async () => {
    const { container } = renderEditor({ placeholder: 'Write something…' })
    const pm = await findTextbox(container)
    const empty = pm.querySelector('.is-editor-empty')
    expect(empty?.getAttribute('data-placeholder')).toBe('Write something…')
  })

  it('seeds defaultValue and getDocument() returns a valid EditorDocument', async () => {
    const { ref, container } = renderEditor({ defaultValue: docOf('seeded') })
    await findTextbox(container)
    const doc = ref.current!.getDocument()
    expect(doc.type).toBe('doc')
    expect(container.querySelector('.ProseMirror')?.textContent).toContain('seeded')
  })

  it('ref.setContent replaces the document; getDocument reflects it', async () => {
    const { ref, container } = renderEditor({ defaultValue: docOf('before') })
    const pm = await findTextbox(container)
    act(() => ref.current!.setContent(docOf('after')))
    await waitFor(() => expect(pm.textContent).toContain('after'))
    expect(pm.textContent).not.toContain('before')
    expect(assertEditorDocument(ref.current!.getDocument()).type).toBe('doc')
  })

  it('ref.setContent does NOT emit onChange (a reset is not an edit — BR-E1-1)', async () => {
    const { ref, onChange, container } = renderEditor({ defaultValue: docOf('before') })
    const pm = await findTextbox(container)
    // Tiptap fires one benign init emit on mount (normalizing the seed); clear it, then assert the programmatic reset
    // adds NO further emit — setContent passes emitUpdate:false (v3 defaults true), so a reset never reaches onChange.
    await waitFor(() => expect(onChange).toHaveBeenCalled())
    onChange.mockClear()
    act(() => ref.current!.setContent(docOf('after')))
    await waitFor(() => expect(pm.textContent).toContain('after'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('ref.focus moves focus into the editor', async () => {
    const { ref, container } = renderEditor()
    const pm = await findTextbox(container)
    act(() => ref.current!.focus())
    await waitFor(() => expect(document.activeElement).toBe(pm))
  })

  it('emits a valid EditorDocument through onChange on a user edit', async () => {
    const user = userEvent.setup()
    const { onChange, container } = renderEditor()
    const pm = await findTextbox(container)
    await user.click(pm)
    await user.keyboard('hi')
    await waitFor(() => expect(onChange).toHaveBeenCalled())
    const lastDoc = onChange.mock.calls.at(-1)![0] as EditorDocument
    expect(lastDoc.type).toBe('doc')
    expect(Array.isArray(lastDoc.content)).toBe(true)
  })
})

// The material §6 gate: the RUNTIME structural assertion (NOT a bare cast) that stops a Tiptap JSONContent shape
// drift from reaching E6/persistence undetected.
describe('assertEditorDocument', () => {
  it('accepts a valid doc-rooted document', () => {
    const doc = docOf('ok')
    expect(assertEditorDocument(doc)).toBe(doc)
  })

  it.each([
    ['null', null],
    ['a non-object', 42],
    ['a non-doc root type', { type: 'paragraph', content: [] }],
    ['a missing content array', { type: 'doc' }],
    ['content not an array', { type: 'doc', content: {} }],
    ['a child without a string type', { type: 'doc', content: [{ text: 'x' }] }],
  ])('throws on %s', (_label, bad) => {
    expect(() => assertEditorDocument(bad)).toThrow()
  })
})
