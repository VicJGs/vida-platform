# Calendar — approved design vision (2026-10-05)

> Captured from the fe-codec-primitives-refinement design session with Victor (2026-10-05). Status: **APPROVED +
> HOMED to `fe-calendar` #19 (LIF-203)** — Victor chose "split to #19" (§4 resolved). This doc + the ranges/living
> mockups now live under `docs/specs/foundation/fe-calendar/` as #19's design input. The **month-grid aesthetic**
> (`calendar-refinement.html`) stays with `fe-codec-primitives-refinement` (that task ships the grid polish only).
> Visual record: `./mockups/calendar-ranges-and-agenda.html` · `./mockups/calendar-concept-board.html` +
> `../fe-codec-primitives-refinement/mockups/calendar-refinement.html` (the grid layer).

## 1. What it is
The Vida calendar is not a scheduling grid — it is the **book/journal read by date** (P1). It has three layers:

1. **Aesthetic refinement** of the month grid — serif title, eyebrow weekday headers, tabular figures, restrained
   today mark, weekend/out-of-month paper shifts, hairline grid, accent-dot chips. *(mockup 1; pure `calendar-view`
   primitive polish — in-scope for this task.)*
2. **Multi-range renderer** — one renderer, six ranges in a switcher: **Year · Month · Week · Day · Agenda · Living**.
   - **Agenda** = the actionable "another way": daypart-grouped (Morning/Afternoon/Evening), timed + all-day, Must/Can
     weight, done-state. Solves the grid's info-crush (P3 "① Schedule · must/can").
   - **Week/Day** = time-column; **Year** = density overview; **Month** = the refined grid.
3. **The "Living" lens** (the signature — makes it unmistakably Vida), five moves:
   - **① Past-as-record** — past days auto-composed "how it went" + completions + focus logged (`pages`/journal + Review engine).
   - **② Habit threads** — habits as unbroken lines across days, filled=kept/dotted=missed (`habit_completions`).
   - **③ Open-time surfacing** — free blocks highlighted + "slot it" (study availability + planner).
   - **④ Purpose budget** — hours this week by the purpose each block serves + flag a value with none (ADR-011 contributions).
   - **⑤ Drift flag** — a Must-do pushed N× shows its slippage (task reschedule history).
   - **Temporal asymmetry** binds it: past = record · today = live · future = intention.

## 2. Invariant — still a read-only lens (ADR-007)
Every range/lens RENDERS; it never writes. Checking a box, moving an event, slotting open time = a **write = the owning
module's capability**, composed in (ADR-008). The calendar displays; the module mutates.

## 3. Architectural split (the load-bearing constraint)
`@vida/ui` primitives are **presentational** — they cannot import `@vida/core` or read other modules. So the vision
splits across two homes:
- **Presentational renderer(s)** (`@vida/ui`): the refined grid + the range renderers (week/day/agenda/year) + a
  **"living" layout** that renders past-record/today/future columns, habit-thread rows, open-time blocks, purpose dots,
  drift flags — all **from data props**. Visual-Gate-able standalone with fixture data. *(This task's natural territory.)*
- **Cross-module data + composition** (the **Global Calendar surface**, `fe-calendar` #19 / LIF-203 — "dueIn cross-module
  lane, ProviderRead"): fans out reads to habits · purposes · sessions · tasks · journal · reminders · ICS, derives the
  record lines / threads / budget / open-time / drift, and feeds the renderer. **This is where the "living" data lives.**

## 4. Scope / homing — RESOLVED (2026-10-05, Victor = "split to #19")
- **`fe-codec-primitives-refinement` (LIF-230)** keeps ONLY the **Calendar month-grid aesthetic refinement**
  (`calendar-refinement.html`) as part of its 5-view polish. Nothing multi-range or living.
- **`fe-calendar` #19 (LIF-203)** owns the **full flagship**: the multi-range renderer (Year/Month/Week/Day/Agenda) +
  the **Living** lens (§1.3) + all cross-module data (habits/purposes/sessions/tasks/journal). The presentational
  renderers (net-new, not "refinement") build HERE too — #19 is their home, not the primitives-refinement task.
  Built when #19 is sequenced, with its module data-deps, under its own §XXVI gate. This vision doc is its design input.
- Rejected: absorbing the flagship into the aesthetic-refinement task (couples a 1-day polish to a multi-week feature).

## 5. Visual record
- `../fe-codec-primitives-refinement/mockups/calendar-refinement.html` — month grid, before→after × 3 presets
  (the aesthetic layer; **stays with LIF-230**).
- `./mockups/calendar-ranges-and-agenda.html` — the 6-range model + the Agenda "another way" (**#19**).
- `./mockups/calendar-concept-board.html` — the "living week" signature stack, labelled ①–⑤ (**#19**).
