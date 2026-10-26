# Current Spec — notes (Notes & Pages)   (level: module · tier: DEEP · both planes)

> §XXIX living doc. Covers BOTH planes of the entity: ① the `@vida/core` **Notes & Pages service** (the in-degree-14
> connective HUB) and ② the `apps/web` **notes surface** (`/notes`, `/notes/$id`, the shared note editor body).
> Every claim cites the code as-is.
> Coverage: ① `services/notes/{index,types,service}.ts` + `validators/note.ts` + `schema/notes.ts` + `033_notes.ts` +
> the one test file — **full** · ② `apps/web/src/notes/` 31/31 non-test files **full**, 17 test files counted
> (122 `it`) not read; routes + `db/composition-root.ts` + `entity/adapter.ts` + `collection/*` read.
> Inherits: `docs/core` → ADR-002 (data model) · ADR-006 (spaces/registry) · ADR-008 (render targets) · ADR-009 (templates).
> Intent authority: ① `docs/specs/foundation/backend-intent/parts/notes-and-pages.md` (NOT-01…54) ·
> ② `docs/specs/foundation/fe-notes-and-pages/` (envision EC-1…24).
> Last refreshed: 2026-10-26 — notes-rescope (LIF-245) Step 0 baseline. Source of truth = the code.

## Status
- **① BACKEND COMPLETE** — S1 pages core · S2 entity notes + attachments · S3 page-links + wiki resolution · S4
  delegation facade (2026-09-19, LIF-131) + `writePageContent` (2026-10-20, notes-entity-usability S2).
