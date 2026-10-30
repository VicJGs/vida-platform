# PLAN — fe-calendar S4 · Year renderer (`YearView`, `@vida/ui`)

> Entity Delivery Flow ② · per-slice §XXVI gate 1. Slice-map S4 (slice-map.md:37): **frontend · `@vida/ui`** —
> "`YearView` — 12 mini-months · activity-density dots · today ringed · fixtures." EC MUSTs: **EC-5** + EC-11/12/13/14.
> Design evidence: the approved greybox `../mockups/greybox/year.png` + the mockup
> `../mockups/calendar-ranges-and-agenda.html` § YEAR (:85-95 CSS). Seam: seam-contract.md §A (`YearDensity`/
> `YearViewProps` — PROPOSED, ratified + refined here; the seam licenses per-slice refinement at `/contract`
> [FACT: seam-contract.md:5-6]).

## 1. Identity

- **What:** `packages/ui/src/components/year-view.tsx` (+ `.test.tsx` + `.stories.tsx`) + `internal/year-layout.ts`
  (+ `.test.ts`) — the presentational renderer for the **Year** range: 12 mini-month grids of day cells, each carrying an
  activity-density dot (none · has · busy), today ringed, the current month's name accented, and a month heading that
  **drills into Month** (EC-5 "a month drills in" [FACT: envision.md:27]). Pure data-prop; NO `@vida/core`/`@vida/types`
  import [FACT: slice-map.md:77]. Consumed by the S1 `CalendarSurface` dispatch for `range === 'year'` (fixture data until
  S7 `useCalendar`, which owns the density derivation — seam §B `year?: YearDensity[]` [FACT: seam-contract.md:79]).
- **Why it exists:** the density overview — "Year = density overview" [FACT: calendar-vision.md:19]; EC-5 is its anchored
  checkpoint.
- **Pattern stated (scenario Step 3, 3 components read):**
  1. **`week-view.tsx` / `agenda-view.tsx` (V11/V10, the sibling #19 renderers)** — LOCAL types; spine PIECES
     (`ViewState` · `Message` · `warnMissingName`), NOT `resolveDataViewState`; outer `role="group"` named via
     `aria-label`/`aria-labelledby`; `useId`-prefixed index-keyed ids; TZ-safe `YYYY-MM-DD` parse-by-parts; `today` by
     string equality; dev-warns for contradictory props; `empty?`/`error?` slots; pure geometry in `internal/*-layout.ts`
     unit-tested directly; `position:relative` root so sr-only spans never escape (the S3 gate catch); intent controls
     render-when-handler as native `render:'button'` hosts with Tamagui `focusVisibleStyle`/`hoverStyle` (AgendaView
     DEV-1) [FACT: agenda-view.tsx:63-136; week-view.tsx:66-110; ui CLAUDE.md week-view].
  2. **`calendar-view.tsx` (V4 + P5)** — a 2D date grid is a **`role="table"`** of `role="row"`/`role="cell"`, each cell
     `aria-label`'d with its full date; **empty is a designed grid**, not a status; today = **`$colorBrandEmphasis`**
     (brandPrimary failed AA on `$colorSurfaceSecondary`, Visual-Gate-caught); `weekStartsOn` shifts the grid
     [FACT: calendar-view.tsx:7-19,41,116,194; ui CLAUDE.md P5].
  3. **`canvas-view.tsx` (the frame)** — STATE RULE: an un-overridden `empty` delegates to the hosted renderer's own
     designed state; the frame owns the period title once (here "2026", already shipped: `periodLabel` year branch +
     ±12-month clamped nav [FACT: apps/web/src/app/calendar/index.tsx:59,82]).

## 2. Business rules (BR-CAL-S4-\*)

1. **BR-CAL-S4-1 · Presentational arrangement only.** `density` arrives pre-derived (S7 `useCalendar` decides what makes
   a day "has" vs "busy" — seam §B); YearView only places dots. No sorting, no counting, no thresholds.
2. **BR-CAL-S4-2 · 12 mini-months, Jan→Dec, in a flex-wrap grid (doc-fixed shape).** Approved records: 4 months per row
   at desktop, 2 below ~760px [FACT: mockup:86-87; greybox year.png]. House layout = the **RN-safe flex-wrap grid**
   (gallery-view GV-2 precedent — `flexDirection:'row'` + `flexWrap:'wrap'`), NOT CSS grid: each month
   `{flexGrow:1, flexShrink:1, flexBasis:'22%', minWidth: MONTH_MIN}` — `22%` caps a row at 4 (5×22% > 100%) and
   `MONTH_MIN = 128` forces 2-up at 375. Math: **375** → 375 − 32 shell − 48 surface = **295** ≥ 2×128 + 24 = 280 → 2-up;
   **768** → 672 → 4-up (4-up needs content ≥ 600); **1440** → 4-up (CanvasView caps the body at 1136,
   canvas-view.tsx:66). 3-up occurs at content 432–599 (≈ viewport 512–679) and 4-up from ≈ viewport 680, where the
   mockup's media query would still show 2-up below 760 — the fluid middle of a flex grid (refinement **R5**; identical
   at every gated width; the gate probes 600/700 as non-blocking observations). `flexShrink:1` explicit
   (the RNW default-0 lesson). Row gap `$24`, column gap `$24` (the `$12/$16/$24` rhythm, EC-14).
