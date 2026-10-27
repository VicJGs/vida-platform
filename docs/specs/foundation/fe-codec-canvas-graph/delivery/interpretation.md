# fe-codec-canvas-graph — Interpretation Layer

> Entity Delivery Flow ② · Step 1. Make the implicit explicit before decomposing.
> No-Guessing: every claim is [FACT: path:line] · [INTERP: from fact] · [UNKNOWN: needs X].
> Unit: G6 CODEC #8 · LIF-205 · profile add-frontend-component / Default.

## 0. One-line scope

EXTEND the shipped `@vida/ui` `NeuralGraph` (UI-2 · V7) to the **editorial "ink voice"** archetype form
(CODEC · Canvas: Graph), resolving the 3 conformance findings deferred here from the LIF-230 audit. An
EXTEND-in-place of one renderer — NOT a new composing shell.

## 1. DEPENDENCIES (what must already be true / what this consumes)

- [FACT: g6-reshape-runbook.md:38] #8 `fe-codec-canvas-graph` = "Canvas: Graph — editorial ink voice",
  kind "ext UI-2", deps `fe-codec-theme, fe-codec-patterns`.
- [FACT: reconstructed-structure.md:28 (frontend-replan)] #8 deps = `#1 #2` → theme + patterns. Both
  Done ✅ ([FACT: TASKS.md:32] fe-codec-theme LIF-213 ✅; [FACT: TASKS.md:30] fe-codec-patterns LIF-211 ✅).
- [FACT: packages/ui/src/components/neural-graph.tsx:1-187] the shipped V7 renderer: props
  `nodes/edges/onNodeClick/state/height/layoutIterations/ref/aria-label`; WebGL-guarded Sigma mount via
  ref+effect; `graphKey` content-signature effect dep (NOT array refs); `sigma.kill()` cleanup;
  aria-hidden canvas + sr-only focusable node-`<button>` list as the a11y equivalent.
- [FACT: packages/ui/src/hooks/use-reduced-motion.ts (per CLAUDE.md "hooks/")] the CODEC `ReducedMotion`
  primitive shipped by fe-codec-patterns S2 — gates the Tamagui `animation` prop; the reduced-motion tool.
- [FACT: packages/ui/src/components/empty-state.tsx (per CLAUDE.md "fe-codec-patterns")] `EmptyState`, the
  teaching-invitation empty — the richer slot a consumer composes over the default `Message`.
- [FACT: packages/ui/src/internal/data-view.tsx] the shared spine: `ViewState`, `Message`,
  `resolveDataViewState`, `warnMissingName`.
- [FACT: packages/ui/src/CLAUDE.md pomodoro P1 + timeline P3 paragraphs] the DOCUMENTED pattern for
  theming a non-Tamagui (SVG/WebGL) surface: `useTheme().get('web')` — e.g. `theme.colorBrandPrimary?.get('web')`.
  CLAUDE.md states a hard-coded hex "would reintroduce the Neural-Graph conformance gap" — i.e. this is the
  exact tool that closes finding #1.
- [FACT: apps/web/src/app/graph/index.tsx:1-10] the graph route is the lazy WebGL boundary (BR-7); renders
  `<NeuralGraph nodes={[]} edges={[]} state="empty" />` because "No graph-data source in M1.0 (AR-8
  graph-prep is a seam)".
- [FACT: decomposition.md:21 (frontend-replan)] `graph` is one of the 7 canonical view-modes.
- [FACT: decomposition.md:32] the **Canvas** archetype = immersive Editor · **Graph (Sigma, ink voice)** ·
  Reader · Vision-board · Calendar-grid — "where the soul lives".

## 2. NEEDS (what this unit must deliver)

The 3 LIF-230 audit findings ([FACT: .claude/tasks/fe-codec-canvas-graph.md ⚑ section]), each a NEED:

1. **Ink voice / theme-driven colors** — [FACT: neural-graph.tsx:47-48] `DEFAULT_NODE_COLOR='#6366f1'` +
   `DEFAULT_EDGE_COLOR='#cbd5e1'` are hard-coded, outside Tamagui theming (NG-7). [FACT: surface-map.md:28]
   "must render in the editorial ink voice (not a blue SaaS graph)"; [FACT: surface-map.md:141, the
   Theme-ability item] "any hard-coded palette = WRONG (P1) … must be editorial ink, not blue SaaS." → drive node/edge colors from
   theme tokens, per-preset, light/dark, via the `useTheme().get('web')` pattern.
2. **Consumer `empty?`/`error?` slots** — [FACT: neural-graph.tsx:154-156] the loading/error/empty copy is
   hardcoded `Message`; unlike every other data-view a consumer can't compose the teaching `EmptyState`.
   → add optional `empty?`/`error?` (and consistently `loading?`) slots that override the default `Message`.
