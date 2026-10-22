// ============================================================================
// Preferences writer — preferences-rescope R2 (LIF-247), PLAN-R2 R2-BR-4/5/8.
//
// THE write path for `user_preferences` + `nav_preferences` — every writer in
// every unit goes through here (F10), never the raw service. Per table it owns
// cache truth: `confirmed` (the last good DB value) + `pending` (patches not yet
// confirmed); the query cache is ALWAYS `applyPending(confirmed)`. So:
// - a settling batch never wipes a patch still in the debounce (IR-11);
// - a failed batch restores the DB state + any LATER pending patches (never a
//   stacked per-call snapshot);
// - a refetch while patches are pending returns `cacheValue`, not the raw row;
// - writes from outside React keep every `useQuery` observer correct.
// Writes before any read stamp nothing (no DEFAULTS-based value as fresh); the
// batch adopts the fresh DB row. Serial per table + debounced (write-queue.ts);
// R1's lock serializes each transaction (BR-RT-LOCK).
// ============================================================================

import type { QueryClient } from '@tanstack/react-query'
import {
  InvalidModuleError,
  NAV_PREFERENCES_DEFAULTS,
  USER_PREFERENCES_DEFAULTS,
  type PreferencesService,
} from '@vida/core'
import type { MergedNavPreferences, MergedPreferences } from '@vida/types'
import { MODULE_MAP } from '../nav/module-map'
import { MANAGEABLE_SURFACES } from '../settings/settings-model'
import { TransactionLockTimeoutError } from '../db/write-lock'
import { NAV_PREFS_KEY, PREFERENCES_FAMILY, PREFERENCES_GC_MS, PREFERENCES_STALE_MS, USER_PREFS_KEY } from './preferences-keys'
import { applyNavPatch, applyUserPatch } from './preferences-view'
import { createWriteQueue, type WriteQueue } from './write-queue'

export type PreferencesTable = 'user' | 'nav'

export class PreferencesWriteError extends Error {
  constructor(
    readonly kind: 'validation' | 'lock-timeout' | 'unknown',
    readonly cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : String(cause))
    this.name = 'PreferencesWriteError'
  }
}

function classify(e: unknown): PreferencesWriteError {
  if (e instanceof PreferencesWriteError) return e
  if (e instanceof TransactionLockTimeoutError) return new PreferencesWriteError('lock-timeout', e)
  if (e instanceof InvalidModuleError) return new PreferencesWriteError('validation', e)
  if (e instanceof Error && /^Invalid (nav )?preferences patch/.test(e.message)) {
    return new PreferencesWriteError('validation', e) // service.ts:259,294
  }
  return new PreferencesWriteError('unknown', e)
}

/** Keys the nav show/hide map may carry (BR-PREF-6 membership, ② side): dock modules + the managed surfaces. */
export const VISIBILITY_KEYS: ReadonlySet<string> = new Set([
  ...MODULE_MAP.filter((m) => m.placement === 'dock').map((m) => m.key),
  ...MANAGEABLE_SURFACES.map((s) => s.key),
])

type Row = MergedPreferences | MergedNavPreferences
interface Envelope {
  patch: Record<string, unknown>
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a && b && typeof a === 'object' && typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b)
  return false
}

/** Only the changed columns; JSON columns emitted whole (the service replaces columns, service.ts:157-165). */
function diffToPatch(fresh: Row, merged: Row): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(merged)) {
    if (!sameValue((fresh as unknown as Record<string, unknown>)[k], v)) out[k] = v
  }
  return out
}

export interface PreferencesWriterOptions {
  getService: () => Promise<PreferencesService>
  queryClient: QueryClient
  debounceMs: number
}

