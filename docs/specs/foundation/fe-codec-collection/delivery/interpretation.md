# fe-codec-collection — Interpretation Layer (Entity Delivery Flow ②, Step 1)

> **Unit:** LIF-207 · ② Frontend CODEC #4 · the **Collection shell** (decomposition.md §1.2). G6 net-new, EXTENDs ui-2 data-view.
> **Scope:** web, M1.0. COMPOSES the shipped ui-2 view-mode renderers (all 7, §1.1 — fe-codec-viewmodes completed the set) +
> ui-1 primitives + fe-codec-theme tokens + the fe-codec-patterns kit (`EmptyState`, `SyncStatus`, 8-state).
> **Method:** process.md §6 Step-1 **3-lens audit** (WRONG / MISSING / OVERFLOWING) over the frozen ui-2 renderer contracts
> + ADR-007 (Saved View) + ADR-008 (Capability) + the G1 Quality Bar + the fe-codec-viewmodes **O2 home** (view-chrome → here).
> No guessing — the governing ADRs + the sibling's resolved homes are READ, not decided; anything genuinely open goes to Victor.

---

## 0. What this unit is

The **Collection shell** — the first and highest-traffic of the 6 CODEC **archetype shells** (§1.2), named *"the
workhorse"* [FACT: decomposition.md:29 §1.2]. It is *"a Saved View rendered in a view-mode (1.1)"* [FACT:
decomposition.md:29] — the **top view of nearly every module** [FACT: surface-map.md:43,157]: Notes, Tasks (richest, 12
layouts), Projects, Habits, Books, Knowledge, Finance, Relationships, Notifications all mount a Collection as their
module top [FACT: decomposition.md:80-105].

**Where it sits — an ADAPTER + a SWITCHER between two frozen seams, not a renderer:**

```
ViewEngine.resolve (↑ @vida/core)         THIS UNIT                 the 7 renderers (↓ @vida/ui)
  ResolvedView{rows,groups,state,degraded} ──▶ Collection shell ──▶ list|table|board|gallery|
  a SavedView = filter × layout × grouping     • pick renderer by     calendar|graph|timeline
                                                 layout (dispatch)
                                               • view-mode SWITCHER
                                               • shared chrome (title/
                                                 count/sort/filter)
                                               • thread the 8-state
```

> **The renderers already ship.** fe-codec-viewmodes (#3) completed the canonical 7 — *"All 7 canonical VIEW_LAYOUT
> renderers now ship (list·gallery·timeline·calendar·graph·table·board)"* [FACT: packages/ui/src/CLAUDE.md "⟹ 8 UI-2
> views shipped … + table + board … the spine is complete"]. **This unit builds the shell that composes them** — the
> layout→renderer dispatch, the view-mode switcher, the shared chrome — NOT any renderer.

> **The view-chrome was HOMED here by the sibling (not re-opened).** fe-codec-viewmodes resolved its **O2**: *"View-chrome
> controls (sort toggle, layout switch, filter editing) = the **Collection shell** (decomposition §1.2), which composes the
> renderer; the bare renderer only renders the current sort as an `aria-sort` display"* [FACT:
> fe-codec-viewmodes/delivery/interpretation.md:140-141 O2]. So the switcher + sort + filter affordances are THIS unit's
> job, confirmed by the adjacent gate — not a decision reopened here.

---

## 1. DEPENDENCIES (frozen contracts — this unit builds ON, never patches around)

- **The 7 view-mode renderers (ui-2 V1–V4/V7 + fe-codec-viewmodes table/board)** — the components the Collection
  dispatches to. Each is a **read-only generic `XView<T>`** taking `items`/`getKey`/`renderItem` (or `columns`, or
  `groups`+`renderCard`, or `nodes`/`edges`) + `state` as a PROP [FACT: packages/ui/src/CLAUDE.md; list-view.tsx:10-18;
  table-view.tsx; board-view.tsx]. **Their prop shapes DIFFER per layout** (table→`columns`; board→`groups`+`renderCard`;
  graph→`nodes`/`edges`; calendar→a date field; gallery→a cover) [FACT: decomposition.md:21-22 §1.1; packages/ui/src/CLAUDE.md].
- **`VIEW_LAYOUT` canon** — the FIXED 7-member tuple `list·table·board·gallery·calendar·graph·timeline` + `type ViewLayout`;
  the vocabulary the switcher offers + the dispatch keys on [FACT: packages/types/src/view.ts:17-26].
