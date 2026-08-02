# PLAN — UX-1 Information Architecture   (session: 2026-08-01-ux-1-information-architecture · language: English)
> Systems-analyst executive summary: read to approve the DIRECTION (Approval 1). Written for two audiences —
> the client understands what will be done and why; the developer absorbs enough to build it. No technical
> build detail. No-Guessing: every claim is [FACT: src] / [INTERP: from fact] / [UNKNOWN: needs X].
> Class: **design/spec issue** (dep-graph — `[FACT: delivery-plan:242]`) that ALSO emits a declarative code
> artifact (dual home — `[FACT: reconstructed-structure.md:72]`) → §XXVI **FULL** gate.
> **Rev 3** (post view-intent harvest + nav-axis decision): scope enriched with the per-module surface inventory,
> global surfaces, and the **co-primary dual-axis** nav model. Grounding: `baseline.md` + `view-intent-harvest.md`.

## 1. Context & demand
The Vida web app is about to receive its modules (M1.1+ pours in Notes, Journals, Tasks, Habits, Finance, …).
Today the app has only a **placeholder shell** — `routes.tsx` exposes just `/` and `/notes`, and its own header
says *"Minimal shell only — the real app layout/IA is UX-3 / UI-4, out of AR-4 scope."* `[FACT: routes.tsx:26]`
Without a fixed **information architecture** (where each module lives, how each is viewed) and **navigation model**
(how the user moves), every module invents its own place and the OS fragments — the failure UX-1 prevents
`[FACT: task goal; [[v1-failure-lessons]]]`. UX-1 is the **experience-track root**: it sets that structure ONCE so
UX-2/UX-3/UX-4/UX-5 build on a known map `[FACT: reconstructed-structure.md:72; delivery-plan:254]`. Crucially, an
IA is not a flat module list — it is grounded in **how each module is viewed** (its standalone pages, view modes,
aggregate surfaces), harvested from all ~22 modules' feature docs into `view-intent-harvest.md`.

## 2. What changes and why
**Value:** a single authoritative IA + nav model + a concrete nav/module-map artifact that every downstream surface
slots into — the highest direct-dependent node in M1.0 (4 dependents) `[FACT: tracker --next]`.

UX-1's home is **dual** (`docs/core/architecture` + `apps/web/src`) `[FACT: reconstructed-structure.md:72]`, so it
delivers BOTH a design doc AND a declarative code artifact:

**IN.1 — IA design doc** (`docs/core/architecture/information-architecture.md`) covering:
- **(a) The co-primary dual-axis nav model** `[FACT: Victor decision 2026-08-01; view-intent-harvest.md §D]` —
  **module dock = content home** (the fixed, grouped module nav) **+ Spaces bar = cross-cutting overlays** (tags +
  saved views over tagged entities). Ownership rule: module dock owns canonical content homes; the Spaces bar
  overlays cross-cutting groupings, never replacing a module home (so saved views stay "not new module-surfaces"
  per ADR-007). **This AMENDS ADR-007:88** ("nav placement / default-view preference lives in Preferences") by
  fixing the Spaces axis as **IA-level structure**, not merely a per-user Preferences toggle — with **ADR-006 §3.4**
  ("a Space is nav-addressable") as the cover for Spaces having first-class nav presence. Formal ADR capture is
  owed when Spaces gets its ADR (PARKED → M1.1); UX-1 records the amendment in the IA doc now.
- **(b) The primary module grouping** — every module from the canonical inventory (system-overview §2) placed into
  the module dock with its group (Integration · Productivity · Knowledge · Personal Growth · Life Management ·
  Platform Services). `[FACT: system-overview.md §2]`
- **(c) The per-module surface CLASS** — for each module, the IA **names that it has** a top view (multi-mode
  where documented), standalone entity pages, and aggregate/index surfaces — **reserving the shape** so downstream
  can attach. It does **NOT** enumerate the specific view modes (e.g. Tasks' 12 layouts, Relationships
  Dashboard⇄Graph⇄Contacts) as UX-1 deliverables — those are each module's **per-module VIEWS review**
  (ADR-007:94) at M1.1+. The specific modes live in `view-intent-harvest.md` as **evidence only**. `[FACT: view-intent-harvest.md §B]`
