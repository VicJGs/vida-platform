import { motion } from '../themes/motion'
import { reducedMotionCss } from './reduced-motion-css'

// Injected CSS for the Select primitive — the pieces a Tamagui styled(View) can't express, using REAL switching
// theme vars + the motion.ts foundation (the shipped interaction/checkbox precedent, NOT Tamagui enterStyle — which
// is unverified across a react-dom portal; injected CSS is reliable and equally consumes DS-3 motion). Appended after
// Tamagui's sheet so equal-specificity ties fall to us by source order. Idempotent, browser-only.
//
// B12: only `transform`/`opacity` transition (chevron rotate; panel opacity+translateY). The active-option highlight
// is an INSTANT background swap (not transitioned). Reduced-motion drops every transition → instant (motion §Reduced).

let injected = false

export function ensureSelectStyles(): void {
  if (injected || typeof document === 'undefined') return
  injected = true
  const t = `${motion.duration.fast}ms ${motion.easing.out}`
  const style = document.createElement('style')
  style.setAttribute('data-vida-select', '')
  style.textContent = [
    // chevron rotates 180° when the combobox is expanded (transform only).
    `.vida-select-chevron{transition:transform ${t}}`,
    '.vida-select-trigger[aria-expanded="true"] .vida-select-chevron{transform:rotate(180deg)}',
    // panel enter: from opacity0/translateY(-4px) → opacity1/translateY(0) when `.is-open` is added post-mount.
    `.vida-select-panel{opacity:0;transform:translateY(-4px);transition:opacity ${t},transform ${t}}`,
    '.vida-select-panel.is-open{opacity:1;transform:translateY(0)}',
    // active option (keyboard highlight OR pointer hover, both set activeIndex) — instant surface swap.
    '.vida-select-option.is-active{background-color:var(--colorSurfaceSecondary)}',
    // reduced motion: panel + chevron appear/rotate instantly.
    reducedMotionCss(['.vida-select-chevron', '.vida-select-panel'], 'transition:none'),
  ].join('')
  document.head.appendChild(style)
}
