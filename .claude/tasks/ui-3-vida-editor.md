# Task: ui-3-vida-editor
# Profile: New Feature
# Scenario: Default
# Spec: docs/specs/features/ui-3-vida-editor/_index.md  (to author — Step 3)
# Created: 2026-08-11
# Updated: 2026-08-15
# Status: in-progress — E1–E6 merged (@vida/editor v0.6.0); E7 (PDF) BUILT on branch (v0.7.0, pending PR); E8 (DOCX) remains
# Linear: LIF-88
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ④ UI · m1.0-delivery-plan.md:201

## Goal
Build `@vida/editor` — the TipTap block editor that is the heart of the Notes & Journals integration
layer: editor shell + toolbar + slash menu + standard blocks + serializers (Markdown / PDF / DOCX),
plus a typed extension/block-registry seam through which the 12 platform integration blocks
(`/summary`, `/tasks`, `/habits`, `/events`, `/chart`, `/pomodoro`, …) are registered later by their
module phases. Fills the 0-byte `docs/editor/*` stubs. Needs the app runtime (AR-4).

## Context
Profile: **New Feature** (per `m1.0-delivery-plan.md:201` + `:107` "editor/shell → new-feature" —
  authoritative per-issue binding, NOT the `#`-table coarse "Design-Sys" label; see
  [[load-delivery-plan-profile-not-coarse-order-table-label]]). Scenario: Default.
Files involved: `packages/editor/src` (home — currently an empty named skeleton: shell/toolbar/slash-menu
  + 11 extension files + 4 serializer files, all 0 bytes; package.json v0.0.0, NO tiptap/yjs deps yet).
Intent sources: ADR-001 (TipTap + y-prosemirror + custom serializers), `docs/editor/README.md`,
  CLAUDE.md §8 (Notes & Journals — block set + platform integration blocks + export md/PDF/DOCX).
DoC targets: `docs/editor/{editor-architecture,slash-menu-spec,extension-catalog,block-registry,
  serialization-spec}.md` (all 0-byte stubs → fill in M1).
Integration points: ← UI-1 (primitives ✅) + AR-4 (client runtime / React Query / routes ✅). Editor
  integration blocks issue React Query reads + mount in routes (AR-4). Primary consumer = the
  Notes & Pages feature (`pages` table). → Blocks CAP-authoring.
Next in the `-c` UI wave (UI-1 ✅ → UI-2 ✅ → **UI-3** → UI-4).

## Dependencies
- blocked by `ui-1-vida-ui-primitives` (DONE ✅ — LIF-86)
- blocked by `ar-4-state-routing-forms` (DONE ✅ — LIF-75)

## Open Questions
- [x] **Scope decomposition boundary** — RESOLVED at PLAN: UI-3 builds editor mechanism + standard blocks +
      serializers + typed deferred block-registry seam. The **11** (not 12 — enum) integration-block bodies
      defer to MOD-*; app-mount → M1.1+. (umbrella §1)
- [x] **Yjs/CRDT grain** — RESOLVED: Yjs is a **deferred SEAM, no dep** (M4/AR-9b). `pages.content` = TipTap-JSON
      snapshot renders locally without the Yjs doc (ADR-003:457); `YjsSyncSeam` throws til M4. M4 inverts
      authority (JSON→Yjs-derived) — E1 shell must keep the content source swappable (BR-2).
- [x] **Serializer depth** — RESOLVED: full MD round-trip (E6, property test) + PDF (@react-pdf/renderer, E7) +
      DOCX (docx, E8); integration blocks handled via `integration_block_handling='placeholder'`.
- [x] **Visual Gate applicability** — RESOLVED: rendered component → **visual-gated** (UI-1/UI-2 class), per unit.

## Session 1 (2026-08-11) — PLAN only, no code
Head confirmed UI-3, profile corrected → new-feature, baseline + integration-check done, umbrella spec (Approval 1)
+ E1 sub-spec fully double-gated (**Approval 1 + Approval 2**). E1 is APPROVED-TO-BUILD, not implemented.
Specs: `docs/specs/features/ui-3-vida-editor/{_index.md, e1-editor-core.md}`.

