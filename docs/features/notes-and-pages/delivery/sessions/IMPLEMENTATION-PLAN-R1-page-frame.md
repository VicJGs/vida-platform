# IMPLEMENTATION-PLAN — notes-rescope R1 · Page frame

> §XXVI **gate 2** (rev 1, 2026-10-27) for the approved `PLAN-R1-page-frame.md` (rev 3, Approval 1: Victor 2026-10-27).
> `/preflight` **PASSED** (2026-10-27): every layer specified, with no backend, DB or integration change. Its 5 assumptions
> are resolved in §0 and §1.
> Build steps run in order. Each step: tests first → red → implement → green → next. A divergence triggers §XXVIII (STOP).
> BR and test numbers refer to the PLAN. Worktree `.claude/worktrees/notes-rescope` @ `f65376e`, Node 24 (`nvm use 24` in
> every command, memory F001). Suites run alone (F002).

## 0. Gate-2 refinements of the PLAN (to be critiqued here; PLAN updated on Approval 2)

- **R-1 · The toast names the action, never the error text (narrows G7).** `notifyError(action, error)` = `console.error`
  + `toast({ intent:'danger', title })`, with no `description`. Class names like `PageNotFoundError: …` are not user copy,
  and F-7 asks only that the toast "name the action" `[FACT: reconciliation.md:241]`.
- **R-2 · Retry uses the `Button` `loading` canon (refines G8).** `loading` = "spinner shown, activation suppressed, width
  held, `aria-busy`" `[FACT: packages/ui/src/components/button.tsx:145-146]`. That is exactly the PLAN's retrying contract,
  so the label stays "Retry" and the PLAN's "Retrying…" text is dropped (the spinner + `aria-busy` carry the state).
- **R-3 · Home chip slot (preflight A3).** `JournalPageRegion` renders `<PageSaveStatus>` directly above `<NoteEditorBody>`,
  where the old label row was (`note-editor-body.tsx:101`), with `alignSelf="flex-end"` passed to `<SyncStatus>`. The chip's
  frame has `alignSelf:'flex-start'` (`sync-status.tsx:33`), which overrides a parent's `alignItems`, and `rest` props spread
  onto the frame (`sync-status.tsx:66-68`). The row has **no fixed height**: the chip is ~34 px (`paddingVertical:'$8'` +
  `$small`, `sync-status.tsx:27`), so the row is deliberately taller than the old 18 px text row. Checked at the Visual Gate.
  The chip only renders on the success branch.
- **R-4 · 375 px title row (preflight A1).** No change: `TitleGroup` already has `flexShrink:1` `[FACT: entity-view.tsx:75]`,
  and `PageActions` gets `flexShrink:0`. Verified at the Visual Gate.
