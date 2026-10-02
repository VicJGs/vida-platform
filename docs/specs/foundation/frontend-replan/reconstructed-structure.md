# Reconstructed Structure — the ordered build sequence (G5 output)

> **Status:** G5, 2026-10-01. Turns the `decomposition.md` build-tiers (codec → shell+cross-cutting → schema-gated
> modules) into an ordered, numbered **surface `#` sequence** — the buildable units, in dependency order. This is the
> input to **G6** (the Linear reshape: each `#` becomes an issue, superseding the 24 `fe-*`). **Scope:** web, M1.0.
> **Sources:** `decomposition.md` · `surface-map.md §6` · `coverage-report.md` · `frontend-quality-bar/_index.md`.

## 0. Method

**Order = dependency, not module priority.** Each `#` is an issue-sized buildable unit. Heavy units (Health,
Finance, Learning, Books, Sessions) are marked `⊕split` — they fan into sub-issues at G6/build. `⛔<x>` = gated on a
schema amendment (`surface-map.md §6.4`). Every unit inherits the Tier-0 codec, so nothing in Wave 1+ starts before
its codec deps exist.

---

## WAVE 0 — the CODEC (foundation; everything depends on it)

| # | Unit | Kind | Depends on |
|---|---|---|---|
| **1** | `ThemeProvider` — 3 presets (Reader·Editorial·Quiet Desk) × density, token families (incl. font-family swap) | DS/tokens | ds-2/ds-4 (amend "architect for N themes") |
| **2** | Pattern-kit primitives — `EmptyState` · `SyncStatus`/`HonestProgress` · `ReducedMotion` · `VoiceCopy` · `ReachabilityRegistry` · `ProviderRead` · the **8-state machine** | primitives | #1 |
| **3** | View-mode renderers (7: list·table·board·gallery·calendar·graph·timeline) | codec | #1 #2 |
| **4** | **Collection** shell (hosts a SavedView in a view-mode) | shell | #3 |
| **5** | **Dashboard** shell (integration-block grid) | shell | #2 |
| **6** | **Entity** shell + **Layout/Editor facet** system (merged/tabbed; registry-gated editor) | shell | #2 #4 |
| **7** | **Canvas: Editor** (TipTap block canvas; the 11+11 block registry wiring) | canvas | #2 |
| **8** | **Canvas: Graph** (Sigma, ink/editorial voice) | canvas | #1 #2 |
| **9** | **Canvas: Reader** (read·listen·annotate) | canvas | #2 |
| **10** | **Canvas: Vision-board** + **Calendar-grid** | canvas | #2 #3 |
| **11** | **Flow/Session** shell — deliverable-per-stage + attach (doc/photo/audio) + mark-done/proof + effect-rail log | shell | #2 #6 |
| **12** | **System** shell — ⌘K overlay command/search + searchable settings list + inbox list | shell | #2 |
| **13** | Composition seams — SavedView · Capability/Block (inline/standalone) · Template · Spaces engine runtime wiring (consume @vida/core) | seams | #3 #4 #7 |

## WAVE 1 — the SHELL + the cross-cutting surfaces (no module owns these)

| # | Unit | Composition | Depends on |
|---|---|---|---|
| **14** | Shell frame — two **positionable content-fit panels** + Content + Overlay host | chrome | W0 |
| **15** | **Bar 1** + the **`Spaces:` scope selector** (global scope state) + the 6 global surfaces redistributed | chrome | #14 |
| **16** | **Session HUD** (region 6) — persistent timer/stage, responsive placement | chrome | #11 #14 |
| **17** | **⌘K command bar** (the nav spine; ReachabilityRegistry source) | System | #12 #15 |
| **18** | **Home** — 4 regions (schedule·stats·day-actions·quick-actions) + arrangement toggle + journal Editor facet | Dashboard+Entity | #5 #6 #7 |
| **19** | **Global Calendar** — `dueIn` cross-module lane (dayparted + timed) | Canvas | #10 #13 (ProviderRead) |
| **20** | **Spaces page** + create/edit | Collection+Flow | #4 #13 |
| **21** | **Sync & Activity Log** `/sync` | Collection+System | #4 #2 |
| **22** | **Feature Atlas** `/features` — map + ledger + help (ZK-local) | Canvas+Dashboard | #8 #5 |
| **23** | **Session runtime page** | Flow | #11 |
| **24** | **Settings** — net-new controls (theme·motion·density·Home arrangement·sync-vis·Atlas·module-rename) + searchable index | System | #12 #1 |
| **25** | **Notifications** inbox + channel-matrix controls | Collection+System | #4 #12 |
| **26** | **Onboarding** (+ optional guided setup; copy-honesty) | Flow | #11 #2 |

