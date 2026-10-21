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

export function useNoteContent(id: string): NoteContentResult {
  const qc = useQueryClient()
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<EditorDocument | null>(null)
  const mounted = useRef(true)

  const mutation = useMutation({
    mutationFn: async (doc: EditorDocument) => {
      const { notes } = await getServices()
      return notes.writePageContent(id, doc)
    },
    onSuccess: () => {
      if (mounted.current) setSaveState('saved')
      void qc.invalidateQueries({ queryKey: ['pages', id] }) // keep a later re-open fresh
    },
    onError: (e) => {
      // M1 has no toast wired — surface write failures to the console + the honest save-state.
      console.error('[writeNoteContent failed]', e)
      if (mounted.current) setSaveState('error')
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
    const doc = pending.current
    if (doc != null) {
      pending.current = null
      mutation.mutate(doc)
    }
  }

  const save = (doc: EditorDocument) => {
    pending.current = doc
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
