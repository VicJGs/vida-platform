# Surface Map — the frontend re-plan's unit inventory (G2 output, pass 1)

> **Status:** G2 pass 1, 2026-10-01. Enumerates **every surface** (the page/tab the user navigates), classifies it by
> **archetype** (`frontend-quality-bar/_index.md §4.4`), runs the **3-lens audit** (WRONG / MISSING / OVERFLOWING)
> against the Quality Bar, and flags **documented** vs **discovered (unannounced)**. Feeds G3 (composition map) + G4
> (coverage / ≥2-paths set-cover).
> **Sources:** `ux-1-information-architecture/view-intent-harvest.md` (the surface inventory) · `os-structure-baseline.md`
> · `frontend-quality-bar/_index.md` (the bar) · the ADRs. **Scope:** web, M1.0.

## Method

The surface is the unit (not the module-twin — Victor's re-frame). Each row: **surface · archetype · documented?/
discovered · notable 3-lens findings**. Systemic findings (ones that recur on nearly every surface) are stated once in
§4 rather than repeated per row. Archetypes: **Col**lection · **Ent**ity · **Dash**board · **Can**vas · **Flow** ·
**Sys**tem (+ the Editor/Layout facet model for entity surfaces).

---

## 1. Global & cross-cutting surfaces

| Surface                      | Route                | Archetype            | Doc?           | Notable 3-lens                                                                                                                                                          |
| ---------------------------- | -------------------- | -------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Home = Journal dashboard** | `/`                  | Dash (+Editor facet) | doc (UX-6)     | MISSING: the 4-region reshape (schedule·stats·day-actions·quick-actions) + arrangement toggle (Journal/Dashboard-first) — P3                                            |
| **Global Calendar**          | `/calendar`          | Can (calendar)       | doc            | **DISCOVERED cross-module**: composes Tasks·Routines·Sessions·Reminders·Health via `dueIn` — the per-module grain hid it; MISSING: dayparted-item rendering (check-ins) |
| **Command bar ⌘K**           | overlay              | Sys                  | doc (UX-2)     | MISSING: `search-unavailable` honest state (FTS M1 stub); it is the nav spine — perf-critical                                                                           |
| **Notifications inbox**      | `/notifications`     | Col (Sys)            | doc            | MISSING: empty state; reminder-type rendering for check-ins                                                                                                             |
| **Settings**                 | `/settings`          | Sys                  | doc            | MISSING: the net-new preference controls (theme-preset·motion·density·Home arrangement·sync visibility·Atlas·module-rename); searchable index                           |
| **Neural Graph**             | `/graph`             | Can (graph)          | doc            | WRONG-risk: must render in the editorial ink voice (not a blue SaaS graph) — P6/F3 note                                                                                 |
| **Spaces page**              | `/spaces`            | Col/Dash             | **DISCOVERED** | the Spaces axis as a _page_ (not a strip) + the `Spaces:` scope selector in Bar 1 — Victor refinement; owed ADR-006 amendment                                           |
| **Sync & Activity Log**      | `/sync`              | Col/Sys              | **DISCOVERED** | P4 — this-device change log + multi-device compare (M3+); net-new vs the 6 global-bar surfaces; user-controlled visibility                                              |
| **Feature Atlas**            | `/features` (toggle) | Can (graph)+Dash     | **DISCOVERED** | P5 — map + usage ledger + data-driven help; ZK-local; enable/disable surface                                                                                            |
| **Session runtime page**     | overlay/page         | Flow                 | **DISCOVERED** | deliverable-per-stage page (title·summary·stage·deliverable+desc·attach doc/photo/audio·mark-done/proof) — Victor extension on ADR-004                                  |
| **Persistent Session HUD**   | persistent           | Flow (chrome)        | **DISCOVERED** | a **new persistent shell element** beyond the 5 regions; follows the user everywhere                                                                                    |
| **Onboarding**               | first-run            | Flow                 | doc (UX-5)     | MISSING: optional guided setup; copy-honesty (M1 local-first vs M3 ZK)                                                                                                  |

**The two nav panels** (Bar 1 system/account + scope selector; Bar 2 content/modules) are shell chrome, not content
surfaces — specced in the Quality Bar §4.1 (positionable, content-fitting responsive panels).

---

## 2. Per-module surfaces (by dock cluster)

> Each module nests **Top view (Collection, multi-mode) → Entity page (Layout + optional Editor facet) → tabs/sections
> (blocks)**. Entity-page composition is user-configured (per-type default, remembered). Only _notable_ per-surface
> findings are listed; the systemic ones (§4) apply throughout.

### Integration

- **Notes** — Top: Calendar·List·Gallery·**Neural** (Col+Can). Entity: note page ×6 page-types (Editor-led — the one
  archetype that _leads_ with the Editor facet). Aggregate: `/summary`, FTS search, backlinks graph. _Hub: hosts the editor substrate._
- **Journals** — = Home (see §1). Entity: day page. Can: **Wrapped-style temporal reviews** (DISCOVERED-ish: a review Canvas, Wave 3/4).

### Productivity

- **Tasks** — Top: All-Tasks **12 layouts** (Col; the richest view-mode consumer) + cross-module All-Tasks. Entity:
  task page (**Layout + Editor facets** — Victor's "work-canvas vs lean" compositions). MISSING: the merged/tabbed facet choice.
- **Habits** — Top: Dashboard·Today·Overview (Dash+Col). Entity: per-habit page (**analytics + completion calendar** = Dash+Can).
- **Projects** — Top: Dashboard·Timeline·Board·Kanban (Dash+Col). Entity: project→milestone→**deliverable**→task
  (Ent; the composable project page — finance/time/progress/milestone-mix per P-C component spec) + doc vault (Can).
- **Routines** — Top: dashboard·today·policy (Col). Entity: routine page (ordered steps). Surfaces via Calendar + Journal (cross-module).

### Knowledge

- **Learning** — Top: 10-tab hub (Col/Dash). Entity: institution/program/term/**subject** (schedule·syllabus·exams). Aggregate: Programs Dashboard, **My-Week**, GPA report.
- **Books** — Top: Bookshelf/All-Books gallery·list·table (Col). Entity: Book Hub (multi-tab) + **The Reader** (Can — read·listen·annotate). Aggregate: Reading Hub, All Plans/Quotes.
- **Knowledge** — Top: Catalog (Col) + **Knowledge Lab** (Can). Entity: Topic/Area pages. Nested: **Flashcards** (review runtime = Flow). Aggregate: mastery rollup, due-items.
- **Skills** — Entity: Skill detail (Composer). Can: **Skill Graph** (dependency/synergy). Library: Definition Library (Col).
- **Sessions** — Top: **Agenda/My-Week** (Col, cross-module `dueIn`) + Availability grid (Can). Per-session-type UI (Flow — see §1 runtime). _Owns the HUD + Pomodoro focus runtime._

### Personal Growth

- **Purposes & Goals** — Entity: per-Purpose (targets·reviews) + Values index. Views: rolled-up dashboards (Dash),
  **Dreams/Bucket-List vision-board** (Can — gallery), contributions graph (Can).
- **Health** (Core·Training·Nutrition) — Top: umbrella w/ sub-tabs. Entity/Dash: Metrics dashboard, Goals, Adaptation,
  Roles, Medical; **Training** (plan/template/workout/log — workout = a Session type); **Nutrition** (ingredients/dishes/plans/meal-log/shopping). Chart-heavy (Can).

### Life Management

- **Finance** — Top: dashboard (Financial⇄Accounts switch, Dash). Entity: account page (nested txns/assets/liab/inv).
  Aggregate: All-Transactions/Assets/Investments/Liabilities (Col), **Chart.js analytics** (Can), Store **net-worth tree** (Can/Col).
- **Relationships** — Top: **Dashboard⇄Neural Graph⇄grouped Contacts** (Dash+Can+Col, user default). Entity: contact
  page (interaction timeline+events+social), network page (Can). Aggregate: All-Events, Global Reminders, health rollup.

### Platform Services

- **Gamification** (conditional) — System dashboard (currencies/levels/achievements, Dash) + **rule authoring** (Sys/Flow). Opt-in (`feature_gamification`).
- **Notifications** — inbox + badge (see §1).
- **Preferences** — Settings + ⌘K (see §1).
- **Check-ins** (secondary) — Journal-flow entry (Flow) + standalone page (history·calendar·trends = Col+Can) + templates.

---

## 3. Discovered / unannounced surfaces (the G2 yield)

The per-module grain hid these; the Quality Bar + Victor's vision surfaced them. Each is **net-new to the documented
7-surface global set** and must be homed in G3/G5:

1. **Spaces page** + the global **Space-scope selector** (nav refinement).
2. **Sync & Activity Log** (`/sync`).
3. **Feature Atlas** (`/features`).
4. **Session runtime page** (deliverable-per-stage) + the **persistent Session HUD** (a 6th shell element).
5. **Global Calendar as a cross-module composition** (Tasks·Routines·Sessions·Reminders·Health) — documented as a
   surface but its cross-module _composition_ is the kind of thing the backend per-module grain obscured.
6. **Wrapped-style temporal reviews** (Journals) — a review Canvas (Wave 3/4).

---

## 4. Systemic 3-lens findings (apply across nearly every surface)

**MISSING (fill at build, per the bar):**

- **Empty/cold-start states** — most surfaces have none; the bar requires teaching-invitation empties (P5/E2).
- **Sync status + honest progress** — absent in the UI; required (P4).
- **Reduced-motion alternatives** — required for every animation (§2.7).
- **Theme-ability** — every surface must render under the 3 presets + user density (P1); any hard-coded palette = **WRONG**.
- **The Editor/Layout facet choice** on entity pages (merged/tabbed) — P6/F3.
- **≥2 reachable paths** per capability — to be _proven_ at G4 (set-cover), flagged here per surface.
- **Microcopy/voice + copy honesty** — surfaces inherit the voice bar (P6/F1-2).

**OVERFLOWING (guard):**

- Cross-module surfaces (Calendar, All-Tasks, Atlas) must read via **provider APIs / Views**, never direct cross-module
  tables (INT-1; ADR-007 provider pattern). A surface doing another module's interactive work = overflow.

**WRONG (catch):**

- Any surface off the responsive grid / outside the 8-state machine / with a non-themeable palette / overclaiming ZK.

---

## 5. Next (feeds G3/G4)

- **G3** — map each surface to its **archetype + composition** (which blocks/views/capabilities it hosts), and build
  `decomposition.md` + `traceability.md` (surface ← intent source).
- **G4** — the **coverage gate**: prove every capability has **≥2 reachable paths** (set-cover over this surface map),
  and that the 222 P4 legs (the floor) + the discovered surfaces are all covered.
- **Open:** per-module surface lists here are harvested from `view-intent-harvest.md` (the gathered inventory) — a
  deeper per-module pass can enrich the 3-lens before G3 if desired.

---

## 6. Enriched audit — G2 pass 2 (four parallel cluster auditors, 2026-10-01)

Four independent auditors swept the clusters (A Notes/Journals/Tasks/Habits/Projects/Routines · B Learning/Books/Knowledge/Skills/Sessions · C Purposes/Health/Finance/Relationships · D global + discovered + platform), each grounding every surface in its module docs + the Quality Bar.

### 6.1 Confirmed systemic findings (recur on **every** surface, all four clusters — fix as cross-cutting patterns, not N bespoke problems)

1. **Empty / cold-start states** — teaching-invitation empties absent nearly everywhere (P5/E2).
2. **Sync status + honest progress** — no P4 sync chip / honest "computing…" / provider-unavailable state.
3. **Reduced-motion alternatives** — missing for every animation (graphs, board drag, page-turn, mode-switch, charts) (§2.7).
4. **Theme-ability** — must render under the 3 presets + density; any hard-coded palette = **WRONG** (P1). Graph/chart surfaces (Neural · Skill · contributions · Atlas · Chart.js) are the biggest WRONG-risk → must be editorial ink, not blue SaaS.
5. **The Editor/Layout facet choice** (merged / tabbed Home·Content) — universally missing on entity pages; gated by page-ability registry (ADR-006 SP2).
6. **Microcopy / voice + copy-honesty** — surfaces inherit the voice bar; AI/extension paths (Books ISBN·TTS·OCR, Skills LLM, Education extract) need consent + "this is a draft" copy; **no ZK-sync claim before M3**.
7. **≥2 reachable paths** — to be _proven_ at G4 (set-cover); flagged per surface.
8. **Provider-pattern reads** — cross-module surfaces (Calendar · All-Tasks · Atlas · Agenda) must read via provider APIs / Views, never direct tables (INT-1, ADR-007).

### 6.2 Full discovered / missed-surface roster (consolidated across clusters — net-new to home in G3/G5)

- **Shell / global:** Spaces page + the `Spaces:` scope selector · Sync & Activity Log `/sync` · Feature Atlas `/features` · Session runtime page · **persistent Session HUD (shell region 6)** · the two positionable nav panels.
- **A:** Routine-step **run** flow (distinct from the routine entity page) · cross-module All-Tasks scoped views · project-events → Calendar lane.
- **B:** Skills **landing** page (primary entry — missing) · Knowledge **search (FTS)** · Assessment-type rollup pages · Grading-system builder · Session-type **config** · Session **templates** mgmt · Flashcards **card-generation** flow · Knowledge **compound-set** builder · Pomodoro quick-start · Books cross-module (subject) partition rendering · Books **physical-companion** reader mode (possibly a separate surface).
- **C:** Purposes **Values index** · **Contributions graph** · **Reviews** timeline · Per-Value & Per-Dream pages · Health **Monitoring/Domains** · **Experiments** · **Medical Profile** · **Physical Roles** · workout-session detail · Nutrition (ingredients/dishes/plans/meal-log/shopping) · Finance **Commitments** mgmt · **Store / net-worth tree** · **Import/reconciliation** wizard · Budget surfaces · Relationships **Network** pages · **Reminders** page · contact **health band** · All-Events.
- **D (platform):** Gamification **rule-authoring** surface · Notifications **channel-matrix** controls · Check-ins **Journal-integration** widget.

### 6.3 The build-shape insight (the real G2 yield — feeds G3/G5 sequencing)

The surfaces do **not** build "18 modules in parallel." The audit reveals a hard dependency order:

1. **Prerequisite — the ARCHETYPE CODEC.** Nearly every surface composes from a small set: **Collection (7 view layouts) · Dashboard (integration-block grid) · Entity (Layout + Editor-facet, merged/tabbed) · Canvas (Editor · Graph · Reader · Vision-board · Calendar) · Flow/Session · System**. These components + the facet system + the 8-state machine must be **built and audited first** — they're the codec every module inherits. (Currently: `list-view`/`neural-graph` exist; Dashboard/Entity-facet/the other Canvases are missing.)
2. **Then — the SHELL + the ~7 cross-cutting discovered surfaces.** The two positionable panels · the Space-scope selector · the **6th region Session HUD** · Home's 4-region reshape + arrangement toggle · Spaces page · `/sync` · Feature Atlas · Settings' net-new controls · the Session runtime page.
3. **Then — per-module surfaces, each GATED on its ⚠ INTENDED schema amendments** (§6.4).

### 6.4 Schema-amendment blockers (surfaces that cannot build until the schema lands — from the audit)

| Module            | ⚠ INTENDED additions blocking surfaces                                                                                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purposes**      | `values` · `contributions` (rename 3 junctions) · `purpose_reviews` · `plan_steps` · entity-type registry +`value`,`dream` → blocks Values index · Contributions graph · Reviews · Value/Dream pages |
| **Health**        | **~12 Core tables NEW (schema 0%)** + Training (`workout_sessions`…) + Nutrition (`meal`,`nutrition_plan`…) → blocks ALL Health surfaces                                                             |
| **Finance**       | `store` · `import_staging` · Commitments (derived) · budgeting · multi-currency/FX → blocks Store tree · Import wizard · Commitments · Budgets                                                       |
| **Relationships** | `network_groups` · `network_group_contacts` · `closeness_tier` · restored fields → blocks Network pages · Neural Graph data · contact-health band                                                    |
| **Routines**      | v2 is schema-only (0 service) → blocks the run-flow + today surfacing                                                                                                                                |

> **Status 2026-10-21:** superseded by `golive-replan/gap2-schema-gates.md` — all tables landed; only Finance services (+ budgeting design pass) remain, homed in fe-finance.

### 6.5 Status reality

Most modules are **schema-floor only; services + surfaces = 0 lines** (`.gitkeep`). So this surface-map is a **design inventory**, not an audit of built screens. The per-surface WRONG findings are almost all _latent_ (nothing built to be wrong yet); the dominant lens is **MISSING**. That's expected at G2 and is exactly what G3 (composition) + G5 (order) consume.

> **Full per-surface 3-lens detail** (archetype · composition · reachability · WRONG/MISSING/OVERFLOWING with module-doc citations) was produced by the four cluster auditors and is captured in this session's audit outputs; §6 consolidates their cross-cutting signal.
