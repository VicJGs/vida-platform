// Notes query-key factory — MOD-notes ②b (LIF-131). Standalone + dependency-free
// so BOTH the React hooks AND the out-of-React command run can import it WITHOUT
// pulling the heavy notes-service / @vida/core graph onto their import path
// (the command bar is eager shell — it must stay light; the service is dynamic-
// imported at run time). Resource-first (['notes', …]); one place so mutation
// invalidation and read subscription can never drift apart.
export interface PageListFilter {
  favorite?: boolean
  archived?: boolean
}

export const notesKeys = {
  all: ['notes'] as const,
  lists: () => [...notesKeys.all, 'list'] as const,
  list: (filter?: PageListFilter) => [...notesKeys.all, 'list', filter ?? null] as const,
  types: () => [...notesKeys.all, 'type'] as const,
  // Param is `string` (a query key is structural) so a PageRow.type needs no cast.
  type: (type: string) => [...notesKeys.all, 'type', type] as const,
  page: (id: string) => [...notesKeys.all, 'page', id] as const,
  backlinks: () => [...notesKeys.all, 'backlinks'] as const,
  backlink: (entityType: string, entityId: string) =>
    [...notesKeys.all, 'backlinks', entityType, entityId] as const,
  pageLinks: () => [...notesKeys.all, 'pagelinks'] as const,
}
