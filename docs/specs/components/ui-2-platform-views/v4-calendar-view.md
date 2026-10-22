# Spec: component:ui-2-platform-views · V4 — calendar-view
<!-- type: component (unit sub-spec of ui-2-platform-views) -->
Status: implemented + Visual Gate PASS (Victor, 2026-08-10) — DONE
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Parent: docs/specs/components/ui-2-platform-views/_index.md (shared BR-1..BR-6).

## 1. Identity
V4 `calendar-view` — the renderer for the `calendar` VIEW_LAYOUT `[FACT: view.ts:22; ADR-007:60]`. A **month grid**
that buckets dated items onto their days — the surface the **Global Calendar** (a saved view over events/tasks/
reminders) reduces to `[FACT: ADR-007:34,62 "calendar → a date field"]`. Currently a 0-byte stub.

- **The desire:** one month-calendar renderer every dated module + `views` row reuses.
- **The divergence (why V4 is NOT a straight spine reuse):** a calendar is a **2D date grid**, not a linear list. So:
  (a) it renders as a **table** (weekday columnheaders + day cells), NOT `role="list"`; (b) **"empty" is NOT a status
  message** — a month with no items still shows the full grid (empty = success-with-no-chips). Therefore V4 reuses the
  spine's PIECES — `ViewState`, `Message` (for `error`), React-19 ref-prop, base tokens, no sub-theme — but
  **deliberately does NOT use `resolveDataViewState`** (its empty→status role is wrong here). `[INTERP: ADR-007 §3.3]`
