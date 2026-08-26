<!-- Entity Delivery Flow · TRACK B (UI/UX Build Flow) · slice B4 · Notes & Pages.
     §XXVI unit spec (gate-1 = this SPEC → ░Doc Gate░). Grounded in the DOC-FIXED homing: intent-coverage.md §3 (GATE
     PASS) homes /entity-link + /backlink as ✅ BUILT B4 — the 2 Notes-native ADR-008 block bodies MOD-notes ② wires
     (intake.md:78), distinct from the 8 data-consuming blocks (per-module). block-registry.md:20-21 homes "wire the real
     CapabilityRegistry at app-mount + the real inline bodies (replace the E5 placeholder)" to MOD-notes. Authority = the
     5 aspect docs + these delivery docs + the frozen ① seam (A2/A5 landed) + the shipped @vida/editor E5 (integration-
     blocks.tsx / slash-commands.ts) + B2/B3 apps/web. No-Guessing: every claim is [FACT: path:line], [INTERP: from
     fact], or a drift resolved at THIS gate — never an open decision left dangling.
     ⚠ REBUILT 2026-08-26 (Victor drift-catch): a prior draft (a) deferred /backlink [WRONG — BUILT B4], (b) framed
     /entity-link as a @tiptap/suggestion char-picker [WRONG mechanism — it is the ADR-008 integration block], (c) missed
     the app-mount registry wiring, (d) manufactured a "defer the write picker / over-engineering" fork [contradicts the
     gate-PASSED homing]. All four re-grounded below. -->

# B4 — entity-link + backlink block bodies + link panels  (MOD-notes ② · slice B4)

## 0. Source model
Code-first interim per `docs/specs/foundation/frontend-source-of-truth.md`. The **authority** is the 5 aspect docs
(`docs/features/notes-and-pages/{contract,business-rules,conventions,identity,structure-data}.md`) + ADR-002 §5.2 /
ADR-003 / ADR-006 (SP2 registry) / **ADR-008 (capability/block registry)** + the **frozen ① seam** (`current-spec.md` ②
section — A2/A5 are real, tested code) + the delivery docs (`intent-coverage.md` §3 [GATE PASS], `block-registry.md`,
`slice-map.md:33`, `intake.md:78`). **Patterns to mirror (shipped):** E5's `integration-blocks.tsx` (the inline block
node + `IntegrationBlockPlaceholder` = the `empty/unavailable` terminal state a real body replaces) + `slash-commands.ts`
(the availability seam + insert `run`); B3's `use-note.ts` hooks + injected-config boundary for the app↔editor data seam;
B2's collapsible `Rail` for the panel home. No new design token is introduced by B4.
*(Throughout, `delivery/` = `docs/features/notes-and-pages/delivery/`; feature docs = `docs/features/notes-and-pages/`;
other cites are repo-root-relative.)* `[FACT: frontend-source-of-truth.md; REPO.md:33]`

