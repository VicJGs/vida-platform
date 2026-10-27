import { motion } from '../themes/motion'
import { reducedMotionCss } from './reduced-motion-css'

// Parent-driven interaction overlays (hover/press darkening) for Vida primitives, via plain CSS
// descendant-hover — NOT Tamagui's `group`. `group` sets `container-type: inline-size`, which makes an
// element's width independent of its content → buttons/chips/tabs collapse to their padding and content
// overflows. [[tamagui-group-breaks-content-width]] Plain `.frame:hover > .overlay` has no such side-effect,
// and animating only `opacity` is B12-legal. Reduced motion drops the transition.
//
// Usage: className `vida-interactive` on the frame + `vida-overlay` on an absolute, pointerEvents:none
// child; call ensureInteractionStyles() once (idempotent, browser-only).

let injected = false

export function ensureInteractionStyles(): void {
  if (injected || typeof document === 'undefined') return
  injected = true
  const style = document.createElement('style')
  style.setAttribute('data-vida-interaction', '')
  const ease = `${motion.duration.fast}ms ${motion.easing.out}`
  style.textContent = [
    `.vida-overlay{opacity:0;transition:opacity ${ease}}`,
    `.vida-interactive:hover>.vida-overlay{opacity:0.08}`,
    `.vida-interactive:active>.vida-overlay{opacity:0.16}`,
    reducedMotionCss(['.vida-overlay'], 'transition:none'),
  ].join('')
  document.head.appendChild(style)
}
