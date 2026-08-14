# @vida/editor — block registry (ground truth)

> Durable description of how `@vida/editor` exposes platform capabilities as editor blocks (§XXIX). Governing decision:
> **ADR-008 (capability/block registry)**. Filled at E5. Consumed by `/critique` + `/preflight`.

## What it is
The editor is the **`inline` render surface** of the ADR-008 capability registry, NOT the owner of block definitions
`[FACT: ADR-008 §3.4:104-109 "@vida/editor provides the inline render surface… a registered capability with an inline
target is exposed as a TipTap node + slash-menu entry"]`. The single definition registry (`capability_definitions` +
`CapabilityRegistry`) was shipped by **AR-7** in `@vida/core/foundation/capability/` `[FACT:
docs/core/capability/current-spec.md]`; AR-7 explicitly deferred the editor-side realization — "inline instances ·
TipTap re-home · BlockType union · per-Block visual" — to **UI-3 #29 / MOD-notes #31** `[FACT:
docs/core/capability/current-business-rules.md:26]`. **E5 is UI-3's half of that re-home.**

## The two halves of the re-home
| Concern | Home | Status |
|---|---|---|
| The definition registry (config_schema, render_targets, terminal_states) | AR-7, `@vida/core` | ✅ shipped |
| Editor-side inline nodes + placeholder node-views (the `inline` renderer) | **UI-3 #29 / E5** | ✅ this unit |
| Wiring the real `CapabilityRegistry` into the editor at app-mount | MOD-notes #31 | ⏳ deferred |
| Each capability's REAL inline body (replaces the placeholder) | per-module MOD-* | ⏳ deferred |
| `standalone` render surface (`block_instances` widgets on Spaces) | `@vida/ui` + MOD-notes | ⏳ not the editor |

## E5's registry (the inline adapter)
`src/extensions/integration-blocks.tsx`:
- **`INLINE_BLOCK_DEFS`** — the M1.0 definition source: E1's `INTEGRATION_BLOCK_COMMANDS` joined to a per-type
  `configSchema`. `InlineBlockDef` is an **inline SLICE** (`name · label · description · configSchema`), NOT AR-7's full
  `CapabilityDefinition`; MOD-notes #31 supplies a `CapabilityDefinition → InlineBlockDef` adapter (`def_id→name`, JSON
  `config_schema`→the `{default}` map). The closed `INTEGRATION_BLOCK_TYPE` enum is the interim source — the "BlockType
  union" re-home ADR-008 opens `[FACT: ADR-002:13; ADR-008 §2]`.
- **`createIntegrationBlockNode(def)`** — one atom `Node` per capability (`name` = `block_type`). Config lives in node
  attrs per the `config_schema` (CB2: "inline = editor-node attrs, no table") `[FACT: ADR-008 §data-model:122; CB2]`.
- **`INTEGRATION_BLOCK_EXTENSIONS`** — spread into `useEditor` after the standard blocks (editor.tsx).
- **`AVAILABLE_INTEGRATION_BLOCKS`** — the availability set the slash menu reads (all 11; closes the E4 seam).

## Placeholder = the inline terminal state (CB6)
Until a capability's MOD-* ships its real inline body, its node renders `IntegrationBlockPlaceholder` — a React
node-view (`ReactNodeViewRenderer`) showing the label + "Available when its module ships": the inline render target's
`empty/unavailable` terminal state, graceful degradation, never a crash `[FACT: ADR-008 §terminal-states:142; CB6]`.

## Config preservation (CB2) — lossless for the declared schema
The 7 typed capabilities declare their `@vida/types` config-schema interface as node attrs (`satisfies`-guarded at
compile time; `rendered:false` → JSON-only). ProseMirror round-trips declared attrs, so an inline instance's config
survives render→re-serialize. The 4 schema-less types (`eventsBlock`/`classesBlock`/`backlink`/`milestoneBlock`)
register attr-less until their MOD-* authors the schema. A doc carrying an undeclared attr degrades (TipTap lenient
content-load: warn + empty), it never crashes. `[FACT: integration-blocks.tsx; integration-blocks.test.tsx]`

## Boundary
`@vida/editor` never imports `@vida/core`/the `CapabilityRegistry` (BR-1). E5 is the editor-side adapter only; the
registry wiring is MOD-notes #31. `[FACT: boundary grep clean]`

## Verify
`pnpm --filter @vida/editor test` (schema-parity, config round-trip, discriminator, availability) · Visual Gate: the
"Integration blocks (placeholders)" story, both themes.
