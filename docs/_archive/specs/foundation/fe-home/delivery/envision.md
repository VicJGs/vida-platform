# fe-home — Envision Gate (Entity Delivery Flow ②, Step 1.5)

> **Status:** FIRED (interpretation §5, §3.75 doc test) · code-truthful greybox authored + iterated · **human (Victor)
> review PASSED 2026-10-10** (two-entity model confirmed; arrangement resolved; checkpoints pinned). The firing was the
> mechanical doc test; THIS gate was the blocking human review (the reviewer is the human, not a `victor:*` skill).
> **Greybox (THROWAWAY — deleted after this gate per §3.75):** `apps/web/src/__envision__/{home-greybox,envision-main}.tsx`
>
> - `apps/web/envision.html`, driven in Brave over the real vite app across 3 presets × light/dark × calm/dense ×
>   both arrangements × 4 state scenarios × 375/768/1440. Composed the REAL `@vida/ui` `DashboardView` + `Card` + the
>   theme `UIProvider`; the journal page was a faithful editor placeholder (real `VidaEditor` = the N6 mount seam —
>   `@vida/editor` is not an apps/web dep).

## What was envisioned

The Home surface (`/`) end to end. The **first greybox was WRONG and the gate caught it** (see below); the corrected
greybox rendered Home as **two distinct entities** (ADR-008 render-targets):

- **The journal PAGE** — a block editor: prose interleaved with **inline** integration blocks (`/dailySummary`,
  `/taskChecklist`, …) + a "/ to pull in…" affordance. The home-page-as-a-journal-page.
- **The Dashboard** — a **personalized** grid of **standalone** integration-block widgets with stats + summaries across
  the WHOLE OS: `Today across the OS` (recap) · Finances · Tasks · Habits · Projects · Purposes · Dreams · Schedule.

Both arrangements, every state (normal · per-widget degrade · all-loading · empty dashboard), every preset × mode × density.

## The gate's headline catch (why Envision ran BEFORE decomposition)

The FIRST greybox collapsed the architecture: it made the entry a **plain free-text box** and the dashboard a **fixed
4-card strip** (schedule/stats/day-actions/quick). Victor's gate note + re-grounding in **ADR-008 §3.2** +
`docs/editor/block-registry.md` corrected it:

- A capability (integration block) declares `render_targets {inline, standalone}` — the SAME capability renders inline
  (in the editor page) OR standalone (as a dashboard widget). `[FACT: ADR-008 §3.2:57-60; block-registry.md "two halves"]`
- So Home's **dashboard widgets are a DIFFERENT entity from the editor's inline blocks** (Victor, point 1).
- The Dashboard shows **stats + summaries across the whole OS, personalized** — finance, task progress, projects
  stats+finances, purposes, dreams, … (Victor, point 2) — not a fixed region strip.
- The journal page is a **block editor** showcasing OS info via inline blocks, not plain prose.

A static spec would have shipped the wrong model; the leading greybox caught it at redraw cost.

## Resolved precisions (ratified at the review → FACT for Decomposition/`/contract`)

- **RP1 — Two entities, two render targets (ADR-008).** Dashboard = `standalone` integration-block widgets; journal
  page = `inline` integration blocks in a `@vida/editor` page. fe-home composes both; it owns neither block body.
- **RP2 — Arrangement = a user PERSONALIZATION chosen in Settings.** Default **Journal-first**; the toggle control lives
  in **Settings** (`fe-settings`, `decomposition.md:71` "Home arrangement" net-new preference), NOT on Home. fe-home
  **reads** the persisted arrangement via the preference/selection seam (ProviderRead; `get/setSelection` deferred to
  Preferences per `home-journal-dashboard.md:50-54`) and renders accordingly. Journal-first = page hero + a slim "At a
  glance" dashboard rail; Dashboard-first = full OS grid + page below.
- **RP3 — Build fidelity = compose + frame + seam.** fe-home ships: the Dashboard (`DashboardView` + the standalone
  widget frames) + the journal-page mount + the arrangement layer + the personalization read-seam. Homed downstream:
  the real standalone widget bodies + the real inline block node-views + live data + the `VidaEditor` mount + persisted
  selection write. (Grounded: "integration-block widgets ship elsewhere" `dashboard-view.md:8`; the collection/dashboard/
  seams ProviderRead precedent.)
- **RP4 — EntityView frames the two facets; fe-home owns the arrangement.** EntityView maps: `layout` facet = Dashboard,
  `editor` facet = journal page, `merged|tabbed` = show-both/tab-between. BUT `merged` is a FIXED `layout→editor` stack
  (= Dashboard-first only); **Journal-first** (page leads + dashboard compacts to a rail) needs fe-home's own arrangement
  layer on top. Exact use of EntityView vs a bespoke frame is a Decomposition call, grounded here.

## Anchored checkpoints (EC-n) — pinned by Victor 2026-10-10

Each `structural` EC is greybox-provable → MUST map to ≥1 slice at Decomposition AND be a blocking Visual-Gate assertion.
`feel` ECs defer to the live per-slice Visual Gate.

| EC       | Checkpoint                                                                                                                                                                                                                              | Type                 |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **EC-1** | Home composes TWO distinct entities — a journal **page** (inline blocks) + a personalized **Dashboard** (standalone widgets); they are not the same blocks                                                                              | `structural`         |
| **EC-2** | Arrangement renders per the persisted **Settings** preference (default Journal-first): Journal-first = page hero + "At a glance" dashboard rail; Dashboard-first = OS grid + page below. (The toggle CONTROL is Settings', not Home's.) | `structural`         |
| **EC-3** | The journal page = prose + **inline** integration blocks + a "/" insert affordance                                                                                                                                                      | `structural`         |
| **EC-4** | The Dashboard = a **personalized** grid of **standalone** stat/summary widgets across OS domains (finance · tasks · projects · purposes · dreams · habits · schedule)                                                                   | `structural`         |
| **EC-5** | Per-widget degrade: one dashboard widget error/loading/empty while siblings + the page stay live — never a blank Home                                                                                                                   | `structural`         |
| **EC-6** | Greet header: eyebrow date + serif greeting + sub-line                                                                                                                                                                                  | `structural`         |
| **EC-7** | Responsive: 2-col → single column at 375, no overflow                                                                                                                                                                                   | `structural`         |
| **EC-8** | Preset identity: serif + per-preset accent + warm-dark surfaces; AA holds both modes                                                                                                                                                    | `feel` + Visual-Gate |
| **EC-9** | The arrangement render is instant / reduced-motion-safe                                                                                                                                                                                 | `feel`               |

## Exit

Two-entity model confirmed · arrangement = Settings personalization (default Journal-first) · EC-1…EC-9 pinned →
greybox DELETED → **Step 2 Decomposition**: `slice-map.md` + `seam-contract.md` map every `structural` EC (EC-1…EC-7)
to ≥1 slice (frontend/shared slices carry them as Visual-Gate MUSTs; EC-8/EC-9 `feel` defer to the live gate), and
decide the EntityView-frame-vs-bespoke split (RP4).
