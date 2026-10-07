# P3 · timeline — refine + now-fulcrum alive-hook (forward spec)

> **Phase 3** of fe-codec-primitives-refinement (LIF-230). Profile: change-frontend-component · Entity Delivery Flow ②.
> §XXVI gate artifact (the PLAN). Acceptance oracle = `../mockups/views-refinement.html` (Timeline plate, before→after)
> + `../mockups/views-alive-concept.html` (Timeline · now-fulcrum). Status: **Approval 1 ✅ · grounded (§4b) · /preflight
> BLOCKED→resolved (G1 ordering · G2 fulcrum total-function · G3 skeleton 3-col) · gate-2 /critique REVISE→fixed (fulcrum
> continuity = combined-sequence trim) → SHIP → AWAITING APPROVAL 2 (cleared to implement).**

## 0. Source model
Code-first (frontend-source-of-truth.md). Tokens/variants only; no hard-coded palette (brand values = M4/Figma).
Base = editorial preset; same tokens, no new palette. All PRESENTATIONAL (BR-2 state-as-prop; LV-5 content boundary).

## 1. Baseline (ground truth — `packages/ui/src/components/timeline.tsx`)
`Timeline<T>` is **UI-2 · V3**, the data-view spine laid out as a **continuous vertical rail**, purely presentational:
`items · renderItem · getKey · getLabel? · state · empty? · error? · loadingCount · density · ref · aria`.
It owns: the `role="list"` container (state-dependent role), `role="listitem"` rows, the **rail column** (aria-hidden:
`RailDot` 12×12 **solid `$colorTextMuted`** at fixed `top:12`/center 18 + `RailLine` 2px `$colorBorderDefault`, 4-branch
trim, continuous via root `gap:0` + Content `paddingBottom`=density), the optional **`getLabel` date** (muted `$small`
`$colorTextMuted`, real content, first in DOM order), skeleton rows, the 4 terminal states, the accessible name + dev-warns
(via `resolveDataViewState`). **It does NOT own row CONTENT** — `renderItem` renders each row body (LV-5). No drift:
`packages/ui/src/CLAUDE.md` timeline paragraph ≡ code. `[FACT: timeline.tsx:22-139; docs/specs/components/ui-2-platform-views/v3-timeline.md]`

## 2. The crux (the /contract boundary — resolve before building)
The mockups show (a) an **editorial date + hollow/now dot** refinement and (b) a **now-fulcrum**: past = toned record,
future = light intention, with a `now` divider between them. Split by the LV-5 boundary (P1 precedent):

