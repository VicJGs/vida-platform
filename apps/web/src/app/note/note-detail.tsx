// ============================================================================
// Note detail — MOD-notes ② · B2 (LIF-131). The `/note/$id` surface: reads the
// page, mounts the REAL @vida/editor over pages.content with local autosave,
// an editable title, a collapsible detail rail, and page-actions (favorite/
// archive + confirm-gated soft-delete). Composes @vida/ui + @vida/editor —
// builds no @vida/ui primitive, no new token. EC-6/EC-7/EC-11.
//
// Read axis (deriveTerminalState): loading | error (query reject) | empty
// (null = not-found) | success. Within success, the content axis: blank editable
// vs corrupt → read-only + flag (BR-B2-2/3, business-rules.md:29).
//
// Deferred to later slices: `[[` picker (B3), Links-out/Backlinks panels in the
// rail (B4), neural edges (B5), tags/filters/icon/cover + Export (B6), journal
// /summary (B7). B2's rail = metadata only.
// ============================================================================

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { styled, Text, View, useMedia } from '@tamagui/core'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button, Dialog, Input, Menu, toast, type MenuItem } from '@vida/ui'
import { VidaEditor, type EditorDocument } from '@vida/editor'
import type { PageRow } from '@vida/core'
import { deriveTerminalState } from '../../state-conventions/terminal-state'
import { useDeleteNote, useNote, useUpdateNote } from './use-note'
import { EMPTY_DOC, parseContent, serializeContent } from './note-content-codec'

const AUTOSAVE_DEBOUNCE_MS = 600

// ── styled parts (token spacing only — 4pt grid via $space; design §IV) ────────────────────────────────
const Root = styled(View, { flexDirection: 'row', gap: '$16', padding: '$16', alignItems: 'flex-start' })
const MainCol = styled(View, { flex: 1, flexDirection: 'column', gap: '$12', minWidth: 0 })
const HeaderBar = styled(View, {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '$12',
})
const HeaderLeft = styled(View, { flexDirection: 'row', alignItems: 'center', gap: '$8', flex: 1, minWidth: 0 })
// Input exposes no layout props (InputProps omits them) — grow it via a flex wrapper (the title fills the header row).
const TitleFieldWrap = styled(View, { flex: 1, minWidth: 0 })
const HeaderActions = styled(View, { flexDirection: 'row', alignItems: 'center', gap: '$8' })
const TypeChip = styled(Text, {
  fontFamily: '$body',
  fontSize: '$small',
  color: '$colorTextMuted',
  backgroundColor: '$colorSurfaceSecondary',
  paddingHorizontal: '$8',
  paddingVertical: '$4',
  borderRadius: '$md',
})
const Rail = styled(View, {
  width: 280,
  flexDirection: 'column',
  gap: '$12',
  padding: '$12',
  borderColor: '$colorBorderDefault',
  borderWidth: 1,
  borderRadius: '$lg',
  backgroundColor: '$colorSurfaceSecondary',
})
const RailSectionLabel = styled(Text, {
  fontFamily: '$body',
  fontSize: '$small',
  fontWeight: '$semibold',
  color: '$colorTextMuted',
})
const MetaRow = styled(Text, { fontFamily: '$body', fontSize: '$small', color: '$colorTextPrimary' })
const Banner = styled(Text, {
  fontFamily: '$body',
  fontSize: '$small',
  color: '$colorTextPrimary',
  backgroundColor: '$colorSurfaceSecondary',
  borderColor: '$colorBorderDefault',
  borderWidth: 1,
  borderRadius: '$md',
  padding: '$12',
})
const CenterStack = styled(View, { flexDirection: 'column', alignItems: 'center', gap: '$12', paddingVertical: '$24' })
const StatusText = styled(Text, { fontFamily: '$body', fontSize: '$body', color: '$colorTextMuted' })

const formatTs = (ms: number): string => new Date(ms).toLocaleString()

