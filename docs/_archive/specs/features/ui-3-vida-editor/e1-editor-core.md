# Spec: feature:ui-3-vida-editor · E1 — package foundation + editor core spine
Status: draft            <!-- draft → approved → implemented -->
Parent: docs/specs/features/ui-3-vida-editor/_index.md (umbrella; BR-1..BR-7)
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-08-11-ui-3-vida-editor (E1 sub-spec authored at PLAN; /read-docs-first done against Tiptap v3 docs).

## 1. Identity
**E1 — the editor spine.** Stand up the `@vida/editor` package on Tiptap and ship `<VidaEditor>`: a headless Tiptap
React editor in a Tamagui frame that renders/edits an `EditorDocument` (TipTap JSON) and emits changes via
`onChange`. This is the surface every later unit (blocks E2, toolbar E3, slash-menu E4, registry E5, serializers
E6–E8) extends. `[FACT: umbrella §5 E1]`

**In E1:** package deps + config · the `<VidaEditor>` shell (StarterKit only) · the `EditorDocument` in/out seam ·
a11y `role=textbox` · the **integration-block command TYPE MAP** (E1 owns the enum→command surface so E4 can list
commands before E5 builds their node-views — umbrella E4↔E5 note).
**NOT in E1:** custom standard blocks beyond StarterKit (E2) · toolbar UI (E3) · slash-menu UI (E4) · integration
placeholder node-views (E5) · serializers (E6–E8) · any `yjs`/`y-prosemirror` (BR-2, deferred to M4).

## 2. Verified library facts (`/read-docs-first`, Tiptap v3 — 2026-08-11)
- **Packages:** `@tiptap/react` + `@tiptap/pm` (required ProseMirror bundle) + `@tiptap/starter-kit`
  `[FACT: tiptap-docs getting-started/install/react]`. `@tiptap/react` re-exports core; ADR-001's `@tiptap/core`
  line predates the `@tiptap/pm` split — E1 reconciles it. `[FACT: ADR-001:230-234]`
- **React 19:** the core editor supports React 19; the React-18 caveat applies ONLY to Tiptap's prebuilt **UI
  Components** kit, which Vida does NOT use (chrome is built from UI-1) `[FACT: tiptap-docs ui-components/overview]`.
- **API:** `useEditor({ extensions, content, immediatelyRender: false, onUpdate })` + `<EditorContent editor />`
  `[FACT: install/nextjs.mdx immediatelyRender:false]`. Content in as JSON `{ type:'doc', content:[…] }`; out via
  `editor.getJSON()` inside `onUpdate({ editor })`; external reset via the `setContent` command
  `[FACT: guides/output-json-html; api/commands/content/set-content]`.
- `immediatelyRender:false` is set even for our Vite SPA to avoid a StrictMode double-mount render footgun. `[INTERP]`

## 3. Contract — `<VidaEditor>`
```ts
export interface VidaEditorProps {
  /** Initial document (UNCONTROLLED — see BR-E1-1). Omit → empty doc. */
  defaultValue?: EditorDocument
  /** Emitted on every change: the current doc as TipTap JSON. Wire to pages.content in the app (BR-1). */
  onChange?: (doc: EditorDocument) => void
  /** Read-only when false. Default true. */
  editable?: boolean
  /** Placeholder text for the empty state. */
  placeholder?: string
  /** Accessible name for the textbox (a11y — BR-6). One of these is REQUIRED. */
  'aria-label'?: string
  'aria-labelledby'?: string
}
/** Imperative handle for external/programmatic content resets (NOT per-keystroke — BR-E1-1). */
export interface VidaEditorHandle {
  setContent(doc: EditorDocument): void
  focus(): void
  getDocument(): EditorDocument
}
export const VidaEditor: React.ForwardRefExoticComponent<
  VidaEditorProps & React.RefAttributes<VidaEditorHandle>
>
```
- Types `EditorDocument`/`EditorNode`/`EditorMark` are **imported from `@vida/types`**, never redefined (BR-7)
  `[FACT: packages/types/src/editor.ts:164-181]`.
- `forwardRef` is mandatory (interactive component, §VII) — and it carries the imperative reset handle.

