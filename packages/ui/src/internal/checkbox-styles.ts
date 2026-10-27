import { motion } from '../themes/motion'
import { reducedMotionCss } from './reduced-motion-css'

// Injected CSS for the Checkbox primitive — the state machine a Tamagui styled(View) can't express, driven off the
// native <input type="checkbox">'s own `:checked` / `:indeterminate` / `:focus-visible` pseudo-classes with REAL
// switching theme vars (emitted by the `name:'Checkbox'` scope → --backgroundChecked / --checkmark; --colorFocusRing
// is the base semantic var). Appended after Tamagui's sheet so equal-specificity ties fall to us by source order.
// Idempotent, browser-only (mirrors input-styles.ts). CSS-driven = no re-render on toggle (perf budget,
// checkbox.md:53-54). Requires `:has()` (modern-only OPFS SPA — same assumption as input-styles.ts).
//
// PRECEDENCE: the checked/indeterminate FILL also sets the box border to --backgroundChecked, but on an INVALID box
// the danger border (a Tamagui `invalid` variant on CheckboxBox) must win — so the checked-border rules here are
// guarded `:not(.vida-checkbox-invalid)`. The background fill still applies when invalid (indigo box, danger border).
//
// MOTION (B12, checkbox.md:40-45): only opacity+transform(scale) transition, on the checkmark/dash. Reduced-motion
// drops the transition → instant.

let injected = false

export function ensureCheckboxStyles(): void {
  if (injected || typeof document === 'undefined') return
  injected = true
  const t = `${motion.duration.fast}ms ${motion.easing.out}`
  const style = document.createElement('style')
  style.setAttribute('data-vida-checkbox', '')
  style.textContent = [
    // fill (background) when checked OR indeterminate — always, incl. invalid.
    '.vida-checkbox:has(.vida-checkbox-input:checked) .vida-checkbox-box,' +
      '.vida-checkbox:has(.vida-checkbox-input:indeterminate) .vida-checkbox-box' +
      '{background-color:var(--backgroundChecked)}',
    // border follows the fill when checked/indeterminate — EXCEPT invalid (danger wins).
    '.vida-checkbox:not(.vida-checkbox-invalid):has(.vida-checkbox-input:checked) .vida-checkbox-box,' +
      '.vida-checkbox:not(.vida-checkbox-invalid):has(.vida-checkbox-input:indeterminate) .vida-checkbox-box' +
      '{border-color:var(--backgroundChecked)}',
    // (Danger border is a Tamagui `invalid` VARIANT on CheckboxBox — the injected route lost the specificity race
    //  vs Tamagui's own border-color classes. The checked-border rule above is guarded `:not(.vida-checkbox-invalid)`
    //  so the variant's danger border wins on an invalid box.)
    // checkmark: hidden by default (scale .8, opacity 0); appears scale(1)+opacity 1 on :checked.
    `.vida-checkbox-check{opacity:0;transform:scale(0.8);transition:opacity ${t},transform ${t}}`,
    '.vida-checkbox:has(.vida-checkbox-input:checked) .vida-checkbox-check{opacity:1;transform:scale(1)}',
    // indeterminate overrides checked (checkbox.md:15 mutually exclusive render): hide the check, show the dash.
    '.vida-checkbox:has(.vida-checkbox-input:indeterminate) .vida-checkbox-check{opacity:0;transform:scale(0.8)}',
    `.vida-checkbox-dash{opacity:0;transition:opacity ${t}}`,
    '.vida-checkbox:has(.vida-checkbox-input:indeterminate) .vida-checkbox-dash{opacity:1}',
    // focus ring on the BOX (not the label) — the documented `:focus-visible`, lifted to the box (§VIII / checkbox.md:51).
    '.vida-checkbox:has(.vida-checkbox-input:focus-visible) .vida-checkbox-box' +
      '{outline:2px solid var(--colorFocusRing);outline-offset:2px}',
    // reduced motion: checkmark/dash appear instantly (checkbox.md:45).
    reducedMotionCss(['.vida-checkbox-check', '.vida-checkbox-dash'], 'transition:none'),
  ].join('')
  document.head.appendChild(style)
}
