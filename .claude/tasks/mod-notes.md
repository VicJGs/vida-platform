# Task: mod-notes
# Profile: Add Frontend Component
# Scenario: default
# Spec: docs/specs/features/mod-notes/_index.md
# Created: 2026-08-21
# Status: in-progress
# Cluster: M1 — Whole Manual OS
# Linear: LIF-131
# Project: M1 — Whole Manual OS
# Milestone: M1.1 — Hub & Foundation Modules
# Source: reconstructed-structure.md (Phase V, LIF-110; ADR-016 model)

## Goal
Build the `@vida/core` Notes & Pages service (MOD-notes increment ①) — a typed page/link/tag/attachment API over the DB-4-authored `pages`/`page_links`/`entity_links`/`note_attachments` schema: page CRUD (all 6 types) with journal-date conflict (`JournalExistsError`), `page_links`/`entity_links` UNIQUE idempotence, `resolveWikiLink` + create-on-miss, client-deterministic entity-note auto-seed, today-only `/summary` 5-section aggregation, open `entity_type` registry validation, and `entity_tags` reads (AR-6 owns writes). Notes & Pages is the in-degree-14 HUB — the connective layer 12+ modules pull.

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
<!-- INCREMENT ② (add-frontend-component). ① DONE+MERGED. ② decomposed into 5 sub-units; ⚠ the profile's
     SUBSTANCE (rendered surface · all visual states · dark · responsive · /component-audit · real-browser Visual
     Gate) lives in the VISUAL units ②b–②e — NOT in ②a. ② is NOT finalized until those + the Visual Gate land. -->

**② status: IN PROGRESS — only ②a (non-visual prerequisite) is done. The add-frontend-component deliverable (visual surface + Visual Gate) is NOT built.**

### ②a — the app data plane (NON-VISUAL prerequisite) — ✅ DONE + GATED
- [x] Step 0 baseline · Step 1 patterns · Step 2 contract (Gate-1) · Step 2b preflight+Gate-2 (Approval 2)
- [x] Implement (worker seam · DP-8 mutex · device-id · service accessor · RQ hooks) — @vida/web 196 tests · tsc 0 · ESLint 0 · build ✓
- [x] Engineering gates: post-impl /critique SHIP · tsc 0 · §XXIX current-* refreshed
- [n/a] visual states · dark · responsive · motion · /component-audit · **Visual Gate** — ②a renders nothing; these are ②b's, NOT satisfied here

### ②b–②e — the VISUAL surface (the actual add-frontend-component deliverable) — ⬜ NOT STARTED
- [ ] ②b — replace the AR-4 `/notes` stub: route + List/Gallery/Calendar/Neural views wired to `usePages`
- [ ] ②b — ALL visual states (default/hover/focus/active/disabled/loading/error/empty) · dark mode · responsive 375/768/1440 · motion
- [ ] ②c — TipTap editor mount + `[[` picker (create-on-miss)
- [ ] ②d — backlink/entity-link panels + page metadata (favorite/archive/icon/cover)
- [ ] ②e — FTS5 search UI (over the DB-8 seam)
- [ ] **`/component-audit` + `/critique` SHIP + quality-gate-components/-engineering/verification + REAL-BROWSER VISUAL GATE** (the gate I wrongly marked done against non-visual ②a)
- [ ] Step 9 Currency Rule (§XXIX) refresh for the visual contexts + commit
- [ ] Only when ②b–②e + Visual Gate land does LIF-131 close

## Build Steps
<!-- UNIT-level — mirrors the active spec's §5 Implementation Prompt; what victor:execute-plan-* works.
     Filled when the unit's spec §5 is approved. Distinct from ## Progress (connected-build-loop, R1). -->

### ② UI · unit ②a — the app data plane (spec: `sessions/PLAN-2026-08-21-02a-data-plane.md`) — DONE
- [x] Gate: gate-1 REVISE (B1 concurrency · B2 positional) → preflight PASSED (2 assumptions→FACT) → gate-2 **RETHINK** (per-RPC queue interleaves txns) → refolded to whole-transaction mutex → Approval 2
- [x] `db/worker.ts` `values` op (positional) · `db/client.ts` `driver.values` RPC (seam closed; exec/batch still deferred)
- [x] `db/drizzle.ts` `getDb()` + **DP-8 non-reentrant transaction mutex** (Proxy over `.transaction`; reads bypass)
- [x] `db/device-id.ts` + `db/boot.ts` — `getOrCreateDeviceId`/`getDeviceId` (app_state KV, uuidv7, never-synced)
- [x] `services/notes-service.ts` `getNotesService()` (mirrors ① wiring) · `app/notes/hooks.ts` (reads+state, mutations+invalidation matrix)
- [x] e2e: `values` backdoor (`harness.ts`/`fixtures.ts`) + `notes-data-plane.spec.ts` (documented persistence spec — app_state probe + reload; CI-only, macOS-12 host)
- [x] Rebuilt stale `@vida/core` dist (predated ① services/notes). Drift Victor caught: §4 e2e over-specified vs `e2e/CLAUDE.md` → corrected to the documented pattern (no service-in-harness)
- [x] Verify: typecheck 0 · @vida/web **193 tests** (+13) · ESLint 0 · build ✓ · §XXIX current-* refreshed

