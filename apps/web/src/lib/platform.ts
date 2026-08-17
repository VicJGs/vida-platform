// UI-4 · S3 (LIF-89) — platform detection for the ⌘K keybind (S3-BR-f). Isolated so the keybind hook + its tests
// never touch `navigator` directly. Resolves the `Platform` union that `resolveKeybind` (command-bar/types.ts)
// consumes: 'mac' → ⌘+K, 'other' → Ctrl+K.
import type { Platform } from '../command-bar/types'

/** Detect the host platform for the command-bar keybind. SSR / unknown navigator → 'other' (Ctrl+K). */
export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other'
  const source = navigator.platform || navigator.userAgent || ''
  return /Mac|iP(hone|ad|od)/.test(source) ? 'mac' : 'other'
}