- **The ui-2 data-view spine** (`internal/data-view.tsx`) — `type ViewState = 'loading'|'empty'|'error'|'success'` (the
  canonical renderer-state home) [FACT: internal/data-view.tsx:9-11].
- **`ResolvedView`** (the View Engine output the shell ultimately renders) — `{ rows: unknown[], groups: ResolvedGroup[],
  state: ViewState, degraded: string[] }`; the engine applies filter, resolves sort, **groups upstream**, returns a
  terminal state, **degrades never crashes** [FACT: packages/core/src/foundation/views/types.ts:37-43]. **@vida/core —
  uncrossable from @vida/ui.**
- **`ViewsService` / `ViewEngine`** — CRUD over the `views` table + `ViewEngine.resolve` (V3 cross-type resolution, V5
  terminal states); the per-module `ReadProvider` registry ships EMPTY, real providers register per-module at their build
  [FACT: foundation/views/CLAUDE.md "Built by AR-6"; types.ts:22-27]. Changing a SavedView's `layout` is a **ViewsService
  write** (view-config, NOT an entity write).
- **fe-codec-patterns kit** — `EmptyState` fills a Collection's empty slot; `SyncStatus`/`HonestProgress` for the chrome;
  the **8-state machine** (`apps/web/state-conventions/interaction-state.ts`) derives the state the shell threads as a PROP
  [FACT: packages/ui/src/CLAUDE.md "fe-codec-patterns"; apps/web/src/state-conventions].
- **fe-codec-theme tokens** — DIRECT semantic tokens; dimensions via the token scale (DEF-U8-h), never a sub-theme key; no
  hard-coded palette [FACT: packages/ui/src/CLAUDE.md:271-278; B-codec-6].
- **ui-1 primitives for the switcher** — `Tabs` (`role="tablist"`, roving tabindex, the B12 indicator) is the nearest
  shipped relative; `Menu`/`Select` also available. No segmented-control/toggle-group primitive ships [FACT:
  packages/ui/src/components/ ls — only tabs]. The switcher's exact primitive is a **contract/Envision decision** (§7).
- **ADR-007 Saved View** — a view = `filter × layout × grouping/sort`, Space-owned or global, read through documented
  providers; the engine groups/sorts **upstream** [FACT: packages/types/src/view.ts:1-12; ADR-007 §3.3].
- **ADR-008 Capability** — the interactive-write tier; anything that WRITES an entity (board drag-to-move) is a Capability,
  not the Collection chrome [FACT: ADR-008:15,71-72].

### THE boundary that governs every home (load-bearing)
**`@vida/ui` CANNOT import `@vida/core`** (Tamagui-only deps) [FACT: list-view.tsx:8-11; packages/ui/src/CLAUDE.md:125].
So the Collection necessarily **SPLITS across two planes**, exactly as fe-codec-patterns split (renderers → `@vida/ui`,
canon-importing logic → `apps/web`) [FACT: fe-codec-patterns/delivery/slice-map.md; packages/ui/src/CLAUDE.md "the 8-state
machine itself lives in apps/web … it imports the @vida/core canon, so it can't live here"]:

| plane | what | why |
|---|---|---|
| **`@vida/ui`** | the **presentational `CollectionView`** — view-mode switcher + active-renderer dispatch + shared chrome; `layout`/`layouts`/`onLayoutChange`/`state` + a per-layout render config as **PROPS** (structurally typed) | presentational, state-as-prop (BR-2); no `@vida/core` import |
| **`apps/web`** | the **canon-wiring convention** — how a module feeds a `ResolvedView` + `SavedView` into `CollectionView` props and persists a layout switch via `ViewsService` | imports `@vida/core` `ResolvedView`/`ViewsService` → can't live in `@vida/ui` |

> **The boundary is tighter than "@vida/ui ⊄ @vida/core" — it is Tamagui-only.** `@vida/ui`'s deps are
> `@tamagui/*` + `date-fns`/`sigma`/`graphology` ONLY; **it does not depend on `@vida/types` either** [FACT:
> packages/ui/package.json dependencies]. So `CollectionView`'s `layout` prop **cannot be typed `ViewLayout` from
> `@vida/types`** — it takes a **LOCAL union structurally ≡ `VIEW_LAYOUT`**, exactly as `data-view.tsx` defines
> `ViewState` locally rather than importing `@vida/core`'s `TerminalState` [FACT: internal/data-view.tsx:8-11;
> list-view.tsx:15]. (Verified at the greybox: importing `@vida/types` fails `tsc` — TS2307.) The app passes a real
> `ViewLayout` value; structural typing makes it assignable with no import.

