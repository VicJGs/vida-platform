# fe-codec-patterns · S4 — SyncStatus + HonestProgress (PLAN + spec, §XXVI gate)

> **Slice:** S4 of 5 (slice-map.md) · **Plane:** `@vida/ui` rendered components · **Gate:** real-browser **Visual Gate** ·
> **Branch:** `worktree-fe-codec-patterns`.
> **Grounds:** interpretation R4 · seam-contract §B · frontend-quality-bar §2.6 + P4 · p4-trust-reversibility-specimen.html:102-115 ·
> state-conventions.md:102-108 (BR-RT-4, writes instant) · card.tsx (house pattern) · data-view.tsx (role=status precedent).

## §0. Context (BASELINE) — the honest M1 state set, grounded (the deferred front-matter item, now RESOLVED)

Writes succeed on-device instantly (<10ms, invalidate-and-reread, **no optimistic layer**) [FACT: state-conventions.md:102-108].
The sync engine is a **no-flush stub** in M1 (AR-9 `SyncNotActivated`); **ZK server sync arrives at M3** [FACT: frontend-quality-bar/_index.md:82 P4].
The P4 specimen is explicit [FACT: p4-trust-reversibility-specimen.html:103,115]:

- **"There is no 'Saving…' spinner; the data is already real."** → **no `saving` state** (confirms the g1 catch).
- **"until then the indicator says 'saved on this device,' never 'synced to cloud.'"**
- The specimen's `synced · pending · offline · conflict` chip states are the **M3 multi-device vision**, NOT honest in M1.

→ **Honest M1 `SyncStatus` set = `saved` + `error`.** The 4 cloud states are a **documented M3 forward seam** (not shipped).
No existing `SyncStatus`/`HonestProgress` component exists (grep-clean). The data SOURCE (what sets the state — e.g. a
`sync_queue` count at M3, or a local write failure) is the app's; these are **presentational, state-as-prop** (BR-2).

## §1. What S4 is / is not

**Is:** two `@vida/ui` presentational primitives — **`SyncStatus`** (a calm, never-alarming local-first chiplet: dot +
label) and **`HonestProgress`** (determinate/indeterminate progress for genuinely-slow _local_ ops). `packages/ui/src/components/sync-status.tsx`.

**Is not:** the `/sync` **page** (change log + multi-device compare) → `fe-sync-log` #21 / M3 (interpretation O1); real sync
transport / the cloud states → M3; the presentation _switch_ (chip · page · on-change · hidden — a user pref) → fe-sync-log
/ Settings; any **fake spinner** (forbidden — writes are instant).

## §2. Business rules (invariants)

- **BR-S4-1 Calm, never alarming.** `SyncStatus` reassures; even `error` is informative, not a klaxon. `aria-live="polite"`
  [FACT: p4 specimen:102-103; frontend-quality-bar/_index.md:50 §2.6].
- **BR-S4-2 Stage-honest copy — M1 is on-device.** The default copy says **"Saved on this device"**, **never** "synced to
  cloud"/cross-device. No ZK-sync claim pre-M3 [FACT: p4 specimen:115; frontend-quality-bar/_index.md:43 §2.2].
- **BR-S4-3 No `saving` / no fake spinner.** The honest M1 `state` set is `'saved' | 'error'` — writes are already real
  [FACT: p4 specimen:103; state-conventions.md:102-108]. Cloud states (`pending`/`offline`/`conflict`/`synced`) = a
  documented M3 forward seam, NOT in the M1 union.
- **BR-S4-4 `HonestProgress` is honest + B12-safe.** Determinate (`value` 0..1 → `role="progressbar"` + `aria-valuenow/min/max`,
  fill via `transform: scaleX`) when the fraction is known; **indeterminate** (`role="progressbar"`, `aria-valuenow` omitted +
  `aria-valuetext`) ONLY for genuinely-unknown-duration ops — never to fake a known one. The fill animates via transform,
  never `width` (B12) [FACT: frontend-quality-bar/_index.md:51 §2.6; current-business-rules.md B12:44-50].
- **BR-S4-5 Tokens only.** Direct semantic tokens — the dot uses the **signal** tokens (`$accentSuccess` for saved,
  `$accentDanger`/`$borderError` for error — these are preset-INVARIANT signals, correct per B-codec-6); text/surface via
  `$colorText*`; spacing/radius via the scale. No hard-coded palette [FACT: current-business-rules.md B-codec-6].
