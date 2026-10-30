# @vida/editor — serialization spec (ground truth)

> Durable description of the E6–E8 serializers as built (§XXIX Currency Rule). Refreshed per unit; never lags the code.
> Scope today: **E6 — Markdown (to + from)** + **E7 — PDF (`to-pdf`)** + **E8 — DOCX (`to-docx`)** — the serializer
> suite is COMPLETE.

## What E6 is

The **custom TipTap-JSON ↔ Markdown serializer** ADR-001 §8 mandates ("Custom serializer … round-trip lossless") —
NO off-the-shelf bridge (`@tiptap/markdown` / `turndown` / `prosemirror-markdown`). Two pure, headless, deterministic
functions (no `Editor`, no DOM) in `packages/editor/src/serializers/`:

- `toMarkdown(doc: EditorDocument, options: MarkdownSerializeOptions): string` — the canonical emitter.
- `fromMarkdown(markdown: string, options?: MarkdownSerializeOptions): MarkdownParseResult` — the closed-grammar inverse.
  Barrel-exported from `@vida/editor`; consumed by the app's `export-dialog` `onExport(format)` (wiring is the app's).
  `[FACT: packages/editor/src/serializers/*; index.ts; @vida/types editor.ts:197-212]`

## The lossless invariant (BR-5)

The enforceable round-trip is **JSON→md→JSON**: `fromMarkdown(toMarkdown(doc)).document ≡ doc` over the live schema.
The reverse (md→JSON→md over an arbitrary STRING) is NOT identity and is unsatisfiable — Markdown has equivalent
spellings, so `toMarkdown` emits ONE canonical form and `fromMarkdown` normalizes to it. The grammar `fromMarkdown`
parses is therefore CLOSED (= exactly what `toMarkdown` produces); arbitrary outside markdown DEGRADES (never throws).
No general-GFM lexer is needed and none is used — zero new runtime dependency. `[FACT: serializers.test.ts round-trip
fixtures; to-markdown.ts; from-markdown.ts]`

## Canonical Markdown mapping

| node / mark           | Markdown                                                                                                      | notes                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| paragraph             | text + inline                                                                                                 | each line's leading block-marker (`---`/`#`/`-`/`\d.`/`\|`/`>`) escaped so prose ≠ block         |
| heading               | `#`×level (ATX)                                                                                               | level 1–6 clamped                                                                                |
| bulletList / listItem | `- ` (nested = 2-space indent)                                                                                | multi-paragraph & nested-list items round-trip                                                   |
| orderedList           | `1.`,`2.`…                                                                                                    | `attrs.start` honored                                                                            |
| taskList / taskItem   | `- [ ]` / `- [x]`                                                                                             | GFM; `checked` round-trips                                                                       |
| blockquote            | `> ` line prefix                                                                                              | nested blocks recurse                                                                            |
| codeBlock             | ` ```lang ` **variable-length** fence                                                                         | fence = longest inner backtick-run + 1 (min 3) so an inner ``` can't close early                 |
| horizontalRule        | `---`                                                                                                         |                                                                                                  |
| image                 | `![alt](src "title")`                                                                                         | `]` in alt, `)`/`"` in src/title escaped                                                         |
| table                 | GFM pipe table (header + `---` delimiter)                                                                     | cells inline-only; `\|` escaped; cell attrs `{colspan:1,rowspan:1,colwidth:null}`                |
| callout               | `<div data-type="callout" data-variant="…">…</div>`                                                           | HTML carrier (no MD callout syntax); `variant` round-trips                                       |
| **marks**             | bold `**` · italic **`_`** · strike `~~` · code `` ` `` (variable fence) · underline `<u>` · link `[t](href)` | italic uses `_` (not `*`) so bold+italic `**_x_**` is unambiguous; bold is always the OUTER mark |
| hardBreak             | two trailing spaces + `\n`                                                                                    |                                                                                                  |

`[FACT: to-markdown.ts serializeBlock/renderTextNode; from-markdown.ts parseBlocks/parseInline]`

- **Inline escaping.** Non-code text escapes ``\ ` * _ [ ] < > ~``; the parser inverts each via a generic `\X`→`X`
  pass. Code spans are literal (unescaped), fenced with enough backticks to contain any inner run. `[FACT:
to-markdown.ts INLINE_ESCAPE/codeSpan; from-markdown.ts unesc]`

## Integration blocks — `integration_block_handling`

