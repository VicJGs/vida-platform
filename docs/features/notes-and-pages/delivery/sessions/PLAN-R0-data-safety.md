# PLAN — notes-rescope R0 · Data safety (SHARED)

> Entity Delivery Flow recovery variant · Step 6 · per-slice §XXVI **gate 1** (rev 3, 2026-10-26 — critique rounds 1–2
> REVISE folded in; round 3 SHIP, see §6). Slice-map R0
> (`slice-map.md:31-41`, approved 2026-10-26): "four ledger paths lose or corrupt user content today." Ledger rows:
> B-50 · C-46 · C-47 · C-48 · B-51 · A-6 · A-7 · B-30 · E-1 · B-52 · B-53 (+ the slice-wide duties B-55/56 · E-5 · B-66/F-2 ·
> N-1/F-7 · F-8 that R0's files trigger). Yardsticks: `interpretation.md` IR-R2/IR-R3/IR-R4, N-1 · `envision.md` EC-33.
> Grounding resolved IN this PLAN (no calls for Victor): `[FACT: path:line]` · `[INTERP — grounded: …]` · `[UNKNOWN]`.
> Branch `notes-rescope` @ `91e01ce`. 1a done this session: `docs/editor/current-*` refreshed for the #7 S1 drift
> (`chrome` prop, EC-7 text colour, blockquote/taskList CSS); `docs/modules/notes/current-*` current (baseline 2026-10-26,
> no code change since `78d02d8`).

## 1. Identity

- **What:** close the four content-loss paths on BOTH planes:
  1. **Unreadable content is never overwritten** — malformed JSON, a non-doc shape, or a node/content the schema rejects
     → no editor write, ever; the page shows the EC-33 read-only notice + "Export a copy".
  2. **Writes against a deleted or unknown page fail loud** (typed error), and a malformed body can't be written.
  3. **The pending (debounced) edit survives tab hide/close**, and the write seam exposes `flush()` / `cancel()` (R5 consumes
     `cancel`/settle before delete).
  4. **Every cache that shows a page's body is invalidated on a body write** (page · list · journal · calendar journal) — the
     stale Home re-seed (B-53) can no longer re-write an older body over a newer one.
- **Why:** slice-map R0 "why first" + IR-R2/IR-R4 [FACT: interpretation.md:127-133]. Reach: the body is shared by the note
  page and Home [FACT: home/journal-page-region.tsx:22,70]; the parser by fe-calendar [FACT: app/calendar/use-calendar.ts:19,138].
- **Envision:** EC-33 (MUST, structural) [FACT: envision.md:29]. Inherited: EC-4/EC-23 editor facet look stays as shipped
  (the notice sits in the same writing measure).

## 2. Grounded scope — verdicts

| # | Item | Verdict | Grounding |
|---|------|---------|-----------|
| G1 | **How content is lost today (C-46)** | FACT: with `enableContentCheck:false` (the default) a JSON doc whose `nodeFromJSON` throws (unknown node type, bad content) is replaced by an **empty doc** with only a `console.warn`; the editor then emits that empty doc and the app writes it | `@tiptap/core@3.30.0 dist/index.js:697-713` (catch → `createNodeFromContent("")`); the mount echo is the `update` emitted by `setEditable(editable)` (default `emitUpdate=true`) [FACT: editor.tsx:177-179; core dist/index.js:6555-6558] → `onUpdate` `editor.tsx:167-173`; `use-note-content.ts:40,91-95` (echo ≠ baseline → write after 500 ms) |
| G2 | **Detection seam** | `enableContentCheck:true` + `onContentError`. The listener is bound **before** the initial doc is created, so the error arrives before any `update` | `@tiptap/core dist/index.js:6424` (`on contentError`) → `:6435` (`createDoc`) → `:6711-6735` (fallback doc + `emit contentError`); options `index.d.ts:1727,1757`. Verified against the installed 3.30.0 (not training data) |
| G3 | **Content check scope + no-write mechanism** | **Always on** inside `<VidaEditor>`. Mechanism (exact): `onContentError` sets `invalidRef.current = true` **synchronously** (+ `setInvalid(true)` state for render) and calls the optional `onInvalidContent?(error)`; `onUpdate` checks `invalidRef` **first** and returns without emitting; the editable-sync effect uses `effective = editable && !invalid` and calls `setEditable(effective, /*emitUpdate*/ !invalid)` — the **valid path keeps today's default emit** (the mount echo `useNoteContent`'s `needsBaseline` dedupe depends on, `use-note-content.ts:43-48,85-89`); the invalid path never emits. Toolbar hidden (it already gates on `editable`). Additive, optional prop; every consumer gets the guarantee | C-46 fix text [FACT: reconciliation.md:199]; BR-E1-1/E1-2 [FACT: docs/editor/current-business-rules.md]; optional/additive-prop precedent = BR-E1-6 (`chrome`) [FACT: docs/editor/current-business-rules.md:36]; setEditable emits [FACT: core dist/index.js:6555-6558] |
| G4 | **Tagged parse** (B-50/B-51) | `parseContentResult(c) → {status:'absent'} \| {status:'ok', doc} \| {status:'malformed', raw}`. Malformed = `JSON.parse` throws **or** the value fails the doc-shape guard. Two **lossless read-side normalizations** (they carry no content, and the editor's check rejects them — G16): a doc with `content: []` → `absent`; empty `{type:'text', text:''}` nodes are dropped. `parseContent` keeps its `EditorDocument \| null` contract as a thin wrapper. fe-calendar: one stated change — JSON that parses but is not a doc used to reach `recordLine` (which returned `null` for it anyway) and now maps to `null` before it; the record line is identical | impact A "keep `parseContent`'s null contract" [FACT: slice-map.md:33]; calendar use [FACT: use-calendar.ts:138; calendar-derive.ts:436-447] |
| G5 | **Where the doc-shape guard lives** | `@vida/core` `validators/editor.ts` (already the editor-validator home, in the barrel `validators/index.ts:16`): `isEditorDocument(x): x is EditorDocument` (doc root + `content` array of `{type:string}` — the same rule as `assertEditorDocument`). Not `@vida/types` (runtime = enum tuples only); not `@vida/editor` (core can't import it) | [FACT: packages/types/src/CLAUDE.md:6]; [FACT: editor.tsx:60-75]; core barrel `export * from './validators'` [FACT: core/src/index.ts:59]; 0 existing `isEditorDocument` / `PageNotFoundError` / `InvalidPageContentError` names in packages/ (critique grep) |
| G6 | **`contentStatus` on `NoteEntityData`** | Additive: `contentStatus: 'ok' \| 'absent' \| 'malformed'` + `rawContent: string \| null` (the stored string, for "Export a copy"). `content` stays `EditorDocument \| null` | [FACT: use-note-entity.ts:20-36]; samples (`use-note-entity.ts sampleFor`, `use-journal-entry.ts sampleJournal`) gain the two fields |
| G7 | **EC-33 surface** | In `NoteEditorBody` (so note page AND Home inherit it): `invalid = contentStatus==='malformed' \|\| onInvalidContent fired` → unmount the editor, render the notice in the same 740 px measure: heading "This page can't be opened for editing", body "It contains content this version of Vida can't read. Nothing will be overwritten.", `Button intent="secondary"` "Export a copy". App-side latch: `useNoteContent.lock()` called **synchronously inside the `onInvalidContent` callback** (and on render for `contentStatus==='malformed'` before any editor exists) — no effect window — drops any pending edit **and** makes `save` a no-op for the rest of the mount (a one-shot cancel could be re-armed by a later `save`). **a11y:** the notice wrapper is `role="status"` (it can appear after the editor mounted — the `onInvalidContent` switch — so it is announced politely, focus not stolen); heading level = one below the host title: `h2` on the note page (the page H1 is the title), `h3` inside Home's `role="region"` journal frame [FACT: home/journal-page-region.tsx:48] | EC-33 wording [FACT: envision.md:29] — the "…" filled `[INTERP — grounded: EC-33's two pinned clauses kept verbatim, the middle clause names the cause]`; `@vida/ui Button` [FACT: packages/ui/src/components/button.tsx:138-148] |
| G8 | **"Export a copy" (C-48)** | App-local download (Blob + object URL + `<a download>`). **Primary, always:** the raw stored string → `<title>.json` — lossless (the export exists to rescue content; `toMarkdown` reduces an unknown node to its inline text, so the `futureBlock` case would export empty). **Secondary, when the raw parses to a doc:** "Export as Markdown" → `toMarkdown(doc, {include_frontmatter:false})` → `<title>.md` (C-48's "at least `toMarkdown`"). The general export surface (ExportDialog, PDF/DOCX) stays shell-rescope | C-48 [FACT: reconciliation.md:201]; general export → shell-rescope [FACT: docs/specs/foundation/golive-replan/coverage-report.md:89]; options type [FACT: to-markdown.ts:260; packages/types/src/editor.ts:197-199]; `toMarkdown(doc, options)` [FACT: editor/src/serializers/to-markdown.ts:260; index.ts:12]; unknown nodes degrade to their text, never throw (BR-E6-9) [FACT: to-markdown.ts:248-250] |
| G9 | **Typed errors + scope (A-6/A-7)** | **Notes-service scoped** (not repository-wide — DB-6 serves 26 modules, and R5 `restorePage` must still update a deleted row). New `PageNotFoundError(id)` (deleted ⇒ not found, IR-R3) and `InvalidPageContentError` (A-6). One private `requireLivePage(id)` = `pageRepo.findById` (already filters `deleted_at`). Guarded: `updatePage` · `writePageContent` · `addAttachment` · `createPageLink` (source **and** target) · `createEntityLink` (pageId, after `assertRegistered` — BR-S4-1 error order). Not guarded: the `remove*` ops (idempotent, R5's purge owns cleanup) | A-7 [FACT: reconciliation.md:38; repository.ts:404-413 (update ignores deleted_at)]; `*NotFoundError` convention [FACT: services/tasks/types.ts:294-299; projects/types.ts:256]; IR-R3 [FACT: interpretation.md:129-130] |
| G10 | **`createPage` content** | `createPageSchema.content` refined: when present it must parse to an `isEditorDocument` doc (the same A-6 guard on the create path). The only caller passing `content` is `ensureEntityNote` (critique grep) | [FACT: validators/note.ts createPageSchema `content: z.string().nullish()`; service.ts:165-182 ensureEntityNote] |
| G16 | **`seedContent` must be editor-valid** | Today it can write docs the editor's schema check rejects: an empty seed `{}` → `{type:'doc',content:[]}` ("Invalid content for node doc" — `doc` is `block+`), and an empty title `''` → a heading with an empty text node ("Empty text nodes are not allowed"). Both arise from Books annotations (non-bookmark/quote kinds seed `{}`; an empty label/quote text seeds `''`). Fix: skip a heading whose title is empty; always emit ≥1 block (an empty paragraph when nothing else). Existing stored seeds open via G4's normalizations — no data rewrite | reproduced against the installed 3.30.0 StarterKit schema with `errorOnInvalidContent:true` (this session); [FACT: books/service.ts:678-684; notes/service.ts:40-58] |
| G11 | **Check-then-write race** | Accepted: `requireLivePage` → `update` is not one transaction. Single-user local, one writer — the `ensureEntityNote` / `ensureJournal` convention | [FACT: service.ts ensureJournal comment "single-writer backstop … single-user-local"] |
| G12 | **Flush on hide (E-1)** | `useNoteContent` registers `visibilitychange` (→ `hidden`) and `pagehide` listeners that call `flush()`. Exposes `flush()` / `cancel()` / `lock()` on its result. A failed write **re-queues** its doc as `pending` unless a newer edit already replaced it (today `onError` drops it — `use-note-content.ts:60-63,75-79`), so the next hide/unmount/edit retries — **retryable errors only**: `PageNotFoundError` / `InvalidPageContentError` are terminal (no re-queue; honest "Couldn't save"). **Stated limit:** an `onError` arriving after unmount re-queues into a dead hook, so that edit is lost and no state can show it (the R1 error toast, F-7, is the surface that will). **Limit (stated, not hidden):** the write is async to the OPFS worker; a hard tab close can still kill it after `pagehide`. `visibilitychange:hidden` fires first and is the main win | [INTERP — grounded: E-1 is itself `[INTERP]` (reconciliation.md:217); the live leg verifies "edit → switch tab → reload → kept"] |
| G13 | **Write-through + invalidation (B-52/N-1)** | **At flush time (synchronously, before the async write)** `qc.cancelQueries` then `qc.setQueryData` the pending doc into every cached body (an older in-flight fetch can't land over it): `['pages', id]` (a `PageRow` — `content` = the serialized string) and, for a journal, `['journal', journalDate]` (a `NoteEntityData` — `content` = the doc, `contentStatus:'ok'`, `rawContent` = the serialized string); only when an entry already exists (warm cache). **Cold cache — read-after-write barrier:** a module-level `pendingBodyWrites` registry (`apps/web/src/notes/`) maps page id (and, for a journal, its date) → the in-flight write's settle promise; the `useNoteEntity` and `useJournalEntry` query functions `await` it before reading. One registry, both directions (note page ⇄ Home). **On settle** invalidate `['pages', id]` · `['notes','pages']` (list sort by `updated_at`) · journal: `['journal', journalDate]` + `['calendar','journal']` (prefix — every range). The hook gets `journalDate` from its caller | keys [FACT: use-note-entity.ts:132; use-notes-rows.ts:55; use-journal-entry.ts:67; use-calendar.ts:132]; staleTime 30 s [FACT: lib/query-client.ts:18] |
| G14 | **B-53 (stale Home re-seed)** | Invalidation alone does NOT fix it: `useJournalEntry` returns cached data on mount while it refetches (gcTime 5 min), `NoteEditorBody` seeds the uncontrolled editor once [FACT: note-editor-body.tsx:49] and fixes the dedupe baseline at mount [FACT: use-note-content.ts:40] — the refetch never re-seeds, so the next keystroke writes old body + edit over the newer one. The note page's unmount flush also races Home's mount. **Fix = G13**: warm cache → the synchronous write-through (whatever Home mounts from cache already holds the newest doc); cold/GC'd cache → the barrier (the read can otherwise overtake the write: one worker RPC per statement [FACT: db/client.ts:139; db/worker.ts:155], and R0's `requireLivePage` makes the write two round-trips). Live repro covers both: warm (Home first) and cold (reload → edit on `/notes/$id` → Home immediately) | B-53 `[INTERP — needs live repro]` [FACT: reconciliation.md:133]; [FACT: home/use-journal-entry.ts:66-75; lib/query-client.ts] |
| G17 | **Other `<VidaEditor>` mounts** | The only other mount is `CanvasEditor` [FACT: canvas-editor/canvas-editor.tsx:108], which no route imports (a dead seam, retired in R10 — B-59). It inherits the guarantee as a silent read-only state; no notice owed | [FACT: grep `canvas-editor'` imports in apps/web/src = 0]; B-59 [FACT: slice-map.md:141] |
| G15 | **Known limit — unknown *attributes*** | ProseMirror drops attrs a node type doesn't declare, silently; R0 does not detect that. In M1 one device = one schema, so it can't arise from user data today; the multi-device/version case is M4 | `[INTERP — grounded: CLAUDE.md "single-user, multi-device"; sync = M4 (ADR-003, MVP-PATH)]`. Recorded so the critique can challenge it |

## 3. Business rules (BR-R0-*)

- **BR-R0-1 · An unreadable body is never written.** Malformed JSON, a non-doc shape, or a schema-rejected doc → no
  `writePageContent` call from that mount. Enforced at two layers: the app (no editor mounted for `malformed`) and the editor
  (content check on → `onChange` silenced + read-only).
- **BR-R0-2 · The stored bytes stay intact.** R0 never migrates content on read; the notice + export are read-only. The
  only form change is lossless: after the user's first real edit, the written doc is the G4-normalized one (no empty text
  nodes) — no information is lost.
