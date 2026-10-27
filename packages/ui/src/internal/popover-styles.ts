import { motion } from '../themes/motion'
import { shadow } from '../themes/shadow'
import { reducedMotionCss } from './reduced-motion-css'

// Injected CSS for the Popover primitive — the panel ENTER animation a Tamagui styled(View) can't express across a
// react-dom portal (the shipped Select/Menu/Dialog precedent). Contract (popover.md:34): open = opacity + a
// `scale(0.96→1)` from the anchor edge, `duration.fast`/`easing.out`. B12: only `opacity` + `transform` transition.
// The scale grows from the anchor edge because `transform-origin` is set INLINE from the resolved side (single
// authority; this sheet sets none — the Menu precedent). Reduced-motion → instant.
// Idempotent, browser-only. Appended after Tamagui's sheet so equal-specificity ties fall to us by source order.

let injected = false

export function ensurePopoverStyles(): void {
  if (injected || typeof document === 'undefined') return
  injected = true
  const t = `${motion.duration.fast}ms ${motion.easing.out}`
  const style = document.createElement('style')
  style.setAttribute('data-vida-popover', '')
  style.textContent = [
    // enter: opacity 0→1 + scale(0.96)→none from the anchor edge (origin inline). transform/opacity only (B12).
    // Level-3 overlay elevation (design §V; P3). STATIC box-shadow — transition is opacity,transform ONLY (B12).
    `.vida-popover-panel{opacity:0;transform:scale(0.96);transition:opacity ${t},transform ${t};box-shadow:${shadow.overlay}}`,
    '.vida-popover-panel.is-open{opacity:1;transform:none}',
    // reduced motion: appears instantly.
    reducedMotionCss(['.vida-popover-panel'], 'transition:none'),
  ].join('')
  document.head.appendChild(style)
}
