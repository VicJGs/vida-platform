// ============================================================================
// useNoteContent — the editor-body WRITE seam (notes-entity-usability S2, IR-7; hardened by notes-rescope R0).
// The editor emits the full `EditorDocument` on every change; we debounce (~500ms) and persist via
// `NotesService.writePageContent` — content's OWN path, never the `updatePage` LWW metadata patch (IR-7).
// M1 = a local write; M4 swaps the service internals to the CRDT entry point (same signature).
//
// Data safety (notes-rescope R0, BR-R0-7/8/8b):
// - the pending write flushes on unmount, on `visibilitychange:hidden` and on `pagehide` (E-1);
// - `flush()` / `cancel()` / `lock()` let the host settle it (R5 delete) or refuse to write (EC-33);
// - a flush registers the write in the read-after-write barrier IN THE SAME TICK and writes the doc through every
//   cached body (`['pages',id]`, `['journal',date]`), so whatever mounts next seeds from the newest body (B-53);
// - the write is a direct promise, not a React Query mutation: registration must be synchronous, and a v5
//   mutation awaits before its fn and drops per-call callbacks after unmount (exactly the unmount-flush case);
// - a failed write re-queues (retryable errors only) so the next hide/unmount/edit retries;
// - the outcome goes to the per-page save-status store (notes-rescope R1, G6): success → `saved`, failure → `error`,
//   `lock()` → `locked`. The HOST renders the one chip (EC-34 / BR-R1-5). A failure no chip observes (the user left the
//   page) raises the shared error toast naming the page (G7 / BR-R1-7) — R0's "failure after unmount is lost" closed;
// - every real edit is recorded in the latest-body overlay (DEV-R0-1), and a mounting body SEEDS from it: a route
//   swap or facet/tab switch renders the incoming body before the outgoing flush, so the cache can't hand it over.
//   The dedupe baseline stays the STORED body, so an overlay-seeded mount re-saves the overlay once (ownership: it
//   retries an outgoing write that may still fail after unmount). Cost: usually one redundant identical write.
// Save status stays honest (saved | error | locked) — no "Saving…", no fake "synced" (BR-NEU-5 → BR-R1-5).
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { EditorDocument } from '@vida/types'
import { getServices } from '../db/composition-root'
import { bodyWriteKeys, clearLatestBody, latestBody, setLatestBody, trackBodyWrite } from './body-writes'
import type { NoteEntityData } from './use-note-entity'
import { notifyError } from '../lib/notify-error'
import { pageLabel } from './note-chrome'
import { observed, setSaveStatus } from './save-status'

export interface NoteContentResult {
  save: (doc: EditorDocument) => void
  /** Write the pending edit now (no-op when nothing is pending). */
  flush: () => void
  /** Drop the pending edit without writing it. */
  cancel: () => void
  /** Drop the pending edit AND make `save` a no-op for the rest of the mount (EC-33: unreadable content). */
  lock: () => void
  /** What this mount's editor must seed from — decided once at first render (the overlay wins over the prop). */
  seed: NoteContentSeed
}

export interface NoteContentSeed {
  doc: EditorDocument | null
  status: NoteEntityData['contentStatus']
}

export type NoteContentPage = Pick<
  NoteEntityData,
  'id' | 'title' | 'type' | 'content' | 'journalDate' | 'contentStatus'
>

const DEBOUNCE_MS = 500

/** Errors a retry can never fix (stable `.name`, robust across the core dist boundary). */
const TERMINAL_ERRORS = new Set(['PageNotFoundError', 'InvalidPageContentError'])

/**
 * @param page the loaded page. `content` is the dedupe baseline, so a write fires only when the doc actually CHANGES
 *   (collapses the editor's load-time `onChange` echo — no spurious `updated_at` bump on mere open). A `malformed`
 *   page starts locked: nothing is ever written over content we could not read (BR-R0-1).
 */
