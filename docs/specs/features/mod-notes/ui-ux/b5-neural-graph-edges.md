<!-- Entity Delivery Flow · TRACK B (UI/UX Build Flow) · slice B5 · Notes & Pages.
     §XXVI unit spec (gate-1 = this SPEC → ░Doc Gate░). Grounded in the DOC-FIXED homing: slice-map.md:34 homes B5 as
     "note-node graph over getPageLinksFrom (frontend fan-out); node-click → detail" covering EC-1 + EC-10; the seam is
     frozen at seam-contract.md:41 (B5 ← getPageLinksFrom). Authority = the 5 aspect docs + these delivery docs + the
     frozen ① seam (A2 getPageLinksFrom is real, tested code) + the shipped @vida/ui NeuralGraph (UI-2 · V7) + B1's
     notes-collection.tsx (the Neural panel B5 fills). No-Guessing: every claim is [FACT: path:line], [INTERP: from fact],
     or a drift resolved at THIS gate — never an open decision left dangling.
     B5 is the SMALLEST Track-B slice: a PURE apps/web slice. It touches NO package — NeuralGraph already ships fully
     (nodes + edges + node-click + a11y node-list + WebGL guard + content-signature effect); `edges` is a prop it
     consumes. B5's whole delta is COMPUTING that prop from a page_links fan-out. -->

# B5 — Neural note-graph edges  (MOD-notes ② · slice B5)

## 0. Source model
Code-first interim per `docs/specs/foundation/frontend-source-of-truth.md`. The **authority** is the 5 aspect docs
(`docs/features/notes-and-pages/{contract,business-rules,conventions,identity,structure-data}.md`) + ADR-002 §5.2 +
**ADR-007 (view layouts — `graph`)** + the **frozen ① seam** (`current-spec.md:26` — A2 `getPageLinksFrom` is real,
tested code) + the delivery docs (`slice-map.md:34,43,52`, `seam-contract.md:41`, `envision.md:25,34`). **Patterns to
mirror (shipped):** the `@vida/ui` `NeuralGraph` (UI-2 · V7 — the presentational `nodes`/`edges` renderer B5 feeds);
B1's `notes-collection.tsx` Neural panel (`edges={[]}` today) + `use-notes-list.ts` (the collection React-Query hook
shape); B4's `use-note.ts` `useLinksOut` (the `Promise.all` fan-out read precedent). **No new design token, no new
`@vida/ui` primitive, no package edit** is introduced by B5.
*(Throughout, `delivery/` = `docs/features/notes-and-pages/delivery/`; feature docs = `docs/features/notes-and-pages/`;
other cites are repo-root-relative.)* `[FACT: frontend-source-of-truth.md; REPO.md:33]`

## 1. Context & scope
B5 is the **fifth ② slice**. It delivers **EC-1** — "note nodes + page-link edges = two notes **visibly connected**;
node-click opens" — by filling the one remaining gap in B1's Neural view: the **edges**. B1 shipped the Neural panel
**nodes-only** with `edges={[]}` and `onNodeClick={openRow}` already wired; B5 replaces the empty edge array with the
real `page_links` fan-out. **Doc-fixed BUILT-in-B5** (`slice-map.md:34,43` · `seam-contract.md:41` · `envision.md:25`) —
this spec RECORDS and DETAILS it, it re-decides nothing. `[FACT: slice-map.md:34,43; seam-contract.md:41; envision.md:25; notes-collection.tsx:142-149; current-spec.md:79-80]`

It **spans ONE plane** — `apps/web` only (the pure-app slice):
- **`apps/web`:** a new fan-out read hook `useNotesGraphEdges(nodeIds)` in `use-notes-list.ts` (mirrors B4's
  `useLinksOut` `Promise.all`), then wire its result into the Neural panel's `edges` prop in `notes-collection.tsx`.
  `[FACT: use-notes-list.ts (the hook file); use-note.ts:93-98 (the Promise.all fan-out precedent); notes-collection.tsx:142-149]`

**Why B5 touches no package:** `NeuralGraph` (UI-2 · V7) is **presentational** — `nodes`/`edges` are props the app
supplies (`@vida/ui` cannot import `@vida/core`). It already owns edge insertion, undirected dedup, dangling-edge skip +
dev-warn, the WebGL guard, the content-signature (`graphKey`) effect, and the accessible node-`<button>` list. B5
supplies `GraphEdge[]` and nothing else. `[FACT: neural-graph.tsx:10-11,19-44,93-146,167-178]`

