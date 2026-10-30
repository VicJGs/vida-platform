---
Session 1 — 2026-10-05
Goal: ② Frontend G6 unit #4 — CODEC Collection shell (fe-codec-collection, LIF-207)
Profile: Add Frontend Component · Scenario: default (Entity Delivery Flow ②)
---

## Accomplished
- **Shipped `fe-codec-collection`** (PR #78 → `752c798`): the CODEC Collection shell — a SHELL (not a renderer)
  composing the 7 shipped view-mode renderers via a `renderView(layout,state)` render-prop + a view-mode switcher +
  title/count/Filter/Sort/`+` chrome + the 8-state. 3 slices (S1 core `c80332a` · S2 chrome `e47042f` · S3 apps/web
  adapter `68232f7`). Full Entity Delivery Flow ②: interpretation · Envision FIRED (greybox, Victor-approved, 8 ECs) ·
  Decomposition Approval 1 · per-slice Visual/Verification gates · 4 independent reviews + /critique all SHIP.
  @vida/ui 398 · @vida/web collection 8 · tsc 0 · eslint 0 · Visual Gate PASS.
- **Un-darkened the CI pipeline** (was fully red / fast-failing since ~2026-10-03; last 3 units merged blind):
  - PR #79 — pnpm double-version (`version:9` + `packageManager`) → drop `version:` (docs-grounded).
  - PR #80 — `@vida/ui` turbo build-race (`tokens:build` rewriting `fonts.ts` under concurrent typecheck/test) →
    package-scoped `packages/ui/turbo.json` typecheck/test `dependsOn ["^build","build"]`.
  - PR #81 — `@vida/server` test `--passWithNoTests` (no test files → vitest exit 1) + `.prettierrc printWidth 100→120`.
  - Result: Typecheck · Lint · E2E · Test green on main (4/6).

## Decisions Made
- **Envision firing is a doc test, not a human decision** (§3.75) — applied to facts (novel switcher) → FIRE. The human
  role is the greybox review, not whether it fires. (Victor drift-catch → memory.)
- **Empty-ownership**: shell owns a collection-level EmptyState except `DESIGNED_EMPTY_LAYOUTS=['calendar']` (delegates to
  the renderer so the grid is kept). The resolved contract point.
- **S3 adapter = type+convention, not a live hook** (ProviderRead precedent — no built consumer; first consumer wires the
  React-Query `useCollection`). The only `@vida/core`↔`@vida/ui` crossing (apps/web plane, BR-2).
- **Switcher condense via a render-time `useTabletUp` matchMedia hook** (not Tamagui `useMedia` — seeds at config-import,
  untestable); browser-correct AND jsdom-testable.
- **CI fixes scoped to their own PRs** (#79/#80/#81), never dumped into the feature PR. Prettier full reformat DEFERRED
  (1275/1276-file churn collides with in-flight parallel work).

## Open Questions
- none blocking. Deferred-by-design: live `useCollection` data hook (first module consumer), condensed-Menu
  `menuitemradio` a11y (UI-1 follow-up), repo-wide prettier reformat (`ci-prettier-reformat`), Workers CF build
  (`ci-workers-build-config`, needs Victor's dashboard).

## Next Session
First step: **G6 unit #5 `fe-codec-dashboard`** (dep patterns✅, lowest-# ready). Fresh `/begin`; isolate in a worktree;
add-frontend-component / Entity Delivery Flow ②. Also unblocked now: `fe-codec-entity-facet` #6, `fe-codec-canvas-*`
#7–10, `fe-codec-system` #12.
Context to reload: `docs/specs/foundation/frontend-replan/g6-reshape-runbook.md §2` (unit order/deps), the just-shipped
`fe-codec-collection/delivery/*` + `packages/ui/src/CLAUDE.md` (CollectionView + the 7 renderers), and this session file.
Env: Node 22 via nvm; per-unit worktree → PR → merge; Visual Gate = Brave via `/tmp/vg` harness. Two parallel backend
sessions may still be active (`mod-learning-education`, `mod-notifications`) — don't disturb their worktrees.
