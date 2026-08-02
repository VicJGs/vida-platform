# UX-1 Information Architecture — No-Guessing Baseline (Step 0)

> **§XXVI.1a baseline.** The grounded, cited ground truth UX-1 must be consistent with — harvested
> BEFORE the PLAN so the gate reasons against reality, not a sketch. Every claim is labeled
> `[FACT: src]` (verified in-repo) / `[INTENT: src]` (documented, owed) / `[UNKNOWN: needs X]`.
> Session: 2026-08-01-ux-1-information-architecture.

## 0. Contexts UX-1 touches & their current-* floor
- **`docs/core/architecture`** — the authoritative IA source (module map + layering). UX-1 AUTHORS an
  IA/nav doc here; **no dedicated IA/nav doc exists yet** → recovered-domain (no As-is floor for the doc itself).
- **`apps/web/src`** — the routing tree + nav chrome. Has a REAL floor from AR-4 (LIF-75), documented at
  `docs/infrastructure/web-client-runtime/current-{spec,business-rules}.md`. UX-1 EXTENDS that floor.

> **ENRICHMENT (2026-08-01, per Victor):** the module map alone is too scarce for an IA — the substance is **how
> each module is VIEWED**. See [`view-intent-harvest.md`](./view-intent-harvest.md) for the full per-module surface
> inventory (standalone pages · view modes · aggregate surfaces · nav placement) + the global cross-cutting
> surfaces + the **nav-axis tension** (§D) that is now the IA's root decision. §1 below is the flat inventory; the
> harvest is the view-intent layer over it.

## 1. Authoritative IA source — the module map `[FACT: system-overview.md §2]`
The canonical inventory UX-1's IA must cover (NOT the older "17 flat modules"):
- **Integration Layer:** Notes & Pages, Journals *(Journals = the daily dashboard; `/summary` auto-populates)*
- **Productivity:** Tasks, Habits, Routines, Projects, Pomodoro *(Pomodoro = a `sessions` sub-type, ADR-004)*
- **Knowledge:** Learning, Languages
- **Personal Growth:** Purposes & Goals, Check-ins, Bucket List
- **Life Management:** Finance, Relationships
- **Platform Services:** Gamification, Notifications, Preferences
- **Foundation Substrates (cross-cutting, not user-facing modules):** Spaces & Tags (006), Sessions (004),
  Measurability (011), Points Economy (012), Saved Views (007), Review Engine (005), Capability Registry (008/010),
  Ingestion & AI (014/015).
- **Layering** `[FACT: system-overview.md §3]`: Notes & Journals → Data Modules → Foundation Substrates → Core
  Infrastructure. This is the CONCEPTUAL layering (dependency), which informs — but is not identical to — the nav IA.

## 2. As-built floor in `apps/web/src` `[FACT: routes.tsx; app-shell-ui-store.ts]`
- **`routes.tsx`** — code-based TanStack Router tree from AR-4. Currently: `rootRoute` (a MINIMAL `<nav>` shell with
  Home + Notes links + `<Outlet/>`), `indexRoute` `/`, `notesRoute` `/notes` (one lazy reference route). The file
  header states verbatim: *"the real app layout/IA is UX-3 / UI-4, out of AR-4 scope"* and *"Per-module routes land
  with each module's own wave (M1.1+)."* → **UX-1 owns the IA/route-hierarchy DESIGN; the shell VISUALS are UX-3,
  the shell COMPONENTS are UI-4, and per-module route registration is each module's later wave.**
- **`app-shell-ui-store.ts`** — reference Zustand store; holds `isSidebarOpen` + toggles. Ephemeral UI only.

## 3. Routing / nav conventions & hard constraints `[web-client-runtime/current-business-rules.md]`
> NB: BR-RT-8/9/6/7 are labeled **`[INTENT]`** in source (documented-but-owed, not verified-as-built) — cite them
> as `[INTENT]`, not `[FACT]`. The *< 80 KB budget* is `[FACT: performance-strategy.md §6]`.
- **[INTENT] BR-RT-8** — routing is code-based + type-safe, central `routes.tsx`, route-based lazy code-splitting
  (`lazy(() => import('./app/<module>'))`). Initial bundle (shell + router + core React) **< 80 KB gzipped**
  `[FACT: performance-strategy.md §6]`.
- **[INTENT] BR-RT-9** — search/route params validated with Zod (same validator vocabulary as forms + DB).
- **BR-RT-6/7** — Zustand holds ONLY ephemeral UI (nav selection, sidebar/panel state); **persisted nav preferences
  are React Query over SQLite, NEVER Zustand**.
