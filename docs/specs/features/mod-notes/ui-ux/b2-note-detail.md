<!-- Entity Delivery Flow · TRACK B (UI/UX Build Flow) · slice B2 · Notes & Pages.
     §XXVI unit spec (gate-1 = this SPEC → ░Doc Gate░). Grounded in delivery/{slice-map,seam-contract,envision,
     interpretation,baseline}.md + the 5 aspect docs + the shipped @vida/editor / @vida/ui / apps/web code cites below.
     No-Guessing: every claim is [FACT: path:line], [INTERP: from fact], or a flagged ⚠ boundary resolved at THIS gate
     — never an open decision left dangling into build. -->

# B2 — note detail + real editor + collapsible rail  (MOD-notes ② · slice B2)

## 0. Source model
Code-first interim per `docs/specs/foundation/frontend-source-of-truth.md` (community Figma file built later via the
Figma MCP scripter, NOT Tokens Studio; release-gated M4). No hi-fi mock is the source of truth — the **vision source**
is `delivery/envision.md` (the approved greybox checkpoints EC-6/EC-7/EC-11) + the shipped `@vida/editor` + `@vida/ui`
primitives. *(Throughout, `delivery/` = `docs/features/notes-and-pages/delivery/`; other cites are repo-root-relative.)*
No new design token is introduced by B2 (it composes UI-1/UI-2 + @vida/editor tokens only — §5).
`[FACT: frontend-source-of-truth.md; REPO.md:33]`

