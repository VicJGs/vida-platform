---
Session 1 — 2026-10-04
Goal: ② Frontend CODEC #3 (fe-codec-viewmodes, LIF-214) — the table + board view-mode renderers (complete the canonical VIEW_LAYOUT 7)
Profile: Add Frontend Component · Scenario: default (Entity Delivery Flow ②)
Branch: worktree-fe-codec-viewmodes (worktree .claude/worktrees/fe-codec-viewmodes) · Node 22 via nvm
---

## Accomplished
- **Profile/task switch** at session open: `/begin` resolved the computed backend head (mod-learning-education, S7 —
  active in its own worktree), Victor redirected to the FRONTEND track. Isolated into a fresh git worktree
  `.claude/worktrees/fe-codec-viewmodes` (parallel backend worktree untouched throughout).
- **Front matter — Decomposition Gate Approval 1** (`8cf9fc2`): interpretation + slice-map + seam-contract.
  S1 TableView + S2 BoardView, both **READ-ONLY LENSES**; Envision SKIP (doc-grounded).
- **S1 — TableView COMPLETE** (`72f451e`), full Entity Delivery Flow ② track:
  - `packages/ui/src/components/table-view.tsx` — the `table` VIEW_LAYOUT renderer (6th canonical view-mode).
    Read-only `role="table"`, caller `columns: Column<T>[]` × generic `items<T>`, follows the **calendar-view
    divergence** (spine pieces, NOT `resolveDataViewState` — designed empty row w/ `aria-colspan`), `aria-sort`
    DISPLAY-only, 375 horizontal-scroll wrapper, 4 terminal states, density = cell padding. **No write/sort/row-click
    props** (read-only; interactivity composes in `column.render`, LV-5).
  - Gates: `v8-table-view.md` contract approved · tsc 0 · @vida/ui **371/371** · 2 code-reviews (findings refuted or
    by-design, **0 changes**) · **Visual Gate PASS** (Brave: AA **4.94–6.53** incl. warm-dark · axe **0** · 375 scroll ·
    `aria-colspan` serializes) · Victor visual approval.
  - §XXIX currency: `packages/ui/src/CLAUDE.md` + `_index.md` **G6 supersession** (reverses the 2026-08-09
    "table/board = not built" stance) + annotated the stale memory [[capability-framework-resolves-enum-vs-renderer-gaps]].

## Decisions Made
- **Read-only-lens scope (the load-bearing correction).** Per ADR-007 §4.3 (View = read-only lens) vs ADR-008
  (Capability = interactive, writes via INT-2): the view-mode renderers RENDER; they do not filter/group/sort/write.
  **Board drag-to-move is a Capability (OVERFLOWING, homed to the ADR-008 tier) — NOT deferred, NOT in-renderer.**
- **Scope = 2 net-new renderers** (table, board) completing the canonical 7; the goal line's "7 shipped" conflated
  ui-2's 7 COMPONENTS (incl. pomodoro/export-dialog) with the 7 VIEW-MODES (5 shipped). Confirmed g6-edge-ledger:46.
- **table follows calendar-view** (grid divergence, skips `resolveDataViewState`); **board follows list-view per column**.
- **Envision Gate SKIP** — read-only lenses reuse shipped patterns (calendar grid / list-per-column); no novel affordance.
- **aria-colspan kept** on the designed empty cell — the Visual Gate proved it serializes + stays axe-clean (refuting the
  code-review's "possibly non-functional" concern).

## Open Questions
- **Within-column manual reorder** (flagged in interpretation §6, not decided): MAY be a View **sort** change
  (view-config, not an entity write) rather than a Capability; cross-column move is unambiguously a write → Capability.
  Both renderers ship read-only regardless; revisit only if a board-sort affordance is ever wanted (Collection shell).
- NO PR yet — the unit's PR lands when BOTH slices are done (the fe-codec-patterns precedent: all slices in the worktree
  → one PR). S2 pending.

## Next Session
First step: **S2 — BoardView** (the 7th/final canonical view-mode). Same read-only-lens track, starting with the
`v9-board-view.md` contract (g1 gate). Grouped columns over **provider-pre-grouped** data, each column reusing
`resolveDataViewState` (a column IS a list), cards via `renderCard` (LV-5), board-level loading/error/empty; **no
drag/write** (Capability tier). Then tsc → tests → code-review → **blocking Visual Gate** → §XXIX currency → commit →
**then PR the unit** (both slices).
Context to reload: `docs/specs/foundation/fe-codec-viewmodes/delivery/{interpretation,slice-map,seam-contract}.md` (S2
row + BoardViewProps) · `packages/ui/src/components/{list-view,table-view}.tsx` + `internal/data-view.tsx` (the spine) ·
`packages/ui/src/CLAUDE.md`. Env: Node 22 via nvm; `pnpm install` + dist already built in the worktree; Visual Gate =
Brave via `/tmp/vg/gate.mjs` pattern (storybook-static on :6099). Parallel `mod-learning-education` backend worktree may
still be active — `git worktree list`, don't disturb it.
