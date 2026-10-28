# Spec: feature:mod-notes (increment ① — backend service)

Status: implemented <!-- draft → approved → implemented -->

<!-- IMPLEMENTED 2026-08-21: packages/core/src/services/notes/{service,types,index}.ts +
     validators/note.ts (extended) + index.ts barrel. 16 tests green; typecheck 0; ESLint 0.
     Full §XXVI gate: gate-1 REVISE→fixed · preflight PASSED · gate-2 REVISE→fixed (Row-return BLOCKER) ·
     post-impl critique REVISE→fixed (this-on-destructure BLOCKER + UpdatePageInput type≡validator). -->

Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-08-21-mod-notes.

<!--
  FORWARD spec — §1–§4 DESCRIPTION, §5 executable PROMPT citing §1–§4. This is the PLAN (Approval-1
  artifact of the §XXVI gate). Governed by the No-Guessing Principle. Increment ② (UI) is a separate unit.
-->

## 1. Identity

The `@vida/core` **Notes & Pages service** (`core/src/services/notes/`) — MOD-notes increment ① (LIF-131, M1.1).
The **module-facing facade** for the platform's connective hub (in-degree 14): typed page/link/attachment CRUD
over the DB-4 `pages`/`page_links`/`note_attachments` tables, **composing** the AR-6 Spaces substrate (entity-link

- tag writes) and the AR-8 backlink resolver (entity-link reads) into one surface. `[FACT: m1.1-delivery-plan.md §3
row MOD-notes, §9; ADR-018 §3.3 substrate↔surface; services/notes/CLAUDE.md:12 "Rides foundation/ substrates; does
not re-implement them"]`

