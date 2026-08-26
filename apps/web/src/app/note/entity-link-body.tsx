// ============================================================================
// entityLink block body — MOD-notes ② · B4 (LIF-131). The REAL inline body the
// editor's `entityLink` node-view delegates to (BR-B4-4). Two states off the
// node attrs {entityType, entityId, label}:
//   • entityId === ''  → an inline entity PICKER (search pages → resolveWikiLink);
//                        on select → createEntityLink (row FIRST, fail-loud) →
//                        updateAttributes (COMMIT) | deleteNode (reject/cancel).
//   • entityId  filled → a navigable reference (<Link> for a page; a graceful
//                        "opens when its module ships" for an unshipped type).
// The write goes to `entity_links` via AR-6 (entity_type='page'), kept DISTINCT
// from the `[[` page_links flow (BR-B4-1). Spec: b4-link-panels.md · BR-B4-4..8.
// ============================================================================

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { Input } from '@vida/ui'
import { Link } from '@tanstack/react-router'
import type { PageRow } from '@vida/core'
import { useNoteTitle } from './use-note'

/** The subset of a resolved page the picker links to. */
export interface EntityLinkCandidate {
  entityType: string
  entityId: string
  label: string
}

/** The app-supplied deps the picker needs — closed over the Notes service + the create hook in note-detail. */
export interface EntityLinkBodyDeps {
  /** Search resolvable targets (M1.1 = pages via resolveWikiLink). */
  resolveTargets: (text: string) => Promise<PageRow[]>
  /** createEntityLink via the mutation hook (mutateAsync — rejects loud on error, its onError Toast fires). */
  createLink: (target: { entityType: string; entityId: string }) => Promise<unknown>
}

/**
 * The fail-loud ORDER (BR-B4-6), pure + unit-tested: write the `entity_links` row FIRST; only on success COMMIT the node
 * (`updateAttributes`); on reject REMOVE the node (`deleteNode`) so content never carries an entity-link embed with no
 * backing row. The error Toast is the mutation hook's (this helper owns only the node lifecycle).
 */
export async function resolveEntityLink(
  ops: {
    link: (t: { entityType: string; entityId: string }) => Promise<unknown>
    commit: (attrs: Record<string, unknown>) => void
    remove: () => void
  },
  target: EntityLinkCandidate,
): Promise<void> {
  try {
    await ops.link({ entityType: target.entityType, entityId: target.entityId }) // row FIRST
  } catch {
    ops.remove() // no committed node without a row (BR-B4-6)
    return
  }
  ops.commit({ entityType: target.entityType, entityId: target.entityId, label: target.label })
}

// ── styled parts (token spacing only — the B2/B3 language) ───────────────────────────────────────────────────────────
const Chip = styled(View, {
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$4',
  paddingHorizontal: '$8',
  paddingVertical: '$2',
  borderRadius: '$md',
  backgroundColor: '$colorSurfaceSecondary',
  borderColor: '$colorBorderDefault',
  borderWidth: 1,
})
const ChipText = styled(Text, { fontFamily: '$body', fontSize: '$small', color: '$colorTextPrimary' })
const MutedText = styled(Text, { fontFamily: '$body', fontSize: '$small', color: '$colorTextMuted' })
const PickerCard = styled(View, {
  flexDirection: 'column',
  gap: '$4',
  padding: '$8',
  borderRadius: '$md',
  backgroundColor: '$colorSurfaceSecondary',
  borderColor: '$colorBorderDefault',
  borderWidth: 1,
})
const Option = styled(View, {
  paddingHorizontal: '$8',
  paddingVertical: '$4',
  borderRadius: '$sm',
  cursor: 'pointer',
  hoverStyle: { backgroundColor: '$colorSurfacePrimary' },
})

const DEBOUNCE_MS = 150

// ── the committed reference (entityId filled) ────────────────────────────────────────────────────────────────────────
function CommittedRef({ entityType, entityId, label }: EntityLinkCandidate): ReactElement {
  // NP-7: resolve the display title by ID (never by text). Only `page` targets are navigable at M1.1; other registered
  // types degrade gracefully until their module ships (CB6 — the E5 placeholder ethos, BR-B4-8).
  const isPage = entityType === 'page'
  const titleQuery = useNoteTitle(isPage ? entityId : '')
  if (!isPage) {
    return (
      <Chip contentEditable={false}>
        <ChipText>🔗 {label || entityId}</ChipText>
        <MutedText>· opens when its module ships</MutedText>
      </Chip>
    )
  }
  const title = titleQuery.data?.title ?? label ?? 'Untitled'
  return (
    <Chip contentEditable={false}>
      <Link to="/note/$id" params={{ id: entityId }} aria-label={`Entity link to ${title}`}>
        🔗 {title}
      </Link>
    </Chip>
  )
}

