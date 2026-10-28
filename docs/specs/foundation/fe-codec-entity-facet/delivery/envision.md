# Envision — fe-codec-entity-facet (#6, the Entity shell)

> **Status: APPROVED (Victor, 2026-10-07).** The §3.75 Envision Gate FIRED (interpretation.md §7 — a mechanical doc test,
> not a decision). Greybox + the full EC-1…EC-8 set approved as-is (incl. EC-4: the merged⇄tabbed toggle lives in the
> entity-header chrome). Decomposition (Step 2) follows [FACT: entity-delivery-flow.md:129-132].

## Greybox

A THROWAWAY composition mock (deleted after the gate) — the SHIPPED `@vida/ui` primitives + the two shipped archetype
shells (`DashboardView` #5, `CollectionView` #4) + fake data, envisioning the Entity shell whole. NOT the real `EntityView`
(it doesn't exist yet) — intent-fidelity (layout / affordance / state), not pixel-perfect.

- **File:** `packages/ui/src/__envision__/entity.stories.tsx` (title `__envision__/EntityShell (greybox)`).
- **Harness:** the @vida/ui Storybook Visual-Gate surface — preset × mode × density via the global toolbar; 375/768/1440 via viewport.
- **Stories (screen × state):**
  - `MergedWithEditor` — the full standalone-entity-page: header + Layout facet (summary · DashboardView · CollectionView) + a divider + the Editor facet.
  - `TabbedWithEditor` — header + Tabs [Home = Layout · Content = Editor].
  - `PageLessEntity` — the registry gate OFF: a page-less entity → NO Editor facet, NO Content tab, header reads "no page".
  - `EditorFacetLoading` — per-facet state: the Editor facet loading while Layout is live (tabbed).
  - `FacetsEmpty` — per-facet empty: the Layout's views sub-slot empty + the Editor page empty (merged).
- **Screenshots:** _(captured at serve — Brave, 3 presets × light/dark × {375·1440}; attached at review.)_

## Anchored checkpoints (PROPOSED — pin/edit at review)

| EC   | Screen / state | Assertion (the vision)                                                                                                                                            | Type       | Slice(s)               | Gate assertion          |
| ---- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------- | ----------------------- |
| EC-1 | Merged         | Layout + Editor facets stack on ONE surface, a clear divider between; the Layout facet reads top-to-bottom as summary → dashboard → views                         | structural | S-frame · S-merged     | Visual-Gate MUST        |
| EC-2 | Tabbed         | Home/Content tabs; Home = Layout · Content = Editor; only the active panel's content shows; roving-tab + indicator (ui-1 Tabs)                                    | structural | S-frame · S-tabbed     | Visual-Gate MUST        |
| EC-3 | Page-less      | a page-less entity shows NO Editor facet AND no Content tab; the Layout facet stands alone (never a broken/empty editor); header signals "no page"                | structural | S-gate                 | Visual-Gate MUST        |
| EC-4 | Header         | the merged⇄tabbed mode toggle is a visible, `aria-pressed` control; (placement = a flagged precision — proposed: entity-header chrome)                            | structural | S-frame                | Visual-Gate MUST        |
| EC-5 | any facet      | each facet threads its OWN loading/empty/error independently; an empty/errored facet is calm (teaching empty · `role="status"`), the shell degrades-never-crashes | structural | S-state                | Visual-Gate MUST        |
| EC-6 | 375 → 1440     | both modes reflow with no 375 overflow; content column max-width centered on desktop; Tabs usable at 375                                                          | structural | S-frame                | Visual-Gate MUST        |
| EC-7 | all · dark     | header title serif `$display`; DIRECT semantic tokens; dark mode designed (not inverted); preset identity flips (editorial/reader/quietDesk)                      | structural | S-frame                | Visual-Gate MUST        |
| EC-8 | mode switch    | switching merged⇄tabbed and Home⇄Content feels immediate; the Editor facet reads as a borderless document (a notebook), not a form                                | feel       | S-tabbed · (editor #7) | live Visual Gate (feel) |

> Slice ids (S-frame · S-merged · S-tabbed · S-gate · S-state) are PROPOSED names for Step-2 decomposition — the coverage
> check maps every `structural` EC to ≥1 slice there.

## Approval

Greybox + checkpoints (EC-1…EC-8) approved by **Victor on 2026-10-07**. EC-4 placement confirmed (entity-header chrome).
(blocking — decomposition follows.) Greybox `packages/ui/src/__envision__/entity.stories.tsx` retired after the gate;
the durable record = this file + the `/tmp/vg/entity/` screenshots.
