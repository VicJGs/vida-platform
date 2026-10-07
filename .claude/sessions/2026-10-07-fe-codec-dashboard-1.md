---
Session 1 — 2026-10-07
Goal: ② Frontend CODEC unit #5 — the Dashboard archetype shell (fe-codec-dashboard, LIF-208)
Profile: Add Frontend Component · Scenario: default (Entity Delivery Flow ②)
---

## Accomplished
- **fe-codec-dashboard (LIF-208) COMPLETE** — the CODEC Dashboard shell ("a grid of integration blocks"), both slices
  shipped, **PR #104 open**. Worktree + branch `fe-codec-dashboard` off `main @ 8c7fa51`.
- **Front matter** (`94159e5`): interpretation (3-lens audit; blocks are types-only → a render-prop shell; the app-plane
  adapter binds the SHIPPED `block_instances`/capability canon) · Envision gate FIRED + human review PASSED (greybox
  built, reviewed, deleted; EC-1..EC-8 pinned) · decomposition (2 slices + both seams). 2 independent gate-1 critics
  (REVISE→folded).
- **S1 `DashboardView`** (`@vida/ui`, `01e4964`) — RN-safe flex grid of `size`-enum span cells (`maxWidth` cap → a lone
  non-`full` cell never fills, EC-6); `Card` cell frame (title `$subheading` + `⋯` slot); shell-owned generic terminal
  states (skeleton / teaching empty / calm muted `role=status` error) + 3 override hatches; `renderBlock` success-only;
  empty-dashboard teach. 9 jsdom tests. g2 REVISE→folded (`$h3`/`$h4` undefined tokens). /critique SHIP. **Visual Gate
  PASS** (3 presets × light/dark, AA 4.52–5.22, axe 0, EC-1..EC-8).
- **S2 adapter** (`apps/web`, `0ff7709`) — pure `parseBlockConfig`/`toCellDescriptor`/`isStandalone`/`toBlocks` (async
  resolve-via-registry · `standalone` gate · order-preserving · degrade-never-crash) + `DashboardAdapter` convention;
  live `useDashboard` hook deferred. 11 tests. g2 SHIP.
- Verification: `@vida/ui` tsc 0 · **446 tests** (9 new) · apps/web tsc 0 · 11 adapter tests.
- Currency: `dashboard-view.md` · `packages/ui/src/CLAUDE.md` · `apps/web/src/dashboard/CLAUDE.md` · the ui-2 `_index.md`
  change log · the delivery docs (interpretation/envision/slice-map/seam-contract). Close-out (`<docs>`): task file →
  Done + build log; TASKS.md completed entry + next head → #6.

## Decisions Made
- **The Dashboard shell composes blocks via a `renderBlock` render-prop** (blocks are types-only; the 11 `standalone`
  widgets ship elsewhere) — the Collection-shell agnostic-composition precedent. Not a block renderer.
- **Span model = a `size` enum** (`sm|md|lg|full`) → RN-safe flex, with a per-span `maxWidth` CAP so a lone non-`full`
  cell can't grow to full width (EC-6, caught live in the greybox). Not numeric-span / width-weight.
- **The shell owns the generic terminal states** (loading/empty/error) and `renderBlock` is success-only — a block is
  CONTENT, not a self-stated component; extends Collection's shell-owned-empty to all three. Per-block override hatches.
- **Calm muted `role="status"` error** (the `Message` precedent), NOT `$colorSignalDanger` (fails light-mode AA 3.63).
- **Placement edit = a Capability, not the shell** (a `block_instances` write, ADR-008/O1) — homed out, doc-grounded.
- **S2 adapter projects structural `BlockInstanceLike`/`CapabilityDefLike`** (the `SavedViewLike` precedent), refining the
  seam-contract's `schema.BlockInstanceRow`/`def.title` (CapabilityDefinition has no title) — g2 confirmed more-correct.

## Open Questions
- none blocking. CI on PR #104 not yet run (expect Typecheck/Lint/Test/E2E green; Format/Workers pre-existing reds).

## Next Session
First step: watch CI on PR #104 → merge when the 4 substantive checks are green; then start **#6 `fe-codec-entity-facet`**.
Also queued: the one-line **`collection-view.tsx:170` `$h3` sibling-fix** (same latent defect this session's g2 found).
Context to reload: `docs/specs/foundation/fe-codec-dashboard/delivery/*` · `packages/ui/src/CLAUDE.md` (DashboardView +
CollectionView paragraphs) · `docs/specs/foundation/frontend-replan/decomposition.md` §1.2 (the next archetype, Entity).
