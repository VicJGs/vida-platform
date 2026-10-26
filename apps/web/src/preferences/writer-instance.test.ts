// @vitest-environment jsdom
// preferences-rescope R3 (IMPL-PLAN-R3 step 4) — the app writer's wiring: confirmed user rows → the theme hint;
// a failed batch → ONE revert toast (whoever is mounted); an optimistic write that fails never touches the hint.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const toastSpy = vi.hoisted(() => vi.fn())
vi.mock('@vida/ui', async (orig) => ({ ...(await orig<typeof import('@vida/ui')>()), toast: toastSpy }))
vi.mock('../db/composition-root', async () => (await import('../test/preferences-test-utils')).compositionRootMock())

import { queryClient } from '../lib/query-client'
import { resetTestPreferences, testPreferences } from '../test/preferences-test-utils'
import { SETTINGS_COPY } from '../settings/settings-copy'
import { seedPreferences } from './preferences-queries'
import { THEME_HINT_KEY } from './theme-hint'
import { preferencesWriter, resetPreferencesWriterForTests } from './writer-instance'

const hint = () => JSON.parse(localStorage.getItem(THEME_HINT_KEY) ?? 'null') as { scheme: string } | null

beforeEach(async () => {
  resetTestPreferences()
  localStorage.clear()
  toastSpy.mockClear()
  await seedPreferences(queryClient)
})
afterEach(() => {
  queryClient.clear()
  resetPreferencesWriterForTests()
})

describe('writer-instance wiring (R3)', () => {
  it('the boot read writes the hint from the confirmed row', () => {
    expect(hint()?.scheme).toBe('light') // fresh vault: theme 'system' → light
  })

  it('a successful write updates the hint from the DB result', async () => {
    await preferencesWriter.writePreferences({ theme: 'dark' })
    expect(hint()?.scheme).toBe('dark')
    expect(toastSpy).not.toHaveBeenCalled()
  })

  it('an optimistic dark write that FAILS leaves the hint light, and toasts exactly once with the revert copy', async () => {
    testPreferences.state.failNext = new Error('boom')
    await preferencesWriter.writePreferences({ theme: 'dark' }).catch(() => {})
    expect(hint()?.scheme).toBe('light')
    expect(toastSpy).toHaveBeenCalledTimes(1)
    expect(toastSpy).toHaveBeenCalledWith({
      intent: 'danger',
      title: SETTINGS_COPY.saveFailedTitle,
      description: SETTINGS_COPY.saveFailedBody,
    })
  })
})
