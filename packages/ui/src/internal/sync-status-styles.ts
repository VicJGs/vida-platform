import { motion } from '../themes/motion'

// fe-codec-patterns · S4 — HonestProgress indeterminate shimmer (injected because a @keyframes can't be a Tamagui
// style prop — the toast/dialog precedent). B12: transform-only + a reduced-motion @media that stops it (the instant
// alternative = a static segment; the aria-valuetext still communicates "working"). The DETERMINATE fill needs no
// stylesheet — it's an inline `transform: scaleX(value)` (GPU-safe, never an animated width).

let injected = false

export function ensureSyncStatusStyles(): void {
  if (injected || typeof document === 'undefined') return
  injected = true
  const style = document.createElement('style')
  style.setAttribute('data-vida-sync-status', '')
  const dur = `${motion.duration.slow * 3}ms` // a slow, calm loop (never-alarming, P4)
  style.textContent = [
    // the indeterminate segment slides across the track — transform only (B12).
    `@keyframes vida-progress-indeterminate{from{transform:translateX(-100%)}to{transform:translateX(320%)}}`,
    `.vida-progress-indeterminate{animation:vida-progress-indeterminate ${dur} ${motion.easing.inOut} infinite}`,
    `@media (prefers-reduced-motion: reduce){.vida-progress-indeterminate{animation:none}}`,
  ].join('')
  document.head.appendChild(style)
}
