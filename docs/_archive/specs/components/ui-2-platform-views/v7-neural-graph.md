# Spec: component:ui-2-platform-views · V7 — neural-graph

<!-- type: component (unit sub-spec of ui-2-platform-views) — the LAST UI-2 view -->

Status: implemented + Visual Gate PASS (Victor, 2026-08-10) — DONE
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Parent: docs/specs/components/ui-2-platform-views/\_index.md.

## 1. Identity

V7 `neural-graph` — the renderer for the `graph` VIEW_LAYOUT `[FACT: view.ts:23; ADR-007:60]`: a **force-directed
WebGL graph** (Sigma.js) visualizing connections between entities (notes/people/projects…). The last UI-2 view; the
hardest (WebGL + new deps). Consumed by **HARD-3** (backlinks + neural graph complete). Currently a 0-byte stub.

- **Tech + deps (new) — resolved by the established pattern, NOT a decision.** **ADR-001:125 mandates only "Sigma.js"**
  (satisfied by raw `sigma`); `@sigma/react` appears only in the **`apps/web` dep illustration** (:251), not as a
  `packages/ui` mandate. And **BR-5 is the umbrella's own rule** — every third-party render surface in `@vida/ui` mounts
  via a ref+effect (the Tabs `ResizeObserver` precedent), which it also needs for precise `kill()` lifecycle control
  (B1/M1). So the binding is **raw `sigma` + `graphology` + `graphology-layout-forceatlas2`** by APPLYING BR-5 + the ADR,
  not a new call. ⚠ **Verify the `sigma` v3 + `graphology` API at impl (§5.1)** — library-specific, may post-date training
  data. `[FACT: ADR-001:125 "Sigma.js"; :251 @sigma/react in the apps/web block; _index.md BR-5 third-party-mount rule]`
- **PRESENTATIONAL (the boundary).** The graph DATA (nodes/edges) is AR-8's graph-prep (`@vida/core`), which `@vida/ui`
  can't import → **`nodes`/`edges` are PROPS** the app provides (mapping AR-8's output). V7 defines its OWN minimal
  presentational `GraphNode`/`GraphEdge` shape (no core type is exported). Interaction = intent callbacks
  (`onNodeClick`). `[FACT: AR-8 core/services graph-prep; @vida/ui deps = Tamagui+date-fns]`
- **What it is NOT:** NOT the graph data-prep (AR-8) · NOT clustering/filtering/zoom-controls UI (§6) · NOT a full
  accessible text-alternative (canvas is SR-opaque; V7 gives an aria-label summary, text-alt deferred) · NOT edge labels.

## 2. Business Rules

- **NG-1 · Nodes/edges props + local types.** `nodes: readonly GraphNode[]` (`{ id; label?; color?; size? }`) +
  `edges: readonly GraphEdge[]` (`{ source; target; color? }`). Edges whose `source`/`target` aren't in `nodes` are
  **skipped** (dev-warn) — a dangling edge must not crash graphology. `[INTERP: graphology addEdge throws on missing node]`