## Session 2 (2026-08-11) — E1 IMPLEMENTED (no re-gate; approved at Approval 2)
Implemented E1 §7 (B1–B7). `@vida/editor` v0.1.0 shipped: `<VidaEditor>` (Tiptap v3.30.0 + StarterKit + Placeholder
in a `@tamagui/core` base-token frame, uncontrolled + `forwardRef` handle, `assertEditorDocument` runtime gate,
a11y role=textbox via `editorProps.attributes`) · `internal/editor-styles.ts` (focus ring + placeholder inj-CSS) ·
`commands.ts` (`INTEGRATION_BLOCK_COMMANDS`, 11×7 fields) · tests (17/17) · stories (default/empty/disabled) ·
`src/CLAUDE.md`. **Automated acceptance GREEN:** editor typecheck ✓ · build ✓ · test **17/17** · build-storybook ✓ ·
root typecheck **11/11** · boundary clean (no `@vida/core`/app import) · `@vida/ui` **317/317** (no regression).
**§8 UNKNOWN resolved:** base semantic tokens suffice → **NO `light_/dark_Editor` sub-theme**, `tamagui.config.ts`
untouched (BR-E1-5, UI-2 conditional-sub-theme rule).

### Deviations (§XXVIII — mechanical, no re-gate)
- **DEV-1 · tsconfig no project references.** Spec §7.1 said "add project refs to types/ui" but the concrete precedent
  `@vida/ui/tsconfig.json` has NONE (turbo `^build` orders cross-package builds). Followed the working precedent.
- **DEV-2 · `Content` type import** from `@tiptap/react` (which `export *`s `@tiptap/core`), not `@tiptap/core`
  (not a direct dep).
- **DEV-3 · `env.d.ts`** added (mirrors `@vida/ui/src/env.d.ts`) for the ambient `process.env.NODE_ENV` dev-guard type.
- **DEV-4 · `test-setup.ts`** (+ `@testing-library/user-event` devDep) — jsdom test-harness shims for browser globals
  the `@vida/ui` barrel transitively needs (sigma `WebGL(2)RenderingContext`) + ProseMirror layout/hit-test
  (`getClientRects`/`elementFromPoint`). Test-env only; `apps/web` (real browser) unaffected.

### Auto-triage (§XXIV) — 1 ISOLATED defect fixed inline
- **@vida/ui barrel runtime `.d.ts` import** → crashed any bundler consuming `@vida/ui` (E1 = first runtime consumer).
  Fixed `packages/ui/src/index.ts`: value `import './tamagui.d.ts'` → `/// <reference>`. Diagnosis:
  `docs/specs/fixes/ui-tamagui-dts-runtime-import/`. `@vida/ui` 317/317 confirms no regression.

### Post-impl gates — DONE
- **Visual Gate PASS** (Victor, real browser — default/focus/disabled/empty × light｜dark, a11y panel clean). 2026-08-11.
- **Step 8 `/critique`** — independent adversarial critic (fresh subagent) = **SHIP**, no blockers/material. Verified
  token/theme correctness, assertEditorDocument wiring, command parity, the barrel fix, "created-once". Folded 1 MINOR:
  `setContent` → `emitUpdate:false` (v3 defaults true, `setContent.ts:52`) so a reset never echoes `onChange` (+ test).
  Discovered while testing: `onChange` fires one benign idempotent mount echo (Tiptap seed normalization) — documented
  (spec §8, current-business-rules) not hacked (deterministic suppression = out-of-scope normalization edge-cases).
- **§XXIX Currency** — created `docs/editor/current-spec.md` + `docs/editor/current-business-rules.md` (code-cited),
  refreshed the E1 spec change-log + `packages/editor/src/CLAUDE.md`. Test count now **18/18**.

