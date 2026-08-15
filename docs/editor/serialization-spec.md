# @vida/editor — serialization spec (ground truth)

> Durable description of the E6–E8 serializers as built (§XXIX Currency Rule). Refreshed per unit; never lags the code.
> Scope today: **E6 — Markdown (to + from)**. E7 (PDF) / E8 (DOCX) extend this file. Forward spec:
> `docs/specs/features/ui-3-vida-editor/e6-markdown-serializers.md`.

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
| node / mark | Markdown | notes |
|-------------|----------|-------|
| paragraph | text + inline | each line's leading block-marker (`---`/`#`/`-`/`\d.`/`\|`/`>`) escaped so prose ≠ block |
| heading | `#`×level (ATX) | level 1–6 clamped |
| bulletList / listItem | `- ` (nested = 2-space indent) | multi-paragraph & nested-list items round-trip |
| orderedList | `1.`,`2.`… | `attrs.start` honored |
| taskList / taskItem | `- [ ]` / `- [x]` | GFM; `checked` round-trips |
| blockquote | `> ` line prefix | nested blocks recurse |
| codeBlock | ` ```lang ` **variable-length** fence | fence = longest inner backtick-run + 1 (min 3) so an inner ``` can't close early |
| horizontalRule | `---` | |
| image | `![alt](src "title")` | `]` in alt, `)`/`"` in src/title escaped |
| table | GFM pipe table (header + `---` delimiter) | cells inline-only; `\|` escaped; cell attrs `{colspan:1,rowspan:1,colwidth:null}` |
| callout | `<div data-type="callout" data-variant="…">…</div>` | HTML carrier (no MD callout syntax); `variant` round-trips |
| **marks** | bold `**` · italic **`_`** · strike `~~` · code `` ` `` (variable fence) · underline `<u>` · link `[t](href)` | italic uses `_` (not `*`) so bold+italic `**_x_**` is unambiguous; bold is always the OUTER mark |
| hardBreak | two trailing spaces + `\n` | |
`[FACT: to-markdown.ts serializeBlock/renderTextNode; from-markdown.ts parseBlocks/parseInline]`

- **Inline escaping.** Non-code text escapes `` \ ` * _ [ ] < > ~ ``; the parser inverts each via a generic `\X`→`X`
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

## Verify
`pnpm --filter @vida/editor test` (`serializers.test.ts` — 34 tests: 24 JSON→md→JSON round-trip fixtures covering all 11
standard blocks + every registered mark + hardBreak + the nested-emphasis / escaped-metacharacter / HR-collision /
image-bracket / href-paren / code-fence / comment-entity stress cases, plus the 3 handling modes, frontmatter, and
degradation). Pure — no editor/DOM. `[FACT: serializers.test.ts]`