- **NG-2 · Sigma lifecycle in a ref+effect (BR-5), WebGL-GUARDED, keyed on CONTENT not array-ref (B1).** ⚠ The effect
  must NOT dep on the `nodes`/`edges` array REFERENCES — a consumer passing `nodes={raw.map(...)}` inline yields a new
  array every render → `kill()`+rebuild+relayout every render (flicker, camera reset, WebGL-context churn → the ~16-context
  browser cap → crash; the Toast re-arm bug at WebGL scale). Instead dep on a **content signature**:
  `const graphKey = useMemo(() => nodes.map(n=>n.id).join('|')+'¦'+edges.map(e=>e.source+'>'+e.target).join('|'),
[nodes, edges])` (the calendar `[gridStart.getTime()]` precedent). The `useEffect` (deps `[graphKey, webglAvailable,
layoutIterations]`, reading current nodes/edges): skip if `!webglAvailable || !containerRef.current || nodes.length===0`;
  else build a `graphology.Graph` (add nodes with a **deterministic circular seed** `x=cos(2πi/n),y=sin(2πi/n)` — m1, no
  RNG, non-degenerate FA2 start), add valid edges, run **`forceatlas2.assign(graph, { iterations, settings:{
barnesHutOptimize:true } })`** (M4 — O(n log n) not naïve O(n²)), `new Sigma(graph, containerRef.current, settings)`,
  wire `sigma.on('clickNode', …) → onNodeClick(id)`. **Cleanup: `sigma.kill()`** — disposes the WebGL context + renderer +
  camera + the `clickNode` listener (Sigma-owned) + drops the graphology/FA2 refs. Re-inits only when the TOPOLOGY
  actually changes (color/size-only change without a diff-update is deferred). `[FACT: sigma.kill() teardown; calendar
content-key precedent; tabs.tsx effect-cleanup]`
- **NG-2b · WebGL availability (jsdom guard).** `webglAvailable` computed once via a **`useState` lazy init** (m3 —
  not `useMemo`; it's a computed-once client constant): `document.createElement('canvas').getContext('webgl') != null`
  (false in jsdom → the effect skips, no crash; false in a real no-WebGL browser → the NG-6 fallback). Top-level
  `import sigma` must NOT touch WebGL/window at import time (verify §5.1) — so a jsdom test with Sigma never
  constructed stays green. `[FACT: jsdom has no WebGL; the package's jsdom-guard convention]`
- **NG-3 · Terminal states (local, NOT resolveDataViewState — a graph isn't a list).** `state?: ViewState`
  (default `'success'`): `loading`/`error` → the shared `Message` in a `role="status"`; `empty` (or `success` with 0
  nodes) → a `Message` ("No connections yet") — NOT a blank canvas; `success` with nodes → the graph canvas. Reuses
  `Message` from `internal/data-view`. `[FACT: internal/data-view.tsx Message; calendar divergence precedent]`
- **NG-4 · Interactions (minimal).** `onNodeClick?(nodeId)` fires from BOTH Sigma's `clickNode` (mouse) AND the
  accessible node `<button>`s (keyboard, NG-5) — one intent, two input paths. Sigma's built-in pan/zoom/drag are on by
  default (its camera). Hover-highlight-neighbours + a reset-zoom control = deferred (§6). `[INTERP: sigma defaults]`
- **NG-5 · A11y — a REAL accessible equivalent built IN V7 (§XIV satisfied, no deviation, no deferral).** The WebGL
  canvas has no per-node DOM, so the canvas container is **`aria-hidden`** (a purely visual rendering). Alongside it,
  V7 renders a **visually-hidden accessible alternative from the SAME nodes/edges props** — a `role="list"` where each
  node is a real, deliberately **BARE `<button>`** (m-D — NOT UI-1 `Button`; that carries visual chrome/overlay/intent
  fills, wrong for an sr-only element) showing label + neighbour count, firing `onNodeClick(id)`. So `onNodeClick` is
  fully **keyboard-reachable + SR-navigable** — the §XIV mouse↔keyboard equivalence is MET in V7, not deferred (V7 has
  the data; needs no HARD-3). ⚠ **sr-only technique (m-B):** an injected/inline style `{ position:absolute; width:1px;
height:1px; padding:0; margin:-1px; overflow:hidden; clip-path:inset(50%); whiteSpace:nowrap; border:0 }` — **NEVER
  `display:none`/`visibility:hidden`** (they remove focusability). The whole widget is a labelled region (`aria-label`
  = consumer's ?? `"Network graph: ${nodes.length} nodes, ${validEdges} connections"`). The list shares NG-8's node
  ceiling (one button/node; 10K → §6 virtualization). Bonus: the node buttons make `onNodeClick` jsdom-testable.
  `[FACT: engineering.md §XIV; accessible-canvas dual-track pattern; themes/CLAUDE.md clip-path]`
- **NG-6 · No-WebGL fallback (§XXVIII impl refinement — the node-list renders here too).** `webglAvailable===false`
  (a real browser without WebGL, OR jsdom) → the success case renders the `Message` "This graph needs WebGL" **AND
  still the accessible node-list** (NG-5) — so SR/keyboard users get the graph DATA even with no WebGL, and the list
  is jsdom-testable. (The spec first said "render the Message" only; impl kept the node-list present in success
  regardless of WebGL — a strict improvement aligned with NG-5's intent.) `[FACT: NG-5 node-list is the a11y equivalent]`
- **NG-7 · Tokens / sub-theme.** The Tamagui FRAME (container `View`) uses base tokens (border `$colorBorderDefault`,
  bg `$colorSurfacePrimary`, a fixed/`height` prop). Node/edge COLORS are Sigma's (passed via node `color` or a
  default from a resolved theme value the consumer supplies) — Sigma renders in WebGL, outside Tamagui theming, so
  the graph's palette is **the consumer's data or a documented default**, not a sub-theme. **The Sigma canvas is
  TRANSPARENT** (no Sigma-side bg) → the frame's `$colorSurfacePrimary` shows through AND **flips with the theme** for
  free (m2). RESOLVED: **no sub-theme** (Sigma colors aren't Tamagui tokens; the frame uses base tokens); dimension
  props via the token scale (DEF-U8-h). `[FACT: Sigma WebGL ≠ Tamagui theming; Sigma default transparent bg]`
  **UPDATED — fe-codec-canvas-graph / LIF-205 (editorial ink voice):** the node/edge DEFAULT is no longer a fixed hex
  nor "consumer-supplied" — the component now resolves its OWN themed default (node = `$colorBrandPrimary`, edge =
  `$colorBorderDefault`, per-preset) via `useTheme().get('web')` → a probe-`<span>` `getComputedStyle` read that
  collapses the CSS-var chain to a concrete `rgb(...)` Sigma can parse (WebGL has no CSS context; a `var(--x)` renders
  colorless — a custom property's computed value doesn't substitute nested var() refs, hence the probe). Still **no
  sub-theme** — it reads the resolved SEMANTIC value, not a component sub-theme key. A per-item `GraphNode.color` still
  overrides. See `docs/specs/foundation/fe-codec-canvas-graph/` BR-7/BR-9.
- **NG-8 · Reduced motion + layout is SYNCHRONOUS, so BOUND the input (M4).** The forceatlas2 layout runs a FIXED
  iteration count synchronously (not a live animation) → no continuous motion to disable (B12-safe by construction). But
  synchronous FA2 (even Barnes-Hut O(n log n)) blocks the main thread; ADR-001's 10K+ ambition would freeze it. **V7 is
  validated to ~a few hundred nodes** (the realistic per-Space/backlink graph); above that, layout jank is expected and
  the **webworker layout (§6) is required** — a documented V7 ceiling, not a silent freeze. `[FACT: engineering.md §XIII
INP; ADR-001:125 10K ambition → §6 webworker]`
  **UPDATED — fe-codec-canvas-graph / LIF-205:** a reduced-motion iteration-gate now EXISTS — `useReducedMotion()`
  caps `forceatlas2.assign` to **0 iterations** when `prefers-reduced-motion` is set (the nodes stay on the
  deterministic circular seed — an instant, predictable, non-organic layout), vs `layoutIterations` normally;
  `reduced` is in the effect deps. The continuous-motion axis stays B12-safe-by-construction; this gate serves the
  calm-layout preference on the synchronous-settle axis. See `fe-codec-canvas-graph/` BR-12.

## 3. Contract

```ts
import { type ViewState } from './list-view' // reused type

export interface GraphNode {
  id: string
  label?: string
  color?: string
  size?: number
}
export interface GraphEdge {
  source: string
  target: string
  color?: string
}

export interface NeuralGraphProps {
  nodes: readonly GraphNode[]
  edges: readonly GraphEdge[]
  /** Node-click intent (the app opens the entity). */
  onNodeClick?: (nodeId: string) => void
  /** loading | error | empty | success. Default 'success' (empty folds to a message if nodes is []). */
  state?: ViewState
  /** Frame height (px). Default 400. */
  height?: number
  /** forceatlas2 iterations. Default 200. */
  layoutIterations?: number
  ref?: Ref<HTMLDivElement>
  'aria-label'?: string
}
export function NeuralGraph(props: NeuralGraphProps): ReactElement // NOT generic; React-19 ref-as-prop
```

- 8-state matrix (§VIII): success(graph) · loading/error/empty(`Message`) · no-WebGL(fallback message) · hover/focus
  (Sigma camera; container focusable?) · disabled(n/a) · dark(frame base tokens; Sigma bg a documented default) ·
  responsive (the frame fills width; height fixed). Sub-theme: none (NG-7). Export from `index.ts`. `*.test.tsx` (jsdom
  — guarded, no WebGL) + `*.stories.tsx` (the real graph, Visual Gate).

## 4. Acceptance

- [ ] `NeuralGraph` renders a Tamagui frame; with WebGL + nodes → mounts Sigma (verified in the Visual Gate, NOT jsdom).
- [ ] jsdom (no WebGL): renders the frame + the correct message per state (loading/empty/error/no-WebGL) WITHOUT
      crashing; Sigma is never inited; dangling edges are skipped + dev-warn; node/edge props accepted.
- [ ] `sigma.kill()` runs on unmount + on a TOPOLOGY change (no WebGL-context leak) — asserted via a sigma mock/spy.
- [ ] **B1: a re-render with an equal-content NEW `nodes`/`edges` array does NOT re-init Sigma** (kill NOT called — the
      content-key `graphKey` dep) — the highest-risk test.
- [ ] Layout uses `barnesHutOptimize:true` + a deterministic circular seed; V7's node-ceiling documented.
- [ ] Importing `sigma` at module top does NOT touch WebGL/window (jsdom green with Sigma never constructed).
- [ ] A labelled region (aria-label summary or consumer's); the WebGL canvas is `aria-hidden`; a **visually-hidden
      `role="list"` of node `<button>`s** (sr-only, focusable) is the accessible equivalent — a node button fires
      `onNodeClick(id)` (keyboard-reachable, jsdom-testable) AND Sigma's `clickNode` fires it (mouse). §XIV met in V7.
- [ ] `sigma`+`graphology`+`graphology-layout-forceatlas2` added to deps; dark-mode frame; responsive width.
- [ ] Storybook: a real force-directed graph (nodes/edges) + empty + a bigger graph, both themes → **Visual Gate PASS**.
- [ ] `pnpm --filter @vida/ui typecheck && build && test` green; root typecheck 10/10; §XXIX CLAUDE.md paragraph.

## 5. Implementation Prompt (ordered)

1. **VERIFY the library APIs first (§global rule).** `sigma` v3 (`new Sigma(graph, container, settings)`, events),
   `graphology` (`new Graph()`, `addNode`/`addEdge`/`hasNode`), `graphology-layout-forceatlas2`
   (`forceatlas2.assign(graph, {iterations, settings})`) — via context7/docs; pin the versions installed.
2. **Deps** — `pnpm --filter @vida/ui add sigma graphology graphology-layout-forceatlas2`.
3. **Types** — `GraphNode`/`GraphEdge`/`NeuralGraphProps`; import `ViewState` + `Message` from the data-view spine.
4. **WebGL guard** — `webglAvailable` via a canvas getContext('webgl'), computed once (useState init / useMemo).
5. **styled frame** — `GraphFrame` (`View`, `height` prop, `borderWidth`+`$colorBorderDefault`, `$colorSurfacePrimary`,
   `borderRadius`, `overflow:'hidden'`, `position:'relative'`) + a bare `containerRef` div child (Sigma mounts here).
6. **Sigma effect** (NG-2) — build graphology graph (circular x/y seed, m1), skip dangling edges (dev-warn),
   forceatlas2.assign (`barnesHutOptimize:true`), `new Sigma(...)`, `clickNode`→onNodeClick; cleanup `sigma.kill()`.
   Deps **`[graphKey, webglAvailable, layoutIterations]`** (⚠ NOT `[nodes, edges]` — the B1 array-ref churn bug), the
   effect body reading current `nodes`/`edges`.
7. **State/fallback render** — loading/error/empty → `Message` role=status; no-WebGL → `Message`; success+WebGL+nodes →
   the labelled region: the `aria-hidden` Sigma container div + a **visually-hidden `role="list"`** (the m-B clip style,
   NOT `display:none` — must stay focusable) of bare node `<button>`s (label + neighbour count, `onClick`→onNodeClick,
   also fired by Enter natively); aria-label summary; dev-warn on dangling edges. The list renders only in success.
8. **Tests** (jsdom, NO WebGL) — frame renders; each message state; no crash (Sigma not inited); dangling-edge skip +
   warn; **the accessible node buttons render + fire `onNodeClick(id)` on click/Enter** (keyboard path, jsdom-testable);
   canvas aria-hidden; aria summary; ref forwarded. (The WebGL graph render = Visual Gate.)
9. **Story** — a real graph (10-30 nodes + edges), an empty graph, a denser graph; both themes.
10. **Export** + CLAUDE.md paragraph (+ note the deps + the WebGL-guard + kill lifecycle).

## 6. Deferred (documented — NOT V7, likely HARD-3 / later)

Hover-highlight neighbours · zoom/reset controls UI · node clustering/grouping (by Space/tag) · filtering · edge
labels · a live/animated layout · **RICHER graph a11y** (edge-traversal / keyboard graph navigation between neighbours
— the BASIC accessible node-list + onNodeClick is IN V7, NG-5; this is the enhancement) · performance tuning for 10K+
nodes (webworker layout) · node search/focus · the `@sigma/react` wrapper (if a future consumer prefers it).

## 7. Change Log

| Date       | Session             | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-10 | ui-2-platform-views | V7 sub-spec authored at PLAN (Sigma.js WebGL force-directed graph; raw sigma+graphology+forceatlas2, WebGL-guarded ref+effect mount + kill cleanup; presentational nodes/edges props — AR-8 boundary; role=img + summary, text-alt deferred; the last view); gate-1 next                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-08-10 | ui-2-platform-views | Rev 2 — gate-1 critique REVISE→fixed: **B1** (effect keyed on CONTENT signature `graphKey`, not array-ref → no kill/relayout/context-churn per render; + acceptance test), **M1** (kill = full teardown; context-exhaustion is B1's consequence), **M4** (barnesHutOptimize + a documented node-ceiling — sync FA2 bounds), m1 (deterministic circular seed not RNG), m2 (transparent Sigma canvas → frame bg flips with theme), m3 (webglAvailable useState-lazy), m4 (top-import-no-WebGL acceptance)                                                                                                                                                                                                                                                  |
| 2026-08-10 | ui-2-platform-views | preflight PASSED (sigma v3 API verified via context7: `new Sigma(graph,container,settings)`·`on('clickNode',{node})`·`kill()`; sigma 3.0.3/graphology 0.26.0/forceatlas2 0.10.1). Gate-2 critique **REVISE**→fixed (all fixes confirmed landed): **M-A material** — impl step 6 still said the OLD `[nodes,edges]` deps (would reintroduce the B1 churn bug) → `[graphKey,…]`; m-B (pin the sr-only clip style, forbid display:none), m-C (a11y list shares the node ceiling), m-D (node-list = bare `<button>`, not UI-1 Button). **Approval 2 pending.**                                                                                                                                                                                               |
| 2026-08-10 | ui-2-platform-views | Rev 3 — **Victor caught 2 manufactured "sign-off decisions" as DRIFT** (both self-resolved, no gap left hanging): **①** the a11y "deferral to HARD-3" was a hand-wave (HARD-3's scope is "working graph", owns NO a11y; engineering.md §XIV has no carve-out) → **BUILD the accessible equivalent IN V7** (aria-hidden canvas + a visually-hidden `role="list"` of focusable node `<button>`s firing onNodeClick — §XIV MET, jsdom-testable, no deviation); **②** the raw-sigma "§XXVIII sign-off" was manufacturing a fork the pattern answers (BR-5 third-party-mount rule + ADR-001:125 "Sigma.js") → APPLY the pattern, no decision. [[dont-manufacture-an-architecture-fork-the-pattern-already-answers]] + [[dont-ask-scope-the-docs-already-fix]] |