### NEXT
- **Commit** E1 (branch `ui-3-vida-editor`): `@vida/editor` v0.1.0 + the `@vida/ui` barrel fix + `docs/editor/current-*`
  + specs. NOT yet committed. (Whether to PR E1 alone or stack E2+ before a UI-3 PR is Victor's call.)
- Then **E2** (standard blocks: table/callout/divider/image/code-block) — the next UI-3 unit, re-enters the §XXVI gate.

## Session 3 (2026-08-11) — E2 IMPLEMENTED (full §XXVI double-gate + post-impl critique)
Baseline (current-* current, no drift) → E2 spec authored → **Approval 1** → preflight PASS+2 folds (TableKit resolves
table to 2 deps; defaultValue is the pre-chrome block-exhibition path) → **Approval 2** → implemented → post-impl
critique. **Scope resolved against the `STANDARD_BLOCK_TYPE` enum (BR-7):** E2 = **{taskList, image, table, callout}**
— NOT the umbrella's "table/callout/divider/image/code-block" (divider=`horizontalRule` + `codeBlock` already ship in
E1's StarterKit; `taskList` was omitted). Umbrella §5 E2 row corrected.
`@vida/editor` v0.1.0→**0.2.0**: `extensions/callout.ts` (bespoke Node, 3 variants info/success/danger) +
`extensions/standard-blocks.ts` (`STANDARD_BLOCK_EXTENSIONS`: TaskList/TaskItem·Image·TableKit·Callout) spread into
`editor.tsx`; `image-block.ts` skeleton removed; `editor-styles.ts` extended (token-var CSS); +12 tests (parity +
round-trip + callout fallback + e2e render) + "Standard blocks" story. **Automated acceptance GREEN:** editor typecheck
✓ · build ✓ · build-storybook ✓ · test **30/30** · root typecheck **11/11** · boundary clean · no raw hex.
**Gate quality — every gate caught a real bug:** gate-1 critique REVISE (B1: callout `warn` variant mis-cited to Toast
+ no backing token → dropped to 3) + M1–M4; gate-2 caught 2 edit-orphaned "4 variants" refs; **post-impl critique
caught B1 (ISOLATED): `--accentInfo/Success/Danger` are `_Toast` SUB-THEME-scoped → resolve to nothing on the editor's
unnamed base frame** → swapped to base `--colorBrandPrimary`/`--colorSignalSuccess`/`--colorSignalDanger` (jsdom
couldn't catch it; the E1 `--placeholder` trap recurring — memory [[cite-tokens-from-emitted-output-not-source-files]]
reinforced). §XXIX: `extension-catalog.md` filled · `current-*` refreshed · `CLAUDE.md` · umbrella row.
**DEV-1 (§XXVIII mechanical):** `STANDARD_BLOCK_EXTENSIONS` typed `Extensions` not §3's `readonly Extension[]` (Nodes,
not Extensions) — type-name refinement, no intent change.

### NEXT (E2)
- **PENDING: real-browser Visual Gate (Victor)** — `pnpm --filter @vida/editor storybook` → "Standard blocks" story,
  both themes: confirm callout tints/accents render (the B1 fix), table borders/header fill, taskList checkboxes, image.
- After Visual Gate PASS → **commit** E1+E2 together (still uncommitted on branch `ui-3-vida-editor`; PR strategy = Victor).
- Then **E3** (toolbar — composes UI-1 Button/Menu; reflects active marks; needs `useEditorState`/`shouldRerenderOnTransaction` per E1 §8 note).

