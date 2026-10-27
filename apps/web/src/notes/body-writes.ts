// ============================================================================
// body-writes — the read-after-write barrier for page BODIES (notes-rescope R0, BR-R0-8/8b).
//
// The editor is UNCONTROLLED: it seeds once from whatever the query returns. A read that overtakes an in-flight body
// write (one worker RPC per statement, so it can) seeds the editor with the pre-write body, and the next keystroke
// writes old body + edit over the newer one (B-53). So every body write registers here SYNCHRONOUSLY (in `flush()`,
// before any await), and every body read goes through `readAfterWrites`, which waits for registered writes and
// re-reads if a write registered while it was waiting or reading (a per-key generation, snapshotted BEFORE the wait).
//
// Keys: `page:<id>` (the note page reads by id) and `journal:<YYYY-MM-DD>` (Home reads today's journal by date).
// A failed write never fails a read (chains swallow rejections); a write that never settles holds its readers —
// the same failure as a hung write (stated limit, PLAN-R0 BR-R0-8b).
// ============================================================================

import type { EditorDocument } from '@vida/types'

const chains = new Map<string, Promise<void>>()
const generations = new Map<string, number>()

const noop = (): void => {}

/** The barrier keys of one page's body. */
export function bodyWriteKeys(pageId: string, journalDate?: string | null): string[] {
  return journalDate ? [`page:${pageId}`, `journal:${journalDate}`] : [`page:${pageId}`]
}

/** Register an in-flight body write under `keys`. Call in the same tick the write starts. */
export function trackBodyWrite(keys: readonly string[], write: Promise<unknown>): void {
  const settled = write.then(noop, noop)
  for (const key of keys) {
    const next = Promise.all([chains.get(key), settled]).then(noop)
    chains.set(key, next)
    generations.set(key, (generations.get(key) ?? 0) + 1)
    // Only the write that still owns the key clears it — an earlier one settling must not drop a later chain.
    void next.then(() => {
      if (chains.get(key) === next) chains.delete(key)
    })
  }
}

function snapshot(keys: readonly string[]): string {
  return keys.map((k) => generations.get(k) ?? 0).join(',')
}

/** Read once no registered write for `keys` is in flight, and re-read if one started meanwhile. */
export async function readAfterWrites<T>(keys: readonly string[], read: () => Promise<T>): Promise<T> {
  for (;;) {
    const before = snapshot(keys) // BEFORE waiting — a write registering mid-wait must force a re-read
    await Promise.all(keys.map((k) => chains.get(k)))
    const result = await read()
    if (snapshot(keys) === before) return result
  }
}

// ── DEV-R0-1 · the latest-body overlay (the seed-point handover) ─────────────────────────────────────────────────
// A route swap or a facet/tab switch RENDERS the incoming editor body before the outgoing one's unmount flush runs,
// and the editor seeds once. So `save()` records every real edit here synchronously, and a mounting body seeds from it
// when present (`useNoteContent`'s seed). A plain Map — no subscriptions, so typing never re-renders anything.
// One entry per page id (bounded). Clearing: a successful write of a gen ≥ the entry's · the owner's cancel/lock ·
// a terminal error. A retryable failure keeps it; the next mount re-saves it (ownership).
// Forward obligation: every NON-editor body writer (R9 template apply, import, M4 sync) clears the entry first.

export interface LatestBody {
  doc: EditorDocument
  serialized: string
  gen: number
  owner: symbol
}

const latest = new Map<string, LatestBody>()
let latestGen = 0

/** Record a real edit as the page's latest body; returns its generation. */
export function setLatestBody(pageId: string, doc: EditorDocument, serialized: string, owner: symbol): number {
  const gen = ++latestGen
  latest.set(pageId, { doc, serialized, gen, owner })
  return gen
}

/** The page's latest unsaved body, if any. */
export function latestBody(pageId: string): LatestBody | undefined {
  return latest.get(pageId)
}

/** Clear by settled generation (never a newer edit), by owner (cancel/lock), or unconditionally. */
export function clearLatestBody(pageId: string, by: { gen: number } | { owner: symbol } | 'all'): void {
  const entry = latest.get(pageId)
  if (!entry) return
  if (by === 'all' || ('gen' in by ? entry.gen <= by.gen : entry.owner === by.owner)) latest.delete(pageId)
}

/** Test-only reset of the module state. */
export function __resetBodyWrites(): void {
  chains.clear()
  generations.clear()
  latest.clear()
}
