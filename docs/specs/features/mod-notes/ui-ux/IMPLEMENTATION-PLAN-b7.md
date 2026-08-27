<!-- Entity Delivery Flow · TRACK B · slice B7 · IMPLEMENTATION-PLAN (gate-2 artifact, §XXVI step 4-6 → Approval 2).
     Built AFTER Approval 1 on b7-summary-block.md (the SPEC). Exhaustive + self-sufficient: victor:execute-plan-code
     works these steps in order via the task ## Build Steps. Every fact locked against real code below (No-Guessing).
     The SPEC's Doc Gate was REVISE→resolved (B1/B2 SectionData granularity · B3 G5-not-DB-11 · M3 empty-not-error). -->

# IMPLEMENTATION-PLAN — B7 (journal `/summary` block + Home entry seam) — FINAL Track-B slice

## G2 refinements to the approved spec (surfaced, not silent — §XXVI/§XXVIII)
1. **`buildJournalSummary` returns the B7-local `SummaryRow[]`, keyed by `DailySummarySectionType` — NOT `home/`'s
   `SectionData`.** Locked by the Doc Gate B1/B2: `SectionData.sectionKey` is `HomeSectionKey` (`summary|agenda|entry`,
   `home/section-model.ts:8`) and has no `cause` field (`home/journal-contribution.ts:22-26`). B7 defines `SummaryRow`
   `{ section, state, dataPoints, message? }` locally; reuses `TerminalState` (@vida/core) + `DataPoint`
   (home) by TYPE only.
2. **Inert row state = `'empty'`, not `'error'`** (Doc Gate M3; `business-rules.md:30` "empty is NOT an error"). The
   "available when Journals ships" text is `SummaryRow.message` over `state:'empty'`. No 5th `TerminalState`.
3. **`summary_config` fallback reads the ① `getSummaryConfig` via a new `useSummaryConfig(id)` hook** (mirrors
   `useNoteTitle`, `use-note.ts:109`) — the ① method already parses (`service.ts:323-329`). Used ONLY for the
   empty-`sections` fallback (BR-B7-4); the block attr is otherwise authoritative.
4. **Anti-blank is structural** (one card per enabled row, always) — B7 does not call `journalStillRenders`
   (HomeSectionKey-typed).

## Empirical grounding (locked before build)
- **`dailySummary` is a real E5 integration node** in `INTEGRATION_BLOCK_EXTENSIONS`: `editor.ts:29` lists it in
  `INTEGRATION_BLOCK_TYPE`; `integration-blocks.tsx:44-47` gives it `DAILY_SUMMARY_SCHEMA {date, sections}`
  (`DailySummaryBlockAttrs`, `editor.ts:66-69`). So the B4 filter+swap in `editor.tsx:150-152` extends cleanly to a
  third name. `[FACT: editor.ts:29,56-69; integration-blocks.tsx:44-47,209]`
- **The B4 seam is a pure extend+swap.** `makeBlockBodyNode(type, render)` = `createIntegrationBlockNode(def).extend({
  addOptions:{render}, addNodeView: BodyShell })` (`block-bodies.tsx:52-65`); `BodyShell` calls `render?.({attrs,
  updateAttributes, deleteNode}) ?? IntegrationBlockPlaceholder` (`:30-40`). Adding `dailySummary?` to `BlockBodies`
  (`:23-26`) + a third filter entry + a third `makeBlockBodyNode` in `editor.tsx` is the whole editor delta. `[FACT:
  block-bodies.tsx:23-26,52-65; editor.tsx:148-152]`
- **`note-detail.tsx` wiring point is `blockBodies = useMemo<BlockBodies>(() => ({entityLink, backlink}), [entityLinkDeps,
  id])`** — the body receives `ctx.attrs` directly (the `EntityLinkBody attrs={ctx.attrs}` precedent). `page` (the loaded
  PageRow, incl. `summary_config`) is already in scope (used by `baseline`). `blockBodies={corrupt ? undefined :
  blockBodies}` at the `<VidaEditor>` mount. `[FACT: note-detail.tsx:283-305,~410]`
