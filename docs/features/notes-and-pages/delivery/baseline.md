<!-- Entity Delivery Flow · Step 1 (BASELINE) · Notes & Pages · base flow (§3).
     ONE consolidated map of the entity across THREE planes (data · service · UI), as-is. Baseline ORGANIZES
     the raw sources (the 5 aspect docs + the shipped DB-4 schema + the delivery-plan §9 ownership); it does NOT
     interpret (that is Step 1.5) and does NOT decide (owners are doc-fixed — see delivery/intake.md §5).
     No-Guessing: every claim is [FACT: src] / [INTENT: src] / [UNKNOWN]. Feeds the ░Documentation Gate░ (Step 1.25). -->

# Baseline — Notes & Pages (consolidated data + service + UI map)

**Sources organized here:** the 5 aspect docs (`identity`/`business-rules`/`contract`/`structure-data`/`conventions`)
· the shipped DB-4 schema (`schema/notes.ts` + `schema/foundation/spaces.ts`) · the DB-9 validators
(`validators/note.ts`) · `@vida/types/note.ts` · the ownership ledger (`delivery/intake.md §5`, from `m1.1-delivery-plan §9`).

## 0. The entity in one paragraph
Notes & Pages is the platform's **integration hub (in-degree 14, out-degree 0)**: one polymorphic `pages` table +
its wiki-link (`page_links`) and attachment (`note_attachments`) satellites, rendered through the `@vida/editor`
TipTap block editor, and cross-linked to every other module via the AR-6 `entity_links`/`entity_tags` substrate. It
is the daily dashboard (journals) and the connective web (`[[wiki-links]]` + backlinks + neural graph). `[FACT:
identity.md; structure-data.md §dep-graph]` It is **not** collaborative, **not** server-aware (ZK), **not** an open
page-type system (6 fixed types), **not** slug-based (links resolve by `target_page_id`). `[FACT: identity.md "What it is NOT"]`

---

## 1. DATA plane — the shipped schema (as-is code) + the foundation model

### 1.1 Owned tables — `schema/notes.ts` (DB-4 group #1, migration `012_notes.ts`)
| Table | Purpose | `[E]` fields (M1.0 pass-through) | Constraints (SQL-migration-only) |
|-------|---------|----------------------------------|----------------------------------|
| `pages` | polymorphic page, 6 `type` values | `title` · `content` · `cover_image` · `summary_config` | `type` FIXED CHECK (PAGE_TYPE); partial-UNIQUE `journal_date` where `type='journal'` (NP-2) |
| `page_links` | wiki page↔page | `context` | UNIQUE(`source_page_id`,`target_page_id`) (NP-5) |
| `note_attachments` | encrypted file blobs + thumbnail | `filename` · `encrypted_blob` · `thumbnail_blob` | — |

**`pages` columns** `[FACT: notes.ts:36-67]`: `...baseColumns` (UUIDv7 id, created_at, updated_at, `_sync_*`) ·
`type`(default `note`) · `title`[E] · `content`[E] (TipTap JSON, **Yjs-CRDT** synced) · `parent_id`(self-ref, no FK) ·
`entity_type`(**OPEN**, registry-validated, no CHECK) · `entity_id` · `journal_date`(YYYY-MM-DD, journal only) ·
`is_favorite` · `is_archived` · `icon` · `cover_image`[E] · `summary_config`[E] (plain `text()`, app-stringified) ·
`has_pomodoro`(plaintext filter flag) · `word_count` · `deleted_at`. Row types: `PageRow`/`PageLinkRow`/`NoteAttachmentRow`.
Indexes (query mirror): `idx_pages_{type,journal_date,entity,deleted}` · `idx_page_links_target` · `idx_attachments_page`.
**`page_links` columns** `[FACT: notes.ts:70-82]`: `...baseColumns` · `source_page_id`(no FK) · `target_page_id`(no FK) · `context`[E] · `deleted_at`.
**`note_attachments` columns** `[FACT: notes.ts:85-101]`: `...baseColumns` · `page_id`(no FK) · `filename`[E] · `mime_type`(plaintext) · `encrypted_blob`[E] · `thumbnail_blob`[E] · `size_bytes`(plaintext) · `deleted_at`.

