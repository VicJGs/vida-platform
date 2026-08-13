// @vitest-environment jsdom
// E4 — the SlashCommand extension wiring. Asserts the Suggestion + host-ARIA plugins register and behave; the
// end-to-end `/`-keystroke trigger is Visual-Gate-covered (ProseMirror suggestion detection isn't faithful in jsdom).
import { afterEach, describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { SlashCommand, SlashSuggestionPluginKey, slashActive, slashComboboxAttrs } from './slash-command'
import { SLASH_LISTBOX_ID } from '../slash-menu'

const editors: Editor[] = []
function make(content = '<p></p>'): Editor {
  const e = new Editor({ extensions: [StarterKit, SlashCommand], content })
  editors.push(e)
  return e
}
afterEach(() => {
  while (editors.length) editors.pop()?.destroy()
})

describe('SlashCommand extension', () => {
  it('registers on the editor without error', () => {
    expect(() => make()).not.toThrow()
    expect(make().extensionManager.extensions.some((e) => e.name === 'slashCommand')).toBe(true)
  })

  it('registers the suggestion plugin, inactive by default', () => {
    const state = SlashSuggestionPluginKey.getState(make().state) as { active: boolean } | undefined
    expect(state).toBeDefined()
    expect(state?.active).toBe(false)
  })

  it('slashComboboxAttrs: active → a combobox host, inactive → {} (post-impl B1)', () => {
    const active = slashComboboxAttrs(true)
    expect(active).toEqual({
      role: 'combobox',
      'aria-expanded': 'true',
      'aria-controls': SLASH_LISTBOX_ID,
      'aria-haspopup': 'listbox',
    })
    expect(slashComboboxAttrs(false)).toEqual({})
  })

  it('typing "/" activates the suggestion → slashActive flips true (drives the host combobox flip)', () => {
    const e = make('<p></p>')
    expect(slashActive(e.state)).toBe(false)
    // A programmatic insert is a real ProseMirror transaction the suggestion plugin processes (unlike a simulated DOM
    // keystroke, which jsdom can't fire faithfully) — so it DOES trip the `/` match detection.
    e.commands.insertContent('/')
    expect(slashActive(e.state)).toBe(true)
    // editor.tsx merges slashComboboxAttrs(true) into editorProps → the host resolves to role=combobox while open.
    expect(slashComboboxAttrs(slashActive(e.state)).role).toBe('combobox')
  })

  it('the `/` match does NOT activate inside a code block (BR-E4-10 allow predicate)', () => {
    const e = make('<pre><code>x</code></pre>')
    e.commands.setTextSelection(2)
    e.commands.insertContent('/')
    expect(slashActive(e.state)).toBe(false)
  })
})
