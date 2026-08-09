import { useEffect, useState } from 'react'

/**
 * Tracks the `prefers-reduced-motion: reduce` media query.
 * Shared by primitives that animate (motion.md §Reduced Motion — every animation must have an instant
 * alternative). SSR-safe: returns `false` until mounted (Vida is a non-SSR SPA, but the guard keeps it inert
 * anywhere `window` is absent — e.g. the node-env vitest run).
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}
