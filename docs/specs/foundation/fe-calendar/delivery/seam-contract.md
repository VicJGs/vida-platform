# Seam-contract — fe-calendar (#19, Global Calendar · LIF-203)

> Entity Delivery Flow ② · Step 2. Three seams (slice-map planes): **(A)** the `@vida/ui` presentational range-renderer
> contracts (LOCAL types, data-prop, no `@vida/core`) · **(B)** the `apps/web` `useCalendar` fan-out + surface · **(C)**
> the `@vida/core` first-consumer reads (B calls C over the `ProviderRead` seam). Types are **PROPOSED** — ratified/
> refined per slice at each `/contract` step. Invariant: renderers RENDER + emit intents; **writes are owning-module
> capabilities (ADR-007/008)**. Honest-null everywhere a source is absent (ADR-011 §3.6 / deny-safe precedent).

## Shared local types (`@vida/ui`, intra-package — the `ViewState` precedent, no `@vida/core`/`@vida/types` import)

```ts
type CalState = 'loading' | 'empty' | 'error' | 'success'          // the ViewState canon, per-renderer (BR-2)
type Daypart  = 'morning' | 'afternoon' | 'evening'                // D1 — also minted in @vida/types for apps/web
// Purpose colour is USER DATA (hex), threaded as a prop — never a theme token.
interface CalChip { id: string; title: ReactNode; color?: string } // a dated item chip (purpose-coloured dot)
```

## A · `@vida/ui` range-renderer contracts (presentational · data-prop · React-19 ref-as-prop · fixtures-gated)

```ts
// — D4: CalendarView gains a headerless mode so the canvas frame owns the period title once (EC-2). —
interface CalendarViewProps<T> { /* …existing… */ hideHeader?: boolean }  // true → suppress its month title + nav

// — S2 · AgendaView (EC-3) —
interface AgendaItem { id: string; title: ReactNode; color?: string; time?: string; daypart: Daypart;
                       weight?: 'must' | 'can'; done?: boolean }
interface AgendaDay  { date: string; items: AgendaItem[] }          // date = 'YYYY-MM-DD' (TZ-safe, IR-4)
interface AgendaViewProps { days: AgendaDay[]; today?: string; state?: CalState
                            onToggleItem?: (id: string) => void     // INTENT — the owning module writes (EC-12)
                            'aria-label'?: string; ref?: Ref<HTMLDivElement> }

// — S3 · WeekView / Day (EC-4) —
interface TimedBlock { id: string; title: ReactNode; color?: string; startHour: number; endHour?: number; day: string }
interface WeekViewProps { days: string[]; allDay?: CalChip[]; blocks: TimedBlock[]; today?: string
                          range?: 'week' | 'day'; hours?: [number, number]; state?: CalState
                          'aria-label'?: string; ref?: Ref<HTMLDivElement> }

// — S4 · YearView (EC-5) —
interface YearDensity { date: string; level: 0 | 1 | 2 }           // 0 none · 1 has · 2 busy
interface YearViewProps { year: number; density: YearDensity[]; today?: string; state?: CalState
                          onPickMonth?: (month: number) => void     // INTENT (navigate)
                          'aria-label'?: string; ref?: Ref<HTMLDivElement> }

// — S5 · LivingView (EC-6..EC-10) — the signature, all data-prop; each lane degrades independently (honest-null) —
interface PurposeBudget { id: string; name: ReactNode; color: string; hours: number | null; fraction: number | null } // null ⇒ unmeasured (EC-6)
interface HabitThread   { id: string; name: ReactNode; color: string; days: ('kept'|'missed'|'future'|'today')[]; streak?: ReactNode }
interface LivingDay {
  date: string; kind: 'past' | 'today' | 'future'
  record?: ReactNode; done?: CalChip[]; focus?: ReactNode          // past
  live?: CalChip[]; openBlock?: { label: ReactNode; hint: ReactNode }; drift?: CalChip[] // today (⑤ = a chip w/ a slip flag)
  intent?: ReactNode; plan?: CalChip[]                             // future
}
interface LivingViewProps { weekLabel?: ReactNode; budget?: PurposeBudget[]; threads?: HabitThread[]; days: LivingDay[]
                            state?: CalState; onSlotOpenTime?: (date: string) => void  // INTENT only (EC-9/EC-12)
                            'aria-label'?: string; ref?: Ref<HTMLDivElement> }
```
All renderers: no write control; `on*` are **intents**; `state` is a PROP (BR-2); LOCAL types; Visual-Gate'd with
fixtures across preset×mode×widths (EC-11/13/14).

