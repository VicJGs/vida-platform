# PLAN: mod-notes ② · unit 02b — the notes collection surface (gate-1 SPEC)
Status: implemented      <!-- draft → approved(1) → approved(2) → implemented -->
Unit: MOD-notes increment ② (LIF-131, M1.1), sub-unit **②b — the notes collection surface**. Profile: add-frontend-component.
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim is [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Session: 2026-08-21-mod-notes-2 (②a data plane done+committed `6b72613`; ②b is the FIRST rendered unit).

<!--
  FORWARD spec — §1–§4 DESCRIPTION, §5 executable PROMPT citing §1–§4. Gate-1 (Approval-1) artifact.
  ②b is the first VISUAL ② unit — it carries the add-frontend-component substance (rendered surface · all visual
  states · dark-capable · responsive · Visual Gate) that the non-visual ②a did not. ②c (editor + `[[` picker),
  ②d (backlink panels + metadata), ②e (FTS5 search) follow.
-->

## 1. Identity
The **`/notes` collection surface** in `apps/web`: the browse view over `note`-type pages, rendered through the
M1.0-built UI-2 view renderers, wired to the ②a data plane. It replaces the AR-4 placeholder
(`apps/web/src/app/notes/index.tsx` = `<h2>Notes</h2>`). `[FACT: apps/web/src/app/notes/index.tsx; m1.1-delivery-plan.md §9:192-193]`

**The doc-fixed shape.**
- **Type scope = `note`.** The `/notes` route is the standalone **note** collection. Journals are the `/journals`
  route (MOD-journals); entity-attached notes (`task_note`/…) are reached from their parent entity's page, NOT a
  standalone collection. `[FACT: structure-data.md:41 "View availability by type … Note → List · Gallery · Neural"; identity.md:12]`
- **Views = List · Gallery · Neural.** The ②-wide renderer set is 4 (List/Calendar/Gallery/Neural, `delivery-plan
  §9:192`), but the **per-type availability table NARROWS `note` to List · Gallery · Neural** — Calendar is a *Journal*
  surface, not `note`. Renderers are hard-coded; the ADR-007 saved-view *selection* primitive is `[INTENT — DEFERRED]`
  (Victor 2026-07-23). `[INTENT: structure-data.md:41 (G3) "Note → List · Gallery · Neural"; FACT (narrowed from): delivery-plan §9:192; ADR-007-saved-views.md]`
- **Active view = ephemeral Zustand** (a runtime switcher, no persistence — the views-row is deferred). `[FACT: structure-data.md:36 "Zustand owns … open view … [INTENT — DEFERRED: ADR-007])"]`
- **Data via ②a.** `usePagesByType('note')` → `{ data, state }`; the view's `state` prop IS the hook's `deriveTerminalState`
  output — loading/empty/error/success come for free. `[FACT: ②a app/notes/hooks.ts; list-view.tsx:34]`
- **The documented creation surface = the command-bar `CommandProvider` action** (built M1.1 seam), not a bespoke
  button. MOD-notes registers a "New note" action that creates a `note` page + navigates — the doc-specified way to
  create (⌘K), which also makes the collection populatable for the Visual Gate. (General creation also flows via the
  `[[` picker create-on-miss → ②c; entity notes are auto-created by other modules.) `[FACT: command-bar-and-search.md:51 CommandProvider seam; registry.ts:register; intake G2:53, G4:57]`

**What it is NOT.**
- **Not the editor / authoring flow.** ②b's command creates a *bare* `note` page and navigates to it, but mounting
  TipTap, the `[[` picker, and authoring the page BODY are ②c; a card click NAVIGATES to `note/$id` (route added here,
  editor body owned by ②c). `[FACT: delivery-plan §9:192 "TipTap editor mount"; structure-data.md:40; the ② decomposition]`
- **Not backlink panels or page-metadata editing** (favorite/archive/icon/cover) → ②d. `[FACT: delivery-plan §9:193-194]`
- **Not FTS5 search UI** → ②e (over the DB-8 seam). `[FACT: delivery-plan §9:194,197]`
- **Not a populated neural graph.** Graph data-prep is deferred (AR-8 future / Views design-pass) → the Neural view
  degrades to `NeuralGraph`'s empty terminal state (the `/graph` route precedent). `[FACT: delivery-plan §9:197; app/graph/index.tsx]`
- **Not an app dark-mode toggle — and NO rendered dark pass for ②b's own components.** The app is light-only at M1.0
  (`App.tsx:63,71` — `theme="light"` hardcoded, no theme store); theme STATE + toggle are UX-3/UI-4's. `apps/web` has
  **no Storybook** (the DS-4 dark decorator covers `@vida/ui` only, not app-feature files). So ②b's dark-correctness
  guarantee is **token-discipline alone** — zero hex, every value a DS token → dark-correct by construction (NC-6); a
  *rendered* dark verification of NoteCard/switcher/route defers to when the app gains a theme store (UX-3/UI-4). This
  is a documented M1.0 constraint, NOT a Storybook review this unit can run. `[FACT: App.tsx:63,71; packages/ui/src/CLAUDE.md "Theme STATE + toggle … are the APP's"; no apps/web/.storybook]`
- **Not a new `@vida/ui` primitive.** ②b COMPOSES the shipped views + UI-1 `Card` (the `renderItem` interactive-row
  pattern); it builds app-feature components only. `[FACT: list-view.tsx:29-31 "compose an interactive Card in renderItem"]`

## 2. Business Rules
> Inherits the CORE constitution + BR-RT-* + the UX-4 terminal-state canon. Every rule complies.

- **NC-1 — The note collection reads `note` pages only.** `usePagesByType('note')`; other types are out of this route. `[FACT: structure-data.md:41]`
- **NC-2 — Three hard-coded views, ephemeral switch.** List (default) · Gallery · Neural, selectable at runtime via a
  Zustand `activeNotesView` slice; no saved/persisted view. Default = `list`. The switcher composes UI-1 with APG
  semantics (keyboard-navigable, correct roles, focus ring); **no doc specifies the control primitive**, so it is a
  build-time impl choice, not a spec-fixed control. `[FACT: structure-data.md:36,41 (ephemeral open-view; renderers hard-coded); module-map.ts:68 hasMultiModeTopView; no doc fixes the control]`
- **NC-9 — Creation is the documented command-bar action, not a header button.** MOD-notes registers a `CommandProvider`
  with a "New note" action (⌘K) that creates a `note` page (`createPage({type:'note', …})`, `journal_date` null, NP-2)
  → navigates to `note/$id`. This is the doc-specified creation surface (command-bar-and-search.md:51) + what makes the
  collection populatable for the Visual Gate. General creation also flows via the `[[` picker create-on-miss (②c);
  entity notes are auto-created by other modules. `[FACT: command-bar-and-search.md:51; registry.ts:register; intake G2:53, G4:57]`
- **NC-3 — Terminal state is the data plane's, not re-derived.** Each view's `state` = the `usePagesByType('note')`
  hook's `state` (DP-7); ②b never re-implements loading/empty/error logic. `[FACT: hooks.ts; list-view.tsx:34]`
- **NC-4 — Rows are interactive Cards that navigate.** `renderItem` = a `NoteCard` composing UI-1 `Card interactive`
  (role=button semantics owned by Card); activation navigates to `/notes/$id` (TanStack Router `Link`/`navigate`).
  `getKey` = the page `id` (UUIDv7, never index). `[FACT: list-view.tsx:29-33; card CLAUDE.md "role=button when interactive"; routes.tsx code-based router]`
- **NC-5 — Neural degrades, never crashes.** `<NeuralGraph nodes={[]} edges={[]} state="empty" />` at M1.0 (no
  graph-prep); the same graceful-empty as `/graph`. `[FACT: app/graph/index.tsx; delivery-plan §9:197]`
- **NC-6 — Dark-capable by token discipline.** Zero hardcoded hex/color; every color/space/radius is a DS token, so
  the surface is dark-correct by construction (the DS-4 dark theme). No runtime inversion, no bespoke dark pass. `[FACT: packages/ui/src/CLAUDE.md "Dark mode = a switchable first-class Theme, never a runtime inversion"; design.md §II]`
- **NC-7 — Responsive 375/768/1440.** The route + switcher + card reflow; the views self-handle their grids (gallery
  wraps to 1 col at 375; the switcher stays reachable). `[FACT: design.md §X breakpoints; gallery-view responsive]`
- **NC-8 — No business logic in the view layer.** Rows render `PageRow` fields; all rules (NP-*) are ①-owned; ②b maps
  data → UI only. `[FACT: current-business-rules.md ① rules]`

**Terminal / visual states (the add-frontend-component §VIII set) — per NEW component, enumerated:**
- **View area** (List/Gallery): loading (skeleton) · empty ("No notes yet") · error (message) · success (rows) — the
  view owns these off the `state` prop. `[FACT: list-view.tsx four states]`
- **NoteCard** (interactive): default · hover · focus (the **`--color-focus-ring` 2px/2px ring MUST render on the
  composed Card** — verify it survives composition; the DEF-U8-h/injected-CSS traps have bitten focus/radius before) ·
  active. disabled/loading/error/empty are N/A (a rendered row is present, non-interactive-beyond-navigate data). `[FACT: card.tsx role=button + keyboard; components.md:149-162 focus-ring non-negotiable]`
- **Switcher** (control TBD at build): default · hover · focus-visible · active/**selected** (the current view). No
  disabled (all 3 views always available for `note`) · no loading/error/empty (a static 3-item control). The chosen
  UI-1 primitive supplies the roving/APG semantics. `[FACT: standards/components.md §VIII; module-map.ts:68]`
- **"New note" command** (a command-bar item, not a route control): its visual states are the command-bar overlay's
  (UX-2/UI-4-owned — active/selected item, focus ring); MOD-notes owns only the `run()` (create + navigate), not the
  chrome. `[FACT: command-bar-and-search.md:33-35 focus contract; the action is a provider entry, not a rendered Button]`

## 3. Contract
New app-feature files. **One small `@vida/core` API completion** (B1): `PageRow` (+ sibling Row types) is consumed by
the app but NOT on the public barrel (`services/notes/types.ts:15` only `import type`s it) → `import { PageRow } from
'@vida/core'` fails today. Add `export type { PageRow, PageLinkRow, NoteAttachmentRow } from './db/schema/notes'` to
`packages/core/src/index.ts` (these are the public return types of `NotesService` — legitimately consumer-facing) +
rebuild dist. Otherwise app-only; route wiring edits `routes.tsx`. `[FACT: index.ts barrel chain; schema/notes.ts:104 PageRow]`

**Route (`apps/web/src/app/notes/index.tsx` — REPLACE the stub):**
- `default function NotesRoute()` — `usePagesByType('note')` + the active-view Zustand slice; renders a header (title),
  the `hasMultiModeTopView` switcher, and the selected view. (Creation is the command-bar action, not a header button —
  §"New note".) `[FACT: routes.tsx lazyRouteComponent(() => import('./app/notes')); module-map.ts:68]`

**Detail route (`apps/web/src/app/note-detail.tsx` — NEW; + `routes.tsx` EDIT):**
- Per-page detail path = **`note/$id`** (structure-data.md:40 "any page → note/[id]"; mobile-confirmed `app/note/[id].tsx`).
  The existing 0-byte `notes/[id].tsx` is a file-based leftover this **code-based** router doesn't use — delete it. Add
  the param route IN `routes.tsx`: `createRoute({ getParentRoute: () => rootRoute, path: '/note/$id', component:
  lazyRouteComponent(() => import('./app/note-detail')) })` — the exact `notesRoute`/`graphRoute` shape + a `$id`
  segment; read via `useParams({ from: '/note/$id' })`. ②b ships a **minimal placeholder** detail (title + "editor lands
  in ②c"); ②c replaces the body. `[FACT: structure-data.md:40; routes.tsx:46-66 createRoute pattern + "code-based, not file-based"; delivery-plan §9 editor→②c]`

**"New note" — the DOCUMENTED command-bar action (`apps/web/src/app/notes/commands.ts` — NEW; + `shell/command-bar.tsx` EDIT):**
- A MOD-notes `CommandProvider` (`{ id, getCommands: () => Command[] }`) exposing a "New note" `Command` (`category:'action'`).
- **⚠ run-contract (preflight):** `Command.run: (ctx: CommandRunContext) => void` is **synchronous** and `ctx` gives
  **only `navigate`** — NOT the service. So `run` reaches the service via `import { getNotesService }` (module singleton,
  not `ctx`) and does **fire-and-forget async**: `getNotesService().createPage({ type:'note' })` → then **`queryClient`
  invalidate** → then `ctx.navigate(\`/note/${p.id}\`)`; `.catch(→ toast)`. `type` is the only required field
  (`createPageSchema` — title nullish → "Untitled"). `[FACT: types.ts:15-27; validators/note.ts:27-28]`
- **⚠ BLOCKER-grade (gate-2 B-1): the run MUST invalidate the cache or the new note is invisible.** A command runs
  OUTSIDE React (can't use `useCreatePage`), so it must invalidate the module-level `queryClient` singleton directly:
  `queryClient.invalidateQueries({ queryKey: notesKeys.type('note') })` + `notesKeys.lists()`. Without it, `staleTime:
  30_000` (`lib/query-client.ts:18`) serves the stale list on return to `/notes` → the created note doesn't appear →
  the demonstrability premise fails. **Requires exporting the key factory** from `hooks.ts` (currently a private `const
  keys`) as `notesKeys`. `[FACT: lib/query-client.ts:18 staleTime 30s + exported queryClient; hooks.ts:20 keys private → export]`
- **Registration:** add a `registry.register(notesProvider)` line inside `CommandBar`'s `useMemo` (`shell/command-bar.tsx:68-75`,
  alongside `registry.register(navProvider)` / `shellActionsProvider`) + the import — a small shell edit; the documented
  "modules contribute at M1.1+" wiring. `[FACT: shell/command-bar.tsx:68-75 registry.register(...) in the useMemo; command-bar-and-search.md:51]`

**View switcher (`apps/web/src/app/notes/view-switcher.tsx` — NEW):**
- The `hasMultiModeTopView` selector (module-map.ts:68) rendering the ephemeral "open view" (Zustand): List · Gallery ·
  Neural. Composes UI-1 (APG multi-mode control); bound to the Zustand slice; token-only, responsive. Renderers
  hard-coded; the persistent views-row is deferred. `[FACT: module-map.ts:68 hasMultiModeTopView; structure-data.md:36 open-view; delivery-plan §9:193]`

**Note card (`apps/web/src/app/notes/note-card.tsx` — NEW):**
- `NoteCard({ page }: { page: PageRow })` — composes UI-1 `Card interactive`; shows title (or "Untitled"), a type/
  updated line; activation `navigate`s to the per-page detail `note/[id]` (structure-data.md:40). The `renderItem` for
  List + Gallery; **focus ring must render** (§2). `[FACT: list-view.tsx:29-31; card interactive; structure-data.md:40; PageRow barrel-exported per B1]`

**Active-view store (`apps/web/src/stores/notes-ui-store.ts` — NEW):**
- A Zustand slice `useNotesUiStore` with `activeNotesView: 'list'|'gallery'|'neural'` + setter (default `list`).
  Mirrors the existing `stores/app-shell-ui-store.ts` pattern. `[FACT: apps/web/src/stores/app-shell-ui-store.ts; structure-data.md:36]`

**Composition:**
- List → `<ListView items={notes} state={state} getKey={p=>p.id} renderItem={p => <NoteCard page={p}/>} aria-label="Notes" />`
- Gallery → `<GalleryView …>` (same props + `minTileWidth`).
- Neural → `<NeuralGraph nodes={[]} edges={[]} state="empty" />` (degraded).
- `state` = `usePagesByType('note').state`. `[FACT: list-view.tsx / gallery-view.tsx / neural-graph.tsx props]`

**Types.** No new domain types. `PageRow` imported from `@vida/core` (post the B1 barrel export); local prop types not exported. `[FACT: standards/components.md §VII; B1]`

## 4. Acceptance
- [ ] `/notes` renders the note collection (List default) — the AR-4 `<h2>Notes</h2>` stub is gone; `note`-type pages only.
- [ ] **The command-bar "New note" action** (a MOD-notes `CommandProvider`) creates a `note` page + navigates — the documented creation surface. It makes the collection populatable, so **every non-empty state is reachable in a real browser** (closes the demonstrability finding without a bespoke button).
- [ ] The `hasMultiModeTopView` switcher toggles List/Gallery/Neural via the Zustand slice; the choice persists across a route away+back (ephemeral, not reloaded); default is List.
- [ ] All four view terminal states render correctly, driven by `usePagesByType('note').state` (not re-derived): loading skeleton · empty "No notes yet" · error message · success rows.
- [ ] A `NoteCard` is an interactive Card (keyboard-activatable per UI-1 Card) with a **visible `--color-focus-ring` 2px/2px focus ring**; Enter/Space/click navigates to `note/$id`; `getKey` uses the page id.
- [ ] `note/$id` is a real code-based route (`useParams`); ②b's placeholder detail shows the page title (②c owns the editor body). The 0-byte `notes/[id].tsx` is deleted.
- [ ] Neural view renders `NeuralGraph` degraded-empty (no crash, no graph data) — the `/graph` pattern.
- [ ] **Responsive 375/768/1440:** header/switcher + cards + views reflow; gallery → 1 col at 375; nothing clipped/overflowing.
- [ ] **Dark-capable (token-discipline only):** zero hardcoded hex/color — every value a DS token (grep clean). NO rendered dark pass (apps/web has no Storybook; app is light-only, no theme store) — rendered dark defers to the app theme store (UX-3/UI-4). Stated, not skipped-silently.
- [ ] **A11y (§XIV):** the multi-mode switcher is keyboard-navigable with correct roles; the list has an accessible name; focus visible on cards + switcher; tab order follows reading order. (The "New note" command's chrome/focus is UX-2/UI-4's; MOD-notes owns only `run()`.)
- [ ] `pnpm --filter @vida/web typecheck` 0 · `test` green (route render per state · switcher toggle · card navigate · store) · `build` ✓ · ESLint 0.
- [ ] `/component-audit` + `/critique` SHIP + quality-gate-components/-engineering/verification PASS.
- [ ] **REAL-BROWSER VISUAL GATE** — the states at 375/768/1440. **Run locus:** runnable locally via the `chrome-devtools` MCP (Brave); the jsdom render tests are the fast unit-level proof, the Visual Gate is the browser gate. `[FACT: e2e/CLAUDE.md]`
- [ ] §XXIX current-* refreshed (the notes-and-pages built slice gains the ②b surface; D6 births the app-notes context docs if not present).

## 5. Implementation Prompt
Cites §1–§4; done-check = §4. Order (core-export → data → shell → states → responsive per §VIII):
1. **B1 core export** — add `export type { PageRow, PageLinkRow, NoteAttachmentRow } from './db/schema/notes'` to
   `packages/core/src/index.ts`; `pnpm --filter @vida/core build` (dist). Verify `import { PageRow } from '@vida/core'` resolves.
2. **`stores/notes-ui-store.ts`** — the Zustand `activeNotesView` slice (mirror `app-shell-ui-store.ts`). NC-2.
3. **`app/notes/note-card.tsx`** — `NoteCard({page:PageRow})` over UI-1 `Card interactive` → `navigate('/note/$id')`; token-only; focus ring verified. NC-4/NC-6.
4. **`app/notes/view-switcher.tsx`** — the `hasMultiModeTopView` selector (List/Gallery/Neural) bound to the store, composing UI-1. NC-2/NC-7/§XIV.
5. **`app/note-detail.tsx`** (NEW) — placeholder detail: `useParams({from:'/note/$id'})` → title + "editor = ②c". Delete the 0-byte `notes/[id].tsx`.
6. **`routes.tsx`** (EDIT) — add the `/note/$id` route (`createRoute` + `lazyRouteComponent(() => import('./app/note-detail'))`, mirror `notesRoute`). NC-4.
7. **`app/notes/commands.ts`** (NEW) + **`hooks.ts`** (export `notesKeys`) + **`shell/command-bar.tsx`** (EDIT) — the MOD-notes `CommandProvider`; "New note" `run` = sync-void: `getNotesService().createPage({type:'note'})` → `queryClient.invalidateQueries(notesKeys.type('note'))` + `notesKeys.lists()` (**B-1 — or the new note is invisible under staleTime 30s**) → `ctx.navigate(\`/note/${p.id}\`)`; `.catch(toast)`. Register via `registry.register(notesProvider)` in `shell/command-bar.tsx`'s `useMemo`. NC-9.
8. **`app/notes/index.tsx`** — REPLACE the stub: header (title) + switcher + the selected view; List/Gallery pass `state`/`items`/`getKey`/`renderItem`; Neural degraded-empty. NC-1/NC-3/NC-5.
9. **Visual states + responsive** — verify all four view states via the hook (mock each); 375/768/1440 reflow; **grep zero hex** (the only dark guarantee). §VIII/NC-6/NC-7.
10. **Tests** — `app/notes/*.test.tsx` (jsdom): route per state (mock the hook), the "New note" command → create+navigate, switcher toggles the store, NoteCard navigate, store default/set. Mirror `useSchemaVersion.test.ts` + the hooks-test harness.
11. **`/document-context`** the app-notes surface — refresh/birth current-* (D6/§XXIX).

## 6. Doc-resolved points (NONE are open decisions — every one is fixed by a doc)
- **View set = List·Gallery·Neural for `note`** (Calendar is Journal's). `[FACT: intake G3:55 "Views per type (confirmed)"; structure-data.md:41]`
- **Switcher = the documented `hasMultiModeTopView` capability**, NOT a control I choose. `notes` is flagged
  `hasMultiModeTopView: true`; the active view is ephemeral Zustand ("open view"); the persistent (saved) views-row is
  deferred. It composes UI-1; the exact primitive is an implementation detail of rendering the documented multi-mode
  top view, not an owned fork. `[FACT: module-map.ts:68 hasMultiModeTopView:true; structure-data.md:36 ephemeral open-view; delivery-plan §9:193 renderers hard-coded]`
- **Creation = doc-specified, NOT a bespoke button.** Entity notes are **auto-created eagerly** (other modules'). General
  `note` creation is via **(a) the command-bar `CommandProvider` action seam** (built — modules contribute at M1.1+) and
  **(b) the `[[` picker create-on-miss** (②c). ②b's demonstrable creation = a MOD-notes **CommandProvider "New note"
  action** over `useCreatePage`, the documented surface. `[FACT: intake G4:57 auto-create; command-bar-and-search.md:51 + registry.ts:register + types.ts:29; intake G2:53 picker create-on-miss]`
- **Routes = doc-fixed.** Collection `/notes` (`module-map.ts:68 routePath`); per-page detail `note/[id]`
  (`structure-data.md:40`, mobile-confirmed). NOT `/notes/$id`. `[FACT: module-map.ts:68; structure-data.md:40]`
- **Dark = capable-not-toggled** (app light-only, no Storybook in apps/web). `[FACT: App.tsx:63; packages/ui CLAUDE.md]`
- **Neural degrades empty** (graph-prep deferred). `[FACT: delivery-plan §9:197; app/graph]`
- **`PageRow` barrel export (B1)** — not public today → §3 adds it. `[FACT: index.ts barrel chain]`

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-21 | 2026-08-21-mod-notes-2 | initial ②b PLAN — grounded ENTIRELY in docs (structure-data.md view-per-type + ephemeral-switch + ADR-007-deferred · App.tsx:63 light-only · delivery-plan §9 neural-deferred · list/gallery/neural view props). Scope = the note-collection browse surface; editor/detail/backlinks/search = ②c–②e. |
| 2026-08-21 | 2026-08-21-mod-notes-2 | **gate-1 critique REVISE→folded:** DEMONSTRABILITY — browse-only = empty-forever → gutted Visual Gate. **B1** `PageRow` not on the `@vida/core` barrel → §3/§5.1 add the `export type` + rebuild. **C1/C2** view-set cite fixed (per-type narrows §9's 4-view list; INTENT tag). **C3** apps/web has no Storybook → dark = token-discipline only. **R3** state matrices enumerated. **R4** `[id].tsx` file-based trap → `note-detail.tsx`. |
| 2026-08-21 | 2026-08-21-mod-notes-2 | **preflight PASSED** — grounded the last contracts: `Card` = `interactive`+`onPress`→navigate; `createPageSchema` requires only `type` (title nullish→"Untitled"). **2 command-integration precision items folded:** (PF-1) `Command.run` is SYNC + `ctx` gives only `navigate` → the "New note" run reaches the service via import + does fire-and-forget `createPage().then(navigate).catch(toast)`; (PF-2) the provider registers in `shell/command-bar.tsx` (small shell edit). |
| 2026-08-21 | 2026-08-21-mod-notes-2 | **Victor drift-catch: "I don't own decisions — the docs tell you."** Three inventions of mine (+ the critic's) were DRIFT from the docs, corrected: (1) **Creation** — I invented a "New note **button**"; docs specify creation via the built **command-bar `CommandProvider` seam** (command-bar-and-search.md:51; registry.ts) + `[[` picker create-on-miss (②c) + auto-entity-notes (intake G4:57). Now a MOD-notes CommandProvider action, not a bespoke control. (2) **Switcher** — I "decided" UI-1 `Tabs`; it's the documented **`hasMultiModeTopView:true`** capability (module-map.ts:68) rendering the ephemeral open-view (structure-data.md:36) — compose UI-1, no owned control-fork. (3) **Route** — `/notes/$id` → the doc-fixed **`note/[id]`** (structure-data.md:40) + collection `/notes` (module-map.ts:68). §6 renamed "Decisions" → "Doc-resolved points" (zero open decisions). |
| 2026-08-21 | 2026-08-21-mod-notes-2 | **gate-2 critique REVISE→folded:** **B-1** (blocker) — the "New note" run called raw `createPage` with NO cache invalidation → under `staleTime:30s` the new note is invisible on return → demonstrability silently broken; fixed: the run invalidates the module `queryClient` (`notesKeys.type('note')`+`.lists()`; export `notesKeys` from hooks.ts). **R-1** — NC-2 still hard-named "Switcher = UI-1 `Tabs`" (the SAME residual drift Victor caught) → removed; no doc fixes the control, it's a build-time impl choice. Registration phrasing corrected (register in `CommandBar` useMemo, not an array). All cites re-verified PASS. |
| 2026-08-21 | 2026-08-21-mod-notes-2 | **IMPLEMENTED §5.1–11.** `@vida/core` `PageRow` barrel export (B1) + rebuild · `stores/notes-ui-store.ts` · `note-card.tsx` · `view-switcher.tsx` (toggle-button group) · `note-detail.tsx` + `/note/$id` route · `keys.ts` (extracted for the eager-bundle discipline) · `commands.ts` CommandProvider (service DYNAMIC-imported, BR-7) + registered in `shell/command-bar.tsx` · `index.tsx` route. **3 impl-time fixes:** (a) `styled(Text,{render:'h1'})` — a runtime `role` on Text isn't honoured; (b) `commands.ts` dynamic-imports the service so the eager shell bundle stays light (the static import timed out the S5 integration test); (c) the S5 integration test stubs `usePagesByType` (the /notes route is data-backed now — same pattern as its boot/first-run stubs). typecheck 0 · ESLint 0 · full @vida/web suite green (route/switcher/card/store/command/integration). §XXIX current-* refreshed. **②b COMPLETE.** |
