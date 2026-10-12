# Interpretation — fe-notes-and-pages (② frontend unit #27)

> Entity Delivery Flow ② · Step 1 (Interpretation Layer, methodology §3). Makes the implicit explicit from the
> TRUSTED sources BEFORE decomposition. Default scenario (net-new UI tier over a FINISHED ① service — no prior
> notes frontend exists on `main`, baseline this session confirmed a clean slate). Every claim is
> `[FACT: path:line]` / `[INTERP: from fact]` / `[UNKNOWN: needs X]` (No-Guessing Principle).

## 0. What fe-notes-and-pages is (one-paragraph frame)

fe-notes-and-pages is the **UI/UX tier over the finished `@vida/core` Notes & Pages service** (`mod-notes-and-pages`
①) — the platform's in-degree-14 connective hub `[FACT: docs/features/notes-and-pages/delivery/interpretation.md:5]`.
It is G6 unit #27 — **13 UI legs**: `NOT-19, NOT-24, NOT-32, NOT-34, NOT-47, NOT-48, NOT-49, NOT-50, NOT-51, NOT-52,
XCU-BSE-12, XCU-CAP-12, XCU-CAP-13` `[FACT: decomposition-p6.md:13]`. It **composes** the shipped CODEC primitives
(`CollectionView`, `NeuralGraph`, `EntityView` from `@vida/ui`; `VidaEditor` from `@vida/editor`) — it rebuilds none
of them — and wires them to the ① seam, rendering **every terminal state** incl. honest degradations for the
backend-deferred legs (FTS5→DB-8, graph data-prep→AR-8, preview enrichment→M1.1+, placement service→#31/#29)
`[FACT: PLAN-p6-frontend-track.md:72,108-112; notes-and-pages.md:62-66]`. It is a **consumer-pull** unit: it rides
its backend twin's wave 1:1, homed at milestone **M1.2.2** `[FACT: PLAN-p6-frontend-track.md:46; task header]`, per
the **add-frontend-component ②** track with a **per-slice blocking Visual Gate** `[FACT: PLAN-p6-frontend-track.md:34]`.

---

## 1. DEPENDENCIES — every upstream this composes/consumes (built artifacts)

### 1a. The finished ① service — `createNotesService(deps): NotesService` (the data seam)
The complete API the UI consumes (return types are Drizzle `$inferSelect` **Row** types, NOT `@vida/types`
interfaces — `_sync_status` plain text vs union; DB-11 reconcile pending)
`[FACT: docs/features/notes-and-pages/delivery/seam-contract.md:1-8; memory [[drizzle-row-not-assignable-to-vida-types-interface]]]`:
- **S1 Pages core**: `createPage` · `getPage` · `updatePage` (`.strict()` whitelist) · `softDeletePage` ·
  `getPageByJournalDate` · `getPagesByType` · `getPagesForEntity` (polymorphic reverse-lookup) ·
  `listPages({favorite?,archived?})` `[FACT: seam-contract.md:26-34]`.
- **S2 Entity-notes + attachments**: `ensureEntityNote` (idempotent, deterministic seed) · `addAttachment` ·
  `getAttachments` · `removeAttachment` `[FACT: seam-contract.md:36-40]`.
- **S3 Page-links + wiki**: `createPageLink` (idempotent) · `removePageLink` · `getPageLinksFrom`/`getPageLinksTo` ·
  `resolveWikiLink(text)` → title-LIKE candidates for the `[[` picker; **create-on-miss is an explicit CALLER
  compose** (the ② picker calls `createPage('note')` then `createPageLink` — there is NO bundled `createNoteAndLink`)
  `[FACT: seam-contract.md:42-50]`.
- **S4 Delegation facade + registry**: `createEntityLink`/`removeEntityLink` (→ AR-6) · `getEntityLinksFrom` (→ AR-8) ·
  `getBacklinks(entityType, entityId)` → **`{ pageLinks, entityLinks }` UNMERGED** (`pageLinks` only when
  `entityType ∈ page/note/journal`, else `[]`; the merge shape is **② G6-tentative** = this unit's design job) ·
  `getTagsForEntity` · `getEntitiesByTag` `[FACT: seam-contract.md:52-58]`.
- **Typed errors** (bespoke, stable `.name`): `JournalExistsError(journalDate)` · `UnregisteredEntityTypeError(entityType)`
  `[FACT: seam-contract.md:70-74]`. The UI must catch these at the create/link affordances (NP-2 clash, unregistered type).

### 1b. The CODEC primitives it composes (all shipped in `@vida/ui`, presentational shells)
- **`CollectionView`** — controlled-`layout` render-prop shell; `layout ∈ 'list'|'table'|'board'|'gallery'|'calendar'|'graph'|'timeline'`,
  `onLayoutChange`, `renderView(layout, state)` (caller owns data + renderer), `state?: ViewState` (loading|error|empty|success),
  `emptySlot?` `[FACT: packages/ui/src/components/collection-view.tsx — CollectionView, controlled layout + renderView render-prop + state-as-prop]`.
- **`NeuralGraph`** — Sigma.js/graphology WebGL force-directed graph; `nodes: GraphNode[]` (`{id,label?,color?,size?}`),
  `edges: GraphEdge[]` (`{source,target,color?}`), `onNodeClick?`, `state?: ViewState`, `height?`, `layoutIterations?`
  (capped to 0 under reduced-motion), WebGL-guarded, a11y via hidden focusable node list
  `[FACT: packages/ui/src/components/neural-graph.tsx — NeuralGraph, nodes/edges/onNodeClick/state]`.
- **`EntityView`** — facet frame: `title` (serif H1) · `subtitle?` · `action?` (menu slot) · `mode: 'merged'|'tabbed'`
  (controlled, `onModeChange`) · `layout: ReactNode` (always-present Layout facet body) · `editor?: ReactNode`
  (OPTIONAL Editor facet, **registry-gated** via `offersEditor` in the apps/web adapter) · `editorState?`
  `[FACT: packages/ui/src/components/entity-view.tsx — EntityView, merged|tabbed facet frame, registry-gated editor slot]`.

### 1c. The editor — `@vida/editor` + its apps/web binding
- **`VidaEditor`** (component), `VidaEditorHandle`, `INTEGRATION_BLOCK_COMMANDS`; serializers `toMarkdown`/`fromMarkdown`
  (E6), `toPdf` (E7), `toDocx` (E8) `[FACT: packages/editor/src/index.ts — E1 + E6/E7/E8]`.
- **`apps/web/src/canvas-editor/`** already wraps `VidaEditor` for page editing: `canvas-editor.tsx` + `page-binding.ts`
  (entity↔page wiring) `[FACT: apps/web/src/canvas-editor/canvas-editor.tsx, page-binding.ts]`. The note entity page's
  Editor facet mounts THIS, not a fresh editor `[INTERP: reuse the shipped binding, don't re-author]`.

### 1d. House patterns (the destination-folder convention to mirror — Step 3 reads these)
- **`apps/web/src/home/`** — a built feature surface: `home-surface.tsx` (entry) · `home-dashboard.tsx` ·
  `journal-page-region.tsx` + section/selection state `[FACT: apps/web/src/home/]`. Shows how a feature surface
  composes CODEC views + state + the journal/page region — the closest sibling to a notes surface.
- **`apps/web/src/entity/adapter.ts`** — the pure `EntitySource → EntityViewProps` mapping + the **registry-gated
  editor** gate (`offersEditor`) `[FACT: apps/web/src/entity/adapter.ts]`. The note entity page builds its props
  through this adapter shape `[INTERP]`.
- **`apps/web/src/routes.tsx`** — current routes: `/` (HomeSurface) · `/graph` (lazy NeuralGraph); NO notes routes
  mounted yet `[FACT: apps/web/src/routes.tsx]`. fe-notes mounts its route(s) here.

### 1e. Design authority + inherited frontend invariants
- **Aspect authority** for the 13 legs: `docs/specs/foundation/backend-intent/parts/notes-and-pages.md` (NOT-19/24/32/34/47-52)
  + `xcut-backlinks-search-export.md:43` (BSE-12) + `xcut-capability.md:42-43` (CAP-12/13) `[FACT]`.
- **RIDE-visibility + per-slice gate** `[FACT: PLAN-p6-frontend-track.md:34,48]`; **terminal-states / degrade-never-crash**
  is the platform frontend contract (the shell's BR-4 precedent) `[FACT: fe-shell interpretation.md:73]`.
- **Package boundary**: one-way `apps/web → @vida/ui`/`@vida/editor`; the notes UI lives in `apps/web/src/notes/`
  (or similar), composing primitives — no new `@vida/ui` component unless rule-of-three is met `[INTERP from fe-shell IR-8]`.

---

## 2. NEEDS — preconditions to function (the implicit deps that crash in the browser, not review)

- **Boot/runtime mount:** notes surfaces mount under `routes.tsx` inside the shell's `<Outlet/>`, AFTER `App.tsx`'s
  DB-ready gate + `UIProvider` + the shell frame `[FACT: apps/web/src/routes.tsx; fe-shell interpretation.md:81]`.
- **Service injection seam:** the UI needs a wired `NotesService` instance (`createNotesService({db, deviceId, spaces,
  backlinks, registry})`) `[FACT: seam-contract.md:11-19]`. `[UNKNOWN: is there a composition root / provider that
  constructs the live service for apps/web, or does M1 stub it? — resolve at decomposition; mirror the CODEC
  "live hook deferred to first consumer" + `ProviderRead` precedent `[FACT: memory [[absent-deny-safe-port-write-is-noop-not-new-error]]]`]`.
- **React-Query data layer:** reads/writes flow through React Query v5 hooks over the service (per ADR-001 state split);
  `[FACT: current-spec note "React-Query hooks → ②" notes-and-pages.md:84]`. `[UNKNOWN: exact query-key scheme +
  invalidation prefixes — resolve per-slice; heed the prefix-invalidation trap `[FACT: memory
  [[verify-a-cache-liveness-BR-against-the-runtime-config]]]`]`.
- **Deferred backing seams the UI must degrade against (render a terminal state, not crash):**
  - FTS5 search engine → **DB-8** → render `search-unavailable` now `[FACT: notes-and-pages.md:64; PLAN:108-112]`.
  - Neural-graph data-prep → **AR-8 future / Views design-pass** → render from locally-available `page_links`+`entity_links`
    (via `getBacklinks`/`getPageLinksFrom`) or an empty graph `[FACT: notes-and-pages.md:63]`.
  - Collection saved-view SELECTION primitive → **ADR-007 design-pass** → **renderers hard-coded** meanwhile
    `[FACT: notes-and-pages.md:62]`.
  - Preview-card enrichment → **M1.1+** → card renders with raw/available target data `[FACT: xcut-backlinks-search-export.md:43]`.
  - Block placement-creation service + palette compute → **#31 / UI-3 #29** → the add-menu/slash-menu UI renders over
    the seam `[FACT: xcut-capability.md:42-43]`.
  - `/summary` aggregation ENGINE → **MOD-journals** → the `/summary` block consumes the journals engine; Notes owns
    only `summary_config` storage `[FACT: notes-and-pages.md:46; seam-contract via updatePage]`.
- **Registry readiness:** `entity_type` values the UI links to must be registered (`page·note·journal·tag·space`
  pre-seeded); linking an unregistered type → `UnregisteredEntityTypeError` surfaced at the affordance
  `[FACT: notes-and-pages.md:67 (NOT-53); seam-contract.md:73]`.
- **Content is a CRDT (NP-4):** `pages.content` is TipTap/Yjs, not LWW; the editor binding (`canvas-editor`) owns the
  content write path — the UI never routes `content` through a plain LWW patch `[FACT: notes-and-pages.md:51 (NOT-37)]`.
- **M1.0 encryption pass-through:** `[E]` fields are repository pass-through now (empty active set); no vault-unlock on
  the notes read/write path in M1 `[FACT: notes-and-pages.md:52 (NOT-38); memory [[m10-repos-use-empty-encryptedfields-seam]]]`.

---

## 3. ORGANIZATION — OWNS vs CONSUMES vs DELEGATES

| | fe-notes-and-pages (#27) |
|---|---|
| **OWNS** | the **notes feature surface(s)** in `apps/web/src/notes/` (route + composition): the **Note entity page** (EntityView + canvas-editor + page-metadata controls + backlinks panel + attachments) · the **Collection surface** (CollectionView wiring: List/Gallery/Calendar/Graph renderers per type) · the **`[[` wiki-link picker** (+ create-on-miss affordance) · the **backlinks panel presentation** (the G6 merged/grouped shape — a NET-NEW design decision) · the **`/summary` block render** + per-section degrade · the **page-metadata controls** (favorite/archive/icon/cover) · the **search UI** (→ `search-unavailable`) · the **template picker/save** UI · the **preview-card** render · the **block-placement add-menu/slash-menu** UI · its React-Query hooks over the service |
| **CONSUMES** | `@vida/ui` `CollectionView`/`NeuralGraph`/`EntityView` (+ UI-1 primitives) · `@vida/editor` `VidaEditor` via `apps/web/src/canvas-editor` · the ① `NotesService` seam · `apps/web/src/entity/adapter.ts` · `useMedia()`/breakpoints · the registry (entity_type validation) |
| **DELEGATES** | **all data derivation/persistence** → the ① service (never re-implements CRUD/links/seed) · **entity-link/tag WRITES** → AR-6 (via the service facade) · **entity-link READS + graph data-prep** → AR-8 (service facade; graph-prep deferred) · **`/summary` aggregation** → MOD-journals engine · **FTS5 ranked results** → DB-8 · **block placement-creation + palette compute** → #31/UI-3 #29 · **platform-block TipTap extensions** → `@vida/editor` / components level (NOT re-authored here) `[FACT: notes-and-pages.md:66 (NOT-52)]` |

**Load-bearing boundary (#27 vs `fe-shell-integration-wiring` thin RIDE issue):** the RIDE issue wires the
already-built SHARED chrome surfaces — ⌘K search (BSE-14/15/16), export dialog + serializers (BSE-19-22), the GLOBAL
neural-graph surface (BSE-23/24), the Spaces add-menu/slash (SP-29), view degradation (XCU-14)
`[FACT: PLAN-p6-frontend-track.md:104-119; decomposition-p6.md:15]`. fe-notes builds the **notes-module-scoped**
surfaces that may compose the same primitives (NOT-49 notes collection graph vs BSE-23/24 global `/graph`;
XCU-CAP-12/13 capability-block add-menu vs SP-29 Spaces add-menu). **Flagged for the Decomposition Gate (§5-F2)** —
the exact seam (what fe-notes renders itself vs what it rides from the shell-wiring issue) must be stated, not guessed.

---

## 4. IMPLICIT RULES — hidden invariants no single doc states outright

- **IR-1 (compose-don't-rebuild):** every surface is a composition of the shipped `@vida/ui`/`@vida/editor`
  primitives over the ① service; fe-notes authors ZERO new design-system components and ZERO data logic — if a
  primitive is missing, that is a decomposition finding, not a license to build it here `[INTERP from fe-shell IR-1/IR-8;
  PLAN BR-5]`.
- **IR-2 (deferred-backend ⇒ honest terminal state, never a dead affordance):** for every backend-deferred leg
  (search/graph/preview/placement) the UI ships the affordance wired to its seam with a correct degraded state
  (`search-unavailable`, empty-graph, unenriched-card) — never a disabled stub nor a crash `[INTERP from PLAN:108-112;
  notes-and-pages.md:62-66; memory [[absent-deny-safe-port-write-is-noop-not-new-error]]]`.
- **IR-3 (the merged-backlinks SHAPE is this unit's to design):** ① returns `{pageLinks, entityLinks}` unmerged and
  explicitly tags the merge "G6-tentative → ②" `[FACT: seam-contract.md:56; notes-and-pages.md:38 (NOT-24)]`. The
  grouped/merged presentation (group-by-source? by type? preview per row?) is a NET-NEW design answer → an ENVISION
  checkpoint, not a doc-fixed render `[INTERP]`.
- **IR-4 (create-on-miss is an explicit two-call compose, in the UI):** the `[[` picker's "+ Create '<text>'"
  affordance calls `createPage('note')` THEN `createPageLink` — there is no service method that bundles them; a typo
  must never silently create a stray page without the user choosing `[FACT: seam-contract.md:48-50; notes-and-pages.md:33 (NOT-19)]`.
- **IR-5 (view-availability is per page-type):** Journal → Calendar/List/Gallery; Note → List/Gallery/Neural; the
  renderer set offered by CollectionView is gated by the page type, with renderers hard-coded (saved-view selection
  deferred) `[FACT: notes-and-pages.md:62 (NOT-48)]`.
- **IR-6 (editor facet is registry-gated):** the EntityView Editor facet renders only when the entity `offersEditor`
  (apps/web adapter gate); a note page offers it, a derived collection may not `[FACT: packages/ui/src/components/entity-view.tsx;
  apps/web/src/entity/adapter.ts]`.
- **IR-7 (content write goes through the Yjs/editor binding, not a patch):** `updatePage` is for structured metadata
  (`.strict()` whitelist, `content` excluded from casual patching); `pages.content` is CRDT — written via the
  canvas-editor binding `[FACT: notes-and-pages.md:51 (NOT-37); seam-contract.md:29]`.
- **IR-8 (typed-error affordances):** `JournalExistsError` (NP-2 one-journal-per-date) and `UnregisteredEntityTypeError`
  are user-facing conditions the UI must surface at the create/link affordance, not swallow `[FACT: seam-contract.md:70-74]`.
- **IR-9 (no shell-invented values):** every spacing/radius/z/color is a DS token; the only novel work is composition +
  interaction, not values `[INTERP from fe-shell IR-6]`.

---

## 5. Interpretation flags — carried to the ENVISION + DECOMPOSITION gates

- **F1 — ENVISION GATE: FIRES (§3.75).** Trigger test = "a user affordance whose UI answer isn't obvious from an
  existing shipped surface?" → **YES, multiply**: the Note entity page composition, the per-type collection layout, the
  **merged-backlinks presentation** (explicitly design-owed, IR-3), the `[[` picker + create-on-miss, the `/summary`
  block, the block-placement add-menu. These are novel interaction surfaces, not thin leaves reusing a shipped list.
  → Greybox the whole entity, pin EC-n `[FACT: scenario default.md:24; entity-delivery-flow.md §3.75]`.
- **F2 — #27 vs `fe-shell-integration-wiring` boundary** → **DOC-RESOLVED** (not a decomposition guess):
  - **Neural graph**: `XCU-BSE-23/24` (RIDE issue) = the **global `/graph` surface** over the deferred AR-8 engine;
    `NOT-49` (fe-notes) = the **notes-collection `layout='graph'` view-mode**. Both ride the same deferred AR-8
    data-prep → both render `NeuralGraph` in its `empty`/terminal state now `[FACT: xcut-backlinks-search-export.md:54-55
    — BSE-24 "renders NeuralGraph in its empty terminal state when AR-8 graph-prep is a seam"; decomposition-p6.md:13,15]`.
  - **Add-menu**: `XCU-SP-29` (RIDE issue) = the **Space standalone-surface** enforced palette; `XCU-CAP-12/13`
    (fe-notes) = the **editor/page block-placement** slash-menu + `block_instances` placement — same teeth-split RULE,
    different SURFACE (Space-level rides the shell issue; page/editor-level is this unit's) `[FACT: xcut-spaces.md:49
    (SP-29 = Space standalone add-menu); xcut-capability.md:42-43 (CAP-12/13 = editor/page block placement)]`.
  - Slice-map records this seam; fe-notes does not re-build the global graph nor the Space add-menu.
- **F3 — live `NotesService` composition root** → DECOMPOSITION: is the service wired live for apps/web in M1 or
  stubbed? (§2). Mirror the CODEC first-consumer-defer precedent.
- **F4 — React-Query key/invalidation scheme** → per-slice /contract: define keys + prefix-safe invalidation (§2).
- **F5 — deferred-leg degrade copy/state** → ENVISION (feel) + per-slice gate: the exact `search-unavailable`,
  empty-graph, unenriched-preview states.

## 6. Sources
docs/features/notes-and-pages/delivery/{interpretation,seam-contract,slice-map}.md ·
docs/specs/foundation/backend-intent/{decomposition-p6.md, PLAN-p6-frontend-track.md} ·
docs/specs/foundation/backend-intent/parts/{notes-and-pages.md, xcut-backlinks-search-export.md, xcut-capability.md} ·
docs/modules/notes/{current-spec.md, current-business-rules.md} ·
packages/ui/src/components/{collection-view,neural-graph,entity-view}.tsx · packages/editor/src/index.ts ·
apps/web/src/{routes.tsx, home/, canvas-editor/, entity/adapter.ts} · fe-shell delivery/interpretation.md (② template) ·
baseline terrain map (this session).
