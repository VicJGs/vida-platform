# PLAN — S6: Reading sessions + Reader orchestration + registerBooks (BOO-23/24/25/26/39)

> Entity Delivery Flow (v1) · per-slice SERVICE track · slice 6 of 10.
> Gate 1 = this SPEC (§XXVI.2 /critique → Approval 1). Grounded in the corpus (No-Guessing).
> Module: books · Branch: `mod-books` · Profile: Add Backend Component / Default.

## §0 Documentation grounding (authority trace — the intent source for every S6 element)

> Per the discipline, the **aspect docs + the Part-1.2 rerun driver-tokens** are the intent authority; they
> OUTRANK the `slice-map`/`seam-contract` decomposition artifacts. Every S6 element below traces to an
> authoritative doc line. The code citations in §2/§6 (`service.ts`, `lifecycle.ts`, `_registry.ts`) are the
> mechanical **as-built-substrate** backstop — legitimately where the two g1 blockers surfaced — not the intent source.

| S6 element                                                                                                                                                   | Authoritative doc source (intent)                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| reading session = base `sessions` `sub_type='reading'` + Books-owned 1:1 extension keyed `session_id`                                                        | **BK-10** (`business-rules.md:45-54`) · **G-S1** rerun §2 (`part-1.2-reruns/books.md:47,95,109`, "base-`sessions` sub_type + 1:1 extension, ADR-004 S1") · `conventions.md:24-27` · `structure-data.md:25` · **BR-BK-4** (`db-4-books/_index.md:49,91,125`)                                                            |
| never a `study_session` reuse · never a standalone Books table                                                                                               | **C-S1** rerun §2 (`books.md:70`, "keep BK-10's guard verbatim — reading ≠ study, distinct extensions") · BK-10 · `conventions.md:25-26`                                                                                                                                                                               |
| shared timer/scheduling/runtime rides the base; capture = the extension columns                                                                              | BK-10 · G-S1 (rerun `books.md:95,102`) · `db-4-books/_index.md:36` ("base `sessions` spine — Sessions-owned; `reading_sessions` is only the extension")                                                                                                                                                                |
| method surface `startSession(bookId, assetId\|manual)` · `endSession(id,{pages?,position?})` · `attachPhoto(sessionId,photo)` · `getStatistics(bookId\|all)` | **contract.md:24-26** (the authoritative service surface) · rerun §2 (`books.md:115`)                                                                                                                                                                                                                                  |
| mode-adaptive capture — manual: time / pages / **where stopped**; digital/audio: position-delta + statistics                                                 | BK-10 (`business-rules.md:48-50`) · `structure-data.md:25` ("time, pages/position delta, statistics"). `stop_point` IS BK-10's "where the user stopped"; `contract.md:25` abbreviates the signature to `{pages?,position?}` — BK-10 + the schema `stop_point` col are the fuller authority (reconcile, not divergence) |
| page-photo ALWAYS stores even when OCR fails                                                                                                                 | **conventions.md:53-54** ("Never discard a captured page photo silently — it stores encrypted … even when OCR fails") · BK-10 (B16b)                                                                                                                                                                                   |
| OCR = scoped extract (AI5/AI6); consent + manual fallback; never server/agent                                                                                | BK-10 · **conventions.md:55,57-58** (BK-14 consent + manual fallback; X11→ADR-015, never an AI4 agent). The **explicit** consent gate (BOO-42) is **S10** (`slice-map.md:24`); S6's `ai?` is the fail-closed default (`interpretation.md:87`)                                                                          |
| photo durable store (`note_attachments`) + daily-Journal feed = DEFERRED build phase                                                                         | **db-4-books/\_index.md:166** ("photos (`note_attachments`) … DEFERRED") · `structure-data.md:25` ("photo attachments encrypted → daily Journal") · UNKNOWN-5 Journal-direction → **S10/M2**                                                                                                                           |
| the Reader (BOO-39): decrypt + auto-session + position orchestration = the SERVICE face; read/listen/annotate chrome = P6                                    | **BK-15** (`business-rules.md:78-79`) · `structure-data.md` Reader ("position indicator + not synced yet state") · `parts/books.md:49` (BOO-39, "the service face is the decrypt/session/position orchestration; the reader chrome is UI")                                                                             |
| cross-format position NEVER guessed; native + "not synced yet" when absent                                                                                   | **BK-4** (`business-rules.md:23-27`) · `structure-data.md:21` ("states: synced·pending·failed; design pass required")                                                                                                                                                                                                  |
| **C-E2** — no economy grant on Books; completion grants ride the base-`sessions` sub-type                                                                    | **C-E2** rerun §2 (`books.md:73,119,138`, "Do NOT add `grant_currency`/E2 to Books") · BK-10 ("grant rides base-`sessions`, no E2 on Books") → realized by the `reading` envelope `allowed_effects:[]` (`interpretation.md` UNKNOWN-2 RESOLVED)                                                                        |
| `reading_sessions` carries NO `deleted_at` (session extension; base owns lifecycle)                                                                          | **BR-BK-4** (`db-4-books/_index.md:64,126,150`) · `conventions.md:41` (soft-delete on parents) · F1                                                                                                                                                                                                                    |
| statistics / progress / pace / quota are DERIVED — never hand-maintained                                                                                     | `structure-data.md` State-management map ("unified progress, pace-status, quota are derived — never hand-maintained") · BK-10 (statistics read the sessions ledger)                                                                                                                                                    |
| **Integration Contract** — the 4 dimensions the `reading` type declares                                                                                      | **ADR-004 §3.2** (every sub-type declares Attachment · Effects · Lifecycle · Permissions)                                                                                                                                                                                                                              |
| session **attachment** target = **the book** ("this session is about Topic X")                                                                               | **ADR-004 §3.2.1** (instance-level attachment = "this session is about Topic X") — applied to reading = the book; `conventions.md` work-anchoring (BK-5)                                                                                                                                                               |
| `reading` **effects** envelope = **`[]`** (declares no effect; the grant rides the base-`sessions` sub-type)                                                 | **C-E2** rerun §2 (`books.md:73`, "Books absent from the feeder list L242" → Books declares no effect) · **ADR-004 §3.2.2** (effects are a _declared_ catalogued set; a non-feeder declares none)                                                                                                                      |
| `reading` **lifecycle** = `scheduled→in_progress→completed`                                                                                                  | **ADR-004 §3.2.3** (the shared session state machine + per-type legal transitions)                                                                                                                                                                                                                                     |
| `reading` **permissions** (user/module type ⊆ shipped)                                                                                                       | **ADR-004 §3.2.4** (effects scoped to attachments; a strict subset of shipped-type capabilities)                                                                                                                                                                                                                       |
| capture is mode-adaptive; photo stored; Books' own entity                                                                                                    | **intake/books.md:134** (B10 RESOLVED mode-adaptive) · `:192` (B16b RESOLVED — photo stored) · `:195` (B10-confirm — Books' own `reading_session`, not `study_session` reuse)                                                                                                                                          |

