// ============================================================================
// Notes data hooks — MOD-notes ②a (LIF-131). React-Query over the ① NotesService,
// on the AR-4 `useSchemaVersion` shape: queryFn → a @vida/core read → the local
// SQLite worker, NO HTTP (BR-RT-3). React Query is the sole read cache (DP-6).
//
// Read hooks attach `state = deriveTerminalState(query, isEmpty)` (the UX-4 canon)
// so a view's `state` prop is read directly, never re-derived (DP-7). Mutations
// invalidate-and-reread (no optimistic — BR-RT-4) per the DP-6 invalidation matrix.
// No business logic here — ① owns every rule.
// ============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PageType } from '@vida/types'
import type { CreatePageInput, UpdatePageInput } from '@vida/core'
import { getNotesService } from '../../services/notes-service'
import { deriveTerminalState } from '../../state-conventions/terminal-state'
import { notesKeys, type PageListFilter } from './keys'

// The key factory lives in the dependency-free `./keys` module so the eager
// command bar can invalidate the same keys without pulling this heavy graph.
export { notesKeys, type PageListFilter } from './keys'

// ---- reads ----------------------------------------------------------------

/** All pages (optionally filtered by favorite/archived) + a terminal `state`. */
export function usePages(filter?: PageListFilter) {
  const query = useQuery({
    queryKey: notesKeys.list(filter),
    queryFn: () => getNotesService().listPages(filter),
  })
  return { ...query, state: deriveTerminalState(query, (d) => d.length === 0) }
}

/** A single page by id (null on miss) + a terminal `state`. */
export function usePage(id: string) {
  const query = useQuery({
    queryKey: notesKeys.page(id),
    queryFn: () => getNotesService().getPage(id),
  })
  return { ...query, state: deriveTerminalState(query, (d) => d == null) }
}

/** Pages of one type (note/journal/…): the collection-view read + `state`. */
export function usePagesByType(type: PageType) {
  const query = useQuery({
    queryKey: notesKeys.type(type),
    queryFn: () => getNotesService().getPagesByType(type),
  })
  return { ...query, state: deriveTerminalState(query, (d) => d.length === 0) }
}

/** Entity-links pointing at an entity (the backlink panel read) + `state`. */
export function useBacklinks(entityType: string, entityId: string) {
  const query = useQuery({
    queryKey: notesKeys.backlink(entityType, entityId),
    queryFn: () => getNotesService().getBacklinks(entityType, entityId),
  })
  return { ...query, state: deriveTerminalState(query, (d) => d.length === 0) }
}

// ---- mutations (DP-6 invalidation matrix; no optimistic — BR-RT-4) ---------

/** Create a page → invalidate the lists + the type collection. */
export function useCreatePage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePageInput) => getNotesService().createPage(input),
    onSuccess: (page) => {
      void qc.invalidateQueries({ queryKey: notesKeys.lists() })
      void qc.invalidateQueries({ queryKey: notesKeys.type(page.type) })
    },
  })
}

/** Update a page → invalidate its page key AND the lists/type (title/updated_at surface there — ②c autosave). */
export function useUpdatePage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdatePageInput }) =>
      getNotesService().updatePage(id, patch),
    onSuccess: (page) => {
      // `type` is immutable via updatePage (① validator omits it), so only the
      // page's own type collection is affected — narrower than the delete path.
      void qc.invalidateQueries({ queryKey: notesKeys.page(page.id) })
      void qc.invalidateQueries({ queryKey: notesKeys.lists() })
      void qc.invalidateQueries({ queryKey: notesKeys.type(page.type) })
    },
  })
}

/** Soft-delete a page → invalidate its page key + the lists/all-types (id-only, type unknown). */
export function useSoftDeletePage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => getNotesService().softDeletePage(id),
    onSuccess: (_void, id) => {
      void qc.invalidateQueries({ queryKey: notesKeys.page(id) })
      void qc.invalidateQueries({ queryKey: notesKeys.lists() })
      void qc.invalidateQueries({ queryKey: notesKeys.types() })
    },
  })
}

/**
 * Create a page↔page link → invalidate the backlinks + pagelinks PREFIXES. A link
 * touches both endpoints; the hook can't enumerate every affected entity key, so
 * coarse-but-correct prefix invalidation (refine post-M1.0 if measured hot).
 */
export function useCreatePageLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { sourcePageId: string; targetPageId: string; context?: string | null }) =>
      getNotesService().createPageLink(input.sourcePageId, input.targetPageId, input.context),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notesKeys.backlinks() })
      void qc.invalidateQueries({ queryKey: notesKeys.pageLinks() })
    },
  })
}

/** Remove a page↔page link → invalidate the backlinks + pagelinks prefixes. */
export function useRemovePageLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { sourcePageId: string; targetPageId: string }) =>
      getNotesService().removePageLink(input.sourcePageId, input.targetPageId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notesKeys.backlinks() })
      void qc.invalidateQueries({ queryKey: notesKeys.pageLinks() })
    },
  })
}
