# Frontend Quality Bar — the yardstick (G1 output)

> **Status:** drafted 2026-10-01 (G1 of the frontend re-plan). The authoritative **quality bar** every frontend
> surface is measured against in **G2's 3-lens audit** (WRONG / MISSING / OVERFLOWING) and the **Visual Gate**.
> **Sources:** global `~/dev-toolkit/STANDARDS.md` · `frontend-replan/process.md` (the flow) · `_index.md` (gates) ·
> `os-structure-baseline.md` (documented skeleton) · the **P1–P6 experience capture** (specimens below, decisions in
> `.claude/tasks/frontend-replan.md`) · the ADRs (001–009, UX-1/3/6, shell-layout, command-bar-and-search, sessions,
> notes-and-pages). **Scope:** web, M1.0.
>
> **Specimens (the visual record of the bar):** `frontend-replan/p1-identity-specimen.html` ·
> `p2-space-motion-specimen.html` · `p3-home-the-day-specimen.html` · `p4-trust-reversibility-specimen.html` ·
> `p5-discover-own-specimen.html` · `p6-voice-coherence-specimen.html` · `p6-archetypes-design.html` ·
> `p6-organization-map.html`.

---

## 0. How this bar is used

Every surface harvested in G2 is audited against this document with the **3-lens** test, then passed through the
**Visual Gate** as the final input (docs don't hold all intent — the flow *notices* gaps):

- **WRONG** — contradicts a standard or a decision in this bar (an off-grid layout, a state outside the 8-state
  machine, copy that overclaims ZK, a non-themeable hard-coded palette, a capability reachable only one way).
- **MISSING** — an intended slot/state/behaviour absent (no empty state, no reduced-motion alt, no sync status,
  a surface not reachable ≥2 ways, a composition slot the schema requires, **a data leg stubbed with no proven issue
  home**, an inherited Envision EC not carried).
- **OVERFLOWING** — scope beyond the surface's job (a module reading another's tables, a view doing a capability's
  interactive work, a bespoke screen that should be an archetype).

---

## 1. Inherited standards (apply as-is — reference, not duplicated)

The global `STANDARDS.md` domains govern unchanged: **design** (I–V, X–XII) · **components** (VI–VIII) ·
**motion** (IX) · **engineering** (XIII–XVIII) · **process** (XIX–XXX). Pin: **WCAG 2.1 → 2.2 AA** (POUR). The
additions below are *only* what this re-plan adds on top.

---

## 2. Standards-bar ADDs (this re-plan's additions to the global bar)

1. **Voice & microcopy** — Vida's voice: **plain · calm · honest · warm · yours · sentence-case** (P6/F1).
2. **Copy honesty** — overclaims → staged-honest · blames → teaches the fix · dead-end → anti-lost. **Never claim
   zero-knowledge *sync* before M3** (M1.0 = local-first, on-device, encrypted at rest). (P6/F2, onboarding copy-honesty contract.)
3. **Localization** — ship **English + pt-BR in M1**; i18n-ready architecture (externalized strings; locale-aware
   dates/numbers/currency via `locale`/`number_format`/`time_format`; logical-property layout so RTL is possible later). (P6/F5)
4. **IA / surfacing** — **≥2 reachable paths per capability**: a **hard floor** (1-path feature *fails* the G4
   coverage gate) + a **soft signal** above it. Reach via dock · ⌘K · contextual/`[[link]]` · (M1.1) Spaces. (P5/E1)
5. **Gestalt & cross-module coherence** — delivered structurally by the **archetype catalog** (§4): surfaces compose
   from a small set of shells + renderers, so consistency can't drift. (P6/F3-F4)
6. **Offline / local-first state** — honest **sync status** (calm, never alarming); **no fake spinners** (writes are
   instantly real locally — optimistic layer = none, a **P4-derived decision**, not an inherited standard; **one pinned exception:** preferences writes are optimistic + debounced with revert-on-error and "Saved on this device" — fe-settings EC-7, gate A7, BR-RT-4's pinned exception, built by preferences-rescope R2/R3); **honest progress** for genuinely-slow ops (FTS rebuild, sync,
   export, vault unlock); the full **8-state** component machine. (P4) **Enforced at entity close** — the Entity Live
   Close, `golive-replan/process.md` ELC-6/7/9 (real data, live on OPFS, every pinned EC re-verified).
7. **Reduced motion** — every animation ships a `prefers-reduced-motion` alternative (both designed + tested).
8. **Performance** — motion budget 150–450ms (>500ms justified); **< 80 KB initial bundle** (route lazy-split);
   a **font-loading budget** for the N-theme system (serving ~5 families + live type-ramp swap).

