// ============================================================================
// WikiLinkPicker — the `[[` picker UI (fe-notes-and-pages #27, S4). A listbox of
// title-LIKE candidates + an EXPLICIT "+ Create '<query>'" row (create-on-miss is
// never silent — NOT-19 / EC-10). Split (the NoteEntityView precedent): PickerView is
// pure presentational (state-as-prop → all states unit-tested directly); WikiLinkPicker
// is the thin hook shell.
//
// The editor-side `[[` TRIGGER that mounts this at the caret is a ui-3 concern
// (e4-slash-menu.md:31), NOT built here; in M1 a `?picker` dev-gate mounts it standalone.
// ============================================================================
import { useState, type KeyboardEvent } from 'react'
import { Text, View } from '@tamagui/core'
import { Plus } from 'lucide-react'
import type { CreateRow, WikiCandidate } from './wikilink'
import { Icon, Row, typeIcon, typeLabel } from './note-chrome'
import { useWikiLinkPicker, type PickerState } from './use-wikilink-picker'

type Option = { kind: 'pick'; candidate: WikiCandidate } | { kind: 'create'; query: string }

function Muted({ children, role, busy }: { children: React.ReactNode; role?: 'status'; busy?: boolean }) {
  return (
    <Text role={role} aria-busy={busy ? true : undefined} fontSize="$small" color="$colorTextMuted">
      {children}
    </Text>
  )
}

export interface PickerViewProps {
  query: string
  candidates: WikiCandidate[]
  createRow: CreateRow | null
  state: PickerState
  onPick: (targetPageId: string) => void
  onCreate: (query: string) => void
}

/** Pure presentational — all states as props (no hook, no env). A WAI-ARIA listbox. */
export function PickerView({ query, candidates, createRow, state, onPick, onCreate }: PickerViewProps) {
  const options: Option[] = [
    ...candidates.map((candidate): Option => ({ kind: 'pick', candidate })),
    ...(createRow ? [{ kind: 'create', query: createRow.query } as Option] : []),
  ]
  const [selected, setSelected] = useState(0)

  if (state === 'searching') return <Muted busy>Searching…</Muted>
  if (state === 'error') return <Muted role="status">Couldn’t search pages.</Muted>
  if (options.length === 0) return <Muted>Type to search pages.</Muted>

  const active = Math.min(selected, options.length - 1)
  const activate = (i: number) => {
    const opt = options[i]
    if (opt.kind === 'pick') onPick(opt.candidate.id)
    else onCreate(opt.query)
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => (Math.min(s, options.length - 1) + 1) % options.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => (Math.min(s, options.length - 1) - 1 + options.length) % options.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      activate(active)
    }
  }

  return (
    <View
      role="listbox"
      aria-label="Link to page"
      tabIndex={0}
      onKeyDown={onKeyDown}
      gap="$2"
      padding="$4"
      backgroundColor="$colorSurfacePrimary"
      borderColor="$colorBorderDefault"
      borderWidth={1}
      borderRadius="$md"
      maxWidth={420}
    >
      {options.map((opt, i) =>
        opt.kind === 'pick' ? (
          <Row
            key={opt.candidate.id}
            role="option"
            aria-selected={i === active}
            onPress={() => activate(i)}
            paddingVertical="$4"
            paddingHorizontal="$8"
            borderRadius="$sm"
            backgroundColor={i === active ? '$colorSurfaceSecondary' : 'transparent'}
            hoverStyle={{ backgroundColor: '$colorSurfaceSecondary' }}
            focusStyle={{ outlineColor: '$colorFocusRing', outlineStyle: 'solid', outlineWidth: 2 }}
          >
            <Icon icon={typeIcon(opt.candidate.type)} />
            <Text fontSize="$body" color="$colorTextPrimary">
              {opt.candidate.title}
            </Text>
            <Text fontSize="$small" color="$colorTextMuted">
              {typeLabel(opt.candidate.type)}
            </Text>
          </Row>
        ) : (
          <Row
            key="__create"
            role="option"
            aria-selected={i === active}
            onPress={() => activate(i)}
            paddingVertical="$4"
            paddingHorizontal="$8"
            borderRadius="$sm"
            backgroundColor={i === active ? '$colorSurfaceSecondary' : 'transparent'}
            hoverStyle={{ backgroundColor: '$colorSurfaceSecondary' }}
            focusStyle={{ outlineColor: '$colorFocusRing', outlineStyle: 'solid', outlineWidth: 2 }}
          >
            <Icon icon={Plus} tone="accent" />
            <Text fontSize="$body" color="$colorTextPrimary">
              Create “{query}”
            </Text>
          </Row>
        ),
      )}
    </View>
  )
}

/** The hook-wired shell: reads the data seam, delegates to the pure view. */
export function WikiLinkPicker({ sourcePageId }: { sourcePageId: string }) {
  const picker = useWikiLinkPicker(sourcePageId)
  return (
    <PickerView
      query={picker.query}
      candidates={picker.candidates}
      createRow={picker.createRow}
      state={picker.state}
      onPick={picker.pick}
      onCreate={picker.createAndLinkTitle}
    />
  )
}
