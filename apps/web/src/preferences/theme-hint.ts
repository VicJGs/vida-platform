// ============================================================================
// Theme hint — preferences-rescope R3 (LIF-247), PLAN-R3 R3-BR-4 (B6 option a).
//
// A DEVICE-LOCAL paint cache, so a reload paints the persisted theme from the
// very first frame (IR-4) — before React, before the DB opens. It is NOT a
// source: it is derived from SQLite, written ONLY from confirmed DB rows (the
// writer's onConfirmed — never an optimistic or reverted value), and read ONLY by
// the inline <script id="vida-theme-hint"> in index.html. The app never reads it
// (BR-RT-7: the one cross-session value outside SQLite, documented as such).
//
// It stores RESOLVED colours, not a theme name, so the inline script needs no
// palette. Tamagui theme values are `Variable` objects (createTokens), so the hex
// is read with getVariableValue — stringifying the object would store `{…}` and
// the script would silently reject every hint.
// ============================================================================

import { getVariableValue } from '@tamagui/core'
import {
  dark,
  dark_game,
  dark_quietDesk,
  dark_reader,
  light,
  light_game,
  light_quietDesk,
  light_reader,
  resolveTheme,
  type ThemeName,
  type ThemeSelection,
} from '@vida/ui'
import { NAV_PREFERENCES_DEFAULTS } from '@vida/core'
import type { MergedPreferences } from '@vida/types'
import { toView } from './preferences-view'

/** Duplicated in index.html's inline script (it can't import) — `index-hint-script.test.ts` asserts they match. */
export const THEME_HINT_KEY = 'vida.theme-hint.v1'

export interface ThemeHint {
  scheme: 'light' | 'dark'
  bg: string
  fg: string
}

// Every ThemeName, explicitly (the barrel re-exports each theme constant; there is no aggregate map). A missing name is a
// type error. `resolveTheme` maps editorial to the bare `light`/`dark` themes.
const THEMES = {
  light,
  dark,
  light_reader,
  dark_reader,
  light_quietDesk,
  dark_quietDesk,
  light_game,
  dark_game,
} satisfies Record<ThemeName, { colorSurfacePrimary: unknown; colorTextPrimary: unknown }>

function hex(v: unknown): string {
  const value: unknown = getVariableValue(v)
  if (typeof value !== 'string') throw new Error(`theme-hint: a theme colour did not resolve to a string (${String(value)})`)
  return value
}

export function toThemeHint(selection: ThemeSelection): ThemeHint {
  const theme = THEMES[resolveTheme(selection).themeName]
  return { scheme: selection.mode, bg: hex(theme.colorSurfacePrimary), fg: hex(theme.colorTextPrimary) }
}

/** The writer's onConfirmed target for the user table: mirror the CONFIRMED row's theme. Blocked storage → no-op. */
export function writeThemeHint(row: MergedPreferences): void {
  try {
    const hint = toThemeHint(toView(row, NAV_PREFERENCES_DEFAULTS).selection)
    localStorage.setItem(THEME_HINT_KEY, JSON.stringify(hint))
  } catch {
    /* a convenience mirror: private mode / blocked storage just means the next boot frame is the browser default */
  }
}

/** Paint the canvas (`<html>`) — the inline script does this pre-React; App keeps it following the live selection. */
export function paintRoot(hint: ThemeHint): void {
  const s = document.documentElement.style
  s.backgroundColor = hint.bg
  s.color = hint.fg
  s.colorScheme = hint.scheme
}
