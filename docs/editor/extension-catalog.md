# @vida/editor — extension catalog (ground truth)

> Durable, living catalog of the Tiptap extensions `@vida/editor` registers, per unit (§XXIX). One row per node/mark:
> where it comes from, how it's configured, and the Markdown mapping E6 inherits. Standard blocks = the
> `STANDARD_BLOCK_TYPE` set `[FACT: packages/types/src/editor.ts:12-24]`; serializers (E6–E8) extend this file later.
> Scope today: **E1 (StarterKit spine) + E2 (standard blocks) + E5 (integration blocks)**.

## Standard blocks — `STANDARD_BLOCK_TYPE` (11)

Every enum value is a registered ProseMirror node (proven by the schema-parity test,
`src/extensions/standard-blocks.test.tsx` BR-E2-9). "Owned by" = the extension that registers the node.

| Node (`type`)                                          | Owned by                               | Unit   | Config                                                                                                                     | Markdown (for E6)                                                                             |
| ------------------------------------------------------ | -------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `paragraph`                                            | StarterKit                             | E1     | default                                                                                                                    | blank-line-separated text                                                                     |
| `heading`                                              | StarterKit                             | E1     | default (levels 1–6)                                                                                                       | `#`×level                                                                                     |
| `bulletList` / `listItem`                              | StarterKit                             | E1     | default                                                                                                                    | `- `                                                                                          |
| `orderedList` / `listItem`                             | StarterKit                             | E1     | default                                                                                                                    | `1. `                                                                                         |
| `blockquote`                                           | StarterKit                             | E1     | default                                                                                                                    | `> `                                                                                          |
| `codeBlock`                                            | StarterKit                             | E1     | default (no syntax highlight — BR-E2-8; lowlight deferred past M1.0)                                                       | fenced ` ` ```                                                                                |
| `horizontalRule` (divider)                             | StarterKit                             | E1     | default                                                                                                                    | `---`                                                                                         |
| **`taskList` / `taskItem`**                            | `@tiptap/extension-list`               | **E2** | `TaskItem.configure({ nested: true })`; inherits StarterKit's `listKeymap` (BR-E2-3)                                       | `- [ ]` / `- [x]` (GFM task list)                                                             |
| **`image`**                                            | `@tiptap/extension-image`              | **E2** | `.configure({ inline: false, allowBase64: true })` — presentational; attachment pipeline deferred (BR-E2-5)                | `![alt](src)`                                                                                 |
| **`table` / `tableRow` / `tableCell` / `tableHeader`** | `@tiptap/extension-table` (`TableKit`) | **E2** | `TableKit.configure({ table: { resizable: false } })` — one dep bundles all four                                           | GFM pipe table                                                                                |
| **`callout`**                                          | bespoke `src/extensions/callout.ts`    | **E2** | `Node.create`, `group:'block'`, `content:'block+'`, `defining:true`, attr `variant ∈ {info,success,danger}` default `info` | **[E6 decides]** fenced container vs blockquote-with-marker — the `variant` attr must survive |

## Integration blocks — `INTEGRATION_BLOCK_TYPE` (11), E5

The editor's ADR-008 `inline` render surface. Every value is a registered atom `Node` (schema-parity test in
`extensions/integration-blocks.test.tsx`), built by `createIntegrationBlockNode` over `INLINE_BLOCK_DEFS`. Each renders a
placeholder node-view until its module ships (CB6). "Config schema" = the node attrs declared from the `@vida/types`
interface (`rendered:false` → JSON-only; the 4 without an interface register attr-less). NOTE: `taskChecklist` (the
`/tasks` integration block reading real `tasks` rows) is DISTINCT from the standard `taskList` block above.

| Node (`type`)    | Config schema (node attrs)                               | Slash          | Real body                 |
| ---------------- | -------------------------------------------------------- | -------------- | ------------------------- |
| `dailySummary`   | `date · sections`                                        | `/summary`     | MOD-notes/journal         |
| `taskChecklist`  | `project_id · milestone_id · due_before`                 | `/tasks`       | MOD-tasks                 |
| `eventsBlock`    | _(schema pending)_                                       | `/events`      | MOD-relationships         |
| `classesBlock`   | _(schema pending)_                                       | `/classes`     | MOD-learning              |
| `habitsBlock`    | `date · filter_time_of_day`                              | `/habits`      | MOD-habits                |
| `timelineBlock`  | `entityType · entityIds · dateField · labelField`        | `/timeline`    | MOD-\*                    |
| `chartBlock`     | `chartType · dataSource · config`                        | `/chart`       | MOD-finance               |
| `pomodoroBlock`  | `entityType · entityId · work_duration · break_duration` | `/pomodoro`    | MOD-sessions              |
| `entityLink`     | `entityType · entityId · label`                          | `/entity-link` | MOD-notes                 |
| `backlink`       | _(schema pending)_                                       | `/backlink`    | MOD-notes (AR-8 resolver) |
| `milestoneBlock` | _(schema pending)_                                       | `/milestone`   | MOD-projects              |

## Marks

`bold` · `italic` · `strike` · `code` · `underline` · `link` — all from StarterKit (E1), default config.

## Deferred (not yet registered)

- **Placeholder** (`@tiptap/extension-placeholder`, E1) — a decoration, not a node; marks the empty node for the
  injected placeholder CSS.
- **Integration-block REAL bodies** (MOD-_ phases) — E5 shipped the placeholder node-views (above); each module's
  MOD-_ phase replaces its type's node-view with the live body, and MOD-notes #31 wires AR-7's `CapabilityRegistry`.
- **Yjs / `y-prosemirror`** — a deferred seam (BR-2, M4/AR-9b); no dep.

## Styling

Standard-block chrome is injected CSS in `src/internal/editor-styles.ts` — colours are BASE Tamagui theme vars only
(callout/selection accents = `--colorBrandPrimary`/`--colorSignalSuccess`/`--colorSignalDanger`; table/code =
`--colorBorderDefault`/`--colorSurfaceSecondary`; tints via `color-mix(… , transparent)` on a token) — never raw hex,
and **never** the `_Toast` sub-theme's `--accent*` vars (they don't resolve on the editor's unnamed base-scope frame —
the "cite tokens from emitted output" lesson). (BR-E2-7)
The E5 integration placeholder is the ONE React node-view — a Tamagui card composed from base tokens (its visual
styling is Tamagui, not injected CSS). Its inter-block vertical rhythm is the single
`.vida-integration-block{margin:0.5em 0}` rule here, matching table/callout/image/hr (the wrapper div has no default
margin). (BR-E5-4)

## Verify

`pnpm --filter @vida/editor test` (schema-parity + per-block round-trip) · Visual Gate:
`pnpm --filter @vida/editor storybook` → the "Standard blocks" story, both themes.
