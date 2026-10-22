# PLAN — fe-calendar S3 · Week/Day renderer (`WeekView`, `@vida/ui`)

> Entity Delivery Flow ② · per-slice §XXVI gate 1. Slice-map S3 (slice-map.md:36): **frontend · `@vida/ui`** —
> "`WeekView` time-column (hour gutter · all-day strip · timed blocks) · **Day = 1-column** variant · fixtures."
> EC MUSTs: **EC-4** + EC-11/12/13/14. Design evidence: the approved greybox `../mockups/greybox/{week,day}.png` + the
> mockup `../mockups/calendar-ranges-and-agenda.html` § WEEK (:70-83 CSS, :168-180 plate, :204 note, :212-230 script).
> Seam: seam-contract.md §A (`TimedBlock`/`WeekViewProps` — PROPOSED, ratified + refined here; the seam licenses
> per-slice refinement at `/contract` [FACT: seam-contract.md:5-6]).

## 1. Identity

- **What:** `packages/ui/src/components/week-view.tsx` (+ `.test.tsx` + `.stories.tsx`) + `internal/week-layout.ts`
  (+ `.test.ts`) — the presentational renderer for the **Week** and **Day** ranges: a time-column grid (hour gutter ·
  N day columns · an all-day strip on top · timed blocks positioned by hour). Pure data-prop; NO `@vida/core`/
  `@vida/types` import [FACT: slice-map.md:77 boundary]. Consumed by the S1 `CalendarSurface` dispatch for
  `range === 'week' | 'day'` (fixture data until S7 `useCalendar`).
- **Why it exists:** precise scheduling, which the month grid and the Agenda can't show [FACT: mockup:204 "Week / Day =
  a time-column for precise scheduling"]; EC-4 is its anchored checkpoint.
- **Pattern stated (scenario Step 3, 3 components read):**
  1. **`agenda-view.tsx` (V10, the sibling renderer)** — the house shape for a #19 range renderer: LOCAL types, spine
     PIECES (`ViewState` · `Message` · `warnMissingName`) NOT `resolveDataViewState`, outer `role="group"` of named
     `role="list"`s with `useId`-prefixed index-keyed ids, TZ-safe `YYYY-MM-DD` parse-by-parts, `today` by string
     equality, dev-warns for contradictory props, `empty?`/`error?` slots [FACT: agenda-view.tsx:12-16,75-78,179-192].
  2. **`calendar-view.tsx` (V4 + P5)** — the 2D-grid precedent: a calendar's **empty is a designed grid**, not a status
     message; weekday eyebrows uppercase-via-CSS (SR-correct); tabular day numbers; **today = `$colorBrandEmphasis`
     number + an accent underline `TodayMark`** (colour never the sole signal); a `minWidth` grid in an
     `overflowX:auto` wrapper for 375 [FACT: packages/ui/src/CLAUDE.md calendar-view + P5 paragraphs].
  3. **`canvas-view.tsx` (the frame)** — the STATE RULE: an un-overridden `empty` delegates to "the hosted renderer's
     OWN tuned state — calendar's designed 42-cell grid for empty"; the teaching `EmptyState` is the surface's `empty`
     slot [FACT: ui CLAUDE.md canvas-view BR-CB-S1-6]. WeekView is hosted the same way Month/Agenda are
     [FACT: calendar/index.tsx:175-200].

## 2. Business rules (BR-CAL-S3-*)

1. **BR-CAL-S3-1 · Presentational arrangement only.** Blocks arrive pre-bucketed by `day` (S7 `useCalendar` derives
   them); WeekView only POSITIONS. The accessible list order = input order (the provider orders); `layoutDay` sorts a
   private copy by `(start, −end)` **for geometry only** — positioning, not content ordering (BR-8).
2. **BR-CAL-S3-2 · Day = Week with one column (EC-4).** One component; the column count IS `days.length` (7 → Week,
   1 → Day). No separate Day component or code path [FACT: envision.md:26 "Day = Week zoomed to one column"; mockup:204].
3. **BR-CAL-S3-3 · Never assume time (IR-6).** Only items with a real clock time become `TimedBlock`s; tasks (calendar
   date only) and habits/routines (dayparted) go in the **all-day strip** as `CalChip`s — S7's mapping, stated here so the
   renderer never invents a time [FACT: interpretation.md:100-103 IR-6]. The renderer formats a block's time label from
   `startHour` arithmetically — no `Date`, no TZ. `formatHour(h, fmt, kind)`: `m = Math.round(h*60)` (never "09:60"),
   clamped to `[0, 1439]` for a `'start'` and `[0, 1440]` for an `'end'`. **24h** → `HH:mm` ("09:30"; an end of 1440 →
   "24:00"). **12h** → `h:mm am|pm` always with minutes for block labels ("9:00 am", "12:30 pm"; 0 → "12:00 am", 12 →
   "12:00 pm"; an end of 1440 → "12:00 am"). **Gutter** (`kind:'gutter'`, whole hours only): 24h "08:00", 12h drops
   ":00" → "8 am", "12 pm".
