# Task: fe-codec-canvas-graph
# Status: done (PR #112 merged → main 1fa181a, 2026-10-09)
# Linear: LIF-205
# Profile: Add Frontend Component
# Scenario: default
# Spec: docs/specs/foundation/fe-codec-canvas-graph/_index.md
# Created: 2026-10-06 (stub) · started 2026-10-08
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: frontend-replan G0–G6 (reconstructed-structure.md + g6-reshape-runbook.md §2) — supersedes the P6 fe-* grain
# Reshape: G6 net-new · unit #8 · EXTEND ui-2 neural-graph

## Goal
② Frontend — unit #8. CODEC · Canvas: Graph — Sigma in the editorial ink voice. Build the graph
canvas surface AND resolve the 3 ink-voice/conformance findings below (done together, not split) as
Entity Delivery Flow ②: EXTEND the shipped `@vida/ui` NeuralGraph primitive + an `apps/web` adapter.

## Dependencies
- blocked by `fe-codec-theme`
- blocked by `fe-codec-patterns`

## ⚑ Redesign need — flagged from fe-codec-primitives-refinement audit (2026-10-05, LIF-230)
The `fe-codec-primitives-refinement` pass audited the 6 pre-CODEC views and found **Neural Graph is the one hard
conformance gap** — deferred here by Victor's call (this is its proper home). Concrete findings to resolve when #8 builds:
1. **2 hard-coded WebGL colors** (`neural-graph.tsx:47-48` — `DEFAULT_NODE_COLOR='#6366f1'`, `DEFAULT_EDGE_COLOR='#cbd5e1'`)
   are NOT preset/mode-aware (NG-7 put them outside Tamagui theming). The quality-bar WRONG lens = "a non-themeable
   hard-coded palette." The editorial ink voice must drive node/edge colors from theme tokens (per-preset, light/dark).
   NB: the frame already themes (`$colorSurfacePrimary` flips); only the Sigma canvas content is unthemed.
2. **No `empty?`/`error?` consumer slots** — unlike every other data-view, NeuralGraph hardcodes its `Message` copy, so a
   consumer can't compose the teaching-invitation `EmptyState` (P5). Add the slots to match the spine contract.
3. **Reduced-motion** — the forceAtlas2 layout animation always runs; decide the `prefers-reduced-motion` behaviour
   (settle-instant vs reduced iterations) per quality-bar §2.7.
This is BOTH the conformance fix AND the aesthetic "ink voice" — do them together here, not split.

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| Spec bucket | foundation | all 9 sibling fe-codec-* units live at docs/specs/foundation/ | 2026-10-08 |
| Branch | fe-codec-canvas-graph off main @ 08ff2ef | fresh per-unit branch (git workflow) | 2026-10-08 |

## Open Questions
- [ ] Envision Gate §3.75 trigger test — FIRE or SKIP for a WebGL graph canvas? (resolve at Step 1.5)

## Progress
<!-- SESSION checklist — the scenario's ## Task List. Session-level. -->
- [x] document-context BASELINE — current-* of contexts touched (ground truth for the gates) ✅ 2026-10-08
- [x] Interpretation layer written — delivery/interpretation.md (deps · needs · organization · implicit rules) ✅ 2026-10-08
- [x] Envision Gate — SKIP (§3.75 test = no novel affordance; Victor-confirmed 2026-10-08) ✅
- [x] Decomposition Gate cleared — slice-map.md + seam-contract.md approved (Ratify; gate-1 critic SHIP 0 blockers; Approval 1 Victor 2026-10-08) ✅
- [x] Forward spec written + Per-Step Build Gate cleared (§XXVI — preflight PASSED, gate-2 critic REVISE→fixed, Approval 2 Victor 2026-10-08) ✅
- [x] Read 3 existing components — pattern stated (pomodoro/timeline useTheme().get('web') · board/calendar slot `{slot ?? Message}`) ✅
- [x] /contract approved (written into spec §3; Approval 2) ✅
- [x] Implement (types → ink colors → slots → reduced-motion → stories → tests) ✅
- [x] tsc 0 · code-review SHIP (3 cosmetic NITs, N1 folded) ✅
- [x] Per-slice Visual Gate PASS (Brave · full matrix · a11y · axe 0) ✅
- [x] /critique SHIP (pre-ship acceptance verified; gate-1 SHIP + gate-2 REVISE→fixed + code-review SHIP) ✅
- [x] Currency Rule (§XXIX) — CLAUDE.md + v7-neural-graph.md refreshed, committed with code ✅

## Build Steps
<!-- UNIT-level — mirrors spec §5 Implementation Prompt (Approval 2, 2026-10-08). -->
- [x] 1. neural-graph.tsx: add `useTheme` + `useReducedMotion` imports ✅
- [x] 2. ink colors (BR-7/9): token refs via `.get('web')` + **probe-getComputedStyle resolver** (§XXVIII deviation — var ref unusable by WebGL); delete DEFAULT_*_COLOR; NO color in deps ✅
- [x] 3. slots (BR-11): `loading?`/`error?`/`empty?: ReactNode`; `{slot ?? <Message>…}` ✅
- [x] 4. reduced-motion (BR-12): `useReducedMotion()` gates `iterations = reduced ? 0 : layoutIterations`; `reduced` in deps ✅
- [x] 5. stories: themed Playground · PerItemColors · Loading · Error · Empty · EmptyWithSlot ✅
- [x] 6. tests: A3 (slots) · A4 (per-item color override) · A7 (reduced-motion iters); A5 already covered ✅ (473/473)
- [x] 7. R1: apps/web graph route unchanged + apps/web typecheck clean ✅
- [x] 8. Visual Gate PASS ✅ (Brave, 3 presets × light/dark: node ink concrete+distinct blue/oxblood/olive · canvas mounts · 12-node a11y list · empty/loading/error AA 5.76–6.53 · slot · axe 0 · 375 no overflow)
- [x] 9. §XXIX currency: CLAUDE.md + v7-neural-graph.md (NG-7/NG-8) updated ✅

## Route History
| Date | Event |
|------|-------|
| 2026-10-09 | §XXVIII deviation (BR-9): `.get('web')` → CSS-var ref unusable by WebGL; added probe-`<span>` getComputedStyle resolver for concrete preset-aware colour. ISOLATED; live test caught. Spec BR-9/§5 updated. |

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-10-08 | initialized task (augmented existing stub) + cut branch off main @ 08ff2ef | Step 0 document-context BASELINE |
| 2026-10-09 | WHOLE UNIT shipped: full Entity Delivery Flow ② (baseline→interpretation→Envision SKIP→decomposition→gate-1 SHIP→Approval 1→contract→preflight→gate-2 REVISE→fixed→Approval 2→implement S1→code-review SHIP→Visual Gate PASS→§XXIX). PR #112 merged → main 1fa181a. LIF-205 → Done | next FE head: canvas-reader #9 / canvas-board #10 / fe-shell #14 |

## Notes
Next ready FE head by `#` order (#8). Deps: patterns✅ theme✅ viewmodes✅. Env: Node 24 via nvm;
Visual Gate = Brave via /tmp/vg/*-gate.mjs + http.server 6099 on storybook-static.
Rebuild @vida/ui dist before an apps/web typecheck consuming new @vida/ui exports.