- **BR-R0-3 · `<VidaEditor>` content check is always on;** `onInvalidContent?(error)` is optional and additive. An invalid
  mount: `editable=false`, toolbar hidden, slash inert, zero `onChange` (ref-guarded `onUpdate`; `setEditable(false, false)`).
  A valid mount keeps the one benign mount echo (BR-E1-2) unchanged.
- **BR-R0-4 · `parseContentResult` is the one parser;** `parseContent` is its null-contract wrapper. Lossless read-side
  normalizations only: empty doc → absent; empty text nodes dropped.
- **BR-R0-4b · Seeds are editor-valid.** `seedContent` never emits an empty `doc` or an empty text node.
- **BR-R0-5 · Writes to a page require a live page.** `updatePage` / `writePageContent` / `addAttachment` / `createPageLink`
  (both ends) / `createEntityLink` reject a deleted or unknown id with `PageNotFoundError` (async rejection — BR-5).
  Supersedes BR-7c.
- **BR-R0-6 · Body writes are shape-guarded.** `writePageContent` and `createPage.content` reject a non-doc value with
  `InvalidPageContentError` / Zod error before any write.
- **BR-R0-7 · The write seam settles on demand and on hide.** `flush()` writes the pending edit now; `cancel()` drops it;
  `lock()` drops it and disables `save` for the mount; hide/pagehide flush; unmount flush (unchanged); a failed write
  re-queues (unless superseded).
