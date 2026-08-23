<!-- ui-ux/screen-flow.md — Track B · §6 lens 2. The full CRUD navigation + per-operation state machine.
     Cited to the built files + current-*. Born 2026-08-22 (recovery). -->

# Screen flow — navigation + per-operation state machines

## Create

`⌘K → "New note"` (command-bar, runs OUTSIDE React — IR-4) → `getNotesService()` (dynamic import, BR-7) →
`createPage({type:'note'})` → **manual** `invalidateQueries(notesKeys.type('note') + .lists())` → `navigate('/note/$id')`.
On failure → `console.error` + toast (the vault-bug observability fix). `[FACT: commands.ts:20-42; current-spec.md:67-69]`

```
/notes ──⌘K──▶ createPage ──▶ invalidate ──▶ /note/$id (fresh, empty doc)
                    │
                    └─ reject ─▶ toast + console.error (no navigation)
```

## Read / browse

`/notes` → `usePagesByType('note')` → terminal state (loading→empty→success→error, DP-7, never re-derived) →
render the active view (List/Gallery/Neural, `useNotesUiStore.activeNotesView`). `NoteCard onPress` →
`navigate('/note/$id')`. `[FACT: index.tsx:18-63; note-card.tsx:21-45]`

## Edit + autosave

`note/$id` → `usePage(id)` → state switch → success mounts `NoteEditorSurface key={id}` (per-page remount, EM-2)
→ `VidaEditor` seeded from `safeParse(page.content)` (EM-4) → `onChange` → `useNoteAutosave`:

```
onChange ──skip-once(mount echo, IR-5)──▶ debounce(≈600ms) ──▶ useUpdatePage({content}) ──▶ status: saving→saved
   │                                                                                            └─ reject ─▶ error
   └─ unmount / id-change ──▶ flush pending (EM-10, no lost edit)
```
`[FACT: use-note-autosave.ts:16-69; current-business-rules.md:47-54]`

## Rename

Title `Input` → blur (or Enter→blur) → `useUpdatePage({title})` (EM-6). Invalidates page + lists + type (title
surfaces in the collection). `[FACT: note-detail.tsx:118-131; hooks.ts:76-89]`

## `[[` link (two-write, ordered)

`type "[["` → Suggestion opens → `cfg.query(text)`=`resolveWikiLink` (AbortSignal, debounce 150) → select a
candidate OR "+ Create":
```
select/create ──▶ resolve candidate (create-on-miss via {__create} → onCreate=createPage)
              ──▶ cfg.onSelect = createPageLink(currentId, targetId)   [ROW FIRST — WL-2b/IR-8]
              ──▶ apply wikiLink mark atomically                        [MARK SECOND]
                     └─ onSelect/onCreate reject ─▶ NO mark (no content↔relation divergence); NP-5 makes retry safe
```
`[FACT: wiki-link.ts:57-77; note-detail.tsx:81-114; current-business-rules.md:55-57]`

## Soft-delete (part of the ② note-management surface — NOT deferred)

`useSoftDeletePage` invalidates page + lists + all types (id-only → coarse, DP-6). A delete affordance is
**in-scope for MOD-notes ②** — `m1.1-delivery-plan.md:151-153` lists note management under "② UI NOW" and defers
nothing about delete (the earlier "②d concern" note here was authoring drift, corrected 2026-08-22). Delete lives
on the NoteCard (list/gallery) + the note-detail surface (confirm → `softDeletePage` → invalidate → route back).
`[FACT: hooks.ts:92-102; m1.1-delivery-plan.md:151]`
