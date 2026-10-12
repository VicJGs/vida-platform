// ============================================================================
// useBacklinks — the "what links here" DATA seam (fe-notes-and-pages #27, S3).
// Same stub discipline as useNoteEntity (S2): M1 DEFAULT = empty (no live apps/web
// NotesService composition root — getBacklinks' source resolution would need
// getPage/listPages, which throw on the worker-RPC `values` seam; D-S3-1 / S1-D2).
//
// Live swap (zero signature change):
//   const { data } = useQuery({
//     queryKey: ['links', 'backlinks', entityType, entityId],   // prefix-safe under ['links'] (D-S3-5)
//     queryFn: () => notes.getBacklinks(entityType, entityId),
//   })
//   if (isError) return { groups: [], count: 0, state: 'error' }
//   if (!data)  return { groups: [], count: 0, state: 'loading' }
//   const items = mergeBacklinks(data, liveResolve)   // liveResolve = batched listPages → id→{type,title}
//   const groups = groupBySourceModule(items)
//   return groups.length ? { groups, count, state: 'populated' } : { groups: [], count: 0, state: 'empty' }
//
// A DEV-ONLY sample (NOT shipped live data) renders a populated panel for the
// blocking Visual Gate — gated behind `?sample` in DEV only, off in prod.
// ============================================================================
import {
  groupBySourceModule,
  mergeBacklinks,
  type BacklinkGroup,
  type BacklinkSource,
  type EntityLinkLike,
  type PageLinkLike,
  type ResolveSource,
} from './backlinks'

export type BacklinkState = 'loading' | 'error' | 'empty' | 'populated'
export interface BacklinksResult {
  groups: BacklinkGroup[]
  count: number
  state: BacklinkState
}

// --- DEV/gate sample (NOT live data) ----------------------------------------
const SAMPLE_SOURCES: Record<string, BacklinkSource> = {
  's-note-a': { id: 's-note-a', type: 'note', title: 'Research log' },
  's-milestone-a': { id: 's-milestone-a', type: 'milestone_note', title: 'Launch milestone' },
}
const sampleResolve: ResolveSource = (id) => SAMPLE_SOURCES[id] ?? null

function sampleRaw(entityId: string): { pageLinks: PageLinkLike[]; entityLinks: EntityLinkLike[] } {
  if (entityId === '3') return { pageLinks: [], entityLinks: [] } // the empty-panel gate case (/notes/3?sample)
  return {
    // a note source that links twice (→ count 2) + a milestone source → two modules (Notes · Projects).
    pageLinks: [
      { source_page_id: 's-note-a', context: 'linked from the kickoff notes', created_at: 1_700_000_300_000 },
      { source_page_id: 's-note-a', context: null, created_at: 1_700_000_500_000 },
    ],
    entityLinks: [{ page_id: 's-milestone-a', context: 'tracked under this milestone', created_at: 1_700_000_400_000 }],
  }
}

function devSampleActive(): boolean {
  // DEV/gate affordance only (the useNoteEntity convention — vite statically replaces process.env.NODE_ENV).
  return (
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('sample')
  )
}

/** M1 default (empty) + the DEV/gate sample. `_entityType` is unused in the stub; the live swap reads it for
 *  `getBacklinks(_entityType, entityId)` + the `['links','backlinks',_entityType,entityId]` key (call site unchanged). */
export function useBacklinks(_entityType: string, entityId: string): BacklinksResult {
  if (devSampleActive()) {
    const items = mergeBacklinks(sampleRaw(entityId), sampleResolve)
    const groups = groupBySourceModule(items)
    const count = items.reduce((n, it) => n + it.count, 0)
    return groups.length > 0 ? { groups, count, state: 'populated' } : { groups: [], count: 0, state: 'empty' }
  }
  return { groups: [], count: 0, state: 'empty' }
}
