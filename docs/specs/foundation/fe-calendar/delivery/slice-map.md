# Slice-map — fe-calendar (#19, Global Calendar · LIF-203)

> Entity Delivery Flow ② · Step 2 (Decomposition Gate, **Decide-mode** — net-new surface). Unlike the all-frontend
> canvas-reader, #19 spans **three planes** (vision §3 two-home split + IR-8 first-consumer reads):
> **`@vida/ui`** presentational range renderers (data-prop, Visual-Gate'd with fixtures, no `@vida/core`) ·
> **`apps/web`** the Global Calendar surface + `useCalendar` ProviderRead fan-out + derivations ·
> **`@vida/core`** thin first-consumer read methods the fan-out needs. Each slice closes with a **blocking gate**
> (frontend → Visual Gate: every state × light/dark × 375/768/1440 + a11y + its EC MUSTs; backend/wiring →
> Verification Gate). No batching, no "owed." Invariant throughout: **read-only lens (ADR-007/008)** — renderers
> emit intents, never write (EC-12). Envision Gate PASSED (envision.md); EC set EC-1…EC-14 + EC-F1…F4 locked.

## Decisions resolved at this gate (the IR "carried to Step 2" items)

- **D1 · Daypart (IR-5/EC-3).** Define a canonical **`Daypart = 'morning'|'afternoon'|'evening'`** in `@vida/types`
  (the Agenda/Living grouping axis; supersedes nothing — habits/routines keep their own `time_of_day`). `useCalendar`
  maps each item → a daypart: a **timed** item by clock-hour bands; a **dayparted** item (habit/routine) by its own
  `time_of_day` (clamped to the 3); an all-day task → a configurable default band. Homed in **S2**.
- **D2 · Multi-day agenda feed (IR-2).** **REUSE `journals.buildDashboard` per-day** for the Agenda's day sections
  (a few days → N small calls, no new engine) — a `buildDashboardRange` is **deferred** (not built until a range view
  proves the per-day cost). The Living/Week ranges read the per-entity sources directly (habit-completions, availability)
  via S6, not the dashboard. Homed in **S6/S7**.
- **D3 · First-consumer backend reads (IR-8).** #19 adds the thin read methods its fan-out needs (none exist yet):
  habit-completions range · study-availability · Purpose budget advertise (measurement-source §3.6) · task slip-flag
  derive. Each is a **read on an existing service / an advertise() call**, no schema change. Homed in **S6**.
- **D4 · Month headerless (EC-2).** `CalendarView` gains an opt-in **headerless mode** (suppress its own month title +
  nav) so the canvas frame owns the period title once. A tiny `@vida/ui` addition. Homed in **S1**.
- **D5 · ⑤ Drift = reduced slip-flag (IR-3, envision-locked).** M1 derives "slipping/overdue" from
  `scheduled_date`/`due_date`/`completed_at` (no history); the "pushed N×" count stays deferred to a Tasks ledger.

## Slices (ordered — presentational renderers gate on fixtures, then the data plane wires them)

| # | Slice | Plane | Home | Builds | EC MUSTs |
|---|-------|-------|------|--------|----------|
| **S1** | Calendar surface + switcher + Month | shared | `apps/web` + `@vida/ui` | the **Global Calendar surface** composed in **`CanvasView`** (eyebrow "Calendar" · the **period title per range** · a `role="toolbar"` **range switcher** with `aria-pressed` + prev/today/next nav in `actions` · condense to a `Menu` < 768) · a **`calendar-ui-store`** (Zustand UI-only: active range + focused date, D-IR-10) · **Month** via `CalendarView` **headerless mode (D4)** · frame terminal states. Fixture data. | EC-1, EC-2, EC-11, EC-12, EC-13, EC-14 |
| **S2** | Agenda renderer | frontend | `@vida/ui` | **`AgendaView`** — daypart-grouped (`Daypart`, D1) · **timed vs all-day** · **Must/Can** weight · done-state · constrained measure · presentational/data-prop/fixtures. | EC-3, EC-11, EC-12, EC-13, EC-14 |
| **S3** | Week/Day renderer | frontend | `@vida/ui` | **`WeekView`** time-column (hour gutter · all-day strip · timed blocks) · **Day = 1-column** variant · fixtures. | EC-4, EC-11, EC-12, EC-13, EC-14 |
| **S4** | Year renderer | frontend | `@vida/ui` | **`YearView`** — 12 mini-months · activity-density dots · today ringed · fixtures. | EC-5, EC-11, EC-12, EC-13, EC-14 |
| **S5** | Living lens renderer | frontend | `@vida/ui` | **`LivingView`** — the signature: ④ purpose-budget strip (honest-null) · ② habit threads (kept/miss/future + streak) · the 7 **temporal day-columns** as Cards with alive-hooks (past record · today live + ③ open-time + ⑤ slip-flag · future intention) · fixtures. | EC-6, EC-7, EC-8, EC-9, EC-10, EC-11, EC-12, EC-13, EC-14 |
| **S6** | First-consumer cross-module reads | backend | `@vida/core` | the thin reads the fan-out needs (D3): `getHabitCompletions(from,to)` · `getStudyAvailability(range)` · Purpose **`advertise('purpose_budget:…')`** (measurement-source §3.6, honest-null) · a **task slip-flag** derive (D5) · reuse `buildDashboard` per-day (D2). Each a read/advertise on an existing service, **no schema change**. | (data for EC-3/6/7/9/10) — Verification Gate |
| **S7** | `useCalendar` fan-out + wiring | frontend | `apps/web` | **`useCalendar(range, focusedDate)`** — React Query over the **`ProviderRead`** seam: fans out to S6's reads + `review.getDue` + `buildDashboard`, **derives** the record-lines/threads/budget/open-time/drift, feeds each renderer; binds the surface to real data; absent provider ⇒ honest-null lane (deny-safe). | EC-2/3/6/7/9/10 (data) — Verification + a live Visual Gate on real data |

## Envision coverage check (every `structural` EC → ≥1 slice)

| EC | Assertion | Slice(s) |
|----|-----------|----------|
| EC-1 | range switcher (toolbar, aria-pressed, <768 condense) | S1 |
| EC-2 | Month reuses CalendarView; frame owns the period (headerless) | S1 (+ data S7) |
| EC-3 | Agenda daypart/timed/all-day/Must-Can/done | S2 (render) + S7 (data) |
| EC-4 | Week/Day time-column; Day = 1 col | S3 |
| EC-5 | Year density mini-months | S4 |
| EC-6 | ④ purpose budget + honest-null | S5 (render) + S6/S7 (measurement-source read) |
| EC-7 | ② habit threads kept/miss/future + streak | S5 (render) + S6/S7 (completions read) |
| EC-8 | temporal asymmetry (record/live/intention) | S5 |
| EC-9 | ③ open-time reveal (read-only; slot = intent) | S5 (render) + S6/S7 (availability read) |
| EC-10 | ⑤ drift reduced slip-flag (no history) | S5 (render) + S7 (derive from task cols) |
| EC-11 | terminal states per range region | S1 (frame) + every renderer |
| EC-12 | read-only invariant (intents, never writes) | every slice |
| EC-13 | preset × mode AA (full matrix) | every frontend slice's Visual Gate |
| EC-14 | OS-pattern conformance (CanvasView frame · Card alive-hooks · rhythm · reads-as-calendar) | S1 (frame) + every renderer |
| EC-F1..F4 | voice · motion · dense-day treatment · thread ink (feel) | live per-slice Visual Gate rows (S2/S3/S5) — never a greybox MUST |

**All 14 `structural` ECs map to ≥1 slice. Coverage holds.** The 4 `feel` ECs are deferred to the live Visual Gate.

## Per-slice gate ledger

| Slice | Gate | Status |
|-------|------|--------|
| S1 | Visual Gate (frame · switcher · Month headerless · states · 375 · dark × 3 presets · AA) | ✅ PASS (2026-10-10 — tsc 0 · lint 0 · @vida/ui 22/22 incl new `hideHeader` test · Brave full matrix: EC-1 switcher aria-pressed ×6 + correct body · EC-2 month headerless · EC-14 frame · AA 3×2 matrix title 15.8–17.3 / eyebrow 4.94–6.53 / today 5.93–7.31 / cell 4.52–5.22 incl warm-dark · 375/768/1440 no-overflow · axe 0. Probe-bug caught: measure the digit text node, not the wrapper div.) |
| S2 | Visual Gate (daypart groups · timed/all-day · Must-Can · done · AA) | ☐ pending |
| S3 | Visual Gate (time-column · all-day strip · timed blocks · Day 1-col · AA) | ☐ pending |
| S4 | Visual Gate (mini-months · density · today ring · AA) | ☐ pending |
| S5 | Visual Gate (budget honest-null · threads · temporal columns · open-time · slip-flag · AA) | ☐ pending |
| S6 | Verification Gate (reads/advertise · honest-null · no schema change · unit tests) | ☐ pending |
| S7 | Verification + live Visual Gate (fan-out · derivations · deny-safe · real-data render) | ☐ pending |

## Notes
- **Boundary:** `@vida/ui` is Tamagui-only → S1(renderer part)–S5 hold LOCAL types + take data props; S6 is pure
  `@vida/core`; S1(surface)/S7 are the only `@vida/core`↔UI crossings (apps/web).
- **`useCalendar` is the deferred canvas-adapter hook** (`canvas/adapter.ts:22-24`) — #19 is its first consumer (S7).
- **Deferred by design:** `buildDashboardRange` (D2 — reuse per-day until proven) · the ⑤ reschedule-history ledger
  (D5 — Tasks backend) · any write path (ADR-008 — owning modules).
- **Backend touch is thin + additive** (S6): reads + one `advertise()`, zero schema, honest-null on absence — the
  deny-safe-port / empty-registry precedents.