- **BR-R0-8 · A body write writes through every cached body, then invalidates every body-showing key** (G13).
- **BR-R0-8b · The barrier never loses a write and never fails a read.** Registered **synchronously in `flush()`**, before
  `mutate` (React Query v5 awaits before `mutationFn`); a per-key chain/counter (two writes can be in flight — re-queue,
  back-to-back flushes), an entry deleted only if it is still the promise that created it; released in `finally` on success
  AND rejection; readers await a non-rejecting form (a failed write never becomes a failed read). `cancelQueries` only on an
  entry that already has data (cancelling a cold first fetch strands it in pending). Limit: a write that never settles (hung
  worker) holds its readers — the same failure as today's hung write.
- **BR-R0-9 · Honest errors.** A rejected write keeps today's honest save-state ("Couldn't save") and console error; the
  shared error toast is R1 (F-7) — not pulled forward.

## 4. Acceptance — Verification Gate + Visual Gate

**A. Vitest (core)** — `notes-service.test.ts`:
1. `writePageContent` / `updatePage` on a soft-deleted page → rejects `PageNotFoundError`; on an unknown id → same.
2. `addAttachment`, `createPageLink` (deleted source; deleted target), `createEntityLink` (deleted page) → `PageNotFoundError`;
   `createEntityLink` with an unregistered type still rejects `UnregisteredEntityTypeError` first.
