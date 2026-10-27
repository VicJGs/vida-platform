# EntityView — the CODEC Entity shell (fe-codec-entity-facet S1)

> **Unit:** LIF-209 · ② Frontend CODEC #6 · the 3rd archetype shell (decomposition.md:31 §1.2 — "the facet system").
> Delivery: `docs/specs/foundation/fe-codec-entity-facet/`. Status: **S1 SHIPPED** (Visual Gate PASS).
> The S1 contract (Seam A), grounded in the real `tabs.tsx` / `card.tsx` / `internal/data-view.tsx` code + the approved
> envision EC-1…EC-8; Approval-1 + Approval-2 passed, `/critique` REVISE folded (B1–B3 + S1–S4).

## What it is
A presentational `@vida/ui` SHELL that frames a standalone entity page as **two facets** — a **Layout facet** (always
present; the consumer composes Title·bio·summary + `DashboardView` + `CollectionView`) and an **optional Editor facet**
(the entity's linked page = the TipTap canvas, Canvas: Editor #7, composed as a slot) — in a user-chosen **merged** (one
surface) or **tabbed** (Home/Content) mode [FACT: decomposition.md:31; frontend-quality-bar/_index.md:114-118]. It is a
**facet FRAME, not a facet renderer** — it owns the header + the mode + per-facet state threading, never a facet's
internals. Archetype siblings: `CollectionView` (switches one renderer over the same data) · `DashboardView` (composes a
block grid). Entity composes two whole facets with a mode toggle.

## Boundary
`@vida/ui` is Tamagui-only (no `@vida/core`/`@vida/types`) [FACT: the collection/dashboard siblings split on this]. So
`FacetMode` is a LOCAL union, and the Editor facet's state reuses the shipped intra-package **`ViewState`** canon imported
directly from `internal/data-view` (NOT a new `FacetState` alias — `dashboard-view.tsx:5` imports `ViewState` the same way;
inventing a parallel-named identical type is needless surface) [FACT: dashboard-view.tsx:5; internal/data-view.tsx]. The
**registry gate is resolved in `apps/web` (S2)** and expressed to the shell as `editor`-slot presence — never a flag
crossing into `@vida/ui` [FACT: packages/core/src/db/schema/_registry.ts:5-158 lives in @vida/core].

## API (Seam A)
- `title: string` — names the region (`aria-labelledby`→heading via `warnMissingName`/`useId`) + renders as the serif
  `$display` title [FACT: dashboard-view.tsx:180-188].
- `subtitle?: ReactNode` · `action?: ReactNode` — the bio/summary line + the `⋯` entity-action slot.
- `mode: FacetMode` (`'merged'|'tabbed'`) + `onModeChange(next)` — CONTROLLED; the app owns + persists (per-instance
  memory, S2/O4) [FACT: collection-view.tsx:69-74 controlled precedent].
- `defaultFacet?: 'layout' | 'editor'` (default `'layout'`) — the initially-active facet in **tabbed** mode (seeds the
  `Tabs` `defaultValue`). **Optionally controlled** via `activeFacet?: 'layout' | 'editor'` + `onActiveFacetChange(next)` —
  REQUIRED to deep-link an entity straight to its Editor ("open this task's notes") and to hold the facet across a
  merged⇄tabbed round-trip (B1 — else `Tabs` owns it uncontrolled and the position is lost). Ignored in merged mode + when
  page-less [FACT: tabs.tsx:33-38 value/defaultValue/onValueChange].
- `layout: ReactNode` — the Layout facet body (a self-stating composite; its sub-shells thread their own state).
- `editor?: ReactNode` — the OPTIONAL Editor facet body; **PRESENCE is the registry gate** (absent → no Content tab / no
  merged editor section).
- `editorState?: ViewState` (`'loading'|'empty'|'error'|'success'`) — the Editor facet's own state (BR-2); the shell owns a
  calm page skeleton/teaching-empty/`role="status"` error and renders `editor` only for `success` (the dashboard
  terminal-state-ownership precedent). Reuses the shipped `ViewState` (B3) [FACT: dashboard-view.tsx:5,120-162].
