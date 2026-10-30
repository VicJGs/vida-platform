# PLAN — S6 · Page metadata + attachments

> fe-notes-and-pages (② unit #27) · slice S6 · Linear LIF-191 · branch `fe-notes-and-pages` (Node 24).
> **Approval-1 artifact** (PLAN → ░g1░ → preflight → IMPL → ░g2░ → Approval-2 → blocking Visual Gate). Grounded in
> `delivery/{slice-map,seam-contract,envision,interpretation}.md` + the aspect `notes-and-pages.md` (NOT-29/30/31/47/38)
>
> - the finished ① (`docs/modules/notes/current-*`).

## 1. What S6 is (scope line)

Two notes-owned surfaces on the note page: (a) the **page-metadata controls** — favorite / archive / icon / cover,
reflecting state + mutating via `updatePage` (NOT-47/EC-7); (b) the **attachments list** — `getAttachments` list +
add/remove affordances (NOT-29/30/31/EC-8). **Fully fe-notes-owned** — no editor/ui-3 defer (contrast S3–S5); the only
defers are the universal ones (live composition root → data plane; `[E]` encryption → M3; the file→blob pipeline).

**In scope (S6 — apps/web):**

- `MetadataControls` (presentational + hook shell): favorite toggle · archive toggle · icon control · cover control —
  each **reflects page state** and triggers its `updatePage` patch (stubbed live swap). Rendered in **both modes** (lives
  with the shared `PropertyRows` surface → merged NotionHeader + tabbed Properties block). (EC-7)
- The **cover control** (add/change/remove, reflecting set/unset) lives in `MetadataControls` (**both modes** — EC-7).
  A merged-only `CoverBanner` shows a **simple placeholder strip** when `cover` is set (NOT a media component — cover is
  `[E]` text with no blob/image pipeline in M1, D-S6-5/B1); absent → nothing (the "Add cover" affordance is in the controls).
- `AttachmentsList` (`AttachmentsView` state-as-prop + `AttachmentsPanel` hook shell): `getAttachments` → a list of
  `{filename, mime, size}` (file-type Lucide icon; human-readable size) + an **Add** affordance + per-item **Remove**;
  fills the S2 `AttachmentsSeam` in **both** overviews' Attachments section (EC-8/EC-18f).
- `use-page-metadata(page)` + `use-attachments(pageId)` data seams (honest-stub + `?sample`; live = `updatePage` /
  `getAttachments`/`addAttachment`/`removeAttachment`).
- Extend `NoteEntityData` with **`icon: string | null`** + **`cover: string | null`** (map `pages.icon`/`cover_image`;
  the journalDate precedent) + the cascade fix (`note-entity.test.tsx` literal).

**Explicitly OUT (homed/deferred — no pull-forward, §XXVIII):**

- Live `updatePage`/attachment wiring (a live composition root) → data plane (S1-D2/F3) — stubbed.
- The **file→`encryptedBlob` pipeline** (FileReader → bytes → encrypt) → needs the libsodium engine (M3/DB-5) + a
  composition root; M1 the Add affordance is present but the real upload is stubbed (the honest posture). (D-S6-5)
- `[E]` decryption of `filename`/`cover_image`/thumbnail → M3 pass-through; sample provides plaintext (D-S6-4).
- `listPages` favorite/archived FILTERING (the collection filter) → that's S1's collection concern, not S6.
- A rich icon PICKER / cover image library → EC-7 is "controls present + reflect state" (greybox-provable); the control
  is a minimal reflect+change affordance, not a full picker (D-S6-6).
- Thumbnail image rendering (binary `thumbnail_blob`) → a file-type icon stands in (no real blob in M1).

## 2. Composition shape

```
note-overview.tsx (noteOverview — both modes, edited)
├─ NotionHeader (merged) / Properties block (tabbed) — the shared PropertyRows surface:
│    + <MetadataControls page={page} />                 apps/web/src/notes/page-metadata.tsx     [NET-NEW]
│         favorite · archive (toggles) · icon · cover (controls) — reflect state, stubbed updatePage
│    + <CoverBanner page={page} />  (merged NotionHeader top)                                    [in page-metadata.tsx]
└─ Attachments section/block — replaces <AttachmentsSeam/> with:
     <AttachmentsPanel pageId={page.id} />              apps/web/src/notes/attachments-list.tsx  [NET-NEW]
        ├─ use-attachments(pageId)                      apps/web/src/notes/use-attachments.ts    [NET-NEW]
        │     → { attachments: AttachmentItem[], state }  honest-empty + ?sample; live = getAttachments
        └─ AttachmentsView({ attachments, state, onAdd, onRemove })  (state-as-prop; the BacklinksView precedent)

use-page-metadata(page) → { favorite, archived, icon, cover, toggleFavorite, toggleArchive, setIcon, setCover }  [NET-NEW]
```

`MetadataControls`/`AttachmentsView` are body-only (the frame/section supplies labels). Reuses `note-chrome` atoms (EC-22).

## 3. Net-new units (files)

| File                                           | Purpose                                                                                                                        | Notes                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `apps/web/src/notes/attachments.ts`            | **pure** — `AttachmentItem` view-model + `toAttachmentItems(rows)` + `formatBytes`                                             | no React/@vida/core; structural `*Like` for `NoteAttachmentRow`                        |
| `apps/web/src/notes/use-attachments.ts`        | DATA seam — `{attachments, state}` + `add`/`remove`                                                                            | STUB + `?sample`; live = `getAttachments`/`addAttachment`/`removeAttachment`           |
| `apps/web/src/notes/attachments-list.tsx`      | `AttachmentsView` (state-as-prop) + `AttachmentsPanel` (hook shell)                                                            | file-type icon + name + size + Add/Remove                                              |
| `apps/web/src/notes/use-page-metadata.ts`      | metadata reflect + stubbed mutations                                                                                           | reflects `NoteEntityData`; live = `updatePage({is_favorite,...})`                      |
| `apps/web/src/notes/page-metadata.tsx`         | `MetadataControls` + `CoverBanner` (+ hook shell)                                                                              | favorite/archive toggles + icon/cover controls (EC-7)                                  |
| `apps/web/src/notes/use-note-entity.ts` (edit) | `NoteEntityData += icon, cover` + sample                                                                                       | cascade: `note-entity.test.tsx` literal                                                |
| `apps/web/src/notes/note-overview.tsx` (edit)  | wire `MetadataControls`/`CoverBanner` into NotionHeader+Properties; `AttachmentsPanel` replaces `AttachmentsSeam` (both modes) | remove `AttachmentsSeam`; attachments block `state:'empty'→'success'` (the S3 pattern) |
| `apps/web/src/notes/notion-header.tsx` (edit)  | render `<MetadataControls>` + `<CoverBanner>` in the merged head                                                               | keep `PropertyRows`                                                                    |
| `*.test.ts(x)`                                 | `attachments.test.ts` (pure) · `attachments-list.test.tsx` · `page-metadata.test.tsx`                                          | mirror S3–S5                                                                           |

Reuses shipped: `note-chrome` · Tamagui · Lucide (EC-22) · the ① seam. **No new `@vida/ui` primitive.**

## 4. Decisions — all DOC-RESOLVED

- **D-S6-1 — metadata controls reflect state + stubbed `updatePage`.** The patch whitelist is `{is_favorite, is_archived,
icon, cover_image}` [FACT: updatePageSchema]. `NoteEntityData` carries favorite/archived (S2) + **gains icon/cover**
  (D-S6-3). Controls read these; the mutations call `updatePage` live (stubbed M1; the journalDate/S5 precedent).
- **D-S6-2 — attachments via the three ① methods.** `getAttachments(pageId) → NoteAttachmentRow[]`; `addAttachment(pageId,
NewAttachment)`; `removeAttachment(id)` [FACT: seam-contract.md:38-40; NOT-29/30/31]. `AttachmentItem = {id, filename,
mime, sizeBytes}` (structural over the Row; the `PageLike` precedent — `@vida/core` doesn't re-export the Row).
- **D-S6-3 — extend `NoteEntityData` (icon, cover).** `pages.icon`/`cover_image` are real columns [FACT: schema/notes.ts];
  minimal, grounded (the journalDate precedent). Cascade: the `note-entity.test.tsx` literal gains `icon/cover`.
- **D-S6-4 — `[E]` fields are M1 pass-through.** `filename`/`cover_image`/thumbnail are `[E]` (NOT-38); M1 = pass-through
  (empty active set); sample provides plaintext; no decryption wired here (never crash on absent — degrade to a placeholder).
- **D-S6-5 — the file→blob upload pipeline is deferred.** `NewAttachment.encryptedBlob: Uint8Array` needs FileReader +
  the encryption engine (M3) + a composition root; M1 ships the **Add affordance** (present, EC-8) but the real upload is
  stubbed (no live store). Not a dead affordance — it's the honest stub, same as every live mutation this unit defers.
- **D-S6-6 — controls are minimal reflect+change, not full pickers.** EC-7 = "controls present + reflect state"
  (greybox-provable); icon = current-icon + a change affordance, cover = add/change/remove — not a full icon library /
  image browser (over-scope; M1.1+).
- **D-S6-8 — `MetadataControls` is a SIBLING of `PropertyRows` (N1), not inside it** (PropertyRows stays read-only).
  Rendered in both modes: NotionHeader (merged) + the tabbed Properties block's `renderBlock` (PropertyRows +
  MetadataControls). The cover BANNER (placeholder strip) is merged-NotionHeader-only; the cover CONTROL is in both.
- **D-S6-9 — toggle semantics (N2):** favorite/archive controls REFLECT the initial `NoteEntityData` state (active vs
  inactive); toggling calls the stubbed `updatePage` handler (no-op in M1, persists live — the S4 `pick`/`create`
  precedent), NOT optimistic-local state. The Visual Gate asserts the initial reflect (sample id 1 = favorited → active).
- **D-S6-7 — state ladders** (§VIII): attachments `loading|error|empty|populated`; metadata controls reflect synchronously
  (no async read — they read `NoteEntityData`), each mutation is fire-and-forget-stubbed (live: optimistic + invalidate
  `['pages',id]`). RQ keys: `['attachments',pageId]`, `['pages',id]` (prefix-safe).

## 5. Envision coverage — S6's EC Visual-Gate MUSTs

| EC              | Requirement                                                            | S6 assertion                                                                                                             |
| --------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **EC-7**        | favorite · archive · icon · cover controls present + **reflect state** | Visual Gate: all 4 controls render; favorite/archive reflect the sample's state (a favorited page shows the active star) |
| **EC-8**        | the page's **attachments list** is present                             | Visual Gate: the sample renders ≥2 attachment rows (name + size + file icon) + an Add affordance                         |
| **EC-22**       | Lucide icons token-tinted                                              | controls + attachment rows carry Lucide svg                                                                              |
| EC-16/17 (feel) | editorial calm                                                         | live per-slice Visual Gate (full-matrix AA)                                                                              |

## 6. Test plan

- `attachments.test.ts` (pure): `toAttachmentItems` maps rows (id/filename/mime/size); `formatBytes` (B/KB/MB rounding).
- `attachments-list.test.tsx`: `empty`/`loading`/`error`/`populated`; rows show name+size+icon; Add fires `onAdd`;
  per-row Remove fires `onRemove(id)`; a11y (list/listitem); EC-22 svg.
- `page-metadata.test.tsx`: 4 controls render; favorite/archive **reflect state** (active vs inactive) + toggling fires
  the handler; icon/cover controls present; cover shows value when set, "Add cover" when null; EC-22 svg.
- Full `@vida/web` suite green.

## 7. Blocking Visual Gate (real browser, after g2)

Brave `/notes/1?sample` (a favorited note — `favorite: id==='1'`). 3 presets × light/dark × {merged,tabbed} × 375/768/1440:

- EC-7: the 4 controls render in both modes; the favorite control shows its ACTIVE state (sample id 1 is favorited);
  archive/icon/cover present.
- EC-8: ≥2 attachment rows (name + size + file icon) + Add affordance, in both modes.
- EC-22: Lucide svg; full-matrix **AA** on control/row text incl. warm-dark; `axe` 0; 0 overflow; MEASURED_OK + composite opacity;
  exclude WCAG-disabled controls.

## 8. Risks / findings

- **NO F-S6 finding** — S6 is fully fe-notes-owned (the first self-contained slice this session). The deferred pieces
  (live store, `[E]`, file-upload) are the universal data-plane/M3 defers, not a cross-unit boundary.
- **R1 — two features, one slice.** The slice-map homes metadata + attachments to S6 together; keep each scoped to its EC
  (controls-present-reflecting / list-present), not a full Notion cover-library or a live upload. Flag if either balloons.
- **R2 — control placement in BOTH modes.** `MetadataControls` must render in merged (NotionHeader) AND tabbed (Properties
  block); verify via the shared surface, not a merged-only mount (the Visual Gate checks both modes).

## 9. Performance budget (§XXII)

`toAttachmentItems`/`formatBytes` are O(n) over a small list; controls are synchronous reflects. N/A-trivial for the stub; stated per §XXII.
