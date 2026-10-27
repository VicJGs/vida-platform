# Spec: feature:ui-3-vida-editor · E2 — standard blocks

Status: implemented <!-- draft → approved → implemented -->
Parent: docs/specs/features/ui-3-vida-editor/\_index.md (umbrella; BR-1..BR-7)
Depends-on: e1-editor-core.md (implemented — the `<VidaEditor>` spine + extensions array this unit extends)
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-08-11-ui-3-vida-editor (E2 sub-spec authored at PLAN; /read-docs-first done against Tiptap v3 — installed StarterKit@3.30.0 deps + tiptap-docs table/image/list).

## 1. Identity

**E2 — standard blocks.** Complete the `STANDARD_BLOCK_TYPE` set in `@vida/editor` by adding the block nodes E1's
StarterKit does NOT provide, wired into `<VidaEditor>`'s extensions array and styled via the E1 injected-CSS
mechanism. The public `<VidaEditor>` API (BR-E1-1 uncontrolled + imperative handle) is UNCHANGED — E2 extends the
internal schema only. `[FACT: umbrella §5 E2; editor.tsx:108 extensions array]`

**The authoritative set is the enum, not the umbrella prose (BR-7).** `STANDARD_BLOCK_TYPE`
`[FACT: packages/types/src/editor.ts:12-24]` has **11** members. E1's `[StarterKit, Placeholder]` already provides
**7** of them; E2 adds the **4** that are missing:

| `STANDARD_BLOCK_TYPE` value                                           | Provided by                      | E2 action                                                   |
| --------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------- |
| `paragraph` · `heading` · `bulletList` · `orderedList` · `blockquote` | StarterKit (E1)                  | none                                                        |
| `codeBlock`                                                           | StarterKit `CodeBlock` (E1)      | none (style only — §4 BR-E2-8)                              |
| `horizontalRule` (= "divider")                                        | StarterKit `HorizontalRule` (E1) | none (style only)                                           |
| **`taskList`**                                                        | — (not in StarterKit)            | **ADD** `TaskList`+`TaskItem` from `@tiptap/extension-list` |
| **`image`**                                                           | —                                | **ADD** `@tiptap/extension-image`                           |
| **`table`**                                                           | —                                | **ADD** `@tiptap/extension-table` (+ row/cell/header)       |
| **`callout`**                                                         | — (no official extension)        | **BUILD** a bespoke custom `Node`                           |

**In E2:** the 4 missing block nodes + their token-driven CSS + a schema-parity guard proving every
`STANDARD_BLOCK_TYPE` value is a registered node.
**NOT in E2:** toolbar/insertion UI for these blocks (E3 toolbar · E4 slash menu) · the 11 integration blocks (E5) ·
serialization of these blocks to MD/PDF/DOCX (E6–E8) · the **image attachment pipeline** (encrypted-blob upload/
resolution — deferred, BR-E2-5) · any `yjs`/`y-prosemirror` (BR-2).

