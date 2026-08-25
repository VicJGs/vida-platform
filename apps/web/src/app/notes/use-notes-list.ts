// ============================================================================
// Notes list hooks — MOD-notes ② · B1 (LIF-131). The React-Query seam over the
// NotesService (BR-B1-5). Follows the reference hook `hooks/useSchemaVersion.ts`
// ("the per-module entity hooks follow this shape"): a `useQuery` whose queryFn
// calls a @vida/core read; keyed per structure-data.md:35 (`(type|id|entity|
// journal_date)`), invalidated on local writes (no optimistic — BR-RT-4).
//
// B1 binds `listPages({})` ONLY (one unfiltered live-notes collection); the
// favorite/archived/tag filter UI is B6. New Note = a minimal `createPage`
// (tags on create = B6; navigation to the real detail = B2).
// ============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PageRow } from '@vida/core'
import { getNotesService } from './notes-service'

const NOTES_LIST_KEY = ['pages', 'list'] as const

/** The Notes collection — all live (non-deleted) pages, unfiltered (B1). */
export function useNotesList() {
  return useQuery({
    queryKey: NOTES_LIST_KEY,
    queryFn: async (): Promise<PageRow[]> => {
      const rows = await getNotesService().listPages({})
      // Baseline recency order (newest first) — a deterministic default so the collection isn't in arbitrary
      // SQLite rowid order (created_at is Unix ms). This is NOT the configurable sort/grouping system (envision
      // pt 6 → MOD-spaces) nor persisted manual order (→ DB-11); just B1's default display order.
      return [...rows].sort((a, b) => b.created_at - a.created_at)
    },
  })
}

/** Create a minimal note (type='note') then invalidate-and-reread the list (BR-RT-4, no optimistic). */
export function useCreateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (): Promise<PageRow> => getNotesService().createPage({ type: 'note' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTES_LIST_KEY }),
  })
}