### 1.2 Consumed tables — `schema/foundation/spaces.ts` (AR-6, **NOT notes-owned**)
- `entity_links` — page→entity typed cross-domain ref: `page_id`, `entity_type`(OPEN), `entity_id`, `context`[E]; UNIQUE(page_id,entity_type,entity_id); idx (entity_type,entity_id). `[FACT: spaces.ts; notes.ts:6-8 header]`
- `entity_tags` — universal tag assoc: `tag_id`, `entity_type`(OPEN), `entity_id`. Notes **reads**; AR-6 owns writes.

### 1.3 Sync / crypto / CRDT
- `pages.content` = the **only Yjs-CRDT** column; all other columns sync **LWW** (NP-4). `[FACT: ADR-003; notes.ts:43]`
- All `[E]` fields are the **M3 target**; M1.0 Repository registers an **empty `[E]` set → pass-through** (BR-DB6-3). `[FACT: notes.ts:27-29]`
- `_sync_*` metadata + soft-delete `deleted_at` on every table. FTS5 `fts_pages` (rebuilt on vault unlock) = DB-8 engine, not here.

### 1.4 ⚠ Data-plane coherence findings (for the Documentation Gate)
- **C1 — the aspect `structure-data.md` As-is "FACT floor" lags the shipped code.** It lists the *original ADR-002*
  6-table model (`tags`+`page_tags`, `entity_links` CHECK-33, `pomodoro_sessions`) as "FACT floor" and the realigned
  model as `[INTENT]`. **DB-4 shipped the `[INTENT]`:** `notes.ts` = 3 tables; `entity_links`/`entity_tags` live in
  `spaces.ts` (OPEN registry, no CHECK-33); `pomodoro_sessions` retired → `focus_sessions` (Sessions realm). So the
  doc's `[INTENT]` **is** the current code; its "As-is floor" is now historical. `[FACT: notes.ts vs structure-data.md:11-18]`
- **C2 — interface divergence (homed DB-11).** `@vida/types` `PageLink`/`NoteAttachment` extend `SyncMetadata`
  (created_at only) while the schema uses full `baseColumns` (+updated_at). Same divergence already shipped for
  `entity_links`. Reconcile = DB-11, **not** this entity. `[FACT: notes.ts:19-22]`
- **C3 — `JournalSummaryConfig` = 5 toggles shipped**, full personalizable menu is `⚠ INTENDED` → M1.4 (G5). `[FACT: note.ts:83-89; business-rules.md G5]`

---

## 2. SERVICE plane — the ① surface (designed; to be rebuilt)

The ① increment authors a `@vida/core` Notes & Pages service over the shipped schema. Contract (from `contract.md`,
mapped to the `m1.1-delivery-plan §9` ① scope):

### 2.1 Exposed API `[FACT: contract.md §Exposed surface + §9 ① scope]`
- **Pages:** `getPage` · `createPage(type,…)` · `updatePage(id,patch)` · `softDeletePage` · `getPagesByType` ·
  `getPageByJournalDate` (NP-2) · `getPagesForEntity(entity_type,entity_id)` · `listPages({favorite,archived,tag})`.
- **Linking:** `createPageLink(source,target,context?)` · `createEntityLink(page_id,entity_type,entity_id,context?)` ·
  `getBacklinks(entity_type,entity_id)` (merged page_links + entity_links, G6 tentative) · `resolveWikiLink(text)` (`[[` candidates + create-on-miss, G2).
- **Tags (reads):** `getEntitiesByTag` / tag-for-entity lookup — **net-new ① read** over `entity_tags`. AR-6 `SpacesService` exposes tag/link **WRITES only** (`createTag`/`tagEntity`/`untagEntity`/… — **no read method**, verified `foundation/spaces/service.ts:40-60`); the read query is authored here. Writes delegate to AR-6. `[FACT: spaces/service.ts:40-60]`
- **Attachments:** `addAttachment(page_id,file)` · `getAttachments(page_id)`.
- **Summary:** `buildJournalSummary(date,config)` — reads enabled sections; the `summary(date)` **registry engine is MOD-journals ①** (Notes consumes; owns `summary_config` storage).

### 2.2 Typed errors `[FACT: contract.md §error cases]`
`JournalExistsError` (NP-2) · `UnregisteredEntityTypeError` (NP-6/SP2) · `DuplicateLinkError`-or-idempotent-no-op (NP-5).

