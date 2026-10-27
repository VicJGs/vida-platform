// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { UIProvider } from '@vida/ui'
import type { EditorDocument } from '@vida/types'
import { STANDARD_BLOCK_EXTENSIONS } from './extensions/standard-blocks'
import { calloutInsertContent } from './extensions/callout'
import { EditorToolbar } from './toolbar'
import { VidaEditor } from './editor'

// NB: this package's test setup does NOT load @testing-library/jest-dom (see test-setup.ts) — assertions use vanilla
// matchers + DOM properties, matching editor.test.tsx / standard-blocks.test.tsx.
const editors: Editor[] = []
function headless(content: string | EditorDocument = '<p>hello world</p>'): Editor {
  const e = new Editor({ extensions: [StarterKit, ...STANDARD_BLOCK_EXTENSIONS], content })
  editors.push(e)
  // A TextSelection WITHIN the content (not selectAll → an AllSelection, for which isActive/toggle reflect wrongly).
  const size = e.state.doc.content.size
  e.commands.setTextSelection({ from: 1, to: Math.max(1, size - 1) })
  return e
}
afterEach(() => {
  cleanup()
  while (editors.length) editors.pop()?.destroy()
})

function renderToolbar(editor: Editor) {
  return render(
    <UIProvider>
      <EditorToolbar editor={editor} />
    </UIProvider>,
  )
}
const btn = (name: string | RegExp, opts: Record<string, unknown> = {}) =>
  screen.getByRole('button', { name, ...opts }) as HTMLButtonElement

describe('EditorToolbar — structure & a11y', () => {
  it('is a role=toolbar with an accessible name and horizontal orientation', () => {
    renderToolbar(headless())
    const toolbar = screen.getByRole('toolbar', { name: 'Formatting' })
    expect(toolbar.getAttribute('aria-orientation')).toBe('horizontal')
  })

  it('renders the mark buttons with aria-pressed and the two menu triggers', () => {
    renderToolbar(headless())
    for (const name of ['Bold', 'Italic', 'Underline', 'Strikethrough', 'Inline code']) {
      expect(btn(name).hasAttribute('aria-pressed')).toBe(true)
    }
    expect(btn(/Block type:/)).toBeTruthy()
    expect(btn('Insert block')).toBeTruthy()
    // action buttons are NOT toggles → no aria-pressed
    expect(btn('Undo').hasAttribute('aria-pressed')).toBe(false)
  })
})

describe('EditorToolbar — active-state reflection (BR-E3-2)', () => {
  it('reflects an active mark via aria-pressed', () => {
    renderToolbar(headless('<p><strong>bold text</strong></p>'))
    expect(btn('Bold', { pressed: true })).toBeTruthy()
    expect(btn('Italic', { pressed: false })).toBeTruthy()
  })

  it('the block-type trigger label reflects the active block', () => {
    renderToolbar(headless('<h1>Title</h1>'))
    expect(btn('Block type: Heading 1')).toBeTruthy()
  })

  it('toggling Bold updates the editor AND re-renders aria-pressed (useEditorState path)', async () => {
    const user = userEvent.setup()
    const editor = headless('<p>hello world</p>')
    renderToolbar(editor)
    expect(editor.isActive('bold')).toBe(false)
    await user.click(btn('Bold'))
    await waitFor(() => expect(editor.isActive('bold')).toBe(true))
    await waitFor(() => expect(btn('Bold').getAttribute('aria-pressed')).toBe('true'))
  })
})

describe('EditorToolbar — insert', () => {
  it('the callout insert payload round-trips to a callout node (BR-E3-4a)', () => {
    const editor = headless('<p>x</p>')
    editor.chain().focus().insertContent(calloutInsertContent()).run()
    const types = editor.getJSON().content?.map((n) => n.type)
    expect(types).toContain('callout')
  })

  it('inserts a deterministic 3×3 table with a header row via the Insert menu', async () => {
    const user = userEvent.setup()
    const editor = headless('<p>x</p>')
    renderToolbar(editor)
    await user.click(btn('Insert block'))
    await user.click(await screen.findByRole('menuitem', { name: 'Table' }))
    await waitFor(() => {
      const table = editor.getJSON().content?.find((n) => n.type === 'table')
      expect(table).toBeDefined()
      expect(table?.content).toHaveLength(3) // 3 rows
    })
  })
})

