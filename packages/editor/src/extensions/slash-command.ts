// E4 (UI-3) — the slash-command extension. Wires `@tiptap/suggestion` (a ProseMirror plugin that watches for `/`,
// tracks the query, and positions a popup at the caret via `props.mount`) to the React `SlashMenu` popup through
// `@tiptap/react` ReactRenderer. A second, tiny plugin sets the editor host's combobox ARIA through ProseMirror's OWN
// decoration channel (so PM re-applies — never clobbers — it on every keystroke; gate-2 MAT). Not barrel-exported.
// Spec: docs/specs/features/ui-3-vida-editor/e4-slash-menu.md · BR-E4-1/6/10, §5, §7 B3.
import { Extension, ReactRenderer } from '@tiptap/react'
import { PluginKey, type EditorState } from '@tiptap/pm/state'
import Suggestion, { exitSuggestion, type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion'
import { SLASH_MENU_ITEMS, filterSlashItems, type SlashMenuItem } from '../slash-commands'
import { SLASH_LISTBOX_ID, SlashMenu, type SlashMenuHandle, type SlashMenuProps } from '../slash-menu'

/** One plugin key shared by the Suggestion plugin and the host-ARIA plugin (which reads its `active` state). */
export const SlashSuggestionPluginKey = new PluginKey('vidaSlashSuggestion')

type SlashSuggestionProps = SuggestionProps<SlashMenuItem, SlashMenuItem>

/** Map the plugin's `SuggestionProps` to the popup's props (the subset it consumes). */
function toMenuProps(props: SlashSuggestionProps): SlashMenuProps {
  return { items: props.items, command: props.command, editor: props.editor, query: props.query }
}

/** The Suggestion render lifecycle: a ReactRenderer popup the plugin mounts/positions, keys forwarded to its handle. */
function createRenderer() {
  let component: ReactRenderer<SlashMenuHandle, SlashMenuProps> | null = null
  let unmount: (() => void) | null = null

  return {
    onStart: (props: SlashSuggestionProps) => {
      component = new ReactRenderer<SlashMenuHandle, SlashMenuProps>(SlashMenu, {
        props: toMenuProps(props),
        editor: props.editor,
      })
      // v3 managed positioning: the plugin mounts + anchors the element at the caret and returns an unmount fn.
      unmount = props.mount(component.element)
    },
    onUpdate: (props: SlashSuggestionProps) => {
      component?.updateProps(toMenuProps(props))
    },
    onKeyDown: (props: SuggestionKeyDownProps) => {
      if (props.event.key === 'Escape') {
        exitSuggestion(props.view, SlashSuggestionPluginKey)
        return true
      }
      if (props.event.key === 'Tab') {
        // Close but do NOT trap — let Tab move focus (§5). exitSuggestion removes the decorations safely.
        exitSuggestion(props.view, SlashSuggestionPluginKey)
        return false
      }
      return component?.ref?.onKeyDown(props) ?? false
    },
    onExit: () => {
      unmount?.()
      unmount = null
      component?.destroy()
      component = null
    },
  }
}

/**
 * Whether the slash suggestion is currently open (reads the plugin's own state).
 * `[FACT: @tiptap/suggestion SuggestionPluginState.active]`
 */
export function slashActive(state: EditorState): boolean {
  const suggestion = SlashSuggestionPluginKey.getState(state) as { active?: boolean } | undefined
  return !!suggestion?.active
}

/**
 * The editor host's combobox ARIA while the slash menu is open, else `{}` (post-impl B1). This is merged INTO the
 * host's `editorProps.attributes` in editor.tsx — the SINGLE `role` writer — NOT contributed by a plugin: ProseMirror's
 * `computeDocDeco` consumes `view._props` (editorProps) BEFORE plugins with first-writer-wins, so a plugin can only ADD
 * absent keys and can NEVER override E1's static `role:'textbox'`. The `role`→`combobox` flip therefore has to live
 * where `role` is written (editorProps), which is what makes `aria-activedescendant` announce on a proper combobox host.
 * `[FACT: prosemirror-view computeDocDeco/someProp first-writer-wins; runtime-verified post-impl]`
 */
export function slashComboboxAttrs(active: boolean): Record<string, string> {
  return active
    ? { role: 'combobox', 'aria-expanded': 'true', 'aria-controls': SLASH_LISTBOX_ID, 'aria-haspopup': 'listbox' }
    : {}
}

/** The `/`-triggered block-insertion menu. Inert until `/` is typed; suppressed inside code blocks (BR-E4-10). */
export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashMenuItem, SlashMenuItem>({
        editor: this.editor,
        pluginKey: SlashSuggestionPluginKey,
        char: '/',
        allowSpaces: false,
        startOfLine: false,
        // `/` in a code block is literal code — never open the menu there (BR-E4-10).
        allow: ({ editor }) => !editor.isActive('codeBlock'),
        items: ({ query }) => [...filterSlashItems(SLASH_MENU_ITEMS, query)],
        // The popup calls `command(item)`; Suggestion routes it here with `props` = the selected item (BR-E4-4/F4).
        command: ({ editor, range, props }) => {
          props.run?.(editor, range)
        },
        render: createRenderer,
      }),
    ]
    // NB: the host combobox ARIA (role/expanded/controls) is applied in editor.tsx's editorProps.attributes (the single
    // `role` writer), NOT here — a plugin cannot override editorProps `role` (see slashComboboxAttrs).
  },
})

export default SlashCommand
