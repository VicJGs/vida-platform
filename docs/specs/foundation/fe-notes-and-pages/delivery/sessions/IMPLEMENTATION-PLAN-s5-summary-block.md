# IMPLEMENTATION-PLAN — S5 · `/summary` block + per-section degrade

> fe-notes-and-pages (② unit #27) · slice S5 · LIF-191 · branch `fe-notes-and-pages` (Node 24).
> **Gate-2 artifact** (Approval-1 PLAN approved). Build strictly from §3; divergence → §XXVIII. Every contract line
> FACT-grounded. Pairs with `PLAN-s5-summary-block.md`.

## 1. Grounding ledger

| Claim                                                                                                                                                     | Source                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `buildDashboard(date, selection?) → DashboardData {summary: SectionData[], agenda: SectionData[]}`, engine-side per-section try/catch → `{state:'error'}` | journals current-spec.md; types.ts DashboardData |
| `SectionData = { sectionKey: HomeSectionKey; module: string; dataPoints: readonly DataPoint[]; state: TerminalState; items?: readonly unknown[] }`        | journals types.ts:43-50                          |
| `DataPoint = { id: string; label: string }` (renderable); `items` = opaque `unknown[]`                                                                    | journals types.ts:25-28,48                       |
| `TerminalState = 'loading'\|'empty'\|'error'\|'success'`                                                                                                  | foundation/capability/types.ts:13                |
| types barrel-exported from `@vida/core` (`export * from './services/journals'`); apps/web deps `@vida/core`                                               | core/index.ts:172; apps/web/package.json:20      |
| UI render + per-section degrade = P6 (fe-notes); engine = journals; config storage = ①                                                                    | NOT-32/34                                        |
| inline editor `/summary` node = ui-3 (E5 placeholder, real body → #31)                                                                                    | NOT-52; integration-blocks.tsx; editor CLAUDE.md |
| the journal shows `/summary`; S2 left a `SummarySeam` in `journalOverviewStub`                                                                            | EC-15/EC-18a; note-overview.tsx (S2)             |
| `pages.journal_date` (YYYY-MM-DD, journal only) is a real column                                                                                          | schema/notes.ts; NOT-05                          |
| M1 no live composition root → honest-empty + `?sample`                                                                                                    | use-note-entity.ts:5 (S1-D2)                     |

## 2. Contracts (exact signatures)

### 2a. `apps/web/src/notes/use-note-entity.ts` (edit — extend the projection, D-S5-9)

`NoteEntityData` gains **`journalDate: string | null`** (maps `pages.journal_date`; non-journal pages → `null`). The
`/summary` date comes from here. `sampleFor`: the journal sample (`id==='2'`) sets a fixed `journalDate` (e.g.
`'2026-10-11'`); all others → `null`. (Minimal, grounded — `journal_date` is a real column; live `getPage` already
returns it.)

### 2b. `apps/web/src/notes/use-journal-summary.ts` (data seam — stub-disciplined)

```ts
import type { SectionData } from '@vida/core' // type-only (erased)

export type SummaryState = 'loading' | 'error' | 'empty' | 'populated'
export interface JournalSummaryResult {
  sections: readonly SectionData[]
  state: SummaryState
}

export function useJournalSummary(date: string | null): JournalSummaryResult
```

- M1 default: `{ sections: [], state: 'empty' }` (no live composition root). `?sample` (DEV) → a **mixed-state**
  `SectionData[]` (R1): a `success` section with dataPoints, an `empty` section, and an `error` section — so EC-9's
  "degrade that section only" is visible. `date` is `_`-prefixed in the stub (unused; the live swap reads it).
- Live swap (zero-sig): `const d = await journals.buildDashboard(date, selection); return { sections: d.summary, state:
d.summary.length ? 'populated' : 'empty' }`; reject → `'error'`; in-flight → `'loading'`. RQ key
  `['journal','summary',date]` (prefix-safe under `['journal']`).

### 2c. `apps/web/src/notes/summary-block.tsx` (presentational split — the BacklinksView precedent)

```ts
export function SummaryView({ sections, state }: { sections: readonly SectionData[]; state: SummaryState }): JSX.Element
export function SummaryBlock({ date }: { date: string | null }): JSX.Element
```

`SummaryBlock` = `const { sections, state } = useJournalSummary(date); return <SummaryView sections={sections} state={state} />`.
`SummaryView` body-only (the overview Section/Card supplies the "Summary" label); block ladder: `loading` → muted
"Loading…" (`aria-busy`); `error` → muted "Couldn’t load your summary." (`role=status`); `empty` → muted "Your daily
summary appears here once sources are connected."; `populated` → one `SummarySection` per `SectionData`.
`SummarySection({ section })`: a `Row`(Icon `moduleIcon(section.module)` + `moduleLabel(section.module)` `$body`) header,
then by `section.state`: **success** → a `role="list"` of `dataPoints[].label` (`role=listitem`); **empty** → muted
"No `<label>` today."; **error** → muted `role="status"` "Couldn’t load `<label>`."; **loading** → muted `aria-busy`.
Local helpers: `moduleLabel(m)` = capitalize; `moduleIcon(m)` = a small `MODULE_ICON` map (habits/tasks/routines/
learning/finance/relationships/checkins/purpose/gamification/pomodoro → Lucide) + a generic fallback (`CircleDot`).
Direct semantic tokens; `note-chrome` `Row`/`Eyebrow`/`Icon`. (EC-22)

### 2d. `apps/web/src/notes/note-overview.tsx` (edit)

- Delete `SummarySeam` (dead after wiring).
- `journalOverviewStub` **merged**: `<Section title="Summary"><SummaryBlock date={page.journalDate} /></Section>`.
- `journalOverviewStub` **tabbed**: flip the `summary` block `state: 'empty' → 'success'` (D-S5-8) + `renderBlock`
  returns `<SummaryBlock date={page.journalDate} />` for `b.id==='summary'` (properties unchanged).
- The **note** overview is untouched (no Summary section — Properties/Attachments/Backlinks only).

## 3. Build steps (strict order; TDD per unit)

- [ ] **B1** — `use-note-entity.ts` (§2a: `journalDate` on `NoteEntityData` + sample) + `use-journal-summary.ts` (§2b) +
      the mixed-state sample. **CASCADE (preflight):** adding required `journalDate` breaks the `NoteEntityData` literal at
      `note-entity.test.tsx:11` → add `journalDate: null` there. (`use-note-entity.test.ts` doesn't assert the shape — no change.)
- [ ] **B2** — `summary-block.tsx` (§2c: `SummaryView` + `SummarySection` + `SummaryBlock` + `moduleLabel`/`moduleIcon`)
  - `summary-block.test.tsx` (block states + the mixed-state per-section degrade matrix + dataPoint labels + a11y + EC-22).
- [ ] **B3** — edit `note-overview.tsx` (§2d); extend `note-overview`/`overview-registry` tests only if they assert the seam copy.
- [ ] **B4** — `tsc` 0 · `eslint` 0 · **full `@vida/web` suite** green.
- [ ] **B5** — blocking **Visual Gate** (PLAN §7): Brave `/notes/2?sample` (journal); 3 presets × L/D × {merged,tabbed} ×
      {375,768,1440}; EC-9 (≥3 sections, ≥1 scoped error, others still render), EC-15 (Summary renders, not the seam copy),
      EC-22 (Lucide), AA full-matrix incl. warm-dark, axe 0, no overflow, MEASURED_OK + composite opacity.

## 4. Acceptance (DoD — §XXII)

- [ ] `/summary` renders `buildDashboard().summary` per section; a section's `error`/`empty` degrades THAT section only,
      the block still renders the rest (EC-9/NOT-34 anti-blank).
- [ ] success section renders `dataPoints[].label`s; `items` (opaque) never rendered (D-S5-7); render is generic over any `SectionData`.
- [ ] wired into `journalOverviewStub` both modes; `SummarySeam` removed; note overview untouched.
- [ ] 4 block states (§VIII) + per-section terminal states; type-only `@vida/core` import.
- [ ] TS strict (0 any/non-null/suppression); the presentational `SummaryView` unit-tested directly.
- [ ] tsc 0 · eslint 0 · full suite green · Visual Gate PASS.
- [ ] §XXIX currency: task slice-log + build-step + TASKS.md; **F-S5-1 inline-editor-node finding added to the parking lot**.

## 5. Out of scope (no pull-forward — §XXVIII)

The inline editor `/summary` node-view (ui-3/#31, F-S5-1) · live `buildDashboard` wiring + registered contributors (data
plane) · `summary_config` toggle UI (S6/NOT-32) · the wider personalizable menu (NOT-35, M1.4) · the `agenda` half +
the full journal daily-dashboard (fe-journals, EC-18a) · rich per-module item bodies (each module's ②).
