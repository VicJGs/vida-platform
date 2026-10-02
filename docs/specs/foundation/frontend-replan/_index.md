# Frontend Re-plan — Establishment & Master Plan (the ② frontend track, surface-first)

> **Status:** ESTABLISHMENT (planning). Authored 2026-09-30 with Victor. Profile: Project Foundation /
> Milestone Delivery Planning. Isolation: git worktree `.claude/worktrees/frontend-track` (branch
> `worktree-frontend-track`) off `main` — the backend is built in a parallel session; this track never
> touches it.
> **Supersedes:** the P6 module-twin decomposition grain (24 `fe-*` issues, LIF-178…201) as the *frontend
> unit of work*. P6's coverage (222 UI legs) is REUSED; only the grain (module-twin → surface) changes.
> **This document is the record of the establishment + the plan for the G0–G6 gates. G0 executes it fresh.**

---

## 1. Context & the problem

The frontend of the whole OS was projectized in campaign P6 as **22 per-module `fe-*` issues + 2 thin
cross-cutting** (`fe-shell-integration-wiring`, `fe-integrations-ai-surfaces`) — LIF-178…201
(`decomposition-p6.md:3`). So P6 *already recognized* that two surfaces don't fit a module grain; it simply
organized the other 22 by module. That majority grain is **wrong**, and it repeats the mistake backend-replan
corrected (per-module vertical slices → full-intent horizontal). Surface-first **systematizes** what P6 did by
inspection: surfaces are *enumerated*, so no module's cross-module contribution can hide.

- **The backend's unit is a *service*** (owned by one module). **The frontend's unit is a *surface*** — a
  page/tab/panel the user navigates — which **composes features from many modules**.
- **Illustrative** (Victor, not a real case — to be resolved in the planning gate): Sessions *owns* the
  scheduling service, but the user meets it on a **Calendar page** that may carry a **Schedule tab** and also
  pull Tasks, Routines, Reminders. A module-twin `fe-sessions` issue has no home for that page.
- **This is how features hide.** Organizing frontend issues by backend module means a module-owned feature
  never lands on the page where the user actually looks. In a complex OS, that buries capabilities.
- **The docs do not hold all the intent.** Victor is mentally designing frontend nuances the feature docs
  leave unannounced (e.g. global quick-capture — see §3). The flow's job is to **notice the gaps**, not
  transcribe the docs.
- **The quality bar is incomplete.** The design-process sketch (ISO 9241-210 · Five Planes · WCAG 2.2 · Gestalt)
  raises standards we do not yet carry — and the sketch itself may leave things behind.

**Conclusion:** the frontend needs its own re-plan — **surface-first**, coverage-gated so nothing is left
behind — preceded by a locked process and a real quality bar.

## 2. The job & the process

**The job (from the sketch):** bridge the backend's **Implementation Model** (the finished `@vida/core`
service) → the user's **Mental Model** (how Victor expects the task to work) via a **Representational Model**
(the UI), so the build is *pure execution — zero design/logic guesses*. Guessing is what gets a module torn
down (mod-notes: 34 commits; the discarded knowledge branch). We eliminate guessing.

**The process — Garrett's Five Planes as an order of operations, expressed in Victor's four stages:**

| Stage (Victor) | Plane(s) | Establishes | Repo asset (built) vs. produced |
|---|---|---|---|
| **FOUNDATION** | Strategy + Scope | why/who/context-of-use + the foundation systems layer (§3) | context = single-user, local-first, offline, complex-OS |
| **ORGANIZATION** | Structure | IA (dual-axis nav) · **surfacing/discoverability** (§4) · interaction models · full state mapping | UX-1 IA built; surfacing map = produced |
| **PRESENTATION** | Skeleton + Surface | responsive grid + Gestalt + the screen-archetype catalog; tokens + components + WCAG 2.2 AA + aesthetic/density | DS-*/UI-1/UI-2/UI-3/shell built; archetypes + feel = produced |
| **DEVELOPMENT** | Intake→Process→Output + gated build | the per-surface construction manual, then build | see below |