### 2.3 Delegation / consumption (do NOT rebuild — `intake.md §5`)
- entity-link + tag **WRITES** → AR-6 `SpacesService.createLink/removeLink/tagEntity/untagEntity` (idempotent, registry-validated).
- entity-link **READS** → AR-8 `BacklinkResolver.getBacklinksTo/getLinksFrom/resolveLink`.
- **page_links READS** (page↔page) = **net-new here** — deferred from AR-8 → M1.1. `[FACT: backlink-resolver.ts:11-15]`
- Data-flow (every method): **validate (Zod) → repository → encrypt-seam (empty in M1.0) → return Row**. `[FACT: db/CLAUDE.md; data-flow.md]`

### 2.4 Net-new vs delegate (the ① real work = the glue)
NET-NEW: `pages` CRUD (6 types + `JournalExistsError`) · `page_links` create+read (idempotent) · `resolveWikiLink` +
create-on-miss · entity-note auto-seed (NP-8, client-deterministic) · today `/summary` 5-section · `note_attachments`
CRUD · **`entity_tags` read query** (`getEntitiesByTag` — AR-6 ships no tag-read, B1) · the FACADE composing AR-6
(link/tag **writes**) + AR-8 (backlink reads).

---

## 3. UI plane — the ② surface (designed; to be rebuilt)

The ② increment authors the `/notes` route + screens composing the M1.0-built blocks/views/editor. `[FACT: §9 ② scope; identity.md]`

### 3.1 Page types (6, FIXED) `[FACT: identity.md; note.ts PAGE_TYPE]`
`journal` · `note` · `task_note` · `task_group_note` · `milestone_note` · `deliverable_note`.

### 3.2 Platform blocks (12) `[FACT: identity.md; CLAUDE.md §8]`
`/summary` `/tasks` `/events` `/classes` `/habits` `/timeline` `/chart` `/pomodoro` `/entity-link` `/backlink`
`/class-notes` `/milestone` (+ all standard ProseMirror blocks). Custom TipTap extensions live in `@vida/editor`
(`entityLink`/`backlink` currently E5 **placeholder** nodes — MOD-notes wires the real registry, ADR-008).

### 3.3 Views (4) + availability by type `[FACT: structure-data.md:41; identity.md]`
Calendar · List · Gallery · Neural Graph. Availability (G3): **journal** → Calendar·List·Gallery; **note** →
List·Gallery·Neural; entity-attached notes reached from their parent's page, not a standalone collection. Renderers
are **hard-coded** in ②; ADR-007 saved-view **selection** = deferred design-pass. Views ship in `@vida/ui` (UI-2).

### 3.4 Routes `[FACT: structure-data.md:39-41; routes.tsx]`
Per-page: `note/[id]`, `journal/[date]`. Collection: the `/notes` route (AR-4 `<h2>` stub → ② replaces + keeps
`notesRoute`/`graphRoute`). Web-first; mobile screens are stubs (OUT, `intake.md §5`).

### 3.5 State `[FACT: structure-data.md:34-37; ADR-001]`
- **React Query v5** — DB-derived async (page lists, single page, backlinks, summary, search), keyed by (type|id|entity|journal_date), invalidated on write.
- **Zustand** — ephemeral UI (active page id, editor selection/focus, open view, `[[`-picker open state).
- **TipTap/ProseMirror + Yjs doc** — `content` source of truth (NOT Zustand).

---

## 4. Cross-plane invariants (NP-1…NP-9) `[FACT: business-rules.md]`
| # | Rule | Enforced in |
|---|------|-------------|
| NP-1 | No inline `notes` columns — all via `pages` polymorphic | data (schema) + conventions |
| NP-2 | One journal per date (partial UNIQUE) | data (SQL) + service (`JournalExistsError`) |
| NP-3 | Sensitive fields `[E]` client-side | data (`[E]` set; M1.0 pass-through) |
| NP-4 | `content` is a Yjs CRDT, not LWW | data (sync) + UI (editor) |
| NP-5 | Links unique + id-based (idempotent) | data (UNIQUE) + service (idempotent create) |
| NP-6 | Entity links target a **registered** type | service (registry validate) — via AR-6 |
| NP-7 | Wiki-links resolve by page id, not text/slug | service (`resolveWikiLink`) + UI (`[[` picker) |
| NP-8 | Entity notes auto-exist, never blank, client-deterministic seed | service (`ensureEntityNote`) |
| NP-9 | Soft deletes; relationships cascade (service-driven, no FK) | data + service |

