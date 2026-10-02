# Composition Map — surfaces decomposed into buildable units (G3 output)

> **Status:** G3, 2026-10-01. Decomposes every surface into its **archetype + composition units** (view-mode
> renderers · blocks · capabilities · facets · the cross-cutting pattern-kit), organised by the **codec-first build
> shape** G2 revealed (`surface-map.md §6.3`). Pairs with `traceability.md` (surface ← intent source). Feeds G4
> (coverage / ≥2-paths set-cover) + G5 (order). **Scope:** web, M1.0.
> **Sources:** `surface-map.md` · `frontend-quality-bar/_index.md §4` · the P1–P6 captures · ADR-006/007/008/009 · ADR-004.

## 0. Method

A surface is **not** a bespoke screen — it is a **composition of codec units**. G3 names the codec (Tier 0), then
expresses every shell/cross-cutting/module surface as a composition of those units. Build order falls out of the
dependency: **codec → shell + cross-cutting → schema-gated modules** (§5). This is what makes "18 modules feel like one
OS" a *construction fact*, not a review activity.

---

## 1. TIER 0 — the CODEC (the reusable units every surface inherits — build + audit FIRST)

### 1.1 View-mode renderers (the Collection spine) — 7 canonical
`list · table · board · gallery · calendar · graph · timeline`. Each declares the entity fields it needs (calendar→a
date field; gallery→a cover; board→a group-by). Modules may add layout variants (Tasks ships 12). A renderer is driven
by a **Saved View** (filter × layout × group, ADR-007). *The single highest-leverage unit — Tasks/Books/Contacts/
Knowledge/Finance/Calendar all inherit it.*

### 1.2 Archetype shells (6)
| Shell | What it composes | Notable |
|---|---|---|
| **Collection** | a Saved View rendered in a view-mode (1.1) | the workhorse |
| **Dashboard** | a grid of integration blocks (1.4) | Home · Finance · Health · Projects |
| **Entity** | **Layout facet** (Title·bio·summary·dashboard·views) **+ optional Editor facet** (linked page, *registry-gated*); user picks **merged / tabbed** | the facet system |
| **Canvas** | immersive: **Editor** (the block canvas) · **Graph** (Sigma, ink voice) · **Reader** · **Vision-board** · **Calendar-grid** | where the soul lives |
| **Flow / Session** | a deliverable-per-stage page + the persistent HUD | §4.5 |
| **System** | searchable lists · the ⌘K overlay · inbox | Settings · Notifications |

### 1.3 The cross-cutting pattern-kit (the 8 systemic findings, as reusable primitives — each surface *inherits* these)
`EmptyState` (teaching-invitation) · `SyncStatus` + `HonestProgress` · `ReducedMotion` wrapper · `ThemeProvider`
(3 presets × density, no hard-coded palette) · `VoiceCopy` (voice + honesty lint) · `ReachabilityRegistry` (≥2 paths) ·
`ProviderRead` (no direct cross-module tables) · the **8-state machine** (idle·typing·loading·results·empty·unavailable·error·success).
*Building these once satisfies the systemic findings everywhere.*

### 1.4 Composition primitives (the portability layer)
`SavedView` (ADR-007, passive lens, space_id? global/cloneable, provider-read) · `Capability/Block` (ADR-008, interactive,
`render_targets {inline,standalone}`, the *mixture*) · `Template` (ADR-009, fork-on-instantiate) · the **block registry**
(11 standard + 11 integration blocks) · `Spaces` engine (`{root tag · Views · enabled Blocks · name}`).

---

## 2. TIER 1 — the SHELL

| Shell unit | Archetype/kind | Composition |
|---|---|---|
| **Bar 1** (system/account panel) | chrome, positionable content-fit panel | the 6 global surfaces (redistributed) + **Space-scope selector** (all Spaces + None → global scope state) |
| **Bar 2** (content panel) | chrome, positionable content-fit panel | modules (default) / Spaces / pins |
| **Content** `<Outlet/>` | region | hosts the routed surface |
| **Overlay host** | region | ⌘K · modals · confirms |
| **Session HUD** | **region 6 (net-new)** | persistent timer + stage + controls; reads active `focus` session; responsive placement |

---

## 3. TIER 1 — cross-cutting discovered surfaces (decomposed)

| Surface | Archetype | Composition (codec units) |
|---|---|---|
| **Home** `/` | Dashboard + Editor facet | 4 region-blocks (① schedule [timed+dayparted] · ② stats glance+gateway · ③ day-actions must/can · ④ quick-actions) + journal Editor facet; **arrangement toggle** (Journal-first/Dashboard-first) = a user pref; blocks = integration blocks |
| **Global Calendar** `/calendar` | Canvas (calendar) | the `calendar` view-mode over the shared **`dueIn(today)` provider** (Tasks·Routines·Sessions·Reminders·Health·check-ins dayparted) — `ProviderRead`, never direct tables |
| **Spaces page** `/spaces` | Collection/Dashboard | lists Spaces (a Collection) + create/edit (Flow) + per-Space config; the **scope selector** lives in Bar 1 |
| **Sync & Activity Log** `/sync` | Collection + System | `list` view over the local change-log (`sync_queue` + `_sync_*`) + a `SyncStatus` chiplet; multi-device compare = M3+; visibility is a user pref |
| **Feature Atlas** `/features` | Canvas (graph) + Dashboard | the **Graph** canvas (ink voice) over the module-interconnection data + a usage **ledger** (Dashboard, from frecency/analytics, ZK-local) + a suggestion block; enable/disable pref |
| **Session runtime page** | Flow | entity title+summary · stage · **deliverable + description** (a `deliverable_note` page) · **attach** (`note_attachments`: doc/photo/audio) · mark-done/proof · logs via effect rail |
| **Settings** `/settings` | System | searchable index + the **net-new preference controls** (theme-preset · motion · density · Home arrangement · sync visibility · Atlas toggle · module-rename) |

