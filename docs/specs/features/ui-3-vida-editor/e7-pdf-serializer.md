# Spec: feature:ui-3-vida-editor · E7 — PDF serializer (`to-pdf`)

<!-- type = feature (sub-unit of UI-3) -->

Status: implemented <!-- draft → approved → implemented --> (Approval 1 + Approval 2 + post-impl, 2026-08-15)
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-08-15-ui-3-e7-pdf-serializer (PLAN authored this session).
Parent: `_index.md` (UI-3 umbrella) — this sub-spec refines the umbrella §5 **E7** row (`_index.md:141`).

---

## 1. Identity

E7 is the **PDF serializer** for `@vida/editor`: the single function that turns an `EditorDocument` (TipTap JSON) into a
PDF document. It is the **second** of the three export units (E6 md ✅ → **E7 PDF** → E8 DOCX) `[FACT: _index.md:140-142]`.

- **Mechanism is fixed by ADR-001, not chosen here.** _"PDF Export | @react-pdf/renderer (web/desktop), expo-print
  (mobile) | … `@react-pdf/renderer` targets web/Node only — mobile uses `expo-print`"_ `[FACT: ADR-001:101; also :234,
:263]`. E7 IMPLEMENTS that mandate; it invents no mechanism and needs no new ADR.
- **The export** (signature intrinsic to the engine — see BR-E7-3):
  - `toPdf(doc: EditorDocument, options: PdfSerializeOptions): Promise<Blob>`
- **Files:** the 0-byte stub `packages/editor/src/serializers/to-pdf.ts` (built as `to-pdf.tsx` — JSX for react-pdf
  primitives, the E5 `.tsx` precedent), exported from the package barrel `index.ts`
  `[FACT: ls packages/editor/src/serializers/to-pdf.ts wc -l = 0; current-spec.md File map "Deferred: serializers/to-pdf.ts (E7)"]`.
- **Reuses the E6 tree-walk MODEL** — a total, pure walk over `EditorNode` with one handler per node type + one per
  registered mark — but emits **react-pdf React elements** instead of Markdown strings `[FACT: to-markdown.ts
serializeBlock/renderTextNode is the shape; BR-E7-4]`.

- **What it is NOT (deferred / out of scope — grounded):**
  - **NOT a round-trip.** PDF is a terminal presentation format; there is no `fromPdf`. The **umbrella BR-5 round-trip
    obligation is E6-only** (_"the only one with a round-trip obligation"_) — it does NOT bind E7. E7's bar is faithful
    rendering + total coverage + degrade-never-throw, not identity `[FACT: e6-markdown-serializers.md:14 "the only one
with a round-trip obligation"; _index.md:110 round-trip clause names Markdown]`.
  - **NOT mobile.** ADR-001:101 targets `@react-pdf/renderer` at **web/desktop** and pairs it with `expo-print` for
    mobile; the umbrella states _"Mobile is OUT of UI-3 scope … UI-3 targets web/desktop React"_ `[FACT: _index.md:119-120;
ADR-001:101,263]`. There is therefore **no mobile bundle to isolate** — the M-mobile editor is a separate
    WebView-hybrid + `expo-print` path (ADR-001:103), not a consumer of this function.
  - **NOT the app export wiring.** The `export-dialog` `onExport(format)` consumer (UI-2 ✅) calls `toPdf` and triggers
    the download; E7 only PROVIDES the function. No app/route change `[FACT: export-dialog.tsx:28; BR-1 boundary; the E6
precedent — current-business-rules.md BR-1]`.
  - **NOT the live integration-block bodies.** E7 renders the E5 _placeholder_ (label + "available when its module
    ships"), not module data — the bodies don't exist (BR-3) `[FACT: current-spec.md E5 §; current-business-rules.md BR-E5-4]`.
  - **NOT encrypted-attachment image resolution.** `image` renders its `src` as-authored; resolving an encrypted
    `note_attachments` URL is the app's deferred pipeline (BR-E2-5) `[FACT: current-business-rules.md BR-E2-5]`.
  - **NOT brand fonts/palette.** E7 uses react-pdf's built-in standard fonts (Helvetica / Courier) + print-neutral
    literal colors; brand fonts (`Font.register` Space Grotesk/Inter) + brand palette are a deferred seam (the palette
    is still a provisional placeholder anyway) `[FACT: ds-2 palette provisional — DS-2 task note; BR-E7-8]`.

## 2. Business Rules (E7-specific — inherit umbrella BR-1..BR-7)

- **BR-E7-1 · Mechanism = `@react-pdf/renderer`, no alternative.** ADR-001:101 fixes it; E7 cites it. **web/desktop
  target; mobile (`expo-print`) is explicitly out of UI-3 scope.** No new ADR `[FACT: ADR-001:101,103,263; _index.md:119-120,141]`.
- **BR-E7-2 · Emit-only; NO round-trip obligation.** Correctness = every `STANDARD_BLOCK_TYPE` node + every registered
  mark renders to a faithful react-pdf primitive, exhaustively, degrading never-throwing. The BR-5 JSON-identity
  invariant is E6's and does not apply `[FACT: e6-markdown-serializers.md:14; BR-E7-4]`.
- **BR-E7-3 · Signature is async + binary — intrinsic to the engine, not a divergence from E6.** `@react-pdf/renderer`
  lays out with Yoga (flexbox) and renders to a PDF byte **stream**, so its public API is asynchronous and produces a
  `Blob` (`pdf(element).toBlob()`) — there is no synchronous/string form to choose `[FACT: @react-pdf/renderer@4.6.1
public API — `pdf().toBlob(): Promise<Blob>`; verified at preflight]`. `toPdf` therefore returns `Promise<Blob>`. The
  app awaits it and triggers a download via the `export-dialog` seam (deferred, BR-1).
- **BR-E7-4 · Emitter = a total tree-walk over `EditorNode` → react-pdf elements; implement the SCHEMA, not just the
  block enum** (the BR-E6-3 precedent). One handler per `STANDARD_BLOCK_TYPE` block + one per mark bare
  `StarterKit@3.30.0` registers (`bold`/`italic`/`strike`/`code`/`link`/`underline`) + the `hardBreak` node
  `[FACT: current-business-rules.md BR-E6-3 "StarterKit also registers link/underline + hardBreak"; editor.tsx bare StarterKit]`.
  Canonical block → react-pdf primitive mapping:
  | node | react-pdf primitive |
  |------|---------------------|
  | `paragraph` | `<Text>` (inline runs as nested `<Text>`) |
  | `heading` | `<Text>` sized by `attrs.level` (1–6 clamped) |
  | `bulletList`/`listItem` | `<View>` rows, each a `<View row>` of a `•` marker `<Text>` + content `<Text>` (nested = indent) |
  | `orderedList` | as bullet, marker = `attrs.start`-based `1.`,`2.`… |
  | `taskList`/`taskItem` | as bullet, marker = `☑`/`☐` per `attrs.checked` |
  | `blockquote` | `<View>` with a left border + inset `<Text>` children |
  | `codeBlock` | `<View>` Courier font + a light surface bg; body split on `\n` → **one `<Text>` per line** (react-pdf `<Text>` honors an explicit `{"\n"}`, but per-line rows are the deterministic verbatim form — no reliance on whitespace layout) |
  | `horizontalRule` | `<View>` a 1pt ruled top-border spacer |
  | `image` | `<Image src={attrs.src}>` (missing/invalid src → skipped, never throws — BR-E7-9) |
  | `table` | `<View>` a grid: rows = `<View row>`, cells = bordered `<View>` + `<Text>` (header row bolded) |
  | `callout` | `<View>` bordered box tinted by `attrs.variant` (info/success/danger accent) + `<Text>` children |
  | `hardBreak` | a literal `{"\n"}` inside the current `<Text>` run (the inline line-break; the react-pdf analog of E6's two-space+`\n`) |
  **Mark composition (NOT E6's string nesting — a react-pdf-specific rule).** react-pdf composes marks as **merged style
  objects on a `<Text>`**, not by wrapping delimiters, so there is no "innermost→outermost" ordering for the style marks:
  `bold`→`fontWeight:'bold'`, `italic`→`fontStyle:'italic'`, `strike`+`underline`→a combined `textDecoration` (both →
  `'underline line-through'`; one → the single value), `code`→`fontFamily:'Courier'` + inline `backgroundColor` — **all
  merge into ONE style object** on the leaf `<Text>` (`bold`+`italic` = `<Text style={{fontWeight:'bold',fontStyle:'italic'}}>`,
  not nested spans). The ONE **element** mark is `link` → a react-pdf `<Link src={href}>` (accent color; `href` only, other
  attrs N/A in PDF): it **wraps** the styled `<Text>` and is always the OUTERMOST element (a deterministic, explicit
  nesting order — the only ordering decision react-pdf actually poses, since `code` is folded into the style object, not a
  separate element). `[FACT: current-spec.md E2 block set; to-markdown.ts wrapMark mark set {bold,italic,strike,underline,
code,link}; @react-pdf/renderer primitives Text/View/Image/Link/StyleSheet + style-merge model — verified at preflight]`
- **BR-E7-5 · Integration blocks render per `PdfSerializeOptions.integration_block_handling`.** A PDF has no invisible
  comment layer, so the markdown `'comment'` carrier has no visible meaning here — E7 **re-implements the E5 placeholder's
  VISUAL INTENT** (the label + "Available when its module ships") as a fresh react-pdf `<View>`+`<Text>` card for BOTH
  `'comment'` and `'placeholder'`, and omits the block for `'skip'`. It does **not** import `IntegrationBlockPlaceholder`
  (that is a Tamagui/DOM `NodeViewWrapper` with `role="note"` — none of which exists in a PDF). The label comes from
  **`INTEGRATION_BLOCK_COMMANDS`** (imported from the editor-local `../commands`, the SAME source `to-markdown.ts:11` reads
  via `INTEGRATION_LABEL` — `commands.ts` has no default export, the named `INTEGRATION_BLOCK_COMMANDS` is the source). No
  config is encoded (a PDF is not re-imported; and the bodies don't exist — BR-3). Reuses the existing
  `integration_block_handling` literal without a new enum `[FACT: integration-blocks.tsx:147 IntegrationBlockPlaceholder is
a NodeViewProps Tamagui component; to-markdown.ts:8,11 imports INTEGRATION_BLOCK_COMMANDS from ../commands; editor.ts:207
integration_block_handling; BR-3]`.
- **BR-E7-6 · Frontmatter → a header block.** When `options.frontmatter` is present, `toPdf` renders a title/metadata
  header at the top of page 1 (title from the map + `key: value` metadata lines) — the emit-side value carrier symmetric
  with E6's `MarkdownSerializeOptions.frontmatter?`. Absent → no header. Emit-only, so E6's stringly-typed round-trip
  caveat is N/A `[FACT: current-spec.md E6 frontmatter; @vida/types MarkdownSerializeOptions.frontmatter?]`.
- **BR-E7-7 · Pure tree builder + thin async render (testability split, the E6 `to`/`from` purity precedent).**
  `documentToPdfTree(doc, options)` is **pure/deterministic** (no `Date.now`/random, no IO) and returns the react-pdf
  React element tree (`<Document><Page>…`); `toPdf` = `pdf(documentToPdfTree(doc, options)).toBlob()`, the only async/IO
  seam. The tree is exhaustively unit-testable without producing bytes `[FACT: BR-E6-7 "pure, static, headless"; §XIX]`.
- **BR-E7-8 · Boundary + deps — ONE justified new TOP-LEVEL runtime dependency.** E7 adds **`@react-pdf/renderer@^4.6.1`**
  to `packages/editor/package.json` — the FIRST serializer that legitimately needs a dep (contrast E6, whose closed grammar
  needed none). Its React peer is satisfied by React 19. It is justified by ADR-001:101 at this gate. **Transitive footprint
  is expected and bundled by that one dep** (`@react-pdf/{layout,pdfkit,render,reconciler,font,primitives}` + `react-reconciler`
  - `queue`/`events`/`prop-types` etc.) — that heavier install is inherent to the ADR-mandated engine, NOT a second choice
    to justify; the "no OTHER new dep" gate (§4) means no other **top-level** editor dep, not a leaf tree. `to-pdf.tsx` imports
    only `@vida/types` + `@react-pdf/renderer` + editor-local `../commands` (`INTEGRATION_BLOCK_COMMANDS`, for labels, as E6
    did) + local `./pdf-theme`. **No `@vida/core`/app import** (BR-1, grep-gated) `[FACT: ADR-001:101; @react-pdf/renderer@4.6.1
peerDependencies.react = "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0" (React 19 satisfied); npm view @react-pdf/renderer@4.6.1
dependencies = the transitive tree above; BR-1]`.
- **BR-E7-8a · Colors are literal print-neutral constants — forced by the engine.** `@react-pdf/renderer` has **no CSS
  runtime**: it cannot read Tamagui theme vars / `--color*` (those resolve only in a browser DOM), so its styles must be
  literal color values `[FACT: @react-pdf/renderer StyleSheet takes literal style objects, no var() resolution]`. E7 uses
  a tiny local `pdf-theme.ts` of print-neutral literals (near-black text, gray borders, light code/callout surfaces).
  The repo "no hex" grep-gate targets the **Tamagui/CSS component surface**; the PDF engine's required literals are
  outside it (analogous to the DS token-pipeline source files legitimately holding values). Brand palette values are
  deferred with brand fonts (BR-E7-1 scope) `[INTERP: engine constraint + the DS-token-source precedent]`.
- **BR-E7-9 · Degrade, never throw.** An unknown node → best-effort `<Text>` of its inline text (never a throw); a
  missing/invalid image `src` → the block is skipped (or a stub), never a throw. `toPdf` returns a `Blob` (no `warnings`
  channel — same as `toMarkdown` returning a bare `string`); lossiness is inherent to a one-way presentation export
  `[FACT: BR-E6-9 degrade-never-throw; to-markdown.ts returns bare string]`.

## 3. Contract

A pure tree builder + one async render function (no component; no §VIII states, no motion, no a11y surface — this unit
renders no interactive UI; the PDF's own accessibility tags are out of M1.0 scope).

```ts
// packages/editor/src/serializers/to-pdf.tsx
export function toPdf(doc: EditorDocument, options: PdfSerializeOptions): Promise<Blob>
// internal, exported for tests. Typed `ReactElement<DocumentProps>` (not bare ReactElement) so a builder that forgets the
// `<Document>` root fails at COMPILE time and it slots into `pdf()`'s `ReactElement<DocumentProps>` param without a cast.
export function documentToPdfTree(doc: EditorDocument, options: PdfSerializeOptions): React.ReactElement<DocumentProps>
```

- **One additive `@vida/types` change** (the E6 additive-field precedent — BR-7 permits E7 EXTENDING `@vida/types`, not
  redefining it): add `PdfSerializeOptions` alongside `MarkdownSerializeOptions` in `packages/types/src/editor.ts`:
  ```ts
  export interface PdfSerializeOptions {
    /** Integration-block rendering; reuses the Markdown handling literal (no new enum). 'comment'≡'placeholder' in PDF. */
    integration_block_handling: 'comment' | 'skip' | 'placeholder'
    /** Emit-side header values (title/date/tags/…) rendered as a page-1 header block. Symmetric with MarkdownSerializeOptions.frontmatter. */
    frontmatter?: Record<string, unknown>
  }
  ```
  Additive + optional-where-possible; touches no runtime, breaks no caller (nothing imports a PDF type yet).
- Types imported from `@vida/types` (`EditorDocument`, `EditorNode`, `EditorMark`, `PdfSerializeOptions`), re-exported by
  the barrel, never redefined (BR-7).
- Barrel: add `export { toPdf } from './serializers/to-pdf'` to `packages/editor/src/index.ts`; add `PdfSerializeOptions`
  to the re-exported `@vida/types` type list.

## 4. Acceptance

- [ ] **Total tree coverage (the primary gate — BR-E7-4/7):** `documentToPdfTree` over a fixture set covering **all 11
      `STANDARD_BLOCK_TYPE` nodes** (+ nesting: list-in-list, marks-in-heading, table with inline marks, callout with
      children, all 6 marks incl. `strike`+`underline` combined-`textDecoration` and a `link` wrapping a styled `<Text>`,
      and `hardBreak`) produces the expected react-pdf element structure — asserted on `element.type` against the
      **imported react-pdf component identity** (`el.type === Text`/`View`/`Link`/…; verified at preflight — `@react-pdf/renderer`
      re-exports the primitives as `React.Component` CLASSES, so `<Text>`'s `element.type` is the `Text` class, NOT a string
      constant) + key style props + children, with NO byte rendering. A schema-parity assertion confirms every
      `STANDARD_BLOCK_TYPE` value appears in ≥1 fixture (no silent gap).
- [ ] **Registered-schema coverage (the BR-E6-3 precedent):** fixtures cover the marks/nodes beyond the block enum —
      `bold`/`italic`/`strike`/`code`/`link` (href → `<Link src>`)/`underline` + `hardBreak`. Faithful over the SCHEMA.
- [ ] **Render smoke:** `toPdf(kitchenSinkDoc, opts)` resolves to a `Blob` whose leading bytes are `%PDF-`; it does not
      throw. (Test env confirmed at preflight: Node 22 has a global `Blob`, so `pdf().toBlob()` runs in the default test env
      — no jsdom-vs-node entry problem; the pure-tree test remains the primary exhaustiveness gate regardless.)
- [ ] **`@vida/types` additive change:** `PdfSerializeOptions` added; `pnpm --filter @vida/types typecheck` green;
      `@vida/core` enum-parity unaffected (no enum touched); no existing caller breaks.
- [ ] **Integration handling:** `'skip'` omits the block; `'placeholder'`/`'comment'` render the placeholder card
      (label present). A test per mode (BR-E7-5).
- [ ] **Frontmatter:** `options.frontmatter` present → a header block (title/metadata) in the tree; absent → none (BR-E7-6).
- [ ] **Degradation:** an unknown node → best-effort `<Text>`, never a throw; a missing image `src` → skipped, never a
      throw (BR-E7-9).
- [ ] **Purity/determinism:** `documentToPdfTree` runs with no IO and is deterministic (no `Date.now`/random) — same doc
      → structurally identical tree (BR-E7-7).
- [ ] **Boundary:** `to-pdf.tsx` imports only `@vida/types` + `@react-pdf/renderer` (+ local `../commands`/`./pdf-theme`);
      no `@vida/core`/app import (grep-gated).
- [ ] **Hex quarantine (BR-E7-8a):** any literal color hex lives ONLY in `serializers/pdf-theme.ts` — grep-gated that no
      raw hex leaks into `to-pdf.tsx`'s block/mark logic. The no-CSS-var engine forces literals; they stay confined the way
      the CSS-surface gate confines the component layer.
- [ ] **The ONE new TOP-LEVEL runtime dependency is `@react-pdf/renderer`, justified (BR-E7-8):** present in
      `packages/editor/package.json`; no OTHER top-level new dep (its transitive tree is expected/bundled). (Contrast E6's
      zero-dep rule — E7's dep is the ADR-001:101 mandate.)
- [ ] `pnpm --filter @vida/editor typecheck && build && test` green (editor test count ↑ from **155**); root typecheck 11/11.
- [ ] **No Visual Gate** — E7 renders no `@vida/ui` component surface (a serializer), the E6 render-table classification.
      Stated explicitly `[FACT: e6 serialization-spec.md:69 "no component surface → no Visual Gate"]`.
- [ ] §XXIX currency: `docs/editor/serialization-spec.md` extended with the E7 section (E6 filled it) +
      `current-spec.md`/`current-business-rules.md` E7 sections + `packages/editor/src/CLAUDE.md`.

## 5. Implementation Prompt (settled → the IMPLEMENTATION-PLAN at gate-2)

Build order (tree builder first — the render is a one-line seam over it):

1. **Dep + version** — add `@react-pdf/renderer@^4.6.1` to `packages/editor/package.json` deps; `0.6.0 → 0.7.0`;
   `pnpm install`. (Preflight installs + verifies the primitive API against its `.d.ts`, the E4/E6 preflight discipline.)
2. **`@vida/types`** — add `PdfSerializeOptions` (additive, §3) + export; extend the barrel re-export list.
3. **`serializers/pdf-theme.ts`** — the tiny print-neutral literal palette + `StyleSheet.create` block styles + font
   sizes per heading level (BR-E7-8a). Built-in fonts only (Helvetica body / Courier code) — no `Font.register`.
4. **`serializers/to-pdf.tsx`** — **rename the 0-byte stub `to-pdf.ts` → `to-pdf.tsx`** first (JSX for react-pdf
   primitives, the E5 node-view `.tsx` precedent; confirm `tsc --build` + the extensionless barrel resolve `.tsx`). Then
   `documentToPdfTree` (the total tree-walk: block handlers per BR-E7-4 + an inline/mark pass — style-marks merged into one
   `<Text>` style object, `link` as the outermost `<Link>` element — + integration/callout/frontmatter per BR-E7-5/6)
   returning `<Document><Page>…`; then `toPdf = (doc, options) ⇒ pdf(documentToPdfTree(...)).toBlob()`. Pure builder, thin
   async render.
5. **Tests** — `serializers/to-pdf.test.tsx`: pure-tree assertions (all 11 blocks + marks + hardBreak + schema-parity) +
   the `%PDF-` render smoke + the 3 integration modes + frontmatter + degradation.
6. **Barrel export** `toPdf` + §XXIX doc currency (serialization-spec.md E7 section, current-\*, CLAUDE.md).

- Follow the enum/schema, not prose (the E2/E6 precedent). Cite code for every mapping. Deterministic builder; no `Date.now`.

## 6. Open UNKNOWNs / Decisions — ALL DECIDED BY DOCS (no open fork)

Per Victor (2026-08-15): the contract is fully determined; nothing here is an open choice. Each row cites its resolver.

- [DECIDED — ADR-001:101] mechanism = `@react-pdf/renderer`; **web/desktop target, mobile=`expo-print` OUT of UI-3 scope**
  (`_index.md:119-120`). No new ADR. → dissolves any "platform-boundary / lazy-import / subpath" question (there is no
  mobile consumer to isolate). `[FACT: ADR-001:101,263; _index.md:119-120]`
- [DECIDED — engine] signature = `Promise<Blob>` (async binary) — `@react-pdf/renderer` renders a byte stream; there is
  no sync/string form to pick. `[FACT: @react-pdf/renderer@4.6.1 API]`
- [DECIDED — e6 precedent] **NO Visual Gate** (a serializer has no `@vida/ui` component surface — the render-table
  classification E6 established). No optional-eyeball "decision". `[FACT: e6 serialization-spec.md:69]`
- [DECIDED — e6 precedent + BR-7] options live in `@vida/types` as an additive `PdfSerializeOptions` (mirrors
  `MarkdownSerializeOptions`); `integration_block_handling` reuses the existing literal (no new enum). `[FACT: @vida/types
editor.ts:197-209; BR-7]`
- [DECIDED — BR-E7-2] no round-trip (emit-only; BR-5 is E6's). `[FACT: e6-markdown-serializers.md:14]`
- [DECIDED — scope + ds-2 note] built-in fonts + print-neutral literals; brand fonts/palette deferred. `[FACT: ADR-001:101
built-in engine fonts; ds-2 palette provisional]`
- [DECIDED — BR-E7-8] exactly ONE new runtime dep (`@react-pdf/renderer`, the ADR-001 mandate); nothing else.

## 7. Change Log

| Date       | Session                | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-15 | ui-3-e7-pdf-serializer | PLAN authored: PDF serializer grounded in ADR-001:101 (`@react-pdf/renderer`, web/desktop; mobile=expo-print OUT of scope). Reuses the E6 tree-walk MODEL → react-pdf elements; emit-only (no round-trip — BR-5 is E6's). BR-E7-1..9: async `Promise<Blob>` signature (engine-intrinsic), total schema-tree-walk, integration→placeholder-card per handling, frontmatter→header, pure builder + thin async render (testability split), ONE justified new dep `@react-pdf/renderer`, print-neutral literals (engine has no CSS runtime), degrade-never-throw. Additive `PdfSerializeOptions` in `@vida/types`. **All "decisions" DECIDED by docs (Victor's steer) — §6 cites each resolver; no open fork.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-08-15 | ui-3-e7-pdf-serializer | **Approval 2 → IMPLEMENTED → `@vida/editor` v0.6.0→v0.7.0.** `serializers/to-pdf.tsx` (pure `documentToPdfTree` + thin async `toPdf`) + `serializers/pdf-theme.ts` (quarantined print literals + StyleSheet) + `to-pdf.test.tsx` (33 tests) + barrel + additive `PdfSerializeOptions` in `@vida/types`. Renamed the 0-byte `to-pdf.ts`→`.tsx`. GREEN: editor **188/188** · root typecheck 11/11 · build ✓ · boundary clean · hex confined to `pdf-theme.ts` · one top-level dep `@react-pdf/renderer@4.6.1`. **DEV note (§XXVIII mechanical):** `@vida/types` dist had to be rebuilt before the editor typechecks the new type (source-vs-dist).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-08-15 | ui-3-e7-pdf-serializer | **Post-impl /critique REVISE → resolved** (independent reviewer drove real bytes through every nesting path; render/degradation verified SOUND — no throw on any mapping). Fixed 2 material bugs the green tree-tests hid, each now a regression test: **M1** a non-paragraph block in a table cell (e.g. a list — `tableCell` is `block+`) was forced through the inline-only `renderInline` → text SILENTLY DROPPED; now recurses via `renderBlock` (the E6 `to-markdown.ts:175` precedent). **M2** a non-numeric `orderedList.start` → `NaN.` markers; now `Number.isFinite`-guarded (matches `clampLevel`). Minors: **m1** empty `frontmatter:{}` emitted a stray header divider → gate on non-empty map; **m2** `title` array coercion routed through `frontmatterValue` for comma-space parity. Added a nested-constructs byte-render smoke. **Scope refinement:** BR-E7-9's degrade-never-throw is a TREE-level guarantee — a present-but-CORRUPT image src throws at react-pdf render time (pdfkit "Incomplete/corrupt PNG"), which is the caller's contract (app resolves valid `note_attachments` srcs, BR-E2-5); the byte smoke therefore renders no real image (the `<Image>` element + empty-src skip are proven structurally). |
| 2026-08-15 | ui-3-e7-pdf-serializer | **/critique gate-2 SHIP** (fresh independent critic; verified ALL gate-1 + preflight fixes landed against the installed package + live types — B1 peer range, GAP-P1 imported-identity assertion [string-constant purged to negations only], M1 style-merge model with `'underline line-through'` confirmed valid in the installed `TextDecoration` union, M2 hardBreak row, B3 `INTEGRATION_BLOCK_COMMANDS` export name, B2/M4/M5). **Two render-fidelity traps probed + resolved by the ENGINE, not left open:** (1) `bold`+`code` needs no `Font.register` — `@react-pdf/font@4.0.10` pre-declares `Courier`/`Courier-Bold`/`-Oblique`/`-BoldOblique` (+ Helvetica), auto-resolved; (2) `<Link>` legally nests inside `<Text>` (d.ts:317-319), so the M1 `link`-outermost tree is valid. No new blocker. Folded **M-1** (tighten `documentToPdfTree` return to `React.ReactElement<DocumentProps>` — a missing `<Document>` root now fails at compile time); M-2 (render-smoke is the sole byte assertion) disclosed, no change.                                                                                                                                                                                                          |
| 2026-08-15 | ui-3-e7-pdf-serializer | **/preflight PASSED** (API verified against the INSTALLED `@react-pdf/renderer@4.6.1` `.d.ts`, not training data — installed the dep, +59 transitive pkgs confirming B2). Confirmed: `pdf(el).toBlob(): Promise<Blob>` (d.ts:764); `Document/Page/Text/View/Image/Link/StyleSheet/Font` all export; `StyleSheet.create<T>(styles):T`; Style keys `fontWeight/fontStyle/textDecoration/backgroundColor/fontFamily/fontSize/color` all present; `Link` has `src`+`href` and "can be nested inside a Text" (BR-E7-4 valid); render-smoke env resolved — Node 22 has global `Blob` so `toBlob()` runs in the default test env (m2 closed). **GAP-P1 (self-catch): the gate-1 M1 fix was itself wrong** — primitives are exported `React.Component` CLASSES, so tests assert `element.type === Text` (imported identity), NOT string constants `'TEXT'`; spec corrected. No open UNKNOWN remains; contract complete + testable.                                                                                                                                                                                                                                                                                                                   |
| 2026-08-15 | ui-3-e7-pdf-serializer | **/critique gate-1 REVISE → resolved** (independent adversarial critic; architecture/ADR-grounding/scope verified SOUND, no manufactured hazard). **B1** fabricated React-peer cite (`^19`) → restated to the real range `"^16.8.0 \|\| … \|\| ^19.0.0"` (React 19 satisfied). **B2** clarified `@react-pdf/renderer` bundles a heavy transitive tree — the gate means no other TOP-LEVEL dep. **B3** integration placeholder is RE-IMPLEMENTED as react-pdf `<View>`/`<Text>` (label from `INTEGRATION_BLOCK_COMMANDS`), NOT an import of the Tamagui `IntegrationBlockPlaceholder`. **M1** replaced E6's string "innermost→outermost" mark-nesting with the react-pdf composition rule (style-marks merge into one `<Text>` style object; `link` is the outermost `<Link>` element; `strike`+`underline`→combined `textDecoration`). **M2** added the `hardBreak` mapping-table row (`{"\n"}`). **M3** `codeBlock` verbatim = one `<Text>` per `\n`-split line. **M4** added a hex-quarantine acceptance gate (literals confined to `pdf-theme.ts`). **M5** build-order now renames `to-pdf.ts`→`.tsx`. **m1** tests assert react-pdf string-constant `element.type`.                                                                      |
