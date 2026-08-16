# Spec: feature:ui-3-vida-editor · E8 — DOCX serializer (`to-docx`)
<!-- type = feature (sub-unit of UI-3) -->
Status: implemented      <!-- draft → approved → implemented -->  (Approval 1 + preflight + Approval 2 + post-impl, 2026-08-16)
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-08-16-ui-3-e8-docx-serializer (PLAN authored this session).
Parent: `_index.md` (UI-3 umbrella) — this sub-spec refines the umbrella §5 **E8** row (`_index.md:142`).

---

## 1. Identity
E8 is the **DOCX serializer** for `@vida/editor`: the single function that turns an `EditorDocument` (TipTap JSON) into a
Word `.docx` document. It is the **third and LAST** of the three export units (E6 md ✅ → E7 PDF ✅ → **E8 DOCX**) and
the final UI-3 unit before **UI-4** `[FACT: _index.md:140-142; serialization-spec.md:4]`.

- **Mechanism is fixed by ADR-001, not chosen here.** *"DOCX Export | docx (npm) | Export notes/journals to Word"*
  `[FACT: ADR-001:102; also :235 "└── docx  # DOCX export"]`. E8 IMPLEMENTS that mandate; it invents no mechanism and
  needs no new ADR (the E7 precedent — a serializer implementing an ADR-001-fixed engine).
- **The export** (signature intrinsic to the engine — see BR-E8-3):
  - `toDocx(doc: EditorDocument, options: DocxSerializeOptions): Promise<Blob>`
