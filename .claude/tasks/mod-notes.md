# Task: mod-notes
# Profile: Add Frontend Component
# Scenario: entity-rescope
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

**② status: IN PROGRESS — ②a (data plane) + ②b (collection surface) + ②c (editor + autosave + `[[` picker) built + gated. Remaining: ②d panels · ②e search + the real-browser Visual Gate.**

### ②a — the app data plane (NON-VISUAL prerequisite) — ✅ DONE + GATED
- [x] Step 0 baseline · Step 1 patterns · Step 2 contract (Gate-1) · Step 2b preflight+Gate-2 (Approval 2)
- [x] Implement (worker seam · DP-8 mutex · device-id · service accessor · RQ hooks) — @vida/web 196 tests · tsc 0 · ESLint 0 · build ✓
- [x] Engineering gates: post-impl /critique SHIP · tsc 0 · §XXIX current-* refreshed
- [n/a] visual states · dark · responsive · motion · /component-audit · **Visual Gate** — ②a renders nothing; these are ②b's, NOT satisfied here

### ②b — the `/notes` collection surface (spec `sessions/PLAN-2026-08-21-02b-notes-collection.md`) — ✅ DONE (gated; Visual Gate owed)
- [x] Full §XXVI double-gate: gate-1 REVISE (demonstrability · B1 PageRow · miscites) → preflight PASSED → gate-2 REVISE (B-1 cache-invalidation · R-1 residual Tabs drift) — all folded; Victor drift-catch (docs decide creation/switcher/route, not me)
- [x] Route + multi-mode views (List/Gallery/Neural) · switcher (Zustand) · NoteCard → `note/$id` detail · command-bar "New note" (BR-7 dynamic import) · empty/loading/error/success states · dark-capable (zero hex)
- [x] `@vida/core` `PageRow` barrel export (B1) · `keys.ts` extracted (eager-bundle discipline); impl fixes: `styled(Text,{render:'h1'})`, dynamic-import service, consolidated render tests (flakiness), S5 integration stubs the hook
- [x] typecheck 0 · ESLint 0 · full @vida/web suite green · §XXIX current-* refreshed
- [ ] ⚠ **REAL-BROWSER VISUAL GATE still owed** — runnable locally via the `chrome-devtools` MCP (Brave); jsdom render tests are the fast unit-level proof
- [ ] ⚠ `/component-audit` + quality-gate-components not yet run

### ②c — the note editor + autosave + `[[` picker — ✅ DONE (gated; Visual Gate owed)
- [x] Full §XXVI double-gate: gate-1 (main critique REVISE→folded + picker DELTA critique REVISE→folded) → Approval 1 → IMPLEMENTATION-PLAN → gate-2 preflight+critique (BLOCKED/REVISE→folded, verified vs installed @tiptap/suggestion@3.30.0) → Approval 2. **Victor drift-catch: the ②c/②d split was manufactured — docs fix ②c = editor + picker (current-spec.md:9); title in ②c (§9 metadata excludes it). Rewrote the PLAN.**
- [x] `@vida/editor` (v0.9.0): `wikiLink` MARK + `WikiLink` Suggestion surface (`extensions/wiki-link.ts`) + popup (`wiki-link-menu.tsx`) + gated `wikiLink?` prop + combobox ARIA (`editor.tsx`) + `to-markdown` emit-only `[[label]]` + barrel exports. No `@vida/core` dep (data injected).
- [x] `apps/web`: `note-detail.tsx` rewrite (state switch incl. empty→"not found" EM-9 · editable title `@vida/ui Input` EM-6 · `VidaEditor key={id}` EM-2 · save indicator EM-7 · `[[` config wiring) + `use-note-autosave.ts` (debounce + skip-once echo + flush-on-unmount) + `@vida/editor` added to apps/web deps.
- [x] typecheck 0 (both) · `@vida/editor` 234 tests · `@vida/web` 218 tests · build ✓ (both) · ESLint clean (new files).
- [x] post-impl `/critique` **SHIP** (independent, vs code) — 1 MATERIAL folded (error-surfacing: app onSelect/onCreate toast+re-throw; mark still skipped) + NITs (stripWikiClose · debounce:150 · title Enter-commits · test serializer opts).
- [ ] ⚠ **REAL-BROWSER VISUAL GATE + `/component-audit` still owed** — runnable locally via the `chrome-devtools` MCP (Brave); jsdom render tests are the fast unit-level proof. Best run across ②b+②c together. (②c editor now verified mounting live after the empty-doc fix, 2026-08-22.)

