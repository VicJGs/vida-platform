# Spec: feature:ui-3-vida-editor
<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->
Status: draft            <!-- draft → approved → implemented -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-08-11-ui-3-vida-editor (created; §1–§5 authored at PLAN).

<!--
  FORWARD spec (umbrella) — written BEFORE the build. §1–§4 DESCRIBE the shared model; §5 is the ordered SEQUENCE.
  Each sub-unit (E1…En) is built as its own UNIT with its own sub-spec (e<n>-<unit>.md) + /contract + §XXVI gate +
  component Visual Gate, mirroring UI-1's U1…U10 and UI-2's V1…V7. This umbrella fixes the editor ARCHITECTURE +
  the deferred seams + the sequence; the per-unit contracts are authored at each unit's turn.
-->

## 1. Identity
UI-3 (LIF-88, `#29`) — **`@vida/editor`.** The TipTap (ProseMirror) block editor that is the heart of the Notes &
Journals integration layer — the connective editing surface every module's notes flow through
`[FACT: CLAUDE.md §8; m1.0-delivery-plan.md:201; ADR-001:96-103]`. Profile **new-feature**
`[FACT: m1.0-delivery-plan.md:201,:107 "editor/shell → new-feature"]`; ← UI-1 ✅ + AR-4 ✅.

**The deliverable** — the editor *mechanism* + standard blocks + serializers + a deferred-block registry, in
`packages/editor/src` (today a named-but-empty skeleton: `editor.tsx`/`toolbar.tsx`/`slash-menu.tsx` +
`extensions/*.ts` + `serializers/*.ts` all 0 bytes; `package.json` v0.0.0, no tiptap/yjs deps
`[FACT: wc -l packages/editor/src/*; packages/editor/package.json]`):

- **Editor shell** — TipTap React editor emitting `EditorDocument` JSON, the source for `pages.content`.
- **Standard blocks** — the `STANDARD_BLOCK_TYPE` set `[FACT: packages/types/src/editor.ts:12-24]`.
- **Toolbar + slash menu** — chrome composing UI-1 primitives (Menu/Button/…).
- **Serializers** — Markdown (lossless round-trip), PDF, DOCX `[FACT: ADR-001:100-102]`.
- **Block-registry seam** — a typed registry through which the 12 `INTEGRATION_BLOCK_TYPE` blocks register later.

- **The desire:** one editor, built once, that every module's pages/journals reuse — with the platform-integration
  blocks (`/summary`, `/tasks`, `/habits`, …) pluggable as modules come online, not hard-wired now.
- **The type contract already exists** — UI-3 IMPLEMENTS it, does not invent it: `EditorDocument`/`EditorNode`/
  `EditorMark` (TipTap JSON), `STANDARD_BLOCK_TYPE`, `INTEGRATION_BLOCK_TYPE` (**11 members**), `EditorState.yjs_state`,
  `MarkdownSerializeOptions.integration_block_handling: 'comment'|'skip'|'placeholder'`, `EXPORT_FORMAT`
  `[FACT: packages/types/src/editor.ts:12-40,164-209]`.
  - ⚠ **Doc-defect flagged (not UI-3's to fix):** CLAUDE.md §8 prose lists **12** slash-blocks (…`/class-notes`,
    `/milestone`); the `INTEGRATION_BLOCK_TYPE` enum ships **11** — it dropped `class-notes`. UI-3 implements the
    **enum** (the type contract), count-free. Reconcile the prose↔enum elsewhere. `[FACT: editor.ts:28-40 = 11;
    CLAUDE.md §8 = 12]`