- **② SURFACE — PARTIALLY LIVE.** fe-notes #27 S1–S9 shipped 2026-10-11 on stubs; data-plane-wiring (PR #148) +
  notes-entity-usability (PR #150) flipped the **read list · read page · create · content write** legs live. Every
  other leg is still a stub (§② Hooks). The remaining legs are notes-rescope's scope (golive-replan coverage-report §A).

---

## ① Service plane — `@vida/core` `services/notes`

### Construction
`createNotesService(deps): NotesService` — factory-object, no `this.` [FACT: services/notes/service.ts:72].
Deps `{db, deviceId, spaces, backlinks, registry}` [FACT: services/notes/types.ts:20-29]: `registry` (S1 create + S4
links), `spaces` (S4 writes, service.ts:272,276), `backlinks` (S4 reads, service.ts:280,288).
`pageRepo = createRepository(db, pages, {deviceId, encryptedFields:[], softDelete:true})` [FACT: service.ts:75];
attachment / page-link / read-only entity-tag repos [FACT: service.ts:77-89]. The file opens with the pure
`seedContent` + `allOf` helpers [FACT: service.ts:41-58].

### Contract — S1 pages core
Returns Drizzle `PageRow` (`typeof pages.$inferSelect`), not the `@vida/types` `Page` interface (DB-11 reconcile)
[FACT: schema/notes.ts:110]. Interface: [FACT: types.ts:56-105].
- `createPage(input: CreatePageInput): Promise<PageRow>` — Zod parse → journal clash check → `assertRegistered(entity_type)`
  → create with notNull defaults backfilled [FACT: service.ts:106-126].
- `getPage(id): Promise<PageRow|null>` — `findById` (soft-delete filtered) [FACT: service.ts:128; db/repository.ts:356-361].
- `updatePage(id, patch: UpdatePageInput): Promise<PageRow>` — metadata only; `updatePageSchema.strict()` (no `content`)
  [FACT: service.ts:130-133; validators/note.ts:47-62].
- `writePageContent(id, content: EditorDocument): Promise<PageRow>` — the IR-7 editor-body write path,
  `update({content: JSON.stringify(content)})`, SEPARATE from `updatePage`'s LWW metadata patch so M4 can re-home
  `content` to the CRDT merge without touching callers [FACT: service.ts:135-139;
  docs/specs/foundation/fe-notes-and-pages/delivery/interpretation.md:159]. No Zod check on `content`.
- `softDeletePage(id): Promise<void>` [FACT: service.ts:141-143].
- `getPageByJournalDate(date)` [FACT: service.ts:98-103, bound 145] · **`ensureJournal(date): Promise<PageRow>`** —
  get-or-create the day's journal, title = the date string [FACT: types.ts:67; service.ts:190-194] ·
  `getPagesByType(type)` [FACT: service.ts:147-148] · `getPagesForEntity(entityType, entityId)` [FACT: service.ts:150-153] ·
  `listPages({favorite?, archived?})` — a flag filters only when truthy; **no flag ⇒ archived pages are included**
  [FACT: service.ts:155-162].
- Errors: `JournalExistsError(journalDate)`, `UnregisteredEntityTypeError(entityType)` — bespoke `extends Error`, stable
  `.name` [FACT: types.ts:107-121]. A missing id on update throws the repository's plain `Error('Row not found: …')`
  [FACT: db/repository.ts:412-413]. `ServiceError` reconcile → DB-11.
- Input types: `CreatePageInput`/`UpdatePageInput` = `z.infer` of `validators/note.ts` [FACT: types.ts:31-34].

### Contract — S2 entity notes + attachments
- `ensureEntityNote(pageType, entityType, entityId, seed: EntityNoteSeed): Promise<PageRow>` — NP-8 idempotent
  find-then-create via `getPagesForEntity` + type filter; `content = seedContent(seed)` (deterministic minimal
  `EditorDocument`) [FACT: service.ts:165-183, 41-58].
- `addAttachment(pageId, file: NewAttachment)` · `getAttachments(pageId)` · `removeAttachment(id)` over
  `note_attachments` [FACT: service.ts:196-217; schema/notes.ts:91-107]. `NewAttachment` is camelCase with `Uint8Array`
  blobs; the boundary cast to Drizzle's `Buffer` is documented [FACT: service.ts:202-207].

### Contract — S3 page-links + wiki resolution
- `createPageLink(source, target, context?)` — NP-5 idempotent: live → no-op · soft-deleted → revive · absent → create;
  the business-key lookup intentionally includes soft-deleted rows [FACT: service.ts:220-242; migrations/033_notes.ts:91].
- `removePageLink(source, target)` [FACT: service.ts:244-250] · `getPageLinksFrom` / `getPageLinksTo` [FACT: service.ts:252-256].
- `resolveWikiLink(text): Promise<PageRow[]>` — live pages with `title LIKE %text%`; no wildcard escape, no LIMIT; null
  titles never match [FACT: service.ts:259-260].

### Contract — S4 delegation facade
- `createEntityLink(pageId, entityType, entityId, context?)` — notes `assertRegistered` THEN AR-6 `spaces.createLink`
  [FACT: service.ts:265-273]. `removeEntityLink` → `spaces.removeLink` [FACT: service.ts:275-277].
- `getEntityLinksFrom(pageId)` → AR-8 `backlinks.getLinksFrom` [FACT: service.ts:279-280].
- `getBacklinks(entityType, entityId): {entityLinks, pageLinks}` — UNMERGED (merge is ②) [FACT: service.ts:284-290].
- `getTagsForEntity` / `getEntitiesByTag` — read-only `entity_tags` [FACT: service.ts:293-303].

### Consumers (blast radius)
Core (injected via each module's `types.ts`): tasks · books · knowledge → `ensureEntityNote`; learning-education →
`getPagesForEntity`; projects → `createPage`, `getPagesForEntity`; purposes → `createPage`, `ensureEntityNote`,
`getPagesForEntity`; relationships → `getPagesForEntity` + `createPage`; check-ins → structural `JournalLinkPort`
`{getPageByJournalDate, createEntityLink}` [FACT: services/checkins/types.ts:28-31].
apps/web live calls: `composition-root.ts` (construction) · `home/use-journal-entry.ts:68` `ensureJournal` ·
`notes/use-create-note.ts:27` · `notes/use-note-content.ts:53` · `notes/use-note-entity.ts:133` ·
`notes/use-notes-rows.ts:56` · `app/calendar/use-calendar.ts:137` `getPageByJournalDate`.
**No production caller:** `getPagesByType`, `softDeletePage`, `removePageLink`, `getPageLinksFrom`, `getEntityLinksFrom`,
`removeEntityLink`, `getTagsForEntity`, `getEntitiesByTag`, attachments, `resolveWikiLink`, `createPageLink`,
`getBacklinks`, `updatePage` [INTERP: bounded grep].

### Adjacent services the surface depends on (not owned here)
- **Templates** (`foundation/templates`): CRUD only — `createTemplate/listTemplates/getTemplate/deleteTemplate`
  [FACT: foundation/templates/service.ts:24-59]; `InstantiationResult`/`TemplateCaptureError` are types with no impl
  [FACT: foundation/templates/types.ts:25-29,45-50]. Instantiate/capture = "first-consumer-pull SEAMS (0 code)"
  [FACT: docs/features/templates/delivery/slice-map.md:24-51].
- **Views** (`foundation/views`): `create/update/delete/get/listViews`, `cloneView(sourceId, targetSpaceId: string|null)`
  [FACT: foundation/views/service.ts:26-45] over `views{space_id,name,layout,filter,grouping,sort}`
  [FACT: db/schema/foundation/spaces.ts:113-128]. XCU-14 = "✅ (seam; no code owed)" → renderer
  [FACT: docs/features/views/delivery/reconciliation.md:25].
- **Journals** `buildDashboard` exists [FACT: services/journals/dashboard.ts:41-44; services/journals/service.ts:48-50] and
  is composed in apps/web over an EMPTY `JournalRegistry` — no `register*Journal` call in apps/web
  [FACT: apps/web/src/db/composition-root.ts:90-91,97].

---

## ② Surface plane — `apps/web/src/notes`

### Routes + composition
- `/notes` → lazy `notes-surface` [FACT: apps/web/src/routes.tsx:76-80]; `/notes/$id` → lazy `note-entity`
  [FACT: routes.tsx:83-87]; dock entry `routePath:'/notes'` [FACT: nav/module-map.ts:68].
- `getServices()` — lazy singleton after `ensureDbReady` → `initVault` → `resolveDeviceId`; a rejected build is not cached
  [FACT: apps/web/src/db/composition-root.ts:118-141]. **NotesService is registered**: `registry → spaces → backlinks →
  createNotesService` [FACT: composition-root.ts:85-88], exposed as `Services.notes` [FACT: :51,:115] and injected
  into tasks/purposes/relationships [FACT: :102-110].

### Hooks (data legs)
| Hook | Status | Call · query key | Cite |
|---|---|---|---|
| `useNotesRows` | **LIVE** | `notes.listPages()` (no filters) · `['notes','pages']` | use-notes-rows.ts:52-64 |
| `useNoteEntity` | **LIVE** | `notes.getPage(id)` · `['pages',id]`; null → `empty` | use-note-entity.ts:129-140 |
| `useNoteContent` | **LIVE write** | `notes.writePageContent` · debounce 500 ms · invalidates `['pages',id]` | use-note-content.ts:26,50-65 |
| `useCreateNote` | **LIVE write** | `notes.createPage({type:'note',title:'New note'})` → invalidate `['notes','pages']` → navigate | use-create-note.ts:24-37 |
| `useBacklinks` | STUB | `{groups:[],count:0,state:'empty'}` | use-backlinks.ts:68-76 |
| `useAttachments` | STUB | `[]`, add/remove no-op | use-attachments.ts:38-45 |
| `usePageMetadata` | STUB | reflects fields; favorite/archive/icon/cover no-op | use-page-metadata.ts:27-39 |
| `useWikiLinkPicker` | STUB | candidates `[]`, pick/create no-op | use-wikilink-picker.ts:49-63 |
| `useJournalSummary` | STUB | `{sections:[],state:'empty'}` (never calls `buildDashboard`) | use-journal-summary.ts:48-51 |
| `useNotesSearch` | PARTIAL | `useCommandSearch(query, stubSearchProvider)` → honest `search-unavailable` | use-notes-search.ts:36-40 |
| `useTemplates` | STUB | `[]`, apply/saveCurrent no-op | use-templates.ts:55-62 |
| `useCollection` (shared) | STUB view-config | layout in local `useState`; filter/sort/new-view `() => {}` | collection/use-collection.ts:32-43 |

DEV-only fixtures: `?sample` (gated `NODE_ENV !== 'production'`) [FACT: use-notes-rows.ts:41-44]; `?picker` /
`?templates` dev-mounts [FACT: note-entity.tsx:32-38,127-150]. Eight hook headers still claim "no live composition
root" (stale) [FACT: use-attachments.ts:3-4; use-backlinks.ts:3-5; use-wikilink-picker.ts:3-4; use-page-metadata.ts:4;
use-journal-summary.ts:6-7; use-note-entity.ts:3-5; use-notes-rows.ts:5-7; collection/use-collection.ts:8-10].

### Components (contract · states · interactions)
- **NotesSurface** (`/notes`) — 4 layouts list/gallery/calendar/graph [FACT: notes-surface.tsx:21]; "New note" (disabled
  while pending) [FACT: :39-41]; `NotesSearch` above the collection; open → `/notes/$id` [FACT: :29];
  `resolved = {rows, groups:[], state, degraded:[]}` [FACT: :32]; filter/sort/new-view → no-op [FACT: :50-52].
- **renderNotesView** — list `NoteRowCard` (interactive Card, `aria-label=title`, favorite Star) [FACT: note-renderers.tsx:35-46];
  gallery tiles [FACT: :48-60]; calendar on `r.date`, `empty`→`success` so the grid renders [FACT: :69]; graph `NeuralGraph
  nodes=[]` [FACT: :70-75]. TYPE_ICON/TYPE_LABEL duplicated vs note-chrome with different labels
  [FACT: note-renderers.tsx:16-25 vs note-chrome.tsx:43-50].
- **NoteEntity** (`/notes/$id`) — loading (`aria-busy`) · error (`role=status`) · empty ("Note not found") · success →
  `NoteEntityView` [FACT: note-entity.tsx:61-100].
- **NoteEntityView** — `toEntityProps({entityType: page.type, hasPage:true, editorState:'success' (hard-coded),
  defaultFacet:'editor'})`; mode from a module-level in-memory store, default `tabbed` [FACT: note-entity.tsx:42,103-151;
  entity/adapter.ts:93-102]. **No rename / delete affordance** (EntityView `title` is a plain string)
  [FACT: packages/ui/src/components/entity-view.tsx:35-36].
- **Editor gate** — `offersEditor(entityType, hasPage) = schema.isEntityType(entityType) && hasPage`
  [FACT: entity/adapter.ts:33-35]. `ENTITY_TYPES` holds `note`, `journal` (+ `task`, `milestone`, `deliverable` …) but no
  `*_note` page types [FACT: packages/core/src/db/schema/_registry.ts:7-8,31,36-37] ⇒ only 2 of the 6 `PAGE_TYPE`s
  [FACT: packages/types/src/note.ts:23-29] get the editor facet.
- **NoteEditorBody** `{page}` — `<VidaEditor chrome="bare" defaultValue={page.content} onChange={save}>` (uncontrolled);
  `role=status` save label Saving…/Saved/Couldn't save [FACT: note-editor-body.tsx:18-55]. Does not use
  `canvas-editor/page-binding.ts` (no production importer) [FACT: note-editor-body.tsx:14,31].
- **Overviews** — registry holds `note` (`noteOverview`) + `journal` (`journalOverviewStub`); any other type falls back to
  `noteOverview` [FACT: overview-registry.ts:33-39]. noteOverview merged = NotionHeader + Attachments + Backlinks;
  tabbed = DashboardView blocks, all `state:'success'` [FACT: note-overview.tsx:36-76]. Journal tabbed has no Backlinks
  block, merged does [FACT: note-overview.tsx:88-98].
- **NotionHeader / MetadataControls** — cover banner placeholder (`role=img`), type badge, Favorite/Archive
  `aria-pressed` toggles + icon/cover actions (`role=group` "Page metadata"), read-only Type/Updated rows
  [FACT: notion-header.tsx:13-62; page-metadata.tsx:57-121].
- **AttachmentsPanel** — 4 states, `role=list`, per-item "Remove {filename}", "Add attachment" [FACT: attachments-list.tsx:87-132].
- **BacklinksPanel** — 4 states, grouped by module, "· N links"; items **not navigable** [FACT: backlinks-panel.tsx:26-67].
- **SummaryBlock** `{date}` — per-section degrade ladder [FACT: summary-block.tsx:46-92].
- **NotesSearch** — `role=search`, Esc clears, exhaustive `never` status switch, results plain text (no navigation)
  [FACT: notes-search.tsx:30-105].
- **WikiLinkPicker** — `role=listbox`/`option`, arrow/Enter, explicit "Create “q”" row; **no text input** (query can't
  change in UI) [FACT: wikilink-picker.tsx:28-141]. **PreviewCard** — title + type only [FACT: link-preview-card.tsx:13-37].
- **TemplatePicker** — `role=group`, 4 states, Apply/Save no-op [FACT: template-picker.tsx:65-125].

### Editor integration (`@vida/editor`)
- The only suggestion trigger is `/` [FACT: packages/editor/src/extensions/slash-command.ts:96]; **no `[[` input rule**
  exists. The picker mounts only under DEV `?picker` [FACT: note-entity.tsx:127,134-141].
- `/summary` = `dailySummary` node with a generic placeholder node-view "Available when its module ships"
  [FACT: packages/editor/src/commands.ts:10-15; extensions/integration-blocks.tsx:147-161,202-204].

### Key states
List: loading · empty · error · success (`degraded` never populated) · DEV sample. Page: loading · error · not-found ·
success. Editor save: idle · saving · saved · error. Picker: populated · empty (searching/error unreachable).

### Consumers outside `notes/`
`home/journal-page-region.tsx:22,70` mounts `NoteEditorBody` (journal writes go through `useNoteContent`);
`home/use-journal-entry.ts:15-16,67-68` reuses `toNoteEntity` (key `['journal',date]`); `app/calendar/use-calendar.ts:19,138`
reuses `parseContent`.

---

## Deferred / homed elsewhere (not in this context)
`/summary` providers → HARD-1 · backlinks + neural graph data → HARD-3 · FTS5 search → DB-8 · `[E]` field encryption →
M3/DB-5 · CRDT/Yjs `content` merge → M4 · hard-delete cascade → Part 2 · `word_count` derivation → editor/FTS ·
EC-18b–e/20/21 entity overviews → fe-tasks / fe-projects (RIDE) [FACT: docs/specs/foundation/golive-replan/coverage-report.md:21-72].
