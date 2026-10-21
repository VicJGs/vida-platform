# IMPL-PLAN — home-journal-go-live · S1

**Gate:** §XXVI g2 (IMPL-PLAN → Approval 2). Approved PLAN: `PLAN-S1.md` (Approval 1). Exact diffs below.

## A. `@vida/core` — `ensureJournal(date)` (mirror of `ensureEntityNote`, NP-8)

### A1. `packages/core/src/services/notes/types.ts` — interface
Add to `NotesService`, next to `getPageByJournalDate` (the S1 journal read):
```ts
  /** NP-8 idempotent get-or-create for a day's journal page (mirrors ensureEntityNote). Title = the YYYY-MM-DD
   *  date (non-empty, locale-free). The home/journal go-live's materialization seam. */
  ensureJournal(date: string): Promise<PageRow>
```

### A2. `packages/core/src/services/notes/service.ts` — impl
Insert in the returned object right after `ensureEntityNote` (the S2 ensure sibling, ~line 183). `service.` self-ref
is how `ensureEntityNote` already calls `createPage` (factory-object pattern — [[factory-service-no-this-for-intra-calls]]):
```ts
    // NP-8 idempotent: return the day's existing journal page, else create it. Mirrors ensureEntityNote.
    // Title = the date (deterministic, non-empty — accname-safe; locale-free keeps @vida/core Intl-free).
    ensureJournal: async (date: string): Promise<PageRow> => {
      const existing = await service.getPageByJournalDate(date)
      if (existing) return existing
      return service.createPage({ type: 'journal', journal_date: date, title: date })
    },
```
No race-catch — `createPage`'s in-service NP-2 pre-check (`service.ts:111`) is the backstop; single-user-local.

### A3. `packages/core/src/services/notes/__tests__/notes-service.test.ts` — test
Mirror the `ensureEntityNote` idempotency test (~line 211), in the same `describe`:
```ts
  it('ensureJournal is idempotent — 2nd call returns the same row (NP-8/NP-2)', async () => {
    const first = await h.svc.ensureJournal('2026-10-21')
    const second = await h.svc.ensureJournal('2026-10-21')
    expect(second.id).toBe(first.id)
    expect(first.type).toBe('journal')
    expect(first.journal_date).toBe('2026-10-21')
    expect(first.title).toBe('2026-10-21')
  })
  it('ensureJournal returns a pre-existing journal page for the date', async () => {
    const created = await h.svc.createPage({ type: 'journal', journal_date: '2026-10-22' })
    const ensured = await h.svc.ensureJournal('2026-10-22')
    expect(ensured.id).toBe(created.id)
  })
```

## B. `apps/web` — the thin hook + the live region

### B1. `apps/web/src/home/use-journal-entry.ts` (new)
```ts
// useJournalEntry — the Home journal-ENTRY data seam (home-journal-go-live S1).
// Today's journal page via NotesService.ensureJournal (NP-8 get-or-create, in-service).
// Reuses toNoteEntity + the notes NoteEntityData/state canon. DEV `?sample` seeds the Visual Gate.
import { useQuery } from '@tanstack/react-query'
import { getServices } from '../db/composition-root'
import { toNoteEntity } from '../notes/live-mappers'
import type { NoteEntityData, NoteEntityState } from '../notes/use-note-entity'

export interface JournalEntryResult { page: NoteEntityData | null; state: NoteEntityState }

/** Local calendar date YYYY-MM-DD — NOT toISOString() (UTC-day bug). Built from local fields. */
export function todayLocalYmd(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function devSampleActive(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('sample')
  )
}

function sampleJournal(date: string): NoteEntityData {
  return {
    id: 'journal-sample', type: 'journal', title: date,
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Today’s entry — start writing.' }] }] },
    favorite: false, archived: false, updated: 'just now', journalDate: date, icon: null, cover: null,
  }
}

export function useJournalEntry(): JournalEntryResult {
  const sample = devSampleActive()
  const date = todayLocalYmd()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['journal', date],
    queryFn: async () => toNoteEntity(await (await getServices()).notes.ensureJournal(date)),
    enabled: !sample,
  })
  if (sample) return { page: sampleJournal(date), state: 'success' }
  if (isError) return { page: null, state: 'error' }
  if (isLoading || !data) return { page: null, state: 'loading' } // ensureJournal always yields a page → no 'empty'
  return { page: data, state: 'success' }
}
```
> Export `NoteEntityState` from `use-note-entity.ts` if not already exported (it is — `export type NoteEntityState`).

