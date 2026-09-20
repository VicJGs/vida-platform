# Task: mod-notes-and-pages
# Profile: Add Backend Component
# Scenario: Default (Entity Delivery Flow v1)
# Spec: docs/specs/features/mod-notes-and-pages/_index.md
# Created: 2026-08-21
# Status: in-progress
# Linear: LIF-131
# Project: M1 — Whole Manual OS
# Milestone: M1.1.1 — Hub & Foundation · Backend
# Source: reconstructed-structure.md (Phase V, LIF-110; ADR-016 model)
# Note: reshaped from mod-notes (LIF-131); prior ①/② torn down (eaf64f8); re-planned under P3 decomposition. Build STARTED 2026-09-19.

## Goal
Build the `@vida/core` Notes & Pages service (MOD-notes increment ①) — a typed page/link/tag/attachment API over the DB-4-authored `pages`/`page_links`/`entity_links`/`note_attachments` schema: page CRUD (all 6 types) with journal-date conflict (`JournalExistsError`), `page_links`/`entity_links` UNIQUE idempotence, `resolveWikiLink` + create-on-miss, client-deterministic entity-note auto-seed, today-only `/summary` 5-section aggregation, open `entity_type` registry validation, and `entity_tags` reads (AR-6 owns writes). Notes & Pages is the in-degree-14 HUB — the connective layer 12+ modules pull.

## Dependencies
- blocked by `mod-journals` ✅ done
- blocked by `xs-spaces-tags-links` ✅ done
- blocked by `xs-templates` ✅ done
- blocked by `xs-views` ✅ done
(all blockers cleared — tracker confirms mod-notes-and-pages is the ready next head, 2026-09-19)

## Context
Profile: Add Backend Component · Scenario: Default (Entity Delivery Flow v1 — 2nd run, still v1-pending).
Branch: `mod-notes-and-pages` (off clean `main`). Env: Node 24 via nvm + corepack pnpm. Per-issue branch → PR.

BASELINE FACTS (verified 2026-09-19, live `main` @ branch-point):
- ❌ `packages/core/src/services/notes/` ABSENT — the service is a clean slate (this is what ① builds).
- ✅ `packages/core/src/db/schema/notes.ts` + migration `033_notes.ts` PRESENT (rebuilt holistically post-teardown; renumbered 012→033 at the chain tail). FINISHED foundation — do NOT rebuild.
- ✅ `@vida/types/note.ts` + `packages/core/src/validators/note.ts` PRESENT.
- Prior mod-notes impl (`f31b807`, marked "implemented") TORN DOWN by `eaf64f8` (backend-replan pivot). Old spec `docs/specs/features/mod-notes/_index.md` = SHAPE REFERENCE ONLY, not authority (discontinued impl ≠ correctness model).
- ⚠ `validators/note.ts` survived the teardown that claims to have removed it → reconcile in the interpretation layer.

Integration points: DB-4 Notes & Pages schema (foundation) · Repository layer (db-6) · Spaces (AR-6, owns tag/entity-link writes) · backlink-resolver (AR-8) · FTS5 search · sync_queue.

## Open Questions
- [interpretation] Exact ① service surface vs seams — which link/tag/attachment/search ops build now vs first-consumer-pull (ADR-019 §3.5). Resolve in the Decomposition Gate.
- [interpretation] Reconcile the `validators/note.ts` survival vs the `eaf64f8` teardown claim.

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| ① scope | service tier over existing schema | schema/types/validators already live (033_notes.ts); service absent | 2026-09-19 |
| old mod-notes impl status | shape-reference only | torn down by eaf64f8; discontinued impl ≠ authority | 2026-09-19 |

## Progress
<!-- SESSION checklist — the scenario's ## Task List (what the native panel mirrors). Session-level. -->
- [x] document-context BASELINE — Notes & Pages substrate mapped (Explore agent, [FACT] citations); current-* births at S1/D6
- [x] Interpretation layer written — delivery/interpretation.md (dependencies · needs · organization · implicit rules)
- [x] Decomposition Gate — delivery/slice-map.md + seam-contract.md; gate-1 /critique REVISE→fixed→SHIP; **Approval 1 ✅ (2026-09-19)**
- [x] **S1 BUILT** — services/notes/{types,service,index}.ts + live-store tests (14); §XXVI double-gate (Approval 1 · preflight PASSED G-S1-1 · Approval 2) + post-impl SHIP; typecheck 0 · @vida/core 979 green · eslint 0; §XXIX current-* born
- [ ] Forward spec written + Per-Step Build Gate cleared (§XXVI) before any implementation
- [ ] Read 3 existing services — state the pattern found
- [ ] /api-contract approved before any code
- [ ] /adr-check validates approach against existing decisions
- [ ] /adr-new recorded (if significant architectural choice)
- [ ] TypeScript types and interfaces written first
- [ ] Service / DB logic implemented (per-slice)
- [ ] Full typed-error handling implemented
- [ ] tsc --noEmit passes — zero errors
- [ ] Per-slice Verification Gate PASS (functional tests + live-store smoke) before the next slice
- [ ] /critique → SHIP verdict
- [ ] Currency Rule (§XXIX) — CURRENT- docs refreshed for every context touched

## Build Steps
<!-- UNIT-level — mirrors IMPLEMENTATION-PLAN-s1-pages-core.md (gate-2). S1 slice. -->
### S1 — Service shell + Pages core ✅ DONE (2026-09-19)
- [x] B1 — services/notes/types.ts (deps, NotesService iface, input types, 2 error classes)
- [x] B2 — service.ts shell (createNotesService, pageRepo, factory-object)
- [x] B3 — assertRegistered helper (registry.isRegistered → UnregisteredEntityTypeError)
- [x] B4 — createPage (validate · NP-2 clash → JournalExistsError · assertRegistered · notNull-default backfill for faithful return)
- [x] B5 — reads (getPage · getPageByJournalDate · getPagesByType · getPagesForEntity · listPages; all isNull(deleted_at) via allOf helper — no bare `!`, §XV)
- [x] B6 — mutations (updatePage strict · softDeletePage)
- [x] B7 — services/notes/index.ts barrel
- [x] B8 — root barrel: packages/core/src/index.ts export * from './services/notes' (G-S1-1)
- [x] B9 — tests (14 live-store: clash · soft-delete reuse · unregistered · strict-reject · findWhere filter · word_count · destructure)
- [x] B10 — gates: typecheck 0 · @vida/core 979 green (+14) · eslint 0 · Verification Gate PASS · post-impl /critique SHIP · §XXIX current-* born
- NOTE (grounded refinement, not divergence): B4 backfills notNull-default columns (create() returns input-derived row, not a re-read — repository.ts:331-346); convention = sessions/service.ts:305. Impl-plan + BR-S1-8 updated.

### S2–S4 — pending (next: S2 entity notes + attachments)

## Plan
<!-- Only for a SPEC-LESS small task (§XXVI LITE). N/A — this is a full-gate code build. -->

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-08-21 | reshaped from mod-notes under P3 decomposition (planning only) | — |
| 2026-09-19 | build STARTED: branch `mod-notes-and-pages` off main; verified live BASELINE (service absent, schema/types/validators present); confirmed all 4 blockers done | run BASELINE (document-context) → interpretation → Decomposition Gate |

## Notes
- 2nd run of Entity Delivery Flow v1 (mod-journals was 1st) — flag any friction for v1 hardening.
- The old `docs/specs/features/mod-notes/_index.md` is a torn-down "implemented" spec; the PLAN step (§XXVI.1b) writes the real forward spec in split form (sessions/PLAN-…), superseding it.
