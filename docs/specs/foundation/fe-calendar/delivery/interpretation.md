# Interpretation — fe-calendar (X-CUT · Global Calendar, unit #19, LIF-203)

> Entity Delivery Flow ② · Step 1 (make the implicit explicit before decomposing). No-Guessing: every
> claim is `[FACT: path:line]`, `[INTERPRETATION]`, or `[UNKNOWN]`. Baseline (Step 0) **refreshed**
> `docs/infrastructure/web-client-runtime/current-spec.md` (added the CODEC frontend-seams section +
> #19 downstream); confirmed `docs/modules/journals/current-*`, `docs/ui/token-pipeline/current-*`, and the
> `ui-2-platform-views` per-view specs (`v4-calendar-view.md`, LIF-230-refined) current.
>
> **The entity.** The **Global Calendar** — the cross-module "book read by date". NOT a scheduling grid: a
> **read-only lens** over every module's dated data, in **6 ranges** (Year · Month · Week · Day · Agenda · Living)
> with a signature **Living** lens. Design is **Victor-approved**: `calendar-vision.md` + 2 mockups.
> `[FACT: .claude/tasks/fe-calendar.md:12; docs/specs/foundation/fe-calendar/calendar-vision.md]`

---

## DEPENDENCIES — every upstream

| Upstream                                                                         | What it gives the Calendar                                                                                                                                                        | Cite                                                                                                                |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `@vida/ui` `CalendarView<T>` (**CONSUMED** — the shipped month grid)             | the Month range, already LIF-230-refined + **TZ-safe** (`'YYYY-MM-DD'` string key, never `new Date(str)`); controlled `month`/`onMonthChange`, `maxPerDay` "+K more", `ViewState` | `[FACT: packages/ui/src/components/calendar-view.tsx:23-48]`                                                        |
| `@vida/ui` `CanvasView` immersive frame (**CONSUMED** — hosts #19)               | the surface shell the multi-range calendar renders inside                                                                                                                         | `[FACT: packages/ui/src/components/canvas-view.tsx; docs/specs/foundation/fe-codec-canvas-board/s1-canvas-view.md]` |
| `@vida/ui` primitives + pattern-kit                                              | `Card`/`Text`/`View`/`Button` · `EmptyState` · `ViewState`+`warnMissingName` (`internal/data-view`) · `useReducedMotion`                                                          | `[FACT: packages/ui/src/components/calendar-view.tsx:4; hooks/use-reduced-motion.ts]`                               |
| Theme / preset tokens                                                            | the editorial "book/journal" voice (serif title, tabular figures, hairline grid, accent-dot chips)                                                                                | `[FACT: calendar-view.tsx (LIF-230 P5); packages/ui/src/provider.tsx]`                                              |
| **ProviderRead convention** (`apps/web`)                                         | `type ProviderRead<T> = () => Promise<T>` — the "no direct cross-module tables" read seam; consumed via `useQuery({queryFn: provider})`                                           | `[FACT: apps/web/src/providers/provider-read.ts:15]`                                                                |
| **Canvas adapter** (`apps/web`)                                                  | `toCanvasHeader` · `resolveMeasureProgress` + the **DEFERRED `useCalendar(spaceId)` hook #19 builds (first consumer)**                                                            | `[FACT: apps/web/src/canvas/adapter.ts:44,81; :22-24 (useCalendar deferred to first consumer)]`                     |
| Review foundation (**CONSUMED, never imported into @vida/ui**)                   | `getDue(range, opts?) → ReviewDueItem[]` + `dueIn(objectId, at?) → boolean`; `DueRange {from,to}` Unix-ms inclusive                                                               | `[FACT: packages/core/src/foundation/review/types.ts:41,47,115,117; engine.ts:232]`                                 |
| **Journals `buildDashboard`** (**CONSUMED — the agenda fan-out already exists**) | per-module **`dueIn({from:date,to:date})`** cross-module fan-out → `{summary, agenda}`, per-section degrade (IR-d)                                                                | `[FACT: packages/core/src/services/journals/dashboard.ts:41,51-56]`                                                 |
| `habit_completions` (move ②)                                                     | `completed_date` (YYYY-MM-DD) · `UNIQUE(habit_id, completed_date)` · indexed — the habit-thread source                                                                            | `[FACT: packages/core/src/db/schema/habits.ts:93-112,136]`                                                          |
| `study_availability` (move ③)                                                    | `day_of_week` 0–6 · `start_time`/`end_time` HH:MM — the open-time source                                                                                                          | `[FACT: packages/core/src/db/schema/foundation/scheduling.ts:44-55]`                                                |
| `contributions` (move ④)                                                         | `goal_type` · `contributor_type` (polymorphic) · `contribution_percentage` 0–100 — a **WEIGHT only, never a copied value (PG-10)**                                                | `[FACT: packages/core/src/db/schema/foundation/purpose.ts:33-41]`                                                   |
| `tasks` (Agenda + move ⑤)                                                        | `due_date` (calendarDate, **no clock time**) · `scheduled_date` · `completed_at` · `kind`                                                                                         | `[FACT: packages/core/src/db/schema/tasks.ts:60,64,27]`                                                             |

---

## NEEDS — preconditions to function

1. **The two-home split is load-bearing (vision §3).** `@vida/ui` renderers are **presentational, state-as-prop**
   — they cannot import `@vida/core` or read modules. The cross-module reads + derivations live in `apps/web`
   (the `useCalendar` hook) and arrive at the renderers **as data props**. Every renderer must be Visual-Gate-able
   standalone with fixtures. `[FACT: calendar-vision.md:32-40; provider-read.ts:9-15]`
2. **No `@vida/core`/`@vida/types` import in the `@vida/ui` renderers.** Types LOCAL (the `CalendarView` /
   `ViewState`-local precedent). `[FACT: calendar-view.tsx:23-48]`
3. **Read-only invariant (ADR-007).** Every range RENDERS; it never writes. Check-a-box / move-an-event /
   slot-open-time = a **write = the owning module's capability (ADR-008)**, composed in. The calendar **emits
   intents**, the module mutates. `[FACT: calendar-vision.md:28-30]`
4. **TZ-safe dates everywhere.** Every range inherits `CalendarView`'s B1 pattern — a `'YYYY-MM-DD'` string key
   used as-is; a `Date` formatted _locally_ to `yyyy-MM-dd`. Never `new Date('YYYY-MM-DD')` (UTC-midnight
   off-by-one in Brasília UTC−3). `[FACT: calendar-view.tsx (B1 TZ-safe keying)]`
5. **Per-section honest degrade.** `buildDashboard` already degrades a failing module's agenda section without
   failing the day (IR-d). The Living lens — 5 independent cross-module moves — must degrade **per move**: one
   unavailable source greys that lane, never blanks the calendar. `[FACT: dashboard.ts:6-9,51-56]`
6. **Reduced-motion** gates any range-transition / thread-draw / today-pulse animation (the codec primitive).
   `[FACT: packages/ui/src/hooks/use-reduced-motion.ts]`

---

## ORGANIZATION — OWNS vs CONSUMES vs DELEGATES

- **OWNS:**
  - **(@vida/ui, net-new presentational renderers):** the 5 non-Month ranges — **Week/Day** time-column ·
    **Year** density overview · **Agenda** daypart-grouped actionable list · **Living** layout (record/today/
    intention columns · habit-thread rows · open-time blocks · purpose dots · drift flags) — all from data props,
    with per-region terminal states + reduced-motion.
  - **(apps/web, the Global Calendar surface):** the `useCalendar(spaceId)` hook (first consumer) — the
    cross-module **ProviderRead fan-out + derivation** of the record-lines / threads / budget / open-time / drift;
    the range switcher (Zustand UI-only: active range, focused date); `CanvasView` composition via the canvas adapter.
- **CONSUMES:** shipped `CalendarView` (Month) · `CanvasView` frame + canvas adapter · `ProviderRead` convention ·
  theme preset tokens · the backend read seams (`review.getDue/dueIn`, `journals.buildDashboard`,
  `habit_completions`, `study_availability`, `contributions`, `tasks`).
- **DELEGATES:** **all writes** → owning-module capabilities (ADR-008) · the already-built cross-module
  **agenda/due fan-out** → `journals.buildDashboard` (reuse, do not re-implement) · spaced-review due → the review engine.

---

## IMPLICIT RULES — surfaced hidden invariants

- **IR-1 · Month is DONE; the other 5 ranges are net-new.** `CalendarView` ships the Month grid (LIF-230-refined,
  tested, Visual-Gate PASS). #19 **reuses** it and builds Week/Day/Agenda/Year/Living as new renderers — it does
  **not** rebuild Month. `[FACT: calendar-view.tsx; calendar-vision.md:19,43-47]`
- **IR-2 · The agenda/due fan-out already exists — reuse `buildDashboard`.** `buildDashboard` assembles each
  module's `dueIn({from,to})` into `{summary, agenda}` for a **single date**. The **Agenda range** is the
  presentational face of this existing data; #19 should feed the Agenda renderer from `buildDashboard`, not author
  a parallel fan-out. ⚠ **A multi-day range (Week/Month/Living) needs a range-shaped builder** — either call
  `buildDashboard` per-day (N calls) or add a `buildDashboardRange(from,to)` to journals (a **backend touch**).
  Decision owed at Decomposition. `[FACT: dashboard.ts:41,51-56]`
- **IR-3 · Drift flag (move ⑤) has NO backing data.** `tasks` carries `due_date`/`scheduled_date`/`completed_at`
  but **no reschedule/snooze/defer history** — "a Must-do pushed N×" cannot be derived from the current schema.
  ⚠ Move ⑤ is therefore either (a) **deferred** (built when a reschedule ledger exists), or (b) requires a
  **schema amendment + write-path capture = backend, out of this ② unit**. Decision owed at the gate (the
  canvas-reader IR-9 precedent). `[FACT: packages/core/src/db/schema/tasks.ts:60,64,27 — no reschedule column]`
- **IR-4 · Purpose budget (move ④) is a DERIVATION, not a read.** `contributions` stores only the **weight**
  (`contribution_percentage`, PG-10 — never a copied value). "Hours this week by the purpose each block serves"
  must be **derived** by joining the weight to actual time/session data (sessions / task time logs) — there is no
  "hours-per-purpose" stored anywhere. ⚠ Whether this derivation is in-scope at M1 (and whether a
  `contributions` ProviderRead method exists) is owed at the gate. `[FACT: purpose.ts:33-41,8 (PG-10 weight-only)]`
- **IR-5 · No canonical cross-module "daypart".** The Agenda groups by **Morning/Afternoon/Evening** (vision §1.2),
  but `time_of_day` is defined **per-module and divergent**: `ROUTINE_TIME_OF_DAY=['morning','afternoon','evening']`
  vs `HABIT_TIME_OF_DAY=[...,'anytime','whole_day']`. There is no shared `Daypart` enum. ⚠ #19 must either define a
  canonical `Daypart` (in `@vida/types`) or derive dayparts from clock time — decision owed. `[FACT: packages/types/src/routine.ts:16; habit.ts:26]`
- **IR-6 · "Timed vs all-day" is source-dependent.** The Agenda splits **timed + all-day** (vision §1.2), but
  **tasks have no clock time** (`due_date` is a calendar date) and habits/routines carry a **daypart, not a clock
  time**. Only sources with real `start_time` (study availability HH:MM, ICS events) are "timed"; tasks/habits are
  all-day/dayparted. The renderer must not assume every item has a time. `[FACT: tasks.ts:60; scheduling.ts:47; habit.ts:26]`
- **IR-7 · Temporal asymmetry binds the Living lens.** past = record (auto-composed "how it went" + completions) ·
  today = live · future = intention. The same cell renders differently by its position relative to today — a
  rendering rule, not three components. `[FACT: calendar-vision.md:26]`
- **IR-8 · First consumer builds the provider methods.** `useCalendar` is deferred "to the first consumer" (#19).
  Per the ProviderRead/ReducedMotion first-consumer lesson, the module services that don't yet expose a
  ProviderRead-shaped read (habits completions slice, study availability, contributions budget) get that method
  **added here**. ⚠ Each such method is a thin **backend** addition on an existing service → the backend/frontend
  split at Decomposition must enumerate them. `[FACT: canvas/adapter.ts:22-24; provider-read.ts:9-15]`
- **IR-9 · Dense-day overflow is #19's job (parked §6).** The shipped `+N more` is a dead, non-interactive count;
  three Vida-native treatments (unfurl-in-place · density-as-ink+peek · read-the-day panel) are parked as Month/
  Agenda-range design input — read-only reveals only; any write stays an owning-module capability.
  `[FACT: calendar-vision.md:57-69]`
- **IR-10 · Switcher state is UI-only (Zustand), not persisted here.** Active range + focused date are ephemeral UI
  state (the AR-4 pattern) — a `calendar-ui-store`. A _saved_ default range would be a `user_preferences`/saved-view
  write = owning capability, not this lens. `[FACT: docs/infrastructure/web-client-runtime/current-spec.md:52-54 (Zustand UI-only)]`

---

## Envision §3.75 determination (for Step 1.5)

**Trigger test:** _"Is there a user affordance whose UI answer isn't already obvious from an existing shipped
surface?"_ → **FIRE (strongly).** This is the archetypal design-led surface: _how does the range switcher read and
transition? how does the Agenda daypart-group timed + all-day + Must/Can? how does a habit thread draw across days
(kept vs missed)? how does open time surface and offer "slot it" without being a write? how do purpose dots and the
drift flag read? how does temporal asymmetry (record/live/intention) look in one grid? how does a dense day unfurl?_
No shipped surface answers these — the view renderers are read-only single-layout lenses; the Month grid is one of
six ranges; the Living lens is five net-new cross-module moves. This is a **novel interaction surface** (and a
module-hub-class flagship) → **Envision greybox + human approval is required before Decomposition.**
`[FACT: entity-delivery-flow.md §3.75; calendar-vision.md:20-26]`

### Gate-owed decisions — RESOLVED-BY-DOCS (checked 2026-10-10) + carried to Step 2

**1. Move ⑤ (drift flag) — RESOLVED by ADR-007/008 boundary (split form).** The full _"pushed N× count"_
needs a reschedule-**history ledger** = a Tasks write-path = ADR-008 owning-module backend → **deferred** (outside
this ② read-only unit). A **reduced drift signal IS read-derivable now** from shipped columns (`scheduled_date` vs
`due_date` vs `completed_at`) — "slipping/overdue" needs no history → **M1 drift = the derived slip-flag, IN the
lens**; the N× count lights up when Tasks ships a ledger. Not a scope-cut (⑤ stays, reduced), not an over-correct
(no backend ledger pulled in). `[FACT: tasks.ts:60,61,64; ADR-007 read-only lens; ADR-008 §3.2.5 writes = owning module]`

**2. Move ④ (purpose budget) — RESOLVED by ADR-011 §3.6 (IN, read-derived).** The **measurement-source read seam**
is shipped (`source-registry.ts:2-7`): advertise + query, no table access, honors INT-1 — the SAME read contract as
`dueIn`/`summary`. Ships empty; **unadvertised key ⇒ `null` (unmeasured), never fabricated.** Purpose budget is a
sanctioned read-only derivation: Purpose advertises the measure, **#19 is the first UI consumer**, an absent measure
renders honestly-null (deny-safe absent-port precedent). **IN the greybox.** `[FACT: packages/core/src/foundation/measurement/source-registry.ts:2-7; ADR-011 §3.6; purposes/__tests__/service.test.ts:500]`

**Carried to Step 2 (Decomposition — mechanical, not greybox-blocking; greybox uses fixtures):** 3. **Multi-day agenda** — per-day `buildDashboard` ×N vs a new `buildDashboardRange` (backend). _(IR-2)_ 4. **Daypart** — define canonical `Daypart` enum (`@vida/types`) vs derive from clock time; greybox uses the common
`['morning','afternoon','evening']` subset for grouping. _(IR-5)_ 5. **Provider methods** — enumerate the thin backend reads #19 adds as first consumer (habit-completions slice ·
study-availability · the measurement-source budget advertise on Purpose). _(IR-8)_

> **S7 note (2026-10-22):** IR-2's "reuse `buildDashboard`" (:27, :71, :80-84) is SUPERSEDED for the due-work feed by D-S7-DEV-1 — the Calendar is the dueIn aggregator (IA §4) and reads `sessions.dueIn`; see PLAN-S7-entity-close.md G1.