3. `writePageContent` with `{type:'paragraph'}` / `{type:'doc'}` without `content` / content items without `type` →
   `InvalidPageContentError`, row unchanged.
4. `createPage({content:'not json'})` and a non-doc JSON → rejects; `ensureEntityNote` seed still creates. `seedContent`
   shapes (`{}`, `{title:''}`, `{title:'x'}`, full seed) → ≥1 block and no empty text node (the structural rules the editor
   check enforces — test 6b proves those rules against the real schema).
5. `isEditorDocument` truth table.

**B. Vitest (editor)** — `editor.test.tsx`:
6. A doc with an unknown node type → `onInvalidContent` called once, `onChange` **never** called (asserted **after** the
   editable-sync effect has run — wait for the editor instance, then flush effects), editor not editable, toolbar absent.
6b. Schema-check table: `{doc,content:[]}` and an empty-text heading are invalid; one empty paragraph and every G16 seed
   shape are valid — so G4's normalizations + G16's seeds can never hit the notice.
7. A valid doc → `onInvalidContent` not called; existing tests green. The lenient-load test
   (`integration-blocks.test.tsx:92`) is re-read at gate 2 and flipped if its fixture now trips the check; its comment is
   re-grounded either way (undeclared attrs are DROPPED by `computeAttrs`, not thrown) (B-66/F-2 duty).
