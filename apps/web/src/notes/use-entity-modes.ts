// ============================================================================
// useEntityModeStore — the durable merged/tabbed memory (notes-rescope R2, EC-5 · PLAN-R2 G3–G7 · IMPL R-1…R-4).
//
// "Async read, seeded per-type default while loading" (slice R2): one React Query read of every `entity_mode:` row in the
// device-local `app_state` (ADR-002 §5.0, ADR-006 §3.6). While it loads the store has no rows, so every page reads its
// per-type default; when the rows land the store re-derives and pages switch to their remembered mode.
// - ONE observer (NoteEntity), `retry:false` + `retryOnMount:false`: a failed read is read once and never again on remount
//   (the page keeps its default — no toast; a layout preference isn't worth one).
// - The cache IS the map. A toggle `setQueryData`s it, then writes app_state; a write failure → one toast, and the mode stays
//   for the session.
// - `sessionWrites` (R-4): a resolving fetch replaces the cache with what it read, so a toggle made while a read is in
//   flight would be overwritten. Toggles are kept here (per tab, per load) and merged into every read.
// ============================================================================
import { useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ENTITY_MODE_PREFIX, readAppStatePrefix, writeAppState } from '@vida/core'
import type { FacetMode } from '@vida/ui'
import { ensureDbReady } from '../db/boot'
import { createAppStateEntityModeStore, type EntityModeStore } from '../entity/adapter'
import { notifyError } from '../lib/notify-error'
import { defaultModeFor } from './mode-defaults'

const KEY = ['app_state', 'entity_mode'] as const
type Modes = Record<string, string>

const sessionWrites = new Map<string, FacetMode>()

/** Test-only: forget this load's toggles. */
export function __resetEntityModes(): void {
  sessionWrites.clear()
}

async function readModes(): Promise<Modes> {
  const { driver } = await ensureDbReady() // readiness parity with the composition root (R-1)
  const rows = await readAppStatePrefix(driver, ENTITY_MODE_PREFIX)
  return { ...Object.fromEntries(rows.map((r) => [r.key, r.value])), ...Object.fromEntries(sessionWrites) }
}

/** The page's `EntityModeStore`. `enabled:false` (DEV `?sample`) → never reads; the caller uses the reference store. */
export function useEntityModeStore(enabled: boolean): EntityModeStore {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: KEY,
    queryFn: readModes,
    enabled,
    staleTime: Infinity,
    retry: false,
    retryOnMount: false,
  })

  useEffect(() => {
    if (query.error) console.error('[entity modes read failed — per-type defaults apply]', query.error)
  }, [query.error])

  return useMemo(() => {
    const persist = (key: string, mode: FacetMode) => {
      sessionWrites.set(key, mode)
      qc.setQueryData<Modes>(KEY, (old) => ({ ...(old ?? {}), [key]: mode }))
      void ensureDbReady()
        .then((c) => writeAppState(c.driver, key, mode))
        .catch((e: unknown) => notifyError('remember this page’s layout', e))
    }
    return createAppStateEntityModeStore(query.data, defaultModeFor, persist)
  }, [query.data, qc])
}
