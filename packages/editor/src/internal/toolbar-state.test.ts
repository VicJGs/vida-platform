// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { EditorDocument } from '@vida/types'
import { STANDARD_BLOCK_EXTENSIONS } from '../extensions/standard-blocks'
import { resolveActiveBlock, selectToolbarState } from './toolbar-state'

const editors: Editor[] = []
function ed(content: string | EditorDocument): Editor {
  const e = new Editor({ extensions: [StarterKit, ...STANDARD_BLOCK_EXTENSIONS], content })
  editors.push(e)
  // A TextSelection WITHIN the content (not selectAll → an AllSelection spanning the doc boundaries, for which
  // isActive('heading'|'bold'|…) returns false).
  const size = e.state.doc.content.size
  e.commands.setTextSelection({ from: 1, to: Math.max(1, size - 1) })
  return e
}
afterEach(() => {
  while (editors.length) editors.pop()?.destroy()
})

const calloutDoc: EditorDocument = {
  type: 'doc',
  content: [
    {
      type: 'callout',
      attrs: { variant: 'info' },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }],
    },
  ],
}
const taskDoc: EditorDocument = {
  type: 'doc',
  content: [
    {
      type: 'taskList',
      content: [
        {
          type: 'taskItem',
          attrs: { checked: false },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }],
        },
      ],
    },
  ],
}

describe('resolveActiveBlock', () => {
  it.each([
    ['<p>x</p>', 'paragraph'],
    ['<h1>x</h1>', 'heading1'],
    ['<h2>x</h2>', 'heading2'],
    ['<h3>x</h3>', 'heading3'],
    ['<blockquote><p>x</p></blockquote>', 'blockquote'],
    ['<pre><code>x</code></pre>', 'codeBlock'],
    ['<ul><li><p>x</p></li></ul>', 'bulletList'],
    ['<ol><li><p>x</p></li></ol>', 'orderedList'],
  ] as const)('%s → %s', (html, expected) => {
    expect(resolveActiveBlock(ed(html))).toBe(expected)
  })

  it('taskList (nested in taskItem) resolves to taskList, not bulletList (N3)', () => {
    expect(resolveActiveBlock(ed(taskDoc))).toBe('taskList')
  })

  it('callout resolves to callout', () => {
    expect(resolveActiveBlock(ed(calloutDoc))).toBe('callout')
  })
})

describe('selectToolbarState', () => {
  it('reflects the active marks at the selection', () => {
    const s = selectToolbarState(ed('<p><strong><em>x</em></strong></p>'))
    expect(s.marks.bold).toBe(true)
    expect(s.marks.italic).toBe(true)
    expect(s.marks.underline).toBe(false)
    expect(s.marks.strike).toBe(false)
  })

  it('reflects the active block', () => {
    expect(selectToolbarState(ed('<h2>x</h2>')).activeBlock).toBe('heading2')
  })

  it('can.undo is false on a fresh doc and true after an edit; can.redo tracks history', () => {
    const e = ed('<p>x</p>')
    expect(selectToolbarState(e).can.undo).toBe(false)
    expect(selectToolbarState(e).can.redo).toBe(false)
    e.commands.insertContent(' more')
    expect(selectToolbarState(e).can.undo).toBe(true)
    e.commands.undo()
    expect(selectToolbarState(e).can.redo).toBe(true)
  })

  it('mark commands are enabled on an editable text selection', () => {
    const s = selectToolbarState(ed('<p>hello</p>'))
    expect(s.can.bold).toBe(true)
    expect(s.can.italic).toBe(true)
  })
})