7b. A valid doc still emits exactly one mount echo (BR-E1-2 unchanged — `needsBaseline` depends on it). Asserted outside
   StrictMode; in dev StrictMode (`main.tsx:8`) the effect runs twice → two identical echoes, absorbed by dedupe.

**C. Vitest (web)**:
8. `parseContentResult`: absent (`null`, `''`, `{doc,content:[]}`) · ok (incl. empty-text-node stripping) · malformed (bad
   JSON; JSON non-doc) · `parseContent` wrapper parity.
9. `useNoteContent`: `flush()` writes pending immediately; `cancel()` drops it (no write); `lock()` then `save()` → no write
   and no unmount write; `visibilitychange→hidden` flushes; `pagehide` flushes; a rejected write re-queues and the next flush
   retries, while a `PageNotFoundError` does not re-queue; flush cancels then writes through `['pages',id]` / `['journal',date]` synchronously; settle invalidates the G13 set
   (journal page → 4 keys; note → 2).
9c. Cold-cache barrier: NO `['journal',date]` entry; write on the note page, unmount, mount Home immediately → its
   `ensureJournal` read waits for the write and the editor seeds the NEW doc; same for the reverse (Home writes → note page
   `getPage`).
   + a REJECTED write: the waiting reader still resolves and reads whatever is stored; two overlapping writes → the read
   waits for both.
