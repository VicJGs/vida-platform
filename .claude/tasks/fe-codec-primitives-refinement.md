# Task: fe-codec-primitives-refinement
# Status: in-progress
# Linear: LIF-230
# Profile: Change Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: Victor directive 2026-10-05 (design the shipped primitives/views to fit the established CODEC model + patterns)
# Reshape: G6 enhancement — codec-layer conformance + aesthetic-refinement pass (not a new archetype unit)

## Goal
Bring the 6 pre-CODEC primitives/views up to the **model + patterns we established** (fe-codec-theme, fe-codec-patterns,
the conventions, the quality bar) so they fit the UI/UX coherently: **Card · Neural Graph · Calendar · Timeline · List ·
Gallery**. They were built Aug 2026 (UI-1/UI-2) BEFORE the CODEC theme/patterns existed, so they are token-conformant but
not fully refined/aligned to the established aesthetic + pattern vocabulary.

> **Document-only task (created 2026-10-05).** NOT started. Pick up in a fresh session: run the audit FIRST (grounded
> gap list) before touching anything.

## Grounded audit at creation (2026-10-05 — quick grep, to be confirmed by `/design-audit` at pickup)
| Component | Theme-token conformance | Pattern-kit / conventions | Real gap? |
|---|---|---|---|
| **Neural Graph** | ❌ **2 hard-coded WebGL colors** (`DEFAULT_NODE_COLOR='#6366f1'`, `DEFAULT_EDGE_COLOR='#cbd5e1'`; outside Tamagui theming, NG-7) → NOT preset-aware | Message-only empty; no density | **Yes — the one hard conformance gap** |
| Card | ✅ 0 hard-coded colors | semantic tokens, elevation; no density (container — likely by-design) | token-clean; aesthetic-refinement candidate |
| Calendar | ✅ 0 hard-coded | no density; Message empty (grid-as-empty by-design) | token-clean; aesthetic-refinement candidate |
| List / Gallery / Timeline | ✅ 0 hard-coded | density ✓; Message default empty | token-clean; aesthetic-refinement candidate |

**Two things are bundled in "make them fit the model" — separate them at pickup:**
1. **Strict pattern-conformance** — mostly already true (all 5 views are token-clean + preset-aware; verified live in
   Storybook across editorial·reader·quietDesk × light/dark). The **one real conformance gap is Neural Graph's
   hard-coded colors** — and that is **already a planned unit**: `fe-codec-canvas-graph` (#8, "editorial ink voice",
   g6-edge-ledger.md:51). *Coordinate — don't double-build the Graph; this task either defers the Graph to #8 or absorbs
   it, Victor's call.* NB: the views defaulting to the bare `Message` (vs the richer `EmptyState`) is **by design** — the
   consumer/shell composes the teaching-invitation empty via the `empty?` slot (the Collection does exactly that). NOT a gap.
2. **Aesthetic refinement** — the real headroom + what Victor is after: these were built at *intent-fidelity* (correct +
   accessible but plain). Lift them to the aesthetic bar (shape, spacing rhythm, hierarchy, motion/feel, the editorial
   voice) — **expressed through the existing tokens + pattern-kit**, so coherence is guaranteed by construction.

## Scope (6 components)
Card (ui-1) · Neural Graph · Calendar · Timeline · List · Gallery (ui-2) — `packages/ui/src/components/`.
**Victor's chosen reading (2026-10-05):** conformance **+** aesthetic-refinement (the broader quality pass), not
strict-conformance-only. Confirm at pickup.

## Approach (ONE dedicated pass, not folded into surface builds)
1. **Audit** — `/design-audit` + `/component-consistency` on the 6 against: the established model (theme · pattern-kit ·
   conventions in `packages/ui/src/CLAUDE.md`), the quality bar (`docs/specs/foundation/frontend-quality-bar/_index.md`),
   state-conventions, and the `p1–p6` specimens (`docs/specs/foundation/frontend-replan/p*-specimen.html` +
   `p6-archetypes-design.html`). Produce a grounded gap + refinement list. Bring it to Victor BEFORE any change.
2. **Retrofit per component** — close conformance gaps + apply the aesthetic refinement, through tokens + the pattern-kit
   (no hard-coded palette, DEF-U8-h dimensions-via-token-scale, DIRECT semantic tokens, reduced-motion, voice, a11y).
3. **Per-component Visual Gate** — Brave, full matrix: preset × mode × density (+ axe + AA), the same bar every codec
   unit cleared. Each component ships only on PASS.
Each component change = `change-frontend-component` flow (per-component contract/audit → implement → Visual Gate →
`/critique`). Standard worktree → PR → merge.

