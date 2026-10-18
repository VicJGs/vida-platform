# IMPLEMENTATION-PLAN — S3 · Backlinks panel

> fe-notes-and-pages (② unit #27) · slice S3 · LIF-191 · branch `fe-notes-and-pages` (Node 24).
> **Gate-2 artifact** (Approval-1 PLAN approved). Build strictly from §3 below; any divergence → §XXVIII.
> Every contract line is FACT-grounded (file:line cited). Pairs with `PLAN-s3-backlinks-panel.md`.

## 1. Grounding ledger (the FACTs this build stands on)
| Claim | Source |
|-------|--------|
| `getBacklinks(entityType, entityId) → {pageLinks: PageLinkRow[], entityLinks: EntityLinkRow[]}`, UNMERGED | seam-contract.md:16,56 · BR-S4-4 (`current-business-rules.md:49`) |
| `PageLinkRow = {id, source_page_id, target_page_id, context (nullable, [E]), deleted_at, created_at, updated_at, …sync}` | `schema/notes.ts:76-87,112` |
| `EntityLinkRow = {id, page_id, entity_type, entity_id, context (nullable, [E]), deleted_at, created_at, …sync}` | `schema/foundation/spaces.ts` (entityLinks), `:135` |
| both backlink sources are **pages** (pageLinks→`source_page_id`, entityLinks→`page_id`) | `backlink-resolver.ts:46` + schema |
| `baseColumns` has `created_at` (Unix ms) → recency sort is grounded | `schema/_shared.ts` baseColumns |
| `@vida/core` does NOT re-export the Row types → use structural `*Like` inputs (the `PageLike` precedent) | `index.ts` (absent) · `canvas-editor/page-binding.ts:16-18` |
| `PageType = journal\|note\|task_note\|task_group_note\|milestone_note\|deliverable_note` | `@vida/types` `note.ts:23-31` |
| `note-chrome` exports `Row, Eyebrow, Icon, IconTone, typeIcon, typeLabel` | `note-chrome.tsx:13-51` |
| `DashboardView` calls `renderBlock` only for `state:'success'` | `dashboard-view.tsx:160` |
| M1 has no live apps/web composition root (`getPage`/`listPages` throw) → honest-empty default | `use-note-entity.ts:5` (S1 D2 / S2) |
| EC-6 = grouped by **source module**; EC-1 = Notion standard | envision.md:33,142 · task header |

## 2. Contracts (exact signatures — build to these)

### 2a. `apps/web/src/notes/backlinks.ts` (pure — no React, no @vida/core, no note-chrome import)
```ts
import type { PageType } from '@vida/types'

// Structural projections of the ① Row types (the PageLike precedent) — getBacklinks' Row
// results are structurally assignable; the pure module stays decoupled from @vida/core.
export interface PageLinkLike { source_page_id: string; context: string | null; created_at: number }
export interface EntityLinkLike { page_id: string; context: string | null; created_at: number }

/** A resolved source page — the resolver's output. Live resolution rides the data plane (D-S3-1). */
export interface BacklinkSource { id: string; type: PageType | string; title: string }
export type ResolveSource = (sourceId: string) => BacklinkSource | null

export interface BacklinkItem {
  sourceId: string
  type: PageType | string
  title: string
  module: string              // derived via moduleForType
  count: number               // occurrences from this source (≥1) — no silent drop (B2)
  snippet: string | null      // first non-empty context; per-occurrence list deferred (R3)
  latest: number              // most-recent occurrence created_at (recency sort)
}
export interface BacklinkGroup { module: string; items: BacklinkItem[] }

// EC-6 / D-S3-2: source page type → owning module. Unknown → typeLabel fallback.
export const MODULE_FOR_TYPE: Record<PageType, string> = {
  note: 'Notes', journal: 'Journals',
  task_note: 'Tasks', task_group_note: 'Tasks',
  milestone_note: 'Projects', deliverable_note: 'Projects',
}
export function moduleForType(type: string): string {
  // All backlink sources are pages → type is always a PageType → the map is total; the
  // raw-string fallback is defensive only (keeps backlinks.ts dependency-free & pure — G1).
  return (MODULE_FOR_TYPE as Record<string, string>)[type] ?? type
}

/** Fold both ① lists → one item per SOURCE (dedup), occurrences counted (D-S3-3). Unresolved → omitted. */
export function mergeBacklinks(
  raw: { pageLinks: PageLinkLike[]; entityLinks: EntityLinkLike[] },
  resolve: ResolveSource,
): BacklinkItem[]

/** Group items by module; items recency-desc (latest), title tie-break; groups by module name asc. */
export function groupBySourceModule(items: BacklinkItem[]): BacklinkGroup[]
```
`mergeBacklinks` algorithm: accumulate per `sourceId` into `{count, snippet(first non-empty), latest(max created_at)}`
— pageLinks keyed by `source_page_id`, entityLinks by `page_id`; then `resolve(sourceId)` each — **null → omit** (the
honest-empty mechanism: without a resolved type/title the row can't be named or grouped; M1's empty resolver → all
omitted → empty panel; live deleted-source "Unknown" fallback = deferred, noted). O(n) two folds + one group sort (§9).

### 2b. `apps/web/src/notes/use-backlinks.ts` (data seam — stub-disciplined)
```ts
export type BacklinkState = 'loading' | 'error' | 'empty' | 'populated'
export interface BacklinksResult { groups: BacklinkGroup[]; count: number; state: BacklinkState }

/** M1 default = empty (no live composition root). ?sample (DEV) renders a populated panel for the gate.
 *  Live swap (zero-sig): useQuery(['links','backlinks',entityType,entityId], () => notes.getBacklinks(...))
 *    → mergeBacklinks(data, liveResolve) → groupBySourceModule; reject → state:'error'. */
export function useBacklinks(entityType: string, entityId: string): BacklinksResult
```
`devSampleActive()` = the `use-note-entity.ts:59` convention (NODE_ENV≠production + `?sample`). Sample fixture
(`entityId==='3'` → empty, for the empty-panel gate; else → **2 modules**: a `note` source linking twice [count=2]
+ a `milestone_note` source → groups `Notes` · `Projects`). `count` on the result = Σ item.count.

### 2c. `apps/web/src/notes/backlinks-panel.tsx` (presentational, split — the `NoteEntityView` precedent, G2)
```ts
// Thin wiring shell — calls the hook, delegates to the pure view.
export function BacklinksPanel({ entityType, entityId }: { entityType: string; entityId: string }): JSX.Element
// Pure presentational, state-as-prop — ALL 4 states unit-tested directly (no env/URL mock):
export function BacklinksView({ groups, state }: { groups: BacklinkGroup[]; state: BacklinkState }): JSX.Element
```
`BacklinksPanel` = `const { groups, state } = useBacklinks(entityType, entityId); return <BacklinksView groups={groups}
state={state} />` (mirrors `note-entity.tsx:88` `NoteEntity` → `NoteEntityView`). `BacklinksView` is body-only, one
ladder for both modes: `loading` → muted "Loading…" (`aria-busy`); `error` → muted "Couldn't load what links here."
(`role="status"`); `empty` → muted "Nothing links here yet."; `populated` → per module: `<Eyebrow>{module}` + a
`role="list" aria-label={module}` of items. Each item: `Row`(`Icon icon={typeIcon(it.type)}` + title `$body` +
`· {count} links` when `count>1`, muted) with the `snippet` on a muted `$small` line beneath when present. **No self
"Backlinks" title** (frame provides it). **No outer redundant `role=group`** (g2 N-corr-2). Rows **non-interactive**
(no link role — D-S3-4). Colors: direct semantic tokens (`$colorTextPrimary`/`$colorTextMuted`) — preset-inherited.
`typeIcon`/`Row`/`Eyebrow`/`Icon` from `note-chrome` (the `.tsx` may import it freely — only `backlinks.ts` stays pure).

### 2d. `apps/web/src/notes/note-overview.tsx` (edit)
- Delete `BacklinksSeam` (dead after wiring).
- `noteOverview` **merged**: `<Section title="Backlinks"><BacklinksPanel entityType={page.type} entityId={page.id} /></Section>`.
- `noteOverview` **tabbed**: `backlinks` block `state: 'empty' → 'success'`; `renderBlock` returns
  `<BacklinksPanel entityType={page.type} entityId={page.id} />` for `b.id==='backlinks'` (properties unchanged).
- `journalOverviewStub` **merged**: same swap (it has a Backlinks Section, `note-overview.tsx:97`). **Journal tabbed is
  left as S2 shipped it** (summary + properties only — no backlinks block; not in scope to add — §XXVIII if tempted).

## 3. Build steps (strict order; TDD per unit)
- [ ] **B1** — `backlinks.ts` (§2a) + `backlinks.test.ts` (the §6 pure cases). Run the file's tests green.
- [ ] **B2** — `use-backlinks.ts` (§2b) + the sample fixture. (hook unit — sample path tested via the panel in B3.)
- [ ] **B3** — `backlinks-panel.tsx` (§2c: `BacklinksView` pure + `BacklinksPanel` wiring) + `backlinks-panel.test.tsx`
  (drive `BacklinksView` directly with each of the 4 states + a11y roles + non-interactive + occurrence count).
- [ ] **B4** — edit `note-overview.tsx` (§2d); extend `note-overview`/`note-entity` tests if they assert the seam copy.
- [ ] **B5** — `tsc` 0 · `eslint` 0 · **full `@vida/web` suite** green (S2 lesson: full suite, not just slice files).
- [ ] **B6** — blocking **Visual Gate** (PLAN §7): Brave, `/notes/1?sample` (populated) + `/notes/3?sample` (empty),
  3 presets × L/D × {merged,tabbed} × 375/768/1440; EC-6 (≥2 groups, count shown), EC-22 (Lucide svg tinted),
  full-matrix AA incl. warm-dark, axe 0, 0 overflow, console clean, MEASURED_OK + composite-opacity.

## 4. Acceptance (Definition of Done — §XXII)
- [ ] `getBacklinks`' two lists merge → one row per source, grouped by source module, occurrence count surfaced (EC-6).
- [ ] Panel ships all 4 states (`loading`/`error`/`empty`/`populated` — §VIII); rows non-interactive (no dead nav).
- [ ] Both `noteOverview` modes + `journalOverviewStub` merged render the panel; `BacklinksSeam` removed; no dead code.
- [ ] TS strict: zero `any`, zero non-null assertions, zero suppressions. Pure core 100% unit-covered (§XIX).
- [ ] tsc 0 · eslint 0 · full `@vida/web` suite green.
- [ ] Visual Gate PASS (EC-6, EC-22, full-matrix AA, axe 0, 375/768/1440). 
- [ ] §XXIX currency: task-file slice-log + delivery slice-map stamped; FE notes-layer `current-*`/CLAUDE.md consistent
  with S1/S2 posture (owed at entity close / PR @ S9 — not introduced here unless S1/S2 already did).

## 5. Out of scope (no pull-forward — §XXVIII if tempted)
Live `getBacklinks` wiring / source resolver (data plane) · click-through nav · per-occurrence snippet lists ·
snippet decryption ([E]) · adding a backlinks block to journal *tabbed* · any `@vida/ui` change.