Per `MarkdownSerializeOptions.integration_block_handling` (the E5-deferred config codec, BR-E5-5 — read straight from
`node.attrs`, no HTML-DOM detour, so `rendered:false` is a non-issue):

- **`comment`** — `<!-- vida:integration type="<blockType>" config='<HTML-escaped JSON of attrs>' -->`. **Lossless for
  the DECLARED schema** (7 typed capabilities → full attrs; 4 schema-less → type identity only). `config` omitted when
  attr-less. `&`/`'`/`--` entity-escaped (reversible).
- **`skip`** — omitted (declared-lossy).
- **`placeholder`** — `> **[<label>]** — integration block` marker (declared-lossy; not reconstructed on parse).
  `[FACT: to-markdown.ts serializeIntegration; from-markdown.ts integration comment branch; @vida/types editor.ts:203]`

## Frontmatter

Gated by `include_frontmatter`; values from the additive `MarkdownSerializeOptions.frontmatter?` map (symmetric with
`MarkdownParseResult.frontmatter`). Flat YAML only (`key: value` + `key: [a, b]`); scalars round-trip stringly-typed
(declared-lossy, out of the document-side invariant). `[FACT: to-markdown.ts renderFrontmatter; from-markdown.ts
parseFrontmatter; @vida/types editor.ts:200-207]`

## Degrade, never throw (BR-E6-9)

`fromMarkdown` on non-canonical input degrades (unknown block → paragraph of raw text; malformed integration config →
warn) and never throws; `toMarkdown` on an unknown node → best-effort inline text, never throws. `MarkdownParseResult.warnings`
is the lossy channel on parse; `toMarkdown` returns a bare `string` (no emit-side warnings channel). `[FACT:
from-markdown.ts try/catch + warnings; serializers.test.ts degradation suite]`

## Verify (E6)

`pnpm --filter @vida/editor test` (`serializers.test.ts` — 34 tests: 24 JSON→md→JSON round-trip fixtures covering all 11
standard blocks + every registered mark + hardBreak + the nested-emphasis / escaped-metacharacter / HR-collision /
image-bracket / href-paren / code-fence / comment-entity stress cases, plus the 3 handling modes, frontmatter, and
degradation). Pure — no editor/DOM. `[FACT: serializers.test.ts]`

---

## What E7 is

