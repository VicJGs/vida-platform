<!-- Entity Delivery Flow · TRACK B · slice B4 · IMPLEMENTATION-PLAN (§XXVI gate-2). Built from the APPROVED spec
     (b4-link-panels.md, Approval 1) + empirical grounding on the shipped E5 node architecture / B2-B3 apps/web / the
     frozen ① seam. This is the build-steps artifact victor:execute-plan-code works. No-Guessing: each step cites the
     code it extends; empirical checks are marked [VERIFIED]. -->

# IMPLEMENTATION-PLAN — B4 (entity-link + backlink block bodies + link panels)

## G2 refinements to the approved spec (surfaced, not silent — §XXVI/§XXVIII)
Deeper grounding on the E5 node-view architecture refined two g1 assumptions; the spec was updated to match (BR-B4-4/6, §3/§5):
- **App-injected node-view renderers, not editor-owned pickers.** The two block bodies need app rendering (TanStack `<Link>`,
  React-Query, the shared panels) that `@vida/editor` (app-free, `@vida/core`-free — BR-1) can't hold. So the editor
  `.extend()`s the two E5 nodes with a node-view that **delegates to an app-injected `render` fn**, else the E5 placeholder.
- **Node-hosted picker (no `slash-commands.ts` change).** The E5 slash `run` inserts the empty `entityLink` node as-is; its
  injected body renders the picker. Fail-loud relocates from "no node until write" to **"no COMMITTED (filled-attr) node
  without a backing row"** — a transient empty node self-deletes on reject/cancel (BR-B4-6).

## Empirical grounding (locked before build)
- **[VERIFIED] `.extend()` preserves the E5 node schema.** `createIntegrationBlockNode(def)` returns a `Node.create({name,
  atom, addAttributes:def.configSchema, parseHTML [data-block-type discriminator], renderHTML, addNodeView})`
  (`integration-blocks.tsx:172-206`). TipTap `.extend({ addOptions, addNodeView })` overrides only those two → name/attrs/
  parse/render (hence content round-trip + the `entityLink` `{entityType,entityId,label}` attrs, `integration-blocks.tsx:49-53`) are preserved.
- **[VERIFIED] the node-view can read injected options + mutate the node.** `ReactNodeViewRenderer` passes `NodeViewProps`
  = `{ node, updateAttributes, deleteNode, extension, editor, getPos, selected }`. `extension.options.render` reaches the
  injected fn; `node.attrs` / `updateAttributes` / `deleteNode` drive commit/self-delete (BR-B4-6).
- **[VERIFIED] Row shapes for the panels.** `page_links` = `{id, source_page_id, target_page_id, context, …sync}`
  (`notes.ts:71-80`); `entity_links` = `{id, page_id, entity_type, entity_id, context, …sync}` (`spaces.ts:68-78`). A
  panel row's display TITLE is NOT on the row → resolved from the target id.
- **[VERIFIED] `entity_type='page'` for a page target — consistent with the backlinks query.** The registry seeds
  `page`/`note`/`journal` (`interpretation.md:20`); the note-detail's Backlinks query is `getBacklinks('page', page.id)`
  (BR-B4-2). So a `/entity-link` to a page MUST write `entity_type='page'` for it to appear in that page's backlinks. Lock
  `entity_type='page'` for page targets; the `label` distinguishes note/journal.
- **[VERIFIED] title resolution avoids reopening frozen Track A.** ① exposes `getPage(id)` (no batch method); Track A is
  FROZEN. `useNoteTitle(id)` = `useQuery(['pages', id], getPage)` reuses the `noteKey` cache + React-Query dedup; at M1.1
  link counts this is not a real N+1 (a handful of cached reads). No ① change. Batching is a later optimization, not needed now.
- **[VERIFIED] fail-loud precedent.** B3's `applyWikiSelection` = await write FIRST, then mutate the doc (`wiki-link.ts`);
  the hooks' `onError` Toast surfaces the failure (`use-note.ts:55`). B4 mirrors: await `createEntityLink` → `updateAttributes`
  on success / `deleteNode` on reject.