## 1. Context & scope
B4 is the **fourth ② slice**. It completes the note-detail link surface (EC-2's "Link + Links-out + Backlinks") by
delivering the **two Notes-native platform-block bodies** and the **two rail panels** the docs home here. All four pieces
are **doc-fixed BUILT-in-B4** (`intent-coverage.md:68-69` GATE PASS · `block-registry.md:20-21` · `slice-map.md:33` ·
`intake.md:78`) — this spec RECORDS and DETAILS them, it re-decides nothing. `[FACT: intent-coverage.md:68-69,71,73; block-registry.md:20-21; slice-map.md:33; intake.md:78]`

**Why `entityLink` + `backlink` are BUILT here (not deferred like the other 10 blocks):** of the 12 platform blocks,
these two are **Notes-native** — they operate on `page_links`/`entity_links`, which Notes OWNS, and ① already shipped the
surface (`createEntityLink`/`getBacklinks`/`getEntityLinksFrom`, A5). `/summary` → B7; `/pomodoro` → Sessions realm; the 8
data-consuming blocks (`/tasks` `/events` `/classes` `/habits` `/timeline` `/chart` `/class-notes` `/milestone`) →
**their owning module's ② pass** (`extension-catalog.md:33-39`; they stay E5 placeholders here). `[FACT: intent-coverage.md:63-73; block-registry.md:20-21; extension-catalog.md:33-39]`

It **spans two planes**:
1. **`@vida/editor` (the two real block bodies + app-mount wiring):** replace the E5 `IntegrationBlockPlaceholder`
   node-view for `entityLink` and `backlink` with **real bodies**; the editor stays `@vida/core`-free — the AR-6/AR-8 data
   is **injected** (the B3 `wikiConfig` boundary, BR-1). `[FACT: integration-blocks.tsx:1-6 (E5 builds NO real body; MOD-notes #31 wires it); block-registry.md:20-21,49 (editor never imports @vida/core); slash-commands.ts:171-190 (availability + run)]`
2. **`apps/web` (the panels + the injected config + the mount wiring):** in `note-detail.tsx`, add the **Links-out** +
   **Backlinks** rail panels (below B2's Metadata) over new React-Query read hooks; add the entity-link write/remove
   hooks (mirror B3); build + inject the block bodies' config from `getNotesService()`. `[FACT: note-detail.tsx:314-323 (the B2 Rail); use-note.ts:47-72 (the B3 hook pattern)]`

**In scope (EC-2 [`/entity-link` + panels], EC-10; intent-coverage.md:68-69,73; business-rules.md:32):**
- **`entityLink` block body (`/entity-link`) — page → any *registered* entity, writes `entity_links`.** The E5 placeholder
  becomes a real inline body: inserting it opens an entity picker; selecting a target calls `createEntityLink(pageId,
  entityType, entityId)` (A5 → AR-6, **registry-validated** IR-2/NP-6) and stores the node attrs (`{entityType, entityId,
  label}`, the shipped `ENTITY_LINK_SCHEMA`). The rendered node is a rich inline reference. **Kept DISTINCT from `[[`**:
  `entity_links` (page→entity), not `page_links`. `[FACT: intent-coverage.md:68; integration-blocks.tsx:49-53 (ENTITY_LINK_SCHEMA {entityType,entityId,label}); commands.ts:81-90 (/entity-link, category embed); contract.md:14,27; seam-contract.md:26; NP-5/NP-6]`
- **`backlink` block body (`/backlink`) — "pages/entities that reference this one".** The E5 placeholder becomes a real
  inline body rendering `getBacklinks(entityType, entityId)` for the host page — the same query the rail Backlinks panel
  uses (shared presentational component). `backlink` is an E5 **schema-less** block (registers attr-less); B4 authors its
  minimal body. `[FACT: intent-coverage.md:69; commands.ts (backlink = "a panel of pages/entities that reference this one"); block-registry.md:44 (backlink schema-less until its MOD-* authors it); business-rules.md:32]`
- **Backlinks panel (rail).** A labeled note-detail section over `getBacklinks(entityType, entityId)` (A5 — the ①-merge of
  AR-8 `getBacklinksTo` **⊕** A2 `getPageLinksTo`, returned **typed-distinct** `{entityLinks, pageLinks}`). The four
  terminal states are **doc-fixed** (`business-rules.md:32`): loading = "querying links", empty = "nothing links here
  yet", error = "query error", populated = merged list (two distinct groups). `[FACT: business-rules.md:32; current-spec.md:35-36 (getBacklinks ①-merge typed-distinct); seam-contract.md:28; services/notes/types.ts:88-92]`
- **Links-out panel (rail).** This page's **outgoing** links, two distinct groups: `page_links` via
  `getPageLinksFrom(pageId)` (the `[[` links B3 writes) **and** `entity_links` via `getEntityLinksFrom(pageId)` (A5, pure
  AR-8 delegate). Same terminal-state semantics as Backlinks (`[INTERP: mirrors business-rules.md:32` — the aspect table
  enumerates the Backlinks panel; slice-map.md:33 names Links-out alongside it]). `[FACT: slice-map.md:33; seam-contract.md:22,27; services/notes/types.ts:50,87]`
- **App-mount wiring (`block-registry.md:20`).** MOD-notes wires the two real bodies into `<VidaEditor>` at mount via an
  injected config (the app constructs the AR-6/AR-8 data seam from `getNotesService()`; the editor imports no
  `@vida/core`). Scope: only what the two Notes-native bodies need — the other 10 blocks stay E5 placeholders. `[FACT: block-registry.md:20-21,49; intent-coverage.md:71; BR-1]`
- **Registered-type only (NP-6 / SP2 / IR-2).** `createEntityLink` pre-validates `entityType` against the runtime
  `TaggableTypeRegistry` (NOT `EntityLinkTargetSchema`) → `UnregisteredEntityTypeError`. `[FACT: current-business-rules.md:17-18; business-rules.md:14; interpretation.md:87 (IR-2); contract.md:31]`
- **Fail-loud (row FIRST, then the node — the BR-B3-5 pattern).** `createEntityLink` is awaited BEFORE the `entityLink`
  node is inserted; a rejected write surfaces a Toast and leaves **no** dangling node. `[FACT: business-rules.md:37; §5 fail-loud; wiki-link.ts applyWikiSelection (the row-first precedent); use-note.ts:55 (onError Toast)]`
- **Resolve + navigate by id; unshipped entity types degrade gracefully (ADR-008 CB6).** A `page`-typed link/backlink row
  resolves its display title and navigates to `/note/$id`; a link whose `entity_type` has no shipped module renders its
  stored `label` + a muted "opens when its module ships" and is non-navigable — the **same graceful-degradation the E5
  placeholder already embodies** (never a crash). Never resolve by title text (NP-7). `[FACT: NP-7; conventions.md landmine; block-registry.md:36-39 (placeholder = graceful unavailable terminal state, CB6); ADR-008 §terminal-states:142]`
- **Remove an OUTGOING link (soft, from a Links-out row).** Each Links-out row carries a remove affordance →
  `removePageLink` / `removeEntityLink` (soft-delete, NP-9), fail-loud, panels re-read. `[FACT: services/notes/types.ts:49,82; NP-9; seam-contract.md:22,26]`
- **Feels immediate + undoable, updates dependents live (EC-10).** The block insert is one undoable editor transaction;
  writes/removes go through mutation hooks whose `onSuccess` invalidates the panel + list keys. `[FACT: envision.md:34 EC-10; use-note.ts:50-57]`

**Explicitly OUT (later slices / other modules — do NOT build):**
- **`[[` / `page_links` write path** — shipped in **B3**; B4 only READS `page_links` (panels) + adds a remove affordance.
  `[FACT: b3-note-link-picker.md; slice-map.md:32]`
- **The 8 data-consuming block bodies** (`/tasks` `/events` `/classes` `/habits` `/timeline` `/chart` `/class-notes`
  `/milestone`) → their **owning module's ② pass**; they stay E5 placeholders. `/summary` → **B7**; `/pomodoro` →
  **Sessions realm**. B4 wires ONLY the `entityLink` + `backlink` bodies. `[FACT: intent-coverage.md:70-73; extension-catalog.md:33-39]`
- **Neural note-graph edges** → **B5** (`getPageLinksFrom` graph fan-out). **Tags / create-with-tags / favorite-archive
  filters / icon / cover / Export** → **B6**. `[FACT: slice-map.md:34-36]`
- **Yjs content sync (NP-4)** — the `entityLink` node persists via B2's autosave TipTap-JSON snapshot; Yjs is M4. **Field
  `[E]`** → M3/DB-5; **FTS5** → DB-8. `[FACT: NP-4; ADR-003; slice-map.md:59]`

**Patterns to mirror (read before authoring — same layer):**
- **The block bodies replace E5 placeholders** — `createIntegrationBlockNode(def)` + `ReactNodeViewRenderer`; B4 swaps
  `IntegrationBlockPlaceholder` for `entityLink`/`backlink` real node-views; `AVAILABLE_INTEGRATION_BLOCKS` already lists
  them (available). `[FACT: integration-blocks.tsx (createIntegrationBlockNode, IntegrationBlockPlaceholder); slash-commands.ts:171-190 (isBlockAvailable, run inserts the node)]`
- **The app↔editor data seam is INJECTED** (BR-1, the B3 `wikiConfig` precedent) — `@vida/editor` declares the config
  interface; `apps/web` supplies it from `getNotesService()`; no `@vida/core` import in the package. `[FACT: block-registry.md:49; b3 wikiConfig boundary]`
- **Panels + hooks mirror B3's `use-note.ts`** — `useMutation` (`NOTES_LIST_KEY`-object-form invalidate + `onError`
  Toast) for writes; `useQuery` over `getNotesService()` for reads; a panel read key distinct from `noteKey(id)`
  (no re-seed, BR-B2-4). `[FACT: use-note.ts:18-19,29-35,47-57]`
