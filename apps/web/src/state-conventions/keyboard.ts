// ============================================================================
// Keyboard model — UX-4 (LIF-93). The app-wide keyboard/focus CONVENTION as typed
// data, so every surface manages focus identically. This does NOT restate a new
// scheme — it encodes the engineering §XIV focus contract as one referenceable
// source, alongside the UX-2 command-bar focus contract (enter-on-open,
// restore-on-close, visible ring).
//
// Keybind-as-data: the concrete pattern lives at `../command-bar/types.ts`
// (`resolveKeybind(platform) → CommandKeybind`, always `preventDefault`). UX-4
// owns NO concrete global keybind — ⌘K is UX-2's. This file provides the shared
// FOCUS constants; a new app-level keybind (if one is ever added) follows the
// command-bar `resolveKeybind` data pattern, not a hardcoded handler.
// Data only — no chrome, no handlers.
// ============================================================================

/**
 * Where focus goes at each interaction transition (engineering §XIV). Values are
 * intent tokens the render layer (UI-4 / each module) resolves to a real element —
 * this is the contract, not the DOM call.
 */
export const FOCUS_CONTRACT = {
  /** Overlay (modal/dialog/drawer) opens → focus the first focusable inside. */
  overlayOpen: 'first-focusable',
  /** Overlay closes → focus returns to the element that triggered it. */
  overlayClose: 'trigger',
  /** Page-level navigation resolves → focus the main heading / top of content. */
  pageNav: 'main-heading',
  /** Tab change → focus the selected tab's panel. */
  tabChange: 'panel',
  /** Toast appears → focus is NOT moved (announced via aria-live only). */
  toastAppear: 'none',
} as const

export type FocusTransition = keyof typeof FOCUS_CONTRACT
export type FocusTarget = (typeof FOCUS_CONTRACT)[FocusTransition]

/**
 * Global overlay dismissal: Escape closes every overlay (modal, drawer, dropdown,
 * popover). Encoded as data so the convention is one source, not per-component lore.
 */
export const OVERLAY_DISMISS = {
  escape: true,
} as const