## Build steps (victor:execute-plan-code works these in order)

### Editor (`packages/editor`) — the delegation seam only (no @vida/core, no app import)
1. **`src/extensions/block-bodies.tsx` (NEW)** — `export type BlockBodyRenderer = (ctx:{attrs, updateAttributes,
   deleteNode})=>ReactElement|null` + `export interface BlockBodies { entityLink?; backlink? }`. `makeBlockBodyNode(base:
   Node): Node` = `base.extend({ addOptions:()=>({ render: null as BlockBodyRenderer|null }), addNodeView:()=>
   ReactNodeViewRenderer(BodyShell) })`; `BodyShell({node, updateAttributes, deleteNode, extension})` renders
   `extension.options.render?.({ attrs:node.attrs, updateAttributes, deleteNode }) ?? <IntegrationBlockPlaceholder node=…/>`
   inside a `NodeViewWrapper` (reuse the E5 wrapper + `data-block-type`). Export `IntegrationBlockPlaceholder` from
   integration-blocks (or re-mount an equivalent) for the fallback.
2. **`src/extensions/integration-blocks.tsx` (EXTEND)** — export the `entityLink`/`backlink` base nodes (or a
   `NODE_BY_TYPE` map) so `editor.tsx` can `.extend()` them; keep `INTEGRATION_BLOCK_EXTENSIONS` for the other 10.
3. **`src/editor.tsx` (EXTEND)** — add `blockBodies?: BlockBodies` to `VidaEditorProps`; build the extensions array by
   **filtering `entityLink`/`backlink` OUT of `INTEGRATION_BLOCK_EXTENSIONS` and re-adding the `.extend()`ed versions**
   `makeBlockBodyNode(base).configure({ render: blockBodies?.[type] ?? null })` (⚠ registering the same node `name` twice
   throws — swap, don't append). The other 9 stay `IntegrationBlockPlaceholder`. Read ONCE at mount (stable value, the
   `wikiConfig` precedent).
4. **`src/index.ts` (EXTEND)** — `export type { BlockBodies, BlockBodyRenderer }`. Then `pnpm --filter @vida/editor build`.

### App (`apps/web`) — the hooks, the two bodies, the panels
5. **`src/app/note/use-note.ts` (EXTEND)** — add:
   - reads: `useBacklinks(id)` = `useQuery(['links','back',id], ()=>getNotesService().getBacklinks('page', id))`;
     `useLinksOut(id)` = `useQuery(['links','out',id], async ()=>({ pageLinks: await …getPageLinksFrom(id), entityLinks:
     await …getEntityLinksFrom(id) }))`; `useNoteTitle(id)` = `useQuery(['pages', id], ()=>…getPage(id))` (title via row).
   - writes (mirror `useCreatePageLink` — `onSuccess` invalidate `['links','back',id]`+`['links','out',id]`+`NOTES_LIST_KEY`;
     `onError` Toast; **never `noteKey(id)`**): `useCreateEntityLink(id)` (`createEntityLink(id, entityType, entityId)`),
     `useRemoveEntityLink(id)`, `useRemovePageLink(id)`.