> ⚠ **Umbrella doc-defect flagged (to reconcile, same class as the umbrella's own 12-vs-11 self-flag).** Umbrella §5
> row E2 reads "table, callout, divider, image, code-block". Two of those (**divider=`horizontalRule`, `code-block`**)
> are already shipped by StarterKit in E1, and the row **omits `taskList`**, which IS in `STANDARD_BLOCK_TYPE` and is
> NOT in StarterKit. This spec implements the **enum** (BR-7) → the real E2 set is **{taskList, image, table,
> callout}**. Umbrella §5 row E2 to be corrected. `[FACT: STANDARD_BLOCK_TYPE vs starter-kit@3.30.0 package.json deps]`

## 2. Verified library facts (`/read-docs-first`, Tiptap v3 — 2026-08-11)

Verified against the **installed** `@tiptap/starter-kit@3.30.0` package manifest + `@tiptap/extension-list@3.30.0`
exports + the tiptap-docs table/image pages (context7).

- **StarterKit@3.30.0 bundles** (so E1 already registers these node names): `paragraph`, `heading`, `bulletList`,
  `orderedList`, `listItem`, `blockquote`, `codeBlock`, `code`, `horizontalRule`, `hardBreak`, `bold`, `italic`,
  `strike`, `underline`, `link`, `dropcursor`, `gapcursor`, `listKeymap`, `document`, `text`.
  `[FACT: node_modules/.pnpm/@tiptap+starter-kit@3.30.0/.../package.json dependencies]`
- **`taskList` needs NO new download.** `@tiptap/extension-list@3.30.0` (already in the tree — transitive dep of
  StarterKit) exports `TaskList` **and** `TaskItem` (v3 consolidated the list extensions).
  `[FACT: grep node_modules/.pnpm/@tiptap+extension-list@3.30.0/.../dist → exports TaskList, TaskItem]`. StarterKit does
  NOT enable them by default → E2 adds them explicitly + **promotes `@tiptap/extension-list` to a direct dep** (it is
  imported directly now, so declaring it is honest — no phantom dependency on a transitive). `[INTERP]`
- **`image` = `@tiptap/extension-image`** — NOT installed → new dep. Renders a plain `<img src alt>`; options
  `inline` (default false → block image) and `allowBase64`. `[FACT: tiptap-docs extension-image; not in pnpm store]`
- **`table` = ONE dep via `TableKit`.** `@tiptap/extension-table@3.30` exports a **`TableKit`** bundle —
  `import { TableKit } from '@tiptap/extension-table'` — that registers `Table`+`TableRow`+`TableCell`+`TableHeader`
  at once (the StarterKit-style bundle), configurable via `TableKit.configure({ table: { resizable: false } })`.
  NOT installed → **one** new dep. `[FACT: tiptap-docs editor/extensions/functionality/table-kit + nodes/table-header
— resolved at preflight 2026-08-11 via context7]`. (The 4-separate-package path is the confirmed fallback if a
  bundle-config edge appears, but TableKit is the chosen path.)
- **`callout` has no official Tiptap extension** → a bespoke `Node.create` (§4 BR-E2-6). `[FACT: no @tiptap/extension-callout]`
- **No duplicate node names.** ProseMirror throws if two extensions register the same node `name`. E2 must NOT re-add
  `codeBlock`/`horizontalRule` (StarterKit owns them) — it only styles them. `[FACT: ProseMirror schema duplicate-node error]`

## 3. Contract — extensions, not props

E2 changes **no** `<VidaEditor>` prop or handle — the E1 contract (`VidaEditorProps`/`VidaEditorHandle`, BR-E1-1) is
frozen. The unit's contract is the **schema composition** + the one bespoke node's shape:

```ts
// extensions/standard-blocks.ts — the assembled set E2 adds to useEditor({ extensions: [...] })
export const STANDARD_BLOCK_EXTENSIONS: readonly Extension[] // [TaskList, TaskItem, Image, TableKit, Callout] (TableKit bundles Table+Row+Cell+Header)

// extensions/callout.ts — the bespoke block node
export const CALLOUT_VARIANT = ['info', 'success', 'danger'] as const // EXACTLY the ToastIntent set → binds to $accentInfo/$accentSuccess/$accentDanger
export type CalloutVariant = (typeof CALLOUT_VARIANT)[number]
export const Callout: Node // name:'callout', group:'block', content:'block+', attrs:{ variant: CalloutVariant='info' }
```

- `Callout` renders `renderHTML → <div data-type="callout" class="vida-callout" data-variant>` with a `0` content
  hole; parses the same. Styled by injected CSS (BR-E2-7), **not** a React node-view — the E1 `editor-styles.ts`
  precedent (leaner; no `ReactNodeViewRenderer` overhead). `[INTERP: editor-styles.ts]`
- `Image.configure({ inline: false, allowBase64: true })` — block image; `allowBase64` is the **interim** carrier
  until the attachment pipeline lands (BR-E2-5). `TableKit.configure({ table: { resizable: false } })` — resizing is
  an E3 toolbar interaction, out of E2. `[INTERP]`
- Types: `CalloutVariant` is a local implementation type (the callout node is a Vida-specific block, not a
  cross-package contract) — it does NOT belong in `@vida/types` (BR-7 governs the shared `STANDARD_BLOCK_TYPE`
  vocabulary, which already contains `'callout'`; the _variant_ enum is E2-internal). `[INTERP: BR-7 scope]`

## 4. Business Rules (E2-specific)

- **BR-E2-1 · Implement the enum, not the prose.** E2's block set is derived from `STANDARD_BLOCK_TYPE`
  `[FACT: editor.ts:12-24]` minus what E1's StarterKit already registers → **{taskList, image, table, callout}**. A
  schema-parity test (BR-E2-9) is the gate. `[FACT: §1 table]`
- **BR-E2-2 · No double-registration.** `codeBlock` + `horizontalRule` stay owned by StarterKit; E2 never re-adds
  them (would throw). `[FACT: §2 duplicate-node]`
- **BR-E2-3 · taskList from the already-present `@tiptap/extension-list`.** Add `TaskList` + `TaskItem`
  (`TaskItem.configure({ nested: true })`); promote `@tiptap/extension-list` to a direct dep. No new download.
  `[FACT: §2]`. `TaskList`/`TaskItem` inherit list keyboard behavior (Enter/Tab/Backspace) from StarterKit's
  already-bundled `listKeymap` (E1) — no separate add; **do not disable `listKeymap`** in the StarterKit config or
  task-list keyboarding silently breaks. `[FACT: starter-kit@3.30.0 bundles @tiptap/extension-list-keymap]`
- **BR-E2-4 · Presentational, persists nothing (inherits BR-1/BR-E1-2).** The new nodes emit into `EditorDocument`
  JSON via the existing `onChange`; E2 touches NO SQLite/`@vida/core`. Boundary grep stays clean. `[FACT: umbrella BR-1]`
- **BR-E2-5 · image is a presentational node; the attachment pipeline is a DEFERRED SEAM.** In Vida's ZK model,
  images are `note_attachments` (encrypted blobs, `MAX_ATTACHMENT_BYTES`) `[FACT: CLAUDE.md Notes domain; @vida/types
common.ts]`. E2 ships the `image` NODE (an `<img src alt>`); the encrypted-blob → decrypted object-URL resolution +
  upload UI is the **app's** concern, deferred to a later phase — exactly like the Yjs seam (BR-2). At M1.0 `src`
  carries an external URL or a base64 data-URI (`allowBase64:true`); the attachment-backed resolver replaces that
  later. E2 builds **no** upload/encryption path. `[INTERP: BR-1 + ADR-002 note_attachments]`
  - ⚠ **`allowBase64` is a known-bad interim carrier, not a benign one.** `pages.content` (the `EditorDocument` JSON)
    becomes one encrypted sync blob per page (ADR-003), so a base64 data-URI inlines the whole image into that blob —
    a 25 MiB image (`MAX_ATTACHMENT_BYTES` `[FACT: packages/core/src/…/encryption.ts:124]`) ≈ 33 MB of base64 inside a
    single page's JSON. Acceptable ONLY as a dev/interim carrier; the `note_attachments` pipeline (out-of-band
    encrypted blob + object-URL resolver) MUST retire it before image is exposed in the app UI. E2 ships the node, not
    a user-facing insert button (that is E3/E4). `[INTERP: ADR-003 per-page sync blob]`
