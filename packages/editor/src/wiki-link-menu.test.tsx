// @vitest-environment jsdom
// B3 — the WikiLinkMenu popup, tested in isolation with mocked props (mirrors slash-menu.test.tsx). Geometry-free:
// roles/aria/selection/keyboard + the create-on-miss row only, no positioning assertions.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRef } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { UIProvider } from '@vida/ui'
import { WIKI_LISTBOX_ID, WikiLinkMenu, wikiOptionId, type WikiLinkMenuHandle } from './wiki-link-menu'
import type { WikiLinkCandidate, WikiLinkCreateRequest } from './extensions/wiki-link'

const A: WikiLinkCandidate = { id: 'a', title: 'Alpha' }
const B: WikiLinkCandidate = { id: 'b', title: 'Bravo' }

let editor: Editor
beforeEach(() => {
  editor = new Editor({ extensions: [StarterKit], content: '<p>x</p>' })
})
afterEach(() => {
  cleanup()
  editor.destroy()
})

function mount(
  opts: {
    candidates?: readonly WikiLinkCandidate[]
    query?: string
    loading?: boolean
    command?: (i: WikiLinkCandidate | WikiLinkCreateRequest) => void
  } = {},
) {
  const ref = createRef<WikiLinkMenuHandle>()
  const command = opts.command ?? vi.fn()
  render(
    <UIProvider>
      <WikiLinkMenu
        ref={ref}
        candidates={opts.candidates ?? []}
        command={command}
        editor={editor}
        query={opts.query ?? ''}
        loading={opts.loading ?? false}
      />
    </UIProvider>,
  )
  return { ref, command }
}
function press(ref: React.RefObject<WikiLinkMenuHandle | null>, key: string): boolean {
  let handled = false
  act(() => {
    handled = ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key }) })
  })
  return handled
}
const selectedId = () =>
  screen.getAllByRole('option').find((o) => o.getAttribute('aria-selected') === 'true')?.id

describe('WikiLinkMenu — structure & states (BR-B3-12)', () => {
  it('renders a named role=listbox + one option per candidate + a Create row for a non-empty query', () => {
    mount({ candidates: [A, B], query: 'al' })
    const lb = screen.getByRole('listbox')
    expect(lb.id).toBe(WIKI_LISTBOX_ID)
    expect(lb.getAttribute('aria-label')).toBe('Link to a page')
    expect(screen.getAllByRole('option')).toHaveLength(3) // Alpha, Bravo, + Create
  })

  it('empty query + no candidates → "Type to search pages", no options', () => {
    mount({ candidates: [], query: '' })
    expect(screen.getByText('Type to search pages')).toBeTruthy()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('loading + no candidates → "Searching…"', () => {
    mount({ candidates: [], query: 'al', loading: true })
    expect(screen.getByText('Searching…')).toBeTruthy()
  })

  it('a non-empty query always offers "+ Create" (create-on-miss, BR-B3-6)', () => {
    mount({ candidates: [], query: 'New Note' })
    expect(screen.getByText('+ Create "New Note"')).toBeTruthy()
  })

  it('highlights the first row on open', () => {
    mount({ candidates: [A, B], query: 'al' })
    expect(selectedId()).toBe(wikiOptionId(0))
  })
})

describe('WikiLinkMenu — keyboard (the combobox handle)', () => {
  it('ArrowDown/Up wrap over rows incl. the create row', () => {
    const { ref } = mount({ candidates: [A, B], query: 'al' }) // rows: A(0) · B(1) · Create(2)
    expect(selectedId()).toBe(wikiOptionId(0))
    press(ref, 'ArrowDown')
    expect(selectedId()).toBe(wikiOptionId(1))
    press(ref, 'ArrowDown')
    expect(selectedId()).toBe(wikiOptionId(2))
    press(ref, 'ArrowDown')
    expect(selectedId()).toBe(wikiOptionId(0)) // wrap forward
    press(ref, 'ArrowUp')
    expect(selectedId()).toBe(wikiOptionId(2)) // wrap back
  })

  it('Enter on a candidate dispatches that candidate', () => {
    const command = vi.fn()
    const { ref } = mount({ candidates: [A, B], query: 'al', command })
    press(ref, 'Enter')
    expect(command).toHaveBeenCalledWith(A)
  })

  it('Enter on the create row dispatches the create sentinel with the trimmed query', () => {
    const command = vi.fn()
    const { ref } = mount({ candidates: [], query: 'New Note', command }) // only the create row
    press(ref, 'Enter')
    expect(command).toHaveBeenCalledWith({ __create: 'New Note' })
  })

  it('a typed closing `]]` is stripped from the create label + sentinel (D-5)', () => {
    const command = vi.fn()
    const { ref } = mount({ candidates: [], query: 'New]]', command })
    expect(screen.getByText('+ Create "New"')).toBeTruthy()
    press(ref, 'Enter')
    expect(command).toHaveBeenCalledWith({ __create: 'New' })
  })
})