---

## 3. The experience bar (P1–P6) — the "feel" sections

The Surface-plane vision captured with Victor. Every surface must honour these.

**P1 — Identity & Feel.** Metaphor = **a book / living journal**. Voice = **editorial**. Identity is **themeable** —
three user-chosen presets: *The Reader* · *The Editorial* · *The Quiet Desk*. **Density is user-controlled**.
**Light is primary.** **Default = The Editorial + calm density** (cold-start). *(Implication: the token arch must
support N swappable theme families incl. font-family — ds-2/ds-4.)*

**P2 — Space & Motion.** Transition is **user-selectable** (page-turn · cross-fade · slide · none/instant). Motion
**voice = soft & organic** (one OS signature). **Settle, not spinner**; `None` = truly invisible; slow ops show
honest progress. *(Build watch: organic is upper-budget + overshoot → scale down / interrupt on rapid nav;
reduced-motion strips the spring.)*

**P3 — The Day / Home.** Home arrangement is a **user choice** (Journal-first / Dashboard-first). Four regions:
**① schedule (timed) · ② stats glance+gateway · ③ day-actions (must/can) · ④ quick-actions**. Momentum
**optional & quiet** (gamification opt-in). **Check-ins are user-scheduled** (template cadence + day-part) → surface
as a **reminder notification** + a **dayparted agenda item** (shared `dueIn`, also feeds Calendar). The schedule region
renders **both** precise-timed and dayparted items.

**P4 — Trust & Reversibility.** The sync indicator is the entry to a **Sync & Activity Log** (this device's change
log + multi-device compare when synced), with **user-controlled presentation** (chip · `/sync` page · on-change ·
hidden). **Undo by default** (soft-delete → undo toast + Trash restore); **hard confirm only for the irreversible**.
Copy is **stage-honest** (M1 local-first vs M3 ZK). *(M1: local-only honest; multi-device compare = M3+.)*

**P5 — Discover & Own.** **≥2 reachable paths** (hard floor + soft signal). Cold-start = **teaching-invitation empty
states** (default) + **optional guided setup**. Personalization at **three grains** — ① configure · ② compose ·
③ enable/disable. The **Feature Atlas** (an enable/disable surface): an ink-on-paper **map** + a **usage ledger** +
**data-driven help**, all **ZK-local**. **Preference fields** (reconcile vs `user_preferences`, ADR-002 §5.17): **net-new** = theme-preset · motion ·
Home arrangement · sync-indicator visibility · Feature-Atlas toggle · module rename; **extend existing (⚠ INTENDED)**
= density (`compact_mode`/`font_size` :3524-3525) · default-landing (`default_dashboard_view` :3534); **already ships,
no change** = notification quiet-hours (`quiet_hours_*` :3549-3551). *(Core captured set = 5: theme · density · motion ·
Home arrangement · sync visibility; Atlas-toggle + module-rename come from the F3 capture.)*

**P6 — Voice & Coherence.** The voice principles (above) + honest copy + the **archetype catalog** as the coherence
lever + **en/pt-BR**.

---

## 4. The organization & composition model (the structural bar)

The doc-true + Victor-refined model every surface is built on. (Full detail: `p6-organization-map.html`,
`p6-archetypes-design.html`.)

