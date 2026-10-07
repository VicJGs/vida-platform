# fe-codec-entity-facet — Interpretation Layer (Entity Delivery Flow ②, Step 1)

> **Unit:** LIF-209 · ② Frontend CODEC #6 · the **Entity shell + Layout/Editor facet system** (merged/tabbed;
> registry-gated editor). G6 net-new. Blocked by `fe-codec-patterns` (#2) + `fe-codec-collection` (#4)
> [FACT: docs/specs/foundation/frontend-replan/reconstructed-structure.md:26].
> **Scope:** web, M1.0. The **3rd archetype shell** (Collection #4 ✅, Dashboard #5 ✅, **Entity #6 ← this**) — it COMPOSES
> two **facets** (a Layout facet + an optional Editor facet) the consumer supplies via slots/render-props, over ui-1
> primitives + fe-codec-theme tokens + the fe-codec-patterns kit. It is a **facet FRAME**, not a Layout renderer and not an
> Editor [FACT: decomposition.md:31 §1.2; frontend-quality-bar/_index.md:113-118].
> **Method:** process.md §XXVI Step-1 **3-lens audit** (WRONG / MISSING / OVERFLOWING) over the frozen collection-view +
> dashboard-view shell precedents + the §4.2 Composition model + the G1 Quality Bar. No guessing — the governing docs +
> the shipped siblings' resolved homes are READ, not decided; anything genuinely open goes to Victor.

---

## 0. What this unit is

The **Entity shell** — *"the facet system"* [FACT: decomposition.md:31 §1.2], the archetype shell behind **every entity
page in the OS** (a Task page, a Habit page, a Project page, a Contact page…). It is defined as:

> **Entity** = **Layout facet** (Title · bio · summary · dashboard · views) **+ optional Editor facet** (linked page,
> *registry-gated*); user picks **merged / tabbed** [FACT: decomposition.md:31 §1.2; reconstructed-structure.md:26;
> frontend-quality-bar/_index.md:114-118].

**Where it sits — a FACET FRAME that composes two already-shipped shells + a not-yet-built editor:**

```
the entity's data (↑ @vida/core, apps/web)   THIS UNIT (EntityView, @vida/ui)      the facet bodies (↓ consumer slots)
  entity row + pages(entity_type)  ─────────▶ Entity shell              ──▶ LAYOUT facet body:
  isEntityType() registry gate                • frame the two facets        Title·bio·summary +
  per-instance merged/tabbed memory           • mode = merged | tabbed      DashboardView(#5 ✅) · CollectionView(#4 ✅)
                                              • offer Editor facet IFF   ──▶ EDITOR facet body:
                                                an `editor` slot passed      the entity's linked page = the TipTap
                                              • per-facet a11y/chrome        block canvas (Canvas: Editor #7 — NOT built,
                                                                             NOT a dep; arrives as a consumer slot)
```

> **The Entity shell renders NO facet internals — the load-bearing contrast with both siblings, nested one level deeper.**
> Collection composed the 7 view renderers (shipped); Dashboard composed 11 block widgets (types-only). The Entity shell
> composes **two whole facets**, and *neither facet's body is this unit's job*:
> - The **Layout facet** is *"Title · bio · summary · dashboard · views/content"* [FACT: frontend-quality-bar/_index.md:114].
>   Its `dashboard` sub-slot IS the shipped `DashboardView` [FACT: packages/ui/src/components/dashboard-view.tsx:8-15]; its
>   `views/content` sub-slot IS the shipped `CollectionView` [FACT: packages/ui/src/components/collection-view.tsx:9-15]. The
>   shell frames the facet; the consumer supplies the composed Layout body (Title/bio/summary + those shells).
> - The **Editor facet** is *"the entity's linked page"* [FACT: frontend-quality-bar/_index.md:115] = the TipTap block
>   canvas, which is **Canvas: Editor #7 — not built, and not even a dependency of #6** [FACT: reconstructed-structure.md:26
>   deps `#2 #4`; :27 #7 deps `#2`]. So the shell provides the *tab/slot* for the editor; the editor arrives as a consumer
>   node later.
>
> **So this unit builds the FRAME that composes two facet bodies the consumer supplies, in a merged-or-tabbed mode** —
> exactly the Collection/Dashboard agnostic-composition move, one level up [FACT: collection-view.tsx:17-20; dashboard-view.tsx:17-24].
> The one genuinely novel thing `EntityView` owns that its siblings don't: **the merged/tabbed facet composition mode**.

> **"Registry-gated editor" resolves in the APP plane, never in the shell.** The Editor facet is offered only for a
> *page-able* entity type: *"`pages.entity_type` validated vs `schema/_registry.ts` ENTITY_TYPES, ADR-006 SP2; page-able
> entity types only, many have none by default"* [FACT: frontend-quality-bar/_index.md:115-116,157]. That registry is the
> `ENTITY_TYPES` tuple + `isEntityType()` guard [FACT: packages/core/src/db/schema/_registry.ts:5-158]. It lives in
> **`@vida/core`, which `@vida/ui` cannot import** (§1 boundary). So the shell does NOT consult the registry — the
> `apps/web` adapter does (`isEntityType(type)` + "does a `pages` row exist") and simply **passes an `editor` slot or
> omits it**; the shell offers the Editor facet/tab iff the slot is present (the `onFilter != null → render Filter`
> precedent) [FACT: collection-view.tsx:179-197].

---

## 1. DEPENDENCIES (frozen contracts — this unit builds ON, never patches around)

- **The two shipped archetype-shell siblings** — the exact SHAPE precedent: a presentational shell that composes foreign
  units via a render-prop/slot, holds no data, uses LOCAL union types, threads state-as-prop, degrades-never-crashes,
  React-19 ref-as-prop (no `forwardRef`). `CollectionView` (a *switcher* shell — one active facet, a toolbar/menu switch)
  [FACT: collection-view.tsx:9-25,117-235] and `DashboardView` (a *grid* shell — Card-framed cells, per-cell state,
  `renderBlock` only for success) [FACT: dashboard-view.tsx:8-28,164-220]. The Entity shell is the same shape with a
  two-facet composition and a mode toggle.
- **The Layout facet's two sub-shells (COMPOSED via slots, not imported-into):**
  - `DashboardView` (#5 ✅) — the Layout facet's **dashboard** sub-slot [FACT: frontend-quality-bar/_index.md:114;
    dashboard-view.tsx:46-71].
  - `CollectionView` (#4 ✅) — the Layout facet's **views/content** sub-slot [FACT: frontend-quality-bar/_index.md:114;
    collection-view.tsx:64-101]. (#4 is a declared blocker — reconstructed-structure.md:26.)
- **ui-1 `Tabs`** — the tabbed-mode mechanism (Home = layout · Content = editor) [FACT: frontend-quality-bar/_index.md:117].
  `Tabs` ships: `role="tablist"`, roving tabindex, `Tabs.Panel value` children, **only the active panel mounts** (keyed
  enter-fade), animated indicator (transform-only) [FACT: packages/ui/src/CLAUDE.md "Tabs is the B12 showcase"]. The exact
  switch mechanism (Tabs vs a toolbar) is weighed against the collection-view precedent, which deliberately chose a
  toolbar **over** Tabs because "a view-switch re-renders the same data; tabs swap different content" [FACT:
  packages/ui/src/CLAUDE.md "collection-view … NOT `Tabs`"] — here the facets ARE different content, so Tabs is the right
  fit (a §7 precision, confirmed at Envision/`/contract`).
- **fe-codec-patterns kit** (#2, the declared blocker) — `EmptyState` (a page-less / no-editor empty), `SyncStatus` for the
  entity's save state, the **8-state machine** the shell threads per facet as a PROP [FACT: reconstructed-structure.md:26;
  packages/ui/src/CLAUDE.md "fe-codec-patterns"; apps/web/src/state-conventions].
- **fe-codec-theme tokens** — DIRECT semantic tokens; dimensions via the token SCALE (radius `card → $lg`, DEF-U8-h), never
  a sub-theme key; no hard-coded palette [FACT: packages/ui/src/CLAUDE.md "Dimension props read the TOKEN SCALE"].
- **The SHIPPED registry contracts the app-plane adapter binds (`@vida/core`, uncrossable from `@vida/ui`)** — the
  `ENTITY_TYPES` tuple + `isEntityType(v)` type-guard (the page-ability gate) [FACT: packages/core/src/db/schema/_registry.ts:5-158];
  the polymorphic `pages` model (`entity_type` + `entity_id`) that an Editor facet reads [FACT:
  docs/core/decisions/ADR-002-data-model.md §2.7; ADR-006 SP2]. The adapter maps `(entityType, entityId)` → "offer an
  editor slot?" — it does NOT invent a table; this is the app plane (forbidden in `@vida/ui`).

### THE boundary that governs every home (load-bearing)
**`@vida/ui` CANNOT import `@vida/core` NOR `@vida/types`** — deps are `@tamagui/*` + `date-fns`/`sigma`/`graphology` ONLY
[FACT: packages/ui/package.json — the collection/dashboard siblings both split on this]. So the Entity shell **SPLITS
across two planes**, exactly as Collection + Dashboard split [FACT: collection-view.tsx:23-25; dashboard-view.tsx:12-14]:

| plane | what | why |
|---|---|---|
| **`@vida/ui`** | the presentational **`EntityView`** — the facet frame: Title/header chrome + a `mode: merged \| tabbed` toggle + the Layout-facet slot + the optional Editor-facet slot + per-facet threaded state; facet bodies supplied as **slots/render-props**, structurally typed | presentational, state-as-prop (BR-2); no `@vida/core`/`@vida/types` import |
| **`apps/web`** | the **canon-wiring convention** — resolve `isEntityType(type)` + a `pages` lookup → whether to pass an `editor` slot; resolve + persist the per-instance merged/tabbed memory; map the entity's data → the shell's props | imports `@vida/core` → can't live in `@vida/ui` |

## 2. NEEDS (what the unit must deliver)

1. **`EntityView` (`@vida/ui`, presentational)** — the facet frame:
   - an **entity header** — the Title (+ an optional bio/summary slot + an action slot), region-named via `warnMissingName`/`useId`
     (the sibling accessible-name convention) [FACT: dashboard-view.tsx:179-188];
   - a **facet composition `mode`** — `'merged'` (both facets stacked on one surface) **or** `'tabbed'` (Tabs: Home = Layout ·
     Content = Editor) [FACT: frontend-quality-bar/_index.md:117]; CONTROLLED (`mode` + `onModeChange`) — per-instance memory
     is the app's (design-pass-open, §6 R-mem);
   - the **Layout facet slot** (always present) — the consumer supplies the composed Layout body;
   - the **optional Editor facet slot** — offered (a tab in tabbed mode / a section in merged mode) **iff** the consumer
     passes an `editor` node (the app's registry gate decides to pass it);
   - **per-facet state threading** — each facet renders its own `loading`/`empty`/`error`/`success` as a PROP (BR-2), the
     shell degrades-never-crashes; a page-less entity → a calm no-editor state [FACT: dashboard-view.tsx:120-162];
   - **responsive** — tabbed/merged behave sanely 375 → 768 → 1440 (the collection-view `useTabletUp` condense precedent)
     [FACT: collection-view.tsx:37-52,143].
2. **The facet descriptor + slot/render-prop types** — a typed way for a consumer to declare each facet and render its body,
   keeping `EntityView` agnostic of the Layout/Editor bodies **and** free of any `@vida/core`/`@vida/types` type (LOCAL
   unions ≡ the canon, the `ViewLayout`/`CellSize` precedent) [FACT: collection-view.tsx:23-25; dashboard-view.tsx:27-28].
3. **The `apps/web` entity↔EntityView adapter CONVENTION** — the documented shape a module uses to map an entity row +
   `isEntityType()` + a `pages` lookup into `EntityView` props (incl. the editor-slot gate) and to persist the merged/tabbed
   choice. **Whether this ships as code or type+convention is a Step-2 decomposition call** (no *built* consumer exists —
   the Collection/Dashboard adapter precedent: ship pure mapping + types + convention now, defer the live hook) [FACT:
   fe-codec-dashboard/delivery/interpretation.md R3].
4. **Visual-Gate harness** — a Storybook specimen: merged mode + tabbed mode × with-editor / without-editor (the registry
   gate) × mixed per-facet states, exercising the 375/768/1440 reflow + a11y (the ui-2 sibling precedent).
5. **Specs** — `docs/specs/components/ui-2-platform-views/entity-view.md` (+ `_index.md` update).

## 3. ORGANIZATION (where each piece slots — governed by §1's boundary)

```
@vida/ui        components/entity-view.tsx        EntityView — facet frame + merged/tabbed mode + slots + per-facet state (net-new, presentational)
                components/entity-view.stories.tsx  the Visual-Gate surface (merged/tabbed × with/without editor × states)
                components/collection-view.tsx    COMPOSED as the Layout facet's views/content sub-slot (not imported-into)
                components/dashboard-view.tsx      COMPOSED as the Layout facet's dashboard sub-slot
                components/tabs.tsx                REUSE for tabbed mode
                components/card.tsx · empty-state.tsx   REUSE (facet frame / no-editor empty)
                internal/data-view.tsx            REUSE ViewState + warnMissingName
                index.ts                          + export { EntityView, its facet/mode types }
apps/web        entity/ (or state-conventions/)   the entity↔EntityView adapter convention (code OR type+convention per
                                                  Step-2) — imports @vida/core (isEntityType, pages lookup)
packages/core   db/schema/_registry.ts            ENTITY_TYPES + isEntityType — the registry-gate (READ by apps/web, frozen)
docs/specs/components/ui-2-platform-views/entity-view.md · _index.md (updated)
— OUT of this unit (homed by the docs):
  • the Editor facet BODY = the TipTap block canvas → Canvas: Editor #7 (NOT built; not a dep) [FACT: reconstructed-structure.md:27]
  • the Layout facet's dashboard/views BODIES → DashboardView #5 ✅ / CollectionView #4 ✅ (composed, not rebuilt)
  • the page-ability registry itself → @vida/core schema/_registry.ts (frozen; READ, not authored) [FACT: _registry.ts:5-158]
  • per-instance merged/tabbed MEMORY (storage schema) → design-pass-open (frontend-quality-bar/_index.md:150; ADR-006:130)
  • per-module entity SURFACES + live data wiring (Task page, Habit page…) → each owning module's ② track
  • the Flow/Session shell that CONSUMES #6 → fe-codec-flow-session #11 [FACT: reconstructed-structure.md:31 deps #2 #6]
  • the other archetype shells (Canvas #7-10 · System #12) → their own units
```

## 4. IMPLICIT RULES (caught here, not in the browser)

- **The Entity shell is a facet FRAME, not a facet renderer** — it composes a Layout body + an optional Editor body the
  consumer supplies; it owns the header + the merged/tabbed mode + per-facet state threading, never a facet's internals
  [FACT: decomposition.md:31; collection-view.tsx:17-20].
- **The Editor facet is NOT built here and is NOT a dependency** — it is the TipTap canvas (#7), arriving as a consumer
  slot; a wrong read would try to embed an editor this unit has no dep on [FACT: reconstructed-structure.md:26 deps `#2 #4`].
- **"Registry-gated" is an APP-plane gate, not a shell gate** — `isEntityType()`/ENTITY_TYPES lives in `@vida/core`
  (uncrossable); the shell offers the Editor facet iff an `editor` slot is passed (the `onFilter != null` precedent) [FACT:
  packages/core/src/db/schema/_registry.ts:5-158; collection-view.tsx:179].
- **`state` is a PROP across the package boundary** (BR-2) — `@vida/ui` never derives; the app derives via the 8-state
  machine + passes it, **per facet** [FACT: dashboard-view.tsx:38-39; list-view.tsx state-as-prop].
- **Mode is CONTROLLED; per-instance memory is the app's** — `mode` + `onModeChange` props; persistence is design-pass-open
  (the collection-view `layout`/`onLayoutChange` controlled precedent) [FACT: collection-view.tsx:69-74;
  frontend-quality-bar/_index.md:150].
- **Tabbed mode uses ui-1 `Tabs`; only the active panel mounts** — unlike collection-view (which chose a toolbar over Tabs
  because a view-switch re-renders the *same* data), entity facets ARE different content → Tabs is correct [FACT:
  packages/ui/src/CLAUDE.md "Tabs" / "collection-view … NOT `Tabs`"].
- **Degrade, never crash** — a page-less entity renders a calm no-editor state, not a blank; an errored facet renders a calm
  `role="status"`, never `$colorSignalDanger` (fails AA 4.5 light — the ds-2 M4 fix) [FACT: dashboard-view.tsx:147-157].
- **LOCAL union types, structural typing** — the facet/mode types are LOCAL unions ≡ the canon, no `@vida/core`/`@vida/types`
  import; the app passes real values, assignable structurally [FACT: collection-view.tsx:23-25; dashboard-view.tsx:27].
- **React 19 ref-as-prop, NO `forwardRef`; DIRECT semantic tokens; token-scale dimensions; reduced-motion honored** (the
  shared shell conventions) [FACT: dashboard-view.tsx:164-185; packages/ui/src/CLAUDE.md].
- **Accessible name + per-facet region a11y** — the entity region is named (`warnMissingName`); each facet/tab is a labeled
  region/tabpanel (Tabs owns the `role="tabpanel"` contract) [FACT: dashboard-view.tsx:180-182; packages/ui/src/CLAUDE.md "Tabs.Panel"].
- Consume the frozen collection/dashboard/tabs/theme/patterns contracts; if one looks wrong, STOP — don't patch the
  frontend around it [FACT: process.md:113].

---

## 5. THE 3-LENS AUDIT

### WRONG — contradicts a standard or a bar decision
- *(none found.)* The facet-frame / facet-body split, the state-as-prop boundary, the app-plane registry gate, and the
  Tabs-for-different-content choice are all consistent with the canon + both shipped siblings' resolved homes.

### MISSING — the archetype requires it, nothing exists
- **M1** **No Entity shell** — every entity page in the OS needs one; `@vida/ui` ships no `EntityView` and no facet frame
  [FACT: grep clean — no EntityView/EntityShell/LayoutFacet/EditorFacet in packages/ui or apps/web; agent map §10].
- **M2** **No merged/tabbed facet-composition primitive** — Tabs ships (a generic tablist), but no entity facet frame that
  toggles a Layout surface against an Editor surface and gates the editor on a slot [FACT: packages/ui/src/CLAUDE.md "Tabs";
  grep clean].
- **M3** **No entity↔EntityView adapter convention** in `apps/web` — the documented shape mapping an entity + the
  page-ability gate into `EntityView` props [FACT: apps/web/src surface dirs are `.gitkeep`; agent map §10].

### OVERFLOWING — past this shell's job (homed by the docs, NOT deferred)
- **O1** **The Editor facet BODY** (the TipTap block canvas + the 11+11 block registry wiring) → Canvas: Editor #7 — not a
  dep of #6 [FACT: reconstructed-structure.md:27].
- **O2** **The Layout facet's dashboard/views BODIES** → `DashboardView` #5 ✅ / `CollectionView` #4 ✅ — composed as slots,
  not rebuilt [FACT: frontend-quality-bar/_index.md:114; dashboard-view.tsx; collection-view.tsx].
- **O3** **The page-ability registry itself** → `@vida/core` `schema/_registry.ts` (frozen; READ by the adapter, not
  authored here) [FACT: packages/core/src/db/schema/_registry.ts:5-158].
- **O4** **Per-instance merged/tabbed MEMORY** (the storage schema for the user's choice) → design-pass-open [FACT:
  frontend-quality-bar/_index.md:150; ADR-006:130]. The shell is controlled; the app persists later.
- **O5** **Per-module entity SURFACES + live data** (Task page, Habit page, Project page…) → each owning module's ② track
  [FACT: frontend-quality-bar/_index.md:127 "generalizes to every surface … per-type default, remembered per instance"].
- **O6** **The Flow/Session shell** (which CONSUMES the Entity shell) → fe-codec-flow-session #11 [FACT:
  reconstructed-structure.md:31 deps `#2 #6`].

---

## 6. RESOLVED BY DOCS (stated as FACT — read from the governing docs + the sibling gates, not decided)

- **R1 — Scope = the Entity shell = a facet FRAME (header + merged/tabbed mode + a Layout slot + an optional Editor slot +
  per-facet state) over facet bodies the consumer supplies.** Not the Editor (→ #7), not the Layout sub-shells (→ #4/#5), not
  the registry (→ @vida/core), not per-module surfaces [FACT: decomposition.md:31; reconstructed-structure.md:26;
  frontend-quality-bar/_index.md:113-118].
- **R2 — Splits across planes (BR-2).** Presentational `EntityView` → `@vida/ui` (slots + mode + state as props);
  canon-wiring (registry gate, memory, data map) → `apps/web`. The Collection + Dashboard splits are the exact precedents
  [FACT: collection-view.tsx:23-25; dashboard-view.tsx:12-14].
- **R3 — The `apps/web` adapter ships the pure mapping + types + convention; only the LIVE hook defers.** No *built* consumer
  exists; the module entity pages ship after #6. The Collection/Dashboard adapters are the exact precedent (ship pure
  mapping + types + convention now; defer the live React-Query hook to the first consumer) [FACT:
  fe-codec-dashboard/delivery/interpretation.md R3]. Ratified at Step 2.
- **R4 — "Registry-gated editor" = the app passes an `editor` slot iff `isEntityType(type)` + a page exists; the shell
  offers the facet iff the slot is present.** The registry is frozen in `@vida/core`; `@vida/ui` never consults it [FACT:
  packages/core/src/db/schema/_registry.ts:5-158; frontend-quality-bar/_index.md:115-116; collection-view.tsx:179].
- **R5 — `mode` is CONTROLLED (`mode`+`onModeChange`); per-instance memory is the app's (design-pass-open)** [FACT:
  collection-view.tsx:69-74; frontend-quality-bar/_index.md:150; ADR-006:130].
- **R6 — Each facet threads its own `ViewState` as a PROP; degrade never crashes; LOCAL unions; React-19 ref-prop; DIRECT
  tokens; reduced-motion honored** [FACT: dashboard-view.tsx:38-39,120-162,164-185].

### Two precisions kept (flagged, not silently decided)
1. **The tabbed-mode mechanism** — ui-1 `Tabs` (Home/Content) vs a bespoke toolbar. The docs say "tabbed" and Tabs fits
   different-content facets (the inverse of collection-view's toolbar choice), but the exact chrome (tab labels, where the
   mode toggle itself lives, merged-mode section dividers) is a greybox/`/contract` decision [FACT:
   frontend-quality-bar/_index.md:117; packages/ui/src/CLAUDE.md "Tabs"/"collection-view NOT Tabs"].
2. **The facet slot shape** — do Layout/Editor arrive as `ReactNode` slots or `(state) => ReactNode` render-props (for
   per-facet state threading)? The dashboard `renderBlock(block)` + collection `renderView(layout, state)` precedents favor
   a render-prop where state is threaded; resolved at `/contract` (Step 4).

## 7. ENVISION GATE (Step 1.5) — FIRES (doc test §3.75, applied to facts — NOT a decision)

The firing is a **mechanical one-question test**, not a judgment or a human choice; the human's role is the blocking
*review* of the greybox, not whether the gate fires [FACT: entity-delivery-flow.md:104-107,129-132;
[[envision-gate-firing-is-a-doc-test-not-a-human-decision]]].

**Test:** *"Is there a user affordance whose UI answer isn't already obvious from an existing shipped surface?"* — Yes →
fire (module hub · standalone entity page · novel interaction surface); No → skip [FACT: entity-delivery-flow.md:104-107].

Applied, per affordance:

| affordance | UI answer obvious from a shipped surface? | FACT |
|---|---|---|
| **the merged/tabbed facet toggle** (switch/merge an entity's Layout surface against its Editor surface) | **NO** — no shipped surface composes two facets with a user-chosen merged/tabbed mode; collection-view deliberately is NOT this | frontend-quality-bar/_index.md:117; packages/ui/src/CLAUDE.md "collection-view … NOT Tabs"; grep clean |
| **the registry-gated editor affordance** (an entity HAS / HAS-NO editor facet; how a page-less entity reads) | **NO** — no shipped surface gates a facet on page-ability; the no-editor state is novel | frontend-quality-bar/_index.md:115-116; grep clean |
| **the standalone entity page composition** (header + Layout facet framing the dashboard/views sub-shells) | **NO** — the entity-page composition is explicitly design-pass-open; no shipped entity page exists | frontend-quality-bar/_index.md:150; grep clean |
| the 8-state / tokens / reduced-motion / Tabs internals | YES — fe-codec-patterns + ui-1 Tabs ship | packages/ui/src/CLAUDE.md |

**Result = FIRE.** The Entity shell is an archetype shell / **standalone entity page** surface (the fire case "a standalone
entity page · a novel interaction surface"), and the merged/tabbed facet system + the registry-gated editor have no shipped
UI answer — the exact class this gate catches [FACT: entity-delivery-flow.md:99-107; decomposition.md:31]. None of the three
SKIP cases hold (not a thin leaf; it renders; not backend). This mirrors both shipped siblings, which FIRED on the same
archetype-shell basis [FACT: fe-codec-dashboard/delivery/interpretation.md:248-270].

**Activity (next):** a THROWAWAY greybox from real `@vida/ui` primitives + fake facet bodies (`apps/web/src/__envision__/
entity.tsx` or a Storybook page, deleted after the gate; `frontend-design` as the composition aid), covering: merged mode ·
tabbed mode (Home/Content) · with-editor vs page-less (the registry gate) · a mix of per-facet states · the 375/768/1440
reflow → the human reviews + pins `EC-n` (structural | feel) into `delivery/envision.md` [FACT: entity-delivery-flow.md:109-121].

## 8. Open for Victor — the Envision REVIEW (not a fire decision)

Everything is doc-homed (§6); the §3.75 test resolves the gate to FIRE on facts (§7), not a decision. The one blocking human
step is the **review of the greybox + pinning the anchored EC-n** — which comes AFTER I author the greybox, per the gate's
exit criteria [FACT: entity-delivery-flow.md:129-132]. The two §6 precisions (the tabbed-mode mechanism; the facet slot
shape) are MINE to resolve at the greybox/`/contract`, surfaced for the review — not scattered questions. → Author the
greybox → human review → Step 2 Decomposition (slice-map + seam-contract, maps every `structural` EC to ≥1 slice).
