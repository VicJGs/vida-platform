<!-- Entity Delivery Flow · TRACK B · slice B2 · IMPLEMENTATION-PLAN (gate-2 artifact = the build steps).
     Split-form of §XXVI: the SPEC (b2-note-detail.md) cleared Approval 1; THIS is the exhaustive, self-sufficient
     build prompt victor:execute-plan-code works step-by-step. Every claim [FACT: path:line] — No-Guessing.
     Approval 2 gates this (after /preflight + /critique). -->

# IMPLEMENTATION-PLAN — B2 note detail + real editor + collapsible rail  (MOD-notes ② · B2)

**Spec:** `docs/specs/features/mod-notes/ui-ux/b2-note-detail.md` (Approval 1 ✅). **Branch:** `mod-notes-rebuild`.
**Env:** web/vite under Node 24 (project canonical 22; Node 20 crashes jsdom 30 — task-file env note).

## Grounding ledger (verified this gate — the facts the steps rely on)
- `apps/web` deps: `@vida/core`/`@vida/ui`/`@tanstack/react-query`/`zustand` present; **`@vida/editor` is NOT** →
  **Step 0 adds it**. `[FACT: apps/web/package.json:18,20,22,29 (no @vida/editor)]`
- `VidaEditor` surface: `<VidaEditor defaultValue?:EditorDocument onChange?:(doc)=>void editable?=true toolbar?=true
  placeholder? aria-label|aria-labelledby>`; UNCONTROLLED (`defaultValue` seeds once), `onChange` fires once on mount
  (benign echo), presentational (app owns persistence). `[FACT: editor.tsx:25-39,94-151; editor.tsx index.ts:6]`
- Service seam: `getPage(id):Promise<PageRow|null>` (findById, null-not-throw) · `updatePage(id,patch):Promise<PageRow>`
  (`updatePageSchema.strict()`; patchable = title/content/is_favorite/is_archived/icon/cover_image/summary_config —
  NO type/journal_date, IR-9) · `softDeletePage(id):Promise<void>` (A8 cascade). `[FACT: services/notes/types.ts:36-38; validators/note.ts:49-62; service.ts:99-101]`
- `PageRow` cols: `id, created_at, updated_at, type, title, content, is_favorite, is_archived, icon, cover_image,
  word_count, …`. `[FACT: schema/notes.ts:30-58; baseColumns]`
- `content` is nullable `text()` (stringified TipTap JSON or null). `[FACT: schema/notes.ts:44]`
- `@vida/ui`: `Menu{trigger,items:MenuItem[],aria-label}` · `MenuItem{id,label,onSelect,disabled,intent:'default'|
  'danger',leading}` · `Dialog{open,onOpenChange,title,description?,footer?,size?,dismissible?}` · `Button{intent:
  'primary'|'secondary'|'ghost'|'danger',size,loading}` · `Input` · `toast({title,description?,intent})`. `[FACT: menu.tsx:35-66; dialog.tsx:35-49; button.tsx:15,131-140; toast.tsx:133; ui index.ts:26-38]`
- App boot already wires `ensureDbReady→ensureDeviceId→initVault` + `QueryClientProvider`/`RouterProvider`/
  `ToastProvider`/`UIProvider` (B1). **No App.tsx change in B2.** `[FACT: App.tsx:5-9,33-35,68-77]`
- Route `/note/$id` already registered (lazy). Param via `getRouteApi('/note/$id').useParams()` (verified TanStack v1). `[FACT: routes.tsx:70-74; TanStack Router v1 getRouteApi]`
- B1 hook/singleton pattern to mirror: `use-notes-list.ts` (useQuery + invalidate), `notes-service.ts` (`getNotesService()`). `[FACT: apps/web/src/app/notes/{use-notes-list,notes-service}.ts]`

## Build steps (in order — `## Build Steps` mirror)

