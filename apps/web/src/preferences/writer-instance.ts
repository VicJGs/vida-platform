// preferences-rescope R2 (LIF-247) — the app's ONE preferences writer, over the composition-root service and the
// `lib/query-client` singleton. Import the write path from here (F10): writePreferences · writeNavPreferences ·
// patchDashboardLayout · patchModuleNames · setModuleVisibilityMap · flushAll. Never call the raw service to write.
// R3: confirmed user rows feed the device-local theme hint (DB truth only), and every failed batch raises ONE revert
// toast — from here, so it reports whichever surface (or none) is mounted (PR-4: a change is never silently dropped).
import type { PreferencesService } from '@vida/core'
import { toast } from '@vida/ui'
import type { MergedPreferences } from '@vida/types'
import { getServices } from '../db/composition-root'
import { queryClient } from '../lib/query-client'
import { SETTINGS_COPY } from '../settings/settings-copy'
import { FORCED_PREFS_FAILURE } from './force-flag'
import { createPreferencesWriter } from './preferences-writer'
import { writeThemeHint } from './theme-hint'

/** PR-4: auto-save batched 500 ms after the last change. */
export const PREFERENCES_DEBOUNCE_MS = 500

/** DEV `?force=prefs-write-error`: writes reject inside the queue's write, so the writer still classifies + reverts. */
function withForcedWriteFailure(svc: PreferencesService): PreferencesService {
  if (FORCED_PREFS_FAILURE !== 'prefs-write-error') return svc
  const fail = async (): Promise<never> => {
    throw new Error('forced: prefs-write-error')
  }
  return { ...svc, updatePreferences: fail, updateNavPreferences: fail }
}

export const preferencesWriter = createPreferencesWriter({
  getService: async () => withForcedWriteFailure((await getServices()).preferences),
  queryClient,
  debounceMs: PREFERENCES_DEBOUNCE_MS,
  onConfirmed: (t, row) => {
    if (t === 'user') writeThemeHint(row as MergedPreferences)
  },
  onFailed: () => {
    toast({ intent: 'danger', title: SETTINGS_COPY.saveFailedTitle, description: SETTINGS_COPY.saveFailedBody })
  },
})

/** Tests only — clear writer state between tests (pair with `queryClient.clear()`). */
export function resetPreferencesWriterForTests(): void {
  preferencesWriter.reset()
}