- **What it is NOT (deferred — grounded):**
  - **NOT the Yjs/CRDT sync binding.** ADR-003 splits each page into two sync units; editor content is a per-page
    Yjs doc `[FACT: ADR-003:140-179]`. But `pages.content` is a **TipTap-JSON snapshot that renders locally WITHOUT
    loading the Yjs doc** `[FACT: ADR-003:457]`, and the sync layer is inert until M4 — `YjsSyncSeam` throws
    `SyncNotActivated`, `packages/core/src/sync/*` are empty stubs `[FACT: core/src/sync/crdt.ts:17-22;
    ADR-003:350]`. So UI-3 builds the **JSON-snapshot editing path**; `y-prosemirror` is a **deferred seam**
    (activated at M4/AR-9b), exactly like AR-9's no-flush sync stub. `[INTERP: ADR-003:457 + M1.0 boundary]`
  - **NOT the 11 integration-block live bodies.** Each reads a module that does not exist in M1.0 (`/habits`→habits,
    `/events`→relationships, `/chart`→finance, `/pomodoro`→sessions…). UI-3 ships their **registration seam +
    placeholder node-views**; the live bodies land in their MOD-* phases (the empty `extensions/*.ts` are the
    reserved slots). Precedent: AR-5 deferred effect-rail, AR-9 no-flush stub. `[INTERP: capability-framework;
    delivery-plan:201]`
  - **NOT the app mount / page CRUD.** The `/notes` route is an M1.1+ stub `[FACT: apps/web/src/routes.tsx:54]`.
    UI-3 ships the editor as a **package component**; mounting it against the `pages` table is M1.1+.
  - **NOT the view/DATA services it consumes** — `BacklinkResolver` (AR-8 ✅), `SpacesService` (AR-6 ✅),
    `export-dialog` (UI-2 ✅). The editor COMPOSES these; it does not reimplement them.

## 2. Business Rules (shared across the editor build)
Fixes the ONE shared architecture; per-unit rules live in each sub-spec.

- **BR-1 · Content model = TipTap-JSON snapshot.** The editor's authoritative local output is an `EditorDocument`
  (TipTap JSON) `[FACT: packages/types/src/editor.ts:164-181]`, surfaced via an `onChange(doc)` seam; the consuming
  app persists it to the **M1.1+ `pages.content [E]`** column `[INTERP: pages.content is the persistence target —
  ADR-002 §5.2 + ADR-003:457; the `pages` table is NOT yet in the active schema — grep `sqliteTable('pages'` →
  none; it lands M1.1+]`. The editor is a **package component** — it never imports `@vida/core`/an app; DB
  persistence is the consumer's (the export-dialog precedent, `packages/ui/src/components/export-dialog.tsx:9-11`).
- **BR-2 · Yjs is a deferred SEAM, not a dependency.** UI-3 adds **no `yjs`/`y-prosemirror`**. The editor is
  structured so a collaboration/CRDT extension can be attached later (a documented mount point), and
  `EditorState.yjs_state: Uint8Array | null` stays the reserved carrier `[FACT: editor.ts:188; ADR-003:350,457]`.
  Local editing is fully functional on the JSON path alone (single-user, single-device M1.0). `[INTERP]`
  - ⚠ **M4 inverts the authority direction.** Today the TipTap-JSON doc IS the source of truth (no Yjs doc exists —
    the sync seam throws `[FACT: core/src/sync/crdt.ts:17-22]`). When `y-prosemirror` activates at M4, the **Yjs doc
    becomes authoritative and the JSON becomes a derived snapshot** `[FACT: ADR-003:457 "content… derived from the
    Yjs state"]`. E1's shell API must NOT bake in "JSON is permanently the source" — the mount point must allow the
    content source to be swapped to a Y.Doc binding. `[INTERP: ADR-003:449-457]`
- **BR-3 · Integration blocks register through a typed seam; bodies deferred.** A `BlockRegistry` maps each
  `INTEGRATION_BLOCK_TYPE` to a TipTap node spec; in UI-3 every integration block resolves to a **placeholder
  node-view** (a declared, non-error "block unavailable until its module lands" state — the graceful-degradation
  model, NOT a crash) `[FACT: editor.ts:28-40; capability-framework.md V3]`. Serializers emit them per
  `integration_block_handling` (`'placeholder'` default) `[FACT: editor.ts:197-209]`.
- **BR-4 · Compose UI-1 + tokens; no raw values.** Toolbar/slash-menu/block chrome compose UI-1 primitives (Menu,
  Button, Popover, Card…) + DS-2..DS-5 tokens/sub-themes. Dimension props use the token scale (`$md`/`$lg`), color
  props use theme keys — the DEF-U8-h + DEF-U4-e lessons carry `[FACT: packages/ui/src/CLAUDE.md]`.
- **BR-5 · Serializers round-trip losslessly for standard blocks.** `to-markdown ∘ from-markdown` is identity over
  the `STANDARD_BLOCK_TYPE` set `[FACT: ADR-001:100]`; `MarkdownParseResult` collects `warnings` for lossy/unknown
  nodes `[FACT: editor.ts:203-208]`. PDF = `@react-pdf/renderer`, DOCX = `docx` `[FACT: ADR-001:101-102,232-234]`.
- **BR-6 · A11y + motion inherit the UI-1 contract.** WAI-ARIA per surface (editor = textbox/toolbar/menu roles),
  jsdom-guarded browser APIs, B12 motion (transform/opacity only), reduced-motion `@media`, focus-visible rings
  `[FACT: packages/ui/src/CLAUDE.md]`.
- **BR-7 · Types are consumed from `@vida/types`, never redefined.** `@vida/editor` depends on `@vida/types` for the
  document/block/serialization shapes; it adds only implementation types `[FACT: editor.ts is @vida/types]`.

## 3. Contract (per sub-unit — DELEGATED to /contract at each unit)
Each sub-unit's `/contract` is authored fresh at its unit. Every contract specifies: props/API (incl. the
`onChange(doc)`/value seam for the shell) · the applicable §VIII states · a11y (roles/keyboard/focus) · B12 motion ·
any `light_/dark_<Unit>` sub-theme registered in `tamagui.config.ts`. `[FACT: new-feature default.md Step 4]`

