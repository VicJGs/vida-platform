// ============================================================================
// JournalPageRegion — fe-home S2 + home-journal-go-live S1. Entity Delivery ②.
//
// The Home journal-page entity: a block EDITOR page where the user writes their day.
// DISTINCT from the Dashboard's standalone widgets (EC-1).
//
// GO-LIVE (home-journal-go-live S1): the region is now LIVE. It reads today's journal
// page via `useJournalEntry` (NotesService.ensureJournal — NP-8 get-or-create) and, on
// success, mounts the live `<VidaEditor chrome='bare'>` via the reused `NoteEditorBody`
// (persistence through `useNoteContent` → `writePageContent`, debounced, mount-echo
// deduped, flushed on hide, written through the cached bodies + the read-after-write
// barrier — notes-rescope R0). An unreadable body shows the EC-33 read-only notice
// instead of the editor (never overwritten). Inline integration-block node-views are
// R8's (notes-rescope); multi-device CRDT merge of `pages.content` stays M4.
//
// The shell owns the page terminal states; the editor body renders only for 'success'.
//
// Contract: JournalPageRegion({ editorState?, aria-* })
//   • editorState? — an OVERRIDE for tests/the Visual Gate; default derives from the live read.
//   • EC-8 — DIRECT semantic tokens, serif prose, AA both modes
// ============================================================================
import { styled, Text, View } from '@tamagui/core'
import { EmptyState, type ViewState } from '@vida/ui'
import { NoteEditorBody } from '../notes/note-editor-body'
import { useJournalEntry } from './use-journal-entry'

export interface JournalPageRegionProps {
  /** Override the page's terminal state (tests/Visual Gate). Default = the live `useJournalEntry` read. */
  editorState?: ViewState
  'aria-label'?: string
}

// The editor page frame — base semantic tokens, no sub-theme (the VidaEditor frame precedent, editor.tsx:76).
const PageFrame = styled(View, {
  backgroundColor: '$colorSurfacePrimary',
  borderColor: '$colorBorderDefault',
  borderWidth: 1,
  borderRadius: '$lg',
  padding: '$24',
  gap: '$16',
})
const SkeletonRow = styled(View, { height: 14, borderRadius: '$sm', backgroundColor: '$colorSurfaceSecondary', marginBottom: 8 })

export function JournalPageRegion({ editorState, 'aria-label': ariaLabel = 'Journal entry' }: JournalPageRegionProps) {
  const { page, state } = useJournalEntry()
  // `editorState` is a test/Visual-Gate override; default to the live read. `ensureJournal` never yields 'empty',
  // but the override (ViewState) can — keep the arm so it never renders a silent blank.
  const effective: ViewState = editorState ?? state
  return (
    <PageFrame role="region" aria-label={ariaLabel}>
      {effective === 'loading' && (
        <View aria-busy="true">
          <SkeletonRow width="80%" />
          <SkeletonRow width="95%" />
          <SkeletonRow width="60%" />
        </View>
      )}
      {effective === 'empty' && (
        <EmptyState title="Start today’s entry">
          <Text fontSize="$body" color="$colorTextMuted">
            Write your day, or type / to pull in a block from any module.
          </Text>
        </EmptyState>
      )}
      {effective === 'error' && (
        <View role="status">
          <Text fontSize="$small" color="$colorTextMuted">
            Couldn’t load today’s page.
          </Text>
        </View>
      )}
      {effective === 'success' && page && <NoteEditorBody page={page} />}
    </PageFrame>
  )
}

export default JournalPageRegion