- **The panel home is B2's collapsible `Rail`** — labeled sections below Metadata; the rail is already responsive.
  `[FACT: note-detail.tsx:58-73,314-323]`

## 2. Business rules (invariants B4 must hold)
> Inherits the CORE constitution + `standards/{components,design,engineering}.md`. Every rule complies.

- **BR-B4-1 · Two link kinds, kept structurally + visually DISTINCT.** `[[` writes `page_links` (page↔page, B3);
  `/entity-link` writes `entity_links` (page→registered entity, B4). The panels render them as **separate labeled
  groups** — never one merged "links" list. `getBacklinks` returns them typed-distinct (`{entityLinks, pageLinks}`) so the
  UI can keep them apart. `[FACT: structure-data.md (page_links vs entity_links); contract.md:14; current-spec.md:35-36; seam-contract.md:28]`
- **BR-B4-2 · The Backlinks surface queries `getBacklinks(entityType, entityId)` and renders the four doc-fixed terminal
  states.** For the host page: `entityType='page'`, `entityId=page.id`. States (`business-rules.md:32`, verbatim): loading
  = "querying links" (`role=status aria-busy`), empty (both arrays empty) = "Nothing links here yet", error (query reject)
  = a retry affordance, populated = two groups (Entity links · Page links). Uses `deriveTerminalState` (B1/B2 convention).
  The **rail Backlinks panel** and the **`/backlink` block body** share ONE presentational `BacklinksPanel`. `[FACT: business-rules.md:32; services/notes/types.ts:88-92; state-conventions/terminal-state.ts; intent-coverage.md:69]`
