# P4 · gallery-view — refine + weight-sized tiles (forward spec)

> **Phase 4** of fe-codec-primitives-refinement (LIF-230). Profile: change-frontend-component · Entity Delivery Flow ②.
> §XXVI gate artifact (the PLAN). Acceptance oracle = `../mockups/views-refinement.html` (Gallery plate) +
> `../mockups/views-alive-concept.html` (Gallery · covers + weight masonry). Status: **gate-1 /critique done + GROUNDED —
> masonry is FORECLOSED by binding spec (GV-2 / ADR-001:111 / ui-2 \_index:96 = RN-safe flex grid, "not CSS grid"), so
> width-weight is the only flex-native realization (the P1 primaryKey precedent of building a mockup-sourced affordance);
> cover-intelligence = view engine (doc-homed out). · Approval 1 ✅ · /preflight BLOCKED→resolved (G1 story tile = plain
> composition, Card has no cover slot) · gate-2 /critique SHIP → AWAITING APPROVAL 2 (cleared to implement).**

## 0. Source model

Code-first (frontend-source-of-truth.md). Tokens/layout-numbers only; no hard-coded palette (brand values = M4/Figma).
All PRESENTATIONAL (BR-2 state-as-prop; GV-1/LV-5 content boundary).

## 1. Baseline (ground truth — `packages/ui/src/components/gallery-view.tsx`)

`GalleryView<T>` is **UI-2 · V2**, the data-view spine with a **responsive flex-wrap GRID**: `items · renderItem ·
getKey · state · empty? · error? · loadingCount(6) · minTileWidth(200) · density · ref · aria`. It owns the
`role="list"` grid container (state-dependent role), `role="listitem"` **tile wrappers**, the per-tile flex sizing
(`tileStyle = {flexGrow:1, flexBasis/minWidth:minTileWidth, maxWidth:2×}` via `style={}`), skeleton tiles
(`aspectRatio:3/2`), the 4 terminal states, the accessible name + dev-warns. **It does NOT own tile CONTENT** — the
consumer's `renderItem` renders each tile (GV-1: typically a Card with a cover). RN-safe flexbox grid, **NOT CSS grid/
columns** (GV-2 — universal Tamagui). `[FACT: gallery-view.tsx:46-115; v2-gallery-view.md:17-21,28-34]`

## 2. The crux (the /contract boundary — resolve before building)

The mockups show (a) an **editorial tile** (framed cover · kicker · serif title · tabular caption) and (b) **weight
masonry** + **generated covers**. Split by the GV-1/LV-5 boundary — this is the P1/P3 honest-scope split again:

**gallery-view OWNS (this phase builds):**

- **L2 §2a — `getWeight?`** (NEW, optional, the ONE genuine renderer add): `(item,index) => number` → a **width-weight**
  so a _featured_ tile is proportionally bigger within the flex grid. **A ready affordance** — like P1's `primaryKey`, the
  "which tile is featured" SEMANTIC is the consumer's; no M1 surface wires it yet (the view engine/Spaces will). Default
  1. Sizing scales to:
     `{ flexGrow: w, flexBasis: w·minTileWidth, minWidth: minTileWidth, maxWidth: w·minTileWidth·2 }` — **`minWidth` stays
     the BASE floor** (NOT `w·minTileWidth`) so a weight tile _prefers_ `w×` but SHRINKS to the base on a narrow row → **no
     375 overflow**, graceful mobile collapse (the GV-2 single-column-at-375 behavior preserved). `w` clamped to `≥1`
     (non-finite/`<1` → 1 + dev-warn). `[oracle: alive-concept.html:90-96 weight masonry; FACT: gallery-view.tsx:94-95]`
- **L1 chrome:** NONE needed on the renderer — the grid gap is already the tokenized `$8/$12/$24` density (≈ the mock's
  .9rem) and the tile frame is the consumer's Card. (Honest: the renderer's L1 surface is empty; the editorial lift is
  the Card's, already shipped P2.) `[FACT: v2-gallery-view.md:39 gap; card P2]`

**CONSUMER OWNS (NOT this phase — composed in renderItem; documented + shown in a story):**

