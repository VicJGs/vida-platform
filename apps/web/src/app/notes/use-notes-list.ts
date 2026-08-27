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

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { toast } from '@vida/ui'
import type { PageRow, PageLinkRow } from '@vida/core'
import type { GraphEdge } from '@vida/ui'
import type { NotesFilter } from '../../stores/notes-view-store'
import { getNotesService } from './notes-service'

const NOTES_LIST_KEY = ['pages', 'list'] as const

// B5 — the Neural-graph edges key lives under the ['links'] namespace (use-note.ts) so a link write's ['links']
// invalidation reaches it; keyed on the node-id SET signature so a changed collection re-reads (BR-B5-3). The
// signature is order-invariant (sorted) — edge topology is set-based, so re-ordering the collection (a future B6
// sort) must NOT re-key + refetch the identical graph.
const GRAPH_EDGES_KEY = (nodeIds: readonly string[]) =>
  ['links', 'graph', [...nodeIds].sort().join('|')] as const

/** The Notes collection — live (non-deleted) pages, filtered by the ① `listPages` params (B6). The `filter` is
 *  part of the query key so a change refetches; `NOTES_LIST_KEY` stays the invalidation PREFIX (covers every filtered
 *  key). Default `{}` = B1's unfiltered set (BR-B6-2). */
export function useNotesList(filter: NotesFilter = {}) {
  return useQuery({
    queryKey: [...NOTES_LIST_KEY, filter] as const,
    queryFn: async (): Promise<PageRow[]> => {
      const rows = await getNotesService().listPages(filter)
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

/** B6 · create-with-tags (EC-8): createPage(title) THEN tagEntity per chosen tag. Create precedes tagging (BR-B6-4)
 *  — a per-tag failure toasts but the (created) note survives + the mutation still resolves with it, so the caller
 *  navigates to a real note. Invalidates the list + the ['tags'] namespace (an active tag filter re-reads). */
export function useCreateNoteWithTags() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { title?: string | null; tagIds?: string[] }): Promise<PageRow> => {
      const svc = getNotesService()
      const page = await svc.createPage({ type: 'note', title: input.title ?? undefined })
      for (const tagId of input.tagIds ?? []) {
        try {
          await svc.tagEntity(tagId, 'page', page.id)
        } catch {
          toast({ title: "Couldn't add tag", intent: 'danger' })
        }
      }
      return page
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_LIST_KEY })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
    onError: () => toast({ title: "Couldn't create note", intent: 'danger' }),
  })
}

// ── B5 · Neural note-graph edges ─────────────────────────────────────────────
// The Neural view (B1 shipped it nodes-only, `edges={[]}`) gets its page-link edges here. Edges = `page_links`
// ONLY (node↔note; `entity_links` are the B4 panels, not graph edges — envision.md:25, seam-contract.md:41). The
// renderer (@vida/ui NeuralGraph) is presentational and consumes a `GraphEdge[]` prop; it already skips dangling
// edges + dedups by pair — B5 pre-filters anyway (BR-B5-2) to keep that dev-warn silent and the graph honest.

/** Pure map: live `page_links` rows → `GraphEdge[]`, dropping any edge whose source OR target is not a live node
 *  (BR-B5-1/2). Directed `source_page_id → source`; the renderer collapses reciprocal pairs to one visual edge. */
export function toGraphEdges(rows: readonly PageLinkRow[], nodeIds: ReadonlySet<string>): GraphEdge[] {
  return rows
    .filter((r) => nodeIds.has(r.source_page_id) && nodeIds.has(r.target_page_id))
    .map((r) => ({ source: r.source_page_id, target: r.target_page_id }))
}

/** Page-link edges for the Neural view — an N-WIDE fan-out read (one `getPageLinksFrom` per node; the same
 *  `Promise.all` SHAPE as B4's `useLinksOut`, but that reads a single note's 2 links whereas this reads all N
 *  nodes'). Lazily enabled (only when the Neural view is active, so List/Gallery/Calendar never pay the N reads —
 *  BR-B5-3; batching/pagination is a later optimization, spec §Risks); keyed on the node-id set under the ['links']
 *  namespace so a link write's invalidation refreshes it live (BR-B5-5, EC-10). */
export function useNotesGraphEdges(
  nodeIds: readonly string[],
  enabled: boolean,
): UseQueryResult<GraphEdge[]> {
  return useQuery({
    queryKey: GRAPH_EDGES_KEY(nodeIds),
    queryFn: async (): Promise<GraphEdge[]> => {
      const svc = getNotesService()
      const rows = (await Promise.all(nodeIds.map((id) => svc.getPageLinksFrom(id)))).flat()
      return toGraphEdges(rows, new Set(nodeIds))
    },
    enabled: enabled && nodeIds.length > 0,
  })
}
