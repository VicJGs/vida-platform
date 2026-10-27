import { motion } from '../themes/motion'
import { shadow } from '../themes/shadow'
import { reducedMotionCss } from './reduced-motion-css'

// Injected CSS for the Menu primitive — the panel ENTER animation a Tamagui styled(View) can't express across a
// react-dom portal (the shipped Select/Checkbox precedent; NOT Tamagui enterStyle, unverified across the portal).
// B12: only `opacity` + `transform` transition. The item highlight is a Tamagui `active` VARIANT (state-driven, off
// activeIndex — NOT here, and NOT `:focus-visible`, which is racy for programmatic focus). This sheet is enter-motion
// only; `transform-origin` is set inline from the RESOLVED side (single authority). Reduced-motion → instant.
// Idempotent, browser-only. Appended after Tamagui's sheet so equal-specificity ties fall to us by source order.

let injected = false

export function ensureMenuStyles(): void {
  if (injected || typeof document === 'undefined') return
  injected = true
  const t = `${motion.duration.fast}ms ${motion.easing.out}`
  const style = document.createElement('style')
  style.setAttribute('data-vida-menu', '')
  style.textContent = [
    // enter: opacity + a small translate from the trigger edge (sign by resolved side) → settle. transform/opacity only.
    // Level-3 overlay elevation (design §V; P3). STATIC box-shadow — transition is opacity,transform ONLY (B12).
    `.vida-menu-panel{opacity:0;transition:opacity ${t},transform ${t};box-shadow:${shadow.overlay}}`,
    '.vida-menu-panel[data-side="bottom"]{transform:translateY(-4px) scale(0.98)}',
    '.vida-menu-panel[data-side="top"]{transform:translateY(4px) scale(0.98)}',
    '.vida-menu-panel.is-open{opacity:1;transform:none}',
    // reduced motion: appears instantly.
    reducedMotionCss(['.vida-menu-panel'], 'transition:none'),
  ].join('')
  document.head.appendChild(style)
}
