// ============================================================================
// useNoteEntity — the note-ENTITY-page DATA seam (fe-notes-and-pages #27, S2; live since the notes go-live).
// React Query over `NotesService.getPage(id)` → `toNoteEntity`. The read waits for any in-flight body write of
// this page (notes-rescope R0 — the read-after-write barrier, `body-writes.ts`), so a fresh mount never seeds the
// editor from a pre-write row.
//
// A DEV-ONLY sample (NOT shipped live data) renders a populated page for the blocking
// Visual Gate — gated behind `?sample` in DEV only, off in prod.
// ============================================================================
import type { EditorDocument, PageType } from '@vida/types'
import { useQuery } from '@tanstack/react-query'
import { getServices } from '../db/composition-root'
import { readAfterWrites } from './body-writes'
import { retryState, throwIfReadErrorArmed } from './read-error'
import { toNoteEntity } from './live-mappers'

/** The fields the note-entity page needs (a `pages`-row projection; live mapping at the data-plane slice). */
export interface NoteEntityData {
  id: string
  type: PageType
  title: string
  /** The stored editor document; `null` = an untouched/blank page. Written via the Yjs/editor binding, never patched (IR-7). */
  content: EditorDocument | null
  /** notes-rescope R0 (BR-R0-4): how the stored body parsed. `malformed` ⇒ never edited, never written (EC-33). */
  contentStatus: 'ok' | 'absent' | 'malformed'
  /** The stored `pages.content` string as-is — the lossless source for "Export a copy" (EC-33). */
  rawContent: string | null
  favorite: boolean
  archived: boolean
  /** A relative "edited" label (live: formatted from `updated_at`). */
  updated: string
  /** `pages.journal_date` (YYYY-MM-DD) — set for `type==='journal'`, `null` otherwise. Feeds the `/summary` date (S5). */
  journalDate: string | null
  /** `pages.icon` — a user-chosen page icon ref (format M1.1+); `null` = none. Metadata control (S6). */
  icon: string | null
  /** `pages.cover_image` ([E]) — a user-chosen cover ref; `null` = none. Metadata control + merged banner (S6). */
  cover: string | null
}

export type NoteEntityState = 'loading' | 'empty' | 'error' | 'success'

export interface NoteEntityResult {
  page: NoteEntityData | null
  state: NoteEntityState
  /** Re-read after an error (notes-rescope R1, BR-R1-8). */
  retry: () => void
  /** A Retry is in flight — the surface stays on its error branch with a busy button (R-6). */
  retrying: boolean
}

// id→type mirrors the S1 collection sample so `/notes/2?sample` is a journal, `/notes/4` a milestone, etc.
const SAMPLE_TYPE: Record<string, PageType> = {
  '2': 'journal',
  '4': 'milestone_note',
  '5': 'deliverable_note',
}

function sampleDoc(title: string): EditorDocument {
  return {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: `${title} — start writing here.` }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'A borderless, Notion-style note page.' }] },
      // S9 EC-24 consume-verify fixture (DEV `?sample` only): the ui-3 editor blocks whose styling S9 verifies in-app —
      // blockquote (tokened left bar + muted italic), task-list (aligned checkbox), table (tokened borders).
      {
        type: 'blockquote',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A quotation, set apart.' }] }],
      },
      {
        type: 'taskList',
        content: [
          {
            type: 'taskItem',
            attrs: { checked: false },
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A task to do.' }] }],
          },
          {
            type: 'taskItem',
            attrs: { checked: true },
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A task done.' }] }],
          },
        ],
      },
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Name' }] }] },
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Value' }] }] },
            ],
          },
          {
            type: 'tableRow',
            content: [
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Alpha' }] }] },
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '42' }] }] },
            ],
          },
        ],
      },
    ],
  }
}

function sampleFor(id: string): NoteEntityData {
  const type = SAMPLE_TYPE[id] ?? 'note'
  const title = type === 'journal' ? 'Daily journal' : 'Project kickoff'
  return {
    id,
    type,
    title,
    content: sampleDoc(title),
    contentStatus: 'ok',
    rawContent: JSON.stringify(sampleDoc(title)),
    favorite: id === '1',
    archived: false,
    updated: '2h ago',
    journalDate: type === 'journal' ? '2026-10-11' : null,
    icon: type === 'note' ? 'star' : null,
    cover: type === 'note' ? 'cover-sample' : null,
  }
}

function devSampleActive(): boolean {
  // DEV/gate affordance only (the S1 `useNotesRows` convention — vite statically replaces process.env.NODE_ENV).
  return (
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('sample')
  )
}

/** Live: React Query over `NotesService.getPage(id)` (zero signature change) + the DEV/gate sample. */
export function useNoteEntity(id: string): NoteEntityResult {
  const sample = devSampleActive()
  const q = useQuery({
    queryKey: ['pages', id],
    queryFn: () => {
      throwIfReadErrorArmed()
      return readAfterWrites([`page:${id}`], async () => (await getServices()).notes.getPage(id))
    },
    enabled: !sample && Boolean(id),
  })
  const { error, retrying, retry } = retryState(q)
  if (sample) return { page: sampleFor(id), state: 'success', retry, retrying: false }
  if (error) return { page: null, state: 'error', retry, retrying }
  if (q.isLoading) return { page: null, state: 'loading', retry, retrying }
  return q.data
    ? { page: toNoteEntity(q.data), state: 'success', retry, retrying }
    : { page: null, state: 'empty', retry, retrying }
}