- **BR-B4-3 · The Links-out panel shows this page's OUTGOING links in two groups.** `getPageLinksFrom(pageId)` (page_links
  — the `[[` links) **and** `getEntityLinksFrom(pageId)` (entity_links — AR-8 delegate). Same terminal-state semantics; an
  empty group inside a populated panel shows its own "no … yet" line (never a blank half). `[FACT: seam-contract.md:22,27; services/notes/types.ts:50,87; [INTERP: per-group empty mirrors business-rules.md:32]]`
- **BR-B4-4 · `/entity-link` + `/backlink` are the E5 ADR-008 blocks ACTIVATED via APP-INJECTED node-view renderers —
  NOT `[[`-style char pickers, and the editor stays `@vida/core`-free AND app-free.** The two block bodies need app-side
  rendering (TanStack routing to `/note/$id`, React-Query, the shared panels) that neither `@vida/editor` nor `@vida/core`
  can hold. So B4 `.extend()`s the two E5 nodes with a node-view that **delegates to an app-injected renderer**
  (`blockBodies?: { entityLink?, backlink? }` on `<VidaEditor>`); absent a renderer → the E5 `IntegrationBlockPlaceholder`
  (the other 10 blocks + graceful fallback). The editor calls the injected function; the app supplies the React body (with
  its hooks/router/panels). This is the ADR-008 "the module supplies the real inline body" made concrete, keeping BR-1.
  `[FACT: integration-blocks.tsx:172-206 (createIntegrationBlockNode + addNodeView → ReactNodeViewRenderer(placeholder)); block-registry.md:20-21,49 (editor never imports @vida/core; MOD-notes supplies the body); commands.ts:81-90 (slash block, category embed — NOT a char trigger)]`
- **BR-B4-5 · The entity-link write is registry-validated (NP-6/SP2/IR-2); resolvable targets = the shipped entity
  surface, others degrade (CB6).** `createEntityLink` pre-validates `entityType` against the injected registry view (NOT
  `EntityLinkTargetSchema`) → `UnregisteredEntityTypeError`. The picker resolves targets among the entity types with a
  **browsable surface** — at M1.1 that is `page`/`note` (`resolveWikiLink`/`listPages`); other registered types light up as
  their modules ship (the ADR-008 graceful-degradation model, the E5 placeholder precedent). This is the honest M1.1
  realization of the doc-fixed block body — **not** a reduced build and **not** an open decision. `[FACT: current-business-rules.md:17-18; business-rules.md:14; registry.ts:15-16 (seeded from ENTITY_TYPES); block-registry.md:36-39 (CB6 graceful); contract.md:31]`
- **BR-B4-6 · No COMMITTED entity-link embed without a backing `entity_links` row; the write is fail-loud; a transient
  unresolved node self-cleans (the node-hosted realization of BR-B3-5).** E5's slash `run` inserts the `entityLink` node in
  an **empty/unresolved** state (`entityId===''`); its app-injected node-view renders an inline picker (search pages →
  `resolveWikiLink`). On select the body awaits `createEntityLink` (row FIRST) — **on success** it `updateAttributes({entityType, entityId, label})` to COMMIT the reference; **on reject** a Toast fires and the node **`deleteNode()`s itself**
  (never a committed embed without a row); **on cancel/blur** while still empty the node also self-deletes. The invariant
  that holds is *no committed (filled-attr) `entityLink` node lacks an `entity_links` row* — an unresolved empty node is a
  transient picker host, not a link, and degrades gracefully (renders the picker) if ever persisted mid-pick. The
  commit/delete logic is a pure, unit-tested helper. ⚠ **g2 refinement of the approved g1 BR-B4-6** (which assumed a
  slash-`run` override + external picker): deeper grounding on the E5 node-view architecture (the body MUST be app-rendered,
  BR-B4-4) makes the node-hosted picker lower-risk + avoids touching `slash-commands.ts` — the fail-loud guarantee is
  preserved, relocated from "no node until write" to "no *committed* node without a row." `[FACT: slash-commands.ts:180-186 (run inserts the node); integration-blocks.tsx:172-206 (node-view is the body seam); business-rules.md:37; §5 fail-loud; wiki-link.ts applyWikiSelection (the row-first precedent); use-note.ts:55]`