**The 3-lens gap audit (the core of DEVELOPMENT — Victor's methodology):** the intake is an *audit*, not a
transcription. Per surface:
1. Derive the doc-stated model (Implementation → Representational).
2. **Audit it against the standards + templates + the required bar**, producing three lists:
   - **WRONG** — contradicts a standard (a11y/WCAG, performance budget, component API, state conventions).
   - **MISSING** — docs silent but the bar or Victor's mental model requires it (quick-capture, an empty
     state, a keyboard path, a skeleton).
   - **OVERFLOWING** — scope past the bar / over-engineered / a concern the surface should not own.
3. **Victor resolves the gaps** (fills the unannounced intent, cuts the overflow) — no guessing.
4. Build → **Visual Gate = Victor's final visual input** → verified for performance + a11y/responsive
   ("responsible") + quality → PR → merge.

**Two adaptations of ISO 9241-210 to our reality:**
1. *"Usability testing with representative end-users"* → **single user**; the **Visual Gate is the empirical
   evaluation loop** (Victor runs the real screen; we iterate).
2. *"High-fidelity Figma prototype"* → the repo is **code-first** (`frontend-source-of-truth.md`; Figma
   deferred to M4). Our reference prototype **is the running screen at the Visual Gate**.

## 3. The foundation layer (all backend-ready)

The systems everything else is built on. Authoritative source = the **M1.2.1 "Hub & Foundation · Frontend"**
milestone + the global cross-cutting surfaces. **Every backend twin is merged to `main` → the whole
foundation is buildable now** (grain to be re-expressed as surfaces in G2–G6).

| Foundation system | Backend twin | Status |
|---|---|---|
| Preferences & Settings (shell reads it; ⌘K history; module visibility) | mod-preferences | ✅ merged #44 |
| Sessions / Focus / Global Calendar (`dueIn()` agenda · Pomodoro Focus Mode · My-Week) | mod-sessions | ✅ merged |
| Journals = Home dashboard (`/`, the connective tissue) | mod-journals | ✅ merged #46 |
| Notes & Pages + the universal block Editor | mod-notes-and-pages | ✅ merged #48 |
| Check-ins (daily reflection, embedded in the Journal flow) | mod-check-ins | ✅ merged #51 |
| Shell integration wiring (⌘K · export · serializers · neural graph · Spaces add-menu) | UI-2/3/4, UX-2 ✅ (DB-8 = live-search forward-ref only) | ✅ seam-first |
| Onboarding (first-run gate) | UX-5 design model ✅ + UI-4 render ✅, wired via shell | ✅ done |

**Global surfaces** (from `view-intent-harvest.md:7-16`): Home, Global Calendar, ⌘K palette, Neural Graph,
Spaces switcher, Settings — all foundation-tier; Notifications inbox is feature-tier (M1.2.2).

**ADR-019 §3.2 — M1 scope** (what the foundation must cover): *"the Notes & Journals dashboard, cross-module
aggregation, backlinks, and measurability/economy rollups ship with M1."*

**Live gap (demonstrating the methodology):** Victor's intent — *"create a new note without opening the Notes
module every time"* — a **global quick-capture** — is **not in any doc**. Gap #1 on the board: home it (likely
a ⌘K action + editor-anywhere seam) during G2. This is the flow catching the unannounced.

## 4. Surfacing / discoverability

- **The concern is Victor's** (verbatim: *"many of them can be hidden if we don't do this process right"*).
- **Doc-supported:** `view-intent-harvest.md:7-16` reserves the 7 global surfaces precisely so capabilities
  surface; UX-1 IA exists for *"intuitive cognitive mapping and efficient data retrieval"*;
  `command-bar-and-search.md` is a whole reachability architecture; ADR-019 §3.2 requires M1 be *"usable."*
- **Proposed rule (NOT doc-law — a candidate for G1/G4):** every capability has **≥2 reachable paths** (nav
  dock · ⌘K · contextual entry · home surfacing · cross-module link · empty-state CTA). To be ratified as a
  coverage criterion, or replaced.

