# Task: mod-notes
# Profile: Add Frontend Component
# Scenario: default   (Entity Delivery Flow — base flow, §3; envision-first, ground-zero rebuild)
# Spec: docs/specs/features/mod-notes/_index.md
# Created: 2026-08-21
# Status: in-progress
# Cluster: M1 — Whole Manual OS
# Linear: LIF-131
# Project: M1 — Whole Manual OS
# Milestone: M1.1 — Hub & Foundation Modules
# Source: reconstructed-structure.md (Phase V, LIF-110; ADR-016 model)

## Goal
**Rebuild the Notes & Pages entity from GROUND ZERO via the Entity Delivery Flow (base flow, §3) — envision-first.**
(2026-08-23 reset, branch `mod-notes-rebuild` off main @ `d478341`.) KEPT: the DB-4 schema + Row types, the 5 aspect
docs (intent authority), the DB-9 enum validators (`validators/note.ts`). REMOVED + to-rebuild-fresh: the ① `@vida/core`
service and the ② UI. The rebuild runs the shared **Entity Front Matter** (Intake → Baseline → ░Documentation Gate░ →
Interpretation → ░Interpretation Gate░ → ░Envision Gate░ → ░Decomposition Gate░) ONCE across both planes, then forks
into **TRACK A · backend** (Entity Service Build Flow, per-slice ░Verification Gate░) and **TRACK B · frontend** (Entity
UI/UX Build Flow, per-slice ░Visual Gate░). **Base flow, NOT the recovery variant** (§10) — ground zero means nothing
built to reconcile; do not derive from the removed ①/② (the `current-*` docs are residue of the built-then-removed ①).
The entity answers "how does a user link two notes?" — the Envision Gate's first live run. Notes & Pages is the
in-degree-14 HUB — the connective layer 12+ modules pull.

## Dependencies
- blocked by `ar-6-spaces` ✅
- blocked by `db-6-repository-layer` ✅
- blocked by `db-9-enums-zod` ✅

## Context
Profile: Add Backend Component (default scenario)
Increment: ① Backend service only. ② UI is a separate downstream unit (add-frontend-component).
Files involved:
- `packages/core/src/services/notes/*` — NEW (currently only a CLAUDE.md directory-home stub, ADR-018 Part 2)
- consumes `packages/core/src/db/schema/notes.ts` (DB-6/DB-4 pages/page_links/entity_links/note_attachments) via the encrypting repository
- consumes AR-6 `foundation/spaces` for `entity_tags` READS (writes owned by AR-6)
- consumes AR-8 `search/backlink-resolver.ts` (already built — do NOT rebuild)
- `@vida/types` page/link/tag/attachment types + Zod validators
- React-Query wiring seam (repository → hooks)
Integration points: `/summary` provider seam → MOD-journals (consumer, later); `entity_type` open registry (SP2); DB-8 FTS5 (later).

## Open Questions
- [to be filled as they arise — see spec §6]

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| *(logged automatically by /session-log)* | | | |

