# Spec: feature:ui-3-vida-editor · E6 — markdown serializers (`to` + `from`)
<!-- type = feature (sub-unit of UI-3) -->
Status: implemented      <!-- draft → approved → implemented -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-08-14-ui-3-e6-markdown-serializers (PLAN authored this session).
Parent: `_index.md` (UI-3 umbrella) — this sub-spec refines the umbrella §5 **E6** row + BR-5.

---

## 1. Identity
E6 is the **Markdown serializer pair** for `@vida/editor`: the two pure functions that turn an `EditorDocument`
(TipTap JSON) into Markdown and back. It is the first of the three export units (E6 md → E7 PDF → E8 DOCX) and the
only one with a **round-trip** obligation `[FACT: _index.md:134; ADR-001:100]`.

- **The two exports** (signatures already fixed in `@vida/types`, E6 IMPLEMENTS, does not invent — BR-7):
  - `toMarkdown(doc: EditorDocument, options: MarkdownSerializeOptions): string`
  - `fromMarkdown(markdown: string, options?: MarkdownSerializeOptions): MarkdownParseResult`
  `[FACT: packages/types/src/editor.ts:197-209]` — `MarkdownSerializeOptions {include_frontmatter, integration_block_handling}`,
  `MarkdownParseResult {document, frontmatter, warnings}`.
- **Files:** the two 0-byte stubs `packages/editor/src/serializers/to-markdown.ts` +
  `packages/editor/src/serializers/from-markdown.ts`, exported from the package barrel `index.ts`
  `[FACT: ls packages/editor/src/serializers/*; wc -l = 0]`.
- **Built as ONE unit** — the emitter and parser are co-designed against a shared round-trip fixture set; splitting
  them would let the identity invariant drift `[FACT: _index.md:134 "round-trip co-designed"]`.

- **What it is NOT (deferred / out of scope — grounded):**
  - **NOT PDF/DOCX** — E7/E8, separate deps `[FACT: _index.md:135-136]`.
  - **NOT the app export wiring.** The `export-dialog` `onExport(format)` consumer (UI-2 ✅) calls these functions;
    E6 only PROVIDES them. No app/route change `[FACT: export-dialog.tsx:28; BR-1 boundary]`.
  - **NOT the live integration-block bodies.** E6 serializes the *placeholder* nodes E5 registered (their `attrs`
    JSON), not any module data. `[FACT: current-spec.md E5 §; BR-3]`
  - **NOT the encrypted attachment resolution for images.** `image` serializes its `src`/`alt` as-authored;
    resolving an encrypted `note_attachments` URL is the app's deferred pipeline (BR-E2-5). `[FACT: current-business-rules.md BR-E2-5]`

## 2. Business Rules (E6-specific — inherit umbrella BR-1..BR-7)

- **BR-E6-1 · CUSTOM serializer — no off-the-shelf markdown bridge.** ADR-001 §8 fixes the mechanism: *"Markdown
  serialization | Custom serializer (TipTap JSON ↔ Markdown) | Round-trip lossless"* `[FACT: ADR-001:100]`. E6 owns
  the JSON↔Markdown mapping. **Rejected alternatives** (all reopen a settled ADR / lose data — recorded, not taken):
  `@tiptap/markdown` (MarkdownManager) owns the whole mapping = contradicts "custom"; a PM→HTML→md path (`turndown`)
  drops the E5 config attrs (they are `rendered:false`, absent from the HTML DOM — BR-E5-5) `[FACT: current-business-rules.md
  BR-E5-2/BR-E5-5]`. The module `@tiptap/markdown` existing now is a downstream shape, not grounds to reopen ADR-001.
- **BR-E6-2 · The lossless invariant is `fromMarkdown ∘ toMarkdown = identity` on the JSON side, over
  `STANDARD_BLOCK_TYPE`.** i.e. `fromMarkdown(toMarkdown(doc)).document ≡ doc` for any document built only from the
  11 standard blocks + supported marks. **The reverse (`toMarkdown ∘ fromMarkdown` on a markdown STRING) is NOT claimed
  identity** — Markdown has many equivalent spellings (`*`/`-`/`+` bullets, `#`-vs-setext headings, `*`/`_` emphasis),
  so `fromMarkdown` NORMALIZES to canonical JSON and `toMarkdown` emits ONE canonical spelling. This is the meaningful,
  testable direction: a doc authored in the editor survives an export→reimport. **The umbrella BR-5 was amended
  2026-08-14 to state this same JSON-side invariant** (its earlier "`to ∘ from`" wording named the composition
  backwards and was unsatisfiable) — umbrella and this sub-spec now agree `[FACT: _index.md BR-5 + Change Log 2026-08-14;
  ADR-001:100 "round-trip lossless"]`.