- **BR-E2-6 · callout is a bespoke custom Node with a `variant` attribute.** `Node.create({ name:'callout',
group:'block', content:'block+', defining:true })` + `variant ∈ {info,success,danger}` (default `info`) —
  **EXACTLY** the `ToastIntent` set `[FACT: packages/ui/src/internal/toast-store.ts:10 = 'info'|'success'|'danger']`,
  so each variant binds to an existing accent token (`$accentInfo`/`$accentSuccess`/`$accentDanger`
  `[FACT: packages/ui/src/components/toast.tsx:56-58]`). **No 4th `warn` variant** — there is no `signal.warning`
  token at any layer (verified: absent from `themes/tokens/semantic.json` + `themes/variables.css`), and BR-E2-7 forbids
  raw hex; a warn variant would require a DS-2 token-layer edit that is out of E2 scope. Renders/parses
  `<div data-type="callout" data-variant>`; the `variant` attr round-trips through `getJSON()` so it survives into
  `EditorDocument` (and later serializers). An absent/out-of-set `data-variant` parses to the `info` default (no throw).
- **BR-E2-7 · Block chrome styled by token CSS, no raw values (inherits BR-E1-5 mechanism).** Extend
  `internal/editor-styles.ts` with DS-token CSS for: taskList checkbox + item layout, table (border/header-fill/
  selected-cell), callout (per-`data-variant` tint + left accent), image (max-width/selected ring). All colors are
  `var(--color…)` base semantic tokens (NOT sub-theme-only vars — the "cite tokens from emitted output" lesson); B12
  motion only (opacity/transform); dark mode inherited from the token layer. **Still NO `light_/dark_Editor`
  sub-theme** unless a bespoke key is unavoidable (BR-E1-5; decide at impl). `[FACT: editor-styles.ts; DEF-U8-h]`
