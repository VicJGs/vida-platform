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
import { toast } from '@vida/ui'
import type { PageLinkRow, PageRow, UpdatePageInput } from '@vida/core'
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

/** B3 — create a `page_links` row from this note to `targetId` (the `[[` picker's onSelect). Idempotent revive-or-noop
 *  (A2/NP-5). The `onError` Toast makes the write FAIL-LOUD (BR-B3-5) — never swallowed. Invalidate the LIST so the
 *  Backlinks (B4) / graph (B5) reflect the new link; never `noteKey(id)` (BR-B2-4 no re-seed). */
export function useCreatePageLink(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (targetId: string): Promise<PageLinkRow> => getNotesService().createPageLink(id, targetId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTES_LIST_KEY }),
    onError: () => toast({ title: "Couldn't create link", intent: 'danger' }),
  })
}

/** B3 — create-on-miss: a stub `note` page titled `title` (the `[[` picker's onCreate, BR-B3-6). Same fail-loud +
 *  list-invalidate contract (the new note joins the collection). A SUCCESS toast confirms the note created off-screen
 *  (EC-10's informative toast, BR-B3-10) — the plain link (useCreatePageLink) stays silent-immediate (B2 convention). */
export function useCreateNoteFromLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (title: string): Promise<PageRow> => getNotesService().createPage({ type: 'note', title }),
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: NOTES_LIST_KEY })
      toast({ title: `Created “${row.title ?? 'Untitled'}”`, intent: 'success' })
    },
    onError: () => toast({ title: "Couldn't create note", intent: 'danger' }),
  })
}
