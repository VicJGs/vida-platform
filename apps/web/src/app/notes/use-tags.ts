// ============================================================================
// Tag hooks — MOD-notes ② · B6 (LIF-131). The React-Query seam over the Notes
// tag surface (listTags/createTag/tagEntity/untagEntity/getTagsForEntity), shared
// by THREE surfaces (rule-of-three, R2): the collection filter bar, the create-
// with-tags Dialog, and the note-detail rail chips.
//
// Reads: ['tags','list'] (all tag definitions) · ['tags','entity', id] (a note's
// applied tags). Writes mirror B4's fail-loud hooks (use-note.ts): row-first,
// onError Toast (never swallowed), onSuccess invalidate the ['tags'] namespace +
// NOTES_LIST_KEY (so an active tag filter re-reads) — NEVER noteKey(id) (the B2
// no-re-seed rule). ['tags'] is a PREFIX → covers both list + entity keys.
//
// The rich nestable/color/icon tags-BROWSER is MOD-spaces ② (delivery-plan:232);
// these hooks expose only what B6's minimal picker + filter need.
// ============================================================================

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { toast } from '@vida/ui'
import type { EntityTagRow, TagRow } from '@vida/core'
import { getNotesService } from './notes-service'

const NOTES_LIST_KEY = ['pages', 'list'] as const
const TAGS_LIST_KEY = ['tags', 'list'] as const
const noteTagsKey = (id: string) => ['tags', 'entity', id] as const

/** All live tag definitions (name/color/icon) — the filter + create picker's source (listTags, B6). */
export function useTags(): UseQueryResult<TagRow[]> {
  return useQuery({
    queryKey: TAGS_LIST_KEY,
    queryFn: (): Promise<TagRow[]> => getNotesService().listTags(),
  })
}

/** A note's applied tags (the entity_tags junction rows → tag_ids; resolve names via useTags). */
export function useNoteTags(id: string): UseQueryResult<EntityTagRow[]> {
  return useQuery({
    queryKey: noteTagsKey(id),
    queryFn: (): Promise<EntityTagRow[]> => getNotesService().getTagsForEntity('page', id),
  })
}

/** Invalidate the ['tags'] namespace (list + every note's chips) + the collection (an active tag filter re-reads). */
function useInvalidateTags(): () => void {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['tags'] })
    queryClient.invalidateQueries({ queryKey: NOTES_LIST_KEY })
  }
}

/** Apply an existing tag to this note (tagEntity 'page'). Row-first, fail-loud (onError Toast). */
export function useTagNote(id: string) {
  const invalidate = useInvalidateTags()
  return useMutation({
    mutationFn: (tagId: string): Promise<EntityTagRow> => getNotesService().tagEntity(tagId, 'page', id),
    onSuccess: invalidate,
    onError: () => toast({ title: "Couldn't add tag", intent: 'danger' }),
  })
}

/** Remove a tag from this note (untagEntity, soft-delete NP-9). */
export function useUntagNote(id: string) {
  const invalidate = useInvalidateTags()
  return useMutation({
    mutationFn: (tagId: string): Promise<void> => getNotesService().untagEntity(tagId, 'page', id),
    onSuccess: invalidate,
    onError: () => toast({ title: "Couldn't remove tag", intent: 'danger' }),
  })
}

/** Create a new tag definition (createTag → AR-6, trims + rejects blank in ①). Invalidate the tag list. */
export function useCreateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string): Promise<TagRow> => getNotesService().createTag(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TAGS_LIST_KEY }),
    onError: () => toast({ title: "Couldn't create tag", intent: 'danger' }),
  })
}