**The pattern (grounded in live code, not the doc's illustrative free-functions).** Factory
`createNotesService(db, deviceId, deps) → NotesService` returning an object implementing an `interface`; per-table
`createRepository(db, <table>, { deviceId, encryptedFields: [], softDelete: true })` — **M1.0 empty-`[E]`
pass-through** (BR-DB6-3); each method follows validate → transform → business-rules → repository → return
(`data-flow.md §5`). `[FACT: foundation/spaces/service.ts; services/search/backlink-resolver.ts; data-flow.md §5.256]`

**What it is NOT.**

- **Not the UI increment.** No TipTap mount, no views, no `[[` picker chrome — those are ② (add-frontend-component). `[FACT: §3 row Home split]`
- **Not schema authoring.** DB-4/M1.0 authored `pages`/`page_links`/`note_attachments`; this consumes them, creates no tables. `[FACT: schema/notes.ts header; Model B]`
- **Not the owner of entity-links/tags.** `entity_links` + `entity_tags` live in the **AR-6 Spaces substrate** (`schema/foundation/spaces.ts`), whose `SpacesService` owns their WRITES and AR-8's `BacklinkResolver` owns entity-link READS — Notes **delegates**, never re-implements. `[FACT: spaces.ts:67; spaces/service.ts:158-192; search/backlink-resolver.ts]`
- **⚠ Not the `/summary` aggregation ENGINE.** The `summary(date)` provider registry + `buildDashboard(date)` are **MOD-journals ①**-owned; the wave order (Notes W1 → Journals W3) forbids Notes consuming them. Notes ① retains only `summary_config` _storage_ (a `pages` column, via `updatePage`). The engine↔block split is **doc-fixed**: `journals/contract.md:6` ("Notes contracts `buildJournalSummary` at the block interface; THIS doc contracts the engine + provider registry behind it") + `journals/identity.md:29` + `notes-and-pages/identity.md:19` ("the aggregation ENGINE behind this block is the Journals context"). ⚠ **Named anomaly:** `delivery-plan §9 MOD-notes:188` literally lists "`/summary` aggregation for today" under "① service NOW" — this **contradicts** the 5 engine-vs-block docs; §9 is an explicit "build-scope ledger, not new decisions" (delivery-plan:181), so its compressed line means the `/summary` **block** (a ② surface calling Journals' engine), NOT a Notes ① aggregator. The block-side interface `buildJournalSummary(date, config)` (`contract.md:20`, a FACT-surface method) is therefore **homed to increment ②** (the block consumes Journals' `buildDashboard`), not dropped. `[FACT: m1.1-delivery-plan.md §5.132-133, §9 MOD-journals:215-220, §9:181,188; journals/contract.md:6; journals/identity.md:29; notes-and-pages/identity.md:19, contract.md:20]`
- **Not field-encryption wiring.** `[E]` marks are the M3/DB-5 target; M1.0 registers an empty `[E]` set (pass-through). `[FACT: schema/notes.ts:27-28; §9 Deferred]`
- **Not FTS5 search, saved-view selection, or neural-graph data-prep** → DB-8 / deferred design-pass / AR-8 future. `[FACT: §9 Deferred — HOMED]`

## 2. Business Rules

> Inherits the CORE constitution (ZK-1/2/3, LF-1/2/3) `[[../../../core/business-rules]]`. Every rule below complies.

- **NP-2 — One journal per date.** `createPage({type:'journal', journal_date})` when a non-deleted journal already exists for that date → throw `JournalExistsError(date)`; never overwrite. Enforced in-service via `getPageByJournalDate` (the SQL partial-UNIQUE is migration-only, not in the Drizzle mirror). `[FACT: business-rules NP-2; ADR-002 L1309; schema/notes.ts:65]`
- **NP-5 — Page-links are unique + idempotent.** `createPageLink(source, target)` on the `UNIQUE(source_page_id, target_page_id)` business key: live row → no-op return; soft-deleted row → revive (`deleted_at=null`); absent → create. Mirrors AR-6's idempotent-`createLink` pattern (avoids the raw SQLite UNIQUE collision on re-link-after-unlink). `[FACT: business-rules NP-5; spaces/service.ts:158-180 createLink precedent]`
- **NP-6 / SP2 — Registered entity_type only.** Any `entity_type` written (a `*_note` page's `entity_type`, or a delegated `createEntityLink`) is validated against the injected `TaggableTypeRegistry`; unregistered → throw `UnregisteredEntityTypeError(entityType)`. (Delegated links reuse AR-6's own `UnknownEntityType` guard.) `[FACT: business-rules NP-6; schema/notes.ts:46 BR-N2; spaces/service.ts:76]`
- **NP-7 — Wiki-links resolve by id.** `resolveWikiLink(text)` returns candidate `pages` by title match; the caller's picker binds a chosen `target_page_id` (never title text) via `createPageLink`. Create-on-miss is an explicit caller compose (`createPage('note', {title})` → `createPageLink`), never silent. `[FACT: business-rules NP-7; conventions.md:8; contract.md:16]`
- **NP-8 — Entity notes auto-exist, never blank, client-deterministic.** `ensureEntityNote(pageType, entityType, entityId, seed)` is idempotent (returns the existing `*_note` page for that entity if present); on create it seeds `content` **deterministically from the passed parent-entity local fields** (title/type/status/dates) — same inputs → same seed string, **no server call, no `Date.now()`/random in the seed** (ZK-1). `[FACT: business-rules NP-8; conventions.md:10]`
- **NP-9 — Soft delete.** `softDeletePage`/`removeAttachment`/`removePageLink` set `deleted_at` via the repository (`softDelete:true` → enqueues `operation:'update'`). Hard-delete cascade is not an M1.0 concern (no FK; cleanup is service-driven, deferred). `[FACT: business-rules NP-9; data-flow.md §soft-delete]`
- **NP-1 (inherited) — Notes are always pages.** The service never writes an inline `notes` column on another table; entity notes are `pages` rows via `entity_type`/`entity_id`. `[FACT: conventions.md:6]`

**Validation & edge cases.** `journal_date` required iff `type='journal'`, else null (Zod refine). `parent_id` self-ref allowed, no FK. `findWhere` predicates append `isNull(deleted_at)` explicitly (the repo runs predicates verbatim). `[FACT: business-rules; backlink-resolver.ts:42-44]`

**Terminal states (per capability).** Enumerated in `business-rules.md:26-34` — reused verbatim: page list/editor/journal-summary/`[[`-picker/backlinks each have loading/empty/error/success. For the SERVICE layer specifically: reads return `[]`/`null` for empty (never throw), writes throw the typed errors above for rule violations, repository failures surface as typed read/write errors (fail-loud, no swallow). `[FACT: business-rules.md:26-40 §terminal-states + §failure]`

**Failure behavior (fail loud).** Every method returns a typed error, never a silent partial; no `catch` swallows a foundation gap. `[FACT: core business-rules §5]`

## 3. Contract

`NotesService` — factory `createNotesService(db: DrizzleDb, deviceId: string, deps: { spaces: SpacesService; backlinks: BacklinkResolver; registry: TaggableTypeRegistry }): NotesService`. `[INTERP: DI mirrors spaces/service.ts:63 signature]`

> **Return-type rule (BLOCKER-grade, gate-2):** every method returns the **Drizzle Row** (`PageRow`/`PageLinkRow`/`NoteAttachmentRow` from `schema/notes.ts:104-109`; `EntityLinkRow`/`EntityTagRow` from `spaces.ts`), NOT the `@vida/types` interfaces. The interfaces diverge structurally — `Page.summary_config` is `JournalSummaryConfig` but `PageRow.summary_config` is `string`; `PageLink`/`NoteAttachment` extend `SyncMetadata` (created_at-only) while the rows carry full `baseColumns`+`updated_at`+`deleted_at` (`schema/notes.ts:19-22` flags this as DB-11's reconcile, not ours). The repository returns `RowOf<T>` (`repository.ts:32,187`); `SpacesService` types every return as the Row (`spaces/service.ts:40`). Rows are the only form that compiles today. `[FACT: repository.ts:32,187; spaces/service.ts:40; schema/notes.ts:19-22,104-109]`

**Pages (net-new — `pages` table):**

- `createPage(input: CreatePageInput): Promise<PageRow>` — errors: `JournalExistsError` (NP-2), `UnregisteredEntityTypeError` (NP-6 on `*_note` entity_type)
- `getPage(id): Promise<PageRow | null>` · `updatePage(id, patch: UpdatePageInput): Promise<PageRow>` · `softDeletePage(id): Promise<void>`
- `getPageByJournalDate(date): Promise<PageRow | null>` · `getPagesByType(type: PageType): Promise<PageRow[]>`
- `getPagesForEntity(entityType, entityId): Promise<PageRow[]>` · `listPages(filter?: { favorite?: boolean; archived?: boolean }): Promise<PageRow[]>`

**Page-links (net-new — `page_links` table):**

- `createPageLink(sourcePageId, targetPageId, context?): Promise<PageLinkRow>` — idempotent (NP-5)
- `removePageLink(sourcePageId, targetPageId): Promise<void>` (resolve-then-soft-delete)
- `getPageLinksFrom(pageId): Promise<PageLinkRow[]>` · `getPageLinksTo(pageId): Promise<PageLinkRow[]>` (page-backlinks, `idx_page_links_target`)

**Wiki-resolve + entity-note seed (net-new):**

- `resolveWikiLink(text): Promise<PageRow[]>` (title candidates; NP-7) · `ensureEntityNote(pageType, entityType, entityId, seed: EntityNoteSeed): Promise<PageRow>` (NP-8)

**Attachments (net-new — `note_attachments` table):**

- `addAttachment(pageId, file: NewAttachment): Promise<NoteAttachmentRow>` · `getAttachments(pageId): Promise<NoteAttachmentRow[]>` · `removeAttachment(id): Promise<void>`

**Facade over AR-6 `SpacesService` (entity-link WRITES — delegate):**

- `createEntityLink(pageId, entityType, entityId, context?): Promise<EntityLinkRow>` → `spaces.createLink` · `removeEntityLink(pageId, entityType, entityId): Promise<void>` → `spaces.removeLink`

**Facade over AR-8 `BacklinkResolver` (entity-link READS — delegate):**

- `getBacklinks(entityType, entityId): Promise<EntityLinkRow[]>` → `backlinks.getBacklinksTo` · `getEntityLinksFrom(pageId): Promise<EntityLinkRow[]>` → `backlinks.getLinksFrom`
- ⚠ **Named divergence (gate-2):** `contract.md:15` defines `getBacklinks` as a **merged** `page_links`+`entity_links` list (G6, marked _tentative_). This PLAN returns **entity-links only**; page↔page backlinks are separately available via `getPageLinksTo`. The G6 merge is tentative/deferred (a UI-composition concern for ②), not built in ①. Decision, not a miss. `[FACT: contract.md:15 "G6, tentative"; business-rules.md:32]`

**`entity_tags` READS (net-new read-repo — AR-6 owns writes; §9:190 ① NOW scope, resolved per [[build-phase-flags-mean-resolve-now-not-defer]]):**

- `getTagsForEntity(entityType, entityId): Promise<EntityTagRow[]>` · `getEntitiesByTag(tagId): Promise<EntityTagRow[]>` (`contract.md:17`) — a **read-only** facade over an `entityTags` repository (empty-`[E]`, `findWhere`+`isNull(deleted_at)`), mirroring the AR-8 `backlink-resolver.ts:36-53` read-repo precedent. AR-6 `SpacesService` exposes no tag-read; Notes adds the read (writes stay AR-6). `[FACT: m1.1-delivery-plan.md:190; contract.md:17; backlink-resolver.ts:36-53; spaces.ts EntityTagRow]`

**Types & errors.** `CreatePageInput`/`UpdatePageInput`/`EntityNoteSeed`/`NewAttachment` + canonical Zod (`createPageSchema`, …) added by **extending the EXISTING `@vida/core/validators/note.ts`** (already exports `PageTypeSchema` etc. — reuse it, do NOT re-declare `z.enum(PAGE_TYPE)`; do NOT overwrite the file); types are zod-free (`@vida/types/CLAUDE.md`). Typed errors (`JournalExistsError`, `UnregisteredEntityTypeError`) in `services/notes/types.ts`, bespoke `extends Error` classes matching the live AR-6/AR-8 precedent. ⚠ **Flagged doc/code drift:** `data-flow.md §5:350` mandates a `ServiceError` (SCREAMING_SNAKE codes), but AR-6/AR-8 shipped bespoke `extends Error`; following the live precedent, flagging the inconsistency for DB-11 reconcile (not silently choosing). `[FACT: validators/note.ts:10; note.ts PAGE_TYPE:13; spaces/types.ts:37; data-flow.md §5:350; types/CLAUDE.md]`

## 4. Acceptance

- [ ] `createNotesService` factory returns the full `NotesService` interface; each table gets an empty-`[E]` soft-delete repository; every method returns the **Drizzle Row** (`PageRow`/`PageLinkRow`/`NoteAttachmentRow`/`EntityLinkRow`/`EntityTagRow`), not the `@vida/types` interface.
- [ ] `entity_tags` reads present (`getTagsForEntity`/`getEntitiesByTag`) as a read-only facade; tag WRITES remain AR-6.
- [ ] Page CRUD works for all 6 `PAGE_TYPE` values; `createPage` journal-conflict throws `JournalExistsError`.
- [ ] `createPageLink` is idempotent (live no-op · soft-deleted revive · absent create); verified by re-link-after-unlink.
- [ ] `resolveWikiLink` returns title candidates; `ensureEntityNote` is idempotent + deterministic (same seed → identical `content`).
- [ ] `createEntityLink`/`getBacklinks` delegate to AR-6/AR-8 (no duplicated link logic in `services/notes`).
- [ ] `UnregisteredEntityTypeError` thrown on unregistered `entity_type` (page + delegated link).
- [ ] `summary(date)` aggregation is ABSENT (owned by MOD-journals ①) — only `summary_config` storage via `updatePage`; `buildJournalSummary` block-interface is homed to ② (not built in ①), not dropped.
- [ ] `validators/note.ts` is EXTENDED, not overwritten (existing `PageTypeSchema` etc. intact).
- [ ] `pnpm --filter @vida/core typecheck` 0 errors · Vitest: success + ≥2 error cases (`JournalExistsError`, idempotent re-link) green · enum-parity intact.
- [ ] `/critique` SHIP · engineering + verification gates PASS · `docs/features/notes-and-pages/current-*` created (D6).

## 5. Implementation Prompt

Cites §1–§4; done-check = §4. Build order (data-flow.md §5 within each method):

1. **Extend** the EXISTING `@vida/core/validators/note.ts` (do NOT overwrite — it exports `PageTypeSchema`/`EntityLinkTargetSchema`/pomodoro schemas): ADD `createPageSchema`/`updatePageSchema` (+ `journal_date`-iff-journal refine, NP-2/validation §2), reusing `PageTypeSchema` (never re-declare `z.enum(PAGE_TYPE)`). Satisfies §3 Types. `[FACT: validators/note.ts:10]`
2. `services/notes/types.ts` — `NotesService` interface (§3) + `CreatePageInput`/`UpdatePageInput`/`EntityNoteSeed`/`NewAttachment` + `JournalExistsError`/`UnregisteredEntityTypeError` (`extends Error`, AR-6 shape). Satisfies §3, NP-2/NP-6.
3. `services/notes/service.ts` — `createNotesService` factory: **4 repositories** (pages/pageLinks/noteAttachments + a read-only `entityTags` repo, all empty-`[E]` soft-delete). Every method returns the **Drizzle Row** (§3 return-type rule). Methods in order: pages CRUD (NP-2 conflict via `getPageByJournalDate`; NP-6 registry check) → page-links idempotent (NP-5, mirror `spaces/service.ts:158-180` incl. the `!` on `and()`) → `resolveWikiLink` (title `findWhere` + `isNull(deleted_at)`) → `ensureEntityNote` (NP-8 idempotent; **determinism scopes the `content` SEED VALUE only — the row's `id`/`created_at`/`updated_at` are repository-generated (`repository.ts:327,333`) and non-deterministic by design; no `Date.now()`/random in the caller's seed string**) → attachments → `getTagsForEntity`/`getEntitiesByTag` read-repo (mirror `backlink-resolver.ts:36-53`) → facade methods delegating to `deps.spaces`/`deps.backlinks`. Satisfies §2 all, §3 all.
4. `services/notes/index.ts` — barrel export; add `export * from './services/notes'` to `@vida/core` `index.ts` (the convention: `index.ts:114,117` do `export * from './foundation/spaces'` / `'./services/search'`). `services/notes/` currently holds only `CLAUDE.md` (a `[L]` refresh target) → `types.ts`/`service.ts`/`index.ts` are clean creates, no collision.
5. `services/notes/__tests__/notes-service.test.ts` — the §4 checkboxes as Vitest cases (in-memory DB, mirror spaces test harness).
6. `/document-context notes-and-pages` — create `current-spec.md` + `current-business-rules.md` from this PLAN (D6, §XXIX).

## 6. Open UNKNOWNs / Decisions Needed

- **[RESOLVED — gate-2] `entity_tags` READS home.** Was flagged open; gate-2 correctly ruled it §9:190 ① NOW scope ([[build-phase-flags-mean-resolve-now-not-defer]]). **Decided:** Notes adds `getTagsForEntity`/`getEntitiesByTag` as a read-only facade over an `entityTags` repo (AR-8 `backlink-resolver.ts` precedent); writes stay AR-6. Now in §3. No open UNKNOWN remains.
- **[FACT, not open] `resolveWikiLink` over `[E]` titles.** M1.0 titles are plaintext (empty-`[E]` pass-through) → a `findWhere` title match works now. At M3 `[E]` activates → title search moves client-side (decrypt+match) / FTS-on-unlock. Documented forward-dep, out of M1.0 scope. `[FACT: schema/notes.ts:27; structure-data.md:23]`
- **[FACT, not open] React-Query hooks → ②.** `delivery-plan:53` bundles "React-Query wiring" into ①, but the live service precedent (`SpacesService`/`BacklinkResolver`) ships **zero** hooks (React-Query needs a `QueryClient`, lives in `apps/web`; ① has no React). ① is React-Query-_consumable_ (typed Row returns, invalidation-ready); the hooks land in ②. Named per gate-2, not silent. `[FACT: delivery-plan:53; spaces/ dir has no hooks]`

## 7. Change Log

| Date       | Session              | Change                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-21 | 2026-08-21-mod-notes | initial draft (task-new stub)                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-08-21 | 2026-08-21-mod-notes | PLAN filled §2–§6 (post Step-0b baseline + Step-1 pattern read); resolved 3 scope boundaries (entity-link/tag delegation, summary-engine→journals, entity_tags-read flagged)                                                                                                                                                                                                                      |
| 2026-08-21 | 2026-08-21-mod-notes | gate-1 critique REVISE→folded: named the §9:188 summary anomaly + homed `buildJournalSummary` to ②; fixed step-1 to EXTEND existing `validators/note.ts` (colocation hazard); flagged ServiceError doc/code drift; tightened cites                                                                                                                                                                |
| 2026-08-21 | 2026-08-21-mod-notes | preflight PASSED; gate-2 critique REVISE→folded: **BLOCKER** native returns → Drizzle Rows (`PageRow`/…, not `@vida/types` interfaces — won't typecheck otherwise); `getBacklinks` entity-links-only divergence named (G6 merge tentative→②); `entity_tags` reads RESOLVED into §3 (§9:190 ① scope); NP-8 determinism scoped to seed value; barrel-export convention cited. Ready for Approval 2. |
