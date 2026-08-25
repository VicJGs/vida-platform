<!-- §XXVI gate-2 artifact (IMPLEMENTATION-PLAN) for slice B1. Exhaustive build prompt — victor:execute-plan-code
     works this via the task ## Build Steps. Every import path + prop shape is code-verified (No-Guessing). Pairs
     with the approved spec b1-notes-collection.md (§2 rules, §4 acceptance/Visual Gate). Branch mod-notes-rebuild. -->

# IMPLEMENTATION-PLAN — B1 /notes route + 4 baseline renderers

**Home:** `apps/web/src/` (app/notes/·db/·stores/·App.tsx·routes.tsx). **Gate to clear:** ░Visual Gate░ (spec §4).
**Consumes (frozen ① seam):** `NotesService.listPages`/`createPage` (A1). **Composes:** UI-1/UI-2 `@vida/ui` + UX-4
`deriveTerminalState`. No new design token, no `@vida/ui` edit (BR-1).

## Verified import surface (all confirmed on disk — No-Guessing)
- **Core service + factory (already barrel-exported):** `createNotesService`, `type NotesService`,
  `createSpacesService`, `createTaggableTypeRegistry`, `createBacklinkResolver`, `createDrizzleProxy`, `uuidv7` —
  all from `@vida/core` `[FACT: core/index.ts:66,98,117,133,137; services/notes/index.ts:2-3; foundation/spaces/index.ts:5-7; services/search/index.ts:3]`.
