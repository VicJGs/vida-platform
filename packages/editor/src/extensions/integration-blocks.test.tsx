// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { createRef } from 'react'
import { cleanup, render, waitFor } from '@testing-library/react'
import { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { UIProvider } from '@vida/ui'
import { INTEGRATION_BLOCK_TYPE, type EditorDocument, type EditorNode, type IntegrationBlockType } from '@vida/types'
import { VidaEditor, type VidaEditorHandle } from '../editor'
import { STANDARD_BLOCK_EXTENSIONS } from './standard-blocks'
import { INTEGRATION_BLOCK_EXTENSIONS, INLINE_BLOCK_DEFS, AVAILABLE_INTEGRATION_BLOCKS } from './integration-blocks'
import { INTEGRATION_BLOCK_COMMANDS } from '../commands'
import { SLASH_MENU_ITEMS, isBlockAvailable } from '../slash-commands'

// The SAME extension set VidaEditor wires (E1 StarterKit + E2 standard blocks + E5 integration nodes) — lets us
// introspect the schema + round-trip via the SCHEMA path (no node-view mount needed; fold B). Placeholder omitted.
const editors: Editor[] = []
function headless(content?: EditorDocument | string): Editor {
  const e = new Editor({
    extensions: [StarterKit, ...STANDARD_BLOCK_EXTENSIONS, ...INTEGRATION_BLOCK_EXTENSIONS],
    content: content ?? '',
  })
  editors.push(e)
  return e
}
afterEach(() => {
  cleanup()
  while (editors.length) editors.pop()?.destroy()
})

const doc = (content: EditorNode[]): EditorDocument => ({ type: 'doc', content })

// A representative attrs payload for each of the 7 TYPED integration blocks (the declared @vida/types config schema).
const TYPED_ATTRS: Partial<Record<IntegrationBlockType, Record<string, unknown>>> = {
  dailySummary: { date: '2026-08-14', sections: ['habits', 'tasks'] },
  entityLink: { entityType: 'person', entityId: 'p1', label: 'Ana' },
  chartBlock: { chartType: 'line', dataSource: 'transactions', config: { stacked: true } },
  timelineBlock: { entityType: 'project', entityIds: ['a', 'b'], dateField: 'due', labelField: 'title' },
  pomodoroBlock: { entityType: 'task', entityId: 't1', work_duration: 50, break_duration: 10 },
  habitsBlock: { date: '2026-08-14', filter_time_of_day: 'morning' },
  taskChecklist: { project_id: 'pr1', milestone_id: null, due_before: '2026-09-01' },
}

describe('INTEGRATION_BLOCK_EXTENSIONS — schema (raw Editor, no node-view mount)', () => {
  it('registers a node for EVERY INTEGRATION_BLOCK_TYPE value (all 11 — BR-E5-1 parity)', () => {
    const nodeNames = Object.keys(headless().schema.nodes)
    for (const t of INTEGRATION_BLOCK_TYPE) {
      expect(nodeNames, `integration block "${t}" is not a registered node`).toContain(t)
    }
  })

  it('mounts without a duplicate-node error alongside StarterKit + standard blocks', () => {
    expect(() => headless()).not.toThrow()
  })

  it('exposes an inline definition for every type (INLINE_BLOCK_DEFS, derived from E1 data)', () => {
    expect(INLINE_BLOCK_DEFS.map((d) => d.name).sort()).toEqual([...INTEGRATION_BLOCK_TYPE].sort())
  })
})

describe('config round-trip — the 7 TYPED blocks preserve declared attrs LOSSLESSLY (schema path, BR-E5-2)', () => {
  it.each(Object.keys(TYPED_ATTRS) as IntegrationBlockType[])(
    '%s survives schema.nodeFromJSON → toJSON with its config intact',
    (type) => {
      const attrs = TYPED_ATTRS[type]!
      const node = headless().schema.nodeFromJSON({ type, attrs })
      expect(node.toJSON().attrs).toEqual(attrs)
    },
  )
})

describe('mutable attr defaults are not shared GLOBALLY across editors (post-impl fix — function defaults)', () => {
  it('two editors get independent default arrays; mutating one does not leak to another', () => {
    const a = headless()
    const b = headless()
    const na = a.schema.nodes.dailySummary!.create()
    const nb = b.schema.nodes.dailySummary!.create()
    // Function defaults (`() => []`) are invoked per schema build → each editor owns its array.
    expect(na.attrs.sections).not.toBe(nb.attrs.sections)
    ;(na.attrs.sections as string[]).push('LEAK')
    expect(nb.attrs.sections).toEqual([])
  })
})

describe('never-crash boundary — out-of-schema attrs DEGRADE, they do not throw (BR-E5-2 boundary, lossy)', () => {
  it('a typed node carrying an UNDECLARED attr loads without throwing; the extra key is NOT preserved', () => {
    const bad = doc([{ type: 'dailySummary', attrs: { date: 'x', sections: [], bogus: 'nope' } }])
    let e!: Editor
    expect(() => {
      e = headless(bad)
    }).not.toThrow()
    // TipTap's lenient content-load (neither enableContentCheck nor errorOnInvalidContent set) catches the PM
    // `Unsupported attribute` throw and degrades — the out-of-schema key never round-trips.
    const json = e.getJSON() as EditorDocument
    expect(json.content.find((n) => n.type === 'dailySummary')?.attrs?.bogus).toBeUndefined()
  })

  it('a schema-less type (milestoneBlock) renders as a node with no config attrs, no throw', () => {
    let e!: Editor
    expect(() => {
      e = headless(doc([{ type: 'milestoneBlock' }]))
    }).not.toThrow()
    expect((e.getJSON() as EditorDocument).content.some((n) => n.type === 'milestoneBlock')).toBe(true)
  })
})

describe('HTML contract + per-node getAttrs discriminator (BR-E5-3, the E6 seam)', () => {
  it('renderHTML emits a type-identifying div (data-type + data-block-type)', () => {
    const html = headless(doc([{ type: 'chartBlock', attrs: TYPED_ATTRS.chartBlock }])).getHTML()
    expect(html).toContain('data-type="integration-block"')
    expect(html).toContain('data-block-type="chartBlock"')
  })

  it('parseHTML routes a div to the node whose data-block-type matches — NOT the first-registered type', () => {
    const json = headless(
      '<div data-type="integration-block" data-block-type="chartBlock"></div>',
    ).getJSON() as EditorDocument
    expect(json.content.some((n) => n.type === 'chartBlock')).toBe(true)
    expect(json.content.some((n) => n.type === 'dailySummary')).toBe(false)
  })
})

describe('availability flip — E5 closes the E4 seam (BR-E5-5)', () => {
  it('every integration type is now available', () => {
    for (const t of INTEGRATION_BLOCK_TYPE) {
      expect(isBlockAvailable(t), `${t} should be available`).toBe(true)
      expect(AVAILABLE_INTEGRATION_BLOCKS.has(t)).toBe(true)
    }
  })

  it('every integration slash entry is available and has a run (insertable)', () => {
    const integrationNames = new Set<string>(INTEGRATION_BLOCK_COMMANDS.map((c) => c.name))
    const entries = SLASH_MENU_ITEMS.filter((i) => integrationNames.has(i.id))
    expect(entries).toHaveLength(INTEGRATION_BLOCK_COMMANDS.length)
    for (const e of entries) {
      expect(e.available, `${e.id} should be available`).toBe(true)
      expect(typeof e.run, `${e.id} should have a run`).toBe('function')
    }
  })

  it('a slash run inserts the matching integration node', () => {
    const editor = headless()
    const summary = SLASH_MENU_ITEMS.find((i) => i.id === 'dailySummary')!
    // Place the cursor in the doc, then run (no /query range to delete → an empty range at the selection).
    editor.commands.focus()
    summary.run?.(editor, { from: editor.state.selection.from, to: editor.state.selection.to })
    expect((editor.getJSON() as EditorDocument).content.some((n) => n.type === 'dailySummary')).toBe(true)
  })
})

// The placeholder node-view is the FIRST React node-view in the editor — it mounts only under the <EditorContent>
// portal host, so this exercises the ACTUAL <VidaEditor> via RTL (fold B/C).
describe('VidaEditor — placeholder node-views render for a seeded doc (RTL, both fold-C verify)', () => {
  async function findPM(container: HTMLElement): Promise<HTMLElement> {
    return waitFor(() => {
      const el = container.querySelector<HTMLElement>('.ProseMirror')
      if (el === null) throw new Error('editor not mounted yet')
      return el
    })
  }

  it('renders a placeholder card for all 11 integration blocks (labels + role=note)', async () => {
    const ref = createRef<VidaEditorHandle>()
    const seeded = doc(INTEGRATION_BLOCK_TYPE.map((type) => ({ type })))
    const { container } = render(
      <UIProvider>
        <VidaEditor ref={ref} aria-label="Note body" defaultValue={seeded} />
      </UIProvider>,
    )
    const pm = await findPM(container)
    const cards = await waitFor(() => {
      const found = pm.querySelectorAll('.vida-integration-block')
      if (found.length < INTEGRATION_BLOCK_TYPE.length) throw new Error('node-views not mounted yet')
      return found
    })
    expect(cards).toHaveLength(INTEGRATION_BLOCK_TYPE.length)

    // Each declares role=note + an accessible name; a representative label is present.
    const notes = pm.querySelectorAll('[role="note"]')
    expect(notes.length).toBe(INTEGRATION_BLOCK_TYPE.length)
    expect(pm.textContent).toContain('Daily summary')
    expect(pm.textContent).toContain('Available when its module ships')
    for (const n of Array.from(notes)) {
      expect(n.getAttribute('aria-label')).toMatch(/available when its module ships$/)
    }
  })
})
