# Information Architecture

How the Vida web app is organized for navigation: what surfaces exist, how they are grouped, and how the user moves
between them. This is the **experience-track root** (UX-1, LIF-90) — UX-2 (command bar), UX-3 (shell layout), UX-4
(state conventions), and UX-5 (onboarding) build on the structure defined here.

**Audience:** All developers and agents building any web surface. Read after `system-overview.md`.

**Governs:** The navigation model + the canonical module→nav placement. The code artifact is
`apps/web/src/nav/module-map.ts` (central data; not chrome). Rendering is owned by UI-4 (chrome) and UX-3 (layout).

**Content Source:** `system-overview.md §2` (module inventory) · each module's `docs/features/<module>/identity.md`
(view intent) · ADR-006/007 (Spaces/Views) · ADR-002 §3564 (`nav_preferences`) · Victor's nav-axis decision
(2026-08-01). Full derivation + gates: `docs/specs/foundation/ux-1-information-architecture/`.

> **Scope (what this is NOT):** not the shell visual layout/responsive design (UX-3); not the shell components —
> dock/sidebar/top-bar/command-bar/modal host (UI-4); not the command-bar + search UX (UX-2); not per-module route
> registration (each module's M1.1+ wave); not the Spaces UI or the `nav_preferences` table (Spaces/Preferences,
> M1.1). This doc DESIGNS the IA + nav model and reserves the shape; the surfaces are built by their owners.

---

## 1. The navigation model — co-primary dual-axis

Vida navigation has **two co-primary axes** that coexist:

- **Module dock — the content axis.** The fixed, grouped list of modules. Each module's canonical surface (its
  content home) lives here. This is where the user goes "to Finance," "to Tasks," "to Relationships."
- **Spaces bar — the cross-cutting axis.** User-composed **Spaces** (built on tags + saved views) that cut _across_
  modules — e.g. a `#work` Space showing tasks, notes, projects, and contacts tagged `#work` together.

**Ownership rule (resolves overlap):** the **module dock owns canonical content homes**; the **Spaces bar overlays
cross-cutting groupings** and never replaces a module's content home. A saved view is therefore still not a new
module-surface — it is a filtered lens over entities the modules already own.

> **Relationship to ADR-006/007 — an amendment, stated plainly.** ADR-007 §3.5 (SP9) says saved views (Global
> Calendar, dictionary, vision boards) are "not new surfaces… Spaces is the substrate beneath them, **not a
> competitor**," and that "**nav placement / default-view preference lives in Preferences**." This IA **amends
> ADR-007:88** by fixing the Spaces bar as an **IA-level structural axis**, not merely a per-user Preferences
> toggle. The cover is **ADR-006 §3.4**: "a Space is **nav-addressable** and nestable." The saved-view-≠-module
> rule from ADR-007 is preserved (the Spaces bar overlays, it does not replace homes). **This amendment is owed to
> the Spaces ADR** when Spaces is designed (Spaces is PARKED → M1.1).

**M1.0 sequencing (ADR-017 features-first; Spaces PARKED → M1.1):** the **module dock is structured concretely now**
(the `module-map.ts` artifact); the **Spaces bar is a designed seam** that goes live when Spaces is built (M1.1).
`nav_preferences` (ADR-002 §3564 — dock position/size/items, per-Space visibility) is a **consume-shape seam**: the
nav is designed to read it, but the table is built with Preferences (M1.1).

---

## 2. Placement classes

Every module carries one placement (encoded in `module-map.ts`), anchored in its `identity.md`:

| Class           | Meaning                                                                                 |
| --------------- | --------------------------------------------------------------------------------------- |
| **dock**        | a top-level content home in the module dock                                             |
| **global**      | an always-present cross-cutting surface (owned by a module), reached from anywhere      |
| **secondary**   | a reachable standalone page, but surfaced within another realm's flow (not a dock item) |
| **non-nav**     | lives entirely inside another realm; no nav entry of its own                            |
| **spaces-only** | dissolved into the Spaces axis; not a module                                            |

---

## 3. The module dock (content axis)

Grouped per `system-overview.md §2`. Every user-facing module is placed.

| Group                 | Modules (dock)                                   |
| --------------------- | ------------------------------------------------ |
| **Integration**       | Notes _(Journals = Home, see §4)_                |
| **Productivity**      | Tasks · Habits · Projects · **Routines**         |
| **Knowledge**         | Learning · Books · Knowledge · Skills · Sessions |
| **Personal Growth**   | Purposes & Goals _(capstone)_ · Health           |
| **Life Management**   | Finance · Relationships                          |
| **Platform Services** | Gamification _(conditional — see §5)_            |

**Routines is a dock item** — the OS's cross-module **orchestration cockpit**, "the place the user actually runs a
block of life," the _active_ counterpart to the passive Global Calendar. It _launches_ Session sub-types but is
explicitly "Not a session engine" — it is its own surface, not inside Sessions. `[routines/identity.md:5-8,45]`

---

## 4. Per-module surface class

