# Seam-contract — fe-calendar (#19, Global Calendar · LIF-203)

> Entity Delivery Flow ② · Step 2. Three seams (slice-map planes): **(A)** the `@vida/ui` presentational range-renderer
> contracts (LOCAL types, data-prop, no `@vida/core`) · **(B)** the `apps/web` `useCalendar` fan-out + surface · **(C)**
> the `@vida/core` first-consumer reads (B calls C over the `ProviderRead` seam). Types are **PROPOSED** — ratified/
> refined per slice at each `/contract` step. Invariant: renderers RENDER + emit intents; **writes are owning-module
> capabilities (ADR-007/008)**. Honest-null everywhere a source is absent (ADR-011 §3.6 / deny-safe precedent).

## Shared local types (`@vida/ui`, intra-package — the `ViewState` precedent, no `@vida/core`/`@vida/types` import)

```ts
type CalState = 'loading' | 'empty' | 'error' | 'success' // the ViewState canon, per-renderer (BR-2)
type Daypart = 'morning' | 'afternoon' | 'evening' // D1 — also minted in @vida/types for apps/web
// Purpose colour is USER DATA (hex), threaded as a prop — never a theme token.
interface CalChip {
  id: string
  title: ReactNode
  color?: string
} // a dated item chip (purpose-coloured dot)
```

## A · `@vida/ui` range-renderer contracts (presentational · data-prop · React-19 ref-as-prop · fixtures-gated)

```ts
// — D4: CalendarView gains a headerless mode so the canvas frame owns the period title once (EC-2). —
interface CalendarViewProps<T> {
  /* …existing… */ hideHeader?: boolean
} // true → suppress its month title + nav

// — S2 · AgendaView (EC-3) — SHIPPED (ratified + refined: readonly arrays, empty?/error? slots; v10-agenda-view.md) —
interface AgendaItem {
  id: string
  title: ReactNode
  color?: string
  time?: string
  daypart: Daypart
  weight?: 'must' | 'can'
  done?: boolean
} // done undefined = not completable
interface AgendaDay {
  date: string
  items: readonly AgendaItem[]
} // date = 'YYYY-MM-DD' (TZ-safe, IR-4)
interface AgendaViewProps {
  days: readonly AgendaDay[]
  today?: string
  state?: CalState
  onToggleItem?: (id: string) => void // INTENT — the owning module writes (EC-12); absent ⇒ no control
  empty?: ReactNode
  error?: ReactNode
  'aria-label'?: string
  'aria-labelledby'?: string
  ref?: Ref<HTMLDivElement>
}

// — S3 · WeekView / Day (EC-4) — SHIPPED (ratified + refined: `range` DROPPED — days.length decides Week vs Day;
//   readonly arrays, empty?/error? slots, aria-labelledby, timeFormat; CalChip stays UNDATED; v11-week-view.md) —
interface TimedBlock {
  id: string
  title: ReactNode
  color?: string
  day: string
  startHour: number
  endHour?: number
}
interface WeekViewProps {
  days: readonly string[]
  blocks: readonly TimedBlock[]
  allDay?: readonly CalChip[]
  today?: string
  hours?: readonly [number, number] // a MINIMUM window, auto-extends
  timeFormat?: '12h' | '24h'
  state?: CalState
  empty?: ReactNode
  error?: ReactNode
  'aria-label'?: string
  'aria-labelledby'?: string
  ref?: Ref<HTMLDivElement>
}

// — S4 · YearView (EC-5) — SHIPPED (ratified + refined: readonly density, empty?/error? slots, aria-labelledby,
//   weekStartsOn [BR-16], onPickMonth index pinned 0–11; v12-year-view.md). The drill is NAVIGATION — the surface wires it
//   in M1 (unlike the deny-safe-absent write intents) and focuses the Month grid after it (CalendarView tabIndex, D-S4-DEV-2). —
interface YearDensity {
  date: string
  level: 0 | 1 | 2
} // 0 none · 1 has · 2 busy (S7 derives)
interface YearViewProps {
  year: number
  density: readonly YearDensity[]
  today?: string
  weekStartsOn?: 0 | 1
  onPickMonth?: (month: number) => void // INTENT (navigate), 0–11
  state?: CalState
  empty?: ReactNode
  error?: ReactNode
  'aria-label'?: string
  'aria-labelledby'?: string
  ref?: Ref<HTMLDivElement>
}

// — S5 · LivingView (EC-6..EC-10) — SHIPPED (ratified + refined R1–R5: LivingItem time/slipping · today = ONE ordered
//   entries[] (the greybox interleaves items + the open block) · ThreadState + name:string · readonly/slots/labelledby ·
//   weekLabel:string · stale? (ADR-011 §3.6 outage, forward vocabulary); v13-living-view.md). Each lane degrades alone. —
interface PurposeBudget {
  id: string
  name: string
  color: string
  hours: number | null
  fraction: number | null
  stale?: boolean
}
type ThreadState = 'kept' | 'missed' | 'today' | 'future'
interface HabitThread {
  id: string
  name: string
  color: string
  days: readonly ThreadState[]
  streak?: ReactNode
}
interface LivingItem extends CalChip {
  time?: string
  slipping?: boolean
} // ⑤ = an item with the slip flag
type TodayEntry = { kind: 'item'; item: LivingItem } | { kind: 'open'; label: string; hint: string }
interface LivingDay {
  date: string
  kind: 'past' | 'today' | 'future'
  record?: ReactNode
  done?: readonly LivingItem[]
  focus?: ReactNode // past
  entries?: readonly TodayEntry[] // today, provider-ordered
  intent?: ReactNode
  plan?: readonly LivingItem[] // future
}
interface LivingViewProps {
  days: readonly LivingDay[]
  weekLabel?: string
  budget?: readonly PurposeBudget[]
  threads?: readonly HabitThread[]
  onSlotOpenTime?: (date: string) => void // INTENT only
  state?: CalState
  empty?: ReactNode
  error?: ReactNode
  'aria-label'?: string
  'aria-labelledby'?: string
  ref?: Ref<HTMLDivElement>
}
```