## 2. NEEDS (what the unit must deliver)

1. **`CollectionView<T>` (`@vida/ui`, presentational)** — the shell:
   - a **view-mode SWITCHER** over the SavedView's *available* `layouts: ViewLayout[]` (a subset of the 7), with
     `layout` (current) + `onLayoutChange(next)` (controlled, state is the app's — the list-view `state`-as-prop model);
   - **active-renderer dispatch** — render the one renderer `layout` selects, forwarding its layout-specific props;
   - **shared chrome** — title/heading + result count + the sort indicator surface + a filter affordance slot (the O2
     home); honest, calm, teaching-invitation empties via `EmptyState`;
   - **threads `state: ViewState`** into the active renderer (BR-2 — derived by the app, passed as a prop).
2. **The layout→renderer dispatch + the per-layout render config type** — a typed way for a consumer to supply each
   available layout's renderer props (table→`columns`; board→`groups`+`renderCard`; list/gallery/timeline→`renderItem`;
   calendar→date accessor; graph→`nodes`/`edges`). Likely a `renderers` prop keyed by `ViewLayout` (structurally typed,
   no `@vida/core`).
3. **The `apps/web` SavedView↔Collection adapter CONVENTION** — the documented shape a module uses to map a `ResolvedView`
   + a `SavedView` into `CollectionView` props and to persist a layout switch via `ViewsService`. **Whether this ships as
   code or as a type+convention is a §1.4-style decomposition call** (no *built* consumer exists yet — §6 R3).
4. **Visual-Gate harness** — a Storybook specimen with fake data + fake renderers, exercising switch · each layout ·
   every state × light/dark × 375/768/1440 + a11y (the ui-2 / fe-codec-viewmodes precedent).
5. **Specs** — `docs/specs/components/.../collection-view.md` (+ `_index.md` update).

## 3. ORGANIZATION (where each piece slots — governed by §1's boundary)

```
packages/types  view.ts                       VIEW_LAYOUT canon (frozen — reused for the switcher + dispatch keys)
@vida/ui        components/collection-view.tsx CollectionView<T> — switcher + dispatch + chrome (net-new, presentational)
                components/collection-view.stories.tsx  the Visual-Gate surface (fake data + fake renderers)
                components/{list,table,board,gallery,calendar}-view.tsx · timeline.tsx · neural-graph.tsx  COMPOSED (frozen)
                components/empty-state.tsx · sync-status.tsx   REUSE (fe-codec-patterns)
                index.ts                       + export { CollectionView, its prop/render-config types }
apps/web        collection/ (or state-conventions/)  the SavedView↔Collection adapter convention (code OR type+convention
                                               per §6 R3) — imports @vida/core ResolvedView/ViewsService
docs/specs/components/ui-2-platform-views/collection-view.md · _index.md (updated)
— OUT of this unit (homed by the docs):
  • filter/group/sort LOGIC → the View Engine / provider (ADR-007 §3.3)
  • board drag-to-move + any entity write → a Capability (ADR-008, INT-2)
  • per-module layout VARIANTS + concrete data wiring (Tasks' 12, Notes' calendar/list/gallery/graph) → the module ② track
  • the SavedView persistence engine itself → ViewsService (AR-6, shipped)
```

## 4. IMPLICIT RULES (caught here, not in the browser)

- **The Collection is a shell, not a renderer** — it composes the 7 read-only renderers; it owns chrome + switch +
  dispatch, not the rendering of rows [FACT: decomposition.md:29 §1.2; §1.1].
- **`state` is a PROP across the package boundary** (BR-2) — `@vida/ui` never derives; the app derives via the 8-state
  machine + passes it [FACT: list-view.tsx:34-35; packages/ui/src/CLAUDE.md:125].
- **Switching layout is a view-config write, NOT an entity write** — it persists to the `views` table via `ViewsService`;
  it is controlled (`onLayoutChange`), the app owns the state [FACT: packages/types/src/view.ts:1-12; foundation/views/CLAUDE.md].
- **Filter / group / sort LOGIC is the engine's, delivered pre-resolved** — the shell renders a `ResolvedView`; it exposes
  chrome *affordances* (a filter slot, a sort indicator) but does not compute them [FACT: foundation/views/types.ts:37-43; ADR-007 §3.3].
- **Degrade, never crash** — every terminal state renders; `degraded[]` per-type degradations surface as a declared
  non-error outcome, not a crash [FACT: foundation/views/types.ts:41-43 BR-11/12].
