# DB-4 · Domain Group #11 Books · Unit Spec

**Task:** db-4-per-domain-schema (LIF-66) · **Group:** #11 of 22 (P0 table #11) · **Profile:** Add Backend Component (5-phase schema-foundation)
**Migration slot:** `023_books` (v23) · **Schema file:** `schema/books.ts` · **Branch:** `db-4-per-domain-schema`
**Rerun:** books ✅ IMPLEMENTED (2026-07-24, SHIP — 8th consecutive clean; MIXED case: 2 R6 reframes + S1 reframe + X*/AI*). The ADR-realignment is DONE; the entity-family DDL is this build's job (rerun §5:151 "the reframed entity family … = build-phase"; [[check-intake-and-reruns-before-triaging-a-design-pass-undone]]).

> The **2nd-largest reframe** (after Education) — the reading Universe. 10 owned tables author the resolved family;
> `books`/`book_chapters` reshaped from the 2-table FACT floor. Every shape is doc-determined; **zero build-decisions**.
> The one genuinely-undesigned piece (cross-format mapping, BK-4) is deferred per an explicit "design pass required" flag.

## §0. Source model
Frontend/data source-of-truth = documented intent (`frontend-source-of-truth.md`). Ground truth for THIS unit:
`docs/features/books/{identity,business-rules,structure-data,contract,conventions}.md` (all 5 read) + the rerun
`realignment-master-plan/part-1.2-reruns/books.md` (SHIP) · `ADR-002 §Books` (STALE FACT floor: `books` L2442, `book_chapters`
L2478) · ADR-004 S1 (session sub-type) · `@vida/types/learning.ts` (BOOK_STATUS; BOOK_FORMAT retired) · `session.ts`
(SESSION_SUB_TYPE has `'reading'`) · `session-extensions.ts` (the 1:1 pattern) · `database-layer/current-*.md`.

## §1. Identity — what this unit is
The reading Universe (own module, extracted from Learning): book = the WORK, per-format copies = assets, work-anchored
annotations (3 natures), reading sessions (a `reading` Session sub-type), an adaptive Quota Planner, and the Education
partition junction. The `structure-data.md` roster is authoritative ([[module-doc-is-db4-roster-not-adr-broad-list]]);
**ADR-002 §Books is STALE** (`books.format` single, `current_page`/`progress NOT NULL DEFAULT 0`, inline `genre`/`tags`).

### Scope boundary — doc-DECIDED
**AUTHOR (10 tables):** `books` (reshaped) · `book_chapters` (FACT+UNIQUE) · `book_assets` · `book_bookmarks` ·
`book_highlights` · `book_quotes` · `reading_sessions` (S1 extension) · `reading_plans` · `reading_plan_books` (junction)
· `book_subjects` (junction).

**OUT — deferred / owned elsewhere (cited, not authored):**
- **cross-format mapping / anchor data** (BK-4) — **"design pass required"** (business-rules:136; rerun §5:153); the
  algorithm/shape is undesigned → deferred.
- **conflict/resolution state** (BK-8) — the preset rule lives in **Preferences**; the conflict queue is
  React-Query-**derived** (state-map:38) → not a Books table.
- **`measurement_kind`/`binding_mode`** — the reading-plan goal's measurability is a **Purpose target** (Purpose-owned,
  C-M1; Books absent from the M1 pursuable set L240 — the Skills pattern). `reading_plans` stores NO measurement axes.
- base `sessions` spine (timer/scheduling) — **Sessions-owned** (ADR-004, S1); `reading_sessions` is only the extension.
- `entity_tags` (tags), `pages` (notes on bookmarks/quotes), `entity_links` (inter-links) — AR-6/Notes substrate, consumed.
- ISBN/OCR/TTS/transcription X*/AI* layer — service (Skills precedent); photos → `note_attachments`; Education pacing +
  Calendar reconciliation → forward-dep service; quote-embed block → `@vida/editor`. `grant_currency`/E2 — NOT Books (grants
  ride the base-`sessions` sub-type, C-E2). AI4 — NA (scoped model calls, C-AI4).

## §2. Business rules (the invariants this DDL must encode)
- **BR-BK-1 — book = the WORK, copies = assets (BK-2).** `books` holds work-level identity; `book_assets` (0..n) each
  carries `format` + one `native_position`. A book with 0 assets is first-class (TOC-only). `[FACT: BK-2; identity:22-24]`
