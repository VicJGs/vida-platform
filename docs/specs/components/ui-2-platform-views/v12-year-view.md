# Spec: component:ui-2-platform-views · V12 — year-view
<!-- type: component (unit sub-spec of ui-2-platform-views) -->
Status: **SHIPPED** (fe-calendar #19 S4, LIF-203, 2026-10-20) — promoted from the gated PLAN (§XXIX).
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Parent: docs/specs/components/ui-2-platform-views/_index.md (shared BR-1..BR-6).
Delivery: docs/specs/foundation/fe-calendar/delivery/ (interpretation · envision · slice-map · seam-contract ·
PLAN-S4-year-renderer.md = the gate/audit record incl. deviations D-S4-DEV-1/2).

## 1. Identity
V12 `year-view` — the renderer for the Global Calendar's **Year range** (#19): 12 mini-months of activity-density dots,
today ringed, the current month's name accented, and a month heading that **drills into Month** `[FACT: envision.md:27
EC-5; mockup:205 "click a month to drill in"]`. **NOT a `VIEW_LAYOUT` renderer** (a calendar *range*, dispatched by the
#19 `CalendarSurface`).

- **Presentational + read-only lens.** `density` arrives pre-derived (S7 `useCalendar` owns has/busy); the renderer only
  places dots. The ONE intent is navigation (`onPickMonth`) — not a write `[FACT: ADR-007/008; EC-12]`.
- **Siblings:** V11 week-view / V10 agenda-view (LOCAL types, spine PIECES, named `role="group"`, TZ-safe dates, dev-warns,
  `empty?`/`error?` slots) + V4 calendar-view (a 2D date grid is a `role="table"`; empty = a designed grid).
- **Geometry** lives in `internal/year-layout.ts` (pure, unit-tested): `MONTH_MIN` · `resolveYear` · `buildYear` ·
  `indexDensity` · `localDate`.

## 2. Business Rules (BR-YV-*, = PLAN BR-CAL-S4-1..12 as built)
- **BR-YV-1 · Place, never derive.** No sort, count, or threshold — the provider's levels are drawn as given.
- **BR-YV-2 · Layout.** 12 months Jan→Dec in an RN-safe flex-wrap grid (gallery GV-2): each month `{flexGrow:1,
  flexShrink:1, flexBasis:'22%', minWidth:128}`, `$24` gap → 4-up at 768/1440 (and from ≈ 680px viewport), 2-up at 375,
  a fluid 3-up between ≈ 512–679 `[FACT: mockup:86-87; greybox year.png]`.
- **BR-YV-3 · Mini-month.** 7 columns; leading blanks from `weekStartsOn`, TRAILING `aria-hidden` spacers pad the last row
  to 7 (so a short row never stretches — visually "no trailing fill"); square cells (`aspectRatio` via `style`), `$sm`
  radius, `$colorSurfaceSecondary` paper; **`$8` cell gap — the greybox governs** (envision.md:60-61), not the exploration
  mockup's 2px. **No day numbers, no weekday row** (both records). Dates by numeric parts via `setFullYear` at local noon.
- **BR-YV-4 · Density dot.** level 1 "has" = **4px @ .75** · level 2 "busy" = **6px solid** · `$colorBrandEmphasis` —
  size AND tone. **D-S4-DEV-1:** .75 not the mockup's .55 (which measured 2.39–3.27:1, failing 3:1 in 4/6 preset×mode).
- **BR-YV-5 · Today.** An absolute `aria-hidden` 2px `$colorBrandEmphasis` ring inside a `position:relative` cell (a shape —
  1.4.1) + ", today" in the cell label. `today` outside `year` → no ring, no accent, no warn.
- **BR-YV-6 · Current month.** The heading of the month that CONTAINS a day key equal to `today` is `$colorBrandEmphasis`;
  all others `$colorTextPrimary`. Computed from the built day keys, so a malformed `today` accents nothing — the accent
  never appears without the ring.
- **BR-YV-7 · Heading / drill-in.** Serif `$display` `$subheading`, paired `lineHeight`, weight 500 (design.md:109); visible
  text = the month name only. A name span `"October" + ' ' + <sr>2026</sr>` (the space is a SIBLING text node — accname
  drops a leading space inside the sr span → "October2026") names the table. With `onPickMonth`: a native `<button
  type="button">` (UA chrome reset — the AgendaView CheckBox precedent), `minHeight:44`, full width, hover
  `$colorSurfaceSecondary`, 2px `$colorFocusRing` ring, named "October 2026, open month", press → `onPickMonth(0–11)`.
  Without it: the same box as plain text (no dead control). Not a `role="heading"` — the sibling renderers name groups,
  they don't mint headings. **Why the heading:** a button wrapping the mini-month would flatten its table for AT.
- **BR-YV-8 · A11y topology.** Outer `role="group"` (named; state-gated `warnMissingName`) → 12 `role="table"`
  (`aria-colcount=7`, named via `aria-labelledby` → the name span) → `role="row"` → `role="cell"` per DAY with
  `aria-colindex` (offset-aware) and `aria-label` `format(d,'EEEE, d MMMM')` + ", busy" / ", has activity" + ", today".
  Spacers roleless + `aria-hidden`. No cell is focusable; the only tab stops are the 12 month buttons.
- **BR-YV-9 · Terminal states.** `loading` → the grid without dots + `aria-busy` (buttons live); `error` → `role="status"`
  `Message` (or slot), no grid; `empty` (explicit, or no renderable level≥1 entry) → the designed year grid + sr-only
  "No activity this year." (buttons live) — or the `empty?` slot, which REPLACES the grid. Dev-warns: success-with-nothing ·
  loading-with-density (stale) · empty-with-activity (not drawn).
- **BR-YV-10 · Guards.** `year` outside 1000–9999 / non-integer → the current year + warn (`resolveYear`, pure). A density
  entry malformed · impossible (`2026-02-30`, round-trip) · outside `year` · level ∉ 0|1|2 → skipped + warn; a duplicate
  date keeps the MAX level + warns (never hides activity).
- **BR-YV-11 · Tokens.** DIRECT semantic tokens, no sub-theme, no new dep (date-fns already one), no new token.

## 3. Contract (as shipped)
```ts
export interface YearDensity { date: string; level: 0 | 1 | 2 }
export interface YearViewProps { year: number; density: readonly YearDensity[]; today?: string; weekStartsOn?: 0 | 1
  onPickMonth?: (month: number) => void /* 0–11, navigation intent */; state?: ViewState
  empty?: ReactNode; error?: ReactNode; ref?: Ref<HTMLDivElement>; 'aria-label'?: string; 'aria-labelledby'?: string }