- `layoutLabel?`/`editorLabel?` — tabbed-mode tab labels (default `'Home'`/`'Content'`) [FACT: frontend-quality-bar/_index.md:117].
- `aria-label?`/`aria-labelledby?`, `ref?` (React-19 ref-as-prop, no forwardRef — non-generic shell) [FACT:
  dashboard-view.tsx:164-185].

## Invariants (business rules)
- **BR-E-1 Facet frame, not a renderer** — composes a Layout body + an optional Editor body the consumer supplies; owns the
  header + mode + per-facet state threading, never a facet's internals [FACT: decomposition.md:31; collection-view.tsx:9-20].
- **BR-E-2 Controlled mode + state-as-prop** — `mode` + `editorState` are the app's (derived/persisted upstream); the shell
  never derives them [FACT: collection-view.tsx:69-74; dashboard-view.tsx:38-39].
- **BR-E-3 Registry gate = `editor`-slot presence; empty-editor ≠ page-less** — the Editor facet (a Content tab in tabbed /
  a divided section in merged) renders **iff** an `editor` node is passed; absent → Layout stands alone (the `onFilter != null
  → render Filter` precedent) [FACT: collection-view.tsx:179-197]. **Page-less ⇒ Layout rendered DIRECTLY regardless of
  `mode`** (nothing to tab between; no Tabs, no toggle) [EC-3]. **DISTINCT from empty-editor:** `editor` present +
  `editorState:'empty'` → the Content tab / editor section IS shown, rendering the teaching empty *body* (the page exists,
  it's just blank). Both must render correctly (S3).
- **BR-E-4 Tabbed via ui-1 `Tabs`; merged stacks with labeled regions + a divider** — tabbed = `Tabs items=[home,content]`
  with `<Tabs.Panel>` bodies, **only the active panel mounts**, seeded by `defaultFacet`/`activeFacet` (B1); merged = Layout +
  a hairline **`aria-hidden`** divider + Editor on one surface, **each facet wrapped in a `role="region"` named via
  `aria-label`** (the facet's label — `layoutLabel`/`editorLabel`, default `'Home'`/`'Content'`) so a screen-reader user can
  tell Layout from Editor (B2 — tabbed gets this free from Tabs' `tabpanel`; merged needs it explicit). `aria-label` not
  `aria-labelledby`: the shell renders no visible facet heading in merged mode (the facet bodies are consumer-supplied), so
  there is no heading id to reference (preflight clarification). Tabs is correct because the facets are **different content** — the INVERSE of collection-view's
  deliberate toolbar-over-Tabs choice (a view-switch re-renders the same data) [FACT: tabs.tsx:22-23,155-158;
  packages/ui/src/CLAUDE.md "collection-view … NOT Tabs"] [EC-1, EC-2]. The mode switch is **instant** (no transition — EC-8
  immediacy); only the Tabs indicator/panel-enter animate (Tabs-owned, reduced-motion honored) (S4).
- **BR-E-5 Shell owns the Editor facet's generic terminal states** — in BOTH modes it renders a calm page skeleton
  (`loading`, `aria-busy`), a teaching `EmptyState` (`empty`), and a calm **`role="status"`** error (**muted text**, NOT
  `$colorSignalDanger` — fails AA 4.5 in light, the ds-2 M4 fix), and renders `editor` **only for `success`**; degrade
  never crashes [FACT: dashboard-view.tsx:120-162] [EC-5].
- **BR-E-6 Mode toggle = a `role="toolbar"` of `aria-pressed` buttons in the header chrome** (EC-4, approved placement) —
  the collection-view switcher precedent (NOT a bare pair of buttons) (S2); omitted when no `editor` (nothing to toggle)
  [FACT: collection-view.tsx:216-228 `role="toolbar"` + `aria-pressed`; frontend-quality-bar/_index.md:142-143,117].
- **BR-E-7 Tokens + a11y + motion** — DIRECT semantic tokens, no hard-coded palette; the title is `fontFamily:"$display"` at
  **`fontSize:"$display"`** (the entity page's H1 — the most prominent title in the app; distinct from a shell *section*
  heading like dashboard's `$heading`) (S1); named region (`warnMissingName`); Tabs owns the `role="tabpanel"` + roving-tab
  a11y; reduced-motion honored on the Tabs indicator/panel motion (the Tabs `@media` convention) [FACT: tabs.tsx:27,127-131;
  packages/ui/src/CLAUDE.md "use-reduced-motion"] [EC-7].
- **BR-E-8 Responsive** — both modes reflow 375→768→1440 with no 375 overflow; a `maxWidth` content column centered on
  desktop; Tabs usable at 375 [FACT: collection-view.tsx:37-52 useTabletUp precedent] [EC-6].
  **Title row (notes-rescope R1, DEV-R1-1, 2026-10-27):** the title row wraps — the title group has `flexBasis: 240`, so when
  the title and the `action` slot don't both fit (375) the action drops below the title instead of squeezing it; the
  `$display` title applies `lineHeight="$display"` (1.15) so wrapped lines never collide [FACT: entity-view.tsx:71-83,159].

## Resolved contract points (pinned at Envision; ratified here)
1. **The registry gate is slot presence, not a `hasEditor` boolean** — forced by the `@vida/ui` boundary (can't consult the
   `@vida/core` registry). S2 runs `isEntityType()` + the page lookup and passes/omits the `editor` slot [FACT: _registry.ts:157].
2. **Editor facet state ownership = the dashboard way** — `editorState` + the shell owns the generic page states, renders
   `editor` only for `success`. The Layout facet is a self-stating `ReactNode` composite (its sub-shells thread their own
   state), so it takes no state prop [FACT: dashboard-view.tsx:120-162; interpretation §6-2].

## Out of scope (homed by the docs)
The Editor facet BODY = the TipTap block canvas (Canvas: Editor #7, not a dep — O1) · the Layout sub-shell BODIES
(`DashboardView` #5 / `CollectionView` #4, composed — O2) · the page-ability registry itself (`@vida/core`, frozen — O3) ·
the merged/tabbed storage schema + the live `useEntity` hook (S2 convention / first consumer — O4) · per-module entity
surfaces + data (module ② tracks — O5) · the Flow/Session shell that consumes #6 (#11 — O6).

## Visual Gate (blocking) — MUSTs
Brave, 3 presets × light/dark × 375/768/1440 + axe 0:
- **EC-1** merged — Layout + divider + Editor on one surface, order summary→dashboard→views.
- **EC-2** tabbed — `Tabs [Home|Content]`, only active panel mounts, indicator + roving; `defaultFacet:'editor'` opens on
  Content (B1 deep-link); merged→tabbed→merged holds the facet when `activeFacet` is controlled.
- **EC-3** page-less — no Content tab, no editor section, no toggle; Layout stands alone. **Distinct from** empty-editor
  (`editor` present + `editorState:'empty'` → Content tab shown with a teaching empty body) (S3).
- **EC-4** the merged⇄tabbed toggle visible + `aria-pressed` in a `role="toolbar"` in the header (S2).
- **EC-5** Editor facet loading/empty/error independent + calm; shell never crashes. **Merged a11y:** each facet is a
  labeled `role="region"`; the divider is `aria-hidden` (B2) — axe-verified.
- **EC-6** both modes reflow, no 375 overflow, content centered on desktop.
- **EC-7** serif `$display` title AA · DIRECT tokens · dark designed (not inverted) · preset identity flips.
- **EC-8** (feel) mode-switch immediacy · editor reads as a document — live-gate observation.

## Files (planned)
`packages/ui/src/components/entity-view.tsx` · `.stories.tsx` (gate surface) · `.test.tsx` (jsdom) · exported from
`index.ts`. **S2 (the `apps/web` entity↔EntityView adapter) is the next slice.**
