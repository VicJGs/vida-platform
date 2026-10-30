# Fix — editor blocks: Quote + Task-list (ui-3 / @vida/editor)

> Type: **bug/fix** (ui-3 `@vida/editor`) · Owning unit: UI-3 VidaEditor (E2 standard blocks) · Surfaced by:
> fe-notes-and-pages #27 EC-24 (consumed at S2/S9). **Lands as a SEPARATE `@vida/editor` commit/PR — NOT bundled into
> fe-notes' apps/web PR** (the fe-notes delivery parking-lot mandate; two review surfaces kept distinct).

## 1. Findings

Two shipped E2 standard blocks rendered incorrectly on the writing-grade note-page surface (18px / 1.7 line-height,
`chrome='bare'`), caught by the fe-notes EC-24 consume-verify:

- **F1 — Quote (`blockquote`) was UNSTYLED.** StarterKit registers the `blockquote` node but ships no CSS, so `/quote`
  rendered as a bare browser indent — visually "nothing happened" (no voice, no rule). `editor-styles.ts` had rules for
  taskList/table/callout/image/code/divider but **none for `blockquote`**.
- **F2 — Task-list checkbox misaligned.** The checkbox floated above the first text line (the `<label>` had no
  line-height box), conspicuous at the 18px/1.7 host size; the item paragraph also kept its block margin, loosening the
  list rhythm.

## 2. Root cause

`packages/editor/src/internal/editor-styles.ts` — the injected `.ProseMirror` stylesheet (the mechanism for what a
styled frame can't reach on the contenteditable). F1 = a missing rule; F2 = `align-items:flex-start` on the row with no
line-height-matched label + an un-zeroed item-paragraph margin.

## 3. Fix (in `editor-styles.ts` — tokened, no raw hex, no motion)

- **F1 — blockquote:** a tokened left bar + muted italic voice, matching the callout/table token discipline:
  `.vida-editor-frame .ProseMirror blockquote{border-left:3px solid var(--colorBorderDefault);padding-left:0.75em;
margin:0.5em 0;color:var(--colorTextMuted);font-style:italic}` + `blockquote>*{margin-top:0}`.
- **F2 — task-list:** `align-items:flex-start` on the row + a line-height-matched `<label>` (`display:inline-flex;
align-items:center;min-height:1.7em`) centers the checkbox to the first text line; the item paragraph loses its margin
  (`li>div>p{margin:0}`) so rows sit as a tight list; the checkbox is sized `width:1em;height:1em`.

## 4. Acceptance (consume-verified at fe-notes S9, EC-24)

- A blockquote renders with a tokened left bar + muted italic (not a bare indent), both light/dark, all 3 presets.
- A task-list renders with the checkbox vertically aligned to the first text line; rows are a tight list.
- A table renders with tokened collapsed borders + header fill (unchanged — regression check).
- Tokened (no raw hex — BR-E2-7), no motion added. `@vida/editor` suite green (**226** tests).

## 5. Verification

- `@vida/editor` typecheck + test: **226/226** green (the change is CSS-string-only; no schema/behavior change).
- fe-notes S9 blocking Visual Gate (Brave, real app, `/notes/1?sample`): the `?sample` doc seeds blockquote + task-list
  - table; all render correctly across 3 presets × light/dark. (The apps/web consume-verify; the primary ui-3 render
    gate is the `@vida/editor` storybook.)

## 6. Scope / boundary

`@vida/editor` presentational CSS only (no `@vida/core`, no new dep, no schema change). The fe-notes apps/web unit merely
CONSUMES these blocks (NOT-52 — the editor is not re-authored in fe-notes).