## 1. Context & scope
B2 is the **second ② slice**. It replaces the B1 **enabling stub** at `apps/web/src/app/note/index.tsx`
(`<h2>Note</h2>`) with the real **note-detail surface**: the `/note/$id` route reads its page, mounts the real
`@vida/editor` over `pages.content`, autosaves locally, and offers page-actions (favorite/archive/**confirm-gated
soft-delete**) in a **collapsible detail rail**. It reuses B1's data-plane wiring (`getNotesService()` singleton +
React-Query) — it stands up no new app infra. `[FACT: slice-map.md:31; seam-contract.md:38; app/note/index.tsx (B1 stub)]`

**In scope (EC-6, EC-7, EC-11 — envision.md:30-31,35):**
- **Route:** fill the existing `/note/$id` lazy route (`routes.tsx:70-74` already registers it) — read `$id` via
  `getRouteApi('/note/$id').useParams()` (the decoupled-lazy-component pattern; verified TanStack Router v1). `[FACT: routes.tsx:70-74; TanStack Router v1 getRouteApi]`
- **Read:** `useNote(id)` React-Query hook → `getNotesService().getPage(id)` (`Promise<PageRow | null>`); key `['pages', id]`. `[FACT: seam-contract.md:18; services/notes/types.ts:36]`
- **Real `@vida/editor` mount (EC-6):** `<VidaEditor>` over `pages.content`. The app owns the codec at the seam —
  `content` is a nullable `text()` column (**stringified** TipTap JSON, or `null`); `JSON.parse` → `defaultValue` (an
  `EditorDocument`), `onChange(doc)` → `JSON.stringify` → autosave (§2 BR-B2-3/4). `[FACT: schema/notes.ts:44 content text() (no .notNull); schema/notes.ts:24,54 app-stringifies convention; editor.tsx:25-39,145-151]`
- **Autosave locally (EC-6 success state):** debounced + dirty-checked; **writes succeed locally first (LF-2)** — no
  save button. `[FACT: business-rules.md:29 "editable document, autosaved locally (LF-2)"; business-rules.md:38; editor.tsx:145-151 BR-E1-2 dedupe]`
- **Header + editable title (vision-confirmed, NOT a decision):** the detail header = `← Back` · an **editable
  title** over `pages.title` · the page-`type` chip · the rail collapse toggle · the page-actions `⋯` menu. Title
  editing is intrinsic to the note-detail surface — the approved greybox renders it as the header heading, `updatePage`
  patches it (`contract.md:10-12`), and NP-7 names "survives **rename**". Patched via `updatePage(id, { title })` (§2
  BR-B2-6). `[FACT: envision-shots/r2/10-detail-editor.png (title in header + ⋯ menu + Collapse panel toggle); contract.md:10-12; business-rules.md NP-7 "survives rename"]`
- **Collapsible detail rail (EC-7):** a right panel the user opens/closes via the header toggle. **B2 builds the
  collapsible rail CONTAINER + a METADATA section** (created/updated, favorite/archived state). The greybox's LINK
  THIS NOTE / NOTE LINKS / ENTITY LINKS / BACKLINKS panels are **B3/B4** content that later fills this same rail — B2
  stands up the collapsible mechanism + metadata only. `[FACT: envision.md:31 EC-7; envision-shots/r2/{10-detail-editor,11-detail-collapsed}.png; slice-map.md:31,33 (link panels=B4)]`
- **Page-actions `⋯` menu in the header (`@vida/ui` `Menu`):** Favorite toggle → `updatePage({ is_favorite })`;
  Archive toggle → `updatePage({ is_archived })`; Delete → opens the confirm dialog. `[FACT: envision-shots/r2/10-detail-editor.png (⋯ menu, header); slice-map.md:31; schema/notes.ts:49-50; @vida/ui index.ts:26 Menu]`
- **Confirm-gated soft-delete (EC-11):** a `@vida/ui` `Dialog` with **`dismissible={false}`** (the documented
  destructive-confirm mode) → Confirm → `softDeletePage(id)` (fires the A8 cascade) → navigate to `/notes`. `[FACT: dialog.tsx:46-47 "set false for destructive-confirm"; seam-contract.md:31; slice-map.md:31; envision.md:35 EC-11]`
- **Read + degrade states — FIVE outcomes on TWO axes (business-rules.md:29 — the editor's enumerated tail):**
  the **read axis** (`deriveTerminalState` over the `useNote` query) = `loading` (content decrypting) · `error`
  (the query itself **rejected** — DB/decrypt failure) · `empty` (`getPage → null` = **not-found**, deleted/bad id) ·
  `success` (page read). Then **within `success`, the content axis**: `content` null/empty → blank editable page
  (or NP-8 seeded note); `content` present-but-corrupt (`JSON.parse`/`assertEditorDocument` fails) → **read-only +
  flag banner** (business-rules.md:29 "decrypt/parse fail → read-only + flag"). ⚠ These are DIFFERENT code paths:
  the derived `error` is a query reject; the corrupt banner is a post-read sub-state of `success` — see BR-B2-2/3.
  `[FACT: business-rules.md:29; services/notes/types.ts:36 getPage:Promise<PageRow|null>; service.ts:99-101 findById (null-not-throw); terminal-state.ts:50-58; NP-8]`

**Explicitly OUT (later slices — do NOT build):**
- **`[[` note-link picker** → **B3** (EC-3). B2 mounts the editor (which already recognizes `/` slash + registers the
  `[[`-capable surface), but the `@tiptap/suggestion` picker → `resolveWikiLink`/`createPageLink` binding is B3. `[FACT: slice-map.md:32; envision.md:27]`
- **Entity-link affordance + Links-out / Backlinks panels** → **B4** (EC-2). The rail in B2 carries actions +
  metadata only; the link panels are B4. `[FACT: slice-map.md:33]`
- **Neural note-graph edges / node fan-out** → **B5**. **Create-with-tags, favorite/archive/tag FILTER chrome,
  icon/cover metadata** → **B6** (EC-8/9) — B2 does the per-note favorite/archive **toggles** (actions), NOT the
  collection filters or icon/cover editing. **Journal `/summary` block** → **B7**. `[FACT: slice-map.md:34-36]`
- **Field `[E]` encryption** (M1.0 pass-through) → M3/DB-5; **FTS5** → DB-8; **saved-view selection** → MOD-spaces. `[FACT: slice-map.md:59; current-spec.md:62-63]`

**Pattern to mirror (read before authoring — same layer):**
- **Route component + data hook + singleton:** B1's `app/notes/{index,notes-collection,use-notes-list,notes-service}.tsx`
  — B2 reuses `getNotesService()` verbatim and adds `use-note.ts` hooks alongside `use-notes-list.ts`. `[FACT: app/notes/*]`
- **Editor mount contract:** `packages/editor/src/editor.tsx` — uncontrolled (`defaultValue` seeds once), `onChange`
  emits `EditorDocument`, `onChange` also fires ONCE on mount (benign echo — dedupe), imperative reset via the handle;
  **presentational, the app owns persistence (BR-E1-2).** `[FACT: editor.tsx:25-39,102-151; packages/editor/src/CLAUDE.md "Boundary"]`
- **Confirm dialog:** `@vida/ui` `Dialog` `dismissible={false}` + `footer` actions (the `export-dialog` composition
  precedent). `[FACT: dialog.tsx:35-49; ui CLAUDE.md ExportDialog]`
- **Terminal-state glue:** `state-conventions/terminal-state.ts` `deriveTerminalState(result, isEmpty)` — for a
  single-page read `isEmpty = (p) => p === null` maps a missing page to the not-found render. `[FACT: terminal-state.ts:50-58]`

## 2. Business rules (invariants B2 must hold)
> Inherits the CORE constitution + `standards/{components,design,engineering}.md`. Every rule complies.

- **BR-B2-1 · The route reads `$id` decoupled from the route config.** `getRouteApi('/note/$id').useParams()` inside
  the lazy component — NOT `import { noteRoute }` (which would pull the route config into the chunk, defeating the
  lazy split). `[FACT: routes.tsx:70-74 lazyRouteComponent; TanStack Router v1 getRouteApi (verified 2026-08-25)]`
- **BR-B2-2 · The READ AXIS is derived app-side; it has FOUR outcomes (corrupt-content is NOT one of them).**
  `deriveTerminalState(useNote(id), p => p === null)` gives `loading | error | empty | success`, where — verified —
  `getPage` = `pageRepo.findById` returns `null` for an absent page and only **throws** on a genuine DB/decrypt
  failure (`service.ts:99-101`). So: `loading` → a "loading note…" skeleton; **`error` (the query REJECTED)** → a
  "couldn't load this note" read-error surface with a retry; **`empty` (page is `null`)** → a **distinct not-found**
  surface ("This note doesn't exist or was deleted" + a link to `/notes`); `success` → the editor surface (whose own
  content sub-state is BR-B2-3). The corrupt-content banner is emphatically NOT rendered in the `error` branch (that
  branch never fires on corrupt content — the read succeeded). `[FACT: terminal-state.ts:50-58; service.ts:99-101 findById; services/notes/types.ts:36]`
- **BR-B2-3 · Within `success`, the app is the `content` ⇄ `EditorDocument` codec; a PARSE failure degrades that
  sub-state to read-only + flag (doc-mandated, post-read).** `page.content` is stringified JSON or `null`. After a
  successful read, `parseContent(page.content)` runs ONCE (BR-B2-4): `null`/empty → mount `<VidaEditor>` with no
  `defaultValue` (empty editable doc = the "new blank page"); a **non-null value that fails `JSON.parse`/
  `assertEditorDocument`** → `corrupt=true` → mount `<VidaEditor editable={false}>` + a visible **flag banner**
  (business-rules.md:29 "decrypt/parse fail → read-only + flag"). ⚠ **This is the ONE place a `try/catch` is
  doc-REQUIRED** — the editor-degrade contract (protect user content), NOT a fail-loud violation. It genuinely
  contrasts A7's `getSummaryConfig`, which `summaryConfigSchema.parse(JSON.parse(...))` with no catch = fail-loud
  throw. `[FACT: business-rules.md:29,38; editor.tsx:56-71 assertEditorDocument; current-spec.md:60; service.ts:304-306 (A7 fail-loud contrast)]`
- **BR-B2-4 · Autosave is local-first, debounced, dirty-checked, and SINGLE-WRITER — no save button, no editor
  re-seed (LF-2).** To avoid a title↔content write race, B2 uses **ONE debounced writer** that coalesces a pending
  patch `{ title?, content? }`: `onChange(doc)` sets `pending.content = JSON.stringify(doc)`; a title edit sets
  `pending.title`; one trailing debounce (≈600ms) flushes the accumulated patch via a single `updatePage(id, patch)`.
  Each field is dirty-checked against a `lastSaved` baseline BEFORE scheduling. ⚠ **The content baseline is the
  NORMALIZED serialization** (`serializeContent(seeded.doc ?? EMPTY_DOC)`), NOT the raw `page.content` column —
  `serializeContent(parseContent(raw)) ≠ raw` byte-for-byte (TipTap default-attr normalization + JSON re-stringify),
  so seeding from the raw column would make the mount echo (editor.tsx:145-151) compare "changed" and fire one
  spurious save per open. With the normalized baseline the mount echo is a true no-op. **The editor is seeded ONCE:**
  `parseContent` runs on the FIRST defined read only (memoized), and the
  detail **never re-seeds `<VidaEditor>` from a later refetch** (it is uncontrolled — editor.tsx:139). Consequently
  **autosave invalidates `['pages','list']` ONLY, never `['pages', id]`** — re-fetching the mounted note would churn
  the parse/refetch derivation against in-flight edits (the race the single-writer + no-`id`-invalidate together
  dissolve). Writes succeed locally first; on error a non-blocking Toast, never block editing; **no optimistic cache
  write** (BR-RT-4). `[FACT: business-rules.md:29,38; editor.tsx:139,145-151; state-conventions/CLAUDE.md BR-RT-4]`
- **BR-B2-5 · `updatePage` patches are `.strict()` — never send `type`/`journal_date` (IR-9 immutable identity).**
  All B2 writes (`content`, `title`, `is_favorite`, `is_archived`) go through `updatePage(id, patch)` whose schema is
  `.strict()` and excludes `type`/`journal_date`; sending an excluded key rejects. `[FACT: seam-contract.md:18; services/notes/types.ts:21,37; validators/note.ts updatePageSchema .strict()]`
- **BR-B2-6 · Title editing is part of the note-detail surface (vision-confirmed, not a decision).** An editable
  title over `pages.title` in the header, debounced-persisted via the single autosave writer's `{ title }` patch
  (BR-B2-4; title is plain text — codec-free). Empty title persists as `null` → displays "(untitled)" (the B1
  collection convention). No other ② slice claims title (B6 = favorite/archive/icon/cover + filters — slice-map.md:35);
  the greybox + `contract.md:10-12` + NP-7 home it here. `[FACT: schema/notes.ts:42 title text(); notes-collection.tsx:54 pageTitle; envision-shots/r2/10-detail-editor.png; contract.md:10-12]`
- **BR-B2-7 · The detail rail is collapsible ephemeral client UI state.** Open/closed is `useState` local to the
  route (not persisted, not React-Query) — a single note-detail's rail state has no cross-session meaning; the header
  toggle is keyboard-operable + `aria-expanded`; the greybox shows the collapsed state (11-detail-collapsed.png).
  `[FACT: envision.md:31 EC-7; envision-shots/r2/11-detail-collapsed.png; engineering.md §XVII local UI state = useState; structure-data.md:36 Zustand owns editor selection/focus — a per-route rail toggle is narrower still]`
- **BR-B2-8 · Soft-delete is confirm-gated, non-dismissible, and navigates away.** Delete (rail menu) opens a
  `Dialog dismissible={false}` (Esc/backdrop inert — the deliberate §XIV destructive-confirm deviation, DEF-U8-f) with
  Cancel + a **danger** Confirm; Confirm → `softDeletePage(id)` (A8 cascade: page_links/entity_links/entity_tags/
  attachments, page-last, eventually-consistent) → `router.navigate({ to: '/notes' })` → the list invalidates. Cancel
  closes, no write. `[FACT: dialog.tsx:46-47,191-196; seam-contract.md:31; slice-map.md:23 (A8 cascade); envision.md:35 EC-11]`
- **BR-B2-9 · Favorite/archive are discrete idempotent per-note toggles (actions, not filters).** `updatePage({
  is_favorite: !current })` / `{ is_archived: !current }` — discrete (not debounced). Consistent with BR-B2-4's
  no-`['pages',id]`-invalidate rule, the rail's favorite/archived + the title field render from **local UI state
  seeded once from the first read and updated from each mutation's returned `PageRow`** (the mutation resolves the
  fresh row; `updatePage` returns it — seam-contract.md:18); each settle invalidates `['pages','list']` so the
  collection reflects it. **State is conveyed by the menu item LABEL** ("Favorite" ⇄ "Unfavorite") — NOT `aria-pressed`
  (invalid on a `role=menuitem`; `@vida/ui MenuItem` exposes no `menuitemcheckbox`/`aria-checked`). The collection-level
  FILTER by favorite/archive is B6. `[FACT: schema/notes.ts:49-50 boolInt; menu.tsx:35-46 MenuItem (no aria-pressed); seam-contract.md:18 updatePage→PageRow; slice-map.md:35 (filters=B6)]`
- **BR-B2-10 · Full visual-state + a11y + responsive coverage (standards §VIII/§XIV/§X).** All read states × light/dark
  × 375/768/1440; the editor textbox has an accessible name (`aria-label="Note body"` — BR-6/§XIV); title field
  labeled; rail toggle `aria-expanded` + reachable; the confirm dialog traps focus + returns it (Dialog contract);
  favorite/archive convey state via their menu-item label (not `aria-pressed` — invalid on `role=menuitem`, BR-B2-9);
  focus-visible rings throughout. On 375 the rail collapses by default (space). `[FACT: components.md §VIII; engineering.md §XIV; design.md §X; editor.tsx:86-92 aria-name guard; dialog.tsx focus trap]`

## 3. Contract (the B2 surface)
```ts
// apps/web/src/app/note/index.tsx — the route component (default export, lazy-mounted; replaces the B1 <h2> stub)
export default function NoteDetailRoute(): JSX.Element   // getRouteApi('/note/$id').useParams() → id → <NoteDetail id/>

// apps/web/src/app/note/note-detail.tsx — the screen (named + default)
export function NoteDetail(props: { id: string }): JSX.Element   // read → 5-state switch → editor + title + rail

// apps/web/src/app/note/use-note.ts — the per-note hooks (alongside use-notes-list.ts)
export function useNote(id: string): UseQueryResult<PageRow | null>        // key ['pages', id] → getPage(id); read-once seed (BR-B2-4)
export function useUpdateNote(id: string): UseMutationResult<PageRow, Error, UpdatePageInput>  // updatePage; invalidate ['pages','list'] ONLY (never ['pages',id] — BR-B2-4 no re-seed); returns fresh PageRow for local rail state
export function useDeleteNote(id: string): UseMutationResult<void, Error, void>                // softDeletePage; invalidate ['pages','list']

// apps/web/src/app/note/note-content-codec.ts — the content ⇄ EditorDocument boundary (pure, unit-tested)
export function parseContent(raw: string | null): { doc: EditorDocument | undefined; corrupt: boolean }
export function serializeContent(doc: EditorDocument): string
```
- `NoteDetail` derives the read state; in `success` it composes: a **header** (`← Back` · editable title · type chip ·
  rail collapse toggle · page-actions `⋯` `<Menu>` [favorite/archive/delete]), the `<VidaEditor defaultValue onChange
  aria-label="Note body" editable={!corrupt}>`, and the **collapsible rail** (a METADATA section in B2; link/backlink
  panels are B3/B4). The single autosave writer coalesces `onChange`(content) + title into one debounced `updatePage`.
- The confirm-delete `Dialog` is controlled by a local `useState` boolean; Confirm calls `useDeleteNote`.

## 4. Acceptance — ░Visual Gate░ (blocking, per slice-map.md:38)
Real browser (chrome-devtools / Brave), **no batching, no owed gate**:
1. **EC-6 MUST:** `/note/$id` mounts the real `@vida/editor`; typing edits the doc; `/` opens the slash menu; an
   NP-8-style seeded note renders non-blank; a fresh (null-content) note renders an empty editable page with placeholder.
2. **EC-7 MUST:** the detail rail opens/closes via a keyboard-operable toggle (`aria-expanded`); collapsed by default at 375.
3. **EC-11 MUST:** Delete opens a **non-dismissible** confirm dialog; Confirm soft-deletes + navigates to `/notes`
   (the note is gone from the list); Cancel is a no-op. (EC-11 is a *feel* row — reversible-feeling; assessed live.)
4. **Autosave (EC-6 success):** an edit persists locally (round-trips after reload) without a save button; no write on
   mount (dedupe); a title edit persists; a title write mid-content-edit does NOT clobber the editor (single-writer +
   no `['pages',id]` re-seed, BR-B2-4).
5. **Five outcomes on two axes, each distinct** — READ axis: `loading` skeleton · `error` (query reject → "couldn't
   load, retry") · `empty` (null page → **not-found** surface + link to /notes) · `success`; and within `success` the
   CONTENT axis: blank-editable (null/empty content) vs **corrupt → read-only + flag banner** (not a crash). Each ×
   {light | dark} × {375 · 768 · 1440}; screenshots as evidence.
6. **§XIV a11y sweep:** keyboard-only walk (title → editor → rail toggle → menu → dialog), editor textbox named,
   dialog focus-trap + restore, favorite/archive state in the menu-item label (not `aria-pressed`), contrast AA. VoiceOver trace of the delete flow.
7. **Gates:** `pnpm --filter @vida/web test` green · root `typecheck` 0 · `eslint` 0 · `/component-audit` +
   `victor:quality-gate-components` + `victor:quality-gate-engineering` PASS.
8. **§XXIX currency:** refresh `notes-and-pages/current-spec.md` (add the ② B2 surface) at gate close; commit WITH the code.

## 5. Implementation prompt (built after Approval 1 → IMPLEMENTATION-PLAN g2)
1. `apps/web/src/app/note/note-content-codec.ts` — `parseContent`/`serializeContent` (pure; `parseContent` catches +
   flags corrupt, validates via the editor's `assertEditorDocument` shape). Unit-tested first (the codec is the risk).
2. `apps/web/src/app/note/use-note.ts` — `useNote` / `useUpdateNote` / `useDeleteNote` (React-Query over
   `getNotesService()`; invalidate keys per BR-B2-4/8).
3. `apps/web/src/app/note/note-detail.tsx` — the screen: read → 4-outcome read switch → success = header (Back +
   editable title + type chip + collapse toggle + page-actions `⋯` `<Menu>` favorite/archive/delete) + `<VidaEditor>`
   (seeded once) + single-writer debounced autosave + collapsible rail (METADATA section) + confirm `Dialog`. TS types
   first → default (success) → all read/content states → dark → responsive (375 rail-collapsed → 768 → 1440).
4. `apps/web/src/app/note/index.tsx` — replace the `<h2>` stub with `getRouteApi('/note/$id').useParams()` →
   `<NoteDetail id={id} />` (default export retained).
5. Tests (`*.test.tsx` / `*.test.ts`): codec round-trip + corrupt-degrade; each read state render; autosave
   debounce/dedupe (no mount write); title persist; favorite/archive toggle; delete-confirm flow (non-dismissible +
   navigate); rail toggle a11y.

## 6. Decisions — none open (all doc/vision-fixed at this Doc Gate)
- **Title editing was WRONGLY surfaced as a decision (2026-08-25) — Victor drift-catch; re-grounded.** It is not an
  open choice: the approved greybox renders the editable title in the header, `contract.md:10-12` patches it, NP-7
  names "survives rename", and no ② slice defers it (B6 = favorite/archive/icon/cover + filters). Title editing is in
  B2 as a FACT (BR-B2-6). Same class as [[dont-frame-a-doc-resolved-handling-as-a-decision-nor-over-correct]] /
  [[decide-dont-ask-when-docs-give-the-answer]].
- **Doc/vision-FIXED (NOT decisions) — grounded above, do not reopen:** autosave-local-no-save-button
  (business-rules.md:29 LF-2, BR-B2-4) · the read/content state axes incl. parse-fail→read-only+flag
  (business-rules.md:29, BR-B2-2/3) · confirm-gated non-dismissible delete (dialog.tsx:46-47, BR-B2-8) · `.strict()`
  no type/journal_date (IR-9, BR-B2-5) · `getRouteApi` decoupled param read (verified, BR-B2-1) · favorite/archive =
  per-note toggles not filters (slice-map.md:35, BR-B2-9) · header holds title/type-chip/collapse-toggle/`⋯`-menu;
  rail holds metadata now + link/backlink panels later (greybox 10/11; BR-B2-6/7). The `[[` picker (B3), link/backlink
  panels (B4), neural edges (B5), tags/filters/icon/cover (B6), `/summary` (B7), and **Export** (not in the B2
  slice-map) are OUT (§1).
- **M1.0 content-write model (NP-4/Yjs deferred — noted, not reopened):** B2 persists `pages.content` via
  `updatePage({ content })` as a **TipTap-JSON snapshot** (the M1.0 model — `@vida/editor` renders locally without a
  Y.Doc; the content source is swappable, BR-2). NP-4 ("content goes through the Yjs doc, not LWW") is the **M4**
  authority inversion — the editor shell keeps it a no-rewrite swap. B2 does not wire Yjs. `[FACT: packages/editor/src/CLAUDE.md "Deferred"/"Boundary" (Yjs=deferred seam, no dep); conventions.md:26 NP-4 (M4); ADR-003]`
- **Out-of-scope housekeeping (NOT a B2 change):** two 0-byte file-based-routing residues exist and are inert under
  code-based routing (`apps/web/src/app/notes/[id].tsx` + `apps/web/src/app/class-notes/[id].tsx`); unrelated to
  EC-6/7/11 — B2 leaves both; filed as a standalone cleanup. `[FACT: both = 0 lines; routes.tsx code-based]`
