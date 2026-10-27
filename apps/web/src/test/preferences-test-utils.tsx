// preferences-rescope R2 (LIF-247) — shared test utilities for the live Preferences seam.
//
// ⚠ This module must NOT import `db/composition-root` or `preferences/preferences-writer`, even transitively: tests mock
// the composition root with an async factory that imports THIS file while the mocked module is being created.
//   vi.mock('../db/composition-root', async () =>
//     (await import('../test/preferences-test-utils')).compositionRootMock())
// The wrapper provides the app's SINGLETON queryClient — the writer syncs that client, so a per-test client would never
// see writer updates. Reset between tests: `afterEach(() => { queryClient.clear(); resetPreferencesWriterForTests() })`.
import { createElement, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { NAV_PREFERENCES_DEFAULTS, USER_PREFERENCES_DEFAULTS, type PreferencesService } from '@vida/core'
import type { MergedNavPreferences, MergedPreferences } from '@vida/types'
import { queryClient } from '../lib/query-client'

export function createPrefsWrapper() {
  return function PrefsWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0))

/**
 * An in-memory PreferencesService. Like the real one, the singleton write is read-then-create with an await in between
 * (service.ts:263-266), so concurrent first writes would double-create unless the caller serializes them (IR-10).
 */
/** The `command_bar_history` fields the palette reads (the Drizzle row minus base/sync columns). */
export interface HistoryRow {
  command_key: string
  command_label: string
  command_category: string | null
  use_count: number
  last_used_at: number | null
  is_pinned: boolean
}

export function fakePreferencesService() {
  const state = {
    user: null as MergedPreferences | null,
    nav: null as MergedNavPreferences | null,
    creates: { user: 0, nav: 0 },
    updates: { user: 0, nav: 0 },
    failNext: null as Error | null,
    reads: { user: 0, nav: 0 },
    /** R3 read knobs: `'all'` rejects every read · `'after-first'` lets the first read per table succeed, then rejects. */
    failReads: 'none' as 'none' | 'all' | 'after-first',
    /** R3: while set, every read awaits it (a deferred boot seed). Release with `releaseReads()`. */
    readGate: null as Promise<void> | null,
    releaseReads: () => {},
    /** R5 — `command_bar_history` rows (the service's Drizzle shape: `is_pinned` boolean). */
    history: [] as HistoryRow[],
    /** R5 — `'read'` rejects `getCommandHistory`; `'write'` rejects `recordCommand`/`pinCommand`. */
    failHistory: 'none' as 'none' | 'read' | 'write',
    /** R5 — while set, `getCommandHistory` awaits it (a held read). */
    historyReadGate: null as Promise<void> | null,
    historyCalls: [] as string[],
    /** R5 — `getCommandHistory` calls (reads), separate from the write log above. */
    historyReads: 0,
  }
  /** Close the read gate: reads hang until `state.releaseReads()` (R3 — "Loading holds until the seed settles"). */
  function holdReads() {
    state.readGate = new Promise<void>((r) => {
      state.releaseReads = () => {
        state.readGate = null
        r()
      }
    })
  }
  async function read(t: 'user' | 'nav') {
    state.reads[t]++
    if (state.readGate) await state.readGate
    await tick()
    if (state.failReads === 'all' || (state.failReads === 'after-first' && state.reads[t] > 1)) {
      throw new Error(`fake: ${t} read failed`)
    }
  }
  /** Like the real service: look up by key, then (after an await) insert — a duplicate insert throws (UNIQUE). */
  async function insertHistory(row: HistoryRow) {
    await tick() // the read-then-create window (service.ts recordCommand/pinCommand)
    if (state.history.some((r) => r.command_key === row.command_key)) {
      throw new Error('UNIQUE constraint failed: command_bar_history.command_key')
    }
    state.history.push(row)
  }
  function historyWriteGuard() {
    if (state.failHistory === 'write') throw new Error('fake: history write failed')
  }
  const svc = {
    async recordCommand(command_key: string, command_label: string, command_category?: string | null) {
      state.historyCalls.push(`record:${command_key}`)
      historyWriteGuard()
      const found = state.history.find((r) => r.command_key === command_key)
      if (found) {
        await tick()
        found.use_count += 1
        found.last_used_at = Date.now()
      } else {
        await insertHistory({
          command_key,
          command_label,
          command_category: command_category ?? null,
          use_count: 1,
          last_used_at: Date.now(),
          is_pinned: false,
        })
      }
    },
    async pinCommand(command_key: string, pinned: boolean, command_label?: string, command_category?: string | null) {
      state.historyCalls.push(`pin:${command_key}:${pinned}`)
      historyWriteGuard()
      const found = state.history.find((r) => r.command_key === command_key)
      if (found) {
        await tick()
        found.is_pinned = pinned
      } else if (pinned && command_label !== undefined && command_label.trim() !== '') {
        await insertHistory({
          command_key,
          command_label,
          command_category: command_category ?? null,
          use_count: 0,
          last_used_at: null,
          is_pinned: true,
        })
      }
    },
    async getCommandHistory() {
      state.historyReads++
      if (state.historyReadGate) await state.historyReadGate
      await tick()
      if (state.failHistory === 'read') throw new Error('fake: history read failed')
      return state.history.map((r) => ({ ...r }))
    },
    async getMergedPreferences() {
      await read('user')
      return { ...(state.user ?? USER_PREFERENCES_DEFAULTS) }
    },
    async updatePreferences(patch: Partial<MergedPreferences>) {
      if (state.failNext) {
        const e = state.failNext
        state.failNext = null
        throw e
      }
      const existing = state.user
      await tick() // the read-then-create window
      if (!existing) state.creates.user++
      else state.updates.user++
      state.user = { ...(existing ?? USER_PREFERENCES_DEFAULTS), ...patch }
      return { ...state.user }
    },
    async getNavPreferences() {
      await read('nav')
      return { ...(state.nav ?? NAV_PREFERENCES_DEFAULTS) }
    },
    async updateNavPreferences(patch: Partial<MergedNavPreferences>) {
      if (state.failNext) {
        const e = state.failNext
        state.failNext = null
        throw e
      }
      const existing = state.nav
      await tick()
      if (!existing) state.creates.nav++
      else state.updates.nav++
      state.nav = { ...(existing ?? NAV_PREFERENCES_DEFAULTS), ...patch }
      return { ...state.nav }
    },
  }
  return { svc: svc as unknown as PreferencesService, state, holdReads }
}

/** The fake the composition-root mock serves (module singleton — tests import it from here too). */
export let testPreferences = fakePreferencesService()

/** Fresh fake per test (call in beforeEach when a test needs a clean store). */
export function resetTestPreferences() {
  testPreferences = fakePreferencesService()
  return testPreferences
}

/** The `../db/composition-root` mock: `getServices()` serves the current fake + any extra services. */
export function compositionRootMock(extra: Record<string, unknown> = {}) {
  return {
    getServices: () => Promise.resolve({ preferences: testPreferences.svc, ...extra }),
  }
}
