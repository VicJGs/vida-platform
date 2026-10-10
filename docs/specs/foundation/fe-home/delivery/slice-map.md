# Slice Map — fe-home (LIF-187, G6 unit #18)

> Entity Delivery Flow ② · Step 2 (Decomposition Gate). Fixes the slices + the backend/frontend seam so per-slice
> work is scoped; maps every `structural` EC (envision.md) to ≥1 slice. Approval 1 gate.
> Plane: **frontend** (apps/web). fe-home = the rendered Home surface (Phase-1b, `home-journal-dashboard.md:63`).

## Scope spine (from envision.md RP1–RP4 — FACT)

fe-home **composes + frames + seams**; it owns no block body and no live data:
- **Dashboard** = a personalized grid of **standalone** integration-block widgets (`DashboardView` #5 + a widget-render
  seam). Real widget bodies ship with each capability/module (`dashboard-view.md:8`) — fe-home renders the FRAME + a
  placeholder/seam body + the generic terminal states.
- **Journal page** = an **inline**-block editor page. The real `@vida/editor` `VidaEditor` mount is the **N6 seam**
  (`@vida/editor` is not an apps/web dep); M1 renders a faithful page region with the inline-block affordance.
- **Arrangement** = a **Settings** personalization (default Journal-first); fe-home **reads** the persisted preference
  (ProviderRead) and renders — the toggle CONTROL is `fe-settings`' (`decomposition.md:71`).
- **Live data** (`buildDashboard` / per-module `summary(date)`·`dueIn(range)`) = deferred to the first consumer
  (the collection/dashboard/seams ProviderRead precedent); M1 = a default widget set + seam states.

Built here: the Home React components + the arrangement layer + the `/` route wiring + the preference read-seam +
the widget-render seam + the journal-page mount seam. All in `apps/web/src/home/` (extends the shipped UX-6 model).

## Slices

### S1 — HomeDashboard (the standalone-widget grid)
A `HomeDashboard` component composing `DashboardView` over the OS-domain widget set (summary · finance · tasks · habits ·
projects · purposes · dreams · schedule), each cell a **standalone-widget mount** via a `renderHomeWidget(widget)` seam,
with per-widget `ViewState` threading + the shell's generic terminal states. Widget set + per-widget state read from the
selection/data seam (M1 default set; live data deferred). Spans from the greybox (summary=lg, finance/projects/schedule=md,
tasks/habits/purposes/dreams=sm).
- **Covers:** EC-4 (personalized standalone widget grid across OS domains) · EC-5 (per-widget degrade, never blank).
- **Visual Gate MUSTs:** EC-4, EC-5 · 375 reflow (EC-7 part) · AA both modes (EC-8).

### S2 — JournalPageRegion (the inline-block editor page)
A `JournalPageRegion` component rendering the journal page — prose + **inline** integration-block regions + the "/" insert
affordance. The `@vida/editor` `VidaEditor` mount is the **N6 seam** (M1 = a faithful page region; real editor mount
downstream / first consumer). Threads the page's own `editorState` (loading/empty/error/success).
- **Covers:** EC-3 (journal page = prose + inline blocks + "/" affordance).
- **Visual Gate MUSTs:** EC-3 · AA both modes (EC-8).

### S3 — HomeSurface (arrangement + greet + route + preference read)
The top `Home` component composing S1 + S2 via the **arrangement layer** that reads the persisted arrangement preference
(`HomeArrangement`, default `journalFirst`; ProviderRead seam) + the greet header + wiring the `/` index route
(`routes.tsx`, replacing the `<h2>Vida</h2>` placeholder). Arrangement: Journal-first = page hero + "At a glance"
dashboard rail (S1 compact subset); Dashboard-first = full S1 grid + S2 below.
- **RP4 decision (resolved here):** fe-home **owns the arrangement layout directly** (composing S1 + S2). EntityView
  (#6) is used for the **facet-frame semantics** only where it fits cleanly — the Dashboard-first "both-stacked" case
  maps to EntityView `merged` (layout=Dashboard, editor=page); Journal-first's page-hero + dashboard-rail is fe-home's
  bespoke 2-col (EntityView `merged` is a fixed layout→editor stack, can't express it). Exact EntityView-vs-bespoke
  wiring finalized at this slice's `/contract`. Grounded: envision RP4; `entity-view.tsx` `MergedStack` fixed order.
- **Covers:** EC-1 (two entities composed) · EC-2 (arrangement per Settings pref, default Journal-first) · EC-6 (greet
  header) · EC-7 (responsive 375, no overflow).
- **Visual Gate MUSTs:** EC-1, EC-2, EC-6, EC-7 · EC-8 (preset identity, AA) · EC-9 (arrangement render instant/RM-safe, `feel`).

## EC → slice coverage (every `structural` EC homed)

| EC | Type | Slice(s) |
|----|------|----------|
| EC-1 two distinct entities | structural | S3 (+ S1, S2) |
| EC-2 arrangement per Settings pref (default Journal-first) | structural | S3 |
| EC-3 journal page = prose + inline blocks + "/" | structural | S2 |
| EC-4 personalized standalone widget grid across OS | structural | S1 |
| EC-5 per-widget degrade, never blank | structural | S1 |
| EC-6 greet header | structural | S3 |
| EC-7 responsive 375 | structural | S1 + S3 |
| EC-8 preset identity + AA both modes | feel+VG | S1, S2, S3 (every slice's Visual Gate) |
| EC-9 arrangement render instant/RM-safe | feel | S3 (live Visual Gate) |

0 unhomed structural ECs. EC-8/EC-9 carried as per-slice live Visual-Gate rows.

## Build order
S1 → S2 → S3 (S3 composes S1+S2 + wires the route). Each slice = full §XXVI double-gate + a blocking real-browser
Visual Gate (3 presets × light/dark × 375/768/1440) before the next begins — no batching.

## Out of scope (homed downstream — NOT fe-home)
- Real standalone widget bodies (each capability's `standalone` renderer) → per-capability/module.
- Real inline block node-views + the live `VidaEditor` mount → `@vida/editor` wiring / first consumer (fe-notes etc.).
- Live data (`buildDashboard` / per-module `summary`·`dueIn`) → first consumer (ProviderRead).
- The arrangement toggle CONTROL + persisted write (`setSelection`) → `fe-settings` / Preferences.
- "Wrapped" temporal reviews → design-pass / Wave 3-4 (`home-journal-dashboard.md:62`).