- **What it is NOT:** NOT day/week/agenda views (month only, V4); NOT day-selection / date-picker roving (§6); NOT the
  date-field-required degradation (the view engine's, ADR-007:62-64). New dep: **date-fns** (ADR-001:174, first consumer).

## 2. Business Rules
- **CV-1 · Date bucketing — TZ-SAFE (B1 fix — the negative-offset off-by-one).** `getDate(item): Date | string`
  (REQUIRED) maps each item to a **local day key** `'yyyy-MM-dd'`. The normalize MUST NOT round-trip a string through
  UTC: for a **`'YYYY-MM-DD'` string** (the platform's canonical calendar-date format, ADR-002 — the COMMON path), the
  day key **IS the string** (validate shape, no `Date` at all — `new Date('2026-08-10')` is UTC-midnight → Aug 9 in
  UTC−3); for a **`Date`**, key = `format(date,'yyyy-MM-dd')` (local fields). The grid-cell key is likewise
  `format(day,'yyyy-MM-dd')`, so both sides produce the same local key. A **test under `TZ=America/Sao_Paulo`** asserts
  a `'YYYY-MM-DD'` item at a month boundary buckets onto the correct cell (a UTC-only CI test would pass while the bug
  ships). A malformed string (fails the `^\d{4}-\d{2}-\d{2}$` shape check) matches no cell key → **silently dropped**
  from the grid (no crash, no mis-bucket). `[FACT: CLAUDE.md conventions YYYY-MM-DD; ADR-002; date-fns parseISO local]`
- **CV-2 · The month grid — always 42 cells (m4).** `gridStart = startOfWeek(startOfMonth(month), {weekStartsOn})`;
  the grid is **`eachDayOfInterval({ start: gridStart, end: addDays(gridStart, 41) })`** = exactly **42 days (6×7)**,
  a stable height for every month (the `endOfWeek(endOfMonth)` interval yields 35 OR 42 — NOT always 42, so build the
  fixed 42 from gridStart). Leading/trailing days (`!isSameMonth(day, month)`) render **muted**. Today
  (`isSameDay(day, today)`) gets a marker (`today` prop, CV-3). `weekStartsOn?: 0|1` (Sun|Mon), default **1** (Mon).
  The weekday header row is generated from the **first 7 grid days** (`format(day,'EEE')`) so headers shift with
  `weekStartsOn` (never a hardcoded Sun-first array) — as `columnheader`s. `[FACT: date-fns startOfMonth/startOfWeek/
  eachDayOfInterval/addDays/isSameMonth]`
- **CV-3 · Pure display — `month` is CONTROLLED, nav is opt-in, NO internal state (M1 fix).** The prior 3 views are
  stateless display (the app owns view state — BR-2: `@vida/ui` is a package, month selection is app-level view
  state). So calendar-view keeps NO `useState` month machine: **`month?: Date`** (the displayed month; default =
  `startOfMonth(today)`) + **`today?: Date`** (default `new Date()`, evaluated once — the injection seam for the
  today-marker + the default month, M2: deterministic tests). A header shows the label (`format(month,'MMMM yyyy')`).
  **Prev/next buttons render ONLY when `onMonthChange?` is provided** — wired to `onMonthChange(subMonths/addMonths(
  month,1))`, no internal state; when absent, no buttons (pure display, the consumer navigates externally, like
  list-view's consumer-owned row interactivity). Buttons are **icon-only ghost `Button`s** (chevron in `leading`,
  `aria-label="Previous month"/"Next month"`, size matched — m1; an icon-only Button dev-warns without a label).
  `[FACT: BR-2 package→app boundary; button.tsx onPress/leading/aria-label]`
- **CV-4 · Terminal states (the divergence, CV §1).** `state?: ViewState` (default `'success'`):
  - `loading` → a **skeleton grid** (the 6×7 cells with placeholder bars) + `aria-busy`; header shown.
  - `error` → the shared `Message` in a `role="status"` region (the grid can't be trusted). NOT the grid.
  - `success` (incl. **empty** = no items) → the full month grid with day chips (or no chips). **No empty message.**
- **CV-5 · Per-day chip cap.** `maxPerDay?: number` (default **3**): a day with more renders the first N via
  `renderItem` + a muted **"+K more"** indicator (K = overflow) — keeps cell height bounded. `[INTERP: standard
  month-cell overflow]`
- **CV-6 · A11y — `role="table"` + `role="cell"` (B2 fix — NOT `gridcell`).** `role="table"` (a static month display
  doesn't obligate the WAI-ARIA `grid` 2D arrow-key contract — the gallery list-not-grid lesson); `role="row"`, weekday
  `role="columnheader"`, day **`role="cell"`** (a `table` takes `cell`; `gridcell` is only valid inside a `grid` — the
  mix is invalid ARIA that axe flags). A `cell` MAY contain interactive descendants (the consumer's chips) — standard
  "table with interactive content," not a `grid`. Each cell names its date (`aria-label` = `format(day,'d MMMM yyyy')`).
  `role="status"` for the error state. **Reuse the shared accessible-name warn** (M3 — extract `warnMissingName(name,
  ariaLabel, ariaLabelledby)` into `internal/data-view`; it does ONLY the null-name check + the existing warn string).
  ⚠ **`resolveDataViewState` KEEPS its state gate** and only delegates the inner check: `if (state==='loading' ||
  (state==='success' && !effectiveEmpty)) warnMissingName(...)` — extracting the gate too would fire the warn in
  empty/error and break the 4 "does-NOT-warn-in-empty/error" tests (data-view.test:53-58, list-view.test:152-156, …).
  **calendar-view** calls `warnMissingName` only when it renders the TABLE (i.e. `state !== 'error'`; error → the
  status message needs no table name). The success-empty + loading-stale warns don't apply (empty is a designed grid
  state). `[FACT: gallery list-not-grid; data-view.tsx:49 name-check gate; WAI-ARIA table→cell]`
- **CV-7 · Tokens / no sub-theme / date-fns (BR-4/LV-3).** Base semantic tokens on unnamed hosts (grid lines
  `$colorBorderDefault`, muted out-of-month days `$colorTextMuted`, **today marker `$colorBrandPrimary`** [a verified
  base key, brand500/400 — the Tabs-indicator precedent], skeleton `$colorSurfaceSecondary`, day text
  `$colorTextPrimary`); dimension props via the token scale (DEF-U8-h). **date-fns** (^4.x) added to `@vida/ui` deps —
  barrel imports (`import { startOfMonth } from 'date-fns'`); `@vida/ui` builds with `tsc` (no shaking), the
  **consumer bundler** (Vite) tree-shakes date-fns v4 ESM (no subpath imports needed). No motion (V4).
  `[FACT: ADR-001:174; date-fns v4 ESM; themes.ts base light/dark keys; CLAUDE.md]`
- **CV-8 · Responsive — usable at 375 via horizontal scroll (M4 fix).** design.md §X gates every component at
  375/768/1440. The 7-col grid gets a `minWidth` (~`560`, ≈7×80) and `CalRoot` allows `overflowX:'scroll'` on narrow
  containers → the month stays usable (scroll horizontally) at 375 rather than crushing to unreadable ~53px columns.
  A richer mobile layout (stacked / agenda) is the documented future (§6), but V4 is NOT broken at the mobile baseline.
  `[FACT: design.md §X 375/768/1440]`

## 3. Contract
```ts
import { type ViewState, Message } from '../internal/data-view'   // pieces reused; NOT resolveDataViewState (CV §1)

export interface CalendarViewProps<T> {
  items: readonly T[]
  /** Maps an item to its day — a Date or a 'YYYY-MM-DD' string. REQUIRED (the calendar's date field). */
  getDate: (item: T) => Date | string
  /** Renders one item as a day-cell chip. */
  renderItem: (item: T, index: number) => ReactNode
  getKey: (item: T, index: number) => string
  /** The displayed month (CONTROLLED — no internal state; default startOfMonth(today)). `month` alone = a static
   *  externally-controlled month (no nav); neither `month` nor `onMonthChange` = the current month, no nav. */
  month?: Date
  /** When provided, prev/next nav buttons render + call this; when absent, no buttons (pure display). */
  onMonthChange?: (month: Date) => void
  /** Suppress the grid's own month title + nav — for hosting inside a frame that owns the period title (the
   *  fe-calendar #19 CanvasView, slice-map D4). Default false (standalone grid shows its title). */
  hideHeader?: boolean
  /** Programmatic focus target opt-in (pass -1) — the #19 Year drill-in lands focus here (D-S4-DEV-2). Absent = not focusable. */
  tabIndex?: number
  /** Injection seam for "today" (marker + default month). Default new Date(), evaluated once — deterministic tests. */
  today?: Date
  /** Week start: 0=Sun, 1=Mon. Default 1. */
  weekStartsOn?: 0 | 1
  /** Max chips per day before "+K more". Default 3. */
  maxPerDay?: number
  /** loading | error | success (empty folds into success — the grid always renders). Default 'success'. */
  state?: ViewState
  /** Slot for the error state (else a default Message). */
  error?: ReactNode
  ref?: Ref<HTMLDivElement>
  'aria-label'?: string
  'aria-labelledby'?: string
}
export function CalendarView<T>(props: CalendarViewProps<T>): ReactElement   // generic; React-19 ref-as-prop
```
- 8-state matrix (§VIII): default(month `role="table"` grid, day cells `role="cell"`) · loading(skeleton grid +
  aria-busy) · error(`role="status"`) · empty(= grid, no chips — a designed non-message state) · hover/focus(chips +
  nav buttons, via renderItem/Button) · disabled(n/a) · dark · responsive (375 horizontal-scroll per CV-8, 768/1440 grid).
- Sub-theme: none. Export from `index.ts`. `*.test.tsx` + `*.stories.tsx`.

## 4. Acceptance
- [ ] `CalendarView<T>` renders a `role="table"` month grid: weekday `columnheader`s + a **exactly-42-cell** 6×7 grid
      (day cells `role="cell"`, NOT gridcell); leading/trailing days muted; today marked (injected `today`);
      `weekStartsOn` shifts BOTH headers and grid (date-fns).
- [ ] **TZ-safe bucketing:** a `'YYYY-MM-DD'` item at a month boundary buckets onto the correct cell under
      `TZ=America/Sao_Paulo` (not just UTC); a `Date` item too. A day > `maxPerDay` shows N chips + "+K more".
- [ ] Month is CONTROLLED (`month`, default startOfMonth(today)); prev/next buttons render + fire `onMonthChange`
      ONLY when it's provided; no internal state.
- [ ] Terminal states: loading→skeleton grid+aria-busy; error→`role="status"` message; success/empty→grid (no empty
      message — the divergence). A jsdom test asserts empty renders the grid, not a status message.
- [ ] Dark mode + a cell `aria-label` per day; usable at 375 (CV-8 scroll); date-fns added to deps (tree-shaken);
      shared `warnMissingName` reused (not re-hand-rolled).
- [ ] Storybook covers month/nav/states/overflow/weekStartsOn, both themes → **component Visual Gate PASS**.
- [ ] `pnpm --filter @vida/ui typecheck && build && test` green; root typecheck 10/10; §XXIX CLAUDE.md paragraph.

## 5. Implementation Prompt (ordered)
1. **Dep** — add `date-fns` to `packages/ui/package.json` deps; `pnpm install`; import only the used fns
   (`startOfMonth,startOfWeek,addDays,addMonths,subMonths,isSameMonth,isSameDay,format`; `parseISO` only if a Date is
   needed from a string).
2. **Part A' — extract `warnMissingName(name, ariaLabel, ariaLabelledby)`** into `internal/data-view.tsx` (M3): the
   function does ONLY `if (ariaLabel==null && ariaLabelledby==null) console.warn('[vida/ui] ${name}: needs an
   accessible name…')`. **`resolveDataViewState` KEEPS its state gate**, calling `warnMissingName` only inside
   `if (state==='loading' || (state==='success' && !effectiveEmpty))` — behavior-preserving, so the data-view +
   list/gallery/timeline warn-suppression tests stay green (verify by running the suite after this step, BEFORE
   building calendar). calendar-view calls `warnMissingName` when `state !== 'error'`.
3. **Types** — `CalendarViewProps<T>`; import `ViewState`/`Message`/`warnMissingName` from `../internal/data-view`;
   plain generic fn; **NO `useState`** (month is controlled — M1). `today = props.today ?? new Date()` (once);
   `month = props.month ?? startOfMonth(today)`.
4. **Grid model** — `gridStart = startOfWeek(startOfMonth(month),{weekStartsOn})`; `days = Array.from({length:42},
   (_,i)=>addDays(gridStart,i))` (CV-2, always 42). Bucket items into `Map<string, T[]>` keyed by the **TZ-safe local
   day key** (CV-1: a `'YYYY-MM-DD'` string is the key as-is [validate]; a `Date` → `format(date,'yyyy-MM-dd')`).
   Cell lookup: `const EMPTY: readonly T[] = []; buckets.get(key) ?? EMPTY` (shared frozen — no per-cell alloc, m3).
5. **styled hosts** — `CalRoot` (column, `overflowX:'scroll'` for CV-8; role table|status per state), `Grid`
   (`minWidth:560`), `CalHeader` (row: label + opt prev/next icon `Button`s), `WeekdayRow`/`WeekHeaderCell`
   (`role="columnheader"`), `Week` (`role="row"`), `Day` (**`role="cell"`**, flex, `$colorBorderDefault` border, muted
   variant out-of-month, today variant), `Overflow` (muted "+K more"), `SkeletonCell`.
6. **Render** — header (label + nav buttons only if `onMonthChange`); weekday row (from `days.slice(0,7)`); 6 weeks × 7
   `Day` cells (day number + up to `maxPerDay` chips via renderItem + "+K more"); loading→skeleton cells + aria-busy;
   error→`Message` role=status. `role="table"` wraps weekday row + weeks.
7. **A11y + dev-guard** — table/row/columnheader/cell roles; per-cell date `aria-label`; nav button `aria-label`;
   `warnMissingName('CalendarView', ...)`.
8. **Tests** (jsdom) — grid shape (**exactly 42 cells** + 7 weekday headers); **TZ bucketing under
   `TZ=America/Sao_Paulo`** (a 'YYYY-MM-DD' month-boundary item on the right cell) + a `Date` item; overflow "+K more";
   nav (buttons only when `onMonthChange`; click → `onMonthChange(prev/next)`); empty→grid-NOT-status; error→status;
   loading→aria-busy; `weekStartsOn` shifts headers+grid; ref; today marker (inject `today`); `role="cell"` not gridcell.
9. **Story** — fixture dated items across a month, renderItem→a small chip; controls for state/weekStartsOn/maxPerDay;
   an `onMonthChange` story showing nav; a narrow-container story for the 375 scroll.
10. **Export** + CLAUDE.md paragraph.

## 6. Deferred (documented — NOT V4)
Day/week/agenda views · day-selection + 2D roving (date-picker → upgrade to `role="grid"` then) · drag-to-reschedule ·
recurring-event expansion · a RICHER mobile (<768) layout (stacked / agenda). Note: V4 IS usable at 375 via the CV-8
horizontal scroll — the deferral is the nicer stacked layout, not basic mobile function.

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-10 | ui-2-platform-views | V4 sub-spec authored at PLAN (month grid + date-fns; the linear-spine divergence — table not list, empty=grid); gate-1 next |
| 2026-08-10 | ui-2-platform-views | Rev 2 — gate-1 critique REVISE→fixed (divergence thesis validated correct): **B1** (TZ off-by-one — 'YYYY-MM-DD' key as-is, no UTC round-trip, + TZ=America/Sao_Paulo test), **B2** (invalid ARIA `table`+`gridcell` → `table`+`cell`), **M1** (month CONTROLLED, nav opt-in on onMonthChange, NO internal state — matches the stateless-display siblings), **M2** (`today` injection seam), **M3** (reuse extracted `warnMissingName`, not re-hand-rolled), **M4** (375 usable via CV-8 horizontal scroll — not a silent design.md §X violation); minors (icon-ghost nav Buttons+aria-label, headers from first-week, always-42 grid via addDays, frozen-EMPTY Map lookup) |
| 2026-08-10 | ui-2-platform-views | preflight PASSED (`$colorBrandPrimary` today-marker verified base key; date-fns 4.4.0). Gate-2 critique **REVISE**→fixed: B1/B2/M1/M2/M4 confirmed correct; 1 material = **M3 state-gate** (`resolveDataViewState` must RETAIN its `(loading || success-non-empty)` gate around `warnMissingName` or the 4 empty/error no-warn tests break) — made explicit; minors (date-fns barrel-import/consumer-shakes phrasing, month-without-onMonthChange mode documented, malformed-string silent-drop). **Approval 2 pending.** |
| 2026-10-07 | fe-codec-primitives-refinement P5 (LIF-230) | **Editorial Layer-1 refinement** (chrome only — NO interface/behavior change; TZ keying, 42-cell grid, `role="table"` roles untouched): serif `$heading`/500 title · weekday eyebrows (CSS `textTransform`, DOM stays "Mon"; raw `letterSpacing:0.8`) · `$small` tabular day figures · **today: filled brand blob → accent number + underline** (`TodayMark`, keeps `.vida-cal-today`) · weekend+oos `$colorSurfaceSecondary` paper (`tone` variant; number colour differentiates, oos>weekend) · "+K more" eyebrow. **Today number = `$colorBrandEmphasis`** (not `brandPrimary`) — Visual-Gate caught `brandPrimary` at 4.39/4.44 < 4.5 AA on a secondary-surface (weekend/oos) today; emphasis = the higher-contrast brand step → 5.93–8.89. Chip dot = consumer `renderItem` (LV-5). +7 tests (21 total). Visual Gate PASS (2 stories × 3 presets × light/dark). Spec: `docs/specs/foundation/fe-codec-primitives-refinement/phases/P5-calendar.md`. |
| 2026-10-10 | fe-calendar #19 S1 (LIF-203) | **`hideHeader?: boolean` (slice-map D4 — headerless mode):** suppresses the grid's own month title + nav so a hosting frame (the #19 `CanvasView` surface) owns the period title ONCE (envision EC-2 double-title fix). Default `false` — standalone grids unchanged. Grid/roles/states untouched; +1 test (22 total). _(Doc entry added 2026-10-18 at the S2 baseline — S1's currency pass refreshed only the apps/web context; §XXIX lag closed.)_ |
| 2026-10-20 | fe-calendar #19 S4 (LIF-203) | **`tabIndex?: number` (D-S4-DEV-2, Victor-approved):** an opt-in programmatic focus target — the #19 surface passes `-1` so focus lands on the Month grid after a Year drill-in (FOCUS_CONTRACT `tabChange → panel`; the pressed month button unmounts). `CalRoot` gains the house `focusVisibleStyle` 2px `$colorFocusRing` ring + `$sm` radius, which renders only when a consumer opts in AND focuses the grid. Absent = not focusable (unchanged default). +1 test (23). |

## fe-calendar S7 amendments (2026-10-21 — PLAN-S7-entity-close.md G13/G14/R8)
- **Today SR label (absorbed primitives-refinement debt, P5-calendar.md:115):** the today cell's name = `d MMMM yyyy, today`
  — the **suffix** form the sibling renderers ship (week-view · year-view · living-view).
- **Controlled unfurl (EC-F3 — the vision's "unfurl the day in place", calendar-vision.md §6 option 1):** three optional
  props — `expandedDay?: string` (CONTROLLED, like `month`) · `onExpandedDayChange?(day | null)` · `renderExpanded?(items,
  day)`. With both handler + renderer, a day's "+K more" is a native `<button>` (≥44 hit, `aria-expanded`, `aria-controls`
  when open, named "Show all N items, d MMMM yyyy"); activating it requests the day, a second press or **Esc** requests
  `null` (focus stays on the button). The unfurled list is ONE `role="row"` holding a `role="cell" aria-colspan={7}` named
  "All items, d MMMM yyyy", inserted directly after the week row — instant (no height animation, motion.md safe list). An
  `expandedDay` outside the 42-day grid renders nothing; collapse-on-month-change is the CONSUMER's store (the grid stays
  stateless). **No handler ⇒ unchanged static "+K more"** — every other consumer is untouched. Blur does not collapse
  (D-S7-DEV-3). Story `Unfurl`. The "+K more" eyebrow now pairs its line-height (`$caption`).

- **`pulseKey?: number` (fe-calendar S7, EC-F2 — PLAN-S7 G15/R9):** bump to pulse the today mark once (the #19 surface's Today button); 0/absent = no pulse (never on mount); each new value remounts the mark so the one-shot CSS animation (`internal/calendar-motion.ts`: `scale` 1→1.12→1, `slow` 400ms ease-out) restarts; reduced motion = none via the sheet's `@media` block. Shared with `RangeTransition` (the range fade, `moderate` 250ms opacity).