- **BR-BK-2 — unified progress DERIVED (BK-3/M3).** `books.progress` is a nullable override (`NULL ⇒ derive`); the §Books
  `NOT NULL DEFAULT 0` anti-signal resolved out. `books.current_page` RETIRED → per-asset `native_position`. `[FACT: BK-3; conventions:11-14]`
- **BR-BK-3 — classification via `entity_tags`, prose via `pages` (BK-16).** Inline `books.genre`/`tags` RETIRED → `entity_tags`
  (Books-scoped); notes on bookmarks/quotes via `pages`; no inline tags/notes columns. `[FACT: BK-16; conventions:19-21]`
- **BR-BK-4 — `reading_sessions` is a `reading` Session sub-type (BK-10, S1).** Own `id` UUIDv7 PK + `session_id` UNIQUE
  (1:1, no FK); the shared timer/scheduling rides base `sessions`, the mode-adaptive capture is the extension. `reading` ≠
  `study` (distinct sub-types — "never a `study_session` reuse" preserved). `SESSION_SUB_TYPE` already carries `'reading'`.
  `[FACT: BK-10; conventions:24-27; session.ts:22]`
- **BR-BK-5 — 3 annotation natures (BK-6).** `book_bookmarks` + `book_quotes` take notes (`pages`) + inter-links
  (`entity_links`); `book_highlights` are deliberately light — **no notes, no inter-links**. `[FACT: BK-6; conventions:50]`
- **BR-BK-6 — no FK anywhere.** `book_id`/`asset_id`/`plan_id`/`subject_id`/`session_id`/`promoted_object_id` plain TEXT;
  §Books REFERENCES + CASCADE superseded (ADR-016 §3.4). The one doc-fixed constraint kept: `book_chapters`
  `UNIQUE(book_id, chapter_number)` (§Books L2501). `[FACT]`
- **BR-BK-7 — no measurement axes on reading_plans (C-M1).** The plan goal's `measurement_kind`/`binding_mode` is a Purpose
  target (Purpose-owned); `reading_plans` holds only plan mechanics. `[FACT: rerun C-M1 books.md:71,79]`

## §3. Structure — the 10 tables (P=plain · E=[E]; `...baseColumns` on all; `deleted_at` on all EXCEPT the 2 noted)
> **`deleted_at` exceptions (doc/precedent-fixed, F1):** `book_chapters` gets **NO `deleted_at`** — the §Books FACT
> floor deliberately omits it (`books` HAS it, `book_chapters` does not, L2478-2502) + structure-data:10 "**no soft
> delete**" + conventions:41 "soft delete on **parents**" (chapters are children). `reading_sessions` gets **NO
> `deleted_at`** — session extensions own no lifecycle (the live `session-extensions.ts` `study_sessions`/`focus_sessions`
> precedent — base `sessions` owns delete). All other 8 tables (incl. junctions — the `project_habits` precedent) keep it.

**`books`** — the work (reshaped). `title` E NN · `author` E · `isbn` E · `status` (BOOK_STATUS, FIXED, NN default
'want_to_read') · `total_pages` INT null (work-level, for TOC-only planning BK-17) · `progress` INT null (**derived**
override, BR-BK-2) · `start_date` calendarDate null · `end_date` calendarDate null · `rating` INT null (CHECK BETWEEN 1
AND 5 — numeric, not a tuple) · `review` E · `cover_url` E. *(RETIRED: `format`→assets, `current_page`→asset position,
`genre`/`tags`→entity_tags.)*

**`book_chapters`** — flat TOC (FACT, kept). `book_id` P NN (no FK) · `title` E NN · `chapter_number` INT NN · `start_page`
INT null · `end_page` INT null · `estimated_reading_minutes` INT null · `actual_reading_minutes` INT null · `is_completed`
boolInt NN default 0 · `completed_at` INT null · `sort_order` INT NN default 0. **UNIQUE(book_id, chapter_number)** (doc-fixed). **NO `deleted_at`** (F1).

**`book_assets`** — per-format copy (BK-2). `book_id` P NN (no FK) · `format` (BOOK_ASSET_FORMAT, FIXED, NN) · `file_ref`
E (encrypted R2 ref, nullable — physical has none) · `native_position` P null (page/location/timestamp, format-interpreted;
plaintext per BK-1).

**`book_bookmarks`** — position marker (BK-5, work-anchored). `book_id` P NN (no FK) · `position` P null · `label` E.
*(Notes via `pages`; inter-links via `entity_links`.)*