### Step 0 · add the editor dependency
- `apps/web/package.json` — add `"@vida/editor": "workspace:*"` to `dependencies` (alongside `@vida/ui`). Run
  `pnpm install`. Verify `import { VidaEditor } from '@vida/editor'` resolves + the dist barrel imports clean (the
  [[first-runtime-consumer-surfaces-latent-barrel-defects]] check — apps/web becomes the first APP consumer of the
  editor barrel; @vida/ui already proved it once). `[FACT: apps/web/package.json:22; editor index.ts:6]`

### Step 1 · `apps/web/src/app/note/note-content-codec.ts` (pure; unit-tested FIRST — the risk surface)
```ts
import { assertEditorDocument, type EditorDocument } from '@vida/editor'

/** Parse pages.content (stringified TipTap JSON, or null) → an EditorDocument for VidaEditor.defaultValue.
 *  null/'' → { doc: undefined, corrupt: false } (blank editable page).
 *  present-but-unparseable / wrong-shape → { doc: undefined, corrupt: true } (read-only + flag, BR-B2-3). */
export function parseContent(raw: string | null): { doc: EditorDocument | undefined; corrupt: boolean } {
  if (raw == null || raw === '') return { doc: undefined, corrupt: false }
  try {
    return { doc: assertEditorDocument(JSON.parse(raw)), corrupt: false }  // reuses the editor's runtime shape gate
  } catch {
    return { doc: undefined, corrupt: true }                              // the ONE doc-mandated catch (BR-B2-3)
  }
}

/** EditorDocument → the stringified column value for updatePage({ content }). */
export function serializeContent(doc: EditorDocument): string { return JSON.stringify(doc) }
```
- ⚠ This is the ONLY `try/catch` in B2 (the editor-degrade contract, business-rules.md:29 — NOT a fail-loud
  violation; contrast A7 `getSummaryConfig` fail-loud). `assertEditorDocument` is the SAME gate the editor uses on
  `getJSON()`, so parse+shape are validated with one reused function. `[FACT: editor.tsx:56-71; business-rules.md:29,38]`

### Step 2 · `apps/web/src/app/note/use-note.ts` (React-Query over `getNotesService()`, mirrors use-notes-list.ts)
```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PageRow } from '@vida/core'
import type { UpdatePageInput } from '@vida/core'   // if not flat-exported → add to core barrel (see Step 2a)
import { getNotesService } from '../notes/notes-service'

const NOTES_LIST_KEY = ['pages', 'list'] as const
const noteKey = (id: string) => ['pages', id] as const

/** One page — read ONCE-seed source (BR-B2-4: the editor is not re-seeded from refetch). */
export function useNote(id: string) {
  return useQuery({ queryKey: noteKey(id), queryFn: (): Promise<PageRow | null> => getNotesService().getPage(id) })
}

/** Patch a page. Invalidate ['pages','list'] ONLY (never ['pages',id] — no editor re-seed, BR-B2-4). */
export function useUpdateNote(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: UpdatePageInput): Promise<PageRow> => getNotesService().updatePage(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTES_LIST_KEY }),
  })
}

/** Soft-delete (A8 cascade). Invalidate the list; the route navigates away. */
export function useDeleteNote(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (): Promise<void> => getNotesService().softDeletePage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTES_LIST_KEY }),
  })
}
```
- **`UpdatePageInput` + `PageRow` are ALREADY flat-exported (gate-2 verified — no barrel edit needed):**
  `core/src/index.ts:65` flat-exports `PageRow`; `:140 export * from './services/notes'` → `services/notes/index.ts`
  `export * from './types'` → `types.ts:21 export type UpdatePageInput`. Both `import { PageRow, UpdatePageInput }
  from '@vida/core'` resolve. `[FACT: core/src/index.ts:65,140; services/notes/index.ts; types.ts:21 (gate-2 empirical)]`
- No optimistic writes (BR-RT-4). `[FACT: state-conventions/CLAUDE.md BR-RT-4]`