9b. B-53 warm-cache test: seed `['journal',date]` (Home visited), write a new doc through the note page's hook, unmount it, mount
   Home's `NoteEditorBody` from cache → the editor is seeded with the NEW doc; typing writes new + edit, never the old body.
10. `NoteEditorBody`: `contentStatus:'malformed'` → notice (`role="status"`, heading level per host) + "Export a copy", no
    editor, no write; editor `onInvalidContent` → switches to the notice, no write (lock); "Export a copy" → raw `.json`;
    "Export as Markdown" offered only when the raw parses to a doc.
11. `toNoteEntity` maps `contentStatus` + `rawContent`.

**D. Live smoke on real OPFS** (dev app, Node 24):
12. Seeding path: R0 closes the service to malformed content, so bad rows are planted with raw SQL through the e2e harness
    driver (`window.__vidaDb.exec`, `apps/web/e2e/harness.ts:42,62`; same-origin OPFS DB — confirmed at gate 2) as an
    `UPDATE pages SET content=?`. Cases: unknown node (`{"type":"doc","content":[{"type":"futureBlock"}]}`), unknown mark,
    `"{not json"`, plus the G16 regressions (`{"type":"doc","content":[]}` and an empty-text heading must OPEN normally) →
    open each → notice / editor as expected → wait 2 s, reload → DB bytes byte-identical for the notice cases.
13. B-53 repro: open Home first (cache primed) → edit today's journal at `/notes/$id` → return Home within 30 s → body shows the
    new text → type on Home → DB = new text + the Home edit. Then cold: reload → edit at `/notes/$id` → go Home immediately →
    same outcome.
14. E-1: edit → switch tab within 500 ms → reload → edit kept.

**E. Visual Gate** (real browser, Victor reviews): the EC-33 notice on the note page and on Home × light/dark ×
375/768/1440 — both entry paths (malformed at load; and the dynamic editor→notice switch from an unknown node); axe 0;
keyboard: Tab reaches both export actions, Enter downloads; VoiceOver announces the status and reads the heading.

**F. Gates:** `pnpm typecheck` · `pnpm lint` · affected tests green (core, editor, web). `/critique` SHIP.

