# fe-codec-canvas-graph — Slice Map

> Entity Delivery Flow ② · Step 2 (Decomposition Gate) · **Ratify-mode** (doc-fixed).
> Why ratify: the split is fixed by the governing docs — [FACT: g6-edge-ledger.md:51] "extend → editorial
> ink voice", [FACT: g6-reshape-runbook.md:38] "ext UI-2", and the 3 findings are enumerated in the task
> ([FACT: .claude/tasks/fe-codec-canvas-graph.md ⚑]) with the explicit directive "do them together here,
> not split." Nothing to DECIDE — only to ratify the shape.

## Shape: a single @vida/ui renderer-extension slice (+ one RATIFY on apps/web)

| Slice  | Plane               | What                                                                     | Deliverable                                                                                                                            |
| ------ | ------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **S1** | frontend (@vida/ui) | EXTEND `NeuralGraph` to the editorial ink voice + 3 conformance findings | `packages/ui/src/components/neural-graph.tsx` + `.stories.tsx` + `.test.tsx`; the CLAUDE.md digest + `v7-neural-graph.md` durable spec |
| **R1** | frontend (apps/web) | **RATIFY — no net code**                                                 | `apps/web/src/app/graph/index.tsx` unchanged                                                                                           |

### S1 — the whole load-bearing unit (the 3 findings, together)

Per the task directive they ship as ONE slice (they interlock — ink colors, slots, reduced-motion all live
in one renderer and are gated together by one Visual Gate):

1. **Ink voice** — replace the hard-coded `DEFAULT_NODE_COLOR`/`DEFAULT_EDGE_COLOR`
   ([FACT: neural-graph.tsx:47-48]) with theme-resolved defaults via `useTheme().get('web')`
   ([FACT: CLAUDE.md pomodoro P1 pattern]); per-preset, light/dark; token-pure (no new palette).
2. **Consumer slots** — add optional `empty?`/`error?`/`loading?` `ReactNode` slots that override the
   default `Message` ([FACT: neural-graph.tsx:154-156]); absent → current behaviour (back-compat).
3. **Reduced-motion** — gate `forceAtlas2.assign` iterations ([FACT: neural-graph.tsx:139]) with the shipped
   `useReducedMotion` hook: reduced → settle-instant (minimal/zero iterations); normal → current.

### R1 — apps/web RATIFY (no net code)

[FACT: apps/web/src/app/graph/index.tsx:1-10] the route already renders `<NeuralGraph state="empty"/>` and
[FACT: same:4] "No graph-data source in M1.0 (AR-8 graph-prep is a seam)". A live graph-data adapter has no
M1 consumer → deferred to first consumer (the sibling-unit precedent: collection/dashboard/entity/flow all
deferred their live hooks — [FACT: TASKS.md:26,17,entity/flow logs]). The route degrades-to-empty correctly
and inherits the ink voice automatically once S1 ships. **No slice; stated, not silently omitted.**

## Non-goals (homed OUT — not this unit)

- AR-8 graph-prep / module-interconnection data — a backend seam, unbuilt in M1 ([FACT: graph route:4]).
- The Feature Atlas `/features` page, Skill Graph, Contributions graph, Relationships graph — those are the
  per-feature P6 surfaces that COMPOSE this archetype ([FACT: decomposition.md:69,93,97,102]); not here.
- A new immersive "canvas shell" file — the scope is EXTEND-in-place ([FACT: g6-reshape-runbook.md:38 "ext
  UI-2"]); immersive/full-bleed is the consumer's layout via the existing `height` prop.
- 10K-node webworker performance ([FACT: CLAUDE.md neural-graph "10K → §6 webworker"]) — a documented
  future ceiling, not this unit.

## Dependency graph

S1 depends on fe-codec-theme ✅ (the `useTheme().get('web')` seam + presets) + fe-codec-patterns ✅
(`useReducedMotion`, `EmptyState`). Both Done. R1 depends on S1 only (inherits, no code). No intra-unit
back-edges. Single slice → no ordering concern.

## Envision coverage

Envision Gate SKIPPED (§3.75 = no novel affordance; Victor-confirmed) → no structural ECs to map. The
aesthetic is carried as the per-slice Visual Gate MUST on S1 (full matrix: 3 presets × light/dark).
