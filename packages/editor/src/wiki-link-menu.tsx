// MOD-notes ② · B3 (LIF-131) — the `[[` wiki-link picker popup. Rendered by the WikiLink Suggestion plugin via a
// ReactRenderer (a COMBOBOX — focus stays in the editor; keys arrive through the imperative `onKeyDown` handle). Mirrors
// the E4 `slash-menu.tsx` chrome + a11y (Menu sub-theme under a re-established `<Theme>` scope; the single `role` writer
// is editor.tsx). States (BR-B3-12): loading ("Searching…") · candidate list · a trailing "+ Create '<query>'" row when
// the query is non-empty (create-on-miss, BR-B3-6) · "Type to search pages" when empty. No injected CSS, no motion.
// Spec: docs/specs/features/mod-notes/ui-ux/b3-note-link-picker.md · BR-B3-6/9/12.
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
import { stripWikiClose, type WikiLinkCandidate, type WikiLinkCreateRequest } from './extensions/wiki-link'

/** Stable ids the editor host's `aria-controls`/`aria-activedescendant` point at (one picker per editor at a time). */
export const WIKI_LISTBOX_ID = 'vida-wikilink-listbox'
export const wikiOptionId = (i: number): string => `vida-wikilink-option-${i}`

export interface WikiLinkMenuProps {
  candidates: readonly WikiLinkCandidate[]
  /** Dispatch a selection → the Suggestion config `command` (a candidate, or the create sentinel). */
  command: (item: WikiLinkCandidate | WikiLinkCreateRequest) => void
  /** Used only to set `aria-activedescendant` on the host as the selection moves. */
  editor: Editor
  query: string
  loading: boolean
}

export interface WikiLinkMenuHandle {
  onKeyDown(props: { event: KeyboardEvent }): boolean
}

// ── chrome (Menu sub-theme token language; radius via the token scale — DEF-U8-h; mirrors slash-menu.tsx) ─────────────
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

const OptionRow = styled(View, {
  name: 'Menu',
  cursor: 'pointer',
  paddingVertical: '$8',
  paddingHorizontal: '$12',
  variants: {
    active: { true: { backgroundColor: '$itemBackgroundHover' } },
  } as const,
})

const OptionTitle = styled(Text, {
  name: 'Menu',
  fontFamily: '$body',
  fontSize: '$small',
  color: '$itemText',
})

const Hint = styled(Text, {
  name: 'Menu',
  fontFamily: '$body',
  fontSize: '$caption',
  color: '$colorTextMuted',
  paddingVertical: '$8',
  paddingHorizontal: '$12',
})

function WikiLinkMenuImpl(
  props: WikiLinkMenuProps,
  ref: React.ForwardedRef<WikiLinkMenuHandle>,
): React.ReactElement {
  const { candidates, command, editor, query, loading } = props
  const trimmed = stripWikiClose(query).trim()
  const showCreate = trimmed.length > 0 // create-on-miss is always offered for a non-empty query (BR-B3-6)
  // Selectable rows = candidates, then (optionally) the Create row at index === candidates.length.
  const createIndex = showCreate ? candidates.length : -1
  const rowCount = candidates.length + (showCreate ? 1 : 0)
  const [selectedIndex, setSelectedIndex] = useState(0)

  // A new candidate set arrives on every keystroke — reset the highlight to the first row.
  useEffect(() => {
    setSelectedIndex(0)
  }, [candidates, showCreate])

  // Reflect the active option on the editor host (raw setAttribute — NOT PM-managed, survives the per-keystroke
  // decoration re-apply; the slash-menu precedent). Cleared on unmount.
  useEffect(() => {
    const dom = editor?.view?.dom
    if (!dom) return
    if (rowCount > 0 && selectedIndex >= 0) {
      dom.setAttribute('aria-activedescendant', wikiOptionId(selectedIndex))
      document.getElementById(wikiOptionId(selectedIndex))?.scrollIntoView?.({ block: 'nearest' })
    } else {
      dom.removeAttribute('aria-activedescendant')
    }
    return () => dom.removeAttribute('aria-activedescendant')
  }, [editor, selectedIndex, rowCount])

  const dispatch = (index: number): void => {
    if (index === createIndex) {
      command({ __create: trimmed })
      return
    }
    const c = candidates[index]
    if (c) command(c)
  }

  useImperativeHandle(
    ref,
    (): WikiLinkMenuHandle => ({
      onKeyDown: ({ event }) => {
        if (rowCount === 0) return false
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % rowCount)
          return true
        }
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i - 1 + rowCount) % rowCount)
          return true
        }
        if (event.key === 'Enter') {
          dispatch(selectedIndex)
          return true // consume Enter while open
        }
        return false // printables fall through → re-filter
      },
    }),
    [rowCount, selectedIndex, candidates, trimmed],
  )

  return (
    // Re-establish the Menu sub-theme scope the ReactRenderer element sits outside of (the E4 portal-scope lesson).
    <Theme name="Menu">
      <Panel
        role="listbox"
        id={WIKI_LISTBOX_ID}
        aria-label="Link to a page"
        style={{ maxHeight: 320, overflowY: 'auto', overflowX: 'hidden' }}
      >
        {loading && candidates.length === 0 && <Hint aria-live="polite">Searching…</Hint>}
        {!loading && rowCount === 0 && <Hint>Type to search pages</Hint>}
        {candidates.map((c, i) => (
          <OptionRow
            key={c.id}
            role="option"
            id={wikiOptionId(i)}
            aria-selected={i === selectedIndex}
            active={i === selectedIndex}
            onMouseDown={(e: React.MouseEvent) => e.preventDefault()} // keep the caret in the editor
            onPointerMove={() => setSelectedIndex(i)}
            onPress={() => dispatch(i)}
          >
            <OptionTitle>{c.title || 'Untitled'}</OptionTitle>
          </OptionRow>
        ))}
        {showCreate && (
          <OptionRow
            role="option"
            id={wikiOptionId(createIndex)}
            aria-selected={selectedIndex === createIndex}
            active={selectedIndex === createIndex}
            onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
            onPointerMove={() => setSelectedIndex(createIndex)}
            onPress={() => dispatch(createIndex)}
          >
            <OptionTitle>{`+ Create "${trimmed}"`}</OptionTitle>
          </OptionRow>
        )}
      </Panel>
    </Theme>
  )
}

export const WikiLinkMenu: ForwardRefExoticComponent<WikiLinkMenuProps & RefAttributes<WikiLinkMenuHandle>> =
  forwardRef(WikiLinkMenuImpl)

export default WikiLinkMenu
