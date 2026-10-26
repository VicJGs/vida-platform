// @vitest-environment jsdom
// preferences-rescope R2 (LIF-247) — the live read/write hooks (PLAN-R2 §4.4).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

vi.mock('../db/composition-root', async () => (await import('../test/preferences-test-utils')).compositionRootMock())

import { queryClient } from '../lib/query-client'
import { createPrefsWrapper, resetTestPreferences, testPreferences } from '../test/preferences-test-utils'
import { resetPreferencesWriterForTests, preferencesWriter } from './writer-instance'
import { updateView, usePreferences, useUpdatePreferences } from './use-preferences'
import { NAV_PREFS_KEY } from './preferences-keys'
import { seedPreferences } from './preferences-queries'

const wrapper = createPrefsWrapper()

beforeEach(() => {
  resetTestPreferences()
})

afterEach(() => {
  queryClient.clear()
  resetPreferencesWriterForTests()
})

describe('usePreferences', () => {
  it('R3 hasData: false while loading/first-read error; true after success, and KEPT through a later refetch error', async () => {
    const { result } = renderHook(() => usePreferences(), { wrapper })
    expect(result.current.hasData).toBe(false)
    await waitFor(() => expect(result.current.state).toBe('success'))
    expect(result.current.hasData).toBe(true)
    testPreferences.state.failReads = 'all'
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: NAV_PREFS_KEY }).catch(() => {})
    })
    await waitFor(() => expect(result.current.state).toBe('error'), { timeout: 3000 })
    expect(result.current.hasData).toBe(true) // the last good view is shown → the "last loaded" copy
  })

  it('R3 hasData is false when only ONE table has data (the "last loaded" copy would be partly false)', async () => {
    testPreferences.state.failReads = 'all'
    await seedPreferences(queryClient) // both error, no data
    testPreferences.state.failReads = 'none'
    await queryClient.fetchQuery({ queryKey: ['preferences', 'user'], queryFn: () => testPreferences.svc.getMergedPreferences() })
    testPreferences.state.failReads = 'all'
    const { result } = renderHook(() => usePreferences(), { wrapper })
    await waitFor(() => expect(result.current.state).toBe('error'), { timeout: 3000 })
    expect(result.current.hasData).toBe(false)
  })

  it('goes loading → success with the persisted view', async () => {
    testPreferences.state.user = { ...(await testPreferences.svc.getMergedPreferences()), date_format: 'DD/MM/YYYY' }
    const { result } = renderHook(() => usePreferences(), { wrapper })
    expect(result.current.state).toBe('loading')
    await waitFor(() => expect(result.current.state).toBe('success'))
    expect(result.current.view.dateFormat).toBe('DD/MM/YYYY')
  })

  it('reports error (with defaults to render read-only) when a read rejects', async () => {
    vi.spyOn(testPreferences.svc, 'getNavPreferences').mockRejectedValue(new Error('read failed'))
    const { result } = renderHook(() => usePreferences(), { wrapper })
    await waitFor(() => expect(result.current.state).toBe('error'), { timeout: 4_000 })
    expect(result.current.view.dateFormat).toBe('YYYY-MM-DD')
  })
})

describe('useUpdatePreferences', () => {
  it("is 'saving' through the debounce, then 'saved', and the read reflects the write", async () => {
    const { result } = renderHook(() => ({ read: usePreferences(), write: useUpdatePreferences() }), { wrapper })
    await waitFor(() => expect(result.current.read.state).toBe('success'))
    let done!: Promise<void>
    act(() => {
      done = result.current.write.update({ timeFormat: '12h' })
    })
    expect(result.current.write.saveState).toBe('saving')
    expect(result.current.read.view.timeFormat).toBe('12h') // optimistic
    await act(async () => {
      await done
    })
    expect(result.current.write.saveState).toBe('saved')
    expect(testPreferences.state.user?.time_format).toBe('12h')
  })

  it('drops an identical patch (no echo write)', async () => {
    const { result } = renderHook(() => ({ read: usePreferences(), write: useUpdatePreferences() }), { wrapper })
    await waitFor(() => expect(result.current.read.state).toBe('success'))
    await act(async () => {
      await result.current.write.update({ dateFormat: 'YYYY-MM-DD', reduceMotion: false })
    })
    await preferencesWriter.flushAll()
    expect(testPreferences.state.creates.user + testPreferences.state.updates.user).toBe(0)
    expect(testPreferences.state.creates.nav + testPreferences.state.updates.nav).toBe(0)
    expect(result.current.write.saveState).toBe('idle')
  })

  it("a rejected write → 'error' + a typed lastError, and the view reverts", async () => {
    const { result } = renderHook(() => ({ read: usePreferences(), write: useUpdatePreferences() }), { wrapper })
    await waitFor(() => expect(result.current.read.state).toBe('success'))
    testPreferences.state.failNext = new Error('Invalid preferences patch: time_format')
    await act(async () => {
      await result.current.write.update({ timeFormat: '12h' })
    })
    expect(result.current.write.saveState).toBe('error')
    expect(result.current.write.lastError?.kind).toBe('validation')
    await waitFor(() => expect(result.current.read.view.timeFormat).toBe('24h'))
  })

  it('aggregates a patch spanning both tables (user + nav) into one save state', async () => {
    const { result } = renderHook(() => ({ read: usePreferences(), write: useUpdatePreferences() }), { wrapper })
    await waitFor(() => expect(result.current.read.state).toBe('success'))
    await act(async () => {
      await result.current.write.update({ dateFormat: 'MM/DD/YYYY', reduceMotion: true })
    })
    expect(result.current.write.saveState).toBe('saved')
    expect(testPreferences.state.user?.date_format).toBe('MM/DD/YYYY')
    expect(testPreferences.state.nav?.reduce_motion).toBe(true)
  })

  it('BR-PREF-6 via update(): a hidden Settings/Home key → error + validation, nothing written', async () => {
    const { result } = renderHook(() => ({ read: usePreferences(), write: useUpdatePreferences() }), { wrapper })
    await waitFor(() => expect(result.current.read.state).toBe('success'))
    await act(async () => {
      await result.current.write.update({ moduleVisibility: { journals: false } })
    })
    expect(result.current.write.saveState).toBe('error')
    expect(result.current.write.lastError?.kind).toBe('validation')
    expect(testPreferences.state.user).toBeNull()
  })
})

describe('updateView (R3 — the module-level write the Settings context defaults to)', () => {
  it('writes through the writer and drops echo patches', async () => {
    await seedPreferences(queryClient)
    await updateView({ timeFormat: '12h' })
    expect(testPreferences.state.user?.time_format).toBe('12h')
    const before = testPreferences.state.updates.user + testPreferences.state.creates.user
    await updateView({ timeFormat: '12h' }) // equal to the cache → no write
    expect(testPreferences.state.updates.user + testPreferences.state.creates.user).toBe(before)
  })
})