**4.1 Navigation.** Two **positionable, content-fitting responsive panels** (macOS/iPadOS-inspector style — dock
together on any side; size to contents in 2–3 columns / 1–4 rows; viewport-edge only when needed). **Bar 1** =
system/account — the **6 documented global-bar surfaces** (Home · Calendar · ⌘K search · Notifications · Settings ·
Graph `[shell-layout.md:34; information-architecture.md:102-107]`) **redistribute across Bar 1 / Bar 2 / ⌘K, none
dropped** (the `/sync` surface is net-new vs those six) **+ a `Spaces:` scope selector** (all Spaces +
*None*) that **globally scopes the OS** to a Space; a dedicated **Spaces page** exists. **Bar 2** = content (modules by
default, or the user's choice). **⌘K is the spine** ("jump anywhere · do anything · search, from any screen"); the
shell reflows (dock drawer→rail→sidebar; Spaces→⌘K on mobile). *(Refines the documented "Spaces bar" strip → scope
selector + page: owed as an ADR-006/shell-layout amendment.)*

**4.2 Composition.** A page is an **`EditorDocument` of blocks** — **11 standard + 11 integration** blocks. An
**entity surface = a Layout facet** (Title · bio · summary · dashboard · views/content) **+ an optional Editor facet**
(the entity's linked page) — **Editor is registry-gated** (`pages.entity_type` validated vs `schema/_registry.ts`
ENTITY_TYPES, ADR-006 SP2:69-74; page-able entity types only, many have none by default).
The user composes their relationship: **merged** (one surface) or **tabbed** (Home = layout · Content = editor); and
the layout mode is **free-reorder or tabbed sections**. Built from **blocks + widgets**.

**4.3 Portability.** Two primitives, deliberately separate: a **classic View** (filter × layout × group; one pattern;
read-only lens; ADR-007; `space_id` null = global & cloneable; provider-read) **vs** a **Capability block** (the
**mixture** — combined patterns, interactive; ADR-008; declares `render_targets {inline, standalone}`, placed per
instance). *The mix lives in the capability — classic views stay simple (resolves the combinable-layouts seam).*
**Spaces** = `{ root tag · Views · enabled Blocks · name }`; `enabled_blocks` (palette/menu) ≠ `block_instances`
(placements); **user-authored capabilities** are in the vision (sandboxed + permission-enveloped); **Templates** are
portable seed bundles that **fork on instantiate**. The composition engine **generalizes to every surface** (Home,
module landing, entity page, session) — a **per-type default**, **remembered per instance**.

**4.4 Archetypes** (configurable shells with a default): the **view-mode renderer** (7 layouts: list · table · board ·
gallery · calendar · graph · timeline) · **Collection** (a rendered View) · **Entity** (Layout + Editor facets) ·
**Dashboard** (a page of integration blocks) · **Canvas** (the Editor itself · Graph · Reader · Vision-board ·
Calendar) · **Flow / Session** · **System** (Settings · inbox · ⌘K).

**4.5 Flow / Session.** A **deliverable-per-stage page**: entity title + summary · the current **stage** · the
**deliverable + a description of what it should be** · **attach** (document / photo / audio / file) · **mark-done or
require proof**. Session **types are open/extensible** (study · class · focus · reading · practice · workout · work ·
review · + user-made like *assessment*). A **persistent timer HUD** follows the user across the OS. Sessions **log to
the entity via the effect rail** (`log_time` → `task_time_logs`, measurement signals, xp). Grounded on `deliverable_note`
pages + `note_attachments` + the ADR-004 effect rail; the **staged-deliverable structure is a design-intent extension**
assembling existing primitives (no new plumbing).

**4.6 The emergent principle** — **"the user controls their own surfaces"**: theme · motion · Home arrangement · sync
visibility · and composition are all user-owned, with honest defaults so cold-start is never a blank menu.

---

## 5. Open seams / extensions flagged (owed to the ADRs at build)

- **Spaces nav model** = scope selector (Bar 1) + Spaces page, not a persistent strip → ADR-006 / shell-layout amendment.
- **Entity-page composition**, **session-runtime composition**, and **per-instance memory** extend the documented
  Spaces scope (design-pass-open per ADR-006:130 — "does not specify the resolution layer's internals or its surface").
- **Combinable layouts = a capability** (resolves seam #1, no ADR-007 change). **View-as-page-block** (seam #2) = via the capability tier.
- **Net-new preference fields** → ADR-002 §5.17 amendment (list in §3/P5).
- **Persistent Session HUD** = a new persistent shell element beyond the documented 5 regions.
- **User-defined stages + deliverables + proof on entities** extend ADR-004 (open sub-types + `deliverable_note` +
  `note_attachments` + effect rail are the hooks).
- **Editor facet** = registry-gated (`pages.entity_type` vs `schema/_registry.ts` ENTITY_TYPES, ADR-006 SP2) — not universal (`deliverable_note`/NoteAttachment = `note.ts:29,123`).

---

## 6. Gate record

- **Inputs:** P1–P6 captured with Victor (2026-09-30 → 2026-10-01); two doc-research passes (nav/nesting/portability;
  page-able entities + sessions runtime) grounded every structural claim.
- **Independent adversarial critic:** REVISE — 2 must-fix (schema-present `quiet_hours` mislabeled net-new; net-new
  field list inflated 5→9) + 3 should-fix (page-ability citation → `schema/_registry.ts`; Bar 1 dropped 3 of 6 global
  surfaces; `optimistic=none` labeled a P4 decision). **All folded 2026-10-01.**
- **Verdict:** **SHIP** (post-revision). Structural model (§4) + extension/documented separation (§4.5, §5) verified
  accurate against the ADRs by the critic.