All renderers: no write control; `on*` are **intents**; `state` is a PROP (BR-2); LOCAL types; Visual-Gate'd with
fixtures across preset×mode×widths (EC-11/13/14).

## B · `apps/web` surface + the `useCalendar` fan-out (the deferred canvas-adapter hook — first consumer, S7)

```ts
type Range = 'year' | 'month' | 'week' | 'day' | 'agenda' | 'living'

// UI-only Zustand (AR-4 pattern; NOT persisted here — a saved default range = a user_preferences write = owning cap).
interface CalendarUIState {
  range: Range
  focusedDate: string
  setRange(r: Range): void
  setFocusedDate(d: string): void
}

// The hook: React Query over ProviderRead; returns the per-range renderer feed (each field honest-null on absence).
// S3 amendment: the week start is the user's `week_starts_on` (read from preferences-store) — useCalendar takes it so
// it never re-hard-codes Monday (the surface root-fixed `mondayOf` → `weekStartOf` in S3, PLAN-S3 BR-16).
function useCalendar(
  range: Range,
  focusedDate: string,
  weekStartsOn: 0 | 1,
): {
  state: CalState
  month?: CalChip[] // EC-2 — buildDashboard per-day (D2) mapped to chips
  agenda?: AgendaDay[] // EC-3 — buildDashboard per-day + daypart mapping (D1)
  week?: { allDay: CalChip[]; blocks: TimedBlock[] } // EC-4
  year?: YearDensity[] // EC-5
  living?: { budget?: PurposeBudget[]; threads?: HabitThread[]; days: LivingDay[] } // EC-6..EC-10 — lanes OPTIONAL:
  //   absent = the source is unavailable (honest-null lane); S7 orders today's entries[] (the open block placed by its
  //   time) and owns any last-known cache behind `stale` (until then `stale` is never set)
}
// Each provider is read as `useQuery({ queryKey, queryFn: provider })`, provider satisfies ProviderRead<T>.
// Derivations live HERE (record-lines, thread states, budget fraction, open-time, slip-flag) — never in @vida/ui.
```

Surface = `CalendarSurface` composing `CanvasView` (eyebrow · period title per `range` · switcher+nav in `actions`) →
dispatches `useCalendar(...)` output to the S1–S5 renderer for the active range. Intents from renderers route to the
owning module's capability (ADR-008) — M1 OMITS the handler for an absent capability (deny-safe — no dead control),
never fabricates a write.

## C · `@vida/core` first-consumer reads (S6 — thin, additive, no schema change; honest-null on absence)