- **BR-B4-7 · Backlinks are READ-ONLY; only OUTGOING (Links-out) links are removable.** A backlink is another page's
  outgoing link (`source→me`); the current note must not delete data it does not own. Removal lives only on Links-out rows
  → `removePageLink(source,target)` / `removeEntityLink(pageId,entityType,entityId)` (soft-delete NP-9); `onError` Toast;
  panels re-read on success; the target page is never deleted. `[FACT: services/notes/types.ts:49,82; NP-9; seam-contract.md:22,26; structure-data.md (page_links source/target semantics)]`
- **BR-B4-8 · Links resolve + navigate by id (NP-7); unshipped entity types degrade, never break.** A `page`-typed row
  resolves the target page's title (an injected `resolveLabel`/`getPage`) and links to `/note/$id`; a row whose
  `entity_type` has no shipped module renders its stored `label` + "opens when its module ships" (non-navigable). Never
  match by title. `[FACT: NP-7; conventions.md landmine; block-registry.md:36-39 (CB6)]`
- **BR-B4-9 · Panel reads + link writes go through React-Query hooks (the B3 seam), keys distinct from the editor-seed
  key.** New reads `useBacklinks(id)` (`['links','back',id]`) + `useLinksOut(id)` (`['links','out',id]`); new writes
  `useCreateEntityLink(id)` / `useRemoveEntityLink(id)` / `useRemovePageLink(id)` (`onError` Toast). Write `onSuccess`
  invalidates the **panel keys + `NOTES_LIST_KEY`** — **never `noteKey(id)`** (BR-B2-4 no re-seed). `[FACT: use-note.ts:18-19,29-35,47-57; structure-data.md:34-37 (backlink read key); BR-B2-4]`
- **BR-B4-10 · Panels compose B2's rail — no new `@vida/ui` primitive, no new token.** Two labeled `RailSectionLabel`
  sections (Links-out · Backlinks) reusing the existing `Rail`/`MetaRow` styled parts + `@vida/ui` `Button`/`Menu`; the
  `BacklinksPanel`/`LinksOutPanel`/entity-link row are **feature components** (components §VI — a recurring pattern, same
  quality bar). Rail responsiveness inherited unchanged. `[FACT: note-detail.tsx:58-86,314-323; components.md §VI]`
- **BR-B4-11 · Content persists via B2's autosave as a TipTap-JSON snapshot (NP-4 Yjs = M4).** The `entityLink` node lands
  in `pages.content` (B2 autosave via `updatePage({content})`); the node is already registered (E5) so content renders. B4
  adds no Yjs. `[FACT: NP-4; integration-blocks.tsx (entityLink always registered); note-detail.tsx (B2 autosave); ADR-003]`
- **BR-B4-12 · Full visual-state + a11y + responsive coverage (standards §VIII/§XIV/§X).** Every panel state × light/dark ×
  375/768/1440: loading · empty · error · populated (distinct groups); the picker states reuse B3's combobox a11y; each
  link row is keyboard-navigable with a labeled remove control (Links-out only); the two block bodies keep the E5 node-view
  a11y (`role`, accessible name); contrast AA; radius via the token scale (DEF-U8-h); no injected CSS/motion beyond the
  shipped editor styles. `[FACT: components.md §VIII; engineering.md §XIV; design.md §X; wiki-link-menu.tsx / note-detail.tsx / integration-blocks.tsx precedents]`

