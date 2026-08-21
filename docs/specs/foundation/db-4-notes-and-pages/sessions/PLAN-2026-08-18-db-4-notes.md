# PLAN — DB-4 · Notes & Pages (gate-1 / Approval 1)

> **Unit:** author the 3 net-new Notes & Pages domain tables (`pages` · `page_links` · `note_attachments`) as the first
> DB-4 Stream (ii) domain module. Intent + shape are fixed by `../_index.md` §1–§6 (P1+P2). This PLAN is the *what & how*
> for the gate; the shape carries **no open decisions** (`_index.md` §4 N-R1…N-R6). Pattern-matched to migrations
> 002–011 + `_shared.ts` + `enum-parity.test.ts` (all read at gate).
> **No-Guessing:** every DDL line traces to ADR-002 §5.2 (columns) + the live conventions (shape). Any build-time
> divergence → §XXVIII.

## A. Scope (what this unit authors)
1. **`schema/notes.ts`** — Drizzle query mirror: `pages` · `pageLinks` · `noteAttachments` (+ `$inferSelect/$inferInsert`).
2. **`migrations/012_notes.ts`** — hand-written SQL DDL for the 3 tables; registered in `runner.ts ALL_MIGRATIONS`.
3. **`schema/index.ts`** — `export * from './notes'`.
4. **`validators/enum-parity.test.ts`** — FOUR edits (Finding 4): (i) `import { migration012Notes } from
   '../db/migrations/012_notes'`; (ii) `import { PAGE_TYPE } from '@vida/types'`; (iii) add `await
   migration012Notes.up(driver)` to the `ddlFor` migration chain (after `011`); (iv) append the FIXTURE row
   `{ table: 'pages', column: 'type', tuple: PAGE_TYPE }`. Missing (iii) → `no DDL found for table pages`.
5. **`_registry.ts`** — VERIFY no-op (page/note/journal/tag/space already seeded; the module entity_types pages point *at*
   arrive with their own domains). No append expected; assert in review.

