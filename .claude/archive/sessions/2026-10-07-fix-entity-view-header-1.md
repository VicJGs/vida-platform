---
Session 1 — 2026-10-07
Goal: Fix the shipped EntityView header — the serif $display title crammed against the $small muted subtitle (no vertical rhythm); establish + apply the canonical title-hero header pattern.
Profile: Change Frontend Component / default (Entity Delivery Flow ②)
Task: fix-entity-view-header (unfiled — no Linear, Victor's call)
---

## Accomplished
- **Shipped `fix-entity-view-header` — PR #110 merged to `main`** (`23e9e74`). `EntityView.TitleGroup` gained
  **`gap:'$16'`** → the `$display` title and `$small` muted subtitle no longer render flush.
- Story (`entity-view.stories.tsx`): replaced the middle-dot meta-string subtitle with ONE quiet plain-language line
  ("In the Q3 Launch project"); dropped the `· no page` dot-tack.
- §XXIX currency: `packages/ui/src/CLAUDE.md` entity-view paragraph pins the title-hero convention; added the EntityView
  row to `.claude/docs/components.md` (was uncatalogued from the entity-facet merge).
- Forward spec: `docs/specs/fixes/entity-view-header/_index.md` (§XXVI document-first).
- Gates: tsc 0 · @vida/ui tests green (2 ISOLATED load-timeout flakes in untouched `collection-view.test.tsx`, pass in
  isolation) · **Visual Gate PASS** (Brave, 3 presets × light/dark + 375: title→sub **16px** · subtitle AA 5.65–6.03 ·
  title serif AA 15.84 · axe 0 · no 375 overflow) · independent pre-ship review **SHIP**.
- Housekeeping: FF-pulled local `main` to `origin/main` (was 33 behind); removed the fix worktree + branches.

## Decisions Made
- **Fix scope = minimal (gap only), NO eyebrow, no API change** — doc-resolved by the flow-session **EC-5** title-hero
  greybox, not re-opened. Victor's steer: "follow the same way we handled the flow-session." My initial A/B
  (minimal vs add-eyebrow) question was the wrong frame; EC-5 explicitly drops the eyebrow as a generic tell.
- **Gap value = `$16`** (the review-2 value in `flow-session-view.tsx:97`), NOT the draft `$12` that appears in the
  task-file / envision prose.
- **Subtitle = one quiet `$small` muted line**; a quantity → a `HonestProgress` bar the consumer composes (the `<Text>`
  wrap forbids a block child in subtitle). EntityView is the ONLY archetype shell with a stacked title+subtitle
  (collection = title+count row, dashboard = title-only) → no sibling sweep needed (corrected a false claim at review).
- Worktree isolation off `origin/main` (not stale local main, which lacked `entity-view.tsx`); caught + avoided a
  stale storybook-server collision on :6099 from the parallel flow-session worktree.

## Open Questions
- none blocking. Watch-item resolved: the `Header $8` (subtitle→mode-toolbar) reads fine below the new `$16` internal
  gap (distinct button cluster) — left untouched (minimal scope).
- Pre-existing repo-wide CI reds persist (`ci-prettier-reformat`, `ci-workers-build-config`) — tracked, non-blocking.

## Next Session
First step: Victor's call at `/begin` (based on the docs). Computed `#`-order head = backend **#64 `mod-routines`**
(LIF-138, planned); alternative = continue the frontend G6 track (next CODEC canvas unit).
Context to reload: `docs/specs/foundation/delivery-structure-reconstruction/reconstructed-structure.md` (`#` order) ·
TASKS.md routing rule · the chosen head's task file + its delivery/current-* docs.
