# Envision — fe-codec-collection (Entity Delivery Flow ②, Step 1.5)

> **Gate FIRED** by the §3.75 doc test (interpretation.md §7): a novel view-mode switcher + chrome composition with no
> shipped UI answer. **Reviewer = the human (Victor), blocking.** No decomposition until the greybox + the EC set are
> approved [FACT: entity-delivery-flow.md:129-132].

## Greybox (throwaway — deleted after the gate)

- **Source:** `packages/ui/src/__envision__/collection.stories.tsx` (code-truthful — composes the REAL `@vida/ui`
  renderers + `Button`/`Card`/`EmptyState` + fake data; a hand-rolled mock shell, NOT the component).
- **Rendered:** Brave via `PW_EXECUTABLE_PATH`, Storybook `:6099`. Shots at `/tmp/vg/greybox/`.
- **Coverage:** switcher · all 7 view-modes dispatched (list·table·board·gallery·calendar·graph·timeline) · 4 states
  (success·loading·error·empty) · 375 reflow (chrome stack + switcher wrap + table h-scroll) · dark × 3 presets
  (editorial·reader·quietDesk).

| screen | shot |
|---|---|
| shell · list / table / board / gallery / calendar / graph / timeline (light + dark) | `shell-<layout>-<mode>.png` |
| preset theming (reader · quietDesk) | `shell-list-<preset>.png` |
| state coverage (success·loading·error·empty) | `state-coverage.png` |
| 375 reflow (list + table scroll) | `narrow375-list.png` · `narrow375-table.png` |

## The shape the greybox proposes (what Victor is reviewing)

- **Chrome row 1:** `Tasks` (title, `$display`/`$h3`) + muted count · right-aligned `Filter` + `Sort: Due ↑` entry points.
- **Chrome row 2:** the **view-mode switcher** — a `role="toolbar"` of toggle `Button`s (active = `intent="primary"` fill;
  rest = `ghost`), `aria-pressed`. NOT `Tabs` (tabs swap *different content*; a view-switch re-renders the *same data*).
- **Body:** the active renderer, dispatched by the current layout, `state` threaded in. `empty` → the fe-codec-patterns
  `EmptyState` (teaching-invitation) for non-calendar layouts; calendar keeps its designed grid.
- **375:** chrome stays row 1; switcher wraps to 2 rows; table/board/calendar horizontal-scroll.

## Anchored checkpoints — for Victor to confirm/edit (each `structural` | `feel`)

> PROPOSED from the greybox + the doc check below. Victor keeps / edits / adds / drops + confirms the type. A
> `structural` EC enters the Decomposition coverage check AND becomes a Visual-Gate MUST; a `feel` EC defers to the live
> per-slice Visual Gate [FACT: entity-delivery-flow.md:116-121].

- **EC-1 (structural)** — All 7 `VIEW_LAYOUT` members are reachable from one switcher; the active one is visually distinct
  (filled) + `aria-pressed`; switching re-renders the SAME data in the new layout (no data reload semantics in the chrome).
- **EC-2 (structural)** — The chrome (title · count · Filter · Sort · switcher · **`+` new-view**) is **persistent across
  every state**. Controls stay **ACTIVE** in loading/error (doc-resolved: the 8-state machine owns no chrome rule
  [interaction-state.ts:13]; the honesty bar forbids fake spinners, not active controls [quality-bar §6]; degrade-never-
  crash keeps all rendered [ADR-007]).
- **EC-3 (structural)** — `empty` renders the teaching-invitation `EmptyState` (title + guidance), NOT a bare "0 results"
  string; calendar's empty stays its designed grid (the renderer divergence).
- **EC-4 (structural)** — At 375 the shell stays usable: chrome reflows; **the switcher CONDENSES to an overflow/menu**
  (doc-resolved: the shell global-bar control-reflow precedent *"condensed → … overflow"* [shell-layout.md:67]; NOT the
  greybox's wrap, which has no precedent; NOT horizontal-scroll, which is the wide-**data** pattern [ui-2]); touch targets
  stay **≥44×44** [shell-layout.md:87]; wide renderers (table/board/calendar) horizontal-scroll rather than crush.
- **EC-5 (structural)** — `error` is a calm, honest `role="status"` ("Couldn't load."), never a crash or a blank; a
  per-type `degraded` outcome renders as a declared non-error (ADR-007 degrade-never-crash).
- **EC-6 (structural)** — The switcher is an inline **label** toolbar (NOT icons) + a **`+` new-view** affordance
  (doc-resolved: archetype specimen `List Board Calendar Table +` [p6-archetypes-design.html:177]); the `+`/Filter/Sort
  are chrome ENTRY POINTS — their logic (create/clone view, filter, sort) is the engine's / ViewsService's (O1/O4).
- **EC-7 (feel)** — Switching view-mode feels instant + calm (no layout thrash / flash); reduced-motion honored. *(feel →
  live Visual Gate.)*
- **EC-8 (feel)** — The switcher's active-state transition + hover feel consistent with the shipped primitives. *(feel.)*

## Design sub-questions — RESOLVED by the doc check (not open)

1. **Switcher at 375** → CONDENSE to overflow/menu (shell-layout.md:67 control-reflow precedent); wrap/scroll rejected. (EC-4.)
2. **Chrome enablement in non-success states** → ACTIVE (8-state owns no chrome rule; honesty bar doesn't forbid it). (EC-2.)
3. **Icon vs label** → LABEL inline toolbar + `+` new-view (archetype specimen p6-archetypes-design.html:177). (EC-6.)

## Exit (blocking) — ✅ APPROVED (Victor, 2026-10-04)
Victor approved the greybox shape + the 8-EC set ("Proceed"). The two doc-grounded deltas (375 switcher CONDENSES not
wraps; `+` new-view affordance added) carry into the contract. → Step 2 Decomposition maps every `structural` EC
(EC-1…EC-6) to ≥1 slice (plane-aware). Greybox file `packages/ui/src/__envision__/collection.stories.tsx` DELETED
post-approval (throwaway, §3.75); its intent is preserved here + becomes the S1 Visual-Gate MUSTs.
