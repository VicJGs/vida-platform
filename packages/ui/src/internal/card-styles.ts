import { shadow } from '../themes/shadow'
import { motion } from '../themes/motion'
import { reducedMotionCss } from './reduced-motion-css'

// Card elevation — injected because a box-shadow + a descendant-hover opacity transition are things Tamagui
// `styled()` can't cleanly express. Elevation is communicated as the OPACITY of a raised-shadow overlay (B12:
// only opacity animates; the shadow itself is static on the overlay — a box-shadow is never animated).
//
// - `.vida-card` carries the RESTING (Level-1) shadow. In DARK it self-cancels: shadow.resting's colour is
//   rgba(15,23,42,·) = neutral900 = the dark surface, so a near-transparent dark shadow on a dark surface renders
//   nothing → the card's 1px border carries dark elevation (design.md §V "dark = border-based"). No theme detection.
// - `.vida-card-elevation` is an absolute, pointerEvents:none child holding the RAISED (Level-2) shadow at opacity 0;
//   on hover/active of an INTERACTIVE card it fades to 1. Only opacity transitions (B12).
// - The dark hover cue (an instant border strengthen) is a Tamagui `hoverStyle` VARIANT on the frame, NOT here —
//   a prop/state-driven visual belongs in a variant ([[injected-css-loses-to-tamagui-variants]]).
// - Disabled cards drop the `.vida-card-interactive` class, so hover/active never fire (checkbox precedent).
//
// Usage: `.vida-card` on the frame (+ `.vida-card-interactive` when interactive && !disabled), `.vida-card-elevation`
// on the overlay child. Call ensureCardStyles() once (idempotent, browser-only).

let injected = false

export function ensureCardStyles(): void {
  if (injected || typeof document === 'undefined') return
  injected = true
  const style = document.createElement('style')
  style.setAttribute('data-vida-card', '')
  const ease = `${motion.duration.fast}ms ${motion.easing.out}`
  style.textContent = [
    `.vida-card{box-shadow:${shadow.resting}}`,
    // faded = flat/dormant: suppress the resting elevation (after .vida-card so it wins at equal specificity). The
    // recessed surface + flatness signal "neglected" WITHOUT dimming text (B-C-7a: hold the text, dim the chrome).
    `.vida-card-flat{box-shadow:none}`,
    `.vida-card-elevation{opacity:0;box-shadow:${shadow.raised};transition:opacity ${ease}}`,
    `.vida-card-interactive:hover>.vida-card-elevation,.vida-card-interactive:active>.vida-card-elevation{opacity:1}`,
    reducedMotionCss(['.vida-card-elevation'], 'transition:none'),
  ].join('')
  document.head.appendChild(style)
}
