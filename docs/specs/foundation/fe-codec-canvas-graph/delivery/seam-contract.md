# fe-codec-canvas-graph — Seam Contract

> Entity Delivery Flow ② · Step 2. The interface the consumer sees. For a renderer-EXTEND there is no
> service API — the "seam" is the extended public `NeuralGraphProps`. Step 4 `/contract` refines visual
> states / a11y / motion from this. No-Guessing: additions are [INTERP] from the §Interpretation facts.

## The boundary (unchanged)
[FACT: neural-graph.tsx:10-11] PRESENTATIONAL — `nodes`/`edges` are props the app provides (AR-8 graph-prep,
uncrossable). The renderer never fetches or shapes graph data. All new types stay LOCAL to `@vida/ui`
(Tamagui-only boundary, [FACT: CLAUDE.md ViewState note]).

## Extended `NeuralGraphProps` (additions only — everything existing is kept, back-compat)

```ts
export interface NeuralGraphProps {
  // ── existing (UNCHANGED) ──────────────────────────────────────────────
  nodes: readonly GraphNode[]
  edges: readonly GraphEdge[]
  onNodeClick?: (nodeId: string) => void
  state?: ViewState                 // 'loading' | 'error' | 'empty' | 'success'
  height?: number                   // default 400
  layoutIterations?: number         // default 200
  ref?: Ref<HTMLDivElement>
  'aria-label'?: string

  // ── NEW · S1 finding #2: consumer terminal-state slots (override the default Message) ─
  /** Override the default "No connections yet." empty message (e.g. a teaching <EmptyState/>). */
  empty?: ReactNode
  /** Override the default "Couldn't load." error message. */
  error?: ReactNode
  /** Override the default "Loading…" message. */
  loading?: ReactNode
}
```

- [INTERP] `GraphNode.color?` / `GraphEdge.color?` stay a per-item OVERRIDE; only the DEFAULT changes from a
  hard-coded hex to a theme-resolved ink value. A consumer passing an explicit `color` is still honored.
- [INTERP] Slots are optional → absent reproduces current behaviour exactly (the data-view `Message`
  default). This matches the house slot pattern (collection/dashboard shell-owned-vs-consumer-override).

## Ink voice — the color seam (finding #1, internal, not a new prop)
[FACT: CLAUDE.md pomodoro P1] node/edge DEFAULT colors are resolved from the live theme via
`useTheme().get('web')` (NOT a `$token` string — Sigma renders that colorless). [INTERP] the token mapping
(which semantic → node, which → edge) is proposed at `/contract` and locked at the Visual Gate; candidates
from existing tokens only (token-pure): node ≈ ink/brand, edge ≈ a muted/border hairline. No new prop, no
new palette.

## Reduced-motion — the layout seam (finding #3, internal, not a new prop)
[FACT: neural-graph.tsx:139 + CLAUDE.md hooks/] `useReducedMotion()` gates the `forceAtlas2.assign`
iteration count: reduced → settle-instant (minimal/zero iterations, graph still laid out deterministically
from the circular seed); normal → current `layoutIterations`. No new prop.

## Invariants the contract MUST preserve (from interpretation §4)
- [FACT: neural-graph.tsx:12-15] effect stays keyed on `graphKey` (content signature), never array refs —
  the WebGL-context-thrash guard. A theme color read must not thrash the context on an unrelated re-render.
  [FACT: neural-graph.tsx:132,139-146] TODAY colors are read ONCE inside the effect body at mount
  (`node.color ?? DEFAULT_NODE_COLOR`); the effect deps are `[graphKey, webglAvailable, layoutIterations]`,
  so a **live preset switch leaves the graph on its old colors until the next topology change** (stale).
  [UNKNOWN → /contract] decide the live-preset-switch re-init rule — add the resolved preset/color signature
  (or a `theme` key) to a deliberate re-init trigger vs. accept stale-until-re-topology — a CONSCIOUS
  tradeoff, made with eyes open (gate-1 NIT). Whatever is chosen must NOT re-init on an unrelated re-render.
- [FACT: neural-graph.tsx:83-91] WebGL-guard preserved (jsdom/no-WebGL skip → node-list fallback).
- [FACT: neural-graph.tsx:168-176] the sr-only focusable node-`<button>` list (§XIV a11y + no-WebGL
  fallback) preserved untouched.

## Consumer-facing change summary
A consumer gets: (a) a graph that inherits the active preset's ink voice automatically (no blue SaaS
default), (b) three optional slots to compose richer terminal states, (c) reduced-motion-correct layout —
all with zero breaking changes to the existing call sites (`apps/web/src/app/graph/index.tsx` keeps working).