## Session 4 (2026-08-12) — PR REORG + E3 IMPLEMENTED (full §XXVI double-gate + post-impl critique)
**PR reorganization (Victor's call — each E its own branch+PR, finished ones merged):** split the combined PR #14
into **#15 (E1) MERGED** (`290470f`) + **#16 (E2) MERGED** (`d903cb0`); **#14 CLOSED** (superseded). main is clean
linear `eb13b32 → E1 → E2`. Building E3 on fresh branch **`ui-3-e3-toolbar`** off the merged main. Filed the CI
pnpm-`action-setup` version-conflict fix as a TASKS.md Planned hygiene task (NOT done here — ownerless infra, its own
gate; the other CI reds are owned ahead: `@vida/server#test`→P2-1, Format Check→Prettier task).

**E3 (toolbar) — APPROVED (Approval 1 + preflight + Approval 2) → IMPLEMENTED → post-impl critique.**
`@vida/editor` **v0.2.0→0.3.0**. `<VidaEditor>` gains additive `toolbar?: boolean` (default true), null-gated mount
inside the frame. `toolbar.tsx` (`EditorToolbar` + `ToolbarButton`) — APG `role=toolbar` + roving tabindex
(←/→/Home/End only; live enabled-set + reconcile effect) composing UI-1 Button (mark toggles, undo/redo) + Menu
(block-type "Turn into", insert Table/Callout/Divider); active state via `internal/toolbar-state.ts`
(`useToolbarState`→`useEditorState`). Callout insert via `insertContent(calloutInsertContent())` + node `isolating`
(DEV-1/2 — the `setCallout` chain augmentation didn't propagate in this pnpm monorepo). Active-bg = a Tamagui `active`
VARIANT on `ToolbarButton` (not injected CSS); DEF-E3-a filed (Button has no toggle state). Image+Link excluded.
**Gates (all independent):** gate-1 REVISE (2 blockers [`setCallout` nonexistent; null-editor gate] + 3 material) →
preflight PASS +4 folds → gate-2 REVISE (3 material the edits opened: attrs payload, `can()` compute-cost honesty,
default-on regression audit) → **post-impl REVISE** (MAT-A/B: roving `rovingId` never reconciled to `effectiveRoving`
→ tab-stop teleport/focus-orphan → added reconcile effect; MAT-D mark-glyph styling; callout-nest guard). §XXVIII:
DEV-1..4. **Automated GREEN:** editor typecheck ✓ · **60 tests** (was 30) ✓ · build + build-storybook ✓ · root
typecheck 11/11 · boundary clean · no hex · E1/E2 tests unbroken (default-on toolbar, B0). §XXIX: `current-*` +
`CLAUDE.md` + umbrella §5 E3 ✅ + DEF-E3-a. Specs `…/ui-3-vida-editor/e3-toolbar.md`.

### NEXT (E3)
- **PENDING: real-browser Visual Gate (Victor)** — `pnpm --filter @vida/editor storybook` → "Toolbar" story, both
  themes: (1) **active-bg over ghost** (BR-E3-3 — the key check: does the pressed bg render on the ghost button?),
  (2) mark glyphs legible (B bold/I italic/U underline/S strike/`</>` mono), (3) both Menus open/flip + dispatch,
  (4) Undo dimmed until an edit, (5) roving — Tab reaches toolbar once then ←/→/Home/End, focus ring visible.
- After Visual Gate PASS → **commit** E3 on `ui-3-e3-toolbar` → **its own PR** (per-unit PR model).
- Then **E4** (slash menu — composes UI-1 Menu/Popover; type-ahead; lists integration-block commands). E5 registry →
  E6 markdown → E7 PDF → E8 DOCX. Then UI-4 (#30).

## Session 5 (2026-08-13) — E4 IMPLEMENTED + SHIPPED (full §XXVI double-gate + post-impl critique + Visual Gate)
E4 (slash menu) built on fresh branch **`ui-3-e4-slash-menu`** off main. `@vida/editor` **v0.3.0→0.4.0**.
`/`-triggered block palette = a **WAI-ARIA combobox** (focus stays in the editor), built on **`@tiptap/suggestion`**
(new dep) + `@tiptap/react` `ReactRenderer` — NOT a UI-1 Menu/Popover mount (trigger-anchored + move focus in; the
umbrella's "composes UI-1 Menu/Popover" was corrected at gate-1 — BR-4 honored at the token layer via the Menu
sub-theme). New files: `slash-commands.ts` (editor-local `SlashMenuItem` view-model; `@vida/types.SlashCommand`
untouched, BR-7 — its `block_type` is integration-only; `SLASH_MENU_ITEMS` = standard blocks insert-now + 11 integration
blocks DERIVED from `INTEGRATION_BLOCK_COMMANDS`, disabled via the `isBlockAvailable` **E5 seam**) · `slash-menu.tsx`
(role=listbox combobox popup under `<Theme name="Menu">`, imperative onKeyDown) · `extensions/slash-command.ts` (the
Suggestion extension + ReactRenderer render lifecycle + `slashComboboxAttrs`/`slashActive`). `editor.tsx` mounts it +
host combobox ARIA via `editorProps.attributes`.
**Gates (all independent critics):** gate-1 REVISE (2 blockers: heading `setNode` turn-into vs E3 toggle + provenance;
a FALSE `@floating-ui/dom` transitive-dep FACT → deleted) + 5 material → preflight PASS (installed `@tiptap/suggestion@
3.30.0`, verified the whole API vs its d.ts) +4 folds → gate-2 SHIP (every d.ts cite TRUE, all 12 commands chainable) +2
material → **post-impl REVISE → 1 real blocker B1 (runtime-proven): the host `role`→combobox flip via a PM plugin was
DEAD** (PM consumes `view._props`/editorProps before plugins, first-writer-wins → E1's static `role:'textbox'` always
won, plugin's combobox silently dropped) → moved the combobox ARIA into `editor.tsx`'s `editorProps.attributes`
FUNCTION (single `role` writer), added a real active-flip test (`insertContent('/')` → `slashActive` true). §XXVIII:
DEV-1 (@tiptap/react import path) · DEV-2 (the B1 fix) · DEV-3 (no injected CSS, fully Tamagui) · DEV-4 (ReactRenderer↔
Tamagui context = React-portal-inside-EditorContent → inherits context, UNKNOWN closed).
**Automated GREEN:** editor typecheck ✓ · **102 tests** (was 60) ✓ · build + build-storybook ✓ · root typecheck 11/11 ·
boundary clean · no hex. **Visual Gate PASS** (Victor, both themes; combobox ARIA confirmed in devtools). §XXIX:
`current-spec`/`current-business-rules` refreshed · `slash-menu-spec.md` filled (was 0-byte) · `CLAUDE.md` E4 section ·
umbrella §5 E4 → ✅. **Committed `9697b4d` + pushed; PR #18 OPEN** → https://github.com/VicJGs/vida-platform/pull/18.
Specs `docs/specs/features/ui-3-vida-editor/e4-slash-menu.md`.

### NEXT — E5 (block-registry seam + placeholder node-views)
- **FIRST ACTION next session: start E5.** Re-enter the §XXVI gate (baseline → spec `e5-*.md` → critique → Approval 1 →
  preflight → critique → Approval 2 → implement → post-impl → Visual Gate). E5 = the `BlockRegistry` typed map + a
  **placeholder node-view for every `INTEGRATION_BLOCK_TYPE`** (11) (BR-3, graceful degradation). Reserves/reconciles
  the `extensions/*.ts` stub filenames (`daily-summary.ts`, `backlink-panel.ts`, …) against the enum keys.
- **E5's HOOK into E4 (already built):** E4's slash menu already LISTS the 11 integration blocks, disabled, gated by
  `isBlockAvailable(type)` in `slash-commands.ts` (currently `AVAILABLE_INTEGRATION_BLOCKS = new Set()` — empty). E5
  **flips them on** by populating that set (or replacing it with a runtime registry query) AND registering the
  placeholder node-views the `run` closures will insert. Decide at E5 whether E4's integration `run` closures get wired
  (insert the placeholder node) or stay deferred to a later unit — the seam is ready either way.
- Sequence remaining: **E5** registry+placeholders → E6 markdown (to+from round-trip) → E7 PDF → E8 DOCX → then **UI-4**
  (#30, app shell). UX-6 (#26) stays gated behind the `-c` UI wave (needs UI-4).
- Branch: cut `ui-3-e5-*` off main AFTER PR #18 merges (per-unit PR model). Ground truth `docs/editor/current-*` +
  `docs/editor/{block-registry,extension-catalog}.md`.

## Build Steps — E4 (slash menu)
_(materialized 2026-08-12 from e4-slash-menu.md §7 — approved at Approval 2. All complete; shipped 2026-08-13.)_
- [x] B0 · dep `@tiptap/suggestion@^3.30.0` (installed at preflight) + version 0.3.0→0.4.0.
- [x] B1 · `slash-commands.ts` — `SlashMenuItem` + `SLASH_MENU_ITEMS` (standard `run` closures + 11 derived-disabled integration entries) + `isBlockAvailable` seam + `filterSlashItems`.
- [x] B2 · `slash-menu.tsx` — forwardRef role=listbox popup (`<Theme name="Menu">`, grouped options, aria-selected/-disabled, imperative onKeyDown skipping disabled).
- [x] B3 · `extensions/slash-command.ts` — Extension + `Suggestion({char:'/', allow:!codeBlock, items, command, render})` + ReactRenderer render lifecycle + `slashComboboxAttrs`/`slashActive` (host combobox ARIA — post-impl B1: via editorProps, not a plugin).
- [x] B4 · mount `SlashCommand` in `editor.tsx` extensions; editorProps.attributes → function merging the combobox ARIA.
- [x] B5 · styles — none needed (fully Tamagui, DEV-3).
- [x] B6 · tests `slash-commands.test.ts` + `slash-menu.test.tsx` + `extensions/slash-command.test.ts` (40 new; active-flip proof) + "Slash menu (popup)"/"(live)" stories.
- [x] B7 · §XXIX currency — `current-*` + `slash-menu-spec.md` + `CLAUDE.md` + umbrella §5 E4 ✅.
- [x] B8 · **Visual Gate (Victor, real browser) — PASS** (both themes; combobox ARIA + caret-anchoring + dimmed integration rows). 2026-08-13.

## Build Steps — E2 (standard blocks)
_(materialized 2026-08-11 from e2-standard-blocks.md §7 — approved at Approval 2. All complete; Visual Gate pending.)_
- [x] B1 · Deps + version — add `@tiptap/extension-image` + `@tiptap/extension-table` (TableKit) + promote `@tiptap/extension-list`; v0.1.0→0.2.0; `pnpm install`.
- [x] B2 · `extensions/callout.ts` — bespoke `Node.create` (group:block, content:'block+', defining), `CALLOUT_VARIANT` (info/success/danger), variant attr parseHTML/renderHTML + `normalizeVariant` default-fallback.
- [x] B3 · `extensions/standard-blocks.ts` — `STANDARD_BLOCK_EXTENSIONS` (TaskList, TaskItem nested, Image inline:false/allowBase64, TableKit resizable:false, Callout); removed `image-block.ts` skeleton.
- [x] B4 · `editor.tsx` — spread `...STANDARD_BLOCK_EXTENSIONS` after StarterKit+Placeholder (no API change, no double-registration).
- [x] B5 · `internal/editor-styles.ts` — token-var CSS for taskList/table/callout(×3)/image/code/divider; base accent vars (B1 fix); color-mix tints; no hex.
- [x] B6 · Tests `extensions/standard-blocks.test.tsx` (schema-parity, per-block round-trip, callout variant + parseHTML fallback, TableKit co-reg, e2e VidaEditor render) + "Standard blocks" story.
- [x] B7 · §XXIX currency — `extension-catalog.md` filled, `current-*` refreshed, `CLAUDE.md`, umbrella §5 E2 row corrected.
- [x] B8 · **Visual Gate (Victor, real browser) — PASS** (both themes; callout accents/tints verified rendering, taskList/table/image/code/divider, a11y clean). 2026-08-11.

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| Profile | New Feature | delivery-plan:201/:107 authoritative over `#`-table label | 2026-08-11 |
| UI-3 before UI-4 | UI-3 first | reconcile doc: all authoritative sources unanimous; part-3:116 proven non-ordering | 2026-08-11 |

## Build Steps
_(materialized 2026-08-11 from E1 §7 — approved at Approval 2, no re-gate. Implement in order.)_
- [x] B1 · Package foundation — `package.json` v0.0.0→0.1.0: deps `@tiptap/react`+`@tiptap/pm`+`@tiptap/starter-kit`+`@tiptap/extension-placeholder` (`^3.30.0`, family-pinned) + `@tamagui/core@2.6.2` + `@vida/types`/`@vida/ui` (`workspace:*`); peer `react>=19`; devDeps+scripts mirrored from `@vida/ui`. Config: `vite.config.ts` (React plugin, `test.environment:'node'`), `tsconfig.json` (+jsx react-jsx +lib DOM +project refs to types/ui), `tsconfig.storybook.json`, `.storybook/{main.ts,preview.tsx,preview-head.html}`. Turbo tasks already generic (build/typecheck/test) — no turbo.json change.
- [x] B2 · `internal/editor-styles.ts` — injected CSS (idempotent, browser-only): focus ring on frame `:has(.ProseMirror:focus-visible)` → `var(--colorFocusRing)`; placeholder `::before` color → `var(--colorTextMuted)` (NOT `--placeholder`, sub-theme-only); disabled cursor.
- [x] B3 · `editor.tsx` — `assertEditorDocument(json)` runtime structural gate (§6) + `useEditor` (StarterKit + Placeholder, `immediatelyRender:false`, `onUpdate→onChange`) + `<VidaEditor>` Tamagui `@tamagui/core` styled frame (base semantic tokens, no sub-theme) wrapping `<EditorContent>`; `editable`/`placeholder`; `forwardRef`→`setContent`/`focus`/`getDocument`; a11y via `editorProps.attributes` (role=textbox, aria-label/labelledby, aria-multiline).
- [x] B4 · `commands.ts` — `INTEGRATION_BLOCK_COMMANDS: readonly SlashCommand[]` — one per `INTEGRATION_BLOCK_TYPE` (11), all 7 required fields (BR-E1-4).
- [x] B5 · `index.ts` barrel — `VidaEditor`, `VidaEditorProps`/`VidaEditorHandle`, `INTEGRATION_BLOCK_COMMANDS`, re-export `EditorDocument` type.
- [x] B6 · Tests (jsdom, `// @vitest-environment jsdom`): `editor.test.tsx` (render/edit/onChange-valid-doc, setContent/getDocument/focus ref, editable=false, placeholder, aria-name axe, `waitFor(isEditable)` guard) + `commands.test.ts` (parity vs enum, all-7-fields, valid category). Stories `editor.stories.tsx` (default/focus/disabled/empty, under UIProvider) + `src/CLAUDE.md` (§XXIX).
- [x] B7 · Verify — `pnpm install` (adds tiptap to lock); `pnpm --filter @vida/editor typecheck && build && test` green; root typecheck; no `@vida/core`/app import.

## Session 6 (2026-08-14) — E5 IMPLEMENTED + SHIPPED (see session-log 2026-08-14)
E5 block-registry (ADR-008 `inline` render adapter) — 11 atom nodes + placeholder node-views. `@vida/editor` v0.4.0→**v0.5.0**. PR #19 `3b3197d` MERGED. Full detail: `.claude/sessions/2026-08-14-ui-3-e5-block-registry.md`.

## Session 7 (2026-08-15) — E6 IMPLEMENTED + SHIPPED (full §XXVI double-gate + post-impl critique)
E6 (markdown serializers) on branch **`ui-3-e6-markdown-serializers`** off clean main. `@vida/editor` **v0.5.0→v0.6.0**.
The custom **TipTap-JSON ↔ Markdown serializer** (ADR-001 §8): `serializers/to-markdown.ts` (canonical emitter) +
`serializers/from-markdown.ts` (closed-grammar inverse parser) + `serializers/serializers.test.ts` (34 tests) + barrel +
one additive `@vida/types` field `MarkdownSerializeOptions.frontmatter?`. **Lossless invariant = JSON→md→JSON**
(`fromMarkdown(toMarkdown(doc)).document ≡ doc`) over the live schema (11 blocks + `bold/italic/strike/code/link/underline`
marks + `hardBreak`). Canonical closed grammar (italic→`_`, bold OUTER, variable code fences, callout/integration→HTML/
comment carriers, hardBreak→two-space+`\n`) → `fromMarkdown` inverts it + degrades on the rest → **no lexer, zero new dep**.
**4 independent critiques:** gate-1 REVISE→resolved (B1 amend umbrella BR-5 direction to JSON-side; B2 scope comment-mode
to declared schema; M1–M3) · **preflight** BLOCKED→resolved (GAP-1 frontmatter value carrier; GAP-2 schema-truth — bare
`StarterKit@3.30.0` also registers link/underline marks + hardBreak) · gate-2 SHIP · **post-impl REVISE→resolved: 7
losslessness holes the 29 fixtures missed** (`---`-paragraph→HR · empty link · image `]`/`)` · href `)` · code-body fence ·
comment `&#39;` · non-object config) — each now a regression fixture.
**Victor's 2 doc-verify steers pivotal:** (1) ADR-001 §8 fixes "custom serializer" — nearly reopened for `@tiptap/markdown`
([[dont-let-downstream-shape-reopen-an-adr]]); (2) the "lexer risk" was a manufactured hazard the closed-grammar contract
dissolves (E5 D-7 pattern → memory [[dont-author-an-escape-hatch-for-a-risk-the-contract-dissolves]]).
**Automated GREEN:** root typecheck 11/11 · editor **155/155** · build ✓ · enum-parity 10/10 · boundary clean · no hex ·
no new runtime dep. No Visual Gate (no rendered surface). §XXIX: `serialization-spec.md` (was 0-byte) + `current-*` +
`CLAUDE.md` + umbrella §5 E6 ✅. **Committed `ebb7d36` + pushed; PR #22 → MERGED `ce0c0c9` (--merge);** branch deleted;
merged-main green. Spec `docs/specs/features/ui-3-vida-editor/e6-markdown-serializers.md`.

## Session 8 (2026-08-15) — E7 IMPLEMENTED (full §XXVI double-gate + preflight + post-impl critique)
E7 (PDF serializer) on branch **`ui-3-e7-pdf-serializer`** off clean main. `@vida/editor` **v0.6.0→v0.7.0**.
The **`@react-pdf/renderer` PDF serializer** (ADR-001:101; web/desktop, mobile=expo-print OUT of scope): `serializers/to-pdf.tsx`
(pure `documentToPdfTree(doc,options): ReactElement<DocumentProps>` — total tree-walk over all 11 `STANDARD_BLOCK_TYPE` +
every registered mark + hardBreak → react-pdf primitives — + thin async `toPdf(doc,options): Promise<Blob>`) +
`serializers/pdf-theme.ts` (print-neutral literals + StyleSheet, quarantined — react-pdf has no CSS runtime) +
`to-pdf.test.tsx` (33) + barrel + additive `PdfSerializeOptions` in `@vida/types`. **Emit-only (no round-trip — BR-5 is E6's).**
Marks merge as ONE `<Text>` style object (`link`=outermost `<Link>`); integration→placeholder card; frontmatter→page-1 header.
**Victor's steer (pivotal):** the 6 "decisions" I surfaced were ALL already fixed by ADR-001/umbrella/E6-precedent — no open
fork ([[dont-manufacture-an-architecture-fork-the-pattern-already-answers]] / [[decide-dont-ask-when-docs-give-the-answer]]).
**4 gates:** gate-1 REVISE→resolved (3 blockers incl. a fabricated React-peer cite `^19` → real range; 5 material) ·
**preflight PASSED** (API verified vs the INSTALLED `.d.ts` — self-caught GAP-P1: primitives are CLASSES so tests assert
`el.type===Text`, not string constants) · gate-2 SHIP (2 render-traps probed + engine-resolved: `Courier-Bold` pre-registered,
`<Link>` nests in `<Text>`) · **post-impl REVISE→resolved** (2 real bugs green tests hid: **M1** list-in-table-cell text
SILENTLY DROPPED → recurse via `renderBlock`; **M2** non-numeric `orderedList.start`→`NaN.` → `Number.isFinite` guard;
+m1/m2). **Scope refinement:** degrade-never-throw is TREE-level — a corrupt image src throws at react-pdf render (caller's
contract, BR-E2-5). **GREEN:** editor **188/188** · root typecheck 11/11 · build ✓ · boundary clean · hex confined to
`pdf-theme.ts` · one new top-level dep `@react-pdf/renderer@4.6.1`. No Visual Gate (serializer). §XXIX: `serialization-spec.md`
+ `current-*` + `CLAUDE.md` + umbrella §5 E7 ✅. Spec `docs/specs/features/ui-3-vida-editor/e7-pdf-serializer.md`.

### NEXT — commit E7 + PR, then E8 (DOCX)
- **Commit** E7 on `ui-3-e7-pdf-serializer` → **its own PR** (per-unit PR model). Includes the `@vida/types` additive change
  + the `@vida/types` dist rebuild.
- Then **E8** DOCX (`docx` npm) → **UI-4** (#30, app shell). UX-6 (#26) stays gated behind the `-c` wave (needs UI-4).
- Ground truth for E8: `docs/editor/serialization-spec.md` (E6+E7 filled it) + `docs/editor/current-*`. ⚠ CI red repo-wide
  (known pnpm action-setup infra; local green).
