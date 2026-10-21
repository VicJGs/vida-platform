# Spec: component:ui-2-platform-views · V13 — living-view
<!-- type: component (unit sub-spec of ui-2-platform-views) -->
Status: **SHIPPED** (fe-calendar #19 S5, LIF-203, 2026-10-21) — promoted from the gated PLAN (§XXIX).
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Parent: docs/specs/components/ui-2-platform-views/_index.md (shared BR-1..BR-6).
Delivery: docs/specs/foundation/fe-calendar/delivery/ (interpretation · envision · slice-map · seam-contract ·
PLAN-S5-living-renderer.md = the gate/audit record — BR-CAL-S5-1..17, no deviations).

## 1. Identity
V13 `living-view` — the Global Calendar's signature **Living** range (#19): a **purpose-budget** Card (④), a **habit-threads**
Card (②) and the **7 day `Card`s** whose look follows **temporal asymmetry** — past = record · today = live (③ open time,
⑤ slip flag) · future = intention `[FACT: calendar-vision.md §1.3; envision EC-6..EC-10, EC-14]`. **NOT a `VIEW_LAYOUT`
renderer** (a calendar *range*, dispatched by the #19 `CalendarSurface`).
- **Presentational + read-only.** Every value arrives pre-derived + pre-ordered (S7 `useCalendar`); the one intent is
  `onSlotOpenTime` (render-when-handler; M1 passes none — deny-safe).
- **Fidelity rule:** the approved greybox governs where it shows something; where envision.md:54 says it DEFERRED a matter
  (thread ink) the vision + concept board govern; EC-13 (AA MUST) outranks greybox ink.

## 2. Business Rules (BR-LV-*, = PLAN BR-CAL-S5-1..17 as built)
- **BR-LV-1 · Arrange, never derive** — no sort, count or time computation.
- **BR-LV-2 · ④ Budget.** Entry = purpose dot · name · 52px accent bar (`fraction` clamped [0,1], inline `width %`) · hours
  via `internal/living-format.ts` `formatHours` ("6h" · "2h05" · SR "2 hours 5 minutes"). **0** → "0h · none yet", name +
  hours `$colorBrandEmphasis` (the greybox red = `$colorSignalDanger` fails AA as text → EC-13 + decisions.md:127 → the S2
  MUST-tag token). **null** → "unmeasured", no fill (ADR-011 §3.6 — never 0). **stale** → last-known + " · as of last read"
  (ADR-011 §3.6 outage; forward vocabulary — no M1 producer). Non-finite / negative hours → unmeasured + warn.
- **BR-LV-3 · ② Threads.** Row = name · 7 equal `flex:1` node cells · right-aligned streak (wraps below at 375). Nodes 11px,
  1.5px ring (explicit `borderWidth`): kept filled · missed dotted hollow · today solid hollow · future hollow @ .4; hollow
  nodes filled `$colorSurfacePrimary`. Connectors (6/row) = the concept's 2px line, purpose colour @ .33 (`opacity`, no hex
  maths), drawn under the nodes — DOC-FIXED (calendar-vision:22 "unbroken lines"; concept legend :161; EC-F4 :39; envision
  :54 deferred thread ink). Nodes/connectors are user hex → no contrast gate (S2 rule); the row reads as ONE sr sentence
  ("Read 20 min: kept Mon, Wed; missed Tue; today Thu; upcoming Fri, Sat, Sun — broke Tue · back on").
- **BR-LV-4 · Day Cards (EC-8/EC-14).** `Card` status by kind: past `faded` · today `warm` · future `neutral`; header =
  eyebrow weekday ("Thu · Today") + serif `$subheading` tabular number (paired line-height); today accent. Named via
  `aria-labelledby` → one sr span ("Thu 8, today"), visual header `aria-hidden`. Sizing `flexGrow 1 · flexShrink 1 ·
  flexBasis 0 · minWidth 140`; Cards grow — never clip.
- **BR-LV-5 · Content.** Past: serif italic record (flush — no rule; the greybox) · struck done chips + sr "(done)" · focus
  eyebrow last. Today: ONE ordered `entries[]` — items (time · dot · title; `slipping` → aria-hidden "⤻ SLIPPING" tag, tag
  `$colorBrandEmphasis`, glyph `$colorSignalDanger` graphic, sr ", slipping") and the open block (dashed `$colorBrandEmphasis`
  box, read-only; with a handler a `<button>` with explicit `aria-label` "{label}, {hint}"). Future: italic intent + muted plan.
  **SR suffixes live INSIDE the inline label Text** (a whitespace node between flex items is dropped → "Title(done)"); the
  visible time is `aria-hidden`, the label carries it once.
- **BR-LV-6 · Region.** The 7 Cards sit in a keyboard-reachable `role="region"` "Week columns" (`tabIndex 0` ALWAYS — the
  loading skeleton still scrolls; axe-caught), `paddingTop $8 · paddingBottom $20 · paddingHorizontal $12` + `marginHorizontal
  -12` (shadows inside the clip, edges aligned). 7×140+6×8 = 1028 → fits 1440, scrolls at 768/375; today is not auto-scrolled
  (WeekView parity).
- **BR-LV-7 · Lanes degrade alone (NEEDS-5).** Absent = "… unavailable right now." · `[]` = "No purposes yet." / "No habits
  tracked yet." Lanes are never blanked by `state` — only day bodies are.
- **BR-LV-8 · States.** loading = skeleton bars + 7 `aria-hidden` skeleton Cards, `aria-busy` · error = `role="status"`
  `Message` (or slot) · empty (explicit, or success where days are bare AND both lanes are `[]`; an ABSENT lane is unknown,
  never "nothing") = the designed layout + sr "Nothing this week." (or the slot, replacing it). 9 dev-warns + `warnMissingName`.
- **BR-LV-9 · Tokens.** DIRECT semantic tokens; user hex for dots/nodes/connectors; no motion (EC-F2 later, reduced-motion gated).

## 3. Contract (as shipped)
```ts
export type ThreadState = 'kept' | 'missed' | 'today' | 'future'
export interface PurposeBudget { id: string; name: string; color: string; hours: number | null; fraction: number | null; stale?: boolean }
export interface HabitThread { id: string; name: string; color: string; days: readonly ThreadState[]; streak?: ReactNode }
export interface LivingItem extends CalChip { time?: string; slipping?: boolean }
export type TodayEntry = { kind: 'item'; item: LivingItem } | { kind: 'open'; label: string; hint: string }
export interface LivingDay { date: string; kind: 'past' | 'today' | 'future'; record?: ReactNode; done?: readonly LivingItem[]
  focus?: ReactNode; entries?: readonly TodayEntry[]; intent?: ReactNode; plan?: readonly LivingItem[] }
export interface LivingViewProps { days: readonly LivingDay[]; weekLabel?: string; budget?: readonly PurposeBudget[]
  threads?: readonly HabitThread[]; onSlotOpenTime?: (date: string) => void; state?: ViewState; empty?: ReactNode
  error?: ReactNode; ref?: Ref<HTMLDivElement>; 'aria-label'?: string; 'aria-labelledby'?: string }
```
Barrel: `LivingView`, `LivingViewProps`, `LivingDay`, `LivingItem`, `TodayEntry`, `PurposeBudget`, `HabitThread`, `ThreadState`.
Refinements vs the proposed seam: R1 `LivingItem` (time · slipping) · R2 today = one ordered `entries[]` (the greybox
interleaves) · R3 `ThreadState` + `name: string` · R4 readonly / slots / labelledby · R5 `weekLabel: string` · `stale?`.
Also S5: **`internal/calendar-shared.ts`** (`SR_ONLY` · `DATE_KEY` · `parseLocalDate`) extracted at the rule of three —
agenda/week/year import it (no behaviour change); `Eyebrow` stays per-file (the definitions differ on line-height).

## 4. Acceptance (met)
- [x] BR-LV-1..9 — jsdom: `living-view.test.tsx` 26 + `living-format.test.ts` 4 (TZ-forced; colours/line-height via
  reference-element classes); agenda/week/year suites unchanged; surface +4 (dispatch · deny-safe open time · Sunday start ·
  past week) + 1 future week. Stories: Living · UnmeasuredAndUnavailable · OpenTimeWithHandler · PastWeek · FutureWeek ·
  Loading · Empty · Failed.
- [x] Visual Gate PASS (Victor, 2026-10-21; Brave, real `CalendarSurface`, 26 cells: 3 presets × L/D × 375/768/1440 + past
  week + future week + Sunday + lanes × L/D + 3 states): text AA min **4.52** · bar fill ≥ **4.39** · open border ≥ **6.47** ·
  warm edge / ⤻ glyph ≥ **3.36** · 0 page overflow · 0 clipped Cards · edges aligned · region scrolls 375/768, fits 1440 ·
  open button 67px + ring + hover · axe 0 · 0 pageerrors. Gate-caught: thread nodes crowded (streak grew) → streak hugs right ·
  loading region lost its tab stop (axe) → always 0. Feel rows recorded: EC-F1 voice (serif italic lines) · EC-F4 thread ink
  (connector .33; future rings ≈1.5–1.8:1, user hex, info-only).

## 5. Deferred / homed
- Live data (record lines, thread states, budget, open time, slip flag, entries order — the open block placed by its time;
  `stale` once a last-known cache exists) → S7 `useCalendar`. Today-pulse / thread-draw motion → EC-F2. The "moved N×" drift
  count → a Tasks reschedule ledger (D5).

## 6. Change log
| Date | Session | Change |
|------|---------|--------|
| 2026-10-21 | fe-calendar #19 S5 | V13 authored at currency from the gated PLAN: BR-LV-1..9 + contract as shipped; no deviations (the flag colour + connector were doc-resolved); gate-caught fixes (thread spread · region tab stop). |