**timeline OWNS (this phase builds):**
- **L1 chrome polish** (the rail + the date — both already the renderer's):
  - **Date GUTTER (layout change — R1 resolved).** The oracle renders the date in a **left gutter**, not inline:
    `TimelineItem` goes from the current 2-col `[rail | content]` to a **3-col `[when | rail | content]`** grid (the
    `.tli{grid-template-columns:5.5rem 1.7rem 1fr}` model). The `when` gutter is right-aligned, holds the date + eyebrow,
    and is **first in DOM order inside the listitem** (TL-6/B2 real-content + reading-order preserved). **Responsive
    (375):** DEFAULT = a **single gutter width** (a `style` layout number ≈72px) that holds 375→1440 with the date never
    wrapping the rail (simplest, no new surface — the preferred resolution). Option-B (only if the Gate shows 72px crowds
    375): narrow the gutter on mobile — but note `useTabletUp` is a **private fn in `collection-view.tsx:37`, NOT an
    export** `[FACT: collection-view.tsx:37]`, so Option-B first **extracts it to `hooks/`** (its 2nd consumer; rule-of-
    three not yet met → extraction optional). Resolve A-vs-B at the Visual Gate.
    `[FACT oracle: views-refinement.html:51; alive-concept.html:53; FACT: tabs.tsx:269 / gallery-view.tsx:60 style-number precedent]`
  - **Date chrome:** the primary date (`getLabel`) uses the **display FAMILY** — `fontFamily:'$display'` (serif), **size
    stays `$small`**, + **tabular figures** via `style={{ fontVariantNumeric:'tabular-nums' }}` (Tamagui forwards the style
    key — the P1 pomodoro FACT, verified at the gate; the DS-wide tabular-numeric convention). NEW optional
    **`getEyebrow?(item,index)`** renders the **eyebrow kicker** under the date (`$caption`, uppercase, tracked,
    `$colorTextMuted` — the `.when .t`, e.g. "Today"/"Monday"). Direct analogue of P1's eyebrow. Both optional +
    backward-compatible (absent both = today's behavior, just relocated to the gutter). `[FACT oracle: views-refinement.html:63-64; CLAUDE.md pomodoro tabular]`
  - **Hollow resting dot:** `RailDot` default becomes **hollow** — `$colorSurfacePrimary` fill + 2px `$colorTextMuted`
    border (a softer, more editorial marker than the current solid fill; same weight, token-pure). `[FACT oracle: views-refinement.html:66]`
  - **Rail line:** stays `$colorBorderDefault` (already the hairline token; the mock's "lighter rail" is the perceptual
    effect of hollow dots — no token change, no palette churn). `[FACT: timeline.tsx:45; views-refinement.html:65 ≡ before]`
  - **No new motion** — every treatment is static (TL-5 preserved; the ring/segment are static shadows/fills, B12).
- **L2 §2a — `getTemporalState?`** (NEW, optional, the now-awareness hook): `(item,index) => 'past' | 'present' | 'future'`.
  Drives the **renderer's own rail dot** (+ a strictly AA-safe date treatment — NOT the title, which is renderItem's):
  - `present` (the **now ITEM** — views-refinement model) → **accent dot** (`$colorBrandPrimary` fill + border) with a
    **soft accent ring**. `[oracle: views-refinement.html:67]`
  - `future` → **hollow dot faded** (`opacity` on the **dot only**) + date held at **`$colorTextMuted` at full opacity**
    (the intention reads via the *dot*, NOT a sub-AA date — **R2**, the Card pattern verbatim: "dim the CHROME, hold the
    TEXT" — a blanket opacity composited muted text to 2.4–2.6, axe-confirmed). `[oracle: alive-concept.html:63-65; FACT:
    card.tsx:208-209; card-refinement.md:88-89]`
  - `past` / absent → the L1 hollow dot. `[oracle: alive-concept.html:59]`
- **L2 §2b — `nowFulcrum?`** (NEW, optional boolean; `nowLabel?: ReactNode` default `"now"`): a **separate** divider for
  the journal model (alive-concept), orthogonal to a `present` item (R3 resolved — the two compose). When set AND
  `getTemporalState` is provided, insert ONE **accent fulcrum row** **before the first non-`past` item** (F3/G2 — the
  deterministic boundary; consumer-ordered items, renderer never sorts) — an accent eyebrow (`nowLabel`,
  `$colorBrandPrimary`, uppercase tracked) in the `when` gutter + an accent dot-with-ring on the rail + a solid accent
  rail segment. The reusable "journal spine." For continuity (R4), the **4-branch line trim is computed over the COMBINED
  render sequence** (items + the fulcrum spliced in as a pseudo-row), NOT the items array — so the rail connects *through*
  the fulcrum in every case (interior: both neighbours resolve to "middle"; top-of-list: the fulcrum is "first", trims
  `top:18`). The fulcrum is an `aria-hidden` **non-listitem** row (stable key `'now-fulcrum'`); items keep
  `role="listitem"`. `[oracle: alive-concept.html:67-71,153]`

**CONSUMER OWNS (NOT this phase — composed in renderItem; documented as the pattern):**
- The **title typography** of past (serif italic, toned) vs future (muted) rows — that is `renderItem`'s output, and the
  consumer already computed `getTemporalState`, so it styles its own row body. timeline exposes the rail/date + the hook;
  the row body stays the consumer's (LV-5, exactly P1's honest-scope split). `[FACT: v1-list-view.md LV-5; P1-list-view.md §2]`

## 3. Contract (the exact diff to `TimelineProps<T>`) — DRAFT (preflight to confirm §4a)
```ts
+ export type TemporalState = 'past' | 'present' | 'future'
  export interface TimelineProps<T> {
    items: readonly T[]
    renderItem: (item: T, index: number) => ReactNode
    getKey: (item: T, index: number) => string
    getLabel?: (item: T, index: number) => ReactNode      // primary date — now styled serif $display + tabular-nums
+   getEyebrow?: (item: T, index: number) => ReactNode     // optional uppercase kicker beside the date (.when .t)
+   getTemporalState?: (item: T, index: number) => TemporalState  // now-awareness → dot + date treatment (NOT title, LV-5)
+   nowFulcrum?: boolean                                    // render the accent "now" divider at the past↔future boundary
+   nowLabel?: ReactNode                                    // default "now"
    state?: ViewState
    empty?: ReactNode; error?: ReactNode; loadingCount?: number
    density?: 'compact' | 'default' | 'spacious'
    ref?: Ref<HTMLDivElement>; 'aria-label'?: string; 'aria-labelledby'?: string
  }
```
Rules:
- **Layout:** `TimelineItem` becomes a **3-col grid** `[when | rail | content]` (R1). The gutter width is a **layout
  number** (`style`), not a token — the tabs `indicatorStyle` / gallery `tileStyle` precedent (fixed px, `useTabletUp`
  reduction at 375). The rail column + continuity trick (root `gap:0`, Content `paddingBottom`) are **unchanged**.
- **All dot/date treatment via Tamagui VARIANTS + DIRECT semantic tokens** (NOT injected CSS — [FACT: CLAUDE.md Rules
  "prop-driven state = variant"; Menu `active` / card `interactive` precedent]). Dimensions via the token scale (DEF-U8-h:
  `$full` dot radius). React-19 ref-prop + `ViewState` unchanged.
- **The soft accent ring** (present + fulcrum dot) = a **static `box-shadow`** composed from the theme-resolved accent via
  `useTheme().get('web')` (the P1 pomodoro-ring precedent — a `$token` can't reach an rgba shadow; a hard-coded hex would
  reintroduce the Neural-Graph conformance gap). Static only (no motion, B12). `[FACT: CLAUDE.md pomodoro ring via useTheme().get('web')]`
- **Fulcrum line = SOLID accent** (`$colorBrandPrimary`), NOT the mock's `linear-gradient` (gradient needs injected CSS +
  `color-mix` not in the pipeline → dropped as a mock-only flourish, the P1 "bg-tint dropped" precedent — the solid accent
  segment communicates the boundary token-purely). `[oracle: alive-concept.html:71 — gradient; dropped]`
- **`future` fade is dot-only** — `opacity` on `RailDot`, NEVER on the date text (R2: the date stays `$colorTextMuted` full
  opacity so AA holds; the Card BR-C-7a precedent). The title fade is the consumer's renderItem (LV-5).
- `nowFulcrum` with no `getTemporalState`, or no past↔future transition in the sequence → **no-op + dev-warn** (the LV-7
  guard style). `getTemporalState` absent → all dots neutral/hollow (today's behavior, non-breaking).

## 4. Acceptance
- **Visual Gate (blocking):** Brave, full matrix **3 presets × light/dark × 3 densities** — timeline renders in the **3-col
  gutter layout**; serif+eyebrow dates in the gutter; hollow resting dots; `present` accent dot + soft ring; `future` faded
  **dot** (date full-opacity); the **now-fulcrum divider** (accent eyebrow + accent dot-ring + accent segment) at the
  boundary; continuous rail intact (dots still align, 4-branch trim unbroken through the fulcrum); skeleton; empty/error via
  slot. **Full-matrix AA** on every text pair incl. warm-dark (serif date + eyebrow + **future date all ≥ 4.5** — the future
  date is NOT faded, R2; resolve any opacity to the composited color, getComputedStyle ignores ancestor opacity [FACT: P2
  contrast lesson]). Accent ring/dot/segment **flip per preset** (editorial blue / reader oxblood / quietDesk olive — the P1
  ring precedent). **375:** gutter narrows, no-overflow, date doesn't wrap the rail. Matches the mockup oracle.
- **a11y:** the rail (dot/line/**fulcrum**) stays `aria-hidden` (decorative — the fulcrum is a visual boundary, NOT an
  item; it adds no listitem and does not break the 4-branch continuity). The serif date + eyebrow stay **real content**
  (first in DOM order, TL-6/B2). `getTemporalState`/`future` fade is visual-only (no `aria-disabled`, no false semantics).
  State-dependent role + accessible name + dev-warns intact. axe 0.
- **Tests:** `getEyebrow` renders as content in the gutter; `getTemporalState` applies the right dot variant per item
  (past/present/future) + future fade is dot-only (date not faded); `nowFulcrum` splices the divider **before the first
  non-past item** (mixed), at **index 0** (all-future), and **no-op+dev-warn** (all-past / no getTemporalState); >1 present
  → dev-warn; serif date present; skeleton keeps the 3-col grid (empty gutter); continuity (dot offsets + 4-branch trim
  unbroken through the fulcrum) + the existing 9 tests green. `@vida/ui` suite green; tsc 0; eslint 0.
- **§XXIX currency:** `packages/ui/src/CLAUDE.md` (timeline paragraph: +getEyebrow/getTemporalState/nowFulcrum) + the
  v3-timeline spec change-log.

## 4a. Preflight (to run at gate — grounded checks)
- **F1** confirm `$colorSurfacePrimary` + `$colorTextMuted` resolve for a hollow dot (fill+border) on the unnamed host in
  both modes (dark: paper→surface, border still visible against warm-dark surfaces — the tight constraint) — verify at Visual Gate.
- **F2** confirm `useTheme().get('web')` reaches `colorBrandPrimary` for the ring box-shadow at the timeline host (pomodoro
  precedent was a widget; confirm in a data-view host) — else fall back to a filled accent dot WITHOUT the ring (still a
  valid token-pure "now").
- **F3 (now model — RESOLVED, total function).** Two orthogonal, composable affordances:
  (a) **`present` item** → the accent now-*dot* on that listitem (views-refinement model); 0..1 present items (dev-warn if >1).
  (b) **`nowFulcrum`** → ONE inserted divider (alive-concept journal model), independent of (a).
  **Ordering contract (G1):** the renderer **does NOT sort** — the consumer passes items in temporal order (the board/list
  "provider orders upstream" precedent, ADR-007 §3.3). **Placement algorithm (G2) — deterministic/total:** the fulcrum
  splices **before the first item whose `getTemporalState` is NOT `past`** (the moment the past record ends). Cases:
  mixed past→(present|future) → divider at that index; **all `future`** → divider at index 0 (top); **all `past`** (or no
  temporal states) → **no "now" visible → no-op + dev-warn**. Order-agnostic: it keys on the first non-past item, not a
  fixed past-before-future assumption. **Continuity (R4):** the 4-branch trim runs over the **combined render sequence**
  (items + fulcrum pseudo-row), so the rail connects through the fulcrum in every case — the fulcrum is `aria-hidden`,
  adds NO listitem (stable key `'now-fulcrum'`).
- **F4** `future` fade = `opacity` on the **RailDot only** (never the date text, never renderItem) — reconfirm the future
  date's AA floor holds at **full** `$colorTextMuted` (R2; composited, warm-dark included).
- **F5 (skeleton under 3-col — G3):** loading rows render in the **3-col grid** with an **empty `when` gutter** (no
  skeleton date bar — the date is consumer data, not chrome; an empty gutter keeps the rail + bar columns aligned so the
  loading→loaded transition doesn't shift columns) + the existing dot-only rail + `SkeletonBar` in content. aria-hidden +
  `aria-busy` unchanged `[FACT: timeline.tsx:87-100]`.

## 4b. Grounding ledger (code + docs verified — No-Guessing, 2026-10-06)
Every mechanism traces to a real source line (not the CLAUDE.md digest):
- **Serif date family + sizes:** `primitive.json:139` display=`'Spectral',Georgia,serif` (reader=Fraunces, quietDesk=Source
  Serif 4 — all serif); `:154-159` caption=12 · small=14 · display=36 → date = **`$display` FAMILY at `$small` size**.
- **Color tokens** all present in `themes.ts`: colorSurfacePrimary · colorTextMuted · colorBorderDefault · colorBrandPrimary · colorSurfaceSecondary.
- **Accent ring:** `pomodoro-widget.tsx:85,90` `theme.colorBrandPrimary?.get('web')` — the Tamagui SVG/shadow call.
- **Tabular figures:** `pomodoro-widget.tsx:245` `style={{fontVariantNumeric:'tabular-nums'}}` (Tamagui forwards the style key).
- **R2 (dim chrome / hold text):** `card.tsx:208-209` + `card-refinement.md:88-89` — blanket opacity → muted text 2.4–2.6, axe-fail.
- **Layout-number via `style`:** `tabs.tsx:269` indicatorStyle · `gallery-view.tsx:60` tileStyle.
- **Variant-host + eyebrow precedent:** `list-view.tsx:85` variants · `:100` SectionHeader · `:111` PrimaryEyebrow (P1 shipped).
- **`useTabletUp` is a PRIVATE fn** `collection-view.tsx:37` (not exported) → §2 gutter default = single width, Option-B extracts it.
- **No hard-coded palette:** `frontend-source-of-truth.md:16,22` — truth = specs/design.md now; Figma values M4 P2-⑦ release-gated.
- **Continuity invariant** to preserve: `timeline.tsx:9-12,39` root `gap:0` + Content `paddingBottom`; `:109-117` 4-branch trim.

## 5. Implementation prompt
Types-first: add `TemporalState` + extend `TimelineProps<T>` (§3) in `timeline.tsx`.
1. **Layout:** `TimelineItem` → 3-col grid `[when | rail | content]` (a `When` styled host: right-aligned gutter,
   `style`-driven width + `useTabletUp` narrowing at 375; rail + Content continuity unchanged).
2. **Date chrome:** `Label` → `fontFamily:'$display'`, size `$small`, `style={{fontVariantNumeric:'tabular-nums'}}` (pomodoro
   precedent); add an `Eyebrow` styled host (`$caption` uppercase tracked `$colorTextMuted`) under the date; render both in `When`.
3. **Dot variants:** make `RailDot` a **variant host** — `hollow` (default: `$colorSurfacePrimary` + 2px `$colorTextMuted`
   border) / `present` (`$colorBrandPrimary` fill+border + ring) / `future` (hollow + `opacity`). Key off `getTemporalState`.
   Ring box-shadow composed inline from `useTheme().get('web').colorBrandPrimary` (pomodoro precedent; F2 fallback = no ring).
4. **Fulcrum:** when `nowFulcrum` + `getTemporalState`, compute the boundary = index of the **first non-`past` item** (F3/G2;
   none → no-op + dev-warn); build a **combined render sequence** (items with a `{__fulcrum:true}` pseudo-row spliced at the
   boundary) and run the 4-branch trim over THAT sequence (R4 — rail connects through the fulcrum). The fulcrum row =
   `When`(accent `nowLabel`) + rail (accent dot-ring + accent `RailLine`) + empty content; `aria-hidden`, NO `role="listitem"`,
   stable key `'now-fulcrum'`. Items keep `role="listitem"`.
5. **Skeleton (G3):** loading rows use the 3-col grid with an **empty `when` gutter** + dot-only rail + `SkeletonBar`
   (columns stay aligned loading→loaded). Keep the continuous-rail invariant (root `gap:0`, Content `paddingBottom`),
   state-dependent role, dev-warns.
6. Update `.stories.tsx`: gutter dates (serif+eyebrow), temporal states (past/present/future), the now-fulcrum journal story,
   + the full-matrix Visual-Gate cells. Update tests (§4) + §XXIX currency (CLAUDE.md timeline paragraph + v3-timeline change-log).
7. Document the consumer title-treatment pattern (past serif-italic-toned, future muted) in the CLAUDE.md note as "composed in
   renderItem", NOT built here (LV-5).
