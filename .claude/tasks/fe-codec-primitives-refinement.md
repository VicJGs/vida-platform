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

## Build Steps — PHASED (Victor 2026-10-05: "each component its own profile + phase")
Each component = its own **phase**, under its **declared profile**, through its **own §XXVI gate**, shipping as its
**own PR**. No batching. Order = most-composed first (downstream surfaces inherit soonest).

**Every phase runs the same spine** (change-frontend-component default · Entity Delivery Flow ②):
Step 0 `/document-context` BASELINE (@vida/ui current-*) → forward spec `/documentation-component` (incl. `/contract`
for the Layer-2 API change) → `/critique` → **Approval 1** → `/preflight` → `/critique` → **Approval 2** → implement
(types-first) → **Visual Gate** (Brave, preset × mode × density + axe + AA) → `/critique` SHIP + independent code-review
→ §XXIX currency (CLAUDE.md + current-*) → **PR → merge**.

| Phase | Component | Profile | Layer-1 polish | Layer-2 alive-hook (contract change) |
|---|---|---|---|---|
| **P1** | **List** | change-frontend-component | eyebrow groups · tabular meta · accent tick · hairlines | `primary`/"one-thing" emphasis + per-row **ambient-signal slot** |
| **P2** | **Card** | change-frontend-component | eyebrow kicker · serif title · hairline header · softer elevation | status-tint variant · progress-ring slot · last-touched/link-hint slots |
| **P3** | **Timeline** | change-frontend-component | accent "now" dot · serif+eyebrow dates · lighter rail | **now-fulcrum** variant (past=record / future=intention) |
| **P4** | **Gallery** | change-frontend-component | framed cover + kicker · serif title · tabular caption | **cover-intelligence** (generated covers) + **weight-sized** tiles |
| **P5** | **Calendar-grid** | change-frontend-component | serif title · eyebrow weekdays · tabular figures · today mark · weekend/oos · accent-dot chips | — (Layer-1 only; alive multi-range/living = fe-calendar #19) |

Profile note: all 5 are **change-frontend-component** (existing DS primitives being changed; loads design·components·
motion·engineering·process). The Layer-2 hooks are **contract changes** → each phase runs `/contract` first (the
Design-System discipline) before implementing. Flag at phase start if any warrants the full Design-System profile.
Approved target per phase = the committed mockups (`mockups/*.html`). Visual record is the acceptance oracle.

## Phase log
- **P1 · List — ✅ COMPLETE (2026-10-06).** Full §XXVI gate (spec → Approval 1 → preflight-grounded → Approval 2 →
  implement). Delivered `sections?`/`primaryKey`+`primaryLabel`/`activeKey` + eyebrow/tick polish, all presentational,
  token-pure (accent left-tick variant, NO bg tint). tsc 0 · list-view **25 tests** (+9) · suite **398 green** (Node 24) ·
  **Visual Gate PASS** (Brave, 3 presets × light/dark × calm/dense: **axe 0** · AA **4.94–6.53** incl. warm-dark · 375
  no-overflow · Grouped eyebrow-sections + empty-self-heal · Featured tick+eyebrow). Spec `phases/P1-list-view.md`;
  currency `packages/ui/src/CLAUDE.md`. **Node 24 required** for the test/build env (jsdom30+undici≥22). Next: PR, then P2.
- **P2 · Card — ✅ COMPLETE (2026-10-06, PR #96 open, branch `fe-codec-primitives-p2-card`).** Full §XXVI double-gate
  (spec Approval 1 → preflight → Approval 2) + blocking Visual Gate + independent code-review + pre-ship /critique SHIP.
  Delivered: **BR-C-11 landmark fix** (`header`/`footer` → plain `<div>` — Option B, grounded in `card.md:6` Intent +
  the `card.md:21`/`u5-card.md:82` ref-fixed-to-div FACTs; resolved the P1 flag, 0 duplicate landmarks in a repeated
  row); **alive-hooks** `status`(calm/warm StatusEdge · faded recessed+flat)/`metric`/`headerDivider` (additive, neutral
  = prior render); **BR-C-5** 2-layer `shadow.resting` token (Card sole consumer). tsc 0 · eslint 0 · **@vida/ui 420**
  (card.test 23, +new) · **Visual Gate PASS** (Brave, 24 cells = 3 presets × light/dark × calm/dense + landmark +
  editorial — AA worst **4.52** incl. warm-dark & composited faded · axe 0 · 0 landmarks · edges preset-invariant).
  Currency: `packages/ui/src/CLAUDE.md` + `card.md` (DEF-U5-g/h) + `u5-card.md`. **The Visual Gate earned its keep —
  caught 4 things code-gates missed:** (1) `faded` opacity:0.62 failed AA (muted text 2.4, axe-confirmed) → "dim chrome,
  hold text" per BR-C-7a; (2) **DEF-U5-h** — a pre-existing shipped bug: the `padding` variant NEVER applied (0px on
  every card, incl. the Padding story) because the variant name collides with Tamagui's built-in `padding` style prop →
  renamed `padding`→`pad`, public prop unchanged; (3) my first gate script false-greened (Playwright `evaluate(string)`
  parse error → empty arrays → vacuous pass) → hardened to assert measurement; (4) a story-scaffolding axe flag.
  **Lesson: ground before assuming** — the landmark fix REVERSED from `<article>` (my instinct) to drop-the-tags once
  the ref-fixed-to-div FACTs were read; and the gate's composited-opacity contrast probe was essential to measure faded
  honestly (getComputedStyle ignores ancestor opacity).
- **P3 · Timeline — ✅ COMPLETE (2026-10-06).** Full §XXVI double-gate (spec → /critique REVISE→fixed R1–R4 → Approval 1
  → grounded §4b ledger → /preflight BLOCKED→resolved G1–G3 → /critique REVISE→fixed fulcrum-continuity → Approval 2) +
  blocking Visual Gate + **2 independent code-reviews**. Delivered (all optional, back-compat, presentational): date
  **GUTTER** (3-col, serif `$display`@`$small` + tabular + `getEyebrow`), **hollow dots**, **`getTemporalState`**
  (present accent+ring via `useTheme().get('web')` · future faded DOT-only, date held AA per Card BR-C-7a; past/future
  TITLE tone = consumer renderItem, LV-5), **`nowFulcrum`** (accent "now" divider before first non-past; 4-branch trim
  over the COMBINED render sequence so the rail connects through it; `aria-hidden` non-listitem; NUL-sentinel key).
  `TemporalState` exported. tsc 0 · eslint 0 · timeline **14 tests** (+5) · build ✓ · **Visual Gate PASS** (Brave, 3
  presets × light/dark: serif AA 15.84–17.29 · eyebrow 4.94–6.53 incl. warm-dark · accent FLIPS per preset [editorial
  blue/reader oxblood/quietDesk olive] + ring · future 0.55 dot w/ date held AA · "now" 4.95–6.41 · dots=items+1 · **axe
  0** on editorial+fulcrum · 375 no-overflow). **Reviews caught + fixed:** phantom-gutter on a no-op `nowFulcrum` (hoist
  `fulcrumAt` so `hasGutter` keys on actual render) · key collision (NUL sentinel) · `TemporalState` barrel gap; refuted
  a hypothesized fulcrum-axe violation (axe 0, now gate-covered). **Gate gap found + closed:** my gate only ran axe on
  the editorial story → added fulcrum-story axe. Spec `phases/P3-timeline.md`; currency `packages/ui/src/CLAUDE.md` +
  `v3-timeline.md` change-log.
- **P4 · Gallery — ✅ COMPLETE (2026-10-07).** Full §XXVI double-gate (spec → /critique SHIP → Approval 1 → GROUNDED [the
  masonry-vs-flex fork was doc-RESOLVED, not mine to ask: GV-2/ADR-001:111 bind a RN-safe flex grid, "not CSS grid" →
  masonry foreclosed] → /preflight BLOCKED→resolved [G1 story tile = plain composition, Card has no cover slot] → /critique
  SHIP → Approval 2) + blocking Visual Gate + independent code-review. **Honest-scope (P1 pattern): the renderer adds ONE
  prop** — **`getWeight?`** (width-weight, a ready affordance; the editorial cover/kicker/title/caption = consumer renderItem,
  cover-intelligence = view engine, masonry = foreclosed). `weightStyle(w,min)` per-tile; **`flexShrink:1` explicit** (RNW
  defaults 0 → the Gate caught a 375 overflow); `clampWeight` symmetric `[1,8]`. tsc 0 · eslint 0 · gallery-view **16 tests**
  (+5) · build ✓ · **Visual Gate PASS** (3 presets × light/dark: title AA 15.84–17.29 + caption/kicker 4.94–6.53 incl.
  warm-dark · axe 0 · **featured 496px vs base 248px = 2×** · 375 no-overflow). **Review-caught:** one-sided clampWeight →
  added the upper bound. **Lesson: grounding resolved the fork** (don't hand Victor a decision the binding spec already
  settles — RN-safe forecloses masonry). Spec `phases/P4-gallery.md`; currency CLAUDE.md + `v2-gallery-view.md`.
  **Next: P5 · Calendar-grid** (serif title · eyebrow weekdays · tabular figures · today mark · weekend/oos · accent-dot chips — Layer-1 only).
