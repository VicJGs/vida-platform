// preferences-rescope R3 (LIF-247) — the DEV gate hook for the Visual Gate (`?force=…`, the
// gamification/use-currencies.ts:85-91 precedent): forces a preferences read or write failure so the EC-7 states can be
// exercised live, including at boot. Off in production. Its own module so the writer instance and the queries can both
// read it without an import cycle.

export type PrefsForceFlag = 'prefs-read-error' | 'prefs-refetch-error' | 'prefs-write-error'

const FORCE_FLAGS: readonly PrefsForceFlag[] = ['prefs-read-error', 'prefs-refetch-error', 'prefs-write-error']

/** PURE parse of `?force=…`. */
export function parseForceFlag(search: string): PrefsForceFlag | null {
  const f = new URLSearchParams(search).get('force')
  return FORCE_FLAGS.includes(f as PrefsForceFlag) ? (f as PrefsForceFlag) : null
}

/** Read ONCE at module load — a boot-time flag, not a render-time read. Off in production; safe in node-env tests. */
export const FORCED_PREFS_FAILURE: PrefsForceFlag | null =
  process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' ? parseForceFlag(window.location.search) : null