## 4. Acceptance (umbrella — each unit adds its own)
- [ ] `@vida/editor` builds on `@tiptap/core` + `@tiptap/react` + `@tiptap/starter-kit`; deps family-pinned, each
      added at the unit that needs it, justified at its gate. **No `y-prosemirror`/`yjs`** (BR-2).
- [ ] Editor shell emits `EditorDocument` JSON via `onChange`; round-trips through `pages.content` shape (BR-1).
- [ ] All `STANDARD_BLOCK_TYPE` blocks implemented + serialize losslessly to/from Markdown (BR-5).
- [ ] `BlockRegistry` seam + placeholder node-views for **every** `INTEGRATION_BLOCK_TYPE` value (all 11); no
      integration-block body reads a non-existent module (BR-3).
- [ ] Serializers: `to-markdown` · `from-markdown` (round-trip) · `to-pdf` · `to-docx`, wired to the `export-dialog`
      `onExport(format)` contract `[FACT: export-dialog.tsx:28]`. **E6 carries a property/fixture test proving
      `to-markdown ∘ from-markdown = identity` over the full `STANDARD_BLOCK_TYPE` set** (BR-5 has no other gate).
- [ ] **Package boundary gate:** `@vida/editor` imports only `@vida/types` + `@tiptap/*` + (chrome) `@vida/ui`; **no
      `@vida/core` / app import** (BR-1 clean boundary — enforce via package.json/dep check).
- [ ] **Mobile is OUT of UI-3 scope, stated:** ADR-001:103 mandates a Hybrid RN editor (TipTap-in-WebView + native
      chrome); that WebView-hybrid mount is an M-mobile concern, not M1.0/UI-3 (which targets web/desktop React).
- [ ] Each unit passes its §XXVI double-gate + the 4-stage component Visual Gate (Storybook, all states, both themes).
- [ ] `pnpm --filter @vida/editor typecheck && build && test` green; root typecheck 10/10; §XXIX currency
      (`docs/editor/*` stubs filled + `packages/editor/src/CLAUDE.md`).

## 5. Implementation Prompt — the E1…E8 sequence (ordered simplest → hardest, dependency-first)
Each En is its own UNIT: sub-spec `e<n>-<unit>.md` → /contract → §XXVI gate-1 → preflight → gate-2 → implement →
component Visual Gate → next. E1 establishes the editor spine the rest reuse.

