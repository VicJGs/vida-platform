# IMPLEMENTATION-PLAN — notes-rescope R3 · Metadata + rename

> §XXVI **gate 2** (rev 1, 2026-10-27) for the approved `PLAN-R3-metadata-rename.md` (rev 3, Approval 1: Victor
> 2026-10-27). `/preflight` **PASSED**. Each step: tests first → red → implement → green. A divergence = §XXVIII (STOP).
> Every behaviour is the PLAN's; this file only fixes HOW. Worktree @ `db54b9b`, Node 24, suites run alone; `@vida/core` and
> `@vida/ui` are consumed as dist by apps/web (rebuild after their steps).

## 0. Gate-2 refinements (to be critiqued here)

- **R-1 · The rename hint** reuses `@vida/ui`'s existing `SR_ONLY` style (`internal/calendar-shared.ts:10`), not a new
  helper.
- **R-2 · The curated icon list is checked against lucide's own names.** A test asserts every key of `PAGE_ICONS` is a key of
  `lucide-react/dynamicIconImports` (the 2,025-name map; used in the test only, never imported by the app).
- **R-3 · The e2e cover** is served by Playwright's `page.route` on a dev-origin URL (`/__e2e/cover.png`), fulfilled from a
  PNG in `apps/web/e2e/fixtures/`; the route stays registered across the reload (else Vite's SPA fallback returns HTML) — nothing ships in `dist` (a `public/` file would reach the prod and Tauri builds).
- **R-4 · `Input` gains a `display` size** (`@vida/ui` `input.tsx`) on **both** `InputFrame` and `NativeInput` —
  `NativeInput` hard-codes `fontFamily: '$body'` (`input.tsx:47`), so the variant sets `fontFamily`, `fontSize` and `lineHeight`
  to `$display`; the frame gets height auto with the existing padding/border tokens — so
  PLAN G11's "an `Input` in place … the `$display` type" holds. Selection on open is an effect (`el.select()` via a ref) —
  `Input` has no `selectOnFocus` prop (`input.tsx:114-140`). Test + an `input.md` spec note.
- **R-5 · The region name is exactly the title, always.** The region's `aria-labelledby` points at a dedicated
  `<span id={titleTextId}>` that always holds `title` (the visible text when not editing; an `SR_ONLY` copy beside the input
  when editing). The rename hint ("Rename the page") is a **sibling outside** the heading, reached by `aria-describedby`, so it
  never enters the name; an untitled page's empty input can't blank it either.
- **R-6 · One end for an edit.** Enter, Esc and blur all go through `finish(kind)` guarded by an `endedRef` set **before** the
  state change, so exactly one of them acts (Enter → 1 commit; Esc → 0; a blur after either → nothing). After Enter **and**
  Esc an effect moves focus to the title button (BR-R3-7). Enter is ignored while `e.nativeEvent.isComposing`.
- **R-7 · The thumbnail read is projected.** `getAttachmentThumbnail` = `db.select({ thumb: noteAttachments.thumbnail_blob })
  .from(noteAttachments).where(and(eq(noteAttachments.id, id), isNull(noteAttachments.deleted_at)))` — never
  `attachRepo.findById`, which selects every column incl. `encrypted_blob` (`repository.ts:356-363`) and would copy the whole
  file across the worker `postMessage`.
- **R-8 · In-view loading.** Only gallery **tiles** observe visibility (`IntersectionObserver`, feature-detected — absent, as
  in jsdom, means "in view"); the 96 px header strip loads at once. Object URLs are made in a component effect keyed on the
  bytes and revoked in its cleanup (the query cache is shared across tiles). A failed **tile** cover is decorative
  (`aria-hidden`); only the header placeholder is `role="img"` "Cover unavailable".
- **R-9 · Recovery = leaving `error` for any settled state.** `useFocusOnRecovery` fires when the previous state was `error`
  and the new one is neither `error` nor `loading` (the collection can recover to `empty`).
- **R-10 · Toggles ignore presses while a metadata write is pending** (a HOW-level guard, not a behaviour change: the re-read
  hasn't landed, so a quick double toggle would write the same value twice). Mechanism: `aria-disabled="true"`, **still
  focusable**, presses ignored — never `tabIndex={-1}` or native `disabled`, which would drop focus from the control just
  pressed (BR-R3-7). `isPending` is shared across actions, so a saving rename also blocks the toggles briefly — accepted.
  Test: focus stays on Favorite after the toggle.

## 1. Build steps

### Step 1 — core (test A)
- `validators/note.ts`: `export const pageIconSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'icon must be a Lucide
  icon name').max(64)` and `export const pageCoverSchema = z.union([z.string().max(2048).regex(/^https?:\/\/\S+$/i),
  z.string().regex(/^attachment:[0-9a-zA-Z-]+$/)])`. Used as `.nullish()` in **both** `createPageSchema` (`icon`,
  `cover_image`) and `updatePageSchema`.
- `services/notes/service.ts` + `types.ts`: `getAttachmentThumbnail(id): Promise<Uint8Array | null>` — the projected select
  of R-7 (`null` when absent or deleted). Test: the query selects only `thumbnail_blob` (spy the Drizzle select / assert the
  SQL has no `encrypted_blob`).
- Tests (`notes-service.test.ts` or the validators test, by the existing pattern): the PLAN §4 A table through `createPage`
  and `updatePage`; `getAttachmentThumbnail` returns the bytes / `null` (no thumbnail) / `null` (deleted).
- `pnpm --filter @vida/core build`.

### Step 2 — `@vida/ui` EntityView heading + title seam; CollectionView `titleRef` (test B)
- `entity-view.tsx`: new props `onTitleCommit?`, `titleEditValue?`, `titleRef?`. The title block becomes:
  ```tsx
  // region: aria-labelledby={titleTextId} — the span below ALWAYS holds `title` (R-5)
  <View role="heading" aria-level={1} tabIndex={-1} ref={titleRef}>           {/* persistent H1, focus target */}
    {onTitleCommit == null ? (
      <TitleText id={titleTextId}>{title}</TitleText>
    ) : editing ? (
      <>
        <span id={titleTextId} style={SR_ONLY}>{title}</span>
        <Input ref={inputRef} size="display" aria-label="Page title" defaultValue={titleEditValue ?? title}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) finish('enter', e)
                              else if (e.key === 'Escape') finish('escape', e) }}
          onBlur={(e) => finish('blur', e)} />
      </>
    ) : (
      <TitleButton ref={buttonRef} role="button" tabIndex={0} aria-describedby={hintId} onPress={startEdit}>
        <span id={titleTextId}>{title}</span>
      </TitleButton>
    )}
  </View>
  {onTitleCommit != null && <span id={hintId} style={SR_ONLY}>Rename the page</span>}   {/* SIBLING, outside */}

  // finish(kind): if (endedRef.current) return; endedRef.current = true; lastEnd.current = kind
  //   enter|blur → commit when changed (trimmed) · escape → no commit; then setEditing(false)
  // effect on editing: open → endedRef=false, inputRef.select(); close → if lastEnd ∈ {enter, escape} focus buttonRef
  //   (never on first mount, never after a blur)
  ```
  - `TitleButton` = a `role="button"` `tabIndex={0}` Text in the same `$display` type (Enter/Space start editing).
  - Commit = `const next = value.trim(); if (next !== (titleEditValue ?? title).trim()) onTitleCommit(next)` — an empty
    `next` passes through (the app maps it to `null`, PLAN G12).
  - `aria-level` / `role` on a Tamagui `View` → verify they render (the region/role precedent in this file); the line-height
    pairing stays on the text.
- `collection-view.tsx`: `titleRef?: Ref<HTMLElement>` on the title `Text` (`tabIndex={-1}`).
- `input.tsx`: the `display` size (R-4) + its test.
- Tests: PLAN §4 B in `entity-view.test.tsx` / `collection-view.test.tsx`, plus: the region name `=== title` exactly
  (before, during, after; an untitled page too); `act(() => { keyDown(Enter); fireEvent.blur(input) })` → exactly 1 commit;
  the same with Escape → 0 commits; focus on the title button after Enter and after Esc.
- Docs: `docs/specs/components/ui-2-platform-views/entity-view.md` (the heading, the seam, BR) + the collection-view spec's
  `titleRef`. `pnpm --filter @vida/ui build`.

### Step 3 — icons, covers, labelled controls (test C4)
- R-2 guard also asserts `String(map[k])` contains `/icons/<k>.mjs` (rejects lucide's deprecated alias names).
- `notes/page-icons.ts`: `PAGE_ICONS: Record<string, { icon: LucideIcon; label: string }>` (about 48 named imports, e.g.
  `sticky-note`, `book-open`, `lightbulb`, `graduation-cap`, `target`, `flag`, `rocket`, `folder-kanban`, `briefcase`,
  `calendar`, `clock`, `sun`, `moon`, `heart`, `heart-pulse`, `dumbbell`, `utensils`, `coffee`, `house`, `map-pin`, `plane`,
  `globe`, `users`, `user`, `message-circle`, `mail`, `wallet`, `piggy-bank`, `chart-line`, `star`, `sparkles`, `music`,
  `camera`, `palette`, `leaf`, `brain`, `languages`, `pen-line`, `list-checks`, `bookmark`, `shield`, `gem`, …) +
  `pageIconFor({icon, type})` → the mapped component, else `typeIcon(type)`. R-2 guard test.
- `live-mappers.ts`: `NotesRow` gains `icon: string | null`, `cover: string | null`; `toNotesRow` maps them.
- `note-renderers.tsx`: rows/tiles use `pageIconFor`; the tile's 72 px media area shows `<CoverImage>` when `cover` is set.
- `notes/cover-image.tsx` (new): `CoverImage({ pageId, cover, height })` — a URL → `<img alt="" referrerPolicy="no-referrer"
  loading="lazy" style={{objectFit:'cover'}} onError→placeholder>`; `attachment:<id>` → `useAttachmentThumbnail(id)` (a
  React Query read over `notes.getAttachmentThumbnail`; in tiles enabled only once in view, R-8) → an object URL per R-8;
  nothing / failure → the placeholder (header: `role="img"` "Cover unavailable"; tile: decorative). Used by the header strip
  and the tiles.
- `page-metadata.tsx`: `CoverBanner` → `<CoverImage height={96}>`; `Ctrl` renders icon + visible label (accessible name =
  the label; no `aria-label`), in the greybox order Change icon · Change cover · Favorite · Archive.
- `note-overview.tsx`: the cover strip at the top of the **tabbed** Overview too (above the Properties block), not only in
  `NotionHeader`. `notion-header.tsx`: the badge uses `pageIconFor`.

### Step 4 — live metadata (test C1)
- `use-page-metadata.ts` → `usePageMetadata(page)`: one `useMutation` (`mutationFn: patch => notes.updatePage(page.id,
  patch)`), `onSuccess` invalidates the G2 key set (`metadataKeys(page)`; rename adds `renameKeys`), `onError` →
  `notifyError(action, e)` with the action carried in the mutation variables. Exposes `toggleFavorite`, `toggleArchive`,
  `setIcon`, `setCover`, `rename(next)` (`next === '' → null`), and `isPending` (controls `aria-disabled` while pending, still focusable — R-10).

### Step 5 — the pickers (test C2, C3)
- `notes/icon-picker.tsx` (lazy, `React.lazy`): `Dialog` "Choose an icon" + a `radiogroup` grid (roving tabindex; arrows move
  focus + `aria-checked` without saving; Enter/Space/click → `setIcon(name)` and close; "Remove icon" when set).
- `notes/cover-picker.tsx` (lazy): `Dialog` "Page cover": the link `Input` (+ inline error from `pageCoverSchema` shape,
  checked client-side) + "Use link"; the image attachments from `useAttachments(pageId)` filtered to `image/*`, each with
  `CoverImage` of `attachment:<id>` + "Use as cover"; the honest-empty line; "Remove cover" when set.
- `MetadataControls` opens them; the `<Suspense fallback={null}>` wraps **only** the lazy dialog (never the controls), so the
  trigger stays mounted and the Dialog's own focus return (`dialog.tsx:184,200`) lands on it.

### Step 6 — rename (test C5)
- `NoteEntity` owns `titleRef` (it also drives the Retry focus, Step 7) and passes it to `NoteEntityView`;
  `NoteEntityView`: `toEntityProps({ …, onTitleCommit: m.rename, titleEditValue: page.title, titleRef })` — `EntitySource`
  and `toEntityProps` carry the three new props through (the Tamagui ref typed as `Ref<HTMLElement>`). `NoteEntityView`
  owns the Rename dialog's open state and replaces `NO_ACTIONS` with the Rename item.
- `notes/rename-dialog.tsx`: `Dialog` "Rename page" — `Input` seeded with the raw title (selected) + Save/Cancel; Save →
  `m.rename(value)`.
- `PageActions`: `items` = `[{ id: 'rename', label: 'Rename', onSelect: openRename }]`; the trigger gets `id={useId()}`; the
  `Menu` gets `aria-labelledby={triggerId}` (no `aria-label`).

### Step 7 — focus after Retry (test C6)
- `notes/use-focus-on-recovery.ts`: `useFocusOnRecovery(state, ref)` — per R-9 (error → any settled state, incl. `empty`).
  Tests include error → empty for the collection. Used by `NoteEntity` (the EntityView `titleRef`), `NotesSurface` (the
  CollectionView `titleRef`) and `JournalPageRegion` (the `PageFrame`, `tabIndex={-1}`).

### Step 8 — docs, live leg, Visual Gate, gates
- Docs: notes current-* (BR-R3-*; BR-SUR-1 untouched; current-spec metadata + rename + the core read); `contract.md:70-72`
  UNKNOWN closed (icon = Lucide name, cover = URL | `attachment:<id>`); slice-map R4: the two obligations; `entity/CLAUDE.md`
  (`onTitleCommit`/`titleEditValue`/`titleRef` passthrough).
- `apps/web/e2e/notes-metadata-rename.spec.ts` (PLAN §4 D) with the routed cover (R-3).
- Visual Gate (PLAN §4 E) via `.playwright-mcp/r3-live/r3-visual.mjs` (the R1/R2 harness); bundle delta per PLAN §4 E.
- `pnpm typecheck` · `pnpm lint` · core + ui + web suites (alone) · `/component-audit` (icon picker, cover picker, title
  seam) · `/critique`.

## 2. Files
New: core — none (edits) · ui — none (edits) · web `notes/{page-icons.ts, cover-image.tsx, icon-picker.tsx, cover-picker.tsx,
rename-dialog.tsx, use-focus-on-recovery.ts}` + tests · `e2e/fixtures/cover.png` · `e2e/notes-metadata-rename.spec.ts`.
Changed: core `validators/note.ts`, `services/notes/{service,types}.ts` · ui `components/{entity-view,collection-view,input}.tsx`
(+tests) · web `entity/adapter.ts`, `notes/{use-page-metadata.ts, page-metadata.tsx, notion-header.tsx, note-overview.tsx,
note-renderers.tsx, live-mappers.ts, use-notes-rows.ts, page-actions.tsx, note-entity.tsx, notes-surface.tsx}`,
`home/journal-page-region.tsx` · docs per Step 8.

## 3. Risks
- **`@vida/ui` contract changes** (EntityView heading; Input `display` size): every EntityView consumer gets a heading role — today only the
  notes page renders EntityView live; stories updated.
- **Remote covers** depend on the remote host; failure is handled (placeholder).
- **Load:** run suites alone; full-page tests may need the 20 s timeout precedent.

## 4. Change log
- rev 1 (2026-10-27) — drafted after preflight PASSED.
- rev 2 (2026-10-27) — gate-2 critique r1 **REVISE** (6 blocking, verified): the region name would include the hint and blank
  while editing → R-5; blur double/undo-commit + focus loss → R-6; `Input` can't take `$display` / no `selectOnFocus` → R-4 (a
  `display` size, keeping PLAN G11's "Input"); the thumbnail read loaded the full blob → R-7 projected select; jsdom has no
  `IntersectionObserver` → R-8; recovery to `empty` → R-9. Folded: the routed e2e cover (R-3), the alias guard, toggles
  disabled while pending (R-10), Suspense placement, object-URL lifecycle, decorative tile placeholder, the ref/dialog wiring.
- rev 3 (2026-10-27) — critique r2 **REVISE** (2): the Step 2 sketch still showed rev-1 code → rewritten to R-4/R-5/R-6; R-10
  could drop focus → `aria-disabled`, still focusable, + a focus test. Folded: the Input variant on both parts, the focus
  effect keyed on `finish`'s kind, the e2e route kept across reload, the Input contract risk.
- rev 3 → critique r3 **SHIP** (Step 4 wording: aria-disabled, R-10).
- **APPROVED by Victor (Approval 2) on 2026-10-27.**

## 5. Deviations (§XXVIII)

### DEV-R3-1 · `Input`'s font styles never apply (found building Step 2, 2026-10-27) — APPROVED by Victor: option (A) root fix
- **Found:** writing R-4's test. `Input`'s native element is `styled(View, { render: 'input', fontFamily: '$body', variants:
  { size: { sm|md|lg: { fontSize } } } })` (`input.tsx` NativeInput). A Tamagui **`View` drops font props**: the rendered
  `<input>` carries no font class and no inline style for any size (probe: `md` → no `_ff-`/`_fs-`/`_lh-`; a `$display` Text →
  `font_display _ff-… _fs-… _lh-…`), and `input-styles.ts` sets no font. So every `Input` in the app renders in the
  **browser's default input font**, and R-4's `display` size (family/size/leading) cannot take effect either.
- **Pre-existing:** not caused by R3; R3's approved R-4 depends on it.
- **Classified STRUCTURAL:** a shared primitive used by every input surface.
- **Options:** (A) **root fix** — NativeInput becomes `styled(Text, { render: 'input', … })` so its font props apply for every
  size (all `Input` consumers change from the browser default to their intended token font — a visible change, checked at
  a Visual Gate over the input surfaces); (B) **scoped** — only the `display` size gets its font via an injected CSS rule
  (`.vida-input-display`), the other sizes stay as they render today (the defect remains, recorded for `@vida/ui`).
