# IMPLEMENTATION-PLAN — S6 · Page metadata + attachments

> fe-notes-and-pages (② unit #27) · slice S6 · LIF-191 · branch `fe-notes-and-pages` (Node 24).
> **Gate-2 artifact** (Approval-1 PLAN approved). Build strictly from §3; divergence → §XXVIII. Every contract line
> FACT-grounded. Pairs with `PLAN-s6-metadata-attachments.md`.

## 1. Grounding ledger
| Claim | Source |
|-------|--------|
| `updatePage(id, patch)` whitelist incl. `{is_favorite, is_archived, icon, cover_image}` | validators/note.ts updatePageSchema; NOT-03/47 |
| `getAttachments(pageId) → NoteAttachmentRow[]` · `addAttachment(pageId, NewAttachment) → NoteAttachmentRow` · `removeAttachment(id)` | seam-contract.md:38-40; NOT-29/30/31 |
| `NoteAttachmentRow = { id, page_id, filename[E], mime_type, encrypted_blob[E], thumbnail_blob[E]?, size_bytes, deleted_at, …base }` | schema/notes.ts noteAttachments |
| `NewAttachment = { filename, mimeType, encryptedBlob: Uint8Array, thumbnailBlob?, sizeBytes }` | services/notes/types.ts:48 |
| `pages.icon` (text, not [E]) · `pages.cover_image` ([E]) are real columns | schema/notes.ts pages:16,cover; NOT-38 |
| `@vida/core` doesn't re-export the Row types → structural `*Like` (PageLike precedent) | canvas-editor/page-binding.ts:16 |
| `EntityView.action?` exists but `toEntityProps`/`EntitySource` don't forward it → use the shared PropertyRows surface, not the adapter | entity-view.tsx:40; entity/adapter.ts (no `action`) |
| M1 no live composition root → honest-empty + `?sample`; `[E]` pass-through | use-note-entity.ts:5; NOT-38 |

## 2. Contracts (exact signatures)

### 2a. `apps/web/src/notes/use-note-entity.ts` (edit — extend the projection, D-S6-3)
`NoteEntityData` gains **`icon: string | null`** + **`cover: string | null`** (map `pages.icon`/`cover_image`). `sampleFor`:
set for the note sample so the gate can reflect SET state — `icon: type==='note' ? 'star' : null`, `cover: type==='note'
? 'cover-sample' : null`. **CASCADE:** the `NoteEntityData` literal at `note-entity.test.tsx:11` gains `icon: null, cover: null`.

### 2b. `apps/web/src/notes/attachments.ts` (pure — no React, no @vida/core)
```ts
export interface NoteAttachmentLike { id: string; filename: string; mime_type: string; size_bytes: number }
export interface AttachmentItem { id: string; filename: string; mime: string; sizeBytes: number }
export function toAttachmentItems(rows: readonly NoteAttachmentLike[]): AttachmentItem[]  // 1:1 map
export function formatBytes(n: number): string  // 0→"0 B"; <1024→"N B"; <1MB→"N.N KB"; else "N.N MB" (1 decimal, round)
```

### 2c. `apps/web/src/notes/use-attachments.ts` (data seam — stub-disciplined)
```ts
export type AttachmentsState = 'loading' | 'error' | 'empty' | 'populated'
export interface AttachmentsResult {
  attachments: readonly AttachmentItem[]
  state: AttachmentsState
  add: () => Promise<void>            // live: FileReader → NewAttachment → addAttachment(pageId, …) [D-S6-5 deferred pipeline]
  remove: (id: string) => Promise<void> // live: removeAttachment(id)
}
export function useAttachments(pageId: string): AttachmentsResult
```
M1 default `{attachments: [], state: 'empty'}`; `?sample` → ≥2 `AttachmentItem`s (mixed mime: a pdf + an image). `pageId`
`_`-prefixed in the stub (live reads it). `add`/`remove` no-op M1 (`_id`-prefixed). RQ key `['attachments',pageId]`.

### 2d. `apps/web/src/notes/attachments-list.tsx` (presentational split)
```ts
export function AttachmentsView(props: {
  attachments: readonly AttachmentItem[]; state: AttachmentsState
  onAdd: () => void; onRemove: (id: string) => void
}): JSX.Element
export function AttachmentsPanel({ pageId }: { pageId: string }): JSX.Element
```
`AttachmentsPanel` = `const a = useAttachments(pageId); return <AttachmentsView attachments={a.attachments} state={a.state}
onAdd={a.add} onRemove={a.remove} />`. `AttachmentsView` body-only: `loading`→muted aria-busy; `error`→muted role=status;
`empty`→muted "No attachments yet." + the Add affordance; `populated`→a `role="list"` of rows (`fileIconFor(mime)` Lucide +
`filename` `$body` + `formatBytes(sizeBytes)` muted + a Remove `button` `aria-label={`Remove ${filename}`}`) + the Add
affordance (a `button` "Add attachment", Paperclip/Plus icon). `fileIconFor(mime)` local: image→Image, pdf→FileText,
else→File. Non-interactive rows except the Remove button. Direct semantic tokens; `note-chrome` atoms (EC-22).

### 2e. `apps/web/src/notes/use-page-metadata.ts` (metadata reflect + stubbed mutations)
```ts
export interface PageMetadata {
  favorite: boolean; archived: boolean; icon: string | null; cover: string | null
  toggleFavorite: () => Promise<void>   // live: updatePage(id, {is_favorite: !favorite})
  toggleArchive: () => Promise<void>    // live: updatePage(id, {is_archived: !archived})
  changeIcon: () => Promise<void>       // live: updatePage(id, {icon: …})  [picker = M1.1+, D-S6-6]
  changeCover: () => Promise<void>      // live: updatePage(id, {cover_image: …})
}
export function usePageMetadata(page: NoteEntityData): PageMetadata
```
Reflects `page.{favorite,archived,icon,cover}` (synchronous — no async read). Mutations no-op M1 (live: `updatePage`,
invalidate `['pages',page.id]`). `page` is read → no unused-param.

### 2f. `apps/web/src/notes/page-metadata.tsx` (presentational split + CoverBanner)
```ts
export function MetadataControlsView(props: {
  favorite: boolean; archived: boolean; icon: string | null; cover: string | null
  onToggleFavorite: () => void; onToggleArchive: () => void; onChangeIcon: () => void; onChangeCover: () => void
}): JSX.Element
export function MetadataControls({ page }: { page: NoteEntityData }): JSX.Element  // usePageMetadata shell
export function CoverBanner({ cover }: { cover: string | null }): JSX.Element      // merged placeholder strip
```
`MetadataControlsView` = a `Row` of 4 controls (`role`-correct buttons): **favorite** (`Star`, `aria-pressed={favorite}`,
`aria-label="Favorite"`, active style when true) · **archive** (`Archive`, `aria-pressed={archived}`, `aria-label="Archive"`)
· **icon** (`Smile`/current, `aria-label="Change icon"`, shows set vs "Add icon") · **cover** (`Image`, `aria-label`
= `cover ? "Change cover" : "Add cover"`). `MetadataControls` wires `usePageMetadata`. `CoverBanner`: `cover === null` →
`null`; else a simple placeholder `View` (height ~96, `$colorSurfaceSecondary` bg, a muted "Cover" label) — NOT a media
fetch (D-S6-5/B1). EC-22 Lucide; direct semantic tokens; `note-chrome` atoms.

### 2g. `apps/web/src/notes/notion-header.tsx` (edit)
`NotionHeader` renders, top→down: `<CoverBanner cover={page.cover} />` · the icon badge · `<MetadataControls page={page} />`
· `<PropertyRows page={page} />`. (`PropertyRows` stays read-only — D-S6-8.)
**Redundancy fix (preflight B-pf1):** `PropertyRows` DROPS its favorite/archived rows (notion-header.tsx:36-37) — keeps
only Type + Updated (facts). Favorite/archived are now owned by `MetadataControls` as interactive toggles (reflect becomes
interactive; no duplicate state display; no EC-18f regression). Update `notion-header`/related tests asserting those rows.

### 2h. `apps/web/src/notes/note-overview.tsx` (edit — `noteOverview` both modes)
- Delete `AttachmentsSeam`.
- **merged**: the Attachments `<Section>` → `<AttachmentsPanel pageId={page.id} />`. (MetadataControls/CoverBanner ride in
  via `NotionHeader` — §2g.)
- **tabbed**: `attachments` block `state:'empty'→'success'` + `renderBlock` returns `<AttachmentsPanel pageId={page.id}/>`;
  the `properties` block `renderBlock` returns `<><PropertyRows page={page}/><MetadataControls page={page}/></>` (D-S6-8).
- The **journal** overview stub is untouched (metadata/attachments are the note surface; journal rides fe-journals).

## 3. Build steps (strict order; TDD per unit)
- [ ] **B1** — `use-note-entity.ts` (§2a: `icon`/`cover` + sample) + the `note-entity.test.tsx:11` cascade fix.
- [ ] **B2** — `attachments.ts` (§2b) + `attachments.test.ts` (`toAttachmentItems`; `formatBytes` B/KB/MB boundaries).
- [ ] **B3** — `use-attachments.ts` (§2c) + sample · `use-page-metadata.ts` (§2e).
- [ ] **B4** — `attachments-list.tsx` (§2d) + `attachments-list.test.tsx` (4 states; row name+size+icon; Add fires onAdd;
  Remove fires onRemove(id); a11y) · `page-metadata.tsx` (§2f) + `page-metadata.test.tsx` (4 controls; favorite/archive
  reflect+`aria-pressed`+toggle fires; cover set→banner / null→Add; EC-22 svg).
- [ ] **B5** — edit `notion-header.tsx` (§2g) + `note-overview.tsx` (§2h); extend `note-overview`/`notion-header` tests if they assert the seam copy.
- [ ] **B6** — `tsc` 0 · `eslint` 0 · **full `@vida/web` suite** green.
- [ ] **B7** — blocking **Visual Gate** (PLAN §7): Brave `/notes/1?sample` (favorited note); 3 presets × L/D × {merged,tabbed}
  × {375,768,1440}; EC-7 (4 controls, favorite active-reflects), EC-8 (≥2 attachment rows + Add), EC-22, AA full-matrix
  incl. warm-dark, axe 0, no overflow, MEASURED_OK + composite opacity.

## 4. Acceptance (DoD — §XXII)
- [ ] favorite/archive/icon/cover controls present in BOTH modes + reflect state (favorite active on the favorited sample) — EC-7.
- [ ] attachments list present (name + size + file icon) + Add + per-row Remove, filling the S2 seam both modes — EC-8.
- [ ] metadata mutations call stubbed `updatePage`; attachments `add`/`remove` stubbed; file→blob pipeline deferred (D-S6-5), no dead affordance.
- [ ] 4 attachment states (§VIII) + controls reflect synchronously; `MetadataControlsView`/`AttachmentsView` unit-tested as props.
- [ ] TS strict (0 any/non-null/suppression); `attachments.ts` pure; `[E]` degrade-never-crash (D-S6-4).
- [ ] tsc 0 · eslint 0 · full suite green · Visual Gate PASS.
- [ ] §XXIX currency: task slice-log + build-step + TASKS.md. **No F-finding** (fully fe-notes-owned).

## 5. Out of scope (no pull-forward — §XXVIII)
Live `updatePage`/attachment wiring (data plane) · the FileReader→`encryptedBlob` pipeline (M3 + composition root) · `[E]`
decryption · a rich icon picker / cover image library · thumbnail (binary) rendering · `listPages` favorite/archived filter (S1).
