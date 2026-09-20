# Slice Map — mod-notes-and-pages ① (backend service)

> Entity Delivery Flow (v1) Step 2. The backend/frontend split + the per-slice service track.
> The SURFACE is **ratified** from `backend-intent/parts/notes-and-pages.md` (NOT-01…54); the SLICING
> below is the DECIDE (proposed for Approval 1). Each backend slice runs the full §XXVI double-gate + a
> per-slice **blocking** Verification Gate (functional tests + live-store smoke) before the next begins.

## Split

- **① backend (this unit — `mod-notes-and-pages`, LIF-131):** the `@vida/core` `NotesService` — 4 slices below. All `boundary=service` rows + the service half of each SPLIT row.
- **② frontend (`fe-notes-and-pages`, separate issue):** `[[` picker + "+ Create" affordance, backlinks panel (page+entity merge, G6), `/summary` block render + per-section degrade, collection-view renderers (List/Gallery/Calendar/Neural), favorite/archive/icon/cover controls, search box. The UI half of every SPLIT row. Handed to `add-frontend-component`.
- **seam / deferred (homed, NOT built here):** eager-trigger wiring (owning modules), `/summary` engine (journals), wider menu (M1.4), pomodoro lens (Sessions), Views selection primitive (design-pass), neural data-prep (AR-8), FTS5 (DB-8), templates apply (ADR-009), `[E]` wiring (M3/DB-5), hard-delete cascade (Part 2). See interpretation.md §5.

## Backend slices (dependency-ordered; each = one §XXVI double-gated build + Verification Gate)

### S1 — Service shell + Pages core  `[tag: backend]`
Rows: NOT-01…10 · 20(createPage half) · 21 · 39 · 40 · 41 · 42 · 43 · 44 · 45 · 46 · 47 · 32(storage half).
- Factory/DI shell `createNotesService({db, deviceId, spaces, backlinks, registry})` returning the `NotesService` object literal (no `this.`); `pageRepo` = `createRepository(db, pages, {deviceId, encryptedFields:[], softDelete:true})`. All deps injected at construction; S1 exercises only `registry` (spaces/backlinks are S4).
- `createPage` · `getPage` · `updatePage` (`.strict()` whitelist) · `softDeletePage` · `getPageByJournalDate` · `getPagesByType` · `getPagesForEntity` · `listPages({favorite?,archived?})`.
- **`assertRegistered(entityType)` is introduced HERE** [NOT-20/21]: `createPage` validates `entity_type` against the injected `TaggableTypeRegistry` **when `entity_type` is non-null** (NOT-01 "Zod/**registry** failure is a Promise rejection") → `UnregisteredEntityTypeError`. S4 REUSES this helper for the entity-link facade. [gate-1 grounding correction]
- NP-2: in-service pre-check → `JournalExistsError`. Typed errors module (`JournalExistsError`, `UnregisteredEntityTypeError`). `summary_config` read/write (storage only, opaque string). Metadata filters. `parent_id` orphan semantics (app-layer, no FK). Async-rejection contract.
- **`word_count` [NOT-45] is a PASS-THROUGH, doc/code-resolved:** `validators/note.ts:39,59` accepts `word_count` as an optional caller-supplied input on create+update; column defaults `0` (`schema/notes.ts:63`). ① does NOT derive it (content is `[E]`+CRDT; "v2 uses FTS5 + word_count" NOT-45 → derivation is DB-8/editor). S1 stores what the caller passes, else 0.
- **Why first:** every other slice depends on the shell + `pageRepo` + `assertRegistered`. Largest slice — the foundation.

### S2 — Entity notes + attachments  `[tag: backend]`
Rows: NOT-11 · 12 · 29 · 30 · 31.
- `ensureEntityNote(pageType, entityType, entityId, seed)` — idempotent (returns existing `*_note`); seed `content` = PURE fn of passed parent fields (stable key order, no `Date.now`/random; ZK-1). Composes S1 `getPagesForEntity` + `createPage`.
- `addAttachment` · `getAttachments` · `removeAttachment` (soft-delete) over `attachRepo`.
- **Why here:** Notes-owned satellites composed on S1's pages; independent of links/facade.

### S3 — Page-links + wiki resolution  `[tag: backend]`
Rows: NOT-14 · 15(page_links half) · 16 · 17 · 18 · 19(service half).
- `createPageLink` (idempotent: live no-op / soft-deleted revive / absent create) · `removePageLink` · `getPageLinksFrom` · `getPageLinksTo` (each appends `isNull(deleted_at)` — `findWhere` gotcha).
- `resolveWikiLink(text)` → title-LIKE candidates (NP-7, links by id).
- **Create-on-miss [NOT-19] is a ② CALLER COMPOSE, not a service method** — the `[[` picker calls `createPage('note')` then `createPageLink`. S3 exposes those two primitives; it does NOT add a `createNoteAndLink` bundle (that would manufacture ① surface the doc homes to the caller — "explicit caller compose", NOT-18/notes-and-pages.md:32). [gate-1 F1 fix]
- **DuplicateLinkError decision [NOT-15/F3]:** `page_links` default is idempotent no-op (NOT-14) → the S3 spec confirms `DuplicateLinkError` is NOT thrown for page-links (idempotent path), and drops it from the error surface unless a hard-conflict case is found at plan time.
- **Why here:** `page_links` table, self-contained; `getBacklinks` (S4) needs `getPageLinksTo`.

### S4 — Delegation facade + registry validation  `[tag: backend]`
Rows: NOT-20(entity-link half) · 22 · 23 · 24(service half) · 25 · 26 · 27 · 28(delegated).
- REUSES `assertRegistered` (introduced in S1) for entity-link `entity_type` validation before delegating.
- `createEntityLink`/`removeEntityLink` → **AR-6 `SpacesService`** (writes; do NOT re-implement idempotence — delegate).
- `getBacklinks(entityType, entityId)` → `entityLinks` always via **AR-8 `BacklinkResolver`**; `pageLinks` ONLY when `entityType ∈ {page,note,journal}` (= `getPageLinksTo(entityId)` from S3), else `[]` (page_links are page↔page — meaningless for a non-page entity, F2 fix). Returns BOTH lists; merge shape is ② G6-tentative. `getEntityLinksFrom` → AR-8.
- `getTagsForEntity` · `getEntitiesByTag` → `entity_tags` reads (AR-6 owns writes).
- **Why last:** the most integration-heavy (wires two external services); depends on S3 for the page-links half of `getBacklinks`.

## Slice dependency graph
```
S1 (shell + pages) ──┬── S2 (entity notes + attachments)
                     ├── S3 (page-links + wiki) ── S4 (facade + registry)
                     └────────────────────────────┘  (S4 getBacklinks needs S3 getPageLinksTo)
```

## Per-slice cadence (every slice)
document-context refresh → §XXVI PLAN (spec) → /critique → Approval 1 → /preflight → /critique → Approval 2 → implement (types→logic→errors) → `tsc --noEmit` 0 → **Verification Gate** (Vitest logic + ≥2 failure paths + typed-error asserts + live-store smoke on the real SQLite store) → `code-review` → `/critique` SHIP → §XXIX currency. No batching; a slice's gate PASSES before the next starts.
