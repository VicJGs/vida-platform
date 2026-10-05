# fe-codec-viewmodes — Interpretation Layer (Entity Delivery Flow ②, Step 1)

> **Unit:** LIF-214 · ② Frontend CODEC #3 · the **view-mode renderers** (decomposition.md §1.1). G6 net-new, EXTENDs ui-2.
> **Scope:** web, M1.0. EXTENDs the shipped ui-2 data-view spine + composes ui-1 primitives + fe-codec-theme tokens +
> the fe-codec-patterns kit (`EmptyState`, 8-state).
> **Method:** process.md §6 Step-1 **3-lens audit** (WRONG / MISSING / OVERFLOWING) over the frozen ui-2 renderer
> contracts + ADR-007 (Saved View) + ADR-008 (Capability) + the G1 Quality Bar. No guessing — the governing ADRs are
> READ to home each affordance (§6), not decided; anything genuinely open goes to Victor before code.

---

## 0. What this unit is

The **view-mode renderers** half of the CODEC — the single highest-leverage codec unit (Tasks/Books/Contacts/
Knowledge/Finance/Calendar all inherit it) [FACT: decomposition.md:20-24 §1.1]. The canonical renderer spine is a
**FIXED 7-member vocabulary** — `VIEW_LAYOUT = list · table · board · gallery · calendar · graph · timeline`
[FACT: packages/types/src/view.ts:17-25; ADR-007 §3.3:60].

**This unit builds the 2 members that are missing**, completing the spine:

| canonical view-mode | status | home |
|---|---|---|
| `list` · `gallery` · `timeline` · `calendar` · `graph` | ✅ shipped (ui-2 V1·V2·V3·V4·V7) | `@vida/ui/components/` |
| **`table`** | ❌ **NET-NEW (this unit)** | `@vida/ui/components/table-view.tsx` |
| **`board`** | ❌ **NET-NEW (this unit)** | `@vida/ui/components/board-view.tsx` |

> **A view-mode renderer is a READ-ONLY LENS (load-bearing — governs every scope line below).** ADR-007 models a view
> as *"filter × layout × grouping/sort … rendered how"*; `@vida/ui`'s view components are *"the **renderers** a view
> selects"* and ADR-007 *"does **not** design each layout's visual/**interaction** spec"* [FACT: ADR-007:16-21,45-46,94].
> The quality bar draws the line sharply: a **classic View** is a *"one pattern; **read-only lens**"* **vs** a
> **Capability block** which is *"the mixture — combined patterns, **interactive**"* — *"the mix lives in the capability;
> **classic views stay simple**"* [FACT: frontend-quality-bar/_index.md:120-123 §4.3]. Capabilities are *"the OS's
> **interactive** units"* that *"write only through the module's documented write API — never a direct table write
> (INT-2)"* [FACT: ADR-008:15,71-72 §3]. **So these two renderers render; they do not write and do not own the
> interactive mixture.** Interaction that mutates (board drag-to-move) is a Capability, homed away (§5 O1, §6 R5).

> **Scope-precision note.** The goal line reads *"add table + board to the shipped 7."* Two different sevens exist: the
> canonical **7 view-modes** above, and ui-2's **"7 views shipped"** [FACT: packages/ui/src/CLAUDE.md:218] which counts
> `pomodoro-widget` + `export-dialog` (neither a view-mode). Real shipped view-mode count = **5**; this unit adds the
> **2 missing** → the reshape ledger states it exactly: *"extend → add **table · board**"* [FACT: g6-edge-ledger.md:46].

---

## 1. DEPENDENCIES (frozen contracts — this unit builds ON, never patches around)

- **`VIEW_LAYOUT` canon** — the FIXED 7-member tuple + `type ViewLayout`; `table`/`board` are already canonical members.
  This unit builds the *renderers* the layout picks; it does not touch the tuple [FACT: packages/types/src/view.ts:14-26].
- **The ui-2 data-view spine** (`packages/ui/src/internal/data-view.tsx`) — `type ViewState = 'loading'|'empty'|'error'|
  'success'` (the canonical home) · `Message` (the muted `role="status"` copy) · `warnMissingName(name,aL,aLby)` ·
  `resolveDataViewState({state,itemCount,…}) → {role:'list'|'status', effectiveEmpty}` (role + self-heal + 3 dev-warns)
  [FACT: packages/ui/src/internal/data-view.tsx:9,15,26,36-68].
