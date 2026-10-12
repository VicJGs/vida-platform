// ============================================================================
// useWikiLinkPicker — the `[[` picker DATA seam (fe-notes-and-pages #27, S4). Same
// stub discipline as useNoteEntity/useBacklinks: M1 DEFAULT = empty candidates (no
// live apps/web NotesService composition root; resolveWikiLink would need the
// worker-RPC store — D-S4-5 / S1-D2). `?sample` (DEV) renders candidates for the gate.
//
// Live swap (zero signature change):
//   const { data } = useQuery({ queryKey: ['pages','resolve',query], queryFn: () => notes.resolveWikiLink(query) })
//   candidates = toCandidates(data ?? [])
//   pick            → notes.createPageLink(sourcePageId, target)                       (the stored page_link)
//   createAndLinkTitle → createAndLink(notes.createPage, notes.createPageLink, sourcePageId, title)
//   both: catch JournalExistsError/UnregisteredEntityTypeError → setError (IR-8); then invalidate ['pages']+['links'].
// The editor-doc `[[token]]` insertion at the caret is the ui-3 trigger's job, NOT here (D-S4-1).
// ============================================================================
import { useState } from 'react'
import { createRowFor, toCandidates, type CreateRow, type PageRowLike, type WikiCandidate } from './wikilink'

export type PickerState = 'searching' | 'empty' | 'populated' | 'error'
export interface WikiLinkPickerResult {
  query: string
  setQuery: (q: string) => void
  candidates: WikiCandidate[]
  createRow: CreateRow | null
  state: PickerState
  error: string | null
  /** Link to an existing page: live → createPageLink(sourcePageId, target). */
  pick: (targetPageId: string) => Promise<void>
  /** Create-on-miss: live → createAndLink(createPage, createPageLink, sourcePageId, title). */
  createAndLinkTitle: (title: string) => Promise<void>
}

// --- DEV/gate sample (NOT live data) ----------------------------------------
const SAMPLE_ROWS: PageRowLike[] = [
  { id: 's-note-a', type: 'note', title: 'Research log', icon: null },
  { id: 's-milestone-a', type: 'milestone_note', title: 'Launch milestone', icon: null },
  { id: 's-journal-a', type: 'journal', title: 'Daily journal', icon: null },
]

function devSampleActive(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('sample')
  )
}

/** M1 default (empty) + the DEV/gate sample. `_sourcePageId` is unused in the stub; the live swap un-prefixes it
 *  for `createPageLink(sourcePageId, …)` + `createAndLink(…, sourcePageId, …)` (call site unchanged — the S3 convention). */
export function useWikiLinkPicker(_sourcePageId: string): WikiLinkPickerResult {
  // Seed the query so the sample shows a populated picker (candidates + a Create row) for the gate.
  const [query, setQuery] = useState(() => (devSampleActive() ? 'la' : ''))

  const candidates = devSampleActive() ? toCandidates(SAMPLE_ROWS) : []
  const createRow = createRowFor(query)
  const state: PickerState = candidates.length > 0 ? 'populated' : 'empty'

  // M1: no live service → the mutations are no-ops (the dev-gate demonstrates the picker UI, not a live write).
  // Params are `_`-prefixed (unused in the stub); the live swap un-prefixes them (see the header recipe).
  const pick = async (_targetPageId: string): Promise<void> => {}
  const createAndLinkTitle = async (_title: string): Promise<void> => {}

  return { query, setQuery, candidates, createRow, state, error: null, pick, createAndLinkTitle }
}