- **Interactivity that writes is a Capability** — drag-to-move, inline edit → ADR-008 / module write API (INT-2), not the
  shell [FACT: ADR-008:15,71-72; fe-codec-viewmodes O1].
- **Tokens via DIRECT semantic tokens + the token scale for dimensions** (DEF-U8-h); no hard-coded palette [FACT:
  packages/ui/src/CLAUDE.md:271-278].
- **React 19 ref-as-prop, NO `forwardRef`** for the generic (erases `<T>`) [FACT: list-view.tsx:15; packages/ui/src/CLAUDE.md:127].
- **Accessible name + the switcher's APG pattern** — the switcher is a named control group (tablist/toolbar/listbox per
  the §7 decision); the active region gets an accessible name (`warnMissingName` precedent) [FACT: internal/data-view.tsx:26-30].
- **Reduced-motion honored** — any switch transition gates on `useReducedMotion` + the `@media` convention [FACT:
  packages/ui/src/CLAUDE.md "use-reduced-motion"].
- Consume frozen ui-2/theme/views contracts; if one looks wrong, STOP — don't patch the frontend around it [FACT: process.md:113].

---

## 5. THE 3-LENS AUDIT

### WRONG — contradicts a standard or a bar decision
- *(none found.)* The shell/renderer split, the state-as-prop boundary, the view-chrome home (O2), and the
  view-config-vs-entity-write line are all consistent with the canon + the sibling gate's resolved homes.

### MISSING — the archetype requires it, nothing exists
- **M1** **No Collection shell** — every module top needs one, `@vida/ui` ships no `CollectionView` and no view-mode
  switcher [FACT: grep clean; decomposition.md:29,157].
- **M2** **No switcher primitive** — no segmented-control/toggle-group in ui-1; the switcher must be built (composing
  Tabs/Menu/Select or hand-rolled per §7) [FACT: packages/ui/src/components/ ls].
- **M3** **No SavedView↔Collection adapter convention** in `apps/web` — the documented shape for mapping a `ResolvedView`
  into `CollectionView` props [FACT: apps/web/src grep clean].

### OVERFLOWING — past this shell's job (homed by the docs, NOT deferred)
- **O1** **Filter / group / sort LOGIC** → the View Engine / provider (ADR-007 §3.3); the shell only exposes chrome
  affordances [FACT: foundation/views/types.ts:37-43; ADR-007 §3.3].
- **O2** **Board drag-to-move + any entity write** → a Capability (ADR-008, INT-2); the shell renders read-only renderers
  [FACT: ADR-008:15,71-72; fe-codec-viewmodes O1].
- **O3** **Per-module layout variants + concrete data wiring** (Tasks' 12; each module's available-layout set + provider
  wiring) → the owning module's ② track (#27+) [FACT: decomposition.md:22,80-105; g6-reshape-runbook.md:65-67].
- **O4** **SavedView persistence / clone / global-vs-Space** → `ViewsService` (AR-6, shipped; `cloneView` = xs-views)
  [FACT: foundation/views/CLAUDE.md; TASKS.md xs-views LIF-177].
