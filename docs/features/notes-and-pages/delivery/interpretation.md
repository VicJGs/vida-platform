# Interpretation Layer — mod-notes-and-pages ① (backend service)

> Entity Delivery Flow (v1) Step 1. Make the implicit explicit BEFORE decomposing. Every claim is
> `[FACT: path:line]` / `[INTERP: from fact]` / `[UNKNOWN: needs X]` (No-Guessing Principle).
> Scope: the `@vida/core` **Notes & Pages service** (`packages/core/src/services/notes/`) — the in-degree-14
> connective HUB — built OVER the finished DB-4 schema. Authority: `docs/specs/foundation/backend-intent/parts/notes-and-pages.md`
> (NOT-01…54). This is a **Ratify** of that decomposition, not a re-derivation.

---

## 0. BASELINE — what already exists on `main` (do NOT rebuild)

- [FACT: packages/core/src/db/schema/notes.ts:42-107] Schema present — **3 tables**: `pages` (22 cols, 5 indexes incl. partial-UNIQUE), `page_links` (UNIQUE(source,target)), `note_attachments` (BLOB). Migration `033_notes.ts` matches (v33).
- [FACT: packages/types/src/note.ts:23-135] Types present — `PAGE_TYPE` (6, FIXED), `ENTITY_LINK_TARGET` (32, OPEN reference-set — NOT a CHECK), `JournalSummaryConfig` (5 toggles), `Page`/`PageLink`/`NoteAttachment` interfaces.
- [FACT: packages/core/src/validators/note.ts] Validators present — `PageTypeSchema`, `createPageSchema` (with NP-2 `journal_date` refine), `updatePageSchema` (`.strict()` whitelist). Torn down at `eaf64f8`, **rebuilt at `7a2a2a4`** (backend-replan P2) — the survival discrepancy is resolved: current file is the P2 rebuild, not the pre-teardown original.
- [FACT: `ls packages/core/src/services/notes/`] Service **ABSENT** — this unit's clean-create target (`service.ts`/`types.ts`/`index.ts`).
- [FACT: docs/modules/] No `current-*` docs for notes yet (only `journals`, `preferences`) → this unit BIRTHS them (D6 / §XXIX). The old `docs/specs/features/mod-notes/_index.md` (marked "implemented") = SHAPE reference only (torn down).

---

## 1. DEPENDENCIES — what the service composes (never re-implements)

The hub's whole design is delegation. Two HARD boundaries [FACT: notes-and-pages.md:9-10]:

| Dependency | Direction | What the service does | Source |
|-----------|-----------|----------------------|--------|
| **Repository layer (db-6)** | owns | page/page_link/attachment CRUD via `createRepository(db, table, {deviceId, encryptedFields:[], softDelete:true})` | [FACT: packages/core/src/db/repository.ts:176-240] |
| **AR-6 `SpacesService`** | delegates WRITES | `entity_links` + `entity_tags` + `tags` writes — `createEntityLink`/`removeEntityLink`/tag ops are FACADES to Spaces | [FACT: notes-and-pages.md:22-23,28,36-37; foundation/spaces/service.ts:158-192] |
| **AR-8 `BacklinkResolver`** | delegates READS | `entity_links` reads — `getBacklinks`/`getEntityLinksFrom` call `getBacklinksTo`/`getLinksFrom`/`resolveLink` | [FACT: notes-and-pages.md:24-25,38-39; services/search/backlink-resolver.ts:23-30] |
| **`TaggableTypeRegistry` (AR-6/ADR-006 SP2)** | injected, validates | every written `entity_type` validated (open registry, not a CHECK) → `UnregisteredEntityTypeError` | [FACT: notes-and-pages.md:20,34; note.ts:33-36] |
| **MOD-journals service** | boundary | Notes owns ONLY `summary_config` storage (a `pages` column); the `/summary` aggregation ENGINE is journals | [FACT: notes-and-pages.md:11,32,46; services/journals/service.ts:43-119] |
| **sync_queue (ADR-004)** | co-transactional | every mutation enqueues via `repository.createInTx`/soft-delete → `operation` UPSERT | [FACT: repository.ts:267-293] |

