import type { ReactNode } from 'react'
import { motion } from '../themes/motion'

// UI-1 · Toast external store (primitive 10/10) — the imperative→React bridge.
// Toast is the ONLY imperative primitive: `toast(options)` is callable from OUTSIDE the React tree (an async
// catch, a store action, a non-component module). A module-level store + React 19's `useSyncExternalStore`
// (in toast.tsx's ToastProvider) is the bridge — the sonner/react-hot-toast reducer model, zero-dep (@vida/ui
// has no zustand). Reconcile: docs/specs/components/ui-1-vida-ui-primitives/u10-toast.md §3.1.

export type ToastIntent = 'info' | 'success' | 'danger'

export interface ToastOptions {
  title: ReactNode
  description?: ReactNode
  /** Emphasis + live-region routing. Default 'info' (polite); 'danger' → assertive. */
  intent?: ToastIntent
  /** ms before auto-dismiss; 0 = sticky (manual dismiss only). Default 5000. */
  duration?: number
  /** One optional action. Pressing it fires `onPress` and does NOT dismiss the toast (u10 §3.3/F2). */
  action?: { label: string; onPress: () => void }
  /** Fires once on removal (timer expiry, dismiss, `toast.dismiss(id)`, Esc, or cap eviction). */
  onDismiss?: () => void
}

export interface ToastHandle {
  (options: ToastOptions): string
  dismiss: (id: string) => void
}

/** `entering` = a mount keyframe (settles + holds; no 'visible' flip); `exiting` = the exit transition (u10 §3.4/M5). */
export type ToastPhase = 'entering' | 'exiting'

export interface ToastRecord extends ToastOptions {
  id: string
  phase: ToastPhase
}

// The exit-animation window before hard removal — traces to the motion token (motion.md exit = duration.fast).
const EXIT_MS = motion.duration.fast

// ── store state ──────────────────────────────────────────────────────────────────────────────────────────
let records: ToastRecord[] = []
const listeners = new Set<() => void>()
let counter = 0 // id source — a monotonic counter, NOT UUIDv7 (ephemeral UI state, never persisted/synced).
let limit = 3 // per-region visible cap; the ToastProvider registers its `limit` on mount.

// Reassign `records` ONLY here — useSyncExternalStore requires getSnapshot to return a STABLE ref between
// changes (else it loops); a fresh ref on every change is exactly what signals React to re-render.
function emit(): void {
  records = [...records]
  listeners.forEach((l) => l())
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSnapshot(): ToastRecord[] {
  return records
}

// A no-op for this non-SSR SPA — useSyncExternalStore only calls it during SSR/hydration (never here); returns
// the same ref so there is no hydration mismatch. Retained for API completeness, not because the app is SSR.
export function getServerSnapshot(): ToastRecord[] {
  return records
}

/** The ToastProvider registers its per-region `limit` (default 3) on mount. */
export function setToastLimit(n: number): void {
  limit = n
}

function regionOf(r: ToastRecord): 'assertive' | 'polite' {
  return r.intent === 'danger' ? 'assertive' : 'polite'
}

// STORE-ENFORCED cap, evict-oldest (u10 §3.1 / gate-2 M2): the cap is applied here on add — NOT by a render-time
// slice (a `.slice(-limit)` at render would drop the oldest the same commit it starts exiting, so its exit
// animation could never play). Per region (danger→assertive independent of info/success→polite, so a danger
// toast is never starved). Invariant: non-exiting records per region ≤ limit.
export function addToast(options: ToastOptions): string {
  const id = `toast-${(counter += 1)}`
  const record: ToastRecord = { ...options, id, phase: 'entering' }
  records = [...records, record]
  const region = regionOf(record)
  const live = records.filter((r) => r.phase !== 'exiting' && regionOf(r) === region)
  if (live.length > limit) {
    // evict the region's OLDEST non-exiting record (live[0]) — routes through dismissToast → normal exit + onDismiss.
    dismissToast(live[0]!.id)
  }
  emit()
  return id
}

// IDEMPOTENT (u10 §3.4 / M1): early-return if already exiting/gone, so onDismiss fires EXACTLY ONCE across all
// removal paths (timer, dismiss button, toast.dismiss, Esc, eviction) even under a double-call. Single removal
// choke-point: set phase='exiting' (the item plays its exit), then hard-remove after EXIT_MS and fire onDismiss.
export function dismissToast(id: string): void {
  const record = records.find((r) => r.id === id)
  if (!record || record.phase === 'exiting') return
  records = records.map((r) => (r.id === id ? { ...r, phase: 'exiting' } : r))
  emit()
  setTimeout(() => {
    const gone = records.find((r) => r.id === id)
    records = records.filter((r) => r.id !== id)
    emit()
    gone?.onDismiss?.() // async (setTimeout) — never during render; once (idempotent guard ⇒ one scheduled removal per id)
  }, EXIT_MS)
}

// The imperative singleton. `Object.assign` yields `typeof addToast & { dismiss }`; the single `as ToastHandle`
// cast narrows it to the callable interface — the one justified cast (NOT an any/! violation).
export const toast: ToastHandle = Object.assign(addToast, { dismiss: dismissToast }) as ToastHandle

/** TEST-ONLY: clear the singleton between tests (module state persists across a test file). */
export function resetToastStore(): void {
  records = []
  counter = 0
  limit = 3
  emit()
}
