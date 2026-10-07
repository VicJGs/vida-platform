# fe-codec-dashboard — Slice Map (Decomposition Gate, Step 2)

> **STATUS (2026-10-07): BOTH SLICES SHIPPED.** S1 `DashboardView` (commit `01e4964`, Visual Gate PASS, EC-1..EC-8) ·
> S2 adapter (apps/web, 11 tests, g2 SHIP). Unit complete → PR.

> The buildable slices + the backend/frontend split, grounded in interpretation §1–§6 + the pinned envision EC-1…EC-8.
> **Mode:** Decide (net-new shell; the split is NOT doc-fixed, so decided here per entity-delivery-flow.md §8) — but the
> SHAPE ratifies the fe-codec-collection sibling (S1 presentational shell → `@vida/ui`; adapter → `apps/web`). Approved
> before per-slice work. Each slice is a full Entity-Delivery-Flow ② iteration (contract → scaffold → implement → tsc →
> audit → /critique → **per-slice Visual Gate**).

## The planes (interpretation §1 boundary — `@vida/ui` is Tamagui-only)

| plane | slice | what |
|---|---|---|
| **`@vida/ui`** (presentational) | **S1** | `DashboardView` — the RN-safe flex grid + `size`-enum span cells + per-cell `Card` frame + `renderBlock` render-prop + per-block state + empty-dashboard |
| **`apps/web`** (canon-wiring) | **S2** | the placement↔Dashboard adapter — pure `block_instances`→cell-descriptor mapping + types + convention (live `useDashboard` hook deferred to first consumer, R3) |

Two slices — the Dashboard has no view-config chrome (no switcher/filter/sort), so unlike Collection it collapses the
S1-core + S2-chrome into one presentational slice; the adapter is S2.

## Slices

### S1 — `DashboardView` (presentational shell) · plane `@vida/ui` · frontend
**Scope:** the whole presentational shell.
- an RN-safe flex grid (`flexDirection:'row'` + `flexWrap:'wrap'` + density→`gap`; the gallery-view precedent) [EC-1, EC-4];
- `size`-enum span cells (`sm|md|lg|full`) → a per-cell flex style `{flexGrow, flexShrink:1, flexBasis, minWidth floor,
  maxWidth cap}`; **`flexShrink:1` explicit** (RNW defaults 0); **per-span `maxWidth` cap** so a lone non-`full` cell can't
  grow to full width [EC-1, EC-6]; floors mobile-safe at 375 [EC-8];
- per-cell `Card` frame — `header` = block title + a `⋯` block-action **slot** (consumer-supplied node; the shell renders
  the slot, not a Menu) + `headerDivider`; body via **`renderBlock(block, state)`** render-prop [EC-2];
- **per-block state** — each cell renders `loading`/`empty`/`error`/`success` from the block descriptor's own `state`
  (threaded as a PROP, BR-2; the shell owns the default empty/error affordances, the renderBlock owns success) [EC-3];
- dashboard-level `role="region"` named via `aria-label`/`aria-labelledby`→heading (`warnMissingName`); an empty
  blocks list → a teaching `EmptyState` + an add-affordance slot [EC-5];
- DIRECT semantic tokens; `useReducedMotion` for any enter transition; React-19 ref-as-prop (non-generic — holds no `<T>`).
**Covers:** EC-1, EC-2, EC-3, EC-4, EC-5, EC-6, EC-8 (all `structural`) + EC-7 (`feel`, via the preset tokens).
**Visual Gate MUSTs:** EC-1/2/3/4/5/6/8 asserted in a real browser × 3 presets × light/dark × 375/768/1440 + axe.
**Out:** the block components (O2) · placement edit (O1) · the adapter (S2).

### S2 — placement↔Dashboard adapter (convention + types + pure mapping) · plane `apps/web` · shared
**Scope:** the documented shape a module/Space uses to drive `DashboardView` from the SHIPPED capability canon.
- `import type { BlockInstanceRow } from '@vida/core'` + the `capabilityDefinitions.render_targets`/`CapabilityRegistry`
  (interpretation §1 shipped contracts) — **this plane only** (forbidden in `@vida/ui`);
- a pure `toCellDescriptor(instance, def)` mapping a `standalone` `block_instances` row (+ its definition) → a
  `DashboardView` cell descriptor (id · title · `size` · `state`), and `toDashboardChrome(instances)` → region props;
- the `DashboardAdapter` **convention** interface (the mapping + the placement-write entry points, which are a
  **Capability** write — NOT implemented here, O1);
- a mapping unit test. **Live `useDashboard(spaceId)` hook deferred to the first consumer** (Home #18 / Finance), exactly
  the Collection adapter shape (pure pieces ship, hook defers) [R3; FACT: apps/web/src/collection/adapter.ts:36-92].
**Covers:** the §2.3 NEED + M3; no EC (ECs are presentational — carried by S1).
**Out:** the live hook · the placement-write Capability (O1) · per-module block sets (O3).

## EC → slice coverage (every `structural` EC maps to ≥1 slice)

| EC | type | slice | carried as |
|----|------|-------|-----------|
| EC-1 distinct span grid | structural | S1 | Visual-Gate MUST |
| EC-2 Card cell frame + ⋯ slot | structural | S1 | Visual-Gate MUST |
| EC-3 per-block independent state | structural | S1 | Visual-Gate MUST |
| EC-4 responsive reflow, no 375 overflow | structural | S1 | Visual-Gate MUST |
| EC-5 empty-dashboard teach | structural | S1 | Visual-Gate MUST |
| EC-6 no silent promotion to full (maxWidth cap) | structural | S1 | Visual-Gate MUST |
| EC-7 preset identity | feel | S1 | live Visual Gate (deferred) |
| EC-8 mobile-safe span floors | structural | S1 | Visual-Gate MUST |

All `structural` ECs home to S1 (the shell is where the grid/frame/state/reflow live) — coverage complete, no unhomed EC.

## Out of scope (homed by the docs — interpretation §5 OVERFLOWING)
- Placement EDIT (add/remove/drag/resize/reorder = a `block_instances` write) → a **Capability** (O1).
- The 11 `standalone` block WIDGETS + the registry wiring → their own unit(s)/module ② tracks (O2).
- Per-module / per-Space block SETS + live data wiring (Home's 4 regions, Finance's cards) → the owning ② track (O3).
- Home arrangement toggle (O4) · the Spaces page (O5) · the other archetype shells (O6).

## Build order
**S1 → S2.** S1 is the shell every consumer needs; S2 is the convention that maps the shipped canon into it. S1 carries all
ECs + the Visual Gate; S2 is pure + type-level (no Visual Gate — no rendered surface, the Collection-adapter precedent).