For each dock module, the IA reserves the _shape_ of its surfaces. Specific view **modes** are NOT defined here —
they are each module's **per-module VIEWS review** (ADR-007 §3.6) at M1.1+. Every dock module has: a **top view**
(multi-mode where its `identity.md` documents one), **standalone entity pages**, and **aggregate/index surfaces**.
Examples (from each module's `identity.md`): Tasks — a multi-layout All-Tasks view + task pages + cross-module
aggregate; Relationships — a multi-mode top view (dashboard / graph / contacts) + contact & network pages; Finance —
a dashboard (financial/accounts) + account pages + net-worth tree; Habits — dashboard + per-habit analytics page.
_(The complete surface inventory lives in the unit's `view-intent-harvest.md`.)_

---

## 5. Global surfaces & non-dock placements

**Global surfaces** (owned, reached from anywhere):

| Surface                                                             | Route            | Owner                      |
| ------------------------------------------------------------------- | ---------------- | -------------------------- |
| **Home** = Journal daily dashboard                                  | `/`              | Journals                   |
| **Calendar** (dueIn aggregator — the passive view Routines mirrors) | `/calendar`      | Sessions                   |
| **Search (⌘K)**                                                     | overlay          | Preferences _(UX by UX-2)_ |
| **Notifications** (inbox + badge)                                   | `/notifications` | Notifications              |
| **Settings**                                                        | `/settings`      | Preferences                |
| **Graph** (neural graph)                                            | `/graph`         | Notes / Relationships      |

**Secondary:** **Check-ins** — the daily entry is surfaced within the Journal/Home flow, plus a reachable standalone
page. Not a primary dock item. `[check-ins/identity.md:25]`

**Conditional dock:** **Gamification** ("the System") — opt-in; its System dashboard appears in the dock **only when
`feature_gamification` is on**. `[gamification/identity.md:8,43]`

**Non-nav (live entirely inside another realm):**

- **Pomodoro** → Focus Mode, the runtime of the `focus` Session sub-type; explicitly "not a standalone module."
  Reached from a Task or the Notes `/pomodoro` widget. `[pomodoro/identity.md:6,41]`
- **Flashcards** → a study-method service inside Knowledge; explicitly "not its own module." `[flashcards/identity.md:3,38]`

**Foundation substrates** (`system-overview.md §2` first table) are cross-cutting primitives, **not dock modules**:
Spaces = the second nav axis; Sessions = a dock surface + owns `/calendar`; Points Economy surfaces as Gamification.
Measurability, Saved Views, Review Engine, Capability Registry, and Ingestion & AI have no nav presence.

---

## 6. The Spaces axis (seam)

The Spaces bar lets the user navigate by **cross-cutting Space** instead of by module. A Space is a nav-addressable,
nestable grouping (tags nest: `#language ⊃ #language/spanish`) that owns its own **saved views** (list · table ·
board · gallery · calendar · graph · timeline) over the entities tagged into it. Per-module visibility generalizes
to **per-Space visibility**, configured in Preferences (ADR-006/007). Modules dissolved into the Spaces axis —
**Languages**, **Bucket List** (+ **Dreams** under Purposes), **Duties** (→ Task types) — are reached here, not as
dock modules. **This axis is a designed seam in M1.0 and goes live with the Spaces module (M1.1).**

---

## 7. Route hierarchy

Routing is code-based, type-safe, via a single central `apps/web/src/routes.tsx`, with route-based lazy
code-splitting and a < 80 KB initial bundle; search/route params are Zod-validated. `[BR-RT-8/9; performance-strategy.md §6]`

- **Home** is `/` (the Journal dashboard). `[UX-6]`
- **Top-level routes** are the `routePath` of each dock/global/secondary entry in `module-map.ts` (routes are
  UX-facing and may differ from the module `key` — e.g. `relationships` → `/people`).
- **Per-module routes** are NOT registered by UX-1. Each module registers its own routes in its M1.1+ wave, following
  the pattern `lazy(() => import('./app/<module>'))` into the central tree. `[routes.tsx:9; web-client-runtime:88-89]`

---

## 8. Consumption

- **UI-4** (app shell) renders the module dock, Spaces bar, and global bar by reading `MODULE_MAP` / `GLOBAL_SURFACES`.
- **UX-3** designs the visual layout/responsive behavior of those regions.
- **UX-2** builds the command-bar + search UX for the `⌘K` global surface.
- **Each M1.1+ module** reads its `module-map.ts` entry for its group, route, and placement when it wires its routes.
- **Spaces (M1.1)** activates the Spaces bar seam.

---

## References

- `system-overview.md §2` — the module inventory this IA organizes
- `apps/web/src/nav/module-map.ts` — the canonical nav/module map (code)
- ADR-006 (Spaces & Tags), ADR-007 (Saved Views) — the substrate this IA amends (§1)
- `docs/specs/foundation/ux-1-information-architecture/` — baseline, view-intent harvest, PLAN + IMPLEMENTATION-PLAN, gates
