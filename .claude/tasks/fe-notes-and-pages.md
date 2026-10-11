# Task: fe-notes-and-pages
# Status: in-progress
# Worktree: .claude/worktrees/fe-notes-and-pages (branch fe-notes-and-pages off main @ 8392e06, Node 24)
# Linear: LIF-191
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.2 — Feature Modules · Frontend
# Source: decomposition-p6.md (P6) + PLAN-p6-frontend-track.md (Approval 2 SHIP) — backend-replan
# Reshape: G6 unit #27 — #27 Notes — Collection+Graph · Note Entity (Editor-led) · /summary.
# Note: labels `frontend` + `P6` applied post-write via Linear API (tracker sets labels out-of-band, as P5.1 did for `backend`).

## Goal
② Frontend build (add-frontend-component) for notes & pages — the UI/UX tier over the finished ① service (`mod-notes-and-pages`), 13 UI legs. Consumer-pull: rides its backend twin's wave 1:1. Per-slice blocking Visual Gate (Entity Delivery Flow ② track, ADR-021 §3.5).

## Dependencies
- blocked by `fe-codec-collection`
- blocked by `fe-codec-canvas-graph`
- blocked by `fe-codec-entity-facet`

## Entity Front Matter (Entity Delivery Flow ②) — delivery/ at docs/specs/foundation/fe-notes-and-pages/delivery/
- **Step 0 BASELINE ✅** — ① `NotesService` complete (S1–S4); 3 codec deps shipped (CollectionView·NeuralGraph·EntityView);
  @vida/editor + canvas-editor shipped; clean-slate FE (no live notes UI). Terrain mapped.
- **Step 1 INTERPRETATION ✅** — `interpretation.md` (DEPENDENCIES·NEEDS·ORGANIZATION·IMPLICIT, all [FACT]); F2 boundary doc-resolved.
- **Step 1.5 ENVISION ✅ LOCKED (Victor, 2026-10-10)** — `envision.md`; §3.75 FIRED; greybox (deleted) → **EC-1…EC-24 approved**.
  Notion standard · Lucide icons · borderless editor · per-entity-type Overviews · merged = continuous Notion page.
- **Step 2 DECOMPOSITION ✅ (gate pending Victor)** — `slice-map.md` (9 FE slices) + `seam-contract.md`. Boundary confirmed:
  fe-notes = notes substrate + note-page frame/slot; rich entity overviews RIDE fe-journals/fe-tasks/fe-projects via the
  S2 Layout-facet slot. 13 legs → 0 unhomed; every structural EC homed (slice or RIDE).

## Build Steps (per-slice §XXVI double-gate + blocking Visual Gate; PR at S9) — all `frontend`
- [x] S1 — Notes Collection + `/notes` route (NOT-48/49; EC-1/2/3/22). **Built**: `collection/use-collection.ts` (first
  CollectionView consumer — view-config + `chromeFor`, composes shipped `toCollectionChrome`; live data-leg drop-in
  deferred) · `notes/use-notes-rows.ts` (data seam — M1 honest-empty default + `?sample` DEV gate; live swap = React
  Query over `listPages`) · `notes/note-renderers.tsx` (List/Gallery/Calendar/Neural; graph→empty AR-8) ·
  `notes/notes-surface.tsx` · `/notes` lazy route. **tsc 0 · eslint 0 · 19/19 tests** · **Visual Gate PASS** (Brave,
  4 layouts × L/D × 375/768/1440: axe 0 · 0 overflow · graph empty terminal · icons · honest empty · console clean).
  Self-/critique SHIP. D2 resolved: data-leg STUB (live blocked by worker-RPC Drizzle `values` seam + no composition root).
- [ ] S2 — Note-page frame (editor-led) + Layout-facet slot (NOT-52; EC-4/5/15/18f/19/23)
- [ ] S3 — Backlinks panel (merged, grouped by source) (NOT-24; EC-6)
- [ ] S4 — `[[` picker + create-on-miss + preview-card (NOT-19/BSE-12; EC-10/11)
- [ ] S5 — `/summary` block + per-section degrade (NOT-32/34; EC-9)
- [ ] S6 — Page metadata + attachments (NOT-47; EC-7/8)
- [ ] S7 — Search UI (search-unavailable) (NOT-50; EC-12)
- [ ] S8 — Templates picker/save (NOT-51; EC-13)
- [ ] S9 — Block add-menu / slash-menu (CAP-12/13; EC-14)

## Parking lot
- **ui-3 editor fix** (EC-24): `@vida/editor` editor-styles.ts — blockquote styling + taskList alignment (DONE in worktree,
  rebuilt). Must land as a SEPARATE `@vida/editor` (ui-3) commit/PR, NOT bundled into fe-notes' PR.

## Log
- 2026-10-10 — front matter: baseline → interpretation → **envision LOCKED (EC-1…24 approved)** → decomposition drafted.
  Worktree `.claude/worktrees/fe-notes-and-pages` off main @ 8392e06, Node 24. Next: Decomposition Gate → S1.
