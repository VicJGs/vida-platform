// ============================================================================
// useNotesRows — the notes DATA seam (fe-notes-and-pages S1). ProviderRead precedent
// (home `useHomeWidgets`): M1 returns the DEFAULT set; the live swap is drop-in.
//
// M1 DEFAULT = empty (honest — there are no notes until the live data plane lands; a
// live `NotesService.listPages()` would throw today on the worker-RPC Drizzle `values`
// seam). Live swap (zero signature change):
//   const { data } = useQuery({ queryKey: ['notes','pages'], queryFn: () => notes.listPages() })
//   return (data ?? []).map(toNotesRow)
//
// A DEV-ONLY sample (NOT shipped live data) renders populated layouts for the blocking
// Visual Gate — gated behind `?sample` in DEV only, off in prod.
// ============================================================================
import type { PageType } from '@vida/types'
import { useQuery } from '@tanstack/react-query'
import { getServices } from '../db/composition-root'
import { toNotesRow } from './live-mappers'

/** The row projection the notes collection renderers consume (a `pages`-row view; live mapping at the data-plane slice). */
export interface NotesRow {
  id: string
  title: string
  type: PageType
  excerpt: string
  updated: string
  /** YYYY-MM-DD for the calendar layout (live: journal_date ?? updated_at). */
  date: string
  favorite: boolean
}

export type NotesDataState = 'loading' | 'empty' | 'error' | 'success'

const DEV_SAMPLE: readonly NotesRow[] = [
  { id: '1', title: 'Project kickoff', type: 'note', excerpt: 'Scope, owners, and the first three milestones.', updated: '2h ago', date: '2026-10-10', favorite: true },
  { id: '2', title: 'Daily journal', type: 'journal', excerpt: 'Morning intentions, evening reflection.', updated: 'today', date: '2026-10-10', favorite: false },
  { id: '3', title: 'Research reading list', type: 'note', excerpt: 'Papers on CRDTs and local-first sync.', updated: 'yesterday', date: '2026-10-09', favorite: false },
  { id: '4', title: 'Design review notes', type: 'milestone_note', excerpt: 'Feedback from the October design review.', updated: '3d ago', date: '2026-10-07', favorite: true },
  { id: '5', title: 'Sprint deliverable', type: 'deliverable_note', excerpt: 'Acceptance criteria and proof of done.', updated: '1w ago', date: '2026-10-03', favorite: false },
]

function devSampleActive(): boolean {
  // DEV/gate affordance only (the repo's `process.env.NODE_ENV` convention — typed; vite statically replaces it).
  return process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('sample')
}

export interface NotesRowsResult {
  rows: readonly NotesRow[]
  state: NotesDataState
}

/** Live: React Query over `NotesService.listPages()` (zero signature change) + the DEV/gate sample. */
export function useNotesRows(): NotesRowsResult {
  const sample = devSampleActive()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['notes', 'pages'],
    queryFn: async () => (await getServices()).notes.listPages(),
    enabled: !sample,
  })
  if (sample) return { rows: DEV_SAMPLE, state: 'success' }
  if (isError) return { rows: [], state: 'error' }
  if (isLoading) return { rows: [], state: 'loading' }
  const rows = (data ?? []).map(toNotesRow)
  return { rows, state: rows.length ? 'success' : 'empty' }
}
