# fe-codec-dashboard — Envision Gate (Entity Delivery Flow ②, Step 1.5)

> **Status:** FIRED (interpretation §7, §3.75 doc test) · greybox authored · **human (Victor) review PASSED 2026-10-07**
> (leanings ratified, checkpoints pinned). The firing was the mechanical doc test; THIS gate is the blocking human review.
> **Greybox:** `packages/ui/src/__envision__/dashboard-greybox.{tsx,stories.tsx}` (throwaway — DELETED after this gate per
> the methodology; rendered in the codec Storybook across 3 presets × light/dark × the 375/768/1440 reflow). Composition
> aid: the shipped `@vida/ui` primitives (`Card`, `EmptyState`, `Button`) + fake blocks.

## What was envisioned

A Home-like dashboard (`Today's schedule` full · `Stats glance` sm · `Day actions` md · `Reading hub` lg · `Habits`
loading · `Recent notes` empty · `Sync feed` error) + a Finance all-success grid + an empty dashboard — covering every
screen × meaningful state × the create/empty/error affordances, at greybox fidelity (layout/affordance/state, not pixels).

## Resolved precisions (the two §6 flags — ratified at the review, now FACT for `/contract`)

- **P1 — Cell span = a `size` enum (`sm | md | lg | full`).** Ratified over numeric-span / width-weight: dashboard blocks
  are intent-sized ("stats = `sm`, schedule = `full`"), which reads cleaner and gives predictable reflow. The enum resolves
  to an RN-safe flex cell (the gallery-view `weightStyle` precedent: `flexBasis` + `flexGrow` + **explicit `flexShrink:1`** +
  a `minWidth` floor). Exact basis/grow/min numbers are a `/contract` tuning (informed by EC-6/EC-8 below).
- **P2 — Per-cell frame = the shipped `Card`.** Ratified over a bare titled region: `header` = block title + a `⋯` block-
  action slot (a real `Menu` at `/contract`) + `headerDivider`; the block body enters via the `renderBlock` render-prop.
  Reuses a gated primitive → consistent chrome, dark elevation self-cancels to border for free.

## Anchored checkpoints (EC-n) — pinned by Victor

Each `structural` EC is greybox-provable → it MUST map to ≥1 slice at Decomposition AND be a blocking Visual-Gate assertion.
`feel` ECs defer to the live per-slice Visual Gate.

| EC       | Checkpoint                                                                                                                                                                              | Type         |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **EC-1** | Heterogeneous span grid: `sm/md/lg/full` cells lay out in one RN-safe flex grid; the spans read as **visually distinct** sizes                                                          | `structural` |
| **EC-2** | Each cell is a `Card` — header (block title + a `⋯` action slot) + `headerDivider`; the block body enters via `renderBlock`                                                             | `structural` |
| **EC-3** | **Per-block 8-state threads independently** — a cell can be loading (skeleton) / empty (teach) / error (status) while siblings are success                                              | `structural` |
| **EC-4** | Responsive reflow: multi-column at 1440/768 → **single column at 375, no horizontal overflow**                                                                                          | `structural` |
| **EC-5** | An empty dashboard (no blocks) → a teaching `EmptyState` with an add affordance, never a blank region                                                                                   | `structural` |
| **EC-6** | **A span is never silently promoted to `full` when alone on a row** — a lone `lg`/`md`/`sm` cell is capped (a per-span `maxWidth`) so its size stays legible; only `full` fills the row | `structural` |
| **EC-7** | Preset identity: serif titles + accent swap per preset; dark elevation carried by the border (self-cancel)                                                                              | `feel`       |
| **EC-8** | Span floors are mobile-safe — the largest non-`full` floor (`lg`) must still single-column cleanly at 375 (no clipped cell)                                                             | `structural` |

### Greybox findings folded into the checkpoints (why the gate ran BEFORE decomposition)

The live greybox exposed three things a static spec would have missed, now pinned:

1. **A lone cell grows to fill its row** (`Reading hub` lg rendered full-width when alone) → **EC-6** (per-span `maxWidth` cap).
2. **`sm` vs `md` read near-equal when paired** → **EC-1** tightened to "visually distinct" + a `/contract` grow-weight tune.
3. **The `lg` min floor (~360) sits at the 375 edge** → **EC-8** (mobile-safe floors).

## Exit

Greybox approved + leanings ratified + EC-1…EC-8 pinned → greybox DELETED → **Step 2 Decomposition**: `slice-map.md` +
`seam-contract.md` map every `structural` EC (EC-1…EC-6, EC-8) to ≥1 slice (plane-aware — frontend/shared slices carry them
as Visual-Gate MUSTs; EC-7 `feel` defers to the live gate).
