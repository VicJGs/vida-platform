# PLAN — fe-calendar S5 · Living lens renderer (`LivingView`, `@vida/ui`)

> Entity Delivery Flow ② · per-slice §XXVI gate 1. Slice-map S5 (slice-map.md:38): **frontend · `@vida/ui`** —
> "`LivingView` — the signature: ④ purpose-budget strip (honest-null) · ② habit threads (kept/miss/future + streak) · the
> 7 temporal day-columns as Cards with alive-hooks (past record · today live + ③ open-time + ⑤ slip-flag · future
> intention) · fixtures." EC MUSTs: **EC-6 · EC-7 · EC-8 · EC-9 · EC-10** + EC-11/12/13/14; feel rows EC-F1/F4 at the
> live gate. Design evidence: the approved greybox `../mockups/greybox/living{,-dark,-reader}.png` + the concept board
> `../mockups/calendar-concept-board.html` (CSS :41-104, data :169-222, legend :159-166) + `../calendar-vision.md` §1.3.
> Seam: seam-contract.md §A (`PurposeBudget`/`HabitThread`/`LivingDay`/`LivingViewProps` — PROPOSED; refined here under
> the per-slice licence [FACT: seam-contract.md:5-6]).

## 1. Identity

- **What:** `packages/ui/src/components/living-view.tsx` (+ `.test.tsx` + `.stories.tsx`) — the presentational renderer for
  the **Living** range, the calendar's signature lens: a **purpose-budget** card, a **habit-threads** card, and the **7
  day-columns** as `Card`s whose look follows **temporal asymmetry** (past = record · today = live · future = intention).
  Pure data-prop; NO `@vida/core`/`@vida/types` import [FACT: slice-map.md:77]. Consumed by the `CalendarSurface` for
  `range === 'living'` (fixture until S7, which owns every derivation — record lines, thread states, budget, open time,
  slip flag [FACT: seam-contract.md:83]).
- **Why it exists:** "makes it unmistakably Vida" [FACT: calendar-vision.md:20]; EC-6..EC-10 are its checkpoints.
- **Pattern stated (scenario Step 3, read):**
  1. **`week-view.tsx` / `year-view.tsx` / `agenda-view.tsx`** — LOCAL types; spine PIECES; named outer `role="group"`;
     `useId` index-keyed ids; TZ-safe dates parsed by parts; `today` by string equality; dev-warns; `empty?`/`error?` slots;
     render-when-handler intents (`onToggleItem`, `onPickMonth`); done = struck + sr "(done)" (AgendaView); a 7-column
     temporal grid scrolls in a keyboard-reachable `role="region"` at narrow widths (WeekView BR-WV-12).
  2. **`card.tsx` alive-hooks** — `status`: `faded` (recessed `$colorSurfaceSecondary`, FLAT, text held — BR-C-7a) ·
     `warm` (3px left `$colorSignalDanger` bar) · `neutral`; `header` + `headerDivider`; `role="group"` [FACT:
     card.tsx:30-39,113-114,206-254]. EC-14 names exactly these hooks for the day columns [FACT: envision.md:40].
  3. **`canvas-view.tsx`** — the STATE RULE (un-overridden empty → the renderer's own designed state); the frame owns the
     period title (S1 `periodLabel` already renders "This week · Oct 5 – Oct 11, 2026" for living — honest "This week"
     only on the current week [FACT: index.tsx periodLabel]).

## 2. Business rules (BR-CAL-S5-*)

1. **BR-CAL-S5-1 · Arrange, never derive.** Every value arrives pre-derived and pre-ordered by S7 `useCalendar` (thread
   states, streak label, hours, fraction, record line, slip flag, open block). The renderer never sorts, counts or computes
   a time [FACT: seam-contract.md:83; IR-6].
2. **BR-CAL-S5-2 · Layout (doc-fixed by the greybox).** **Fidelity rule (one rule, gate-1 F2):** the approved greybox
   governs wherever it SHOWS something (envision.md:60-61; the S4 "greybox governs" row); the concept board fills in only
   where the greybox shows nothing — and where envision.md:54 says the greybox DEFERRED a matter ("Defers (feel): voice,
   motion, dense-day treatment choice, thread ink"), the greybox is silent on it, so the vision + concept govern (the
   thread connector, BR-4). EC-13 (contrast = a per-slice MUST) outranks greybox ink (BR-3/BR-7 flag colour). A column stack with `$24` rhythm: **(a)** the purpose-budget
   `Card` · **(b)** the habit-threads `Card` · **(c)** the 7 day `Card`s in one row [FACT: greybox living.png; concept
   board :132-147]. (a)/(b) carry an uppercase eyebrow header ("Purpose budget · {weekLabel}" / "Habit threads") +
   `headerDivider` (the greybox headers + hairline). `weekLabel` is the surface's honest label ("This week" only for the
   current week, the S1-chrome rule).
