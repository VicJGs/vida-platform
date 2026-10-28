# IMPLEMENTATION-PLAN — notes-rescope R0 · Data safety

> §XXVI **gate 2** (rev 2, 2026-10-26 — gate-2 critique round 1 folded in, §5) for the approved `PLAN-R0-data-safety.md` (rev 3, Approval 1 — Victor 2026-10-26).
> Build steps in order; each step = tests first → red → implement → green → next. A divergence = §XXVIII (STOP).
> Every BR / test number below refers to the PLAN. Versions verified on disk: `@tiptap/core|react 3.30.0`,
> `@tanstack/query-core 5.101.4`. Worktree `.claude/worktrees/notes-rescope`, Node 24.

## 0. Gate-2 refinements of the PLAN (to be critiqued here; PLAN updated on Approval 2)

- **R-1 · No `cancelQueries` — a generation re-read instead (refines G13 / BR-R0-8b clause 3).** FACT (query-core 5.101.4):
  `cancelQueries` defaults to `revert:true` [queryClient.js:141-142], but a manual `setQueryData` also replaces the revert
  snapshot [query.js:373], so cancel-then-set would be _safe_ for a warm entry. The cancel is still dropped because it only
  covers half the race. It needs the "warm entries only" condition (cancelling a cold first fetch strands it in pending),
  and it does nothing for a read whose query function is already past the barrier (e.g. a first fetch that started just
  before the writer's flush). One mechanism covers both: every body read goes through `readAfterWrites(keys, read)`, which
  records a per-key **generation** before reading and re-reads (after awaiting the barrier) when a write registered while it
  was reading. Any fetch that overlapped a write resolves with post-write data, so no late fetch can regress the cache. The
  write-through stays synchronous.
- **R-2 · The write leaves `useMutation` for a direct promise (refines BR-R0-8b clause 1).** Registration must be synchronous
  in `flush()`. React Query v5 `mutate` awaits before `mutationFn`, and per-call `mutate` callbacks don't fire after the
  observer unmounts (the unmount flush is exactly that case). `flush()` therefore builds the write promise itself
  (`getServices().then(s => s.notes.writePageContent(...))`), registers it in the barrier in the same tick, and handles
  settle in `.then/.catch` guarded by `mounted`. The honest save-state is unchanged.
- **R-3 · The EC-33 notice composes `@vida/ui` `EmptyState` (refines G7).** It is the canon block for title + body +
  action slots, and its a11y contract is already gated (a `role="group"` named by a `role="heading"` title) [FACT:
  packages/ui/src/components/empty-state.tsx:14-17,93-95]. It doesn't make itself a live region, so the consumer wraps it
  in `role="status"` (its own contract says so). **Heading level = 2 on both surfaces:** the note page title is plain
  `Text`, not a heading [FACT: entity-view.tsx:151-153], and Home's journal frame is a named `region` with no heading
  [FACT: home/journal-page-region.tsx:48]. So the notice is the first heading inside its region on both, and the PLAN's
  "h2 note page / h3 Home" was based on an outline that doesn't exist.

## 1. Build steps

### Step 1 — core: content guard + seed fix (tests 4, 5)

- `packages/core/src/validators/editor.ts`: `export function isEditorDocument(x: unknown): x is EditorDocument`: same rule
  as `@vida/editor` `assertEditorDocument` (doc root, `content` array, each item an object with a string `type`). Also
  `export function isEditorDocumentJson(s: string): boolean` (`JSON.parse` in try → `isEditorDocument`).
- `packages/core/src/validators/note.ts`: `createPageSchema.content` → `z.string().nullish().refine(c => c == null ||
isEditorDocumentJson(c), { message: 'content must be a serialized EditorDocument' })`.
- `services/notes/service.ts` `seedContent`: heading only when `seed.title != null && seed.title !== ''`; when `content` ends
  up empty, push `{ type: 'paragraph' }`.
- Tests: `validators/__tests__/editor.test.ts` (or the existing validators test file, matching its pattern):
  `isEditorDocument` truth table. `notes-service.test.ts`: `createPage` with `'not json'`, `'{"type":"paragraph"}'` → reject;
  `ensureEntityNote` with seeds `{}`, `{title:''}`, `{title:'x'}`, full seed → stored doc has ≥1 block and no `text:''` node.

### Step 2 — core: live-page guard + typed errors (tests 1–3)

- `services/notes/types.ts`: `PageNotFoundError(id)` (`name='PageNotFoundError'`, `pageId`), `InvalidPageContentError(id)`
  (`name='InvalidPageContentError'`, `pageId`), following the `TaskNotFoundError` shape; `index.ts` re-exports both (the
  root barrel already does `export * from './services/notes'`, core/src/index.ts:175).
- `service.ts`: `async function requireLivePage(id)` = `pageRepo.findById(id)` (filters `deleted_at`) → throw
  `PageNotFoundError`. Applied to: `updatePage`, `writePageContent` (after `isEditorDocument(content)` else
  `InvalidPageContentError`, the shape check first so a bad body never costs a read), `addAttachment`, `createPageLink`
  (source then target), `createEntityLink` (after `assertRegistered`).
- Tests as PLAN §4 A 1–3 (deleted + unknown id for each op; error order for `createEntityLink`; row unchanged after
  `InvalidPageContentError`).
- Docs: `docs/modules/notes/current-business-rules.md` BR-7c → superseded by BR-R0-5/6 (done in step 7 with the rest).

### Step 3 — editor: always-on content check (tests 6, 6b, 7, 7b)

- `packages/editor/src/editor.tsx`:
  - prop `onInvalidContent?: (error: Error) => void` (doc comment: fires once at mount when the stored doc fails the
    schema; the editor is then read-only and emits nothing).
  - `const invalidRef = useRef(false)`, `const [invalid, setInvalid] = useState(false)`, `onInvalidContentRef` (the
    `onChangeRef` pattern).
  - `useEditor({ …, enableContentCheck: true, onContentError: ({ error }) => { invalidRef.current = true; setInvalid(true);
onInvalidContentRef.current?.(error) }, onUpdate: ({ editor }) => { if (invalidRef.current) return; … } })`.
  - Sync effect: `const effective = editable && !invalid`;
    `editor?.setEditable(effective && !invalidRef.current, !invalidRef.current)`, deps `[editor, editable, invalid]`.
  - Toolbar gate: `toolbar && editable && !invalid && editor`.
- Tests in `editor.test.tsx`: unknown node → `onInvalidContent` ×1, `onChange` ×0 after effects flush, not editable, no
  toolbar; 6b schema table (via the package's headless helper with `enableContentCheck`); valid doc → exactly one echo
  (non-StrictMode render). `integration-blocks.test.tsx:92`: comment re-grounded (undeclared attrs are dropped by
  `computeAttrs`, not thrown-and-caught); the test itself is unaffected (it builds a headless Editor without the check).
- Docs: `docs/editor/current-spec.md` (`<VidaEditor>` contract gets `onInvalidContent`; content-check paragraph),
  `docs/editor/current-business-rules.md` BR-E1-7 (= BR-R0-3), `packages/editor/src/CLAUDE.md` "Shipped" entry.

### Step 4 — web: tagged parse + entity fields (tests 8, 11)

- `apps/web/src/notes/live-mappers.ts`: `export type ContentParse = { status:'absent' } | { status:'ok'; doc:
EditorDocument } | { status:'malformed'; raw: string }`; `parseContentResult(c)`: `null`/`''` → absent; `JSON.parse` throw
  or `!isEditorDocument` → malformed (raw kept); strip `{type:'text', text:''}` recursively; `content.length===0` → absent.
  `parseContent(c)` = `ok ? doc : null` (doc comment rewritten). `toNoteEntity` adds `contentStatus` + `rawContent:
p.content ?? null`.
- `use-note-entity.ts`: `NoteEntityData` += `contentStatus: 'ok' | 'absent' | 'malformed'`, `rawContent: string | null`;
  `sampleFor` + `home/use-journal-entry.ts` `sampleJournal` fill them, as do the test literals in `note-entity.test.tsx:32`
  and `home/journal-page-region.test.tsx:29` (required fields → typecheck). Header :3-9 rewritten (live, not "M1 DEFAULT").
- Tests: `live-mappers.test.ts` (new): the parse table + wrapper parity + `toNoteEntity` mapping.

### Step 5 — web: barrier + write seam (tests 9, 9b, 9c)

- New `apps/web/src/notes/body-writes.ts` (pure module, no React):
  - `trackBodyWrite(keys: string[], write: Promise<unknown>): void`: for each key, chain
    `next = Promise.all([prev, write.then(noop, noop)]).then(noop)`, bump `generation[key]`, store `next`, and
    `next.finally(() => { if (chains.get(key) === next) chains.delete(key) })`.
  - `readAfterWrites<T>(keys: string[], read: () => Promise<T>): Promise<T>`: loop { `g` = generations (snapshot
    **BEFORE** waiting); await all chains for keys (non-rejecting by construction); `r = await read()`; if generations
    still equal `g` return `r` }. Any write that registers during the wait OR the read bumps a generation, so the loop
    re-waits and re-reads.
  - `bodyWriteKeys(id, journalDate)` → `['page:'+id, ...(journalDate ? ['journal:'+journalDate] : [])]`.
  - `__resetBodyWrites()` for tests.
- `use-note-content.ts`: signature `useNoteContent(page: Pick<NoteEntityData,'id'|'content'|'journalDate'|'contentStatus'>)`.
  - `locked` ref initialised to `page.contentStatus === 'malformed'`; `lock()` sets it + clears pending/timer; `save` is a
    no-op when locked.
  - `flush()`: clear the timer; take `pending`; **write-through** (sync): `qc.setQueryData(['pages',id], row => row &&
{...row, content: serialized})`; journal → `qc.setQueryData(['journal',date], e => e && {...e, content: doc,
contentStatus:'ok', rawContent: serialized})`; build `write = getServices().then(s => s.notes.writePageContent(id, doc))`;
    `trackBodyWrite(bodyWriteKeys(id, date), write)`; then `write.then(onOk, onErr)`. `onOk`: promote `lastSaved`, `saved`
    if mounted, invalidate `['pages',id]` · `['notes','pages']` · journal: `['journal',date]` + `['calendar','journal']`.
    `onErr`: console error; `error` if mounted; re-queue `{doc, serialized}` into `pending` only if `pending` is empty and
    the error is not terminal: discriminated by `error.name` ∈ {`'PageNotFoundError'`, `'InvalidPageContentError'`}
    (stable `.name`, the BR-S1-6 convention — robust across the core dist boundary, unlike `instanceof`).
  - `cancel()`: clear timer + pending. Return `{ save, saveState, flush, cancel, lock }`.
  - Mount effect adds `document` `visibilitychange` (when `document.visibilityState === 'hidden'`) and `window` `pagehide`
    listeners → `flushRef.current()`; removed on unmount (the unmount flush stays).
  - Header :1-12 + :61 comment rewritten.
- Readers: `use-note-entity.ts` queryFn → `readAfterWrites(['page:'+id], () => …getPage(id))`; `use-journal-entry.ts`
  queryFn → `readAfterWrites(['journal:'+date], () => …ensureJournal(date))`.
- Tests: `use-note-content.test.ts` flipped to the new signature (existing 5 kept) + PLAN tests 9; `body-writes.test.ts`
  (chain, overlapping writes, rejected write releases, generation re-read, **a write registering mid-wait** — the reader
  must return post-B data); 9b/9c as hook-level tests with two
  `renderHook`s over one `QueryClient` (writer unmount → reader mount; warm = pre-seeded cache, cold = empty cache and a
  write held open by a deferred).

### Step 6 — web: EC-33 notice + exports (test 10)

- New `apps/web/src/notes/export-copy.ts`: `downloadText(filename, text, mime)` (Blob → object URL → `<a download>` click →
  revoke); `copyFilename(title, ext)` (title or `untitled`, path-unsafe characters → `-`).
- `note-editor-body.tsx`: `const { save, saveState, lock } = useNoteContent(page)`;
  `const [invalid, setInvalid] = useState(page.contentStatus === 'malformed')`; editor gets
  `onInvalidContent={() => { lock(); setInvalid(true) }}`. `invalid` → (no editor)
  `<View role="status"><EmptyState title="This page can't be opened for editing" action={<>Button secondary "Export a
copy" (raw → .json) · when parseContentResult(raw) is ok-or-parses-to-a-doc, Button ghost "Export as Markdown"
(toMarkdown(doc, {include_frontmatter:false}) → .md, computed in a try/catch at render: on throw the button is not
offered — BR-E6-9 covers unknown nodes/marks only, and `isEditorDocument` is top-level, so malformed children can throw)</>}>It contains content this version of Vida can't read. Nothing
will be overwritten.</EmptyState></View>`. "Export as Markdown" uses the **unnormalized** parsed doc when the raw is a
  doc (status may be ok-but-schema-invalid); hidden when the raw doesn't parse.
- Headers: `note-editor-body.tsx` (:1-11), `home/journal-page-region.tsx` (:9-11).
- Tests: `note-editor-body.test.tsx` (new): malformed → status + heading + both/one export buttons + no editor + no write;
  `onInvalidContent` path (mock `@vida/editor` `VidaEditor` to invoke the prop) → notice + `lock` (a later `save` writes
  nothing); export click → `downloadText` called with `.json` raw / `.md` markdown.

### Step 7 — verification, live leg, currency

- Rebuild `@vida/core` **and** `@vida/editor` dists (both resolve `exports → ./dist`) before the web typecheck/tests ·
  `pnpm typecheck` · `pnpm lint` · `pnpm --filter @vida/core test` · `--filter @vida/editor test` · `--filter @vida/web
test` (Heavy Tamagui shell tests flake under concurrent load → re-run the failing file alone before triage, per memory).
- **Venue (FACT: this Mac is macOS 12.7.6; Playwright's Chromium needs 13+ — `apps/web/e2e/CLAUDE.md:44-45`; CI is dark
  on Actions billing).** The live leg + Visual Gate run **locally** the way the repo's gates have run: a playwright-core
  script driving **system Brave** (`executablePath`, the visual-gate playbook) against `pnpm dev:app` (real wa-sqlite/OPFS
  worker). The same scenarios are ALSO committed as `apps/web/e2e/notes-data-safety.spec.ts` (shared fixtures) for the
  CI `e2e` job once CI is back; locally `playwright test --list` only.
- **Seeding (both venues):** the harness opens `'vida'` and runs `migrate` **before the app ever opens it**, then `INSERT`s
  whole `pages` rows per case (the 6 NOT-NULL-no-default columns: `id`, `created_at`, `updated_at`, `_sync_id` (UNIQUE,
  fresh UUID), `_sync_device_id`, `_sync_lww_ts` — `_shared.ts:24-38`; the rest default/nullable) and `close`s, then the tab
  navigates to `/notes/<id>`. Seeding needs no app → harness transition. The **read-backs** do (byte-identical check, B-53,
  E-1): the tab navigates app → harness after the app had `'vida'` open, so the worker is torn down as with `reload()`. For
  every harness `open`, seeding or read-back: if the DB handle is reported in use, retry once; if it still fails, STOP →
  §XXVIII (both venues). Cases: unknown node · unknown mark · `{not json` → notice; wait 2 s, reload, harness read-back
  byte-identical. `{"type":"doc","content":[]}` and an empty-text heading → editor opens; no write on open. B-53 warm + cold
  and E-1 (edit → `visibilitychange` hidden via a page `evaluate`, or a tab switch → reload → kept) driven in the real app.
  If the harness can't re-open `'vida'` after the app (OPFS lock), STOP → §XXVIII.
- **Visual Gate (PLAN §4 E)**: Brave/playwright-core screenshots of the notice on `/notes/$id` and Home × light/dark × 375/768/1440,
  both entry paths; axe; keyboard path; Victor reviews; VoiceOver trace by Victor (the SR step needs a human).
- **Currency (§XXIX, committed with the code):** `docs/modules/notes/current-{spec,business-rules}.md`. Named BR edits:
  **BR-7c** superseded by BR-R0-5/6. **BR-S2-2** amended: still deterministic, but an empty title emits no heading and an
  empty seed emits one empty paragraph. **BR-SUR-3** amended: content parses to a tagged result (absent/ok/malformed), and
  malformed means read-only + notice, not `null` + blank editor. **BR-NEU-3** gains flush-on-hide + re-queue + barrier.
  **BR-S3-1** notes that revive now requires both pages live. Add BR-R0-1…9 (surface: parse/notice/barrier); note that
  the body write is a direct promise (not a v5 mutation), so it never pauses under `networkMode:'online'` while offline,
  which suits a local-first write. Editor BR-E1-7 also records that `VidaEditorHandle.setContent` now throws on an
  invalid doc (it inherits `enableContentCheck`, core dist `:1276-1293`; no app callers today). · `docs/editor/current-*` (step 3) · `docs/modules/journals/current-*` (Home body
  cache keys + barrier) · `apps/web/src/home/CLAUDE.md` · `packages/editor/src/CLAUDE.md` · PLAN §6 records R-1…R-3 ·
  reconciliation rows A-6/A-7/B-30/B-50/B-51/B-52/B-53/C-46/C-48/E-1 → ✅ R0.
- `/critique` on the diff → SHIP; commit per step group (core · editor · web · e2e+docs), conventional messages.

## 2. Files

| Plane  | Files                                                                                                                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| core   | `validators/editor.ts` · `validators/note.ts` · `services/notes/{service,types,index}.ts` · tests                                                                                                       |
| editor | `src/editor.tsx` · `src/editor.test.tsx` · `src/extensions/integration-blocks.test.tsx` (comment) · `src/CLAUDE.md`                                                                                     |
| web    | `notes/{live-mappers,use-note-entity,use-note-content,note-editor-body,body-writes,export-copy}.ts(x)` · `home/{use-journal-entry,journal-page-region}.ts(x)` · tests · `e2e/notes-data-safety.spec.ts` |
| docs   | notes · editor · journals current-\* · home + editor CLAUDE.md · PLAN §6 · reconciliation                                                                                                               |

## 3. Preflight (2026-10-26) — PASSED

Layers: **core service** (typed errors, guarded ops, seed — §1 steps 1–2) · **DB** (no schema change; `pages`,
`note_attachments`, `page_links`, `entity_links` via AR-6 — reads/updates only) · **editor** (prop + mechanism — step 3) ·
**web data** (parse, barrier, write seam, readers — steps 4–5) · **web UI** (notice states: malformed-at-load ·
switched-after-mount · both/one export actions; interactions: two buttons, keyboard native; no loading/empty state applies —
the download is synchronous; a Markdown conversion that throws simply isn't offered) · **integration** (UI → `getServices()` composition
root → `NotesService` → DB-6 repository → worker). Auth: N/A (M1 single-user local; SRP is M4). Documented BRs checked
against `docs/modules/notes/current-business-rules.md` + journals: no contradiction left unnamed (the 5 amendments are listed
in step 7).
Assumptions made explicit (each verified, or given a STOP):

1. `getServices()` is a cached singleton promise [FACT: db/composition-root.ts:61,134], so `.then` registration in `flush()`
   is synchronous.
2. The e2e harness can re-open `'vida'` in the same tab after the app releases it. Unverified → step 7 STOP rule.
3. No shipped story/test passes an editor-invalid `defaultValue` (grep of `*.stories.tsx` for empty-doc literals = 0 hits).
   Step 3 re-greps tests.
4. `<VidaEditor>` sets no `autofocus` (grep = 0), so the notice switch never strands focus inside a removed editor.
5. `setInvalid` inside `onContentError` runs inside useEditor's construction effect: a legal setState, one extra render.
6. jsdom drives TipTap's content check (existing editor tests already mount the real editor in jsdom).
7. `@vida/core` and `@vida/editor` dists rebuilt before the web typecheck/tests (both resolve `exports → ./dist`).

## 4. Risks

- `@vida/core` and `@vida/editor` dists must be rebuilt before `apps/web` sees the new exports.
- `enableContentCheck` makes **every** `<VidaEditor>` stricter: any shipped fixture/story with an invalid doc (e.g. an
  empty `{doc,content:[]}` `defaultValue`) now renders read-only. Step 3 greps `packages/editor`, `packages/ui`, and
  `apps/web` stories/tests for `defaultValue` docs and fixes the fixtures, not the check.
- `readAfterWrites` loops while writes keep arriving. They're user-paced, so it settles; no cap needed, and a cap would
  reintroduce the stale read.

## 5. Change log

- rev 1 (2026-10-26) — gate-2 draft; preflight PASSED.
- rev 2 (2026-10-26) — gate-2 critique round 1 = REVISE (2 blocking, 5 advisory). Blocking: **G2-B1** `readAfterWrites`
  snapshotted the generation after waiting, so a write registering mid-wait was missed → snapshot before the wait + a
  mid-wait test. **G2-B2** the live leg was planned on Playwright Chromium, which macOS 12.7.6 can't run → local venue =
  system Brave via playwright-core against `pnpm dev:app`, and the spec is also committed for CI. Advisory: harness-first
  seeding (no app → harness transition) · Markdown export in try/catch · required-field test literals + editor dist rebuild ·
  the `setContent` throw and the no-offline-pause benefit documented.
- rev 2 · gate-2 critique round 2 = **SHIP** (G2-B1/B2 verified resolved; harness-first seeding verified viable). Two
  advisories folded in: the read-back transitions are named and covered by the retry-once/STOP rule; the editor dist added to
  preflight #7 and the risks.
- **APPROVAL 2 — Victor, 2026-10-26.** Build started.

## 5a. Deviation record (§XXVIII)

### DEV-R0-1 · Write-through at flush time is too late for a warm cache (B-53 still reproduces) — STOPPED, pending approval

**Found:** step 7 live leg (Brave, real OPFS, 2026-10-26). Check "B-53 warm: Home shows the note-page edit" FAILED: Home
showed `OLD` after an edit on `/notes/$id`. Then typing on Home wrote `OLD HOME` over `OLD NEW` (the later "NEW" wait timed
out) — **the B-53 data loss, live.** Steps 1–6 otherwise pass (core 57/57 R0, editor 237/237, web 811/811; the 5 live
parse/notice cases PASS).
**Reproduced deterministically** (jsdom, `apps/web/src/notes/__repro-b53.test.tsx`): a warm `['journal',D]`, a writer with a
pending edit, one state update that swaps writer → reader → the reader's FIRST render reads `OLD`.
**Root cause (FACT):** a route swap renders the incoming tree (Home reads the cache synchronously, `useQuery` → `OLD`)
BEFORE the commit runs the outgoing tree's unmount cleanup (`useNoteContent`'s flush → `setQueryData`). The editor is
uncontrolled and the dedupe baseline is a `useRef` initial value, so both are fixed at that first render and never
re-seed. The round-3 critique's "commit order is on our side" holds for the reader's EFFECTS and query function (hence
the barrier works for cold caches) but not for its first render. Classification: **STRUCTURAL** (the approved
mechanism is ordered wrong; a symptom patch, e.g. re-seeding the editor on prop change, would race live typing).

**Proposed revision — rev 2 (deviation critique r1 = REVISE folded in; for preflight → Victor's approval):**
a module-level **latest-body overlay** written synchronously by `save()` and read **at the editor's seed point**.

- Why the seed point, not the reader hooks (critique r1 B1, verified): the editor body also remounts WITHOUT a new read.
  Switching merged ⇄ tabbed, or a tab switch in tabbed mode (only the active panel mounts), re-renders
  `NoteEntityView` with the SAME `page` prop from `NoteEntity`'s last render [FACT: note-entity.tsx:99,104-115;
  packages/ui/src/components/entity-view.tsx:180-205]. Reading at the seed covers route swaps (both directions) and every
  facet/tab remount, with no change to the reader hooks.
- Why no effect-based flush can work (critique r1, FACT): Home and `/notes/$id` are sibling routes in one `<Outlet/>`
  [routes.tsx:19-38,52-57,83-87,122-132], with no keep-alive. React renders the incoming tree before ANY cleanup of the
  outgoing one (passive or layout), so only data written by `save()` and read during render closes the gap.
- Why no `setQueryData` per keystroke (r1 #6, verified real): it re-renders `NoteEntity` → `toEntityProps` → the overview
  layout (a DashboardView grid in merged mode) → `EntityView` on every key, plus `replaceEqualDeep` over the doc.
- **`body-writes.ts` overlay API** (keyed `page:<id>` only — Home's journal entity carries `page.id`): entries
  `{doc, serialized, gen, owner}`. `setLatestBody(id, doc, serialized, owner) → gen`; `clearLatestBody(id, {owner} | {gen})`
  clears only the owner's entry, or only when `gen` ≥ the entry's (an older write settling never clears a newer
  `save()`); `latestBody(id)`. A plain `Map`, no subscriptions.
- **`useNoteContent`**: the seed is decided once at first render (`useState` initializer):
  `seed = latestBody(page.id) ?? page.content`. `NoteEditorBody` feeds `seed.doc` to `defaultValue`. The dedupe
  baseline stays the STORED body (`page.content`), so a mount seeded from an overlay re-saves it once through the
  normal debounce. **Ownership by design:** the new mount retries an edit whose outgoing write may still fail after
  unmount (round-2's stated limit closes). Cost: one redundant write of identical content, only when an unsaved
  overlay exists. Mere open of a clean page still never writes. `needsBaseline = page.content == null && no overlay`.
  `save()` sets the overlay on every REAL edit (after the dedupe). Cleared on: a write success (by gen) · `cancel()` /
  `lock()` (own entry) · a terminal error. A retryable error keeps it, and the next mount re-saves it.
- Kept unchanged: the barrier (cold caches), the flush-time warm `setQueryData`, the invalidation set.
- **Forward obligation (R5):** "Move to Trash" must call `cancel()` before the soft delete, so the overlay and the pending
  edit are dropped (no delete flow is wired in R0; recorded on R5).
- **Tests (r1 #7):** (a) the repro becomes permanent, in StrictMode, both directions, with the real `NoteEditorBody` (mocked
  editor probe for the seed); (b) facet switch in `note-entity.test.tsx`: type → toggle merged⇄tabbed AND tab-away/back
  within 500 ms → the new editor seeds NEW → typing writes NEW + edit; (c) an overlay-seeded mount writes the same doc
  once (ownership), never the stale body; (d) blank page + overlay → writes the overlay, no stale write; (e) overlay
  units: older-gen success keeps a newer overlay; cancel/lock clear only their own; terminal clears; success clears;
  (f) cold-barrier tests unchanged and green; (g) live B-53 warm re-run + a live tab-away/back case.
- PLAN impact: G13/G14 + BR-R0-8 reworded to "write-through at save time via the seed-point overlay". BR-R0-7 gains the
  ownership re-save. No BR removed.

**Deviation critique round 2 = SHIP** (2026-10-26). Advisories folded into rev 2:

- `NoteEditorBody`'s `invalid` and the hook's `locked` derive from the SAME seed object (one source; can't diverge).
- Terminal errors: `InvalidPageContentError` clears **by gen** (an older terminal write never drops a newer `save()`);
  `PageNotFoundError` clears unconditionally.
- BR-R0-7 wording states the real cost: a quick type-then-navigate usually costs one redundant identical write + its
  invalidations (the overlay lives until a write succeeds). It's cheap, and it's the price of the retry guarantee.
- **Forward obligation:** every NON-editor body writer (template apply R9, import, M4 sync pull) must clear
  `latestBody(id)` before writing, or a kept overlay would overwrite its body on the next mount. Recorded for R9 and M4.
- Tests (h)–(l) added: (h) a retryable failure after unmount, then remount → re-save succeeds, overlay clears;
  (i) gen race: gen-2 echo before the gen-1 success → survives gen 1, clears on gen 2; (j) exactly one redundant write
  under StrictMode; (k) a terminal `InvalidPageContentError` on an older gen keeps a newer entry; (l) (b) under StrictMode.
  **Status: AWAITING Victor's approval (§XXVIII step 4).**
- **DEV-R0-1 APPROVED — Victor, 2026-10-26.** Implementing (§XXVIII step 5).

### DEV-R0-2 · Undo-to-stored within the debounce writes the intermediate doc (pre-existing) — STOPPED, pending approval

**Found** while implementing DEV-R0-1 in `useNoteContent.save()`. **Reproduced:** `use-note-content.test.ts` — an
`it.fails` case (`DEV-R0-2`) passes, i.e. the defect is real: `save(edited)` then `save(loaded)` (undo back to the stored
body, inside 500 ms) → the dedupe `return` skips the second call but leaves the FIRST pending edit armed → the timer
writes `edited` while the editor shows `loaded`. **Root cause (FACT):** the dedupe branch returns without clearing
`pending`/the timer [use-note-content.ts `save` — the `serialized === lastSaved.current` line]. Pre-dates R0 (the
original hook had the same branch); squarely R0 scope (silent wrong content).
**Proposed fix:** in the dedupe branch, if an edit is pending, drop it (`clearTimer` + `pending = null`), clear this
writer's overlay (`clearLatestBody(id, {owner})` — the stored body is current again) and set save-state `saved`. Test:
flip the `it.fails` to `it` + assert no write at all + overlay cleared. Classification: ISOLATED (one branch, one cause).

- **DEV-R0-2 APPROVED — Victor, 2026-10-26; DONE.** The dedupe branch now drops a pending edit + this writer's overlay
  and sets `saved`; the `it.fails` test flipped to `it` (no write, overlay cleared, `saved`). Notes suite 169/169.
- **Step 7 gates (2026-10-26):** live OPFS (Brave) 18/18 · Visual Gate automated 18/18 (axe 0 light/dark on all 3
  surfaces, heading L2 in `role="status"`, Tab → "Export a copy", Enter → raw `.json`, no overflow at 375/768/1440) ·
  **Visual Gate ACCEPTED by Victor** (18 screenshots) · VoiceOver manual trace: **not done — Victor accepted on the
  automated a11y evidence** · core 2049/2049 (isolated run) · editor 237/237 · web 829/829 · tsc + lint clean.
  Live-run fixes inside approved scope: G4 normalization also drops an empty `content` key (the mount echo matched no
  baseline → mere open rewrote the page) · the live driver dismisses fe-onboarding's guided-setup modal. Noted,
  out of scope: `/favicon.ico` 404 (no icon in apps/web/index.html, also on main).
- **Post-implementation `/critique` r1 = REVISE (2026-10-26) → folded in.** **B1 (DEV-R0-2, second window — same
  approved defect):** the dedupe compared to `lastSaved` (moves only on success), so an undo made while a write was in
  flight was skipped and the in-flight write landed the undone body; the overlay-seeded mount had the same hole against
  the outgoing owner's in-flight NEW → dedupe target is now `expected` (what the DB will hold once queued writes settle);
  an echo while a foreign overlay exists is never deduped (keeps the ownership re-save); the undo branch drops only a
  DIFFERENT pending edit. Tests: own-write in-flight undo · overlay-seeded undo to the stale body. Advisories: the
  B-53 test no longer claims two directions it doesn't run (live run proves both) · test (j) renamed (no StrictMode
  claim) · the at-load fixture is shape-invalid bytes the parser really tags malformed · `role="status"` narrowed to the
  sentence (no controls in the live region) · stale BR cites fixed · `setContent(invalid)` behaviour MEASURED and pinned
  (throws; no latch; mount stays editable — the critique's "locks a healthy mount" risk does not occur) + CanvasEditor
  limit recorded · an overlay never unlocks currently-malformed bytes (seed stays malformed).
- **Post-implementation `/critique` r2 = SHIP (2026-10-26).** A1 folded in: a sticky `inheritsHandover` (set when seeded
  from an overlay, cleared by this mount's own successful write) disables the dedupe, so echo → type → undo inside the
  debounce can't cancel the ownership re-save (test added; red → green). A2 recorded as a stated limit (in-order worker).
  BR-NEU-5 reworded to the `expected` dedupe. Re-runs after the r1 fixes: live OPFS 18/18 · Visual Gate 18/18 (new a11y
  structure: sentence = live region, no controls in it, heading L2).