**`book_highlights`** — light span marker (BK-6, no notes/links). `book_id` P NN · `asset_id` P null (the digital-content
source — `[INTERP]`: prose-derived from BK-6 "digital content spans" + `addHighlight(assetId, span)`, F2) · `captured_text` E · `position` P null.

**`book_quotes`** — first-class quote (BK-7). `book_id` P NN · `text` E NN · `position` P null. *(Notes via `pages`;
inter-links + embeddable.)*

**`reading_sessions`** — `reading` Session sub-type (BR-BK-4). `session_id` P NN UNIQUE (1:1 key, no FK) · `book_id` P NN ·
`asset_id` P null · `pages_read` INT null · `position_delta` P null · `stop_point` P null · `statistics` P json null.
**NO `deleted_at`** (session extension — `session-extensions.ts` precedent, F1). *(Photos → note_attachments; timer/scheduling on base sessions.)*

**`reading_plans`** — Quota Planner (BK-11). `arrangement` (READING_PLAN_ARRANGEMENT, FIXED, NN) · `goal_type`
(READING_PLAN_GOAL_TYPE, FIXED, NN) · `target_date` calendarDate null · `target_completion_date` calendarDate null ·
`quota_distribution` P json null · `recalculation_state` P json null. *(NO measurement_kind/binding_mode — Purpose-owned, BR-BK-7.)*

**`reading_plan_books`** — plan↔books arrangement junction. `plan_id` P NN (no FK) · `book_id` P NN (no FK) · `sequence`
INT null · `quota` INT null.

**`book_subjects`** — Education partition junction (BK-13). `book_id` P NN (no FK) · `subject_id` P NN (no FK).

### Enum plan
- **REUSE (FIXED CHECK + parity):** `BOOK_STATUS` (books.status).
- **NET-NEW (3 tuples → `@vida/types/learning.ts` + Zod, FIXED CHECK + parity):** `BOOK_ASSET_FORMAT`
  =[physical,pdf,epub,audiobook,braille,other] (conventions:34) · `READING_PLAN_ARRANGEMENT` =[sequenced,parallel] ·
  `READING_PLAN_GOAL_TYPE` =[manual,auto].
- **Numeric CHECK (not a tuple → not a parity row):** `books.rating` BETWEEN 1 AND 5 (the habits/finance precedent).
- **OPEN / structural:** `native_position`/`position`/`position_delta`/`stop_point` (plaintext structural, format-interpreted);
  `statistics`/`quota_distribution`/`recalculation_state` = plain `json`. `reading_sessions.sub_type` rides the OPEN
  `SESSION_SUB_TYPE` on the base `sessions` (no CHECK here — the base owns it).
- **4 FIXED CHECK columns = 4 tuples** (all single-use).

### ENTITY_TYPES registry additions
**ADD 4:** `book` (tags/notes/links target, BK-16 + Knowledge `linked_book_id`) · `book_chapter` (Knowledge topic↔chapter
link target, structure-data:62) · `book_bookmark` · `book_quote` (both take notes via `pages` + inter-links, BK-6).
**EXCLUDE:** `book_highlight` (BK-6 — deliberately no notes/links), `reading_session` (session sub-type → base `session`,
ADR-004 §3.1), `book_asset`/`reading_plan`/`reading_plan_books`/`book_subjects` (non-target config/junction/child entities).

## §4. Acceptance
- [ ] 10 tables in `schema/books.ts` + `migrations/023_books.ts` (v23); runner registered; `LATEST_VERSION`=23.
- [ ] No FK; the only UNIQUE = `book_chapters(book_id, chapter_number)` (doc-fixed); no `progress NOT NULL DEFAULT 0`;
      no `books.format`/`current_page`/`genre`/`tags`; no `measurement_kind`/`binding_mode` on `reading_plans`.
- [ ] `reading_sessions` = own `id` PK + `session_id` UNIQUE (1:1, no FK), no base-spine fields (BR-BK-4).
- [ ] `deleted_at` on all EXCEPT `book_chapters` + `reading_sessions` (F1 — FACT-floor/precedent-fixed); the mirror
      matches the migration exactly (introspection test enforces).
- [ ] **4 FIXED-CHECK columns = 4 tuples** parity-asserted; `books.rating` numeric BETWEEN (not a row); OPEN/json cols no CHECK.
      Retired tables (`flashcard_*` n/a) — none authored; FACT `books`/`book_chapters` reshaped not duplicated.
