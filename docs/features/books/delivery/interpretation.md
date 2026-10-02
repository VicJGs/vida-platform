<!-- Entity Delivery Flow (v1) · Step 1 — Interpretation Layer · books ① backend (#51, LIF-117) -->
<!-- Make the implicit explicit before decomposing. Every claim [FACT: path:line] | [INTERP] | [UNKNOWN]. -->

# Interpretation — Books ① backend  (mod-books #51, LIF-117)

> **Mode: RATIFY** (Entity Delivery Flow §8). The books corpus is doc-fixed and adversarially gated: the
> Part-1.2 rerun shipped SHIP/0-blocking (8th consecutive clean) and the DB-4 spec carries a **No-Decisions
> verification** (`docs/specs/foundation/db-4-books/_index.md:135-142`). The 10-table schema is BUILT
> (`schema/books.ts` + `migrations/023_books.ts`, introspection test present). This layer makes the implicit
> service-tier dependencies explicit; it decides nothing the corpus leaves open — genuine open points are
> tagged `[UNKNOWN]` and homed forward, never guessed (No-Guessing Principle).

## Scope anchor

`createBooksService` — the ① backend service tier over DB-4 `023_books`, the **reading Universe** (2nd-largest
module after Education). 48 backend-intent legs (`BOO-01..48`, `backend-intent/parts/books.md`) governed by 18
business rules (`BK-1..18`) and 7 DDL invariants (`BR-BK-1..7`, `db-4-books/_index.md:42-59`). The ② UI surface
(Reading Hub, Bookshelf, Reader, wizards, all render halves of SPLIT legs) = the separate `fe-books` P6 track —
**out of scope here**.

---

## 1. DEPENDENCIES — what Books composes (not authors)

Books is a **cite-not-re-spec composer** (`parts/books.md:6`). Every substrate below is BUILT and Done; Books
wires them, never re-implements them.

### Required core seams (present, non-optional)

| Seam | Source (verified) | What Books uses it for | Legs |
|---|---|---|---|
| **DB-6 Repository** | `db/repository.ts` (`createRepository`) | encrypt-on-write/decrypt-on-read CRUD over the 10 tables; `encryptedFields:[]` M1.0 pass-through ([E]→M3) | all |
| **Spaces (AR-6)** | `foundation/spaces` `SpacesService` + `TagNotFound` `[FACT: services/knowledge/service.ts:57]` | `entity_tags` WRITES (publisher/genre/category classification) + `entity_links` inter-link WRITES | BOO-04, 18 |
| **Backlinks (AR-8)** | `services/search/backlink-resolver` `BacklinkResolver` `[FACT: knowledge/types.ts:38]` | `entity_links` READS (annotation inter-links, linkable-target) | BOO-18, 46 |
| **Notes** | `services/notes` `NotesService` (`ensureEntityNote`) `[FACT: knowledge/types.ts:42,75]` | `pages`-backed notes on bookmarks/quotes/book (never inline) | BOO-16, 17 |
| **Sessions base (AR-5/ADR-004)** | `services/sessions` `SessionsService` `[FACT: services/sessions/service.ts:110]` | create the base `sessions` `sub_type='reading'` spine (timer/scheduling/lifecycle) | BOO-23, 24, 39 |
| **Session registry (AR-5)** | `foundation/sessions` `SessionRegistry` `[FACT: foundation/sessions/registry.ts:44; services/flashcards/types.ts:47]` | **register** the `reading` sub-type (required — see implicit rule 1); `createSession` throws `SessionTypeNotFound` for an unregistered sub_type BEFORE any write (`service.ts:276`) | BOO-23 |
| **Measurement (ADR-011)** | `foundation/measurement` (`rollup`, source-registry `advertise`/`query`) `[FACT: knowledge/service.ts:58]` | unified-progress derivation kind selection; a reading measure source | BOO-13, 14 |

### Optional deny-safe ports (fail-closed; M2 real reach)

**Why deny-safe in M1 (doc + substrate grounded, not an imported pattern).** The documentation itself defers
each reach: `parts/books.md:7` states Books "**rides — never authors**" the R2 pipeline / ADR-014 ingestion /
ADR-015 AI layer, and "this campaign homes the **SERVICE intent only**"; `rerun §5:149-160` lists each as
out-of-scope. AND the composed substrate ships M1-dormant as a FACT: `ai` throws `AiDenied` in M1
(`[FACT: knowledge/types.ts:76]`), `ingestion` returns `parser-unavailable` = "the real M1 seam"
(`[FACT: knowledge/types.ts:128]`), and **no R2/attachment foundation exists** (`[FACT: foundation/ grep = none]`).
So the port can only BE deny-safe in M1 — absent ⇒ a **typed unavailable/refused state**, never a silent path,
never a guess. The M2 swap changes **zero service signatures**. (Full per-row citations: `slice-map.md`
Deferred-by-design table.) The mechanism mirrors knowledge's optional ports (`knowledge/types.ts:78-87`).

| Port | M1 behaviour when absent/dormant | M2 real reach | Legs |
|---|---|---|---|
| **Ingestion (ADR-014)** | `IngestionGuard?` — `lookupBook` ⇒ `{status:'lookup-unavailable'}`; manual fallback always callable | ISBN device-mediated public-reference (X1/X2/X3/X5/X9, "Books ISBN" verbatim) | BOO-07, 08 |
| **AI (ADR-015)** | `AiService?` — OCR/TTS/transcription ⇒ `{status:'ai-unavailable'}`; typed refusal + manual fallback | X11→AI1/AI3/AI5/AI6 model pipelines (on_device/cloud, `source=ai`) | BOO-25, 40, 41, 42 |
| **R2 attachments (ADR-003)** | `AttachmentPort?` — `addAsset(file)`/`attachPhoto` ⇒ `{status:'attachment-unavailable'}`; row persists, file ref deferred | encrypted file/photo upload pipeline | BOO-09, 25, 44 |
| **Effects rail (ADR-012)** | `effects?` — fan-out dormant without a registered handler (the knowledge/habits precedent) | reading-session completion signals (**C-E2: NO economy grant on Books** — grant rides base-`sessions`) | BOO-26 (guard) |
| **Journal registry (ADR-004 §3.2.5)** | `registerBooksJournal` PULL contribution (today's quotas digest) — dormant without a registry | daily-Journal `/summary` aggregation | BOO-30 |
| **Preferences** | `PreferencesPort?` — quote-embed toggles / conflict rule reads; permissive/documented default when absent | user Preferences store keys | BOO-22, 35 |
| _(NIT-3 note)_ | A built `services/preferences` exists; Books homes a **narrow deny-safe `PreferencesPort?`** (two toggle/rule reads) rather than coupling to the full service — the deny-safe-port precedent (absent ⇒ permissive default), avoiding a hard dep for two reads. Reconcile-or-adopt is a S5/S8 build call. | — | — |
| **Education contract** | deny-safe `null` signal — Education (`subject_schedules`/assessments) NOT built ⇒ `paceVsSyllabus = null` (the knowledge `MasterySource` precedent, `knowledge/types.ts:161-169`) | Education partition read-across | BOO-38 |

### Cross-format mapping (BK-4) — a deferred DERIVATION, not a port

`getMappedPosition` returns a typed `NotSyncedState` (native position + explicit "not synced yet") in M1 —
the mapping algorithm (transcription + TOC-anchor matching) is an explicit **"design pass required"**
(`business-rules.md:136`, `db-4-books/_index.md:30-31`, `rerun §5:153`). M1 ships the honest absent-state
(BK-4 fail-loud); a mapped position is **NEVER guessed**. `[FACT: contract.md:61-62; business-rules.md:23-27]`

---

## 2. NEEDS — the persistence + concurrency + ZK preconditions

- **Persistence.** 10 tables, all `...baseColumns`; `deleted_at` on all **except** `book_chapters` +
  `reading_sessions` (F1 — FACT-floor/session-extension). `encryptedFields:[]` in M1.0 for every [E] table
  (title/author/isbn/review/cover_url, chapter title, quote text, bookmark label, highlight captured_text,
  asset file_ref) — the M1.0 dormant [E] seam (`[FACT: schema/books.ts:35; m10-repos-use-empty-encryptedfields-seam]`).
- **JSON columns** (`statistics`, `quota_distribution`, `recalculation_state` = `json<Record<string,unknown>>`):
  the M1.0 repo does NOT auto-serialize non-encrypted values — the SERVICE stringifies at the write boundary and
  parses on read, exactly one cast per boundary (the knowledge `key_concepts`/`data_refs` precedent
  `[FACT: knowledge/service.ts:125-170]`). Defensive parse degrades malformed JSON to null.
- **Derived, never stored** (constitution §3 SSOT): `books.progress` is a nullable override (`NULL ⇒ derive`,
  BR-BK-2) — unified progress computes from asset positions; quota state, projection, pace, statistics all
  derive on read (React-Query-owned per `structure-data.md:37-41`). No mutation writes a progress counter.
- **No FK anywhere** (BR-BK-6, ADR-016 §3.4) — integrity is app-layer guard-exists (the knowledge
  `*NotFoundError` precedent). The one kept constraint: `book_chapters UNIQUE(book_id, chapter_number)`.
- **ZK-1** — every integration is device-mediated/on-device/BYO-key; no server-plaintext path
  (`conventions.md:56-58`). The consent gate (BK-14) IS the X4/AI1 gate; M1 ports fail closed by default.
- **Factory-object shape** — `createBooksService(deps) → object literal`, hoisted closures, **no `this.`**
  (the ② destructure-consumption shape; `[FACT: factory-service-no-this-for-intra-calls]`). Validating methods
  are async (rejection, not sync throw).

---

## 3. ORGANIZATION — the file layout (mirrors services/knowledge)

```
packages/core/src/services/books/
  index.ts        # barrel: createBooksService + registerBooksJournal + public types/errors
  types.ts        # BooksServiceDeps + BooksService interface + input types + typed errors + service-layer shapes
  service.ts      # createBooksService factory (the closures)
  journal.ts      # registerBooksJournal (PULL contribution — today's quotas digest)
  __tests__/      # live-store Verification-Gate suites per slice
validators/books.ts  # Zod Create/Update schemas (append alongside the DB-4 enum home learning.ts? — see §5 UNKNOWN-1)
```

`entity_type` constants live in `types.ts` (the `KNOWLEDGE_OBJECT_ENTITY_TYPE` precedent): `book`,
`book_chapter`, `book_bookmark`, `book_quote` are pre-registered in `ENTITY_TYPES` by DB-4
(`db-4-books/_index.md:115-119`) — Books injects the shared registry, does NOT re-register
(`[FACT: spaces-junctions-split-read-write-tagentity-blind-inserts]`).

---

## 4. IMPLICIT RULES — what the corpus implies but does not state in one place

Each is surfaced here so the Decomposition Gate ratifies it explicitly.

1. **Reading sub-type registration is Books' job.** `SHIPPED_SESSION_TYPES=[focus]` and the sessions service
   routes only `focus`/`study` extensions (`[FACT: foundation/sessions/registry.ts:26; services/sessions/service.ts:171-175]`).
   `SESSION_SUB_TYPE` carries `'reading'` (`db-4-books/_index.md:51`), but the AR-5 `SessionRegistry` needs Books
   to **register `reading`** (SS-5 owning-module pattern, `[FACT: sparse-foundation-seed-is-extension-seam-not-a-gap]`).
   The exact precedent is **flashcards**: it injects `sessionRegistry: SessionRegistry` (required) and exposes a
   call-once `registerFlashcards()` that registers its `SessionTypeDef` (`[FACT: services/flashcards/types.ts:47,134;
   service.ts:108-120]`). Books mirrors this: a required `sessionRegistry` dep + a call-once **`registerBooks()`**
   method. The reading envelope is **`permissions: { allowed_effects: [] }`** — ∅ ⊆ the shipped ceiling
   `{attach_pomodoro, log_time}`, so the empty envelope is envelope-legal AND satisfies C-E2 (no economy grant)
   (`[FACT: services/flashcards/service.ts:70,83; foundation/sessions/registry.ts:79]`). `createSession` for
   `reading` passes **no** extension (only `focus`/`study` map, `service.ts:171-175`); Books writes its own
   `reading_sessions` row keyed `session_id` separately.

2. **Books composes the base spine, owns only the extension.** `startSession` calls `sessions.createSession(
   {sub_type:'reading', ...})` for the base row (spine-only from the service's view — no `focus`/`study`
   extension), then Books writes its own `reading_sessions` row keyed `session_id` = the base id. Base owns
   lifecycle/timer; Books owns the mode-adaptive capture columns. `[FACT: BR-BK-4; conventions.md:24-27]`

3. **C-E2 guard — Books is NOT an economy feeder.** Reading-session completion grants ride the base-`sessions`
   sub-type (Sessions IS the feeder), NOT Books. No `award_xp`/`grant_currency` emitted by Books. The `effects`
   port exists only for measurement signals, if at all. `[FACT: rerun C-E2 books.md:73; parts/books.md:131]`

4. **C-M1 guard — no stored measurement axes.** `reading_plans` holds NO `measurement_kind`/`binding_mode`
   (Purpose-target-owned; Books absent from the M1 pursuable set L240). Books names the axes for the derivation,
   stores none. `[FACT: BR-BK-7; rerun C-M1 books.md:71]`

5. **Annotation asymmetry (BK-6, load-bearing landmine).** Bookmarks + quotes take notes (`pages`) + inter-links
   (`entity_links`); **highlights are deliberately light — NEVER notes/links** (`conventions.md:50`). Only
   `book`/`book_chapter`/`book_bookmark`/`book_quote` are ENTITY_TYPES; `book_highlight` is deliberately excluded
   (`db-4-books/_index.md:118`).

6. **Annotations anchor to the WORK, not the asset** (BK-5). `book_bookmarks`/`book_quotes` carry `book_id`
   (work-anchored); only `book_highlights` carries a nullable `asset_id` (digital source). Deleting an asset
   never deletes work-anchored annotations (BOO-11 invariant). `[FACT: schema/books.ts:103-145]`

7. **Conflict resolution is derived, not a table** (BK-8). No `book_conflicts` table exists — the conflict queue
   is React-Query-derived over asset positions; the preset rule lives in Preferences. M1 surfaces
   `PositionConflictPending` (typed) + a derived `getConflicts`; an unresolved conflict **blocks** unified
   progress (flagged "conflicted", never guessed). `[FACT: db-4-books/_index.md:32-33; BK-8]`

8. **Books owns plans; consumers consume** (BK-12). `createPlan`/`recalculate` are Books-only writes; the Study
   Planner reads via a provider, never writes. A boundary invariant enforced by exposing only read-providers to
   consumers. `[FACT: BK-12; parts/books.md:55 (BOO-45)]`

---

## 5. UNKNOWNs (homed forward — never guessed)

| # | Open point | Home | Blocker? |
|---|---|---|---|
| UNKNOWN-1 | Zod validators file — append to `validators/learning.ts` (where the DB-4 enums home, `db-4-books/_index.md:147`) OR a new `validators/books.ts`? The enum home is fixed (learning.ts); the schema home is per-module. | Decomposition Gate (grep the DB-4 enum append + the knowledge/habits validator precedent) | No |
| ~~UNKNOWN-2~~ RESOLVED | The `reading` session capability envelope. **Resolved: `allowed_effects: []`** (empty envelope, the flashcards precedent — envelope-legal + C-E2-clean). Not open. | S6 (register at composition) | No |
| UNKNOWN-3 | Cross-format mapping algorithm (transcription + TOC-anchor matching). | Books build-phase design pass (M1 ships `NotSyncedState`) | No — deferred by design |
| UNKNOWN-4 | Reading-plan goal `measurement_kind`/`binding_mode` defaults. | Books build-phase + ADR-011 (M1 names the axes) | No |
| UNKNOWN-5 | Daily-Journal page-photo aggregation direction (Books push vs Journals pull). | P3 decomposition + Journals owner (both halves homed: BOO-25 service + Journal `/summary` Part B) | No |

None block the Decomposition Gate — all are build-phase/design-pass resolutions the corpus explicitly defers.

---

## 6. Envision Gate (Step 1.5) — N/A

Books ① is a **pure-backend** service tier: it renders no surface a user forms a mental model of
(`entity-delivery-flow.md §3.75`). Every user-visible affordance (Reading Hub, Bookshelf, Reader **chrome**,
wizards, progress rings, conflict prompts) is the SPLIT UI half → the `fe-books` P6 track. Note the Reader
(BOO-39) is a SPLIT leg: its **service face** (decrypt + auto-session + position orchestration) is homed to S6;
only the read/listen/annotate chrome is P6. **The Envision Gate does not apply to this unit.** (Stated per the
scenario's Step 1.5 requirement — not silently skipped.)
