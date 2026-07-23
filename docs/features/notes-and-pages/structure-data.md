<!-- Structure & Data — features/notes-and-pages · /documentation Phase 2 · realigned Part 1.2 (2026-07-23) · sources: ADR-002 §5.2 · ADR-006 · ADR-004 · ADR-007 · ADR-003 · note.ts · REPO.md -->

# Structure & Data — Notes & Pages  (level: Feature)

> **Subject to:** ADR-006 (universal tags + open taggable-type registry) · ADR-004 (sessions supertype) · ADR-007 (saved views) · ADR-002/003 (data model + sync). Realigned to the two-tier **As-is (FACT floor) / [INTENT] Intended** rail (R6): the FACT floor records the schema as the code has it **today**; `[INTENT]` retires it toward the foundation. Conceptual owners are cited; **physical code/directory homes are `[DEFERRED — Part 2]`**.

## As-is (FACT floor) — 6 owned tables, current schema `[FACT: ADR-002 §5.2 L1266-1458; note.ts]`

> What the code/schema defines **today**. Retired tokens below are corrected in `[INTENT]`, not deleted (R6 requires the floor to state the present).

| Table | Purpose | Encrypted `[E]` fields | Key constraints |
|---|---|---|---|
| `pages` | the polymorphic page (6 `type` values) | `title`, `content`, `cover_image`, `summary_config` | `type` CHECK (6); partial UNIQUE `journal_date` where `type='journal'`; `parent_id`→pages SET NULL |
| `page_links` | wiki-style bidirectional page↔page | `context` | `UNIQUE(source_page_id, target_page_id)`; both FKs CASCADE |
| `entity_links` | page→entity cross-domain backlink | `context` | `entity_type` CHECK (33); `UNIQUE(page_id, entity_type, entity_id)`; `page_id` CASCADE |
| `tags` + `page_tags` | shared tags with color | `tags.name` (UNIQUE) | `page_tags` PK `(page_id, tag_id)`, both CASCADE |
| `note_attachments` | encrypted file blobs + thumbnail | `filename`, `encrypted_blob`, `thumbnail_blob` | `page_id` CASCADE |
| `pomodoro_sessions` | focus timer | — (all structural/numeric) | `page_id`→pages SET NULL; `entity_type` CHECK (5) |

- Every table carries the standard sync metadata (`_sync_id` UNIQUE, `_sync_version`, `_sync_device_id`, `_sync_lww_ts`, `_sync_status`, `_sync_hash`) and soft-delete where applicable. `[FACT: ADR-002 §5.2; CLAUDE.md Conventions]`
- `pages.content` is the only Yjs-CRDT-synced column; all other columns sync via LWW. `[FACT: ADR-003; note.ts L91]`
- **Indexes** `[FACT: ADR-002 L1305-1309, L1333, L1367, L1426, L1456-1457]`: `idx_pages_{type,journal_date,entity,deleted}`, `idx_pages_journal_unique` (partial), `idx_page_links_target`, `idx_entity_links_entity`, `idx_attachments_page`, `idx_pomodoro_{page,entity}`.
- **Full-text search**: `fts_pages` FTS5 virtual table, rebuilt on vault unlock (content is encrypted at rest, so the index is local + ephemeral). `[FACT: ADR-002 L3641 CREATE VIRTUAL TABLE fts_pages; ADR-002 §FTS5]`

## [INTENT] — Intended model (subject to ADR-006 · 004 · 007)

- **Tagging → universal `entity_tags` (ADR-006 §3.1/§3.2 — SP1).** The page-only `tags` + `page_tags` model is **retired**. Tagging is the universal primitive **`entity_tags(tag_id, entity_type, entity_id)`**; per ADR-006 §3.1 **N&P becomes a *consumer* — it no longer owns a tag junction.** `[INTENT: ADR-006 §3.1/§3.2]`
- **Nestable tag definition (ADR-006 §3.2 — SP3).** The tag-definition row carries **`parent_tag_id`** (nestable `#a/b`) + metadata `name [E]` · `color` · `icon` · `description [E]`. `[INTENT: ADR-006 §3.2]`
- **Open taggable-type registry (ADR-006 §3.2/§3.3 — SP2/SP4).** `entity_links.entity_type` is validated against the **open registry** (new types *register*), not a fixed `CHECK(33)`. `entity_tags` (grouping) and `entity_links` (typed reference) stay **distinct** and **both** draw `entity_type` from that one registry. `entity_links` remains N&P-described — ADR-006 opens its CHECK, it does not reassign the table's owner. `[INTENT: ADR-006 §3.2-3.3]`
- **Pomodoro re-homes to the Sessions realm (ADR-004 §3.1 — S1).** `pomodoro_sessions` is **retired**; the `/pomodoro` block is a **widget-lens** onto the **`focus_sessions`** extension of the **`sessions`** supertype, keyed by **`session_id`** with the base `sub_type` discriminator (the discriminator *value* is `[UNKNOWN — build-phase]` — ADR-004 names the table + column, not the value). `idx_pomodoro_*` drop from the forward index set. See `[[../pomodoro/structure-data]]`. `[INTENT: ADR-004 §3.1; reframe 2026-07-15]`
- **Intended owned tables (reframe, NOT a re-counted schema assertion).** With the tag junction retired-to-substrate and pomodoro re-homed, N&P owns **`pages` · `page_links` · `entity_links` · `note_attachments`**. The physical package home of `entity_tags` (and the `focus_sessions` extension) is `[DEFERRED — Part 2]`; the schema-level table-count reconciliation is DB-11's job (ADR-016). `[INTENT: ADR-006 §3.1; ADR-016 DB-11]`
- **007 saved views — `[INTENT — DEFERRED]`.** The collection-view renderers are selectable by an ADR-007 **`views`** row; the saved-view-primitive reframe is pulled to a dedicated views/Spaces pass and is **not** reframed here. `[INTENT — DEFERRED: ADR-007; per Victor 2026-07-23]`