---

## 4. TIER 2 — per-module surfaces (decomposed; **schema-gated** per §6.4)

> Format: surface → archetype · composition. ⛔ = blocked on a ⚠ INTENDED schema amendment.

**Integration**
- Notes top → Collection (`calendar/list/gallery` + the **Graph** canvas). Note page → **Entity, Editor-led** (the one archetype that leads with the Editor facet). `/summary` → integration block.
- Journals → = Home (§3). Wrapped reviews → Canvas (review), Wave 3/4. ⛔ `journal_snapshots`.

**Productivity**
- Tasks top → Collection (12 view-modes; richest). Task page → Entity (Layout + Editor facet, **merged/tabbed** = Victor's work-canvas vs lean). Cross-module All-Tasks → Collection over a `ProviderRead`.
- Habits → Dashboard + Collection (today = `calendar/list/checkbox`); per-habit → Entity (Dashboard + Canvas analytics + completion calendar).
- Projects → Dashboard + Collection (`timeline/board/kanban`); project → Entity (milestones Canvas + doc-vault Canvas + progress block); ⛔ deliverables table, vision/mission pages.
- Routines → Collection + Entity (ordered steps) + **Routine-step RUN flow** (Flow, composes Session runtime). ⛔ v2 service (schema-only).

**Knowledge**
- Learning → Collection (10-tab hub) + Entity (subject) + Dashboard (Programs) + Calendar (My-Week) + **Grading-system builder** (Flow) + Assessment-type rollups (Collection).
- Books → Collection (Bookshelf) + Entity (Book Hub) + **The Reader** (Canvas, 3 modes + physical-companion) + Dashboard (Reading Hub) + Plans/Quotes (Collection) + Add/Plan/Conflict wizards (Flow).
- Knowledge → Collection (Catalog) + **Knowledge Lab** (Canvas) + Entity (Topic) + Dashboard (mastery) + **Flashcards drill** (Flow) + **card-generation** (Flow) + **compound-set builder** (Flow) + **FTS search** (System).
- Skills → **Skills landing** (Collection/Dashboard, *was missing*) + Entity (Skill detail, Composer) + **Skill Graph** (Canvas, ink) + Definition Library (Collection + Flow).
- Sessions → Agenda/My-Week (Collection+Canvas over `dueIn`) + Availability grid (Canvas) + **Session runtime** (§3) + **HUD** (§2) + **Pomodoro** runtime (Flow) + session-type **config** (System) + templates (System).

**Personal Growth**
- Purposes → Collection (dashboards) + Entity (Purpose/Target + ⛔ Value/Dream pages) + **Dreams vision-board** (Canvas) + **Contributions graph** (Canvas) + **Reviews** timeline (Collection). ⛔ `values`·`contributions`·`purpose_reviews`·`plan_steps` + registry.
- Health → Dashboard (metrics glance) + Collection (goals/exams/roles/experiments) + Canvas (metric series · **Monitoring/Domains**) + Entity (goal/role/exam) + **Medical Profile** (System) + Training (workout-session = Flow) + Nutrition (Collections). ⛔ **~12 Core tables (schema 0%)** + Training/Nutrition.

**Life Management**
- Finance → Dashboard (Financial⇄Accounts switch) + Entity (account, nested scoped Collections) + Collection (All-Transactions/Assets/Investments/Liabilities) + **Chart.js analytics** (Canvas) + **Store/net-worth tree** (Canvas) + **Commitments** (Dashboard) + **Import/reconcile wizard** (Flow) + ⛔ Budgets. ⛔ `store`·`import_staging`·budget·multi-currency.
- Relationships → top (Dashboard⇄**Neural Graph** Canvas⇄grouped Collection) + Entity (contact: info+timeline+events+**health band**) + ⛔ Network pages + **Reminders** page (System) + All-Events (Collection). ⛔ `network_groups`·`network_group_contacts`·`closeness_tier`.

**Platform Services**
- Gamification (conditional) → Dashboard (System overview) + **rule-authoring** (Flow). · Notifications → Collection (inbox) + **channel-matrix** controls (System). · Preferences → Settings (§3). · Check-ins → Flow (entry) + Collection+Canvas (history/trends) + **Journal-integration widget** (block).

---

## 5. The build tiers (the decomposition → G5 order)

```
Tier 0  CODEC          view-modes (7) · 6 archetype shells · facet system · 8-state ·
        (foundation)   the pattern-kit (empty·sync·motion·theme·voice·reach·provider) · composition primitives
           ↓           every surface below is a composition of these
Tier 1  SHELL +        the 2 panels · Space-scope · Content · Overlay · Session HUD (region 6)
        CROSS-CUTTING  + Home(4-region) · Calendar · Spaces page · /sync · Feature Atlas ·
                       Session runtime · Settings(net-new controls)
           ↓
Tier 2  PER-MODULE     each surface = a codec composition; sequenced in WAVES by its
        (schema-gated) schema-amendment readiness (§6.4): modules with floor-ready schema first;
                       Health / Purposes-reviews / Finance-store / Relationships-networks after their amendments land
```

**Why this order:** Tier 0 is the dependency of everything; Tier 1 is reachable-shell + the surfaces no module owns;
Tier 2 waves are gated by schema, not by module priority. G5 turns these tiers into the surface `#` sequence.
