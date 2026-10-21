# PLAN — home-journal-go-live · S1 (live journal entry)

**Gate:** §XXVI g1 (PLAN → Approval 1). **Profile:** Add Frontend Component / Entity Delivery Flow ②.
**Unit:** make the Home journal *entry* a live, persisting editor. **Precedent:** notes-entity-usability (PR #150).

## 0. Baseline (Step 0 — grounded)
See `.claude/tasks/home-journal-go-live.md` triage. The journal *entry* is a `type:'journal'` `pages` row
owned by NotesService; the `journals` aggregation service and the Dashboard stay out (no registered providers).

## 1. Interpretation (ratify — the surface shipped & gated)
- **DEPENDENCIES** — `getServices().notes` (live post data-plane-wiring) `[FACT: db/composition-root.ts:notes]`;
  `@vida/editor` `VidaEditor` (already an apps/web dep via notes) `[FACT: notes/note-editor-body.tsx:14]`;
  libsodium loaded globally in `build()` via `initVault()` `[FACT: composition-root.ts]` (writes need the
  unkeyed `_sync_hash` — [[repository-writes-need-initvault-even-in-m1]]).
- **NEEDS** — a "today" key as a **local** `YYYY-MM-DD` (NOT `toISOString()` UTC — [[date-code-needs-tz-forced-tests]]);
  get-or-create the day's page; mount the editor on its content; persist via `writePageContent`.
- **ORGANIZATION** — reuse `NoteEditorBody` + `useNoteContent` + `toNoteEntity` (all page-id-keyed, note-agnostic).
- **IMPLICIT RULES / CONVENTION (doc-check result)** —
  - Page materialization = **idempotent get-or-create-on-access**, the documented `ensureEntityNote` / NP-8
    convention `[FACT: services/notes/service.ts:163-183]` ("return the existing… Absent → create"). The journal
    equivalent **mirrors it as a service method `ensureJournal(date)`** — NOT get-or-create hand-rolled in a hook.
  - NP-2 uniqueness is **enforced IN-SERVICE** `[FACT: notes-and-pages/interpretation.md:73]`; `createPage` already
    pre-checks `getPageByJournalDate` and throws **`JournalExistsError`** (the real class) `[FACT: notes/index.ts]`.
  - The entry row is **Notes-owned** `[FACT: journals/identity.md:42-43]`; a blank journal is a valid state
    (identity.md:54 "Empty / first day"). `createPage` content is a JSON **string**; `writePageContent` takes an
    `EditorDocument`. `journal_date` required iff `type='journal'` `[FACT: validators/note.ts:42]`.

## 1.5 Envision Gate — **SKIP**
No net-new affordance: the Home surface + the journal region frame shipped & were Victor-reviewed in fe-home
(Visual Gate PASS). We swap a static body for the live editor already shipped in notes. State the skip; no greybox.

## 2. Decomposition — **1 slice**, two layers (front matter collapses; single surface)
A thin `@vida/core` seam (`ensureJournal`, mirroring `writePageContent`'s go-live precedent) + the frontend flip.
Seam-contract = `NotesService.ensureJournal(date) → PageRow` + the existing `getPage`/`writePageContent`.

## 3. Create-timing — **RESOLVED by convention (not an open call)**
The doc-check settled this (see §1 CONVENTION): materialization = **idempotent get-or-create-on-access**, placed
**in-service** as `ensureJournal(date)` mirroring `ensureEntityNote` (NP-8). This is the codebase's own convention —
lazy-create-on-first-write (the earlier "B") would *diverge* from it. No A/B choice remains; nothing to decide here.
A blank journal row per opened day is a valid, intended state (identity.md:54 "Empty / first day"), journal-per-date
being the grain snapshots/review expect.

## 4. Build steps (S1)
0. **`packages/core/src/services/notes/{service,types}.ts`** — add `ensureJournal(date: string): Promise<PageRow>`
   to `NotesService` + impl, a **faithful mirror of `ensureEntityNote`** (NP-8): `getPageByJournalDate(date) ??
   createPage({ type:'journal', journal_date: date, title: date })`. Title = the `YYYY-MM-DD` date — non-empty,
   deterministic, **locale-free** (keeps `@vida/core` Intl-free; also fixes `NoteEditorBody`'s accname leading-space,
   [[tamagui-and-rnw-ui-gotchas]]). No explicit race-catch — mirrors `ensureEntityNote`; `createPage`'s in-service
   NP-2 pre-check is the backstop (single-user-local). Core test mirrors the `ensureEntityNote` test (creates once;
   same row on re-call; NP-2 respected).
1. **`apps/web/src/home/use-journal-entry.ts`** (new) — a THIN hook (get-or-create now in-service):
   - `today()` = local `YYYY-MM-DD` from `getFullYear/getMonth/getDate` (TZ-safe; unit-tested with a forced TZ).
   - `useQuery({ queryKey: ['journal', today], queryFn: async () => toNoteEntity(await (await getServices()).notes.ensureJournal(today)) })`.
   - DEV `?sample` path → a populated sample journal page (Visual Gate seed; off in prod), mirroring `use-note-entity`.
   - Map state: data → `success`; pending → `loading`; error → `error`. (No `empty` — `ensureJournal` always yields a page.)
2. **`apps/web/src/home/journal-page-region.tsx`** (edit) — make it self-contained:
   - Call `useJournalEntry()`. Keep the `PageFrame role="region"` + terminal-state frames (loading skeleton / error).
   - On `success` render `<NoteEditorBody page={page} />` (imported from `../notes/note-editor-body`) — the live
     `<VidaEditor chrome="bare">` + honest save-state (`Saving…/Saved/Couldn't save`), reused verbatim.
   - Remove the static `PageBody`/`InlineBlock` prose (the live editor replaces it; integration-block node-views
     remain the deferred #31 seam *inside* the editor). Keep the `editorState?` prop override for the Visual Gate.
3. `home-surface.tsx` — **unchanged** (already composes `<JournalPageRegion />` in both arrangements).

## 5. Verification (Step 8–11)
- tsc 0 (core + web) · eslint 0 (changed files) · unit: core `ensureJournal` test (mirrors `ensureEntityNote`) +
  `use-journal-entry.test.ts` (TZ-forced today, `?sample`) + `journal-page-region.test.tsx` (terminal states,
  mounts editor on success). Rebuild `@vida/core` dist before the web typecheck ([[editing-vida-types-needs-a-dist-rebuild-before-core-typecheck]] class).
- **Visual Gate (blocking) — LIVE in Brave on the real OPFS worker** (unit tests mock the service; seam defects
  only show live): land on `/` → write → `Saved` → reload → text persists → reopen → **no spurious write**
  (the mount-echo dedupe, [[tiptap-onchange-fires-on-mount-dedupe-content-writes]]). Console clean. 3 presets × L/D.
- §XXIX currency: refresh `apps/web/src/home/CLAUDE.md` (journal region now LIVE via NotesService).

## 6. Risks / watch
- **Mount-echo write** — `useNoteContent` dedupes against loaded content; verify a mere-open bumps nothing.
- **UTC-day bug** — build `today` from local fields, test under a forced TZ (gate is TZ-blind).
- **Create race** — `ensureJournal` mirrors `ensureEntityNote` (no catch); `createPage`'s in-service NP-2 pre-check
  + React Query key-dedup cover it (single-user-local).
- **@vida/editor dep** — already present `[FACT: apps/web/package.json:21]`; resolves for notes today.
- **Core dist rebuild** — editing `@vida/core` requires a dist rebuild before the web typecheck sees `ensureJournal`.