## State management map `[INTERP: ADR-001 state decision — modules not yet coded]`
- **React Query (v5)** owns DB-derived async state: page lists, a single page, backlinks, summary results, search results — keyed by `(type|id|entity|journal_date)`; invalidated on local writes. `[FACT: ADR-001 State; REPO.md]`
- **Zustand** owns ephemeral client UI state: active page id, editor selection/focus, open view (calendar/list/gallery/neural — the renderer selected by the active `views` row `[INTENT — DEFERRED: ADR-007]`), pomodoro timer tick, `[[`-picker open state. `[FACT: ADR-001 State]`
- Editor document state is held by **TipTap/ProseMirror + Yjs doc**, not Zustand — the CRDT is the source of truth for `content`. `[FACT: ADR-003; ADR-001 Editor]`

## Page / route map `[FACT: REPO.md apps; CLAUDE.md §8 views]`
- Per-page routes: journal → `journal/[date]`, any page → `note/[id]` (mobile confirmed: `app/journal/[date].tsx`, `app/note/[id].tsx`).
- Collection views: List · Gallery · Calendar · Neural Graph — **renderers selectable by an ADR-007 `views` row; the saved-view primitive reframe is `[INTENT — DEFERRED]`** (per Victor 2026-07-23). View availability by type `[INTENT G3]`: **Journal** → Calendar · List · Gallery; **Note** → List · Gallery · Neural. Entity-attached notes (`task_note`, …) are reached from their parent entity's page, not a standalone collection. `[INTERP: NP-8 + CLAUDE.md]`

## Dependencies / graph
- **In-degree 14** — the hub; 14 modules link into it. **Out-degree (structural): 0** — foundational, documented first per fill order. `[FACT: docs/core/architecture/module-dependency-graph.md; docs/README.md fill order]`
- Read-only consumption of other modules for `/summary` and the NP-8 seed flows through documented integration points, not FK ownership (see contract.md). Respects the coupling budget — no direct cross-module table access (constitution §6). `[FACT: core business-rules §6]`

## Single source of truth (constitution §3)
- `PageType` (6) and `JournalSummaryConfig` — declared **once** in `@vida/types/note.ts`; SQL CHECK mirrors them; canonical Zod validators live in `@vida/core`. Never re-declared per app. `[FACT: note.ts; packages/types/src/CLAUDE.md; CLAUDE.md Conventions]`
- `EntityLinkTarget` (33) → **retired** to the open taggable-type registry (ADR-006 SP2); `entity_type` is no longer a fixed enum owned here. `PomodoroType`/`PomodoroStatus`/`PomodoroEntityType` → **re-home** to the Sessions realm with the `focus_sessions` extension (ADR-004 S1). `[INTENT: ADR-006 §3.2; ADR-004 §3.1]`

## ADRs / structural decisions
- **ADR-006 §3.1-3.3** — universal `entity_tags`, nestable `parent_tag_id`, open taggable-type registry (N&P is a consumer of the tag primitive). **ADR-004 §3.1** — pomodoro re-homes to the `sessions` supertype (`focus_sessions`/`session_id`). **ADR-007** — saved views as `views` rows (`[INTENT — DEFERRED]`).
- **ADR-002 §5.2** — the As-is data model above (authoritative for the FACT floor). **ADR-003** — Yjs CRDT for `content`, LWW for structured columns. **ADR-001** — TipTap editor, Zustand+React Query state, Sigma.js neural graph.
- ⚠ **Surfaced decision (G5):** expanding `JournalSummaryConfig` from 5 → the full personalizable section set is a type/schema change — candidate for `/adr-new` in Phase 4. `[INTENT G5]`

## Completion checklist
- [x] two-tier As-is (FACT floor) / [INTENT] split (R6) · [x] SP1/SP2/SP3/SP4 retired to forward tokens · [x] S1 pomodoro re-home finished · [x] conceptual owners cited, code homes deferred · [x] `pages.type CHECK(6)` preserved · [x] 007 flagged (deferred) · [x] dep graph (within budget) · [x] state + route map · [x] [FACT/INTERP/INTENT] on each claim