**Consumers (in-degree 14, out-degree 0)** [FACT: notes-and-pages.md:3]: Tasks, Projects (milestones/deliverables), task-groups, and every entity-owning module call `ensureEntityNote` + `getPagesForEntity`; every taggable module rides the shared registry. The service is a foundation Wave-0 unit — nothing it depends on is unbuilt (all 4 task blockers done).

---

## 2. NEEDS — the ① surface this unit MUST deliver (ratified from NOT-01…54)

Rows whose `boundary` = `service` (or the service half of a SPLIT) AND `home` = notes-service, NOT deferred:

- **Page CRUD** [NOT-01…08]: `createPage` · `getPage` · `updatePage` (`.strict()` whitelist, journal identity immutable) · `softDeletePage` · `getPageByJournalDate` · `getPagesByType` · `getPagesForEntity` (polymorphic reverse-lookup, YES cross-cutting) · `listPages({favorite?,archived?})`.
- **NP-2 journal uniqueness** [NOT-09/10]: `createPage({type:'journal'})` pre-checks `getPageByJournalDate`; live clash → `JournalExistsError` (never silent overwrite; in-service, SQL partial-UNIQUE is a backstop).
- **Entity-note auto-seed** [NOT-11/12]: `ensureEntityNote(pageType, entityType, entityId, seed)` idempotent; seed `content` is a PURE function of passed parent fields (stable key order, no `Date.now`/random; ZK-1 — no plaintext egress).
- **Page-links** [NOT-14…17]: `createPageLink` (idempotent: live no-op / soft-deleted revive / absent create) · `removePageLink` · `getPageLinksFrom`/`getPageLinksTo` (each appends `isNull(deleted_at)`). NP-5 UNIQUE(source,target).
- **Wiki-link resolution** [NOT-18]: `resolveWikiLink(text)` → title-LIKE candidates for the `[[` picker; caller binds a concrete `target_page_id` (NP-7: links by id, survive rename). Create-on-miss compose [NOT-19] = service stub-`note` create + link (picker UI is ②).
- **Entity-type registry validation** [NOT-20/21]: `assertRegistered(entityType)` against injected registry → `UnregisteredEntityTypeError`.
- **Entity-link facade** [NOT-22…25]: `createEntityLink`/`removeEntityLink` → AR-6 (writes); `getBacklinks`/`getEntityLinksFrom` → AR-8 (reads). ① `getBacklinks` returns entity-links (+ page-links local); the page+entity MERGE shape is **G6-tentative** → ② design-pass.
- **Entity-tag reads** [NOT-26/27]: `getTagsForEntity` · `getEntitiesByTag` (reads; AR-6 owns writes). Tag WRITE surface [NOT-28] delegated to AR-6.
- **Attachments** [NOT-29…31]: `addAttachment` · `getAttachments` · `removeAttachment` (soft-delete).
- **`summary_config` storage** [NOT-32]: read/write the `pages.summary_config` column via `updatePage` — the ENGINE is journals; ① does NOT aggregate.
- **Page metadata** [NOT-46/47]: `has_pomodoro` + favorite/archive/icon/cover via `updatePage`; the first two feed `listPages` filters.
- **Soft delete** [NOT-39]: all deletes soft via `deleted_at` (repository `softDelete:true` → `operation:'update'` enqueue). Hard-delete cascade mechanics DEFERRED (Part 2).

---

## 3. ORGANIZATION — the file & construction shape

