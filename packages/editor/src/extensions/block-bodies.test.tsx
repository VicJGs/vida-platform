// @vitest-environment jsdom
// B4 — the app-injected block-body seam. Two surfaces: the SCHEMA path (the `.extend()`ed entityLink/backlink nodes keep
// the E5 schema — name/attrs/parseHTML), proven headless; and the DELEGATION path (the node-view renders the injected
// renderer, else the E5 placeholder), proven via the real <VidaEditor> RTL mount (the node-view only mounts under the
// EditorContent portal). Spec: docs/specs/features/mod-notes/ui-ux/b4-link-panels.md · BR-B4-4.
import { afterEach, describe, expect, it } from 'vitest'
import { createRef } from 'react'
import { cleanup, render, waitFor } from '@testing-library/react'
import { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { UIProvider } from '@vida/ui'
import type { EditorDocument, EditorNode } from '@vida/types'
import { VidaEditor, type VidaEditorHandle } from '../editor'
import { STANDARD_BLOCK_EXTENSIONS } from './standard-blocks'
import { INTEGRATION_BLOCK_EXTENSIONS } from './integration-blocks'
import { makeBlockBodyNode, type BlockBodyRenderer } from './block-bodies'

const doc = (content: EditorNode[]): EditorDocument => ({ type: 'doc', content })

// The SAME swap editor.tsx performs: filter the two Notes-native nodes out of the E5 set, re-add the .extend()ed versions.
const editors: Editor[] = []
function headless(content?: EditorDocument): Editor {
  const e = new Editor({
    extensions: [
      StarterKit,
      ...STANDARD_BLOCK_EXTENSIONS,
      ...INTEGRATION_BLOCK_EXTENSIONS.filter((n) => n.name !== 'entityLink' && n.name !== 'backlink'),
      makeBlockBodyNode('entityLink', null),
      makeBlockBodyNode('backlink', null),
    ],
    content: content ?? '',
  })
  editors.push(e)
  return e
}
afterEach(() => {
  cleanup()
  while (editors.length) editors.pop()?.destroy()
})

describe('makeBlockBodyNode — preserves the E5 node schema (SWAP, no duplicate-node throw)', () => {
  it('registers entityLink + backlink exactly once (swap into the extension set does not double-register)', () => {
    expect(() => headless()).not.toThrow()
    const names = Object.keys(headless().schema.nodes)
    expect(names).toContain('entityLink')
    expect(names).toContain('backlink')
  })

  it('the entityLink attrs {entityType,entityId,label} still round-trip through nodeFromJSON → toJSON (BR-B4-4)', () => {
    const attrs = { entityType: 'page', entityId: 'p1', label: 'My Note' }
    const node = headless().schema.nodeFromJSON({ type: 'entityLink', attrs })
    expect(node.toJSON().attrs).toEqual(attrs)
  })

  it('the parseHTML data-block-type discriminator still routes a div to entityLink', () => {
    const e = new Editor({
      extensions: [
        StarterKit,
        ...STANDARD_BLOCK_EXTENSIONS,
        ...INTEGRATION_BLOCK_EXTENSIONS.filter((n) => n.name !== 'entityLink' && n.name !== 'backlink'),
        makeBlockBodyNode('entityLink', null),
        makeBlockBodyNode('backlink', null),
      ],
      content: '<div data-type="integration-block" data-block-type="entityLink"></div>',
    })
    editors.push(e)
    const parsed = e.getJSON() as EditorDocument
    expect(parsed.content.some((n) => n.type === 'entityLink')).toBe(true)
  })
})

describe('BodyShell — the node-view delegates to the injected renderer, else the placeholder (RTL, BR-B4-4)', () => {
  async function findPM(container: HTMLElement): Promise<HTMLElement> {
    return waitFor(() => {
      const el = container.querySelector<HTMLElement>('.ProseMirror')
      if (el === null) throw new Error('editor not mounted yet')
      return el
    })
  }

  it('renders the injected entityLink body (NOT the placeholder) when a renderer is supplied', async () => {
    const ref = createRef<VidaEditorHandle>()
    const entityLink: BlockBodyRenderer = ({ attrs }) => <span data-testid="el-body">Ref: {String(attrs.label)}</span>
    const seeded = doc([{ type: 'entityLink', attrs: { entityType: 'page', entityId: 'p1', label: 'Alpha' } }])
    const { container } = render(
      <UIProvider>
        <VidaEditor ref={ref} aria-label="Note body" defaultValue={seeded} blockBodies={{ entityLink }} />
      </UIProvider>,
    )
    const pm = await findPM(container)
    await waitFor(() => {
      if (pm.querySelector('[data-testid="el-body"]') === null) throw new Error('body not mounted yet')
    })
    expect(pm.textContent).toContain('Ref: Alpha')
    expect(pm.textContent).not.toContain('Available when its module ships')
  })

  it('falls back to the E5 placeholder for entityLink when NO renderer is injected (graceful, the other-10 path)', async () => {
    const ref = createRef<VidaEditorHandle>()
    const seeded = doc([{ type: 'entityLink', attrs: { entityType: 'page', entityId: 'p1', label: 'Alpha' } }])
    const { container } = render(
      <UIProvider>
        <VidaEditor ref={ref} aria-label="Note body" defaultValue={seeded} />
      </UIProvider>,
    )
    const pm = await findPM(container)
    await waitFor(() => {
      if (pm.querySelector('[role="note"]') === null) throw new Error('placeholder not mounted yet')
    })
    expect(pm.textContent).toContain('Available when its module ships')
  })

  it('falls back to the placeholder when the renderer returns null', async () => {
    const ref = createRef<VidaEditorHandle>()
    const backlink: BlockBodyRenderer = () => null
    const seeded = doc([{ type: 'backlink' }])
    const { container } = render(
      <UIProvider>
        <VidaEditor ref={ref} aria-label="Note body" defaultValue={seeded} blockBodies={{ backlink }} />
      </UIProvider>,
    )
    const pm = await findPM(container)
    await waitFor(() => {
      if (pm.querySelector('[role="note"]') === null) throw new Error('placeholder not mounted yet')
    })
    expect(pm.textContent).toContain('Available when its module ships')
  })
})