- **BR-S4-6 Presentational, state-as-prop (BR-2).** No derivation, no `@vida/core` import, no data fetching; the app feeds
  `state`/`value` [FACT: packages/ui/src/components/list-view.tsx:34-35].

## §3. The design (API + anatomy + tokens)

```ts
// M1 honest union — on-device only. Cloud states are the M3 forward seam (documented, not shipped).
export type LocalSyncState = 'saved' | 'error'
export interface SyncStatusProps extends Omit<GetProps<typeof ChipFrame>, 'children'> {
  state: LocalSyncState
  label?: string // override; defaults are stage-honest ("Saved on this device" / a local-error message)
}

export interface HonestProgressProps extends Omit<GetProps<typeof ProgressFrame>, 'children'> {
  label: string // the honest op name ("Rebuilding search index…")
  value?: number // 0..1 determinate; omit → indeterminate
  indeterminate?: boolean // explicit indeterminate (genuinely-unknown duration only)
}
```

- **SyncStatus** = a pill (`borderRadius:'$full'` — the true pill; `$pill` is not a token, valid radii are `$md/$lg/$full`;
  `flexDirection:'row'`, gap, inset padding) with a **dot** (8px, `$accentSuccess` saved / `$accentDanger` error) + a
  **label** (`$small`, `$colorTextMuted`). Default copy: `saved`→"Saved on this device", `error`→"Couldn't save on this
  device". `role="status"` + `aria-live="polite"` (calm, never alarming).
- **HonestProgress** = a label (`$small`) + a track (`$colorSurfaceSecondary`) with a fill (`$colorBrandEmphasis`).
  **B12-safe fill:** the fill is full-width and scaled via **`transform: scaleX(value)`** (transform-origin left — GPU
  composited; NEVER an animated/transitioned `width`, which is a layout prop). Determinate → `role="progressbar"` +
  `aria-valuenow` / `aria-valuemin={0}` / `aria-valuemax={1}`. **Indeterminate** → `role="progressbar"` with
  `aria-valuenow` **OMITTED** (the APG indeterminate signal) + `aria-valuetext` (e.g. "Working…") + an opacity/transform-only
  shimmer **gated by `useReducedMotion`** (S2); NEVER a fake determinate bar.

## §4. Acceptance (Visual Gate — real browser, blocking)

- [ ] `SyncStatus` renders `saved` + `error` with calm dot + stage-honest default copy; **no "saving"/cloud claim** (BR-S4-2/3).
- [ ] `HonestProgress` renders determinate (value) + indeterminate (label), correct ARIA; indeterminate shimmer honours reduced-motion.
- [ ] **Visual Gate (Storybook + Playwright/Brave):** both components × **light|dark** × **3 presets** × **375·768·1440** —
      the dot signal tokens hold (preset-invariant), text/surface swap with mode, AA contrast on the label both modes; screenshots captured.
- [ ] **a11y sweep:** `SyncStatus` `role="status"` `aria-live="polite"`; `HonestProgress` `role="progressbar"` + values (determinate) / `aria-busy` (indeterminate).
- [ ] `tsc` 0 · eslint 0 · `@vida/ui` suite green (+ `sync-status.test.tsx`); exported from `index.ts`.
- [ ] §XXIX currency: `packages/ui/src/CLAUDE.md` gains the SyncStatus/HonestProgress entry + the M3 cloud-state seam note.

## §5. Implementation prompt (type-first)

1. `packages/ui/src/components/sync-status.tsx` — `ChipFrame`/`Dot`/`Label` + `ProgressFrame`/`Track`/`Fill` via
   `styled(View/Text,{name:'SyncStatus'})`; `SyncStatus` + `HonestProgress` `forwardRef`; stage-honest default copy map;
   dev-warn if an indeterminate `HonestProgress` also passes `value` (contradiction). Named exports (repo convention).
2. `packages/ui/src/index.ts` — `export { SyncStatus, HonestProgress, type SyncStatusProps, type HonestProgressProps, type LocalSyncState }`.
3. `packages/ui/src/components/sync-status.stories.tsx` — SyncStatus (saved/error) + HonestProgress (determinate steps + indeterminate), Visual-Gate surface.
4. `packages/ui/src/components/sync-status.test.tsx` — states + default copy + no-cloud-claim + ARIA (role=status/progressbar) + the indeterminate/value dev-warn.
5. `packages/ui/src/CLAUDE.md` — add the entry + the M3 cloud-state forward-seam note.

**On divergence:** §XXVIII. **Done:** §4 all checked → Visual Gate PASS → S4 commit → S5.