## 5. Terminal states (the tail where bugs live) `[FACT: business-rules.md §terminal states]`
7 capabilities × {loading·empty·error·success} enumerated: Page list/views · Block editor · Journal `/summary` (per-
section degrade) · `[[` picker (create-on-miss) · Backlinks panel · Neural graph · FTS search. Fail-loud, scoped: a
failing `/summary` source degrades **that section only**; create-on-miss is explicit. These become ② Visual-Gate MUSTs.

## 6. Seam map — OWNS / CONSUMES / DELEGATES
- **OWNS:** `pages` · `page_links` · `note_attachments` (schema) + the Notes service + the `/notes` UI + the **`entity_tags` read query** (AR-6 owns tag **writes** only — no read method; B1).
- **CONSUMES (read):** AR-8 `BacklinkResolver` (entity-link reads) · `@vida/editor` · `@vida/ui` views · `@vida/core` Repository.
- **DELEGATES (write):** entity-link + tag writes → AR-6 `SpacesService`.
- **PROVIDES (seam):** `summary_config` storage + `/summary` block surface → MOD-journals engine; the journal `entry` editor mount → Home.

## 7. As-is ↔ [INTENT] rail (R6) — shipped vs foundation
| Axis | Shipped (DB-4 code = current) | Original ADR-002 As-is (now historical) |
|------|------------------------------|------------------------------------------|
| tag junction | `entity_tags` universal (AR-6), N&P consumer | `tags`+`page_tags` page-only |
| `entity_type` validation | OPEN registry (SP2), no CHECK | fixed CHECK(33) `EntityLinkTarget` |
| pomodoro | `focus_sessions` (Sessions realm), `/pomodoro` = lens | `pomodoro_sessions` Notes-owned |
| entity_links home | `spaces.ts` (AR-6), N&P-described | `notes` §5.2 table |
> The shipped code already realizes the foundation `[INTENT]`. The aspect `structure-data.md` "As-is floor" describes the pre-realignment code and should be read as historical (finding C1).

## 8. Coherence findings (░Documentation Gate░ Step 1.25 — RAN 2026-08-23, REVISE→resolved)
1. **C1** — aspect `structure-data.md` As-is floor lags shipped code (records original 6-table ADR-002; code shipped the realigned model). *Not a defect — a doc-currency lag to acknowledge; the code + intake §5 are the true as-is.* `[gate-verified accurate]`
2. **C2** — `@vida/types` PageLink/NoteAttachment `SyncMetadata` vs schema `baseColumns` divergence → **homed DB-11**, not this entity.
3. **C3** — `JournalSummaryConfig` 5 vs full menu → **homed M1.4** (G5).
4. **C4** — `getBacklinks` "merged page_links + entity_links" is marked **G6 tentative** in contract.md; page_links reads are net-new here → the ① service spec resolves the merge shape (homed to ①, not open).
5. **C5 (gate M1)** — `@vida/types` `EntityLink.entity_type` is still the **closed** `EntityLinkTarget` union (`note.ts:130`) + `EntityLinkTargetSchema` (`validators/note.ts:11`) while the schema + AR-6 registry are **OPEN** (SP2). A type-layer lag (same class as C2). **① MUST validate `entity_type` against the runtime registry, NOT `EntityLinkTargetSchema`** — else the registry silently re-closes. Interface widening = DB-11. `[FACT: note.ts:130; validators/note.ts:11 vs spaces.ts:56]`
6. **C6 (gate M3)** — `business-rules.md:17` NP-9 cites `ON DELETE CASCADE`/`SET NULL` **FK clauses** `[FACT: ADR-002]`; shipped schema has **NO FK** (N-R1, `notes.ts:45,74-75,89`). Cascade/orphan is **service-driven** — a real ① obligation, not a DB guarantee. Same historical-floor class as C1. `[FACT: notes.ts vs business-rules.md:17]`
7. **[UNKNOWN — Sessions realm, not Notes]** `focus_sessions` `sub_type` discriminator value is build-phase — irrelevant to this entity (the `/pomodoro` block is a consuming lens only).
> **Gate outcome:** REVISE → all fixed (B1 tag-read mis-home corrected §2.1/§2.4/§6 + intake §5; M1→C5; M2 satellite columns §1.1; M3→C6). Ownership fidelity, residue-quarantine, and No-Guessing all passed clean on first gate. All findings are doc-currency notes or already-homed — **none is an open decision for the human** (intake §5). Re-gate = SHIP-ready.
