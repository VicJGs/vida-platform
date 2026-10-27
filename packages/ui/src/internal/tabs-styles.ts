import { motion } from '../themes/motion'
import { reducedMotionCss } from './reduced-motion-css'

// Injected CSS for the Tabs primitive — the pieces a Tamagui styled(View) can't express: the indicator's
// transform-only transition (the B12 showcase), the panel enter-fade, and the hover label-strengthen. Reads the
// motion.ts foundation (the shipped select/card precedent). Appended after Tamagui's sheet so equal-specificity ties
// fall to us by source order; the :hover descendant selector also out-specifies Tamagui's atomic color class.
// Idempotent, browser-only.
//
// B12: ONLY transform (indicator) + opacity (panel) animate. The indicator's WIDTH/HEIGHT resize is an INSTANT
// inline-style swap (no transition) — the transform slide is the only animated property. The hover label colour is an
// instant swap. Reduced-motion drops every transition/animation → instant (motion §Reduced).

let injected = false

export function ensureTabsStyles(): void {
  if (injected || typeof document === 'undefined') return
  injected = true
  const move = `transform ${motion.duration.moderate}ms ${motion.easing.inOut}`
  const fade = `${motion.duration.fast}ms ${motion.easing.out}`
  const style = document.createElement('style')
  style.setAttribute('data-vida-tabs', '')
  style.textContent = [
    // Indicator: transform-only transition. NO transition until measured once (data-ready flips true after first
    // paint) → the initial placement is instant, never a slide-from-0 on mount (§12 D3 `ready`).
    `.vida-tabs-indicator{transition:none}`,
    `.vida-tabs-indicator[data-ready="true"]{transition:${move}}`,
    // Panel enter: the active panel is keyed by value → a fresh mount on every change → this keyframe runs once.
    // Opacity only (B12). The outgoing panel is unmounted (only-active-mount, D5) so there is no fade-OUT (M2).
    `@keyframes vida-tabs-panel-in{from{opacity:0}to{opacity:1}}`,
    `.vida-tabs-panel{animation:vida-tabs-panel-in ${fade}}`,
    // Hover: a non-selected, non-disabled tab strengthens its label toward active. Instant swap (B12); the :hover
    // descendant selector beats Tamagui's atomic colour class ([[injected-css-loses-to-tamagui-variants]]).
    `.vida-tabs-tab:not([aria-selected="true"]):not([aria-disabled="true"]):hover .vida-tabs-label{color:var(--textActive)}`,
    // Reduced motion: indicator jumps, panel appears without a fade.
    reducedMotionCss(['.vida-tabs-indicator[data-ready="true"]'], 'transition:none'),
    reducedMotionCss(['.vida-tabs-panel'], 'animation:none'),
  ].join('')
  document.head.appendChild(style)
}
