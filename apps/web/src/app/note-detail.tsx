// Note detail — MOD-notes ②c (LIF-131). The per-page authoring surface (`note/$id`): the editable title + the mounted
// @vida/editor VidaEditor (autosaving to pages.content) + the `[[` wiki-link picker. Replaces ②b's placeholder body.
// Token-only → dark-capable. Spec: docs/specs/features/mod-notes/sessions/…-02c.
import { useId, useMemo, useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { styled, Text, View } from '@tamagui/core'
import { Button, Dialog, toast } from '@vida/ui'
import {
  VidaEditor,
  assertEditorDocument,
  type EditorDocument,
  type WikiLinkConfig,
} from '@vida/editor'
import type { PageRow } from '@vida/core'
import { usePage, useUpdatePage, useSoftDeletePage } from './notes/hooks'
import { notesKeys } from './notes/keys'
import { useNoteAutosave, type SaveStatus } from './notes/use-note-autosave'
import { getNotesService } from '../services/notes-service'
import { queryClient } from '../lib/query-client'

const Centered = styled(View, { padding: '$24', gap: '$8' })
const Muted = styled(Text, { fontFamily: '$body', fontSize: '$small', color: '$colorTextMuted' })

// The notebook page (MOD-notes ② / F5): a centered reading column, no surrounding box — the note flows on the page
// surface like a Notion page. The title + editor stack seamlessly inside it.
const Page = styled(View, {
  width: '100%',
  maxWidth: 720,
  alignSelf: 'center',
  paddingHorizontal: '$24',
  paddingVertical: '$32',
  gap: '$8',
})

// The note title — a large, BORDERLESS heading input (no box; the Notion title feel). `render:'input'` emits a real
// <input> that forwards native attrs (defaultValue/placeholder/onBlur/…). Heading tokens mirror the /notes <h1>.
// NB: `styled(View)` drops font-size/family/line-height (they're text props, not View props — verified: no
// `_fontSize` atomic class emitted), so those go via inline `style` on the element (guaranteed on the DOM <input>).
// fonts.ts: heading = 24px / ratio 1.3 (≈31px line), display family = Space Grotesk.
const TitleFieldBase = styled(View, {
  render: 'input',
  fontWeight: '600',
  color: '$colorTextPrimary',
  backgroundColor: 'transparent',
  borderWidth: 0,
  paddingHorizontal: 0,
  paddingVertical: '$8',
  outlineWidth: 0,
})
const TitleField = TitleFieldBase as unknown as React.FC<React.InputHTMLAttributes<HTMLInputElement>>
const TITLE_FONT: React.CSSProperties = {
  fontSize: 24,
  lineHeight: '31px',
  fontFamily: "'Space Grotesk', system-ui, sans-serif",
}

const EMPTY_DOC: EditorDocument = { type: 'doc', content: [] }

/** Parse `pages.content` (TipTap-JSON TEXT) → an EditorDocument; null/blank/corrupt → the empty doc (EM-4, never throws). */
function safeParse(raw: string | null | undefined): EditorDocument {
  if (!raw) return EMPTY_DOC
  try {
    return assertEditorDocument(JSON.parse(raw))
  } catch {
    return EMPTY_DOC
  }
}

const SAVE_LABEL: Record<SaveStatus, string> = {
  saved: 'Saved',
  saving: 'Saving…',
  error: 'Save failed',
}

export default function NoteDetailRoute() {
  const { id } = useParams({ from: '/note/$id' })
  const { data: page, state } = usePage(id)

  if (state === 'loading')
    return (
      <Centered>
        <Muted>Loading…</Muted>
      </Centered>
    )
  // EM-9: a missing id resolves to `empty` (getPage→null → deriveTerminalState), NOT error.
  if (state === 'empty')
    return (
      <Centered>
        <Muted>Note not found.</Muted>
      </Centered>
    )
  if (state === 'error')
    return (
      <Centered>
        <Muted>Couldn’t load this note.</Muted>
      </Centered>
    )

  // success — remount the whole surface per page id (EM-2: the route reuses one instance, so the key lives HERE).
  return <NoteEditorSurface key={id} id={id} page={page as PageRow} />
}

function NoteEditorSurface({ id, page }: { id: string; page: PageRow }): React.ReactElement {
  const titleId = useId()
  const updatePage = useUpdatePage()
  const autosave = useNoteAutosave(id)
  const navigate = useNavigate()
  const softDelete = useSoftDeletePage()
  const [confirmOpen, setConfirmOpen] = useState(false)
  // F1 — delete a note: confirm → soft-delete (NP-9) → back to /notes.
  const handleDelete = () =>
    softDelete.mutate(id, {
      onSuccess: () => {
        setConfirmOpen(false)
        navigate({ to: '/notes' })
      },
      onError: () => toast({ title: 'Could not delete note', intent: 'danger' }),
    })
  // Seed ONCE per mount keyed on the page id (the key={id} remount gives a fresh seed on a page change; we must NOT
  // re-seed on a content refetch — that would reset the editor). `page` is captured fresh at each remount.
  const seed = page.content
  const parsed = useMemo(() => safeParse(seed), [id, seed])

  // The app-side `[[` compose (WL-2b/WL-3/WL-4). Runs OUTSIDE React (inside the editor's Suggestion command) → the
  // service singleton + queryClient directly (the ②b command precedent), not hooks.
  const wikiLink = useMemo<WikiLinkConfig>(
    () => ({
      query: (text) =>
        getNotesService()
          .resolveWikiLink(text)
          .then((rows) => rows.map((r) => ({ id: r.id, title: r.title ?? 'Untitled' }))),
      onCreate: (text) =>
        getNotesService()
          .createPage({ type: 'note', title: text })
          .then((p) => {
            // a new note page now exists → it must appear in /notes (#10)
            void queryClient.invalidateQueries({ queryKey: notesKeys.lists() })
            void queryClient.invalidateQueries({ queryKey: notesKeys.type('note') })
            return { id: p.id, title: p.title ?? text }
          })
          .catch((err: unknown) => {
            // WL-2b — surface the failure (the editor's fire-and-forget command can't); re-throw so NO mark is applied.
            toast({ title: 'Could not create note', intent: 'danger' })
            throw err
          }),
      onSelect: (candidate) =>
        getNotesService()
          .createPageLink(id, candidate.id)
          .then(() => {
            void queryClient.invalidateQueries({ queryKey: notesKeys.backlinks() })
            void queryClient.invalidateQueries({ queryKey: notesKeys.pageLinks() })
          })
          .catch((err: unknown) => {
            toast({ title: 'Could not link page', intent: 'danger' })
            throw err // no mark applied — the row didn't persist (WL-2b)
          }),
    }),
    [id],
  )

  // The title lives in the editor's `header` slot (F7) → the sticky toolbar sits ABOVE the title, so the whole note
  // (toolbar → title → body) reads like a normal text editor. The title is still the app's field (persists on blur).
  const title = (
    <TitleField
      id={titleId}
      defaultValue={page.title ?? ''}
      placeholder="Untitled"
      aria-label="Page title"
      style={TITLE_FONT}
      onBlur={(e) => updatePage.mutate({ id, patch: { title: e.currentTarget.value } })}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur() // Enter commits via the blur handler (EM-6)
        }
      }}
    />
  )

  return (
    <Page>
      <VidaEditor
        defaultValue={parsed}
        onChange={autosave.onChange}
        aria-labelledby={titleId}
        wikiLink={wikiLink}
        header={title}
      />
      <View flexDirection="row" justifyContent="space-between" alignItems="center">
        <Muted role="status" aria-live="polite">
          {SAVE_LABEL[autosave.status]}
        </Muted>
        <Button size="sm" intent="ghost" onPress={() => setConfirmOpen(true)}>
          Delete
        </Button>
      </View>
      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this note?"
        footer={
          <>
            <Button intent="ghost" onPress={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button intent="danger" onPress={handleDelete} loading={softDelete.isPending}>
              Delete
            </Button>
          </>
        }
      >
        <Muted>This note will be removed from your notes.</Muted>
      </Dialog>
    </Page>
  )
}
