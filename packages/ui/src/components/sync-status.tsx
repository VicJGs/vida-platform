import { forwardRef, type ComponentRef } from 'react'
import { styled, Text, View, type GetProps } from '@tamagui/core'
import { ensureSyncStatusStyles } from '../internal/sync-status-styles'

// fe-codec-patterns · S4 — SyncStatus + HonestProgress (the CODEC local-first status primitives).
// Reconcile: docs/specs/foundation/fe-codec-patterns/s4-sync-status.md · interpretation R4 · p4-trust-reversibility-specimen.
//
// HONEST M1 (P4 copy-honesty contract, p4 specimen:103,115): writes are instant on-device, so there is NO "Saving…"
// state and NO "synced to cloud" claim — the indicator says "Saved on this device." The M1 union is `saved | error`;
// the cloud states (synced/pending/offline/conflict) are the M3 forward seam (ZK server sync = M3), NOT shipped here.
// Both components are PRESENTATIONAL (state/value as a prop, BR-2) — the app owns the data source (a sync_queue count
// at M3, a local write failure, a slow-op fraction). No derivation, no @vida/core import.
//
// Tokens (B-codec-6): the dot uses the DIRECT semantic SIGNAL tokens ($colorSignalSuccess/$colorSignalDanger —
// preset-invariant), text/surface via $colorText*/$colorSurface*, brand fill via $colorBrandEmphasis, pill = $full.

// ── SyncStatus ──────────────────────────────────────────────────────────────

/** The honest M1 state union — on-device only. Cloud states (synced/pending/offline/conflict) are the M3 seam. */
export type LocalSyncState = 'saved' | 'error'

const ChipFrame = styled(View, {
  name: 'SyncStatus',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$8',
  paddingVertical: '$8',
  paddingHorizontal: '$12',
  borderRadius: '$full',
  borderWidth: 1,
  borderColor: '$colorBorderDefault',
  backgroundColor: '$colorSurfaceSecondary',
  alignSelf: 'flex-start',
})

const Dot = styled(View, {
  name: 'SyncStatus',
  width: 8,
  height: 8,
  borderRadius: '$full',
  variants: {
    state: {
      saved: { backgroundColor: '$colorSignalSuccess' },
      error: { backgroundColor: '$colorSignalDanger' },
    },
  } as const,
})

const ChipLabel = styled(Text, {
  name: 'SyncStatus',
  fontFamily: '$body',
  fontSize: '$small',
  color: '$colorTextMuted',
})

export interface SyncStatusProps extends Omit<GetProps<typeof ChipFrame>, 'children'> {
  state: LocalSyncState
  /** Override the stage-honest default copy. */
  label?: string
}

export const SyncStatus = forwardRef<ComponentRef<typeof ChipFrame>, SyncStatusProps>(function SyncStatus(
  { state, label, ...rest },
  ref,
) {
  // Stage-honest defaults (switch, not an index read — safe under noUncheckedIndexedAccess).
  const copy = label ?? (state === 'error' ? "Couldn't save on this device" : 'Saved on this device')
  return (
    // role/aria AFTER {...rest} so the a11y contract wins (Card N1). Calm live region (P4: never alarming).
    <ChipFrame ref={ref} {...rest} role="status" aria-live="polite">
      <Dot state={state} aria-hidden />
      <ChipLabel>{copy}</ChipLabel>
    </ChipFrame>
  )
})

// ── HonestProgress ──────────────────────────────────────────────────────────

const ProgressWrap = styled(View, { name: 'SyncStatus', gap: '$8', width: '100%' })

const ProgressLabel = styled(Text, {
  name: 'SyncStatus',
  fontFamily: '$body',
  fontSize: '$small',
  color: '$colorTextMuted',
})

const ProgressTrack = styled(View, {
  name: 'SyncStatus',
  height: 6,
  width: '100%',
  borderRadius: '$full',
  backgroundColor: '$colorSurfaceSecondary',
  overflow: 'hidden',
})

const ProgressFill = styled(View, {
  name: 'SyncStatus',
  height: '100%',
  borderRadius: '$full',
  backgroundColor: '$colorBrandEmphasis',
})

export interface HonestProgressProps extends Omit<GetProps<typeof ProgressWrap>, 'children'> {
  /** The honest op name, e.g. "Rebuilding search index…". */
  label: string
  /** 0..1 determinate fraction. Omit (or set `indeterminate`) when the duration is genuinely unknown. */
  value?: number
  /** Explicit indeterminate — a genuinely-unknown-duration op. Never use to fake a known fraction. */
  indeterminate?: boolean
}

export const HonestProgress = forwardRef<ComponentRef<typeof ProgressWrap>, HonestProgressProps>(function HonestProgress(
  { label, value, indeterminate, ...rest },
  ref,
) {
  if (process.env.NODE_ENV !== 'production' && indeterminate && value != null) {
    console.warn('[vida/ui] HonestProgress: `indeterminate` with a `value` is a contradiction — pass one, not both.')
  }
  ensureSyncStatusStyles()

  const isIndeterminate = indeterminate || value == null
  const clamped = Math.min(1, Math.max(0, value ?? 0))

  return (
    <ProgressWrap ref={ref} {...rest}>
      <ProgressLabel>{label}</ProgressLabel>
      <ProgressTrack
        // Determinate: role=progressbar + valuenow/min/max. Indeterminate: valuenow OMITTED (the APG signal) + valuetext.
        role="progressbar"
        aria-label={label}
        {...(isIndeterminate
          ? { 'aria-valuetext': 'Working…' }
          : { 'aria-valuenow': Math.round(clamped * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 })}
      >
        {isIndeterminate ? (
          // A segment that slides across (transform-only keyframe; reduced-motion @media stops it — the instant alt).
          <ProgressFill className="vida-progress-indeterminate" width="40%" />
        ) : (
          // B12-safe: scale the full-width fill on X (GPU transform), never an animated width. transform-origin left.
          <ProgressFill style={{ transform: `scaleX(${clamped})`, transformOrigin: 'left' }} />
        )}
      </ProgressTrack>
    </ProgressWrap>
  )
})