## 5. Build steps (outline — refined into the IMPLEMENTATION-PLAN at gate 2)

1. core: `isEditorDocument` (validators/editor.ts) + `createPageSchema.content` refine + `seedContent` G16 fix (tests 4–5).
2. core: `PageNotFoundError` / `InvalidPageContentError` + `requireLivePage` on the 5 write paths; update BR-7c text (tests 1–3).
3. editor: content check + `onInvalidContent` + ref-guarded emit + `setEditable(effective, !invalid)` (tests 6, 6b, 7, 7b);
   editor current-* + `packages/editor/src/CLAUDE.md`.
4. web: `parseContentResult` + `NoteEntityData` fields + samples (tests 8, 11).
5. web: `pendingBodyWrites` barrier + `useNoteContent` flush/cancel/lock/hide/re-queue + `journalDate` + cancel-then-
   write-through + invalidation set; `useNoteEntity` / `useJournalEntry` await the barrier; callers pass `journalDate`
   (tests 9, 9b, 9c).
6. web: `NoteEditorBody` EC-33 notice + exports (test 10); stale headers in touched files rewritten (B-55/56 · E-5):
   `use-note-content.ts` (:9-12, :61), `use-note-entity.ts` (:3-9), `live-mappers.ts` (:29 doc comment),
   `note-editor-body.tsx` header, `home/journal-page-region.tsx` (:9-11).
7. Live smoke D + Visual Gate E; currency (§XXIX / F-8): `docs/modules/notes/current-*`, `docs/editor/current-*`,
   `docs/modules/journals/current-*` (the Home journal body + its cache keys), `apps/web/src/home/CLAUDE.md`,
   `packages/editor/src/CLAUDE.md` — committed with the code.

## 6. Change log
- rev 1 (2026-10-26) — gate-1 draft.
- rev 2 (2026-10-26) — independent critique round 1 = REVISE (4 blocking, 8 advisory); all folded in. Blocking: **B1** B-53 not
  fixed by invalidation → synchronous write-through (G13/G14, test 9b, live 13 reordered) · **B2** always-on check rejects our
  own seeds (`{doc,content:[]}`, empty text) — reproduced on 3.30.0 → G16 seed fix + G4 lossless normalizations + test 6b ·
  **B3** no-write mechanism under-specified, echo mis-cited → ref-guarded `onUpdate` + `setEditable(effective, !invalid)`,
  valid path keeps the echo (G1/G3, tests 6/7b) · **B4** missing stale headers + journals currency (step 6/7). Advisory:
  `lock()` latch · lossless `.json` export primary + `include_frontmatter` · citations re-grounded · guard home
  `validators/editor.ts` · notice `role="status"` + heading levels + dynamic-switch Visual Gate · raw-SQL seeding path ·
  failed-write re-queue · CanvasEditor recorded (G17).
- rev 3 (2026-10-26) — critique round 2 = REVISE (1 blocking, 6 advisory; B2–B4 verified resolved, G3 mechanism verified
  against @tiptap/react 3.30.0's lifecycle). Blocking: B-53 cold cache (absent/GC'd entry races the in-flight write) →
  `pendingBodyWrites` read-after-write barrier + `cancelQueries` before write-through (G13/G14, test 9c, cold live repro).
  Advisory: `rawContent` in the write-through · `lock()` synchronous in the callback · re-queue retryable-only + the
  after-unmount limit stated · BR-R0-2 wording · StrictMode double echo noted · G10/G3 citations fixed.
- rev 3 · round 3 (2026-10-26) — critique = **SHIP**. Its three implementation conditions recorded as BR-R0-8b (synchronous
  registration in `flush()`, per-key chain + `finally` release + non-rejecting reader await, `cancelQueries` only on warm
  entries); advisory folded into test 9c (rejected write + overlapping writes).
- **APPROVAL 1 — Victor, 2026-10-26.** Gate 2 (IMPLEMENTATION-PLAN → /preflight → /critique → Approval 2) next.