// ── autosave: ONE debounced writer coalescing {title, content} (BR-B2-4) ─────────────────────────────────
// The content baseline is the NORMALIZED serialization (not the raw column), so the editor's mount echo compares
// equal → no spurious save-per-open (gate-2 MATERIAL-2). All mutable access is via refs (no stale closure).
function usePageAutosave(
  update: ReturnType<typeof useUpdateNote>,
  baseline: { title: string | null; content: string },
): { persistTitle: (next: string | null) => void; persistContent: (serialized: string) => void } {
  const pendingRef = useRef<{ title?: string | null; content?: string }>({})
  const lastSavedRef = useRef(baseline) // seeded once (baseline is a mount-stable memo)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const patch = pendingRef.current
    pendingRef.current = {}
    if (patch.title === undefined && patch.content === undefined) return
    update.mutate(patch, {
      onError: () => toast({ title: "Couldn't save — your note is safe locally", intent: 'danger' }),
    })
    if (patch.title !== undefined) lastSavedRef.current.title = patch.title
    if (patch.content !== undefined) lastSavedRef.current.content = patch.content
  }, [update])

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(flush, AUTOSAVE_DEBOUNCE_MS)
  }, [flush])

  const persistTitle = useCallback(
    (next: string | null) => {
      if (next === lastSavedRef.current.title) {
        delete pendingRef.current.title // cancel a previously-staged title edit
        return
      }
      pendingRef.current.title = next
      schedule()
    },
    [schedule],
  )

  const persistContent = useCallback(
    (serialized: string) => {
      if (serialized === lastSavedRef.current.content) return // swallows the mount echo (BR-B2-4)
      pendingRef.current.content = serialized
      schedule()
    },
    [schedule],
  )

  // Flush a pending edit on unmount (navigating away mid-debounce must not drop the last edit).
  const flushRef = useRef(flush)
  flushRef.current = flush
  useEffect(() => () => flushRef.current(), [])

  return { persistTitle, persistContent }
}

