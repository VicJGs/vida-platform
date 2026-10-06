import { motion } from '../themes/motion'
import { shadow } from '../themes/shadow'

// Injected CSS for the Dialog primitive — the scrim + panel ENTER animation a Tamagui styled(View) can't express
// across a react-dom portal (the Menu/Select injected-CSS precedent). Uses a mount-triggered @keyframes `animation`
// (the tabs-styles.ts panel-enter precedent), NOT a `.is-open` transition: the resting base is VISIBLE (scrim
// opacity:0.5, panel opacity:1) so a missed/absent animation FAILS SAFE VISIBLE — a modal must never render invisible
// (Gate-2 BLOCK-2). `animation-fill-mode: both` supplies the `from` state before the animation starts.
// B12: only `opacity` (scrim) + `opacity`/`transform` (panel) — never background/size/top. Reduced-motion → the
// animation is removed and the visible base stands (instant). Idempotent, browser-only. Appended after Tamagui's sheet.

let injected = false

export function ensureDialogStyles(): void {
  if (injected || typeof document === 'undefined') return
  injected = true
  const scrim = `${motion.duration.fast}ms ${motion.easing.out}`
  const panel = `${motion.duration.moderate}ms ${motion.easing.out}`
  const style = document.createElement('style')
  style.setAttribute('data-vida-dialog', '')
  style.textContent = [
    '@keyframes vida-dialog-scrim-in{from{opacity:0}to{opacity:0.5}}',
    // panel enters with opacity + a subtle scale/lift → settle. transform/opacity ONLY (B12).
    '@keyframes vida-dialog-panel-in{from{opacity:0;transform:scale(0.96) translateY(8px)}to{opacity:1;transform:none}}',
    `.vida-dialog-scrim{opacity:0.5;animation:vida-dialog-scrim-in ${scrim} both}`,
    // Level-3 overlay elevation (design §V; fe-codec-controls-refinement P3). STATIC box-shadow — the animation above
    // is opacity/transform ONLY (B12). Dark: shadow.overlay's hue = the dark surface → self-cancels (§XI, Card precedent).
    `.vida-dialog-panel{animation:vida-dialog-panel-in ${panel} both;box-shadow:${shadow.overlay}}`,
    // reduced motion: no entrance animation; the visible base (scrim 0.5 / panel 1) appears instantly.
    '@media (prefers-reduced-motion:reduce){.vida-dialog-scrim,.vida-dialog-panel{animation:none}}',
  ].join('')
  document.head.appendChild(style)
}