```ts
// S6 SHIPPED (grounded — PLAN-S6-first-consumer-reads.md §2): ONE new read; the rest were already answered.
// Each is consumed by B as a ProviderRead<T> (() => Promise<T>) — plain service methods, NOT ViewProviderRegistry providers.
// EC-7 — NEW (BR-HB-35): every active habit (sort_order, id) × every day of [from,to], one ledger query.
habits.getCompletionGrid(range: { from: string; to: string }): Promise<{ habit: Habit; days: { date: string; scheduled: boolean; count: number; done: boolean }[] }[]>
// EC-9 — RATIFIED (no planner service exists; sessions owns availability): weekly windows + dated exceptions.
sessions.listAvailability(): Promise<Availability[]>            // day_of_week · start/end HH:MM · is_available
sessions.listAvailabilityExceptions(): Promise<AvailabilityException[]>  // exception_date · is_available · times
// EC-10 — RATIFIED (tasks current-spec:286-289 — "overdue reads ship as listTasks({open:true, due_before})"):
tasks.listTasks({ open: true }): Promise<TaskRow[]>             // due_date · scheduled_date · completed_at → the D5 slip derive (S7)
// EC-6 — HONEST-NULL in M1 (D-S6-DEV-1): NO advertise (the registry is sync+scalar [0,1]; hours-per-purpose undefined).
purposes.listPurposes(): Promise<PurposeRow[]>                  // name ← title · color absent (D-S6-DEV-2) · hours/fraction null
// EC-2/EC-3 — REUSE (no new code): journals.buildDashboard(registry, date, selection?) per day (D2).
```

**S7 derivation notes (from S6):** (a) open time = the weekly windows on the focused week's dates − that date's
exceptions; (b) slip = `listTasks({open:true})` rows with `due_date < today` or `scheduled_date > due_date`, limited to
the focused week (the read is unwindowed); (c) budget = `listPurposes()` → `name ← title`, colour absent, hours/fraction
null → "unmeasured"; the hours + colour measure is a borrowed leg → **fe-purposes-and-goals (LIF-195)** ELC (prove the
Linear edge at S7 close); (d) ThreadState per BR-CAL-S6-7: `done` → kept · scheduled ∧ ¬done ∧ past → missed · today ·
future · ¬scheduled ∧ ¬done → **off** (a new V13 state, rendered + Visual-Gated in S7, D-S6-DEV-3); V13 `color` becomes
optional (D-S6-DEV-2).

## Open at build (ratify per slice)

- ~~The exact `Daypart` clock-bands (D1) + the all-day-task default band — settle at S2 `/contract`.~~ **SETTLED
  (S2, 2026-10-18):** `<12:00` morning · `12:00–17:59` afternoon · `≥18:00` evening (grounded in the approved
  greybox: 09:30→Morning, 17:00→Afternoon); an all-day task defaults to **morning**, configurable at `useCalendar`.
  Applied by `useCalendar` (S7), never by the renderer. Canonical `DAYPART` minted in `@vida/types` `common.ts`.
  [PLAN-S2-agenda-renderer.md §3 · v10-agenda-view.md §3]
- ~~Whether `tasks.getSlipping` is a tasks-service method or a derivation folded into `useCalendar` from a plain
  `tasks` list read — settle at S6 (both honest-null; no schema either way).~~ **CLOSED (S6, 2026-10-21) by the tasks
  docs:** "overdue reads ship as `listTasks({ open:true, due_before })`" [docs/modules/tasks/current-spec.md:286-289] →
  derived in `useCalendar` (S7) over `listTasks({open:true})`; no `getSlipping`.
- `onToggleItem`/`onSlotOpenTime` target capabilities — **M1 wiring = the handler is ABSENT (deny-safe) until the
  owning capability ships** (amended S2, D-S2-DEV-3: a no-op handler renders dead focusable controls; absent ⇒ the
  renderer's read-only state). The intent surface is fixed here so the renderer never changes when it lands — S7/the
  owning capability just passes the handler.

## S7 — SHIPPED (2026-10-22, the entity close; PLAN-S7-entity-close.md)

- **B realised:** `useCalendar(range, focusedDate, weekStartsOn, {enabled,timeFormat,now})` (`apps/web/src/app/calendar/use-calendar.ts`) over the pure `calendarQueries` + `calendar-derive.ts`; the live services come from `db/composition-root.ts` `composeServices` (sessions · habits · tasks · purposes · relationships + 3 dueIn lanes).
- **Due-work feed = `sessions.dueIn`** (D-S7-DEV-1 — supersedes the `buildDashboard` per-day rows above for Month/Agenda/Week/Year): two calls per span (UTC bounds for date lanes · local bounds for planned blocks); tasks placed via the `listTasks({open:true})` join on each of due/scheduled. `review.getDue` is NOT a direct read (G2 — owning modules' dueIn lanes).
- **V13 amended:** `color?` (absent → muted) + `ThreadState 'off'`. **CalendarView:** `, today` label + controlled unfurl. **`pulseKey`** on the 5 renderers + `RangeTransition`.
