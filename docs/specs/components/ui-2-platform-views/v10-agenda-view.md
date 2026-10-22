# Spec: component:ui-2-platform-views · V10 — agenda-view
<!-- type: component (unit sub-spec of ui-2-platform-views) -->
Status: **SHIPPED** (fe-calendar #19 S2, LIF-203, 2026-10-18) — promoted from the gated PLAN (§XXIX).
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Parent: docs/specs/components/ui-2-platform-views/_index.md (shared BR-1..BR-6).
Delivery: docs/specs/foundation/fe-calendar/delivery/ (interpretation · envision · slice-map · seam-contract ·
PLAN-S2-agenda-renderer.md = the gate/audit record incl. deviations D-S2-DEV-1..3).

## 1. Identity
V10 `agenda-view` — the renderer for the Global Calendar's **Agenda range** (#19): a multi-day, daypart-aware actionable
schedule — the "another way" that solves the month grid's info-crush `[FACT: calendar-vision.md:17-18,57-59]`. EC-3 is
its anchored checkpoint `[FACT: envision.md:25]`. **NOT a `VIEW_LAYOUT` renderer** (it is a calendar *range*, dispatched
by the #19 `CalendarSurface`, not by a saved view's `layout`).

- **Presentational + read-only lens.** Items arrive **pre-dayparted and pre-ordered** (the `useCalendar` seam derives
  them, S7); the renderer only ARRANGES. The one interaction — completion — is an **intent** (`onToggleItem`); the owning
  module writes `[FACT: interpretation.md NEEDS-3; calendar-vision.md:28-30]`.
- **Siblings:** the list-view `sections` model rotated into a 2-level grouping + board-view's hybrid state ownership; the
  spine PIECES (`ViewState` · `Message` · `warnMissingName`), NOT `resolveDataViewState` (the outer region is a group of
  per-day lists, not one list — the calendar/board divergence) `[FACT: list-view.tsx:96-262; internal/data-view.tsx]`.

## 2. Business Rules (BR-AV-*, = PLAN BR-CAL-S2-1..12 as built)
- **BR-AV-1 · Arrange, never derive.** No sorting, no daypart mapping; input order preserved within a partition. Daypart
  order fixed morning → afternoon → evening; an empty daypart renders nothing; a day with 0 items is skipped.
- **BR-AV-2 · Temporal asymmetry.** ONLY the `today` day (string-equal `day.date === today`) renders daypart group
  headers; every other day is ONE flat list `[FACT: mockups/calendar-ranges-and-agenda.html:137-157; greybox agenda.png]`.
- **BR-AV-3 · Timed vs all-day.** `time` → `$small` tabular label in a 64px gutter; absent → "ALL DAY" eyebrow. Never
  assume a time (tasks carry none; habits/routines are dayparted) `[FACT: interpretation.md IR-6]`.
- **BR-AV-4 · Weight.** `must` → uppercase tag in `$colorBrandEmphasis`; `can` → `$colorTextMuted`; absent → none.
- **BR-AV-5 · Done.** Struck (`line-through`) + muted title + muted dot.
- **BR-AV-6 · Completion = intent, render-when-handler.** A native `<button type="button" role="checkbox">` renders ONLY
  when `onToggleItem` is given AND `done !== undefined`: `aria-checked`, named via `aria-labelledby` → the title's
  `useId` id, Space/Enter native, `focusVisibleStyle` 2px solid `$colorFocusRing` / 2px offset, hover border
  `$colorTextMuted`→`$colorTextPrimary` (D-S2-DEV-1: Tamagui pseudo-styles, not an injected sheet). Resting border
  `$colorTextMuted` — the `$colorBorderDefault` hairline measured 1.2–1.7:1, below WCAG 1.4.11's 3:1 (gate-caught). A
  `<span>` HitArea (phrasing content) inset −14 from the padding box → 46×46 (§X). The renderer NEVER flips its own state.
  No handler + completable → an inert `aria-hidden` box + sr-only "(done)".
- **BR-AV-7 · Dot = purpose colour (user data).** `color` hex as given; absent/done → `$colorTextMuted`; `aria-hidden`.
- **BR-AV-8 · Day rail.** `$display` serif `$heading` tabular day number + uppercase weekday eyebrow; today = number +
  "TODAY" eyebrow in `$colorBrandEmphasis`. Date parsed BY PARTS into a local Date (never `new Date(str)` — UTC−3
  off-by-one) `[FACT: interpretation.md NEEDS-4]`.
- **BR-AV-9 · Terminal states (state-as-prop).** `loading` → 2 skeleton day-blocks, `role="group"` `aria-busy`;
  `error`/`empty` (and success-with-zero-items, self-healed) → `role="status"` `Message`, overridable via `error?`/`empty?`.
  Dev-warns: success-with-no-items · loading-with-days (stale render) · missing accessible name (state-gated).
- **BR-AV-10 · A11y.** Outer `role="group"` (named); per-day `role="list"` of `role="listitem"` rows; list names via
  `aria-labelledby` — `[dayId]` flat, `[dayId partId]` dayparted; ids `useId`-prefixed + index-keyed; day rows keyed
  `${date}-${index}` (duplicate dates safe).
- **BR-AV-11 · Read-only invariant (EC-12).** No write control; `onToggleItem` is the only intent.
- **BR-AV-12 · Layout + tokens.** DIRECT semantic tokens, no sub-theme, no new dep. Items column `maxWidth:720`
  (constrained measure, slice-map:35). **Narrow reflow (D-S2-DEV-2):** `DayRow flexWrap:'wrap'` + items `minWidth:240` →
  the rail stacks ABOVE the items below ~352px of row width (title ≈180px at 375), side-by-side ≥768.

## 3. Contract (as shipped)
```ts
export type Daypart = 'morning' | 'afternoon' | 'evening'   // LOCAL mirror of @vida/types DAYPART (structural)
export interface AgendaItem { id: string; title: ReactNode; color?: string; time?: string; daypart: Daypart;
                              weight?: 'must' | 'can'; done?: boolean }
export interface AgendaDay { date: string; items: readonly AgendaItem[] }        // 'YYYY-MM-DD'
export interface AgendaViewProps { days: readonly AgendaDay[]; today?: string; state?: ViewState
  onToggleItem?: (id: string) => void; empty?: ReactNode; error?: ReactNode
  ref?: Ref<HTMLDivElement>; 'aria-label'?: string; 'aria-labelledby'?: string }
export function AgendaView(props: AgendaViewProps): ReactElement               // non-generic, React-19 ref-as-prop
```
Barrel: `AgendaView`, `AgendaViewProps`, `AgendaItem`, `AgendaDay`, `Daypart`. The canonical **`DAYPART`/`Daypart`**
lives in `@vida/types` `common.ts` (slice-map D1; backs no column → no CHECK/enum-parity row/Zod). D1 mapping constants
(applied by `useCalendar`, S7 — NOT this renderer): `<12:00` morning · `12:00–17:59` afternoon · `≥18:00` evening;
all-day task → morning (configurable).

## 4. Acceptance (met)
- [x] EC-3 anatomy · BR-AV-1..12 — jsdom 21/21 (`agenda-view.test.tsx`, TZ-forced America/Sao_Paulo) + stories
  (`Playground` owned/intent · `ReadOnly` · `TerminalStates` · `Narrow`).
- [x] Visual Gate PASS (Victor-reviewed 2026-10-18; Brave, real `CalendarSurface`, 3 presets × L/D × 375/768/1440 +
  states): text AA min 4.94–6.53 incl. warm-dark, 0 fails · box 3:1 4.94–6.53 · 46×46 · ring + hover · real Space/Enter
  toggle · Agenda region 0 overflow at 375 · axe 0 · 0 pageerrors.

## 5. Deferred / homed
- Live data (`useCalendar` ProviderRead fan-out + the D1 mapping) → S7. The owning completion capability → Tasks/Habits/
  Routines (ADR-008); until wired, the surface passes NO handler (D-S2-DEV-3).
- Dense-day overflow treatments (vision §6) → Month/Agenda feel work (EC-F3), not V10's structure.
- Range-transition motion (EC-F2) → the surface.

## 6. Change log
| Date | Session | Change |
|------|---------|--------|
| 2026-10-18 | fe-calendar #19 S2 | V10 authored at currency from the gated PLAN: BR-AV-1..12 + contract as shipped; deviations D-S2-DEV-1..3 (Victor-approved at the Visual Gate); gate-caught a11y fixes (border 3:1, hit 46). |

- **`pulseKey?: number` (fe-calendar S7, EC-F2 — PLAN-S7 G15/R9):** bump to pulse the today mark once (the #19 surface's Today button); 0/absent = no pulse (never on mount); each new value remounts the mark so the one-shot CSS animation (`internal/calendar-motion.ts`: `scale` 1→1.12→1, `slow` 400ms ease-out) restarts; reduced motion = none via the sheet's `@media` block. Shared with `RangeTransition` (the range fade, `moderate` 250ms opacity).
