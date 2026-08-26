<!-- Entity Delivery Flow · TRACK B · slice B5 · IMPLEMENTATION-PLAN (gate-2 = build-steps).
     Promotes from the Approval-1 spec `b5-neural-graph-edges.md`. Every step carries a [FACT: path:line] anchor — no
     ungrounded interpretation (Victor: "ground the note and everything else in the documentation"). Pure apps/web slice:
     no package edit, no new dep, no new token. -->

# IMPLEMENTATION-PLAN — B5 (Neural note-graph edges)

## G2 refinements to the approved spec (surfaced, not silent — §XXVI/§XXVIII)
- **R1 · The liveness wiring is DRY-er than the spec's "widen 3 hooks."** The spec (§5 step 2a, BR-B5-5) said widen
  `useCreatePageLink`/`useCreateNoteFromLink`/`useRemovePageLink` to invalidate `['links']`. The real invalidation graph
  is: `useInvalidateLinks` (used by `useCreateEntityLink`/`useRemoveEntityLink`/`useRemovePageLink`) invalidates
  `['links','back',id]` + `['links','out',id]` + `NOTES_LIST_KEY` — **none prefix-match** `['links','graph',…]`; and
  `useCreatePageLink`/`useCreateNoteFromLink` invalidate **only** `NOTES_LIST_KEY`. React-Query `invalidateQueries` is
  prefix-based, so the minimal correct fix is: **(a)** collapse `useInvalidateLinks` to the single `['links']` prefix
  (a superset of back/out/graph — one edit fixes all three hooks that use it) + keep `NOTES_LIST_KEY`; **(b)** route
  `useCreatePageLink` through `useInvalidateLinks` (it currently bypasses it). **`useCreateNoteFromLink` needs NO
  change** — creating a new note changes `nodeIds`, which changes the `['links','graph', nodeIds.join('|')]` key itself
  and forces a fresh fetch (BR-B5-3). This is more precise than the spec text; the invariant (BR-B5-5) is unchanged.
  `[FACT: use-note.ts:113-121 (useInvalidateLinks: back+out+NOTES_LIST_KEY, no graph); use-note.ts:58,71 (create hooks: NOTES_LIST_KEY only); query-client.ts:18 (staleTime 30s)]`
- **R2 · No new file needed — `toGraphEdges` co-locates in `use-notes-list.ts`.** The pure map is small + used by exactly
  one hook in that file; a separate `notes-graph.ts` would be premature (rule-of-three). `[FACT: use-notes-list.ts (the collection-hook home); b5 spec §5 step 1 ("co-located in use-notes-list.ts or a small notes-graph.ts")]`
- **R3 · `nodeIds` is memoized in `notes-collection.tsx`** so the fan-out map + query-key identity are stable across the
  non-data renders; `useMemo` must be ADDED to the `react` import (today it imports only `type ReactNode`). `[FACT: notes-collection.tsx:15 (import { type ReactNode } from 'react')]`

## Empirical grounding (locked before build)
- **[VERIFIED] The seam is the frozen ① `getPageLinksFrom`.** `getPageLinksFrom(pageId: string): Promise<PageLinkRow[]>`
  returns live (non-deleted) outgoing `page_links` for `pageId` (`service.ts:191-192` = `livePageLinks(eq(source_page_id,
  pageId))`); `PageLinkRow` = `typeof pageLinks.$inferSelect` with `source_page_id`/`target_page_id` (`notes.ts:74-75,106`).
  Track A is FROZEN — no ① change. `[FACT: types.ts:50; service.ts:191-192; notes.ts:74-75,106]`
