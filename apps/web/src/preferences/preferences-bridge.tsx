// ============================================================================
// Preferences bridge — preferences-rescope R2 (LIF-247), PLAN-R2 R2-BR-7/10.
//
// TRANSITIONAL MIRROR: until each pane moves onto the seam (R3/R5/R6 — R6 deletes
// the store), today's panes still read `preferences-store`. This keeps it hydrated
// from the persisted view — only after BOTH reads succeed, and only the fields whose
// value changed since the last hydrate (so a write to one field never wipes another
// pane's in-session edit; R6 deletes the mirror). It also owns the hide flush: on `visibilitychange: hidden`
// and `pagehide` every pending debounced write is sealed and sent while the page is
// still alive (a transaction can't finish after unload — BR-RT-TEARDOWN).
// Mounted once, under QueryClientProvider, in App.tsx.
// ============================================================================

import { useEffect, useRef } from 'react'
import { usePreferencesStore } from '../stores/preferences-store'
import { usePreferences } from './use-preferences'
import type { PreferencesView } from './preferences-view'
import { preferencesWriter } from './writer-instance'

/** The 7 fields `preferences-store` mirrors (view key = store key; R3 moved `arrangement`, R4 `reduceMotion` and R5 the
 *  module maps to the live read). R6 moves the rest and deletes the store. */
const MIRRORED = [
  'dateFormat',
  'timeFormat',
  'weekStartsOn',
  'notifInApp',
  'notifPush',
  'notifEmail',
  'quietHours',
] as const satisfies readonly (keyof PreferencesView)[]

type Mirrored = (typeof MIRRORED)[number]

const same = (a: unknown, b: unknown) =>
  a === b || (typeof a === 'object' && a !== null && JSON.stringify(a) === JSON.stringify(b))

export function PreferencesBridge(): null {
  const { view, state } = usePreferences()
  const last = useRef<PreferencesView | null>(null)

  useEffect(() => {
    if (state !== 'success') return
    const prev = last.current
    const changed: Partial<Pick<PreferencesView, Mirrored>> = {}
    for (const key of MIRRORED) {
      if (!prev || !same(prev[key], view[key])) (changed as Record<string, unknown>)[key] = view[key]
    }
    last.current = view
    if (Object.keys(changed).length > 0) usePreferencesStore.getState().hydrate(changed)
  }, [state, view])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void preferencesWriter.flushAll()
    }
    const onPageHide = () => void preferencesWriter.flushAll()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [])

  return null
}
