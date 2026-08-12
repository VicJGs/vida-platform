// E2 (UI-3) — Callout: a bespoke standard block. No official Tiptap extension exists for it, so this is a
// hand-rolled ProseMirror node (spec §3, BR-E2-6). Rendered/parsed as <div data-type="callout" data-variant>;
// styled by injected CSS (internal/editor-styles.ts), NOT a React node-view — the E1 editor-styles precedent
// (leaner; no ReactNodeViewRenderer overhead).
// Spec: docs/specs/features/ui-3-vida-editor/e2-standard-blocks.md · BR-E2-6.
import { Node, mergeAttributes } from '@tiptap/react'

/**
 * Callout intent variants — EXACTLY the `ToastIntent` set (packages/ui/src/internal/toast-store.ts:10), so each
 * binds to an existing accent token (`$accentInfo`/`$accentSuccess`/`$accentDanger`). There is deliberately no
 * `warn` variant: no `signal.warning` token exists at any DS layer and BR-E2-7 forbids raw hex (spec §4 BR-E2-6).
 */
export const CALLOUT_VARIANT = ['info', 'success', 'danger'] as const
export type CalloutVariant = (typeof CALLOUT_VARIANT)[number]

const DEFAULT_VARIANT: CalloutVariant = 'info'

/** An absent or out-of-set `data-variant` resolves to the default — never throws (spec §6 acceptance). */
function normalizeVariant(value: unknown): CalloutVariant {
  return CALLOUT_VARIANT.includes(value as CalloutVariant) ? (value as CalloutVariant) : DEFAULT_VARIANT
}

export interface CalloutOptions {
  /** Extra attributes merged onto the rendered `<div>` (Tiptap convention). */
  HTMLAttributes: Record<string, unknown>
}

/**
 * A block-level callout container. `content: 'block+'` → holds one or more block nodes and can never be empty
 * (ProseMirror auto-inserts a paragraph). `defining: true` keeps the callout intact across edits at its boundaries.
 * The `variant` attribute round-trips through `getJSON()` into the `EditorDocument`, surviving to the serializers (E6).
 */
export const Callout = Node.create<CalloutOptions>({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  // Isolating (E3): the callout's content never merges with sibling blocks across its boundary — the correct
  // container semantics AND what lets `insertContent({type:'callout', …})` place a CLOSED callout (without it, the
  // inserted slice "opens" and the inner paragraph flows out, dropping the wrapper — the E3 insert path needs this).
  isolating: true,

  addOptions() {
    return { HTMLAttributes: {} }
  },

  addAttributes() {
    return {
      variant: {
        default: DEFAULT_VARIANT,
        parseHTML: (element) => normalizeVariant(element.getAttribute('data-variant')),
        renderHTML: (attributes) => ({ 'data-variant': normalizeVariant(attributes.variant) }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'callout', class: 'vida-callout' }),
      0,
    ]
  },
})

// E3 (UI-3) — callout insertion (BR-E3-4a). E2 shipped no insertion command; E3's toolbar needs one. The idiomatic
// Tiptap home would be an `addCommands` `setCallout` on this node + a `declare module '@tiptap/core'` chain
// augmentation — but that in-source augmentation does NOT propagate to the toolbar's `ChainedCommands` type in this
// pnpm monorepo (node_module extensions' shipped-.d.ts augmentations do; an in-source one didn't). Rather than fight
// it with casts, the toolbar inserts a callout via the already-typed `insertContent` (see toolbar.tsx / DEV note) —
// the EXACT operation `setCallout` would run. The node's attr `default`/`renderHTML normalizeVariant` still resolve an
// omitted variant → `info` (gate-2 MAT-1: one source of truth). This helper documents the canonical insert payload.
export function calloutInsertContent(variant?: CalloutVariant): {
  type: 'callout'
  attrs?: { variant: CalloutVariant }
  content: [{ type: 'paragraph' }]
} {
  return { type: 'callout', ...(variant ? { attrs: { variant } } : {}), content: [{ type: 'paragraph' }] }
}

export default Callout