- **[VERIFIED] The renderer's edge contract.** `NeuralGraph` takes `edges: readonly GraphEdge[]` where `GraphEdge =
  { source: string; target: string; color?: string }`; both types are barrel-exported. `edges` fed as `edgesQuery.data ??
  []` (`GraphEdge[]`) is assignable to `readonly GraphEdge[]`. `[FACT: neural-graph.tsx:25-29,31-44; index.ts:46]`
- **[VERIFIED] Async edge arrival re-inits Sigma (the DEF-N5-a contingency is covered).** The Sigma effect deps on the
  content signature `graphKey` = node-ids `+ '¦' +` edge-pairs (`neural-graph.tsx:112-116,145-146`), NOT `state`. When the
  fan-out resolves and edges join the array, `graphKey` changes → the effect kills + rebuilds with edges. So supplying
  edges as a prop is sufficient; no `@vida/ui` edit. (If the Visual Gate disproves this, it becomes a §XXVIII deviation —
  D-4.) `[FACT: neural-graph.tsx:112-116,145-146; b5 spec D-4; slice-map.md:34]`
- **[VERIFIED] The renderer already skips + dev-warns dangling edges + dedups by pair** — B5's pre-filter (BR-B5-2) keeps
  that warning silent in production and the graph honest, but does not rely on it. `[FACT: neural-graph.tsx:99-108 (dangling skip + dev-warn), 135-137 (hasEdge dedup)]`
- **[VERIFIED] The node-list carries a per-node connection count — the jsdom-testable edge signal.** In `success`, each
  a11y node-`<button>` label is `` `${label}, ${degree.get(id) ?? 0} connections` `` — WebGL-guarded so the canvas is
  absent in jsdom, but the degree count (derived from `edges` in a `useMemo` that runs in jsdom, `neural-graph.tsx:94-110`)
  IS assertable. B5 tests assert the count goes non-zero once edges are passed. `[FACT: neural-graph.tsx:94-110 (degree useMemo, jsdom-run), 167-176 (node-list + count label), 83-91 (webglAvailable false in jsdom)]`
- **[VERIFIED] The collection surface B5 edits.** `notes-collection.tsx`: `view = useNotesViewStore((s)=>s.view)` (line 64);
  `items = query.data ?? []` (line 65); `openRow` navigates to `/note/$id` (lines 68-70); the Neural panel is
  `<NeuralGraph nodes={items.map(...)} edges={[]} state={state} onNodeClick={openRow} aria-label="Notes, neural view"/>`
  (lines 142-149). Only `edges` changes; nodes/state/onNodeClick already correct (BR-B5-4/6). `[FACT: notes-collection.tsx:64-70,142-149]`
- **[VERIFIED] The liveness gap is real (BR-B5-5).** `query-client.ts:18,21` = `staleTime: 30_000` + `refetchOnWindowFocus:
  false`; links are created only in `note-detail.tsx` (a different route); `useCreatePageLink` invalidates only
  `NOTES_LIST_KEY` (`use-note.ts:58`), which does not prefix-match `['links','graph',…]`; and linking two existing notes
  leaves `nodeIds` (the key) unchanged → the edge would not appear without R1's explicit `['links']` invalidation. `[FACT: query-client.ts:18,21; use-note.ts:58; b5 spec BR-B5-5]`

## Build steps (victor:execute-plan-code works these in order)

### App (`apps/web`) — the only plane (no package touched)
1. **`src/app/notes/use-notes-list.ts` (EXTEND)** — add the pure helper + the hook:
   - `import type { PageLinkRow } from '@vida/core'` and `import type { GraphEdge } from '@vida/ui'` (+ `type
     UseQueryResult` from `@tanstack/react-query` for the explicit return annotation). `PageLinkRow` re-export CONFIRMED:
     `@vida/core` barrel (`packages/core/src/index.ts:65`) — exactly the path B4 already uses. `[FACT: packages/core/src/index.ts:65 (export type PageLinkRow); use-note.ts:15 + links-panels.tsx:16 (apps/web imports PageLinkRow from '@vida/core' today); index.ts:46 (GraphEdge); use-notes-list.ts:13 (@tanstack/react-query import site)]`
   - `export function toGraphEdges(rows: readonly PageLinkRow[], nodeIds: ReadonlySet<string>): GraphEdge[]` = `rows`
     `.filter(r => nodeIds.has(r.source_page_id) && nodeIds.has(r.target_page_id))` `.map(r => ({ source:
     r.source_page_id, target: r.target_page_id }))` — pure, both-ends-present (BR-B5-1/2). `[FACT: b5 spec §3, BR-B5-1/2; notes.ts:74-75]`
   - `export function useNotesGraphEdges(nodeIds: readonly string[], enabled: boolean): UseQueryResult<GraphEdge[]>` =
     `useQuery({ queryKey: ['links','graph', nodeIds.join('|')], queryFn: async () => { const svc = getNotesService();
     const rows = (await Promise.all(nodeIds.map(id => svc.getPageLinksFrom(id)))).flat(); return toGraphEdges(rows, new
     Set(nodeIds)) }, enabled: enabled && nodeIds.length > 0 })`. Mirrors `useLinksOut`'s `Promise.all` read; `['links']`
     namespace so R1's invalidation reaches it. `[FACT: use-note.ts:93-98 (useLinksOut Promise.all precedent); use-note.ts:22-23 (['links',…] namespace); b5 spec BR-B5-3]`
2. **`src/app/note/use-note.ts` (EXTEND — the R1 liveness fix):**
   - `useInvalidateLinks` (line 113): replace the two `invalidateQueries({queryKey: backlinksKey(id)})` /
     `linksOutKey(id)` calls with a single `queryClient.invalidateQueries({ queryKey: ['links'] })` (prefix — covers
     back + out + **graph**); keep `NOTES_LIST_KEY`. Update its comment (which claims "graph reflect it live" — now TRUE).
     `[FACT: use-note.ts:113-121; b5 spec BR-B5-5]`
   - `useCreatePageLink` (lines 54-60): route through the shared invalidator — `const invalidate = useInvalidateLinks(id)`
     (function-declaration, hoisted; callable though defined later) + `onSuccess: invalidate` (keep `onError` Toast). Fix
     its comment: NOTES_LIST_KEY alone did NOT reach the graph key; `['links']` does. `[FACT: use-note.ts:54-60,113-121; query-client.ts:18]`
   - `useCreateNoteFromLink` (lines 62-72): **NO change** (R1 — a new note changes `nodeIds` → the edges key → refetch).
     `[FACT: use-note.ts:62-72; b5 spec BR-B5-3]`
3. **`src/app/notes/notes-collection.tsx` (EXTEND — wire edges into the Neural panel ONLY):**
   - import: add `useMemo` to the `react` import (today `{ type ReactNode }`, R3). `[FACT: notes-collection.tsx:15]`
   - import: add `useNotesGraphEdges` to the `./use-notes-list` import (today `{ useNotesList, useCreateNote }`). `[FACT: notes-collection.tsx:29]`
   - in the component: `const nodeIds = useMemo(() => items.map((p) => p.id), [items])` (after `items`, line 65);
     `const edgesQuery = useNotesGraphEdges(nodeIds, view === 'neural')`. `[FACT: notes-collection.tsx:64-65 (view + items)]`
   - the Neural panel (lines 143-149): `edges={[]}` → `edges={edgesQuery.data ?? []}` (BR-B5-4 degrade — `undefined`/error →
     `[]`, nodes still render). Nothing else in the panel changes. `[FACT: notes-collection.tsx:142-149; neural-graph.tsx:33,148-186]`

## Tests (write per step; TS types → default → all states → dark → responsive)
- **`toGraphEdges`** (`use-notes-list.test.ts` or a co-located spec): both-ends-present kept; a dangling edge (target ∉
  nodeIds) dropped; empty rows → `[]`; direction preserved (`source_page_id → source`). `[FACT: BR-B5-1/2]`
- **`useNotesGraphEdges`**: fan-out shape (`Promise.all` over N ids, flattened + filtered); `enabled` gate — `view!=='neural'`
  or `nodeIds.length===0` → query idle (no `getPageLinksFrom` call); the `['links','graph', join]` key changes when the id
  set changes. Mock `getNotesService()` (the B1 test precedent). `[FACT: use-notes-list.ts (getNotesService seam); notes-service.ts]`
- **liveness (R1)**: `useCreatePageLink` `onSuccess` invalidates a `['links']`-prefixed key (spy `invalidateQueries`);
  `useInvalidateLinks` invalidates `['links']` + `NOTES_LIST_KEY`. `[FACT: use-note.ts:113-121; BR-B5-5]`
- **collection wiring**: the Neural panel receives `edges` from the hook (not `[]`) when `view==='neural'` + edges resolve;
  the a11y node-list connection count is non-zero for a linked node (jsdom, WebGL-guarded — assert the degree label, not
  the canvas). `[FACT: neural-graph.tsx:94-110,167-176; VERIFIED node-list count]`
- **⚠ FOLD (g2-1) — update the EXISTING collection-test mock.** `notes-collection.test.tsx:15` whole-module-mocks
  `./use-notes-list` = `{ useNotesList, useCreateNote }`. Because `notes-collection.tsx` will import `useNotesGraphEdges`
  from that module, the mock MUST add `useNotesGraphEdges: <controllable stub, default → { data: undefined }>` or every
  existing collection test throws "useNotesGraphEdges is not a function" and the §Gate-checks web-test bar fails. Reuse a
  new `h.edges` handle for the Neural-edges assertions. `[FACT: notes-collection.test.tsx:15 (vi.mock('./use-notes-list', …)); notes-collection.tsx:29 (the import to extend)]`

## Gate checks (before ░Visual Gate░)
- `pnpm --filter @vida/web test` green (new + existing) · root `pnpm typecheck` 0 · `pnpm --filter @vida/web lint` 0 ·
  `/component-audit` on the touched files clean. No `@vida/editor`/`@vida/ui`/`@vida/core` edit → no package build needed.
  `[FACT: b5 spec §4 item 9]`

## Risks / watch-list
- **DEF-N5-a (`graphKey` vs `state`).** Expected covered (VERIFIED above); the Visual Gate (spec Acceptance §6) is the
  proof. If entering Neural after the list loads does NOT paint edges without a second interaction → STOP, escalate the
  `@vida/ui` `state`-dep fix as a §XXVIII deviation (do not silently patch B5's scope). `[FACT: slice-map.md:34; neural-graph.tsx:145-146]`
- **N-query fan-out cost.** `Promise.all(nodeIds.map(getPageLinksFrom))` is N local-SQLite reads, gated `enabled:
  view==='neural'` so the 3 other views never pay it; at M1.1 note counts this is within budget (the same per-page read the
  B4 panels already do). Batching is a later optimization, not needed now. `[FACT: b5 spec §1 (lazy-enable); use-note.ts:93-98 (same per-page read pattern)]`
- **Reciprocal links A→B + B→A.** Two directed `page_links` rows → two `GraphEdge`s; the renderer's `hasEdge` dedups them
  to one visual (undirected) edge — acceptable at M1.1 (no arrowheads; edge styling → MOD-spaces). `[FACT: neural-graph.tsx:135-137; b5 spec §1 OUT (arrowheads/styling → MOD-spaces)]`