- **R-6 · Retry keeps the error branch up (corrects PLAN G8's premise).** FACT (query-core 5.101.4): a fetch on a query
  with **no data** resets it to `status:'pending', error:null` (`src/query.ts:648-652` → `fetchState` `:723-727`). A read
  error has no data, so on Retry `isError` goes false and all three hooks would return `'loading'`. The error branch and
  its Retry button would unmount, and focus would drop to `<body>` (WCAG 2.4.3). The PLAN's "all three check `isError`
  first, so the error branch stays up" is therefore false. Fix: each hook computes `retrying = isFetching && data ===
  undefined && errorUpdateCount > 0` (`errorUpdateCount` is on the v5 observer result, `src/types.ts:655`) and returns
  `{ state:'error', retrying }` when `isError || retrying`. A first load (`errorUpdateCount` 0) still shows loading. Stated: a remount within `gcTime` (5 min) after an earlier
  failed read has `errorUpdateCount > 0` and no data, so its mount refetch shows the error branch with a busy Retry instead of
  loading. That is honest (the read did fail), and `ReadErrorMessage` keeps one element instance while `retrying` flips, so
  focus holds. This keeps
  the PLAN's contract (the button stays, `aria-busy`, no double press); only the mechanism changes.
- **R-5 · The live leg's CI copy (refines §4 B).** A new `apps/web/e2e/notes-page-frame.spec.ts`, modelled on
  `notes-data-safety.spec.ts` (seed through the harness before the app opens `vida`). It runs locally via Brave +
  playwright-core (macOS 12 can't fetch Chromium, `e2e/CLAUDE.md`), and as-is in CI.

## 1. Build steps

### Step 1 — the page-surface gate (test A1)
- `apps/web/src/entity/adapter.ts`:
  - `import { PAGE_TYPE } from '@vida/types'`;
    `export function offersPageEditor(pageType: string): boolean { return (PAGE_TYPE as readonly string[]).includes(pageType) }`.
  - `EntitySource`: add `gate?: 'entity' | 'page'` (doc: "`'page'` = a page surface (NP-10): gates on `PAGE_TYPE`; `hasPage` is
    ignored, since a page surface IS the page") and `action?: ReactNode`.
  - `toEntityProps`: `const open = src.gate === 'page' ? offersPageEditor(src.entityType) : offersEditor(src.entityType, src.hasPage)`;
    pass `action: src.action`.
  - Header comment: the page gate (NP-10) beside the entity gate.
- `adapter.test.ts`: append `describe('offersPageEditor')` (6 true, `'task'`/`''`/`'x'` false) and
  `toEntityProps gate:'page'` (task_note → editor; default gate same input → no editor; `action` passthrough). Existing
  cases untouched.
- `apps/web/src/entity/CLAUDE.md`: Pattern bullet for `offersPageEditor` + `gate`.

### Step 2 — labels (tests A2, A3-label, A9)
- `notes/note-chrome.tsx`: `export function pageLabel(p: { type: string; title: string | null }, parentName?: string | null): string`
  - `title?.trim()` → return it;
  - `type.endsWith('_note')` → `parentName?.trim() ? \`${typeLabel(type)} · ${parentName.trim()}\` : \`${typeLabel(type)} note\``;
  - else `'Untitled note'` (the `journal` title is never null, `notes/service.ts:207-210`; `note` and anything else land here).
  - Doc comment: E-3; R7 feeds `parentName` (A-33).
- `notes/live-mappers.ts`: `toNotesRow` `title: pageLabel({ type: p.type, title: p.title })`, replacing `'(untitled)'`.
  `toNoteEntity` keeps `title: p.title ?? ''` (the raw value R3's rename edits); consumers call `pageLabel(page)`.
  - Add optional `NotesRow.labelFromType?: boolean` (= the title was empty; optional so `note-renderers.test.tsx:12-15`
    literals and `DEV_SAMPLE` stay valid), so the card can drop the doubled type (PLAN G9).
- `notes/note-renderers.tsx`: delete the local `TYPE_ICON`/`TYPE_LABEL`/`typeIcon`/`typeLabel`/`Icon`; import from
  `note-chrome`. Card `aria-label`: ``[r.title, r.labelFromType ? null : typeLabel(r.type), `edited ${r.updated}`, r.favorite ? 'favorite' : null].filter(Boolean).join(', ')``, shared by `NoteRowCard` and `NoteTile` via one `cardName(r)` helper.
- Tests: `note-chrome.test.ts` (new) for the `pageLabel` table; `live-mappers.test.ts` null title → "Untitled note" /
  "Task note"; `note-renderers.test.tsx` chrome label "Task" + the full name + the dropped segment.

### Step 3 — Overview components + the journal stub out (tests A3-merged, A4)
- `notes/overview-registry.ts`: `export type OverviewRenderer = ComponentType<OverviewContext>`; `registerOverview` /
  `overviewFor` keep their names; remove `registerOverview('journal', …)`; header rewritten (IR-R16).
- `notes/note-overview.tsx`: `export function NoteOverview({ page, mode }: OverviewContext)` (the same JSX); delete
  `journalOverviewStub`, plus the `SummaryBlock` import that only it used; header rewritten.
  `summary-block.tsx` + its test stay (R8's `/summary` body).
- `notes/note-entity.tsx` (`NoteEntityView`): `const Overview = overviewFor(page.type)`, `layout = <Overview page={page} mode={mode} />`.
- Tests: `overview-registry.test.ts`: `journal` → `NoteOverview` (the fallback); a registered component calling `useState`
  renders inside `NoteEntityView`, and toggling merged⇄tabbed keeps the hook-order intact (no React error).

### Step 4 — gate + label wired into the page (test A3)
- `NoteEntityView`: `const label = pageLabel(page)`; `toEntityProps({ title: label, gate: 'page', action: <PageActions pageId={page.id} locked={page.contentStatus === 'malformed'} items={[]} />, … })`.
- `NoteEditorBody`: editor `aria-label={\`${pageLabel(page)} editor\`}`.
- `note-entity.test.tsx`: each of the 4 `*_note` types → `tab` "Note" selected and the editor present; untitled
  `task_note` → H1 "Task note", accname "Task note editor"; merged `task_note` → the Properties/Attachments/Backlinks sections
  are above the editor region.

### Step 5 — the save-status store + chip (tests A5, A6) — build Step 6's `notify-error.ts` FIRST (Step 5's toast test needs it)
- `notes/save-status.ts` (new, header in the body-writes style):
  - `export type SaveStatus = LocalSyncState | 'locked'` (`type LocalSyncState` is exported from the `@vida/ui` barrel,
    `packages/ui/src/index.ts:57`).
  - Module `Map<string, SaveStatus>` + `Map<string, Set<() => void>>`; `setSaveStatus(id, s)` (no-op when equal; **`'locked'`
    is sticky**: `saved`/`error` are ignored once an id is locked, so an outgoing mount's in-flight write can't bring the
    chip back over the EC-33 notice; notifies that id's listeners); `getSaveStatus(id)` = entry ?? `'saved'`; `useSaveStatus(id)` = `useSyncExternalStore(sub, snap)` with `sub`/`snap` memoized per id (`useCallback([id])`, so React
    doesn't resubscribe every render);
    `observed(id)` = listener-set size > 0 (subscriptions, StrictMode-balanced); `__resetSaveStatus()` for tests.
- `notes/use-note-content.ts`:
  - `NoteContentPage` Pick += `title`, `type`.
  - Success settle → `setSaveStatus(id, 'saved')`. Failure → `setSaveStatus(id, 'error')`, then
    `if (!observed(id)) notifyError(\`save “${pageLabel(page)}”\`, e)` (Step 6). The `console.error` moves into `notifyError`.
  - `lock()` → `setSaveStatus(id, 'locked')`, called from the `onInvalidContent` callback, so it never writes during render.
    A malformed-at-load seed sets nothing; the host hides on `contentStatus`.
  - Remove `saveState` + `SaveState` from the hook's return (one source of truth = the store); tests read the store.
    Header comment rewritten (IR-R16).
- `notes/page-actions.tsx` (new): `PageSaveStatus({ pageId, locked })` → `null` when `locked || status === 'locked'`, else
  `<SyncStatus state={status} />`. `PageActions({ pageId, locked, items })` = a row (`gap $8`, `alignItems center`,
  `flexShrink 0`) of `<PageSaveStatus>` + (`items.length > 0` → `<Menu aria-label="Page actions" items={items}
  placement="bottom-end" trigger={<Button intent="ghost" size="sm" aria-label="Page actions"><MoreHorizontal …/></Button>} />`).
  The Lucide icon is tinted by token (EC-22).
- `NoteEditorBody`: delete `SAVE_LABEL`, the 18 px label row and its `role="status"`.
- `home/journal-page-region.tsx`: on success, `<PageSaveStatus pageId={page.id} locked={page.contentStatus === 'malformed'} alignSelf="flex-end" />`
  then `<NoteEditorBody>` (R-3): no wrapping row and no fixed height. `PageSaveStatus` forwards `...rest`
  (`Omit<SyncStatusProps, 'state'>`) to `<SyncStatus>`, so `alignSelf` reaches the frame.
- Tests: `save-status.test.ts` (store semantics, observer count under subscribe/unsubscribe ×2); `page-actions.test.tsx`
  (`items=[]` → no button; 1 item → button named "Page actions", `aria-haspopup="menu"`; locked → no chip);
  `use-note-content.test.ts` (the three `result.current.saveState` assertions at `:107-120`, `:210`, `:494` move to
  `getSaveStatus(id)`; success → `saved`; reject while observed → `error`, no toast; reject with no observer → 1
  toast; next success → `saved`); `note-entity.test.tsx` (one `SyncStatus` in merged and in tabbed; tabbed → Overview keeps
  the chip; the malformed page → notice only, no chip; `onInvalidContent` → the chip disappears); `journal-page-region.test.tsx`
  (one chip inside the region; malformed → notice only; the existing `role="status"` assertion at :46 is the ERROR branch's,
  kept as-is, plus a separate chip assertion).

### Step 6 — the shared error toast (tests A5-toast, A7)
- `apps/web/src/lib/notify-error.ts` (new): `export function notifyError(action: string, error: unknown): void` →
  `console.error(\`[${action} failed]\`, error)`; `toast({ intent: 'danger', title: \`Couldn’t ${action}\` })` (R-1).
- `notes/use-create-note.ts`: `onError: (e) => notifyError('create the note', e)`; header comment updated.
- Tests: `notify-error.test.ts` (toast called once, danger, title, no description); `use-create-note` rejection → one
  toast "Couldn’t create the note" (mock `toast` from `@vida/ui`).

### Step 7 — read-error Retry + DEV `?readerror` (test A8)
- `notes/read-error.ts` (new): `readErrorArmed()` = `process.env.NODE_ENV !== 'production' && typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).has('readerror') && !cleared`; `clearReadError()` sets the module `cleared`.
  A query fn's first line: `if (readErrorArmed()) throw new Error('DEV ?readerror')`.
- Hooks: `useNoteEntity`, `useNotesRows`, `useJournalEntry` add `retry: () => { clearReadError(); void refetch() }` and
  `retrying` (R-6), returning `state:'error'` when `isError || retrying`, (each result type gains both fields; the samples return
  `retry: () => {}`, `retrying: false`).
- `notes/read-error-message.tsx` (new): `ReadErrorMessage({ message, retry, retrying })` = a column: `<Text role="status">`
  with the message, then `<Button intent="secondary" size="sm" loading={retrying} onPress={retry}>Retry</Button>`
  outside the live region (R-2).
- Use it in: `note-entity.tsx` error branch ("Couldn’t load this page."); `notes-surface.tsx`: `error={<ReadErrorMessage
  message="Couldn’t load your notes." …/>}` passed to `CollectionView` after the `chromeFor` spread;
  `journal-page-region.tsx` error branch ("Couldn’t load today’s page.").
- Tests (with the app's `queryClient` defaults: a fresh `QueryClient` built from the same options, `retryDelay: 0` only to
  keep the test fast, stated): a mocked service that rejects, then resolves → idle in error: the read count doesn't grow over
  time; press → resolves: +1 read and the content renders. Rejects twice → press: +2 reads, and during the press the error branch
  stays mounted, the button keeps focus and shows `aria-busy` (R-6); a first load never shows the error branch. One file per surface (`note-entity.test.tsx`, `notes-surface.test.tsx`, `journal-page-region.test.tsx`).

### Step 8 — docs + live leg + gates
- Docs (PLAN §5 step 7): `slice-map.md` R1 E-3 bullet → "type label (`<Type> note`); parent name fed at R7 (A-33)"; R7
  picker bullet + "feeds `pageLabel`'s `parentName`"; `reconciliation.md` E-3 fix text, same split.
- **Live leg (B10–B12)**, local Brave + playwright-core on real OPFS, and `e2e/notes-page-frame.spec.ts` (R-5):
  - Seed (harness, before open): 4 `*_note` rows (`title` NULL, `entity_type`/`entity_id` set, body
    `{doc:[H1 parent title, paragraph]}`), 1 untitled `note`.
  - Each `*_note`: the Note tab is selected, the editor visible, H1 "<Type> note"; type → wait 1 s → reload → text kept (the
    proof); "Couldn’t save" never appears during the run.
  - `/notes`: the untitled row reads "Untitled note".
  - `?readerror` on `/notes`, `/notes/$id`, `/` (a fresh full load each) → error + Retry → press → content.
  - Prod: `pnpm --filter @vida/web build && grep -rc readerror apps/web/dist` = 0.
- **Visual Gate** (PLAN §4 C) → Victor.
- **Gates:** `pnpm typecheck` · `pnpm lint` · `pnpm --filter @vida/web test` (alone) · `/component-audit` on
  `PageActions` · `/critique` SHIP.
- **Currency (§XXIX):** `docs/modules/notes/current-spec.md` + `current-business-rules.md`: BR-SUR-3 (labels), BR-SUR-4
  (page gate), BR-NEU-2 (create failure → toast), BR-NEU-3 (the post-unmount failure is now surfaced), BR-NEU-5 (visible
  states saved/error/locked; chip host), a BR-R1-1…9 section, the R1 forward obligation (R7 `parentName`; R3/R5/R9 ⋯ items);
  stale headers per PLAN §5 step 8 / IR-R16.

## 2. Files

New: `notes/save-status.ts` · `notes/page-actions.tsx` · `notes/read-error.ts` · `notes/read-error-message.tsx` ·
`lib/notify-error.ts` · tests (`note-chrome`, `save-status`, `page-actions`, `notify-error`) · `e2e/notes-page-frame.spec.ts`.
Changed: `entity/adapter.ts` (+test, CLAUDE.md) · `notes/{note-chrome, note-renderers, live-mappers, use-notes-rows,
overview-registry, note-overview, note-entity, note-editor-body, use-note-content, use-note-entity, use-create-note,
notes-surface}` (+tests) · `home/{journal-page-region, use-journal-entry}` (+tests) · docs per Step 8.
Untouched: `@vida/ui`, `@vida/core`, `@vida/types`, `@vida/editor`.

## 3. Risks

- **Hook-order on the Overview swap:** a component per type means switching page types remounts the Overview. Today that
  can only happen through navigation, and `key={id}` already remounts the view.
- **Toast spam:** a page left with N failing retries toasts once per failed write. The re-queue retries only on the next
  hide/unmount/edit of a mounted body, so a body that is gone produces one toast per pending write. Bounded.
- **Concurrent sessions:** run suites alone (F002); `better-sqlite3` ABI → Node 24 (F001).

## 4. Change log

- rev 1 (2026-10-27) — drafted after preflight PASSED.
- rev 2 (2026-10-27) — gate-2 critique r1 **REVISE** (2 blocking, both verified on disk): (1) v5 resets a no-data query to
  pending on refetch → R-6 (`retrying` via `errorUpdateCount`; the error branch stays up); (2) the Home chip doesn't fit 18 px
  and self-aligns left → R-3 restated. Folded non-blocking: `notify-error` first; optional `labelFromType`; memoized
  subscribe; sticky `'locked'`; `saveState` removed; the :46 test kept; the B10 proof = reload; cite `entity-view.tsx:75`.
- rev 3 (2026-10-27) — critique r2: Step 5's Home bullet aligned with R-3 (`PageSaveStatus` forwards `alignSelf`); the 3
  `saveState` test assertions named; the R-6 remount-within-gcTime note. Critique r2 conditional SHIP once this fix lands.
- **APPROVED by Victor (Approval 2) on 2026-10-27.**