- [ ] 3 net-new enums in `@vida/types/learning.ts` + Zod (`validators/learning.ts` — append); parity rows added.
- [ ] `ENTITY_TYPES += book·book_chapter·book_bookmark·book_quote` (4).
- [ ] Phase-5 DDL-introspection test (all 4 dims × 10 tables); `@vida/core` green; typecheck 11/11; eslint 0.
- [ ] §XXIX `database-layer/current-*` promoted (BR-BK-1…7).

## §5. No-Decisions verification (doc-FIXED FACTs — not calls)
Every point that could read as a "decision" is doc-closed (the Phase-1 No-Decisions Gate):
1. **reading_plans NO measurement axes** — `[FACT: rerun C-M1 books.md:71,79 "Books NOT in L240 … Purpose/target-owned … do NOT assert a stored measurement_kind"]`. The Skills pattern.
2. **`book_assets.native_position` = one plain field per asset** — `[FACT: BK-1 positions plaintext; BK-2/structure-data:20 "one native position"; conventions:7 single source]`.
3. **`books` retentions/retirements** — `[FACT: BK-2 format→assets · BK-3 current_page→asset + progress→nullable · BK-16 genre/tags→entity_tags · BK-17 total_pages kept for TOC-only planning]`.
4. **mapping (BK-4) + conflict (BK-8) OUT** — `[FACT: business-rules:136 "design pass required"; BK-8 rule→Preferences + state-map:38 derived]`.
5. **3 separate annotation tables** — `[FACT: structure-data:22-24 + BK-6 distinct capabilities; rerun:15/28/151 "3 annotation types"]`.
6. **book_chapters UNIQUE kept** — `[FACT: §Books L2501; the one doc-fixed constraint, unlike the No-Guessing "no invented UNIQUE" rule]`.

## §5b. Preflight folds (completeness — applied)
- **P-1 — parity = 4 CHECK columns = 4 tuples** (single-use: BOOK_STATUS, BOOK_ASSET_FORMAT, READING_PLAN_ARRANGEMENT,
  READING_PLAN_GOAL_TYPE). `books.rating` numeric BETWEEN — not a row. Fixture + `migration023Books.up` wired in `enum-parity.test.ts`.
- **P-2 — enum home:** the 3 net-new tuples APPEND to existing `@vida/types/learning.ts` (alongside `BOOK_STATUS`/`BOOK_FORMAT`);
  Zod appends to existing `validators/learning.ts`. Not new files.
- **P-3 — `deleted_at` exceptions verified against base** — base `sessions` HAS `deleted_at` (sessions.ts:41), so the
  extension `reading_sessions` correctly carries none; `book_chapters` omits it per its FACT floor + "no soft delete". The
  introspection test enforces mirror≡migration (both omit it for those 2).
- **P-4 — indexes** on hot refs: `idx_book_chapters_book` · `idx_book_assets_book` · `idx_book_bookmarks_book` ·
  `idx_book_highlights_book` · `idx_book_quotes_book` · `idx_reading_sessions_book` · `idx_reading_plan_books_plan` ·
  `idx_book_subjects_book` (`reading_sessions.session_id` already indexed by UNIQUE). Engineering convention.
- **P-5 — no invented UNIQUE** beyond the doc-fixed `book_chapters(book_id, chapter_number)`. The junctions
  (`reading_plan_books`, `book_subjects`) get NO composite UNIQUE (roster-silent; No-Guessing — dedup is app-layer).
- **P-6 — `BOOK_FORMAT` (physical/ebook/audiobook) is now STALE** (books drops `format`; `book_assets` uses the net-new
  `BOOK_ASSET_FORMAT`). Leave `BOOK_FORMAT` + `BookFormatSchema` in place → DB-11 interface reconcile (don't remove now —
  the row-interface staleness precedent).
- **P-7 — P5 test:** `db/tests/books-introspection.test.ts`, mirroring Skills/Knowledge (4 dims × 10 tables; the 2
  no-`deleted_at` tables are covered by the column-set + nullability dims).

## §6. Out of scope (explicit)
Base `sessions` spine (ADR-004) · cross-format mapping/anchors (BK-4 design pass) · conflict state (BK-8, Preferences+derived)
· the Purpose target measurability (C-M1) · ISBN/OCR/TTS/transcription X*/AI* service · quote-embed editor block · Education
pacing + Calendar reconciliation · photos (`note_attachments`) · E2/grant (C-E2) · AI4 (C-AI4) · `@vida/types` row-interface
reconcile → **DB-11**. All cited, none authored.
