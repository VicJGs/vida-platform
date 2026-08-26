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
import type { EntityLinkRow, PageLinkRow, PageRow, UpdatePageInput } from '@vida/core'
import { getNotesService } from '../notes/notes-service'

const NOTES_LIST_KEY = ['pages', 'list'] as const
const noteKey = (id: string) => ['pages', id] as const

// B4 — panel read keys, DISTINCT from noteKey(id) so panel refetches never re-seed the mounted editor (BR-B2-4/BR-B4-9).
const backlinksKey = (id: string) => ['links', 'back', id] as const
const linksOutKey = (id: string) => ['links', 'out', id] as const

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

// ── B4 · link panels + /entity-link block body ───────────────────────────────────────────────────────────────────────

/** B4 — the Backlinks panel read (BR-B4-2): `getBacklinks('page', id)` = AR-8 entity_links ⊕ A2 page_links, kept
 *  typed-DISTINCT (current-spec.md:35-36). A page hosts backlinks under `entity_type='page'` — the same key
 *  `/entity-link` writes to (so a link to this page appears here). */
export function useBacklinks(id: string) {
  return useQuery({
    queryKey: backlinksKey(id),
    queryFn: (): Promise<{ entityLinks: EntityLinkRow[]; pageLinks: PageLinkRow[] }> =>
      getNotesService().getBacklinks('page', id),
  })
}

/** B4 — the Links-out panel read (BR-B4-3): this page's OUTGOING links, both kinds kept distinct — `page_links` (the
 *  `[[` links B3 writes) ⊕ `entity_links` (the `/entity-link` refs). */
export function useLinksOut(id: string) {
  return useQuery({
    queryKey: linksOutKey(id),
    queryFn: async (): Promise<{ pageLinks: PageLinkRow[]; entityLinks: EntityLinkRow[] }> => {
      const svc = getNotesService()
      const [pageLinks, entityLinks] = await Promise.all([svc.getPageLinksFrom(id), svc.getEntityLinksFrom(id)])
      return { pageLinks, entityLinks }
    },
  })
}

/** B4 — resolve a link/backlink row's display TITLE by target id (NP-7 — never by text). Reuses the `noteKey` cache
 *  (React-Query dedups concurrent same-key reads); `getPage` returns null for an absent/deleted target. */
export function useNoteTitle(id: string) {
  return useQuery({
    queryKey: noteKey(id),
    queryFn: (): Promise<PageRow | null> => getNotesService().getPage(id),
  })
}

/** Invalidate BOTH panel keys + the collection after a link write/remove — so Backlinks/Links-out/graph reflect it live
 *  (EC-10). NEVER `noteKey(id)` (the B2 no-re-seed rule, BR-B2-4/BR-B4-9). */
function useInvalidateLinks(id: string): () => void {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: backlinksKey(id) })
    queryClient.invalidateQueries({ queryKey: linksOutKey(id) })
    queryClient.invalidateQueries({ queryKey: NOTES_LIST_KEY })
  }
}

/** B4 — the `/entity-link` write: a page → registered-entity `entity_links` row via AR-6 (registry-validated, IR-2).
 *  Row FIRST, fail-loud (BR-B4-6): the caller (`entity-link-body`) awaits this BEFORE committing the node; `onError`
 *  Toast makes the failure loud. `entity_type='page'` for a page target (matches the backlinks query key). */
export function useCreateEntityLink(id: string) {
  const invalidate = useInvalidateLinks(id)
  return useMutation({
    mutationFn: (target: { entityType: string; entityId: string }): Promise<EntityLinkRow> =>
      getNotesService().createEntityLink(id, target.entityType, target.entityId),
    onSuccess: invalidate,
    onError: () => toast({ title: "Couldn't create link", intent: 'danger' }),
  })
}

/** B4 — remove an OUTGOING entity_links row (soft-delete, NP-9). Links-out only (backlinks are read-only, BR-B4-7). */
export function useRemoveEntityLink(id: string) {
  const invalidate = useInvalidateLinks(id)
  return useMutation({
    mutationFn: (target: { entityType: string; entityId: string }): Promise<void> =>
      getNotesService().removeEntityLink(id, target.entityType, target.entityId),
    onSuccess: invalidate,
    onError: () => toast({ title: "Couldn't remove link", intent: 'danger' }),
  })
}

/** B4 — remove an OUTGOING page_links row (soft-delete, NP-9). Links-out only (BR-B4-7). */
export function useRemovePageLink(id: string) {
  const invalidate = useInvalidateLinks(id)
  return useMutation({
    mutationFn: (targetId: string): Promise<void> => getNotesService().removePageLink(id, targetId),
    onSuccess: invalidate,
    onError: () => toast({ title: "Couldn't remove link", intent: 'danger' }),
  })
}
