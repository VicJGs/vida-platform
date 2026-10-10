# Spec: component:fe-codec-canvas-graph
<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->
Status: implemented      <!-- draft → approved → implemented -->  (Approval 2 2026-10-08; implemented + Visual Gate PASS 2026-10-09)
Source-repo: packages/ui/src/components/neural-graph.tsx · apps/web/src/app/graph
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-10-08-fe-codec-canvas-graph (initial).
Delivery: docs/specs/foundation/fe-codec-canvas-graph/delivery/{interpretation,slice-map,seam-contract}.md

## 1. Identity
The CODEC **Canvas: Graph** surface — unit #8 of the G6 frontend CODEC set. The Neural Graph archetype
rendered in the editorial "ink voice". This unit **EXTENDS the shipped `@vida/ui` `NeuralGraph` (UI-2 · V7)
in place** to resolve the 3 conformance findings deferred here from the LIF-230 audit: per-preset
theme-driven colors (not a fixed blue-SaaS hex), consumer terminal-state slots, and a resolved
reduced-motion posture.
**What it is NOT:** a from-scratch graph engine (EXTEND, do not rebuild) · a new composing shell file
([FACT: g6-reshape-runbook.md:38] "ext UI-2") · the graph data-prep layer (AR-8, module-owned, out of
scope — [FACT: apps/web/src/app/graph/index.tsx:4]) · the per-feature graph pages (Feature Atlas / Skill /
Contributions / Relationships — P6, [FACT: decomposition.md:69,93,97,102]) · an immersive full-bleed frame
(the consumer's layout via the existing `height` prop) · 10K-node webworker perf (documented future ceiling).

## 2. Business Rules
Invariants (what must stay true) + the 3 findings as rules. "BR" = business rule.

**Preserved invariants (regressions forbidden — [FACT: interpretation.md §4]):**
- BR-1 — the Sigma init effect stays keyed on `graphKey` (content signature), NEVER the `nodes`/`edges`
  array refs ([FACT: neural-graph.tsx:112-116,146]); an equal-content new array must not kill+rebuild the
  WebGL context (the ~16-live-context cap, [FACT: neural-graph.tsx:12-15]).
- BR-2 — the WebGL guard (`webglAvailable`) is preserved: jsdom / no-WebGL skip the effect and render the
  node-list fallback ([FACT: neural-graph.tsx:83-91,162-166]).
- BR-3 — the sr-only focusable node-`<button>` list (the §XIV a11y equivalent AND the no-WebGL data
  fallback) renders in success regardless of WebGL and is untouched ([FACT: neural-graph.tsx:168-176]).
- BR-4 — dangling-edge skip + dev-warn preserved ([FACT: neural-graph.tsx:99-108]).
- BR-5 — no `@vida/core` import; all new types stay LOCAL to `@vida/ui` ([FACT: CLAUDE.md ViewState note]).
- BR-6 — token-pure: no new palette; existing semantic tokens only ([FACT: fe-codec-primitives P5 precedent]).

**Finding #1 — ink voice (per-preset theme colors):**
- BR-7 — the node DEFAULT color = `$colorBrandPrimary` resolved via `theme.colorBrandPrimary?.get('web')`
  ([FACT: pomodoro-widget.tsx:85-90 + timeline.tsx:168-169 precedent]); the edge DEFAULT =
  `$colorBorderDefault` via `theme.colorBorderDefault?.get('web')`. Replaces the hard-coded
  `'#6366f1'`/`'#cbd5e1'` ([FACT: neural-graph.tsx:47-48]). [FACT: surface-map.md:28,141] "editorial ink,
  not blue SaaS; any hard-coded palette = WRONG".
  **Reconciles NG-7** ([FACT: v7-neural-graph.md:74-80]): NG-7 already INTENDED "a default from a resolved
  theme value" — the shipped hard-coded hex DRIFTED from NG-7's own intent. BR-7 restores it AND evolves it:
  the component resolves its OWN themed default via `useTheme()` (no consumer burden), rather than requiring
  the consumer to supply a resolved value. NG-7's "no sub-theme / Sigma ≠ Tamagui tokens" conclusion stands
  (we still don't use a sub-theme — we read the resolved semantic value). §XXIX will update NG-7's wording.
- BR-8 — a per-item `GraphNode.color` / `GraphEdge.color` still OVERRIDES the default ([FACT:
  neural-graph.tsx:132,137]) — unchanged.
- BR-9 — a `$token` string is NEVER passed to Sigma (renders colorless); the colour must be CONCRETE
  (`rgb(...)`/hex). **§XXVIII deviation (2026-10-09, live-test-caught):** `.get('web')` does NOT return a
  concrete colour — it returns a CSS-var REFERENCE (`var(--colorBrandPrimary)`), and a custom property's
  computed value does not substitute nested var() refs, so `getComputedStyle(host).getPropertyValue('--…')`
  only yields the next link in the chain. The concrete, preset-aware value is obtained by reading a REAL
  property on a throwaway probe `<span>` in the Sigma host subtree: `probe.style.color = token;
  host.appendChild(probe); getComputedStyle(probe).color` → `rgb(...)` (the browser applies the full cascade
  incl. the preset's `<body>`-class override). Removed immediately (same tick, no paint). jsdom (no CSS var
  engine) → the probe yields a var/empty → the literal fallback. This is NECESSARY because WebGL has no CSS
  context (the SVG `stroke="var(…)"` pomodoro precedent works only because SVG resolves var() via CSS).
- BR-10 — **live preset-switch recolor = stale-until-re-topology.** Colors are read at mount inside the
  effect; the effect deps DO NOT add the color signature, so a live preset switch keeps the old colors until
  the next topology change. **This IS the documented NG-2 behavior** ([FACT: v7-neural-graph.md:42-43]
  "Re-inits only when the TOPOLOGY actually changes — color/size-only change without a diff-update is
  deferred") — not a new decision, a conformance to the existing rule. Also justified for M1: [FACT: graph
  route:9] renders an EMPTY graph (AR-8 unbuilt) → no live-data consumer to recolor; a color-keyed re-init
  would relayout (nodes jump) or flicker the WebGL context for a path nothing exercises in M1. Surgical
  live-recolor (`setNodeAttribute`+`refresh`, no relayout) is homed to first-consumer (AR-8). Not silent.

**Finding #2 — consumer terminal-state slots:**
- BR-11 — add optional `loading?` / `error?` / `empty?: ReactNode` props; each renders as
  `{slot ?? <Message role="status">…default…</Message>}` ([FACT: board-view.tsx:152,161 +
  calendar-view.tsx:134 precedent]). Absent slot → current copy verbatim (back-compat): "Loading…",
  "Couldn't load.", "No connections yet." ([FACT: neural-graph.tsx:154-156]). `role="status"` preserved.

**Finding #3 — reduced-motion (BUILD — per the approved decomposition; Victor-confirmed 2026-10-08):**
- BR-12 — **BUILD the iteration-gate** ([FACT: slice-map.md:24-25, seam-contract.md:48-51 — the Approval-1
  decomposition]). Gate the `forceAtlas2.assign` iteration count via the shipped `useReducedMotion()` hook
  ([FACT: packages/ui/src/hooks/use-reduced-motion.ts]): **reduced → 0 iterations** (the graph stays on its
  deterministic circular seed `x=cos(2πi/n),y=sin(2πi/n)` — [FACT: neural-graph.tsx:129-130] — an instant,
  predictable, non-organic arrangement; no force-settling); **normal → `layoutIterations`** (current). Add
  `reduced` to the effect deps so an OS-setting toggle re-lays-out (a deliberate re-init like a topology
  change; `reduced` is stable across unrelated re-renders so BR-1 holds).
  - [FACT: v7-neural-graph.md:81-86] NG-8 is accurate that the layout is synchronous (no *continuous*
    motion); the gate's value is on the OTHER axis NG-8 names — the synchronous main-thread settle that
    "janks above a few hundred nodes": reduced users get the 0-iteration calm circular layout, skipping the
    force-settling compute. NG-8's durable wording is updated at §XXIX (A11) to carry this.
  - [INTERP] async-first-paint nuance: the shipped `useReducedMotion` returns `false` until mounted, so a
    POPULATED graph could paint one force-layout frame before the gate applies. **Moot in M1** — the route
    renders an EMPTY graph ([FACT: graph route:9], effect early-returns at `nodes.length===0`). A synchronous
    `matchMedia` read (the `webglAvailable` lazy-useState precedent, neural-graph.tsx:84) is the documented
    first-consumer refinement if it ever matters with real data; M1 uses the hook as the decomposition specifies.

**Terminal states (the §VIII matrix for this surface):** loading · error · empty · success(+WebGL canvas) ·
success(no-WebGL → node-list + "needs WebGL"). All rendered; no new state added.

**Fail-loud:** dangling edges dev-warn (BR-4); contradictory props keep the existing guards. No silent catch.

## 3. Contract
<!-- /contract output — props / visual states / a11y / motion. -->

**Component:** `NeuralGraph` (extended in place). `NeuralGraphProps` additions (3 optional props):

| Prop | Type | Default | Rule |
|------|------|---------|------|
| `loading?` | `ReactNode` | `<Message>Loading…</Message>` | BR-11 |
| `error?` | `ReactNode` | `<Message>Couldn't load.</Message>` | BR-11 |
| `empty?` | `ReactNode` | `<Message>No connections yet.</Message>` | BR-11 |

All existing props unchanged ([FACT: neural-graph.tsx:31-44]): `nodes`, `edges`, `onNodeClick`, `state`,
`height`, `layoutIterations`, `ref`, `aria-label`. `GraphNode`/`GraphEdge` unchanged (incl. per-item
`color?` override, BR-8).

**Internal (no prop):** node/edge default colors resolved from `useTheme()` (BR-7, BR-9); the
`forceAtlas2` iteration count gated by `useReducedMotion()` (BR-12).

**Visual states:**
- default/success (+WebGL): the Sigma canvas, nodes in `$colorBrandPrimary` (per-preset), edges in
  `$colorBorderDefault`; frame `$colorSurfacePrimary` (flips with theme, [FACT: neural-graph.tsx:68]).
- success (no WebGL): "This graph needs WebGL." + the node-list ([FACT: neural-graph.tsx:162-166]).
- loading / error / empty: the slot or its default `Message` (BR-11).
- All states × 3 presets × light/dark must hold (the Visual Gate matrix).

**a11y:** unchanged — aria-hidden canvas + sr-only focusable node-list (BR-3); `role="group"` + composed
`aria-label` on success ([FACT: neural-graph.tsx:180-183]); `role="status"` on message states. Node/edge
color is non-text → WCAG 1.4.11 3:1 non-text contrast (brandPrimary is fill-tuned); the node LABEL legibility
is Sigma's own text rendering, unchanged.

**Motion:** no animation added; the reduced-motion gate (BR-12) swaps the force layout for the 0-iteration
circular seed — an instant layout change, not an animated transition.

## 4. Acceptance
- [ ] A1 — no hard-coded `#6366f1`/`#cbd5e1` remain; node/edge defaults resolve from `useTheme().get('web')`
      (BR-7, BR-9). [grep: 0 hits for the hexes in neural-graph.tsx]
- [ ] A2 — nodes render the per-preset brand color; editorial/reader/quietDesk visibly differ (Visual Gate).
- [ ] A3 — `loading?`/`error?`/`empty?` slots override the default `Message`; absent → verbatim current copy
      (BR-11). [test: pass a sentinel node, assert it renders; omit, assert default copy]
- [ ] A4 — a per-item `GraphNode.color` still overrides the themed default (BR-8). [test]
- [ ] A5 — BR-1 preserved: an equal-content new `nodes`/`edges` array does NOT re-init Sigma (graphKey). [test]
- [ ] A6 — BR-2/BR-3 preserved: jsdom renders the node-list fallback; WebGL guard intact. [existing tests green]
- [ ] A7 — reduced-motion BUILD (BR-12): `useReducedMotion()` gates the iteration count — reduced → `assign`
      runs with `iterations: 0` (circular seed), normal → `layoutIterations`; `reduced` in the effect deps.
      [test: matchMedia-mock both paths, assert the `h.assign` iterations arg]
- [ ] A8 — `pnpm --filter @vida/ui typecheck && test && build` green; eslint 0; no `@vida/core` import (BR-5).
- [ ] A9 — Visual Gate PASS (Brave, 3 presets × light/dark: ink nodes per preset · edges hairline · full
      state matrix · axe 0 · 375 no overflow). Evidence captured.
- [ ] A10 — R1: `apps/web/src/app/graph/index.tsx` unchanged + still renders (the empty graph inherits the
      ink voice). [apps/web typecheck green]
- [ ] A11 — §XXIX currency: `v7-neural-graph.md` (NG-7 + NG-8 wording updated; NG-2 cross-ref) +
      `packages/ui/src/CLAUDE.md` digest refreshed, committed with the code.

## 5. Implementation Prompt
Single slice S1 (@vida/ui); R1 is no-code. Cite §2/§3; do not restate.

1. `packages/ui/src/components/neural-graph.tsx` — **imports:** add `useTheme` to the `@tamagui/core` import
   ([FACT: pomodoro-widget.tsx:2 shape]).
2. **ink colors (BR-7/9):** inside `NeuralGraph`, `const theme = useTheme()`; capture the token refs
   `const nodeColorToken = theme.colorBrandPrimary?.get('web') ?? '#6366f1'` +
   `const edgeColorToken = theme.colorBorderDefault?.get('web') ?? '#cbd5e1'` (these are `var(--…)` strings).
   Delete the module-level `DEFAULT_NODE_COLOR`/`DEFAULT_EDGE_COLOR` consts (§2 A1). In the effect (after the
   WebGL guard) resolve each token to a CONCRETE colour via the probe-`<span>` resolver (BR-9 §XXVIII
   deviation): append a probe to `containerRef.current`, read `getComputedStyle(probe).color`, remove it;
   return the `rgb(...)` or the literal fallback. Use the resolved `nodeColor`/`edgeColor` in
   `graph.addNode`/`addEdge` (`node.color ?? nodeColor`, `e.color ?? edgeColor`) ([FACT:
   neural-graph.tsx:132,137]). **The token refs are read in the effect but added to NEITHER the deps** (BR-10
   stale-until-re-topology) — comment why.
3. **slots (BR-11):** add `loading?`, `error?`, `empty?: ReactNode` to `NeuralGraphProps` (§3 table);
   destructure them; change the three message branches ([FACT: neural-graph.tsx:154-156]) to
   `{loading ?? <Message role="status">Loading…</Message>}` etc.
4. **reduced-motion (BR-12 — BUILD):** import `useReducedMotion` from `../hooks/use-reduced-motion`; `const
   reduced = useReducedMotion()`. In the effect, compute `const iterations = reduced ? 0 : layoutIterations`
   and pass it to `forceAtlas2.assign(graph, { iterations, settings:{ barnesHutOptimize:true } })` ([FACT:
   neural-graph.tsx:139]). Add `reduced` to the effect deps → `[graphKey, webglAvailable, layoutIterations,
   reduced]`. Comment: reduced → the deterministic circular seed (0 force iterations), per seam-contract:48-51.
5. `packages/ui/src/components/neural-graph.stories.tsx` — add/extend stories so the Visual Gate matrix is
   coverable: default (themed nodes), a `GraphNode.color` override, each terminal state with a custom slot,
   no-WebGL note. (Stories are the gate surface.)
6. `packages/ui/src/components/neural-graph.test.tsx` — add jsdom tests: A3 (slot override + default copy),
   A4 (per-item `GraphNode.color` wins — via `h.Sigma.mock.calls[0][0].getNodeAttribute('a','color')`, since
   graphology is unmocked), A7 (reduced-motion: mock `matchMedia('(prefers-reduced-motion: reduce)')→matches:true`
   + `enableWebGL`, assert `h.assign` called with `iterations: 0`; and the normal path with `layoutIterations`).
   A5 is ALREADY covered (the existing "B1" test, :110-122). Keep all existing WebGL-mock lifecycle tests.
7. **R1:** confirm `apps/web/src/app/graph/index.tsx` needs no change (A10) — do not edit.
8. **Visual Gate** (Brave, `/tmp/vg/*-gate.mjs` + `http.server 6099` on `storybook-static`): the §4 A9 matrix.
9. **§XXIX currency (A11):** refresh the `neural-graph` paragraph in `packages/ui/src/CLAUDE.md` + the
   `v7-neural-graph.md` durable spec — UPDATE NG-7's wording (default is now the component-resolved themed
   value via `useTheme().get('web')`, not a hard-coded hex / consumer-supplied value) AND NG-8's wording (the
   reduced-motion iteration-gate now EXISTS: reduced → 0-iteration circular seed) + an NG-2 color-deferral
   cross-ref (BR-10); commit with the code.