- **Latency** `[FACT: performance-strategy.md §1]`: list-view render < 100 ms, detail < 150 ms from nav event.

## 4. `nav_preferences` — specified but NOT built `[FACT: ADR-002 §3564 (CREATE TABLE); not in packages/core/src/db/schema]`
The goal says "`nav_preferences`-backed navigation." The table is DESIGNED in ADR-002 but does not exist in schema
yet (Preferences domain, M1.1+). Its shape reveals the intended nav metaphor — a configurable **dock**:
`dock_position ∈ {bottom,left,right}` · `dock_auto_hide` · `dock_size ∈ {small,medium,large}` ·
`mobile_nav_items` (JSON array of module keys) · `show_labels` · `haptic_feedback` · `reduce_motion`.
→ **[UNKNOWN: needs PLAN]** UX-1 in M1.0 can DESIGN the nav model to plug into `nav_preferences`, but cannot
IMPLEMENT a preference-backed nav against a non-existent table (BR-RT-7 also forbids holding prefs in Zustand).

## 5. Spaces vs. the fixed module map `[FACT: ADR-007 SP9; ADR-006]`
Central IA tension, already adjudicated by ADR: **Spaces is a substrate beneath surfaces, NOT a competitor to the
module nav.** Global Calendar, dictionary, preset tabs, vision boards are **saved `views`**, not new nav surfaces.
**"Nav placement / default-view preference lives in Preferences (generalizing per-module visibility to per-Space)."**
→ The IA must reconcile a FIXED module map (§1) with USER-DEFINED Spaces/Views as a preference-driven layer over it.

## 6. Home surface `[FACT: reconstructed-structure.md:77 — UX-6]`
`UX-6 — "Home = Journal dashboard"` (← UX-3). The `/` index route ultimately renders the daily Journal. UX-1's route
hierarchy must reserve `/` for the Journal home (currently a placeholder `<h2>Vida</h2>`).

## 7. Boundary — what UX-1 is NOT (so grain stays honest)
- **NOT** the shell visual layout / responsive design → **UX-3** `[FACT: web-client-runtime BR, routes.tsx header]`.
- **NOT** the shell components (nav/sidebar/top-bar/command-bar/modal host) → **UI-4**.
- **NOT** the command bar + search UX → **UX-2**. NOT client-state conventions → **UX-4**. NOT onboarding → **UX-5**.
- **NOT** per-module route registration → each module's M1.1+ wave.

## 8. Scope questions — RESOLVED BY DOC (not open; anchored, not guessed)
1. **Scope grain — `[FACT: m1.0-delivery-plan.md:242 + reconstructed-structure.md:72 home]`** — "design/spec issue"
   in delivery-plan:242 is a **dependency-graph** statement (UX-1's blocker is upstream design, NOT downstream
   components) — it does NOT mean "emits no code." The authoritative home is **dual**: `docs/core/architecture`
   **and** `apps/web/src` `[FACT: reconstructed-structure.md:72]`. So UX-1 delivers BOTH:
   (a) the IA + nav-model **design doc** (`docs/core/architecture/information-architecture.md`), AND
   (b) a **declarative canonical module→route/nav map** artifact in `apps/web/src` (the top-level route/nav
   structure that per-module routes attach to in M1.1+) — extending `routes.tsx`, NOT chrome.
   Still NOT: shell layout (UX-3) · shell components nav/sidebar/top-bar/command-bar/modal host (UI-4, `:186`) ·
   per-module route *registration* (M1.1+). → because (b) is code, this is a **code build → FULL §XXVI gate**.
2. **Spaces-in-nav — `[FACT: ADR-007 SP9; ADR-006]`** — "Nav placement / default-view preference lives in
   **Preferences** (generalizing per-module visibility to per-Space)." Spaces are built as **surfaces over AR-6 in
   M1.1** `[FACT: roadmap.md:94]`. → M1.0 nav IA is module-map based; Space placement is a Preferences concern (M1.1).
   UX-1 designs only the seam.
3. **nav_preferences-backed — `[FACT: roadmap.md:94; ADR-017]`** — Preferences (owner of `nav_preferences`) is
   **M1.1** ("Notes & Pages → Preferences → Journals → Spaces"), after this milestone; ADR-017 is features-first.
   → UX-1 designs the nav model to consume `nav_preferences`; the table + backing land in M1.1. Seam only.

## Sources read
`system-overview.md §2–3` · `routes.tsx` · `app-shell-ui-store.ts` · `web-client-runtime/current-business-rules.md`
· `performance-strategy.md §1,§6` · `ADR-007 SP9` · `ADR-002 §3560 (nav_preferences)` · `reconstructed-structure.md:72,77`.
