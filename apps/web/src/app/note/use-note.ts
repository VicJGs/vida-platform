// ============================================================================
// Note detail hooks — MOD-notes ② · B2 (LIF-131). The React-Query seam over the
// NotesService for a SINGLE page (BR-B2-2/4). Mirrors B1's use-notes-list.ts
// (useQuery whose queryFn calls a @vida/core read over getNotesService()).
//
// ⚠ Invalidation model (BR-B2-4): updates invalidate ['pages','list'] ONLY — never
// ['pages', id]. The note-detail seeds the editor ONCE at mount and never re-seeds
// from a refetch, so re-fetching the mounted note would churn the parse/derivation
// against in-flight edits. The list key matches B1's NOTES_LIST_KEY exactly so the
// collection reflects title/favorite/archive/delete changes.
// ============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PageRow, UpdatePageInput } from '@vida/core'
import { getNotesService } from '../notes/notes-service'

const NOTES_LIST_KEY = ['pages', 'list'] as const
const noteKey = (id: string) => ['pages', id] as const

/** One page by id — the once-seed source for the detail (getPage returns null for absent/deleted). */
export function useNote(id: string) {
  return useQuery({
    queryKey: noteKey(id),
    queryFn: (): Promise<PageRow | null> => getNotesService().getPage(id),
  })
}

/** Patch a page (title/content/is_favorite/is_archived). Invalidate the LIST only (BR-B2-4). */
export function useUpdateNote(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: UpdatePageInput): Promise<PageRow> => getNotesService().updatePage(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTES_LIST_KEY }),
  })
}

/** Soft-delete a page (fires the A8 service-driven cascade). Invalidate the list; the route navigates away. */
export function useDeleteNote(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (): Promise<void> => getNotesService().softDeletePage(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTES_LIST_KEY }),
  })
}
