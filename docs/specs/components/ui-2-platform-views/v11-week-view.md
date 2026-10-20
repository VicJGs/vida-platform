# Spec: component:ui-2-platform-views · V11 — week-view
<!-- type: component (unit sub-spec of ui-2-platform-views) -->
Status: **SHIPPED** (fe-calendar #19 S3, LIF-203, 2026-10-19) — promoted from the gated PLAN (§XXIX).
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Parent: docs/specs/components/ui-2-platform-views/_index.md (shared BR-1..BR-6).
Delivery: docs/specs/foundation/fe-calendar/delivery/ (interpretation · envision · slice-map · seam-contract ·
PLAN-S3-week-day-renderer.md = the gate/audit record incl. deviation D-S3-DEV-1).

## 1. Identity
V11 `week-view` — the renderer for the Global Calendar's **Week AND Day ranges** (#19): a time-column grid (64px hour
gutter · N day columns · one all-day strip on top · timed blocks positioned by hour). **Day = the same component with one
column** — column count IS `days.length` `[FACT: envision.md:26 EC-4; mockup:204]`. **NOT a `VIEW_LAYOUT` renderer** (a
calendar *range*, dispatched by the #19 `CalendarSurface`).

- **Presentational + read-only lens.** Blocks arrive pre-bucketed by `day`; the renderer only POSITIONS. No intents, no
  interactive descendants — the one tab stop is the Week scroll region (navigation) `[FACT: ADR-007/008; EC-12]`.
- **Siblings:** V10 agenda-view (LOCAL types, spine PIECES, named `role="group"` of `role="list"`s, TZ-safe dates) +
  V4 calendar-view (2D grid: empty = a designed grid; `TodayMark`; `minWidth` grid in a horizontal scroller).
- **Geometry** lives in `internal/week-layout.ts` (pure, unit-tested): `formatHour` · `normalizeSpan` · `windowFor` ·
  `layoutDay`. Order: validate → renderable set → window → layout.

## 2. Business Rules (BR-WV-*, = PLAN BR-CAL-S3-1..16 as built)
- **BR-WV-1 · Position, never derive.** No content sort/filter; the accessible list keeps INPUT order (`layoutDay` sorts a
  private copy for geometry only).
- **BR-WV-2 · Never assume time (IR-6).** Only real-clock items are `TimedBlock`s; dated-but-untimed items are all-day
  `CalChip`s. A contradictory `endHour` is DRAWN as +1h but LABELLED start-only — an invented end is never shown.
- **BR-WV-3 · Time labels.** `formatHour(h, fmt, kind)`: minute-rounded (never "09:60"); a start clamps to 23:59, an end
  may read 24:00 / 12:00 am; 12h always shows minutes on blocks ("9:00 am"), the gutter drops ":00" ("8 am"). `timeFormat`
  = `user_preferences.time_format` (default '24h').
- **BR-WV-4 · All-day strip.** ONE row spanning all columns, undated chips (the approved shape) `[FACT: mockup:80,220;
  greybox week/day]`; omitted when empty. The provider selects the range's chips (Day = that day's).
- **BR-WV-5 · Visible window.** `hours` is a MINIMUM (default [8, 20) = rows 08:00…19:00), auto-extended to floor(earliest
  start)…ceil(latest drawn end), clamped [0, 24] — never a clip (the EC-3 / vision §6 no-hidden-items charter). Invalid
  `hours` → default + dev-warn.
- **BR-WV-6 · Block geometry.** 48px/h; min drawn height 24px; `endHour` absent → +1h, clamped to 24; late blocks
  clamped up so they stay in the grid (BEFORE clustering).
- **BR-WV-7 · Overlap lanes.** Per column: drawn-extent clusters (transitive), each block takes the lowest free lane
  (every lane checked); `left = lane/lanes`, `width = 1/lanes` (inline `style`, the gallery `tileStyle` precedent), 2px
  lane gutter. No lane cap. Co-timed items are real data (Sessions keeps overlapping windows; the Calendar renders the
  placed result) `[FACT: intake/sessions-and-scheduling.md:113-115; sessions SS-9]`.
- **BR-WV-8 · Block anatomy.** `$colorSurfaceSecondary` fill, `$sm` radius, 3px purpose bar (user hex; absent → muted,
  `aria-hidden`). **Compact** (`drawnHeight < 44 || lanes ≥ 3`) = one row "09:30 Title". **Short time** (`compact ||
  lanes ≥ 2`, D-S3-DEV-1) = the visible time is the start only, single line; the full range stays in an sr-only span.
  Regular = time over a `$small` title clamped to the lines that fit. Paired line-heights. Non-interactive.