**Out of scope** (`_index.md` §1 boundary): `tags`/`entity_tags`/`entity_links` (AR-6, on disk) · `pomodoro_sessions`
(→ `focus_sessions`, group #3) · `page_tags` (retired) · FTS5 `fts_pages` (DB-8) · encryption activation (M3) ·
`validators/note.ts` (`PageTypeSchema = z.enum(PAGE_TYPE)` already exists) · **`@vida/types` row interfaces** — see the
staleness note below; **this unit adds no `@vida/types` code** (`PAGE_TYPE` + `Page`/`PageLink`/`NoteAttachment` all
pre-exist; DB-4 authors the Drizzle mirror only, never row interfaces — the DB-3 precedent added zero).

> **⚠ Deliberate, precedented divergence (Finding 1 — NOT a blocker).** `@vida/types` `PageLink`/`NoteAttachment`
> extend `SyncMetadata` (`created_at` only — **no `updated_at`/`deleted_at`**), while N-R2 authors the tables with full
> `baseColumns` + `deleted_at` (ADR-016 §3.4). This is the **exact divergence already shipped on `main`**: the on-disk
> `entity_links` table uses full `baseColumns` while `@vida/types` `EntityLink` stays `SyncMetadata`+`created_at`
> (`spaces.ts:67-79` vs `note.ts:127-135`). It compiles because **no `$inferSelect ↔ interface` assertion exists** —
> the mirror's row type is independent (`typeof pages.$inferSelect`, like `EntityLinkRow`). The stale minimal interfaces
> are a **DB-11 reconciliation** (ADR-002 §5/§7/§8), not this unit's scope. Promoting them here would inflate DB-4 into
> DB-11 territory. `[FACT: spaces.ts vs note.ts; DB-3 added no row interfaces; current-spec Downstream "DB-11"]`

## B. DDL — the 3 tables (traced to ADR-002 §5.2 + conventions)
Every table: full `baseColumns` SQL mirror (`id · created_at · updated_at · _sync_*`) + `deleted_at` (N-R2). All refs
plain TEXT, **no FK**, self-ref included (N-R1). Only `pages.type` carries a SQL CHECK (FIXED, from `PAGE_TYPE` — N-R6);
`entity_type` is OPEN, no CHECK (BR-N2).

**B1 · `pages`** — the polymorphic hub.
```
id TEXT PK · type TEXT NOT NULL DEFAULT 'note' CHECK(type IN <PAGE_TYPE 6>) · title TEXT[E] · content TEXT[E]
· parent_id TEXT (self-ref, no FK) · entity_type TEXT (OPEN, no CHECK) · entity_id TEXT · journal_date TEXT (YYYY-MM-DD)
· is_favorite INTEGER NOT NULL DEFAULT 0 · is_archived INTEGER NOT NULL DEFAULT 0 · icon TEXT · cover_image TEXT[E]
· summary_config TEXT[E] (JSON) · has_pomodoro INTEGER NOT NULL DEFAULT 0 · word_count INTEGER NOT NULL DEFAULT 0
· deleted_at INTEGER · created_at · updated_at · _sync_* (6)
```
Indexes: `idx_pages_type(type)` · `idx_pages_journal_date(journal_date)` · `idx_pages_entity(entity_type,entity_id)` ·
`idx_pages_deleted(deleted_at)` · **partial** `idx_pages_journal_unique(journal_date) WHERE type='journal' AND
deleted_at IS NULL` (NP-2 / BR-N4). `[FACT: ADR-002 L1297-1335]`

**B2 · `page_links`** — wiki bidirectional.
```
id TEXT PK · source_page_id TEXT NOT NULL (no FK) · target_page_id TEXT NOT NULL (no FK) · context TEXT[E]
· deleted_at INTEGER · created_at · updated_at · _sync_* (6) · UNIQUE(source_page_id, target_page_id)
```
Index: `idx_page_links_target(target_page_id)`. `[FACT: ADR-002 L1341-1359; NP-5]`

**B3 · `note_attachments`** — encrypted file blobs.
```
id TEXT PK · page_id TEXT NOT NULL (no FK) · filename TEXT NOT NULL [E] · mime_type TEXT NOT NULL
· encrypted_blob BLOB NOT NULL [E] · thumbnail_blob BLOB [E] · size_bytes INTEGER NOT NULL
· deleted_at INTEGER · created_at · updated_at · _sync_* (6)
```
Index: `idx_attachments_page(page_id)`. Drizzle mirror uses `blob('…', { mode: 'buffer' })` (first BLOB in the v2
surface — no `_shared` helper exists; use `drizzle-orm/sqlite-core` `blob` directly). `[FACT: ADR-002 L1433-1452]`

> **Shape delta vs ADR-002 §5.2 (stale, per L22) — intentional, doc-cited:** §5.2 gives `page_links`/`note_attachments`
> a `created_at`-only base and hard `REFERENCES … CASCADE/SET NULL`. Both are the stale-v1 form; N-R1 (no-FK) + N-R2
> (full baseColumns + `deleted_at`) supersede them, matching the on-disk AR-6 `entity_links` sibling.

**B4 · Drizzle mirror column-type specifics (preflight folds — locked, not assumed):**
- **`summary_config` → plain `text('summary_config')`, NOT `json<JournalSummaryConfig>()`.** The schema's repeated
  convention (`capability.ts:7`, `spaces.ts:18`, `sessions.ts:60`) is **NEVER `json<T>()`** for app-stringified JSON —
  it only casts and would bind a raw object; the app stringifies/parses (the `sessions.payload`/`sync_queue.payload`
  precedent). SQL column is `TEXT`. `[FACT: sessions.ts:60; spaces.ts:18]`
- **`encrypted_blob` / `thumbnail_blob` → `blob('…', { mode: 'buffer' })`** (first BLOB columns in the v2 surface — no
  precedent to mirror, no `_shared` helper; import `blob` from `drizzle-orm/sqlite-core`). SQL is `BLOB`.
- **Mirror const naming** = camelCase const → snake_case table: `pages`/`'pages'` · `pageLinks`/`'page_links'` ·
  `noteAttachments`/`'note_attachments'` (the `entityLinks`/`'entity_links'` precedent). `[FACT: spaces.ts:67]`
- **Migration object:** `{ version: 12, name: 'notes', up }`; register `migration012Notes` in `runner.ts ALL_MIGRATIONS`.
  The runner test is **count-dynamic** (`expect(applied).toBe(listMigrations().length)`, `LATEST_VERSION`) → auto-covers
  012 once registered; **no runner-test edit needed**. `[FACT: migrations-runner.test.ts:84-86]`

## C. Business rules honored (from `_index.md` §2 + `notes-and-pages/business-rules.md`)
- **NP-1** (no inline notes — `pages` IS the mechanism) · **NP-2/BR-N4** (partial UNIQUE journal_date) · **NP-4/BR-N3**
  (`content` is one TEXT[E] column; Yjs is runtime) · **NP-5** (both link UNIQUEs) · **NP-6/BR-N2** (`entity_type` OPEN,
  no CHECK — registry-validated) · **NP-9/N-R1** (cascade/orphan is app/sync-layer, not SQL `ON DELETE`) ·
  **BR-N1/N-R6** (`type` FIXED CHECK from `PAGE_TYPE`).
- **BR-DB6-3** — the `[E]` fields (`title·content·cover_image·summary_config·context·filename·encrypted_blob·
  thumbnail_blob`) are declared for M3; inert in M1.0 (empty active set, pass-through). Marked `-- [E]` in the SQL +
  `/** @encrypted */` in the mirror.

## D. Acceptance criteria (§4 — gate against these)
1. `pnpm --filter @vida/core typecheck` green (mirror + parity import compile); root typecheck green. The mirror's
   `$inferSelect` row types are self-consistent and **independent of the stale `@vida/types` row interfaces** (no
   assertion ties them — §A note), so full-`baseColumns` mirrors do not fail against `PageLink`/`NoteAttachment`.
2. `enum-parity.test.ts` green with the new `{pages,type,PAGE_TYPE}` row — the CHECK set EQUALS the tuple (BR-DB9-1).
3. The runner applies migration 012 (schema advances to v12); a fresh `migrate()` creates all 3 tables + 6 indexes;
   `@vida/core` suite green (runner test picks up the new migration count).
4. Grep-verify: no FK/`REFERENCES` in `012_notes.ts`; `pages`/`page_links`/`note_attachments` present; RETIRE tokens
   (`page_tags`/`pomodoro_sessions`/`slug`) still absent.
5. **Foundation-readiness (P5):** the downstream consumer **MOD-notes (#31)** finds every `pages`/`page_links`/
   `note_attachments` column its contract (`notes-and-pages/contract.md`) needs — spot-checked, gap → defect.

## E. Edge cases / landmines
- **Partial index** must carry the full `WHERE type='journal' AND deleted_at IS NULL` (a flattened index is one of
  ADR-016's five systemic gaps — do not drop the predicate). `[FACT: ADR-002 L1335]`
- **`pages.type` DEFAULT `'note'`** preserved (ADR-002 L1299) — a bare `createPage` with no type is a `note`.
- **BLOB not TEXT** for `encrypted_blob`/`thumbnail_blob` — the repository's encrypt seam packs bytes; TEXT would be wrong.
- **`entity_type` gets NO CHECK** even though a 33-value `ENTITY_LINK_TARGET` tuple still exists in `note.ts` — that
  tuple is retired for the OPEN registry (`_index.md` §1; NP-6). Do not wire it as a CHECK. `[[open-vocab-columns-take-no-sql-check]]`
- **Migration runs inside the runner's BEGIN/COMMIT** — `up()` must not open its own transaction (003/011 precedent).

## F. Verify order (P4 exit → P5)
`@vida/types` typecheck (no-op) → `@vida/core` typecheck → `@vida/core` test (parity + runner) → root typecheck →
grep gates (D4) → P5 (post-impl `/critique` + §XXIX currency promote of `database-layer/current-*` + foundation-readiness).