- **`calendar-view` — the DIVERGENCE precedent (build `table` against it).** A 2D grid → **`role="table"`**, reuses spine
  PIECES (`ViewState`, `Message`, `warnMissingName`, ref-prop, base tokens) but **NOT `resolveDataViewState`** (a grid's
  empty is a designed state, not a status message) [FACT: calendar-view.tsx:4,9-11; CLAUDE.md:157-172].
- **`list-view` — the spine establisher + the interactivity boundary (LV-5).** Pure presentational generic `ListView<T>`;
  **row interactivity is the consumer's** — `renderItem` composes an interactive `Card` when clickable, so the renderer
  stays layout-only [FACT: list-view.tsx:10-18 LV-5; CLAUDE.md:114-133]. Build `board` columns against this spine.
- **fe-codec-theme tokens** — color/space/radius/type from preset theme vars via DIRECT semantic tokens; dimensions via
  the token scale (DEF-U8-h, never a sub-theme key); no hard-coded palette [FACT: CLAUDE.md:271-278; B-codec-6].
- **fe-codec-patterns kit** — `EmptyState` fills a view's richer `empty?` slot; the 8-state machine lives in `apps/web`
  and the view renders one of the 4 `ViewState` values passed as a PROP [FACT: CLAUDE.md:245-258; apps/web/.../interaction-state.ts].
