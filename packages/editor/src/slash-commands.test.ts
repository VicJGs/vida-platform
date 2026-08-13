// @vitest-environment jsdom
// E4 — the slash-menu command view-model. Tested in isolation (preflight F2): the `run` closures are called DIRECTLY
// on a real headless editor with a seeded `/x` range (NOT by simulating `/` keystrokes, which ProseMirror's suggestion
// detection can't do faithfully in jsdom — that path is covered by the Visual-Gate story).
import { afterEach, describe, expect, it } from 'vitest'
import { Editor, type Range } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { INTEGRATION_BLOCK_TYPE, type EditorDocument } from '@vida/types'
import { STANDARD_BLOCK_EXTENSIONS } from './extensions/standard-blocks'
import { INTEGRATION_BLOCK_COMMANDS } from './commands'
import { SLASH_MENU_ITEMS, filterSlashItems, isBlockAvailable } from './slash-commands'

const editors: Editor[] = []
// A paragraph seeded with the trigger text `/x` (positions 1..3) — the range the Suggestion plugin would hand `run`.
function seeded(): Editor {
  const content: EditorDocument = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '/x' }] }] }
  const e = new Editor({ extensions: [StarterKit, ...STANDARD_BLOCK_EXTENSIONS], content })
  editors.push(e)
  return e
}
const TRIGGER_RANGE: Range = { from: 1, to: 3 }
afterEach(() => {
  while (editors.length) editors.pop()?.destroy()
})

describe('SLASH_MENU_ITEMS — composition', () => {
  it('contains a usable, available entry for every standard block + Text', () => {
    const ids = SLASH_MENU_ITEMS.filter((i) => i.available).map((i) => i.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'text', 'heading1', 'heading2', 'heading3', 'bulletList', 'orderedList',
        'taskList', 'blockquote', 'codeBlock', 'divider', 'table', 'callout',
      ]),
    )
  })

  it('excludes Image (BR-E4-4a — no attachment/URL surface yet)', () => {
    expect(SLASH_MENU_ITEMS.find((i) => i.id === 'image')).toBeUndefined()
  })

  it('every available item has a run(); every unavailable item has none', () => {
    for (const item of SLASH_MENU_ITEMS) {
      if (item.available) expect(typeof item.run, item.id).toBe('function')
      else expect(item.run, item.id).toBeUndefined()
    }
  })
})

describe('integration entries — DERIVED from INTEGRATION_BLOCK_COMMANDS (BR-E4-3/5)', () => {
  it('surfaces all 11 integration commands, each DISABLED in M1.0 (the E5 seam)', () => {
    const integration = SLASH_MENU_ITEMS.filter((i) => i.category === 'platform' || i.category === 'embed')
    expect(integration).toHaveLength(INTEGRATION_BLOCK_COMMANDS.length) // 11
    expect(integration.every((i) => !i.available && i.run === undefined)).toBe(true)
  })

  it('maps each INTEGRATION_BLOCK_COMMAND 1:1 (title/description/category preserved)', () => {
    for (const cmd of INTEGRATION_BLOCK_COMMANDS) {
      const item = SLASH_MENU_ITEMS.find((i) => i.id === cmd.name)
      expect(item, cmd.name).toBeDefined()
      expect(item?.title).toBe(cmd.label)
      expect(item?.category).toBe(cmd.category)
    }
  })

  it('isBlockAvailable is false for EVERY IntegrationBlockType in M1.0', () => {
    for (const t of INTEGRATION_BLOCK_TYPE) expect(isBlockAvailable(t), t).toBe(false)
  })
})