Done = §4 all checked.

## 6. Open UNKNOWNs / Decisions Needed
- ~~[Step 1.5] Envision Gate~~ → RESOLVED: SKIP (Victor-confirmed 2026-10-08).
- ~~[Step 2] slice split~~ → RESOLVED: single S1 @vida/ui slice + R1 no-code (Approval 1, 2026-10-08).
- ~~[contract] ink token mapping~~ → RESOLVED: node=`$colorBrandPrimary`, edge=`$colorBorderDefault` (BR-7),
  Visual-Gate-validated at A2/A9.
- ~~[contract] live preset-switch re-init~~ → RESOLVED: stale-until-re-topology for M1 (BR-10); surgical
  live-recolor homed to first-consumer.
- ~~[gate-2] finding #3 RATIFY vs BUILD~~ → RESOLVED: **BUILD the useReducedMotion iteration-gate** (BR-12),
  Victor-confirmed 2026-10-08 — honoring the Approval-1 decomposition (my RATIFY drift reverted; no
  decomposition edits needed, the slice-map was correct).
- ~~[contract] ink mapping~~ → RESOLVED: **node=`$colorBrandPrimary` (brand accent per-preset), edge=
  `$colorBorderDefault`** (BR-7), Victor-confirmed 2026-10-08; Visual-Gate-validated at A2/A9. No open decisions.

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-10-08 | 2026-10-08-fe-codec-canvas-graph | initial draft (stub) |
| 2026-10-08 | 2026-10-08-fe-codec-canvas-graph | full spec: §2 rules (BR-1..12) · §3 contract · §4 acceptance · §5 impl prompt; UNKNOWNs resolved |
| 2026-10-08 | 2026-10-08-fe-codec-canvas-graph | preflight folds: reconcile NG-7 (BR-7, drift restore) · NG-2 (BR-10, documented deferral) · NG-8 (BR-12); preflight PASSED |
| 2026-10-08 | 2026-10-08-fe-codec-canvas-graph | gate-2 critic REVISE→fixed: BLOCKER — my RATIFY of finding #3 flipped the approved slice-map; reverted to BUILD the useReducedMotion gate (Victor-chosen); ink mapping confirmed brand accent; N2/N6 NITs folded; Status → approved |
| 2026-10-09 | 2026-10-09-fe-codec-canvas-graph | IMPLEMENTED S1; §XXVIII deviation (BR-9): `.get('web')` returns a CSS-var ref (unusable by WebGL) → added a probe-`<span>` getComputedStyle resolver for concrete preset-aware colour; live test caught it. typecheck 0 · @vida/ui 473/473 (+3) · build clean · eslint 0 err |
