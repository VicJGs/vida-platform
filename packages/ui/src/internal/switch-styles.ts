import { motion } from '../themes/motion'
import { reducedMotionCss } from './reduced-motion-css'

// Injected CSS for the Switch primitive — the state machine a Tamagui styled(View) can't express, driven off the
// native <input type="checkbox" role="switch">'s own `:checked` / `:focus-visible` pseudo-classes. Mirrors
// checkbox-styles.ts: appended after Tamagui's sheet so equal-specificity ties fall to us by source order; idempotent;
// browser-only; requires `:has()` (modern-only OPFS SPA). CSS-driven = NO re-render on toggle (BR-SW-2, the perf budget).
//
// Direct semantic tokens (BR-SW-3, the fe-codec-theme accent-fix direction): the ON track reads var(--colorBrandPrimary)
// (preset-overridden at <body> scope → editorial blue / reader oxblood / quietDesk olive); the focus ring is the base
// --colorFocusRing var (the checkbox-styles.ts precedent). The knob travel is size-dependent, so it is an INLINE
// `--vida-switch-travel` custom prop on the track (BR-SW-4, the toast `--vida-toast-from` precedent) and the :checked
// rule slides the knob by that distance.
//
// MOTION (B12, BR-SW-5): ONLY the knob transform transitions; the track colour is an instant swap. Reduced-motion drops it.

let injected = false

export function ensureSwitchStyles(): void {
  if (injected || typeof document === 'undefined') return
  injected = true
  const t = `${motion.duration.fast}ms ${motion.easing.out}`
  const style = document.createElement('style')
  style.setAttribute('data-vida-switch', '')
  style.textContent = [
    // ON: track fill + border follow the brand token — EXCEPT invalid (danger border wins, the checkbox guard).
    '.vida-switch:has(.vida-switch-input:checked) .vida-switch-track' +
      '{background-color:var(--colorBrandPrimary)}',
    '.vida-switch:not(.vida-switch-invalid):has(.vida-switch-input:checked) .vida-switch-track' +
      '{border-color:var(--colorBrandPrimary)}',
    // knob: resting left; slides right by the per-instance travel on :checked. transform-only transition (B12).
    `.vida-switch-knob{transform:translateX(0);transition:transform ${t}}`,
    '.vida-switch:has(.vida-switch-input:checked) .vida-switch-knob' +
      '{transform:translateX(var(--vida-switch-travel))}',
    // focus ring on the TRACK (not the label) — the documented `:focus-visible` (BR-SW-7).
    '.vida-switch:has(.vida-switch-input:focus-visible) .vida-switch-track' +
      '{outline:2px solid var(--colorFocusRing);outline-offset:2px}',
    // reduced motion: the knob snaps instantly (BR-SW-5).
    reducedMotionCss(['.vida-switch-knob'], 'transition:none'),
  ].join('')
  document.head.appendChild(style)
}
