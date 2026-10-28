// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { createRef } from 'react'
import { cleanup, render, waitFor } from '@testing-library/react'
import { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { UIProvider } from '@vida/ui'
import { STANDARD_BLOCK_TYPE, type EditorDocument, type EditorNode } from '@vida/types'
import { VidaEditor, assertEditorDocument, type VidaEditorHandle } from '../editor'
import { STANDARD_BLOCK_EXTENSIONS } from './standard-blocks'
import { CALLOUT_VARIANT } from './callout'

// A headless editor built from the SAME extension set VidaEditor wires (E1's StarterKit + the E2 standard blocks) —
// lets us introspect the ProseMirror schema for the parity gate. Placeholder adds no node, so it is omitted.
const editors: Editor[] = []
function headless(content?: EditorDocument | string): Editor {
  const e = new Editor({ extensions: [StarterKit, ...STANDARD_BLOCK_EXTENSIONS], content: content ?? '' })
  editors.push(e)
  return e
}
afterEach(() => {
  cleanup()
  while (editors.length) editors.pop()?.destroy()
})

const doc = (content: EditorNode[]): EditorDocument => ({ type: 'doc', content })
const para = (text = 'x'): EditorNode => ({ type: 'paragraph', content: [{ type: 'text', text }] })

// Minimal schema-valid fixtures for each E2 block (seeded via defaultValue — the only insertion path pre-toolbar/menu).
const FIXTURES: Record<'taskList' | 'image' | 'table' | 'callout', EditorNode> = {
  taskList: { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [para('todo')] }] },
  image: { type: 'image', attrs: { src: 'https://example.com/a.png', alt: 'a' } },
  table: {
    type: 'table',
    content: [
      {
        type: 'tableRow',
        content: [
          { type: 'tableHeader', content: [para('h')] },
          { type: 'tableCell', content: [para('c')] },
        ],
      },
    ],
  },
  callout: { type: 'callout', attrs: { variant: 'success' }, content: [para('note')] },
}

describe('STANDARD_BLOCK_EXTENSIONS — schema', () => {
  it('registers EVERY STANDARD_BLOCK_TYPE value as a schema node (BR-E2-9, enum ⊆ schema.nodes)', () => {
    const nodeNames = Object.keys(headless().schema.nodes)
    for (const t of STANDARD_BLOCK_TYPE) {
      expect(nodeNames, `standard block "${t}" is not a registered node`).toContain(t)
    }
  })

  it('mounts without a duplicate-node error; TableKit co-registers table + row/cell/header (BR-E2-2)', () => {
    expect(() => headless()).not.toThrow()
    const names = Object.keys(headless().schema.nodes)
    expect(names).toEqual(
      expect.arrayContaining([
        'table',
        'tableRow',
        'tableCell',
        'tableHeader',
        'taskList',
        'taskItem',
        'image',
        'callout',
      ]),
    )
  })

  it('does NOT re-register StarterKit-owned nodes (codeBlock/horizontalRule stay E1-owned)', () => {
    // If E2 had re-added them, the Editor construction above would already have thrown; assert they exist exactly once
    // by confirming they are present (registered by StarterKit) and the editor built cleanly.
    const names = Object.keys(headless().schema.nodes)
    expect(names).toEqual(expect.arrayContaining(['codeBlock', 'horizontalRule']))
  })
})

describe('STANDARD_BLOCK_EXTENSIONS — round-trip through getJSON()', () => {
  it.each(Object.keys(FIXTURES) as (keyof typeof FIXTURES)[])(
    '%s survives a doc round-trip and passes assertEditorDocument',
    (block) => {
      const json = assertEditorDocument(headless(doc([FIXTURES[block]])).getJSON())
      expect(json.content.some((n) => n.type === block)).toBe(true)
    },
  )
})

describe('Callout', () => {
  it('exposes exactly the ToastIntent set (3 variants, no warn)', () => {
    expect([...CALLOUT_VARIANT]).toEqual(['info', 'success', 'danger'])
  })

  it('a valid variant round-trips through getJSON', () => {
    const json = headless(doc([FIXTURES.callout])).getJSON() as EditorDocument
    expect(json.content.find((n) => n.type === 'callout')?.attrs?.variant).toBe('success')
  })

  it('parseHTML normalizes an OUT-OF-SET data-variant to the info default (no throw)', () => {
    const json = headless('<div data-type="callout" data-variant="bogus"><p>x</p></div>').getJSON() as EditorDocument
    expect(json.content.find((n) => n.type === 'callout')?.attrs?.variant).toBe('info')
  })

  it('parseHTML defaults an ABSENT data-variant to info', () => {
    const json = headless('<div data-type="callout"><p>x</p></div>').getJSON() as EditorDocument
    expect(json.content.find((n) => n.type === 'callout')?.attrs?.variant).toBe('info')
  })
})

// Integration: the blocks are wired into the ACTUAL <VidaEditor> (not just the headless reconstruction) and render.
describe('VidaEditor — standard blocks wired end to end', () => {
  async function findPM(container: HTMLElement): Promise<HTMLElement> {
    return waitFor(() => {
      const el = container.querySelector<HTMLElement>('.ProseMirror')
      if (el === null) throw new Error('editor not mounted yet')
      return el
    })
  }

  it('renders taskList, table, image, and a callout seeded via defaultValue', async () => {
    const ref = createRef<VidaEditorHandle>()
    const seeded = doc([FIXTURES.taskList, FIXTURES.table, FIXTURES.image, FIXTURES.callout])
    const { container } = render(
      <UIProvider>
        <VidaEditor ref={ref} aria-label="Note body" defaultValue={seeded} />
      </UIProvider>,
    )
    const pm = await findPM(container)
    expect(pm.querySelector('ul[data-type="taskList"]')).not.toBeNull()
    expect(pm.querySelector('table')).not.toBeNull()
    expect(pm.querySelector('img')?.getAttribute('src')).toBe('https://example.com/a.png')
    const callout = pm.querySelector('.vida-callout')
    expect(callout).not.toBeNull()
    expect(callout?.getAttribute('data-variant')).toBe('success')
  })
})
