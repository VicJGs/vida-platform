// preferences-rescope R3 (IMPL-PLAN-R3 step 3) — one read definition per table, shared by the hook and the boot seed;
// the seed never rejects (a failed boot read must not block boot, MUST-4); the DEV force flag is a pure parse.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../db/composition-root', async () => (await import('../test/preferences-test-utils')).compositionRootMock())

import { queryClient } from '../lib/query-client'
import { resetTestPreferences, testPreferences } from '../test/preferences-test-utils'
import { COMMANDS_KEY, NAV_PREFS_KEY, PREFERENCES_GC_MS, PREFERENCES_STALE_MS, USER_PREFS_KEY } from './preferences-keys'
import {
  commandHistoryQuery,
  navPreferencesQuery,
  parseForceFlag,
  seedPreferences,
  userPreferencesQuery,
} from './preferences-queries'
import { resetPreferencesWriterForTests } from './writer-instance'

beforeEach(() => {
  resetTestPreferences()
})
afterEach(() => {
  queryClient.clear()
  resetPreferencesWriterForTests()
})

describe('seedPreferences', () => {
  it('fills both keys from the service before resolving', async () => {
    testPreferences.state.user = { ...(await testPreferences.svc.getMergedPreferences()), theme: 'dark' }
    testPreferences.state.reads.user = 0
    await seedPreferences(queryClient)
    expect(queryClient.getQueryData<{ theme: string }>(USER_PREFS_KEY)?.theme).toBe('dark')
    expect(queryClient.getQueryData(NAV_PREFS_KEY)).toBeDefined()
  })

  it('a rejecting read still resolves the seed; both queries are left in error; retry 0 = one call per key', async () => {
    testPreferences.state.failReads = 'all'
    await expect(seedPreferences(queryClient)).resolves.toBeUndefined()
    expect(queryClient.getQueryState(USER_PREFS_KEY)?.status).toBe('error')
    expect(queryClient.getQueryState(NAV_PREFS_KEY)?.status).toBe('error')
    expect(testPreferences.state.reads).toEqual({ user: 1, nav: 1 })
  })
})

describe('query definitions (PLAN-R3 rev 2.2)', () => {
  it('never re-read an errored query when a reader mounts — recovery is the Retry (state-conventions §3)', () => {
    expect(userPreferencesQuery().retryOnMount).toBe(false)
    expect(navPreferencesQuery().retryOnMount).toBe(false)
  })
})

// preferences-rescope R5 (R5-BR-5) — ⌘K history: one read definition, its own cache category, never part of the boot seed.
describe('commandHistoryQuery', () => {
  it('is the exact commands key with its own stale/gc, no retry, no retry-on-mount', () => {
    const q = commandHistoryQuery()
    expect(q.queryKey).toEqual(COMMANDS_KEY)
    expect(q).toMatchObject({ retryOnMount: false, retry: 0, staleTime: PREFERENCES_STALE_MS, gcTime: PREFERENCES_GC_MS })
  })

  it('reads the service rows mapped to the palette contract (is_pinned → 0|1)', async () => {
    testPreferences.state.history = [
      { command_key: 'nav:/tasks', command_label: 'Tasks', command_category: 'navigation', use_count: 3, last_used_at: 9, is_pinned: true },
    ]
    const rows = await queryClient.fetchQuery(commandHistoryQuery())
    expect(rows).toEqual([
      { command_key: 'nav:/tasks', command_label: 'Tasks', command_category: 'navigation', use_count: 3, last_used_at: 9, is_pinned: 1 },
    ])
  })

  it('is not part of the boot seed (⌘K is not first paint)', async () => {
    const spy = vi.spyOn(testPreferences.svc, 'getCommandHistory')
    await seedPreferences(queryClient)
    expect(spy).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(COMMANDS_KEY)).toBeUndefined()
  })
})

describe('parseForceFlag (DEV gate hook)', () => {
  it.each([
    ['?force=prefs-read-error', 'prefs-read-error'],
    ['?force=prefs-refetch-error', 'prefs-refetch-error'],
    ['?a=1&force=prefs-write-error', 'prefs-write-error'],
    ['?force=loading', null],
    ['', null],
  ])('%s → %s', (search, expected) => {
    expect(parseForceFlag(search)).toBe(expected)
  })
})
