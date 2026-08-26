// @vitest-environment jsdom
// B3 — the WikiLink extension + the pure `applyWikiSelection`. The end-to-end `[[`-keystroke → popup flow is
// Visual-Gate-covered (ProseMirror suggestion positioning isn't faithful in jsdom); here we assert registration, the
// active flip, and — the risk surface — the row-FIRST-then-mark order + reject→no-mark guarantee (BR-B3-5).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Editor, type Range } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  WikiLink,
  WikiLinkMark,
  WikiSuggestionPluginKey,
  applyWikiSelection,
  stripWikiClose,
  wikiActive,
  wikiComboboxAttrs,
  type WikiLinkCandidate,
  type WikiLinkConfig,
} from './wiki-link'
import { WIKI_LISTBOX_ID } from '../wiki-link-menu'

const editors: Editor[] = []
function make(config: WikiLinkConfig | null = null, content = '<p></p>'): Editor {
  const e = new Editor({ extensions: [StarterKit, WikiLinkMark, WikiLink.configure({ config })], content })
  editors.push(e)
  return e
}
afterEach(() => {
  while (editors.length) editors.pop()?.destroy()
})

function stubConfig(over: Partial<WikiLinkConfig> = {}): WikiLinkConfig {
  return {
    query: vi.fn(async () => []),
    onCreate: vi.fn(async (t: string) => ({ id: 'new', title: t })),
    onSelect: vi.fn(async () => {}),
    ...over,
  }
}

/** Collect every `wikiLink` mark's attrs across the doc. */
function wikiAttrs(e: Editor): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = []
  e.state.doc.descendants((node) => {
    node.marks.forEach((m) => {
      if (m.type.name === 'wikiLink') out.push(m.attrs)
    })
  })
  return out
}

const RANGE: Range = { from: 1, to: 1 } // an empty range at the caret of the empty paragraph

describe('stripWikiClose', () => {
  it('trims a trailing ] / ]] only, leaves interior brackets', () => {
    expect(stripWikiClose('foo]]')).toBe('foo')
    expect(stripWikiClose('foo]')).toBe('foo')
    expect(stripWikiClose('foo')).toBe('foo')
    expect(stripWikiClose('a]b]]')).toBe('a]b')
    expect(stripWikiClose('')).toBe('')
  })
})

describe('WikiLink extension registration', () => {
  it('registers the wikiLink mark + the suggestion extension (with a config)', () => {
    const e = make(stubConfig())
    expect(e.schema.marks.wikiLink).toBeDefined()
    expect(e.extensionManager.extensions.some((x) => x.name === 'wikiLinkSuggestion')).toBe(true)
  })

  it('the mark registers even with NO config (content-render load-safety, BR-B3-4); the plugin does NOT (BR-B3-2)', () => {
    const e = make(null)
    expect(e.schema.marks.wikiLink).toBeDefined()
    expect(WikiSuggestionPluginKey.getState(e.state)).toBeUndefined() // no config → no plugin (zero cost)
  })

  it('wikiComboboxAttrs: active → a combobox host, inactive → {} (BR-B3-9)', () => {
    expect(wikiComboboxAttrs(true)).toEqual({
      role: 'combobox',
      'aria-expanded': 'true',
      'aria-controls': WIKI_LISTBOX_ID,
      'aria-haspopup': 'listbox',
    })
    expect(wikiComboboxAttrs(false)).toEqual({})
  })

  it('typing "[[" activates the picker → wikiActive flips true (drives the host combobox flip)', () => {
    const e = make(stubConfig())
    expect(wikiActive(e.state)).toBe(false)
    e.commands.insertContent('[[')
    expect(wikiActive(e.state)).toBe(true)
  })

  it('the `[[` match does NOT activate inside a code block (allow predicate)', () => {
    const e = make(stubConfig(), '<pre><code>x</code></pre>')
    e.commands.setTextSelection(2)
    e.commands.insertContent('[[')
    expect(wikiActive(e.state)).toBe(false)
  })
})

describe('applyWikiSelection — row FIRST, then mark; LOUD on reject (BR-B3-5)', () => {
  it('select existing: awaits onSelect, then inserts the wikiLink mark carrying targetPageId', async () => {
    const cfg = stubConfig()
    const e = make(cfg)
    const candidate: WikiLinkCandidate = { id: 'p2', title: 'Alpha' }
    await applyWikiSelection(e, RANGE, candidate, cfg)
    expect(cfg.onSelect).toHaveBeenCalledWith(candidate)
    expect(cfg.onCreate).not.toHaveBeenCalled()
    expect(wikiAttrs(e)).toEqual([{ targetPageId: 'p2' }])
  })

  it('create-on-miss: onCreate → onSelect → mark, IN ORDER (BR-B3-6)', async () => {
    const calls: string[] = []
    const cfg = stubConfig({
      onCreate: vi.fn(async (t: string) => {
        calls.push('create')
        return { id: 'p9', title: t }
      }),
      onSelect: vi.fn(async () => {
        calls.push('select')
      }),
    })
    const e = make(cfg)
    await applyWikiSelection(e, RANGE, { __create: 'New Note' }, cfg)
    expect(calls).toEqual(['create', 'select'])
    expect(wikiAttrs(e)).toEqual([{ targetPageId: 'p9' }])
  })

  it('onSelect REJECTS → throws, NO mark inserted (never a dangling link)', async () => {
    const cfg = stubConfig({
      onSelect: vi.fn(async () => {
        throw new Error('write failed')
      }),
    })
    const e = make(cfg)
    await expect(applyWikiSelection(e, RANGE, { id: 'p2', title: 'Alpha' }, cfg)).rejects.toThrow('write failed')
    expect(wikiAttrs(e)).toEqual([]) // the mark was NOT applied — the app's hook onError surfaces the failure
  })

  it('onCreate REJECTS → throws before onSelect, NO mark', async () => {
    const cfg = stubConfig({
      onCreate: vi.fn(async () => {
        throw new Error('create failed')
      }),
    })
    const e = make(cfg)
    await expect(applyWikiSelection(e, RANGE, { __create: 'X' }, cfg)).rejects.toThrow('create failed')
    expect(cfg.onSelect).not.toHaveBeenCalled()
    expect(wikiAttrs(e)).toEqual([])
  })
})
