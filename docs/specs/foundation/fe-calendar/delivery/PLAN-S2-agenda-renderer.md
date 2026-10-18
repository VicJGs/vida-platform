# PLAN — fe-calendar S2 · Agenda renderer (`AgendaView`, `@vida/ui`)

> Entity Delivery Flow ② · per-slice §XXVI gate 1. Slice-map S2 (slice-map.md:35): **frontend · `@vida/ui`** —
> "`AgendaView` — daypart-grouped (`Daypart`, D1) · timed vs all-day · Must/Can weight · done-state · constrained
> measure · presentational/data-prop/fixtures." EC MUSTs: **EC-3** + EC-11/12/13/14. Design evidence: the approved
> greybox `../mockups/greybox/agenda.png` (v3) + the mockup `../mockups/calendar-ranges-and-agenda.html` (§ AGENDA).
> Seam: seam-contract.md §A (AgendaItem/AgendaDay/AgendaViewProps — PROPOSED, ratified here).

## 1. Identity

- **What:** `packages/ui/src/components/agenda-view.tsx` (+ `.test.tsx` + `.stories.tsx`) — the presentational
  renderer for the Agenda range: a multi-day, daypart-aware actionable schedule. Pure data-prop; NO `@vida/core`/
  `@vida/types` import in the renderer [FACT: slice-map.md:77 boundary; interpretation.md NEEDS-2]. **Plus the D1
  canonical `Daypart` mint in `packages/types/src/common.ts`** (doc-homed in S2 — §3). Consumed by the S1
  `CalendarSurface` dispatch (fixture data until S7 wires `useCalendar`).
