// E5 (UI-3) — the editor-side `inline` render adapter for the ADR-008 capability registry. Each platform integration
// capability with an `inline` render target is exposed as a TipTap node (ADR-008 §3.4); until its module body ships,
// the node renders a PLACEHOLDER node-view — the inline render target's `empty/unavailable` terminal state (CB6),
// graceful-degradation, never a crash. This is the "TipTap re-home" AR-7 deferred to UI-3 #29
// (docs/core/capability/current-business-rules.md:26). E5 builds NO real body (MOD-* phases) and does NOT import the
// @vida/core CapabilityRegistry (MOD-notes #31 wires it) — it builds the editor-side adapter + placeholders.
// Spec: docs/specs/features/ui-3-vida-editor/e5-block-registry.md · BR-E5-1..7.
import type { ReactElement } from 'react'
import { Node, mergeAttributes, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import type { Extensions } from '@tiptap/react'
import { styled, Text, View } from '@tamagui/core'
import {
  INTEGRATION_BLOCK_TYPE,
  type IntegrationBlockType,
  type DailySummaryBlockAttrs,
  type EntityLinkBlockAttrs,
  type ChartBlockAttrs,
  type TimelineBlockAttrs,
  type PomodoroBlockAttrs,
  type HabitsBlockAttrs,
  type TaskChecklistBlockAttrs,
  type SlashCommand,
} from '@vida/types'
import { INTEGRATION_BLOCK_COMMANDS } from '../commands'

// ── config schemas → node attrs (CB2: "inline = editor-node attrs") ──────────────────────────────────────────────────
// Each attr declaration is `{ default, rendered:false }`: `rendered:false` keeps the config OUT of the HTML DOM (so
// renderHTML stays a clean type-identifying `<div>` and a `string[]` never stringifies to `[object Object]` — the HTML
// per-attr codec is deferred to E6, BR-E5-3/fold-D), while `Node.fromJSON`/`toJSON` still round-trip the declared attrs
// LOSSLESSLY for the declared schema (BR-E5-2). Every attr carries a `default` — a `default`-less declared attr makes
// ProseMirror `computeAttrs` throw "No value supplied" on the no-attrs slash insert (BR-E5-5).
// `default` may be a FUNCTION for mutable (object/array) attrs — TipTap invokes it at schema build (`@tiptap/core`
// buildAttributeSpec: `if (typeof mergedAttr.default === 'function') mergedAttr.default = mergedAttr.default()`), so each
// editor's schema gets its OWN fresh array/object instead of one module-global shared reference (the shared-mutable
// default footgun; gate-2 note). Scalars stay plain values (immutable → share-safe). ProseMirror attrs are still
// immutable-BY-CONVENTION (mutate via `updateAttributes` → a new node, never in place), so within a schema this is safe.
type AttrDefault = unknown | (() => unknown)
type AttrSpec = { default: AttrDefault; rendered: false }
type ConfigSchema = Record<string, AttrSpec>

// The 7 typed capabilities transcribe their `@vida/types` config-schema interface into a runtime attr map. The
// `satisfies Record<keyof …Attrs, AttrSpec>` is the COMPILE-TIME drift guard (fold A): a missing or extra key vs the
// interface fails `typecheck` (interfaces are erased — a runtime key-parity test is infeasible).
const DAILY_SUMMARY_SCHEMA = {
  date: { default: null, rendered: false },
  sections: { default: () => [], rendered: false },
} satisfies Record<keyof DailySummaryBlockAttrs, AttrSpec>

const ENTITY_LINK_SCHEMA = {
  entityType: { default: '', rendered: false },
  entityId: { default: '', rendered: false },
  label: { default: '', rendered: false },
} satisfies Record<keyof EntityLinkBlockAttrs, AttrSpec>

const CHART_SCHEMA = {
  chartType: { default: 'bar', rendered: false },
  dataSource: { default: '', rendered: false },
  config: { default: () => ({}), rendered: false },
} satisfies Record<keyof ChartBlockAttrs, AttrSpec>

const TIMELINE_SCHEMA = {
  entityType: { default: '', rendered: false },
  entityIds: { default: () => [], rendered: false },
  dateField: { default: '', rendered: false },
  labelField: { default: '', rendered: false },
} satisfies Record<keyof TimelineBlockAttrs, AttrSpec>

const POMODORO_SCHEMA = {
  entityType: { default: null, rendered: false },
  entityId: { default: null, rendered: false },
  work_duration: { default: 25, rendered: false },
  break_duration: { default: 5, rendered: false },
} satisfies Record<keyof PomodoroBlockAttrs, AttrSpec>

const HABITS_SCHEMA = {
  date: { default: null, rendered: false },
  filter_time_of_day: { default: null, rendered: false },
} satisfies Record<keyof HabitsBlockAttrs, AttrSpec>

const TASK_CHECKLIST_SCHEMA = {
  project_id: { default: null, rendered: false },
  milestone_id: { default: null, rendered: false },
  due_before: { default: null, rendered: false },
} satisfies Record<keyof TaskChecklistBlockAttrs, AttrSpec>

// The 4 remaining types (`eventsBlock`, `classesBlock`, `backlink`, `milestoneBlock`) have NO `@vida/types` attr
// interface yet — their config schema is authored by their MOD-* alongside the real body (BR-E5-2 [UNKNOWN]). They
// register attr-less; a doc carrying their (future) config degrades under TipTap's lenient content-load, not a crash.
const CONFIG_SCHEMAS: Partial<Record<IntegrationBlockType, ConfigSchema>> = {
  dailySummary: DAILY_SUMMARY_SCHEMA,
  entityLink: ENTITY_LINK_SCHEMA,
  chartBlock: CHART_SCHEMA,
  timelineBlock: TIMELINE_SCHEMA,
  pomodoroBlock: POMODORO_SCHEMA,
  habitsBlock: HABITS_SCHEMA,
  taskChecklist: TASK_CHECKLIST_SCHEMA,
}

// ── the inline definition slice (mirrors a CapabilityDefinition's inline fields — MOD-notes #31 adapts the real def) ──
export interface InlineBlockDef {
  name: IntegrationBlockType
  label: string
  description: string
  configSchema: ConfigSchema
}

const DEF_BY_NAME: Record<string, SlashCommand> = Object.fromEntries(
  INTEGRATION_BLOCK_COMMANDS.map((c) => [c.block_type, c]),
)

/** The M1.0 definition source: E1's command DATA joined to the per-type config schema (BR-E5-1). */
export const INLINE_BLOCK_DEFS: readonly InlineBlockDef[] = INTEGRATION_BLOCK_COMMANDS.map((c) => ({
  name: c.block_type,
  label: c.label,
  description: c.description,
  configSchema: CONFIG_SCHEMAS[c.block_type] ?? {},
}))

// ── the placeholder node-view (CB6 terminal state; the FIRST React node-view in the editor) ──────────────────────────
const PlaceholderCard = styled(View, {
  backgroundColor: '$colorSurfaceSecondary',
  borderColor: '$colorBorderDefault',
  borderWidth: 1,
  borderRadius: '$md',
  paddingHorizontal: '$12',
  paddingVertical: '$8',
  gap: '$2',
})

const CardTitle = styled(Text, {
  fontFamily: '$body',
  fontSize: '$small',
  color: '$colorTextPrimary',
})

const CardText = styled(Text, {
  fontFamily: '$body',
  fontSize: '$caption',
  color: '$colorTextMuted',
})

/**
 * The inert placeholder rendered for every integration block until its module ships. `contentEditable={false}` (an atom
 * has no editable child); `role="note"` + an accessible name announce a named, non-broken region (BR-E5-4, §XIV). It
 * shows the capability's label + description; the config attrs live in node state (round-tripped), NOT displayed here.
 */
function IntegrationBlockPlaceholder({ node }: NodeViewProps): ReactElement {
  const def = DEF_BY_NAME[node.type.name]
  const label = def?.label ?? node.type.name
  return (
    <NodeViewWrapper className="vida-integration-block" data-block-type={node.type.name}>
      <PlaceholderCard role="note" aria-label={`${label} — available when its module ships`} contentEditable={false}>
        <CardTitle>{label}</CardTitle>
        {def?.description ? <CardText>{def.description}</CardText> : null}
        <CardText fontStyle="italic">Available when its module ships</CardText>
      </PlaceholderCard>
    </NodeViewWrapper>
  )
}

// ── the node factory (BR-E5-1) ───────────────────────────────────────────────────────────────────────────────────────
/**
 * One inline TipTap node per integration capability. `atom:true` (no editable child content — a stub, not a container);
 * `selectable`/`draggable` like any block. All 11 register the SAME `data-type="integration-block"` parse tag, so the
 * per-node `getAttrs` discriminator returns `false` unless `data-block-type` matches THIS node's name — without it the
 * first-registered node would claim every integration `<div>` (BR-E5-3, the v3 parseDOM skip-rule gotcha).
 */
export function createIntegrationBlockNode(def: InlineBlockDef): Node {
  return Node.create({
    name: def.name,
    group: 'block',
    atom: true,
    selectable: true,
    draggable: true,

    addAttributes() {
      return def.configSchema
    },

    parseHTML() {
      return [
        {
          tag: 'div[data-type="integration-block"]',
          getAttrs: (el) =>
            el instanceof HTMLElement && el.getAttribute('data-block-type') === def.name ? null : false,
        },
      ]
    },

    renderHTML({ HTMLAttributes }) {
      // Atom → no content hole. Config attrs are `rendered:false`, so only the type-identifying data-* reach the DOM.
      return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'integration-block', 'data-block-type': def.name })]
    },

    addNodeView() {
      return ReactNodeViewRenderer(IntegrationBlockPlaceholder)
    },
  })
}

/** The 11 inline integration nodes, spread into the editor's extensions array AFTER the standard blocks (editor.tsx). */
export const INTEGRATION_BLOCK_EXTENSIONS: Extensions = INLINE_BLOCK_DEFS.map(createIntegrationBlockNode)

/**
 * The availability set the slash menu reads (BR-E5-5, closes the E4 `isBlockAvailable` seam). E5 registers a node-view
 * for every type, so every type "lights up" (slash-commands.ts:17). MOD-notes #31 may later narrow this to the shipped
 * subset; today all 11 render as placeholders, so all 11 are insertable.
 */
export const AVAILABLE_INTEGRATION_BLOCKS: ReadonlySet<IntegrationBlockType> = new Set(INTEGRATION_BLOCK_TYPE)