The **PDF serializer** ADR-001:101 mandates (`@react-pdf/renderer`, **web/desktop**; mobile=`expo-print` is OUT of UI-3
scope). **Emit-only — no round-trip** (BR-5 is E6's). Two functions in `packages/editor/src/serializers/to-pdf.tsx`:

- `toPdf(doc: EditorDocument, options: PdfSerializeOptions): Promise<Blob>` — the only async/IO seam (`pdf(tree).toBlob()`).
- `documentToPdfTree(doc, options): ReactElement<DocumentProps>` — the **pure/deterministic** tree builder (exhaustively
  unit-testable on `element.type`, no bytes). Split for testability (the E6 `to`/`from` purity precedent).
  The signature is async+binary because `@react-pdf/renderer` lays out with Yoga and renders a byte STREAM — not a choice.
  `[FACT: to-pdf.tsx; @react-pdf/renderer@4.6.1 pdf().toBlob(); ADR-001:101]`

## Canonical block → react-pdf primitive mapping (E7)

| node                  | primitive                                                                  | notes                                                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| paragraph             | `<Text style=block>`                                                       | inline runs nested inside                                                                                                                                         |
| heading               | `<Text>` + `fontSize:HEADING_SIZE[level]`                                  | level clamped 1–6 (`clampLevel`)                                                                                                                                  |
| bulletList / listItem | `<View>` rows; each `<View row>` = `•` marker `<Text>` + `<View>` content  | nested list recurses via `renderChildren`                                                                                                                         |
| orderedList           | as bullet; marker `${start+i}.`                                            | `start` `Number.isFinite`-guarded (post-impl M2 — no `NaN.`)                                                                                                      |
| taskList / taskItem   | as bullet; marker `☑`/`☐` per `checked`                                    |                                                                                                                                                                   |
| blockquote            | `<View>` left-border + recursed block children                             |                                                                                                                                                                   |
| codeBlock             | `<View>` Courier bg; body split on `\n` → **one `<Text>` per line**        | deterministic verbatim (post-impl)                                                                                                                                |
| horizontalRule        | `<View>` ruled top-border                                                  |                                                                                                                                                                   |
| image                 | `<Image src>`                                                              | **empty src skipped** (BR-E7-9 tree-level); a present-but-corrupt src throws at react-pdf RENDER — the caller's contract (valid `note_attachments` srcs, BR-E2-5) |
| table                 | `<View>` grid; rows `<View row>`, cells bordered `<View>`; header row bold | **a non-paragraph cell child recurses via `renderBlock`** (post-impl M1 — was dropped)                                                                            |
| callout               | `<View>` variant-tinted box + recursed block children                      | accent/tint per `{info,success,danger}`                                                                                                                           |
| hardBreak             | literal `{"\n"}` in the current `<Text>`                                   |                                                                                                                                                                   |

- **Marks compose as MERGED style objects on one `<Text>`** (NOT E6's delimiter nesting): `bold`→`fontWeight`,
  `italic`→`fontStyle`, `strike`+`underline`→combined `textDecoration` (`'underline line-through'`), `code`→`fontFamily:
Courier`+bg. The ONE **element** mark is `link` → the OUTERMOST `<Link src={href}>` wrapping the styled `<Text>`
  (`href` only). `[FACT: to-pdf.tsx inlineStyleFor/renderTextNode; @react-pdf/stylesheet TextDecoration union]`

## Integration blocks + frontmatter (E7)

- `PdfSerializeOptions.integration_block_handling`: `'skip'` omits; `'placeholder'`/`'comment'` (≡ in PDF — no invisible
  comment layer) render the **re-implemented placeholder card** (`<View>`/`<Text>` — label from `INTEGRATION_BLOCK_COMMANDS`,
  NOT an import of the Tamagui `IntegrationBlockPlaceholder`) + "Available when its module ships". No config encoded
  (emit-only). `[FACT: to-pdf.tsx renderIntegration]`
- `options.frontmatter` (present + NON-empty) → a page-1 header block (title + `key: value` meta lines). `[FACT: renderHeader]`

## Colors (E7) — literals quarantined to `pdf-theme.ts` (BR-E7-8a)

`@react-pdf/renderer` has NO CSS runtime (can't read Tamagui vars), so styles must be literal. All hex lives ONLY in
`serializers/pdf-theme.ts` (print-neutral, provisional — brand palette/fonts deferred); `to-pdf.tsx` has zero hex
(grep-gated). Built-in standard fonts (Helvetica/Courier — auto-resolve Bold variants, no `Font.register`). `[FACT:
pdf-theme.ts; to-pdf.tsx hex-clean grep]`

## Verify (E7)

`pnpm --filter @vida/editor test` (`to-pdf.test.tsx` — 33 tests: schema-parity over all 11 `STANDARD_BLOCK_TYPE`, every
mark + hardBreak, integration modes, frontmatter, degradation, the M1/M2/m1/m2 regressions, + two `%PDF-` byte-render
smokes [flat + nested]). Tree tests pure; smokes render headless (Node 22 global `Blob`). One new top-level dep
`@react-pdf/renderer@4.6.1`. `[FACT: to-pdf.test.tsx]`

---

## What E8 is

The **DOCX serializer** ADR-001:102 mandates (`docx` npm — `/dolanmiu/docx@9.7.1`, Node + browser). **Emit-only — no
round-trip** (BR-5 is E6's). The last serializer — the suite is complete. Files in `packages/editor/src/serializers/`:

- `toDocx(doc: EditorDocument, options: DocxSerializeOptions): Promise<Blob>` — the async/IO seam (`Packer.toBlob`).
- `buildDocxDocument(doc, options): Document` — the sync `docx` model assembler (descriptors → adapter → `Document`);
  exported for OOXML tests (`Packer.toBuffer` → unzip `word/document.xml`).
- `documentToDocxBlocks(doc, options): DocxBlock[]` — the **PURE/deterministic** descriptor-AST builder (the exhaustive
  unit-test surface). `docx`'s core primitives (`Paragraph`/`TextRun`/`Table`) hold a **private `properties`** field —
  NOT introspectable like react-pdf's plain elements — so the pure walk emits a plain descriptor AST (deep-equal
  testable), a thin mechanical adapter maps each descriptor 1:1 to a `docx` instance, and the adapter is proven by an
  unzipped-`document.xml` assertion (the E8 testability split). `[FACT: to-docx.ts; docx@9.7.1 index.d.ts:2508 private properties]`

## Canonical block → `docx` primitive mapping (E8)

| node                  | `docx` primitive                                                                                                                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| paragraph             | `Paragraph({children: runs})`                                                                                                                                                                                         |
| heading               | `Paragraph({heading: HeadingLevel.HEADING_<level>, children})` — level clamped 1–6                                                                                                                                    |
| bulletList / listItem | `Paragraph({bullet:{level}, children})`; nested = deeper `level`                                                                                                                                                      |
| orderedList           | `Paragraph({numbering:{reference, level}})`; **one UNIQUE `reference` per orderedList node** (`ol-<n>`) in `Document.numbering.config` (a shared ref = a shared counter); `attrs.start` → that config level's `start` |
| taskList / taskItem   | `Paragraph` with a `☑ `/`☐ ` glyph run prefix per `checked`                                                                                                                                                           |
| blockquote            | child blocks recursed with a left border + indent deco; a non-paragraph child keeps its text (BR-E8-nested)                                                                                                           |
| codeBlock             | one shaded monospace `Paragraph` per `\n`-split line (verbatim — the E7 per-line rule)                                                                                                                                |
| horizontalRule        | `Paragraph({border:{bottom}})` (Word's HR idiom)                                                                                                                                                                      |
| image                 | **degraded** → `Paragraph` of text `[image: <alt>]` (NEVER an `ImageRun` — needs binary data + dims a pure IO-free builder can't get; deferred to the attachment pipeline, BR-E2-5)                                   |
| table                 | `Table`/`TableRow`/`TableCell`; header row bold; a non-paragraph cell block recursed (BR-E8-nested — cells are `(Paragraph\|Table)[]`, never a bare run)                                                              |
| callout               | child blocks recursed with a variant tint (`shading.fill`) + accent left border                                                                                                                                       |
| hardBreak             | a `TextRun({break:1})` in the inline/mark pass (NOT a block handler)                                                                                                                                                  |

- **Marks merge as ONE `TextRun` options object** (`bold`/`italics`/`strike`/`underline:{}`/`code`→`font:mono`+shading);
  the ONE **element** mark `link` → an outermost `ExternalHyperlink({link:href, children:[styled run]})` (`href` only; an
  empty/absent href degrades to a plain run — no dangling relationship). `[FACT: to-docx.ts inlineRuns/runsToChildren]`

## Integration blocks + frontmatter (E8)

- `DocxSerializeOptions.integration_block_handling`: `'skip'` omits; `'placeholder'`/`'comment'` (≡ in DOCX) render a
  re-implemented placeholder — a bold label `Paragraph` (from `INTEGRATION_BLOCK_COMMANDS`) + a muted "Available when its
  module ships" (NOT an import of the Tamagui `IntegrationBlockPlaceholder`). No config encoded (emit-only).
- `options.frontmatter` (present + NON-empty) → leading paragraphs (bold title + `key: value` meta). `[FACT: to-docx.ts headerBlocks]`

## Colors (E8) — literals quarantined to `docx-theme.ts` (BR-E8-8a)

`docx` styles via literal hex (6-digit, no `#` — its wire format) / shading / border options; no CSS runtime (the react-pdf
parallel). All literals live ONLY in `serializers/docx-theme.ts`; `to-docx.ts` is hex-clean (grep-gated). Built-in Word
fonts (default body / `Courier New` for code); brand fonts/palette deferred. `[FACT: docx-theme.ts; to-docx.ts hex-clean grep]`

## Verify (E8)

`pnpm --filter @vida/editor test` (`to-docx.test.ts` — 36 tests: schema-parity over all 11 `STANDARD_BLOCK_TYPE`, every
mark + hardBreak, heading clamp, list nesting + UNIQUE ordered refs + `start`, taskList glyphs, the BR-E8-nested
container recursions, table header-bold, callout normalization, image degradation, integration modes, frontmatter,
degradation, determinism, a `PK` zip-magic pack smoke, **+ an unzipped `document.xml` assertion proving the ADAPTER**
[bold run, nested-cell list, checkbox, `[image: cat]` with no `<pic:pic>`, `<w:hyperlink>`, `<w:numId>`, placeholder] +
a 2-cell ragged-row regression). Descriptor tests pure; OOXML tests pack headless. ONE new top-level runtime dep
`docx@9.7.1` (+ `jszip` **devDep**, test-only unzip). `[FACT: to-docx.test.ts]`