- **Why it exists:** solves the month grid's info-crush (vision §1.2); EC-3 is its anchored checkpoint.
- **Pattern stated (scenario Step 3, 3 components read):** AgendaView = the **list-view `sections` model rotated
  into a 2-level grouping** — outer named `role="group"`, inner `role="list"`s named via `useId`-prefixed
  index-keyed ids [FACT: list-view.tsx:96-100,238-249; board-view's labelledby lesson], over the shared spine
  pieces (`ViewState`, `Message`, `warnMissingName` [FACT: internal/data-view.tsx:11-32]) with **board-view's
  hybrid state ownership** (view-level loading/error/empty owned directly; the calendar-view divergence precedent
  of reusing PIECES not `resolveDataViewState` where the role model differs). Editorial chrome = the timeline P3
  gutter + calendar-view P5 recipes (serif display figures · uppercase tracked eyebrows · tabular numerics).

## 2. Business rules (BR-CAL-S2-*)

1. **BR-CAL-S2-1 · Grouping is presentational partition, not derivation.** Items arrive with `daypart` already
   assigned (the D1 mapping = S7 `useCalendar`'s job [FACT: slice-map.md:17]); AgendaView only ARRANGES. It never
   sorts items (provider orders upstream — the board-view rule [FACT: ui CLAUDE.md board-view]); partition
   preserves input order. Daypart display order is fixed: morning → afternoon → evening; an empty daypart renders
   nothing.
2. **BR-CAL-S2-2 · Temporal asymmetry: ONLY the `today` day renders daypart group headers** (Morning/Afternoon/
   Evening); every other day renders its items as ONE flat list. **DOC-RESOLVED, not an open interpretation** —
   both approved visual records encode it: the design mockup renders `.part`/`.ph` daypart groups ONLY under
   `.day.is-today` [FACT: mockups/calendar-ranges-and-agenda.html:137-157] and the locked greybox v3 matches
   (Thursday-TODAY dayparted; Fri/Sat flat) [FACT: mockups/greybox/agenda.png — the envision.md:57 gate
   evidence]; it is the vision's temporal-asymmetry principle applied to Agenda [FACT: calendar-vision.md:26].
   EC-3's "daypart groups" is satisfied by today's grouping.
3. **BR-CAL-S2-3 · Timed vs all-day:** `time` present → a `$small` **tabular** time label in the 64px left gutter
   [FACT: envision.md:50 gutter width]; absent → an "ALL DAY" `$caption` uppercase muted eyebrow (greybox v3 label;
   the mock's "daypart" text was placeholder). **The renderer never assumes an item has a time** — tasks carry NO
   clock time (`due_date` is a calendar date) and habits/routines are dayparted, not timed; only real-clock sources
   (availability HH:MM, ICS) produce `time` [FACT: interpretation.md IR-6; tasks.ts:60; scheduling.ts:47].
4. **BR-CAL-S2-4 · Weight:** `weight:'must'` → an uppercase `$caption` tag in **`$colorBrandEmphasis`** (the
   higher-contrast brand step — `brandPrimary` risks < 4.5 AA for small text, the P5/NavLink lesson [FACT: ui
   CLAUDE.md P5 ⚠]); `'can'` → `$colorTextMuted` uppercase tag; absent → no tag.
5. **BR-CAL-S2-5 · Done-state:** `done:true` → struck title (`textDecorationLine:'line-through'`) + muted ink +
   muted dot. The UA anchor-decoration reset does NOT apply (no anchor), but the strike lives on the title `<Text>`
   itself so children can't cancel it [memory: anchor-text-decoration-propagates].
6. **BR-CAL-S2-6 · The completion affordance is an INTENT, render-when-handler (EC-12).** A real
   `<button role="checkbox" aria-checked={done}>` renders **only when `onToggleItem` is passed AND the item is
   completable (`done !== undefined`)**; activating it (click; Space/Enter come free on a native button) emits
   `onToggleItem(id)` — never a write. **Name:** `aria-labelledby` → a `useId`-keyed id placed ON the title
   `<Text>` (title is a `ReactNode` — not `aria-label`-stringable). **Focus:** `:focus-visible` ring via
   `--color-focus-ring`, 2px solid / 2px offset (§VIII non-negotiable; the checkbox-styles.ts pseudo-class
   precedent — injected CSS, not a variant, since it keys on `:focus-visible`). **Hover:** border strengthen to
   `$colorTextMuted` (the Switch/Card precedent — a non-color-only signal). No handler → a static `aria-hidden`
   glyph when `done` is defined (state still conveyed by the strike + a visually-hidden "done" on the title).
   Hit area ≥ 44×44 (§X) regardless of the drawn ~20px box.
7. **BR-CAL-S2-7 · Dot = purpose colour (user data).** `color` (hex) threads as given [FACT: seam-contract.md:14
   "USER DATA, never a theme token"]; absent → `$colorTextMuted`; `done` → muted regardless. The dot is
   `aria-hidden` (colour never the sole signal — weight/time are text).
8. **BR-CAL-S2-8 · Day rail (the editorial gutter) [TZ per interpretation.md NEEDS-4/IR-4]:** serif `$display`-family day NUMBER at a large size +
   tabular, uppercase tracked weekday eyebrow below; the `today` day's number in `$colorBrandEmphasis` + a "TODAY"
   accent eyebrow [greybox]. Rail fixed-width (~96px), right content `flex:1 minWidth:0`; days separated by a
   hairline `borderTop` (first day none). Day number/weekday derived from the `date` string **TZ-safely**: parse
   `YYYY-MM-DD` ints → `new Date(y, m-1, d)` LOCAL constructor (never `new Date(str)` — the calendar-view B1
   off-by-one [FACT: calendar-view.tsx:13-14]); + a `TZ=America/Sao_Paulo`-forced test [memory:
   date-code-needs-tz-forced-tests].
9. **BR-CAL-S2-9 · Terminal states (EC-11), view-level, state-as-prop (BR-2):** `loading` → skeleton day-blocks +
   `aria-busy`; `error` → `role="status"` calm muted `Message` (override via `error?` slot); `empty` (or success
   with zero items across days — self-heals + dev-warn, the spine rule) → `role="status"` `Message` (override via
   `empty?` slot; the teaching `EmptyState` is the SURFACE's override, the canvas-view STATE RULE). Success → the
   day groups. A day with 0 items is SKIPPED quietly (the provider may pass only populated days; greybox skips
   Wednesday).
10. **BR-CAL-S2-10 · A11y naming + roles:** outer `role="group"` named via `aria-label`/`aria-labelledby`
    (`warnMissingName`, state-gated as the spine does); each day's list(s) = `role="list"` with every item row a
    `role="listitem"` (asserted in tests); list names via `aria-labelledby` composite — `[dayId]` flat,
    `[dayId, partId]` dayparted — ids `useId`-prefixed + index-keyed (NEVER `date`-keyed raw — the board-view
    spaces lesson).
11. **BR-CAL-S2-11 · Read-only invariant (EC-12):** no write control; `onToggleItem` is the only intent — "the
    calendar emits intents, the module mutates" [FACT: interpretation.md NEEDS-3; calendar-vision.md:28-30]. The
    render-when-handler gate is the house idiom [FACT: ui CLAUDE.md fe-gamification S4 affordances; collection
    `onFilter != null`]. No other interactivity in S2.
12. **BR-CAL-S2-12 · Tokens/theming (EC-13/14):** DIRECT semantic tokens, no sub-theme, no new dep, no arbitrary
    px type (the semantic scale only); **constrained measure** is a slice-map MUST [FACT: slice-map.md:35
    "constrained measure"] — the items column `maxWidth` ~720 (the canvas-reader serif-measure precedent at 660
    is prose; agenda rows breathe slightly wider — gate-tunable), matching the greybox's readable measure with
    free right space.

## 3. Contract (ratifies seam-contract §A — one refinement)

```ts
import { type ViewState, Message, warnMissingName } from '../internal/data-view'

export type Daypart = 'morning' | 'afternoon' | 'evening'            // D1 type fixed here; numeric bands = S7

export interface AgendaItem {
  id: string
  title: ReactNode
  color?: string                   // user-data hex (purpose colour)
  time?: string                    // 'HH:mm' display label; absent = all-day
  daypart: Daypart
  weight?: 'must' | 'can'
  done?: boolean                   // undefined = not completable (no checkbox ever)
}
export interface AgendaDay { date: string; items: readonly AgendaItem[] }   // date = 'YYYY-MM-DD'
export interface AgendaViewProps {
  days: readonly AgendaDay[]
  today?: string                   // 'YYYY-MM-DD'; marks the day + gates the daypart grouping (BR-2)
  state?: ViewState                // default 'success'
  onToggleItem?: (id: string) => void   // INTENT (EC-12)
  empty?: ReactNode                // slot overrides (the graph/board precedent)
  error?: ReactNode
  ref?: Ref<HTMLDivElement>
  'aria-label'?: string
  'aria-labelledby'?: string
}
export function AgendaView(props: AgendaViewProps): ReactElement     // NON-generic (concrete AgendaItem) → ref-as-prop
```

Refinement vs the proposed seam: + `empty?`/`error?` slots (the shipped slot convention; seam-contract called
`state` only) and `days: readonly` — no other drift. `CalState` in the seam = this `ViewState` (the alias was
notational). Barrel exports: `AgendaView`, `AgendaViewProps`, `AgendaItem`, `AgendaDay`, `Daypart`.

**D1 canonical mint — IN S2 scope (doc-fixed, not deferrable):** the slice-map homes D1 in S2 and defines the
canonical type IN `@vida/types` [FACT: slice-map.md:14-17 "Define a canonical `Daypart` in `@vida/types` …
Homed in S2"; seam-contract.md:13 "also minted in @vida/types for apps/web"]. So S2 adds to
`packages/types/src/common.ts` (the shared-enum home + house pattern [FACT: common.ts:28-38; habit.ts:26-27]):
```ts
/** Canonical cross-module daypart (ADR — slice-map D1). Supersedes nothing: habits/routines keep their own
 *  `time_of_day`; modules MAP to this at the calendar seam (useCalendar, S7). */
export const DAYPART = ['morning', 'afternoon', 'evening'] as const
export type Daypart = (typeof DAYPART)[number]
```
The `@vida/ui` renderer keeps its LOCAL structural `Daypart` union — `@vida/ui` cannot import `@vida/types`
[FACT: interpretation.md NEEDS-2]; the two are structurally identical (the `ViewState` precedent). ⚠ Build
note: editing `@vida/types` requires its dist rebuild before dependent typechecks [memory:
editing-vida-types-needs-dist-rebuild-before-core-typecheck].

**D1 open values — SETTLED here (the seam-contract owes them to S2's contract step [FACT: seam-contract.md:97]):**
- **Clock-bands** (for S7's timed-item mapping; the renderer itself never maps — items arrive dayparted, BR-1):
  `morning` = before 12:00 · `afternoon` = 12:00–17:59 · `evening` = 18:00 onward. Grounded in the approved
  greybox: 09:30 → Morning, 17:00 → Afternoon [FACT: mockups/greybox/agenda.png].
- **All-day-task default band** = `'morning'` (the day's actionable start — the greybox places the all-day
  check-in first under Morning), configurable at the `useCalendar` seam (S7) per slice-map D1 "a configurable
  default band" [FACT: slice-map.md:17].
These are recorded S7 mapping constants; S2 ships no mapping code.

## 4. Acceptance

- [ ] Multi-day render: day rail (serif tabular number · weekday eyebrow · hairline separators); `today` day
      marked (accent number + TODAY eyebrow) and ITS items grouped under Morning/Afternoon/Evening eyebrows in
      fixed order; non-today days flat; empty dayparts and empty days skipped.
- [ ] Timed rows show the tabular time; all-day rows show ALL DAY; `must`/`can` tags render per BR-4; done rows
      struck + muted; dots per BR-7, aria-hidden.
- [ ] Checkbox: renders only when `onToggleItem` ∧ `done !== undefined`; a native `<button role="checkbox">` +
      `aria-checked` + `aria-labelledby`→title id; click AND keyboard (Space/Enter) emit `onToggleItem(id)`;
      `:focus-visible` ring (`--color-focus-ring` 2px/2px) + hover border-strengthen; ≥44px hit area; no
      handler → no interactive control.
- [ ] Terminal states per BR-9 (loading skeleton + aria-busy · error status · empty status + self-heal dev-warn ·
      slots override); `warnMissingName` state-gated.
- [ ] TZ: a `YYYY-MM-DD` boundary date renders the correct local day number/weekday under
      `TZ=America/Sao_Paulo` (test-forced).
- [ ] jsdom tests cover: grouping asymmetry (today dayparted / other flat) · daypart order + empty-part skip ·
      timed/all-day labels · weight tags · done strike · checkbox render-when-handler + intent + a11y ·
      states × 4 + self-heal warn · naming warn · TZ. Stories: default (the greybox week) + states + no-handler.
- [ ] `@vida/types` exports `DAYPART`/`Daypart` from `common.ts` (house const-array pattern); types dist rebuilt
      before dependent typechecks; monorepo tsc stays 0. **No `enum-parity.test.ts` row** — its fixture scope is
      explicitly enums-with-a-live-table (appended per DB-4 slice, not auto-discovered [FACT:
      enum-parity.test.ts:8-10]); `DAYPART` backs no column. No Zod validator either (not a DB enum; the
      validator convention is for CHECK-backed columns [FACT: packages/types/src/CLAUDE.md DB-9]).
- [ ] `pnpm --filter @vida/ui` tsc 0 · eslint 0 · suite green (+~12 tests); then the blocking **Visual Gate**
      (real browser at `/calendar` with the Agenda range active — the surface is fixture-driven by construction
      (the S1 `monthFixture` pattern, NO `?sample` param): EC-3 anatomy · EC-13 full preset×mode matrix AA
      measured · EC-14 reads-as-calendar · 375/768/1440 no overflow · axe 0) — Victor reviews.

## 5. Implementation prompt (ordered)

0. `packages/types/src/common.ts`: add `DAYPART`/`Daypart` under "Shared enums" (§3 block verbatim) →
   `pnpm --filter @vida/types build` (dist rebuild before any dependent typecheck).
1. `agenda-view.tsx`: local types (§3) → styled hosts (`AgendaRoot` column · `DayRow` flex row + hairline
   `borderTop` variant · `DayRail` fixed 96 (may compress to ~72 if the 375 Visual Gate shows title crush —
   pre-authorized, no §XXVIII stop) · `ItemsCol` flex:1 minWidth:0 maxWidth measure · `PartHeader`/`DayEyebrow`
   uppercase-via-CSS tracked `$caption` · `TimeCell` 64px · row = flex with `flexShrink:1` on the title (RNW
   shrink-0 default lesson)) · `internal/agenda-view-styles.ts` for the checkbox `:focus-visible`/hover
   pseudo-class rules (the checkbox-styles.ts precedent).
2. State switch (board hybrid): error → status; loading → 2 skeleton day-blocks `aria-busy`; effectiveEmpty
   (state empty ∨ zero items) → status + dev-warn on the success-with-zero case; success → body.
3. Body: days.filter(items.length) → map to `DayRow`; today test = `day.date === today` (string equality — no
   Date math); today → partition `{morning,afternoon,evening}` → non-empty parts as labeled lists; else one list.
4. Row renderer: time/ALL-DAY cell · dot · title (strike+mute on done) · weight tag · checkbox per BR-6.
5. Tests + stories (fixtures mirror the greybox week: Oct 5–11, Thu 8 today).
6. Barrel exports; `pnpm --filter @vida/ui exec tsc`/eslint/vitest. Then `apps/web/src/app/calendar/index.tsx`:
   add `agendaFixture(focused)` (an inline fixture fn, the S1 `monthFixture` pattern [FACT: index.tsx:55-69] —
   the Mon–Sun week of `focused`, mirroring the greybox: Thu=today dayparted mix of timed/all-day/must/can/done,
   sparser flat days, one skipped day) + swap the dispatch: `range === 'agenda'` → `<AgendaView days=… today=…
   onToggleItem={deny-safe no-op}/>` — the doc-fixed M1 wiring: "deny-safe no-op until the owning capability
   ships; the intent surface is fixed here so the renderer never changes when it lands" [FACT:
   seam-contract.md:100-101] (the EmptyState placeholder remains for week/day/year/living); apps/web tsc +
   targeted tests. NOTE: no `?sample` param — the surface is fixture-driven by construction until S7.
7. Visual Gate (blocking) → currency (§XXIX: **`docs/specs/components/ui-2-platform-views/v10-agenda-view.md`**
   — the numbered per-view spec, the v8/v9 convention — + `packages/ui/src/CLAUDE.md` paragraph + slice-map
   ledger row + **amend `seam-contract.md` §Open-at-build**: the Daypart clock-bands + all-day default band are
   SETTLED → record the values with a pointer to this PLAN / v10 [the living seam doc must not keep listing a
   resolved item as open — the mod-tasks contract-amendment precedent]) → commit (S1 message shape).

## 5a. Deviation record (§XXVIII)

**D-S2-DEV-1 · checkbox focus/hover mechanism: injected stylesheet → Tamagui `focusVisibleStyle`/`hoverStyle`.**
- **What diverged:** BR-6/§5.1 named `internal/agenda-view-styles.ts` (injected CSS) for the checkbox `:focus-visible`
  ring + hover, citing `checkbox-styles.ts`. Grounding at build time: the house rule is *"Injected CSS is only for
  pseudo-class/`:has` state the styled component can't see"* [FACT: packages/ui/src/CLAUDE.md §internal Rule], and
  Tamagui expresses both on a styled host — the native-`<button>` `Tab` uses `focusVisibleStyle` with
  `$colorFocusRing` [FACT: tabs.tsx:85-92]; `hoverStyle` is the Select precedent [FACT: ui CLAUDE.md, select.tsx:82].
  `checkbox-styles.ts` injects ONLY because its focus is on a hidden `<input>` while the ring paints on a SIBLING
  box via `:has()` — a cross-element case that doesn't exist for a self-focused `<button>`. The plan's citation was
  a mis-applied precedent.
- **Critique:** real (the plan contradicted the package's own rule); sound (fewer moving parts — no injected sheet,
  no idempotency guard, no specificity race; identical user-visible contract: 2px solid `$colorFocusRing`, 2px
  offset, `:focus-visible`-only, hover border-strengthen to `$colorTextMuted`).
- **Preflight:** complete — contract/acceptance unchanged (ring token · 2px/2px · hover non-colour-only signal);
  only §5.1's file list loses `internal/agenda-view-styles.ts`.
- **Approval:** doc-resolved correction (the package rule decides it) — **presented to Victor at the S2 Visual Gate
  stop** with the rest of the slice; trivially reversible.

**D-S2-DEV-2 · 375 strategy: rail-compression → rail-reflow (`flexWrap` + items `minWidth`).**
- **What diverged:** N2 pre-authorized compressing the rail 96→~72 if 375 crushed the title. Build-time arithmetic
  shows compression cannot fix it: ~327px content − 96 rail − 16 gap = ~215px items column; the row's fixed parts
  (64 time + 8 dot + ~40 tag + 20 box + 4×12 gaps ≈ 180) leave the title **~35px** (72-rail → ~59px). Still crushed.
- **New direction:** `DayRow` `flexWrap:'wrap'` + `ItemsCol` `minWidth:240` → below ~352px of row width the rail
  wraps ABOVE the items (title ≈ 147px at 375); ≥768 unchanged side-by-side. The house reflow idiom [FACT: ui
  CLAUDE.md canvas-reader S2 "`flexWrap` + `TitleGroup minWidth:240`"; canvas-view BR-CB-S1-12 masthead flexWrap] —
  no media query, no JS width read.
- **Critique/preflight:** sound + complete — layout-only, contract/acceptance unchanged (the 375 no-overflow Visual-Gate
  MUST still binds; the reflow is what makes it pass). **Approval:** presented at the S2 Visual Gate stop.

**D-S2-DEV-3 · surface wiring: deny-safe no-op handler → handler OMITTED.**
- **What diverged:** §5.6 wired `onToggleItem={deny-safe no-op}` on the surface. The independent g2 review showed the
  consequence: the renderer's render-when-handler gate then shows FOCUSABLE checkboxes that do nothing (SR announces
  "checkbox, not checked"; Space changes nothing) — a dead affordance on the live surface.
- **Grounding:** the house rule rejects dead affordances — affordances "render PER-HANDLER … instead of dead no-op
  buttons" [FACT: ui CLAUDE.md, fe-gamification S4]; fe-notes S8 DEV-gated its no-op actions because "pure no-op
  actions = dead affordances otherwise" [FACT: TASKS.md fe-notes S8]. seam-contract:100's "deny-safe no-op" is met by
  ABSENCE (no capability ⇒ no control; the renderer's read-only done-state + sr-only "(done)"), and its other clause —
  "the intent surface is fixed here so the renderer never changes when it lands" — holds unchanged (S7 just passes the
  owning capability).
- **Critique/preflight:** sound + complete — no renderer change; the live-checkbox Visual-Gate checks (ring · hover ·
  3:1 · 44px · intent) move to the gate harness's stateful "owned" block (an owner that flips the data, the story
  `Owned` pattern). Currency: amend seam-contract:100 wording to "absent handler (deny-safe)".
  **Approval:** presented at the S2 Visual Gate stop.

## 6. Change log

| Date | Session | Change |
|------|---------|--------|
| 2026-10-18 | fe-calendar S2 | PLAN authored (gate 1); D-S2-1 today-dayparted asymmetry surfaced as the one INTERPRETATION; seam §A ratified + slots refinement. |
| 2026-10-18 | fe-calendar S2 | gate-1 /critique **REVISE→fixed**: **B1** checkbox a11y completed (native `<button role="checkbox">`, Space/Enter free, `aria-labelledby`→title id [title is ReactNode], `:focus-visible` ring via `--color-focus-ring` in `internal/agenda-view-styles.ts`, hover border-strengthen) · **M1** currency home fixed now = `v10-agenda-view.md` (v8/v9 convention) · **M2** `role="listitem"` explicit + tested · **N1** `items: readonly` · **N2** rail 96→~72 pre-authorized if the 375 gate shows crush. Re-critique SHIP. |
| 2026-10-18 | fe-calendar S2 | **Approval 2 (Victor) → BUILT.** g2 code-review (10 findings): 8 folded (`type="button"` · `${date}-${i}` keys · stale-loading warn · native-button+no-form-submit tests · dead className · fixture comment · `<span>` HitArea · dead no-op affordance → D-S2-DEV-3), 1 rejected (DAYPART≡ROUTINE_TIME_OF_DAY — slice-map D1 mandates a separate canonical type "superseding nothing"; no column → no Zod), 1 routed to the S1 defect unit ("This week ·" on every week = S1 `periodLabel`). Visual Gate caught + fixed: unchecked border 1.2–1.7:1 → `$colorTextMuted` (3:1) · hit 42→46. **Visual Gate PASS — Victor-reviewed 2026-10-18; D-S2-DEV-1..3 approved.** Surfaced 2 PRE-EXISTING S1 chrome defects (EC-1 switcher no <768 condense → 375 overflow; wrapping period title overlaps) → own gated fix unit before S3. tsc 0 · @vida/ui 559/559 (ExportDialog first-test load flake green alone) · apps/web tsc 0 · eslint 0. Currency → `v10-agenda-view.md` + ui CLAUDE.md + web-client-runtime current-spec + seam-contract amendments. |
| 2026-10-18 | fe-calendar S2 | **Approval 1 (Victor)** → preflight **BLOCKED→fixed** (the acceptance cited a nonexistent `?sample` route — corrected to the S1 inline-fixture pattern + the dispatch swap + the seam-contract:100 deny-safe no-op intent; verified: enum-parity needs no DAYPART row [explicit table-scoped fixture], no Zod validator [not a CHECK column]) → re-preflight **PASSED** → gate-2 critique **REVISE→fixed** (M1: §5.7 now amends seam-contract §Open-at-build with the settled band values — the living seam doc must not keep a resolved item open) → **SHIP**. Awaiting Approval 2. |
| 2026-10-18 | fe-calendar S2 | **Grounding pass (Victor: "ground everything in the documentation")** — 3 corrections: **(1)** D-S2-1 today-dayparted asymmetry reframed INTERPRETATION → **DOC-RESOLVED FACT** (both approved visual records encode it: mockup `.part` only under `.is-today` + greybox v3); **(2)** the D1 `@vida/types` `Daypart` mint pulled INTO S2 (slice-map:14-17 homes D1 here + seam-contract:13 — my S7 deferral was a manufactured deferral) with the `common.ts` shared-enum pattern + local structural mirror (NEEDS-2) + types-dist rebuild note; **(3)** the seam-contract:97 open values SETTLED (clock-bands <12 / 12–17:59 / 18+ grounded in the greybox; all-day-task default band = morning, configurable at S7). + citations: IR-6 (never assume time), NEEDS-3 (intents), NEEDS-4 (TZ), slice-map:35 (constrained measure). |