## 3. Contract (the B4 surface)
```ts
// packages/editor/src/extensions/block-bodies.tsx — NEW (the two E5 nodes .extend()ed with an app-injected node-view)
export type BlockBodyRenderer = (ctx: {
  attrs: Record<string, unknown>            // the node's config attrs (entityLink: {entityType,entityId,label})
  updateAttributes: (attrs: Record<string, unknown>) => void  // commit the resolved reference (BR-B4-6)
  deleteNode: () => void                    // self-clean on reject/cancel (BR-B4-6)
}) => ReactElement | null
export interface BlockBodies { entityLink?: BlockBodyRenderer; backlink?: BlockBodyRenderer }
// makeBlockBodyNode(baseNode, render) = baseNode.extend({ addOptions:{render:null}, addNodeView: ReactNodeViewRenderer(
//   ({node,updateAttributes,deleteNode,extension}) => extension.options.render?.(…) ?? <IntegrationBlockPlaceholder/>) })
// editor.tsx EXTEND: blockBodies?: BlockBodies; replace the entityLink/backlink members of INTEGRATION_BLOCK_EXTENSIONS
//   with the .extend()ed nodes .configure({ render: blockBodies?.[type] ?? null }); the other 10 keep the placeholder.
// index.ts EXTEND: export type { BlockBodies, BlockBodyRenderer }

// apps/web/src/app/note/use-note.ts — NEW hooks (mirror useCreatePageLink — v5 object-form invalidate + onError Toast):
export function useBacklinks(id: string): UseQueryResult<{ entityLinks: EntityLinkRow[]; pageLinks: PageLinkRow[] }>  // getBacklinks('page', id)
export function useLinksOut(id: string): UseQueryResult<{ pageLinks: PageLinkRow[]; entityLinks: EntityLinkRow[] }>   // getPageLinksFrom ⊕ getEntityLinksFrom
export function useCreateEntityLink(id: string): UseMutationResult<EntityLinkRow, Error, {entityType:string; entityId:string}>  // createEntityLink; invalidate panels+NOTES_LIST_KEY; onError Toast
export function useRemoveEntityLink(id: string): UseMutationResult<void, Error, {entityType:string; entityId:string}> // removeEntityLink; same
export function useRemovePageLink(id: string): UseMutationResult<void, Error, string>                                 // removePageLink(id, target); same

// apps/web/src/app/note/ — NEW app components (the block BODIES + the panels; use app router/hooks):
//   entity-link-body.tsx  — the entityLink renderer: empty attrs → an inline page-picker (resolveWikiLink) → on select
//     createEntityLink (await, fail-loud) → updateAttributes | deleteNode; filled → a navigable ref (<Link to=/note/$id>)
//   links-panels.tsx      — <LinksOutPanel id> (useLinksOut) + <BacklinksPanel id> (useBacklinks); deriveTerminalState;
//     two distinct groups; row title via useNoteTitle(targetId); BacklinksPanel is READ-ONLY (BR-B4-7). BacklinksPanel is
//     ALSO the backlink block-body renderer (shared), bound to the host page id.
// note-detail.tsx EXTEND: instantiate the hooks; render <LinksOutPanel/> + <BacklinksPanel/> in the Rail below Metadata;
//   build blockBodies = { entityLink: EntityLinkBody, backlink: (ctx)=><BacklinksPanel id={id}/> } and pass to <VidaEditor>.
```
- The editor owns the node-view SHELL (delegates to the injected renderer, else the E5 placeholder — BR-B4-4); the app owns
  the two real bodies, the panels, the service binding, cache invalidation, Toast, and routing.
- **Row title resolution (NP-7):** a `page_links`/`entity_links` row carries ids, not titles — each panel row resolves its
  target title via a `useNoteTitle(id)` read (`getPage(id).title`). To avoid N+1, resolve titles in a **single batched
  read** per panel (the ① surface has no batch-title method → the IMPLEMENTATION-PLAN either adds one or reads the already-
  cached `['pages','list']` set client-side); a still-loading title shows a neutral placeholder. `[g2 resolves the batch mechanism]`

## 4. Acceptance — ░Visual Gate░ (blocking, per slice-map.md:38)
Real browser (chrome-devtools / Brave), **no batching, no owed gate**:
1. **EC-2 MUST (panels):** the note-detail rail shows **Links-out** + **Backlinks** sections, each with the two kinds
   (Entity links · Page links) in **distinct groups**; after B3-linking A→B, A's Links-out lists B and B's Backlinks lists
   A (verified vs the DB); `[[` and `/entity-link` never merge into one list.
2. **`/entity-link` block body MUST:** typing `/entity-link` inserts the block; the picker resolves a page target;
   selecting it writes an `entity_links` row (verified — **distinct** from a `page_links` row) and the node renders as a
   rich inline reference; the link then appears in Links-out (Entity links) and in the target's Backlinks.
3. **`/backlink` block body MUST:** typing `/backlink` inserts a block that renders the host page's backlinks (same
   `getBacklinks` data as the rail panel), with the four terminal states.
4. **Registry validation + degrade (NP-6/CB6):** the picker offers resolvable types (page at M1.1); an unregistered
   `entity_type` write rejects with `UnregisteredEntityTypeError` (unit-level) and renders no node; a synthetic
   unshipped-type link/backlink row renders label + "opens when its module ships" and is non-navigable.