describe('EditorToolbar — undo/redo disabled state (BR-E3-5)', () => {
  it('undo is disabled on a fresh doc and enables after an edit', async () => {
    const editor = headless('<p>x</p>')
    renderToolbar(editor)
    expect(btn('Undo').disabled).toBe(true)
    editor.chain().focus().insertContent(' more').run()
    await waitFor(() => expect(btn('Undo').disabled).toBe(false))
  })
})

describe('EditorToolbar — roving tabindex (APG toolbar)', () => {
  it('is a single tab stop and arrows/Home/End move focus; vertical arrows are left to the menus (M2)', async () => {
    const user = userEvent.setup()
    renderToolbar(headless())
    const bold = btn('Bold')
    const italic = btn('Italic')

    // exactly one control is the tab stop initially (Bold)
    const tabbable = screen.getAllByRole('button').filter((b) => b.getAttribute('tabindex') === '0')
    expect(tabbable).toEqual([bold])

    bold.focus()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(italic)
    expect(italic.getAttribute('tabindex')).toBe('0')
    expect(bold.getAttribute('tabindex')).toBe('-1')

    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(bold)

    // End lands on the last ENABLED control; still exactly one tab stop
    await user.keyboard('{End}')
    const stops = screen.getAllByRole('button').filter((b) => b.getAttribute('tabindex') === '0')
    expect(stops).toHaveLength(1)
    expect(document.activeElement).toBe(stops[0])

    // the roving handler ignores vertical arrows (Menu owns ArrowDown/Up) → focus does not move
    bold.focus()
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(bold)
  })
})

describe('EditorToolbar — can()-gated disable + tab-stop invariants (BR-E3-5, MAT-A/B)', () => {
  it('a mark disables inside a code block', () => {
    renderToolbar(headless('<pre><code>code here</code></pre>'))
    expect(btn('Bold').disabled).toBe(true)
  })

  it('never has zero tab stops even when many controls disable (a menu trigger is always enabled)', () => {
    renderToolbar(headless('<pre><code>code here</code></pre>')) // marks disabled here
    const stops = screen.getAllByRole('button').filter((b) => b.getAttribute('tabindex') === '0')
    expect(stops).toHaveLength(1)
    expect((stops[0] as HTMLButtonElement).disabled).toBe(false)
  })

  it('the callout insert item is disabled inside an existing callout (no nesting)', async () => {
    const user = userEvent.setup()
    const editor = headless({
      type: 'doc',
      content: [
        {
          type: 'callout',
          attrs: { variant: 'info' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }],
        },
      ],
    })
    renderToolbar(editor)
    await user.click(btn('Insert block'))
    const callout = await screen.findByRole('menuitem', { name: 'Callout' })
    expect(callout.getAttribute('aria-disabled')).toBe('true')
  })
})

describe('EditorToolbar — does not steal focus (§5, PREFLIGHT F4)', () => {
  it('mounting the toolbar leaves focus where it was (no control auto-focuses)', () => {
    renderToolbar(headless())
    // no roving control grabs focus on mount — the single tab stop is tabbable, not focused
    expect(document.activeElement === document.body || document.activeElement === null).toBe(true)
  })
})

describe('VidaEditor — toolbar mount gating (BR-E3-6)', () => {
  it('renders the toolbar by default once the editor mounts', async () => {
    render(
      <UIProvider>
        <VidaEditor aria-label="Notes" />
      </UIProvider>,
    )
    await waitFor(() => expect(screen.getByRole('toolbar')).toBeTruthy())
  })

  it('hides the toolbar when editable=false', async () => {
    render(
      <UIProvider>
        <VidaEditor aria-label="Notes" editable={false} />
      </UIProvider>,
    )
    await waitFor(() => expect(screen.getByRole('textbox')).toBeTruthy())
    expect(screen.queryByRole('toolbar')).toBeNull()
  })

  it('hides the toolbar when toolbar={false}', async () => {
    render(
      <UIProvider>
        <VidaEditor aria-label="Notes" toolbar={false} />
      </UIProvider>,
    )
    await waitFor(() => expect(screen.getByRole('textbox')).toBeTruthy())
    expect(screen.queryByRole('toolbar')).toBeNull()
  })
})