- The **framed cover · kicker · serif title · tabular caption** — all tile CONTENT = `renderItem`. **Card has NO cover/
  media slot** (its slots = header/footer/children/actions/status/metric — `card.tsx`), so the editorial tile is a
  **plain composition** (a framed cover placeholder with a kicker overlay + serif `$display` title + tabular `$caption`
  caption), NOT a Card. gallery-view lays out whatever `renderItem` returns (GV-1). The story demonstrates it so the
  Visual Gate SEES it, but it is NOT gallery-view code. `[oracle: views-refinement.html:91-102; FACT: v2-gallery-view.md:17; card.tsx slots]`

**OUT OF SCOPE (homed elsewhere — do NOT build here):**

- **Cover-intelligence (generated covers for imageless entities)** — the **view engine's**, not this renderer
  (`ADR-007:62`; `v2-gallery-view.md:17-21,118` "degradation is the engine's"). The P3 "title-tone = consumer" precedent.
- **True variable-height MASONRY** (the mock's CSS `columns:4`) — **FORECLOSED by binding spec, not a choice**: the
  renderer is a RN-safe flex grid, explicitly "not CSS grid" (`GV-2` v2-gallery-view.md:28-34 · `ADR-001:111` universal
  Tamagui · `ui-2 _index:96`); RN has no CSS columns/grid. So the mockup's column-flow masonry cannot exist here; the
  renderer stays a flex grid, `getWeight` gives the _width_ emphasis, variable cover HEIGHT remains the consumer's cover
  (ragged rows, not column-flow masonry). A future platform-split masonry renderer could revisit, but that is NOT this
  primitive. `[FACT: v2-gallery-view.md:28-34; ADR-001:111; ui-2 _index:96; alive-concept.html:91 columns:4]`

## 3. Contract (the exact diff to `GalleryViewProps<T>`) — DRAFT (preflight to confirm §4a)

```ts
+ getWeight?: (item: T, index: number) => number   // width-weight ≥1 (featured tile bigger); default 1, clamp+warn
```

Rules:

- Tile sizing becomes a **per-tile** `style` (was a single memoized `tileStyle`): `weightStyle(w)` returns the scaled
  object (§2a). When `getWeight` is absent → every tile is `w=1` = today's exact `tileStyle` (non-breaking). The
  `useMemo` collapses to a small pure helper (per-tile width differs now). `[FACT: gallery-view.tsx:94-97]`
- **Skeleton tiles stay `w=1`** (uniform, data-independent — the board `SKELETON_COLUMNS`/loadingCount asymmetry
  precedent; a weighted skeleton would imply data we don't have while loading). `[FACT: CLAUDE.md board loading]`
- All via inline `style` layout numbers (the tabs/gallery `style={}` precedent — NOT tokens; gap stays tokenized
  `$8/$12/$24`). React-19 ref-prop + `ViewState` + role semantics unchanged.
- `getWeight` returning `<1`/`NaN`/`Infinity` → treated as 1 + dev-warn (LV-7 guard style).

## 4. Acceptance

- **Visual Gate (blocking):** Brave, full matrix **3 presets × light/dark × 3 densities** — the grid renders; a
  **weighted (featured) tile is visibly wider** than base tiles on desktop (≥768) and **collapses safely at 375** (no
  horizontal overflow; weight tile shrinks to the base floor); skeleton tiles uniform; empty/error via slot; the
  **story's editorial tile** (consumer Card: framed cover + kicker + serif title + tabular caption) reads correctly.
  **Full-matrix AA** on the story's tile text (serif title + tabular caption) incl. warm-dark (≥ 4.5; the caption is the
  consumer Card's, but assert it since it's in the gate surface). axe 0. 375 no-overflow (base AND weighted).
- **a11y:** unchanged — `role="list"`/`listitem` (NOT grid, GV-5); weight is visual-only (no false semantics); skeleton
  `aria-hidden` + `aria-busy`; accessible name + dev-warns intact.
- **Tests:** `getWeight` scales the right tile's `flexGrow`/`flexBasis`/`maxWidth` while `minWidth` stays the base floor
  (jsdom asserts the `style` px strings); absent `getWeight` = today's `tileStyle` (regression); `<1`/NaN → 1 + warn;
  skeleton tiles stay base-sized; existing gallery-view tests green. `@vida/ui` suite green; tsc 0; eslint 0.
- **§XXIX currency:** `packages/ui/src/CLAUDE.md` (gallery-view paragraph: +getWeight) + the v2-gallery-view change-log.

## 4a. Preflight (to run at gate — grounded checks)

- **F1** confirm the weight sizing never overflows 375: a `w=2` tile at `minTileWidth:200` has `minWidth:200` (base, not 400) → fits/ wraps at 375; verify at the Visual Gate (base + weighted both ≤ clientWidth).
- **F2** confirm a weighted tile is _visibly_ bigger at desktop (flexGrow:w + flexBasis:w·min grabs more space) — the
  Visual Gate is the oracle (a lone row could equalize; use a mixed-weight fixture with enough tiles).
- **F3** confirm `style` (per-tile, now not memoized identically) doesn't regress — React forwards the object; the tabs/
  gallery `style={}` precedent. No perf concern (N tiles, each a tiny literal).

## 4b. Grounding ledger (code + docs verified — No-Guessing, 2026-10-07)

- **Current tile sizing** (what weight scales): `gallery-view.tsx:94-98` `tileStyle = {flexGrow:1, flexBasis/minWidth:minTileWidth, maxWidth:2×}`.
- **RN-safe flex grid = BINDING (masonry foreclosed):** `v2-gallery-view.md:28-34` "RN-safe flexbox grid (not CSS grid)";
  `ADR-001:111` Tamagui "Universal components — single API for web + React Native + desktop"; `ui-2 _index:96` "responsive flex-wrap grid".
- **cover-intelligence = view engine (NOT this renderer):** `ui-2 _index:59,96` + `ADR-007:62-64` (cover/image-field degradation is the engine's).
- **"weight-sized tiles" has NO foundation spec** — grep-clean across `ADR-007`, `capability-framework.md`, `view.ts`, `ui-2 _index`
  (only the task build-table + the mockup `alive-concept.html:90-96`). Mockup = reference, not authority → width-weight is the
  flex-native realization (the P1 `primaryKey` precedent: build a mockup/table-sourced affordance as a generic prop).
- **No code consumer wires weight** — `collection-view.stories.tsx:55` calls `GalleryView` with none (ready affordance).
- **Skeleton-stays-uniform precedent** — board `SKELETON_COLUMNS` (data-independent loading; CLAUDE.md board-view).
- **style-number precedent** — `tabs.tsx:314` `style={indicatorStyle}` / `gallery-view.tsx:60`.

## 5. Implementation prompt

Types-first: add `getWeight?` to `GalleryViewProps<T>` (§3). Replace the single `tileStyle` memo with a small
`weightStyle(w)` pure helper (`{flexGrow:w, flexBasis:w·minTileWidth, minWidth:minTileWidth, maxWidth:w·minTileWidth·2}`);
clamp `w = Number.isFinite(w) && w >= 1 ? w : 1` (+ dev-warn on the coerce). In the success map, compute
`w = getWeight?.(item,i) ?? 1` → `style={weightStyle(w)}`. Skeleton tiles keep `weightStyle(1)` + `aspectRatio:3/2`.
Keep role semantics, density gap, dev-warns intact. Add a `.stories.tsx` story: a mixed-weight fixture + an **editorial
tile `renderItem`** — a **plain composition** (a framed cover placeholder View [aspect-locked, `$colorSurfaceSecondary`
gradient-ish, `$lg` radius, 1px `$colorBorderDefault`] with an absolute **kicker** overlay + a serif `$display` title +
a tabular `$caption` caption; NOT a Card — no cover slot) so the Gate sees the full look + the weight emphasis; + the
full-matrix cells. Update tests + currency. Document in the CLAUDE.md note that the cover/kicker/title/caption + generated
covers are the consumer's/view-engine's, not built here (GV-1).