### ① Backend service — DONE + MERGED
- [x] S1 — EXTENDED `validators/note.ts`: `createPageSchema`/`updatePageSchema` (journal_date-iff-journal refine), reused `PageTypeSchema`
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
| 2026-08-21 | **Increment ① DONE** — baseline (5-aspect + schema) → PLAN (spec §2–§6) → gate-1 REVISE→fixed → Approval 1 → preflight PASSED → gate-2 REVISE→fixed (Row-return BLOCKER) → Approval 2 → implemented S1–S6 → post-impl critique REVISE→fixed (this-on-destructure + type≡validator BLOCKERs). 16 tests green, tsc 0, ESLint 0. current-* born. | increment ② UI (add-frontend-component): notes route + TipTap mount + List/Calendar/Gallery/Neural views + `[[` picker + backlink panels. Consider committing ① first. |

## Notes
- **Scenario vocabulary mapping** (honest, not a deviation): the add-backend-component/default scenario is HTTP-route-shaped; MOD-notes ① is a local-first `@vida/core` service with NO HTTP endpoint (ZK blob-relay server). So `/api-contract` → the service contract; `curl` tests → Vitest; HTTP status codes → typed error classes (`JournalExistsError`, `UnregisteredEntityTypeError`, …).

### ⚠ Step-0 BASELINE FINDINGS — increment ② (frontend surface, ground truth on disk)
Scope per `m1.1-delivery-plan.md` §4:54 + §9:192-197 (② UI): TipTap editor mount + standard/12 platform blocks;
List/Calendar/Gallery/Neural views (renderers **hard-coded** — ADR-007 saved-view *selection* deferred); `[[` picker +
create-on-miss; backlink/entity-link panels; page metadata (favorite/archive/icon/cover); FTS5 search UI over the DB-8 seam.

1. **The ① service is UNCHANGED since merge → `notes-and-pages` current-* are CURRENT** (no §XXIX refresh owed).
   Surface ② consumes: `createNotesService(db, deviceId, {spaces, backlinks, registry})` → Rows; `createPage`/
   `resolveWikiLink`/`ensureEntityNote`/`getBacklinks`/`getPagesByType`/`listPages`/facades. `[FACT: docs/features/notes-and-pages/current-spec.md]`
2. **The web notes route is a bare AR-4 placeholder** — `apps/web/src/app/notes/index.tsx` = `<h2>Notes</h2>` (6 lines);
   `[id].tsx` is empty. `routes.tsx` already lazy-mounts `/notes` (code-based TanStack Router). ② REPLACES the stub.
   No `docs/modules/…/notes` current-* exists yet → D6 births them at scaffold. `[FACT: apps/web/src/app/notes/, routes.tsx]`
3. **@vida/editor is NOT yet consumed by apps/web** (0 imports) — ② is the FIRST app consumer of the TipTap editor. `[FACT: grep @vida/editor apps/web/src]`
4. **UI-2 views: only `NeuralGraph` is wired** (in `/graph`). List/Calendar/Gallery are unconsumed → ② is their first app consumer. `[FACT: grep @vida/ui view imports]`
5. **⚠ DATA-PLANE SEAM (the real first problem, not the editor).** The app-facing DrizzleDb path
   `exec`/`values`/`batch` currently **THROWS** a documented seam error (`client.ts:44,154-162`); the AR-4 header +
   `db/CLAUDE.md` home it to "module entity-CRUD (UI-3 / M1.1+)" — i.e. **MOD-notes ② is the wave that closes it**
   (worker-side `exec/values/batch` ops + the client proxy). Until closed, `createRepository` (which NotesService's 4
   repos use) cannot read/write `pages` in the browser. `[FACT: apps/web/src/db/client.ts, apps/web/src/db/CLAUDE.md]`
6. **✅ RESOLVED (was UNKNOWN) — vault gating is NOT a blocker.** `repository.ts:249-253`: the vault key is fetched
   **lazily, ONLY when `encryptedFields.size > 0`** — `key() = encryptedFieldSet.size > 0 ? getVaultKey() : null`.
   NotesService constructs all 4 repos with **`encryptedFields: []`** (M1.0 pass-through, current-spec) → `getVaultKey()`
   is **never called** → no vault-unlock handshake required for ② at M1.0. The `db/CLAUDE.md` "vault-gated" note is the
   general/M3 case, inapplicable to empty-`[E]`. `[FACT: packages/core/src/db/repository.ts:249-253, 121-146]`
7. **Data-plane wiring pattern to follow:** `useSchemaVersion.ts` (React-Query hook → `@vida/core` read → `getDbClient().driver`,
   no HTTP, BR-RT-3) is the model the per-module entity hooks (`usePages`, …) copy. `App.tsx` gates render on `ensureDbReady()`
   then `QueryClientProvider ⊃ RouterProvider`. `[FACT: apps/web/src/hooks/useSchemaVersion.ts, App.tsx, lib/query-client.ts]`

⇒ **Plan implication:** ② is NOT one component. It decomposes into at least: (a) **data-plane** — close the DrizzleDb
worker seam + resolve vault-gating + construct `NotesService` + React-Query hooks; (b) **route + list/collection views**;
(c) **editor mount** (first @vida/editor app consumer) + `[[` picker; (d) **backlink/entity-link panels + page metadata**;
(e) **FTS5 search UI** (over the DB-8 seam). Each is its own §XXVI-gated sub-unit. Item (a) + (6) are the scoping risks to
settle in Gate-1/preflight — the editor is downstream of a working data plane.

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