3. **Reduced-motion** — [FACT: neural-graph.tsx:139] `forceAtlas2.assign(graph, {iterations, …})` always
   runs the layout animation. → resolve `prefers-reduced-motion` behaviour (settle-instant vs reduced
   iterations) using the shipped `useReducedMotion` hook.

[INTERP: from §1 facts] because AR-8 graph-prep is an unbuilt M1 seam (graph route degrades to empty), the
apps/web deliverable is thin — the route already works; a live graph-data adapter has no M1 consumer and
follows the sibling-unit precedent of deferring the live hook to first consumer. The load-bearing work is
the `@vida/ui` renderer extension. [UNKNOWN: needs Step 2] whether apps/web gets any net code this unit or
the route stays as-is.

## 3. ORGANIZATION (where the work lives + the boundary)

- [FACT: neural-graph.tsx:10-11 comment] PRESENTATIONAL boundary: `nodes`/`edges` are props the app
  provides (AR-8 graph-prep, which `@vida/ui` can't import). The renderer never fetches/shapes data.
- [INTERP] @vida/ui owns the renderer extension (neural-graph.tsx + stories + test + the CLAUDE.md digest +
  the v7-neural-graph.md durable spec). apps/web owns the route/adapter (thin or unchanged).
- [FACT: CLAUDE.md "list-view" / ViewState note] `@vida/ui` deps are Tamagui-only; importing `@vida/core`
  would be a wrong-direction edge → all new types stay LOCAL to @vida/ui.

## 4. IMPLICIT RULES (the traps — catch them here, not in the browser)

- [FACT: neural-graph.tsx:12-15 comment] the effect MUST stay keyed on `graphKey` (content signature), NOT
  the nodes/edges array refs — else an equal-content new array kills+rebuilds+relayouts the WebGL context
  every render (browsers cap ~16 live contexts → crash). A theme-color change must likewise NOT thrash the
  context: [INTERP] colors resolved from theme must either (a) be read at mount inside the effect, or (b) a
  theme/preset change must re-init deliberately — but a re-render alone must not. [UNKNOWN: needs /contract]
  the exact re-init trigger for a live preset switch vs the no-thrash guarantee.
- [FACT: neural-graph.tsx:83-91] WebGL-guard (`webglAvailable`) MUST be preserved — jsdom/no-WebGL skip the
  effect and fall back to the node-list; tests mock sigma + stub getContext.
- [FACT: neural-graph.tsx:168-176] the sr-only focusable node-`<button>` list is the §XIV a11y equivalent
  AND the no-WebGL data fallback — it renders in success regardless of WebGL; must survive untouched.
- [FACT: CLAUDE.md pomodoro P1] a `$token` as an SVG/WebGL attr renders colorless; the theme value MUST be
  resolved via `useTheme().get('web')` (not passed as a `$token` string into Sigma's color fields).
- [INTERP: token-purity house rule, fe-codec-primitives-refinement P5 precedent] no new palette — the ink
  voice reuses existing semantic tokens (text/ink, brand, border, muted); any AA concern is resolved by
  choosing an existing ramp step (the `$colorBrandEmphasis` P5 precedent), never a new hex.
- [FACT: neural-graph.tsx:93-110] the degree-map / dangling-edge dev-warn runs in jsdom (testable) — keep.

## 5. Envision Gate pre-assessment (the §3.75 trigger test — reported, Victor reviews)

- The test [FACT: entity-delivery-flow.md §3.75, via scenario default.md:24]: "Is there a user affordance
  whose UI answer isn't already obvious from an existing shipped surface?"
- [INTERP: from §1-§4] NO. The graph surface is already shipped and rendering; its affordances (view the
  graph · click a node to navigate · keyboard node-list) are unchanged. This unit is an **aesthetic +
  conformance refinement of a shipped surface** (ink voice, 2 slots, reduced-motion) — no novel affordance.
- Precedent: [FACT: TASKS.md:9 fe-codec-primitives-refinement] the sibling aesthetic-refinement pass (P1–P5,
  5 shipped views) ran **per-phase Visual Gates, NOT the Envision Gate** — same KIND of work.
- → **SKIP the Envision Gate** ✅ CONFIRMED by Victor 2026-10-08; the "ink voice" is a `feel` concern
  validated at the blocking per-slice Visual Gate (full matrix: 3 presets × light/dark). The gate REVIEW
  was Victor's; the TRIGGER was this doc test.

## 6. Open UNKNOWNs (blocking until resolved)

- [UNKNOWN: Step 1.5 → Victor] confirm the Envision-Gate SKIP (§5).
- [UNKNOWN: Step 2 Decomposition] slice split — one @vida/ui renderer-extension slice vs splitting the 3
  findings; and whether apps/web gets any net code.
- [UNKNOWN: /contract] the ink-voice token mapping (node = ? edge = ?) + the live-preset-switch re-init
  guarantee vs the graphKey no-thrash rule.
