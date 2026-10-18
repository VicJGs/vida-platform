// Pure — env `node` (no jsdom). Locks the S3 page→CanvasEditor mapping (the live hook is deferred to #27).
import { describe, expect, it, vi } from 'vitest'
import type { EditorDocument } from '@vida/types'
import { toCanvasEditorProps, type PageLike } from './page-binding'

const doc: EditorDocument = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'H' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'p' }] },
  ],
}

describe('toCanvasEditorProps', () => {
  it('maps title + content → title + doc', () => {
    const page: PageLike = { id: 'p1', title: 'Weekly Review', content: doc }
    const p = toCanvasEditorProps(page)
    expect(p.title).toBe('Weekly Review')
    expect(p.doc).toBe(doc)
  })

  it('meta reports the block count (pluralized)', () => {
    expect(toCanvasEditorProps({ id: 'p', title: 't', content: doc }).meta).toBe('2 blocks')
    const one: EditorDocument = { type: 'doc', content: [{ type: 'paragraph' }] }
    expect(toCanvasEditorProps({ id: 'p', title: 't', content: one }).meta).toBe('1 block')
  })

  it('null content → blank page: doc undefined, 0 blocks', () => {
    const p = toCanvasEditorProps({ id: 'p', title: 'Untitled', content: null })
    expect(p.doc).toBeUndefined()
    expect(p.meta).toBe('0 blocks')
  })

  it('forwards eyebrow / syncState / editable / onChange opts', () => {
    const onChange = vi.fn()
    const p = toCanvasEditorProps(
      { id: 'p', title: 't', content: null },
      { eyebrow: 'Note', syncState: 'saved', editable: false, onChange },
    )
    expect(p.eyebrow).toBe('Note')
    expect(p.syncState).toBe('saved')
    expect(p.editable).toBe(false)
    expect(p.onChange).toBe(onChange)
  })
})