4. **BR-CAL-S3-4 · All-day strip = ONE row spanning all day columns (doc-fixed shape).** Both approved visual records
   render a single week-spanning strip (`.allday-strip{grid-column:2 / span 7}` [FACT: mockup:80,220]; greybox week.png +
   day.png). A gutter label "All day" (uppercase `$caption` eyebrow, the AgendaView `Eyebrow` recipe) in the 64px gutter.
   Chip = purpose dot (user-data hex, `aria-hidden`) + title, wrapping. Absent/empty `allDay` → strip omitted.
   **Chips are undated — DOC-FIXED (was I-5, resolved by grounding):** the approved records draw undated chips in one
   strip and the seam's `CalChip` carries no date [mockup:220; greybox week/day; seam-contract.md:15]. Adding a
   per-chip day would be an ADD beyond the approved visual, not a gap-fill. The range's chips are the PROVIDER's
   selection (S7 passes the focused day's chips for Day; the S3 fixture filters its own dated source). Whether undated
   week chips read well is a live Visual-Gate observation for Victor, not a plan decision.
5. **BR-CAL-S3-5 · Hour gutter + grid.** A 64px gutter [FACT: envision.md:50 "widened to 64px"] of `HH:00` tabular
   `$caption` muted labels, one per hour row. Fixed `HOUR_PX = 48`. Hour rows separated by `$colorBorderDefault`
   hairlines (structure, not decoration: the grid is what makes it read as a calendar, EC-14). The hour lines + gutter
   labels are a SEPARATE `aria-hidden` layer (BR-11) — still in the AA measurement set (1.4.3 covers visible text).
6. **BR-CAL-S3-6 · Visible window.** `hours: readonly [start, end]` — integer hours, half-open `[start, end)`, default
   **[8, 20]** = rows 08:00…19:00 (the mockup's 12 rows [FACT: mockup:221]). Guard: non-integer / `start ≥ end` /
   outside 0–24 → default + dev-warn. The window **auto-extends** to `floor(min start)` and `ceil(max drawn end)`,
   **clamped to [0, 24]**, so a 06:30 run or a 21:00 call is never hidden; `hours` is the *minimum* window.
   **DOC-DERIVED (was I-1):** #19 exists to remove the grid's info-crush — "nothing behind +N more" [FACT: envision.md:25
   EC-3; calendar-vision.md §1.2, §6 "dead, non-interactive count"]; the lens shows what the modules hold, never less
   [FACT: ADR-007 read-only lens; IR-6 never assume/alter time]; the quality bar forbids silent loss (copy/state
   honesty: "dead-end → anti-lost") [FACT: frontend-quality-bar/_index.md:41-42 — supporting, not decisive]. A fixed window that drops out-of-hours items would re-create
   the hidden-item defect #19 was chartered to remove.
7. **BR-CAL-S3-7 · Block geometry.** `top = (startHour − h0) × HOUR_PX`; `height = max((end − startHour) × HOUR_PX,
   24)`. The late-block clamp happens BEFORE clustering (BR-8): `drawnStart = min(start, h1 − 24/HOUR_PX)`, so a
   23:50 block is laid out (and lane-checked) as 23:30–24:00 and stays inside the grid; `top` derives from `drawnStart`.
   `endHour` absent → **1h** (the greybox draws every block one hour-row tall [FACT: greybox week.png, day.png]).
   `endHour ≤ startHour` or non-finite → 1h + dev-warn; `endHour > 24` → 24. `startHour` non-finite or outside [0, 24)
   → block skipped + dev-warn (provider contradiction).
8. **BR-CAL-S3-8 · Overlap lanes — DOC-DERIVED (was I-2).** Neither visual record shows overlap, but co-timed blocks
   are REAL data: the Calendar is a READER of several independent sources placed side by side — planned blocks
   "beside class ICS, tasks, reminders, habits" [FACT: docs/intake/sessions-and-scheduling.md:113-115, Victor 07-10] —
   that no module de-conflicts against each other; Sessions itself keeps overlapping availability windows as valid input
   ("overlapping/multiple windows persist as-is" [FACT: sessions current-business-rules.md:110-111]); and the Calendar
   "only renders the placed result" [FACT: sessions business-rules.md SS-9]. Painting one over another hides an item — the same
   no-hidden-items charter as BR-6 (EC-3 / vision §6). Side-by-side lanes are the only no-occlusion layout. **Order: validate → renderable set → `windowFor`
   → `layoutDay`** (invalid blocks never reach `Math.min`, so the window is always finite). `layoutDay(blocks, [h0, h1])`:
   per column, compute each block's **drawn** extent `[drawnStart, max(end, drawnStart + 24/HOUR_PX))` with `drawnStart`
   per BR-7 (so neither a 24px-min short block nor a clamped late block can cover a neighbour); sort a copy by
   `(start, −drawnEnd)`; cluster by transitive drawn-overlap; within a cluster assign each block the lowest lane whose
   last block's drawn end ≤ its start (checks every lane — no greedy overlap); `left = lane/lanes`, `width = 1/lanes`
   (2px inner gutter). No lane cap. `compact = drawnHeight < 44 || lanes ≥ 3` (a ⅓-column lane can't hold the
   two-line anatomy) → the compact one-row anatomy (BR-9) with title ellipsis; the accessible list still carries the
   full text. Dense-overlap polish = live-gate feel, never data hiding.
9. **BR-CAL-S3-9 · Block anatomy (sized to the type metrics: `$caption` 17px · `$small` 21px line boxes
   [FACT: themes/fonts.ts:6,9]).** `$colorSurfaceSecondary` fill, `$sm` radius, 3px left purpose bar (user-data hex;
   absent → `$colorTextMuted`), `aria-hidden` [FACT: greybox + mockup:78 `.ev`]. Two layouts, chosen by
   `compact = drawnHeight < 44 || lanes ≥ 3` (BR-8 — the ONE rule): **regular** = tabular `$caption` time ("09:00", or "09:00–10:30" with `endHour`) over a `$small` title,
   `numberOfLines` clamped; **compact** = ONE row "09:30 Title" (`$caption` time inline, title ellipsis), so a
   short block always shows its title. Paired line-heights on both. Non-interactive: no `onPress`, no focus stop
   (EC-12; the seam declares no block intent).
10. **BR-CAL-S3-10 · Column headers.** Per day: uppercase-via-CSS tracked weekday eyebrow ("MON") + the day number in
    serif `$display` family at `$subheading`, **tabular**, **paired `lineHeight="$subheading"`** [FACT: ui CLAUDE.md
    Rules "Large type PAIRS its line-height"]. The `today` column (string-equal): number in **`$colorBrandEmphasis`**
    + an **accent underline** (the calendar-view `TodayMark` recipe — not colour alone, WCAG 1.4.1) + a visually-hidden
    ", today" in the header text (which names that day's list, BR-11). Parsed TZ-safely by parts; a
    `TZ=America/Sao_Paulo`-forced test [memory: date-code-needs-tz-forced-tests].
11. **BR-CAL-S3-11 · A11y topology (explicit — where `aria-hidden` sits).**
    - Outer `role="group"` named via `aria-label`/`aria-labelledby` (`warnMissingName`, state-gated).
    - Each day column = `[aria-hidden hour-line layer]` + a **sibling** positioned container that IS the
      `role="list"` (named `aria-labelledby` → its column-header id), whose DIRECT children are the absolutely
      positioned `role="listitem"` blocks, in input order, each reading "09:00–10:30 Deep work". The gutter column is
      `aria-hidden` (time is in every item). **No `aria-hidden` ancestor of any listitem** (tested).
    - The all-day strip = a `role="list"` named by its gutter label id (the label is NOT aria-hidden).
    - A day with no blocks → no `role="list"` for it (header + visual column stay): no empty list (axe).
    - ids `useId`-prefixed + index-keyed (the board-view lesson).
12. **BR-CAL-S3-12 · Terminal states (EC-11), state-as-prop (BR-2):** `loading` → skeleton grid (headers + 3 skeleton
    blocks) `aria-busy`; `error` → `role="status"` calm muted `Message` (override `error?`); **`empty` (or success with
    zero blocks AND zero all-day chips) → the designed EMPTY GRID** (headers + gutter + hour lines) + a visually-hidden
    `role="status"` "Nothing scheduled" — or the `empty?` slot when passed. **DOC-FIXED** (not an interpretation): the
    canvas-view STATE RULE + calendar-view's "empty is a designed grid" [FACT: ui CLAUDE.md canvas-view BR-CB-S1-6;
    calendar-view V4]. EC-11's teaching `EmptyState` = the surface passing it to **CanvasView's `empty` slot** (S7 owns
    the live state; S3's gate exercises it via the states harness). `effectiveEmpty` is computed on the **renderable**
    set (after the BR-7 / `day ∉ days` skips), so an all-invalid input still lands on the designed empty grid.
    Success-with-zero dev-warns (spine rule).
13. **BR-CAL-S3-13 · Responsive + keyboard-reachable scroll.** Week (`days.length > 1`): the grid sits in a scroll
    region, day columns `minWidth: 80` → grid min `64 + 7×80 = 624`. Math: **375** → 375 − 32 shell side padding
    [FACT: breakpoints.ts:32 mobile 16×2] − 48 surface `$24`×2 = **295px** visible (≈ 2.9 columns, region scrolls);
    **768** → 768 − 48 − 48 = **672** ≥ 624 (fits, unless a docked shell panel narrows it — then the region scrolls; region
    scroll is allowed at any width, **page** overflow never). The region is **keyboard-reachable**: `tabIndex={0}`,
    `role="region"`, `aria-label="Week grid"`, a `focusVisibleStyle` `$colorFocusRing` 2px/2px ring (axe
    `scrollable-region-focusable`, WCAG 2.1.1). Day (1 column): no scroll region, no tab stop, fills the width.
    Columns `flexShrink:1` explicit (the RNW default-0 lesson).
14. **BR-CAL-S3-14 · Read-only invariant (EC-12).** No write control, no intents; the ONLY focusable element is the Week
    scroll region (navigation, not an action).
15. **BR-CAL-S3-15 · Tokens/theming (EC-13/14).** DIRECT semantic tokens, no sub-theme, no new dep (date-fns already a
    dep), semantic type scale only, `$12/$16/$24` rhythm, no new token. **AA risk pre-authorized:** muted text on
    `$colorSurfaceSecondary` measured only 4.52 min in P5 — if any block time label fails 4.5 in any preset×mode cell,
    the time label moves to `$colorTextPrimary` (no §XXVIII stop; recorded in §5a).
16. **BR-CAL-S3-16 · Locale preferences are READ, not assumed (grounding finding).** `user_preferences` owns
    `time_format` ('12h'|'24h', default '24h') and `week_starts_on` (0|1, default 1) [FACT: ADR-002 user_preferences
    ~L3527-3529], live in the shipped apps/web `preferences-store` (`timeFormat`/`weekStartsOn`) set by fe-settings'
    locale pane [FACT: apps/web/src/stores/preferences-store.ts:13-15,29-30,75-76; settings/locale-pane.tsx]. The
    fe-home precedent: the surface READS the Settings pref and renders; the control lives in fe-settings [FACT:
    decisions.md 2026-10-10 "fe-home arrangement"]. So: **WeekView takes `timeFormat?`** (default `'24h'` = the DB
    default) for every time label; **the surface derives the week's `days` from `weekStartsOn`**. The surface's
    `mondayOf` hard-codes Monday for week/agenda/living today: a shared surface defect this unit surfaces → ROOT fix
    here (`weekStartOf(d, weekStartsOn)` replaces `mondayOf` in `periodLabel(range, focused, weekStartsOn)` — BOTH its
    span start and its "This week" comparison — `agendaFixture`, and the new `weekFixture`; **Month** passes the
    already-shipped `CalendarView weekStartsOn` prop [calendar-view.tsx:41,100,116], so every range agrees; the
    Monday-assuming comments ("Mon–Sun", "sits on Thursday" `?? 3`) are rewritten neutral). S7's `useCalendar` must
    take `weekStartsOn` too — recorded in the seam-contract amendment so it isn't re-hard-coded. [FACT: decisions.md:1119-1121
    — fe-shell-scope fixed shared roots in-unit (Button slot colour, NavLink emphasis, strip co-fit); the S1-chrome fix
    applied the same rule].

## 3. Contract (ratifies seam-contract §A, with refinements)

```ts
import { type ViewState, Message, warnMissingName } from '../internal/data-view'

export interface CalChip {
  id: string
  title: ReactNode
  color?: string        // purpose colour — USER DATA hex
}
export interface TimedBlock {
  id: string
  title: ReactNode
  color?: string        // purpose colour — USER DATA hex
  day: string           // 'YYYY-MM-DD' — must be one of `days`
  startHour: number     // fractional local clock hour in [0, 24); 9.5 = 09:30
  endHour?: number      // absent → +1h; clamped to 24
}
export interface WeekViewProps {
  days: readonly string[]               // 'YYYY-MM-DD', display order; 7 = Week, 1 = Day
  blocks: readonly TimedBlock[]
  allDay?: readonly CalChip[]
  today?: string                        // 'YYYY-MM-DD'
  hours?: readonly [number, number]     // MINIMUM window, integer hours, half-open [start, end); default [8, 20]
  timeFormat?: '12h' | '24h'            // user_preferences.time_format (BR-16); default '24h'
  state?: ViewState                     // default 'success'
  empty?: ReactNode                     // slot overrides (S2 precedent)
  error?: ReactNode
  ref?: Ref<HTMLDivElement>
  'aria-label'?: string
  'aria-labelledby'?: string
}
export function WeekView(props: WeekViewProps): ReactElement   // non-generic → React-19 ref-as-prop

// internal/week-layout.ts (NOT barrel-exported; unit-tested directly)
export const HOUR_PX = 48
export function formatHour(h: number, fmt: '12h' | '24h', kind: 'start' | 'end' | 'gutter'): string  // BR-3
export function windowFor(blocks: readonly TimedBlock[], hours?: readonly [number, number]): [number, number]
export function layoutDay(blocks: readonly TimedBlock[], window: readonly [number, number]):
  { block: TimedBlock; top: number; height: number; lane: number; lanes: number
    compact: boolean }[]   // compact = drawnHeight < 44 || lanes >= 3 (BR-8/9); input order preserved
```

Refinements vs the proposed seam (all within the seam's per-slice ratification licence):
**R1** `range?: 'week'|'day'` **dropped** — envision:26 fixes Day = one column, so column count = `days.length` is the
single source of truth; a `range` prop could only contradict it. **R2** `readonly` arrays, `empty?`/`error?` slots,
`aria-labelledby` (the S2 refinements). **R3** `hours` = readonly integer tuple, a minimum window (BR-6). **R4**
`timeFormat?: '12h' | '24h'` (default `'24h'`, BR-16 — LOCAL union ≡ the app's `TimeFormat`, the `ViewState`
structural precedent). `CalChip` is minted in `week-view.tsx` + barrel-exported (S5 `LivingView` reuses it
intra-package). A block whose `day ∉ days` is skipped + dev-warn. Barrel: `WeekView`, `WeekViewProps`, `TimedBlock`,
`CalChip`.

## 4. Acceptance

- [ ] Week: 64px gutter `HH:00` labels · 7 headed columns (eyebrow weekday + serif tabular number, lineHeight paired;
      today = brandEmphasis + underline + sr ", today") · all-day strip spanning columns (omitted when empty; undated
      chips) · blocks at 48px/h, min 24px, purpose bar, regular vs compact anatomy per the ONE compact rule.
- [ ] Day: same component, `days.length === 1`, single full-width column, no scroll region, no tab stop.
- [ ] Window: default rows 08:00…19:00; auto-extends to show a 06:30 and a 21:00 block; non-integer/inverted/out-of-range
      `hours` → default + warn; a NaN-`startHour` block beside a valid one → finite window (validate-first order).
- [ ] `layoutDay` unit tests: no overlap (1 lane) · pair (2 lanes) · chain A∩B, B∩C, A∌C (2 lanes, C reuses lane 0) ·
      identical starts · **09:00–09:15 + 09:15 short blocks (drawn-extent overlap → 2 lanes)** · input order preserved
      in the returned list · 3-way mutual overlap (3 lanes) · **23:15–23:45 + 23:50
      → 2 lanes (clamped drawn extent)** · `endHour > 24` clamps · compact at < 44px AND for a 1h block in 3 lanes. `formatHour(9.9999,'24h') === '10:00'` ·
      `formatHour(13.5,'12h','start') === '1:30 pm'` · 0 → '12:00 am' · 12 → '12:00 pm' · 12.5 → '12:30 pm' ·
      23.9999 start → '23:59' / '11:59 pm' · end 24 → '24:00' / '12:00 am' · 12h gutter "8 am"/"12 pm".
- [ ] Guards: `endHour ≤ startHour` → 1h + warn · `startHour` out of range/NaN → skipped + warn · `day ∉ days` →
      skipped + warn · success-with-nothing → warn.
- [ ] A11y: outer group named · all-day list + per-day lists named via labelledby · listitems read "time title" ·
      **no listitem has an aria-hidden ancestor** · empty day emits no list · the ONLY focusable = the Week scroll
      region (`role="region"` + label + ring); Day has none · `warnMissingName` state-gated.
- [ ] States: loading skeleton + `aria-busy` · error status (+ slot) · empty = designed grid + sr status (+ slot) ·
      all-invalid input → designed empty grid (not error) · zero blocks + chips present → success (strip renders).
- [ ] Day + today: `days=[today]` → underline + sr ", today".
- [ ] TZ: a `YYYY-MM-DD` header renders the correct local weekday/number under forced `TZ=America/Sao_Paulo`
      (`process.env.TZ` set at the top of the test file, before any Date use — the agenda-view.test.tsx:2-3 recipe).
- [ ] Stories: Week (greybox fixture) · Day · Overlap · Extended window · States.
- [ ] `pnpm --filter @vida/ui` tsc 0 · eslint 0 · suite green; apps/web tsc 0 + calendar-surface tests green: week +
      day dispatch · `weekStartsOn=0` → Month first weekday "Sun" + Agenda on Sun 2026-10-18 reads
      "This week · Oct 18 – Oct 24, 2026" + Week columns start Sunday · `timeFormat='12h'` reaches WeekView. `afterEach`
      ALSO resets `usePreferencesStore.setState({ weekStartsOn: 1, timeFormat: '24h' })` (no order-dependent leaks).
- [ ] Blocking **Visual Gate** — standalone-entry harness on the REAL `CalendarSurface`, Week + Day × 3 presets × L/D ×
      375/768/1440. **AA measured on every text class:** block time + title on `$colorSurfaceSecondary` · gutter
      `HH:00` · "All day" eyebrow · chip titles · weekday eyebrows · today number (brandEmphasis) ·
      state copy. Purpose bar visible · today underline · **lane geometry probe** on the Overlap fixture at
      375/768/1440: no two listitem rects intersect within a column + the 2px lane gutter present · **keyboard**: Tab past
      the nav to the Week region → ring visible and NOT clipped by CanvasView · extra cells `timeFormat='12h'` and
      `weekStartsOn=0` · EC-14 reads as a calendar · **page** 0 overflow every cell (Week region scroll at 375 allowed) · axe 0 · the state cells.
      Victor reviews.

## 5. Implementation prompt (ordered)

1. `internal/week-layout.ts` + `week-layout.test.ts` FIRST: `HOUR_PX`, `formatHour`, `windowFor` (BR-6), `layoutDay`
   (BR-7/8 drawn-extent clustering + every-lane check; compact flag).
2. `week-view.tsx`: local types (§3) → styled hosts (`WeekRoot` · `ScrollRegion` [Week only: `overflowX:auto`,
   `tabIndex 0`, `role="region"`, `focusVisibleStyle` ring] · `HeaderRow` · `Gutter` 64 `aria-hidden` · `DayCol`
   `flex:1` `flexShrink:1` `minWidth:80` (Week) · `HourLines` `aria-hidden` layer · `BlockList` positioned
   `role="list"` · `Block` absolute `role="listitem"` regular/compact · `AllDayStrip` wrap row · `TodayMark`) — copy
   AgendaView's `Eyebrow`/`SR_ONLY`/`parseLocalDate` locally (extraction waits for the rule of three — S5).
3. State switch: error → status; loading → skeleton grid `aria-busy`; effectiveEmpty → designed grid + sr status (or
   slot); success → full grid.
4. Tests + stories (fixtures mirror the greybox: Oct 5–11, Thu 8 today; Mon 09:00 Re-plan draft · Thu 09:00 Deep work ·
   Fri 11:00 Design sync · an overlap pair · a 30-min compact block · 18:00 Gym [mockup:212]; all-day Spanish session ·
   Read ch. 4, dated).
5. Barrel exports; `pnpm --filter @vida/ui exec tsc` / eslint / vitest.
6. `apps/web/src/app/calendar/index.tsx`: **BR-16 root fix first** — read `weekStartsOn`/`timeFormat` from
   `usePreferencesStore`; `weekStartOf(d, weekStartsOn)` replaces `mondayOf` in `periodLabel`/`shift`/`agendaFixture`
   + `CalendarView weekStartsOn={weekStartsOn}` for Month (+ the surface tests in §4). Then `weekFixture(focused,
   weekStartsOn)` (the `agendaFixture` pattern — the 7 days from `weekStartOf`, the rich day on today when in-week;
   returns dated blocks + a dated chip source the Day branch filters) + dispatch (both pass `timeFormat`): `range === 'week'` →
   `<WeekView days={weekKeys} blocks allDay today aria-label="Week" />`; `range === 'day'` → `<WeekView
   days={[focusedKey]} blocks/allDay filtered by day={focusedKey} … aria-label="Day" />`. Placeholder copy narrows to
   Year/Living. apps/web tsc + calendar-surface tests.
7. g2 code review → Visual Gate (blocking) → currency (§XXIX):
   - `docs/specs/components/ui-2-platform-views/v11-week-view.md` (the numbered per-view spec);
   - `docs/specs/components/ui-2-platform-views/_index.md` change-log rows for **V10 (missing since S2) and V11**;
   - `packages/ui/src/CLAUDE.md` week-view paragraph;
   - `docs/infrastructure/web-client-runtime/current-spec.md` (the #19 surface now dispatches Week/Day — S2 precedent);
   - slice-map S3 ledger row; seam-contract §A amended (WeekView ratified: R1–R4; `CalChip` undated, as proposed) + §B `useCalendar` gains
     `weekStartsOn` (S7 must not re-hard-code Monday);
   - `.claude/docs/decisions.md` rows: window auto-extend + overlap lanes (doc-derived from the EC-3 no-hidden-items
     charter) · undated chips (doc-fixed) · calendar reads `timeFormat`/`weekStartsOn` (the fe-home READ precedent);
   → commit (S2 message shape).

## 5a. Deviation record (§XXVIII)

**D-S3-DEV-1 · a shared-column block shows only its START time visually (lanes ≥ 2).**
- **What diverged:** BR-9 gave regular blocks a "09:00–10:30" range over the title. The live Visual Gate (Week 1440,
  Sunday overlap pair — no probe caught it, the screenshot did) showed the range WRAPPING to two lines in a ~75px
  ½-column lane, pushing the title out (“Deep work” clipped mid-glyph, “Call Ma…” cut).
- **New direction:** `shortTime = compact || lanes ≥ 2` → the visible time is the start only (`numberOfLines={1}`),
  `aria-hidden`, with the full range in an sr-only span — exactly the compact treatment, extended to shared lanes. The
  ONE compact rule (anatomy) is unchanged; only the time label shortens.
- **Critique:** sound — no information loss (range stays in the accessible text; the block's height still SHOWS its
  duration on the grid); the alternative (ellipsising "09:00–1…") is worse. **Preflight:** complete — +1 test; contract
  unchanged. **Approval:** presented at the S3 Visual Gate stop.

**Gate-caught fixes (not deviations — spec-conformant corrections):** (1) `ScrollRegion` + `WeekRoot` `position:relative`
— the sr-only `position:absolute` spans escaped the `overflow:auto` region (containing block outside it) and widened the
page to 616px at 375; (2) column names are one explicit sr-only string ("Thu 8, today") the list references, the visual
header `aria-hidden` — engines joined the inline header spans differently ("Thu8" in jsdom). g2 review folds: no invented
end label for a contradictory `endHour` (IR-6) · `state="empty"` with items renders none + warns · compact keeps the full
range for SR + a separator · 3 skeleton bars · cluster-reset + Sunday-columns tests.

## 6. Change log

| Date | Session | Change |
|------|---------|--------|
| 2026-10-18 | fe-calendar S3 | PLAN authored (gate 1). Grounded in slice-map:36, seam §A, envision EC-4/11-14 + :50 (64px gutter), interpretation IR-6, mockup § WEEK, greybox week/day, AgendaView/CalendarView/CanvasView patterns. |
| 2026-10-18 | fe-calendar S3 | gate-1 independent critique **REVISE → 12 folded:** **B1** Week scroll region made keyboard-reachable (tabIndex/role=region/label/ring; acceptance no longer self-contradicts axe) · **M2** a11y topology explicit (aria-hidden hour layer is a SIBLING of the positioned role=list; tested no hidden ancestor) · **M3** `layoutDay` clusters by DRAWN extent + checks every lane + geometry-only sort · **M4** block anatomy sized to the 17/21px line boxes → regular/compact (<44px one row "09:30 Title"), no lane cap · **M5** today = colour + underline + sr ", today" (1.4.1) · **M6** I-4 reframed → DOC-FIXED (canvas-view STATE RULE) · **M7** NEW I-5 all-day day attribution (`CalChip.day?` + "Thu ·" prefix; fixture filters its own dated source) · **M8** AA set covers every text class + pre-authorized `$colorTextPrimary` time-label fallback · **N9** 375/768 maths stated · **N10** contract nits (half-open `[8,20]`, `layoutDay(blocks,h0)`, `days={weekKeys}`, hours/startHour guards, `formatHour` rounding, 1h cite → greybox) · **N11** I-3 → refinement R1 · **N12** currency + `_index` V10/V11 rows + web-client-runtime + decisions.md rows. **Open for Approval 1: I-1 · I-2 · I-5.** |
| 2026-10-18 | fe-calendar S3 | re-critique **SHIP** (all 12 verified resolved from disk) + 4 nits folded: window clamped [0,24] + late-block top clamp · compact also when `lanes ≥ 3` · chip `day ∉ days` guard + TZ-safe prefix · `effectiveEmpty` on the renderable set. Declined: a `scrollLabel` prop (no consumer needs i18n of "Week grid" in M1 — the house's other renderers hard-code English copy too). superseded by the grounding row below. |
| 2026-10-18 | fe-calendar S3 | **Grounding pass (Victor: "check the documentation" ×3 on I-1/I-2/I-5).** Swept the governing corpus I had skipped: IA (`/calendar` is Sessions-owned) · Sessions feature + intake (Calendar = read-only renderer of the placed result; overlapping windows are valid data, SS-9 / current-BR:110) · Relationships/Routines/Journals/Notifications intakes · ADR-007/008 · frontend-replan surface-map/decomposition · quality bar · decisions ledger · ADR-002 `user_preferences` · shipped apps/web stores. **Results:** I-1 window auto-extend + I-2 overlap lanes → **DOC-DERIVED** (EC-3/vision §6 no-hidden-items charter + Sessions overlap-is-valid + IR-6); I-5 → **DOC-FIXED as mocked** (undated chips; `CalChip.day?` dropped — it was an ADD beyond the approved visual); **NEW BR-16** — `time_format`/`week_starts_on` are user prefs already live in `preferences-store` (fe-settings): WeekView takes `timeFormat`, the surface derives weeks from `weekStartsOn` and ROOT-fixes the hard-coded `mondayOf` across week/agenda/living. No open interpretations remain. **Awaiting Approval 1.** |
| 2026-10-18 | fe-calendar S3 | **Approval 1 (Victor).** Preflight: every cited path/export verified on disk (preferences-store `usePreferencesStore`:68 + types:13-15 · data-view exports · CanvasView `empty?`:48-49 · focusVisibleStyle/numberOfLines in-house · stories/test/current-spec files · ADR-002:3528-3529 · barrel:71). **3 citation fixes:** BR-8 overlap grounding re-anchored on the Sessions intake Calendar-reader resolution (:113-115; the availability-window line is supporting) · BR-6 quality-bar cite marked supporting · BR-16 root-fix precedent pinned to decisions.md:1119-1121. + TZ-test recipe (agenda-view.test.tsx:2-3). **Preflight PASSED.** |
| 2026-10-18 | fe-calendar S3 | gate-2 independent critique **REVISE → 10 folded** (buildability confirmed: focusVisibleStyle/tabIndex/role=region/% left/numberOfLines all in-house): **F1** Month passes the shipped `CalendarView weekStartsOn` (else Week/Agenda Sunday vs Month Monday) · **F2** surface `afterEach` resets `usePreferencesStore` · **F3** late-block clamp moved BEFORE clustering via `drawnStart`; `layoutDay(blocks,[h0,h1])` · **F4** validate → renderable → `windowFor` → `layoutDay` order (NaN-safe) · **F5** `formatHour(h,fmt,kind)` pinned (start ≤1439, end ≤1440, 12h minutes always, gutter drops :00) + edge tests · **F6** ONE compact rule across BR-8/9/contract/tests · **F7** Visual Gate + lane-rect intersection probe, keyboard ring-clip cell, 12h + Sunday cells · **F8** 6 missing tests · **F9** S7 seam gains `weekStartsOn` + Monday-assuming comments neutralized · **F10** `periodLabel(range, focused, weekStartsOn)` both calls + 'This week' Sunday test. **Awaiting Approval 2.** |
| 2026-10-19 | fe-calendar S3 | **Approval 2 → BUILT → Visual Gate PASS (Victor-reviewed 2026-10-19; D-S3-DEV-1 approved).** g2 code review: 8 findings folded (no invented end label · empty-with-items renders none + warns · compact keeps full range for SR + separator · 3 skeleton bars · cluster-reset + Sunday-columns tests; NIT live-region-at-mount = AgendaView precedent, noted). Gate-caught: sr-only containing block → page overflow (`position:relative`) · engine-dependent column names → explicit sr-only name · D-S3-DEV-1. tsc 0 · eslint 0 (changed files; `index.ts:1` triple-slash = pre-existing, `@vida/ui` has no lint script) · @vida/ui **605/605** (6 first-test cold-start timeouts under memory pressure, 105/105 re-run alone; `testTimeout:15000` added to week-view.test per the canvas-reader precedent) · @vida/web **677/677**. Currency → `v11-week-view.md` + `_index` V10/V11 rows + ui CLAUDE.md + web-client-runtime current-spec + slice-map ledger + seam-contract §A/§B + decisions ledger. |