3. **BR-CAL-S4-3 · Mini-month grid.** 7 columns, rows of 7; **leading offset cells** before day 1 from `weekStartsOn`
   (`(firstWeekday − weekStartsOn + 7) % 7`), rendered transparent (mockup `.d.oos{background:transparent}` :92); **no
   trailing fill** (greybox: the last row ends on the last day). Day cells: square (`aspectRatio:1`, set via `style`
   — the gallery-view.tsx:123 precedent), `$sm` radius, `$colorSurfaceSecondary` fill [FACT: mockup:91; greybox].
   **Cell gap `$8` — the GREYBOX governs** (envision.md:60-61: `greybox/*.png` is the durable approved evidence; year.png
   draws a gap ≈ 0.38× the cell, ≈10px at 1136 → nearest rhythm token `$8`), not the earlier exploration mockup's 2px
   (:90). Consequence at 375: ≈12.5px cells, gap ≈0.64× the cell (greybox ≈0.38×) — dots (4/6px) + 2px ring still fit;
   an explicit 375 Visual-Gate feel observation, with `$4` below 768 the pre-noted alternative if it reads sparse.
   **Uniform cell width:** cells `flexGrow:1 flexBasis:0`; the last row is padded with transparent `aria-hidden`
   TRAILING spacers to 7 slots — visually identical to "no trailing fill" — spacers share the Cell flex style (`flexGrow:1 flexBasis:0`), so a short final row never stretches its
   cells (tested: last-row cell width === first-row cell width in the browser probe; jsdom asserts 7 slots per row). **No day numbers, no weekday header row** — doc-fixed (both records draw neither; the
   overview is density, the drill-in is Month). Days-in-month = a `setFullYear(y, m + 1, 0)` date's `getDate()`; ALL date
   construction by numeric parts with `setFullYear` (a bare `new Date(y,…)` maps years 0–99 to 1900+y), keys built
   from calendar fields with a 4-digit padded year [memory: date-code-needs-tz-forced-tests].
4. **BR-CAL-S4-4 · Density dot (EC-5).** `level 0` → no dot · `level 1` "has" → a **4px** dot · `level 2` "busy" → a
   **6px** dot, centred, `$colorBrandEmphasis`. Mockup: has = 4px @ opacity .55, busy = 5px @ 1 [mockup:93-94]. The two
   levels differ by **size AND tone** (never opacity alone). The dot is a GRAPHICAL object → **3:1 (WCAG 1.4.11)**
   against `$colorSurfaceSecondary` is a Visual-Gate MUST. **Has = opacity .75, DECIDED NOW (gate-1 F1, computed from
   tokens):** at the mockup's .55 the has-dot is 2.39–3.27:1 — FAILS 3:1 in 4/6 preset×mode cells; at .75 the minimum is
   3.53:1 in all six, keeping the greybox's lighter-has / darker-busy tonal step (full opacity 5.93–7.31 for busy).
   Recorded as D-S4-DEV-1 (§5a) + decisions.md. Busy is 6px (not 5) so the size step stays perceptible at ~12.5px
   cells. `brandEmphasis` not `brandPrimary` (the P5 lesson — primary fell under AA on secondary paper).
5. **BR-CAL-S4-5 · Today ringed (EC-5).** The `today` cell (string-equal key) carries an inset **2px
   `$colorBrandEmphasis` ring** (mockup `.d.today{box-shadow:inset 0 0 0 1.5px var(--accent)}` :95 — 2px because Chrome
   snaps 1.5px to 1px [memory: visual-gate-playbook]) — a SHAPE, not colour alone (1.4.1) — plus ", today" in the cell's
   accessible label. Implemented as an absolutely-positioned `aria-hidden` overlay (`top/right/bottom/left:0`, `borderWidth:2`,
   `borderColor:$colorBrandEmphasis`, `borderRadius:$sm`, `pointerEvents:'none'`) inside a `position:'relative'` Cell (no
   injected CSS; the ring must not change the cell box). `today` outside `year` → no ring, no warn (a past/future year is normal).