## B · `apps/web` surface + the `useCalendar` fan-out (the deferred canvas-adapter hook — first consumer, S7)

```ts
type Range = 'year' | 'month' | 'week' | 'day' | 'agenda' | 'living'

// UI-only Zustand (AR-4 pattern; NOT persisted here — a saved default range = a user_preferences write = owning cap).
interface CalendarUIState { range: Range; focusedDate: string; setRange(r: Range): void; setFocusedDate(d: string): void }

// The hook: React Query over ProviderRead; returns the per-range renderer feed (each field honest-null on absence).
function useCalendar(range: Range, focusedDate: string): {
  state: CalState
  month?: CalChip[]                       // EC-2 — buildDashboard per-day (D2) mapped to chips
  agenda?: AgendaDay[]                    // EC-3 — buildDashboard per-day + daypart mapping (D1)
  week?: { allDay: CalChip[]; blocks: TimedBlock[] }  // EC-4
  year?: YearDensity[]                    // EC-5
  living?: { budget: PurposeBudget[]; threads: HabitThread[]; days: LivingDay[] } // EC-6..EC-10
}
// Each provider is read as `useQuery({ queryKey, queryFn: provider })`, provider satisfies ProviderRead<T>.
// Derivations live HERE (record-lines, thread states, budget fraction, open-time, slip-flag) — never in @vida/ui.
```
Surface = `CalendarSurface` composing `CanvasView` (eyebrow · period title per `range` · switcher+nav in `actions`) →
dispatches `useCalendar(...)` output to the S1–S5 renderer for the active range. Intents from renderers route to the
owning module's capability (ADR-008) — M1 may no-op an absent capability (deny-safe), never fabricate a write.

## C · `@vida/core` first-consumer reads (S6 — thin, additive, no schema change; honest-null on absence)

```ts
// Each returns a ProviderRead-shaped promise consumed by B. All reads; none write.
habits.getHabitCompletions(from: string, to: string): Promise<HabitCompletionRow[]>     // EC-7 (habit_completions, YYYY-MM-DD)
planner.getStudyAvailability(range: { from: string; to: string }): Promise<StudyAvailabilityRow[]> // EC-9 (study_availability)
tasks.getSlipping(asOf: number): Promise<{ id: string; title: string; dueDate: string }[]>  // EC-10 (derive scheduled_date vs due_date vs completed_at — D5, no history)
// EC-6 — Purpose advertises a queryable budget measure via the shipped measurement-source registry (ADR-011 §3.6):
purposes.registerMeasures(reg: MeasurementSourceRegistry): void  // reg.advertise('purpose_budget:<id>', () => hours|null) — unadvertised ⇒ null (honest)
// EC-2/EC-3 — REUSE (no new code): journals.buildDashboard(registry, date, selection?) per day (D2).
```

## Open at build (ratify per slice)
- The exact `Daypart` clock-bands (D1) + the all-day-task default band — settle at S2 `/contract`.
- Whether `tasks.getSlipping` is a tasks-service method or a derivation folded into `useCalendar` from a plain
  `tasks` list read — settle at S6 (both honest-null; no schema either way).
- `onToggleItem`/`onSlotOpenTime` target capabilities — M1 wiring is deny-safe no-op until the owning capability
  ships; the intent surface is fixed here so the renderer never changes when it lands.