- [FACT: notes-and-pages.md:57 (NOT-43); memory: factory-service-no-this] **Factory-object service**: `createNotesService(deps: NotesServiceDeps): NotesService` returns an object literal; NO `this.` — intra-service calls use hoisted closures (survives destructured consumption ②). Deps INJECTED: `{db, deviceId, spaces, backlinks, registry}`.
- [FACT: services/journals/service.ts:29-43; sessions/service.ts:107-116] Mirrors the live 3-service canon (journals/sessions/preferences): per-table `createRepository`, deps interface, typed errors `extends Error` with stable `.name`.
- [FACT: notes-and-pages.md:56 (NOT-42)] **Async-rejection contract**: validating methods (`createPage`/`updatePage`/`createEntityLink`) are `async` so Zod/registry failure is a Promise rejection, never a sync throw.
- Files: `packages/core/src/services/notes/{types.ts, service.ts, index.ts}` + tests. Types first, then service, then barrel [FACT: scenario default.md:32-33 Step 7 order].
- Errors [NOT-10/21/(15)]: `JournalExistsError(journalDate)`, `UnregisteredEntityTypeError(entityType)`, and (if surfaced) `DuplicateLinkError`. `ServiceError` divergence [NOT-44] → DB-11 reconcile (follow live bespoke-Error precedent now).

---

## 4. IMPLICIT RULES — the backend deps that surface as runtime crashes, not review comments

The interpretation layer's whole point (scenario anti-pattern §148): catch these NOW.

- **[FACT: repository.ts:379; backlink-resolver.ts:42-44] `findWhere` does NOT apply the soft-delete filter.** Every custom-predicate read (`resolveWikiLink` title-LIKE, `getPagesForEntity`, link reads) MUST append `isNull(deleted_at)` explicitly. `findById`/`findAll` do it implicitly; `findWhere` does not. (Memory: [[repository-findwhere-skips-softdelete-filter]] — applies because all 3 notes tables HAVE `deleted_at`.)
- **[FACT: notes-and-pages.md:52 (NOT-38); repository.ts:252-254; memory: m10-repos-use-empty-encryptedfields-seam] M1.0 encryption is pass-through.** `encryptedFields: []` even though `pages.{title,content,cover_image,summary_config}` etc. are `[E]`-marked. The vault key is fetched only if the set is non-empty → M1.0 reads/writes never unlock the vault. `[E]` = the M3/DB-5 boundary, NOT a runtime behaviour now. BUT `initVault()` is still needed on the sync-hash path (memory refinement) — verify at the live-store gate.
- **[FACT: notes-and-pages.md:23 (NOT-09)] NP-2 is enforced IN-SERVICE, not by the DB alone.** The partial-UNIQUE `WHERE type='journal' AND deleted_at IS NULL` is a migration-only backstop [FACT: schema/notes.ts:71 comment]; the service must pre-check `getPageByJournalDate` and throw `JournalExistsError` — a bare INSERT would surface a raw SQLite constraint error, not the typed conflict.
- **[FACT: notes-and-pages.md:25-26 (NOT-11/12); intake:60 (G4)] ZK-1 seed determinism.** `ensureEntityNote`'s seed is a pure function — stable key order, no `Date.now()`/random, no server call. A non-deterministic seed breaks offline/multi-device convergence and the client-side ZK constraint. (Mirrors journals `resolveSelection` purity.)
- **[FACT: notes-and-pages.md:51 (NOT-37); BR-N3] NP-4 — `pages.content` is a CRDT (Yjs), not LWW.** In M1.0 the service persists `content` as a `TEXT [E]` column via the repository; the Yjs-per-page sync path is ADR-003 runtime, not DDL, and not this unit's build [INTERP: from NOT-37 "Yjs is ADR-003 runtime (BR-N3), not DDL"]. The invariant the service upholds: it never routes `content` through a merge-hostile path. Resolve the exact content-write seam at decomposition.
- **[FACT: notes-and-pages.md:36 (NOT-22); spaces/service.ts:158-180] Facade idempotence is Spaces'.** `createEntityLink` must NOT re-implement UNIQUE(page_id,entity_type,entity_id) idempotence — it delegates; re-implementing would double-write. The notes service owns ONLY `page_links` idempotence.
- **[INTERP: from repository.ts:267-293] Concurrency/txn.** No multi-table atomic operation is required in ① (create-on-miss is an explicit two-call caller compose [NOT-19]; entity-note seed is single-table). Cascade-on-hard-delete (the one multi-table op) is DEFERRED [NOT-39]. So ① needs no explicit transaction beyond the repository's per-op `createInTx`.
- **[FACT: notes-and-pages.md:67 (NOT-53)] Registry seed is a no-op for Notes.** `_registry.ts` already seeds `page·note·journal·tag·space`; this unit appends nothing. Do not add ENTITY_TYPES.