6. **BR-CAL-S4-6 · Current-month heading accented.** The month containing `today` renders its name in
   `$colorBrandEmphasis` (6.47–8.89:1 on `$colorSurfacePrimary`); every other heading `$colorTextPrimary` [FACT: mockup:89 `.ym.cur .ymh{color:var(--accent)}`; greybox "October" blue] — redundant with
   the today ring inside it (never the sole signal).
7. **BR-CAL-S4-7 · Month heading = the drill-in (EC-5 "a month drills in").** **Why the heading (gate-1 F5 — derived, not stated by the records):** EC-5 says "a month drills
   in" and the mockup note says "click a month" [envision.md:27; mockup:205]; neither names the target. A button
   WRAPPING the mini-month would make its table children presentational (a button's children are flattened for AT) and
   erase the grid semantics BR-8 carries — so the heading is the only element that can be the control without losing
   the grid. No extra pointer-only press on the month box (an addition beyond the records; the heading is full-width).
   Recorded in decisions.md. Heading = the month name in the serif
   `$display` family at **`$subheading`, paired `lineHeight="$subheading"`, `fontWeight="500"`** (design.md:109 —
   subheading = 18px / 1.4 / **medium** weight; the CalendarView title 500 precedent) [FACT: ui CLAUDE.md Rules "Large type PAIRS
   its line-height"; mockup:88 `.ymh{font-family:var(--display)}`]. **Render-when-handler** (the AgendaView
   `onToggleItem` / collection `onFilter != null` idiom): NO `role="heading"` (grounding pass — the shipped sibling convention: AgendaView day headers, WeekView column
   headers, BoardView column titles and CalendarView are not headings; each group is NAMED via `aria-labelledby`, which the
   table name here does; gate-2 G11's "record why" option). With `onPickMonth` it contains a native `render:'button'` host with the UA styles RESET (the CheckBox
   precedent agenda-view.tsx:114-128: `backgroundColor:'transparent'`, `borderWidth:0`, `paddingHorizontal:'$4'`,
   `alignItems:'flex-start'`, `justifyContent:'center'`, `cursor:'pointer'`; heading Text `textAlign="left"` — a
   `<button>` centres inherited text, gate-2 G1) —
   `minHeight:44` (§X touch floor), full month width, left-set text, `hoverStyle` background → `$colorSurfaceSecondary` (the export-dialog radio-row
   hover precedent, §VIII), `$sm` radius, `focusVisibleStyle` 2px `$colorFocusRing` ring offset 2 — **visible text "October" only** (the records show
   the bare month; the frame title carries the year) inside a name span `<Text id=nameId>October<Text style={SR_ONLY}>{' ' + year}</Text></Text>` (all INLINE Text
   spans, explicit `' ' + year` — the accessible name is whitespace-sensitive, gate-2 G7)
   followed by an sr-only ", open month" OUTSIDE that span → button name "October 2026, open month" (label-in-name 2.5.3
   holds), table name (labelledby `nameId`) "October 2026". Press → `onPickMonth(monthIndex)`. Live wherever the grid renders —
   loading and slot-less empty (navigation doesn't depend on the data); absent in `error` and in empty-with-`empty`-slot
   (no grid renders — the WeekView slot replaces the grid, week-view.tsx:193-198). Without a handler the heading is plain
   text that STILL wraps the `nameId` span, so every table keeps its name. Touch: each button ≥44 tall × ≥128 wide, and
   adjacent buttons are ≥ `$24` apart (design.md:218-219 — 44×44 min, 8px min gap). Without the handler it is plain text (no dead control,
   D-S2-DEV-3). The drill-in is **navigation** (UI state), NOT a write — so the surface wires it NOW (BR-CAL-S4-12),
   unlike the deny-safe-absent write intents.
8. **BR-CAL-S4-8 · A11y topology.** Outer `role="group"` named (`warnMissingName`, state-gated) → 12 mini-months, each a
   **`role="table"`** (the V4 2D-grid precedent) named `aria-labelledby` → its heading text id (`useId`-prefixed,
   index-keyed) → `role="row"` per week → `role="cell"` per DAY, `aria-label` = `format(d, 'EEEE, d MMMM')` (date-fns, already a dep — "Thursday, 8 October"; Intl en-US would
   give "Thursday, October 8") + density
   suffix (", has activity" · ", busy") + (", today") — the WEEKDAY is in the label because no header row exists and the
   visual column conveys it (1.3.1, gate-1 F6; CalendarView labels the full date, :194). The table carries
   `aria-colcount={7}` and each day cell `aria-colindex` = its visual column (1-based, offset-aware), so AT computes
   Oct 1 as column 4, not 1. Leading + trailing spacers are `aria-hidden`, roleless, **inside** the
   row (valid: hidden children are pruned; rows of differing cell counts are allowed). The dot/ring layers are `aria-hidden`. No cell is
   focusable (EC-12 — read-only; the ONLY focus stops are the 12 month buttons when `onPickMonth` is given). No
   `columnheader` row — doc-fixed visual (BR-3); each cell's label carries the full date so none is needed.
9. **BR-CAL-S4-9 · Terminal states (EC-11), state-as-prop (BR-2).** `loading` → the 12 grids with no dots +
   `aria-busy` on the group (the cells ARE the skeleton — CalendarView loading-grid precedent); `error` → `role="status"`
   calm muted `Message` (or `error?` slot); **`empty` (or success with zero renderable level≥1 entries) → the DESIGNED
   year grid** (no dots) + a visually-hidden `role="status"` "No activity this year" — or the `empty?` slot. DOC-FIXED:
   the canvas-view STATE RULE + "a calendar's empty is a designed grid" [ui CLAUDE.md BR-CB-S1-6; V4]; the WeekView
   precedent verbatim. Success-with-nothing dev-warns (spine rule). `state="empty"` with dots → renders none + warns
   (the S3 g2 fold). `state="loading"` with level≥1 density → no dots + stale-render warn (week-view.tsx:180 parity).
10. **BR-CAL-S4-10 · Input guards (dev-warn, never crash).** `year` non-integer or outside 1000–9999 → render the current year's
    grid + warn — via a PURE `resolveYear(year, now)` in year-layout (injected `now`; the component passes `new Date()`). A `density` entry whose `date` is malformed **or impossible** (`2026-02-30` — round-trip check by
    fields) or **not in `year`** → skipped + warn. `level` not 0|1|2 →
    skipped + warn. Duplicate `date` → the **max** level wins + warn (a provider contradiction; max never hides
    activity — the S3 no-hidden-items charter). Pure in `internal/year-layout.ts`.
11. **BR-CAL-S4-11 · Tokens/theming (EC-13/14).** DIRECT semantic tokens, no sub-theme, no new dep, no new token,
    semantic type scale only. The `$colorSurfaceSecondary` cell fill on `$colorSurfacePrimary` is a hairline-weak
    boundary by design (paper band, not a control — 1.4.11 does not apply to a non-interactive decorative cell); the
    dot + ring carry the information and are measured.
12. **BR-CAL-S4-12 · Surface wiring (apps/web).** `range === 'year'` → `<YearView year={focused.getFullYear()}
density={yearFixture(focused)} today={toKey(new Date())} weekStartsOn={weekStartsOn} aria-label="Year"
onPickMonth={(m) => { setFocusedDate(toKey(clampToMonth(focused, focused.getFullYear(), m))); setRange('month') }} />` — the drill keeps
    the focused day-of-month clamped to the target month's length (the shipped `addMonthsClamped` rule, :72-78 —
    extracted to a `clampToMonth(d, y, m)` helper both use). `yearFixture` mirrors the greybox's weekday-stripe pattern
    (deterministic; busy on one weekday, has on two, a few scattered), dated in the focused year. The placeholder
    narrows to Living only ("ships in S5"). `weekStartsOn` from `usePreferencesStore` (BR-16, already read).
    **Focus after the drill (grounding pass — FOCUS_CONTRACT, state-conventions.md §5 "focus at every transition";
    `keyboard.ts:21-33`):** the activating button UNMOUNTS with YearView, so without a target focus drops to `<body>`. A
    drill is an in-surface view swap — the `tabChange → 'panel'` row is the matching transition — so the surface focuses
    the hosted Month grid: `CalendarView` gets `ref={monthRef}` + `tabIndex={-1}` + a `focusVisibleStyle` `$colorFocusRing`
    2px ring (both pass through its `...rest` onto `CalRoot`), and a `pendingFocus` ref set in `onPickMonth` is consumed by
    a `useEffect` on `range` → `monthRef.current?.focus()`. Only the drill moves focus; the range switcher keeps focus on
    its own toggle (unchanged). Tested: after pressing a month, `document.activeElement` is the "Month grid" table.

## 3. Contract (ratifies seam-contract §A, with refinements)

```ts
import { type ViewState, Message, warnMissingName } from '../internal/data-view'

export interface YearDensity {
  date: string // 'YYYY-MM-DD', within `year`
  level: 0 | 1 | 2 // 0 none · 1 has · 2 busy (S7 derives the bands)
}
export interface YearViewProps {
  year: number // full year, e.g. 2026
  density: readonly YearDensity[]
  today?: string // 'YYYY-MM-DD'
  weekStartsOn?: 0 | 1 // user_preferences.week_starts_on (BR-16); default 1
  onPickMonth?: (month: number) => void // INTENT (navigate), month index 0–11 (the Date#getMonth convention)
  state?: ViewState // default 'success'
  empty?: ReactNode
  error?: ReactNode
  ref?: Ref<HTMLDivElement>
  'aria-label'?: string
  'aria-labelledby'?: string
}
export function YearView(props: YearViewProps): ReactElement // non-generic → React-19 ref-as-prop

// internal/year-layout.ts (NOT barrel-exported; unit-tested directly)
export const MONTH_MIN = 128
export type YearSlot = { kind: 'spacer' } | { kind: 'day'; key: string; day: number; col: number; weekday: number }
export interface MiniMonth {
  month: number
  offset: number
  days: number
  rows: YearSlot[][]
} // as built (g2 #7)
export function resolveYear(year: number, now: Date): { year: number; warning?: string } // BR-10, pure
export function buildYear(year: number, weekStartsOn: 0 | 1): MiniMonth[] // 12 months, offset + day keys
export function indexDensity(
  year: number,
  density: readonly YearDensity[],
): { byDate: Map<string, 1 | 2>; warnings: string[] } // BR-10 guards; level-0 dropped
```

Refinements vs the proposed seam (within the per-slice ratification licence): **R1** `readonly` density · `empty?`/`error?`
slots · `aria-labelledby` (the S2/S3 refinements). **R2** `weekStartsOn?` (BR-16 — the user pref every range reads; Month
already takes it). **R3** `onPickMonth` month index pinned **0–11** (seam said `number`). **R4** `state` typed as the
intra-package `ViewState` (≡ seam `CalState`). **R5** the flex-wrap fluid middle (BR-2). Barrel: `YearView`,
`YearViewProps`, `YearDensity`.

## 4. Acceptance

_jsdom-vs-browser split (gate-2 G5): items marked **[VG]** are proven in the Visual Gate only; size/opacity/border/minHeight
assertions in jsdom compare atomic classes against a REFERENCE element with the same props (the lineHeight recipe —
never hard-coded class names)._

- [ ] 12 mini-months Jan→Dec; **[VG]** 4-up at 768/1440, 2-up at 375; serif `$subheading` headings with paired line-height;
      current month heading `$colorBrandEmphasis`.
- [ ] Grid: correct leading offset for `weekStartsOn` 1 AND 0 (2026-10-01 is a Thursday → offset 3 Mon-start, 4 Sun-start);
      Feb 2028 has 29 cells, Feb 2026 28; no trailing fill; no day numbers / weekday row.
- [ ] Dots: level 1 = 4px @ .75, level 2 = 6px @ 1, level 0/absent = none; today ring 2px on exactly one cell (when
      `today ∈ year`); `today ∉ year` → no ring, no accented heading, no warn.
- [ ] Rows (jsdom: slot count; **[VG]** last-row width): every row has 7 slots (leading + trailing spacers); headings pair `lineHeight="$subheading"` (assert the
      `_lh-` class equals a reference Text's — the ui CLAUDE.md recipe); non-current headings `$colorTextPrimary`.
- [ ] `year-layout` unit tests: `buildYear` offsets (both week starts) · leap year · 12 months · keys `YYYY-MM-DD` by
      fields · `indexDensity` guards: other-year date skipped · malformed skipped · bad level skipped · impossible date
      `2026-02-30` skipped · `resolveYear` 50 / 10000 / 2026.5 → `now`'s year + warning · duplicate → max · level 0 dropped · each guard emits a warning.
- [ ] A11y: group named · 12 tables each named by its heading · cell labels "Thursday, 8 October, busy, today" · `aria-colcount=7` +
      `aria-colindex` (Oct 1 → 4 Mon-start) · spacers `aria-hidden`, no role · dot/ring `aria-hidden` · no focusable cell · with `onPickMonth`: 12 buttons ≥44px tall,
      visible text "October", named "October 2026, open month", table named "October 2026", press →
      `onPickMonth(9)`; buttons present in loading + slot-less empty, absent in error + empty-with-slot; no-handler tables still named; without handler: no button, no tab stop.
- [ ] States: loading = grids no dots + `aria-busy` · error status (+ slot) · empty = designed grid + sr status (+ slot) ·
      `state="empty"` with dots → none drawn + warn · all-invalid density → designed empty · success-with-nothing warns.
- [ ] TZ: `process.env.TZ='America/Sao_Paulo'` on line 1 of BOTH `year-layout.test.ts` (2026-10-01 offset 3 Mon / 4 Sun;
      Feb 2028 = 29; impossible-date round-trip) AND `year-view.test.tsx` (the `today` ring cell) — the agenda-view.test:2-3
      recipe.
- [ ] ref-as-prop forwards to the root (week-view.test.tsx:227 precedent) · unnamed → `warnMissingName` warns, not in
      `error` · loading with density → no dots + warn.
- [ ] Stories: Year (greybox fixture) · Sunday start · Drill-in · States.
- [ ] `@vida/ui` tsc 0 · eslint 0 (changed files) · suite green; apps/web tsc 0 + calendar-surface tests: year dispatch
      renders group "Year" + 12 tables · `weekStartsOn=0` → Oct 1 `aria-colindex` = 5 · `weekStartsOn=0` shifts the offset · after the drill focus is on the "Month grid" table · pressing "March 2026, open month" from 2026-01-31 →
      range `month`, focused **2026-03-31**; from 2026-03-31 pressing February → **2026-02-28** (clamp) · placeholder
      now only for Living. Suites run sequentially [memory: heavy-tamagui-shell-tests-flake]; `calendar-surface.test.tsx` gains
      `vi.setConfig({ testTimeout: 15000 })` (Year adds ~500 Tamagui nodes; apps/web has no testTimeout).
- [ ] Blocking **Visual Gate** — standalone-entry harness on the REAL `CalendarSurface`, Year × 3 presets × L/D ×
      375/768/1440 + Sunday-start + a non-current year (no ring/accent) +
      no-handler (plain headings) + the 3 state cells (non-blocking probes: viewport 600/700 column count): **3:1 measured** on the has-dot, busy-dot and today ring
      vs `$colorSurfaceSecondary` · **AA** on month headings (incl. the accented current month) + state copy · 4-up/2-up
      column count per width · **page AND region** 0 overflow every cell · keyboard: Tab order through the 12 month buttons at 375 + 1440, ring visible + unclipped, hover bg change + **AA of `$colorBrandEmphasis` heading on the `$colorSurfaceSecondary` hover bg**, Enter drills to Month + focus lands on the Month grid with a visible ring · last-row cell width = first-row · EC-14 reads as a calendar · axe 0 · 0 pageerrors. Victor reviews.

## 5. Implementation prompt (ordered)

1. `internal/year-layout.ts` + `year-layout.test.ts` FIRST (TDD): `MONTH_MIN`, `buildYear`, `indexDensity`.
2. `year-view.tsx`: local types (§3) → styled hosts (`YearRoot` `position:relative` flex-wrap · `MonthBox` (flex
   style per BR-2) · `MonthHeading` Text / `MonthButton` `render:'button'` · `Grid` · `Row` · `Cell` (aspectRatio 1) ·
   `Spacer` · `Dot` · `TodayRing` absolute border overlay) — copy `SR_ONLY`/`warn` locally (extraction still waits for
   the rule of three at S5, per PLAN-S3 §5.2).
3. State switch: error → status; loading → grids no dots + `aria-busy`; effectiveEmpty → designed grid + sr status (or
   slot); success → dots.
4. Tests (`testTimeout:15000`, the week-view precedent) + stories (fixture = greybox stripes, today 2026-10-08).
5. Barrel exports; `pnpm --filter @vida/ui exec tsc` / eslint / vitest.
6. `apps/web/src/app/calendar/index.tsx`: extract `clampToMonth` (reused by `addMonthsClamped`), `yearFixture`, the
   year dispatch + `onPickMonth` drill; placeholder → Living only; surface tests per §4.
7. g2 code review → Visual Gate (blocking) → currency (§XXIX):
   - `docs/specs/components/ui-2-platform-views/v12-year-view.md` + `_index` V12 change-log row;
   - `packages/ui/src/CLAUDE.md` year-view paragraph;
   - `docs/infrastructure/web-client-runtime/current-spec.md` (#19 surface now dispatches Year + the drill-in);
   - slice-map S4 ledger row; seam-contract §A amended (YearView ratified R1–R5);
   - `.claude/docs/decisions.md` rows (heading = the drill target, derived [F5] · drill-in = navigation wired now vs write-intents absent · D-S4-DEV-1 has-dot .75 · cell gap `$8` greybox-governed);
   - `.claude/docs/components.md` V12 row;
     → commit (S3 message shape).

## 5a. Deviation record (§XXVIII)

**D-S4-DEV-1 · has-dot opacity .75 (mockup .55).** Decided at gate 1 (F1): .55 measures 2.39–3.27:1 on
`$colorSurfaceSecondary` (fails 1.4.11 in 4/6 cells); .75 → min 3.53:1. The tonal + size step between has/busy is kept.
**Critique:** sound — the mockup value was an exploration-stage number; the approved greybox shows a lighter has-dot, which
.75 still reads as. **Preflight:** a constant; one test. **Approval:** presented at Approval 1.

**D-S4-DEV-2 · `CalendarView` gains an optional `tabIndex` + a root focus ring (BR-12 said "passes through `...rest`").**

- **What diverged:** the plan assumed `tabIndex`/`focusVisibleStyle` reach `CalRoot` through CalendarView's `...rest`;
  they do at runtime, but `CalendarViewProps` declares neither, so apps/web's tsc rejected them (build-caught).
- **New direction:** an additive, back-compat V4 prop `tabIndex?: number` (absent = not focusable — the default; the
  D4 `hideHeader` precedent) + `CalRoot` carries the house `focusVisibleStyle` 2px ring and `$sm` radius, which can only
  render when a consumer opts in AND focuses the grid. The surface passes `tabIndex={-1}` only.
- **Critique:** sound — smaller than a wrapper div (a focused generic div names nothing for AT) and keeps the focus target
  the named "Month grid" table. **Preflight:** +1 CalendarView test (opt-in tabindex + focusable; absent → no attribute);
  `v4-calendar-view.md` + ui CLAUDE.md get the prop at currency. **Approval:** presented at the S4 Visual Gate stop.

**Build-caught fix (not a deviation):** the accessible name read "January2026" — accname drops a LEADING space inside the
sr-only span (gate-2 G7 predicted the sensitivity). The space is now a sibling text node before the span (`{' '}<span
sr>2026</span>`) → "January 2026" / "January 2026, open month". Mutation check: removing the drill `focus()` call fails
the surface focus test (killed), restored from a copy.

## 6. Change log

| Date       | Session        | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-20 | fe-calendar S4 | PLAN authored (gate 1). Grounded in slice-map:37, seam §A/§B, envision EC-5/11-14, calendar-vision:19, mockup § YEAR (:85-95), greybox year.png, WeekView/AgendaView/CalendarView/CanvasView patterns, surface `periodLabel`/`shift`/`addMonthsClamped`. Shape/dots/ring/accent doc-fixed by mockup+greybox; a11y + states by the V4/V11 precedents; R1–R5 seam-licensed refinements.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-10-20 | fe-calendar S4 | gate-1 independent critique **REVISE → 12 folded** (0 blockers; all citations verified on disk): **F1** has-dot .55 fails 3:1 in 4/6 (computed) → .75 decided now (D-S4-DEV-1) · **F2** cell gap: the GREYBOX governs (envision:60-61) → `$8`, not the mockup's 2px · **F3** trailing aria-hidden spacers so the last row can't stretch + `aspectRatio` via `style` · **F4** visible "October" (records show no year), name span → table "October 2026", button "October 2026, open month" · **F5** heading-as-drill stated as DERIVED (a wrapping button flattens the table) + decisions row; no extra box press · **F6** weekday in the cell label + `aria-colcount`/`aria-colindex` · **F7** fluid-middle math corrected (3-up ≈512–679, 4-up ≥680; CanvasView 1136 cap) · **F8** `clampToMonth(focused, focused.getFullYear(), m)` · **F9** `setFullYear` + 1000–9999 year guard + impossible-date guard · **F10** non-current heading `$colorTextPrimary` · **F11** acceptance + Visual-Gate cells (today∉year, lineHeight pair, buttons per state, non-current year, no-handler, hover, Tab order, last-row width) · F12 buildability confirmed. **One derived call remains for Approval 1: F5 (heading = the drill target).**                                                                                                                                          |
| 2026-10-20 | fe-calendar S4 | re-critique **SHIP** (all 12 verified from disk; 375 cells ≈12.5px, 2-up holds) + 4 NITs folded: buttons absent in empty-with-slot (WeekView slot replaces the grid) · decisions.md rows named (F5 · D-S4-DEV-1 · gap) · spacers share the Cell flex style + no-handler heading keeps the `nameId` span · 375 gap-proportion feel note with `$4` alternative. **Awaiting Approval 1.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-10-20 | fe-calendar S4 | **Approval 1 (Victor) — incl. F5 heading-as-drill, D-S4-DEV-1 .75, `$8` gap.** Preflight: every cited path/line/export verified on disk (canvas-view:66 1136 cap · export-dialog:56 hoverStyle · gallery-view:123 aspectRatio-in-style + test:133 · week-view:193-198 slot replaces grid · data-view `ViewState`/`Message`/`warnMissingName` · calendar-ui-store `setRange`/`setFocusedDate` · preferences-store `weekStartsOn` · space `$8` token · agenda-view.test:2-3 TZ recipe; v12 spec absent = net-new). **Preflight PASSED.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-10-20 | fe-calendar S4 | gate-2 independent critique **REVISE → 11 folded** (0 blockers; buildability confirmed on disk: render:'button', aria-colcount/colindex typed via HTMLAttributes, aspectRatio-in-style, `$sm`/`$subheading`/`$display`/`$8`/`$24`, no barrel collision, clampToMonth keeps addMonthsClamped + tests :90-111, batched store sets, no placeholder assertion, afterEach already resets prefs): **G1** MonthButton UA reset + `textAlign="left"` · **G2** pure `resolveYear(year, now)` homes the year guard · **G3** TZ forced in year-layout.test too · **G4** loading-with-data stale warn · **G5** jsdom/[VG] split + reference-element class recipe · **G6** `format(d,'EEEE, d MMMM')` · **G7** inline Text name spans, explicit `' ' + year` · **G8** Cell `position:relative` + ring overlay props · **G9** `setFullYear` for days-in-month too · **G10** ref/warnMissingName/surface colindex tests + surface `testTimeout:15000` · **G11** `role=heading aria-level=3` wrapper + hover-AA VG cell. **Awaiting Approval 2.**                                                                                                                                                                                                                                                                                                                                             |
| 2026-10-20 | fe-calendar S4 | **Grounding pass (Victor: "ground it in the documentation").** Swept the governing corpus: IA (`information-architecture.md:103` — `/calendar` Sessions-owned, no Year rule) · `state-conventions.md` §2 (loading = skeleton matching the settled box + `aria-busy` ✓; empty guided = the CanvasView slot, S3 precedent; error retry = the surface's S7 data layer) + §5 FOCUS_CONTRACT · frontend-quality-bar · frontend-replan surface-map/decomposition (Calendar = Canvas over ProviderRead) · the mockup's YEAR script (:232-255 — bare month names, leading blanks only, "click a month to drill in" :205) · design.md (§III subheading medium · §VI 44×44 + 8px gap) · decisions ledger · shipped heading precedents. **Results:** (1) **G11 REVERSED** — no `role=heading`; the sibling renderers name groups via labelledby, never headings (a heading role was an ADD) · (2) **NEW focus-after-drill** — FOCUS_CONTRACT `tabChange → panel`: the surface focuses the Month grid (the unmounting button would drop focus to body) · (3) heading `fontWeight 500` (design.md:109) · (4) touch gap cited. No other plan point changed. **Victor: proceed (Approval 2).**                                                                                                                                                                                               |
| 2026-10-20 | fe-calendar S4 | **BUILT → Visual Gate PASS (Victor-reviewed 2026-10-20; D-S4-DEV-1 + D-S4-DEV-2 approved; no feel changes).** TDD: year-layout 11 → YearView 19 → surface +6 + CalendarView +1. Build-caught: accname leading-space ("January2026") → sibling text node; apps/web tsc rejected `tabIndex` on CalendarView → D-S4-DEV-2. Mutation: removing the drill `focus()` fails the surface focus test (killed; restored from a copy). g2 code review **SHIP** + 9 NITs folded (current-month accent computed from built keys — never without the ring · outer Text in the button removed · reference-class tests for minHeight + heading colours · ring aria-hidden + no day numbers + Living-only placeholder + warnMissingName text asserted · §3 `rows` contract). Visual Gate (29 cells, Brave, real CalendarSurface): has 3:1 min 3.54 · busy/ring 5.93 · names 6.47 · 2-up/4-up · 0 page overflow · Tab Jan→Dec · drill focus on "Month grid"; a first run read 1-up at 375 — the HARNESS lacked the app's `index.css` body reset (16px lost), fixed in the harness, not the product. tsc 0 · eslint 0 (changed; `index.ts:1` pre-existing) · @vida/ui **636/636** · @vida/web **683/683**. Currency → v12 spec + `_index` V12 row + v4 `tabIndex` + ui CLAUDE.md + web-client-runtime current-spec + slice-map ledger + seam-contract §A + decisions ledger + components ledger. |