## Progress
<!-- SESSION checklist — the Entity Delivery Flow (base flow, §3). Front matter ONCE, then two tracks. -->
### Entity Front Matter (once · spans both planes)
- [x] Step 0 · INTAKE — gather + tag ALL sources for the whole entity → `delivery/intake.md` (3 parallel Explore sweeps · A–G tagged groups · exhaustive mention index · residue quarantined · 5 open items)
- [x] Step 1 · BASELINE — `delivery/baseline.md` (3-plane consolidated map: data/service/UI · NP-1…9 · terminal states · seam map · As-is↔INTENT rail · 5 coherence findings for the gate) [read all 5 aspect docs + shipped schema]
- [x] Step 1.25 · ░DOCUMENTATION GATE░ — independent adversarial critic RAN (blocking). REVISE→resolved: B1 (tag-reads mis-homed as consume → net-new ①; AR-6 ships no tag-read) · C5/M1 (EntityLink.entity_type closed union vs OPEN registry → ① validates against runtime registry) · M2 (satellite columns added) · C6/M3 (NP-9 no-FK cascade = service-driven). C1 verified accurate; ownership/residue/No-Guessing clean first pass.
- [x] Step 1.5 · INTERPRETATION — `delivery/interpretation.md`: DEPENDENCIES (schema/repo/vault/types/seams/modules, cited) · NEEDS N1–N7 (N1 = libsodium boot dep, grounded vault.ts:22-31 + repository.ts:340,432) · ORGANIZATION (owns/consumes/delegates/provides/never) · 10 IMPLICIT RULES (IR-1 service-cascade · IR-2 registry-not-schema-validate · IR-3 pass-through≠crypto-free · IR-4 resolveWikiLink-doesn't-create · IR-5 pure seed · IR-6 verbatim-findWhere · IR-7 Yjs-content · IR-8 text-not-json · IR-9 immutable-journal-identity · IR-10 has_pomodoro-flag-only)
- [x] Step 1.75 · ░INTERPRETATION GATE░ — independent critic RAN (blocking). RETHINK→resolved: **N8/IR-13 cross-table cascade NON-ATOMIC** (no `*InTx` on AR-6 — the flagship miss, verified repository.ts:326/405/469) · IR-11 link-create=revive-or-noop · IR-12 sync_queue (table,row,op) coalescing · N9 getVaultKey-locked path · F1 SpacesService sig `(db,deviceId,registry)` · N3 tighten (no registry guard on pages insert) · line-cites. N1/ORG/No-Guessing clean. All 6 findings verified against code before applying.
- [x] Step 1.875 · ░ENVISION GATE░ — ✅ APPROVED (Victor, 2026-08-23); throwaway greybox DELETED (§4.75), screenshot record kept. — greybox BUILT + browser-verified (throwaway `apps/web/envision.html`; real @vida/ui; 0 console errors; **19-shot flow deck** `envision-shots/deck/`; URL-addressable). Victor reviewed → **12 vision points captured + routed** in `delivery/envision.md`: **11 pinned MOD-notes-② ECs** (EC-1…9 structural incl. `[[`-vs-entity-link split, real-editor mount, collapsible rail, create-with-tags, favorites filter; EC-10/11 feel) + **configurable-view system ROUTED to ADR-007/MOD-spaces ②** (pts 1-8 = `views` primitive, doc-fixed §9) + **3 NEW-INTENT homed** to the Spaces Views design-pass (pagination · nest-by-type · manual-order[needs order col → DB-11]). Routing critique-verified **FAITHFUL** (not overthinking; favorites/4-views/`[[`/backlinks correctly kept IN ②). **Greybox REV 2 built + re-delivered** (`envision-shots/r2/`, 14 shots) rendering all 12 points: ADR-007 view system (List/Table/Board-Kanban/Gallery/Calendar-timeframes/Neural-grouping + filter/sort/per-page/nest/Configure-view labeled MOD-spaces) · split `[[` vs `/entity-link` · real-editor feel · collapsible rail · create-with-tags · empty create-CTA. ⏳ AWAITING Victor's final sign-off (blocking).
- [x] Step 2 · ░DECOMPOSITION GATE░ (Ratify) — `delivery/slice-map.md` (**TRACK A** ① A1-A8 backend · **TRACK B** ② B1-B7 frontend; all 9 structural ECs → ≥1 slice plane-aware; N8 cascade = gated A8 w/ g1 decision; ADR-007 view-system + 3 new-intent routed to MOD-spaces) + `delivery/seam-contract.md` (the ①→② API surface, Rows/typed-errors/IR-constraints). Independent critic → **SHIP** (1 MATERIAL fixed: getBacklinks = ①-merge not AR-8 delegate). Ratify faithful · nothing smuggled · acyclic order.
### Fork → two tracks
- [ ] TRACK A · BACKEND — `service/` spec set → ░Doc Gate░ → per slice PLAN ░g1░ → IMPL ░g2░ → BUILD → ░Verification Gate░ → §XXIX
- [ ] TRACK B · FRONTEND — `ui-ux/` spec set → ░Doc Gate░ → per slice PLAN ░g1░ → IMPL ░g2░ → BUILD → ░Visual Gate░ → §XXIX
- [ ] ENTITY CLOSE — both tracks green · every slice's gate PASS · `/session-end` · `/task-complete`

## Build Steps
<!-- UNIT-level — mirrors the active spec's §5 Implementation Prompt; what victor:execute-plan-* works.
     Filled when the unit's spec §5 is approved. Distinct from ## Progress (connected-build-loop, R1). -->
<!-- ⚠ DISCARDED 2026-08-23 — these S1–S6 built the ① service that the ground-zero reset REMOVED (commit d478341).
     Retained only as the historical record; the base-flow rebuild re-derives its own slice-map at Decomposition (Step 2).
     Do NOT resume from these. -->
- [x] ~~S1 — EXTENDED `validators/note.ts`~~ (discarded — ① removed): `createPageSchema`/`updatePageSchema` (journal_date-iff-journal refine), reused `PageTypeSchema`
- [x] S2 — `services/notes/types.ts`: `NotesService` interface (Drizzle-Row returns) + input types + `JournalExistsError`/`UnregisteredEntityTypeError`
- [x] S3 — `services/notes/service.ts`: `createNotesService` factory, 4 repos, all methods (pages CRUD/NP-2/NP-6 · page-links idempotent NP-5 · resolveWikiLink · ensureEntityNote NP-8 · attachments · tag reads · facade→AR-6/AR-8)
- [x] S4 — `services/notes/index.ts` barrel + `export * from './services/notes'` in `@vida/core` index.ts
- [x] S5 — `__tests__/notes-service.test.ts`: 14 cases, all green (fixed 1 test-harness bug: `createEntityLink` → `async` so registry throw is a rejection)
- [x] S6 — created `docs/features/notes-and-pages/current-spec.md` + `current-business-rules.md` (D6, §XXIX)
- [x] Gate — tsc 0 · Vitest 16/16 (full suite 802/803, the 1 red = pre-existing vault-1MB perf flake, passes standalone) · ESLint 0 · post-impl critique REVISE→SHIP (2 BLOCKERs: this-on-destructure + UpdatePageInput type≡validator, both fixed+tested)

## Plan
<!-- Only for a SPEC-LESS small task (§XXVI LITE): victor:planning writes its plan here instead of a spec. -->

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-08-21 | promoted planned stub → in-progress; scaffolded spec stub | run the loop: Step 0b baseline (`document-context notes-and-pages`) → plan (`/documentation-component`) → critique → preflight |
| 2026-08-21 | **Increment ① DONE** — baseline (5-aspect + schema) → PLAN (spec §2–§6) → gate-1 REVISE→fixed → Approval 1 → preflight PASSED → gate-2 REVISE→fixed (Row-return BLOCKER) → Approval 2 → implemented S1–S6 → post-impl critique REVISE→fixed (this-on-destructure + type≡validator BLOCKERs). 16 tests green, tsc 0, ESLint 0. current-* born. | *(superseded — ① removed at ground-zero reset)* |
| 2026-08-23 | **Ground-zero rebuild STARTED (Entity Delivery Flow, base flow).** Realigned task header (profile→Add Frontend Component; goal→base-flow rebuild; old ① Build Steps marked discarded). **Step 0 · INTAKE done** → `delivery/intake.md`: 3 parallel Explore sweeps, A–G tagged source groups, exhaustive mention index, `current-*` + old ① spec quarantined as RESIDUE, 3 agent-claim corrections. **§5 corrected** (Victor: no open decisions) → doc-traced issue/increment **ownership ledger** from `m1.1-delivery-plan §9`+§2+§5 (every capability bound to ①/②/deferred-homed; "link two notes" = ①`resolveWikiLink`+`page_links`+facade ⊕ ②`[[`picker+panels+Neural; Decompose mode=Ratify). | **Step 1 · BASELINE done** → next: ░Documentation Gate░ (Step 1.25) — `/critique`+`/preflight` on aspect corpus + baseline (blocking). |
| 2026-08-23 | **Step 1 · BASELINE done** → `delivery/baseline.md`: 3-plane consolidated map + NP-1…9 × plane + terminal states + seam map + As-is↔INTENT rail + coherence findings. Read all 5 aspect docs + `notes.ts`. **Step 1.25 · ░DOCUMENTATION GATE░ RAN** (independent critic) → REVISE→resolved: B1 tag-reads = net-new not consume (verified: SpacesService ships zero tag-read methods) · C5 EntityLink closed-union vs OPEN registry (① validates against runtime registry) · M2 satellite columns · C6 NP-9 no-FK cascade service-driven. C1 gate-verified accurate; ownership/residue/No-Guessing clean. | **Step 1.5 · INTERPRETATION done** → `delivery/interpretation.md` (deps · NEEDS N1-N7 · org · IR-1…IR-10). N1 libsodium-boot-dep grounded (vault.ts:22-31; every write hashes via crypto_generichash even at empty-[E]). C5→IR-2, C6→IR-1. | **Step 1.75 · ░INTERPRETATION GATE░ RAN** (independent critic) → RETHINK→resolved. Flagship catch: **N8/IR-13 — page-delete cascade across 4 tables is NON-ATOMIC**, unfixable via AR-6 seam (no `*InTx`); a Decomposition line-item (accept best-effort cleanup vs schedule AR-6 `*InTx`). + IR-11 revive-or-noop · IR-12 sync-queue coalescing · N9 locked-vault path · F1 sig · N3 tighten. All verified vs code. | **Step 1.875 · ░ENVISION GATE░ ✅ APPROVED** (Victor 2026-08-23). Greybox REV 1 (19 shots) → Victor's 12 vision points → REV 2 (14 shots) rendering them all → approved. Routing critique-verified FAITHFUL. 11 pinned MOD-notes-② ECs + view-system routed to ADR-007/MOD-spaces + 3 new-intent homed to the Views design-pass. Throwaway code deleted; screenshots kept. | **Step 2 · ░DECOMPOSITION GATE░ ✅ SHIP** (Ratify). `delivery/slice-map.md` (A1-A8 backend · B1-B7 frontend · EC coverage · N8 gated A8 · Spaces/new-intent cross-refs) + `delivery/seam-contract.md`. Independent critic SHIP, 1 MATERIAL fixed. **ENTITY FRONT MATTER COMPLETE** (Intake→Baseline→DocGate→Interp→InterpGate→Envision→Decomp all ✓). | **FORK → TRACK A · BACKEND (①)** — begin slice **A1** (pages CRUD + service factory) under its own §XXVI double-gate → ░Verification Gate░. Awaiting Victor's go to start building. |

## Notes
- **Scenario vocabulary mapping** (honest, not a deviation): the add-backend-component/default scenario is HTTP-route-shaped; MOD-notes ① is a local-first `@vida/core` service with NO HTTP endpoint (ZK blob-relay server). So `/api-contract` → the service contract; `curl` tests → Vitest; HTTP status codes → typed error classes (`JournalExistsError`, `UnregisteredEntityTypeError`, …).

### ⚠ Step-0b BASELINE FINDINGS (ground truth on disk vs delivery-plan §9)
1. **`entity_links` + `entity_tags` are NOT notes-owned tables** — they live in the AR-6 Spaces substrate (`schema/foundation/spaces.ts`), not `notes.ts`. `notes.ts` owns 3 tables only: `pages` · `page_links` · `note_attachments`. (Reconciles structure-data.md:31's "N&P-described" = conceptual/write-owner vs physical file home; not a contradiction.)
2. **The entity_link WRITE path is ALREADY BUILT** — AR-6 `SpacesService.createLink/removeLink` (`foundation/spaces/service.ts:158-192`): idempotent (findWhere business key → live no-op / soft-deleted revive / absent create), registry-validated (`UnknownEntityType`). MOD-notes ① **delegates, does NOT rebuild.** So §9's "entity_links create" is an EXISTING capability (per [[issue-title-lists-capabilities-not-builds]]).
3. **The entity_link READ path is ALREADY BUILT** — AR-8 `BacklinkResolver.getBacklinksTo/getLinksFrom/resolveLink` (`services/search/backlink-resolver.ts`, read-only). MOD-notes ① consumes it for `getBacklinks`.
4. **`entity_tags` WRITES = AR-6** (`tagEntity/untagEntity`); notes only READS. Confirmed.
5. ⇒ **Genuinely NET-NEW in MOD-notes ①** (nothing built yet): `pages` CRUD (6 types, `JournalExistsError`) · `page_links` create/read (page↔page — backlink-resolver.ts:12 confirms page_links is DEFERRED to M1.1) · `resolveWikiLink` (title search over pages + create-on-miss stub `note`) · entity-note auto-seed (NP-8, client-deterministic) · today `/summary` 5-section aggregation · `note_attachments` CRUD. Plus the FACADE that composes AR-6 (links/tags writes) + AR-8 (backlink reads).
6. **Backlink resolver real path** = `packages/core/src/services/search/backlink-resolver.ts` (§9 said `search/backlink-resolver.ts` — the `services/` prefix was dropped).

### Service pattern (Step 1 — 3 services read: spaces, search/backlink-resolver, + the repo config)
- Factory `createNotesService(db, deviceId, deps…): NotesService` returning an object literal implementing an `interface`; **not** a class.
- Per table: `createRepository(db, <table>, { deviceId, encryptedFields: [], softDelete: true })` — **M1.0 empty-[E] pass-through** (BR-13); soft-delete → `delete()` sets `deleted_at` + enqueues `operation:'update'`.
- `findWhere` runs the predicate **verbatim** (does NOT auto-apply notDeleted) → every read appends `isNull(deleted_at)`; drizzle `and()` is `SQL|undefined` → `!` suffix (mirrors AR-6).
- Idempotent junction writes: findWhere business UNIQUE key → live row no-op · soft-deleted revive · absent create (BR-14/15).
- Typed errors in a `types.ts`; string-literal enums + Zod in `@vida/types` (never TS `enum`).
- Data-flow: **validate → repository → encrypt-seam → return** (`docs/core/architecture/data-flow.md`).
- **§9 deferred-and-homed (do NOT pull in):** field-level `[E]` encryption → M3/DB-5 (M1.0 is pass-through); wider `/summary` personalizable menu → M1.4 (G5); ADR-007 saved-view selection → deferred design-pass (renderers hard-coded); neural-graph data-prep → AR-8 future / Views design-pass; FTS5 engine → DB-8.
- Model B: DB-4 authored the schema in M1.0; this increment CONSUMES it, authors no tables.