describe('filterSlashItems (BR-E4-7)', () => {
  it('empty query → the full list (identity)', () => {
    expect(filterSlashItems(SLASH_MENU_ITEMS, '')).toBe(SLASH_MENU_ITEMS)
    expect(filterSlashItems(SLASH_MENU_ITEMS, '   ')).toBe(SLASH_MENU_ITEMS)
  })

  it('matches title substrings, case-insensitive', () => {
    const r = filterSlashItems(SLASH_MENU_ITEMS, 'HEAD')
    expect(r.map((i) => i.id)).toEqual(expect.arrayContaining(['heading1', 'heading2', 'heading3']))
    expect(r.every((i) => /head/i.test(i.title) || i.keywords.some((k) => /head/i.test(k)))).toBe(true)
  })

  it('matches keywords (e.g. the "todo" alias → Task list)', () => {
    expect(filterSlashItems(SLASH_MENU_ITEMS, 'todo').map((i) => i.id)).toContain('taskList')
  })

  it('keeps a deferred integration entry in the results (searching "summary" surfaces the coming block)', () => {
    const r = filterSlashItems(SLASH_MENU_ITEMS, 'summary')
    const daily = r.find((i) => i.id === 'dailySummary')
    expect(daily).toBeDefined()
    expect(daily?.available).toBe(false)
  })

  it('a no-match query → an empty list', () => {
    expect(filterSlashItems(SLASH_MENU_ITEMS, 'zzzznope')).toHaveLength(0)
  })
})

// Each standard `run` deletes the `/x` trigger then applies the real command (BR-E4-4). Heading/Text use SET semantics.
describe('standard `run` closures dispatch the correct command (BR-E4-4/4b)', () => {
  const CASES: ReadonlyArray<{ id: string; type: string; level?: number; atRoot?: boolean }> = [
    { id: 'text', type: 'paragraph', atRoot: true },
    { id: 'heading1', type: 'heading', level: 1, atRoot: true },
    { id: 'heading2', type: 'heading', level: 2, atRoot: true },
    { id: 'heading3', type: 'heading', level: 3, atRoot: true },
    { id: 'bulletList', type: 'bulletList', atRoot: true },
    { id: 'orderedList', type: 'orderedList', atRoot: true },
    { id: 'taskList', type: 'taskList', atRoot: true },
    { id: 'blockquote', type: 'blockquote', atRoot: true },
    { id: 'codeBlock', type: 'codeBlock', atRoot: true },
    { id: 'divider', type: 'horizontalRule' },
    { id: 'table', type: 'table' },
    { id: 'callout', type: 'callout' },
  ]

  it.each(CASES)('$id → inserts/turns-into a $type (and deletes the /x trigger)', ({ id, type, level, atRoot }) => {
    const editor = seeded()
    const item = SLASH_MENU_ITEMS.find((i) => i.id === id)
    expect(item?.run, id).toBeDefined()
    item?.run?.(editor, TRIGGER_RANGE)
    const json = editor.getJSON() as EditorDocument
    const match = json.content.find((n) => n.type === type)
    expect(match, `${id} did not produce a ${type}`).toBeDefined()
    if (atRoot) expect(json.content[0]?.type).toBe(type)
    if (level != null) expect(match?.attrs?.level).toBe(level)
    // the `/x` trigger text must be gone (no leftover text node containing '/x' at the root paragraph)
    expect(JSON.stringify(json)).not.toContain('/x')
  })

  it('table is the pinned {3×3, header} shape', () => {
    const editor = seeded()
    SLASH_MENU_ITEMS.find((i) => i.id === 'table')?.run?.(editor, TRIGGER_RANGE)
    const json = editor.getJSON() as EditorDocument
    const table = json.content.find((n) => n.type === 'table')
    expect(table?.content).toHaveLength(3) // 3 rows
    expect(table?.content?.[0]?.content).toHaveLength(3) // 3 cols
    expect(table?.content?.[0]?.content?.[0]?.type).toBe('tableHeader') // header row
  })

  it('callout is a well-formed default (info) callout', () => {
    const editor = seeded()
    SLASH_MENU_ITEMS.find((i) => i.id === 'callout')?.run?.(editor, TRIGGER_RANGE)
    const json = editor.getJSON() as EditorDocument
    const callout = json.content.find((n) => n.type === 'callout')
    expect(callout?.attrs?.variant).toBe('info')
    expect(callout?.content?.[0]?.type).toBe('paragraph')
  })
})