## 5. The establishment sequence (G0 → G6 → builds)

| Gate | Purpose | Semi-destructive? |
|---|---|---|
| **G0** | Lock the process (§2) as the Tier-1 flow doc | no |
| **G1** | **Quality-Bar gate** — reconcile the real measuring stick | no |
| **G2** | Surface harvest — the real page/tab/panel map (3-lens audit fills the unannounced) | no |
| **G3** | Composition map — each surface ↔ the backend capabilities it composes (many-to-many) | no |
| **G4** | Coverage gate — every capability surfaces ≥1×; every surface has a backend feed; nothing left behind | no |
| **G5** | Order — foundation surfaces first, dependency-correct | no |
| **G6** | Linear reshape — retire the 24 module-twin `fe-*`, create surface issues, wire edges + HARD-4 | **YES — Victor-approval-gated** |
| builds | per-surface: 3-lens audit → build → Visual Gate → PR → merge | — |

**Gate output homes** (so each gate starts with zero assumptions):
- **G0** → `docs/specs/foundation/frontend-replan/process.md` (the locked Tier-1 flow: Five Planes + 4 stages + 3-lens audit).
- **G1** → `docs/specs/foundation/frontend-quality-bar/_index.md` (extends global STANDARDS).
- **G2** → `docs/specs/foundation/frontend-replan/surface-map.md` (the page/tab/panel inventory).
- **G3** → `docs/specs/foundation/frontend-replan/decomposition.md` + `traceability.md` (surface issues ↔ 222 legs + new surfaces).
- **G4** → `docs/specs/foundation/frontend-replan/coverage-report.md` + a deterministic set-cover script under `tools/frontend-intent/`.
- **G5** → order encoded into `reconstructed-structure.md` (surface `#` sequence, foundation-first).
- **G6** → `docs/specs/foundation/frontend-replan/g6-edge-ledger.md` (the migration ledger) → Linear reshape.

### G1 — Quality-Bar gate (design)
- **Inputs:** (a) existing global STANDARDS (design/components/motion/engineering/process); (b) the sketch's
  bar (ISO 9241-210, Five Planes, WCAG 2.2 AA/POUR, Gestalt, the full 8-state machine, dual IA); (c) **Vida's
  context the sketch is blind to** — local-first/offline optimistic-write UX, zero-knowledge copy-honesty,
  single-user (no multi-user roles), complex-OS surfacing, code-first source-of-truth.
- **Process:** dedupe against what we already have → hunt the gaps *in the sketch itself* (performance
  budgets, reduced-motion, i18n/RTL, empty/error copy, dark-mode, focus management, offline states, responsive
  strategy) → draft the additions.
- **Teeth:** an **independent adversarial critic** checks each addition for *needed · grounded ·
  not-already-covered*, then Victor approves.
- **Output:** the **Vida Frontend Quality Bar** at `docs/specs/foundation/frontend-quality-bar/`, extending
  the global STANDARDS (universal bits promoted to `~/dev-toolkit` later). Becomes the yardstick for the 3-lens
  audit + the Visual Gate checklist.

### G2–G6 — surface-first re-plan (efficiency note)
The P4 campaign already coverage-verified **222 module-scoped UI legs**; P6 bucketed them *by module*. The
re-plan **re-homes those 222 legs into surfaces — module coverage preserved (each leg maps to ≥1 surface)**; we
regroup, not re-harvest. But coverage is **NOT** "preserved by construction" for the *surface set*: G2's 3-lens
audit will **discover new cross-module surfaces not itemized in the legs** — aggregators like the Global
Calendar / Reading Hub (`view-intent-harvest.md:11,27`) and unannounced intent like quick-capture — because
these come from the bar and Victor's mental model, not the per-module leg count. **The 222 legs are the floor,
not the ceiling**; the surface set is a superset.

