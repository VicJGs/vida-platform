# Spec: feature:mod-notes-and-pages — S3 Page-links + wiki resolution

Status: draft
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim is [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-09-19-mod-notes-and-pages (S3).
Gate: §XXVI gate-1 = THIS spec. Authority: notes-and-pages.md (NOT-14/15/16/17/18/19).
Slice contract: docs/features/notes-and-pages/delivery/{slice-map,seam-contract,interpretation}.md (S3).
Builds ON S1 (`ef8c1ed`) + S2 (`231a92f`): reuses `allOf`, the factory shell.

## 1. Identity

S3 adds the **page↔page wiki-link** surface to `NotesService`, over the `page_links` table.

- **What it is:** `createPageLink` (idempotent + revive), `removePageLink`, `getPageLinksFrom`/`getPageLinksTo`,
  `resolveWikiLink` (title-candidate query for the `[[` picker).
- **What it is NOT:** create-on-miss is a ② **caller compose** (`createPage('note')` + `createPageLink`), NOT a
  service method (F1); the `[[` picker UI is ② (NOT-19); entity-links (S4, delegated to AR-6/AR-8).
- **Rows:** NOT-14 · 15(page_links half) · 16 · 17 · 18 · 19(service half = "the two primitives exist").

## 2. Business Rules

- **BR-S3-1 (NP-5 idempotent + revive):** `createPageLink(source, target, context?)` queries `page_links` by the
  business key `(source_page_id, target_page_id)` **including soft-deleted rows**; since `UNIQUE(source_page_id,
target_page_id)` is FULL (not partial — a soft-deleted row still occupies the slot), the paths are: existing & live
  → return it (no-op); existing & soft-deleted → **revive** (`update {deleted_at:null, context}`); absent → create.
  Mirrors AR-6 `createLink`. [FACT: notes-and-pages.md:28 (NOT-14); migrations/033_notes.ts:91; spaces/service.ts:158-180]
- **BR-S3-2 (removePageLink resolve-then-soft-delete):** find the live row for the key, `repo.delete(it.id)` (soft, NP-9); absent/already-deleted → no-op. [FACT: NOT-16; spaces/service.ts:182-192]
- **BR-S3-3 (link reads filter soft-delete):** `getPageLinksFrom(pageId)` = `source_page_id=pageId ∧ isNull(deleted_at)`;
  `getPageLinksTo(pageId)` = `target_page_id=pageId ∧ isNull(deleted_at)` (via `idx_page_links_target`). [FACT: NOT-17; schema/notes.ts:86; BR-S1-7 findWhere gotcha]
- **BR-S3-4 (NP-7 resolve by id, not text):** `resolveWikiLink(text)` returns non-deleted `pages` whose `title` LIKE
  `%text%` — CANDIDATES for the `[[` picker; the caller binds a concrete `target_page_id` via `createPageLink` (the
  stored link is id-based → survives renames + immune to title collisions). [FACT: notes-and-pages.md:32 (NOT-18)]
- **BR-S3-5 (async · factory shape):** async methods, hoisted closures, no `this.` (carry over S1/S2).

**Note (createPageLink existing-check does NOT filter deleted_at):** unlike the S1/S2 reads (BR-S1-7), the revive path
REQUIRES seeing soft-deleted rows, so its business-key query intentionally omits `isNull(deleted_at)` (mirrors
spaces:160-166). This is the one read that must include soft-deleted.

**DECISION D-S3-1 (LIKE wildcard handling).** `resolveWikiLink` uses a plain `like(pages.title, `%${text}%`)`.
M1.0 does NOT escape `%`/`_` in `text` — a short picker query rarely contains them, and title is plaintext in M1.0
(pass-through); at M3 title is `[E]` and search moves to FTS5/DB-8 anyway (NOT-50). Wildcard-escaping is a deferred
refinement, not an M1.0 correctness gap. [INTERP: NOT-18 "title-LIKE candidates"; NOT-50 FTS→DB-8]

## 3. Contract (appended to `NotesService`)

```ts
createPageLink(sourcePageId: string, targetPageId: string, context?: string): Promise<PageLinkRow> // NOT-14
removePageLink(sourcePageId: string, targetPageId: string): Promise<void>                          // NOT-16
getPageLinksFrom(pageId: string): Promise<PageLinkRow[]>                                            // NOT-17
getPageLinksTo(pageId: string): Promise<PageLinkRow[]>                                              // NOT-17
resolveWikiLink(text: string): Promise<PageRow[]>                                                   // NOT-18
```

Returns `PageLinkRow` (`typeof pageLinks.$inferSelect` [FACT: schema/notes.ts:112]) / `PageRow`. No net-new error
class (page-link idempotence is a no-op/revive, never a thrown `DuplicateLinkError` — F3). No net-new validator
(inputs are ids/text). `pageLinks` import from `../../db/schema/notes`.

## 4. Acceptance

- [ ] `NotesService` gains the 5 S3 methods; `pageLinks` + `like` imported; barrel unchanged (no net-new exported types).
- [ ] `createPageLink`: absent → creates; same call again (live) → returns the SAME row (no-op, no duplicate); after `removePageLink` → next `createPageLink` REVIVES the same row id (deleted_at cleared), not a new row (BR-S3-1).
- [ ] `removePageLink`: soft-deletes the live row; second call → no-op (BR-S3-2).
- [ ] `getPageLinksFrom`/`getPageLinksTo`: return only non-deleted, correct direction (BR-S3-3).
- [ ] `resolveWikiLink`: returns non-deleted pages matching the title substring; excludes soft-deleted; a soft-deleted page never appears (BR-S3-4).
- [ ] `tsc --noEmit` 0; ESLint 0; `@vida/core` suite green (≥985 + new).
- [ ] **Verification Gate (live store):** the full revive cycle (create→remove→create-same-key = one row, id stable, deleted_at toggles); from/to direction; resolveWikiLink substring + soft-delete exclusion.

## 5. Implementation Prompt

1. `types.ts` — append the 5 method sigs to `NotesService` (import `PageLinkRow` from schema/notes).
2. `service.ts` — import `pageLinks, type PageLinkRow`; add `like` to the drizzle-orm import; add `linkRepo = createRepository(db, pageLinks, {deviceId, encryptedFields:[], softDelete:true})`.
3. `createPageLink` (mirror spaces/service.ts:158-180): `const existing = await linkRepo.findWhere(allOf(eq(pageLinks.source_page_id, sourcePageId), eq(pageLinks.target_page_id, targetPageId)))` (NO isNull filter — revive needs soft-deleted); `if (existing.length) { const row = existing[0]; if (row.deleted_at != null) return linkRepo.update(row.id, { deleted_at: null, context: context ?? null }); return row } return linkRepo.create({ source_page_id: sourcePageId, target_page_id: targetPageId, context: context ?? null })`. BR-S3-1.
4. `removePageLink` (mirror spaces:182-192): `const existing = await linkRepo.findWhere(allOf(eq(pageLinks.source_page_id, sourcePageId), eq(pageLinks.target_page_id, targetPageId))); const live = existing.find(r => r.deleted_at == null); if (live) await linkRepo.delete(live.id)`. BR-S3-2.
5. `getPageLinksFrom(pageId)` → `linkRepo.findWhere(allOf(eq(pageLinks.source_page_id, pageId), isNull(pageLinks.deleted_at)))`. `getPageLinksTo(pageId)` → `linkRepo.findWhere(allOf(eq(pageLinks.target_page_id, pageId), isNull(pageLinks.deleted_at)))`. BR-S3-3.
6. `resolveWikiLink(text)` → `pageRepo.findWhere(allOf(like(pages.title, `%${text}%`), isNull(pages.deleted_at)))`. BR-S3-4/D-S3-1.
7. Tests (`notes-service.test.ts` append) + gates (§4). No barrel change.

## 6. Open UNKNOWNs / Decisions Needed

- D-S3-1 (LIKE escaping) — deferred to DB-8/FTS per lean; confirm at Approval 1. None blocking.

## 7. Change Log

| Date       | Session                  | Change                                |
| ---------- | ------------------------ | ------------------------------------- |
| 2026-09-19 | mod-notes-and-pages (S3) | initial draft — gate-1, after S2 ship |
