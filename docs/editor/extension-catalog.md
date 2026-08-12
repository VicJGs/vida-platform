# @vida/editor — extension catalog (ground truth)

> Durable, living catalog of the Tiptap extensions `@vida/editor` registers, per unit (§XXIX). One row per node/mark:
> where it comes from, how it's configured, and the Markdown mapping E6 inherits. Standard blocks = the
> `STANDARD_BLOCK_TYPE` set `[FACT: packages/types/src/editor.ts:12-24]`; integration blocks (E5) + serializers (E6–E8)
> extend this file later. Scope today: **E1 (StarterKit spine) + E2 (standard blocks)**.

## Standard blocks — `STANDARD_BLOCK_TYPE` (11)
Every enum value is a registered ProseMirror node (proven by the schema-parity test,
`src/extensions/standard-blocks.test.tsx` BR-E2-9). "Owned by" = the extension that registers the node.

| Node (`type`) | Owned by | Unit | Config | Markdown (for E6) |
|---|---|---|---|---|
| `paragraph` | StarterKit | E1 | default | blank-line-separated text |
| `heading` | StarterKit | E1 | default (levels 1–6) | `#`×level |
| `bulletList` / `listItem` | StarterKit | E1 | default | `- ` |
| `orderedList` / `listItem` | StarterKit | E1 | default | `1. ` |
| `blockquote` | StarterKit | E1 | default | `> ` |
| `codeBlock` | StarterKit | E1 | default (no syntax highlight — BR-E2-8; lowlight deferred past M1.0) | fenced ``` ``` ``` |
| `horizontalRule` (divider) | StarterKit | E1 | default | `---` |
| **`taskList` / `taskItem`** | `@tiptap/extension-list` | **E2** | `TaskItem.configure({ nested: true })`; inherits StarterKit's `listKeymap` (BR-E2-3) | `- [ ]` / `- [x]` (GFM task list) |
| **`image`** | `@tiptap/extension-image` | **E2** | `.configure({ inline: false, allowBase64: true })` — presentational; attachment pipeline deferred (BR-E2-5) | `![alt](src)` |
| **`table` / `tableRow` / `tableCell` / `tableHeader`** | `@tiptap/extension-table` (`TableKit`) | **E2** | `TableKit.configure({ table: { resizable: false } })` — one dep bundles all four | GFM pipe table |
| **`callout`** | bespoke `src/extensions/callout.ts` | **E2** | `Node.create`, `group:'block'`, `content:'block+'`, `defining:true`, attr `variant ∈ {info,success,danger}` default `info` | **[E6 decides]** fenced container vs blockquote-with-marker — the `variant` attr must survive |

## Marks
`bold` · `italic` · `strike` · `code` · `underline` · `link` — all from StarterKit (E1), default config.

## Deferred (not yet registered)
- **Placeholder** (`@tiptap/extension-placeholder`, E1) — a decoration, not a node; marks the empty node for the
  injected placeholder CSS.
- **Integration blocks** (E5) — the 11 `INTEGRATION_BLOCK_TYPE` node-views (`extensions/*.ts` skeletons:
  `daily-summary`, `task-checklist`, `events-block`, …). NOTE: `task-checklist` (the `/tasks` integration block that
  reads real `tasks` rows) is DISTINCT from the standard `taskList` block above. `[FACT: INTEGRATION_BLOCK_TYPE vs STANDARD_BLOCK_TYPE]`
- **Yjs / `y-prosemirror`** — a deferred seam (BR-2, M4/AR-9b); no dep.

## Styling
Standard-block chrome is injected CSS in `src/internal/editor-styles.ts` — colours are BASE Tamagui theme vars only
(callout/selection accents = `--colorBrandPrimary`/`--colorSignalSuccess`/`--colorSignalDanger`; table/code =
`--colorBorderDefault`/`--colorSurfaceSecondary`; tints via `color-mix(… , transparent)` on a token) — never raw hex,
and **never** the `_Toast` sub-theme's `--accent*` vars (they don't resolve on the editor's unnamed base-scope frame —
the "cite tokens from emitted output" lesson). No React node-views. (BR-E2-7)

## Verify
`pnpm --filter @vida/editor test` (schema-parity + per-block round-trip) · Visual Gate:
`pnpm --filter @vida/editor storybook` → the "Standard blocks" story, both themes.
