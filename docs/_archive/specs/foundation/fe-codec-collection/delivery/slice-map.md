# fe-codec-collection — Slice Map (Decomposition Gate, Step 2) · Decide-mode

> **Unit grain is doc-fixed** (Tier-0 §1.2 archetype shell "Collection", G6 unit #4) [FACT: decomposition.md:29;
> g6-reshape-runbook.md:34]; the **internal slicing is proposed** (Decide-mode). The unit **splits across two planes**
> (BR-2 / Tamagui-only boundary — interpretation §1): the presentational shell → `@vida/ui`, the canon-wiring → `apps/web`.
> Grounds: interpretation.md §1–§6 · envision.md EC-1…EC-8 (Victor-approved) · packages/ui/src/{components,internal} ·
> ADR-007 §3.3 · the BR-2 boundary.

## The pieces this unit adds (interpretation §2), and their home (R2 = the BR-2/Tamagui-only boundary)

| Piece | Kind | Home | Precedent | Gate |
|---|---|---|---|---|
| `CollectionView<T>` core — switcher + dispatch + states + title/count | presentational (state-as-prop) | `@vida/ui` | list-view (state-as-prop) · tabs (roving toolbar) | Visual |
| view-config chrome — Filter · Sort · `+` new-view entry points | presentational slots | `@vida/ui` | archetype specimen chrome | Visual |
| SavedView↔Collection adapter | **type + convention** (no M1 consumer) | `apps/web` | fe-codec-patterns `ProviderRead` | Verification |

> `CollectionView` is presentational → `@vida/ui`; `state`/`layout` as PROPS; a **LOCAL `ViewLayout` union** (≡
> `VIEW_LAYOUT`, NO `@vida/types` dep — the `ViewState`-local precedent, verified at the greybox: importing `@vida/types`
> fails `tsc`). The adapter imports `@vida/core` (`ResolvedView`/`ViewsService`) → must live in `apps/web` [FACT:
> interpretation §1 boundary table; internal/data-view.tsx:8-11].

## Gate-resolved homings (read from the docs — not decisions; interpretation §5/§6 + the envision doc-check)

- **H1 — The Collection is a SHELL, not a renderer.** It composes the 7 shipped read-only renderers; it owns switch +
  dispatch + chrome, never the rendering of rows [FACT: decomposition.md:29 §1.2].
- **H2 — Switching layout = a view-config write (ViewsService), NOT an entity write.** Controlled (`onLayoutChange`),
  app-owned state [FACT: view.ts:1-12; foundation/views/CLAUDE.md]. Filter/sort/group LOGIC is the engine's (O1); the
  chrome only exposes entry points.
- **H3 — Interactivity that writes an entity is a Capability** (drag-to-move, inline edit) → ADR-008/INT-2, OVERFLOWING
  (O2) [FACT: ADR-008:71-72; fe-codec-viewmodes O1].
- **H4 — The app-side adapter ships as type+convention** (not a concrete hook) — no *built* consumer exists yet:
  same-milestone M1.2.1 units #20/#21/#25 + modules #27+ depend on this unit but ALL ship after #4 (grep clean today); the
  `ProviderRead` precedent (convention-only in M1, hook at the first consumer) [FACT: g6-reshape-runbook.md:16-20 +
  :49,55,59; fe-codec-patterns S5].
- **H5 — Switcher = inline LABEL toolbar + `+` new-view; 375 CONDENSES to overflow/menu; chrome ACTIVE in all states.**
  The three envision sub-questions, doc-resolved (archetype specimen p6-archetypes-design.html:177; shell-layout.md:67
  control-reflow; interaction-state.ts:13 + quality-bar §6). See envision.md §"RESOLVED by the doc check".

## Slices