export function useNoteContent(page: NoteContentPage): NoteContentResult {
  const { id, journalDate } = page
  const qc = useQueryClient()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<{ doc: EditorDocument; serialized: string; gen: number } | null>(null)
  // The page's name for the post-unmount toast — the latest render's title/type (a rename is reflected).
  const labelSource = useRef({ title: page.title, type: page.type })
  labelSource.current = { title: page.title, type: page.type }
  const owner = useRef(Symbol('note-content-writer'))
  // DEV-R0-1: read ONCE, at first render — the incoming body renders before the outgoing flush, so the overlay (set
  // synchronously by the outgoing `save()`) is the only place the unsaved edit can come from. Pure read: StrictMode's
  // double initializer picks the same seed.
  // A page whose CURRENT bytes are malformed stays locked even if an overlay exists: the overlay must never be written
  // over bytes the EC-33 export exists to protect (the overlay is kept, not consumed).
  const [seed] = useState<NoteContentSeed & { overlay: string | null }>(() => {
    const overlay = page.contentStatus === 'malformed' ? undefined : latestBody(page.id)
    return overlay
      ? { doc: overlay.doc, status: 'ok', overlay: overlay.serialized }
      : { doc: page.content, status: page.contentStatus, overlay: null }
  })
  const locked = useRef(seed.status === 'malformed')
  // The last serialization known to be in the DB — initialised to the loaded content (the dedupe baseline).
  const lastSaved = useRef<string | null>(page.content != null ? JSON.stringify(page.content) : null)
  // What the DB WILL hold once every queued write settles — the dedupe target (DEV-R0-2). Not `lastSaved`: an undo made
  // while a write is in flight must still be written. An overlay-seeded mount expects the outgoing owner's in-flight body.
  const expected = useRef<string | null>(seed.overlay ?? lastSaved.current)
  // Sticky (critique r2 A1): this mount inherited another mount's unsaved edit. The shared overlay entry is overwritten
  // by this mount's first save, so the map alone can't remember that — until THIS mount's own write succeeds, nothing
  // is deduped, so a type-then-undo inside the debounce can't cancel the ownership re-save.
  const inheritsHandover = useRef(seed.overlay != null)
  // A page loaded with NO content (new journal / blank note) has no baseline to dedupe against, but the editor
  // still fires one mount-echo of its normalized (empty) seed (BR-E1-2) BEFORE any user edit. That first emit is
  // not an edit — adopt it as the baseline instead of writing it, so landing on a fresh page never writes/bumps
  // `updated_at` (BR-NEU-5: "mere open never writes"). Only the NEXT, different emit is a real edit.
  // An overlay-seeded mount is NOT a fresh page: its echo must be compared (and re-saved), never adopted.
  const needsBaseline = useRef<boolean>(page.content == null && seed.overlay == null)

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  // Kept in a ref so the unmount/hide listeners always run the latest closure without re-subscribing.
  const flushRef = useRef<() => void>(() => {})
  flushRef.current = () => {
    clearTimer()
    const p = pending.current
    if (p == null || locked.current) return
    pending.current = null
    expected.current = p.serialized

    // Write-through (synchronous, before the write starts): any surface that mounts from cache seeds the newest body.
    qc.setQueryData<{ content: string | null }>(['pages', id], (row) => (row ? { ...row, content: p.serialized } : row))
    if (journalDate) {
      qc.setQueryData<NoteEntityData>(['journal', journalDate], (e) =>
        e ? { ...e, content: p.doc, contentStatus: 'ok', rawContent: p.serialized } : e,
      )
    }

    const write = getServices().then((s) => s.notes.writePageContent(id, p.doc))
    trackBodyWrite(bodyWriteKeys(id, journalDate), write) // same tick as the write — readers can't slip past
    write.then(
      () => {
        clearLatestBody(id, { gen: p.gen }) // never clears a newer edit's overlay
        lastSaved.current = p.serialized
        inheritsHandover.current = false // this mount's own body is now in the DB — the inherited edit is owned
        setSaveStatus(id, 'saved')
        void qc.invalidateQueries({ queryKey: ['pages', id] })
        void qc.invalidateQueries({ queryKey: ['notes', 'pages'] }) // the list sorts by updated_at
        if (journalDate) {
          void qc.invalidateQueries({ queryKey: ['journal', journalDate] })
          void qc.invalidateQueries({ queryKey: ['calendar', 'journal'] }) // every range's record line
        }
      },
      (e: unknown) => {
        setSaveStatus(id, 'error')
        // A chip showing this page carries the failure (one announcement); with none (the user left), the toast does.
        if (observed(id)) console.error('[writeNoteContent failed]', e)
        else notifyError(`save “${pageLabel(labelSource.current)}”`, e)
        // The DB never got it. Stated limit (critique r2 A2): if an EARLIER write is still in flight, this falls back past
        // it; writes run in order through the one worker, so an earlier write can't still be pending behind a later one.
        if (expected.current === p.serialized) expected.current = lastSaved.current
        const terminal = e instanceof Error && TERMINAL_ERRORS.has(e.name)
        if (terminal) {
          // The page is gone → nothing to hand over. A bad body → drop only that generation (a newer edit stays).
          clearLatestBody(id, e.name === 'PageNotFoundError' ? 'all' : { gen: p.gen })
        }
        // Re-queue unless a newer edit already replaced it, so the next hide/unmount/edit retries. A failure that lands
        // after unmount re-queues into a dead hook; its edit stays in the overlay (a reopen re-seeds + re-saves it), and
        // the toast above told the user.
        if (!terminal && pending.current == null && !locked.current) pending.current = p
      },
    )
  }

  const save = (doc: EditorDocument) => {
    if (locked.current) return
    const serialized = JSON.stringify(doc)
    if (needsBaseline.current) {
      // First emit after a blank load = the mount-echo (BR-E1-2), not a user edit → adopt as baseline, don't write.
      needsBaseline.current = false
      lastSaved.current = serialized
      expected.current = serialized
      return
    }
    // Another mount's unsaved edit is still recorded: this mount seeded from it, so its echo is the OWNERSHIP re-save
    // (DEV-R0-1) — never deduped away, even though it equals the body that mount expects to land.
    const foreign = latestBody(id)
    const ownsHandover = inheritsHandover.current || (foreign != null && foreign.owner !== owner.current)
    if (!ownsHandover && serialized === expected.current) {
      // Dedupe: equals what the DB will hold (e.g. the mount echo). DEV-R0-2: if a DIFFERENT edit is still pending, the
      // user has undone it — drop it (else the timer would write the undone doc while the editor shows this one) and
      // drop this writer's overlay. An identical pending edit (a repeated echo of the re-save) is kept.
      if (pending.current != null && pending.current.serialized !== serialized) {
        clearTimer()
        pending.current = null
        clearLatestBody(id, { owner: owner.current })
        setSaveStatus(id, 'saved')
      }
      return
    }
    const gen = setLatestBody(id, doc, serialized, owner.current) // synchronous: the next mount seeds from it
    pending.current = { doc, serialized, gen }
    clearTimer()
    timer.current = setTimeout(() => flushRef.current(), DEBOUNCE_MS)
  }

  const cancel = () => {
    clearTimer()
    pending.current = null
    clearLatestBody(id, { owner: owner.current })
  }

  const lock = () => {
    locked.current = true
    cancel()
    setSaveStatus(id, 'locked') // the chip hides — the EC-33 notice is the only status (called from a callback, never render)
  }

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') flushRef.current()
    }
    const onPageHide = () => flushRef.current()
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', onPageHide)
      flushRef.current() // never drop the last edit on navigate-away/unmount
    }
  }, [])

  return {
    save,
    flush: () => flushRef.current(),
    cancel,
    lock,
    seed: { doc: seed.doc, status: seed.status },
  }
}