### ②d–②e — remaining visual units — ⬜ NOT STARTED
- [ ] ②d — backlink/entity-link panels + page metadata (favorite/archive/icon/cover); the G6-tentative entity-link `[[` variant re-enters the ②c picker (Candidate shaped forward-compat).
- [ ] ②e — FTS5 search UI (over the DB-8 seam)
- [ ] Only when ②d–②e + the Visual Gate land does LIF-131 close

## Build Steps
<!-- UNIT-level — mirrors the active spec's §5 Implementation Prompt; what victor:execute-plan-* works.
     Filled when the unit's spec §5 is approved. Distinct from ## Progress (connected-build-loop, R1). -->

### ② UI · unit ②a — the app data plane (spec: `sessions/PLAN-2026-08-21-02a-data-plane.md`) — DONE
- [x] Gate: gate-1 REVISE (B1 concurrency · B2 positional) → preflight PASSED (2 assumptions→FACT) → gate-2 **RETHINK** (per-RPC queue interleaves txns) → refolded to whole-transaction mutex → Approval 2
- [x] `db/worker.ts` `values` op (positional) · `db/client.ts` `driver.values` RPC (seam closed; exec/batch still deferred)
- [x] `db/drizzle.ts` `getDb()` + **DP-8 non-reentrant transaction mutex** (Proxy over `.transaction`; reads bypass)
- [x] `db/device-id.ts` + `db/boot.ts` — `getOrCreateDeviceId`/`getDeviceId` (app_state KV, uuidv7, never-synced)
- [x] `services/notes-service.ts` `getNotesService()` (mirrors ① wiring) · `app/notes/hooks.ts` (reads+state, mutations+invalidation matrix)
- [x] e2e: `values` backdoor (`harness.ts`/`fixtures.ts`) + `notes-data-plane.spec.ts` (documented persistence spec — app_state probe + reload; runnable locally via the `chrome-devtools` MCP (Brave))
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
| 2026-08-21 | **②c DONE (editor + autosave + `[[` picker)** — full §XXVI double-gate (gate-1 main+picker-delta critiques REVISE→folded → Approval 1 → IMPLEMENTATION-PLAN → gate-2 preflight+critique BLOCKED/REVISE→folded [verified vs installed @tiptap/suggestion@3.30.0] → Approval 2) + post-impl /critique SHIP (1 MATERIAL folded). **Victor drift-catch: ②c/②d split was manufactured — docs fix ②c = editor+picker (current-spec.md:9); title in ②c (§9). Rewrote the PLAN.** `@vida/editor` v0.9.0 (`wiki-link.ts` mark+Suggestion · popup · prop+ARIA · to-markdown emit · barrel) + `apps/web` (`note-detail.tsx` rewrite · `use-note-autosave.ts` · editor dep). typecheck 0 · editor 234 · web 218 · build ✓ · lint clean. §XXIX current-* + editor CLAUDE.md refreshed. NOT committed. | **②d** — backlink/entity-link panels + page metadata (favorite/archive/icon/cover); the G6 entity `[[` variant re-enters the ②c picker. Then **②e** FTS5 search. ⚠ owed: real-browser Visual Gate + `/component-audit` across ②b+②c (runnable locally via the `chrome-devtools` MCP / Brave). |
| 2026-08-21 | **Profile switch ①→②; ②a + ②b DONE + committed.** ②a data plane (`6b72613`): worker `values` seam · DP-8 whole-transaction mutex · device-id · getNotesService · RQ hooks — g1/g2 double-gate (g2 RETHINK: per-RPC queue interleaves txns) + post-impl SHIP. ②b `/notes` surface (`21f5e3b`): route + multi-mode views + switcher + NoteCard→note/$id + command-bar "New note" (BR-7 dynamic import) + PageRow barrel export — g1/g2 double-gate; 3 Victor drift-catches corrected from docs (creation=command-bar seam · switcher=hasMultiModeTopView · route=note/[id]). typecheck 0 · ESLint 0 · 209 tests serial-green · build ✓. | **②c — mount the TipTap editor** in `app/note-detail.tsx` (replaces the placeholder body) + `[[` picker. Own §XXVI gate. Then run /component-audit + /critique + quality gates + **real-browser Visual Gate** (runnable locally via the `chrome-devtools` MCP / Brave) across ②b+②c. ⚠ owed: ②b Visual Gate. Branch `mod-notes-2a-data-plane` (unpushed). |
| 2026-08-22 | **Session (design, no code): shaped the Entity Delivery Flow methodology.** Enhanced the UI/UX session flow per Victor's draft into a documentation-first, decomposition-gated build methodology — persisted at `docs/specs/foundation/entity-delivery-flow/_index.md`. Key pieces: (1) **Entity Front Matter** (Intake→Baseline→**Interpretation layer**→**Decomposition Gate**) shared across both planes, ABOVE the ①/② fork, so the backend/frontend split + the seam contract are a thoughtful output, not a top-level assumption; (2) **backend track** ("Entity Service Build Flow", 5 lenses + 3 nuances + a per-slice **Verification Gate**) shaped specially, distinct from the **frontend track** ("Entity UI/UX Build Flow", 5 lenses + per-slice **Visual Gate**); (3) the **Interpretation layer** (`delivery/interpretation.md` — dependencies·needs·organization·implicit-rules) to make implicit deps explicit BEFORE build (the vault bug was one such implicit dep); (4) the **recovery variant** ("Entity Re-scope Flow") — an exhaustive audit/reconciliation ledger (✅aligned/❌wrong/📄undocumented/🕳gap/⛔ungated-owed) → a **Re-scope Gate** → corrected slice-map, so nothing is left behind. Overlay on §XXVI/§XXVII/§XXIX/§XXX (not a rewrite). **Codified into the toolkit (v1)** — committed+pushed `~/dev-toolkit` `origin/main` (`406c24c`): reference-doc (`project-foundation/knowledge/reference-docs/entity-delivery-flow.md`) + enhanced add-frontend/backend default scenarios (front-matter phases + per-slice blocking gate) + new `entity-rescope` recovery scenarios (both profiles) + light §XXX ref (STANDARDS 3.2); double-gated (gate-1 REVISE→folded · preflight PASSED · gate-2 SHIP) + `/toolkit-check` PASS. **v1 — pending validation on the Notes recovery-variant run.** | **NEXT SESSION (fresh): run the recovery variant on Notes** (ratify mode — the ①/②a–②e split is doc-fixed, retrofit not re-decide). First artifact = `docs/features/notes-and-pages/delivery/reconciliation.md` (exhaustive sweep) → `baseline.md` + `interpretation.md` → re-scoped `slice-map.md` → then the owed **②b+②c Visual Gate** under the per-slice format → commit ②c + both fixes. Reload `docs/specs/foundation/entity-delivery-flow/_index.md` §7+§10 first. |
| 2026-08-22 | **②c browser-verification triage — 2 blocking bugs found + fixed + verified live in Brave (chrome-devtools MCP).** **(1) vault-not-initialized-on-boot:** ⌘K→"New note" threw `Vault not initialized` (swallowed by `commands.ts` catch); `apps/web` never called `initVault()` at boot, and every repository write computes a keyless `_sync_hash` via `hashContent()` needing libsodium loaded (independent of `[E]` — baseline finding #6 was half-wrong: it ruled out UNLOCK but missed the WASM-load gate). Validated by 3 independent reviewers (docs-grounding + adversarial critique [resolved the main-thread-realm question] + preflight). Fix: `db/boot.ts` `Promise.all([initVault(), open])` + `commands.ts` error-log + `db/boot.test.ts`. **(2) editor-empty-doc-assert-crash:** opening a NEW note crashed — `assertEditorDocument` rejected `{type:'doc'}` (ProseMirror omits empty `content`); every new note has null content→seeds an empty doc. `/victor-triage` (ISOLATED). Fix: normalize missing content→`[]` in `editor.tsx` + tests + dist rebuilt. Both bug-units under `docs/specs/fixes/`. §XXIX: finding #6 corrected · editor+db CLAUDE.md + notes current-business-rules refreshed · macOS-12/CI-only hallucination purged (task + 4 session specs). Follow-up filed: `core-vault-init-on-db-open` (whole-OS hoist). ⚠ jsdom suite needs Node 22 (N/A locally). | **Real-browser Visual Gate + /component-audit across ②b+②c** (now unblocked — create→edit→autosave verified live) → **commit both fixes** → ②d panels. |
| 2026-08-22 | **Session (methodology fix, no product code): corrected 3 gate drifts in the Entity Delivery Flow recovery variant before running it on Notes.** Scenario switched `default`→`entity-rescope`. `/victor-triage` → **STRUCTURAL** (root cause: the recovery was authored by reasoning from the local artifact, not the dependency chain). Three Victor drift-catches, all folded into ONE gated fix: **(A)** the `entity-rescope` scenarios were single-plane projections (each resumed only its own track) → now reconciliation sweeps ①+②, slice-map tagged `{backend|frontend|shared}`, Step-6 dispatch routes each slice to its plane's gate (the vault→`@vida/core` hoist is no longer stranded); **(B)** added the **Documentation Gate** (source corpus + baseline) + **Interpretation Gate** (interpretation output), additive to §XXVI g1 (`process.md:362`); **(C)** ordered `Baseline → ░Doc Gate░ → Interpretation → ░Interp Gate░ → ░Decomposition░`. Standards seam wired as a real Step-0 load action (gate-2 catch: prose won't load — FE profile already loads all 5; BE Reads design/components/motion). Full §XXVI: diagnosis SHIP → Approval 1 → preflight BLOCKED→3 folded → gate-2 REVISE→folded → Approval 2 → 4-file edit → toolkit-check CHECK 1/5/8/9/13/14 PASS. Toolkit fix committed+pushed `~/dev-toolkit` `3ee6f88` (amends v1 `406c24c`→v1.1) + synced. Bug-unit: `docs/specs/fixes/entity-delivery-flow-gate-drifts/`. | **NEXT SESSION (fresh): run the entity re-scope on Notes on the CORRECTED methodology** — `baseline.md` → ░Documentation Gate░ → `interpretation.md` → ░Interpretation Gate░ → **cross-plane** `reconciliation.md` (sweep ①+②, tagged) → tagged `slice-map.md` → resume by tag (owed **②b+②c Visual Gate** + the **vault→core backend slice** under its Verification Gate) → commit ②c + both fixes. Reload `docs/specs/foundation/entity-delivery-flow/_index.md` (corrected §3/§4.5/§7/§10) + the `entity-rescope` scenario. |

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
6. **⚠ PARTIALLY WRONG — two independent vault gates; only the UNLOCK one was ruled out. CORRECTED 2026-08-22.**
   The vault **UNLOCK** path (a password-derived key) IS skipped for empty-`[E]`: `repository.ts:249-253`
   `key() = encryptedFieldSet.size > 0 ? getVaultKey() : null` → NotesService's 4 empty-`[E]` repos never call
   `getVaultKey()`, so no vault-unlock handshake is needed at M1.0. **BUT that does NOT make "vault gating a non-blocker":**
   every repository WRITE also computes `_sync_hash` via `hashContent()` (`repository.ts:340,432`), a **keyless BLAKE2b**
   that calls `assertReady()` → it requires **`initVault()` (libsodium WASM loaded) at boot**, independent of `[E]`.
   The web app never called it → every write threw `Vault not initialized`. Fixed in `db/boot.ts`.
   `[FACT: repository.ts:249-253, 340; encryption/vault.ts:255-258; docs/specs/fixes/vault-not-initialized-on-boot]`
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