- **BR-WV-9 · Column headers.** Visual header (`aria-hidden`): uppercase eyebrow weekday + `$display` `$subheading`
  tabular number (`lineHeight` paired); today = `$colorBrandEmphasis` + `TodayMark` underline. The list NAME is one
  explicit sr-only string ("Thu 8, today") — engines join inline header spans differently ("Thu8" in jsdom).
- **BR-WV-10 · A11y topology.** Outer `role="group"` (named, state-gated `warnMissingName`); the hour-line layer is an
  `aria-hidden` SIBLING of each column's positioned `role="list"` (no listitem has a hidden ancestor — tested); "All
  day" `role="list"`; an empty day emits no list; ids `useId`-prefixed + index-keyed.
- **BR-WV-11 · Terminal states.** `loading` → skeleton grid (3 bars) `aria-busy`; `error` → `role="status"` `Message`
  (or slot); `empty` — explicit, or nothing renderable after validation — → the designed EMPTY GRID + sr-only
  "Nothing scheduled" (or the `empty?` slot); items are never drawn under it (+ dev-warn). The teaching `EmptyState` is
  the surface's CanvasView `empty` slot.
- **BR-WV-12 · Responsive + keyboard.** Week: a scroll region (`tabIndex 0`, `role="region"`, "Week grid", 2px
  `$colorFocusRing` ring) over a `64 + 7×80` min grid — the REGION scrolls at 375, the page never. **`position:relative`
  on the root + region**: the sr-only spans are `position:absolute`, and an absolute child escapes `overflow:auto` when
  its containing block is outside the scroller (gate-caught: the page widened to 616px at 375). Day: no region, no tab stop.
- **BR-WV-13 · Read-only + tokens.** No write control, no intents; DIRECT semantic tokens, no sub-theme, no new dep.

## 3. Contract (as shipped)
```ts
export interface CalChip { id: string; title: ReactNode; color?: string }            // undated (approved shape)
export interface TimedBlock { id: string; title: ReactNode; color?: string; day: string; startHour: number; endHour?: number }
export interface WeekViewProps { days: readonly string[]; blocks: readonly TimedBlock[]; allDay?: readonly CalChip[]
  today?: string; hours?: readonly [number, number]; timeFormat?: '12h' | '24h'; state?: ViewState
  empty?: ReactNode; error?: ReactNode; ref?: Ref<HTMLDivElement>; 'aria-label'?: string; 'aria-labelledby'?: string }
export function WeekView(props: WeekViewProps): ReactElement                      // non-generic, React-19 ref-as-prop
```
Barrel: `WeekView`, `WeekViewProps`, `TimedBlock`, `CalChip`. Refinements vs the proposed seam: `range` prop DROPPED
(`days.length` decides Week vs Day) · readonly arrays · `empty?`/`error?` slots · `aria-labelledby` · `timeFormat`.

## 4. Acceptance (met)
- [x] BR-WV-1..13 — jsdom: `week-layout.test.ts` 23 + `week-view.test.tsx` 22 (TZ-forced America/Sao_Paulo); surface
  `calendar-surface.test.tsx` +6 (Week/Day dispatch · Sunday start on Month/Agenda/Week · 12h reaches WeekView). Stories:
  Week · Day · Overlap · ExtendedWindow · TwelveHour · Loading · Empty · Failed.
- [x] Visual Gate PASS (Victor-reviewed 2026-10-19; Brave, real `CalendarSurface`, Week + Day × 3 presets × L/D ×
  375/768/1440 + overlap fixture + states + 12h + Sunday): text AA min 4.52–5.22 (block time on secondary) · 0 page
  overflow (region scrolls at 375) · lane rects never intersect, 2px gutter · compact present · ring solid 2px unclipped ·
  axe 0 · states · 0 pageerrors.

## 5. Deferred / homed
- Live data (`useCalendar` fan-out: timed sources → blocks, dated/dayparted → chips, Day chip selection, `weekStartsOn`)
  → S7. A "now" line / today-pulse motion → EC-F2 (feel). Dense-overlap polish beyond lanes → live-gate feel.
- Whether undated week chips read well → Victor's live observation (no per-chip day was added — it would be an ADD
  beyond the approved visual).

## 6. Change log
| Date | Session | Change |
|------|---------|--------|
| 2026-10-19 | fe-calendar #19 S3 | V11 authored at currency from the gated PLAN: BR-WV-1..13 + contract as shipped; deviation D-S3-DEV-1 (Victor-approved at the Visual Gate); gate-caught fixes (sr-only containing block → page overflow; explicit column names). |
