// fe-onboarding (LIF-216) · S3 — the theme-preset selection + the live-preview / persist SEAM (seam-contract Seam B).
// The live preview is REAL in M1 (IR4): selecting a preset drives the app-owned `UIProvider selection` lever, injected
// here as `onPreview` (the flow's app-mount wires it to the app selection state — S4). `commit` is the deferred persist
// (M1 stub no-op; live = the theme-switcher Zustand store [FACT: apps/web/src/App.tsx:63 cold-start THEME_DEFAULT only]).
// Reuses the shipped `THEME_PRESETS`/`ThemePreset`/`THEME_DEFAULT` (fe-codec-theme) — no new theme state.
import { useCallback, useState } from 'react'
import { THEME_DEFAULT, type ThemePreset } from '@vida/ui'

/** The theme-preset write the user drives in Step 2 (seam-contract Seam B). */
export interface ThemePersistWrite {
  /** Select + live-preview a preset — drives the app-owned selection lever (works in M1, IR4). */
  readonly preview: (preset: ThemePreset) => void
  /** Finalize the chosen preset. M1 stub: resolves no-op; live = the theme-switcher store. */
  readonly commit: (preset: ThemePreset) => Promise<void>
}

export interface UseThemeSelection extends ThemePersistWrite {
  /** The currently selected preset (reflects in the picker). Starts at `initial` or the cold-start default. */
  readonly selected: ThemePreset
}

export function useThemeSelection(opts?: {
  initial?: ThemePreset
  /** The app-owned selection lever (sets `<UIProvider selection>` preset). Absent in isolation → reflect-only. */
  onPreview?: (preset: ThemePreset) => void
}): UseThemeSelection {
  const [selected, setSelected] = useState<ThemePreset>(opts?.initial ?? THEME_DEFAULT.preset)
  const onPreview = opts?.onPreview

  const preview = useCallback(
    (preset: ThemePreset) => {
      setSelected(preset)
      onPreview?.(preset) // the live lever — re-roots the app theme (S4 app-mount wires it)
    },
    [onPreview],
  )

  // M1 stub: no persistence store yet, so resolve without claiming a save. Signature-stable for the live M1.1 swap.
  const commit = useCallback((_preset: ThemePreset) => Promise.resolve(), [])

  return { selected, preview, commit }
}