---

## 5. Boundaries — explicitly OUT of ① (homed elsewhere; state, don't silently skip)

| Concern | Home | Row |
|---------|------|-----|
| Eager auto-creation TRIGGER (call `ensureEntityNote` on entity create) | each owning module's create flow | NOT-13 |
| `/summary` aggregation ENGINE + per-section degrade | MOD-journals service | NOT-32/33/34 |
| Wider personalizable `/summary` menu (Routines/Reminders/…) | @vida/types + journals, M1.4 | NOT-35 |
| Pomodoro `/pomodoro` widget-lens (`listFocusEnabledSessions`) | Sessions realm; `focus_sessions` sub_type value UNKNOWN | NOT-36 |
| Collection-view renderers + saved-view SELECTION primitive | Views/ADR-007 design-pass; service view-queries may ride later | NOT-48 |
| Neural-graph data-prep | AR-8 future / Views design-pass | NOT-49 |
| FTS5 `fts_pages` engine | DB-8 | NOT-50 |
| Templates apply (live-block layouts) | ADR-009 templates substrate + notes apply (later) | NOT-51 |
| Platform-block data reads (`/tasks`,`/habits`,…) + @vida/editor extensions | per source module + components level | NOT-52 |
| Field-level `[E]` encryption wiring | M3 / DB-5 | NOT-38 |
| Hard-delete cascade mechanics (app-layer, no FK) | Notes Part 2 / sync layer | NOT-39 |
| Backlinks page+entity MERGE + `[[` picker UI | Notes ② (fe-notes-and-pages), G6-tentative | NOT-19/24 |
| `word_count` derivation home | **UNKNOWN** — see §6 | NOT-45 |

**Step 1.5 ENVISION GATE: N/A** — this is a pure-backend entity; it renders no surface a user forms a mental model of [FACT: scenario default.md:23; entity-delivery-flow.md §3.75]. Every user-visible slice above is homed to `fe-notes-and-pages` (②), which the `add-frontend-component` profile wires. Stated, not silently skipped.

---

## 6. Open UNKNOWNs carried into the Decomposition Gate

- **[UNKNOWN: needs decomposition decision] `word_count` derivation home** [NOT-45]. The column exists (plaintext, derived from `content`), but no contract/current-spec line says whether ① derives it on content-write or the editor/FTS layer does. Options: (a) ① computes on `createPage`/`updatePage` from a plaintext content-length heuristic; (b) leave it inert (0 default) in ①, home derivation to the editor/FTS pass. **Lean (b)** [INTERP]: content is `[E]` and CRDT (Yjs) — a server/service word-count over encrypted/CRDT content is fragile; the editor owns the live document. Resolve at Approval 1.
- **[UNKNOWN: deferred to ② design-pass] G6 merged-backlink shape** [NOT-24]. ① returns entity-links (via AR-8) + page-links (local); the exact merged/grouped presentation is tentative → ②. ① contract: return both lists; do not force a merged shape now.
- **[UNKNOWN: resolved elsewhere] `focus_sessions` sub_type value** [NOT-36] — owned by MOD-sessions; Notes' pomodoro lens is a seam, not an ① build. No ① blocker.

These are the only open points; everything else is doc-fixed. Nothing is guessed past.