- **(d) The global cross-cutting surfaces** the IA reserves — **Home = Journal** (`/`), **Global Calendar**
  (Sessions `dueIn` aggregator), **Command palette (⌘K)**, **Notifications inbox**, **Settings**, **Neural Graph**.
  `[FACT: view-intent-harvest.md §A]`
- **(e) Correct placement of the NON-top-level "modules"** — Pomodoro (Focus Mode / Sessions runtime), Routines
  (Sessions realm), Gamification (opt-in Preferences toggle), Notifications (inbox/badge sink), Preferences
  (Settings), Journals (=Home), Languages (a Space, not a module), Flashcards (Knowledge sub-context), Check-ins
  (Journal flow + secondary). `[FACT: view-intent-harvest.md §C]`
- **(f) The route-hierarchy design** — top-level routes, the per-module route pattern (M1.1+), Home `/` = Journal.
  `[INTENT: BR-RT-8/9]`

**IN.2 — Declarative nav/module-map artifact** in `apps/web/src` (e.g. `nav/module-map.ts`) — a typed canonical
**module inventory as central data** (key · label · nav group · route-path · surface/view metadata · nav-placement
flag: dock | spaces-only | global | non-nav). The single source the nav chrome (UI-4) + M1.1+ per-module route
wiring READ from. **Central data, NOT a per-module self-registration seam** — AR-4 resolved the router as a single
central `routes.tsx`, no self-registration seam; this map does not touch `routes.tsx` or add per-module routes.
`[FACT: reconstructed-structure.md:72; web-client-runtime/current-spec.md:88-89]`

**OUT** (documented owners — boundary honesty):
- Shell **visual layout** + responsive → **UX-3** · shell **components** (dock/sidebar/top-bar/command-bar/modal
  host) → **UI-4** `[FACT: delivery-plan:186]` · command-bar + search **UX** → **UX-2** · client-state conventions
  → **UX-4** · onboarding → **UX-5** · **per-module route registration** → M1.1+ `[FACT: routes.tsx:9]`.
- **The Spaces UI + the `nav_preferences` table** → Preferences/Spaces, **M1.1** — UX-1 designs the Spaces-bar axis
  + the nav-pref consume-shape as **seams**, does not build them. `[FACT: roadmap.md:94; ADR-017; Spaces PARKED]`
- **No rendered chrome / layout / visual component** — the `apps/web/src` artifact is map data only.

## 3. Relevant business rules (functional)
1. **[FACT: Victor 2026-08-01; view-intent-harvest.md §D]** **Co-primary dual-axis nav:** module dock (content home)
   + Spaces bar (cross-cutting overlays). Ownership rule: dock owns content homes; Spaces bar overlays, never
   replaces a module home. **This AMENDS ADR-007:88** (nav placement → Preferences) by fixing the Spaces axis as
   IA-level structure; **ADR-006 §3.4** (Space is nav-addressable) is the cover. The Spaces bar is a **designed
   seam** in M1.0, live in M1.1; the amendment is recorded in the IA doc, formal ADR capture owed at the Spaces ADR.
2. **[FACT: system-overview.md §2]** The module dock exposes the **canonical module inventory** (6 user-facing
   groups + substrate distinction), NOT the retired "17 flat modules." Every module is placed; none orphaned.
3. **[FACT: view-intent-harvest.md §C]** The NON-top-level modules are placed at their real home (Sessions realm /
   Preferences / Home / a Space / a sub-context), never as spurious top-level dock items.
4. **[FACT: view-intent-harvest.md §A]** The global surfaces (Home=Journal · Global Calendar · ⌘K · Notifications ·
   Settings · Neural Graph) are first-class IA surfaces, reserved with a place, owned as noted.
5. **[INTENT: BR-RT-8; FACT: performance-strategy.md §6]** Routing is code-based, type-safe, central `routes.tsx`,
   route-based lazy code-splitting; initial bundle < 80 KB gzipped. **[INTENT: BR-RT-9]** route/search params via Zod.
6. **[FACT: reconstructed-structure.md:77 (UX-6)]** **Home (`/`) = the Journal daily dashboard.**
7. **[FACT: ADR-002 §3564; roadmap.md:94; ADR-017]** The nav model is designed to consume `nav_preferences` (dock
   position/size/items) + Spaces visibility, but does NOT build the table (Preferences, M1.1).