**Nothing is deferred to the build phase.** Every dimension of the `reading` type is doc-defined: its shape
(BK-10/G-S1/ADR-004 §3.1), attachment (§3.2.1 = the book), effects (C-E2/§3.2.2 = `[]`), lifecycle (§3.2.3), and
permissions (§3.2.4). The intake B10/B16 are marked **RESOLVED** (`intake/books.md:134,192,195`). The S6 service
TYPE_DEF (`sub_type:'reading'`, `effects:[]`, `permissions.allowed_effects:[]`, the §3.2.3 lifecycle) is a
transcription of these definitions, not an open decision.

## §1 Context (ground truth)

- **BASELINE clean.** No code changed since S5 (`f81bd24`); `current-spec.md`/`current-business-rules.md` end at
  S5 (BR-BK-S5-5) and already home "S6 reading sessions (`sessions` + `sessionRegistry` + `registerBooks()`)" as the
  next composition seam. Currency docs are current as of HEAD — nothing to regenerate. `[FACT: current-spec.md:73]`
- **Scope: 5 legs + the registration method** — BOO-23 (`startSession`), BOO-24 (`endSession`), BOO-25
  (`attachPhoto`), BOO-26 (`getStatistics`), BOO-39 (`openReader` service face) + the IR-1 `registerBooks()`.
  `[FACT: slice-map.md:20]`
- **The schema already exists — NO migration, NO new table.** `reading_sessions` is live
  (`schema/books.ts:148-162`): `session_id UNIQUE` (1:1 → base `sessions.id`, no FK), `book_id`, `asset_id?`,
  `pages_read?`, `position_delta?`, `stop_point?`, `statistics: json<Record>`; **NO `deleted_at`** (session
  extension — base `sessions` owns lifecycle, F1). S6 touches `services/books/{types,service,index}.ts` +
  `validators/books.ts` + a `@vida/types` N-fold (`ReadingSession`). `[FACT: schema/books.ts:147-162; interpretation.md:74]`
