# UX-1 — Per-Module View-Intent Harvest (enriches baseline.md §1)

> Gathered from every module's `docs/features/<module>/{identity,contract,structure-data}.md` + `intake/` (Spaces,
> Languages). This is the **"how each module is viewed"** substance the IA organizes — surfaces, standalone pages,
> view modes, nav placement. Sourced (module docs cited inline in the session harvest). Session: 2026-08-01-ux-1-information-architecture.

## A. Cross-cutting / GLOBAL surfaces (not owned by one module — the IA must reserve these)

| Surface                            | What it is                                                                                                  | Owner / source                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Home = Journal daily dashboard** | `/` — summary (what happened) + agenda (what's due), live today / snapshot past                             | Journals (UX-6)                      |
| **Global Calendar**                | cross-module `dueIn(range)` aggregator (tasks, routines, sessions, reminders, commitments, workouts, meals) | Sessions & Scheduling `dueIn()` seam |
| **Command palette (Cmd+K)**        | global overlay, frecency + pinning (`command_bar_history`)                                                  | Preferences (→ UX-2 builds the UX)   |
| **Notifications inbox**            | polymorphic list, unread/archive, status-bar badge; terminal sink                                           | Notifications                        |
| **Settings**                       | tabbed (Appearance·Locale·Notifications·Modules·…), searchable; renders Auth/Data sections it doesn't own   | Preferences                          |
| **Neural Graph**                   | force-directed graph over notes/entities/contacts (Sigma.js)                                                | Notes & Pages, Relationships         |
| **Spaces switcher**                | cross-cutting nav axis over modules (tags · saved views) — see §D tension                                   | Spaces (ADR-006/007 + intake)        |

## B. Per-module SURFACE pattern (top view · standalone pages · aggregate/index · view modes)

**Notes & Pages** — hub. Standalone: page per note; 6 page types. Views: Calendar·List·Gallery·Neural. Aggregate: `/summary`, FTS search, backlinks graph. `route note/[id]`.
**Journals** — = Home. Standalone: one per day (`journal/[date]`). Views: dashboard (summary+agenda), Wrapped-style temporal reviews, snapshot/live.
**Tasks** — top-level. Standalone: All-Tasks screen w/ **12 layouts** (List·Grouped·Board·Calendar·Today·Table·Timeline/Gantt·Tree·Matrix·Swimlanes·Focus·Gallery) + task detail. Aggregate: cross-module All-Tasks (projects/courses/langs/contacts). Saved `views` first-class.
**Habits** — top-level. Standalone: per-habit page (streak/mood analytics + completion calendar). Views: Dashboard (check any) · Today's to-do (Calendar·List·Checkbox) · All-Habits overview.
**Routines** — **NOT top-level** — Sessions & Scheduling realm. Standalone: routine page (ordered steps, policy outcome). Surfaces via Global Calendar + Journal agenda.
**Projects** — top-level hub. Standalone: project (milestones Kanban+tree, doc vault, vision/mission) · milestone · deliverable · project-task. Views: Projects Dashboard (pinnable), Timeline/Board/Kanban.
**Pomodoro** — **NOT top-level, NOT a module** — `focus` Session sub-type runtime = **Focus Mode** (shape-shifts per session type). Surfaces: Tasks detail, Notes `/pomodoro` widget.
**Learning: Education** — top-level Learning hub (10-tab). Standalone: Institution/Program/Curriculum/Degree/Term/Subject + per-assessment. Aggregate: Programs Dashboard, My-Week schedule, GPA report.
**Books** — own module. Standalone: Book Hub (multi-tab) · **The Reader** (read·listen·annotate). Aggregate: Reading Hub, Bookshelf/All-Books (gallery·list·table), All Plans, All Quotes.
**Knowledge** — own module. Standalone: per-Topic page, Area/Container view. Aggregate: Catalog, mastery rollup, due-items, Knowledge Lab. Hosts Flashcards.
**Skills** — higher-order. Standalone: Skill detail (Composer, levels/activities/actions/dev-logs). Views: **Skill Graph** (dependency/synergy canvas), Definition Library.
**Sessions & Scheduling** — foundation. Surfaces: **Agenda / My-Week** (cross-module `dueIn` aggregator), Availability grid, per-session-type UI. (Owns Pomodoro, Routines realm.)
**Purposes & Goals** — CAPSTONE / top-level meaning-spine. Standalone: per-Purpose (targets, reviews) · Values index. Views: rolled-up dashboards, **Dreams/Bucket-List vision-board Gallery**, contributions graph.
**Check-ins** — mostly inside Journal flow + standalone check-ins page (history·calendar·trends). Standalone templates.
**Health** (Core·Training·Nutrition) — top-level umbrella w/ sub-tabs. Standalone: Metrics dashboard, Goals, Adaptation/Experiments, Physical Roles, Medical Profile; Training (plan/template/workout/log); Nutrition (ingredients/dishes/plans/meal-log/shopping). Charts, energy-bridge.
**Finance** — top-level. Standalone: account page (nested txns/assets/liab/inv). Views: top dashboard (Financial ⇄ Accounts switch), All-Transactions/Assets/Investments/Liabilities, Chart.js analytics, Store net-worth tree.
**Relationships (CRM)** — top-level. Standalone: contact page (interaction timeline+events+social), network page. Views: top view = **Dashboard ⇄ Neural Graph ⇄ grouped All-Contacts** (user default). Aggregate: All-Events, Global Reminders, health rollup.
**Gamification** — **NOT nav-primary** — opt-in via Preferences toggle (`feature_gamification`). Surface: System dashboard (currencies/levels/achievements), rule authoring.
**Notifications** — **NOT nav-primary** — inbox + status-bar badge; terminal sink; ZK content-free delivery.
**Preferences** — **NOT nav-primary** — the Settings screen + Cmd+K; Wave-0 foundation consumed by the nav shell itself.

## C. Modules that are NOT top-level primary nav (IA must place them correctly)

> **⚠ CORRECTION (2026-08-02, primary-doc dereference):** this section originally lumped Routines + Check-ins +
> Gamification here. On checking the primary `identity.md` docs (Victor's audit): **Routines is a first-class DOCK
> cockpit** (routines/identity.md:5-8 — "the place the user runs a block of life"; it _launches_ Sessions but is
> "Not a session engine" :45); **Check-ins is SECONDARY** (has a standalone page + Journal-flow entry, check-ins/
> identity.md:25 — not "not-a-module"); **Gamification is a CONDITIONAL dock** item (opt-in, gamification/identity.md:8).
> Only **Pomodoro** (pomodoro/identity.md:6,41) and **Flashcards** (flashcards/identity.md:3,38) are doc-stated
> "not a module." The list below is kept as the original (partly-wrong) harvest record; the map is corrected.

- **Pomodoro** → Focus Mode (Sessions runtime; Tasks/Notes entry). **Routines** → Sessions & Scheduling realm.
- **Gamification** → opt-in feature (Preferences toggle). **Notifications** → inbox/badge (sink).
- **Preferences** → Settings. **Journals** → Home. **Languages** → a **Space**, not a module (dissolved).
- **Flashcards** → Knowledge sub-context. **Check-ins** → Journal flow + secondary standalone.

## D. ⚠ THE NAV-AXIS TENSION (the IA's root decision — docs partly conflict)

- **ADR-007 SP9 / ADR-006 (accepted):** "Spaces is the substrate _beneath_ surfaces, **not a competitor**. Nav
  placement / default-view preference lives in **Preferences** (per-module → per-Space visibility)." → reads as:
  **fixed module nav is primary; Spaces is an organizing/visibility layer over it.** `[FACT: ADR-007:85-88]`
- **intake/spaces.md SP1 (intake, Spaces PARKED — full ADR pending):** "Spaces is a **new FOUNDATION tier, sibling
  to Notes & Pages / Preferences**" — **the nav axis**; Notes & Pages becomes a _consumer_; Languages/Duties/
  Bucket-List **dissolved into Spaces**; per-module visibility generalizes to per-Space; tags nest the nav tree
  (`#language ⊃ #language/spanish`). → reads as: **Spaces is a (co-)primary nav axis above modules.** `[FACT: intake/spaces.md SP1,SP2,SP7]`
- **Reconciliation candidate:** modules are the primary _content_ nav; **Spaces/tags is a parallel cross-cutting
  axis** (a switcher + saved views + user-composed surfaces) that Preferences controls visibility for. Whether
  Spaces is _co-primary_ or _secondary_ is a **design-intent call for Victor** — it is not settled identically
  across the accepted ADRs and the (still-PARKED) Spaces intake.

### ✅ RESOLVED (Victor, 2026-08-01): **CO-PRIMARY DUAL-AXIS**

Two parallel navigation axes coexist, with a clear ownership rule:

- **Module dock = content home** — the fixed, grouped module nav; each module's canonical surface lives here.
- **Spaces bar = cross-cutting overlays** — user-composed Spaces (tags + saved views) that cut across modules.
- User navigates by **module** OR by **Space**. Some entities live on the module axis, some are Spaces-only
  (Languages, Bucket-List, Duties — dissolved into Spaces), some appear on both.
- **Reconciliation with ADR-007 SP9 ("Spaces is not a competitor; nav placement in Preferences"):** compatible IF
  the Spaces bar surfaces **cross-cutting overlays** (saved views over tagged entities), NOT replacement content
  homes — modules keep their canonical homes; saved views are still not new module-surfaces. This decision gives
  Spaces first-class _nav presence_ (per intake SP1) without making a saved-view a module. **⚠ Must be captured
  when Spaces gets its ADR** (PARKED → M1.1) — flag it as an ADR-006/007 nav amendment, not a silent override.
- **M1.0 sequencing (ADR-017 features-first; Spaces PARKED → M1.1):** UX-1 **designs both axes + the ownership
  rule now**; the **module dock is structured concretely** (the code map artifact), the **Spaces bar is a designed
  seam** that goes live when Spaces is built (M1.1). UX-1 does not build the Spaces UI.
