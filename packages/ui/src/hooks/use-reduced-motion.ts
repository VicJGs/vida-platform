import { createContext, useContext, useSyncExternalStore } from 'react'

/**
 * The in-app reduce-motion preference, provided by `UIProvider` from its `reduceMotion` prop (preferences-rescope R4,
 * PLAN-R4 R4-BR-3/5). Default `false`: a primitive rendered without a provider keeps OS-only behaviour.
 * The same prop also writes `<html data-vida-motion>` for the CSS gates — one source, two carriers (D-R4-1): CSS can only
 * read the DOM, while JS reads this context DURING render, so the very first render is already right.
 */
export const ReducedMotionContext = createContext(false)

const QUERY = '(prefers-reduced-motion: reduce)'
const hasMatchMedia = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'

// The MediaQueryList is read per call, never cached at module scope, so a per-test `matchMedia` stub still applies.
function subscribe(onChange: () => void): () => void {
  if (!hasMatchMedia()) return () => {}
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
const getSnapshot = () => (hasMatchMedia() ? window.matchMedia(QUERY).matches : false)
const getServerSnapshot = () => false

/**
 * Whether motion should reduce: the OS `prefers-reduced-motion: reduce` query OR the in-app preference
 * (motion.md §Reduced Motion — every animation must have an instant alternative). The preference only ADDS reduction;
 * off never forces motion (R4-BR-6). SSR / no-`matchMedia` safe (`false`).
 *
 * **The codec `ReducedMotion` primitive** (fe-codec-patterns S2 — RATIFY). The B12 reduced-motion contract is
 * enforced two ways; downstream `fe-*` surfaces inherit these, they do NOT reinvent:
 *   - JS-driven: gate the Tamagui `animation` prop — `animation={useReducedMotion() ? undefined : 'moderate'}`.
 *   - CSS-driven: the primitive's injected `internal/*-styles.ts` emits its reduced rule through
 *     `reducedMotionCss(selectors, declarations)` (`internal/reduced-motion-css.ts`), which writes BOTH triggers — the
 *     OS media query and the `[data-vida-motion="reduce"]` twin. Never hand-write the media query (a guard test fails it).
 */
export function useReducedMotion(): boolean {
  const preference = useContext(ReducedMotionContext)
  const os = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return preference || os
}