**In scope (EC-1 [structural], EC-10 [feel]; slice-map.md:34,43,52):**
- **Page-link edges over the displayed node set.** For the notes in the collection (B1's unfiltered `listPages({})` set),
  fan out `getPageLinksFrom(pageId)` and map each `PageLinkRow` → a `NeuralGraph` `GraphEdge {source, target}`
  (`source_page_id → source`, `target_page_id → target`). The result feeds `<NeuralGraph edges={…}>`. `[FACT: seam-contract.md:41; services/notes/service.ts:191-192; db/schema/notes.ts:74-75,106; neural-graph.tsx:25-29]`
- **Edges = `page_links` ONLY.** EC-1 says "page-link edges"; the seam is `getPageLinksFrom` alone. `entity_links`
  (page→registered-entity, the `/entity-link` refs) are the **B4 panels'** concern, **not** graph edges — the note-graph
  connects *notes to notes*. `[FACT: envision.md:25 ("page-link edges"); seam-contract.md:41 (B5 ← getPageLinksFrom, no entity_links); b4-link-panels.md BR-B4-1 (the two link kinds are distinct)]`
- **The fan-out is a single React-Query read, lazily enabled for the Neural view.** One `useQuery` whose queryFn does
  `Promise.all(nodeIds.map(getPageLinksFrom))` (the `useLinksOut` shape), keyed on a stable signature of the node-id
  set, `enabled` only when the active view is `neural` — the collection's other three views never trigger the N-query
  fan-out. `[FACT: use-note.ts:93-98 (Promise.all read); notes-collection.tsx:64 (view = useNotesViewStore((s)=>s.view)); notes-view-store.ts:12 (NotesView incl. 'neural'); [INTERP: lazy-enable avoids N link-reads on every collection load — only Neural needs edges]]`
- **Node-click → detail is ALREADY wired (B1) — B5 does not re-solve it.** `onNodeClick={openRow}` navigates to
  `/note/$id` for both the Sigma canvas click and the a11y node-list buttons. B5 only adds edges; EC-1's "node-click
  opens" is inherited unchanged. `[FACT: notes-collection.tsx:68-70,147; neural-graph.tsx:34-35,141,167-176]`
- **Edges are additive to the node-driven terminal state (EC-1).** The Neural panel's `state` stays the **list**
  terminal state (B1, `deriveTerminalState(useNotesList)`): nodes are the graph's primary data; edges enrich it. Nodes
  paint as soon as the list resolves; edges appear when the fan-out resolves (the `graphKey` content-signature re-inits
  Sigma when the edge-pairs join the signature). An edge-fan-out **error degrades silently** — the graph still shows its
  nodes (never blanked); it never downgrades the whole view to an error state. `[FACT: notes-collection.tsx:65,146; neural-graph.tsx:112-116,145-146 (graphKey deps re-init on topology change); [INTERP: EC-1 = nodes visibly connected; the collection is the node source, edges are the connection layer — an absent edge layer must not hide the nodes]]`
- **Feels immediate + updates live (EC-10) — via EXPLICIT graph-key invalidation, not mount-refetch.** Links are created
  only in the note editor (`note-detail.tsx`, a different route from the collection graph). The global QueryClient runs
  `staleTime: 30_000` + `refetchOnWindowFocus: false`, so returning to Neural inside 30s serves fresh-cached edges with
  **no** refetch; and linking two *existing* notes leaves the node set (hence the edges key) unchanged. So the create/
  remove-link mutations must **explicitly invalidate the `['links']` namespace** (which covers the graph key) for the new
  A→B edge to appear — B5 widens `useCreatePageLink`/`useCreateNoteFromLink`/`useRemovePageLink` `onSuccess` to do so
  (this also fixes the latent gap that these writes don't currently refresh the B4 Links-out/Backlinks panel keys). ⚠ A
  `NOTES_LIST_KEY` (`['pages','list']`) invalidation does **NOT** reach the `['links','graph',…]` key. `[FACT: envision.md:34 (EC-10); slice-map.md:52 (EC-10 → B3/B5 live VG); use-note.ts:58 (useCreatePageLink invalidates ONLY NOTES_LIST_KEY today); query-client.ts:18,21 (staleTime 30s, no window-focus refetch); use-note.ts:22-23 (the ['links',…] namespace)]`

**Explicitly OUT (later slices / other modules — do NOT build):**
- **No `@vida/ui` / `NeuralGraph` edit.** The renderer is shipped + presentational; B5 only supplies the `edges` prop. If
  the Visual Gate proves the `graphKey`-vs-`state` re-init is insufficient (the `slice-map.md:34` "DEF-N5-a `state`-dep
  fix re-surfaces **if needed**" contingency), that fix is a **separate, documented §XXVIII deviation** into `@vida/ui`,
  not part of B5's default apps/web scope. `[FACT: slice-map.md:34; neural-graph.tsx:146]`
- **Edge styling / weight / tag-coloring / grouping / the `graph` view-config** → **MOD-spaces ② (ADR-007 view system)**;
  B5 ships the default edge color the renderer already applies. `[FACT: envision.md:47-48; slice-map.md:57]`
- **`entity_links` as edges** → not an edge kind (out, above). **Tags / filters / create-with-tags / Export** → **B6**.
  **`/summary`** → **B7**. `[FACT: slice-map.md:35-36; b4-link-panels.md §1 OUT]`
- **Directed-edge arrowheads / the 10K-node webworker layout** → not intended at M1.1 (the renderer's documented
  node-ceiling governs). `[FACT: neural-graph.tsx:8-15 (documented node-ceiling → §6 webworker); ADR-001]`

**Patterns to mirror (read before authoring — same layer):**
- **`NeuralGraph` `GraphEdge`** — `{ source: string; target: string; color?: string }`; dangling edges (an end not in
  `nodes`) are skipped + dev-warned by the renderer; edges de-dup by node-pair. `[FACT: neural-graph.tsx:25-29,93-110,135-137]`
- **The fan-out read = B4's `useLinksOut`** — one `useQuery`, `queryFn` does `Promise.all([...getPageLinksFrom])`, a
  `['links',…]`-namespaced key. `[FACT: use-note.ts:93-98]`
- **The collection hook file + list key** — `useNotesList` / `NOTES_LIST_KEY = ['pages','list']` in `use-notes-list.ts`;
  B5's hook lives beside it. `[FACT: use-notes-list.ts:16,20-31]`

## 2. Business rules (invariants B5 must hold)
> Inherits the CORE constitution + `standards/{components,design,engineering}.md`. Every rule complies.

- **BR-B5-1 · Edges are the `page_links` fan-out over the displayed node set — nothing else.** For the collection's nodes,
  `edges = flatten(nodeIds.map(getPageLinksFrom))` mapped `{source_page_id→source, target_page_id→target}`. No
  `entity_links`, no synthetic edges, no title-derived edges. `[FACT: seam-contract.md:41; services/notes/service.ts:191-192; db/schema/notes.ts:74-75; envision.md:25]`
- **BR-B5-2 · Every edge endpoint is a live node (no dangling edges surfaced).** Map only edges whose `source` **and**
  `target` are in the node-id set (the renderer also skips danglers + dev-warns; B5 must not rely on that warning firing
  in production — it filters first). Since B1's nodes = all live pages and A8 soft-deletes a page's links on delete,
  endpoints are normally present; the filter is the defensive floor. `[FACT: neural-graph.tsx:99-108 (dangling skip + dev-warn); notes-collection.tsx:144 (nodes = all items); a8-cascade-cleanup.md (page delete cascades page_links); [INTERP: filter-before-pass keeps the dev-warn quiet + the graph honest]]`
- **BR-B5-3 · The fan-out is a single React-Query read, lazily enabled for the Neural view, keyed on the node-id set.**
  `useNotesGraphEdges(nodeIds)` = one `useQuery`; `queryKey` = `['links','graph', <stable node-id signature>]`;
  `queryFn` = `Promise.all(nodeIds.map(svc.getPageLinksFrom))` → flatten → map → BR-B5-2 filter; `enabled: view==='neural' && nodeIds.length>0`. An empty node set → no query, `edges=[]`. `[FACT: use-note.ts:93-98; notes-collection.tsx:64; notes-view-store.ts:12; [INTERP: key on the id-set so a changed collection re-reads; lazy-enable per §1]]`
- **BR-B5-4 · Edges are additive; the Neural `state` stays node-driven; an edge error degrades silently.** The panel
  passes B1's list-derived `state` to `NeuralGraph` unchanged; `edges` is supplied separately. While the edges query is
  pending, the graph shows nodes (no edges yet); on edges error, the graph shows nodes with `edges=[]` (never an error
  state — nodes are still valid data). `[FACT: notes-collection.tsx:65,146; neural-graph.tsx:148-186 (state drives terminal render); [INTERP: EC-1 — the collection is the node source; edges must not blank the nodes]]`
- **BR-B5-5 · Live update on link write (EC-10) — via explicit `['links']`-namespace invalidation, NOT
  `NOTES_LIST_KEY` and NOT mount-refetch.** A newly created `[[` link's edge appears on the next Neural render because
  the create/remove-link mutations invalidate the `['links']` namespace, which covers the `['links','graph',…]` edges
  key. A `NOTES_LIST_KEY` (`['pages','list']`) invalidation does **not** match that key (different prefix); and
  `staleTime: 30_000` + `refetchOnWindowFocus: false` mean a remount inside 30s does **not** refetch. So B5 widens
  `useCreatePageLink`/`useCreateNoteFromLink`/`useRemovePageLink` `onSuccess` to `invalidateQueries({ queryKey:
  ['links'] })` (the prefix — the minimal faithful wiring; it also repairs the latent B4 gap that these writes never
  refreshed the Links-out/Backlinks panel keys). `[FACT: use-note.ts:22-23,58 (['links',…] namespace; today's write invalidates only NOTES_LIST_KEY); query-client.ts:18,21 (staleTime 30s, no window-focus refetch); envision.md:34; slice-map.md:52]`
- **BR-B5-6 · Node-click navigation is inherited from B1 — unchanged.** B5 adds no click handler; `onNodeClick={openRow}`
  continues to serve both the canvas click and the keyboard node-list. `[FACT: notes-collection.tsx:68-70,147; neural-graph.tsx:141,171]`
- **BR-B5-7 · Pure mapping, no new dep, no package edit, no new token.** The `PageLinkRow[] → GraphEdge[]` map is a pure
  function (unit-tested); B5 adds no runtime dependency, edits no `packages/*`, introduces no design token. `[FACT: neural-graph.tsx:19-44 (GraphEdge is @vida/ui-owned); §1 OUT (no @vida/ui edit)]`
- **BR-B5-8 · Full visual-state + a11y + responsive coverage (standards §VIII/§XIV/§X).** The Neural view's states ×
  light/dark × 375/768/1440: loading (nodes+edges resolving) · empty ("No connections yet" — the renderer's node-empty)
  · error (list error) · populated (nodes + edges). The a11y node-`<button>` list keeps its per-node connection count
  (now non-zero once edges load); WebGL-absent falls back to that list; contrast AA; no injected CSS/motion beyond the
  shipped renderer. `[FACT: neural-graph.tsx:148-186 (states + node-list + degree count); components.md §VIII; engineering.md §XIV; design.md §X]`

## 3. Contract (the B5 surface)
```ts
// apps/web/src/app/notes/use-notes-list.ts — NEW hook (mirror useLinksOut Promise.all; sibling to useNotesList):
import type { GraphEdge } from '@vida/ui'            // { source; target; color? } — the renderer's edge shape
/** Page-link edges for the Neural view: fan out getPageLinksFrom over the node set, map+filter to GraphEdge[].
 *  Lazily enabled (Neural view only); invalidated with NOTES_LIST_KEY so a new link appears live (EC-10). */
export function useNotesGraphEdges(
  nodeIds: readonly string[],
  enabled: boolean,
): UseQueryResult<GraphEdge[]>
// queryKey: ['links','graph', nodeIds.join('|')]  (stable id-set signature)
// queryFn : const rows = (await Promise.all(nodeIds.map(id => svc.getPageLinksFrom(id)))).flat()
//           const ids = new Set(nodeIds)
//           return rows.filter(r => ids.has(r.source_page_id) && ids.has(r.target_page_id))
//                      .map(r => ({ source: r.source_page_id, target: r.target_page_id }))   // BR-B5-1/2
// enabled : enabled && nodeIds.length > 0                                                     // BR-B5-3

// apps/web/src/app/notes/notes-collection.tsx — EXTEND the Neural panel only:
//   const view = useNotesViewStore(s => s.view)                       // already present (line 64)
//   const nodeIds = useMemo(() => items.map(p => p.id), [items])
//   const edgesQuery = useNotesGraphEdges(nodeIds, view === 'neural')
//   ...
//   <NeuralGraph nodes={…} edges={edgesQuery.data ?? []} state={state} onNodeClick={openRow} aria-label="Notes, neural view" />
```
- `GraphEdge` (and `GraphNode`) are **already barrel-exported** by `@vida/ui` — `import type { GraphEdge } from '@vida/ui'`;
  **no package touch** at all. `[FACT: packages/ui/src/index.ts:46 (export { NeuralGraph, type GraphNode, type GraphEdge })]`
- The pure `PageLinkRow[] → GraphEdge[]` map (+ the dangling filter) is a **named helper unit-tested first** — the
  correctness surface of B5. `[FACT: BR-B5-1/2/7]`

## 4. Acceptance — ░Visual Gate░ (blocking, per slice-map.md:34)
Real browser (chrome-devtools / Brave), **no batching, no owed gate**:
1. **EC-1 MUST (edges):** with ≥2 notes linked via B3 `[[`, the Neural view renders the notes as nodes **and a visible
   edge between the linked pair**; an unlinked note is an isolated node. Verified vs the DB (the edge exists iff a live
   `page_links` row does).
2. **EC-1 MUST (node-click, inherited):** clicking a node (canvas) and activating a node-list `<button>` (keyboard) both
   navigate to that note's `/note/$id`.
3. **EC-10 (feel):** after linking A→B in the editor, then returning to the collection Neural view **inside the 30s
   staleTime window** (the case a plain remount would NOT refetch), the new A–B edge is present — proving the explicit
   `['links']`-namespace invalidation fired (BR-B5-5), not an incidental refetch. Also verify linking two *existing*
   notes (node set unchanged) still updates the graph.
4. **BR-B5-2 (no danglers):** the console shows **no** `[vida/ui] NeuralGraph: … edge(s) reference a missing node`
   warning (B5 filters before passing).
5. **BR-B5-4 (degrade):** with the fan-out forced to reject (inject failure), the graph still renders its **nodes**
   (edges absent) — the view does **not** flip to an error state; the list-error state still renders the renderer's error
   when the *list* fails.
6. **Lazy fetch (BR-B5-3):** switching among List/Gallery/Calendar does **not** fire the `getPageLinksFrom` fan-out
   (network/DB trace); it fires on entering Neural. A DEF-N5-a check: entering Neural after the list loaded paints edges
   (the `graphKey` re-init is sufficient) — **if edges do not paint without a second interaction, STOP** and escalate
   the `@vida/ui` `state`-dep fix as a §XXVIII deviation (`slice-map.md:34`).
7. **All Neural states × {light | dark} × {375 · 768 · 1440}:** loading · empty ("No connections yet") · populated
   (nodes + edges); the graph frame flips surface with the theme. Screenshots as evidence.
8. **§XIV a11y sweep:** the node-`<button>` list is focusable + SR-navigable, each label carries its now-non-zero
   connection count; WebGL-absent falls back to the same list; contrast AA; a VoiceOver trace of node → open.
9. **Gates:** `pnpm --filter @vida/web test` green · root `typecheck` 0 · `eslint` 0 · `/component-audit` +
   `victor:quality-gate-components` + `-engineering` PASS.
10. **§XXIX currency:** refresh `notes-and-pages/current-spec.md` (the ② Neural surface — edges shipped; strike the
    "nodes-only / edges is B5" note at `current-spec.md:79-80`) at gate close; commit WITH the code.

## 5. Implementation prompt (built after Approval 1 → IMPLEMENTATION-PLAN g2)
1. **The pure map helper** (co-located in `use-notes-list.ts` or a small `notes-graph.ts`): `toGraphEdges(rows:
   PageLinkRow[], nodeIds: Set<string>): GraphEdge[]` = filter both-ends-present → map `{source,target}`. Unit-test
   first (dangling dropped, both-ends kept, empty→[]).
2. `apps/web/src/app/notes/use-notes-list.ts` — add `useNotesGraphEdges(nodeIds, enabled)`: `useQuery` key
   `['links','graph', nodeIds.join('|')]`, queryFn `Promise.all(nodeIds.map(getNotesService().getPageLinksFrom))` →
   `.flat()` → `toGraphEdges`; `enabled: enabled && nodeIds.length>0`.
2a. **Liveness wiring (BR-B5-5) — required, not optional.** The `['links','graph',…]` key is NOT reached by the existing
    `NOTES_LIST_KEY` invalidation, and `staleTime: 30_000` blocks mount-refetch. So widen the link-write mutations in
    `use-note.ts` — `useCreatePageLink`, `useCreateNoteFromLink`, `useRemovePageLink` — to `invalidateQueries({ queryKey:
    ['links'] })` in `onSuccess` (the `['links']` prefix covers the graph key AND the B4 panel keys — one line each,
    widening the existing invalidation, no new coupling). `[FACT: query-client.ts:18; use-note.ts:58; BR-B5-5]`
3. `apps/web/src/app/notes/notes-collection.tsx` — add `nodeIds` (memoized from `items`), call
   `useNotesGraphEdges(nodeIds, view==='neural')`, pass `edges={edgesQuery.data ?? []}` to the Neural `<NeuralGraph>`.
   Nothing else in the panel changes (nodes/state/onNodeClick already correct).
4. `@vida/ui` barrel — confirm `GraphEdge`/`GraphNode` are exported; if not, add the **type-only** export (or define a
   local structural type in apps/web — g2 decides). No behavior change to `@vida/ui`.
5. Tests: `toGraphEdges` (helper); `useNotesGraphEdges` (fan-out shape, lazy `enabled` gate, dangling filter, id-set
   key); the Neural panel wires `edges` from the hook (jsdom — Sigma is WebGL-guarded, so assert the a11y node-list +
   the edges prop, not the canvas). TS types first → default → all states → dark → responsive.
6. `pnpm --filter @vida/web test` green · typecheck 0 · eslint 0 → `/component-audit` → `/critique` → the ░Visual Gate░.

## 6. Decisions — none open (all doc-fixed at this Doc Gate)
- **D-1 · Edges = `page_links` only, node-to-node — doc-fixed.** EC-1 says "page-link edges"; the seam is
  `getPageLinksFrom` alone (`seam-contract.md:41`). `entity_links` are the B4 panels' concern, not graph edges. Not a
  choice. `[FACT: envision.md:25; seam-contract.md:41; b4-link-panels.md BR-B4-1]`
- **D-2 · The fan-out is a single lazy React-Query read — the shipped pattern, not a new mechanism.** `getPageLinksFrom`
  is per-page; the graph needs all edges → `Promise.all` over the node set (the `useLinksOut` precedent). Lazy `enabled`
  for the Neural view is standard RQ (don't fan-out N reads for the three views that show no graph) — an efficiency
  floor, not an open question. `[FACT: use-note.ts:93-98; notes-collection.tsx:64; [INTERP: lazy-enable]]`
- **D-3 · Edges are additive; the node-driven `state` and B1's `onNodeClick` are inherited — B5 re-solves neither.** The
  Neural panel already passes the list `state` + `openRow`; B5 only supplies `edges`. An edge error degrades to
  nodes-only (EC-1: nodes are the graph, edges connect them). `[FACT: notes-collection.tsx:146-147; neural-graph.tsx:148-186]`
- **D-4 · The `@vida/ui` `state`-dep contingency stays a contingency.** `slice-map.md:34` scopes B5 to apps/web and flags
  the `NeuralGraph` `state`-dep fix "**if needed**". The content-signature (`graphKey`) effect is expected to re-init on
  edge arrival; the Visual Gate (Acceptance §6) verifies it. A confirmed gap → a documented §XXVIII deviation into
  `@vida/ui`, not a silent B5 scope-creep. `[FACT: slice-map.md:34; neural-graph.tsx:112-116,145-146]`
- **Doc-FIXED (NOT decisions) — grounded above, do not reopen:** no package edit / no new token (BR-B5-7, `GraphEdge`
  already barrel-exported) · dangling filter before pass (BR-B5-2) · live update on link write via explicit `['links']`
  invalidation, not `NOTES_LIST_KEY`/mount-refetch (BR-B5-5, EC-10, `query-client.ts:18`) · full state/a11y/responsive
  coverage (BR-B5-8). Tags/filters/Export (B6), edge styling/grouping/`graph`-config (MOD-spaces), `/summary` (B7) are
  OUT (§1).
