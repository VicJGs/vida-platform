// ============================================================================
// useActivePreset — read the globally-active theme preset (fe-gamification ② · S1).
//
// The System responds to the active preset (EC-4: the game preset shows XP as a ring, the calm presets a
// bar) — it READS, never SETS (GM-16: the System does not own theming; the picker is Preferences/Onboarding's).
// There is no global preset STORE yet (the Zustand switcher is deferred to Settings), but the provider already
// writes the truth to the DOM: `applyPresetClass` puts `t_<preset>` on <body> (editorial = the bare base, no
// class) — provider.tsx. So the M1 signal is that class — the "read what the provider resolved" idea one level
// up from the getComputedStyle probes (a class, not a computed color).
//
// A MutationObserver on <body class> keeps it live so onboarding/Settings preview re-roots the ring instantly.
// SSR/jsdom-guarded (no `document` → editorial).
// ============================================================================
import { useEffect, useState } from 'react'
import type { ThemePreset } from '@vida/ui'

function readPreset(): ThemePreset {
  if (typeof document === 'undefined') return 'editorial'
  const cl = document.body.classList
  if (cl.contains('t_game')) return 'game'
  if (cl.contains('t_reader')) return 'reader'
  if (cl.contains('t_quietDesk')) return 'quietDesk'
  return 'editorial' // the bare scheme base carries no preset class (provider.tsx)
}

/** The active theme preset, read from the provider-applied `<body>` class and kept live. */
export function useActivePreset(): ThemePreset {
  const [preset, setPreset] = useState<ThemePreset>(readPreset)

  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return
    // Re-sync once on mount (the lazy initializer ran during render, before the body class may have settled).
    setPreset(readPreset())
    const obs = new MutationObserver(() => setPreset(readPreset()))
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  return preset
}