- **⚠ `PageRow` is NOT flat-exported (gate-2 BLOCKER, verified):** the barrel does `export * as schema from
  './db/schema'` (namespace only) `[FACT: core/index.ts:62]`, so `import { PageRow }` fails `TS2305`. `PageRow`/
  `PageLinkRow`/`NoteAttachmentRow` live at `schema/notes.ts:104,106,108`. **Fix = build-step 0** (add a flat
  re-export — the frozen seam's ②-facing "Returns = Drizzle Rows" surface, `seam-contract.md:12`).
- **DB seam:** `createWebDatabaseAdapter().createDrizzle(driver)` → `DrizzleDb` `[FACT: web-adapter.ts:70-71]`;
  `getDbClient()` (`.driver`) `[FACT: db/boot.ts:19]`.
- **Boot crypto:** `initVault()` `Promise<void>` `[FACT: @vida/core → vault.ts:23]`.
- **View components:** `ListView`/`GalleryView`/`CalendarView`/`NeuralGraph` + `type GraphNode`/`GraphEdge`
  from `@vida/ui` `[FACT: ui/index.ts:40-46]`. Shared props: `items`/`renderItem(item,i)`/`getKey(item,i)`/
  `state?: ViewState`/`empty?`/`error?`/`aria-label`; Calendar adds `getDate(item)→Date|string`; Neural takes
  `nodes`/`edges`/`onNodeClick?`/`state?` `[FACT: list-view.tsx:33-63; gallery-view.tsx:19-42; calendar-view.tsx:18-42; neural-graph.tsx:19-46]`.
- **Terminal state:** `deriveTerminalState(result, isEmpty)` + `type TerminalState` from
  `../../state-conventions/terminal-state` `[FACT: terminal-state.ts:18,50]` (`TerminalState` is structurally
  assignable to `@vida/ui`'s `ViewState` — same 4 literals, no import needed, BR-2).
- **React Query:** `useQuery`, `useQueryClient` from `@tanstack/react-query` (client already provided, App.tsx).
- **Router:** `useNavigate` from `@tanstack/react-router` (first app use); route registration in `routes.tsx`
  (`createRoute` + `lazyRouteComponent`, the `notesRoute`/`graphRoute` pattern) `[FACT: routes.tsx:53-66]`.
- **Zustand:** `create` from `zustand` — v5 curried `create<T>()(...)` `[FACT: stores/app-shell-ui-store.ts:8,26]`.
- **createPage input:** `{ type: 'note' }` is valid — non-journal requires no `journal_date` (the refine fires only
  for `type==='journal'`, and `undefined == null` satisfies the else-branch) `[FACT: packages/core/src/validators/note.ts:25-46]`.
  `PageRow` (`schema/notes.ts:104`) has `id`·`title`(nullable)·`type`·`created_at`(Unix ms, notNull)·`is_favorite`·
  `is_archived` `[FACT: schema/notes.ts:39-50 cols; _shared.ts:36 baseColumns.created_at]`.

## Build step 0 — `packages/core/src/index.ts` (the ②-facing Row surface, gate-2 BLOCKER fix)
Add ONE flat re-export beside the `schema` namespace line — the seam-contract's "Returns = Drizzle Rows" surface ②
binds to by name (`seam-contract.md:12`). Distinct from the earlier phantom "fold": the *factories* are exported,
the Row *types* were only namespaced (`export * as schema`).
```ts
export type { PageRow, PageLinkRow, NoteAttachmentRow } from './db/schema/notes'   // ②-facing Row surface (B1: PageRow; B2/B3 reuse)
```

## Build step 1 — `apps/web/src/db/device.ts` (N2 · shared app infra)
Mirrors `first-run-repo.ts` app_state I/O + the `db/boot` ensure/get split. `uuidv7()` — confirm the app's id util
at preflight (`@vida/core` id export vs a local util); use whatever `first-run-repo`/schema PKs use.
```ts
import { getDbClient } from './boot'
const DEVICE_ID_KEY = 'device_id'
let deviceId: string | null = null

export async function ensureDeviceId(): Promise<string> {          // boot-time (mirrors ensureDbReady)
  if (deviceId) return deviceId
  const rows = await getDbClient().driver.query<{ value: string }>(
    'SELECT value FROM app_state WHERE key = ?', [DEVICE_ID_KEY])
  let id = rows[0]?.value
  if (!id) {
    id = uuidv7()                                                  // gen-once
    await getDbClient().driver.run(
      'INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', [DEVICE_ID_KEY, id])
  }
  return (deviceId = id)
}
export function getDeviceId(): string {                            // sync accessor (keeps getNotesService() sync)
  if (!deviceId) throw new Error('getDeviceId() called before ensureDeviceId() — boot ordering bug')
  return deviceId
}
```

## Build step 2 — `apps/web/src/App.tsx` (boot: N1 + N2 before the router)
In the existing `useEffect`, after `ensureDbReady()` resolves, `await ensureDeviceId()` then `await initVault()`
before flipping `dbReady` (keep the single Loading surface until all three resolve; the retry memo already clears on
throw). Order: `ensureDbReady → ensureDeviceId → initVault → setDbReady(true)`. `[FACT: App.tsx ensureDbReady seam]`

## Build step 3 — `apps/web/src/app/notes/notes-service.ts` (the singleton, BR-B1-6)
```ts
import { createNotesService, createSpacesService, createTaggableTypeRegistry, createBacklinkResolver,
         createDrizzleProxy, type NotesService } from '@vida/core'
import { getDbClient } from '../../db/boot'
import { getDeviceId } from '../../db/device'
let svc: NotesService | null = null
export function getNotesService(): NotesService {
  if (svc) return svc
  const db = createDrizzleProxy(getDbClient().driver)   // P-1 ✓ driver IS an SqliteDriver (client.ts:141); shared SQL→driver map (core/index.ts:66)
  const deviceId = getDeviceId()
  const registry = createTaggableTypeRegistry()                                // PRE-SEEDED from ENTITY_TYPES (N3)
  const spaces = createSpacesService(db, deviceId, registry)                   // SAME registry instance
  const backlinks = createBacklinkResolver(db, deviceId)
  return (svc = createNotesService(db, deviceId, { spaces, backlinks, registry }))
}
```
⚠ **Preflight item P-1:** verify how the app already builds a `DrizzleDb` from the live worker driver — `useSchemaVersion`
passes `getDbClient().driver` to a `@vida/core` free-fn, it does NOT build a Drizzle instance. Confirm `createDrizzle`
is reachable + that the worker driver satisfies the sqlite-proxy callback the service repos issue (they run real
`SELECT`/`INSERT` through the same driver). If the adapter needs the *async* proxy path, wire exactly that.

## Build step 4 — `apps/web/src/stores/notes-view-store.ts` (ephemeral, BR-B1-3)
```ts
import { create } from 'zustand'
export type NotesView = 'list' | 'gallery' | 'calendar' | 'neural'
interface NotesViewState { view: NotesView; setView: (v: NotesView) => void }
export const useNotesViewStore = create<NotesViewState>()((set) => ({ view: 'list', setView: (view) => set({ view }) }))
```

## Build step 5 — `apps/web/src/app/notes/use-notes-list.ts` (BR-B1-5)
```ts
import { useQuery } from '@tanstack/react-query'
import type { PageRow } from '@vida/core'
import { getNotesService } from './notes-service'
export function useNotesList() {
  return useQuery({ queryKey: ['pages', 'list'], queryFn: (): Promise<PageRow[]> => getNotesService().listPages({}) })
}
```
- New Note mutation (in the screen or a `useCreateNote` hook): `useMutation({ mutationFn: () =>
  getNotesService().createPage({ type: 'note' }), onSuccess: () => queryClient.invalidateQueries({ queryKey:
  ['pages','list'] }) })` — invalidate-and-reread (BR-RT-4, no optimistic). The new note appears in the active
  renderer; **no navigation** (the real detail is B2).

## Build step 6 — `apps/web/src/app/notes/notes-collection.tsx` (the screen)
Order: types → default → all 4 states → dark → responsive (375→768→1440). Skeleton:
```tsx
export function NotesCollection() {
  const q = useNotesList()
  const state = deriveTerminalState(q, (d) => d.length === 0)        // isPending-first (BR-B1-1)
  const view = useNotesViewStore((s) => s.view)
  const setView = useNotesViewStore((s) => s.setView)
  const navigate = useNavigate()
  const items = q.data ?? []
  const openRow = (id: string) => navigate({ to: '/note/$id', params: { id } })     // → B1 stub route (step 8)
  const emptyCTA = <Button onPress={createNote}>New Note</Button>                    // EC-5 create-CTA
  // The view-switch IS a Tabs (APG roving/arrow-nav free) — controlled by the Zustand `view`, with ONE
  // <Tabs.Panel> per renderer (NOT an external switch — Tabs owns the panel/a11y wiring + dev-warns on an
  // unmatched value, a locked gate, BR-B1-10). A New Note Button sits beside the strip.
  return (
    <>
      <Button onPress={createNote}>New Note</Button>
      <Tabs
        value={view} onValueChange={(v) => setView(v as NotesView)}
        items={[{value:'list',label:'List'},{value:'gallery',label:'Gallery'},{value:'calendar',label:'Calendar'},{value:'neural',label:'Neural'}]}
        aria-label="Notes views"
      >
        <Tabs.Panel value="list"><ListView items={items} renderItem={row} getKey={p=>p.id} state={state} empty={emptyCTA} error={<Message…/>} aria-label="Notes, list view" /></Tabs.Panel>
        <Tabs.Panel value="gallery"><GalleryView items={items} renderItem={row} getKey={p=>p.id} state={state} empty={emptyCTA} error={…} aria-label="Notes, gallery view" /></Tabs.Panel>
        <Tabs.Panel value="calendar"><CalendarView items={items} renderItem={row} getKey={p=>p.id} getDate={p=>new Date(p.created_at)} state={state} error={…} aria-label="Notes, calendar view" /></Tabs.Panel>
        <Tabs.Panel value="neural"><NeuralGraph nodes={items.map(p=>({id:p.id,label:p.title??'(untitled)'}))} edges={[]} state={state} onNodeClick={openRow} aria-label="Notes, neural view" /></Tabs.Panel>
      </Tabs>
    </>
  )   // Calendar/Neural fold empty into their own designed empty (no `empty` slot on those two).
}
```
- **State→every renderer:** pass the derived `state` to each view; the `empty` slot = `emptyCTA`; the `error` slot =
  a `role=status` message (the views own the region). Calendar/Neural fold empty into their own designed empty
  (Calendar: grid-with-no-chips; Neural: `state='empty'`).
- **renderItem** (list/gallery/calendar chip): a UI-1 `Card`/pressable showing `title ?? '(untitled)'`, `onPress={()
  => openRow(item.id)}` (LV-5: the consumer composes the interactive row). `getKey = (p) => p.id`.
- **a11y:** the view-switch is arrow-navigable with a visible focus ring; each view gets an `aria-label`
  ("Notes, list view" …) so `resolveDataViewState`'s name-warn stays silent; New Note reachable + Enter-activatable.

## Build step 7 — `apps/web/src/app/notes/index.tsx` (replace the AR-4 stub)
```tsx
import { NotesCollection } from './notes-collection'
export default function NotesRoute() { return <NotesCollection /> }
```

## Build step 8 — `/note/$id` ENABLING STUB (⚠ boundary — flagged for gate-2)
EC-4/§4-item-1 MUST: "a row opens /note/[id]" → the route must resolve. B1 registers it with a **placeholder**
(exactly the AR-4→/notes stub pattern B1 is now replacing); **B2 replaces the component** with the real editor + rail.
- `apps/web/src/app/note/index.tsx`: `export default function NoteDetailRoute(){ return <h2>Note</h2> }` (placeholder).
- `routes.tsx`: add `const noteRoute = createRoute({ getParentRoute: () => rootRoute, path: '/note/$id', component:
  lazyRouteComponent(() => import('./app/note') ) })` + include in `rootRoute.addChildren([...])`. `[FACT: routes.tsx:53-68]`
⚠ **gate-2 must bless this as enabling infra (like AR-4's /notes stub), not B2 scope-creep.** If rejected, the
fallback is a `/note/$id` that renders nothing until B2 — but the route registration itself is unavoidable for the
EC-4 MUST.

## Build step 9 — tests (`*.test.tsx`, Testing Library + Vitest)
- `notes-collection.test.tsx`: derivation → each state renders its distinct region (loading skeleton · empty **with a
  reachable New Note CTA** · error status · success rows); view-switch swaps the renderer; New Note fires createPage +
  invalidate (mock `getNotesService`); row click calls `navigate({to:'/note/$id'})`.
- `device.test.ts`: `ensureDeviceId` gen-once + persist + memo; `getDeviceId` throws pre-boot.
- **N1 guard (unit):** a `createPage` without `initVault()` rejects `/Vault not initialized/` (substring) — guards BR-B1-8.
- Green bars: `pnpm --filter @vida/web test` · `typecheck` 0 · `eslint` 0.

## Acceptance mapping (spec §4 Visual Gate)
1 (EC-4) → steps 6/8. 2 (EC-5) → steps 5/6 (empty CTA + error slot). 3 (matrix) → step 6 dark+responsive. 4 (a11y)
→ step 6 a11y notes. 5 (data-plane smoke) → steps 1-3 + step 9 N1 guard. 6 (gates) → step 9. 7 (§XXIX) → gate close.

## Preflight checklist — ✅ PASSED (2026-08-25)
- **P-1 ✅** `WorkerDbClient.driver` **is** an `SqliteDriver` `[FACT: client.ts:141]`; `createDrizzleProxy(driver)`
  (barrel `[FACT: core/index.ts:66]`) is the shared SQL→driver map → a main-thread `DrizzleDb` that RPCs each service
  `SELECT`/`INSERT` to the worker. The read/write path round-trips. Step 3 uses `createDrizzleProxy` directly.
- **P-2 ✅** `uuidv7()` barrel-exported from `@vida/core` `[FACT: index.ts:98 ← repository.ts:67]` — step 1 imports it.
- **P-3 ✅** `Button`/`Card`/`Tabs`+`TabsPanel` exported from `@vida/ui` `[FACT: ui/index.ts:20,24,25]`; view-switch = `Tabs` (APG roving).
- **P-4 ✅** `TerminalState` (4 literals) structurally assignable to `@vida/ui` `ViewState` — documented `[FACT: list-view.tsx header]`.
- **P-5 ✅** `useNavigate({ to:'/note/$id', params })` typechecks once `noteRoute` is registered (typed-router Register, step 8).

## Gate-2 (empirical critic, 2026-08-25) — REVISE → resolved
Independent critic RAN tsc probes against the real tree. Verdict REVISE:
- **BLOCKER** `PageRow` not flat-exported (barrel `export * as schema`, TS2305 reproduced) → **build-step 0** adds the
  flat re-export (the seam's ②-facing Row surface). Verified: barrel is namespace-only `[core/index.ts:62]`.
- **MATERIAL** `Tabs` panel-model vs external `switch` → step 6 now uses `<Tabs.Panel>` children controlled by the
  Zustand `view` (Tabs owns the a11y + dev-warns, BR-B1-10). Verified `Tabs` controlled API `[tabs.tsx:33-45,134]`.
- **3 NITs** (cite paths) folded. Critic CONFIRMED sound: the P-1 Drizzle-proxy seam (reads round-trip pre-vault, N9
  verified `repository.ts:250-254`), boot ordering, `initVault` idempotence, all view prop shapes, `createPage({type:'note'})`,
  the `/note/$id` enabling stub (blessed as AR-4-class infra, not B2 scope-creep), faithfulness + standards.
