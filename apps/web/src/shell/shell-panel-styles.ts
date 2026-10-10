// fe-shell (#14) · S4 — injected CSS for the FLOATING panel's scrim + edge-slide enter animation (a Tamagui styled(View)
// can't express the @keyframes). Mirrors `@vida/ui` `internal/dialog-styles.ts`: a mount-triggered `animation` (NOT a
// `.is-open` transition) with a VISIBLE resting base (scrim opacity:0.5, panel opacity:1, transform:none) so a
// missed/absent animation FAILS SAFE VISIBLE — a modal drawer must never render invisible (S4 gate-1 B2). `animation-fill-
// mode:both` supplies the `from` state before start. B12: only `opacity` (scrim) + `opacity`/`transform` (panel) — never
// background/size. Reduced-motion → the animation is removed and the visible base stands (instant). Idempotent, browser-only.
import { motion, shadow } from '@vida/ui'

let injected = false

export function ensureShellPanelStyles(): void {
  if (injected || typeof document === 'undefined') return
  injected = true
  const scrim = `${motion.duration.fast}ms ${motion.easing.out}`
  const panel = `${motion.duration.moderate}ms ${motion.easing.out}`
  const style = document.createElement('style')
  style.setAttribute('data-vida-shell-panel', '')
  style.textContent = [
    // Scrim — opacity 0 → 0.5 (matches the Dialog scrim exactly).
    '@keyframes vida-shell-scrim-in{from{opacity:0}to{opacity:0.5}}',
    '.vida-shell-scrim{opacity:0.5;animation:vida-shell-scrim-in ' + scrim + ' both}',
    // Panel — a subtle slide FROM the anchored edge + fade → settle (transform/opacity ONLY, B12). Resting base visible.
    '@keyframes vida-shell-panel-in-left{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}',
    '@keyframes vida-shell-panel-in-right{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:none}}',
    '@keyframes vida-shell-panel-in-top{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:none}}',
    '@keyframes vida-shell-panel-in-bottom{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}',
    // Level-3 overlay elevation (design §V; the P3 overlay precedent). STATIC box-shadow — the slide above is
    // transform/opacity ONLY (B12). Dark: shadow.overlay's hue = the dark surface → self-cancels (§XI); the 1px border
    // on the panel then carries the elevation.
    '.vida-shell-panel{box-shadow:' + shadow.overlay + '}',
    '.vida-shell-panel-left{animation:vida-shell-panel-in-left ' + panel + ' both}',
    '.vida-shell-panel-right{animation:vida-shell-panel-in-right ' + panel + ' both}',
    '.vida-shell-panel-top{animation:vida-shell-panel-in-top ' + panel + ' both}',
    '.vida-shell-panel-bottom{animation:vida-shell-panel-in-bottom ' + panel + ' both}',
    // Reduced motion: no entrance animation; the visible base (scrim 0.5 / panel 1, transform none) appears instantly.
    '@media (prefers-reduced-motion:reduce){.vida-shell-scrim,.vida-shell-panel-left,.vida-shell-panel-right,.vida-shell-panel-top,.vida-shell-panel-bottom{animation:none}}',
  ].join('')
  document.head.appendChild(style)
}