### Step 3 · `apps/web/src/app/note/note-detail.tsx` (the screen — named + default export)
Structure (types first → success default → all states → dark → responsive):
1. **Read + derive:** `const q = useNote(id); const state = deriveTerminalState(q, (p) => p === null)`.
2. **4-outcome read switch** (BR-B2-2): `loading` → skeleton ("Loading note…"); `error` → a `role="status"`
   "Couldn't load this note" + retry (`q.refetch`); `empty` (null) → a **not-found** surface ("This note doesn't
   exist or was deleted" + a `Link to="/notes"`); `success` → `<NoteDetailLoaded page={q.data!} id={id} />`.
3. **`NoteDetailLoaded`** (success child so hooks run only with a real page):
   - **Seed once:** `const seeded = useMemo(() => parseContent(page.content), [])` — `[]` deps = mount-once (verified:
     no `react-hooks/exhaustive-deps` in eslint.config.js, so no lint noise; `page` is stable within the success child);
     the editor is NEVER re-seeded from a refetch (BR-B2-4). `corrupt = seeded.corrupt`.
   - **Local UI state** (seeded from the first `page`, updated from mutation rows — BR-B2-9): `title`, `isFavorite`,
     `isArchived`; `railOpen` (`useState`, default `true` desktop / `false` at 375 via `useMedia`).
   - **Single autosave writer** (BR-B2-4) — the mount-echo MUST be a genuine no-op, so the baseline is the
     **normalized** serialization, not the raw column:
     ```ts
     const pendingRef = useRef<{ title?: string | null; content?: string }>({})
     // ⚠ Baseline from the NORMALIZED doc — serializeContent(parseContent(raw)) ≠ raw byte-for-byte
     //   (TipTap default-attr normalization + JSON re-stringify). Seeding from page.content would make the
     //   mount echo compare "changed" → one spurious save per open (gate-2 MATERIAL-2).
     const lastSavedRef = useRef<{ title: string | null; content: string }>({
       title: page.title ?? null,
       content: serializeContent(seeded.doc ?? EMPTY_DOC),   // EMPTY_DOC = { type:'doc', content:[] }
     })
     const scheduleFlush = () => { /* clearTimeout + setTimeout(≈600ms) → flush() */ }
     const flush = () => {
       const patch = pendingRef.current; pendingRef.current = {}
       if (patch.title === undefined && patch.content === undefined) return
       update.mutate(patch, {
         onError: () => toast({ title: "Couldn't save — retrying locally", intent: 'danger' }),
       })
       if (patch.title !== undefined) lastSavedRef.current.title = patch.title
       if (patch.content !== undefined) lastSavedRef.current.content = patch.content
     }
     // handlers dirty-check vs lastSavedRef BEFORE staging into pendingRef.current, then scheduleFlush()
     ```
     Flush on unmount (clear timer + a final flush if `pendingRef.current` is dirty). All mutation access is via
     `pendingRef.current`/`lastSavedRef.current` (refs — no stale closure).
   - **Header:** `← Back` (`Link to="/notes"`) · editable title (`<Input aria-label="Note title" value={title}
     onChangeText>` → set local + `pending.title` + schedule) · a `type` chip (Text) · a rail collapse toggle
     (`<Button intent="ghost" aria-expanded={railOpen} aria-controls={railId}>` "Collapse panel"/"Show panel") ·
     page-actions `<Menu trigger={<Button intent="ghost" aria-label="Note actions">⋯</Button>} aria-label="Note
     actions" items={[favorite,archive,delete]}>` where favorite/archive are `MenuItem`s whose **`label` reflects the
     current state** ("Favorite" ⇄ "Unfavorite", "Archive" ⇄ "Unarchive" — NOT `aria-pressed`, which is invalid on a
     `role=menuitem`; `@vida/ui MenuItem` exposes no checkbox role), `onSelect` → `update.mutate({is_favorite:
     !isFavorite})` (discrete) + set local from the returned row; delete `intent:'danger'` `onSelect` → open the
     confirm dialog. `[FACT: menu.tsx:35-46 MenuItem (no aria-pressed/checked); label reflects state]`
   - **Body:** `<VidaEditor defaultValue={seeded.doc} editable={!corrupt} aria-label="Note body" placeholder="Type
     '/' for a block…" onChange={(doc) => { pending.content = serializeContent(doc); schedule() }} />`; when
     `corrupt`, render a flag banner ABOVE it (`role="status"` "This note's content couldn't be read; showing it
     read-only").
   - **Rail:** an `<aside id={railId}>` shown when `railOpen`; B2 content = a **METADATA** section (created/updated
     formatted with **native `Intl.DateTimeFormat`/`new Date(ms)`** — the B1 precedent, NO new dep; `date-fns` is not
     an `apps/web` dep, only `@vida/ui`'s), favorite/archived state, word_count. (Link/backlink panels = B3/B4.)
     `[FACT: apps/web/package.json (no date-fns); notes-collection.tsx:136 new Date(created_at)]`
   - **Confirm `Dialog`** (BR-B2-8): `<Dialog open={confirmOpen} onOpenChange={setConfirmOpen} dismissible={false}
     title="Delete note?" description="This moves the note and its links to trash." footer={<><Button
     intent="secondary" onPress={()=>setConfirmOpen(false)}>Cancel</Button><Button intent="danger"
     loading={del.isPending} onPress={onConfirmDelete}>Delete</Button></>}>…</Dialog>`; `onConfirmDelete` →
     `del.mutate()` `onSuccess` → `navigate({ to: '/notes' })`.
- Tokens only (no hardcoded hex/spacing — §IV/§X); `render:'h1'`/`'header'`/`'aside'` for landmarks (the app-shell
  `render:'<tag>'` precedent — a runtime `tag` prop is not honoured). `[FACT: app-shell.tsx:31-35; notes-collection.tsx:47-50]`

### Step 4 · `apps/web/src/app/note/index.tsx` (replace the B1 stub)
```tsx
import { getRouteApi } from '@tanstack/react-router'
import { NoteDetail } from './note-detail'
const route = getRouteApi('/note/$id')
export default function NoteDetailRoute(): React.ReactElement {
  const { id } = route.useParams()
  return <NoteDetail id={id} />
}
```
`[FACT: routes.tsx:70-74; TanStack Router v1 getRouteApi (decoupled — does not pull route config into the chunk)]`

### Step 5 · Tests (`apps/web/src/app/note/*.test.{ts,tsx}`)
- `note-content-codec.test.ts` — null/'' → blank; valid JSON round-trips; malformed JSON → `corrupt:true`; wrong-shape
  (`assertEditorDocument` throws) → `corrupt:true`; `serializeContent∘parseContent` round-trip.
- `note-detail.test.tsx` — each read outcome renders distinctly (loading/error/not-found/success); **autosave**: an
  edit schedules ONE `updatePage` after debounce, NO write on mount (dedupe), title+content coalesce into one patch,
  a title write does not re-seed the editor; favorite/archive toggle calls `updatePage` + reflects locally; delete
  flow (non-dismissible dialog → Confirm → `softDeletePage` + navigate); rail toggle `aria-expanded`. Use fake timers
  for debounce; `waitFor(.ProseMirror)` before asserting editor `onChange` (editor.tsx:143 immediatelyRender:false).
- Mock `getNotesService()` (per B1's test approach) — do not hit the real worker in jsdom.

## Deviations anticipated (→ §XXVIII if they occur)
- If `<Input>` can't render borderless-as-heading cleanly → a styled editable element; a Visual-Gate refinement, spec §3 unchanged.
- (No barrel edit expected — `UpdatePageInput`/`PageRow` are already flat-exported, gate-2 verified.)

## Acceptance = the spec §4 ░Visual Gate░
All of b2-note-detail.md §4 (EC-6/7/11 MUSTs · 5 outcomes × light/dark × 375/768/1440 · §XIV a11y · autosave/no-mount-write ·
`pnpm --filter @vida/web test` green · root typecheck 0 · eslint 0 · `/component-audit` + quality-gate-components +
-engineering PASS · §XXIX currency refresh). No batching, no owed gate.