## 4. Business Rules (E1-specific)
- **BR-E1-1 · Uncontrolled content + imperative reset.** `<VidaEditor>` is UNCONTROLLED: `defaultValue` seeds the
  doc once; edits emit via `onChange` (`onUpdate → getJSON`); external resets go through the ref `setContent`, NOT a
  re-passed `value` prop. Rationale: Tiptap owns ProseMirror state; a React-controlled `value` loop causes cursor
  jumps, and BR-2's M4 Yjs inversion makes props-as-source-of-truth a dead end (content will flow from the Y.Doc,
  not React). `[INTERP: BR-2; tiptap-docs — content is initial, setContent for updates]`
  - **Reset is SILENT (`emitUpdate:false`).** `setContent` passes `{ emitUpdate: false }` — a programmatic reset is NOT
    a user edit and must not echo through `onChange`. Tiptap v3 defaults `emitUpdate:true` (`@tiptap/core
    setContent.ts:52`), which would fire `onChange` on every load and, at M4, feed a Yjs→JSON snapshot straight back to
    the persistence wire (the BR-2 dead-end). Only real keystrokes surface as changes. `[FACT: setContent.ts:52; INTERP: BR-2]`
- **BR-E1-2 · Emit `EditorDocument`, persist nothing.** E1 emits JSON only; it never touches SQLite/`@vida/core`
  (BR-1 package boundary — the export-dialog precedent). `[FACT: umbrella BR-1]`
- **BR-E1-3 · StarterKit only, explicitly configured.** E1 loads StarterKit for baseline nodes/marks (paragraph,
  headings, bold/italic, lists…); custom standard blocks (table/callout/divider/image/code-block) are E2. Any
  StarterKit extension E2/E3 will re-own is noted, not silently double-registered. `[FACT: umbrella §5 E2]`
- **BR-E1-4 · E1 owns the integration-block command TYPE MAP.** A `INTEGRATION_BLOCK_COMMANDS: readonly SlashCommand[]`
  derived from `INTEGRATION_BLOCK_TYPE` (11) — the enum→command surface E4's slash menu lists. `SlashCommand` has
  **7 required fields** — `name · label · description · icon · block_type · shortcut · category` (none optional
  `[FACT: editor.ts:144-155]`) — so each entry must populate ALL seven, not a subset. E1 ships the DATA; E5 builds
  the node-views the commands insert. `[FACT: editor.ts:144-158; umbrella E4↔E5 note]`
- **BR-E1-5 · Tamagui frame + tokens, no raw values.** The editor chrome frame uses DS tokens/sub-theme; a
  `light_/dark_Editor` sub-theme is registered in `tamagui.config.ts` ONLY if E1 needs bespoke color keys (else base
  semantic tokens — the UI-2 conditional-sub-theme rule). `[FACT: umbrella BR-4; ui-2 _index §4]`

## 5. States (§VIII — applicable subset)
`default` (resting, focusable) · `focus` (visible ring, `--color-focus-ring`, §VIII) · `disabled`
(`editable=false` — not focusable-into, no caret) · `empty` (placeholder visible). No loading/error at E1 (the app's
terminal-state wrapper owns those, UX-4 — the editor is presentational). `[FACT: standards/components.md §VIII]`

## 6. Acceptance
- [ ] `@vida/editor` deps `@tiptap/react`+`@tiptap/pm`+`@tiptap/starter-kit` (family-pinned), + `@vida/types`,
      `@vida/ui`, `react`; version bump 0.0.0→0.1.0; `tsc --build` + package build green.
- [ ] `<VidaEditor>` renders, is editable, and `onChange` emits a valid `EditorDocument` on edit (jsdom test).
- [ ] `defaultValue` seeds content; ref `setContent` replaces it; ref `getDocument` returns current JSON; ref
      `focus` moves focus in (jsdom test).
- [ ] `editable={false}` → not editable, no caret. `placeholder` shows on empty. `aria-label`/`-labelledby` sets the
      textbox name (axe clean).