- **BR-E6-3 · Emitter = a total tree-walk over `EditorNode`.** `toMarkdown` walks `doc.content` with one handler per
  `STANDARD_BLOCK_TYPE` node + one per **mark actually registered in the schema**. **Implement the schema, not just the
  block enum** (the BR-E2-1 precedent): `STANDARD_BLOCK_TYPE` names 11 BLOCK types, but bare `StarterKit@3.30.0`
  (enabled unconfigured at `editor.tsx:128`) ALSO registers the marks `bold`/`italic`/`strike`/`code`/**`link`**/
  **`underline`** and the inline node **`hardBreak`** `[FACT: @tiptap/starter-kit@3.30.0 package.json bundles
  extension-{link,underline,hard-break}; editor.tsx:128 bare StarterKit]`. E6 must round-trip ALL of them:
  - marks → `bold`→`**`, `italic`→`*`, `strike`→`~~`, `code`→`` ` ``, `link`→`[text](href)` (**`href` only; `target`/
    `rel`/`class` attrs are lossy in Markdown → push a `warning`**), `underline`→**`<u>…</u>`** HTML span (no Markdown
    syntax; underline IS registered so this is required, not optional — §5, folds into the M1 inline-HTML pass).
  - `hardBreak` (Shift+Enter) → **two trailing spaces + `\n`** (GFM hard break); parsed back from a trailing-2-space or
    `\`-newline line end. NOT in `STANDARD_BLOCK_TYPE` but present in real docs — mapping it is required for true
    losslessness (the preflight GAP-2 catch).
  Every registered node/mark has a handler; anything with no handler routes to BR-E6-5 (never silently dropped).
  **Exhaustiveness (gate-2 NM-1):** the remaining bare-StarterKit registrations — `trailingNode`, `undoRedo`,
  `dropcursor`, `gapcursor` — are non-schema/non-content plugins (`trailingNode` only appends a `paragraph`, already
  covered), so they contribute NO node/mark type to serialize; the handled set above is therefore complete over the
  live schema. `[FACT: editor.ts STANDARD_BLOCK_TYPE:12-24; @tiptap/starter-kit@3.30.0 deps incl. trailing-node as an
  Extension not a Node; current-spec.md E3 mark set]`
- **BR-E6-4 · Block coverage (the 11) maps to canonical Markdown / GFM:**
  | node | Markdown emitted | parse source |
  |------|------------------|--------------|
  | `paragraph` | text + inline marks | plain line(s) |
  | `heading` | `#`×level (ATX) | `#`.. (ATX; setext→normalized to ATX) |
  | `bulletList`/`listItem` | `- ` (nested = 2-space indent) | `-`/`*`/`+` |
  | `orderedList` | `1.`,`2.`… | `\d+.` |
  | `taskList`/`taskItem` | `- [ ]` / `- [x]` (GFM) | `- [ ]`/`- [x]` |
  | `blockquote` | `> ` | `> ` |
  | `codeBlock` | ` ```lang ` fence | fenced ` ``` ` / `~~~` |
  | `horizontalRule` | `---` | `---`/`***`/`___` |
  | `image` | `![alt](src)` | `![]()` |
  | `table` | GFM pipe table (header + `---` delimiter row) | GFM pipe table |
  | `callout` | HTML block `<div data-type="callout" data-variant="…">…</div>` (round-trips `variant`; Markdown has no
    callout syntax — HTML is the lossless carrier, emitting the SAME shape E2's `renderHTML` produces) | a bespoke
    E6 HTML-block mini-parser (see note) |
  `[FACT: current-spec.md E2 "renders/parses `<div data-type=callout data-variant>`"; callout.ts]`
  > **Headless HTML note (M1).** E6 is a pure string parser with **no `Editor`/DOM** (BR-E6-7), so it CANNOT reuse
  > TipTap's `parseHTML`. `fromMarkdown` owns a small HTML-block recognizer for the two `data-type` values it may meet:
  > `data-type="callout"` → reconstruct the `callout` node (read `data-variant`, recurse into children); and a
  > hand-authored `data-type="integration-block"` div → route by `data-block-type` (normally integration blocks arrive
  > via the `<!-- vida:integration -->` comment path, not a div — the div branch is a tolerance case). The `data-type`
  > attribute is the discriminator. Inline `<u>…</u>` (underline, see §5) is recognized by the same inline HTML pass.
- **BR-E6-5 · Integration blocks serialize per `MarkdownSerializeOptions.integration_block_handling`** (default
  `'placeholder'` `[FACT: editor.ts:201 default is the app's; the option is REQUIRED on `MarkdownSerializeOptions` — the
  caller supplies it]`). This is where the E5-deferred config codec lands (BR-E5-5):
  - `'comment'` — emit an HTML comment carrying type + config JSON:
    `<!-- vida:integration type="chartBlock" config='{"chartType":"bar",…}' -->`. **Lossless for the DECLARED schema**
    (mirroring BR-E5-2's exact scope): the **7 typed capabilities** round-trip their full declared `attrs`; the **4
    schema-less types** (`eventsBlock`/`classesBlock`/`backlink`/`milestoneBlock`) register attr-less, so `'comment'`
    round-trips their **type identity only** — there are no declared attrs to lose (an undeclared attr never survives
    E5's ProseMirror load either, BR-E5-3). Config is read straight from `node.attrs` (we have the JSON; no HTML-DOM
    detour, so `rendered:false` is a non-issue). `[FACT: current-business-rules.md BR-E5-2 "lossless for the DECLARED
    schema" + BR-E5-3; the 4 schema-less types :134-135]`
  - `'skip'` — omit the block entirely; push a `warning` (`"skipped integration block: <type>"`). **Lossy by request.**
  - `'placeholder'` — emit a visible marker line (`> **[<label>]** — integration block`); push a `warning` that config
    was not preserved. **Lossy.** `fromMarkdown` does NOT reconstruct a node from a placeholder line (it is prose).
  - Only `'comment'` participates in the BR-E6-2 identity invariant; `'skip'`/`'placeholder'` are declared-lossy and the
    round-trip test asserts a `warning` is emitted, not identity. `[INTERP: editor.ts:197-209 + BR-5]`
- **BR-E6-6 · Frontmatter is gated by `include_frontmatter`; its VALUES need a carrier the types don't yet have
  (preflight GAP-1).** Today `MarkdownSerializeOptions` is `{include_frontmatter, integration_block_handling}` and
  `EditorDocument` has NO metadata field `[FACT: editor.ts:165-168,197-202]` — so `include_frontmatter:true` has no
  value source on the EMIT side (the flag is dead as-is). **Resolution:** add one additive optional field to
  `@vida/types` — `MarkdownSerializeOptions.frontmatter?: Record<string, unknown>` — **symmetric** with the existing
  `MarkdownParseResult.frontmatter` (parse already returns it). This is an ADDITIVE extension of the shared contract
  (not a redefine — BR-7 permits E6 extending `@vida/types`), following the `@vida/types` enum-tuple/JSDoc discipline
  `[FACT: packages/types/src/CLAUDE.md]`. When `include_frontmatter && options.frontmatter`, `toMarkdown` prepends the
  YAML `---` fence from that map; **E6 owns only serialize/parse of the fence, not WHICH keys** — the app supplies
  title/date/tags. When the flag is false or the map is absent, no fence. **Scalar fidelity (post-impl M4):** flat YAML
  is stringly-typed — a numeric/boolean value round-trips as its STRING form (`5`→`"5"`, `true`→`"true"`); lists round-trip
  as `string[]`. This is declared-lossy and out of the BR-E6-2 invariant (which binds the DOCUMENT side only); callers
  needing typed metadata coerce on their side. `fromMarkdown` parses a leading
  `---`…`---` fence into `MarkdownParseResult.frontmatter` (flat `key: value` + `key: [a, b]` lists ONLY; a full YAML lib
  is out of scope — the frontmatter is flat by construction). Any nested YAML it can't represent → a `warning`, not a
  throw (BR-E6-9 degrade). When false, no fence; `frontmatter: null`.
  `[FACT: editor.ts:199,206 include_frontmatter + MarkdownParseResult.frontmatter]`
- **BR-E6-7 · Pure, static, headless.** Both functions are pure (`EditorDocument`/`string` in, value out) — **no
  `Editor` instance, no DOM, no React** — so export runs in a Web Worker / Node / test without mounting an editor.
  Deterministic (no `Date.now`/random). `[FACT: editor.ts signatures are data-only; ADR-001 "custom serializer"]`
- **BR-E6-8 · Boundary + deps — no lexer, unconditionally (the manufactured-hazard is DISSOLVED).** Files live in
  `packages/editor/src/serializers/`; import only `@vida/types` (+ editor-local helpers). **No `@vida/core`/app import**
  (BR-1). **No new runtime dependency, period.** The earlier "hand-rolled parsing might need a §XXVIII lexer fallback for
  nested emphasis / escaping" was a **manufactured hazard** (the E5 D-7 pattern — a gate correctly names a concern, but
  the documented design already answers it, so the fix is to apply it, not defer a fallback). Why it's dissolved: E6
  controls **both** ends and `toMarkdown` emits ONE **canonical, closed** spelling (BR-E6-2), so `fromMarkdown`'s
  round-trip grammar is a **closed set = exactly what `toMarkdown` produces** — the general-GFM ambiguity that motivates
  a lexer (arbitrary `*`/`_`/`***` nesting, arbitrary escaping) **never arises on the round-trip path**; the emitter
  chooses an unambiguous canonical form (e.g. bold+italic → a single deterministic delimiter order; a literal `*`/`|`
  is emitted pre-escaped, so the parser meets only escapes IT wrote). Arbitrary *outside* markdown that doesn't match the
  canonical grammar is not parsed exactly — it **degrades** (BR-E6-9), which is the contract, not a failure. The two
  stress fixtures (2-level emphasis, escaped metacharacters) therefore **pass by construction** and remain as regression
  guards, not as a lexer trigger. `[FACT: BR-E6-2 canonical normalization + BR-E6-9 degrade; ADR-001:100 "custom
  serializer, round-trip lossless"; the E5 D-7-DISSOLVED precedent, e5-block-registry.md:289-293]`
- **BR-E6-9 · `warnings` is the lossy channel; parse never throws on unknown input.** `fromMarkdown` on unrecognized
  constructs degrades: unknown block → a `paragraph` of its raw text + a `warning`; it never throws. `toMarkdown` on a
  node with no handler (e.g. a future block) → a `warning` + best-effort text, never a throw. `[FACT: editor.ts:207-208
  warnings; current-business-rules.md BR-E5-3 "degrade, never crash"]`

## 3. Contract
Pure module functions (no component; no §VIII states, no motion, no a11y surface — this unit renders nothing).

```ts
// packages/editor/src/serializers/to-markdown.ts
export function toMarkdown(doc: EditorDocument, options: MarkdownSerializeOptions): string

// packages/editor/src/serializers/from-markdown.ts
export function fromMarkdown(markdown: string, options?: MarkdownSerializeOptions): MarkdownParseResult
```
- Types imported from `@vida/types` (`EditorDocument`, `MarkdownSerializeOptions`, `MarkdownParseResult`) — re-exported
  by the barrel if not already; not redefined (BR-7).
- **One additive `@vida/types` change (preflight GAP-1):** add `frontmatter?: Record<string, unknown>` to
  `MarkdownSerializeOptions` (`packages/types/src/editor.ts:197-202`) — the emit-side value carrier, symmetric with
  `MarkdownParseResult.frontmatter`. Additive + optional (no existing caller breaks). This is the ONE cross-package edit
  E6 makes; it touches no runtime, only the type.
- `options` on `fromMarkdown` is optional (parse needs only `integration_block_handling` to interpret `'comment'`
  blocks; `include_frontmatter` is auto-detected by a leading `---`). **This default is owned by E6, not the type** —
  `MarkdownSerializeOptions.integration_block_handling` is a REQUIRED field with no type-level default (`editor.ts:201`);
  E6 supplies `{integration_block_handling:'placeholder', include_frontmatter:false}` when the arg is omitted.
- Barrel: add `export { toMarkdown } from './serializers/to-markdown'` + `export { fromMarkdown } from
  './serializers/from-markdown'` to `packages/editor/src/index.ts`.

## 4. Acceptance
- [ ] **BR-5 property test (the sole umbrella gate for E6):** a fixture set covering **all 11 `STANDARD_BLOCK_TYPE`
      nodes** (+ nesting: list-in-list, marks-in-heading, table with inline marks, callout with children, **2-level
      emphasis nesting `**a *b***`, and escaped inline metacharacters `\*literal\*` + a `\|`-escaped table cell** — the
      two cases where hand-rolled markdown silently loses data, M2/M3) asserts `fromMarkdown(toMarkdown(doc, opts)).document`
      deep-equals `doc` (JSON→md→JSON identity, BR-E6-2). A schema-parity assertion confirms every `STANDARD_BLOCK_TYPE`
      value appears in ≥1 fixture (no silent gap). `[FACT: _index.md:109-110]`
- [ ] **Registered-schema coverage (preflight GAP-2):** fixtures also cover the marks/nodes StarterKit registers beyond
      the block enum — `link` (href round-trips; `target`/`rel` → `warning`), `underline` (`<u>` round-trip), and
      `hardBreak` (two-space+`\n` round-trip). Losslessness is over the SCHEMA, not just `STANDARD_BLOCK_TYPE`.
- [ ] **`@vida/types` additive change (preflight GAP-1):** `MarkdownSerializeOptions.frontmatter?` added; `pnpm --filter
      @vida/types typecheck` green + `@vida/core` enum-parity unaffected (no enum touched); no existing caller breaks.
- [ ] **Integration handling:** `'comment'` round-trips a node + its `attrs` (identity for the 7 typed capabilities);
      `'skip'` omits + warns; `'placeholder'` emits a marker + warns. A test per mode. `[FACT: editor.ts:201]`
- [ ] **Frontmatter:** `include_frontmatter:true` emits+parses a YAML fence into `frontmatter`; `false` → `null`. Test both.
- [ ] **Degradation:** `fromMarkdown` on arbitrary non-Vida markdown returns a valid `EditorDocument` + `warnings`,
      never throws; `toMarkdown` on an unknown node warns, never throws (BR-E6-9).
- [ ] **Purity/headless:** both functions run with NO editor/DOM in the test (Node/jsdom-free path). Deterministic.
- [ ] **Boundary:** `serializers/*` import only `@vida/types` (+ local helpers); no `@vida/core`/app import (grep-gated).
- [ ] **No new runtime dependency** in `packages/editor/package.json` (BR-E6-8) — unconditional; the closed-grammar
      round-trip needs no lexer (the dissolved hazard). A dep addition here is a spec violation, not a fallback.
- [ ] `pnpm --filter @vida/editor typecheck && build && test` green (editor test count ↑ from 121); root typecheck 10/10.
- [ ] **No Visual Gate** — E6 renders nothing (a serializer). Stated explicitly (the render-table classification: this
      unit has no component surface). `[INTERP: frontend-visual-gate applicability = rendered component]`
- [ ] §XXIX currency: `docs/editor/serialization-spec.md` (0-byte) filled + `current-spec.md`/`current-business-rules.md`
      extended with the E6 section + `extension-catalog.md`/`CLAUDE.md` if touched.

## 5. Implementation Prompt (settled at gate-2 → the IMPLEMENTATION-PLAN)
Build order (emitter first — it defines the canonical spelling the parser targets):
1. **Shared model** — `serializers/internal/markdown-model.ts` (if needed): the mark-precedence order, the escape rules
   (`\` before `* _ ` [ ] ` \``), the block/inline token types. Keep tiny.
2. **`toMarkdown`** — total tree-walk (BR-E6-3/4/5/6). Both micro-decisions **CONFIRMED at gate-2 (no open fork):**
   - **underline** → `<u>…</u>` HTML span (lossless, round-trippable via the M1 inline-HTML pass; underline IS a
     registered mark) `[FACT: @tiptap/starter-kit@3.30.0 extension-underline; current-spec.md E3 marks].`
   - **integration `'comment'` grammar** → `<!-- vida:integration type="<blockType>" config='<HTML-escaped
     single-quoted JSON of node.attrs>' -->` (one comment per node; `config` omitted when the type is attr-less).
3. **`fromMarkdown`** — a bounded block tokenizer (line-classed, **in this precedence order**: frontmatter pre-pass →
   fence → `<!-- vida:integration -->` comment → html-block (`data-type` div, M1) → heading → **task item `- [ ]`/`- [x]`
   BEFORE the generic `- ` bullet** (else a task item parses as a bullet with literal `[ ]` text — the E3 "taskList
   before generic list" precedent, `current-business-rules.md` N-order) → list → table → blockquote → hr → paragraph)
   + an inline pass (emphasis/code/link/image/`<u>`, escape-aware). Collect `warnings`. Return `MarkdownParseResult`.
4. **Round-trip fixtures + property test** (BR-5 gate) — co-designed with 1–3.
5. **Barrel export** + §XXIX doc currency.
- Follow the enum, not prose (the E2 precedent BR-E2-1). Cite code for every mapping. Deterministic; no `Date.now`.

## 6. Open UNKNOWNs / Decisions
- [DECIDED — ADR-001 §8] mechanism = custom serializer (not `@tiptap/markdown`, not via-HTML). No new ADR needed —
  ADR-001 owns it; this spec cites it. `[FACT: ADR-001:100]`
- [RESOLVED — gate-1 critique B1] BR-E6-2 direction: the enforceable invariant is JSON→md→JSON identity. The critic
  adjudicated the reasoning correct (the reverse is unsatisfiable) and required the UMBRELLA be amended, not relabeled —
  done (`_index.md` BR-5 + §4 + Change Log 2026-08-14). Umbrella and this sub-spec now agree.
- [RESOLVED — gate-1 critique B2] `'comment'` losslessness scoped to the DECLARED schema (7 typed full attrs; 4
  schema-less = type identity only), mirroring BR-E5-2.
- [DEFER TO gate-2] underline emission — **lean `<u>` HTML span** (round-trippable via the M1 inline HTML pass; underline
  IS in the E3 mark set); integration `'comment'` grammar (attr encoding); nested-list indent width (lean 2-space).
- [RESOLVED — preflight GAP-1] frontmatter emit-side value source: add additive optional
  `MarkdownSerializeOptions.frontmatter?: Record<string,unknown>` to `@vida/types` (symmetric with the parse result).
  The ONE cross-package edit; type-only, additive.
- [RESOLVED — preflight GAP-2] losslessness is over the REGISTERED SCHEMA, not the block enum: StarterKit@3.30.0 also
  registers `link`/`underline` marks + `hardBreak` — all now mapped (BR-E6-3) with required fixtures (§4).
- [DISSOLVED — Victor's doc-verify steer] the "hand-rolled parsing may need a lexer" RISK is a manufactured hazard
  (E5 D-7 pattern): the round-trip grammar is CLOSED (= `toMarkdown`'s canonical output), so a general GFM lexer is
  never needed and there is **no §XXVIII escape hatch** — zero new runtime dep, unconditionally (BR-E6-8). The stress
  fixtures pass by construction; arbitrary outside markdown degrades (BR-E6-9), by contract.
- [DECIDED] no Visual Gate (no rendered surface); no new runtime dep.

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-14 | ui-3-e6-markdown-serializers | PLAN authored: custom TipTap-JSON↔Markdown serializer grounded in ADR-001 §8 + umbrella BR-5; BR-E6-1..9; JSON-side round-trip invariant; integration-block handling as the BR-E5-5 config codec; `@tiptap/markdown` recorded as considered-and-rejected (reopens ADR-001). |
| 2026-08-14 | ui-3-e6-markdown-serializers | **/critique REVISE → resolved** (independent adversarial critic; architecture verified SOUND). B1: amended umbrella BR-5/§4 to the JSON-side round-trip direction (not relabel). B2: scoped `'comment'` losslessness to the DECLARED schema (BR-E5-2; the 4 schema-less types = type identity only). M1: E6 is headless → owns a bespoke HTML-block mini-parser for `data-type` divs (can't reuse TipTap `parseHTML`) + inline `<u>`. M2: bounded the §XXVIII lexer-fallback trigger (2-level emphasis / escaped metacharacters). M3: added those two stress fixtures to the BR-5 gate. Minors: frontmatter nested→warning; taskList-before-bullet parse order; `fromMarkdown` default owned by E6 not the type. |
| 2026-08-15 | ui-3-e6-markdown-serializers | **/preflight BLOCKED → resolved.** GAP-1: frontmatter had no emit-side value source (`MarkdownSerializeOptions` is a bare flag, `EditorDocument` has no metadata) → add additive optional `MarkdownSerializeOptions.frontmatter?` to `@vida/types` (symmetric w/ the parse result; the one cross-package edit). GAP-2: verified bare `StarterKit@3.30.0` also registers `link`/`underline` marks + `hardBreak` node → BR-E6-3 now maps all three (link href-only + target/rel warning; underline `<u>`; hardBreak two-space+\n) with required §4 fixtures — losslessness is over the SCHEMA, not the block enum. |
| 2026-08-15 | ui-3-e6-markdown-serializers | **/critique gate-2 SHIP** (independent critic; all 4 gate-1+preflight fixes verified LANDED against the installed package + live types; no new blocker). Folded NM-1 (exhaustiveness clause: `trailingNode`/`undoRedo`/`dropcursor`/`gapcursor` are non-content plugins — handled set is complete over the live schema) + confirmed the two §5 micro-decisions (underline→`<u>`; `'comment'` grammar `<!-- vida:integration type=… config='…' -->`). |
| 2026-08-15 | ui-3-e6-markdown-serializers | **Lexer-fallback RISK DISSOLVED (Victor's doc-verify steer — manufactured hazard, E5 D-7 pattern).** The round-trip grammar is CLOSED (= `toMarkdown`'s canonical output), so `fromMarkdown` never meets general-GFM ambiguity on the round-trip path; arbitrary outside markdown degrades (BR-E6-9) by contract. BR-E6-8 rewritten: **no lexer, no §XXVIII escape hatch, zero new runtime dep unconditionally**; §4 dep-criterion hardened; the two stress fixtures pass by construction (kept as regression guards). |
| 2026-08-15 | ui-3-e6-markdown-serializers | **IMPLEMENTED (§7) → `@vida/editor` v0.5.0→v0.6.0.** `serializers/{to,from}-markdown.ts` (canonical emitter + closed-grammar inverse parser) + `serializers.test.ts` (34 tests: 24 round-trip fixtures + modes + frontmatter + degradation) + barrel + additive `MarkdownSerializeOptions.frontmatter?` in `@vida/types`. Canonical choices: italic→`_` (dissolves the `*`/`**` ambiguity), callout/integration→HTML/comment carriers, hardBreak→two-space+\n. **DEV note (§XXVIII mechanical):** `toMarkdown` returns `string` per the typed signature — the emit side has NO `warnings` channel (BR-E6-9's "toMarkdown warns" is honored as: unknown node → best-effort, never throw; the caller's `skip`/`placeholder` choice is not re-warned). Automated GREEN: root typecheck 11/11 · editor **155/155** · enum-parity 10/10 · boundary clean · no hex · no new runtime dep. |
| 2026-08-15 | ui-3-e6-markdown-serializers | **Post-impl /critique REVISE → resolved** (independent adversarial reviewer ran ~45 probes on the real code; architecture verified SOUND — canonical grammar + JSON round-trip). Fixed 5 losslessness holes the fixtures missed, each now a regression fixture: **B1** a literal `---` paragraph re-parsed as an HR → `BLOCK_START_GUARD` escapes HR spellings per line; **B2** empty-text link husk → skip empty text runs on emit (PM forbids them anyway); **M1** `]`/`)` in image alt/src → escape-on-emit + escape-aware parse; **M2** `)` in link href → escape + read-to-first-unescaped-`)`; **M3** a ``` line inside a code body closed the block early → variable-length fence (longest-run+1); **m1** `&#39;` in `'comment'` config over-unescaped → `&`-escaped first / un-escaped last; **m2** non-object config JSON → object-guard + warn. **M4** (frontmatter scalars round-trip as strings — flat YAML) accepted as declared-lossy per BR-E6-6 (the round-trip invariant binds the document side only). Confirmed-sound (not re-litigated): escaping symmetry, emphasis nesting/`findClose`, blockquote+nested blocks, multi-paragraph list items, table pipe-escape, degrade-never-throw. |
