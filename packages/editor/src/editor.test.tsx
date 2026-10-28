// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRef } from 'react'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UIProvider } from '@vida/ui'
import type { EditorDocument } from '@vida/types'
import { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { VidaEditor, assertEditorDocument, type VidaEditorHandle } from './editor'
import { STANDARD_BLOCK_EXTENSIONS } from './extensions/standard-blocks'
import { INTEGRATION_BLOCK_EXTENSIONS } from './extensions/integration-blocks'

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

  // S1 (#7) — the `chrome` prop. The visual border difference is a Visual-Gate concern; here we assert the
  // load-bearing BEHAVIORAL invariants: both treatments render the editor AND keep the `.vida-editor-frame`
  // host, so the injected focus-ring (`:has(.ProseMirror:focus-visible)`) + all editor-styles still apply.
  it('default chrome is framed (back-compat) — the .vida-editor-frame host renders', async () => {
    const { container } = renderEditor()
    await findTextbox(container)
    expect(container.querySelector('.vida-editor-frame')).not.toBeNull()
  })

  it('chrome="bare" still renders the editor + preserves the .vida-editor-frame host (focus-ring survives)', async () => {
    const { container } = renderEditor({ chrome: 'bare' })
    const pm = await findTextbox(container)
    expect(pm.getAttribute('role')).toBe('textbox')
    expect(container.querySelector('.vida-editor-frame')).not.toBeNull()
  })
})

// notes-rescope R0 · BR-R0-3 — the always-on content check. TipTap's lenient load (the default) replaces a doc the
// schema rejects with an EMPTY doc and the editor then emits it → the app wrote it over the stored body (C-46). With
// `enableContentCheck` the error arrives before any update; the editor goes read-only and emits nothing.
describe('VidaEditor — content check (notes-rescope R0, BR-R0-3)', () => {
  const unknownNode = { type: 'doc', content: [{ type: 'futureBlock' }] } as unknown as EditorDocument

  it('an unknown node → onInvalidContent once, ZERO onChange, read-only, no toolbar', async () => {
    const onInvalidContent = vi.fn()
    const { onChange, container } = renderEditor({ defaultValue: unknownNode, onInvalidContent })
    const pm = await findTextbox(container)
    await waitFor(() => expect(onInvalidContent).toHaveBeenCalledTimes(1))
    // Let the editable-sync effect (the mount-echo source, setEditable) run before asserting silence.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(onInvalidContent.mock.calls[0]![0]).toBeInstanceOf(Error)
    expect(onChange).not.toHaveBeenCalled()
    expect(pm.getAttribute('contenteditable')).toBe('false')
    expect(container.querySelector('[role="toolbar"]')).toBeNull()
  })

  it('an invalid editor stays silent even if the user types (no keystroke reaches onChange)', async () => {
    const user = userEvent.setup()
    const { onChange, container } = renderEditor({ defaultValue: unknownNode, onInvalidContent: vi.fn() })
    const pm = await findTextbox(container)
    await waitFor(() => expect(pm.getAttribute('contenteditable')).toBe('false'))
    await user.click(pm)
    await user.keyboard('x')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('a valid doc → no onInvalidContent; exactly ONE mount echo (BR-E1-2 unchanged; needsBaseline depends on it)', async () => {
    const onInvalidContent = vi.fn()
    const { onChange, container } = renderEditor({ defaultValue: docOf('hello'), onInvalidContent })
    await findTextbox(container)
    await waitFor(() => expect(onChange).toHaveBeenCalled())
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(onInvalidContent).not.toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledTimes(1) // render() is not StrictMode → one echo
    expect(onChange.mock.calls[0]![0]).toEqual(docOf('hello'))
  })

  it('ref.setContent with an invalid doc THROWS (enableContentCheck is inherited) and leaves the mount intact', async () => {
    const onInvalidContent = vi.fn()
    const { ref, onChange, container } = renderEditor({ defaultValue: docOf('ok'), onInvalidContent })
    const pm = await findTextbox(container)
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1)) // the valid mount echo
    const handle = ref.current
    if (handle == null) throw new Error('editor handle not mounted')
    expect(() => act(() => handle.setContent(unknownNode))).toThrow(/Invalid JSON content/)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })
    // PINNED (measured on 3.30.0): the throw is the whole effect — no contentError latch, so a healthy mount stays
    // editable with its content, and nothing is emitted. Callers must catch (none exist in the app today).
    expect(onInvalidContent).not.toHaveBeenCalled()
    expect(pm.getAttribute('contenteditable')).toBe('true')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('toolbar still renders for a valid editable doc', async () => {
    const { container } = renderEditor({ defaultValue: docOf('x') })
    await findTextbox(container)
    await waitFor(() => expect(container.querySelector('[role="toolbar"]')).not.toBeNull())
  })
})

// 6b — the schema table the app's normalizations (G4) + the core seeds (G16) rely on: these are the exact shapes
// the always-on check accepts/rejects, against the SAME extension set VidaEditor wires.
describe('content-check schema table (notes-rescope R0, 6b)', () => {
  function check(content: unknown): boolean {
    let failed = false
    const e = new Editor({
      extensions: [StarterKit, ...STANDARD_BLOCK_EXTENSIONS, ...INTEGRATION_BLOCK_EXTENSIONS],
      content: content as EditorDocument,
      enableContentCheck: true,
      onContentError: () => {
        failed = true
      },
    })
    e.destroy()
    return !failed
  }

  it.each([
    ['empty doc (`doc` is block+)', { type: 'doc', content: [] }, false],
    [
      'heading with an empty text node',
      { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '' }] }] },
      false,
    ],
    ['unknown node', { type: 'doc', content: [{ type: 'futureBlock' }] }, false],
    [
      'unknown mark',
      {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'futureMark' }] }] }],
      },
      false,
    ],
    ['one empty paragraph (the empty-seed fallback)', { type: 'doc', content: [{ type: 'paragraph' }] }, true],
    [
      'heading + paragraph (a full seed)',
      {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'T' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'type: a' }] },
        ],
      },
      true,
    ],
    [
      'heading with no content (an empty-text heading after G4 stripping)',
      { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [] }] },
      true,
    ],
  ])('%s → valid=%s', (_l, content, valid) => {
    expect(check(content)).toBe(valid)
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