- [ ] `INTEGRATION_BLOCK_COMMANDS` exports one `SlashCommand` per `INTEGRATION_BLOCK_TYPE` value (11), **each
      populating all 7 required fields** with a valid `category` — a parity test vs the enum.
- [ ] **`onChange` payload is asserted at RUNTIME against the `EditorDocument` structural contract** (top-level
      `type==='doc'`, `content` is an array of `{type: string}`) — NOT merely `getJSON() as EditorDocument`. Tiptap
      returns `JSONContent`; the cast alone would silence a shape drift vs `@vida/types.EditorNode` that reaches
      E6/persistence undetected. `[FACT: getJSON() returns Tiptap JSONContent, not @vida/types.EditorDocument]`
- [ ] Package boundary: no `@vida/core`/app import (dep check). `immediatelyRender:false` set (no StrictMode double-render).
- [ ] Component Visual Gate PASS (Storybook: default/focus/disabled/empty, both themes). `pnpm --filter @vida/editor
      typecheck && build && test` green; root typecheck 10/10.

## 7. Implementation sequence
1. **Package foundation** (preflight-grounded — mirror the `@vida/ui` toolchain concretely):
   - `package.json` v0.0.0→**0.1.0**; `dependencies`: `@tiptap/react`+`@tiptap/pm`+`@tiptap/starter-kit`+
     `@tiptap/extension-placeholder` (family-pinned), `@tamagui/core@2.6.2` (the styled frame — same pin as
     `@vida/ui`), `@vida/types`+`@vida/ui` (`workspace:*`); `peerDependencies: { react: ">=19" }`; devDeps + scripts
     copied from `@vida/ui/package.json` (Storybook 9 `@storybook/react-vite`+`addon-a11y`, `vitest@3`+`jsdom@30`,
     `@testing-library/react@16`, `@vitejs/plugin-react`, `vite@6`). `[FACT: packages/ui/package.json]`
   - Config: copy `@vida/ui`'s `vite.config.ts`, `tsconfig.storybook.json`, `.storybook/{main.ts,preview.tsx,
     preview-head.html}`; add tsconfig **project references** to `@vida/types` + `@vida/ui`; register the
     `build`/`typecheck`/`test`/`build-storybook` turbo tasks (mirror `@vida/ui`). `[FACT: ls packages/ui]`
2. `EditorDocument` ⇄ Tiptap: `useEditor` config (StarterKit, `immediatelyRender:false`), `content: defaultValue`, `onUpdate → onChange(getJSON())` with the **runtime structural assertion** (§6).
3. `<VidaEditor>` shell: **Tamagui `@tamagui/core` styled frame** (token dims/colors, BR-E1-5) wrapping `<EditorContent>`; `editable`/`placeholder`; `forwardRef` → `setContent`/`focus`/`getDocument`.
4. a11y: apply `aria-label`/`-labelledby` to the contenteditable host; focus ring; disabled semantics.
5. `INTEGRATION_BLOCK_COMMANDS` data (BR-E1-4, all 7 fields) + `index.ts` barrel (VidaEditor, types, commands).
6. Tests (jsdom) + stories — **the story renders `<VidaEditor>` under `@vida/ui`'s `UIProvider`** and smoke-verifies the contenteditable mounts with NO `react-native-web` / `process`-shim crash (the U0 lesson — `@vida/ui` is `@tamagui/core`-only) — + `packages/editor/src/CLAUDE.md` (§XXIX).
   - **E1 imports only `UIProvider`/`config`/tokens from `@vida/ui`** — it composes NO UI-1 primitive yet (Menu/Button arrive at E3/E4). Keeps the E1↔`@vida/ui` boundary honest (the dep is for the Tamagui context + sub-theme, not primitive reuse). `[gate-2 note 6]`
   - **jsdom test guard:** `immediatelyRender:false` defers first render to a post-mount effect, so tests must `await`/`waitFor(() => editor.isEditable)` (or `findBy*`) before asserting the first `onChange` — never a synchronous `getByRole('textbox')` immediately after `render()`. `[gate-2 note 7]`

**Preflight (2026-08-11) = PASS + 4 folds** (all now in §6/§7): toolchain mirror (concrete file/dep list) · `@tamagui/core`+`@vida/ui`+`react>=19` deps · `EditorContent`-under-`UIProvider` no-RN-web smoke · monorepo tsconfig-refs + turbo tasks. No blockers.

## 8. Open UNKNOWNs
- [RESOLVED at PLAN] uncontrolled+imperative (BR-E1-1) · package set (react+pm+starter-kit) · React 19 core-OK · owns the command type-map.
- [RESOLVED — add dep at step 2] `Placeholder` is a **separate package in Tiptap v3** (`@tiptap/extension-placeholder`), NOT bundled in StarterKit; the §3 `placeholder` prop requires adding it at this unit. `[FACT: tiptap-docs — extension-placeholder is a standalone package]`
- [UNKNOWN: needs impl] `light_/dark_Editor` sub-theme needed, or base tokens suffice? Decide at step 3 per BR-E1-5.
- [NOTE · mount emit] `onChange` fires once on mount when Tiptap normalizes the seeded `defaultValue` (an init
  `onUpdate`), in addition to real keystrokes. This is a **benign, idempotent echo** — the app persists the value it
  just seeded (a no-op re-write, not a loop). Programmatic RESETS are silenced at the source (`setContent
  emitUpdate:false`), so the only non-edit emit is this one mount echo; per BR-E1-2 the app owns persistence and should
  dirty-check/dedupe regardless. Deterministically suppressing the mount emit needs content-comparison with
  normalization edge-cases and is out of E1 scope; documented rather than hacked. `[FACT: verified — init emit carries the seeded doc]`
- [NOTE for E3, not E1] Tiptap v3 defaults `shouldRerenderOnTransaction:false` (v2 always re-rendered); E1's `onUpdate` write path is unaffected, but E3's toolbar (active-mark reflection) will need `useEditorState` or an opt-in. `[FACT: tiptap v3 render model]`

## 9. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-11 | ui-3-vida-editor | E1 sub-spec authored at PLAN; /read-docs-first (Tiptap v3: react+pm+starter-kit, useEditor/onUpdate/getJSON, immediatelyRender:false, React-19 core-OK); uncontrolled+imperative API decided (BR-E1-1) grounded in Tiptap state model + BR-2 M4 inversion |
| 2026-08-11 | ui-3-vida-editor | **/critique SHIP → folded 3 findings.** Critic endorsed the uncontrolled+imperative API as forward-sound + verified all Tiptap-v3 facts + citations. Added: runtime `EditorDocument` structural assertion gate (MATERIAL C — getJSON returns Tiptap `JSONContent`, cast would hide drift); all-7-required-`SlashCommand`-fields (A); Placeholder resolved as a separate v3 dep (B); E3 `shouldRerenderOnTransaction` note. |
| 2026-08-11 | ui-3-vida-editor | **IMPLEMENTED (Session 2) + post-impl critique SHIP.** Independent adversarial critique = SHIP, no blockers/material. Folded 1 MINOR: `setContent` passes `emitUpdate:false` (Tiptap v3 defaults true — verified `setContent.ts:52`) so a programmatic reset never echoes through `onChange` (BR-E1-1 reset≠edit; avoids save-echo + M4 Yjs-feedback) + a test pinning it. Also fixed a surfaced ISOLATED `@vida/ui` barrel defect (runtime `import './tamagui.d.ts'` → `/// <reference>`; `docs/specs/fixes/ui-tamagui-dts-runtime-import/`). |
| 2026-08-11 | ui-3-vida-editor | **/preflight PASS + 4 folds → gate-2 critique SHIP → Approval 2.** Preflight grounded the toolchain concretely (mirror `@vida/ui`: Storybook 9 + vitest 3/jsdom 30 + vite 6 + `@tamagui/core@2.6.2` + workspace deps + tsconfig refs + turbo tasks) + the `EditorContent`-under-`UIProvider` no-RN-web smoke. Gate-2 confirmed all fixes landed vs live source, verified no `@vida/editor`↔`@vida/ui` cycle + `@tamagui/core` single-context pin coherence; folded 2 MINOR (E1 imports only UIProvider/config/tokens; jsdom `waitFor(isEditable)` guard). Cleared to implement. |
