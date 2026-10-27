// ============================================================================
// useJournalEntry — the Home journal-ENTRY data seam (home-journal-go-live S1).
//
// Today's journal is a `type:'journal'` page owned by Notes & Pages (journals is
// the aggregation engine; it does NOT own the entry — journals/identity.md:42-43).
// Materialization = NotesService.ensureJournal (NP-8 idempotent get-or-create,
// IN-SERVICE — the ensureEntityNote convention). This hook is a thin read over it,
// reusing the notes NoteEntityData/state canon + toNoteEntity mapper.
//
// A DEV-only `?sample` seeds a populated journal for the blocking Visual Gate
// (off in prod), mirroring `use-note-entity`.
// ============================================================================
import { useQuery } from '@tanstack/react-query'
import { getServices } from '../db/composition-root'
import { readAfterWrites } from '../notes/body-writes'
import { toNoteEntity } from '../notes/live-mappers'
import type { NoteEntityData, NoteEntityState } from '../notes/use-note-entity'

export interface JournalEntryResult {
  page: NoteEntityData | null
  state: NoteEntityState
}

/**
 * The user's LOCAL calendar date as `YYYY-MM-DD` — built from local fields, NOT
 * `toISOString()` (which is UTC and silently shifts the day near midnight). The
 * journal key is the day the user is living. [[date-code-needs-tz-forced-tests]]
 */
export function todayLocalYmd(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** DEV/gate affordance only (the notes convention — vite statically replaces process.env.NODE_ENV). */
function devSampleActive(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('sample')
  )
}

function sampleJournal(date: string): NoteEntityData {
  return {
    id: 'journal-sample',
    type: 'journal',
    title: date,
    content: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Today’s entry — start writing.' }] }],
    },
    contentStatus: 'ok',
    rawContent: null,
    favorite: false,
    archived: false,
    updated: 'just now',
    journalDate: date,
    icon: null,
    cover: null,
  }
}

/** Live: React Query over `NotesService.ensureJournal(today)` + the DEV/gate sample. */
export function useJournalEntry(): JournalEntryResult {
  const sample = devSampleActive()
  const date = todayLocalYmd()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['journal', date],
    // Waits for any in-flight write of today's journal body (notes-rescope R0 barrier) — a mount right after the note
    // page saved it must not seed the editor from the pre-write row (B-53).
    queryFn: () =>
      readAfterWrites([`journal:${date}`], async () =>
        toNoteEntity(await (await getServices()).notes.ensureJournal(date)),
      ),
    enabled: !sample,
  })
  if (sample) return { page: sampleJournal(date), state: 'success' }
  if (isError) return { page: null, state: 'error' }
  // ensureJournal always yields a page → there is no 'empty' live state; a pending/absent read is 'loading'.
  if (isLoading || !data) return { page: null, state: 'loading' }
  return { page: data, state: 'success' }
}
