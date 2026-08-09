# Task: ux-2-command-bar-search
# Profile: Generic Session
# Scenario: default
# Spec: docs/specs/foundation/ux-2-command-bar-search/_index.md
# Created: 2026-08-09
# Status: done
# Cluster: M1 — Whole Manual OS
# Linear: LIF-91
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Order: #22 (reconstructed-structure.md global build order)
# Source: docs/roadmap.md → Phase 1.0 ⑤ UX

## Goal
Design the command bar + global search interaction: the `command_bar_history`-backed launcher and
the search-as-you-type UX over FTS5. The keyboard-first way to jump anywhere in the app — defined
as an interaction model here, implemented as shell components (UI-4) later.

## Dependencies
- Blocked by: `ux-1-information-architecture` (✅ done, LIF-90)
- Blocks: none (leaf, `reconstructed-structure.md:79`)

## Context
Profile: Generic Session (single-path → scenario `default`, document-first build)
Home: `apps/web/src`
Files involved: `apps/web/src` (command-bar interaction model + search-as-you-type UX layer over the
UX-1 nav model). Sibling to UX-1 (information architecture) — same `foundation` spec bucket.
Integration seams (all UNBUILT — design against, do NOT code against — see baseline §2):
- UX-1 nav model — `apps/web/src/nav/module-map.ts` + `docs/core/architecture/information-architecture.md` (✅ exists)
- `command_bar_history` — Preferences domain (MOD-prefs #32, M1.1) — v2 schema NOT built (v1/dist only)
- FTS5 search substrate — DB-8 (#60, M1.4) — NOT built (`services/search` has backlink-resolver only)
- Shell host — UI-4 — NOT built (this defines the model UI-4 renders)

## Open Questions
- [UNKNOWN → PLAN] Does UX-2 emit a code artifact in `apps/web/src` (like UX-1's `module-map.ts` — a command/
  action registry) or is it a pure `docs/core/architecture/` doc? Both are FULL-class. (baseline §3)
- [UNKNOWN → PLAN] Scope line: does UX-2 design search ranking/preview UX (needs an eventual FTS5 shape) or
  only the launcher command model + a guarded search seam? (baseline §4)

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| Head selection | UX-2 (`#22`) | `#`-order rule over `--next`'s UX-3 (dependent-count) | 2026-08-09 |
| Gate class | FULL §XXVI | design-spec issue, same class as UX-1 (baseline §3) | 2026-08-09 |

## Progress
<!-- SESSION checklist — the scenario's ## Task List (what the native panel mirrors). Session-level. -->
- [x] Step 0 — document-context BASELINE (`docs/specs/foundation/ux-2-command-bar-search/baseline.md`) — ground truth gathered; 3 seams (command_bar_history/Preferences · FTS5/DB-8 · UI-4 shell) all unbuilt → design-spec class, FULL gate
- [x] Forward spec written + Per-Step Build Gate cleared (§XXVI) — PLAN Rev 2 (Approval 1) + IMPL-PLAN (preflight PASSED + gate-2 SHIP, Approval 2)
- [x] Goal stated in one sentence before starting
- [x] Mode chosen: BUILD (document-first)
- [x] Work complete — 9 code files (6 src + store + 5 tests) + design doc + layer doc; typecheck 0, lint 0-err, 44/44 tests; engineering gate PASS
- [ ] /session-end run at close — decisions and outcomes logged
- [x] Currency Rule (§XXIX) — durable home `docs/core/architecture/command-bar-and-search.md` written + README indexed (no docs/modules ctx)

## Build Steps
<!-- UNIT-level — mirrors the active spec's §5 Implementation Prompt (IMPL-PLAN §4). -->
- [x] types.ts — Command/Provider/SearchResult/SearchStatus(7)/CommandHistoryEntry(v1 shape)/resolveKeybind
- [x] nav-commands.ts (+test) — deriveNavCommands from module-map → 21 (dedupe by route; visibleWhen carried)
- [x] frecency.ts (+test) — pure pinned-first recency-weighted rank (now injected)
- [x] search-provider.ts (+test) — stubSearchProvider → search-unavailable (DB-8 seam)
- [x] registry.ts (+test) — createCommandRegistry + navProvider + shellActionsProvider (Toggle sidebar only)
- [x] stores/command-bar-ui-store.ts (+test) — ephemeral open/query/mode (auto mode switch)
- [x] CLAUDE.md layer doc + docs/core/architecture/command-bar-and-search.md + README row

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-08-09 | Step 0 — task stub→in-progress; spec stub + baseline authored (3 seams all unbuilt → FULL design-spec class) | Step 1 goal → Step 2 PLAN |
| 2026-08-09 | Full §XXVI gate: PLAN Rev 2 (critique REVISE→fixed, Approval 1) → IMPL-PLAN (preflight PASSED + gate-2 SHIP, Approval 2) → implemented 9 files + docs; typecheck 0/lint 0/44 tests; engineering gate PASS | /session-end + commit/PR (awaiting Victor's go) |

## Notes
- Head selected by the `#`-order rule (`reconstructed-structure.md:79`, `#22`, ← UX-1 ✅). `tracker_sync --next`
  said UX-3 (#23) by dependent-count → overridden by the `#` order ([[doc-order-authoritative-over-next-heuristic]]).
- ⚠ tracker `--sync` reverted an earlier full rewrite of this file once (regenerates from map state); re-apply
  enrichment AFTER any `--sync`, or sync last.
