<!-- ui-ux/components-flow.md — Track B · §6 lens 4. The component tree: which @vida/ui / @vida/editor
     primitives compose into which feature components + the data/props flow. Born 2026-08-22 (recovery). -->

# Components flow — tree + data/props flow

## Collection (②b)

```
NotesRoute (app/notes/index.tsx)
├─ usePagesByType('note') ──▶ { data: PageRow[], state }         (②a hook, DP-7)
├─ NotesViewSwitcher ──▶ useNotesUiStore.activeNotesView          (ephemeral Zustand)
└─ active view:
   ├─ ListView<PageRow>    (UI-2) · renderItem = NoteCard
   ├─ GalleryView<PageRow> (UI-2) · renderItem = NoteCard
   └─ NeuralGraph          (UI-2, empty)
        NoteCard (note-card.tsx) = UI-1 Card interactive · reads PageRow only (NC-8 presentational)
                 · onPress ▶ navigate('/note/$id')
```
`[FACT: index.tsx:18-63; note-card.tsx:21-45; view-switcher.tsx]`

## Authoring (②c)

```
NoteDetailRoute (note-detail.tsx)
├─ usePage(id) ──▶ { data: PageRow|null, state }                 (②a hook)
└─ success ▶ NoteEditorSurface key={id}
   ├─ Input (UI-1) — title · aria-label · blur ▶ useUpdatePage({title})   (EM-6)
   ├─ VidaEditor (UI-3 @vida/editor)
   │    ├─ defaultValue = safeParse(page.content)  (EM-4, empty-doc safe)
   │    ├─ onChange ▶ useNoteAutosave(id).onChange  ▶ debounce ▶ useUpdatePage({content})
   │    ├─ aria-labelledby = titleId                (EM-5)
   │    └─ wikiLink = { query, onCreate, onSelect }  ◀── INJECTED (WL-4)
   │         query    = resolveWikiLink              (getNotesService)
   │         onCreate = createPage({type:'note',title}) + invalidate
   │         onSelect = createPageLink(id, targetId) + invalidate backlinks/pagelinks
   └─ save indicator (role=status) ◀ useNoteAutosave(id).status  (EM-7)
```
`[FACT: note-detail.tsx:42-143; use-note-autosave.ts]`

## The `[[` picker (②c · @vida/editor, @vida/core-free)

```
VidaEditor
├─ WikiLinkMark        (registered ALWAYS — existing links render, NP-7)
└─ WikiLink Suggestion (gated on injected config; char '[[')
     ├─ items = cfg.query(stripWikiClose(q), AbortSignal)
     ├─ command = applyWikiSelection  (row FIRST via cfg.onSelect, mark SECOND — WL-2b)
     └─ render = ReactRenderer ▶ WikiLinkMenu (listbox popup)
```
The editor imports **no** `@vida/core`; all data is injected via the `wikiLink` prop. `[FACT: wiki-link.ts:33-40,173-202;
current-business-rules.md:58-59]`

## Data-plane spine (shared, ②a — consumed by both surfaces)

`getNotesService()` → `getDb()` (worker RPC, DP-8 mutex) + `getDeviceId()`; hooks wrap it with React-Query
(invalidate-and-reread, DP-6). No HTTP. `[FACT: current-spec.md:39-56]`

## ②d/②e (forward — components to build)

②d: a `BacklinksPanel` (consumes `getBacklinks`/`getPageLinksTo`) + page-metadata controls (favorite/archive
toggles → `useUpdatePage`; icon/cover pickers). ②e: a `NotesSearch` over the DB-8 seam. Compose UI-1 primitives;
spec'd here, built in S7/S8. `[FACT: ../delivery/slice-map.md S7/S8]`