3. **BR-CAL-S5-3 · ④ Purpose budget (EC-6).** One wrapping row of entries: purpose dot (user hex, `aria-hidden`) · name ·
   a 52px bar (fill = `fraction` × width, `$colorBrandPrimary` fill on `$colorSurfaceSecondary` track — the greybox bars
   are accent in all three frames, not the concept's purpose colour [greybox living/-dark/-reader; concept :184-187]) ·
   tabular hours. **Hours format (gate-1 F11):** `m = round(hours×60)` → "6h" when `m % 60 === 0`, else "2h30" (the
   concept's "2h40" focus form :206). `hours` a number with `fraction: null` → empty bar + dev-warn (a provider
   contradiction). **Zero** (`hours === 0`) → the entry is FLAGGED by its
   COPY: hours read "0h · none yet" [FACT: greybox] — the "none yet" IS the flag (no added glyph; gate-1 F5). The greybox
   tints the name + hours red = `$colorSignalDanger`, which fails AA as text (3.63) — the greybox was not contrast-checked;
   EC-13 makes AA a per-slice MUST [FACT: envision.md:35] and decisions.md:127 rules danger-as-text out (meaning in copy).
   The replacement token is this unit's shipped EMPHASISED-TAG token: S2's "MUST" tag = `$colorBrandEmphasis` [FACT:
   PLAN-S2 BR-CAL-S2-4 :44-46; mockup `.must{color:var(--accent)}` :66] → the zero entry's name + hours render
   `$colorBrandEmphasis` (no weight change). Doc-resolved (EC-13 + decisions:127 + the S2 token) — see §5a note. **Unmeasured** (`hours === null`) → no bar fill, hours read "unmeasured" in
   `$colorTextMuted` — never "0h", never fabricated [FACT: ADR-011 §3.6 :66 + interpretation.md:145 "unadvertised ⇒ null
   (unmeasured), never fabricated"; envision EC-6] [INTERPRETATION for the copy word: ADR-011:44 names "unmeasured" for
   qualitative measurables — the same honest-empty word reused]. **Stale** (`stale: true` — ADR-011 §3.6 :66: a source
   OUTAGE yields "last-known + a flag", distinct from unadvertised) → the last-known hours + a muted " · as of last read"
   [DERIVED COPY] (gate-1 F6). FORWARD VOCABULARY: no M1 producer — S6/S7 only produce null until S7 owns a last-known
   cache; the prop is fixed now so the renderer never changes when it lands (seam :113). Each entry's accessible text reads "Health,
   0 hours, none yet" / "Career, 6 hours" / "Learning, unmeasured" (bar `aria-hidden`; the number is in the text).
4. **BR-CAL-S5-4 · ② Habit threads (EC-7).** One row per habit: dot + name · **7 nodes** · streak label (`ReactNode`, the
   provider's — "12-day streak" / "broke Tue · back on"). Node states [FACT: concept board :86-92; greybox]: `kept` =
   filled purpose colour · `missed` = DOTTED purpose-colour ring, hollow · `today` = solid purpose-colour ring, hollow ·
   `future` = ring at reduced opacity (the faded node; text untouched). **Connector — DOC-FIXED:** the line exists — "habits as
   unbroken lines across days" [FACT: calendar-vision.md:22] · "each habit is one continuous line across the week"
   [FACT: concept legend :161] · EC-F4 names "node/line weight, the 'unbroken thread' read" [FACT: envision.md:39]; the
   greybox's omission is not evidence against it — envision.md:54 lists "thread ink" among what the greybox DEFERS to the
   live gate. Ink = the concept's 2px line in the purpose hex at ≈33% alpha (`.node::before` 2px `var(--line)` :56 + `--line:${t.c}55` in the thread markup);
   its weight is reviewed in the ordinary Visual Gate under EC-F4 (the gate's feel rows — not a separate decision). Nodes 11px, 1.5px ring; future
   ring at the concept's `.4` opacity (:61). **Layout (gate-1 F3):** the 7 nodes spread across a `flex:1` area of 7 equal
   cells (min 24px each) — concept `8.5rem repeat(7,1fr)` (:52) — with the streak RIGHT-aligned (greybox) and wrapping
   below at 375. **Contrast (gate-1 F4):** nodes + connectors are USER-DATA hex — the S2 rule: `aria-hidden`, colour never
   the only signal, no contrast gate (PLAN-S2:60-62); the row's accessible text carries the meaning (1.1.1) — measured at
   the gate as INFORMATION only. Nodes `aria-hidden`; each row is ONE accessible
   text: "Meditate: kept Mon, Tue, Wed; today Thu; upcoming Fri, Sat, Sun — 12-day streak" (weekday names from `days[]`
   dates, parsed by parts) — the visual row has no other SR equivalent (1.1.1). `days.length` must equal `days[]` length
   (7) else dev-warn + render what aligns.
5. **BR-CAL-S5-5 · Day columns = `Card`s with alive-hooks (EC-8 / EC-14).** Per `LivingDay.kind`: `past` → `status="faded"`
   · `today` → `status="warm"` · `future` → `neutral` [FACT: envision.md:40 EC-14]. Card `header` = uppercase weekday
   eyebrow ("MON", today "THU · TODAY") over the date number in serif `$display` family at `$subheading`, tabular,
   **paired `lineHeight`**; today's number `$colorBrandEmphasis`; past number `$colorTextMuted` (greybox). `headerDivider`.
   Cards **grow with content — never clip** [FACT: envision.md:32 EC-8 "fix via grow/scroll"; :50 v2 "Cards grow"].
6. **BR-CAL-S5-6 · Past = record (① / EC-8).** `record` → serif italic `$small` `$colorTextMuted`, flush (the greybox draws
   no left rule in any frame — the concept's `.rec` rule :75 yields to it under the fidelity rule) · `done[]` → struck + muted chips (dot + title) with sr "(done)" (the AgendaView
   precedent) · `focus` → uppercase `$caption` eyebrow at the bottom ("2H40 DEEP FOCUS").
7. **BR-CAL-S5-7 · Today = live (EC-8 / EC-9 / EC-10).** `entries[]` in PROVIDER ORDER (refinement R2 — see §3): an
   **item** (optional tabular muted `time` · dot · title; optional `slipping`) or the **open block**. Greybox order
   interleaves them (09:00 Deep work · ◇ 2h open · Send proposal ⤻ slipping · 18:00 Gym) — separate `live`/`drift`/
   `openBlock` arrays could not express it.
   - **⑤ Slip flag (EC-10, D5 reduced):** a `slipping` item shows, under its title, a "SLIPPING" uppercase `$caption`
     tag with the ⤻ glyph (both in the greybox) — the tag text in `$colorBrandEmphasis` (the S2 MUST-tag token; the
     greybox red fails EC-13 as text — same resolution as BR-3), the ⤻ glyph in `$colorSignalDanger` (a graphical object,
     3:1 measured — the Card `warm` edge already uses danger graphically); `aria-hidden` glyph; sr text ", slipping". The
     "moved N×" count is OUT (no reschedule ledger — D5) [FACT: slice-map.md:27-28; envision.md:32].
   - **③ Open time (EC-9):** a dashed 1px `$colorBrandEmphasis` box (concept `.open` :88) with an uppercase "◇ {label}"
     eyebrow in `$colorBrandEmphasis` + the `hint` in `$colorTextMuted`. **Read-only reveal**; with `onSlotOpenTime` it
     renders as a native `<button>` (UA reset, ≥44px, ring, hover paper) named "{label}, {hint}" → `onSlotOpenTime(date)`;
     **M1 passes no handler** (the owning capability isn't wired — deny-safe, the D-S2-DEV-3 rule) [FACT: seam-contract.md
     :110-113; envision.md:31 EC-9].
8. **BR-CAL-S5-8 · Future = intention (EC-8).** `intent` → serif italic `$small` `$colorTextMuted` (concept `.intent`) ·
   `plan[]` → chips (dot + optional time + title) in `$colorTextMuted`; future number muted.
9. **BR-CAL-S5-9 · Responsive (EC-8 + the WeekView precedent).** (a)/(b) wrap: budget entries `flexWrap`; a thread row is
   `[name · minWidth 120] [nodes · flex:1, 7 equal cells ≥24] [streak · minWidth 120, right-aligned]` with `flexWrap` so at 375 the streak drops
   below. (c) the 7 day Cards sit in a row inside a **keyboard-reachable scroll region** (`tabIndex 0`, `role="region"`,
   "Week columns", 2px ring, `position:relative` — the BR-WV-12 lesson) with each Card `minWidth: 140` → `7×140 + 6×8 =
   1028`: fits 1440 (content 1136), **the region scrolls at 768 and 375, the page never** [FACT: envision.md:32 "grow/
   scroll"; week-view BR-WV-12]. 140 is the narrowest a record line reads (≈ 3 words a line) — a live-gate feel check.
   **Shadow (gate-1 F8):** the region is `overflowX:auto` (which forces `overflowY` to clip), so it carries `paddingVertical:'$8'` +
   `paddingHorizontal:'$4'` inside (a full `$8` would inset the day Cards from the lane Cards' edges; the shadow blur is
   mostly vertical — edge alignment + side-shadow clipping measured at the gate) — the Cards' raised shadows render within it (Card avoids `overflow:hidden` for this reason). **Today at 375:**
   with a Monday start, today (Thu) begins off-screen in the region — **not auto-scrolled in S5**, matching WeekView (which
   doesn't either — the sibling convention); its position is recorded in the Visual-Gate evidence like every cell.
10. **BR-CAL-S5-10 · Per-lane honest degrade (interpretation NEEDS-5).** "One unavailable source greys that lane, never
    blanks the calendar" [FACT: interpretation.md:49-51]. `budget` **absent** (the source is unavailable) → the budget
    card renders with a muted "Purpose budget is unavailable right now." line (not omitted — the lane's existence is the
    honesty); `budget=[]` (the source answered: none) → "No purposes yet." Same for `threads` absent → "Habit threads are
    unavailable right now." / `[]` → "No habits tracked yet." [DERIVED COPY — no record fixes the wording; gate-1 F7: say
    "unavailable", never "not set up", for an outage]. Plain text (no status role — not a state of the whole view). Day columns are always the 7 `days`.
11. **BR-CAL-S5-11 · A11y topology.** Outer `role="group"` (named, state-gated `warnMissingName`) → budget Card (named by
    its eyebrow) holding a `role="list"` of entries · threads Card holding a `role="list"` of rows · the scroll region →
    7 day Cards, each `role="group"` named via `aria-labelledby` → ONE explicit sr-only span ("Thu 8, today"), the visual
    header `aria-hidden` (week-view.tsx:228-236 — the BR-WV-9 lesson); the lane Cards are named via `aria-labelledby` → their
    eyebrow id (Card spreads `rest` before `role`, so it passes through); each day holds a `role="list"` of its items (record/intent/focus are text before/after the list; the open block is a list item).
    Empty lists are omitted (axe). Glyphs, dots, bars, nodes `aria-hidden`.
12. **BR-CAL-S5-12 · Terminal states (EC-11), state-as-prop.** `loading` → the 3-part layout with skeleton bars in each card
    + 7 skeleton day Cards, `aria-busy` · `error` → `role="status"` `Message` (or slot) · `empty` (explicit, or success where
    every day has no content AND both lanes are absent/empty) → the designed layout (lanes with their honest lines + 7
    bare day Cards) + sr "Nothing this week." (or the `empty?` slot, which replaces the layout). Dev-warns: success-with-
    nothing · loading-with-data · empty-with-content (not rendered) · `days.length !== 7` · two `today` days · a thread
    whose `days` length ≠ the day count.
13. **BR-CAL-S5-13 · Tokens/theming (EC-13/14).** DIRECT semantic tokens, no sub-theme, no new dep/token. Purpose colours
    are USER DATA hex (dots, nodes, connector). Text on `faded` (secondary) paper is measured (P5: muted 4.52 min). **AA
    risk pre-authorized:** any muted text < 4.5 on faded paper → `$colorTextPrimary` (no §XXVIII stop; §5a).
14. **BR-CAL-S5-14 · Read-only (EC-12).** No write control. The only focusables: the day-columns scroll region (navigation)
    and — only when a handler is passed — the open-time button (intent).
15. **BR-CAL-S5-15 · Rule-of-three extraction (PLAN-S3 §5.2, scope exact — gate-1 F9; `Eyebrow` settled by G9: NOT extracted).** New `internal/calendar-shared.ts`:
    `SR_ONLY` (agenda :63 · week :66 · year :45) · `DATE_KEY` + `parseLocalDate` (agenda :60/:75 · week :63/:78;
    `year-layout.ts:59` keeps its own `DATE_KEY` — it round-trips via `localDate`, no change) · `Eyebrow` (agenda :96 · week
    :106 — extracted only if the two definitions are identical; else left). No behaviour change — the three suites prove it.
    **Motion (gate-1 F13):** S5 is STATIC — no today-pulse / thread-draw; EC-F2 motion is a later feel item (reduced-motion
    gated when it lands, NEEDS-6).
16. **BR-CAL-S5-16 · Surface wiring (apps/web).** `range === 'living'` → `<LivingView {...livingFixture(focused,
    weekStartsOn)} weekLabel={…} aria-label="Living" />` (no `onSlotOpenTime` — deny-safe). `livingFixture` = the greybox
    week over `weekKeys(focused, weekStartsOn)`: kinds from `today` (past < today < future by key string compare); when
    today is outside the focused week every day is past or future (correct asymmetry). The S1 placeholder + its copy are
    removed (all 6 ranges live) — `calendar-surface.test.tsx:127-131` (asserts the S5 placeholder copy) is REWRITTEN to
    assert the Living dispatch, and the now-unused `EmptyState` import (only use index.tsx:297) is removed. `weekLabel`
    reuses `periodLabel`'s `isCurrentWeek` test + span form (index.tsx:60-71): "This week" | "Oct 12 – Oct 18, 2026".
    `livingFixture` derives per kind: thread states (`today` node only on the current week; else kept/missed for past days,
    future for future days), past content (record/done/focus), today entries (incl. the open block + one slipping item),
    future content (intent/plan) — so a past or future week renders honestly.

17. **BR-CAL-S5-17 · Build specifics (gate-2 G1–G13 — each from a shipped precedent; these OVERRIDE any looser wording above).**
    - **Day Card sizing (G1):** `flexGrow:1, flexShrink:1, flexBasis:0, minWidth:140` (the WeekView `DayCol` precedent,
      week-view.tsx:105 — RNW `flexShrink` defaults to 0, so `minWidth` alone lets one long record widen its Card).
    - **Region inset (G2):** `shadow.resting` = `0 6px 16px -4px` reaches ≈18px below / ≈12px aside → the region carries
      `paddingTop:'$8'`, `paddingBottom:'$20'`, `paddingHorizontal:'$12'` with `marginHorizontal:'-$12'` (edges stay aligned
      with the lane Cards; the surface's `$24` padding absorbs it at 375 — page overflow measured at the gate).
    - **Thread geometry (G3/G4):** each of the 7 node cells is `flex:1`, `position:relative`, no inter-cell gap; cells 1–6
      draw a connector `position:absolute, left:'-50%', right:'50%', top:'50%', height:2, marginTop:-1` rendered BEFORE the
      node (6 per row — the jsdom assertion), `backgroundColor={color}` + `opacity:0.33` (NO hex string maths — any CSS colour
      works; concept `${c}55` ≈ .33). Hollow nodes (missed/today/future) fill `$colorSurfacePrimary` so the line never shows
      through (concept `.node .d{background:#fff}` :58); `borderWidth:1.5` set explicitly beside `borderStyle` (dotted for
      missed — the Popover "medium" trap); a class per state (`vida-thread-<state>`); future ring `opacity:0.4`.
    - **Hours (G5):** `!Number.isFinite(hours) || hours < 0` → dev-warn + render as unmeasured; `fraction` clamped [0,1] +
      warn; `stale` ignored when `hours === null`; minutes zero-padded ("2h05"); a positive value rounding to 0 min → "0h"
      WITHOUT the flag (the flag keys on `hours === 0`). SR text: "6 hours" · "1 hour" · "2 hours 30 minutes" · ", none yet"
      · ", as of last read". Bar fill = inline `style={{ width: `${f * 100}%` }}` (testable; the lane-geometry precedent).
    - **Effective empty (G6):** only a lane passed as `[]` counts as "nothing"; an ABSENT lane is unknown (unavailable) and
      never makes the view "empty" or trips success-with-nothing.
    - **Open-time button (G7):** explicit `aria-label={`${label}, ${hint}`}` (content-derived names join blocks without a
      separator — the S3 "Thu8" lesson); the MonthButton UA reset (year-view.tsx:72-85) with `borderWidth:1,
      borderStyle:'dashed'`, `borderColor:'$colorBrandEmphasis'`, `alignItems:'flex-start'`, `minHeight:44`.
    - **SR whitespace (G8):** every sr suffix is preceded by a SIBLING space — `{' '}<span sr>(done)</span>` (NOT AgendaView's
      `<span sr> (done)</span>` — the S4 accname trap); same for the thread row's " — {streak}". The visible "SLIPPING" tag is
      `aria-hidden` (the sr ", slipping" carries it — no double read).
    - **Eyebrow (G9):** NOT extracted — agenda (:96-103) lacks the `lineHeight:'$caption'` week (:109) has; LivingView defines
      its own Eyebrow WITH the paired line-height (ui CLAUDE.md Rules). Eyebrow copy is sentence case, uppercased by CSS.
    - **Labels (G10):** extract `weekSpan(focused, wso) → { span, isCurrent }` in the surface, used by `periodLabel` + the
      Living `weekLabel` (the existing label tests prove no change); `weekLabel` absent → the budget header reads "Purpose budget".
    - **Wording (G11):** a thread's `days.length` must equal the `days` prop's length; `focus` renders LAST in the column.
    - **States (G13):** skeleton day Cards `aria-hidden`; "loading-with-data" = any lane or day content present; dev-warns =
      success-with-nothing · loading-with-data · empty-with-content · `days.length !== 7` · >1 today · thread length mismatch
      · fraction-null-with-hours · non-finite/negative hours · fraction out of range (+ `warnMissingName`).

## 3. Contract (ratifies seam-contract §A, with refinements)

```ts
import { type ViewState, Message, warnMissingName } from '../internal/data-view'
import type { CalChip } from './week-view'                 // intra-package reuse (S3 minted it for S5)

export interface PurposeBudget { id: string; name: ReactNode; color: string
                                 hours: number | null        // null ⇒ unmeasured (honest-null, EC-6)
                                 fraction: number | null     // 0..1 of the bar; null ⇒ no fill
                                 stale?: boolean }           // outage: last-known + "as of last read" (ADR-011 §3.6)
export type ThreadState = 'kept' | 'missed' | 'today' | 'future'
export interface HabitThread { id: string; name: string; color: string; days: readonly ThreadState[]; streak?: ReactNode }
export interface LivingItem extends CalChip { time?: string; slipping?: boolean }   // R1
export type TodayEntry = { kind: 'item'; item: LivingItem }
                       | { kind: 'open'; label: string; hint: string }               // R2
export interface LivingDay {
  date: string; kind: 'past' | 'today' | 'future'
  record?: ReactNode; done?: readonly LivingItem[]; focus?: ReactNode               // past
  entries?: readonly TodayEntry[]                                                    // today (R2)
  intent?: ReactNode; plan?: readonly LivingItem[]                                   // future
}
export interface LivingViewProps {
  days: readonly LivingDay[]                    // 7, display order (week start applied upstream)
  weekLabel?: string                            // "This week" | "Oct 12 – Oct 18, 2026" — the budget header suffix
  budget?: readonly PurposeBudget[]             // absent ⇒ lane "…is unavailable right now"
  threads?: readonly HabitThread[]              // absent ⇒ lane "…are unavailable right now"
  onSlotOpenTime?: (date: string) => void       // INTENT (EC-9); M1 passes none
  state?: ViewState; empty?: ReactNode; error?: ReactNode
  ref?: Ref<HTMLDivElement>; 'aria-label'?: string; 'aria-labelledby'?: string
}
export function LivingView(props: LivingViewProps): ReactElement
```

Refinements (within the seam licence): **R1** `LivingItem = CalChip + time? + slipping?` — the greybox shows times on
today's items ("09:00") and the D5 slip flag is "a chip w/ a slip flag" [seam :53]. **R2** today's `live`/`openBlock`/
`drift` → ONE ordered `entries[]` (the greybox interleaves them; the provider orders, BR-1). **R3** `HabitThread.days`
states renamed to `ThreadState` + `readonly`; `name: string` (it composes the row's accessible text). **R4** readonly
arrays · `empty?`/`error?` · `aria-labelledby` (S2–S4). **R5** `weekLabel` = a string (composes the header). Barrel:
`LivingView`, `LivingViewProps`, `LivingDay`, `LivingItem`, `TodayEntry`, `PurposeBudget`, `HabitThread`, `ThreadState`.

## 4. Acceptance

_[VG] = proven in the Visual Gate only; jsdom size/colour/line-height checks use reference-element atomic classes._
- [ ] Layout: budget Card · threads Card · 7 day Cards; eyebrow headers + divider; "Purpose budget · This week".
- [ ] Budget: hours "6h" · zero → "0h · none yet" + name/hours `$colorBrandEmphasis`, no glyph · null → "unmeasured", no fill · bar fill width = fraction
      (style) · entry accessible text · absent lane / `[]` honest lines.
- [ ] Threads: 7 nodes per row with the 4 states (filled / dotted / solid ring / faded ring) + connectors · streak text ·
      row accessible text lists kept/missed/today/upcoming by weekday · length-mismatch warn · absent / `[]` lines.
- [ ] Day Cards: past `faded` · today `warm` · future neutral (status asserted) · header eyebrow + serif tabular number
      (paired line-height) · today "· TODAY" + accent number · sr name "Thu 8, today".
- [ ] Past: italic record (no rule) · struck done + sr "(done)" · focus eyebrow. Today: entries in input order · time ·
      slip label + sr ", slipping" · open block read-only (no button, no tab stop) · with handler: `<button>` named
      "{label}, {hint}" → `onSlotOpenTime(date)`. Future: italic intent · plan chips.
- [ ] Region: `role="region"` "Week columns", `tabIndex 0`; **[VG]** scrolls at 375/768, fits 1440, page never overflows.
- [ ] States: loading skeleton (`aria-busy`, skeleton Cards `aria-hidden`) · error status (+ slot) · empty designed
      layout + sr status (+ slot) · an ABSENT lane never makes the view empty · the 9 dev-warns + `warnMissingName`.
- [ ] Threads: 6 connectors per row · a class per node state · hollow nodes filled · **[VG]** spread + right-aligned streak
      (or atomic-class asserts vs a reference). Hours: NaN/negative → unmeasured + warn · "2h05" · SR "2 hours 30 minutes".
      Open-time button name "{label}, {hint}" (explicit). Done SR "Title (done)" with the space. "SLIPPING" `aria-hidden`.
- [ ] TZ: forced `TZ=America/Sao_Paulo` — weekday names in headers + thread text correct for `YYYY-MM-DD` keys.
- [ ] Extraction: `internal/calendar-shared.ts`; agenda/week/year suites unchanged and green.
- [ ] Budget: "2h30" format · fraction-null warn · stale suffix. Threads: nodes spread across the width; streak
      right-aligned; **[VG]** wraps below at 375.
- [ ] Stories: Living (greybox fixture) · Unmeasured + unavailable lanes · Open-time with handler · Past week · Future week ·
      States.
- [ ] `@vida/ui` tsc 0 · eslint 0 (changed) · suite green; apps/web tsc 0 + surface tests: living dispatch renders the
      10 named groups (root · 2 lanes · 7 days — query by name) · no placeholder copy anywhere · `weekStartsOn=0` starts on Sunday · no open-time button.
      Suites sequential.
- [ ] Blocking **Visual Gate** — real `CalendarSurface` (harness imports the app CSS), Living × 3 presets × L/D × 375/768/
      1440 + a past week + a future week (no today node/card) + unmeasured/unavailable lanes + 3 states: **AA** on every text class (record/intent/focus/done on faded paper,
      budget/thread names, hours, "unmeasured", slip label, open-time eyebrow + hint, headers) · **3:1** on bar fill vs track, the ⤻ slip glyph, open-time
      dashed border, warm edge (nodes + connectors = user hex → measured as INFORMATION only, S2 rule) · open-time button
      44px + ring + hover (handler story) · Card shadows unclipped inside the region · streak/budget wrap at 375 · today's
      position at 375 recorded (feel) · region scrolls at 375/768
      (page 0 overflow every cell) · ring unclipped · cards never clip content · axe 0 in-component · 0 pageerrors ·
      EC-14 reads as a calendar · feel rows EC-F1 voice / EC-F4 thread ink (incl. future-ring legibility in dark). Victor reviews.

## 5. Implementation prompt (ordered)

1. `internal/calendar-shared.ts` (SR_ONLY · DATE_KEY · parseLocalDate — `Eyebrow` stays local, G9) → refactor agenda/week/year imports → their suites.
2. `living-view.test.tsx` FIRST (TDD), then `living-view.tsx`: local types (§3) → hosts (`LivingRoot` relative · `LaneCard`
   = Card w/ eyebrow header · `BudgetEntry` · `Bar` · `ThreadRow` · `Node` (variants kept/missed/today/future) ·
   `Connector` · `ScrollRegion` · `DayCard` = Card status-by-kind · `Record` · `Chip` · `SlipFlag` · `OpenBlock` (View |
   `render:'button'`)) → state switch → per-lane degrade.
3. Stories (`testTimeout:15000` in tests — the sibling precedent).
4. Barrel; `@vida/ui` tsc / eslint / vitest (the 3 sibling suites included).
5. apps/web: `livingFixture` + dispatch + `weekLabel`; delete the placeholder branch + `EmptyState` import if unused;
   surface tests; tsc.
6. g2 code review → Visual Gate (blocking) → currency: `v13-living-view.md` + `_index` V13 · ui CLAUDE.md · web-client-
   runtime current-spec · slice-map S5 · seam-contract §A (R1–R5 + `stale`) and §B :83 (the `living` lanes are optional
   = honest-null; S7 orders today's `entries[]` — the open block placed by its time) · decisions · components → commit.

## 5a. Deviation record (§XXVIII)

_(none — no deviation is pre-recorded.)_ **Conformance note (doc-resolved, not a deviation):** the greybox's red flag text
(zero-budget entry, "SLIPPING") is `$colorSignalDanger`, which fails AA as text; EC-13 (AA = per-slice MUST, envision.md:35)
+ decisions.md:127 resolve it to the unit's emphasised-tag token `$colorBrandEmphasis` (S2 BR-CAL-S2-4); the ⤻ glyph keeps
danger graphically. Same class as the S2 control-border and P5 today-number AA fixes.

## 6. Change log

| Date | Session | Change |
|------|---------|--------|
| 2026-10-20 | fe-calendar S5 | PLAN authored (gate 1). Grounded in slice-map:38, seam §A/§B (:47-58, :83, :110-113), envision EC-6..10/11-14 (+:40 alive-hooks, :44-54 fidelity), interpretation NEEDS-5 (:49-51 per-lane degrade), calendar-vision §1.3, concept board (CSS + data + legend), greybox living.png, Card alive-hooks (card.tsx), decisions.md:127 (danger-as-text fails AA), ADR-011 §3.6/:44 (unmeasured ≠ 0), WeekView BR-WV-12 (scroll region), PLAN-S3 §5.2 (rule-of-three extraction). |
| 2026-10-20 | fe-calendar S5 | gate-1 independent critique **REVISE → 14 folded** (0 blockers; citations verified): **F1** connector re-stated as a DERIVED call (concept 2px purpose hex @ .33; EC-F4 weight) · **F2** ONE fidelity rule (greybox governs where it shows; concept fills gaps; connector = the recorded exception) · **F3** nodes spread across a flex:1 area, streak right-aligned · **F4** nodes/connectors = user hex → no contrast gate (S2 rule), info-only · **F5** ◆ zero glyph DROPPED (an ADD); red→primary recorded as **D-S5-DEV-1** · **F6** ADR-011 §3.6 outage → `stale?` + "as of last read"; :44 re-tagged INTERPRETATION · **F7** lane copy says "unavailable" for an outage (derived copy) · **F8** region `$8` inner padding (shadows); today off-screen at 375 NOT auto-scrolled (WeekView parity) — gate observation · **F9** extraction scope exact · **F10** surface: test :127-131 rewritten, EmptyState import removed, weekLabel reuses periodLabel, fixture derives per kind · **F11** hours format "6h"/"2h30" + fraction-null warn · **F12** day/lane Cards named via aria-labelledby · **F13** S5 static, no motion · **F14** acceptance + VG cells. (superseded by the grounding pass below) |
| 2026-10-20 | fe-calendar S5 | **Grounding pass (Victor: "there should be no calls for me — check the documentation").** Both items I had framed as calls are doc-resolved: **connector** = DOC-FIXED (calendar-vision:22 + concept legend :161 + EC-F4 :39 name the line; envision:54 lists thread ink among what the greybox DEFERRED, so its omission is silence, not a ruling) · **flag colour** = doc-resolved (EC-13 AA MUST :35 + decisions.md:127 → the unit's shipped emphasised-tag token `$colorBrandEmphasis`, S2 BR-CAL-S2-4; no weight added; D-S5-DEV-1 withdrawn). The fidelity rule now names envision:54's deferral explicitly. No open calls remain. |
| 2026-10-20 | fe-calendar S5 | re-check **REVISE → 8 folded** (0 blockers): BR-9 thread nodes `flex:1` (matches F3) · acceptance zero entry = no glyph · **record left rule DROPPED** (no greybox frame draws it — the fidelity rule) · §3 comments synced · `stale?` tagged FORWARD VOCABULARY + derived copy · ~~D-S5-DEV-1 states weight 600 replaces the red~~ (superseded — withdrawn by the grounding pass) · future-ring dark legibility → EC-F4 row · region padding vertical `$8` / horizontal `$4` (edge alignment) · EC-F2 struck (S5 static) · step 1 names the conditional `Eyebrow`. **Awaiting Approval 1.** |
| 2026-10-20 | fe-calendar S5 | **Approval 1 (Victor).** Preflight: every cited line verified on disk (envision :35/:39/:54 · calendar-vision :22 · concept legend :161 · ranges mockup `.must` :66 · PLAN-S2 :44-46/:60 · decisions :127 · ADR-011 :66 · interpretation :145 · seam :113 · week-view :228 · index.tsx :297 EmptyState · surface test :127 · `CalChip` + `Card` exported). **5 concept-board line fixes** (:56 connector · :61 future .4 · :52 grid · :88 open · :75 rec). **Preflight PASSED.** |
| 2026-10-20 | fe-calendar S5 | gate-2 independent critique **REVISE → 14 folded** (0 blockers; Card API fit, extraction, no cycles, surface timeout confirmed on disk) as **BR-CAL-S5-17** — every fix from a shipped precedent, none needing an owner call: G1 day Card flex sizing (DayCol) · G2 region inset sized to `shadow.resting` + negative margin · G3 opaque hollow nodes + concept `::before` connector geometry (6/row) · G4 connector opacity, no hex maths · G5 hours guards/padding/SR strings + inline bar width · G6 absent lane ≠ empty · G7 explicit open-time aria-label + MonthButton reset · G8 sibling-space sr suffixes + aria-hidden SLIPPING · G9 Eyebrow NOT extracted (definitions differ) · G10 `weekSpan` helper · G11 wording · G12 jsdom/[VG] tags + state classes + explicit borderWidth · G13 skeleton aria-hidden, 9 warns, 10 named groups · G14 superseded change-log phrase. **Awaiting Approval 2.** |
| 2026-10-21 | fe-calendar S5 | **Approval 2 → BUILT → Visual Gate PASS (Victor, "Proceed", 2026-10-21; no deviations).** TDD: calendar-shared extraction (agenda/week/year 104/104 unchanged) → `living-format` 4 → LivingView 26 → surface +5. Mutation: dropping the absent-lane guard fails the "ABSENT lane never makes the view empty" test (killed; restored from a copy). g2 code review REVISE → 9 folded (sr suffixes moved INSIDE the inline label — a flex-level space is dropped by browsers · lanes never blanked by `state` · NaN-fraction guard · list labels dropped (no double name) · empty-sentence guard · fixture streak names the real missed weekday · PastWeek/FutureWeek stories · + coverage tests). Visual Gate (26 cells): text AA ≥ 4.52 · graphics ≥ 3.36 · 0 page overflow · 0 clipped · axe 0; gate-caught: thread nodes crowded (streak grew) → streak hugs right · the review's "no tab stop while loading" broke axe scrollable-region-focusable → reverted (tabIndex 0 always). tsc 0 · eslint 0 (changed; 2 pre-existing agenda warnings) · @vida/ui **666/666** · @vida/web **687/687**. Currency → v13 spec + `_index` V13 · ui CLAUDE.md · web-client-runtime current-spec · slice-map S5 · seam-contract §A + §B · decisions · components. |