## Sequencing
**Before `fe-codec-dashboard` (#5) and the other surface builds** — the surfaces (#5–42) compose these primitives, so
refining the foundation first means every surface inherits the better design (cheap now; ~20× rework later). This task
is the recommended next frontend head, ahead of #5.

## Dependencies / coordination
- Blocked-by: none (refines shipped components).
- **Coordinate with `fe-codec-canvas-graph` #8** (the Graph's "editorial ink voice") — either defer the Graph's restyle
  to #8 or absorb it here (don't double-build). Victor's call at pickup.
- **Palette caveat:** the ds-2 palette is a *provisional placeholder* (indigo/slate/emerald ≠ brand); real brand VALUES
  land via the Figma source-of-truth, release-gated M4/P2 (`frontend-source-of-truth.md`). So this pass refines
  **structure/shape/composition/feel** on the current token system; final brand colors are a separate M4 concern — do
  NOT churn palette values here.

## Scope RESOLVED (Session 1 — 2026-10-05, Step-1 audit + Victor's 3 calls)
The Step-1 `/design-audit`-equivalent (all 6 read in full vs the model + quality bar) + Victor's decisions:
1. **Scope depth = conformance + aesthetic refinement** (the broad quality pass). ✅
2. **Neural Graph = DEFERRED to #8 `fe-codec-canvas-graph`** (its proper home; flagged there with the concrete audit
   findings — 2 hard-coded colors, no empty/error slots, reduced-motion). NOT built here. ✅
3. **Component set = the 5 views only** → **Card · Calendar · Timeline · List · Gallery**. The orphaned CONTROLS
   (export-dialog · pomodoro-widget · 9 ui-1 primitives) split to a sibling task `fe-codec-controls-refinement`
   (they have no refinement home in the G6 extend map but are already accent-fixed/token-conformant). ✅

**Grounded audit result (code-verified):** 5 of 6 views are token-clean + preset-aware (Card/Calendar/Timeline/List/
Gallery — 0 hard-coded colors); the data-views carry a `density` prop, Card/Calendar respond to density via the
space-token swap. "Views use bare `Message` not `EmptyState`" is BY DESIGN (consumer composes via the `empty?` slot).
The ONLY hard conformance gap was Neural Graph (now deferred). **So THIS pass is almost entirely AESTHETIC** — shape,
spacing rhythm, hierarchy, elevation, motion feel — on the current token system, graded at the Visual Gate. NO palette
churn (brand VALUES = M4/Figma). **Aesthetic-headroom rank:** Calendar > Gallery > Timeline > Card > List.

## Calendar — SPLIT to fe-calendar #19 (2026-10-05, Session 1 design pivot)
A design session grew the Calendar from "polish the grid" into a flagship **multi-range (Year/Month/Week/Day/Agenda) +
"Living" cross-module lens** (past-as-record · habit threads · open-time · purpose budget · drift). Victor approved
**splitting it to `fe-calendar` #19 (LIF-203)** — its proper home (cross-module ProviderRead; `@vida/ui` primitives
can't read modules). **This task's Calendar scope is now ONLY the month-grid aesthetic refinement**
(`mockups/calendar-refinement.html` — serif title · eyebrow weekdays · tabular figures · restrained today mark ·
weekend/oos shifts · accent-dot chips), same tier as the other 4 views. Flagship vision + its 2 mockups moved to
`docs/specs/foundation/fe-calendar/` (calendar-vision.md). **So this task = 5 views, all pure aesthetic polish:**
Calendar-grid · Card · Timeline · List · Gallery.

## APPROVED build vocabulary (Session 1 — 2026-10-05, all mockups Victor-approved)
Two layers per view, BOTH presentational (buildable here, no cross-module reads → no split):
- **Layer 1 — aesthetic polish** (low-risk CSS/variant): serif display titles · eyebrow labels · tabular figures ·
  hairline structure · accent-as-moment · softer/intentional elevation. Mockups: `mockups/calendar-refinement.html`
  (grid) + `mockups/views-refinement.html` (Card/Timeline/List/Gallery before→after).
- **Layer 2 — alive-hooks** (new presentational API/behavior; the primitive ships the hook, surfaces feed data).
  Mockup: `mockups/views-alive-concept.html`. Per view:
  - **Card** — status-tint variant · progress-ring slot · last-touched/link-hint slots (ambient micro-dashboard).
  - **Timeline** — **now-fulcrum**: past=record / future=intention (the primitive is now-aware; a render variant).
  - **List** — `primary`/"the one thing" emphasis + a per-row **ambient-signal slot** (streak/drift/purpose/due).
  - **Gallery** — **cover-intelligence** (generated editorial cover for imageless entities) + **weight-sized** tiles.
  - **Calendar-grid** — stays Layer-1 only here (the alive multi-range/living flagship is fe-calendar #19).

**Honest scope note:** Layer 2 grew this past from "aesthetic polish" into "polish + new presentational capabilities."
Still presentational, so it stays HERE (unlike the Calendar flagship). Each Layer-2 hook is a CONTRACT change → its
own forward spec + §XXVI gate + Visual Gate. Layer 1 can ship fast; Layer 2 is real feature work.

## Build plan
Per-view, through the change-frontend-component §XXVI gate → implement → full-matrix Visual Gate (preset×mode×density) →
§XXIX currency. Recommended order (most-composed first, so downstream surfaces inherit soonest):
**List → Card → Timeline → Gallery** (Calendar-grid polish folds in with List/Card or standalone).
Open sequencing choice for Victor: (a) ship all 5 Layer-1 polishes first (fast coherent win) then a Layer-2 wave; or
(b) per-view do Layer-1 + Layer-2 together. Lead view TBD at build start.
