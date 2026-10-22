// preferences-rescope R2 (LIF-247) — the app's ONE preferences writer, over the composition-root service and the
// `lib/query-client` singleton. Import the write path from here (F10): writePreferences · writeNavPreferences ·
// patchDashboardLayout · patchModuleNames · setModuleVisibilityMap · flushAll. Never call the raw service to write.
import { getServices } from '../db/composition-root'
import { queryClient } from '../lib/query-client'
import { createPreferencesWriter } from './preferences-writer'

/** PR-4: auto-save batched 500 ms after the last change. */
export const PREFERENCES_DEBOUNCE_MS = 500

export const preferencesWriter = createPreferencesWriter({
  getService: async () => (await getServices()).preferences,
  queryClient,
  debounceMs: PREFERENCES_DEBOUNCE_MS,
})

/** Tests only — clear writer state between tests (pair with `queryClient.clear()`). */
export function resetPreferencesWriterForTests(): void {
  preferencesWriter.reset()
}
