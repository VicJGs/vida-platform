# Interpretation — fe-codec-canvas-board (#10, LIF-204)

> Entity Delivery Flow ② · Step 1 (Interpretation Layer, methodology §3). Make the implicit explicit from a
> trusted source before decomposition. Every claim is `[FACT: path:line]`, `[INTERPRETATION: from facts]`, or
> `[UNKNOWN: needs X]`. Paths relative to repo root.

## 0. What this unit is (one paragraph)

The CODEC **Canvas** archetype is _"immersive: Editor · Graph · Reader · **Vision-board** · **Calendar-grid**"_
`[FACT: docs/specs/foundation/frontend-replan/decomposition.md:32]`. Unit #10 owns the last two sub-modes:
**Vision-board** (consumer: Purposes → "Dreams vision-board", `[FACT: decomposition.md:97]`) and **Calendar-grid**
(consumer: Global Calendar `/calendar`, `[FACT: decomposition.md:66]`). The decisive constraint from ground truth:
both reduce to **saved views, not bespoke surfaces** — "the Bucket-List vision board … all reduce to: saved views"
`[FACT: docs/core/decisions/ADR-007-saved-views.md:22]`; the Bucket List is "a vision-board **Gallery** view over
Dreams with derived progress" `[FACT: ADR-007:36-37]`; and the renderers they need **already ship** —
`@vida/ui` ships `calendar-view · list-view · gallery-view · neural-graph · timeline` `[FACT: ADR-007:27]`.
Therefore **#10 builds no new renderers**. It builds the two **immersive, read-only Canvas surfaces** that compose
the already-shipped `GalleryView` (vision-board) and the P5-refined month `CalendarView` (calendar-grid) at canvas
scale — the frame that `fe-calendar` #19 then extends (`#19 blocked by fe-codec-canvas-board`
`[FACT: .claude/tasks/fe-calendar.md:15]`). This matches the sibling shell pattern (dashboard #5, flow-session #11,
entity-facet #6): a shell composes shipped renderers via props; it never writes.

---

## 1. DEPENDENCIES — every upstream, cited

### Hard deps (the two task blockers)

- `fe-codec-patterns` `[FACT: .claude/tasks/fe-codec-canvas-board.md:15]` — the cross-cutting pattern-kit:
  - 8-state machine `INTERACTION_STATE` + `deriveInteractionState` + `collapseToTerminal`, in **`apps/web`**
    (`apps/web/src/state-conventions/interaction-state.ts`) — imports the `@vida/core` canon; the UI package gets
    state **as a prop** `[FACT: docs/specs/foundation/fe-codec-patterns/delivery/interpretation.md:52-56]`.
  - `EmptyState` (teaching-invitation), `SyncStatus`/`HonestProgress` — shipped in `@vida/ui`
    `[FACT: fe-codec-patterns/delivery/interpretation.md:58-77]`.
  - `ReducedMotion` already shipped (RATIFY), `VoiceCopy`, `ReachabilityRegistry`, `ProviderRead` (type+convention)
    `[FACT: fe-codec-patterns/delivery/interpretation.md:68-71]`.
- `fe-codec-viewmodes` `[FACT: .claude/tasks/fe-codec-canvas-board.md:16]` — completes the canonical 7 renderers;
  the two this unit composes:
  - **`GalleryView<T>`** — `{ items, renderItem, getKey, state?, empty?, error?, loadingCount=6, minTileWidth=200,
getWeight?, density, ref, 'aria-label'? }` `[FACT: packages/ui/src/components/gallery-view.tsx:19-38]`; RN-safe
    `flexWrap` grid; `getWeight` featured tiles clamped `[1,8]` with explicit `flexShrink:1`
    `[FACT: gallery-view.tsx:78-89]`.
  - **`CalendarView<T>`** — `{ items, getDate (Date|'YYYY-MM-DD'), renderItem, getKey, month?, onMonthChange?,
today?, weekStartsOn=1, maxPerDay=3, state?, error?, ref, 'aria-label'? }`
    `[FACT: calendar-view.tsx:23-40]`; **TZ-safe day-keying** (string used as-is / `format(d,'yyyy-MM-dd')` local)
    `[FACT: calendar-view.tsx:120-128]`; **fixed 42-cell grid** `[FACT: calendar-view.tsx:112]`; `role="table"`;
    P5 month-grid polish shipped (serif title · eyebrow weekdays · tabular figures · today accent+underline ·
    weekend/OOS tone) `[FACT: packages/ui/src/CLAUDE.md:250-269]`.

### Shared-spine deps (the renderers' internals — consumed transitively, not re-built)

- `internal/data-view.tsx` — `ViewState = 'loading'|'empty'|'error'|'success'` (local union, structurally ≡
  `@vida/core` `TerminalState`, **no cross-import**) + `Message` + `resolveDataViewState` + `warnMissingName`
  `[FACT: packages/ui/src/internal/data-view.tsx:11,15-23,28-67]`. CalendarView reuses the spine PIECES but **not**
  `resolveDataViewState` (its empty is a designed grid) `[FACT: CLAUDE.md:250-269 + calendar-view.tsx]`.
- Primitives already shipped: `Card`, `Button`, `Menu`, `Tabs` (frame/chrome building blocks)
  `[FACT: packages/ui/src/CLAUDE.md:21-24]`.

### Data-source deps (consumed by the `apps/web` adapter, deferred to first consumer)

- **Dreams** entity (vision-board data) — absorbed from `bucket_list_items`; imagery-first; derived progress
  `[FACT: ADR-007:36-37]`. Delivered as a **Saved View** (`layout='gallery'` over a `dreams` root tag), ADR-007
  Space mechanism `[FACT: ADR-007:59-61,86]`.
- **`dueIn(today)` cross-module provider** (calendar-grid data) — the `ProviderRead` lane, never direct tables
  `[FACT: decomposition.md:66]`. The cross-module fan-out (habits/purposes/sessions/tasks/journal) is **#19's
  territory, not #10's** `[FACT: docs/specs/foundation/fe-calendar/calendar-vision.md:3-4]`.

---

## 2. NEEDS — preconditions to function

- **Theme/provider readiness** — `UIProvider` + Tamagui config (scheme + preset + density) must be mounted; the
  canvas reads DIRECT semantic tokens (no sub-theme keys, no hard-coded palette)
  `[FACT: packages/ui/src/CLAUDE.md:82-96]`. Any dynamic SVG/decoration color via `useTheme().get('web')`
  `[FACT: CLAUDE.md:295-296]`.
- **State is a prop, derived app-side** — `@vida/ui` cannot import `@vida/core`, so the terminal/interaction state
  is computed in `apps/web` (via `deriveTerminalState`/`deriveInteractionState`) and **passed in**
  `[FACT: fe-codec-patterns/delivery/interpretation.md:52-56; CLAUDE.md:125]`.
- **Accessible name required** — every renderer dev-warns without `aria-label`/`aria-labelledby`
  `[FACT: internal/data-view.tsx:28-32]`; the canvas frame must name its region (`useId` precedent, collection/
  dashboard) `[FACT: CLAUDE.md collection/dashboard sections]`.
- **Fixture-driven Visual Gate** — the canvas must be Visual-Gate-able standalone from fake dreams/calendar data
  (Storybook + Brave, 3 presets × light/dark × densities) `[FACT: CLAUDE.md per-primitive "Visual Gate PASS"]`.
- **No boot/runtime write path** — read-only lens (see §4 R1); there is **no** vault/libsodium write dependency
  (unlike the MOD-notes NEEDS-bug class), because the canvas never writes `[INTERPRETATION: from R1 + ADR-007:94]`.

---

## 3. ORGANIZATION — owns vs consumes vs delegates

| Concern                                                                                              | Disposition                                         | Home                    | Cite                                                                                               |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| Immersive Canvas **frame/shell** (header, hosted-renderer region, read-only chrome, terminal states) | **OWNS (net-new)**                                  | `@vida/ui`              | sibling shells dashboard/flow-session `[FACT: fe-codec-dashboard/delivery/interpretation.md:9-20]` |
| `GalleryView` / `CalendarView` renderers                                                             | **CONSUMES (shipped)**                              | `@vida/ui` (existing)   | `[FACT: ADR-007:27; gallery-view.tsx; calendar-view.tsx]`                                          |
| Terminal/interaction state derivation                                                                | **DELEGATES** (prop in)                             | `apps/web` patterns kit | `[FACT: fe-codec-patterns/.../interpretation.md:52-56]`                                            |
| Dreams / `dueIn` data + live hook                                                                    | **DELEGATES** (adapter, deferred to first consumer) | `apps/web`              | dashboard/collection adapter precedent `[FACT: fe-codec-dashboard/.../interpretation.md:133]`      |
| Multi-range renderers + Living lens                                                                  | **OUT (deferred)**                                  | `fe-calendar` #19       | `[FACT: calendar-vision.md:4]`                                                                     |
| Any write (drag/reposition/move/check)                                                               | **OUT (Capability)**                                | owning module, ADR-008  | `[FACT: calendar-vision.md:2; ADR-007:94]`                                                         |
| View chrome (filter/layout-switch/create-view)                                                       | **OUT**                                             | Collection shell (#4)   | `[FACT: fe-codec-collection; ADR-007 §Layout]`                                                     |
| Imagery-first Gallery variant (cover field)                                                          | **CONSUMES** via `getWeight`/`renderItem`           | existing GalleryView    | `[FACT: gallery-view.tsx:38; ADR-007:61-62]`                                                       |

**Split rule (BR-2):** `@vida/ui` = presentational shell + LOCAL union types (no `@vida/types`/`@vida/core`);
`apps/web` = adapter + data wiring `[FACT: fe-codec-dashboard/.../interpretation.md:101-114]`.

---

## 4. IMPLICIT RULES — hidden invariants surfaced

- **R1 — Read-only lens, full stop.** The Canvas RENDERS; it never writes. Move an event, drag a dream tile, check
  a box = a **write = the owning module's Capability (ADR-008)**, composed in elsewhere
  `[FACT: calendar-vision.md:2; ADR-007:94]`. A free-positioned drag-and-drop vision board is therefore **out of
  scope at M1** — the vision board is an imagery-first **Gallery**, not a free canvas `[INTERPRETATION: ADR-007:36-37
"Gallery view" + R1]`. (Guards against the [[dont-manufacture-a-deferral-to-cut-build-phase-scope]] inverse:
  drag is genuinely a Capability, not a deferral I invented.)
- **R2 — No new renderers in #10.** The month grid and the gallery already ship; the multi-range/Living renderers
  are #19's home. #10's net-new surface is the **frame**, not pixels inside the grid
  `[FACT: ADR-007:27; calendar-vision.md:4]`. (Guards against rebuilding a shipped primitive —
  [[grep-the-capability-before-building-a-codec-primitive]].)
- **R3 — #19 builds ON #10.** Because `fe-calendar #19 blocked by fe-codec-canvas-board`
  `[FACT: fe-calendar.md:15]`, #10 must ship a **reusable Canvas frame** a multi-range renderer can be dropped into
  — not a one-off calendar page. The frame hosts _a_ view-mode renderer at canvas scale.
- **R4 — State as a prop; no derivation in UI.** `@vida/ui` can't import the canon; the shell threads `state` to its
  hosted renderer and renders its own frame-level terminal states (skeleton/empty-teaching/error) the same way
  dashboard/flow-session do `[FACT: fe-codec-dashboard/.../interpretation.md; data-view.tsx:34-67]`.
- **R5 — TZ-safe calendar keying is load-bearing and MUST NOT be disturbed.** `'YYYY-MM-DD'` used as-is / local
  `format` — never `new Date(str)` (the Brasília off-by-one); fixed 42-cell grid; `role="table"`
  `[FACT: calendar-view.tsx:112,120-128]`. The Canvas frame wraps CalendarView; it does not re-implement day-keying.
- **R6 — Local union types only.** Any shell type stays `@vida/ui`-local, structurally ≡ `@vida/types`
  `[FACT: CLAUDE.md:156-158; collection-view.tsx:23-25]`.
- **R7 — Live data hook deferred to first consumer.** The `apps/web` adapter ships as **type + convention**
  (parse/map/degrade); the live `use*` hook is built by the first real consumer, per the collection/dashboard
  precedent `[FACT: fe-codec-dashboard/.../interpretation.md:133]`.
- **R9 — Per-entity progress is MEASURE-DRIVEN; the frame stays style-agnostic.** A board tile's progress is not one
  fixed style — it is resolved from the entity's `measurement_kind` (`quantitative · milestone · rate · qualitative`,
  `[FACT: packages/types/src/measurement.ts:5]`) plus the **unmeasured** case (`progress()` →
  `PurposeProgressView{value|null, …, unmeasured}`; "no `measurement_kind` ⇒ no derive", `[FACT:
docs/modules/purposes/current-business-rules.md:88]`): a `milestone` dream → a steps bar · `quantitative` → value/
  target · `rate` → a completion ratio · `qualitative` → a status (no numeric bar) · **unmeasured → no bar**. A board
  is a Saved View over a **Space**, which may hold mixed pursuable entities across the OS (Tasks · Habits · Routines ·
  Projects · Dreams · Health · Finance) `[FACT: docs/core/decisions/ADR-011-universal-measurability-progress-propagation.md:8,111]`.
  **Consequence:** the measure→style mapping is the **consumer's `renderItem`** (`fe-purposes`/owning module, via
  ADR-011 `progress()`); #10's frame + GalleryView must host ANY style and bake NONE (the GV-1 boundary — baking the
  steps-bar into the frame would be a bug). (Victor flag, 2026-10-09.)
  - **R9a — the label/units follow the measure too, not just the bar.** "N of M **steps**" is only the `milestone`
    caption; `quantitative` → "value of target" (e.g. "$4k of $10k" / "40%"), `rate` → ratio/streak (e.g. "80% this
    month" / "12-day streak"), `qualitative` → a state word, unmeasured → none. The caption wording is the consumer's
    `renderItem` responsibility, resolved from the same `measurement_kind`/`progress()` result as the bar style.
    (Victor note, 2026-10-09.)
- **R8 — Imagery-first is the vision board's distinguishing character** (vs a plain gallery) — the `dreams.imagery`
  field + derived progress are what make it a "vision board," realized through GalleryView's `renderItem`/`getWeight`
  `[FACT: ADR-007:36-37,61-62]`. Whether the frame adds a progress header is a greybox question (§6).

---

## 5. Envision Gate trigger — the §3.75 one-question test

> _"Is there a user affordance whose UI answer isn't already obvious from an existing shipped surface?"_
> `[FACT: entity-delivery-flow.md:104-107]`

**Verdict: FIRES.** This is a doc test I apply and report, not a question for Victor
([[envision-gate-firing-is-a-doc-test-not-a-human-decision]]).

- The **immersive Canvas frame** has **no shipped equivalent** — dashboard is a block grid, collection is a
  switcher+chrome, entity-facet is a title+facet frame; none answer "what does an _immersive, read-only, single-
  renderer canvas_ look like?" → YES, fire.
- The **vision board**'s imagery-first presentation + derived-progress framing over dreams is a novel surface
  (a Gallery _wrapped as a canvas_), not obvious from the bare GalleryView story → YES, fire.
- The **calendar-grid canvas** reuses a shipped renderer, but its _canvas framing_ (how the month grid sits in an
  immersive frame, what chrome it carries) is unproven → covered by the same greybox.

→ Author a **throwaway greybox** (real `@vida/ui` primitives + fake dreams/calendar data) covering both surfaces ×
meaningful states, for **Victor's blocking review**, before decomposition.

---

## 6. Open questions the greybox must resolve (→ `envision.md` anchored ECs)

1. **What does the immersive frame add** beyond the hosted renderer? (fullscreen/full-bleed? a serif title/eyebrow
   header? a quiet toolbar? density?) `[UNKNOWN: docs silent on Canvas-specific chrome]`
2. **Vision board — progress header?** Does the frame surface the dreams "derived progress" `[FACT: ADR-007:37]`,
   or is that purely per-tile in `renderItem`? `[UNKNOWN]`
3. **One shell or two?** A single generic `CanvasView` hosting either renderer, vs two purpose-built surfaces
   (`VisionBoardView` + `CalendarGridCanvas`). (Leaning: one frame + two worked examples — matches R3; confirm in
   decomposition.) `[INTERPRETATION]`
4. **Empty/teaching state** — does an empty vision board / empty calendar get a teaching `EmptyState`, or does the
   frame delegate empty to the renderer (CalendarView keeps its designed grid)? `[UNKNOWN → greybox]`
5. **Calendar month nav** — does the canvas own month prev/next chrome (`onMonthChange` exists
   `[FACT: calendar-view.tsx:26]`), read-only, or is nav out until #19? `[UNKNOWN → greybox]`

---

## Interpretation Gate — ready for review

Baseline done · source gated (ADR-007, calendar-vision.md, decomposition.md, sibling interpretations, shipped
renderer source) · every claim FACT/INTERPRETATION/UNKNOWN. **Next: Envision greybox (FIRES) → Victor's blocking
review → Decomposition.**