export function YearView(props: YearViewProps): ReactElement                      // non-generic, React-19 ref-as-prop
// internal/year-layout.ts (not barrel-exported)
type YearSlot = { kind: 'spacer' } | { kind: 'day'; key: string; day: number; col: number; weekday: number }
interface MiniMonth { month: number; offset: number; days: number; rows: YearSlot[][] }   // rows of exactly 7
```
Barrel: `YearView`, `YearViewProps`, `YearDensity`. Refinements vs the proposed seam: readonly density · `empty?`/`error?`
slots · `aria-labelledby` · `weekStartsOn` · `onPickMonth` index pinned 0–11.

**Consumer note (D-S4-DEV-2):** the #19 surface lands focus on the Month grid after a drill (FOCUS_CONTRACT `tabChange →
panel` — the pressed button unmounts) via V4 `CalendarView`'s new optional `tabIndex` (see v4-calendar-view.md).

## 4. Acceptance (met)
- [x] BR-YV-1..11 — jsdom: `year-layout.test.ts` 11 + `year-view.test.tsx` 19 (TZ-forced America/Sao_Paulo; sizes/opacity/
  colour/line-height/minHeight asserted against reference-element atomic classes); surface `calendar-surface.test.tsx` +6
  (Year dispatch · Sunday colindex · drill + clamp + focus on the Month grid · switcher doesn't move focus · Living-only
  placeholder). Stories: Year · SundayStart · DrillIn · OtherYear · Loading · Empty · Failed.
- [x] Visual Gate PASS (Victor-reviewed 2026-10-20; Brave, real `CalendarSurface`, 3 presets × L/D × 375/768/1440 + Sunday +
  other year + no-handler + 3 states × L/D + 600/700 probes = 29 cells): has-dot 3:1 min **3.54** · busy + ring min **5.93**
  · month names min **6.47** · accent on the hover paper **5.93** · 2-up/4-up/4-up · 0 page overflow · buttons 44 tall, 24
  apart · last row = first row width · Tab order Jan→Dec, ring 2px unclipped, hover change, Enter drills + focus on "Month
  grid" with a ring · axe 0 in-component · 0 pageerrors.

## 5. Deferred / homed
- Live data (`useCalendar` derives has/busy per day from the fan-out) → S7. Range-transition motion → EC-F2 (feel).
- Feel notes recorded at the gate, unchanged by Victor: 375 cells ≈12.5px with the `$8` gap (alternative `$4` < 768);
  month names sit 4px inside the grid edge (the button's hover inset).

## 6. Change log
| Date | Session | Change |
|------|---------|--------|
| 2026-10-20 | fe-calendar #19 S4 | V12 authored at currency from the gated PLAN: BR-YV-1..11 + contract as shipped; deviations D-S4-DEV-1 (.75 has-dot) + D-S4-DEV-2 (V4 `tabIndex`), Victor-approved at the Visual Gate; build-caught fix (accname leading-space). |
