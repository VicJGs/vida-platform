# Seam Contract (②) — fe-notes-and-pages consumes

> The ② consumption view: what each fe-notes slice calls on the finished ① `NotesService`, the deferred backend
> seams it degrades against, and the NET-NEW ② seams this unit introduces (the Layout-facet slot · React-Query
> hooks). The ① API itself is the authority at `docs/features/notes-and-pages/delivery/seam-contract.md` — NOT
> restated here; this maps it to the UI.

## 1. ① NotesService — methods consumed, by slice

Return types are Drizzle `$inferSelect` **Row** types (PageRow/PageLinkRow/NoteAttachmentRow/EntityLinkRow/EntityTagRow),
NOT `@vida/types` interfaces (DB-11 pending) [FACT: ① seam-contract.md]. Validating methods are `async` (Promise reject).

| Slice                     | NotesService methods                                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| S1 Collection             | `listPages({favorite?,archived?})` · `getPagesByType(type)` · (graph nodes/edges from `getPageLinksFrom`/`getBacklinks` — else empty)    |
| S2 Note-page frame        | `getPage(id)` · `updatePage(id, patch)` (metadata only; `content` ≠ patched — CRDT) · `createPage(input)` · `softDeletePage(id)`         |
| S3 Backlinks              | `getBacklinks(entityType, entityId)` → `{pageLinks, entityLinks}` (merge + group-by-source in the UI) · `getPageLinksTo`                 |
| S4 `[[` picker            | `resolveWikiLink(text)` → candidates · create-on-miss = `createPage('note')` then `createPageLink(src,tgt)` (explicit compose)           |
| S5 `/summary` block       | the MOD-journals engine seam (read the enabled sections); Notes owns `summary_config` via `updatePage` (NOT-32)                          |
| S6 Metadata + attachments | `updatePage` (is_favorite/is_archived/icon/cover_image) · `getAttachments` · `addAttachment` · `removeAttachment`                        |
| S7 Search                 | the Search seam → `search-unavailable` (FTS5 engine = DB-8, deferred)                                                                    |
| S8 Templates              | the ADR-009 templates substrate (apply/save)                                                                                             |
| S9 Block add-menu         | the capability palette seam (offered/allowed per surface — CAP-13; `block_instances` placement — CAP-12; both services deferred #31/#29) |

Typed errors the UI surfaces at affordances: `JournalExistsError(journalDate)` (NP-2 create clash), `UnregisteredEntityTypeError(entityType)` (link to unregistered type).

## 2. Deferred backend seams — degrade, never crash (IR-2)

| Seam                                       | Owner / defer            | M1 UI behavior                                                    |
| ------------------------------------------ | ------------------------ | ----------------------------------------------------------------- |
| FTS5 ranked search                         | DB-8                     | `search-unavailable` terminal (S7)                                |
| Neural-graph data-prep                     | AR-8 / Views design-pass | `NeuralGraph` `empty` terminal (S1)                               |
| Preview-card enrichment                    | M1.1+                    | card renders with available data (S4)                             |
| Block placement-creation + palette compute | #31 / UI-3 #29           | add-menu renders over the seam (S9)                               |
| `/summary` aggregation ENGINE              | MOD-journals             | the block consumes the journals seam; Notes owns config only (S5) |
| Saved-view SELECTION primitive             | ADR-007 design-pass      | renderers hard-coded per page-type (S1)                           |

## 3. NET-NEW ② seams this unit introduces

### 3a. The Layout-facet SLOT (the cross-unit seam — D1)

The S2 note-page frame exposes a per-`entity_type` Layout slot:

```ts
// apps/web/src/notes/ — the note-page composition
interface NotePageLayoutSlot {
  entityType: PageType // 'note' | 'journal' | 'task_note' | 'task_group_note' | 'milestone_note' | 'deliverable_note'
  entityId: string
  // fe-notes renders the `note` layout itself; for the rest it mounts the RIDE overview registered by the owning unit.
  // M1: `note` (+ a journal stub) ships; task/milestone/deliverable overviews arrive with fe-tasks/fe-projects.
}
type EntityOverviewRenderer = (entityType: PageType, entityId: string) => ReactNode | null // null → fe-notes' own note layout
```

- Absent renderer ⇒ fe-notes' own layout (empty-but-functional; the fe-shell panel-slot precedent). No dead affordance.
- Owning units (fe-journals/fe-tasks/fe-projects) register their overview renderer for their `entity_type` — zero-signature swap.

### 3b. React-Query hooks (D3)

Reads/writes over `NotesService` via React-Query v5; keys namespaced per concern (`['pages',…]`, `['links',…]`,
`['attachments',…]`), **prefix-safe invalidation** (a write invalidates the right prefix — heed the staleTime/prefix
trap, memory [[verify-a-cache-liveness-BR-against-the-runtime-config]]). Exact keys fixed per-slice at `/contract`.

### 3c. `@vida/editor` consumption (NOT-52 — not re-authored)

`VidaEditor` (chrome=bare) via `apps/web/src/canvas-editor`; its blocks (text/heading/list/taskList/quote/table/
callout/code + the integration blocks) are ui-3's. The S9 add-menu drives the editor's slash/insert; S2 mounts the
editor as the note-page body. EC-24 (Quote/Task-list fixes) = a SEPARATE ui-3 change, consume-verified here.

## 4. Construction / boot preconditions (NEEDS)

- Mounts under `routes.tsx` inside the shell `<Outlet/>`, after the DB-ready gate + `UIProvider` + shell frame.
- A live `NotesService` composition root for apps/web (D2 — live vs stub resolved at S1 PLAN; `ProviderRead` precedent).
- Registry readiness: `entity_type` ∈ pre-seeded set (page·note·journal·tag·space); unregistered → typed error.
- M1.0 encryption pass-through ([E] inert); `content` written via the Yjs/editor binding, never a plain patch.