export function createPreferencesWriter({ getService, queryClient, debounceMs }: PreferencesWriterOptions) {
  queryClient.setQueryDefaults(PREFERENCES_FAMILY, { staleTime: PREFERENCES_STALE_MS, gcTime: PREFERENCES_GC_MS })

  const KEY = { user: USER_PREFS_KEY, nav: NAV_PREFS_KEY } as const
  const DEFAULTS = { user: USER_PREFERENCES_DEFAULTS, nav: NAV_PREFERENCES_DEFAULTS } as const
  const apply = {
    user: (base: Row, p: Record<string, unknown>) => applyUserPatch(base as MergedPreferences, p),
    nav: (base: Row, p: Record<string, unknown>) => applyNavPatch(base as MergedNavPreferences, p),
  }

  let confirmed: Record<PreferencesTable, Row | undefined> = { user: undefined, nav: undefined }
  let pending: Record<PreferencesTable, Envelope[]> = { user: [], nav: [] }
  let epochs: Record<PreferencesTable, number> = { user: 0, nav: 0 }

  function cacheValue(t: PreferencesTable): Row {
    return pending[t].reduce((acc, env) => apply[t](acc, env.patch), confirmed[t] ?? DEFAULTS[t])
  }

  function syncCache(t: PreferencesTable): void {
    if (confirmed[t] !== undefined) queryClient.setQueryData(KEY[t], cacheValue(t))
  }

  function makeQueue(t: PreferencesTable): WriteQueue<Envelope, Row> {
    return createWriteQueue<Envelope, Row>({
      debounceMs,
      async write(batch) {
        const svc = await getService()
        const fresh: Row = t === 'user' ? await svc.getMergedPreferences() : await svc.getNavPreferences()
        if (confirmed[t] === undefined) confirmed[t] = fresh // a write before any read adopts the DB row
        const merged = batch.reduce((acc, env) => apply[t](acc, env.patch), fresh)
        const diff = diffToPatch(fresh, merged)
        if (Object.keys(diff).length === 0) return fresh // a no-op never creates the row (fresh vault)
        return t === 'user'
          ? svc.updatePreferences(diff as Partial<MergedPreferences>)
          : svc.updateNavPreferences(diff as Partial<MergedNavPreferences>)
      },
      onSettled(outcome, { batch, idle }) {
        epochs[t]++
        if (outcome.ok) confirmed[t] = outcome.value
        const done = new Set(batch)
        pending[t] = pending[t].filter((env) => !done.has(env))
        syncCache(t)
        if (idle) void queryClient.invalidateQueries({ queryKey: KEY[t], exact: true })
      },
    })
  }

  let queues = { user: makeQueue('user'), nav: makeQueue('nav') }

  function invalidVisibilityKey(patch: Record<string, unknown>): string | null {
    const map = patch.module_visibility
    if (!map || typeof map !== 'object') return null
    for (const key of Object.keys(map)) if (!VISIBILITY_KEYS.has(key)) return key
    return null
  }

  function write(t: PreferencesTable, patch: Record<string, unknown>): Promise<Row> {
    // BR-PREF-6 (② side) on EVERY path that writes module_visibility — not only setModuleVisibilityMap.
    const badKey = t === 'user' ? invalidVisibilityKey(patch) : null
    if (badKey !== null) return Promise.reject(classify(new InvalidModuleError(badKey)))
    const env: Envelope = { patch } // a fresh envelope → exact identity removal even if a caller reuses `patch`
    pending[t].push(env)
    if (confirmed[t] !== undefined) {
      // Not awaited: on @tanstack/query-core 5.101.x `cancel` reverts synchronously (query.ts revertState), so the
      // setQueryData below wins over any in-flight fetch.
      void queryClient.cancelQueries({ queryKey: KEY[t], exact: true })
      syncCache(t)
    }
    const result = queues[t].enqueue(env).catch((e: unknown) => {
      throw classify(e)
    })
    // Fire-and-forget callers (F10 consumers) must never surface an unhandled rejection; awaiting callers still get it.
    result.catch(() => {})
    return result
  }

  return {
    /** `epoch` + `noteConfirmed` are the queryFn's halves: read, then reconcile with what's pending. */
    epoch: (t: PreferencesTable) => epochs[t],
    /** Accept a read only if no batch settled since it began; ALWAYS return the cache truth (pending re-applied). */
    noteConfirmed<T extends Row>(t: PreferencesTable, read: T, epochAtStart: number): T {
      if (epochs[t] === epochAtStart || confirmed[t] === undefined) confirmed[t] = read
      return cacheValue(t) as T
    },
    /** The cache truth for a table — the echo-check source (defined even while the query loads). */
    current: (t: PreferencesTable) => cacheValue(t),
    /** Drop every key of `patch` that would not change the cache truth (R2-BR-6: no echo writes). */
    withoutEcho<P extends Record<string, unknown>>(t: PreferencesTable, patch: P): Partial<P> {
      // Before the first read we don't know the DB value — an edit equal to a DEFAULT may still be a real change.
      if (confirmed[t] === undefined) return { ...patch }
      const now = cacheValue(t) as unknown as Record<string, unknown>
      const out: Partial<P> = {}
      for (const [k, v] of Object.entries(patch)) {
        const after = (apply[t](now as unknown as Row, { [k]: v }) as unknown as Record<string, unknown>)[k]
        if (!sameValue(after, now[k])) (out as Record<string, unknown>)[k] = v
      }
      return out
    },
    writePreferences: (patch: Partial<MergedPreferences>) =>
      write('user', patch as Record<string, unknown>) as Promise<MergedPreferences>,
    writeNavPreferences: (patch: Partial<MergedNavPreferences>) =>
      write('nav', patch as Record<string, unknown>) as Promise<MergedNavPreferences>,
    /** Per-sub-key merge into `dashboard_layout` (never replaces the object). */
    patchDashboardLayout: (sub: Record<string, unknown>) =>
      write('user', { dashboard_layout: sub }) as Promise<MergedPreferences>,
    /** Map-merge into `dashboard_layout.moduleNames`. */
    patchModuleNames: (partial: Record<string, string>) =>
      write('user', { dashboard_layout: { moduleNames: partial } }) as Promise<MergedPreferences>,
    /** Map-merge into `module_visibility`, validating keys first (BR-PREF-6 ② side; global surfaces never hideable). */
    setModuleVisibilityMap: (partial: Record<string, boolean>) =>
      write('user', { module_visibility: partial }) as Promise<MergedPreferences>,
    /** Seal both debounces now and wait for everything queued (the hide/pagehide flush, R2-BR-7). */
    async flushAll() {
      await Promise.all([queues.user.flush(), queues.nav.flush()])
    },
    isIdle: () => queues.user.isIdle() && queues.nav.isIdle(),
    /** Tests only. Disposes the old queues' debounce timers first so a leftover batch can't write into the next test. */
    reset() {
      queues.user.dispose()
      queues.nav.dispose()
      confirmed = { user: undefined, nav: undefined }
      pending = { user: [], nav: [] }
      epochs = { user: 0, nav: 0 }
      queues = { user: makeQueue('user'), nav: makeQueue('nav') }
    },
  }
}

export type PreferencesWriter = ReturnType<typeof createPreferencesWriter>
