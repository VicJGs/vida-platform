# IMPLEMENTATION-PLAN — notes-entity-usability   (session: 2026-10-20-notes-entity-usability · language: English)

> HUMAN GATE 2 — the self-sufficient build prompt derived from the APPROVED PLAN (Approval 1, 2026-10-20).
> Max depth. Every step cites the PLAN rule it satisfies + its own verification. Nothing built before Approval 2.
> **Node 24** for `@vida/core` + apps/web builds/tests. Verified live in **Brave** on the real OPFS worker (not jsdom).

## 1. Full context

Notes are live for read/list/create (data-plane-wiring PR #148 + today's `initVault` fix). The gaps that make a note
unusable, and their resolved blockers:
- **Open-on-click is a no-op** [FACT: `apps/web/src/notes/note-renderers.tsx:37,50` — `onPress={() => {}}` on `NoteRowCard` + `NoteTile`].
- **Create doesn't open** [FACT: `apps/web/src/notes/use-create-note.ts:27-29` — `onSuccess` only invalidates].
- **Content doesn't persist** [FACT: `apps/web/src/notes/note-editor-body.tsx:8-10` — IR-7 deferred; `use-note-entity.ts` live `getPage` already flipped (#149)].

Resolved facts for the build:
- Nav mechanism = `useNavigate()` from `@tanstack/react-router` [FACT: `apps/web/src/shell/nav-link.tsx:11,96`]. Route exists: `/notes/$id` → `note-entity.tsx` [FACT: `routes.tsx:75-81`].
- `VidaEditor` emits `onChange?: (doc: EditorDocument) => void` [FACT: `packages/editor/src/editor.tsx:29,167-172`] + `VidaEditorHandle.getDocument()` [FACT: `editor.tsx:49`]. `note-editor-body` mounts `VidaEditor` **directly** (D-S2-1), so the wire is `VidaEditor.onChange`, NOT the `page-binding` sink.
- `content` is a `text()` column [FACT: `packages/core/src/db/schema/notes.ts:50`]; stored as a JSON string. `parseContent` (string→doc) exists [FACT: `apps/web/src/notes/live-mappers.ts:30-37`]; the write needs `JSON.stringify(doc)`.
- `updatePageSchema` currently includes `content` [FACT: `packages/core/src/validators/note.ts` updatePageSchema], but **no caller passes `content` to `updatePage`** [FACT: rg of apps+packages — only metadata usages in `use-page-metadata.ts`]. Safe to drop → enforces BR-NEU-4.
- `NotesRow` carries `id` [FACT: `use-notes-rows.ts:21`]; `renderNotesView` already threads rows + `getKey={r=>r.id}`.
- `createPage` returns the created `PageRow` (with `id`) [FACT: `services/notes/service.ts:106-126`].

Decisions from the PLAN (Approval 1): BR-NEU-2 = create-and-open **in place**; configurable/new-tab → task `note-open-behavior-preference` (OUT). CRDT/Yjs sync = M4 (OUT). `[E]` content encryption = M3 (OUT).

## 2. Scope of changes

**Files touched (sanctioned owned module-completion of #27 + 1 additive @vida/core method):**
- `packages/core/src/validators/note.ts` — drop `content` from `updatePageSchema` (keep in `createPageSchema`).
- `packages/core/src/services/notes/service.ts` + `types.ts` — add `writePageContent(id, content)`.
- `apps/web/src/notes/note-renderers.tsx` — `onOpen(id)` on cards/tiles (replace the no-op).
- `apps/web/src/notes/notes-surface.tsx` — provide `onOpen` via `useNavigate`.
- `apps/web/src/notes/use-create-note.ts` — navigate to the new note on success (create-and-open).
- `apps/web/src/notes/note-editor-body.tsx` — wire `VidaEditor.onChange → debounced writePageContent` + honest save-state.
- `apps/web/src/notes/use-note-content.ts` (NEW) — the content-write mutation hook (debounce + save-state).
- `apps/web/src/notes/note-entity.tsx` — refresh the stale 'empty' copy ("once the data plane is connected" → honest "not found").
- Tests: the touched units' `*.test.*` updated/added; a live Brave check.

| NOT done (out) | Why |
|---|---|
| CRDT/Yjs sync + multi-device merge | M4 (`MVP-PATH:185`); `writePageContent` is shaped so M4 swaps its internals |
| `[E]` content encryption | M3 (`schema/notes.ts:47`) — M1 pass-through |
| FTS5 search of content | DB-8 / M1.4 |
| Configurable create/open + new-tab + Settings | task `note-open-behavior-preference` |
| Adding `/notes` to the top nav | shell/IA concern |
| title-edit UI build | title persists via existing `updatePage` metadata path; no new title-editor built here (NotionHeader already owns it) |
| `word_count` auto-update on content write | LATER — the column exists (`schema/notes.ts:63`) but deriving it is a cheap follow-up, not required for usability; left for the first consumer that needs the count |

## 3. Exact changes

### S1 — Open the note

**3.1 — `note-renderers.tsx`: cards accept + call `onOpen`.**
- **locate:** `function renderNotesView(layout, state, rows)` + `NoteRowCard`/`NoteTile` (`onPress={() => {}}`).
- **operation:** add `onOpen: (id: string) => void` to the `renderNotesView` signature; thread it into `NoteRowCard`/`NoteTile` as a prop; set `onPress={() => onOpen(r.id)}` on both `Card`s.
- **before:** `<Card interactive onPress={() => {}} …>` → **after:** `<Card interactive onPress={() => onOpen(r.id)} …>`.
- **satisfies:** BR-NEU-1 (open-on-click). **verify:** clicking a row/tile in List + Gallery calls `onOpen(id)` (unit test spies `onOpen`); live Brave: click → URL `/notes/<id>`.

**3.2 — `notes-surface.tsx`: provide `onOpen` via `useNavigate`.**
- **locate:** `NotesSurface()` + the `renderView={(layout, viewState) => renderNotesView(layout, viewState, rows)}` call.
- **operation:** `const navigate = useNavigate()`; define `const onOpen = (id: string) => navigate({ to: '/notes/$id', params: { id } })`; pass `onOpen` into `renderNotesView(layout, viewState, rows, onOpen)`.
- **satisfies:** BR-NEU-1. **verify:** tsc; live Brave click-through.

**3.3 — `use-create-note.ts`: create-and-open in place.**
- **locate:** `useCreateNote()` `useMutation` `onSuccess`.
- **operation:** add `const navigate = useNavigate()`; in `onSuccess(page)` keep the invalidate, then `navigate({ to: '/notes/$id', params: { id: page.id } })`. (`mutationFn` returns the created `PageRow`.) Keep the `onError` console surfacing.
- **satisfies:** BR-NEU-2 (create-opens, in place). **verify:** live Brave: "New note" → lands on `/notes/<newid>` with the editor; list still invalidates.

**3.4 — `note-entity.tsx`: honest 'empty' copy.**
- **locate:** the `state === 'empty' || page === null` branch — `EmptyState title="This page isn't available yet"` + "Notes open here once the local data plane is connected."
- **operation:** replace the now-stale copy with an honest not-found message (the data plane IS connected): title "Note not found", body "This note may have been deleted." (A real-but-blank note returns `state:'success'`, so this branch is genuine not-found only.)
- **satisfies:** BR-NEU-1 edge + acceptance "empty-content note opens without error". **verify:** navigate to `/notes/does-not-exist` → honest not-found; a freshly-created note → success (editor renders).

### S2 — Content persistence (IR-7)

**3.5 — `validators/note.ts`: drop `content` from `updatePageSchema`.**
- **locate:** `export const updatePageSchema = z.object({ … content: z.string().nullish(), … }).strict()`.
- **operation:** remove the `content` line (keep every other field; keep `content` in `createPageSchema` for seeding).
- **satisfies:** BR-NEU-4 (content ≠ LWW metadata patch). **safety:** confirmed no `updatePage(...)` caller passes `content` (§1). **verify:** `pnpm --filter @vida/core typecheck` + notes service tests green; a test asserts `updatePage` rejects `{content}` (`.strict()`); **grep + fix any existing validator/service test that referenced `content` in the updatePage shape** (non-regression) before relying on green.

**3.6 — `service.ts` + `types.ts`: add `writePageContent`.**
- **locate:** `NotesService` factory return object (after `updatePage`) + the `NotesService` interface in `types.ts`.
- **operation:** add
  ```ts
  // IR-7: content is written through its own path (never the updatePage LWW metadata patch). M1 = a local
  // content write; M4 = the CRDT entry point (same signature). Serializes the EditorDocument to the text column.
  writePageContent: async (id: string, content: EditorDocument): Promise<PageRow> =>
    pageRepo.update(id, { content: JSON.stringify(content) }),
  ```
  and the matching interface member `writePageContent(id: string, content: EditorDocument): Promise<PageRow>`. **Import precondition:** `service.ts:12` already imports `EditorDocument`; `types.ts:11` imports only `PageType` → **add `EditorDocument` to the `@vida/types` import in `types.ts`**. Content is stored as a JSON string — consistent with `seedContent` (`service.ts:57` `JSON.stringify(doc)`) + the read-side `parseContent` (`live-mappers.ts:30`).
- **⚠ IR-7 forward-contract note (REVISE-2):** the M1 impl writes `content` through the repo's **LWW path** — `pageRepo.update` sets `_sync_lww_ts` and includes `content` in `_sync_hash` [FACT: `repository.ts:420-435`]. This is functionally correct on a single device (no concurrency), and it honors IR-7 at the **API level** (`writePageContent` is a separate method from `updatePage`). **M4 MUST** re-home `content` out of the LWW merge/hash into the CRDT path (the `writePageContent` internals swap; the signature stays). Documented here so the deferral is explicit, not a silent LWW-of-content. [FACT: IR-7 `interpretation.md:159`; `MVP-PATH:185` sync=M4].
- **satisfies:** BR-NEU-3 (persist) + BR-NEU-4 (own path, API-level). **verify:** `@vida/core` test — `writePageContent` then `getPage` round-trips the doc; `updated_at` bumps; typecheck.

**3.7 — `use-note-content.ts` (NEW): the content-write mutation hook.**
- **operation:** a hook `useNoteContent(id)` returning `{ save(doc), saveState }` where `save` is a **debounced (~500ms)** `useMutation` calling `(await getServices()).notes.writePageContent(id, doc)`; `onError` → `console.error('[writeNoteContent failed]', e)` + `saveState='error'`; success → `saveState='saved'` **and `qc.invalidateQueries({ queryKey: ['pages', id] })`** (REVISE-1: keeps a later SPA nav-away-and-back reading fresh from cache; harmless to the uncontrolled editor, which only re-seeds on mount via `key={id}`). Debounce via a `useRef` timer; **flush on unmount** — the cleanup fires the pending `mutate` synchronously so a fast navigate-away never drops the last edit; guard `saveState` writes against an unmounted component (ref/isMounted). The debounce batches keystrokes, so the invalidate fires at most once per ~500ms, not per keystroke.
- **satisfies:** BR-NEU-3, BR-NEU-5 (honest saved|error). **verify:** unit test (fake timers) — rapid changes debounce to one write; unmount flushes the pending write; error path sets `saveState='error'`; success invalidates `['pages', id]`.

**3.8 — `note-editor-body.tsx`: wire `onChange` + save-state.**
- **locate:** `<VidaEditor chrome="bare" defaultValue={page.content ?? undefined} aria-label={…} />`.
- **operation:** `const { save, saveState } = useNoteContent(page.id)`; add `onChange={save}` to `VidaEditor`; render a minimal, muted save indicator (e.g., `role="status"`: "Saved" / "Couldn't save") — honest, saved|error only (no fake "synced"). Keep `chrome="bare"` + the 740px measure.
- **satisfies:** BR-NEU-3, BR-NEU-5. **verify:** live Brave — type in a note, reload → content persists; the indicator reads "Saved".

## 4. Business rules (technical) — PROMOTE → notes current-business-rules.md
- **BR-NEU-1 [NEW]:** collection rows/tiles call `onOpen(id)` → `navigate('/notes/$id')`. [FACT: 3.1/3.2].
- **BR-NEU-2 [NEW]:** `createPage` success navigates to `/notes/$id` (in place). [FACT: 3.3].
- **BR-NEU-3 [NEW]:** editor `onChange` persists `content` (debounced); reload re-reads via `getPage`. [FACT: 3.6/3.7/3.8].
- **BR-NEU-4 [NEW/ENFORCED]:** `content` is written ONLY via `writePageContent`, never `updatePage` (`.strict()` excludes it). [FACT: 3.5/3.6; IR-7 `interpretation.md:159`].
- **BR-NEU-5 [NEW]:** the editor save indicator is honest (saved | error) — no fake synced. [FACT: 3.8; `page-binding.ts` syncState precedent].

## 5. Contract / structure — PROMOTE → notes current-spec.md
- `NotesService` gains `writePageContent(id: string, content: EditorDocument): Promise<PageRow>` (the IR-7 content-write seam; M1 local write, M4 CRDT entry point). `updatePage` is strictly metadata-only (content removed from the whitelist).
- apps/web: `renderNotesView(layout, state, rows, onOpen)`; `NotesSurface` owns `onOpen`/create-nav via `useNavigate`; `note-editor-body` owns the `onChange → writePageContent` wire + save-state; new `use-note-content` hook.

## 6. Acceptance & verification
- [ ] Click a note in List AND Gallery opens `/notes/$id` (live Brave + unit spy on `onOpen`); the card is **keyboard-operable** — Enter/Space opens, focus-visible (inherited from `@vida/ui` Card `role=button`; axe 0).
- [ ] "New note" creates AND opens the new note, editor ready (live Brave).
- [ ] Type in a note → reload (and nav-away-and-back) → content persists (live Brave, real OPFS).
- [ ] Title edits persist across reload (existing `updatePage` metadata path; live Brave).
- [ ] Save indicator reflects saved | error only (no fake synced).
- [ ] `updatePage({content})` is rejected (`.strict()`); `content` persists only via `writePageContent` (`@vida/core` test).
- [ ] A non-existent `/notes/<id>` shows honest not-found; a freshly-created empty note opens as success.
- [ ] Zero regression: `@vida/core` + `@vida/web` tests green · tsc 0 · eslint 0 · existing notes tests pass.

## 7. Gates cleared
- /critique (PLAN):  REVISE → 5 items folded · 2026-10-20
- /preflight (PLAN): PASSED · 2026-10-20
- /critique (IMPLEMENTATION-PLAN):  REVISE → 5 items folded (invalidate-on-write · IR-7 M4 note · word_count OUT · test non-regression · keyboard verify) · 2026-10-20
- /preflight (IMPLEMENTATION-PLAN): PASSED (1 precondition folded: add EditorDocument import to types.ts) · 2026-10-20
- Approval 1 (direction): Victor · 2026-10-20
- Approval 2 (cleared to implement): Victor · 2026-10-20
- **BUILT + verified** · 2026-10-20 — S1 (open-on-click + create-and-open) + S2 (writePageContent + onChange persistence) on branch `notes-entity-usability`. tsc 0 · eslint 0 · core 31/31 (notes) · web notes tests pass · verified live in Brave (real OPFS): open/create/type→Saved→reload persists; console clean.
- **§XXVIII DEVIATION (approved by Victor)** · 2026-10-20 — added a dedupe guard to `useNoteContent` (not in the approved plan): the live gate surfaced that TipTap's mount `onChange` persisted the unchanged doc, bumping `updated_at` on mere open. The hook now takes the loaded content as a baseline and skips unchanged writes (lastSaved promoted on success only, so a failed write retries). +1 dedupe test; verified live (no write / no indicator on reopen).

## 8. Rollback / risk
- **Riskiest step:** 3.5 (dropping `content` from `updatePageSchema`) — a breaking API change if a caller passed content. Mitigated: rg confirms none do; the step is isolated + reverted by re-adding one line.
- **Rollback:** each slice is independent; `git revert` the slice's commit. S1 (nav) and S2 (persistence) land as separate commits so either can revert without the other.
- **Debounce risk (3.7):** a pending write must flush on unmount/blur so a fast navigate-away doesn't drop the last edit — covered by the hook's unmount flush + the live nav-away-and-back acceptance check.