6. **`src/app/note/entity-link-body.tsx` (NEW)** — `EntityLinkBody: BlockBodyRenderer`. `attrs.entityId===''` → the inline
   picker (a small combobox over `resolveWikiLink`, reuse B3's a11y shape) → on select: `resolveEntityLink({ link, remove },
   target)` = `await link(target); updateAttributes({entityType:'page', entityId:target.id, label:target.title})` — on reject
   `remove()` (`deleteNode`) + the hook's Toast; on cancel/blur-while-empty → `deleteNode`. Filled → `<Link to="/note/$id"
   params={{id:attrs.entityId}}>{title}</Link>` (title `useNoteTitle`), unshipped `entityType` → label + "opens when its
   module ships" (non-navigable). **`resolveEntityLink` is the pure, unit-tested order helper.**
7. **`src/app/note/links-panels.tsx` (NEW)** — `<LinksOutPanel id>` (`useLinksOut` → `deriveTerminalState`; two groups
   "Page links"/"Entity links"; each row `<Link>` + a labeled remove `Button` → `useRemovePageLink`/`useRemoveEntityLink`;
   per-group empty line) + `<BacklinksPanel id>` (`useBacklinks`; same two groups; **READ-ONLY**, no remove — BR-B4-7;
   states verbatim `business-rules.md:32`). Both reuse B2's `RailSectionLabel`/`MetaRow` styled parts.
8. **`src/app/note/note-detail.tsx` (EXTEND)** — instantiate the hooks; in the `Rail` below Metadata render
   `<LinksOutPanel id/>` + `<BacklinksPanel id/>`; `const blockBodies = useMemo(()=>({ entityLink: EntityLinkBody, backlink:
   ()=><BacklinksPanel id={id}/> }), [id])`; pass `blockBodies` to `<VidaEditor>` (suppress in the corrupt read-only state,
   the B3 `wikiConfig` precedent).

## Tests (write per step; TS types → default → all states → dark → responsive)
- **editor:** `block-bodies.test.tsx` — `BodyShell` renders the injected `render` / falls back to the placeholder when
  `render:null`; a `.extend()`ed node keeps the E5 schema (parseHTML `data-block-type` discriminator + attrs round-trip via
  `nodeFromJSON→toJSON`); boundary grep still clean (no `@vida/core`/app import).
- **web:** `resolveEntityLink` — await-write-BEFORE-commit, reject→`remove` called + no commit (the fail-loud unit); the 5
  hooks — invalidate the right keys, `onError` Toast, `entity_type='page'`; `LinksOutPanel`/`BacklinksPanel` — each terminal
  state (loading/empty "nothing links here yet"/error/populated), two distinct groups, per-group empty, remove on Links-out
  ONLY (Backlinks read-only), `<Link>` targets by id.

## Gate checks (before ░Visual Gate░)
`pnpm --filter @vida/editor test` + `pnpm --filter @vida/web test` green · root `typecheck` 0 · `eslint` 0 ·
`@vida/editor` **build** clean · boundary grep clean. Then the ░Visual Gate░ (spec §4, all 11 MUSTs) under Node 24.

## Risks / watch-list
- **R1 — the empty-node autosave wart.** An abandoned `/entity-link` (empty node) that B2 autosave persists before
  self-delete → renders the picker on reload (recoverable, not corrupt). Mitigation: `deleteNode` on blur-while-empty; the
  Visual Gate exercises insert→abandon→reload.
- **R2 — `.extend()` node-view + StrictMode double-mount.** The E5 placeholder already mounts under `immediatelyRender:false`;
  the injected body must be side-effect-safe on double-mount (no write on mount — writes only on user select). Covered by
  the picker-on-select-only design.
- **R3 — `useNoteTitle` for a deleted/absent target.** `getPage` returns null → the row shows the id/"(untitled)" +
  stays non-navigable; a stale backlink to a soft-deleted page is a known eventual-consistency artifact (A8/IR-13), not a B4 bug.
- **R4 — keyboard capture for the picker INPUT inside the atom node-view.** The `entityLink` body's inline search input
  lives in a `contentEditable={false}` atom node-view; ProseMirror may intercept keystrokes. The node-view input must
  `stopPropagation` (and the node may need `addKeyboardShortcuts`/`stopEvent` so typing/↑↓/Enter reach the input, not the
  doc). Verify live in the Visual Gate (type-to-search must work); the standard node-view-with-input pattern covers it, but
  it's the first interactive node-view in the editor, so it's on the watch-list. `[FACT: integration-blocks.tsx placeholder is non-interactive — B4 is the first interactive node-view]`
