// Note autosave — MOD-notes ②c (LIF-131). Debounced, echo-skipping, flush-on-unmount persistence of the editor
// document to `pages.content` via the ②a `useUpdatePage` mutation. No business logic (① owns the rules); this is the
// EM-3/EM-7/EM-10 mechanics only. See docs/specs/features/mod-notes/sessions/IMPLEMENTATION-PLAN-…-02c A1.
import { useCallback, useEffect, useRef } from 'react'
import type { EditorDocument } from '@vida/types'
import { useUpdatePage } from './hooks'

export type SaveStatus = 'saved' | 'saving' | 'error'

const DEBOUNCE_MS = 600

/**
 * @param pageId the page being edited. The caller MUST remount (key={pageId}) on a page change so the seed + this
 * hook's refs re-initialise; the `[pageId]` effect below is a defensive re-arm regardless.
 */
export function useNoteAutosave(pageId: string): {
  onChange: (doc: EditorDocument) => void
  status: SaveStatus
  flush: () => void
} {
  const updatePage = useUpdatePage()
  // `mutate` is referentially stable in React-Query v5; capture it in a ref so `flush` depends only on `pageId`
  // (else the unmount-cleanup effect would re-run — and flush prematurely — on every render).
  const mutateRef = useRef(updatePage.mutate)
  useEffect(() => {
    mutateRef.current = updatePage.mutate
  })

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<string | null>(null)
  // EM-3: VidaEditor's FIRST onChange after mount is the normalized-seed echo (BR-E1-2). Skip exactly once — NOT a
  // string-equality check (TipTap normalizes the seed, e.g. empty null→{doc:[]} becomes {doc:[paragraph]}, so the
  // echo would never string-equal the stored doc → a phantom save on every fresh page).
  const skipNextEcho = useRef(true)
  useEffect(() => {
    skipNextEcho.current = true
  }, [pageId])

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (pending.current !== null) {
      const content = pending.current
      pending.current = null
      mutateRef.current({ id: pageId, patch: { content } })
    }
  }, [pageId])

  const onChange = useCallback(
    (doc: EditorDocument) => {
      if (skipNextEcho.current) {
        skipNextEcho.current = false
        return
      }
      pending.current = JSON.stringify(doc)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, DEBOUNCE_MS)
    },
    [flush],
  )

  // EM-10: flush any pending save on unmount / page change so a fast type-then-navigate never drops the last edit.
  useEffect(() => flush, [pageId, flush])

  const status: SaveStatus = updatePage.isError ? 'error' : updatePage.isPending ? 'saving' : 'saved'
  return { onChange, status, flush }
}