- **Files:** the **0-byte stub `packages/editor/src/serializers/to-docx.ts`** (built in place — `docx` is a plain
  object-model library, no JSX, so `.ts` not `.tsx`, the E6 precedent, NOT E7's `.tsx`), exported from the package
  barrel `index.ts` `[FACT: ls packages/editor/src/serializers/to-docx.ts wc -l = 0; CLAUDE.md "Deferred" §]`. Colors/
  literal styling quarantined to a new `serializers/docx-theme.ts` (the `pdf-theme.ts` precedent, BR-E8-8a).
- **Reuses the E6/E7 tree-walk MODEL** — a total, pure walk over `EditorNode` with one handler per node type + one per
  registered mark — but emits **`docx` object-model instances** (`Paragraph`/`TextRun`/`Table`/…) instead of react-pdf
  React elements or Markdown strings `[FACT: to-pdf.tsx documentToPdfTree/renderBlock is the shape; BR-E8-4]`.

- **What it is NOT (deferred / out of scope — grounded):**
  - **NOT a round-trip.** DOCX is a terminal presentation format; there is no `fromDocx`. The umbrella BR-5 round-trip
    obligation is **E6-only** and does not bind E8 (identical to E7 — BR-E7-2). E8's bar is faithful rendering + total
    schema coverage + degrade-never-throw, not identity `[FACT: e7-pdf-serializer.md:29-31; e6-markdown-serializers.md:14]`.
  - **NOT mobile-specific.** `docx` runs in Node.js and the browser `[FACT: /dolanmiu/docx — "compatible with both
    Node.js and browser environments"]`; unlike PDF (react-pdf web/desktop + expo-print mobile split, ADR-001:101),
    ADR-001 lists ONE DOCX engine with no platform split `[FACT: ADR-001:102]`. UI-3 still targets web/desktop React;
    the M-mobile editor mount is a separate concern (`_index.md:119-120`), but there is no second DOCX engine to isolate.
  - **NOT the app export wiring.** The `export-dialog` `onExport(format)` consumer (UI-2 ✅) calls `toDocx` and triggers
    the download; E8 only PROVIDES the function. No app/route change `[FACT: export-dialog.tsx:28; BR-1 boundary; the
    E6/E7 precedent — current-business-rules.md BR-1]`.
  - **NOT the live integration-block bodies.** E8 renders the E5 *placeholder* intent (label + "available when its
    module ships"), not module data — the bodies don't exist (BR-3) `[FACT: current-business-rules.md BR-E5-4, BR-E7-5]`.
  - **NOT encrypted-attachment image resolution / true image embedding (see BR-E8-image).** `docx`'s `ImageRun` needs
    **binary image DATA + pixel dimensions**, not a URL `[FACT: /dolanmiu/docx images — ImageRun{type,data,transformation}]`;
    a pure, IO-free emit builder can neither fetch a URL nor safely probe dimensions. E8 therefore **degrades images to a
    labeled text placeholder** and defers real embedding to the attachment pipeline (BR-E2-5). `[INTERP: engine constraint
    + emit-only purity + BR-E2-5]`
  - **NOT brand fonts/palette.** Built-in Word fonts (default body / a monospace like `Courier New` for code) + print-
    neutral literal colors in `docx-theme.ts`; brand fonts/palette deferred, exactly as E7 `[FACT: BR-E7-1/8a; ds-2
    palette provisional]`.

## 2. Business Rules (E8-specific — inherit umbrella BR-1..BR-7)

- **BR-E8-1 · Mechanism = `docx` (npm), no alternative.** ADR-001:102 fixes it; E8 cites it. No new ADR. The canonical
  package is **`docx` by dolanmiu** `[FACT: ADR-001:102; /dolanmiu/docx]`.
- **BR-E8-2 · Emit-only; NO round-trip obligation.** Correctness = every `STANDARD_BLOCK_TYPE` node + every registered
  mark + `hardBreak` renders to a faithful `docx` primitive, exhaustively, degrading never-throwing. The BR-5
  JSON-identity invariant is E6's and does not apply `[FACT: e7-pdf-serializer.md:29-31; BR-E8-4]`.
- **BR-E8-3 · Signature is async + binary — intrinsic to the engine.** `docx` serializes the object model to a zipped
  OOXML byte stream via `Packer` `[FACT: /dolanmiu/docx — Packer.toBuffer(doc):Promise<Buffer> / Packer.toBlob(doc):
  Promise<Blob>]`, so the public export is asynchronous and produces a `Blob`. `toDocx` returns `Promise<Blob>`
  (`Packer.toBlob`, the web/desktop download seam — symmetric with E7's `toPdf`). The app awaits it and triggers a
  download via the `export-dialog` seam (deferred, BR-1). `[FACT: docx@9.7.1 index.d.ts:2437 `Packer.toBlob(file):
  Promise<Blob>`; :2435 `Packer.toBuffer(file):Promise<Buffer>` — the Node test smoke uses `toBuffer`; verified at preflight]`
- **BR-E8-4 · Emitter = a total tree-walk over `EditorNode` → `docx` instances; implement the SCHEMA, not just the
  block enum** (the BR-E6-3 / BR-E7-4 precedent). One handler per `STANDARD_BLOCK_TYPE` block + one per mark bare
  `StarterKit@3.30.0` registers (`bold`/`italic`/`strike`/`code`/`link`/`underline`) + the `hardBreak` node
  `[FACT: current-business-rules.md BR-E6-3; editor.tsx bare StarterKit]`.
  Canonical block → `docx` primitive mapping:
  | node | `docx` primitive |
  |------|------------------|
  | `paragraph` | `Paragraph({children: run[]})` |
  | `heading` | `Paragraph({heading: HeadingLevel.HEADING_<level>, children})` — level 1–6 clamped |
  | `bulletList`/`listItem` | `Paragraph({bullet:{level}, children})` per item; nested list = deeper `level` |
  | `orderedList` | `Paragraph({numbering:{reference, level}, children})` per item, referencing a **per-list UNIQUE** `Document.numbering.config` decimal entry (`reference = ol-<index>` — else two ordered lists share one counter and the second continues 4,5,6…); `attrs.start` → THAT config level's `start` (`ILevelsOptions.start`, not the paragraph) |
  | `taskList`/`taskItem` | `Paragraph({children:[TextRun(checked?'☑ ':'☐ '), …]})` — a checkbox glyph prefix (Word has no live checkbox in this scope); the `☑`/`☐` glyph is the E7 marker precedent, the trailing space is E8-specific (E7's flex marker column separated structurally; here a leading run needs the space) |
  | `blockquote` | `Paragraph({indent:{left}, border/style})` per child block (left-indented + a subtle rule); a **non-paragraph child block recurses through the block handlers** (BR-E8-nested) |
  | `codeBlock` | one `Paragraph({style/shading, children:[TextRun({font: mono})]})` per `\n`-split line (verbatim, deterministic — the E7 per-line rule) |
  | `horizontalRule` | `Paragraph({border:{bottom}})` (a bottom-border spacer — Word's HR idiom) |
  | `image` | **degraded** → `Paragraph({children:[TextRun("[image: <alt>]")]})` (BR-E8-image); NOT `ImageRun` in M1.0 |
  | `table` | `Table({rows:[TableRow({children:[TableCell({children: block[]})]})]})`; header row bold; a **non-paragraph cell block recurses through the block handlers** (BR-E8-nested — the E7 M1 fix) |
  | `callout` | `Table`/`Paragraph` tinted box (shading + left border per `attrs.variant`) + child blocks (**block children recurse** — BR-E8-nested) |
  | `hardBreak` | handled in the **inline/mark pass** (NOT a top-level block handler — it's an inline node inside a paragraph's run list, the E7 `renderInline` precedent) → a `TextRun({break:1})` in-run line break `[UNKNOWN: confirm the break option name at preflight]` |
  **Mark composition (like E7's merged style, NOT E6's delimiter nesting).** `docx` composes marks as **options on one
  `TextRun`**: `bold`→`bold:true`, `italic`→`italics:true`, `strike`→`strike:true`, `underline`→`underline:{}`,
  `code`→`font:{name: mono}` (+ optional shading) — **all merge into ONE `TextRun` options object** on the leaf run
  `[FACT: /dolanmiu/docx TextRun{bold,italics,strike,underline,font}]`. The ONE **element** mark is `link` → an
  `ExternalHyperlink({link: href, children:[TextRun(styled)]})` **wrapping** the styled run — always the OUTERMOST
  inline element (`href` only; other attrs N/A in DOCX) `[FACT: /dolanmiu/docx ExternalHyperlink{link,children}]`.
- **BR-E8-image · Images degrade to a labeled text placeholder in M1.0 (engine + purity constraint).** `docx`'s
  `ImageRun` requires **binary image data + explicit pixel dimensions** `[FACT: /dolanmiu/docx ImageRun{type,data,
  transformation:{width,height}}]`. A pure, IO-free emit builder (BR-E8-7) can neither fetch a remote URL nor reliably
  probe a data-URI's dimensions without a decoder. And the real image path is the deferred encrypted `note_attachments`
  pipeline (BR-E2-5) — the same reason E7 called a present image src "the caller's contract". So E8 renders `image` as a
  `Paragraph` of text `[image: <alt>]` (alt from `attrs.alt`, else a bare `[image]`), never an `ImageRun`, never a throw.
  True data-URI embedding is a **deferred enhancement** (lands with or after the attachment pipeline). Empty/missing src
  is irrelevant here (no `ImageRun` is built regardless). `[INTERP: engine constraint + BR-E8-7 purity + BR-E2-5;
  simplest-correct for the stage — over-engineering guard]`
- **BR-E8-nested · A non-paragraph block inside a container recurses through the block handlers (the E7 M1 regression,
  carried forward).** `blockquote` (`block+`), `callout` (`block+`), and a `table` cell (`block+`) can each contain a
  list / heading / nested quote — NOT just paragraphs. Forcing such a child through the inline-only run pass **silently
  drops its text** — exactly the E7 post-impl **M1** bug (a list in a table cell dropped; fixed by recursing via
  `renderBlock`) `[FACT: e7-pdf-serializer.md:233 post-impl M1; to-pdf.tsx renderTable "recurses via renderBlock"]`. E8
  routes every container child through the block handlers (a paragraph child → an inline run paragraph, header-bolded in
  a table's row 0; any other block → its own handler). This is a KNOWN trap, not the BR-E8-9 unknown-node path. `[INTERP:
  E7 M1 precedent]`
- **BR-E8-5 · Integration blocks render per `DocxSerializeOptions.integration_block_handling`.** A DOCX has no invisible
  comment layer that survives here (as in PDF), so E8 **re-implements the E5 placeholder's VISUAL INTENT** (the label +
  "Available when its module ships") as a fresh `docx` `Paragraph`/box for BOTH `'comment'` and `'placeholder'`, and
  omits the block for `'skip'`. It does **not** import the Tamagui `IntegrationBlockPlaceholder`. The label comes from
  **`INTEGRATION_BLOCK_COMMANDS`** (imported from `../commands`, the SAME source `to-markdown.ts` + `to-pdf.tsx` read).
  No config is encoded (emit-only; bodies don't exist — BR-3). Reuses the existing `integration_block_handling` literal
  without a new enum `[FACT: to-pdf.tsx renderIntegration; to-markdown.ts:11; editor.ts:207; BR-3]`.
- **BR-E8-6 · Frontmatter → a header block.** When `options.frontmatter` is present + NON-empty, `toDocx` prepends a
  title/metadata header (title from the map + `key: value` metadata paragraphs) — symmetric with E6/E7. Absent/empty →
  no header (the E7 post-impl m1 non-empty gate) `[FACT: to-pdf.tsx renderHeader + non-empty gate; BR-E7-6]`.
- **BR-E8-7 · Pure model builder + thin async pack (testability split, the E6 `to`/`from` + E7 tree/render precedent).**
  A **pure/deterministic** builder (no `Date.now`/random, no IO) produces the `docx` document model; `toDocx` =
  `Packer.toBlob(<model>)`, the only async/IO seam. `[FACT: BR-E7-7; §XIX]`
  - **`docx` instances are NOT introspectable — the descriptor-AST split is CONFIRMED necessary (preflight).** react-pdf
    elements expose `.type`/`.props` as plain objects (E7 asserted `element.type === Text`); `docx`'s core primitives are
    opaque — **`Paragraph`/`TextRun`/`Table` hold a `private readonly properties` field** with no public accessor
    `[FACT: docx@9.7.1 index.d.ts:2508 `class Paragraph { private readonly properties }`, :2991 TextRun, :2875 Table;
    verified at preflight]` (only `TableCell`/`ExternalHyperlink` expose `.options`). So the pure tree-walk returns a
    **plain intermediate descriptor AST** (a small `DocxBlock`/`DocxRun` union of plain objects — e.g. `{kind:'paragraph',
    runs:[{text,bold,…}]}`), asserted by deep-equal; a thin **mechanical adapter** maps each descriptor 1:1 to a `docx`
    instance. The `Packer.toBuffer` byte-smoke proves the adapter packs valid bytes; `Packer.toString(file):Promise<string>`
    (:2434) is available as an XML-substring cross-check if needed. `[INTERP: the E8 adaptation of E7's testability split
    — forced by docx's opaque instances; §XIX]`
- **BR-E8-8 · Boundary + deps — ONE justified new TOP-LEVEL runtime dependency `docx`.** Added to
  `packages/editor/package.json` at **`^9.7.1`** (the ADR-001:102 mandate; installed at preflight — **+18 transitive
  packages**, far lighter than E7's react-pdf +59). `to-docx.ts` imports only `@vida/types` + `docx` + editor-local
  `../commands` (`INTEGRATION_BLOCK_COMMANDS`, for labels) + local `./docx-theme`. **No `@vida/core`/app import**
  (BR-1, grep-gated) `[FACT: ADR-001:102; BR-1; the E7 BR-E7-8 precedent; docx@9.7.1 installed 2026-08-16]`.
- **BR-E8-8a · Colors/styling are literal constants, quarantined to `docx-theme.ts`.** `docx` styles via literal hex
  color / shading / border options (no CSS-var runtime — the react-pdf parallel). All literals (callout accent/tint, code
  shading, hr/blockquote rule, heading sizes if set) live ONLY in `serializers/docx-theme.ts`; `to-docx.ts` is hex-clean
  (grep-gated) — the `pdf-theme.ts` precedent `[FACT: pdf-theme.ts; BR-E7-8a]`.
- **BR-E8-9 · Degrade, never throw.** An unknown node → a best-effort `Paragraph` of its inline text (never a throw);
  `image` → the text placeholder (BR-E8-image, never a throw); marks with no `docx` analog → dropped silently. `toDocx`
  returns a `Blob` (no `warnings` channel — same as `toMarkdown`/`toPdf`); lossiness is inherent to a one-way export
  `[FACT: BR-E7-9; to-markdown.ts returns bare string; to-pdf.tsx default text branch]`.

## 3. Contract
A pure model builder + one async pack function (no component; no §VIII states, no motion, no a11y surface — this unit
renders no interactive UI; DOCX's own accessibility tagging is out of M1.0 scope — the E7 §3 precedent).

```ts
// packages/editor/src/serializers/to-docx.ts
export function toDocx(doc: EditorDocument, options: DocxSerializeOptions): Promise<Blob>
// internal, exported for tests — the PURE, deterministic core (the exhaustive coverage gate). Shape verified at
// preflight (descriptor AST vs direct docx `Document` — BR-E8-7). Illustrative:
export function documentToDocxBlocks(doc: EditorDocument, options: DocxSerializeOptions): DocxBlock[]
```
- **One additive `@vida/types` change** (the E6/E7 additive-field precedent — BR-7 permits EXTENDING `@vida/types`, not
  redefining it): add `DocxSerializeOptions` alongside `PdfSerializeOptions` in `packages/types/src/editor.ts`:
  ```ts
  export interface DocxSerializeOptions {
    /** Integration-block rendering; reuses the Markdown/PDF handling literal (no new enum). 'comment'≡'placeholder' in DOCX. */
    integration_block_handling: 'comment' | 'skip' | 'placeholder'
    /** Emit-side header values (title/date/tags/…) rendered as a leading header block. Symmetric with Pdf/MarkdownSerializeOptions.frontmatter. */
    frontmatter?: Record<string, unknown>
  }
  ```
  Additive + optional-where-possible; touches no runtime, breaks no caller (nothing imports a DOCX type yet). `@vida/types`
  dist MUST be rebuilt before the editor typechecks the new type (the E7 source-vs-dist §XXVIII note).
- Types imported from `@vida/types` (`EditorDocument`, `EditorNode`, `EditorMark`, `DocxSerializeOptions`), re-exported by
  the barrel, never redefined (BR-7).
- Barrel: add `export { toDocx } from './serializers/to-docx'` to `packages/editor/src/index.ts`; add `DocxSerializeOptions`
  to the re-exported `@vida/types` type list.

## 4. Acceptance
- [ ] **Total coverage (the primary gate — BR-E8-4/7):** the pure builder over a fixture set covering **all 11
      `STANDARD_BLOCK_TYPE` nodes** (+ nesting: list-in-list, marks-in-heading, table with inline marks, callout with
      children, all 6 marks incl. `strike`+`underline` and a `link` wrapping a styled run, and `hardBreak`) produces the
      expected structure — asserted on the intermediate descriptor AST (or, if preflight confirms introspection, on the
      `docx` instances) + key options + children, with NO byte packing. A schema-parity assertion confirms every
      `STANDARD_BLOCK_TYPE` value appears in ≥1 fixture (no silent gap).
- [ ] **Registered-schema coverage (the BR-E6-3 precedent):** fixtures cover marks/nodes beyond the block enum —
      `bold`/`italic`/`strike`/`code`/`link` (href → `ExternalHyperlink`)/`underline` + `hardBreak`.
- [ ] **Pack smoke (adapter-path coverage):** `toDocx(kitchenSinkDoc, opts)` — where `kitchenSinkDoc` is the
      **schema-parity fixture** (every block type + all 6 marks + a nested-in-cell list) so the descriptor→docx adapter
      is fully traversed once — resolves to a `Blob`/`Buffer` whose leading bytes are the ZIP magic `PK\x03\x04` (a
      `.docx` is a zip of OOXML); it does not throw. Env resolved at preflight (`Packer.toBuffer` in the Node test env).
- [ ] **`@vida/types` additive change:** `DocxSerializeOptions` added; `pnpm --filter @vida/types typecheck` green +
      dist rebuilt; `@vida/core` enum-parity unaffected; no existing caller breaks.
- [ ] **Integration handling:** `'skip'` omits; `'placeholder'`/`'comment'` render the placeholder (label present).
      A test per mode (BR-E8-5).
- [ ] **Frontmatter:** present + non-empty → a header block; absent/empty → none (BR-E8-6, E7 m1 parity).
- [ ] **Image degradation:** an `image` node → a text placeholder paragraph (`[image: <alt>]`), never an `ImageRun`,
      never a throw (BR-E8-image).
- [ ] **Nested-block-in-container (the E7 M1 regression — BR-E8-nested):** a list-inside-blockquote, a list/heading
      inside a `table` cell, and a heading/list inside a `callout` each KEEP their text (recurse through the block
      handlers; never forced through the inline-only run pass). One fixture per container.
- [ ] **Degradation:** an unknown node → best-effort text paragraph, never a throw (BR-E8-9).
- [ ] **Purity/determinism:** the builder runs with no IO and is deterministic (no `Date.now`/random) — same doc →
      structurally identical model (BR-E8-7).
- [ ] **Boundary:** `to-docx.ts` imports only `@vida/types` + `docx` (+ local `../commands`/`./docx-theme`); no
      `@vida/core`/app import (grep-gated).
- [ ] **Hex quarantine (BR-E8-8a):** any literal color/shading hex lives ONLY in `serializers/docx-theme.ts` —
      grep-gated that no raw hex leaks into `to-docx.ts`'s block/mark logic.
- [ ] **The ONE new TOP-LEVEL runtime dependency is `docx`, justified (BR-E8-8):** present in
      `packages/editor/package.json`; no OTHER top-level new dep.
- [ ] `pnpm --filter @vida/editor typecheck && build && test` green (editor test count ↑ from **188**); root typecheck 11/11.
- [ ] **No Visual Gate** — E8 renders no `@vida/ui` component surface (a serializer), the E6/E7 render-table
      classification. Stated explicitly `[FACT: e7-pdf-serializer.md:188; serialization-spec.md:69]`.
- [ ] §XXIX currency: `docs/editor/serialization-spec.md` extended with the E8 section (completing E6+E7) +
      `current-spec.md`/`current-business-rules.md` E8 sections + `packages/editor/src/CLAUDE.md` + umbrella §5 E8 ✅.

## 5. Implementation Prompt (settled → the IMPLEMENTATION-PLAN at gate-2)
Build order (pure builder first — the pack is a one-line seam over it):
1. **Dep + version** — `docx@^9.7.1` added to `packages/editor/package.json` deps (installed at preflight); `0.7.0 → 0.8.0`.
   (Preflight VERIFIED the object-model API — `Document`/`Paragraph`/`TextRun`/`Table`/`TableRow`/`TableCell`/
   `ExternalHyperlink`/`HeadingLevel`/`Packer`/`numbering`/`shading`/`BorderStyle`/`ImageRun` — against its installed `.d.ts`.)
2. **`@vida/types`** — add `DocxSerializeOptions` (additive, §3) + export; extend the barrel re-export list; rebuild
   `@vida/types` dist (the E7 source-vs-dist note).
3. **`serializers/docx-theme.ts`** — the tiny print-neutral literal palette + heading sizes + shading/border constants
   (BR-E8-8a); built-in fonts (default body / a mono for code), no font registration.
4. **`serializers/to-docx.ts`** — the total tree-walk: block handlers per BR-E8-4 + an inline/mark pass (marks merged
   into one `TextRun` options object; `link` as the outermost `ExternalHyperlink`) + integration/callout/frontmatter per
   BR-E8-5/6 + image degradation per BR-E8-image, returning the pure model; then `toDocx = (doc,options) ⇒
   Packer.toBlob(<model>)`. The ordered-list `numbering.config` is assembled on the `Document` with **one unique
   `reference` per `orderedList` node** (walk the doc → one config entry each; a shared reference is a silent
   shared-counter bug the descriptor asserts won't catch). Pure builder, thin async pack.
5. **Tests** — `serializers/to-docx.test.ts`: pure-builder assertions (all 11 blocks + marks + hardBreak + schema-parity
   + image degradation + integration modes + frontmatter + degradation) + the `PK\x03\x04` pack smoke **over the
   schema-parity kitchen-sink** (every block type + marks + a nested-in-cell list → the descriptor→docx adapter path is
   fully traversed once, since the descriptor asserts don't cover the adapter).
6. **Barrel export** `toDocx` + §XXIX doc currency (serialization-spec.md E8 section, current-*, CLAUDE.md, umbrella §5).
- Follow the enum/schema, not prose (the E2/E6/E7 precedent). Cite code for every mapping. Deterministic builder; no `Date.now`.

## 6. Open UNKNOWNs / Decisions
Most are DECIDED by docs/precedent (Victor's E7 steer — decide from the docs, don't manufacture a fork). The genuinely
open items are engine-API specifics that **preflight** resolves against the installed `docx` `.d.ts` (the E7 discipline).
- [DECIDED — ADR-001:102] mechanism = `docx` (npm), no new ADR. `[FACT: ADR-001:102]`
- [DECIDED — engine] signature = `Promise<Blob>` (async binary — `Packer` zips OOXML). `[FACT: /dolanmiu/docx Packer]`
- [DECIDED — e6/e7 precedent] **NO Visual Gate** (serializer, no `@vida/ui` surface). `[FACT: e7-pdf-serializer.md:188]`
- [DECIDED — e7 precedent + BR-7] options = additive `DocxSerializeOptions` in `@vida/types` (mirrors `PdfSerializeOptions`);
  `integration_block_handling` reuses the literal (no new enum). `[FACT: editor.ts PdfSerializeOptions; BR-7]`
- [DECIDED — BR-E8-2] no round-trip (emit-only; BR-5 is E6's). `[FACT: e7-pdf-serializer.md:29-31]`
- [DECIDED — BR-E8-image] images degrade to a text placeholder in M1.0 (ImageRun needs binary data+dims a pure IO-free
  builder can't get; real embedding deferred to the attachment pipeline BR-E2-5). Simplest-correct for the stage.
- [DECIDED — BR-E8-8] exactly ONE new top-level dep (`docx`, the ADR-001:102 mandate).
- [RESOLVED — preflight 2026-08-16, against docx@9.7.1 `index.d.ts`] every prior engine-API UNKNOWN is now a FACT:
  version = `docx@9.7.1` (+18 pkgs); `Packer.toBlob` (:2437) for the export + `toBuffer` (:2435) for the Node smoke;
  ordered list = `Document.numbering.config` (`INumberingOptions` :1483) `LevelFormat` decimal ref + Paragraph
  `numbering:{reference,level}` (:1582), `attrs.start`→ the level `start?` (:1305); unordered = Paragraph `bullet:{level}`
  (:1555); `HeadingLevel` const (:837), Paragraph `heading?` (:1550); `hardBreak`→`TextRun({break:1})` (`break?:number`
  :1629); callout tint = `shading?.fill` (:1581/1731) + `border` (BorderStyle :131); **introspectability — DECIDED: the
  descriptor-AST split IS needed** (`Paragraph`/`TextRun`/`Table` hold `private readonly properties` :2508/:2991/:2875,
  not assertable; `Packer.toString` :2434 is an XML-substring backup). the image `data` field is required binary (`CoreMediaData.data` :332, reached via `IImageOptions` :1262),
  confirming BR-E8-image. No open UNKNOWN remains; the contract is complete + testable.

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-16 | ui-3-e8-docx-serializer | PLAN authored: DOCX serializer grounded in ADR-001:102 (`docx` npm, `/dolanmiu/docx`). Reuses the E6/E7 tree-walk MODEL → `docx` object-model instances; emit-only (no round-trip — BR-5 is E6's). BR-E8-1..9: async `Promise<Blob>` (`Packer`), total schema-tree-walk, marks merged into one `TextRun` (`link`→outermost `ExternalHyperlink`), integration→placeholder per handling, frontmatter→header, **images degrade to a text placeholder** (ImageRun needs binary data+dims — engine+purity constraint, BR-E2-5), pure builder + thin async pack with a **descriptor-AST testability split** (docx instances less introspectable than react-pdf elements), ONE new dep `docx`, literals quarantined to `docx-theme.ts`, degrade-never-throw. Additive `DocxSerializeOptions` in `@vida/types`. §6: decisions doc-fixed (Victor's E7 steer); engine-API specifics resolved at preflight against the installed `.d.ts`. |
| 2026-08-16 | ui-3-e8-docx-serializer | **/preflight PASSED** (installed `docx@9.7.1`, +18 transitive pkgs; verified the object-model API against the INSTALLED `index.d.ts`, not training data). Confirmed: `Packer.toBlob/toBuffer/toString`; `Paragraph`/`TextRun`/`Table`/`TableRow`/`TableCell`/`ExternalHyperlink`/`Document` classes + option interfaces; `TextRun` `bold/italics/strike/underline:{}/font/break:number`; `Paragraph` `heading/bullet/numbering/indent/border/shading/children`; ordered-list `numbering.config` + `LevelFormat` + `start`; `HeadingLevel` const; `shading.fill`+`BorderStyle` for callout/hr; `ImageRun.data` REQUIRED binary (BR-E8-image confirmed). **Key resolution: the descriptor-AST split (BR-E8-7) is CONFIRMED necessary** — `Paragraph`/`TextRun`/`Table` hold `private readonly properties` (not introspectable for E7-style assertions). All §6 engine-API UNKNOWNs → RESOLVED. Spec version placeholder `^8.x`→`^9.7.1`. |
| 2026-08-16 | ui-3-e8-docx-serializer | **Approval 2 → IMPLEMENTED → `@vida/editor` v0.7.0→v0.8.0.** `serializers/to-docx.ts` (pure `documentToDocxBlocks` descriptor-AST builder + thin adapter `blockToDocx`/`runsToChildren`/`buildNumbering` + `buildDocxDocument` + async `toDocx`) + `serializers/docx-theme.ts` (quarantined literals + border/shading fragments) + `to-docx.test.ts` (36) + barrel + additive `DocxSerializeOptions` in `@vida/types` (dist rebuilt). ONE new runtime dep `docx@9.7.1` (+18 transitive) + `jszip` test-only devDep. GREEN: editor **224/224** · root typecheck 11/11 · build + build-storybook ✓ · boundary clean · hex confined to `docx-theme.ts`. §XXIX: `serialization-spec.md` + `current-{spec,business-rules}.md` E8 sections + `CLAUDE.md` + umbrella §5 E8 ✅. |
| 2026-08-16 | ui-3-e8-docx-serializer | **Post-impl /critique REVISE → resolved** (independent reviewer drove real bytes: unzipped `word/document.xml`/`numbering.xml`/`.rels` across ~20 fixtures — adapter verified correct, NO degrade-never-throw violation, every nested numbering ref resolves). No blocker. Fixed: **M1** the kitchen-sink test fixture's row 2 nested the 2nd cell INSIDE the 1st (`trow(cell(D), cell(E))`→`trow(cell(D), cell(E))` siblings) → `'E'` silently dropped + ragged table; the `PK` smoke waved it through (Packer packs malformed docs). **m1** the `PK` smoke asserted zero CONTENT correctness (the whole adapter was untested) → exposed `buildDocxDocument` + added an unzipped `document.xml` assertion (hyperlink, numId, `[image: cat]` with no `<pic:pic>`, nested-cell list, placeholder) + a 2-cell ragged-row regression via `jszip` (test-only devDep). **m2** an empty-href `link` degrades to a plain run (no dangling relationship) — locked with a test. 33→36 tests. |
| 2026-08-16 | ui-3-e8-docx-serializer | **/critique gate-2 SHIP → Approval 2** (fresh independent critic; verified ALL gate-1 folds + preflight resolutions landed against the installed docx@9.7.1 d.ts + probed docx pack-fidelity traps). Confirmed the highest-value trap: `ITableCellOptions.children` is `(Paragraph\|Table)[]` (d.ts:1804) — a bare `TextRun` is TYPE-REJECTED, so BR-E8-nested's "wrap inline in a Paragraph" is mandatory, not optional; `bullet:{level}` needs no numbering config (:1555), ordered does; `ExternalHyperlink.children` accepts `TextRun` (ParagraphChild); empty-doc packs. Folded 2 substantive MINORs: **MINOR-1** per-`orderedList` UNIQUE `numbering.reference` (else a silent shared-counter bug — the descriptor asserts can't see it); **MINOR-2** the pack smoke runs over the schema-parity kitchen-sink so the descriptor→docx adapter path is fully traversed. Fixed the `ImageRun.data` cite precision (`CoreMediaData.data` :332 via `IImageOptions` :1262). No blocker. Status → approved (APPROVED-TO-BUILD). |
| 2026-08-16 | ui-3-e8-docx-serializer | **/critique gate-1 SHIP → Approval 1** (independent adversarial critic; architecture/scope/cites verified SOUND — every `[FACT]` spot-checked accurate, no fabricated cite, no manufactured hazard/fork; image-degradation + descriptor-AST decisions both judged correctly reasoned + correctly hedged). Folded 3 substantive MINORs: **(1)** `hardBreak` clarified as an INLINE-pass node, not a top-level block handler (the E7 `renderInline` model); **(2)** added **BR-E8-nested** + an acceptance line carrying forward the E7 post-impl **M1** regression — a non-paragraph block inside `blockquote`/`callout`/`table`-cell (`block+`) must recurse through the block handlers, never the inline-only pass (else its text silently drops); **(3)** `taskList` glyph attribution corrected (the `☑`/`☐` glyph is the E7 precedent, the trailing space is E8-specific). |
