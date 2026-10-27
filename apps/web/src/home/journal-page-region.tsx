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
// barrier — notes-rescope R0). The save chip ("Saved on this device", notes-rescope R1 EC-34) sits above the
// body, top-right. An unreadable body shows the EC-33 read-only notice
// instead of the editor (never overwritten). Inline integration-block node-views are
// R8's (notes-rescope); multi-device CRDT merge of `pages.content` stays M4.
//
// The shell owns the page terminal states; the editor body renders only for 'success'.
//
// Contract: JournalPageRegion({ editorState?, aria-* })
//   • editorState? — an OVERRIDE for tests/the Visual Gate; default derives from the live read.
//   • EC-8 — DIRECT semantic tokens, serif prose, AA both modes
// ============================================================================
import { useRef } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { EmptyState, type ViewState } from '@vida/ui'
import { NoteEditorBody } from '../notes/note-editor-body'
import { PageSaveStatus } from '../notes/page-actions'
import { ReadErrorMessage } from '../notes/read-error-message'
import { useFocusOnRecovery } from '../notes/use-focus-on-recovery'
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
const SkeletonRow = styled(View, {
  height: 14,
  borderRadius: '$sm',
  backgroundColor: '$colorSurfaceSecondary',
  marginBottom: 8,
})

export function JournalPageRegion({ editorState, 'aria-label': ariaLabel = 'Journal entry' }: JournalPageRegionProps) {
  const { page, state, retry, retrying } = useJournalEntry()
  // `editorState` is a test/Visual-Gate override; default to the live read. `ensureJournal` never yields 'empty',
  // but the override (ViewState) can — keep the arm so it never renders a silent blank.
  const effective: ViewState = editorState ?? state
  // R3 G14: after a recovered read, focus the journal frame (the Retry button is gone).
  const frameRef = useRef<HTMLElement>(null)
  useFocusOnRecovery(effective, frameRef)
  return (
    <PageFrame ref={frameRef as never} role="region" aria-label={ariaLabel} tabIndex={-1}>
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
        <ReadErrorMessage message="Couldn’t load today’s page." retry={retry} retrying={retrying} />
      )}
      {effective === 'success' && page && (
        <>
          {/* The page's ONE save announcement (EC-34 / BR-R1-5), where the body's old label row sat — the chip
              self-aligns flex-start, so it is told to sit right (IMPLEMENTATION-PLAN-R1 R-3). */}
          <PageSaveStatus pageId={page.id} locked={page.contentStatus === 'malformed'} alignSelf="flex-end" />
          <NoteEditorBody page={page} />
        </>
      )}
    </PageFrame>
  )
}

export default JournalPageRegion