### S1 — `CollectionView<T>` core (switcher + dispatch + states) · `@vida/ui` · rendered
**Does:** the shell frame. A **view-mode SWITCHER** — a `role="toolbar"` of inline-**label** toggle `Button`s over
`layouts` (active = filled/`intent="primary"` + `aria-pressed`; NOT `Tabs` — a view-switch re-renders the *same data*,
tabs swap *different content*), **condensing to an overflow/menu at 375** (shell global-bar precedent; ≥44×44 targets),
reduced-motion-honored. **Layout→renderer DISPATCH** — renders the active layout via a consumer-supplied
`renderView(layout, state)` render-prop (keeps `CollectionView` agnostic of the 7 renderer prop shapes — see
seam-contract). **`state` threading** — the 4 `ViewState` values: `loading`/`error`/`empty`(→`EmptyState` slot, calendar
keeps its designed grid)/`success`. Chrome: title (`$display`) + count (success only; `—` otherwise). Tokens via DIRECT
semantic tokens + the token scale (DEF-U8-h); React-19 ref-as-prop (no `forwardRef`); no sub-theme.
**Touches:** `packages/ui/src/components/collection-view.tsx` (+ `.test.tsx` + `.stories.tsx`); `index.ts` export;
`docs/specs/components/ui-2-platform-views/collection-view.md` + `_index.md`.
**Invariants:** shell not renderer (composes, doesn't render rows); `layout`/`state` are PROPS; local `ViewLayout` union
(no `@vida/types` dep); switcher is a labeled toolbar (not Tabs); degrade-never-crash (every state renders); accessible
name on the toolbar + active region (dev-warn).
**Covers EC:** EC-1 (7 reachable, active distinct, same-data switch) · EC-3 (empty = EmptyState; calendar grid) · EC-4
(375 condense + ≥44×44) · EC-5 (calm error/degraded) · EC-7 (switch feels instant/calm, reduced-motion) · EC-8 (switcher
hover/active consistent).
**Done when (Visual Gate):** switcher + all 7 dispatched renderers + all 4 states render; 375 condense proven; light/dark ×
375/768/1440 × 3 presets; AA full-matrix (incl. warm-dark); a11y sweep (toolbar `aria-pressed`, accessible names, keyboard
reach); `tsc` 0; `@vida/ui` tests green; `/critique` SHIP.

### S2 — view-config chrome affordances (Filter · Sort · `+` new-view) · `@vida/ui` · rendered
**Does:** extends the S1 chrome with the view-config ENTRY POINTS — a **Filter** control (opens the filter editor; a
badge when a filter is applied), a **Sort** indicator + control (DISPLAY `sortLabel` e.g. "Due ↑" + `onSort`), and the
**`+` new-view** affordance (create/clone a SavedView). All are **controlled slots emitting callbacks** — the LOGIC
(filter/sort/group resolution, view create/clone) is the engine's / ViewsService's (H2/O1), NOT here. Chrome stays
**ACTIVE across all states** (H5; the 8-state owns no chrome rule; honesty bar forbids fake spinners, not active controls).
Inline **label** affordances matching the archetype specimen.
**Touches:** `packages/ui/src/components/collection-view.tsx` (chrome region) + `.test.tsx` + `.stories.tsx`;
`collection-view.md` (chrome section).
**Invariants:** entry points only (no filter/sort/create logic); controlled; active in all states; accessible labels;
tokens direct-semantic.
**Covers EC:** EC-2 (chrome persistent + active across states) · EC-6 (label switcher + `+` new-view; entry points, logic
homed to engine/ViewsService).
**Done when (Visual Gate):** Filter/Sort/`+` render + emit callbacks; active in loading/error/empty; badge on applied
filter; light/dark × 375 (condensed) /768/1440; a11y (accessible names, keyboard); `tsc` 0; tests green; `/critique` SHIP.

### S3 — SavedView↔Collection adapter convention · `apps/web` · shared (type + convention)
**Does:** the documented SHAPE a module uses to drive `CollectionView` from the canon — maps a `ResolvedView`
(`{rows,groups,state,degraded}`) + a `SavedView` (`{layout, availableLayouts, filter, sort, grouping}`) into
`CollectionView` props, and persists `onLayoutChange` via `ViewsService.update(viewId,{layout})` + re-resolve. Ships as a
**type + convention + doc** (H4 — no M1 consumer; the concrete per-module hook is built at the first module ② track),
exactly the `ProviderRead` resolution. Imports `@vida/core` → `apps/web`.
**Touches:** `apps/web/src/collection/` (types + convention module) + `.test.ts`; a layer `CLAUDE.md`;
`docs/core/architecture/` note (or `collection-view.md` §adapter).
**Invariants:** type+convention (no live hook); the only place `@vida/core` meets `CollectionView`; `onLayoutChange` =
ViewsService view-config write (H2), never an entity write.
**Covers EC:** none rendered (wiring/logic; renders nothing new) — it realizes H2/H4 + the seam.
**Done when (Verification Gate — no Visual Gate):** the adapter types compile against real `ResolvedView`/`ViewsService`
+ the `CollectionView` props; a convention test proves a `ResolvedView`→props mapping + a layout-switch→ViewsService call;
`tsc` 0; `/critique` SHIP. (No Visual Gate — no new rendered surface, the ux-4/ProviderRead precedent.)

## Dependency order
**S1 → S2 → S3.** S1 is the load-bearing switch/dispatch/states core (the approved vision); S2 extends its chrome with the
view-config entry points; S3 wires the canon against the finished S1+S2 component API. No shared-extraction slice (the
shell shares no layout code with the renderers; `internal/data-view` already exists).

## Out of scope (interpretation O1–O5; doc-homed, NOT deferred)
- **Filter / group / sort LOGIC** → the View Engine / provider (O1) [FACT: foundation/views/types.ts:37-43; ADR-007 §3.3].
- **Entity writes** (board drag-to-move, inline edit) → a **Capability** (O2) [FACT: ADR-008:71-72].
- **Per-module layout variants + concrete data wiring** (Tasks' 12; each module's available-layout set + providers) →
  the owning module's ② track (O3) [FACT: decomposition.md:22,80-105].
- **SavedView persistence / clone / global-vs-Space** → `ViewsService` (O4; `cloneView` = xs-views) [FACT: foundation/views/CLAUDE.md].
- **The Dashboard / Entity / Canvas shells** → their own units #5/#6/#7-10 (O5) [FACT: decomposition.md:29-34].

## Envision coverage (gate FIRED — every `structural` EC maps to ≥1 slice, plane-aware)

| EC | type | slice(s) | plane note |
|----|------|----------|------------|
| EC-1 reachable/active/same-data | structural | **S1** | frontend → Visual-Gate MUST |
| EC-2 chrome persistent + active | structural | **S2** (+ S1 switcher/title persist) | frontend → Visual-Gate MUST |
| EC-3 empty = EmptyState; calendar grid | structural | **S1** | frontend → Visual-Gate MUST |
| EC-4 375 condense + ≥44×44 | structural | **S1** | frontend → Visual-Gate MUST |
| EC-5 calm error/degraded | structural | **S1** | frontend → Visual-Gate MUST |
| EC-6 label switcher + `+` new-view | structural | **S2** | frontend → Visual-Gate MUST |
| EC-7 switch instant/calm, reduced-motion | feel | S1 | live Visual Gate row |
| EC-8 switcher hover/active consistent | feel | S1/S2 | live Visual Gate row |

**All 6 structural ECs map to ≥1 frontend slice (S1/S2) → carried as named Visual-Gate MUSTs. Coverage complete.**
