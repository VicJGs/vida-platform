# IMPLEMENTATION-PLAN: mod-notes-and-pages — S3 Page-links + wiki resolution

Gate: §XXVI gate-2. Spec: `PLAN-s3-page-links-wiki.md` (Approval 1 ✅). Preflight PASSED (pageLinks/PageLinkRow/like resolve).
Builds on S1 (`ef8c1ed`) + S2 (`231a92f`). Mirrors AR-6 `createLink`/`removeLink` (spaces/service.ts:158-192). No `this.`.

## Build order
- [ ] **B1 — `types.ts`.** Append the 5 S3 method sigs to `NotesService`; import `PageLinkRow` from `../../db/schema/notes` (add to the existing schema import).
- [ ] **B2 — `service.ts` imports + repo.** Add `like` to the `drizzle-orm` import; add `pageLinks, type PageLinkRow` to the schema import; `const linkRepo = createRepository(db, pageLinks, { deviceId, encryptedFields: [], softDelete: true })`.
- [ ] **B3 — `createPageLink`** (BR-S3-1, mirror spaces:158-180): `const existing = await linkRepo.findWhere(allOf(eq(pageLinks.source_page_id, sourcePageId), eq(pageLinks.target_page_id, targetPageId)))` — **NO isNull filter** (revive needs soft-deleted). `if (existing.length > 0) { const row = existing[0]!; if (row.deleted_at != null) return linkRepo.update(row.id, { deleted_at: null, context: context ?? null }); return row } return linkRepo.create({ source_page_id: sourcePageId, target_page_id: targetPageId, context: context ?? null })`. (`existing[0]!` — UNIQUE(source,target) guarantees ≤1 row; comment it per §XV, or narrow via `const row = existing[0]; if (row) {...}`.)
- [ ] **B4 — `removePageLink`** (BR-S3-2, mirror spaces:182-192): `const existing = await linkRepo.findWhere(allOf(eq(pageLinks.source_page_id, sourcePageId), eq(pageLinks.target_page_id, targetPageId))); const live = existing.find((r) => r.deleted_at == null); if (live) await linkRepo.delete(live.id)`.
- [ ] **B5 — direction reads** (BR-S3-3): `getPageLinksFrom(pageId) → linkRepo.findWhere(allOf(eq(pageLinks.source_page_id, pageId), isNull(pageLinks.deleted_at)))`; `getPageLinksTo(pageId) → linkRepo.findWhere(allOf(eq(pageLinks.target_page_id, pageId), isNull(pageLinks.deleted_at)))`.
- [ ] **B6 — `resolveWikiLink`** (BR-S3-4/D-S3-1): `pageRepo.findWhere(allOf(like(pages.title, `%${text}%`), isNull(pages.deleted_at)))`.
- [ ] **B7 — tests (`notes-service.test.ts` append).** Live-store: create→same-key-again returns same id (no-op, no dup); create→remove→create-same-key REVIVES (same id, deleted_at was set then cleared); removePageLink 2nd call no-op; getPageLinksFrom/To direction + soft-delete exclusion; resolveWikiLink substring match + excludes soft-deleted + excludes null-title.
- [ ] **B8 — gates.** typecheck 0 · `@vida/core` green (≥985 + new) · eslint 0 · Verification Gate · post-impl `/critique` · §XXIX refresh current-* (S3 rows) → commit.

## On divergence
Any wrong/missing step → STOP → §XXVIII. Prefer the `if (row)` narrowing over a bare `!` (§XV).
