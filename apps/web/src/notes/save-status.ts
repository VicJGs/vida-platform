// ============================================================================
// save-status — the per-page SAVE STATUS store (notes-rescope R1, G6 / BR-R1-5 / EC-34).
//
// One page's save state, readable by whatever hosts the chip: the note page's title row (`PageActions`) and Home's
// journal frame. It lives OUTSIDE the editor body because tabbed mode mounts only the active panel (EntityView), so a
// body-owned state would die when the user opens Overview. A module-level store + `useSyncExternalStore` — the
// `body-writes.ts` module-registry precedent; one entry per page id (bounded).
//
// States: the honest M1 union (`saved | error`, no "Saving…" — writes are instant on-device, P4) + `locked` (the body
// can't be edited, EC-33: the chip hides and the notice is the page's only status). `locked` is STICKY — an outgoing
// mount's in-flight write can't bring the chip back over the notice. `error` returns to `saved` only on the next
// successful write of that page. A page never written reads `saved` (it was loaded from the device).
//
// `observed(id)` counts live SUBSCRIPTIONS (balanced under StrictMode): no observer ⇒ no chip can show a failure, so the
// writer raises a toast instead (G7 / BR-R1-7).
// ============================================================================
import { useCallback, useSyncExternalStore } from 'react'
import type { LocalSyncState } from '@vida/ui'

export type SaveStatus = LocalSyncState | 'locked'

const statuses = new Map<string, SaveStatus>()
const listeners = new Map<string, Set<() => void>>()

export function getSaveStatus(pageId: string): SaveStatus {
  return statuses.get(pageId) ?? 'saved'
}

export function setSaveStatus(pageId: string, next: SaveStatus): void {
  const current = getSaveStatus(pageId)
  if (current === next || current === 'locked') return
  statuses.set(pageId, next)
  listeners.get(pageId)?.forEach((l) => l())
}

function subscribe(pageId: string, listener: () => void): () => void {
  let set = listeners.get(pageId)
  if (!set) {
    set = new Set()
    listeners.set(pageId, set)
  }
  set.add(listener)
  return () => {
    set.delete(listener)
    if (set.size === 0) listeners.delete(pageId)
  }
}

/** Is any chip showing this page's status right now? */
export function observed(pageId: string): boolean {
  return (listeners.get(pageId)?.size ?? 0) > 0
}

export function useSaveStatus(pageId: string): SaveStatus {
  const sub = useCallback((l: () => void) => subscribe(pageId, l), [pageId])
  const snap = useCallback(() => getSaveStatus(pageId), [pageId])
  return useSyncExternalStore(sub, snap, snap)
}

/** Test-only: drop every status (listeners are owned by mounted hooks). */
export function __resetSaveStatus(): void {
  statuses.clear()
}