- **ADR-007 Saved View** — a view is `filter × layout × grouping/sort`; the **View Engine / provider** applies filter,
  resolves sort, and **groups** the rows UPSTREAM (grouping is provider-delegated, JSON TEXT, not the renderer's) — each
  layout **declares the fields it needs** (`calendar→date · gallery→cover · board→a group-by`) [FACT: ADR-007 §3.3:56-69; decomposition.md:21-22].
- **ADR-008 Capability** — the interactive-unit tier (board drag-to-move homes here); writes via INT-2 [FACT: ADR-008:15,71-72].

### THE boundary that governs every home (load-bearing)
**`@vida/ui` CANNOT import `@vida/core`** — Tamagui-only deps. Both renderers live in `@vida/ui`, mirror terminal state
**structurally** (reuse `ViewState` from `internal/data-view`), and take `state` as a **PROP** (default `'success'`); the
app derives + passes it — BR-2, the package→app boundary [FACT: CLAUDE.md:125; list-view.tsx:15,34-35].

## 2. NEEDS (what the unit must deliver — read-only renderers)

1. **`TableView<T>`** — a **read-only** `role="table"` renderer: a caller-declared **column set** (`{key, header,
   render(item), width?, align?, sort?}`) over generic `items` + `getKey`; header row (`role="columnheader"`, `aria-sort`
   DISPLAY indicator reflecting the view's current sort), body rows (`role="row"`/`role="cell"`). The 4 rendered terminal
   states; horizontal-scroll wrapper for narrow viewports (the calendar `minWidth + overflowX:auto` precedent). **No
   write, no view-config mutation** — cell interactivity (click-to-open) is the consumer's `render` (LV-5); toggling the
   *sort* is the Collection shell's, not the bare renderer's (§5 O2).
2. **`BoardView<T>`** — a **read-only** grouped-column (kanban) renderer over **already-grouped** data (grouping is
   provider-delegated — §1 ADR-007): a `role="group"` of **columns**, each a titled list of cards via a consumer
   `renderCard`, with group header + per-group count + per-column empty. Each column reuses the list-shaped spine
   (`resolveDataViewState`; a column IS a list); the board level carries loading/error. **No write, no drag-to-move** —
   card interactivity is the consumer's `renderCard` (LV-5); the interactive move is a Capability (§5 O1).
3. **Spine reuse, not a 6th copy** — both consume `internal/data-view`; `table` uses the pieces (calendar precedent),
   `board` uses `resolveDataViewState` per column. Factor shared code only on rule-of-three (not now).
4. **Specs** — `docs/specs/components/ui-2-platform-views/v8-table-view.md` + `v9-board-view.md` (+ `_index.md`).

## 3. ORGANIZATION (where each piece slots — governed by §1's boundary)

```
packages/types  view.ts                      VIEW_LAYOUT canon (frozen — table/board already members; reused)
@vida/ui        internal/data-view.tsx        REUSE: ViewState · Message · warnMissingName (· resolveDataViewState
                                              for board's per-column lists; NOT for table — the calendar precedent)
                components/table-view.tsx     TableView<T>  ← read-only role="table" (net-new; sibling of calendar-view)
                components/board-view.tsx      BoardView<T>  ← read-only grouped columns (net-new)
                components/empty-state.tsx    REUSE (fe-codec-patterns): fills the richer empty? slot
                index.ts                      + export { TableView, BoardView, their prop types }
apps/web        state-conventions/…           the app derives ViewState + passes it (BR-2) — unchanged by this unit
docs/specs/components/ui-2-platform-views/v8-table-view.md · v9-board-view.md · _index.md (updated)
— OUT of this unit (homed by the docs): board drag-to-move Capability (ADR-008) · the Collection view-chrome controls
  (sort toggle / layout switch / filter) · the move WRITE (module write API, INT-2)
```
> Home split = BR-2: both renderers are presentational → `@vida/ui`, `state` as a prop. Slice order (table first;
> shared extraction y/n) is ratified at Step 2.

## 4. IMPLICIT RULES (caught here, not in the browser)

- **A view-mode renderer is a READ-ONLY LENS** — it renders resolved/grouped/sorted data; it does not filter, group,
  sort, or write; interactive mixing/mutation is a Capability [FACT: ADR-007 §3.3; quality-bar §4.3:120-123; ADR-008:71-72].
- **`state` is a PROP across the package boundary** (BR-2) — `@vida/ui` never derives [FACT: list-view.tsx:34-35].
- **A 2D grid diverges from the list spine** — `role="table"`, empty is designed (NOT `resolveDataViewState`) [FACT: calendar-view.tsx:9-11].
- **Grouping/sort is provider-delegated** — the renderer receives grouped+sorted data [FACT: ADR-007 §3.3:65-69].
- **Interactivity is the consumer's (LV-5)** — cell/card click composed via `render`/`renderCard`; the renderer stays layout-only [FACT: list-view.tsx:10-18].
- **A layout declares the fields it needs; absent → unavailable/degraded, a declared non-error outcome** [FACT: ADR-007:62-64].
- **Degrade, never crash** — every state renders; empty-success self-heals [FACT: internal/data-view.tsx:48-55].
- **Dimension props read the TOKEN SCALE, not a sub-theme key** (DEF-U8-h) [FACT: CLAUDE.md:271-278].
- **React 19 ref-as-prop, NO `forwardRef`** (a generic `forwardRef` erases `<T>`) [FACT: list-view.tsx:15; CLAUDE.md:127].
- **Accessible name required** when a table/list region renders (dev-warn via `warnMissingName`) [FACT: internal/data-view.tsx:26-30].
- Consume frozen ui-2/theme contracts; if one looks wrong, STOP — don't patch the frontend around it [FACT: process.md:113].

---

## 5. THE 3-LENS AUDIT

### WRONG — contradicts a standard or a bar decision
- *(none found.)* `table`/`board` are already `VIEW_LAYOUT` members; the read-only-lens model + the token boundary +
  BR-2 are consistent with the canon. The only corrections are **framing fixes**: the "7" scope-precision note (§0) and
  removing the earlier mis-homes (drag as a view-renderer deliverable — see §6 R5).

### MISSING — the spine requires it, nothing exists
- **M1** **No `table` renderer** — `VIEW_LAYOUT` admits `table`, but `@vida/ui` ships no `TableView` [FACT: view.ts:19; index.ts].
- **M2** **No `board` renderer** — same, for `board` (the kanban/grouped layout) [FACT: view.ts:20; decomposition.md:86].

### OVERFLOWING — past this read-only view-renderer's job (homed by the docs, NOT deferred)
- **O1** **Board drag-to-move** (and any interactive card move/reorder across columns) = an interactive write → a
  **Capability** (ADR-008), writing via the module write API (INT-2). Homed to the capability tier / module ② consumer,
  NOT this renderer [FACT: quality-bar §4.3:120-123; ADR-008:15,71-72; surface-map.md:140 is the systemic reduced-motion
  reminder that attaches *there*, not here].
- **O2** **View-chrome controls** (sort toggle, layout switch, filter editing) = the **Collection shell** (decomposition
  §1.2), which composes the renderer; the bare renderer only renders the current sort as an `aria-sort` display [FACT: decomposition.md:29 §1.2].
- **O3** **Filter / group / sort LOGIC** → the View Engine / provider (ADR-007 §3.3) [FACT: ADR-007 §3.3:65-69].
- **O4** **Module layout *variants*** (Tasks' 12) → the owning module's ② track [FACT: decomposition.md:22-23].
- **O5** **The Vision-board / Calendar-grid CANVAS** → `fe-codec-canvas-board` (#10, a later unit) — the immersive
  Canvas archetype, NOT the `board` view-mode [FACT: g6-reshape-runbook.md:40; g6-edge-ledger.md:52].

---

## 6. RESOLVED BY DOCS (stated as FACT — read from the governing ADRs, not decided)

- **R1 — Scope = exactly 2 net-new renderers (`table`, `board`).** The reshape ledger names it; the other 5 are shipped;
  the `VIEW_LAYOUT` tuple is frozen [FACT: g6-edge-ledger.md:46; view.ts:17-25].
- **R2 — Both home in `@vida/ui`, `state` as a prop (BR-2).** Presentational; mirror `ViewState` structurally; the app
  derives + passes [FACT: CLAUDE.md:125; list-view.tsx:34-35].
- **R3 — `table` follows the calendar divergence.** `role="table"` + cells; empty is a designed grid; reuse spine pieces
  but NOT `resolveDataViewState` [FACT: calendar-view.tsx:9-11; CLAUDE.md:157-161].
- **R4 — `board` reuses the list-shaped spine per column** and `resolveDataViewState` at the column level; grouping is
  pre-resolved upstream [FACT: internal/data-view.tsx:36-68; ADR-007 §3.3:65-69].
- **R5 — The renderers are READ-ONLY LENSES; drag-to-move is a Capability, OVERFLOWING (not deferred).** A view is a
  read-only lens; interaction-that-writes is a Capability (ADR-008, INT-2). Board drag-to-move changes the group-by = a
  write → it belongs to the capability tier, not this renderer. This corrects an earlier mis-home (it was framed first as
  a deferral, then as an in-renderer feature; both ungrounded) [FACT: quality-bar §4.3:120-123; ADR-007:94; ADR-008:15,71-72].
- **R6 — Tokens via DIRECT semantic tokens + the token scale for dimensions** (DEF-U8-h); no hard-coded palette [FACT: CLAUDE.md:271-278].

### One precision kept (not a silent decision)
**Within-column manual reorder** *could* read as a View **sort** change (view-config, not an entity write) rather than a
capability; **cross-column move is unambiguously an entity write → a Capability.** This unit ships the renderers read-only
either way; whether an in-renderer manual-sort affordance is ever wanted is a Collection-shell / sort question (O2), not a
blocker here — flagged, not silently decided.

## 7. NO OPEN GAPS FOR VICTOR — proceed to decomposition

Every home is read from the governing ADRs (§6): read-only `table` + `board` renderers; drag-to-move + view-chrome +
grouping-logic + layout-variants + the Vision-board Canvas are each homed elsewhere by the docs (§5 O1–O5), not deferred.
→ Step 2 Decomposition (slice-map + seam-contract).

## 8. Envision Gate (Step 1.5) — SKIP (doc-grounded; the trigger fails)

§3.75 one-question test — *"a user affordance whose UI answer isn't obvious from an existing shipped surface?"* — is **NO**
for both renderers: as **read-only lenses** (R5) they reuse shipped patterns — `table` = the shipped `calendar-view`
`role="table"` grid; `board` = the shipped `list-view` spine per column. The one affordance that *would* have triggered
the gate (drag-to-move) is **not in this unit** — it's a Capability (O1). No novel interaction surface remains → **SKIP**,
stated not silently omitted. The per-slice **Visual Gate (Step 10)** still verifies each rendered renderer (every state ×
light/dark × 375/768/1440 + a11y) against the ui-2 sibling specimens [FACT: entity-delivery-flow.md §3.75:104-107].
