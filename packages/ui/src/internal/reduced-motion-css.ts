// preferences-rescope R4 (LIF-247) — the B12 reduced-motion gate, ONE source for every injected style module.
//
// Motion reduces when the OS asks (`prefers-reduced-motion: reduce`) OR the user turned on the in-app preference, which
// UIProvider writes to <html data-vida-motion="reduce"> (PLAN-R4 R4-BR-3/4). CSS can't OR a media query with a selector,
// so each gate is two rules with the same declarations; emitting both from one `body` means they can't drift. The twin
// adds one attribute selector (0,1,0) to its base, so it wins by specificity, and <html> is an ancestor of every
// body-portalled surface. New gates MUST use this helper — `reduced-motion-css.test.ts` fails any other file that names
// the media query.

export const MOTION_ATTR = 'data-vida-motion'
export const MOTION_REDUCE = 'reduce'
export const MOTION_FULL = 'full'

const TWIN = `[${MOTION_ATTR}="${MOTION_REDUCE}"]`

/** The reduced-motion alternative for `selectors` (an instant state change, motion.md §Reduced Motion). */
export function reducedMotionCss(selectors: readonly string[], declarations: string): string {
  const body = `{${declarations}}`
  return (
    `@media (prefers-reduced-motion: reduce){${selectors.join(',')}${body}}` +
    `${selectors.map((s) => `${TWIN} ${s}`).join(',')}${body}`
  )
}
