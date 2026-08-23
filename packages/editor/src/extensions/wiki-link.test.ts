// @vitest-environment jsdom
// MOD-notes ②c — the WikiLink surface. Asserts the mark + Suggestion register, the host combobox flip, the WL-2b
// order (row FIRST → mark SECOND, partial-failure tolerant), create-on-miss, and the emit-only markdown round-trip.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  WikiLink,
  WikiLinkMark,
  WikiSuggestionPluginKey,
  applyWikiSelection,
  wikiActive,
  wikiComboboxAttrs,
  type WikiLinkConfig,
} from './wiki-link'
import { WIKI_LISTBOX_ID } from '../wiki-link-menu'
import { toMarkdown } from '../serializers/to-markdown'
import { fromMarkdown } from '../serializers/from-markdown'
import type { EditorDocument, EditorNode } from '@vida/types'

const editors: Editor[] = []
function make(config: WikiLinkConfig | null = null, content = '<p></p>'): Editor {
  const e = new Editor({
    extensions: [StarterKit, WikiLinkMark, WikiLink.configure({ config })],
    content,
  })
  editors.push(e)
  return e
}
afterEach(() => {
  vi.restoreAllMocks()
  while (editors.length) editors.pop()?.destroy()
})

function stubConfig(over: Partial<WikiLinkConfig> = {}): WikiLinkConfig {
  return {
    query: vi.fn(async () => []),
    onCreate: vi.fn(async (t: string) => ({ id: 'new-id', title: t })),
    onSelect: vi.fn(async () => {}),
    ...over,
  }
}

/** The first text node in the doc carrying a `wikiLink` mark (or undefined). */
function firstWikiText(editor: Editor): EditorNode | undefined {
  const json = editor.getJSON() as EditorDocument
  const para = json.content?.[0]
  return para?.content?.find(
    (n): n is EditorNode => n.type === 'text' && (n.marks ?? []).some((m) => m.type === 'wikiLink'),
  )
}

describe('WikiLink — registration & host ARIA', () => {
  it('registers the mark + the suggestion extension without error', () => {
    const e = make(stubConfig())
    expect(e.extensionManager.extensions.some((x) => x.name === 'wikiLink')).toBe(true)
    expect(e.extensionManager.extensions.some((x) => x.name === 'wikiLinkSuggestion')).toBe(true)
  })

  it('the mark is registered even with NO config (existing links must still render)', () => {
    const e = make(null)
    expect(e.schema.marks.wikiLink).toBeDefined()
  })

  it('wikiComboboxAttrs: active → combobox host, inactive → {}', () => {
    expect(wikiComboboxAttrs(true)).toEqual({
      role: 'combobox',
      'aria-expanded': 'true',
      'aria-controls': WIKI_LISTBOX_ID,
      'aria-haspopup': 'listbox',
    })
    expect(wikiComboboxAttrs(false)).toEqual({})
  })

  it('typing "[[" activates the suggestion → wikiActive flips true', () => {
    const e = make(stubConfig(), '<p></p>')
    expect(wikiActive(e.state)).toBe(false)
    e.commands.insertContent('[[')
    expect(wikiActive(e.state)).toBe(true)
    expect(wikiComboboxAttrs(wikiActive(e.state)).role).toBe('combobox')
  })

  it('no plugin state without a config (picker off)', () => {
    const state = WikiSuggestionPluginKey.getState(make(null).state)
    expect(state).toBeUndefined()
  })
})

describe('applyWikiSelection — WL-2b order + create-on-miss', () => {
  it('candidate: writes the row (onSelect) THEN applies the mark by target_page_id', async () => {
    const cfg = stubConfig()
    const e = make(cfg)
    await applyWikiSelection(e, { from: 1, to: 1 }, { id: 'page-42', title: 'Target' }, cfg)
    expect(cfg.onSelect).toHaveBeenCalledWith({ id: 'page-42', title: 'Target' })
    const node = firstWikiText(e)
    expect(node?.text).toBe('Target')
    expect(node?.marks?.find((m) => m.type === 'wikiLink')?.attrs?.targetPageId).toBe('page-42')
  })

  it('onSelect REJECTS → no mark applied (no content↔relation divergence)', async () => {
    const cfg = stubConfig({ onSelect: vi.fn(async () => Promise.reject(new Error('db'))) })
    const e = make(cfg)
    await expect(applyWikiSelection(e, { from: 1, to: 1 }, { id: 'p', title: 'X' }, cfg)).rejects.toThrow()
    expect(firstWikiText(e)).toBeUndefined()
  })

  it('create-on-miss: onCreate THEN onSelect THEN the mark uses the created id', async () => {
    const cfg = stubConfig()
    const e = make(cfg)
    await applyWikiSelection(e, { from: 1, to: 1 }, { __create: 'Fresh Note' }, cfg)
    expect(cfg.onCreate).toHaveBeenCalledWith('Fresh Note')
    expect(cfg.onSelect).toHaveBeenCalledWith({ id: 'new-id', title: 'Fresh Note' })
    const node = firstWikiText(e)
    expect(node?.text).toBe('Fresh Note')
    expect(node?.marks?.find((m) => m.type === 'wikiLink')?.attrs?.targetPageId).toBe('new-id')
  })
})

describe('WikiLink markdown — emit-only (WL-6)', () => {
  const doc: EditorDocument = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'see ' },
          { type: 'text', text: 'My Page', marks: [{ type: 'wikiLink', attrs: { targetPageId: 'p1', label: 'My Page' } }] },
        ],
      },
    ],
  }

  it('toMarkdown emits [[label]]', () => {
    expect(toMarkdown(doc, { include_frontmatter: false, integration_block_handling: 'comment' })).toContain('[[My Page]]')
  })

  it('a doc with a wikiLink mark survives toMarkdown→fromMarkdown WITHOUT throwing (degrades to text, not identity)', () => {
    const md = toMarkdown(doc, { include_frontmatter: false, integration_block_handling: 'comment' })
    expect(() => fromMarkdown(md)).not.toThrow()
  })
})