## WAVE 2a — per-module surfaces, **schema-floor-ready** (build on the codec now)

| # | Module surface-set | Composition (from decomposition §4) | Notes |
|---|---|---|---|
| **27** | **Notes** — Collection+Graph · Note Entity (Editor-led) · /summary | #4 #8 #6 #7 | hub |
| **28** | **Tasks** `⊕split` — 12-layout Collection · Task Entity (facets) · All-Tasks | #4 #6 | richest view-mode consumer |
| **29** | **Habits** — Dash+Collection (today modes) · per-habit Entity (analytics+calendar) | #4 #5 #6 #8 | |
| **30** | **Projects** (core) — Dash+Collection · project Entity · milestones | #5 #4 #6 | ⛔ deliverables/vision pages → 2b |
| **31** | **Check-ins** — entry Flow · history/trends · Journal widget | #11 #4 #8 | |
| **32** | **Gamification** (conditional) — System Dash · rule-authoring Flow | #5 #11 | opt-in |

## WAVE 2b — per-module surfaces, **schema-gated** (build after the amendment lands)

| # | Module surface-set | Gate (⛔) | Composition |
|---|---|---|---|
| **33** | **Routines** — Collection · routine Entity · run-flow | ⛔ v2 service | #4 #6 #11 |
| **34** | **Sessions** `⊕split` — Agenda/My-Week · Availability · config · templates · Pomodoro | (runtime at #11/#16/#23) | #4 #10 #11 |
| **35** | **Learning** `⊕split` — hub · subject Entity · Grading builder · Assessment rollups | — | #4 #6 #11 |
| **36** | **Books** `⊕split` — Bookshelf · Book Hub · **Reader** · Plans/Quotes · wizards | — | #4 #6 #9 #11 |
| **37** | **Knowledge** `⊕split` — Catalog · Lab · Topic · Flashcards · card-gen · compound-set · FTS | — | #4 #6 #8 #11 |
| **38** | **Skills** — landing · Skill Entity (Composer) · Skill Graph · Def Library | — | #4 #5 #6 #8 |
| **39** | **Purposes** `⊕split` — dashboards · Purpose/Target/Value/Dream · Dreams board · Contributions graph · Reviews | ⛔ values·contributions·purpose_reviews·plan_steps·registry | #5 #6 #10 #8 |
| **40** | **Health** `⊕split` — metrics Dash · goals/exams/roles/experiments · Monitoring · Medical · Training · Nutrition | ⛔ ~12 Core tables + Training/Nutrition (schema 0%) | #5 #4 #6 #8 #11 |
| **41** | **Finance** `⊕split` — Dash(switch) · account Entity · All-* · Chart · Store tree · Commitments · Import wizard | ⛔ store·import_staging·budget·multi-currency | #5 #6 #4 #8 #11 |
| **42** | **Relationships** `⊕split` — Dash⇄Graph⇄Contacts · contact Entity(health band) · Network · Reminders · All-Events | ⛔ network_groups·closeness_tier | #5 #8 #4 #6 |

## Critical path & dependency notes

- **The codec (W0) is the critical path.** Nothing visible ships until the shells + pattern-kit + view-modes exist;
  but once they do, Wave 1 and every module inherit them in parallel. **#6 (Entity+facet)** and **#11 (Flow/Session)**
  are the two highest-leverage codec units (every entity page + every session depend on them).
- **Wave 1 is reachable-shell first:** #14→#15→#17 (shell+bar+⌘K) must precede any surface being *navigable to*; #18
  (Home) is the landing and should lead the visible surfaces.
- **Wave 2a** needs no schema work → it validates the codec on real modules early. **Wave 2b** is blocked on the §6.4
  amendments — **Health (#40)** is the biggest (schema 0%) and should start its schema amendment earliest in parallel.
- **Session surfaces** (#16 HUD, #23 runtime) are codec-tier reuse — built once in Wave 1, consumed by Sessions (#34),
  Health workouts (#40), Pomodoro, Routines (#33).

## Feeds G6

Each `#` above becomes a Linear issue at **G6** (the ⚠ semi-destructive reshape, Victor-approval-gated): the 42 units
supersede the 24 `fe-*` (LIF-178…201), carrying their dependency edges (the `Depends on` columns) as blocked-by
relations. The `⊕split` units fan into sub-issues; the `⛔` units carry a blocked-by on their schema amendment.