- **Both substrates are BUILT.** `SessionsService` (`services/sessions/service.ts:118`) exposes
  `createSession`/`getSession`/`attach`/`completeSession`; `SessionRegistry` (`foundation/sessions/registry.ts:46`)
  exposes `register(def)` (throws `DuplicateSubType`, BR-1). `createSession` **validates the sub_type against the
  registry BEFORE any write** — an unregistered `reading` throws → `registerBooks()` must run first.
  `[FACT: services/sessions/service.ts:110; interpretation.md:37]`
- **The flashcards precedent is exact (IR-1).** `registerFlashcards` (`services/flashcards/service.ts:108-124`)
  injects `sessionRegistry` (required) + a call-once, `DuplicateSubType`-guarded registration of its
  `SessionTypeDef` with `effects:[]` + `permissions.allowed_effects:[]`. Books mirrors the session-registration
  half **only** — Books is **not** a study-method (no `review.registerMethod`), so `registerBooks` registers just
  the `reading` sub-type. `[FACT: services/flashcards/service.ts:108-124; interpretation.md:118-129]`
- **The `ai?` deny-safe precedent is knowledge (service.ts:577-582):** `ai == null ⇒ ai-unavailable`; a present
  `ai.askModel` that throws `AiDenied` (the real M1 behaviour, both ports absent) ⇒ `ai-unavailable`. The
  `attachment?` port (S3, `types.ts:79-83`) already exists for upload. `[FACT: knowledge/service.ts:577-582; knowledge/types.ts:78]`
- **The frozen seam-contract pins the S6 surface** (`seam-contract.md:66-67,102-107`): `registerBooks()`,
  `startSession(bookId, {assetId}|{manual:true})`, `endSession(id, {pages?,position?,stopPoint?})`,
  `attachPhoto(sessionId, photo)`, `getStatistics({bookId?})`, `openReader(assetId)`. Types pre-declared:
  `MappedPosition`, `OcrResult`, `AttachmentRef`, `ReaderContext` (`seam-contract.md:38-51`).

## §2 Business rules (promoted to current-business-rules.md on SHIP, BR-BK-S6-\*)