| Unit | Sub-unit | Notes / new surface |
|------|----------|---------------------|
| **E1** | package foundation + **editor shell/core** | Deps (`@tiptap/core`,`@tiptap/react`,`@tiptap/starter-kit`), Tamagui frame, `EditorDocument` in/out via `onChange`, controlled+uncontrolled, focus/a11y `role=textbox`. **The spine.** |
| **E2** | **standard blocks** ✅ | The `STANDARD_BLOCK_TYPE` set beyond StarterKit = **taskList, image, table, callout** (StarterKit already ships divider=`horizontalRule` + `codeBlock` in E1; the earlier "table, callout, divider, image, code-block" was imprecise — corrected against the enum, BR-7). Done: `extensions/standard-blocks.ts` + bespoke `callout.ts`; spec `e2-standard-blocks.md`. |
| **E3** | **toolbar** | Formatting controls; composes UI-1 Button/Menu; reflects active marks. |
| **E4** | **slash menu** | `/`-triggered block-insertion menu; composes UI-1 Menu/Popover; type-ahead. Lists integration-block commands (`SlashCommand.block_type`, editor.ts:150) that resolve to E5's placeholders → soft forward-dep on E5's TYPE MAP (see note). |
| **E5** | **block-registry seam + placeholders** | `BlockRegistry` typed map + placeholder node-views for **every** `INTEGRATION_BLOCK_TYPE` value (BR-3). Reserves the `extensions/*.ts` slots — E1/E5 reconcile the existing stub filenames (`daily-summary.ts`, `backlink-panel.ts`, …) against the enum keys (`dailySummary`, `backlink`, …). |

> **E4↔E5 sequencing note:** the registry's **TYPE MAP** (which `INTEGRATION_BLOCK_TYPE`s exist) is pulled forward
> into **E1's spine** so E4's slash menu can list integration commands before E5 builds their placeholder node-views.
> E5 adds the node-views + serialization behavior; E1 owns only the enum→command surface. No reorder — a clarified seam.
| **E6** | **markdown serializers** (`to`+`from`) | Lossless round-trip over standard blocks; `warnings` for lossy; integration blocks per `integration_block_handling`. Built as ONE unit (round-trip co-designed). |
| **E7** | **PDF serializer** | `@react-pdf/renderer` (web/desktop target; mobile=expo-print is out of scope) `[FACT: ADR-001:101]`. |
| **E8** | **DOCX serializer** | `docx` npm `[FACT: ADR-001:102]`. |

## 6. Open UNKNOWNs / Decisions Needed
- [RESOLVED 2026-08-11] profile = new-feature (delivery-plan:201/:107) · scope decomposition (mechanism + standard
  blocks + serializers + deferred registry; Yjs + integration-block bodies + app-mount deferred) · gate granularity
  (per sub-unit, UI-1/UI-2 precedent + delivery-plan:107 gate column) · Visual-Gate applies (rendered component).
- [UNKNOWN: needs E1 /contract] the exact editor shell API — `value`/`defaultValue` + `onChange(doc)` vs an
  imperative ref handle; settled at E1, then reused. `[INTERP: BR-1]`
- [UNKNOWN: needs E5 turn] `BlockRegistry` shape — a static extension array vs a runtime register(type, spec) map;
  decided at E5 against how MOD-* phases will attach bodies. `[INTERP: BR-3]`
- [UNKNOWN: needs E1 turn] TipTap v2 exact minor + whether `@tiptap/pm` is a direct dep — verified via
  /read-docs-first at E1 (ADR-001 pins the libraries, not the version). `[FACT: ADR-001:230-234]`

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-11 | ui-3-vida-editor | initial umbrella authored at PLAN: editor architecture + deferred seams (Yjs, integration blocks, app-mount) + BR-1..BR-7 + E1…E8 sequence; scope/profile/gate/visual-gate UNKNOWNs resolved against ADR-001/ADR-003 + the integration-check + UI-1/UI-2 precedent |
| 2026-08-11 | ui-3-vida-editor | **/critique REVISE → resolved.** Independent critic verified the Yjs-deferral architecture SOUND (ADR-003:457 + AR-9 stub). Fixed: `INTEGRATION_BLOCK_TYPE` count 12→11 (enum-vs-CLAUDE.md `class-notes` defect flagged); BR-1 `pages.content` cite → `[INTERP]` (no active `pages` table, M1.1+); BR-2 M4 authority-inversion note; §4 +3 gates (no-`@vida/core`-import boundary, MD round-trip property test, mobile-out-of-scope); E4↔E5 type-map seam; export-dialog :27→:28. Rejected critic finding #3 (claimed no `.tsx` stubs — verified they DO exist as 0-byte: `ls packages/editor/src/*.tsx`). |
