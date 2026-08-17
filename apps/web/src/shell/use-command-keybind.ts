// UI-4 · S3 (LIF-89) — the global launcher keybind (S3-BR-f; the listener S2 explicitly ceded to S3, global-bar.tsx:5-6).
// A `document`-level keydown listener that opens the overlay on **EITHER platform mod (⌘ OR Ctrl) + K**, always
// `preventDefault` (avoid the browser-native ⌘K/Ctrl+K collision). It is OPEN-ONLY — not a toggle: Esc / backdrop close
// (Dialog contract), so the combo while already open is a documented no-op (the model's opens/Esc-closes grammar,
// command-bar-and-search.md:30-32). Reads the store imperatively via `getState()` so the effect deps stay `[]` (the
// registry-action precedent) — one listener for the mount's lifetime, no re-subscribe on state change.
//
// ⚠ LENIENT MOD MATCH (Visual-Gate fix, 2026-08-17): matching only the platform-resolved mod (⌘ on mac / Ctrl else)
// depended on `navigator`-based platform detection, which is FRAGILE — Brave's fingerprint shields can farble
// `navigator.platform`/`userAgent`, so detection resolved 'other' on a real Mac and the listener ignored ⌘K (the
// button worked, the shortcut didn't). Neither combo collides with an action we must preserve (we preventDefault), so
// accepting BOTH is strictly more robust. `resolveKeybind` still owns the CANONICAL binding (the ⌘K/Ctrl+K hint the UI
// renders) — this listener just doesn't gate reachability on which one the OS reports. [§XXVIII deviation]
import { useEffect } from 'react'
import { resolveKeybind } from '../command-bar/types'
import { useCommandBarUIStore } from '../stores/command-bar-ui-store'
import { detectPlatform } from '../lib/platform'

export function useCommandKeybind(): void {
  useEffect(() => {
    const bind = resolveKeybind(detectPlatform()) // canonical binding — its `key` ('k') + `preventDefault`
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== bind.key) return
      if (!(e.metaKey || e.ctrlKey)) return // EITHER mod — reachability must not hinge on fragile platform detection
      if (bind.preventDefault) e.preventDefault()
      useCommandBarUIStore.getState().open()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])
}
