# PLAN — notes-rescope R1 · Page frame (FRONTEND + shared gate fn)

> Entity Delivery Flow recovery variant · Step 6 · per-slice §XXVI **gate 1** (rev 3, 2026-10-27 — critique r1 REVISE folded in, r2 SHIP; see §6). Slice-map R1
> (`slice-map.md:43-50`, approved 2026-10-26). Ledger rows: B-24 · E-3 · B-45 · B-46 · B-27 · B-49 · B-65 · E-2 · F-7 ·
> B-15 · B-60 · B-63. Yardsticks: `interpretation.md` IR-R5 · IR-R13 · IR-R15 · `envision.md` EC-34 (+ inherited EC-4 ·
> EC-15 · EC-18/18f · EC-19 · EC-22 · EC-23, `docs/specs/foundation/fe-notes-and-pages/delivery/envision.md:31-56`).
> R0 forward obligation consumed here: the post-unmount write failure surface (PLAN-R0 G12 "the R1 error toast, F-7").
> Grounding resolved IN this PLAN (no calls for Victor): `[FACT: path:line]` · `[INTERP — grounded: …]` · `[UNKNOWN]`.
> Branch `notes-rescope` @ `d9c1214`. **1a:** `docs/modules/notes/current-*` are current: no `apps/` or `packages/` commit
> since the R0 currency commit `f2c35cc` (`git log f2c35cc..HEAD -- apps packages` = empty), and their surface plane already
> covers `entity/adapter.ts` and `home/journal-page-region.tsx` (`current-spec.md:8,148-151,187`). No other context has
> current-* docs to refresh. `@vida/ui` is consumed, not changed.

## 1. Identity