### B2. `apps/web/src/home/journal-page-region.tsx` (edit)
- Import `useJournalEntry` + `NoteEditorBody` (`../notes/note-editor-body`). Drop `PageBody`/`InlineBlock`/`Prose`/`sampleDoc`.
- `editorState?` prop: keep as an **override** (Visual Gate / tests). Default = derive from `useJournalEntry()`.
- Body:
```tsx
export function JournalPageRegion({ editorState, 'aria-label': ariaLabel = 'Journal entry' }: JournalPageRegionProps) {
  const { page, state } = useJournalEntry()
  const effective = editorState ?? state
  return (
    <PageFrame role="region" aria-label={ariaLabel}>
      {effective === 'loading' && (<View aria-busy="true"><SkeletonRow width="80%" /><SkeletonRow width="95%" /><SkeletonRow width="60%" /></View>)}
      {effective === 'empty' && (<EmptyState title="Start today’s entry"><Text fontSize="$body" color="$colorTextMuted">Write your day, or type / to pull in a block from any module.</Text></EmptyState>)}
      {effective === 'error' && (<View role="status"><Text fontSize="$small" color="$colorTextMuted">Couldn’t load today’s page.</Text></View>)}
      {effective === 'success' && page && <NoteEditorBody page={page} />}
    </PageFrame>
  )
}
```
- The hook never yields `'empty'` (`ensureJournal` always returns a page), but the `editorState` override (`ViewState`,
  which includes `'empty'`) can — so **keep the `empty` arm + the `EmptyState` import** (no silent blank, review fix #1).

### B3. `apps/web/src/home/home-surface.tsx` — unchanged.

### B4. Tests
- `use-journal-entry.test.ts`:
  - **TZ proof (local ≠ UTC)** — the test file forces `process.env.TZ = 'America/Sao_Paulo'` (BRT, −03) before importing;
    with a fixed instant straddling UTC midnight `const d = new Date('2026-10-21T02:00:00Z')` assert
    `todayLocalYmd(d) === '2026-10-20'` **and** `d.toISOString().slice(0,10) === '2026-10-21'` — the UTC-day bug would
    return `'2026-10-21'`. (Date-code gate is TZ-blind — [[date-code-needs-tz-forced-tests]].)
  - `?sample` returns the sample journal; mock `getServices` → `ensureJournal` for the success/loading/error mapping.
- `journal-page-region.test.tsx`: `editorState` override drives loading/error/success(+empty) frames; success mounts the editor region.

## C. Order of operations
1. Edit `@vida/core` (A1–A3) → `pnpm --filter @vida/core build` (dist) → `pnpm --filter @vida/core test -- notes-service`.
2. Edit apps/web (B) → `pnpm --filter @vida/web typecheck` → targeted vitest.
3. Full `@vida/web` suite (sequential) + `@vida/core` notes.
4. **Visual Gate live in Brave** (real OPFS): `/` write→Saved→reload persists→reopen no spurious write; 3 presets × L/D.
5. §XXIX currency: `apps/web/src/home/CLAUDE.md` (journal region LIVE) + core notes current-* (`ensureJournal`).

## D. Acceptance (§XXVI.4)
- `ensureJournal` idempotent + NP-2-safe (core tests green). · Land on `/` → live editor on today's page · type → `Saved`
  → reload → persists · reopen → no spurious `updated_at` bump (mount-echo dedupe) · TZ-safe today · tsc/eslint 0 · axe 0.
