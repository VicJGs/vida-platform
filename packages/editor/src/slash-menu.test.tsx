// @vitest-environment jsdom
// E4 — the slash-menu popup, tested in isolation with mocked props (preflight F2). Geometry-free (the U7/U9
// jsdom-layout-defer rule): roles/aria/selection/keyboard only, no positioning assertions.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRef } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { UIProvider } from '@vida/ui'
import { SLASH_LISTBOX_ID, SlashMenu, slashOptionId, type SlashMenuHandle } from './slash-menu'
import type { SlashMenuItem } from './slash-commands'

const A: SlashMenuItem = { id: 'a', title: 'Alpha', keywords: [], category: 'basic', available: true, run: () => {} }
const B: SlashMenuItem = { id: 'b', title: 'Bravo', keywords: [], category: 'basic', available: true, run: () => {} }
const C: SlashMenuItem = { id: 'c', title: 'Charlie', keywords: [], category: 'platform', available: false }
const ITEMS: readonly SlashMenuItem[] = [A, B, C]

let editor: Editor
beforeEach(() => {
  editor = new Editor({ extensions: [StarterKit], content: '<p>x</p>' })
})
afterEach(() => {
  cleanup()
  editor.destroy()
})

function mount(items: readonly SlashMenuItem[], command = vi.fn()) {
  const ref = createRef<SlashMenuHandle>()
  render(
    <UIProvider>
      <SlashMenu ref={ref} items={items} command={command} editor={editor} query="" />
    </UIProvider>,
  )
  return { ref, command }
}
function press(ref: React.RefObject<SlashMenuHandle | null>, key: string): boolean {
  let handled = false
  act(() => {
    handled = ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key }) })
  })
  return handled
}
const selectedId = () => screen.getAllByRole('option').find((o) => o.getAttribute('aria-selected') === 'true')?.id

describe('SlashMenu — structure & a11y (§5)', () => {
  it('renders a role=listbox with a named panel + one option per item', () => {
    mount(ITEMS)
    const listbox = screen.getByRole('listbox')
    expect(listbox.id).toBe(SLASH_LISTBOX_ID)
    expect(listbox.getAttribute('aria-label')).toBe('Slash commands')
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('highlights the first AVAILABLE option on open (aria-selected)', () => {
    mount(ITEMS)
    expect(selectedId()).toBe(slashOptionId(0)) // Alpha
  })

  it('marks a deferred (unavailable) option aria-disabled (BR-E4-5)', () => {
    mount(ITEMS)
    const options = screen.getAllByRole('option')
    expect(options[2]?.getAttribute('aria-disabled')).toBe('true') // Charlie
    expect(options[0]?.getAttribute('aria-disabled')).toBeNull()
  })

  it('renders category group labels', () => {
    mount(ITEMS)
    expect(screen.getByText('Basic')).toBeTruthy()
    expect(screen.getByText('Platform blocks')).toBeTruthy()
  })

  it('reflects the active option on the editor host via aria-activedescendant (§5)', () => {
    mount(ITEMS)
    expect(editor.view.dom.getAttribute('aria-activedescendant')).toBe(slashOptionId(0))
  })
})

describe('SlashMenu — keyboard (imperative handle; editor keeps focus)', () => {
  it('ArrowDown moves to the next available option and consumes the key', () => {
    const { ref } = mount(ITEMS)
    expect(press(ref, 'ArrowDown')).toBe(true)
    expect(selectedId()).toBe(slashOptionId(1)) // Bravo
    expect(editor.view.dom.getAttribute('aria-activedescendant')).toBe(slashOptionId(1))
  })

  it('ArrowDown WRAPS and SKIPS the disabled option', () => {
    const { ref } = mount(ITEMS)
    press(ref, 'ArrowDown') // → Bravo (1)
    press(ref, 'ArrowDown') // Charlie (2) is disabled → wrap to Alpha (0)
    expect(selectedId()).toBe(slashOptionId(0))
  })

  it('ArrowUp wraps backwards, skipping the disabled option', () => {
    const { ref } = mount(ITEMS)
    expect(press(ref, 'ArrowUp')).toBe(true) // from Alpha(0) back → skip Charlie(2) → Bravo(1)
    expect(selectedId()).toBe(slashOptionId(1))
  })

  it('Enter activates the selected item (command) and consumes the key', () => {
    const { ref, command } = mount(ITEMS)
    expect(press(ref, 'Enter')).toBe(true)
    expect(command).toHaveBeenCalledWith(A)
  })

  it('a printable key is NOT consumed (falls through to the editor to re-filter)', () => {
    const { ref, command } = mount(ITEMS)
    expect(press(ref, 'x')).toBe(false)
    expect(command).not.toHaveBeenCalled()
  })
})

describe('SlashMenu — pointer + empty', () => {
  it('clicking an available option activates it; clicking a disabled one does not', () => {
    const { command } = mount(ITEMS)
    const options = screen.getAllByRole('option')
    fireEvent.click(options[2]!) // Charlie (disabled)
    expect(command).not.toHaveBeenCalled()
    fireEvent.click(options[0]!) // Alpha
    expect(command).toHaveBeenCalledWith(A)
  })

  it('an empty (fully filtered) list renders a disabled "No blocks" option', () => {
    mount([])
    const option = screen.getByRole('option')
    expect(option.getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByText('No blocks')).toBeTruthy()
  })
})