- **What:** make the note page's frame (the header, the facets, the terminal states) correct for **every page type**:
  1. **Every page type opens with its editor** (EC-15 / NP-10): the page surface gates on `PAGE_TYPE`; the module-entity
     gate is unchanged.
  2. **A page never has an empty name**: untitled pages get a label from their type (and, once R7 lands the label seam,
     their parent's name), used for the H1, the editor's accessible name, the collection rows and the card names.
  3. **Overviews are real components** (hooks bind to them, not to the page), and Notes no longer registers the journal
     Overview. That one belongs to journals-rescope.
  4. **The header carries the page actions**: one `SyncStatus` ("Saved on this device") in the title row beside the ⋯ slot,
     which is the only save announcement. Home shows the same chip in its journal frame.
  5. **Every failure is visible and recoverable**: a read error offers Retry on the page, the collection and Home; a failed
     create or a failed body write that no chip can show raises one danger toast naming the action.
  6. **One set of type labels** (note-chrome), plus card accessible names that carry type, edited time and favorite.
- **Why:** slice-map R1 "before R3/R4/R5 (the ⋯ action slot + SyncStatus placement)" `[FACT: slice-map.md:26]`; EC-15 is a
  live bug: four of the six page types open with no editor `[FACT: reconciliation.md:104; adapter.ts:33-35;
  core/db/schema/_registry.ts:5-8]`.
- **Envision:** EC-34 (MUST) `[FACT: envision.md:30]`, the title row from greybox g-1440 (title left; chip + ⋯ right)
  `[FACT: envision-evidence/g-1440.png]`.

## 2. Grounded scope — verdicts

| # | Item | Verdict | Grounding |
|---|------|---------|-----------|
| G1 | **Page-surface gate (B-24 · IR-R5 · EC-15)** | New pure `offersPageEditor(pageType: string): boolean` = membership in `PAGE_TYPE` (all 6), beside the unchanged `offersEditor`. `EntitySource` gains an optional `gate?: 'entity' \| 'page'` (default `'entity'`); `toEntityProps` picks the fn by it. The note page passes `gate: 'page'`. **Entity-gate tests stay as they are.** The ledger fix text "flip adapter.test.ts:23-33" predates the approved slice text "new fn, entity gate unchanged", and the later approved text wins | NP-10 `[FACT: business-rules.md:41-43]`; slice R1 `[FACT: slice-map.md:44]`; one live `toEntityProps` caller `[FACT: note-entity.tsx:111; interpretation.md:134]`; `flow/adapter.ts` only mirrors the shape in a comment `[FACT: flow/adapter.ts:50]` |
| G2 | **Untitled label (E-3)** | One pure projection in `note-chrome`: `pageLabel({type, title}, parentName?)` → the trimmed title when non-empty; else, for a `*_note` type, `"<Type> · <parentName>"` when a parent name is given and `"<Type> note"` (e.g. "Task note") when not; else (`note`) `"Untitled note"`. A `journal` always has a title (its date, `notes/service.ts:207-210`). Consumers: the H1 (`EntitySource.title`), the editor accname (`"<label> editor"`), `toNotesRow` (replaces `'(untitled)'`) and the card names (G9). **Why not "Untitled task":** `ensureEntityNote` leaves `page.title` null but seeds the parent's title as the content's H1 `[FACT: notes/service.ts:46-50,187-205; tasks/service.ts:695]`, so the page already shows the parent's name in its first line. A frame H1 of "Untitled …" above it would be false; "Task note" is true. **Source of `parentName`:** none in R1. The shared seam has no label read (`ReadProvider = {entityType, list}`, `[FACT: foundation/views/types.ts:24-27]`). A tasks provider exists, `registerTasksReadProvider` `[FACT: tasks/service.ts:975-981]`, but nothing in apps/web calls it (grep `providers.register\|registerTasksReadProvider` in `apps/web/src` = 0), its rows are opaque to a consumer, and picking the label read (ReadProvider label vs the ⌘K SearchProvider) is A-33, homed to R7's PLAN `[FACT: slice-map.md:107-110; reconciliation.md:64; interpretation.md:203]`. **R7 forward obligation:** feed `parentName` from that seam. R1 builds no per-module name lookup, since that would fork the one read seam `[FACT: docs/core/decisions/ADR-007-saved-views.md:78-80]`. The split is recorded in slice-map R1/R7 and the E-3 row (this PLAN's docs step) | E-3 `[FACT: reconciliation.md:219]`; slice text "type label + parent name" `[FACT: slice-map.md:45]`; untitled `note` pages: books/knowledge seed `type:'note'` with no title `[FACT: books/service.ts:684; knowledge/service.ts:518]` |
| G3 | **Overview as a component (B-45 · IR-R13)** | `OverviewRenderer` becomes `ComponentType<OverviewContext>`; `overviewFor(type)` returns a component; `NoteEntityView` renders `<Overview page={page} mode={mode} />`. `noteOverview` → `NoteOverview` (the same JSX, now a component). The registry API (`registerOverview` / `overviewFor`) keeps its names; only the value type changes. There are no external registrants yet | `[FACT: note-entity.tsx:110; overview-registry.ts:23,33-35]` |
| G4 | **Journal Overview leaves Notes (B-46 · EC-18a)** | Remove `registerOverview('journal', journalOverviewStub)` and delete `journalOverviewStub`. A journal page opened at `/notes/$id` falls back to the note Overview (properties · attachments · backlinks: empty-but-functional, seam-contract 3a) until journals-rescope registers its own. EC-15's "journal shows `/summary`" clause travels with EC-18a (the re-pin moved the journal Overview, `/summary` included, to journals-rescope). `SummaryBlock` stays in the tree with no notes consumer: it is R8's `/summary` widget body and journals-rescope's input, so R10's dead-seam sweep re-checks it | re-pin `[FACT: fe-notes envision.md:143,148]`; edge `[FACT: slice-map.md:46-47]`; fallback `[FACT: overview-registry.ts:32-35]` |
| G5 | **⋯ action slot (B-27)** | `EntitySource` gains `action?: ReactNode`, passed through to `EntityView.action` (the slot exists, `entity-view.tsx:39-40,160`). New `PageActions({ pageId, items })` renders the save chip (G6) and, **only when `items.length > 0`**, a `@vida/ui` `Menu` with a ghost ⋯ trigger (`aria-label="Page actions"`). **R1 passes no items**, so no ⋯ renders. The items arrive with their legs: Rename (R3), Move to Trash (R5), Save as template (R9). Rendering an empty ⋯ would be a dead affordance, which the repo rejects `[FACT: note-entity.tsx:143-144]` | B-27 `[FACT: reconciliation.md:107]`; Menu = APG menu button with a consumer trigger `[FACT: packages/ui/src/components/menu.tsx:23-50]` |
| G6 | **One save status (B-49 · B-65 · IR-R15 · EC-34)** | The save state moves out of the editor body into a module-level per-page store `notes/save-status.ts` (`setSaveStatus(id, s)` · `useSaveStatus(id)` via `useSyncExternalStore` · `observed(id)`). This follows the `body-writes.ts` module-registry precedent. It has to live outside the body because tabbed mode mounts only the active panel `[FACT: entity-view.tsx:180-193]`, so a body-owned state dies when the user opens Overview. `useNoteContent` writes to it: success → `'saved'`, any write failure → `'error'`, and the next success → `'saved'`. The M1 union is `saved \| error`: no "Saving…" state, because writes are instant on-device (P4 copy honesty) `[FACT: sync-status.tsx:7-10,19]`. A page with no write yet reads `'saved'`, since it was loaded from the device. **Locked:** when the body is locked (`contentStatus==='malformed'` at load, or `onInvalidContent` after mount, `note-editor-body.tsx:93,116-119`), the chip renders nothing. The store type is its own, `SaveStatus = LocalSyncState | 'locked'`; the host narrows before rendering `<SyncStatus state>`, whose prop is `LocalSyncState` (`sync-status.tsx:20,57`). The malformed-at-load case is hidden synchronously by the host (`contentStatus === 'malformed'`, no store write during render); the post-mount case sets `'locked'` from the `onInvalidContent` callback. The EC-33 notice is then the page's only status, and no "Saved" claim sits over a page that can't be edited. **Lifetime:** entries live in module memory for the session (one per page id, bounded like `body-writes`); `'error'` returns to `'saved'` only on the next successful write of that page. A terminal `InvalidPageContentError` therefore stays `'error'` until a reload, which is honest, since nothing was saved. `NoteEditorBody` **drops its own `role="status"` label**, and the hosts render `<SyncStatus state>`: the note page in `PageActions`, and Home at the top-right of its journal frame (the position today's label row holds), on its success branch only (it needs the page id). The result is one **save** announcement per host (BR-R1-5). Error branches and the EC-33 notice are other statuses, never shown together with the chip | EC-34 `[FACT: envision.md:30]`; IR-R15 `[FACT: interpretation.md:163]`; today's label `[FACT: note-editor-body.tsx:29-34,101-111]`; Home host `[FACT: home/journal-page-region.tsx:50,72]` |
| G7 | **Shared mutation error toast (F-7 · B-15)** | `apps/web/src/lib/notify-error.ts`: `notifyError(action: string, error: unknown)` → `console.error` + `toast({ intent: 'danger', title: \`Couldn't ${action}\`, description: error message when it is an `Error` })`. Danger toasts route as assertive `[FACT: toast-store.ts:18-24]`. Consumers in R1: `useCreateNote.onError` ("create the note"), and a body-write failure **when no chip observes that page**, titled `Couldn't save “<label>”`. `observed(id)` counts live `useSaveStatus` **subscriptions** (subscribe/unsubscribe, so it stays balanced under StrictMode), not editor mounts. Two cases: (a) the user left the page, so there is no observer → toast (this closes the R0 G12 limit); (b) the note page in tabbed mode on Overview: the body is unmounted but the chip observes → the chip shows `error` and no toast. In (b) a retryable failure re-queues into the unmounted hook (`use-note-content.ts:147-149`), and its edit is still in the latest-body overlay, so reopening the Note tab re-seeds from the overlay and re-saves it (DEV-R0-1 ownership). That is the retry path, stated. When a chip is mounted, no toast fires, so the failure is never announced twice. `NoteContentPage` widens its Pick with `title` and `type` so the hook can build the label `[FACT: use-note-content.ts:48]`. R3/R4/R5 call `notifyError` from their new mutations. The metadata and attachment writes are still stubs today `[FACT: use-page-metadata.ts:1-12; use-attachments.ts:36-41]`. `ToastProvider` is already mounted `[FACT: App.tsx:128]` | F-7/B-15 `[FACT: reconciliation.md:95,241]`; R0 G12 `[FACT: PLAN-R0 §2 G12; use-note-content.ts:136-148]` |
| G8 | **Read-error Retry (E-2)** | `useNoteEntity`, `useNotesRows` and `useJournalEntry` expose `retry: () => void` (= the query's `refetch`) and `retrying: boolean` (= `isFetching` while in error). **(Amended at Approval 2, IMPL R-6:)** v5 resets a no-data query to `pending` on refetch (`query-core src/query.ts:723-727`), so each hook keeps the error branch up while `retrying = isFetching && data === undefined && errorUpdateCount > 0`. The button therefore shows "Retrying…", is disabled and carries `aria-busy` while `retrying`, so a second press can't cancel and restart the fetch (`refetch`'s default `cancelRefetch`). The **page** error branch (`note-entity.tsx:75-83`) adds a secondary `Button` "Retry". The **collection** passes `CollectionView`'s existing `error` override `[FACT: collection-view.tsx:83-84,153-154]` with the same message + Retry. **Home's** error branch (`journal-page-region.tsx:65-71`) adds the same. The message stays a calm `role="status"`, with the button outside the live region (the R0 notice rule: a live region holds no controls). Retry is an explicit `refetch`, never a remount, which avoids the retryOnMount loop class. The app default `retry: 1` is kept (`lib/query-client.ts:20`): a press that still fails reads **twice** (1 + 1 retry), one that succeeds reads once, and an idle error reads zero more. The test pins this with the app's real client defaults (memory: react-query-retryonmount-loop). **Forcing it live:** a DEV-only `?readerror` flag makes the three query functions throw until the first Retry press (armed = the URL has `?readerror` and this document load hasn't cleared it; one press clears it for all three surfaces, so B12 uses a fresh full load per surface; a cached success never re-runs the query fn), following the `?sample` / `?picker` precedent (`process.env.NODE_ENV !== 'production'` → dead-code-eliminated, `[FACT: note-entity.tsx:32-38; use-notes-rows.ts:41-44]`). It exists so the Visual Gate and live smoke can reach the error state on real OPFS | E-2 `[FACT: reconciliation.md:218]`; `retry: 1` default `[FACT: lib/query-client.ts]` |
| G9 | **Type labels + card names (B-60 · B-63)** | `note-renderers.tsx` drops its own `TYPE_ICON`/`TYPE_LABEL`/`Icon` and imports `typeIcon`/`typeLabel`/`Icon` from `note-chrome`, so the cards now read "Task", not "Task note" (chrome is the set the header, picker and preview already use `[FACT: notion-header.tsx:36; wikilink-picker.tsx:101; link-preview-card.tsx:33]`). Card `aria-label` = `"<label>, <Type>, edited <updated>"` + `", favorite"` when starred (the `<Type>` segment is dropped when the label itself came from the type, e.g. "Task note, edited 2h ago"): the full label, not the title alone. The visible text is unchanged | B-60/B-63 `[FACT: reconciliation.md:140,143; note-renderers.tsx:16-25,37,50]` |
| G10 | **What R1 does not touch** | Mode memory (R2: `modeStore` stays in-memory), the title edit (R3), any ⋯ item, the Calendar layout still in `renderNotesView` (R6, EC-1 re-pin), the `?picker`/`?templates` DEV overlays (R7/R9) | slice-map R2/R3/R6/R7/R9 |

## 3. Business rules (BR-R1-*)

- **BR-R1-1 · Page surfaces gate on page type.** Every `PAGE_TYPE` member offers the editor facet on the page surface;
  module-entity surfaces keep the `ENTITY_TYPES` gate unchanged.
- **BR-R1-2 · No empty page name.** H1, editor accname, collection row and card name come from one `pageLabel`; an empty
  or whitespace title never reaches them.
- **BR-R1-3 · Overviews are components.** A registrant's hooks bind to its own component instance.
- **BR-R1-4 · Notes owns only the `note` Overview** (and the fallback); other page types' Overviews are registered by
  their owning units.
- **BR-R1-5 · One save announcement per host.** A page's save state lives in the per-page store; at most one
  `SyncStatus` per host, hidden while the body is locked (the EC-33 notice speaks instead); no "Saving…", and no cloud claim.
- **BR-R1-6 · No dead ⋯.** The ⋯ renders only with at least one item.
- **BR-R1-7 · Failures are never silent.** A failed create, or a body write with no chip mounted to show it, raises one
  danger toast naming the action; a failure the chip shows does not also toast.
- **BR-R1-8 · Read errors are recoverable in place.** Page, collection and Home errors offer Retry (an explicit refetch);
  the message stays polite, and the control sits outside the live region.
- **BR-R1-9 · One type-label set** (note-chrome) across cards, header, picker and preview.

## 4. Acceptance — Verification Gate + Visual Gate

**A. Vitest (web):**
1. `offersPageEditor`: true for all 6 `PAGE_TYPE`; false for `'task'`, `''`, an unknown string. `toEntityProps({gate:'page',
   entityType:'task_note'})` passes the editor; with the default gate the same input does not (the entity gate is unchanged;
   the existing `adapter.test.ts` cases stay green untouched). `action` passes through.
2. `pageLabel` table: titled · whitespace title · null title per type · with `parentName`.
3. `NoteEntityView` with a `task_note` / `milestone_note` / `deliverable_note` / `task_group_note` page → the Note tab and the
   editor are present, and the Note tab is the active one (EC-15 · EC-4); an untitled `task_note` → H1 "Task note" and editor
   accname "Task note editor"; an untitled `note` → "Untitled note". Merged mode on a `task_note` renders the note Overview
   sections inline above the editor (EC-19).
4. Overview: a registered component that calls a hook renders inside the page (hook order is stable across a merged⇄tabbed
   switch); `overviewFor('journal')` → the note Overview (stub gone).
5. Save status: one `SyncStatus` on the note page in both modes and one inside Home's journal region; a write success →
   "Saved on this device"; a rejected write → "Couldn't save on this device" and **no** toast; tabbed → Overview keeps the
   chip state, and a rejection landing while on Overview → chip `error`, no toast; leaving the page (no subscription) then a
   rejection → one danger toast `Couldn't save “<label>”`; a later success → `saved`; a malformed page and a post-mount
   `onInvalidContent` → no chip, only the EC-33 notice (one status); `observed()` stays balanced under StrictMode.
6. `PageActions` with `items=[]` → no ⋯ button; with one item → a menu button with accessible name "Page actions".
7. `useCreateNote` rejection → one danger toast "Couldn't create the note".
8. Retry (with the app's real `queryClient` defaults): page/collection/Home in error → no further reads while idle; a press
   that succeeds reads once and renders the content; a press that fails again reads twice (1 + `retry: 1`); while retrying
   the button reads "Retrying…", is disabled and `aria-busy`.
9. Cards: renderers use the chrome labels ("Task"); `aria-label` carries type + edited + favorite.

**B. Live smoke on real OPFS** (dev app, Node 24, Brave + playwright-core, as in R0):
10. Method stated: no apps/web surface creates a task or any `*_note` today (no UI calls `createTask`; nothing creates
    `milestone_/deliverable_/task_group_note`), and the e2e harness is DB-level only (`window.__vidaDb`,
    `apps/web/e2e/harness.ts:47-69`). So each of the 4 `*_note` types is planted by a raw-SQL `INSERT INTO pages` (R0 method)
    with `title` NULL, `entity_type`/`entity_id` set and an `ensureEntityNote`-shaped body (H1 = a parent title) → open
    `/notes/$id` → Note tab active with the editor, H1 "<Type> note", typing saves (chip stays "Saved on this device"),
    reload keeps it.
11. A planted untitled `type:'note'` row → H1 and collection row "Untitled note".
12. Read-error Retry, live: open `/notes`, `/notes/$id` and `/` with the DEV `?readerror` flag (G8) → the error + Retry
    shows; drop the flag through the button (Retry clears it, see G8) → the content loads. The flag is NODE_ENV-gated and
    eliminated from the prod build, same as `?sample`: `pnpm --filter @vida/web build` then `grep -r readerror apps/web/dist` = 0.

**C. Visual Gate** (real browser, Victor reviews), each × light/dark × 375/768/1440: the note page header (title · chip; no
⋯ in R1) merged + tabbed; a `task_note` page merged + tabbed (Note tab first); Home with the chip; page/collection/Home error
+ Retry (forced with the DEV `?readerror` flag, G8); a
danger toast; a malformed page (notice, no chip). axe 0; keyboard reaches Retry; one save announcement (a11y-tree trace).

**EC → acceptance map (R1's ECs):**

| EC | R1 closure | Proven by |
|----|-----------|-----------|
| EC-15 | every page type opens with its editor | A1, A3, B10, C |
| EC-4 | the Note (editor) tab leads on every type | A3, B10, C |
| EC-19 | merged = the same per-type sections, continuous | A3, C |
| EC-18 | R1 closes the **slot** (components) + the `note` Overview + the fallback; 18a → journals-rescope (re-pin), 18b–e → fe-tasks / fe-projects (RIDE) | A4, C |
| EC-18f | note Overview: properties · attachments · backlinks | A4, C |
| EC-34 | one "Saved on this device" in the title row, no second announcement. The **"beside the ⋯"** clause closes at **R3's** Visual Gate, when the first ⋯ item (Rename) ships | A5, A6, C |
| EC-22/23 (inherited) | unchanged: chrome icons; borderless editor | C |

**D. Gates:** `pnpm typecheck` · `pnpm lint` · affected web tests green (run alone, Node 24). `/component-audit` on
`PageActions`; `/critique` SHIP.

## 5. Build steps (outline — refined into the IMPLEMENTATION-PLAN at gate 2)

1. `entity/adapter.ts`: `offersPageEditor` + `gate` + `action` passthrough; `entity/CLAUDE.md` (test 1).
2. `note-chrome`: `pageLabel`; `note-renderers` → chrome labels + card names; `toNotesRow` / H1 / accname use `pageLabel`
   (tests 2, 3, 9).
3. Overview registry → components; `NoteOverview`; remove the journal stub + its test row (test 4).
4. `notes/save-status.ts` + `useNoteContent` writes to it; `NoteEditorBody` drops its label; `PageActions`; Home chip
   (tests 5, 6).
5. `lib/notify-error.ts`; create + unobserved body-write failure (tests 5, 7).
6. Retry on the three error branches (test 8).
7. Docs: record the E-3 split in `slice-map.md` R1 + R7 ("R7 feeds `parentName` from the A-33 label seam") and the E-3
   ledger row's fix text.
8. Live smoke (B) → Visual Gate (C) → currency: `docs/modules/notes/current-*` (BR-SUR-3/4 rewritten, BR-R1-*), the stale
   headers/comments/types of the files touched (IR-R16: `note-entity.tsx:9-13`, `overview-registry.ts:5-8`,
   `note-overview.tsx:7-8`, `use-note-content.ts:19,28,136,148` + the `SaveState` `idle`/`saving` members once the label
   goes), `entity/CLAUDE.md` (`gate`; `hasPage` ignored for `gate:'page'`).

## 6. Change log

- rev 1 (2026-10-27) — drafted from the slice-map R1 rows + code read at `d9c1214`.
- rev 2 (2026-10-27) — independent critique r1 **REVISE**, 6 blocking, all folded in: (1) E-3 label "Untitled task" was false
  (the seed puts the parent title in the content H1) → "<Type> note"; provider citation corrected (tasks provider exists,
  uncomposed); the split is recorded in slice-map + ledger (step 7). (2) A locked/malformed page would carry 2 statuses → the
  chip hides on `locked`. (3) The observer = subscriptions, not mounts; the tabbed-Overview case stated; store lifetime
  defined; Pick widened for the toast label. (4) Retry vs `retry: 1`: `retrying` + disabled/aria-busy; read counts pinned.
  (5) Live-smoke methods stated up front (raw-SQL plants; Retry live via a DEV `?readerror` flag). (6) EC → acceptance map added; EC-34's "beside ⋯"
  closes at R3.
- rev 3 (2026-10-27) — critique r2 **SHIP** (0 blocking). Folded its non-blocking notes: the `?readerror` arming semantics + the
  prod-bundle grep; `SaveStatus = LocalSyncState | 'locked'` + the no-render-time store write for malformed-at-load; the
  card name drops the doubled type segment; change-log wording.
- **APPROVED by Victor (Approval 1) on 2026-10-27.** Next: §XXVI gate 2 — /preflight → /critique → IMPLEMENTATION-PLAN-R1 → Approval 2.
- **APPROVED by Victor (Approval 2) on 2026-10-27** with IMPLEMENTATION-PLAN-R1 rev 3 (refinements R-1…R-6; G8 premise amended per R-6).