// ── the inline picker (entityId empty) ───────────────────────────────────────────────────────────────────────────────
function EntityPicker({
  deps,
  onCommit,
  onCancel,
}: {
  deps: EntityLinkBodyDeps
  onCommit: (target: EntityLinkCandidate) => void
  onCancel: () => void
}): ReactElement {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PageRow[]>([])
  const [active, setActive] = useState(0)
  const reqRef = useRef(0)
  // Once a selection is made, the node commits (or the write's own reject removes it) — the blur self-clean must NOT
  // also fire (the input unmounts on commit → a spurious blur would deleteNode the just-committed node).
  const doneRef = useRef(false)

  // Debounced search; a stale in-flight response is dropped by the request counter (BR-B4-5 keep-typing soft-fail).
  useEffect(() => {
    const seq = ++reqRef.current
    const t = setTimeout(() => {
      deps
        .resolveTargets(query)
        .then((rows) => {
          if (seq === reqRef.current) {
            setResults(rows)
            setActive(0)
          }
        })
        .catch(() => {
          if (seq === reqRef.current) setResults([])
        })
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query, deps])

  const choose = useCallback(
    (row: PageRow) => {
      doneRef.current = true // a selection was made — suppress the blur self-clean (the reject path removes explicitly)
      onCommit({ entityType: 'page', entityId: row.id, label: row.title ?? 'Untitled' })
    },
    [onCommit],
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Keep keystrokes inside the node-view input — do not let ProseMirror's keymap steal them (R4).
      e.stopPropagation()
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((i) => (results.length === 0 ? 0 : (i + 1) % results.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((i) => (results.length === 0 ? 0 : (i - 1 + results.length) % results.length))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const row = results[active]
        if (row) choose(row)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onCancel() // cancel while empty → self-clean (BR-B4-6)
      }
    },
    [results, active, choose, onCancel],
  )

  return (
    <PickerCard
      contentEditable={false}
      role="combobox"
      aria-expanded
      aria-label="Link an entity"
      // Stop ProseMirror from stealing pointer focus/selection when interacting with the picker (R4).
      onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
    >
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder="Link a note…"
        aria-label="Search notes to link"
        autoFocus // the picker opens on an explicit user insert (/entity-link) → focus belongs on the search field
        onKeyDown={onKeyDown}
        onBlur={() => {
          // Blur while genuinely ABANDONED (clicked outside / tabbed away, not a selection) → self-clean so no empty
          // embed persists (BR-B4-6). Option clicks preventDefault the blur (below), and a selection sets doneRef, so
          // this only fires on a true abandon.
          if (!doneRef.current) onCancel()
        }}
      />
      <View role="listbox" aria-label="Matching notes">
        {results.length === 0 ? (
          <MutedText>No matching notes</MutedText>
        ) : (
          results.map((row, i) => (
            <Option
              key={row.id}
              role="option"
              aria-selected={i === active}
              backgroundColor={i === active ? '$colorSurfacePrimary' : undefined}
              // Prevent the input from blurring on an option click → the choose()/commit runs while focus is intact,
              // so the blur self-clean never races the async write (code-review fix).
              onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
              onPress={() => choose(row)}
            >
              <ChipText>{row.title ?? 'Untitled'}</ChipText>
            </Option>
          ))
        )}
      </View>
    </PickerCard>
  )
}

// ── the body (the BlockBodyRenderer target) ──────────────────────────────────────────────────────────────────────────
export function EntityLinkBody({
  attrs,
  updateAttributes,
  deleteNode,
  deps,
}: {
  attrs: Record<string, unknown>
  updateAttributes: (attrs: Record<string, unknown>) => void
  deleteNode: () => void
  deps: EntityLinkBodyDeps
}): ReactElement {
  const entityId = typeof attrs.entityId === 'string' ? attrs.entityId : ''
  const entityType = typeof attrs.entityType === 'string' ? attrs.entityType : ''
  const label = typeof attrs.label === 'string' ? attrs.label : ''

  const onCommit = useCallback(
    (target: EntityLinkCandidate) => {
      void resolveEntityLink({ link: deps.createLink, commit: updateAttributes, remove: deleteNode }, target)
    },
    [deps, updateAttributes, deleteNode],
  )

  if (entityId !== '') {
    return <CommittedRef entityType={entityType} entityId={entityId} label={label} />
  }
  return <EntityPicker deps={deps} onCommit={onCommit} onCancel={deleteNode} />
}