- **The read is a `useQuery` over `getNotesService()`** — `getSummaryConfig(pageId): JournalSummaryConfig | null`
  (`service.ts:323-329`, parses the stringified column). `[FACT: use-note.ts:109-119 (useNoteTitle shape);
  service.ts:323-329]`
- **The 6 rows vs 5 flags** — `DAILY_SUMMARY_SECTION_TYPE` = `habits·tasks·study·transactions·interactions·routines`
  (`editor.ts:56-63`); `JournalSummaryConfig` = `showHabits·showTasks·showStudySessions·showTransactions·showInteractions`
  (`note.ts:83-89`). Fallback map: `showHabits→habits · showTasks→tasks · showStudySessions→study · showTransactions→
  transactions · showInteractions→interactions` (no `routines` flag — G5, out). `[FACT: editor.ts:56-63; note.ts:83-89]`
- **Entry seam ① methods exist:** `getPageByJournalDate` (`service.ts:141`) + `createPage` (`:104`); `createPageSchema`
  needs only `{type:'journal', journal_date}` (title nullish; journal_date required-iff-journal, `validators/note.ts:25-45`).
  `[FACT: service.ts:104,141; validators/note.ts:25-45]`
- **Boundary:** `@vida/editor` imports no `@vida/core`/app (BR-1); the new app files import the editor seam + `@vida/core`
  service + `home/` types only. No new runtime dep, no `@vida/core`/`@vida/types` edit. `[FACT: editor.tsx boundary;
  §1 planes]`

## Build steps (victor:execute-plan-code works these in order)

### Editor (`packages/editor`) — the seam extension (mirror B4)
1. `extensions/block-bodies.tsx` — add `dailySummary?: BlockBodyRenderer` to `interface BlockBodies`.
2. `editor.tsx` — extend the swap, **matching the shipped `!==`-chain idiom** (`editor.tsx:150` is
   `.filter((n) => n.name !== 'entityLink' && n.name !== 'backlink')`, NOT an `.includes()` array): add a third clause
   `&& n.name !== 'dailySummary'`, then add `makeBlockBodyNode('dailySummary', blockBodies?.dailySummary ?? null)` beside
   the two existing calls. Minimal diff — do NOT rewrite the filter to an array literal. No other editor change; `index.ts`
   already exports `BlockBodies`. `[FACT: editor.tsx:150-152; block-bodies.test.tsx:27 (same !== form)]`

### App (`apps/web/src/app/note`)
3. `build-journal-summary.ts` — **pure, unit-tested first.** Export `interface SummaryRow { section:
   DailySummarySectionType; state: TerminalState; dataPoints: readonly DataPoint[]; message?: string }` +
   `buildJournalSummary(date: string | null, sections: readonly DailySummarySectionType[]): readonly SummaryRow[]`: map
   each section → `{ section, state:'empty', dataPoints: [], message: 'available when Journals ships' }`. Imports
   `TerminalState` (../../state-conventions/terminal-state), `DataPoint` (../../home/journal-contribution),
   `DailySummarySectionType` (@vida/types). Imports NO `@vida/core`/`services/journals`. (#33 later replaces the body with
   a real `buildDashboard` call — signature frozen.)
   3a. Export the fallback map helper `sectionsFromConfig(config: JournalSummaryConfig): DailySummarySectionType[]`
       (the explicit 5-flag→5-row map above) — pure, unit-tested.
4. `journal-entry-seam.ts` — **pure-ish, unit-tested.** Export `resolveTodayJournalPageId(svc: NotesService, today:
   string): Promise<string>` = `(await svc.getPageByJournalDate(today))?.id ?? (await svc.createPage({type:'journal',
   journal_date: today})).id`. (The Home Phase-1b consumes it; B7 ships no screen.)
5. `use-note.ts` — add `useSummaryConfig(id: string)` (mirror `useNoteTitle:109`): `useQuery({ queryKey: ['pages', id,
   'summaryConfig'], queryFn: () => getNotesService().getSummaryConfig(id) })`.