// ── the loaded surface (success — a real PageRow) ────────────────────────────────────────────────────────
function NoteDetailLoaded({ page, id }: { page: PageRow; id: string }): ReactNode {
  const navigate = useNavigate()
  const media = useMedia()
  const autosave = useUpdateNote(id) // the debounced single-writer for title/content
  const meta = useUpdateNote(id) // a SEPARATE instance for discrete favorite/archive toggles (own isPending; no contention)
  const del = useDeleteNote(id)
  const railId = useId()

  // Seed the editor ONCE from the first read; never re-seed from a refetch (BR-B2-4).
  const seeded = useMemo(() => parseContent(page.content), [])
  const corrupt = seeded.corrupt

  const [title, setTitle] = useState<string>(page.title ?? '')
  const [isFavorite, setIsFavorite] = useState<boolean>(page.is_favorite)
  const [isArchived, setIsArchived] = useState<boolean>(page.is_archived)
  const [railOpen, setRailOpen] = useState<boolean>(media.tablet) // collapsed by default at 375 (mobile)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Baseline built ONCE (mount-stable) — the normalized content string avoids the mount-echo false-positive, and
  // memoizing it stops a whole-doc re-serialize on every title keystroke re-render.
  const baseline = useMemo(
    () => ({ title: page.title ?? null, content: serializeContent(seeded.doc ?? EMPTY_DOC) }),
    [],
  )
  const { persistTitle, persistContent } = usePageAutosave(autosave, baseline)

  const onTitleChange = (v: string): void => {
    setTitle(v)
    persistTitle(v.length > 0 ? v : null)
  }
  const onEditorChange = (doc: EditorDocument): void => {
    persistContent(serializeContent(doc))
  }

  const toggleFavorite = (): void => {
    meta.mutate(
      { is_favorite: !isFavorite },
      {
        onSuccess: (row) => setIsFavorite(row.is_favorite),
        onError: () => toast({ title: "Couldn't update favorite", intent: 'danger' }),
      },
    )
  }
  const toggleArchive = (): void => {
    meta.mutate(
      { is_archived: !isArchived },
      {
        onSuccess: (row) => setIsArchived(row.is_archived),
        onError: () => toast({ title: "Couldn't update archive", intent: 'danger' }),
      },
    )
  }
  const onConfirmDelete = (): void => {
    del.mutate(undefined, {
      onSuccess: () => {
        setConfirmOpen(false)
        void navigate({ to: '/notes' })
      },
      onError: () => toast({ title: "Couldn't delete note", intent: 'danger' }),
    })
  }

  // State is conveyed by the LABEL — aria-pressed is invalid on a role=menuitem (BR-B2-9).
  const actions: MenuItem[] = [
    { id: 'favorite', label: isFavorite ? 'Remove from favorites' : 'Add to favorites', onSelect: toggleFavorite },
    { id: 'archive', label: isArchived ? 'Unarchive' : 'Archive', onSelect: toggleArchive },
    { id: 'delete', label: 'Delete', intent: 'danger', onSelect: () => setConfirmOpen(true) },
  ]

  // Responsive layout: side-by-side (main + 280px rail) on tablet+, stacked (rail below, full-width) on mobile —
  // a 280px rail can't share a 375px row (Visual-Gate catch). media drives both, matching the railOpen default.
  const stacked = !media.tablet

  return (
    <Root flexDirection={stacked ? 'column' : 'row'}>
      {/* Row: MainCol grows beside the 280px rail (flex:1). Column (mobile): flex:1 + RNW's minHeight:0 would collapse
          MainCol to height 0 (editor paints over the stacked rail — Visual-Gate catch) → content-height, full-width. */}
      <MainCol
        flexGrow={stacked ? 0 : 1}
        flexShrink={stacked ? 0 : 1}
        flexBasis={stacked ? 'auto' : 0}
        width={stacked ? '100%' : undefined}
      >
        <HeaderBar>
          <HeaderLeft>
            <Link to="/notes" aria-label="Back to notes">
              ← Back
            </Link>
            <TitleFieldWrap>
              <Input value={title} onChangeText={onTitleChange} placeholder="Untitled" aria-label="Note title" />
            </TitleFieldWrap>
            <TypeChip>{page.type}</TypeChip>
          </HeaderLeft>
          <HeaderActions>
            <Button
              intent="ghost"
              size="sm"
              onPress={() => setRailOpen((v) => !v)}
              aria-expanded={railOpen}
              aria-controls={railId}
            >
              {railOpen ? 'Hide panel' : 'Show panel'}
            </Button>
            <Menu
              trigger={
                <Button intent="ghost" size="sm" aria-label="Note actions">
                  ⋯
                </Button>
              }
              items={actions}
              aria-label="Note actions"
            />
          </HeaderActions>
        </HeaderBar>

        {corrupt ? (
          <Banner role="status">
            This note’s content couldn’t be read — showing it read-only so nothing is overwritten.
          </Banner>
        ) : null}

        <VidaEditor
          defaultValue={seeded.doc}
          editable={!corrupt}
          aria-label="Note body"
          placeholder="Type ‘/’ for a block…"
          onChange={onEditorChange}
        />
      </MainCol>

      {railOpen ? (
        <Rail id={railId} role="complementary" aria-label="Note details" width={stacked ? '100%' : 280}>
          <RailSectionLabel>Metadata</RailSectionLabel>
          <MetaRow>Created {formatTs(page.created_at)}</MetaRow>
          <MetaRow>Updated {formatTs(page.updated_at)}</MetaRow>
          <MetaRow>{page.word_count} words</MetaRow>
          <MetaRow>{isFavorite ? '★ Favorite' : 'Not favorited'}</MetaRow>
          <MetaRow>{isArchived ? 'Archived' : 'Active'}</MetaRow>
        </Rail>
      ) : null}

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        dismissible={false}
        title="Delete note?"
        description="This moves the note and its links to trash. You can restore it from trash later."
        footer={
          <>
            <Button intent="secondary" onPress={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button intent="danger" loading={del.isPending} onPress={onConfirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <Text fontFamily="$body" fontSize="$body" color="$colorTextPrimary">
          “{title.length > 0 ? title : 'Untitled'}” will be moved to trash.
        </Text>
      </Dialog>
    </Root>
  )
}

// ── the route surface (read-axis switch) ─────────────────────────────────────────────────────────────────
export function NoteDetail({ id }: { id: string }): ReactNode {
  const query = useNote(id)
  const state = deriveTerminalState(query, (p) => p === null)

  if (state === 'loading') {
    return (
      <CenterStack role="status" aria-busy="true">
        <StatusText>Loading note…</StatusText>
      </CenterStack>
    )
  }
  if (state === 'error') {
    return (
      <CenterStack role="status">
        <StatusText>Couldn’t load this note.</StatusText>
        <Button onPress={() => void query.refetch()}>Retry</Button>
      </CenterStack>
    )
  }
  if (state === 'empty' || !query.data) {
    return (
      <CenterStack role="status">
        <StatusText>This note doesn’t exist or was deleted.</StatusText>
        <Link to="/notes">Back to notes</Link>
      </CenterStack>
    )
  }
  return <NoteDetailLoaded page={query.data} id={id} />
}

export default NoteDetail