8. **[FACT: routes.tsx:9]** Per-module routes are not registered now — the map defines the *pattern* for M1.1+.

## 4. Acceptance (functional)
- [ ] The IA doc places **every** module (system-overview §2) into the module dock with its group — none orphaned; the NON-top-level modules (§2-e) are placed at their real home, not the dock.
- [ ] The **co-primary dual-axis** model is specified: module dock + Spaces bar, with the explicit ownership rule, and it is stated **plainly as an amendment to ADR-007:88** (Spaces axis fixed at IA level, ADR-006 §3.4 as cover) — recorded in the IA doc + owed to the future Spaces ADR.
- [ ] For each top-level module the doc **names that it has** a top view, standalone entity pages, and aggregate/index surfaces (reserving the shape) — **without** enumerating specific view modes as UX-1 deliverables (owner: per-module VIEWS review / M1.1+).
- [ ] The **global surfaces** (Home=Journal · Global Calendar · ⌘K · Notifications · Settings · Neural Graph) each have a reserved place + owner in the IA.
- [ ] The route-hierarchy design defines top-level routes, the per-module pattern (M1.1+), and Home `/` = Journal.
- [ ] The `apps/web/src` artifact is a **typed declarative nav/module map** (incl. the nav-placement flag per module) the nav chrome + future route wiring read from; it **typechecks**, does NOT modify `routes.tsx`, adds no self-registration seam.
- [ ] Each downstream issue (UX-2/3/4/5, UI-4) can point to a section / map entry for "where does my surface live / attach."
- [ ] Boundary held: **no rendered chrome, layout, or component**, no Spaces UI, no `nav_preferences` table, no per-module route registration (owners UX-3/UI-4/Preferences/Spaces/M1.1+ respected).

## 5. Open questions / pending decisions
- Nav-axis primacy — **RESOLVED: co-primary dual-axis** (Victor, 2026-08-01). Scope-grain / Spaces-seam /
  nav_preferences-seam — resolved by doc (`baseline.md §8`). `[FACT]`
- **Homes — VERIFIED against ADR-018 + the tree (Victor: "don't assume, check"):**
  - **Doc home = `docs/core/architecture/information-architecture.md`** `[FACT: reconstructed-structure.md:72;
    sibling of the 8 arch docs incl. system-overview.md whose §2 is the module map]`. CONFIRMED.
  - **Code home = `apps/web/src/`** `[FACT: reconstructed-structure.md:72; platform-strategy.md §5 "app shell/
    routing/layouts → per-app src/, platform-specific"; ADR-017 web-first]` — **NOT** a shared `packages/*`
    (mobile uses a different router; extraction is a later-M4 "if a consumer appears" call, per ADR-020 precedent).
  - **Exact subdir = NOT doc-pinned** (AR-4 topology has no `nav/` home). Recommend a new **`apps/web/src/nav/`**
    (+ ADR-018 §3.6 layer-doc `CLAUDE.md`); alt `apps/web/src/lib/`. **Pinned in the IMPLEMENTATION-PLAN → Approval 2.**
- **[FLAG, non-blocking]** The dual-axis decision **amends ADR-007:88** — to be formally captured when Spaces gets
  its ADR (PARKED → M1.1). UX-1 records it in the IA doc now (§2 IN.1a, §3 BR-1).
- **[BUILD NOTE]** The per-module surface claims cite `view-intent-harvest.md` (a **second-hand** summary of the
  module feature docs). The IMPLEMENTATION-PLAN (gate 2) must **dereference each to its primary
  `docs/features/<module>/*` source** before it becomes a build contract.
- No blocking UNKNOWNs.

## 6. Approval 1 (direction)
✅ **APPROVED by Victor, 2026-08-01** — direction (co-primary dual-axis IA + design doc + `apps/web/src` nav-map
artifact) confirmed; instruction: **verify homes, don't assume** → homes verified in §5 (doc home CONFIRMED;
code home = `apps/web/src/`, subdir `nav/` recommended, pinned at gate 2). FULL variant → IMPLEMENTATION-PLAN
(gate 2) → `/critique` + `/preflight` → Approval 2 → execute → engineering gate → Currency-Rule promotion.