6. `daily-summary-body.tsx` — `DailySummaryBody({ attrs, pageId, config }: { attrs: { date: string | null; sections:
   readonly DailySummarySectionType[] }; pageId: string; config?: JournalSummaryConfig | null })`: pick
   `rows = attrs.sections.length ? attrs.sections : config ? sectionsFromConfig(config) : []`; call
   `buildJournalSummary(attrs.date, rows)`; render one Tamagui card per `SummaryRow` in its `state` (empty → the
   `message`; the section label from a small `SECTION_LABEL` map). Read-only (ignores mutators). Base tokens, no injected
   CSS/motion; a named region (E5 `role="note"` precedent) with per-card accessible names; §VIII/§XIV/§X states.
7. `note-detail.tsx` — (a) `const summaryConfig = useSummaryConfig(id).data`; (b) add to the `blockBodies` useMemo:
   `dailySummary: (ctx) => <DailySummaryBody attrs={ctx.attrs as { date: string | null; sections: DailySummarySectionType[] }} pageId={id} config={summaryConfig} />`;
   (c) add `summaryConfig` to the useMemo deps. No other change (the `corrupt ? undefined` guard already covers it).

## Tests (write per step; TS types → default → all states → dark → responsive)
- `build-journal-summary.test.ts` — N sections → N `'empty'` rows w/ message; `[]` → `[]`; never throws; `sectionsFromConfig`
  maps the 5 flags → 5 rows (no `routines`), all-false → `[]`.
- `journal-entry-seam.test.ts` — existing journal → its id (no create); absent → creates `{type:'journal', journal_date}`
  once → new id; idempotent on repeat (reuse).
- `block-bodies.test.tsx` (+3) — schema-preserve swap for `dailySummary`, `{date, sections}` attrs round-trip, BodyShell
  delegate/fallback for `dailySummary`.
- `daily-summary-body.test.tsx` — renders one card per section (from attr; empty attr → from config fallback; both empty →
  the "no summary sections configured" surface); each card in `'empty'` with the message; jsdom (assert cards + a11y
  names, not a live engine); dark; 375/768/1440.
- `use-note.test` — `useSummaryConfig` reads the ① `getSummaryConfig`.
- `note-detail` — wires `dailySummary` into `blockBodies` (the block renders its body, not the placeholder, when a note
  has a `/summary` block).

## Gate checks (before ░Visual Gate░)
- `pnpm --filter @vida/editor test && pnpm --filter @vida/web test` green · root `pnpm typecheck` 0 · `pnpm lint` 0.
- Boundary: `@vida/editor` has no `@vida/core`/app import (grep); `services/journals/` unchanged (grep — BR-B7-2/7).
- `/component-audit` + `victor:quality-gate-components` + `victor:quality-gate-engineering` (carries §XXIX) PASS.
- Env: run web/vite + web tests under **Node 24** (the B1 lesson).

## Risks / watch-list
- **R1 · `ctx.attrs` typing.** `BlockBodyRenderer` hands `attrs: Record<string, unknown>`; the body casts to `{date,
  sections}`. The `sections` attr default is `() => []` (`integration-blocks.tsx:46`), so it is always an array — but the
  cast is `unknown`→typed; guard `Array.isArray(attrs.sections)` before use (defensive, the EntityLinkBody precedent
  reads attrs loosely). `[FACT: block-bodies.tsx:17-21; integration-blocks.tsx:45-47]`
- **R2 · the empty-`sections` card.** With `sections=[]` and no `config`, the body must still render a non-blank surface
  ("no summary sections configured — available when Journals ships"), NOT `null` (null → the placeholder, which is fine
  too, but the spec wants a non-blank summary surface — decide at impl, default to the explicit surface). `[FACT:
  BR-B7-3; block-bodies.tsx:34]`
- **R3 · `useSummaryConfig` key overlap.** Key `['pages', id, 'summaryConfig']` is disjoint from `NOTES_LIST_KEY` and the
  `['links']` namespace — a future `setSummaryConfig` write (M1.4 config editor) must invalidate it; not B7's concern
  (B7 only reads). `[FACT: use-note.ts key conventions]`
- **R4 · Visual Gate is live + blocking** — chrome-devtools, real browser; then §XXIX + ENTITY CLOSE. No owed gate.
