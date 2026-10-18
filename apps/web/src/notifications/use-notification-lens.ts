// ============================================================================
// useNotificationLens — the user's chosen notifications LENS (fe-notifications ② · S1).
//
// The Envision decision: the user picks how their System speaks to them (Margin · Dispatches ·
// Constellation). Persisted LOCALLY — an app-local UI preference, NOT a `@vida/core`/Preferences schema
// field (keeps this unit frontend-only; sync-deferred like every M1 write). Default = The Margin.
// localStorage is the device-local store at M1; a live swap to `user_preferences` is a later concern.
// ============================================================================
import { useCallback, useEffect, useState } from 'react'
import { NOTIFICATION_LENSES, type NotificationLens } from './attention-model'

const KEY = 'vida:notifications:lens'
const DEFAULT_LENS: NotificationLens = 'margin'

function isLens(v: unknown): v is NotificationLens {
  return typeof v === 'string' && (NOTIFICATION_LENSES as readonly string[]).includes(v)
}

function read(): NotificationLens {
  if (typeof window === 'undefined') return DEFAULT_LENS
  // a `?lens=` override drives the Visual Gate deterministically (DEV affordance, same shape as `?sample`).
  const forced = new URLSearchParams(window.location.search).get('lens')
  if (isLens(forced)) return forced
  try {
    const stored = window.localStorage.getItem(KEY)
    return isLens(stored) ? stored : DEFAULT_LENS
  } catch {
    return DEFAULT_LENS
  }
}

export interface LensControl {
  lens: NotificationLens
  setLens: (l: NotificationLens) => void
}

export function useNotificationLens(): LensControl {
  const [lens, setLensState] = useState<NotificationLens>(DEFAULT_LENS)

  // resolve the persisted value after mount (SSR/first-paint-safe; avoids a hydration mismatch).
  useEffect(() => {
    setLensState(read())
  }, [])

  const setLens = useCallback((l: NotificationLens) => {
    setLensState(l)
    try {
      window.localStorage.setItem(KEY, l)
    } catch {
      // private-mode / storage-disabled → the choice holds for the session, just isn't persisted.
    }
  }, [])

  return { lens, setLens }
}
