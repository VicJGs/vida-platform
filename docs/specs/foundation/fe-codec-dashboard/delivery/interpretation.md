# fe-codec-dashboard — Interpretation Layer (Entity Delivery Flow ②, Step 1)

> **Unit:** LIF-208 · ② Frontend CODEC #5 · the **Dashboard shell** (decomposition.md §1.2). G6 net-new. Blocked by
> `fe-codec-patterns` (#2) [FACT: reconstructed-structure.md:25; .claude/tasks/fe-codec-dashboard.md:15].
> **Scope:** web, M1.0. COMPOSES a GRID of **integration blocks** (§1.4) the consumer supplies via a render-prop +
> ui-1 primitives + fe-codec-theme tokens + the fe-codec-patterns kit (`EmptyState`, `SyncStatus`, 8-state).
> **Method:** process.md §6 Step-1 **3-lens audit** (WRONG / MISSING / OVERFLOWING) over the frozen fe-codec-collection
> shell precedent + ADR-008 (Capability/block) + the gallery-view grid precedent + the G1 Quality Bar.
> No guessing — the governing ADRs + the sibling's resolved homes are READ, not decided; anything genuinely open goes to Victor.

---

## 0. What this unit is

The **Dashboard shell** — the 2nd of the 6 CODEC **archetype shells** (§1.2). It is *"a grid of integration blocks
(1.4)"* [FACT: decomposition.md:30 §1.2], consumed by *"Home · Finance · Health · Projects"* [FACT: decomposition.md:30]
and, across the module set, by **~12 module-hub surfaces** (Home's 4-region hub + Habits · Projects · Learning · Books ·
Knowledge · Skills · Health · Finance · Relationships · Gamification; a Space surface + Feature Atlas also render a block
grid — ADR-008:59-62) [FACT: decomposition.md:65,67,69,85-105]. (The headcount is orientation — Purposes reads "Collection
(dashboards)", decomposition.md:97, not the Dashboard archetype; the exact per-surface set is the owning ② track, O3.) The
G5 line names it *"Dashboard shell (integration-block grid) · shell · ← #2"* [FACT: reconstructed-structure.md:25].

**Where it sits — a GRID COMPOSER of placed blocks, not a block renderer:**

```
block_instances / a Space surface (↑ @vida/core)   THIS UNIT                 integration blocks (↓ consumer render-prop)
  placed standalone block instances ───────────────▶ Dashboard shell ──▶ dailySummary · taskChecklist ·
  (block_instances: id · capability_def_id · config)   • arrange in an      eventsBlock · habitsBlock ·
                                                        RN-safe flex grid    chartBlock · pomodoroBlock …
                                                      • per-cell chrome +     (the 11 integration blocks —
                                                        span/size            types only; NONE built yet)
                                                      • thread per-block
                                                        8-state
```

> **The STANDALONE block widgets a Dashboard renders do NOT ship yet — the load-bearing contrast with the Collection
> sibling.** Collection composed the 7 view-mode renderers, which *already shipped* [FACT: packages/ui/src/CLAUDE.md "⟹ 8
> UI-2 views shipped … the spine is complete"]. The 11 **integration blocks** exist as a `@vida/types` union —
> `'dailySummary' | 'taskChecklist' | 'eventsBlock' | 'classesBlock' | 'habitsBlock' | 'timelineBlock' | 'chartBlock' |
> 'pomodoroBlock' | 'entityLink' | 'backlink' | 'milestoneBlock'` [FACT: packages/types/src/editor.ts:28-40]. Their
> **`inline` render target** (the editor-node form) ALREADY ships as placeholder TipTap node-views [FACT:
> packages/editor/src/extensions/integration-blocks.tsx, E5/UI-3] — but a **Dashboard renders the `standalone` form**, and
> **no `standalone` block WIDGET and no `DashboardView` ship in `@vida/ui`** [FACT: grep clean — packages/ui/src/index.ts:1-73
> exports no block, no Dashboard]. **So this unit builds the SHELL that lays out + frames whatever block the consumer
> supplies via a render-prop** — exactly the Collection shell's agnostic-composition move [FACT: collection-view.tsx:9-20
> "COMPOSES … via a render-prop; it is NOT a renderer"]. The `standalone` block widgets + their registry wiring are a
> separate, later concern.

> **A block's place on a dashboard is its `standalone` render target — and the backing contracts already ship.** ADR-008: a
> capability *"declares which of `inline` (editor block) and/or `standalone` (widget / Space surface / dashboard) it
> supports"* [FACT: ADR-008-capability-block-registry.md:59-62]; a `standalone` instance is *"a lightweight `block_instances`
> row"* [FACT: ADR-008:119-126]. That row is **not** a to-be-built table — `block_instances` is **shipped** (`capability_def_id`
> · `space_id` · `config` [E] · `_sync_*` · `deleted_at`; "standalone placements referenced by a Space") with
> `BlockInstanceRow`/`Insert` types, alongside `capability_definitions` (carrying `render_targets`) [FACT:
> packages/core/src/db/schema/foundation/capability.ts:19-30,33-44,66-67], a live `CapabilityRegistry` [FACT:
> packages/core/src/foundation/capability/index.ts], and the `RenderTarget = 'inline' | 'standalone'` type [FACT:
> packages/types/src/capability.ts:5-6]. The Dashboard shell renders `standalone` placements in a grid; the **app-plane
> adapter** binds these shipped `@vida/core`/`@vida/types` contracts (§1, §2.3).

---

## 1. DEPENDENCIES (frozen contracts — this unit builds ON, never patches around)

- **The fe-codec-collection shell** — the archetype-sibling precedent for an agnostic composition shell: compose foreign
  units via a **render-prop**, hold no data/`<T>`, use LOCAL union types, state-as-prop, degrade-never-crash, condense
  chrome at 375 [FACT: collection-view.tsx:9-20; fe-codec-collection/delivery/interpretation.md:20-43,138-157]. The
  Dashboard is the same SHAPE with a different composition (a multi-cell grid, not a single-slot switch).
- **The gallery-view RN-safe flex grid** — the one shipped grid precedent: `GalleryRoot` = `flexDirection:'row'` +
  `flexWrap:'wrap'` + density→`gap`; each tile a per-instance `weightStyle(w,min)` = `{flexGrow:w, flexShrink:1,
  flexBasis:w·min, minWidth:min, maxWidth:w·min·2}` [FACT: gallery-view.tsx:49-64,78-80]. **`flexShrink:1` MUST be
  explicit** — Tamagui/RNW defaults it to **0** (RN semantics), so a `flexBasis > viewport` cell can't shrink → 375
  overflow [FACT: gallery-view.tsx:72-80; packages/ui/src/CLAUDE.md "P4" flexShrink note]. **True CSS-grid / masonry is
  FORECLOSED** — Tamagui is RN-safe flex only (the P4 masonry foreclosure) [FACT: packages/ui/src/CLAUDE.md:196 "masonry is
  FORECLOSED by the RN-safe flex grid"; Tamagui = the universal RN component library, ADR-001:109-115].
- **The ui-2 data-view spine** (`internal/data-view.tsx`) — `type ViewState = 'loading'|'empty'|'error'|'success'` (the
  canonical renderer-state home) + `Message` + `warnMissingName` [FACT: internal/data-view.tsx:9-11]. A dashboard CELL can
  be in any of these states independently of its siblings.
- **fe-codec-patterns kit** — `EmptyState` (teaching-invitation) fills a block's / the dashboard's empty slot;
  `SyncStatus`/`HonestProgress` for chrome; the **8-state machine** (`apps/web/state-conventions/interaction-state.ts`)
  derives the state the shell threads as a PROP [FACT: packages/ui/src/CLAUDE.md "fe-codec-patterns";
  apps/web/src/state-conventions]. (fe-codec-patterns #2 is the declared blocker [FACT: reconstructed-structure.md:25].)
- **fe-codec-theme tokens** — DIRECT semantic tokens; dimensions via the token scale (DEF-U8-h), never a sub-theme key; no
  hard-coded palette [FACT: packages/ui/src/CLAUDE.md "Dimension props read the TOKEN SCALE"; B-codec-6].
- **ui-1 primitives for per-cell chrome** — `Card` (the static container with header/footer/`pad`/elevation) is the
  natural cell frame; `Menu` for a per-block action menu [FACT: packages/ui/src/CLAUDE.md "Card"/"Menu"]. The exact cell
  frame is a **contract/Envision decision** (§7).
- **ADR-008 Capability/block** — a block is a registry **definition** (id · kind · render-targets · bindings · effects ·
  config schema); an INSTANCE = a placed capability + config [FACT: ADR-008:17-26,119-126]. **Editing a placement is a
  write** (a `block_instances` row) → a Capability, NOT the shell (§5 O1).
- **The SHIPPED capability contracts the app-plane adapter binds (`@vida/core` + `@vida/types`, uncrossable from
  `@vida/ui`)** — `block_instances` (the `standalone` placement row: `capability_def_id` · `space_id` · `config` [E] ·
  `_sync_*` · `deleted_at`) + `BlockInstanceRow`/`Insert`, and `capability_definitions` (`render_targets` · `config_schema`
  · `terminal_states`) [FACT: packages/core/src/db/schema/foundation/capability.ts:19-30,33-44,66-67]; the live
  `CapabilityRegistry` + `createOfferedSetResolver` [FACT: packages/core/src/foundation/capability/index.ts]; the
  `RENDER_TARGET = ['inline','standalone']` / `RenderTarget` type [FACT: packages/types/src/capability.ts:5-6]. The adapter
  maps a `standalone` `block_instances` row (resolved through the registry) → a `DashboardView` cell descriptor — it does
  NOT invent a table; this is the app plane (forbidden in `@vida/ui`).
- **`@vida/types` block-type union** — `IntegrationBlockType` / the 11 integration blocks; the vocabulary a consumer's
  placement references [FACT: packages/types/src/editor.ts:28-40]. **Uncrossable from `@vida/ui`** (§ boundary).

### THE boundary that governs every home (load-bearing)
**`@vida/ui` CANNOT import `@vida/core` NOR `@vida/types`** — its deps are `@tamagui/*` + `date-fns`/`sigma`/`graphology`
ONLY [FACT: packages/ui/package.json:45-52]. So the Dashboard **SPLITS across two planes**, exactly as the Collection split
[FACT: collection-view.tsx:23-25 "LOCAL union ≡ @vida/types VIEW_LAYOUT … @vida/ui is Tamagui-only"]:

| plane | what | why |
|---|---|---|
| **`@vida/ui`** | the **presentational `DashboardView`** — the RN-safe flex grid + per-cell frame/span + the threaded per-block state; cells supplied as **PROPS** (a block descriptor list + a `renderBlock` render-prop, structurally typed) | presentational, state-as-prop (BR-2); no `@vida/core`/`@vida/types` import |
| **`apps/web`** | the **canon-wiring convention** — how a module/Space maps `block_instances` + a block registry → the shell's props, and persists a placement change via the block-instance write API | imports `@vida/core`/`@vida/types` → can't live in `@vida/ui` |

> So the shell's block-id/layout types are **LOCAL unions** structurally ≡ `@vida/types`, exactly as `collection-view.tsx`
> defines `ViewLayout` locally and `data-view.tsx` defines `ViewState` locally [FACT: collection-view.tsx:23-25;
> internal/data-view.tsx:9-11]. The app passes real `@vida/types` values; structural typing makes them assignable with no
> import.

## 2. NEEDS (what the unit must deliver)

1. **`DashboardView` (`@vida/ui`, presentational)** — the shell:
   - an **RN-safe flex grid** of cells (the gallery-view precedent: `row`+`wrap`+density→`gap`), each cell sized by a
     **span/size** descriptor (some blocks are wide — a "stats glance" — some narrow; the exact span model is a §7 precision);
   - **per-cell framing** — an optional block header (title + a block-action slot) + the block body via `renderBlock`;
   - **per-block 8-state threading** — each cell renders `loading`/`empty`/`error`/`success` independently (BR-2 — the app
     derives per block + passes it);
   - **dashboard-level chrome** — an optional heading/region name; honest, calm empties via `EmptyState` when the
     dashboard itself has no blocks;
   - **responsive reflow** — multi-column at 1440/768 → single column at 375, cells shrinking to the floor (the gallery 375
     model).
2. **The cell descriptor + `renderBlock` render-prop type** — a typed way for a consumer to declare each placed block (its
   id/key, title, span) and render its body per state, keeping `DashboardView` agnostic of the 11 block shapes **and** free
   of any `@vida/core`/`@vida/types` type.
3. **The `apps/web` placement↔Dashboard adapter CONVENTION** — the documented shape a module/Space uses to map
   `block_instances` (+ the block registry) into `DashboardView` props and to persist a placement change. **Whether this
   ships as code or type+convention is a §1.4-style decomposition call** (no *built* consumer exists yet — §6 R3).
4. **Visual-Gate harness** — a Storybook specimen with fake blocks (varied spans + mixed per-block states), exercising the
   grid · per-cell state · the 375/768/1440 reflow + a11y (the ui-2 / fe-codec-collection precedent).
5. **Specs** — `docs/specs/components/ui-2-platform-views/dashboard-view.md` (+ `_index.md` update).

## 3. ORGANIZATION (where each piece slots — governed by §1's boundary)

```
packages/types  editor.ts                       the 11 integration-block union (frozen — the consumer's placement vocab)
@vida/ui        components/dashboard-view.tsx    DashboardView — RN-safe flex grid + per-cell frame/span + state (net-new, presentational)
                components/dashboard-view.stories.tsx  the Visual-Gate surface (fake blocks, varied spans + states)
                components/gallery-view.tsx      grid precedent (weightStyle/GalleryRoot) — PATTERN, not imported
                components/card.tsx              REUSE as the cell frame (if §7 picks Card)
                components/empty-state.tsx · sync-status.tsx   REUSE (fe-codec-patterns)
                internal/data-view.tsx           REUSE ViewState + Message + warnMissingName
                index.ts                         + export { DashboardView, its descriptor/render-prop types }
apps/web        dashboard/ (or state-conventions/)  the placement↔Dashboard adapter convention (code OR type+convention
                                                 per §6 R3) — imports @vida/core/@vida/types
docs/specs/components/ui-2-platform-views/dashboard-view.md · _index.md (updated)
— OUT of this unit (homed by the docs):
  • the 11 integration-block COMPONENTS + the block registry → their own unit(s) / module ② tracks (ADR-008)
  • placement EDIT (add/remove/drag/resize/reorder = a block_instances write) → a Capability (ADR-008; O1)
  • per-module / per-Space block SETS + live data wiring (Home's 4 regions, Finance's cards) → the owning ② track (O3)
  • the arrangement toggle (Home Journal-first/Dashboard-first = a user pref) → Home #18 (O4)
  • the Spaces page itself (Collection of Spaces + Flow) → fe-spaces-page #20 (O5)
  • the other archetype shells (Collection/Entity/Canvas/Flow/System) → their own units (O6)
```

## 4. IMPLICIT RULES (caught here, not in the browser)

- **The Dashboard is a shell, not a block renderer** — it composes blocks the consumer supplies; it owns the grid + cell
  frame + span + per-block state threading, not a block's internals [FACT: decomposition.md:30 §1.2; collection-view.tsx:9-20].
- **`state` is a PROP across the package boundary** (BR-2) — `@vida/ui` never derives; the app derives via the 8-state
  machine + passes it, **per block** [FACT: list-view.tsx:34-35; packages/ui/src/CLAUDE.md].
- **Editing a placement is a WRITE → a Capability, not the shell** — add/remove/drag/resize/reorder persists a
  `block_instances` row; the shell renders placements read-only (the board drag-to-move precedent, O1) [FACT:
  ADR-008:119-126; fe-codec-collection/delivery/interpretation.md:178-179 O2].
- **Grid = RN-safe flex, never CSS grid / masonry** — `flexDirection:'row'`+`flexWrap:'wrap'`+`gap`; per-cell
  `flexGrow/flexBasis/minWidth/maxWidth` with **explicit `flexShrink:1`** (RNW defaults 0) [FACT: gallery-view.tsx:72-80;
  ADR-001:109-115].
- **Degrade, never crash** — every per-block terminal state renders; an empty dashboard renders an `EmptyState`, not a
  blank [FACT: collection-view.tsx; packages/ui/src/CLAUDE.md "degrade-never-crash"].
- **Tokens via DIRECT semantic tokens + the token scale for dimensions** (DEF-U8-h); no hard-coded palette [FACT:
  packages/ui/src/CLAUDE.md "Dimension props read the TOKEN SCALE"].
- **React 19 ref-as-prop, NO `forwardRef`** (a generic `forwardRef` erases `<T>`; the shell holds no data so likely
  non-generic anyway — the collection-view precedent) [FACT: collection-view.tsx; packages/ui/src/CLAUDE.md].
- **Accessible name + the grid's a11y pattern** — the dashboard region gets an accessible name (`warnMissingName`
  precedent); each cell is a labeled region (the exact role is a §7 decision) [FACT: internal/data-view.tsx:26-30].
- **Reduced-motion honored** — any reflow/enter transition gates on `useReducedMotion` + the `@media` convention [FACT:
  packages/ui/src/CLAUDE.md "use-reduced-motion"].
- Consume frozen gallery-grid/theme/patterns contracts; if one looks wrong, STOP — don't patch the frontend around it
  [FACT: process.md:113].

---

## 5. THE 3-LENS AUDIT

### WRONG — contradicts a standard or a bar decision
- *(none found.)* The shell/block split, the state-as-prop boundary, the RN-safe-flex grid, and the placement-write =
  Capability line are all consistent with the canon + the Collection sibling's resolved homes.

### MISSING — the archetype requires it, nothing exists
- **M1** **No Dashboard shell** — 12 module/hub surfaces need one; `@vida/ui` ships no `DashboardView` and no block grid
  [FACT: grep clean — packages/ui/src/index.ts:1-73; decomposition.md:30,65,85-105].
- **M2** **No RN-safe block-grid layout** reusable for heterogeneous spans — gallery-view's grid is uniform-tile
  (width-weight), not a span-declaring block grid; the Dashboard needs a cell/span model [FACT: gallery-view.tsx:49-80].
- **M3** **No placement↔Dashboard adapter convention** in `apps/web` — the documented shape for mapping `block_instances`
  into `DashboardView` props [FACT: apps/web/src grep clean — all surface dirs `.gitkeep`].

### OVERFLOWING — past this shell's job (homed by the docs, NOT deferred)
- **O1** **Placement EDIT (add/remove/drag/resize/reorder)** → a Capability (a `block_instances` write, ADR-008); the shell
  renders placements read-only [FACT: ADR-008:119-126; fe-codec-collection interpretation.md:178-179].
- **O2** **The 11 integration-block COMPONENTS + the block registry** → their own unit(s)/module ② tracks; only the TYPES
  exist today [FACT: packages/types/src/editor.ts:28-40; grep clean in packages/ui].
- **O3** **Per-module / per-Space block SETS + live data wiring** (Home's 4 region-blocks; Finance's cards; Health's
  metrics glance) → the owning module's ② track [FACT: decomposition.md:65,85-105].
- **O4** **The Home arrangement toggle** (Journal-first/Dashboard-first = a user pref) → Home #18 [FACT: decomposition.md:65].
- **O5** **The Spaces page** (a Collection of Spaces + a Flow + per-Space config) → fe-spaces-page #20 [FACT:
  decomposition.md:67]. (A Space *surface* may REUSE this shell to render its blocks — ADR-008:59-62 — but building the
  Spaces page is #20.)
- **O6** **The other archetype shells** (Collection #4 shipped · Entity #6 · Canvas #7-10 · Flow · System) → their own
  units [FACT: decomposition.md:29-34 §1.2].

---

## 6. RESOLVED BY DOCS (stated as FACT — read from the governing ADRs + the sibling gate, not decided)

- **R1 — Scope = the Dashboard shell = an RN-safe flex grid + per-cell frame/span + per-block state threading over blocks
  the consumer supplies.** Not the blocks (types only; none built), not placement-editing (a Capability), not per-module
  block sets [FACT: decomposition.md:30; reconstructed-structure.md:25; ADR-008:119-126].
- **R2 — Splits across planes (BR-2).** Presentational `DashboardView` → `@vida/ui` (descriptors + render-prop + state as
  props); canon-wiring → `apps/web`. The Collection split is the exact precedent [FACT: collection-view.tsx:23-25;
  fe-codec-collection slice-map].
- **R3 — The `apps/web` adapter ships the pure mapping pieces + types + convention; only the LIVE hook defers.** No *built*
  consumer exists (all surface dirs `.gitkeep`); Home #18 / Finance / Health / the modules ship after #5 [FACT: apps/web/src
  grep clean; decomposition.md:65,85-105]. The Collection adapter is the exact precedent — it ships **real pure code**
  (`toCollectionChrome`, `bindViewConfigWrites`, `isFilterActive`, `createCollectionAdapter`) + types + convention, and
  defers only the live `useCollection` React-Query hook to the first consumer [FACT: apps/web/src/collection/adapter.ts:36-92].
  So the Dashboard adapter inherits that shape: pure `block_instances`→cell-descriptor mapping + types + convention NOW; the
  live `useDashboard(spaceId)` hook at the first consumer. Ratified at Step 2.
- **R4 — Each block cell threads its own `ViewState` as a PROP; degrade never crashes** [FACT: internal/data-view.tsx:9-11;
  list-view.tsx:34-35].
- **R5 — Editing a placement = a block-instance write = a Capability, not the shell; rendering a placement is read-only**
  [FACT: ADR-008:119-126; fe-codec-collection interpretation.md:178-179].
- **R6 — Grid via RN-safe flex (gallery precedent), explicit `flexShrink:1`, token-scale dimensions, reduced-motion
  honored; no CSS grid/masonry** [FACT: gallery-view.tsx:72-80; ADR-001:109-115; packages/ui/src/CLAUDE.md].

### Two precisions kept (flagged, not silently decided)
1. **The cell SPAN model** — how a block declares its grid footprint: a numeric `span`/`columns`, a `size` enum
   (`sm|md|lg|full`), or the gallery-style width-`weight`. A genuine design choice with a layout/reflow consequence —
   resolved at the greybox (Envision) + `/contract` (Step 4), not pre-decided.
2. **The per-cell FRAME** — does the shell wrap each block in a `Card` (header + action slot + elevation), a bare titled
   region, or leave framing entirely to `renderBlock`? A contract/Envision precision (the per-block header + a block-menu
   slot are the candidates), flagged here.

## 7. ENVISION GATE (Step 1.5) — FIRES (doc test §3.75, applied to facts — NOT a decision)

The firing is a **mechanical one-question test**, not a judgment or a human choice; the human's role is the blocking
*review* of the greybox, not whether the gate fires [FACT: entity-delivery-flow.md:104-107,129-132 — source is the global
toolkit `~/dev-toolkit/claude-profiles/project-foundation/knowledge/reference-docs/entity-delivery-flow.md`, not the repo;
[[envision-gate-firing-is-a-doc-test-not-a-human-decision]]].

**Test:** *"Is there a user affordance whose UI answer isn't already obvious from an existing shipped surface?"* — Yes →
fire (module hub · standalone entity page · novel interaction surface); No → skip [FACT: entity-delivery-flow.md:104-107].

Applied, per affordance:

| affordance | UI answer obvious from a shipped surface? | FACT |
|---|---|---|
| **heterogeneous block grid** (varied spans, per-cell frame, responsive reflow of differently-sized cells) | **NO** — gallery-view's grid is uniform-tile width-weight, not a span-declaring block dashboard; no Dashboard shell exists | gallery-view.tsx:49-80; grep clean |
| **per-cell chrome + per-block state** (how a cell frames a block + shows its own loading/empty/error) | **NO** — no dashboard cell frame ships; Card is a candidate but the composition is novel | packages/ui/src/CLAUDE.md "Card"; grep clean |
| the 8-state / tokens / reduced-motion | YES — the fe-codec-patterns kit ships | packages/ui/src/CLAUDE.md "fe-codec-patterns" |

**Result = FIRE.** The Dashboard is an archetype shell / **module hub** surface (the fire case "module hub · novel
interaction surface"), and the block-grid composition has no shipped UI answer — the exact class this gate catches [FACT:
entity-delivery-flow.md:99-107; decomposition.md:30]. None of the three SKIP cases hold (not a thin leaf; renders; not
backend). This mirrors the Collection sibling, which also FIRED on the same archetype-shell basis [FACT:
fe-codec-collection/delivery/interpretation.md:217-238].

**Activity (next):** a THROWAWAY greybox from real `@vida/ui` primitives + fake blocks (`apps/web/src/__envision__/
dashboard.tsx` or a Storybook page, deleted after the gate; `frontend-design` as the composition aid), covering the grid
with varied spans · a mix of per-block states (loading/empty/error/success) · the 375/768/1440 reflow · the per-cell frame
→ the human reviews + pins `EC-n` (structural | feel) into `delivery/envision.md` [FACT: entity-delivery-flow.md:109-121].

## 8. Open for Victor — the Envision REVIEW (not a fire decision)

Everything is doc-homed (§6); the §3.75 test resolves the gate to FIRE on facts (§7), not a decision. The one blocking
human step is the **review of the greybox + pinning the anchored EC-n** — which comes AFTER I author the greybox, per the
gate's exit criteria [FACT: entity-delivery-flow.md:129-132]. The two §6 precisions (the cell span model; the per-cell
frame) are MINE to resolve at the greybox/`/contract`, surfaced for the review — not scattered questions. → Author the
greybox → human review → Step 2 Decomposition (slice-map + seam-contract, maps every `structural` EC to ≥1 slice).
