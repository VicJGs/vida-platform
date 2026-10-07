import { motion } from '../themes/motion'
import { shadow } from '../themes/shadow'

// Injected CSS for the Toast primitive — the enter/exit motion a Tamagui styled(View) can't express across a
// react-dom portal (the shipped Select/Menu/Dialog/Popover precedent). Contract (toast.md:37-42):
//   enter = duration.moderate / easing.out — opacity + translateY slide FROM the stack edge
//   exit  = duration.fast     / easing.in  — opacity + translateY out
// B12: only opacity + transform. The slide DIRECTION is per-placement, passed inline as `--vida-toast-from`
//   (bottom → +16px slides UP into place; top → −16px). Enter = a mount KEYFRAME (the Dialog precedent — plays
//   on mount, settles, holds; no rAF phase-flip); exit = a transition keyed on [data-phase="exiting"].
// Reduced-motion → instant (the message is still conveyed via the region's aria-live). Idempotent, browser-only.

let injected = false

export function ensureToastStyles(): void {
  if (injected || typeof document === 'undefined') return
  injected = true
  const enter = `${motion.duration.moderate}ms ${motion.easing.out}`
  const exit = `${motion.duration.fast}ms ${motion.easing.in}`
  const hover = `${motion.duration.fast}ms ${motion.easing.out}`
  const style = document.createElement('style')
  style.setAttribute('data-vida-toast', '')
  style.textContent = [
    // enter: fade + slide from the stack edge (`--vida-toast-from` set inline per placement). transform/opacity only.
    '@keyframes vida-toast-in{from{opacity:0;transform:translateY(var(--vida-toast-from,16px))}to{opacity:1;transform:none}}',
    `.vida-toast[data-phase="entering"]{animation:vida-toast-in ${enter} both}`,
    // exit: fade + slide back out over duration.fast / easing.in.
    `.vida-toast[data-phase="exiting"]{opacity:0;transform:translateY(var(--vida-toast-from,16px));transition:opacity ${exit},transform ${exit}}`,
    // P4b hover "slight elevation" (toast.md:27): the overlay's raised shadow fades in on wrapper :hover (opacity
    // ONLY — B12-safe; the shadow is STATIC, never animated). shadow.raised self-cancels in dark — the ToastPanel
    // border-strengthen hoverStyle carries dark perceptibility (§VIII; the Card card.tsx:52 precedent).
    `.vida-toast-elevation{box-shadow:${shadow.raised};transition:opacity ${hover}}`,
    '.vida-toast-wrap:hover .vida-toast-elevation{opacity:1}',
    // reduced motion: instant appear/disappear — state still conveyed via aria-live (B12(a)); elevation = instant.
    '@media (prefers-reduced-motion:reduce){.vida-toast[data-phase="entering"]{animation:none}.vida-toast[data-phase="exiting"]{transition:none}.vida-toast-elevation{transition:none}}',
  ].join('')
  document.head.appendChild(style)
}