- **BR-E2-8 · codeBlock/divider stay StarterKit-basic at E2.** No syntax highlighting (`CodeBlockLowlight` + `lowlight`
  dep) — that is an enhancement deferred past M1.0 (simplest-correct; "right complexity for the stage"). E2 only
  themes the existing `<pre>`/`<hr>`. `[INTERP: standards — over-engineering guard]`
- **BR-E2-9 · assertEditorDocument still holds + schema parity is proven.** The new nodes serialize as
  `{type:'taskList'|'image'|'table'|'callout', …}`; the E1 runtime assertion (root `type==='doc'`, children carry a
  string `type`) is unaffected `[FACT: editor.tsx assertEditorDocument]`. E2 adds a test asserting **every**
  `STANDARD_BLOCK_TYPE` value ∈ `editor.schema.nodes` (the E2 analogue of BR-E1-4's command-parity test — catches a
  dropped block on any future edit). `[INTERP: mirrors commands.test.ts parity]`

## 5. States (§VIII — applicable subset, per block)

The blocks are content, not form controls, but each has reviewable states for the Visual Gate (both themes):

- **taskList** — unchecked / checked item (checkbox + strikethrough-optional label); keyboard-toggle via ProseMirror.
- **table** — header row vs body cell; selected cell; empty cell (min-height). Editable cells (ProseMirror default).
- **callout** — one rendered variant each: `info`/`success`/`danger` (distinct tint + accent, contrast ≥3:1).
- **image** — with `src` (renders), selected (ring), and **missing/broken `src`** → `alt` text visible (empty state).
- **codeBlock/divider** — themed resting render (styled, unchanged behavior).
  No loading/error states (the app's terminal-state wrapper owns those, UX-4 — the editor is presentational).
  `[FACT: standards/components.md §VIII; state-conventions UX-4]`

## 6. Acceptance

- [ ] Deps added, family-pinned `^3.30.0`: `@tiptap/extension-image` + `@tiptap/extension-table` (the `TableKit`
      bundle) — **two** new packages; `@tiptap/extension-list` promoted to a direct dep. **No `yjs`/`y-prosemirror`.**
      Version `0.1.0 → 0.2.0`.
- [ ] `<VidaEditor>` mounts with the extended extensions array and **no ProseMirror duplicate-node/schema error**
      (BR-E2-2) — jsdom smoke. `TableKit` registers table + row/cell/header as one bundle, so a clean mount proves the
      companions co-registered (a bare `Table` would throw at schema-build without them).
- [ ] **Schema parity (BR-E2-9):** a test asserts every `STANDARD_BLOCK_TYPE` value is a key in `editor.schema.nodes`.
- [ ] Each new block round-trips through `getJSON()` and passes `assertEditorDocument` (jsdom): a doc containing
      `taskList`, `image`, `table`, `callout` nodes → valid `EditorDocument`; the `callout.attrs.variant` persists.
- [ ] **Callout:** `CALLOUT_VARIANT` = 3 values (`info`/`success`/`danger`, matching `ToastIntent`); default `info`;
      an out-of-set/absent `data-variant` parses to the default (no throw). `parseHTML(renderHTML(x)) ≈ x` for the
      variant attr, with the fixture callout seeded with a **child paragraph** (satisfies `content:'block+'` — the node
      can never be empty, ProseMirror auto-fills a paragraph, so the fixture must include it or the round-trip drifts).
- [ ] **image = presentational only:** no `@vida/core`/app import; no upload/encryption code; `allowBase64` set; the
      deferred attachment seam is documented, not built (BR-E2-5).
- [ ] Block chrome styled via `editor-styles.ts` **token vars only** — grep the new CSS for a raw hex/`rgb(` → none;
      B12 motion only; dark mode correct (BR-E2-7).
- [ ] Package boundary clean (dep check); `pnpm --filter @vida/editor typecheck && build && test` green; root typecheck.
- [ ] **Component Visual Gate PASS** — a `editor.stories.tsx` "Standard blocks" story renders a doc exercising all
      blocks (taskList checked+unchecked, a table, all 3 callout variants [info/success/danger], an image, code-block,
      divider) in **both themes**; a11y panel clean.
- [ ] **§XXIX currency:** refresh `docs/editor/current-spec.md` + `current-business-rules.md`; fill the 0-byte
      `docs/editor/extension-catalog.md` (the standard-block catalog: node name → package → config → serialization
      note-for-E6); update `packages/editor/src/CLAUDE.md`.

## 7. Implementation sequence

1. **Deps + version.** Add `@tiptap/extension-image` + `@tiptap/extension-table` (the TableKit bundle — 2 packages,
   resolved at preflight) + promote `@tiptap/extension-list` to a direct dep; `pnpm install` (updates the lock);
   `package.json` `0.1.0 → 0.2.0`.
2. **`extensions/callout.ts`** — the bespoke `Callout` `Node.create` + `CALLOUT_VARIANT`/`CalloutVariant` +
   `addAttributes({ variant })` + `parseHTML`/`renderHTML` (`<div data-type="callout" data-variant>`, `0` hole).
3. **`extensions/standard-blocks.ts`** (**net-new** — not a skeleton) — import + configure `TaskList`,
   `TaskItem({nested:true})`, `Image({inline:false, allowBase64:true})`, `TableKit({table:{resizable:false}})`,
   `Callout`; export `STANDARD_BLOCK_EXTENSIONS`. **`callout.ts` (step 2) and this file
   are both net-new** — they are NOT in the reserved skeleton set (which holds the E5 integration blocks +
   `image-block.ts`). The pre-existing 0-byte `extensions/image-block.ts` skeleton is **removed** — its Image config
   folds into this file, leaving no orphan 0-byte file and no second home for Image config.
4. **`editor.tsx`** — spread `...STANDARD_BLOCK_EXTENSIONS` into the `useEditor` extensions array (after
   `StarterKit, Placeholder`). No other change to the E1 shell (editor still created once; API frozen).
5. **`internal/editor-styles.ts`** — extend the injected CSS (idempotent, browser-only) with token-var rules for
   taskList / table / callout(×3 variants) / image / code-block / divider (BR-E2-7). B12 + reduced-motion.
6. **Tests (jsdom)** — `standard-blocks.test.ts(x)`: schema-parity (BR-E2-9), per-block insert→getJSON→assert,
   callout variant round-trip + default-fallback, no-duplicate-node mount, boundary(no core import). **Stories** —
   add the "Standard blocks" story under `UIProvider` for the Visual Gate.
7. **§XXIX** — refresh `docs/editor/current-*`, fill `extension-catalog.md`, update `src/CLAUDE.md`.

**Preflight (2026-08-11) = PASS + 2 folds** (both now in §2/§6/§7/§8): (1) TableKit resolves the table UNKNOWN → 2 new
deps not 5; (2) the block-exhibition path pre-chrome is `defaultValue` JSON (Visual-Gate story + fixtures seed each
block that way — no toolbar/slash-menu insertion in E2). No blockers; every §4 BR maps to a §6 acceptance gate; no
backend surface (presentational, BR-E2-4); all §8 UNKNOWNs resolved or owner-deferred (E6 serialization).

## 8. Open UNKNOWNs / Decisions

- [RESOLVED at preflight 2026-08-11] `@tiptap/extension-table@3.30` **does** export a `TableKit` umbrella
  (`import { TableKit } from '@tiptap/extension-table'`) bundling Table+Row+Cell+Header → E2 uses it (2 new deps, not
  5). `[FACT: tiptap-docs table-kit + table-header pages via context7]`
- [RESOLVED at preflight] **Block-exhibition path pre-chrome:** with no toolbar (E3) or slash-menu (E4) yet, the ONLY
  way to place a table/callout/taskList/image is a **`defaultValue` `EditorDocument` JSON literal**. The Visual-Gate
  "Standard blocks" story and the round-trip test fixtures seed each block via `defaultValue`; the per-node JSON shape
  (e.g. `taskList → {type:'taskList',content:[{type:'taskItem',attrs:{checked},content:[…]}]}`, `table → tableRow ▷
tableCell/tableHeader`, `callout → {type:'callout',attrs:{variant},content:[{type:'paragraph',…}]}`) is derived from
  Tiptap's node schema (or a `insert-then-getJSON` test helper). No command/UI insertion is in E2 scope. `[INTERP]`
- [DECIDED] codeBlock stays StarterKit-basic (no lowlight) — BR-E2-8. callout renders via injected CSS, not a React
  node-view — §3. image `allowBase64` interim, attachment pipeline deferred — BR-E2-5. table `resizable:false` at E2.
- [DECIDED] `CalloutVariant` is E2-internal, NOT added to `@vida/types` — §3 (BR-7 owns the block _vocabulary_
  `STANDARD_BLOCK_TYPE`, which already has `'callout'`; the variant set is an implementation detail).
- [NOTE for E6] each new node needs a MD/PDF/DOCX serialization rule; `extension-catalog.md` records the intended
  Markdown mapping per block (taskList→`- [ ]`, table→GFM table, image→`![alt](src)`, callout→? [E6 decides: fenced
  container vs blockquote-with-marker]) so E6 inherits it. Not built in E2. `[INTERP: BR-5]`
- [NOTE] taskList vs the E5 integration block `taskChecklist` are DISTINCT: `taskList` is a generic standard block
  (this unit); `taskChecklist` (`extensions/task-checklist.ts` skeleton) is the `/tasks` integration block that reads
  real `tasks` rows (E5). E2 does not touch `task-checklist.ts`. `[FACT: INTEGRATION_BLOCK_TYPE 'taskChecklist' vs STANDARD_BLOCK_TYPE 'taskList']`

## 9. Change Log

| Date       | Session          | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-11 | ui-3-vida-editor | E2 sub-spec authored at PLAN. /read-docs-first (installed StarterKit@3.30.0 manifest + @tiptap/extension-list exports + tiptap-docs table/image). Resolved the scope collision against `STANDARD_BLOCK_TYPE`: E2 = {taskList, image, table, callout}; divider+code-block already in StarterKit (E1), umbrella §5 E2 row flagged for correction (dropped taskList, listed 2 StarterKit-provided). Decided: taskList from already-present @tiptap/extension-list; image presentational w/ attachment pipeline deferred (BR-E2-5); callout bespoke Node via injected CSS; no double-registration; schema-parity test as the enum gate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-08-11 | ui-3-vida-editor | **Gate-2 /critique (independent) → REVISE → resolved → SHIP.** Confirmed every gate-1 + preflight fold landed consistently (TableKit 2-dep path, B1 3-variant contract, M1–M4, defaultValue seed) + re-verified all ground-truth cites (ToastIntent=3, TableKit exported from `@tiptap/extension-table`, enum=11). Caught **2 edit-orphaned "4 callout variants" refs** the B1 4→3 edit missed (§6 Visual-Gate line, §7 step 5) → fixed to 3. Verified the schema-parity test direction is safe (`enum ⊆ schema.nodes` — TableKit's tableRow/cell/header sub-nodes can't false-fail it). No architecture change, no re-preflight. Spec internally consistent + implementation-ready → **Approval 2 pending**.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-08-11 | ui-3-vida-editor | **Visual Gate PASS (Victor, real browser — both themes).** The "Standard blocks" story confirmed: callout ×3 accents/tints distinct + theme-correct (the B1 fix verified rendering — the exact thing jsdom couldn't), taskList checkboxes, table header-fill/borders, image, code/divider, a11y clean. **E2 DONE — all gates cleared.** Remaining: commit (E1+E2) + PR strategy (Victor).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-08-11 | ui-3-vida-editor | **Post-impl /critique (independent) → REVISE → resolved → SHIP.** Critic verified 5/6 hunt areas clean (decomposition, callout node correctness, wiring/E1-frozen, test quality incl. correct parity direction + real parseHTML exercise, boundary/deps) and caught **1 BLOCKER (B1, auto-triage ISOLATED):** the callout/table/image accents referenced `--accentInfo/--accentSuccess/--accentDanger`, which Tamagui emits ONLY inside the `.t_*_Toast` sub-theme scope → they resolve to nothing on the editor's UNNAMED base-scope frame (jsdom can't catch it; the E1 `--placeholder` trap recurring — "cite tokens from emitted output"). Verified against `themes.ts:36-37` (accent* live only in `light_/dark_Toast`, aliasing base `colorBrandPrimary`/`colorSignalSuccess`/`colorSignalDanger`). **Fixed:** swapped all 6 refs → the base vars they alias (values-only, no `tamagui.config` edit); comment + catalog record the lesson. Re-verified GREEN: typecheck ✓ · test 30/30 · no `var(--accent*)` in code · no raw hex. **PENDING: real-browser Visual Gate (Victor) — the only gate that confirms the accents actually render both themes.** |
| 2026-08-11 | ui-3-vida-editor | **IMPLEMENTED (§7).** `@vida/editor` v0.1.0→**0.2.0**: `extensions/callout.ts` (bespoke node, 3 variants) + `extensions/standard-blocks.ts` (`STANDARD_BLOCK_EXTENSIONS` = TaskList/TaskItem·Image·TableKit·Callout) spread into `editor.tsx`; `image-block.ts` skeleton removed; `editor-styles.ts` extended (token-var CSS, `color-mix` tints, no hex); `standard-blocks.test.tsx` (12 tests: parity + round-trip + callout fallback + e2e render) + "Standard blocks" story. **Automated acceptance GREEN:** editor typecheck ✓ · build ✓ · build-storybook ✓ · test **30/30** · root typecheck **11/11** · boundary clean (only @vida/types+@vida/ui) · no raw hex in CSS. **DEV-1 (§XXVIII mechanical):** `STANDARD_BLOCK_EXTENSIONS` typed `Extensions` (Tiptap's `(Extension\|Node\|Mark)[]`), not §3's loose `readonly Extension[]` — Image/TableKit/Callout are Nodes; a type-name refinement, no intent change (the E1 DEV-2 precedent). §XXIX currency done (extension-catalog.md filled · current-\* refreshed · CLAUDE.md · umbrella §5-E2 row corrected). **PENDING: post-impl /critique + real-browser Visual Gate.**                           |
| 2026-08-11 | ui-3-vida-editor | **/preflight PASS + 2 folds.** (1) Resolved the table UNKNOWN — `TableKit` is exported from `@tiptap/extension-table@3.30` (context7), so E2 uses the bundle → **2 new deps (image + table), not 5**; updated §2/§3/§6/§7. (2) Added the pre-chrome block-exhibition path — with no toolbar/slash-menu yet, blocks are seeded via `defaultValue` JSON in the Visual-Gate story + fixtures (§8). Confirmed: every §4 BR maps to a §6 gate; no backend surface; all UNKNOWNs resolved or E6-owned.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-08-11 | ui-3-vida-editor | **/critique REVISE → resolved (independent subagent critic; core decomposition verified SOUND).** **B1 (blocker):** callout `warn` variant was mis-cited as "the Toast intent set" — verified `ToastIntent`=`info\|success\|danger` (3, no warn; `toast-store.ts:10`) and NO `signal.warning` token exists at any layer → `warn` unbuildable under BR-E2-7's token-only rule. Fixed: dropped `warn` → 3 variants matching `ToastIntent`, each binding an existing accent token. **M1:** §7 clarifies `standard-blocks.ts`+`callout.ts` are net-new (not skeletons) + `image-block.ts` skeleton removed. **M2:** BR-E2-3 notes taskList inherits StarterKit's bundled `listKeymap` (don't disable). **M3:** §6 — callout round-trip fixture seeds a child paragraph (`content:'block+'` auto-fill); table-companion co-registration is the mount-smoke gate. **M4:** BR-E2-5 flags base64 as a known-bad interim (25 MiB image ≈ 33 MB inline in the per-page sync blob), must be retired by the attachment pipeline. Critic confirmed the umbrella §5-E2-row defect flag is correct + the schema-parity test won't false-fail (no sub-node names in the enum). |