**G6 edge migration** (the semi-destructive step) produces its own ledger before any Linear write: an inventory
of the 24 issues' existing edges (the `HARD-4 ← all 24 fe` closer, `fe-shell ← DB-8`, the `frontend` labels —
~55 edges, `PLAN-p6-frontend-track.md`), a **surface-issue ↔ retired-issue re-home map**, **Victor approval on
the ledger**, and a **rollback contingency** (no issue retired until its replacement surface(s) exist and carry
the re-homed edges). HARD-4's `← all frontend` closer is **re-pointed** to the new surface set, never dropped.

## 6. Parallelism, isolation & M1 integrity

- **Isolation:** this session runs in a git worktree off `main`; the backend session is a separate directory +
  branch. `main` holds only *merged* backend, so the frontend never builds on churning code.
- **Per-issue discipline:** each surface issue = own branch off latest `main` → PR → `gh pr merge --merge
  --delete-branch`. Planning/campaign work (this doc, G0–G6) = its own branch → merge to `main`.
- **Frozen-contract:** once a surface build starts, the backend services it consumes are frozen contracts
  (their `§XXIX current-*` docs).
- **Scope: web-only for M1.** M1.2.* targets `apps/web` (per `reconstructed-structure.md` homing). Mobile
  (Expo) / desktop (Tauri) affordances (touch, bottom sheets) are **re-audited at M4** (multi-device/venues);
  the G4 coverage gate applies to **web**, with a separate mobile/desktop coverage gate at M4-start.
- **Nothing-left-behind (the M1 guarantee):** (a) the 222-leg floor + G4 set-cover = every module capability
  surfaces; (b) surface ← backend edges = no building on unfinished backend; (c) **HARD-4 (#95) ← all frontend
  + hardening = "M1 done needs both tracks"** (ADR-019 §3.2, `reconstructed-structure.md:173`) — M1 cannot
  false-close. **This guarantee is process-gated, not structural:** it holds only if G2's 3-lens audit (Victor
  + an independent critic) actually surfaces the missing/unannounced surfaces — a gap not spotted in G2 stays a
  gap. Victor's review of the MISSING list is the hard gate before G3.

## 7. Open decisions carried into G0/G1

1. **Aesthetic & density direction** — docs fix structure, not feel (information-dense power-tool vs.
   calm/spacious). Victor input at G0/G1.
2. **Spaces bar timing** — dual-axis is resolved (`view-intent-harvest.md:66-79`) but Spaces is PARKED→M1.1:
   build the seam now or defer?
3. **Standards-bar home** — repo-level (`docs/specs/foundation/frontend-quality-bar/`) extending global, with
   later promotion of universal bits. (Recommended; confirm at G1.)
4. **The ≥2-paths surfacing rule** — ratify as a G4 coverage criterion, or replace.
5. **Sketch-gaps to hunt in G1** — performance budgets, reduced-motion, i18n/RTL, empty/error copy honesty,
   dark-mode, focus management, offline/optimistic states, responsive strategy.

## 8. References
- `docs/specs/foundation/delivery-structure-reconstruction/reconstructed-structure.md` (M1.2.* homing, HARD-4)
- `docs/specs/foundation/ux-1-information-architecture/view-intent-harvest.md` (surface inventory, nav axes)
- `docs/core/decisions/ADR-019*.md` §3.2 (M1 scope, both-tracks) · ADR-021 (backend campaign, frontend split)
- `docs/specs/foundation/frontend-source-of-truth.md` (code-first) · `frontend-visual-gate.md` (the gate)
- `docs/core/architecture/{information-architecture,shell-layout,state-conventions,onboarding,home-journal-dashboard,command-bar-and-search}.md`
- `tools/backend-intent/PLAN-p6-frontend-track.md` + `decomposition-p6.md`/`traceability-p6.md` (the 222 legs, module-twin grain being superseded)
- Sketch: `~/Documents/Idea-of-the-process-for-design-to-frontend.rtf` (ISO 9241-210 · Five Planes · Intake→Process→Output)
