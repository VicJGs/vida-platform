// B4 (MOD-notes) — the app-injected `inline` bodies for the two Notes-native ADR-008 blocks (`entityLink`, `backlink`).
// intent-coverage.md:68-69 homes both as BUILT-in-B4; block-registry.md:20-21 homes "the real inline body (replaces the
// placeholder) → the owning module" — for these two, MOD-notes. The bodies need APP rendering (TanStack routing,
// React-Query, the shared link panels) that @vida/editor cannot hold (BR-1, block-registry.md:49: the editor never imports
// @vida/core AND stays app-free), so the editor node-view DELEGATES to an app-injected `render` fn; absent one, it falls
// back to the E5 `IntegrationBlockPlaceholder` (the CB6 graceful terminal state — the other 10 blocks). This makes the
// `entityLink` node HOST its own picker (BR-B4-4/6): the E5 slash `run` inserts the empty node; the app body resolves it.
// Spec: docs/specs/features/mod-notes/ui-ux/b4-link-panels.md · BR-B4-4..12.
import type { ReactElement } from 'react'
import { NodeViewWrapper, ReactNodeViewRenderer, type Node, type NodeViewProps } from '@tiptap/react'
import type { IntegrationBlockType } from '@vida/types'
import { createIntegrationBlockNode, IntegrationBlockPlaceholder, INLINE_BLOCK_DEFS } from './integration-blocks'

/** The app-supplied inline body for a Notes-native block. Receives the node's config attrs + the two mutators the
 *  `entityLink` picker needs (commit the resolved reference / self-clean on reject/cancel — BR-B4-6). A read-only body
 *  (e.g. `backlink`) simply ignores the mutators. Returns `null` to defer to the placeholder. */
export type BlockBodyRenderer = (ctx: {
  attrs: Record<string, unknown>
  updateAttributes: (attrs: Record<string, unknown>) => void
  deleteNode: () => void
}) => ReactElement | null

export interface BlockBodies {
  entityLink?: BlockBodyRenderer
  backlink?: BlockBodyRenderer
}

/** The node-view SHELL: delegate to the injected renderer; when absent (or it returns null) render the E5 placeholder
 *  (graceful — BR-B4-4). Kept @vida/core-free + app-free: the editor calls a function it was handed. */
function BodyShell(props: NodeViewProps): ReactElement {
  const { render } = props.extension.options as { render: BlockBodyRenderer | null }
  const body =
    render?.({ attrs: props.node.attrs, updateAttributes: props.updateAttributes, deleteNode: props.deleteNode }) ?? null
  if (body === null) return <IntegrationBlockPlaceholder {...props} />
  return (
    <NodeViewWrapper className="vida-integration-block" data-block-type={props.node.type.name}>
      {body}
    </NodeViewWrapper>
  )
}

const DEF_BY_NAME = new Map(INLINE_BLOCK_DEFS.map((d) => [d.name, d] as const))

interface BlockBodyOptions {
  render: BlockBodyRenderer | null
}

/** One E5 integration node `.extend()`ed with a `render` option + the delegating node-view. `.extend()` overrides ONLY
 *  `addOptions`/`addNodeView`, so the base name/attrs/parseHTML/renderHTML (hence content round-trip + the entityLink
 *  `{entityType,entityId,label}` attrs) are preserved. Registered in editor.tsx IN PLACE OF the placeholder node of the
 *  same name (swap — never append; two nodes with one `name` throw). */
export function makeBlockBodyNode(type: IntegrationBlockType, render: BlockBodyRenderer | null): Node {
  const def = DEF_BY_NAME.get(type)
  if (!def) throw new Error(`[block-bodies] no integration-block def for "${type}"`)
  return createIntegrationBlockNode(def)
    .extend<BlockBodyOptions>({
      addOptions() {
        return { render: null }
      },
      addNodeView() {
        return ReactNodeViewRenderer(BodyShell)
      },
    })
    .configure({ render })
}
