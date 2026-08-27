// ============================================================================
// TagPicker — MOD-notes ② · B6 (LIF-131). A controlled multi-select tag picker:
// search the live tag definitions (useTags) + toggle selection + an explicit
// "+ Create <name>" create-on-miss row (mirrors B3's `[[` picker — search
// existing + create, never silent, BR-B6-5). Composes UI-1 Popover/Input/Button
// — builds no @vida/ui primitive, no new token (BR-B6-9).
//
// Controlled: `value` = selected tag ids, `onChange(ids)`. The consumer decides
// what a change MEANS (create Dialog → stage for tagEntity-on-create; rail →
// diff to tagNote/untagNote). Create-on-miss adds the new tag id to `value`.
//
// The rich nestable color/icon tags-BROWSER is MOD-spaces ② (delivery-plan:232);
// this is the minimal apply/create picker B6 needs.
// ============================================================================

import { useMemo, useRef, useState, type ReactNode } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { Button, Input, Popover } from '@vida/ui'
import type { TagRow } from '@vida/core'
import { useTags, useCreateTag } from './use-tags'

/** Pure: case-insensitive substring match, empty query → all (mirrors ① resolveWikiLink / B3). */
export function filterTags(tags: readonly TagRow[], query: string): TagRow[] {
  const q = query.trim().toLowerCase()
  if (q === '') return [...tags]
  return tags.filter((t) => t.name.toLowerCase().includes(q))
}

/** True when the trimmed query exactly equals an existing tag name — suppresses the "+ Create" row (no dup, BR-B6-5). */
export function hasExactTag(tags: readonly TagRow[], query: string): boolean {
  const q = query.trim().toLowerCase()
  return q !== '' && tags.some((t) => t.name.toLowerCase() === q)
}

const Panel = styled(View, { flexDirection: 'column', gap: '$8', padding: '$8', minWidth: 240 })
const TagList = styled(View, { flexDirection: 'column', gap: '$4', maxHeight: 240 })
const Hint = styled(Text, { fontFamily: '$body', fontSize: '$small', color: '$colorTextMuted', paddingVertical: '$8' })
const Dot = styled(View, { width: 10, height: 10, borderRadius: '$full' })
const RowInner = styled(View, { flexDirection: 'row', alignItems: 'center', gap: '$8' })

function TagRowButton({
  tag,
  selected,
  onToggle,
}: {
  tag: TagRow
  selected: boolean
  onToggle: () => void
}): ReactNode {
  return (
    <Button
      intent={selected ? 'secondary' : 'ghost'}
      size="sm"
      onPress={onToggle}
      aria-pressed={selected}
      aria-label={`${selected ? 'Remove' : 'Add'} tag ${tag.name}`}
    >
      <RowInner>
        {/* tag.color is an arbitrary hex authored via AR-6 (not a Tamagui token) — display-only; `as never` widens
            the token-typed prop to accept the raw string. */}
        {tag.color ? <Dot backgroundColor={tag.color as never} /> : null}
        <Text fontFamily="$body" fontSize="$small">
          {selected ? '✓ ' : ''}
          {tag.name}
        </Text>
      </RowInner>
    </Button>
  )
}

export interface TagPickerProps {
  value: string[]
  onChange: (ids: string[]) => void
  /** The opener label (defaults to a count summary). Ignored when `inline`. */
  triggerLabel?: ReactNode
  /** Render the search+list+create body directly (no portalled Popover). REQUIRED inside a modal Dialog — a
   *  Popover portals to <body>, so its pointerdown reads as an outside-click and dismisses the parent Dialog
   *  (Visual-Gate catch). The rail uses the Popover form; the create Dialog uses inline. */
  inline?: boolean
}

/** The shared picker body — search + selectable list + create-on-miss. Rendered either inline or inside a Popover. */
function TagPickerBody({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }): ReactNode {
  const tagsQuery = useTags()
  const createTag = useCreateTag()
  const [query, setQuery] = useState('')

  const tags = tagsQuery.data ?? []
  const filtered = useMemo(() => filterTags(tags, query), [tags, query])
  const canCreate = query.trim().length > 0 && !hasExactTag(tags, query)

  // Latest selection, read in the async create onSuccess so intermediate toggles between "+ Create" and resolve
  // aren't clobbered by a stale `value` closure (onChange takes an array, not an updater — N1).
  const valueRef = useRef(value)
  valueRef.current = value

  const toggle = (id: string): void => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }
  const create = (): void => {
    const name = query.trim()
    if (!name) return
    createTag.mutate(name, {
      onSuccess: (row) => {
        onChange([...valueRef.current, row.id])
        setQuery('')
      },
    })
  }

  return (
    <Panel>
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder="Search or create a tag…"
        aria-label="Search tags"
      />
      <TagList role="list" aria-label="Tags">
        {filtered.map((t) => (
          <TagRowButton key={t.id} tag={t} selected={value.includes(t.id)} onToggle={() => toggle(t.id)} />
        ))}
        {filtered.length === 0 && !canCreate ? (
          <Hint>{tags.length === 0 ? 'No tags yet — type to create one.' : 'No matching tags.'}</Hint>
        ) : null}
      </TagList>
      {canCreate ? (
        <Button
          intent="ghost"
          size="sm"
          onPress={create}
          loading={createTag.isPending}
          aria-label={`Create tag ${query.trim()}`}
        >
          + Create “{query.trim()}”
        </Button>
      ) : null}
    </Panel>
  )
}

export function TagPicker({ value, onChange, triggerLabel, inline }: TagPickerProps): ReactNode {
  if (inline) {
    return (
      <View role="group" aria-label="Tag picker">
        <TagPickerBody value={value} onChange={onChange} />
      </View>
    )
  }
  const label = triggerLabel ?? (value.length > 0 ? `Tags · ${value.length}` : 'Add tags')
  return (
    <Popover
      aria-label="Tag picker"
      trigger={
        <Button intent="secondary" size="sm">
          {label}
        </Button>
      }
    >
      <TagPickerBody value={value} onChange={onChange} />
    </Popover>
  )
}

export default TagPicker
