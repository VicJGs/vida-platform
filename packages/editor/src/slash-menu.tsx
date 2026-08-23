// E4 (UI-3) — the slash-menu popup. Rendered by the Suggestion plugin via `@tiptap/react` ReactRenderer (NOT a UI-1
// Menu mount — a slash menu is a COMBOBOX: focus stays in the editor, so this exposes an imperative `onKeyDown` handle
// the plugin forwards ↑/↓/Enter to, and never moves DOM focus into itself). Reuses the UI-1 Menu sub-theme token
// language under `<Theme name="Menu">` (the portal-scope lesson — the ReactRenderer element is positioned outside the
// editor frame, so the sub-theme scope must be re-established here). Spec: e4-slash-menu.md · BR-E4-1/6, §5.
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from 'react'
import { styled, Text, Theme, View } from '@tamagui/core'
import type { Editor } from '@tiptap/react'
import type { SlashCommandCategory } from '@vida/types'
import type { SlashMenuItem } from './slash-commands'

/** Stable ids the editor host's `aria-controls`/`aria-activedescendant` point at (§5; one menu per editor at a time). */
export const SLASH_LISTBOX_ID = 'vida-slash-listbox'
export const slashOptionId = (i: number): string => `vida-slash-option-${i}`

/** The props the Suggestion render lifecycle passes each update (a subset of `SuggestionProps` this popup consumes). */
export interface SlashMenuProps {
  items: readonly SlashMenuItem[]
  /** Dispatch a selection → Suggestion routes it to the config `command` → `item.run?.(editor, range)` (BR-E4-4/F4). */
  command: (item: SlashMenuItem) => void
  /** The editor — used only to set `aria-activedescendant` on its host as the selection moves (§5). */
  editor: Editor
  query: string
}

/** The imperative handle the Suggestion `render().onKeyDown` forwards keys to (returns true when consumed). */
export interface SlashMenuHandle {
  onKeyDown(props: { event: KeyboardEvent }): boolean
}

const CATEGORY_LABEL: Record<SlashCommandCategory, string> = {
  basic: 'Basic',
  media: 'Media',
  platform: 'Platform blocks',
  embed: 'Embeds',
}

// ── enabled-item navigation (skip `!available`, WRAP — the menu convention) ─────────────────────────────────────────
function firstAvailable(items: readonly SlashMenuItem[]): number {
  return items.findIndex((it) => it.available)
}
function stepAvailable(items: readonly SlashMenuItem[], from: number, dir: 1 | -1): number {
  const n = items.length
  if (n === 0) return -1
  let i = from
  for (let c = 0; c < n; c++) {
    i = (i + dir + n) % n
    if (items[i]?.available) return i
  }
  return from
}

// ── chrome (Menu sub-theme token language; radius via the token scale — DEF-U8-h) ───────────────────────────────────
const Panel = styled(View, {
  name: 'Menu',
  backgroundColor: '$background',
  borderWidth: 1,
  borderColor: '$border',
  borderRadius: '$md',
  paddingVertical: '$4',
  minWidth: 240,
  maxWidth: 360,
})

const GroupLabel = styled(Text, {
  name: 'Menu',
  fontFamily: '$body',
  fontSize: '$caption',
  color: '$colorTextMuted',
  paddingHorizontal: '$12',
  paddingTop: '$8',
  paddingBottom: '$4',
})

const OptionRow = styled(View, {
  name: 'Menu',
  flexDirection: 'column',
  gap: '$2',
  cursor: 'pointer',
  paddingVertical: '$8',
  paddingHorizontal: '$12',
  variants: {
    active: { true: { backgroundColor: '$itemBackgroundHover' } },
    disabled: { true: { opacity: 0.5, cursor: 'not-allowed' } },
  } as const,
})

const OptionTitle = styled(Text, {
  name: 'Menu',
  fontFamily: '$body',
  fontSize: '$small',
  color: '$itemText',
})

const OptionDesc = styled(Text, {
  name: 'Menu',
  fontFamily: '$body',
  fontSize: '$caption',
  color: '$colorTextMuted',
})