5. **Fail-loud (BR-B4-6):** if `createEntityLink` rejects (inject failure), an error Toast shows and **no** dangling
   entity-link node is left; a panel read reject → error state + retry (distinct).
6. **Remove (BR-B4-7):** removing a link from a Links-out row soft-deletes it (row disappears; target still opens);
   Backlinks rows have **no** remove control; remove is keyboard-reachable + labeled.
7. **EC-10 (feel):** the block insert is one Ctrl-Z-undoable transaction; Backlinks/Links-out update live after a
   write/remove (hook invalidation).
8. **All panel + picker + block-body states × {light | dark} × {375 · 768 · 1440}:** loading · empty ("Nothing links here
   yet") · error · populated; rail collapsed/expanded; stacked <768. Screenshots as evidence.
9. **§XIV a11y sweep:** panels are labeled regions; each link row + remove control keyboard-navigable; picker host flips
   `role=combobox`; block-body node-views keep an accessible name; contrast AA; a VoiceOver trace of link → panel → remove.
10. **Gates:** `pnpm --filter @vida/editor test` + `pnpm --filter @vida/web test` green · root `typecheck` 0 · `eslint` 0 ·
    `@vida/editor` **build** clean · `/component-audit` + `victor:quality-gate-components` + `-engineering` PASS.
11. **§XXIX currency:** refresh `notes-and-pages/current-spec.md` (the ② B4 surface) + `packages/editor/src/CLAUDE.md`
    ("Shipped — B4 entityLink/backlink bodies + panels") at gate close; commit WITH the code.

## 5. Implementation prompt (built after Approval 1 → IMPLEMENTATION-PLAN g2)
1. **`packages/editor` — the node-view delegation seam** (`extensions/block-bodies.tsx`): `makeBlockBodyNode(baseNode,
   optionKey)` = `createIntegrationBlockNode(def).extend({ addOptions:()=>({render:null}), addNodeView:()=>
   ReactNodeViewRenderer(BodyShell) })` where `BodyShell` reads `extension.options.render` and renders it (passing
   `{attrs, updateAttributes, deleteNode}`) else `<IntegrationBlockPlaceholder/>`. `editor.tsx` gains `blockBodies?:
   BlockBodies`; build the extensions array swapping the `entityLink`/`backlink` members for the `.extend()`ed nodes
   `.configure({ render: blockBodies?.[type] ?? null })`; the other 10 unchanged. `index.ts` exports `BlockBodies`/
   `BlockBodyRenderer`. **No `slash-commands.ts` change** (the E5 `run` inserts the empty node; the body resolves it).
   Then `pnpm --filter @vida/editor build`.
2. `apps/web/src/app/note/use-note.ts` — add `useBacklinks`/`useLinksOut` (reads) + `useCreateEntityLink`/
   `useRemoveEntityLink`/`useRemovePageLink` (writes; mirror `useCreatePageLink`: panel-key + `NOTES_LIST_KEY` invalidate,
   `onError` Toast). Panel keys distinct from `noteKey(id)`. Add `useNoteTitle(id)`/a batched title read for panel rows.
3. `apps/web/src/app/note/entity-link-body.tsx` — the `entityLink` renderer: `attrs.entityId===''` → an inline page-picker
   (search via `resolveWikiLink`, reuse B3's combobox a11y) → on select `useCreateEntityLink.mutateAsync` (await, fail-loud)
   → `updateAttributes({entityType:'page', entityId, label})` on success, `deleteNode()` on reject/cancel; filled → a
   navigable `<Link to="/note/$id">` (title via `useNoteTitle`), unshipped type → label + "opens when its module ships".
   **Pure commit/delete helper unit-tested first** (the fail-loud risk surface).
4. `apps/web/src/app/note/links-panels.tsx` — `<LinksOutPanel id>` (`useLinksOut`, `deriveTerminalState`, two distinct
   groups, each row a `<Link>` + a **remove** control → `useRemovePageLink`/`useRemoveEntityLink`) + `<BacklinksPanel id>`
   (`useBacklinks`, same, **read-only** — no remove, BR-B4-7). `BacklinksPanel` is ALSO the `backlink` block-body renderer.
5. `apps/web/src/app/note/note-detail.tsx` — instantiate the hooks; render `<LinksOutPanel/>` + `<BacklinksPanel/>` in the
   `Rail` below Metadata; build `blockBodies = { entityLink: EntityLinkBody, backlink: (ctx)=><BacklinksPanel id={id}/> }`
   and pass to `<VidaEditor>`.
6. Tests: editor — `BodyShell` renders the injected renderer / falls back to placeholder, the two `.extend()`ed nodes keep
   the E5 schema (parseHTML discriminator, attrs round-trip); web — the commit/delete helper (row-first, reject→deleteNode),
   the 5 hooks (invalidate the right keys, `onError` Toast), the two panels (each terminal state, distinct groups, per-group
   empty, remove on Links-out only). TS types first → default → all states → dark → responsive.

## 6. Decisions — none open (all doc-fixed at this Doc Gate; four prior-draft drifts corrected)
- **D-1 · `/entity-link` AND `/backlink` are BUILT in B4 — doc-fixed by the PASSED Intent Coverage Gate.**
  `intent-coverage.md:68-69` homes both as **✅ BUILT B4** (the 2 Notes-native link-block bodies MOD-notes ② wires,
  `intake.md:78`), distinct from the 8 data-consuming blocks (per-module, `extension-catalog.md:33-39`). ⚠ A prior draft
  **deferred `/backlink`** and **manufactured a "defer the write picker / over-engineering" fork** — both were **drift**
  that contradicted this gate-PASSED, doc-verified homing (Victor drift-catch 2026-08-26). There is no build-vs-defer
  decision. `[FACT: intent-coverage.md:63-73 (GATE PASS); block-registry.md:20-21; intake.md:78; [[verify-a-critiques-escalation-and-defer-target-before-relaying]]]`
- **D-2 · The mechanism is the ADR-008 integration block, not a `@tiptap/suggestion` char picker.** `/entity-link` +
  `/backlink` are E5 slash-menu blocks (`commands.ts:81-90`, category `embed`) whose placeholder node-views B4 replaces
  with real bodies (`block-registry.md:20-21`); the editor stays `@vida/core`-free via injected config (BR-1). A prior
  draft framed `/entity-link` as a `[[`-style char suggestion — **drift** (wrong mechanism). `[FACT: integration-blocks.tsx:1-6; slash-commands.ts:171-190; block-registry.md:49; commands.ts:81-90]`
- **D-3 · `/entity-link` = `entity_links` (page→entity), kept DISTINCT from `[[` = `page_links` (page↔page).** Even a
  `/entity-link` targeting a page at M1.1 writes an `entity_links` row (`entity_type='page'`), NOT `page_links` — two
  deliberately-separate mechanisms the docs keep apart; `getBacklinks` merges them ONLY at read, typed-distinct. This is
  the intended design (not redundancy). `[FACT: contract.md:14,27; structure-data.md; current-spec.md:35-36; b3-note-link-picker.md D-3]`
- **D-4 · Resolvable target surface = the shipped entity surface (page/note at M1.1) — a FACT of what's shipped, with
  ADR-008 graceful degradation, NOT a decision.** The registry is seeded from all `ENTITY_TYPES`, but only entities with a
  browsable surface can be picked; unshipped types light up as their modules land (CB6 placeholder precedent). A prior
  draft escalated this to Approval 1 as an over-engineering call — **drift** (it re-opened the gate-PASSED homing). `[FACT: registry.ts:15-16; block-registry.md:36-39; business-rules.md:14; [[build-phase-flags-mean-resolve-now-not-defer]]]`
- **D-5 · The `/backlink` block body + the rail Backlinks panel share ONE `BacklinksPanel` over `getBacklinks`.** Both
  surface the same query; DRY, one presentational component (business-rules.md:32 terminal states apply to both). `[FACT: intent-coverage.md:69; business-rules.md:32; current-spec.md:35-36]`
- **Doc-FIXED (NOT decisions) — grounded above, do not reopen:** app-mount registry/body wiring homed to MOD-notes
  (block-registry.md:20) · injected config / editor `@vida/core`-free (BR-1, BR-B4-4) · registry-validate not closed-enum
  (NP-6/SP2/IR-2) · row-first-then-node fail-loud (BR-B4-6) · backlinks read-only, only Links-out removable (BR-B4-7) ·
  resolve-by-id / graceful degrade (NP-7/CB6, BR-B4-8) · panels compose B2's rail (BR-B4-10) · hooks invalidate panel keys
  + `NOTES_LIST_KEY`, never `noteKey` (BR-B2-4, BR-B4-9) · content via JSON snapshot, Yjs=M4 (NP-4, BR-B4-11). Neural
  edges (B5), tags/filters/Export (B6), the 8 data blocks (per-module), `/summary` (B7) are OUT (§1).
