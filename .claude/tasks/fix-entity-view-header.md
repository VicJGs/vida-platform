# Task: fix-entity-view-header
# Status: done
# Linear: LIF-233
# Profile: Change Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: flow-session Envision review (2026-10-07) — Victor flagged the shipped EntityView header as a left-behind design defect
# Branch: fix-entity-view-header (worktree off origin/main @ 39ccdab — NOT local main, which is 32 behind)

## Goal
Fix the shipped `EntityView` (#6, LIF-209) header: the metadata **subtitle is crammed against the serif `$display`
title** (no vertical rhythm), and it follows the generic-tell pattern (a middle-dot meta-string "Project · 3 milestones ·
updated 2h ago"). Establish the **canonical shell-header typographic pattern** and apply it.

## Root cause (grounded — confirmed in code 2026-10-07)
- `packages/ui/src/components/entity-view.tsx:72` — `TitleGroup = styled(View, { flexShrink: 1 })` sets **no `gap`**
  between the `$display` title (`:148`) and the `$small` subtitle (`:151-155`) → they render flush, the subtitle jammed
  under the display title's descenders. Violates `design.md §IV` (proximity / 4pt rhythm) + §I (hierarchy / breathing room).
  NB: the parent `Header` (`:70`) DOES carry `gap:'$8'` (title-row → mode-toolbar); the cram is purely inside `TitleGroup`.
- The subtitle is a `ReactNode` slot (`EntityViewProps.subtitle`, `:37`); the component already wraps it `$small`/muted
  (`:151-155`). There is **no live consumer** — `apps/web/src/entity/adapter.ts` passes `subtitle` straight through and the
  `useEntity` hook is deferred to the first entity-page. So "pin the subtitle pattern" = a documented CONVENTION, not a
  callsite fix.

## Fix (scope — decision pending Victor)
- Add vertical rhythm to the header: `TitleGroup` gap (`$4` eyebrow→title region) + a `$12` title→metadata gap
  (the flow-session greybox pattern, Envision-approved 2026-10-07).
- Decide/pin the subtitle pattern: a single quiet `$small` muted line, NOT a dot-pile; progress/metadata that is a
  quantity → a `HonestProgress` bar, not text (the flow-session resolution).
- No interface change beyond what the pattern needs; re-run the EntityView Visual Gate (3 presets × light/dark + 375).

## Dependencies
- (none — EntityView #6 is shipped; this is a §XXVI-gated fix on the shipped component)

## Consumers (caller map — Step 1 complete)
- `packages/ui/src/index.ts:71` — barrel export (`EntityView`, `EntityViewProps`, `FacetMode`, `Facet`)
- `packages/ui/src/components/entity-view.stories.tsx` — the Visual-Gate surface (passes a `subtitle`)
- `packages/ui/src/components/entity-view.test.tsx` — jsdom tests (no subtitle in most cases)
- `apps/web/src/entity/adapter.ts` — `toEntityProps` passes `subtitle` through (no live render consumer yet)

## Build Steps
- [ ] Step 0 — document-context BASELINE (done: entity-view.tsx + packages/ui/src/CLAUDE.md read)
- [ ] Scope decision (eyebrow? minimal gap?) → Victor
- [ ] Forward spec + §XXVI Per-Step Build Gate
- [ ] Implement the gap (+ eyebrow if chosen) — match sibling patterns
- [ ] tsc --noEmit → 0 ; /component-audit ; /critique → SHIP
- [ ] Visual Gate (3 presets × light/dark + 375) ; gate chain (components → engineering → verification)
- [ ] §XXIX currency (packages/ui/src/CLAUDE.md entity-view paragraph) ; --sync to assign a LIF

## Notes
- This is the DOC-canonical shell-header pattern. Verified at review: EntityView is the ONLY archetype shell with a
  stacked title+subtitle, so the cram is unique to it — `collection-view` is a horizontal title+count row (no subtitle),
  `dashboard-view` is title-only. No sibling sweep needed; the shared convention is the quiet-line subtitle (no dot-pile).
- Unfiled in Linear — assign a LIF on `--sync` at pickup.

## Outcome (2026-10-07)
- `TitleGroup` → `gap:'$16'` (title-hero rhythm, EC-5/review-2); story dot-pile → one quiet line; CLAUDE.md currency.
- Gates: tsc 0 · @vida/ui tests green (2 ISOLATED load-timeout flakes in untouched collection-view, pass in isolation) ·
  **Visual Gate PASS** (Brave, 3 presets × L/D: title→sub 16px · subtitle AA 5.65–6.03 · title serif AA 15.84 · axe 0 ·
  375 no overflow) · independent review SHIP (2 nits folded: sibling-cram claim corrected, cross-branch ref qualified).
- No API change. Forward spec: `docs/specs/fixes/entity-view-header/_index.md`.