function SlashMenuImpl(props: SlashMenuProps, ref: React.ForwardedRef<SlashMenuHandle>): React.ReactElement {
  const { items, command, editor } = props
  const [selectedIndex, setSelectedIndex] = useState(() => firstAvailable(items))

  // A new filtered `items` arrives on every keystroke — reset the highlight to the first selectable row.
  useEffect(() => {
    setSelectedIndex(firstAvailable(items))
  }, [items])

  // Reflect the active option on the editor host (§5). Raw setAttribute is safe for aria-activedescendant — it is NOT
  // in ProseMirror's managed attribute set (no editorProps/plugin writes it), so the per-keystroke decoration re-apply
  // never clobbers it; the host `role`/`aria-expanded`/`-controls` flip lives in editor.tsx's editorProps.attributes
  // (the single `role` writer — post-impl B1). Cleared on unmount (or when the selection leaves the available set).
  useEffect(() => {
    const dom = editor?.view?.dom
    if (!dom) return
    if (selectedIndex >= 0 && items[selectedIndex]?.available) {
      dom.setAttribute('aria-activedescendant', slashOptionId(selectedIndex))
      // F6 — keep the highlighted option VISIBLE when arrowing past the panel's scroll fold (maxHeight:320). Without
      // this, ↑/↓ move the selection off-screen and it reads as "arrows don't work / can't see what I'm selecting".
      document.getElementById(slashOptionId(selectedIndex))?.scrollIntoView({ block: 'nearest' })
    } else {
      dom.removeAttribute('aria-activedescendant')
    }
    return () => dom.removeAttribute('aria-activedescendant')
  }, [editor, selectedIndex, items])

  useImperativeHandle(
    ref,
    (): SlashMenuHandle => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => stepAvailable(items, i, 1))
          return true
        }
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => stepAvailable(items, i, -1))
          return true
        }
        if (event.key === 'Enter') {
          const item = items[selectedIndex]
          if (item && item.available) command(item)
          return true // consume Enter while open — never insert a newline
        }
        return false // printable keys fall through to the editor → re-filter
      },
    }),
    [items, selectedIndex, command],
  )

  let lastCategory: SlashCommandCategory | null = null

  return (
    // Re-establish the Menu sub-theme scope the ReactRenderer element sits outside of (BR-E4-6).
    <Theme name="Menu">
      <Panel
        role="listbox"
        id={SLASH_LISTBOX_ID}
        aria-label="Slash commands"
        style={{ maxHeight: 320, overflowY: 'auto', overflowX: 'hidden' }}
      >
        {items.length === 0 ? (
          <OptionRow role="option" aria-disabled="true" disabled>
            <OptionTitle color="$colorTextMuted">No blocks</OptionTitle>
          </OptionRow>
        ) : (
          items.map((item, i) => {
            const header = item.category !== lastCategory ? CATEGORY_LABEL[item.category] : null
            lastCategory = item.category
            return (
              <View key={item.id}>
                {header != null && <GroupLabel>{header}</GroupLabel>}
                <OptionRow
                  role="option"
                  id={slashOptionId(i)}
                  aria-selected={i === selectedIndex}
                  aria-disabled={!item.available || undefined}
                  active={i === selectedIndex}
                  disabled={!item.available}
                  // Keep the caret in the editor — a pointerdown on the popup would blur the contenteditable.
                  onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
                  onPointerMove={() => item.available && setSelectedIndex(i)}
                  onPress={() => item.available && command(item)}
                >
                  <OptionTitle>{item.title}</OptionTitle>
                  {item.description != null && <OptionDesc>{item.description}</OptionDesc>}
                </OptionRow>
              </View>
            )
          })
        )}
      </Panel>
    </Theme>
  )
}

export const SlashMenu: ForwardRefExoticComponent<SlashMenuProps & RefAttributes<SlashMenuHandle>> =
  forwardRef(SlashMenuImpl)

export default SlashMenu
