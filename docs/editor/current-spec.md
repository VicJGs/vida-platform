# @vida/editor — current spec (ground truth)

> Durable, living description of what `@vida/editor` IS as built (§XXIX Currency Rule). Refreshed per unit; never lags
> the code. Source of truth for `/critique` + `/preflight` + `victor:session-kickoff`. Every claim cites code.
> Scope today: **E1 — editor core spine** (UI-3). Later units (E2 blocks · E3 toolbar · E4 slash-menu · E5 registry ·
> E6–E8 serializers) extend this file. Forward spec: `docs/specs/features/ui-3-vida-editor/`.

## Package
`@vida/editor` **v0.1.0** — the TipTap block editor at the heart of Notes & Journals (ADR-001 §8). Built on Tiptap
**v3** (`@tiptap/react` + `@tiptap/pm` + `@tiptap/starter-kit` + `@tiptap/extension-placeholder`, family-pinned
`^3.30.0`) + `@tamagui/core@2.6.2` + `@vida/types`/`@vida/ui` (workspace). Peer `react>=19`.
`[FACT: packages/editor/package.json]` Toolchain (Storybook 9 · vitest 3 · jsdom 30 · vite 6) mirrors `@vida/ui`.

## Public surface `[FACT: packages/editor/src/index.ts]`
- `VidaEditor` (+ `VidaEditorProps`, `VidaEditorHandle`) — the editor component.
- `assertEditorDocument(json): EditorDocument` — the runtime structural gate.
- `INTEGRATION_BLOCK_COMMANDS`, `INTEGRATION_BLOCK_COMMAND_COUNT` — the slash-command type map.
- Re-exported types `EditorDocument`/`EditorNode`/`EditorMark`/`SlashCommand` (owned by `@vida/types`, re-exported not
  redefined).

## `<VidaEditor>` contract `[FACT: packages/editor/src/editor.tsx]`
```ts
interface VidaEditorProps {
  defaultValue?: EditorDocument          // seeds the doc ONCE (uncontrolled)
  onChange?: (doc: EditorDocument) => void // emitted on user edits (+ one benign mount echo)
  editable?: boolean                     // default true; false = read-only, no caret
  placeholder?: string                   // empty-state text
  'aria-label'?: string                  // one of aria-label/-labelledby REQUIRED (dev-warns if neither)
  'aria-labelledby'?: string
}
interface VidaEditorHandle { setContent(doc): void; focus(): void; getDocument(): EditorDocument }
```
- `forwardRef` (mandatory, §VII) carries the imperative handle.
- Built on `useEditor({ extensions:[StarterKit, Placeholder], content:defaultValue, editable,
  immediatelyRender:false, editorProps:{attributes:{role:'textbox','aria-multiline':'true', <name>}}, onUpdate })`.
  `immediatelyRender:false` defers first render to a post-mount effect (StrictMode safety).
- Editor created ONCE; `onChange` read via a ref (no recreation on parent re-render); `editable` synced via
  `setEditable` in a `[editor, editable]` effect.

## Chrome / tokens `[FACT: editor.tsx EditorFrame; internal/editor-styles.ts]`
- Frame = an unnamed `@tamagui/core` `styled(View)` on BASE semantic tokens — `$colorSurfacePrimary` bg,
  `$colorBorderDefault` 1px border, `borderRadius:'$md'` (radius token SCALE, not a sub-theme key), `$12`/`$8` inset,
  `minHeight:120`. **No `light_/dark_Editor` sub-theme; `tamagui.config.ts` untouched** (base tokens suffice).
- Injected CSS (`internal/editor-styles.ts`, idempotent, browser-only) for what the frame can't reach on the inner
  `.ProseMirror`: focus ring on the frame via `:has(.ProseMirror:focus-visible)` → `var(--colorFocusRing)`;
  placeholder `::before` → `var(--colorTextMuted)` (base semantic, NOT sub-theme-only `--placeholder`).

## States (§VIII applicable subset) `[FACT: editor.tsx; editor.stories.tsx]`
`default` (resting/focusable) · `focus` (frame ring) · `disabled` (`editable=false`, no caret) · `empty` (placeholder).
No loading/error at E1 (the app's terminal-state wrapper owns those, UX-4).

## Integration-block command map `[FACT: commands.ts]`
`INTEGRATION_BLOCK_COMMANDS` = one `SlashCommand` per `INTEGRATION_BLOCK_TYPE` (11), all 7 required fields populated,
`category ∈ {platform, embed}`. E1 ships the DATA; E5 builds the node-views the commands insert.

## File map `[FACT: packages/editor/src]`
`editor.tsx` (VidaEditor + assertEditorDocument) · `commands.ts` · `internal/editor-styles.ts` · `index.ts` (barrel) ·
`env.d.ts` (ambient `process.env` type) · `test-setup.ts` (jsdom shims) · `editor.test.tsx`/`commands.test.ts` (18
tests) · `editor.stories.tsx` (Visual-Gate surface) · `CLAUDE.md` (layer doc).
**Deferred (empty skeleton):** `toolbar.tsx` (E3) · `slash-menu.tsx` (E4) · `extensions/*` (E2/E5) · `serializers/*`
(E6–E8). Yjs = a deferred seam, no dep (BR-2/M4).

## Verify
`pnpm --filter @vida/editor typecheck && build && test` (18 tests) · Visual Gate `pnpm --filter @vida/editor storybook`.
