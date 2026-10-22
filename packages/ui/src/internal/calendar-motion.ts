import { motion } from '../themes/motion'

// fe-calendar S7 (EC-F2 — "range-transition + today-pulse motion, reduced-motion gated"; PLAN-S7 G15/R9). Injected because a
// @keyframes can't be a Tamagui style prop (the sync-status/toast precedent). Motion communicates STATE, never decoration:
// - the today pulse = ONE scale beat on the today mark when the user asks "where is today?" (the Today button) — never on
//   mount, never a loop. Re-triggered by remounting the mark (`key={pulseKey}`), so the same CSS animation restarts.
// - the range fade = the region settling in when the user switches range (opacity only).
// transform/opacity ONLY (motion.md IX safe list) · motion tokens (slow 400 / moderate 250, ease-out) · a reduced-motion
// @media drops both (CSS, so there is no first-render flash before `useReducedMotion()` resolves).

let injected = false

export function ensureCalendarMotionStyles(): void {
  if (injected || typeof document === 'undefined') return
  injected = true
  const style = document.createElement('style')
  style.setAttribute('data-vida-calendar-motion', '')
  const out = motion.easing.out
  style.textContent = [
    `@keyframes vida-today-pulse{0%{transform:scale(1)}40%{transform:scale(1.12)}100%{transform:scale(1)}}`,
    `.vida-today-pulse{animation:vida-today-pulse ${motion.duration.slow}ms ${out};transform-origin:center}`,
    `@keyframes vida-range-fade{from{opacity:0}to{opacity:1}}`,
    `.vida-range-fade{animation:vida-range-fade ${motion.duration.moderate}ms ${out}}`,
    `@media (prefers-reduced-motion: reduce){.vida-today-pulse,.vida-range-fade{animation:none}}`,
  ].join('')
  document.head.appendChild(style)
}

/** The today mark's pulse class — only for a positive key (0 / absent = the mount state: no pulse). */
export function pulseClass(pulseKey: number | undefined, base: string): string {
  return pulseKey != null && pulseKey > 0 ? `${base} vida-today-pulse` : base
}
