// ============================================================================
// useNoteContent — the editor-body WRITE seam (notes-entity-usability S2, IR-7).
// The write sibling of `useNoteEntity` (read). The editor emits the full
// `EditorDocument` on every change; we debounce (~500ms) and persist via
// `NotesService.writePageContent` — content's OWN path, never the `updatePage`
// LWW metadata patch (IR-7, interpretation.md:159). M1 = a local write; M4 swaps
// the service internals to the CRDT entry point (same signature).
//
// Correctness: the pending write FLUSHES on unmount (note-switch remounts via the
// entity `key={id}`), so a fast navigate-away never drops the last edit; a success
// invalidates `['pages', id]` so a later re-open reads fresh; save-state is honest
// (saving | saved | error) — no fake "synced" (BR-NEU-5).
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { EditorDocument } from '@vida/types'
import { getServices } from '../db/composition-root'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export interface NoteContentResult {
  save: (doc: EditorDocument) => void
  saveState: SaveState
}

const DEBOUNCE_MS = 500

/**
 * @param initialContent the content already loaded from the DB — the dedupe baseline, so a write fires only when
 *   the doc actually CHANGES. This collapses the editor's load-time `onChange` echo (TipTap emits once on mount):
 *   if the emitted doc matches what was loaded, no write (no spurious `updated_at` bump / list re-sort on mere open).
 */
export function useNoteContent(id: string, initialContent?: EditorDocument | null): NoteContentResult {
  const qc = useQueryClient()
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<{ doc: EditorDocument; serialized: string } | null>(null)
  const mounted = useRef(true)
  // The last serialization known to be in the DB — initialised to the loaded content (the dedupe baseline).
  const lastSaved = useRef<string | null>(initialContent != null ? JSON.stringify(initialContent) : null)
  // The serialization currently being written (promoted to lastSaved only on success, so a failed write retries).
  const inFlight = useRef<string | null>(null)
  // A page loaded with NO content (new journal / blank note) has no baseline to dedupe against, but the editor
  // still fires one mount-echo of its normalized (empty) seed (BR-E1-2) BEFORE any user edit. That first emit is
  // not an edit — adopt it as the baseline instead of writing it, so landing on a fresh page never writes/bumps
  // `updated_at` (BR-NEU-5: "mere open never writes"). Only the NEXT, different emit is a real edit. A loaded-
  // content page already has its baseline, so this is false and the first emit dedupes normally.
  const needsBaseline = useRef<boolean>(initialContent == null)

  const mutation = useMutation({
    mutationFn: async (doc: EditorDocument) => {
      const { notes } = await getServices()
      return notes.writePageContent(id, doc)
    },
    onSuccess: () => {
      if (inFlight.current != null) lastSaved.current = inFlight.current
      if (mounted.current) setSaveState('saved')
      void qc.invalidateQueries({ queryKey: ['pages', id] }) // keep a later re-open fresh
    },
    onError: (e) => {
      // M1 has no toast wired — surface write failures to the console + the honest save-state.
      console.error('[writeNoteContent failed]', e)
      if (mounted.current) setSaveState('error') // lastSaved unchanged → the next edit retries
    },
  })

  // Flush the pending write NOW (debounce fire or unmount). Kept in a ref so the unmount
  // cleanup always runs the latest closure (current `mutate`) without re-running the effect.
  const flushRef = useRef<() => void>(() => {})
  flushRef.current = () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const p = pending.current
    if (p != null) {
      pending.current = null
      inFlight.current = p.serialized
      mutation.mutate(p.doc)
    }
  }

  const save = (doc: EditorDocument) => {
    const serialized = JSON.stringify(doc)
    if (needsBaseline.current) {
      // First emit after a blank load = the mount-echo (BR-E1-2), not a user edit → adopt as baseline, don't write.
      needsBaseline.current = false
      lastSaved.current = serialized
      return
    }
    if (serialized === lastSaved.current) return // dedupe: unchanged since load/last save (e.g. the mount echo)
    pending.current = { doc, serialized }
    if (mounted.current) setSaveState('saving')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => flushRef.current(), DEBOUNCE_MS)
  }

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      flushRef.current() // never drop the last edit on navigate-away/unmount
    }
  }, [])

  return { save, saveState }
}