- **O5** **The Dashboard / Entity / Canvas shells** → their own units (#5/#6/#7-10); the Collection is only the
  view-mode-top archetype [FACT: decomposition.md:29-34 §1.2].

---

## 6. RESOLVED BY DOCS (stated as FACT — read from the governing ADRs + the sibling gate, not decided)

- **R1 — Scope = the Collection shell = switcher + dispatch + chrome over the 7 shipped renderers + a SavedView.** Not a
  renderer (those ship); the view-chrome is this unit's per the sibling's O2 [FACT: decomposition.md:29; fe-codec-viewmodes
  interpretation.md:140-141].
- **R2 — Splits across planes (BR-2).** Presentational `CollectionView` → `@vida/ui` (state + render config as props);
  canon-wiring → `apps/web`. The fe-codec-patterns 8-state split is the exact precedent [FACT: packages/ui/src/CLAUDE.md:125;
  fe-codec-patterns/delivery/slice-map.md].
- **R3 — The `apps/web` adapter's SHAPE (code vs type+convention) follows grep-before-net-new.** No *built* consumer of the
  Collection exists yet — same-milestone M1.2.1 units #20 `fe-spaces-page` / #21 `fe-sync-log` / #25 `fe-notifications`
  depend on it, and modules #27+ do too, but ALL ship after #4 (grep clean today) [FACT: g6-reshape-runbook.md:16-20
  milestone table + :49,55,59 dep lines]. So, exactly like fe-codec-patterns **ProviderRead** ("type+convention, not a
  hook — no built consumer"), the adapter ships as a **documented convention + types**, with the concrete per-module hook
  built at the first consumer. Ratified at Step 2 [FACT: fe-codec-patterns S5 "ProviderRead = type+convention not a hook"].
- **R4 — Renders a `ResolvedView`, degrades never crashes; `state` is a PROP.** The engine resolves/groups/sorts upstream;
  the shell threads the terminal state [FACT: foundation/views/types.ts:37-43; list-view.tsx:34-35].
- **R5 — Switching layout = a ViewsService view-config write, not an entity write; controlled + app-owned state** [FACT:
  packages/types/src/view.ts:1-12; foundation/views/CLAUDE.md].
- **R6 — Tokens via DIRECT semantic tokens + token scale for dimensions (DEF-U8-h); reduced-motion honored** [FACT:
  packages/ui/src/CLAUDE.md:271-278].

### Two precisions kept (flagged, not silently decided)
1. **The switcher primitive** (reuse Tabs `role="tablist"` vs a toolbar of toggle buttons vs a `Select` on mobile) is a
   genuine design choice with an APG-pattern consequence — resolved at `/contract` (Step 4) and shaped by the Envision gate
   (§7), not pre-decided here.
2. **The per-layout render-config prop shape** (one `renderers` map keyed by `ViewLayout` vs discrete props) is a
   decomposition/contract call (Step 2/4), flagged here.

## 7. ENVISION GATE (Step 1.5) — FIRES (doc test §3.75, applied to facts — NOT a decision)

The firing is a **mechanical one-question test**, not a judgment or a human choice; the human's role is the blocking
*review* of the greybox, not whether the gate fires [FACT: entity-delivery-flow.md:104-107,129-132].

**Test:** *"Is there a user affordance whose UI answer isn't already obvious from an existing shipped surface?"* — Yes →
fire (module hub · standalone entity page · novel interaction surface); No → skip (thin leaf reusing shipped list/detail ·
renders-nothing logic · pure backend) [FACT: entity-delivery-flow.md:104-107].

Applied, per affordance:

| affordance | UI answer obvious from a shipped surface? | FACT |
|---|---|---|
| **view-mode switcher** | **NO** — no segmented-control/toggle-group ships; `Tabs` is a semantic mismatch (tabs swap *different content*; a view-switch re-renders the *same data* in another layout) | packages/ui/src/components/ (only `tabs`) |
| **chrome composition** (switcher vs title/count/filter/sort; 375 reflow) | **NO** — no Collection shell exists | grep clean; decomposition.md:29,157 |
| active-renderer dispatch | YES — the 7 renderers ship | packages/ui/src/CLAUDE.md |

**Result = FIRE.** The Collection is the "workhorse" archetype shell / module-top (the fire case "module hub · novel
interaction surface"), and the switcher is the direct analogue of the MOD-notes *"how does a user link two notes?"*
affordance with no shipped UI answer — the exact class this gate catches [FACT: entity-delivery-flow.md:99-107;
decomposition.md:29,157]. None of the three SKIP cases hold (not a thin leaf; renders; not backend). Contrast
fe-codec-viewmodes, which correctly SKIPPED (read-only lenses reusing the calendar/list shipped patterns).

**Activity (next):** a THROWAWAY greybox from real `@vida/ui` primitives + fake data (`apps/web/src/__envision__/
collection.tsx` or a Storybook page, deleted after the gate; `frontend-design` as the composition aid), covering switch ·
each view-mode · every state · the 375/768/1440 reflow → the human reviews + pins `EC-n` (structural | feel) into
`delivery/envision.md` [FACT: entity-delivery-flow.md:109-121].

## 8. Open for Victor — the Envision REVIEW (not a fire decision)

Everything is doc-homed (§6); the §3.75 test resolves the gate to FIRE on facts (§7), not a decision. The one blocking
human step is the **review of the greybox + pinning the anchored EC-n** — which comes AFTER I author the greybox, per the
gate's exit criteria [FACT: entity-delivery-flow.md:129-132]. The two §6 precisions (switcher primitive; render-config prop
shape) are MINE to resolve at the greybox/`/contract`, surfaced for the review — not scattered questions. → Author the
greybox → human review → Step 2 Decomposition (slice-map + seam-contract, maps every `structural` EC to ≥1 slice).