- **BR-BK-S6-1 (`registerBooks()` — reading sub-type registration / BOO-23, IR-1).** A call-once,
  `DuplicateSubType`-guarded registration of the `reading` `SessionTypeDef`, every field a transcription of the
  ADR-004 §3.2 Integration-Contract definitions: `owner_module:'books'`; `attachment_defaults:{}`; **`effects:[]`**
  (§3.2.2 — effects are a _declared_ catalogued set, and **C-E2** marks Books a non-feeder [`books.md:73`, "absent
  from the feeder list L242"] → it declares none; the reading-completion grant rides the base-`sessions` sub-type,
  Sessions-owned); **lifecycle `scheduled→in_progress→completed`** (§3.2.3 — the shared session state machine, the
  reading type's legal transitions); **`permissions:{allowed_effects:[]}`** (§3.2.4 — a module sub-type's envelope
  is a subset of shipped capabilities; `∅` is subset-legal); `default_purpose:'reading'`. Idempotent (2nd call is a
  no-op). Registers **only** the sub-type — **no** `study_method` (Books is not a review method, unlike flashcards).
  `createSession('reading')` throws `SessionTypeNotFound` before any write until this runs. `[ADR-004 §3.2.2-3.2.4;
rerun C-E2 books.md:73; BK-10; service.ts:276]`
- **BR-BK-S6-2 (`startSession` — compose base + own extension / BOO-23, BK-10).** `startSession(bookId, target)`
  guards the book exists (`BookNotFoundError`); for `{assetId}` guards the asset exists + belongs to the book
  (`BookAssetNotFoundError`). Creates a base row `sessions.createSession({sub_type:'reading',
scheduling_mode:'ad_hoc', status:'in_progress', started_at: Date.now()})` (base sees **no** extension — only
  `focus`/`study` map; `started_at` is stamped at creation — the engine only auto-stamps it on a _transition_ into
  `in_progress`, and we create directly at `in_progress`, so `getStatistics` would have no start clock otherwise —
  the `startFocus` precedent `service.ts:436`). Then writes its **own** `reading_sessions` row keyed
  `session_id = base.session.id` (`book_id`, `asset_id` or null), and attaches **the book** as the session target
  (`sessions.attach(id, 'book', bookId, 'instance')` — `book` is the registered ENTITY_TYPE; **`book_asset` is
  deliberately EXCLUDED** `_registry.ts:87-88`, so the asset is NOT attached — it is captured in
  `reading_sessions.asset_id`). Returns `ReadingSessionView`. **Never a `study_session` reuse, never a standalone
  Books session table** (reading ≠ study). `[business-rules.md:45-54 (BK-10); conventions.md:24-27;
interpretation.md:131-134; service.ts:385,436; _registry.ts:87-89; lifecycle.ts:117,127-130]`
- **BR-BK-S6-3 (`endSession` — mode-adaptive capture / BOO-24).** `endSession(id, capture)` where **`id` = the base
  `session_id`** (the uniform handle across start/end/attachPhoto/openReader). Guards the reading session exists
  (`ReadingSessionNotFoundError`), `completeSession`s the base row (lifecycle transition), then updates the
  extension with the supplied capture: `pages_read` (manual), `position_delta`/`stop_point` + a `statistics` JSON
  blob (digital/audio). No field is required — a reading session can end with only time logged on the base row.
  `[business-rules.md:45-54 (BK-10); structure-data.md:25; seam-contract.md:104]`
- **BR-BK-S6-4 (`attachPhoto` — the photo ALWAYS stores / BOO-25, BK-10).** `attachPhoto(sessionId, photo)`
  orchestrates two **independent** deny-safe ports: (a) **store** the photo via `attachment?`
  (`{status:'stored',fileRef}` when present+ok; `{status:'attachment-unavailable'}` when absent); (b) **OCR** the
  photo for a position via `ai?` (`{status:'ready',position,source:'ai'}`; `{status:'ai-unavailable'}` when absent
  OR `AiDenied`). **The photo storing and the OCR are decoupled: an OCR failure NEVER discards the photo** (BK-10
  "the photo still stores … never silently discarded"). Returns `{stored, ocr}`; the caller decides whether to feed
  `ocr.position` into `endSession`. `[business-rules.md:45-54 (BK-10); parts/books.md:35 (BOO-25); knowledge/service.ts:577-582]`
- **BR-BK-S6-5 (`getStatistics` — derivation over the ledger / BOO-26, C-E2).** `getStatistics({bookId?})` derives
  `{ sessionsLogged, pagesRead, minutesSpent }` by aggregating the `reading_sessions` rows (+ the joined base
  `sessions` `started_at`/`ended_at` for minutes), per-book or all. `sessionsLogged` = every reading session (incl.
  in-progress); `pagesRead` = Σ `pages_read` (null→0); `minutesSpent` = Σ`(ended_at − started_at)/60000` over
  **completed** sessions only (an in-progress session has `ended_at=null` ⇒ contributes **0** minutes but still
  counts in `sessionsLogged`). **Derived on read, never stored.** Reads the base-`sessions` ledger; Books emits
  **no** economy grant (C-E2 — the grant rides base-`sessions`). `[business-rules.md:52-53 (BK-10);
parts/books.md:36 (BOO-26); rerun C-E2:73; lifecycle.ts:127 (ended_at stamp)]`
- **BR-BK-S6-6 (`openReader` — the Reader service face / BOO-39).** `openReader(assetId)` guards the asset exists,
  then orchestrates three faces into a `ReaderContext`: (a) **decrypt** the asset file via `attachment?`
  (`download`) — absent ⇒ `{status:'attachment-unavailable'}`; a **present port that rejects** throws
  `AssetFileError` (the S6 terminal decrypt throw site, BOO-44 note); (b) **auto-start** a reading session for the
  asset's book+asset (reuses `startSession`) → the base `sessionId`; (c) **resolve** the asset's own position as a
  `MappedPosition` — `native_position` present ⇒ `{status:'synced', position, sourceAssetId:assetId}` (synced to
  itself), null ⇒ `{status:'not-synced', nativePosition:null}`. Cross-format mapping stays `getMappedPosition`'s
  deferred `NotSyncedState` (BK-4). The read/listen/annotate **chrome is P6**. `[parts/books.md:49 (BOO-39);
business-rules.md:78-79 (BK-15); slice-map.md:77 (BOO-44 decrypt throw site)]`
- **BR-BK-S6-7 (C-E2 guard — Books is not an economy feeder).** **C-E2** (rerun `books.md:73,119,138`) is explicit:
  Books is **absent from the feeder list** (framework L242), so it declares no effect and emits no
  `award_xp`/`grant_currency`; the reading-completion grant rides the base-`sessions` sub-type (S4/E2 on Sessions,
  Sessions-owned). Realized by the `reading` envelope `allowed_effects:[]` (BR-BK-S6-1). S6 takes **no** `effects?`
  dep — that is S10, measurement-only. `[rerun C-E2 books.md:73,119,138; BK-10 ("no E2 on Books")]`
- **BR-BK-S6-8 (persistence / F1 + JSON boundary / N-fold).** `reading_sessions` repo =
  `{ softDelete: false, encryptedFields: [] }` — **no `deleted_at`** (session extension; the `book_chapters`
  precedent). The `statistics` `json<Record>` column is a **dormant M2 granular-capture seam** — the M1 frozen
  capture is `{pages, position, stopPoint}` (→ the three columns), and the Reader's digital/audio granular stats
  write lands at M2; inventing a `statistics?` caller arg over-engineers past the frozen seam-contract. The
  `toReadingSession` mapper still **parses `statistics` defensively on read** (a `$type` lie — the M1.0 repo does
  not auto-serialize; malformed/absent → `null`), so the read boundary is correct the day M2 writes it (the
  `flashcards.media`/`knowledge.key_concepts` parse precedent). A `ReadingSession` `@vida/types` interface (1:1
  mirror) is added (the S3/S4 N-fold). `[schema/books.ts:147-162; seam-contract.md:104;
json-t-columns-need-service-serialize-in-m10; flashcards/service.ts:49-65]`

## §3 Deferred (homed, not built here)

- **Durable photo row + daily-Journal photo aggregation** → **S10 / M2.** `reading_sessions` has no photo column
  and no R2/`note_attachments` substrate exists at M1; `attachPhoto`'s `fileRef` outcome is returned, not persisted
  to a durable photo row. The Journal-feed direction is UNKNOWN-5 (both halves homed: BOO-25 service + Journal
  `/summary` Part B). `[slice-map.md:50; interpretation.md:172; schema/books.ts:32]`
- **Real OCR/TTS/transcription model pipelines** (X11→AI5/AI6) → **M2** (`ai?` dormant, `askModel` throws
  `AiDenied`). S6 wires the deny-safe port + provenance intent only. `[slice-map.md:44; interpretation.md:55]`
- **Real R2 decrypt/upload pipeline** (ADR-003) → **M2** (`attachment?` absent at M1; the `download` method is the
  M2 swap target, zero signature change). `[slice-map.md:45]`
- **Cross-format position mapping** (the transcription + TOC-anchor algorithm) → Books build-phase design pass;
  `openReader` resolves the asset's **own** position (synced-to-self), never a cross-format guess. `getMappedPosition`
  keeps the deferred `NotSyncedState` (S3, BK-4). `[slice-map.md:46; interpretation.md:63-68]`
- **`effects?` measurement fan-out + `registerBooksJournal` + the reading-session Journal signal** → **S10** (BOO-26
  is _composed by_ S10's fan-out but counted at its S6 home — no double-build). `[slice-map.md:24,28-29]`
- **Reader chrome** (read/listen/annotate UI, position indicator render, end-of-session summary, photo capture UI,
  session-start UX) → **`fe-books` P6** (every `·` SPLIT leg's render half). `[slice-map.md:20; interpretation.md:180-184]`

## §4 Acceptance (the live-store Verification Gate maps 1:1)

Live-store (REAL better-sqlite3, Node 24), fixtures = a few books + assets; `registerBooks()` called first where a
session is needed (the flashcards `registerFlashcards` test precedent):

1. **Registration + gate** — before `registerBooks()`, `startSession` (⇒ `createSession('reading')`) **throws
   `SessionTypeNotFound`** (unregistered sub_type, `foundation/sessions/types.ts:73`). After `registerBooks()`, it
   succeeds. A 2nd `registerBooks()` is a no-op (idempotent).
2. **`startSession({manual:true})`** — base session is `in_progress` with `started_at` set; a `reading_sessions`
   row exists with `session_id` = base id, `asset_id` null, `book_id` set; **the book** (not the asset) is attached
   as the session target (`entity_type='book'`). Unknown book ⇒ `BookNotFoundError`.
3. **`startSession({assetId})`** — `reading_sessions.asset_id` is set (the asset linkage lives in the extension
   column, NOT a session attachment — `book_asset` is an excluded ENTITY_TYPE). Unknown asset ⇒
   `BookAssetNotFoundError`; an asset of a **different** book ⇒ `BookAssetNotFoundError` (same-book guard).
4. **`endSession(id, {pages, stopPoint, position})`** — base row transitions to `completed` (`ended_at` stamped);
   the extension carries `pages_read`/`stop_point`/`position_delta` (the three capture columns; `statistics` stays
   null — the M2 seam). Unknown `id` ⇒ `ReadingSessionNotFoundError`. A no-capture `endSession(id, {})` completes
   the base row and leaves the extension capture columns null.
5. **`attachPhoto` deny-safe** — no ports ⇒ `{ stored:{status:'attachment-unavailable'}, ocr:{status:'ai-unavailable'} }`
   (no throw). A present `attachment` ⇒ `stored:{status:'stored',fileRef}`; a present `ai` whose `askModel` throws
   `AiDenied` ⇒ `ocr:{status:'ai-unavailable'}` while `stored` is unaffected (decoupled).
6. **`getStatistics`** — `{bookId:A}` derives `sessionsLogged`/`pagesRead`/`minutesSpent` over A's reading sessions
   only; `{}` aggregates across books. Counts the logged ledger; emits no grant/effect.
7. **`openReader(assetId)`** — no `attachment` ⇒ `file:{status:'attachment-unavailable'}` + a live auto-started
   `sessionId` + `position:{status:'synced',position:native}` (or `{status:'not-synced',nativePosition:null}` when
   the asset has no native position). A present `attachment` whose `download` rejects ⇒ `AssetFileError`. Unknown
   asset ⇒ `BookAssetNotFoundError`.
8. **C-E2** — no economy effect is emitted by any S6 path (S6 holds no `effects` dep; the reading envelope is `[]`).

@vida/core suite stays green (1479 + new S6 tests); tsc 0; eslint 0; gitleaks clean.

## §5 Implementation prompt (type-first; factory-object; no `this.`)

**(a) `@vida/types` (N-fold, the S3/S4 precedent)** — add a `ReadingSession` interface (1:1 mirror of
`reading_sessions`: `session_id`, `book_id`, `asset_id`, `pages_read`, `position_delta`, `stop_point`,
`statistics: Record<string,unknown> | null`, baseColumns + `_sync_*`; **no `deleted_at`**). Export it from the books
barrel used by `services/books`.

**(b) `services/books/types.ts`**

- New required deps on `BooksServiceDeps` (the "S6–S10 append" comment): `sessions: SessionsService`,
  `sessionRegistry: SessionRegistry`. New optional deny-safe port: `ai?: AiService` (import from `foundation/ai`).
- Extend `AttachmentPort` additively with `download(input:{ fileRef:string }): Promise<{ blob: FileBlob }>` (the S3
  `upload` stays; openReader is the only caller; a rejection ⇒ `AssetFileError`).
- Service-layer types (NOT @vida/types — the `MappedPosition`/`LookupResult` precedent): `OcrResult`
  (`{status:'ready';position:string;source:'ai'} | {status:'ai-unavailable';reason?:string}`), `ReaderContext`
  (`{file:AttachmentRef; sessionId:string; position:MappedPosition}`), `ReadingSessionView`
  (`{session:Session; reading:ReadingSession}`), `StartSessionTarget` (`{assetId:string} | {manual:true}`),
  `ReadingCapture` (`{pages?:number; position?:string; stopPoint?:string}`), `ReadingStatistics`
  (`{sessionsLogged:number; pagesRead:number; minutesSpent:number}`).
- `READING_SESSION_SUB_TYPE = 'reading'` const + `READING_SESSION_TYPE_DEF: SessionTypeDef` (the flashcards
  `REVIEW_SESSION_TYPE_DEF` shape, empty envelope).
- New error `ReadingSessionNotFoundError extends Error` (mirrors `BookAssetNotFoundError`; `AssetFileError` reused
  from S3).
- Add the 6 methods to the `BooksService` interface after `getEmbeddableQuotes`.

**(c) `validators/books.ts`** — `StartSessionTargetSchema` (discriminated union `{assetId}` | `{manual:true}`),
`EndSessionCaptureSchema` (`pages?:int≥0`, `position?:non-empty`, `stopPoint?:non-empty`). (No validator for
`FileBlob` — raw bytes, the S3 precedent.)

**(d) `services/books/service.ts`** — destructure `sessions, sessionRegistry, ai` from deps; add
`readingRepo = createRepository(db, readingSessions, { deviceId, softDelete:false, encryptedFields:[] })`; add a
`toReadingSession` mapper (parse `statistics` JSON defensively; single `_sync_status` cast). Hoisted closures (no
`this.`), async:

- `registerBooks()` — `try { await sessionRegistry.register(READING_SESSION_TYPE_DEF) } catch (e) { if (!(e instanceof
DuplicateSubType)) throw e }`.
- `startSession(bookId, target)` — guard book; if `'assetId' in target` guard asset + same-book; `createSession`
  with `started_at: Date.now()`; write `reading_sessions` (`session_id`, `book_id`, `asset_id`); `attach(id, 'book',
bookId, 'instance')` (the BOOK — `book_asset` is an excluded ENTITY_TYPE); return `ReadingSessionView`.
- `endSession(id, capture)` — validate; find `reading_sessions` by `session_id=id` (⇒ `ReadingSessionNotFoundError`);
  `completeSession(id)` (stamps `ended_at`); `update` the extension capture columns (`pages_read`/`position_delta`/
  `stop_point`; `statistics` left null — M2 seam); re-read; return view.
- `attachPhoto(sessionId, photo)` — find `reading_sessions` by `session_id=sessionId` (⇒ `ReadingSessionNotFoundError`;
  also yields the `book_id` the S3 `upload({blob, bookId})` port needs); `stored` via `attachment?` (absent ⇒
  `attachment-unavailable`), `ocr` via `ai?` (absent/`AiDenied` ⇒ `ai-unavailable`); the two are **independent** (an
  OCR throw never touches `stored` — BK-10 "the photo still stores"); return `{stored, ocr}`.
- `getStatistics({bookId?})` — query `reading_sessions` (+ join base `sessions` for minutes); aggregate; return.
- `openReader(assetId)` — guard asset; `file` via `attachment?.download` (reject ⇒ `AssetFileError`); `sessionId` via
  `startSession(asset.book_id, {assetId})`; `position` from `native_position` (synced-to-self | not-synced); return
  `ReaderContext`.
- Wire all 6 + `registerBooks` into the returned factory object.

**(e) `services/books/index.ts`** — export the new types/errors (`ReadingSessionView`, `OcrResult`, `ReaderContext`,
`ReadingStatistics`, `StartSessionTarget`, `ReadingCapture`, `ReadingSessionNotFoundError`).

**(f) D6 / §XXIX** — refresh `docs/modules/books/current-spec.md` (method rows + the deps line: `sessions` +
`sessionRegistry` required, `ai?` added) + `current-business-rules.md` (BR-BK-S6-1..8) in the SHIP commit.

**Order:** @vida/types `ReadingSession` → types (deps + sub-type def + service types + error) → validators → repo +
mapper → `registerBooks` → `startSession` → `endSession` → `attachPhoto` → `getStatistics` → `openReader` →
interface/factory/barrel wiring → tsc → Verification Gate → code-review → currency.

## §6 g1 resolution (interpretations pre-grounded in the corpus)

- **R1 — one uniform handle = the base `session_id`.** `startSession` returns a view carrying the base id;
  `attachPhoto(sessionId, …)` is pinned by the frozen seam-contract to the base session id; so `endSession(id)` and
  `openReader`'s auto-session also key on the base `session_id`. `reading_sessions.session_id UNIQUE` makes the
  lookup a 1:1. Alternative (expose the `reading_sessions.id`) **rejected** — it splits the caller's handle from the
  frozen `attachPhoto(sessionId)` seam. `[FACT: seam-contract.md:105; schema/books.ts:152]`
- **R2 — `registerBooks` registers the sub-type ONLY (no `study_method`).** The flashcards precedent registers both
  because flashcards IS a review method; Books is not (no `review` dep, no card/curve). Registering a spurious
  study-method would be a No-Guessing violation (inventing a capability id with no consumer). `[FACT: interpretation.md:118-129;
flashcards/service.ts:108-124]`
- **R3 — `openReader` position = the asset's OWN native position as a trivially-synced `MappedPosition`.** BOO-39
  says "resolve position / not-synced state"; opening an asset means resolving _that asset's_ position, not a
  cross-format map. `native_position` present ⇒ `synced` (to itself); null ⇒ `not-synced`. The cross-format
  derivation stays `getMappedPosition`'s deferred `NotSyncedState` (BK-4 design pass) — never guessed here.
  `[FACT: parts/books.md:49; interpretation.md:63-68]`
- **R4 — `attachPhoto` returns the two deny-safe outcomes; NO durable photo row at M1.** There is no photo column
  on `reading_sessions` and no R2/`note_attachments` substrate; persisting a durable photo row + the Journal feed is
  Part B (UNKNOWN-5 → S10/M2). M1's faithful service face is the orchestration (store-outcome + OCR-outcome), not a
  durable write. The decoupling (photo stores even if OCR fails) is the load-bearing BK-10 invariant. `[FACT:
schema/books.ts:147-162 (no photo col); slice-map.md:50; interpretation.md:172]`
- **R5 — `AttachmentPort.download` is an ADDITIVE extension.** S3's `upload` is untouched; `download` is a new method
  the M2 R2 pipeline implements. `openReader` is its sole caller and the `AssetFileError` decrypt throw site the
  BOO-44 note reserved for S6. Zero break to S3. `[FACT: slice-map.md:77; types.ts:79-83]`
- **R6 — `ai?` is a NEW optional dep (OCR), the knowledge deny-safe precedent.** `ai == null` OR a thrown `AiDenied`
  ⇒ `ai-unavailable`; a manual fallback is always callable (the caller just enters the position into `endSession`).
  `[FACT: knowledge/service.ts:577-582; knowledge/types.ts:78]`
- **R7 (g1 BLOCKER folded) — attach the BOOK, not the asset.** _Definition:_ **ADR-004 §3.2.1** states instance-level
  attachment = _"this session is about Topic X"_ — for a reading session that subject is the **work** (the book),
  reinforced by BK-5 work-anchoring (`business-rules.md:28-30`) and `structure-data.md:25` (which puts `asset_id` as
  an extension _capture_ column, not the session's identity). So the ADR-004 target is `entity_type='book'`.
  _As-built backstop confirming it:_ `sessions.attach` fail-louds on an unregistered entity_type (`service.ts:385`),
  and `book_asset` is **deliberately excluded** from `ENTITY_TYPES` ("addressed via their own refs",
  `_registry.ts:87-88`) — so attaching the asset would also throw at the live gate. The asset linkage lives in
  `reading_sessions.asset_id`. `[ADR-004 §3.2.1; BK-5 business-rules.md:28-30; _registry.ts:87-89; service.ts:385]`
- **R8 (g1 BLOCKER folded) — `startSession` stamps `started_at: Date.now()` at creation.** The lifecycle engine
  stamps `started_at` only on a _transition_ into `in_progress` (`lifecycle.ts:117,127-130`); `startSession`
  creates directly at `status:'in_progress'` (no transition), so without an explicit stamp `started_at` is null and
  `minutesSpent` is uncomputable. The `startFocus` precedent sets `started_at: Date.now()` (`service.ts:436`).
  `completeSession` stamps `ended_at` on the `complete` transition. `[FACT: lifecycle.ts:117,127-130; service.ts:436]`
- **R9 (g1 REVISE folded) — `statistics` is a dormant M2 seam, not an M1 write path.** The frozen capture is
  `{pages, position, stopPoint}` (`seam-contract.md:104`); the granular digital/audio `statistics` blob is written
  by the Reader's M2 position tracking, not a manual capture. M1 writes the three columns + parses `statistics`
  defensively on read (correct the day M2 writes it). Inventing a `statistics?` caller arg over-engineers past the
  frozen seam. `[FACT: seam-contract.md:104; schema/books.ts:158]`
- **R10 (preflight — non-atomic session+extension compose, STATED not assumed).** `sessions.createSession` owns its
  own `db.transaction` and the `sessions` service exposes no tx-accepting variant across its boundary, so Books writes
  the `reading_sessions` extension in a **separate** write — exactly the `flashcards.startReview` compose
  (`createSession` then `attach`, not co-transactional, `service.ts:227-238`). A failure between the two leaves an
  orphan `in_progress` base session with no extension: **harmless + re-drivable** under the no-FK eventually-consistent
  model (**ADR-016 §3.4**; [[dont-frame-a-doc-resolved-handling-as-a-decision-nor-over-correct]]), and invisible to
  `getStatistics` (which reads `reading_sessions`). No cross-service `*InTx` is invented. `[ADR-016 §3.4;
flashcards/service.ts:227-238]`
- **R11 (preflight — `getStatistics` timing read).** `minutesSpent` needs the base session `started_at`/`ended_at`,
  which live on `sessions` (not `reading_sessions`); the service reads them per reading session via
  `sessions.getSession(session_id)` (an N+1 over a session list that is small per book at M1 — acceptable; a single
  join is the M2 optimization). Derived on read, never stored (`structure-data.md` derived-state map). `[BK-10;
structure-data.md State-management]`
- **TS note (Step 8 guard):** after an `if (!attachment) …` / `if (!ai) …` fast-path, capture
  `const port = attachment` before any nested closure so strict control-flow narrowing survives (the S5 `const prefs`
  precedent). `[engineering.md XV — strict, zero suppressions]`
