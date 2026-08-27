<!-- Entity Delivery Flow · TRACK B (UI/UX Build Flow) · slice B7 · Notes & Pages — the FINAL Track-B slice → ENTITY CLOSE.
     §XXVI unit spec (gate-1 = this SPEC → ░Doc Gate░). Grounded in the DOC-FIXED homing: slice-map.md:36 homes B7 as
     "render the /summary block (fail-loud per section, never blanks) consuming MOD-journals; the journal `entry` editor
     mount seam" covering EC-5 (journal). The seam is frozen at seam-contract.md:43 (B7 ← get/setSummaryConfig from ①;
     `buildJournalSummary` = B7's OWN ② block surface, NOT an ① method). Authority = the 5 aspect docs + these delivery
     docs + the frozen ① seam (A7 get/setSummaryConfig is real, tested code) + the shipped @vida/editor B4 block-body
     mechanism + the shipped UX-6 Home seam (section-model / journal-contribution / section-state). No-Guessing: every
     claim is [FACT: path:line], [INTERP: from fact], or a drift resolved at THIS gate — never an open decision dangling.
     THE CENTRAL FACT: MOD-journals ① (the aggregation engine buildDashboard) is 0 lines, fenced to #33, and Journals is
     `blocked-by mod-notes` — so B7 CANNOT consume a live engine. Rendering against an inert engine seam that degrades
     per-section IS the design (EC-5 · BR-3 · G5 · contract.md:33), the AR-9 `JournalSeamNotActivated` precedent applied. -->

# B7 — journal `/summary` block + Home entry seam  (MOD-notes ② · slice B7 — FINAL Track-B slice)

## 0. Source model
Code-first interim per `docs/specs/foundation/frontend-source-of-truth.md`. The **authority** is the 5 aspect docs
(`docs/features/notes-and-pages/{contract,business-rules,conventions,identity,structure-data}.md`) + the **frozen ① seam**
(`current-spec.md:62` — A7 `get/setSummaryConfig` is real, tested code) + the delivery docs (`slice-map.md:22,36,47`,
`seam-contract.md:43`, `envision.md:29`) + the **journals engine contract** (`docs/features/journals/contract.md` — the
engine B7 consumes, INTENDED/0-lines) + `home/CLAUDE.md` (the UX-6 Home seam + the fence: engine → #33, Home render →
Phase-1b). **Patterns to mirror (shipped):** the B4 block-body mechanism (`@vida/editor` `block-bodies.tsx`
`makeBlockBodyNode` + `editor.tsx` `blockBodies` swap + `apps/web` `entity-link-body.tsx`); the UX-6 Home seam for the
`entry` mount point + the `DataPoint` type + the `JournalSeamNotActivated` inert-seam **precedent**
(`apps/web/src/home/{section-model,journal-contribution}.ts`) — ⚠ NOT its `SectionData`/`resolveDashboardStates`/
`journalStillRenders` (HomeSectionKey-typed, wrong granularity for the block rows); B2's `note-detail.tsx` editor mount
(`getPageByJournalDate`/`createPage` for the journal page); the `@vida/core` `TerminalState` canon (reused by TYPE).
**No new design token, no new `@vida/ui` primitive** is introduced by B7.
*(Throughout, `delivery/` = `docs/features/notes-and-pages/delivery/`; feature docs = `docs/features/notes-and-pages/`;
`home/` = `apps/web/src/home/`; other cites are repo-root-relative.)* `[FACT: frontend-source-of-truth.md; REPO.md:33]`

## 1. Context & scope
B7 is the **seventh + final ② slice** → ENTITY CLOSE. It delivers the journal-facing half of **EC-5** — "journal
`/summary` **degrades per-section, never blanks**" — by (a) giving the E5 `dailySummary` integration node a **real
app-injected body** (via the shipped B4 `BlockBodies` mechanism) that renders the today-summary per-section, and (b)
providing the **journal `entry` editor mount seam** the UX-6 Home will consume (Phase-1b). **Doc-fixed BUILT-in-B7**
(`slice-map.md:36` · `seam-contract.md:43` · `envision.md:29` · `contract.md:20`) — this spec RECORDS and DETAILS it, it
re-decides nothing. `[FACT: slice-map.md:36; seam-contract.md:43; envision.md:29; contract.md:20; current-spec.md:232]`

**THE CENTRAL CONSTRAINT — the engine is inert by wave order, so B7 degrades (this is not a gap):**
The `/summary` aggregation ENGINE (`journal-service.ts` `buildDashboard(date, selection)`) is **0 lines**, fenced to
**MOD-journals #33** — and `mod-journals` is **`blocked-by mod-notes`** (Journals builds AFTER Notes). So B7 physically
cannot consume a live engine; every enabled section degrades to its own "available when Journals ships" terminal state,
**never blanking the block**. This is the AR-9 `SyncNotActivated` deferred-seam pattern (already applied by UX-6 as
`JournalSeamNotActivated`), the same graceful degradation B4 gave the `entityLink`/`backlink` bodies (CB6). `[FACT:
journals/contract.md:8-10 "journal-service.ts is 0 lines"; home/CLAUDE.md "Aggregation engine … → MOD-journals #33 (0
lines INTENDED)"; .claude/tasks/mod-journals.md "blocked by mod-notes"; envision.md:29; business-rules.md:38; contract.md:33]`

It **spans TWO planes** (the B4 shape — editor seam + app body; no `@vida/core` change):
- **`@vida/editor`:** extend the B4 `BlockBodies` interface with `dailySummary?: BlockBodyRenderer` + swap the
  `dailySummary` node into the delegating node-view (mirrors the `entityLink`/`backlink` swap in `editor.tsx:150-152`).
  Editor stays **`@vida/core`-free AND app-free** (BR-1). `[FACT: block-bodies.tsx:23-26; editor.tsx:150-152]`
- **`apps/web`:** the `dailySummary` body (`daily-summary-body.tsx`) + the pure degrade surface
  `buildJournalSummary(date, config)` (B7's OWN ② surface, per seam-contract) + the journal `entry` mount seam
  (`journal-entry-seam.ts`) + wiring `dailySummary` into `note-detail.tsx`'s `blockBodies`. `[FACT: seam-contract.md:43;
  note-detail.tsx:293-305; contract.md:20]`

**In scope (EC-5 [structural]; slice-map.md:36,47):**
- **The `/summary` block body (`dailySummary`).** The E5 `dailySummary` node (`name:'dailySummary'`, attrs
  `DailySummaryBlockAttrs {date: string|null, sections: DailySummarySectionType[]}`) gets a real body via
  `makeBlockBodyNode('dailySummary', render)`. The body reads its `{date, sections}` attrs, calls `buildJournalSummary`,
  and renders **each enabled section as its own card** with a distinct terminal state — a failing/inert section degrades
  **that card only**, never the block. `[FACT: editor.ts:66-69 (DailySummaryBlockAttrs); integration-blocks.tsx:44-47
  (DAILY_SUMMARY_SCHEMA {date, sections}); block-bodies.tsx:52-65; contract.md:20; business-rules.md:30,38]`
- **`buildJournalSummary(date, sections)` — B7's OWN ② block surface, degrade-per-section.** Per the seam-contract this
  is **NOT an ① method**; it consumes MOD-journals' engine directly. With the engine inert (wave order), it returns, for
  each enabled **summary row** (a `DailySummarySectionType`: habits/tasks/study/…), a **B7-local** row result in the
  **`'empty'`** terminal state carrying an "available when Journals ships" copy — pure, unit-tested, no `@vida/core`
  journal-engine code authored (that is #33). ⚠ **It does NOT return `home/`'s `SectionData` and does NOT compose
  `resolveDashboardStates`/`journalStillRenders`** — those are keyed by `HomeSectionKey` (`summary|agenda|entry` = the 3
  Home *lanes*), a DIFFERENT granularity from the block's N summary *rows*. B7 reuses only the `TerminalState` 4-literal
  canon (by type) + the AR-9 `JournalSeamNotActivated` **precedent** (the inert-seam pattern, in prose — not thrown/caught:
  B7 never calls the `registerJournalContribution` path). `[FACT: seam-contract.md:43; contract.md:20; home/journal-contribution.ts:22-26
  (SectionData is HomeSectionKey-keyed, no `cause` field); home/section-model.ts:8 (HomeSectionKey ≠ DailySummarySectionType);
  home/CLAUDE.md (engine fenced to #33); AR-9 sync/types.ts (SyncNotActivated precedent)]`
- **Inert = `'empty'`, NOT `'error'` (EC-5 · G5).** A not-yet-shipped engine is "nothing yet / available when Journals
  ships" — which `business-rules.md:30` explicitly says is **NOT an error**; `'error'` is reserved for a section whose
  provider actually *threw* (a #33-era `ContributionFailed`). No 5th `TerminalState` is invented — the "available when
  Journals ships" text is a copy string over `state:'empty'` (the E5 placeholder's own language). `[FACT: business-rules.md:30
  ("NOT an error"); contract.md:33 (empty vs error distinct); journals/contract.md ContributionFailed; integration-blocks.tsx:159]`
- **The block never blanks — STRUCTURALLY.** The body renders one card per enabled section always (even an `'empty'`
  card), so a failing/inert section degrades *that card only* and the block is never a void; the `sections=[]` case
  renders a non-blank "no summary sections configured — available when Journals ships" surface. (Anti-blank is structural,
  not `journalStillRenders` — that predicate is `HomeSectionKey`-typed.) `[FACT: business-rules.md:38; contract.md:33; envision.md:29]`
- **Enabled sections come from the block's `sections` attr (CB2), not the page column.** The `dailySummary` node's
  `sections` attr IS the per-block config (E5 CB2 "inline = editor-node attrs"). A7's page-level `summary_config`
  (`JournalSummaryConfig`) is the per-journal default the block MAY seed from when its own `sections` is empty, read via
  `getSummaryConfig` — mapped `showHabits→habits · showTasks→tasks · showStudySessions→study · showTransactions→
  transactions · showInteractions→interactions` (5 flags → 5 of the 6 row types; `routines` has no flag — the G5 delta,
  see OUT). The block instance's own attrs are authoritative for its render. `[FACT: integration-blocks.tsx:26,45-47 (config
  = node attrs, CB2); contract.md:20; current-spec.md:62 (A7 = summary_config storage); note.ts:83-89 (the 5 flags);
  editor.ts:56-63 (the 6 row types); [INTERP: attr authoritative, column = persisted default]]`
- **The journal `entry` editor mount seam → Home.** B7 provides the typed seam by which the UX-6 Home (`section-model.ts`
  entry `renderHint:'editor-seam'`) mounts today's journal entry editor: resolve-or-create today's `journal` page
  (`getPageByJournalDate(today) ?? createPage({type:'journal', journal_date})`, NP-2 idempotent) and hand its id to the
  B2 editor mount (`/note/$id`). Home's **rendered screen is Phase-1b** — B7 ships the **seam** (a typed resolver +
  contract), not the `/` screen. `[FACT: home/section-model.ts:28-34 (entry = mount seam only); home/CLAUDE.md ("the journal
  entry … here is a seam"; Home render → Phase-1b); service.ts getPageByJournalDate (A1); business-rules NP-2]`
- **Full degrade coverage (EC-5, G5).** Every enabled section shows a distinct **empty** ("nothing today" — NOT an error),
  **error** (a #33-era source that threw), or (once #33 ships) **populated** state; the block never blanks (structurally —
  a card always renders per enabled row). Today, all sections resolve to the inert-engine `'empty'` degrade. `[FACT:
  business-rules.md:30,38; contract.md:33; envision.md:29]`

**Explicitly OUT (later slices / other modules / phases — do NOT build):**
- **No `@vida/core` journals engine.** `buildDashboard`/`captureSnapshot`/`getJournal`/`buildReview` + the provider
  registry + real module `summary(date)`/`dueIn` providers → **MOD-journals #33** (+ each MOD-*). B7 authors ZERO
  `services/journals/` code. `[FACT: home/CLAUDE.md; journals/contract.md §2]`
- **No rendered Home `/` screen / route.** The daily-dashboard React screen + `/` wiring → **Phase-1b**; B7 ships only the
  entry mount seam it will consume. `[FACT: home/CLAUDE.md "The rendered … screen + / route wiring → Phase-1b"]`
- **No snapshot / Wrapped-style review engine.** Past-day snapshots + temporal reviews → **design-pass / Wave 3-4**.
  `[FACT: home/CLAUDE.md; journals/contract.md §2 buildReview "design-pass"]`
- **No agenda (`dueIn`) lane.** The agenda section of the Home dashboard is a separate Home/Sessions concern (Phase-1b +
  Sessions `dueIn`); B7's `/summary` block is the **recap** (summary), not the agenda. `[FACT: journals/contract.md §2
  (agenda = dueIn, separate); home/section-model.ts:30-33 (summary vs agenda are distinct sections)]`
- **No `summary_config` editor UI + no section-set expansion → G5 / M1.4.** Choosing which sections show (the
  `showHabits…` toggles) + widening `JournalSummaryConfig` to the full menu (Routines, Class schedule, Reminders, Events,
  Check-in, Goals, Pomodoro, Gamification) is the **G5 flagged delta** — "⚠ INTENDED, a build-phase change + candidate
  ADR", routed to **M1.4** ("Wider /summary menu → M1.4"). B7 renders the sections the block attr already carries; it
  builds no config editor and expands no type. `[FACT: business-rules.md:43 (G5 — the 5 shipped + Routines/… INTENDED);
  slice-map.md:59 (Wider /summary menu → M1.4)]`
- **The `routines`-vs-`JournalSummaryConfig` vocab gap is the G5 delta — flagged, not resolved (NOT a DB-11 item).** The
  block enum `DAILY_SUMMARY_SECTION_TYPE` already carries **6** types incl. `routines`; `JournalSummaryConfig` has only
  **5** show-flags (no `routines`) because G5's expansion hasn't landed. This is exactly the doc-flagged G5 spec/code
  drift, homed to **M1.4** — not a new DB-11 type reconcile. B7 renders whatever `sections` the block carries as-is; the
  5→6 flag/enum reconcile lands with G5. `[FACT: business-rules.md:43 (G5); editor.ts:56-63 (6 row types); note.ts:83-89
  (5 flags); slice-map.md:59 (M1.4)]`
- **The other 9 placeholder blocks** (`/tasks` `/events` `/classes` `/habits` `/timeline` `/chart` `/pomodoro`
  `/class-notes` `/milestone`) → each owning MOD-* (they keep the E5 placeholder). B7 gives a body ONLY to `dailySummary`.
  `[FACT: block-registry.md:20-21; integration-blocks.tsx:214]`

**Patterns to mirror (read before authoring — same layer):**
- **B4 block-body seam** — `BlockBodies` interface + `BlockBodyRenderer` (`{attrs, updateAttributes, deleteNode} →
  ReactElement|null`, null → placeholder); `makeBlockBodyNode(type, render)`; `editor.tsx` filters the type out of
  `INTEGRATION_BLOCK_EXTENSIONS` and re-adds the `.extend()`ed node (swap, never append). `[FACT: block-bodies.tsx:14-65;
  editor.tsx:150-152]`
- **B4 app body + wiring** — `entity-link-body.tsx` (the delegated body pattern); `note-detail.tsx:293-305` (the
  `useMemo<BlockBodies>` supplying `entityLink`/`backlink`; `blockBodies={corrupt ? undefined : blockBodies}`). B7 adds a
  `dailySummary` entry. `[FACT: entity-link-body.tsx; note-detail.tsx:293-305,410]`
- **UX-6 Home seam** — the `entry` mount seam (`section-model.ts:28-34`), `DataPoint` type + the `JournalSeamNotActivated`
  **precedent** (AR-9 inert-seam), and the "reuse `TerminalState` by TYPE, never `deriveTerminalState` with no live query"
  rule. ⚠ `SectionData`/`resolveDashboardStates`/`journalStillRenders` are `HomeSectionKey`-typed (the 3 Home lanes) — B7
  does NOT reuse them (its rows are `DailySummarySectionType`-granular; BR-B7-3). `[FACT: home/journal-contribution.ts;
  home/section-model.ts:8; home/CLAUDE.md]`

## 2. Business rules (invariants B7 must hold)
> Inherits the CORE constitution + `standards/{components,design,engineering}.md`. Every rule complies.

- **BR-B7-1 · The `/summary` block is the `dailySummary` node's app-injected body — via the B4 seam, a swap not an
  append.** `@vida/editor` extends `BlockBodies` with `dailySummary?: BlockBodyRenderer`; `editor.tsx` filters
  `dailySummary` out of `INTEGRATION_BLOCK_EXTENSIONS` and re-adds `makeBlockBodyNode('dailySummary', blockBodies?.dailySummary
  ?? null)`. Absent a renderer → the E5 placeholder (graceful). The editor stays `@vida/core`-free AND app-free. `[FACT:
  block-bodies.tsx:23-26,52-65; editor.tsx:150-152; BR-1]`
- **BR-B7-2 · `buildJournalSummary(date, sections)` is a ② app surface, NOT an ① method, and authors NO `@vida/core`
  journal-engine code.** It lives in `apps/web`; it consumes MOD-journals' engine directly (inert today → degrades). B7
  writes zero `services/journals/` lines. `[FACT: seam-contract.md:43; contract.md:20; home/CLAUDE.md (engine → #33)]`
- **BR-B7-3 · Degrade per-section = `'empty'`, NEVER blank the block (EC-5 · G5), anti-blank STRUCTURAL.** With the engine
  inert, each enabled section resolves to a B7-local row in `state:'empty'` with an "available when Journals ships" copy
  (`'error'` reserved for a #33-era provider that actually threw — `business-rules.md:30` "empty is NOT an error"). A
  failing/inert section degrades **that card only**. The block never blanks *structurally* — it always renders one card
  per enabled section (even empty), and the `sections=[]` case renders a non-blank "no summary sections configured"
  surface. B7 does NOT use `home/`'s `SectionData`/`resolveDashboardStates`/`journalStillRenders` (they are
  `HomeSectionKey`-typed — the 3 Home lanes, not the block's rows). `[FACT: business-rules.md:30,38; contract.md:33;
  home/journal-contribution.ts:22-26; home/section-model.ts:8]`
- **BR-B7-4 · Enabled sections are driven by the block's `sections` attr (CB2); `getSummaryConfig` is the persisted
  default only, via an explicit 5-flag→5-row map.** The body renders `node.attrs.sections`; where empty it MAY fall back
  to A7's `getSummaryConfig(pageId)` mapped `showHabits→habits · showTasks→tasks · showStudySessions→study ·
  showTransactions→transactions · showInteractions→interactions` (5 flags → 5 of the 6 rows; `routines` has no flag — G5).
  The block attr is authoritative for the instance. `[FACT: integration-blocks.tsx:26,45-47; note.ts:83-89; editor.ts:56-63;
  contract.md:20; current-spec.md:62]`
- **BR-B7-5 · The journal `entry` mount seam is idempotent + client-deterministic (NP-2).** Resolving today's journal
  reuses `getPageByJournalDate(today)`; on miss it creates `{type:'journal', journal_date: today}` — one journal per date
  (`JournalExistsError` never fires on the resolve-or-create path because it resolves first). The seam is a typed resolver
  handed to the B2 editor mount; B7 renders no Home screen. `[FACT: business-rules NP-2; service.ts getPageByJournalDate/
  createPage; home/section-model.ts:28-34; home/CLAUDE.md (Home render = Phase-1b)]`
- **BR-B7-6 · Reuse the `TerminalState` canon by TYPE only — never redefine, never derive with no data.** `TerminalState`
  (4 literals) via `@vida/core`; `DataPoint` via `home/journal-contribution.ts` (the row's advertised points). Do NOT
  reuse `SectionData`/`resolveDashboardStates`/`journalStillRenders` (Home-lane-typed, BR-B7-3) and do NOT call
  `deriveTerminalState` in the inert path (no live query exists — the UX-6 rule). `[FACT: home/section-state.ts:1-8;
  home/journal-contribution.ts:9-13; home/CLAUDE.md ("Do NOT call deriveTerminalState")]`
- **BR-B7-7 · Live-on-open, seam-clean for #33.** The block re-aggregates on open (identity.md:19 "a live `/summary`
  block that re-aggregates on open"); today that means it re-evaluates the inert-engine degrade. The `buildJournalSummary`
  seam is the exact interface #33 will fill (swap the inert body for a real `buildDashboard` call) with **no B7 rewrite** —
  the block/app boundary is the freeze point. `[FACT: identity.md:19; seam-contract.md "Freeze point"; journals/contract.md
  §2 buildDashboard]`
- **BR-B7-8 · No `@vida/core` change, no new dep, no new token; two planes only.** `@vida/editor` (one interface field +
  the swap) + `apps/web` (body + surface + seam + wiring). No `packages/core`/`packages/types` edit, no runtime dep, no
  design token. `[FACT: §1 planes; block-bodies.tsx (the seam is prop-driven)]`
- **BR-B7-9 · Full visual-state + a11y + responsive coverage (standards §VIII/§XIV/§X).** The block × light/dark ×
  375/768/1440: each section card renders loading/empty/error/populated distinctly; the block region is an accessible
  named region (the E5 `role="note"` precedent) with per-section labels; contrast AA; no injected CSS/motion beyond the
  shipped mechanism. `[FACT: components.md §VIII; engineering.md §XIV; design.md §X; integration-blocks.tsx:147-162]`

## 3. Contract (the B7 surface)
```ts
// packages/editor/src/extensions/block-bodies.tsx — EXTEND the B4 interface (one field):
export interface BlockBodies {
  entityLink?: BlockBodyRenderer
  backlink?: BlockBodyRenderer
  dailySummary?: BlockBodyRenderer          // NEW (B7) — the /summary block body
}
// packages/editor/src/editor.tsx — EXTEND the swap set (mirror the shipped !==-chain at :150, add a 3rd clause):
//   ...INTEGRATION_BLOCK_EXTENSIONS.filter(n => n.name !== 'entityLink' && n.name !== 'backlink' && n.name !== 'dailySummary'),
//   makeBlockBodyNode('entityLink',   blockBodies?.entityLink   ?? null),
//   makeBlockBodyNode('backlink',     blockBodies?.backlink     ?? null),
//   makeBlockBodyNode('dailySummary', blockBodies?.dailySummary ?? null),   // NEW

// apps/web/src/app/note/daily-summary-body.tsx — NEW (mirror entity-link-body.tsx):
/** The dailySummary block body: read {date, sections} attrs → buildJournalSummary → render per-section cards,
 *  each degrading independently (never blanks). Read-only body (ignores updateAttributes/deleteNode). */
export function DailySummaryBody(props: {
  attrs: { date: string | null; sections: readonly DailySummarySectionType[] }
  pageId: string
  config?: JournalSummaryConfig            // A7 persisted default (getSummaryConfig), optional
}): ReactElement

// apps/web/src/app/note/build-journal-summary.ts — NEW (B7's OWN ② surface; pure, unit-tested):
import type { TerminalState } from '../../state-conventions/terminal-state'   // the 4-literal canon, by TYPE
import type { DataPoint } from '../../home/journal-contribution'
import type { DailySummarySectionType } from '@vida/types'
/** A B7-LOCAL per-row result — keyed by the summary ROW (DailySummarySectionType), NOT home/'s SectionData (which is
 *  HomeSectionKey-keyed = the 3 Home lanes). `message` carries the degrade copy ("available when Journals ships"). */
export interface SummaryRow {
  readonly section: DailySummarySectionType
  readonly state: TerminalState       // inert → 'empty' (NOT 'error'); 'error' = a #33-era provider that threw
  readonly dataPoints: readonly DataPoint[]
  readonly message?: string
}
/** Consume MOD-journals' engine per enabled row. Engine inert (wave order) → each row degrades to state:'empty' with the
 *  "available when Journals ships" message, never throwing, never blanking. #33 swaps the body for a real buildDashboard
 *  call — this signature is the freeze point (BR-B7-7). NOTE: authors NO @vida/core journal code; the JournalSeamNotActivated
 *  class is the PRECEDENT (AR-9), referenced in prose — not imported/thrown here (B7 never calls registerJournalContribution). */
export function buildJournalSummary(
  date: string | null,
  sections: readonly DailySummarySectionType[],
): readonly SummaryRow[]     // one SummaryRow per enabled section; inert → state:'empty'

// apps/web/src/app/note/journal-entry-seam.ts — NEW (the Home entry mount seam; typed resolver, no screen):
/** Resolve-or-create today's journal page (NP-2 idempotent) → its id for the B2 editor mount (/note/$id).
 *  The UX-6 Home (Phase-1b) consumes this; B7 ships the seam, not the rendered screen. */
export async function resolveTodayJournalPageId(svc: NotesService, today: string): Promise<string>
//   impl: (await svc.getPageByJournalDate(today))?.id
//         ?? (await svc.createPage({ type: 'journal', journal_date: today })).id
//   ↑ createPageSchema (validators/note.ts:25-45): only { type, journal_date } required for a journal (title nullish);
//     journal_date required-iff-type='journal' (NP-2 refine) — the minimal input rejects nothing, no async ZodError.

// apps/web/src/app/note/note-detail.tsx — EXTEND the blockBodies useMemo (add one entry):
//   dailySummary: (ctx) => <DailySummaryBody attrs={ctx.attrs as …} pageId={id} config={summaryConfig} />
```
- `DataPoint` is **already exported** by `home/journal-contribution.ts`; `TerminalState` by `@vida/core`;
  `DailySummarySectionType`/`JournalSummaryConfig` by `@vida/types`. B7's one new type is the **local** `SummaryRow`
  (row-granular, `z.infer`-free) — it does NOT reuse `home/`'s `SectionData` (HomeSectionKey-keyed, wrong granularity).
  `[FACT: home/journal-contribution.ts:9-13,22-26; editor.ts:56-63; note.ts:83-89]`
- The pure `buildJournalSummary` + `resolveTodayJournalPageId` are **named helpers unit-tested first** — the correctness
  surface of B7. `[FACT: BR-B7-2/3/5]`

## 4. Acceptance — ░Visual Gate░ (blocking, per slice-map.md:36) → then ENTITY CLOSE
Real browser (chrome-devtools / Brave), **no batching, no owed gate**:
1. **EC-5 MUST (block renders, degrades per-section):** insert a `/summary` block into a note (slash menu) → the block
   renders a **named card per enabled section** (from the block's `sections` attr), each in the `'empty'` terminal state
   with the "available when Journals ships" copy (NOT an error surface — G5/business-rules.md:30), and the block **never
   blanks**. With sections = `[habits, tasks]`, two cards; with `[]`, a non-blank "no summary sections configured" surface.
2. **BR-B7-3 (independent degrade, structural anti-blank):** with per-row states varied (e.g. one row forced to an error
   surface, another empty), each card shows its own state and the block still renders every card — anti-blank is
   structural (a card always renders per enabled row), not a `journalStillRenders` call. No single row blanks the block.
3. **BR-B7-1 (graceful fallback):** a note whose `blockBodies` omits `dailySummary` (or `corrupt` path) still renders the
   E5 placeholder for the node — never a crash.
4. **BR-B7-5 (entry seam, idempotent):** `resolveTodayJournalPageId` returns the same journal page id on repeat calls for
   the same date (reuses `getPageByJournalDate`); a first call for a fresh date creates exactly one `journal` page; the
   resolved id mounts the B2 editor at `/note/$id`. (Verified via the seam unit + a live open of today's journal entry.)
5. **BR-B7-7 (seam-clean for #33):** confirm `buildJournalSummary` is the sole engine-consumption point and authors no
   `@vida/core` journal code (grep `services/journals/` unchanged) — #33 fills it without a B7 rewrite.
6. **All block states × {light | dark} × {375 · 768 · 1440}:** per-section loading · empty · error · (inert) degraded;
   the card frame flips surface with the theme. Screenshots as evidence.
7. **§XIV a11y sweep:** the block is a named region; each section card has an accessible name + its state announced;
   keyboard-reachable; contrast AA; a VoiceOver trace of the block + one section.
8. **Boundary:** `@vida/editor` imports no `@vida/core` and no app (BR-1); `apps/web` body imports the editor seam + the
   `home/` seam only. `pnpm --filter @vida/editor test` + `--filter @vida/web test` green · root `typecheck` 0 · `eslint`
   0 · `/component-audit` + `victor:quality-gate-components` + `-engineering` PASS.
9. **§XXIX currency + ENTITY CLOSE:** refresh `notes-and-pages/current-spec.md` + `current-business-rules.md` (the ②
   `/summary` block surface + entry seam shipped; strike the "B7 next" pointer) at gate close; commit WITH the code. Then
   both tracks green → `/session-end` → `/task-complete` (ENTITY CLOSE — the in-degree-14 hub is complete). `[FACT:
   §XXIX; task ## Progress ENTITY CLOSE]`

## 5. Implementation prompt (built after Approval 1 → IMPLEMENTATION-PLAN g2)
1. **The pure surfaces first (unit-tested):**
   - `apps/web/src/app/note/build-journal-summary.ts` — `buildJournalSummary(date, sections): SummaryRow[]` (B7-local
     row type, §3): for each section return `{ section, dataPoints: [], state: 'empty', message: 'available when Journals
     ships' }` (inert engine → empty, NOT error). Test: N sections → N `'empty'` rows; `[]` → `[]`; never throws; imports
     no `@vida/core`/`services/journals`.
   - `apps/web/src/app/note/journal-entry-seam.ts` — `resolveTodayJournalPageId(svc, today)`: `getPageByJournalDate` →
     id, else `createPage({type:'journal', journal_date: today})` → id. Test: reuse (same id), create-on-miss, NP-2.
2. `packages/editor` — extend `BlockBodies` with `dailySummary?` (block-bodies.tsx) + add the `dailySummary` swap in
   `editor.tsx` (filter list + third `makeBlockBodyNode`). Test: schema-preserve swap for `dailySummary`, attrs round-trip
   (`{date, sections}`), BodyShell delegate/fallback for `dailySummary`.
3. `apps/web/src/app/note/daily-summary-body.tsx` — `DailySummaryBody`: read `{date, sections}` attrs (fall back to
   `config` show-flags → rows via the explicit 5-flag→5-row map when `sections` empty, BR-B7-4), call
   `buildJournalSummary`, render each `SummaryRow` → a Tamagui section card in its `state` (its own local render; do NOT
   route through `resolveDashboardStates` — that is `HomeSectionKey`-typed). Read-only (ignores mutators). Base tokens, no
   injected CSS/motion; §VIII/§XIV states.
4. `apps/web/src/app/note/note-detail.tsx` — add `dailySummary` to the `useMemo<BlockBodies>` (beside `entityLink`/
   `backlink`), pass the page id + the `getSummaryConfig` result (a small `useSummaryConfig` read hook, or the existing
   note read) as `config`. No other panel change.
5. Tests: the two pure helpers (above); the editor swap (block-bodies.test.tsx +3); `DailySummaryBody` states (jsdom —
   assert the section cards + degraded states, not a live engine); note-detail wires `dailySummary`. TS types first →
   default → all states → dark → responsive.
6. `pnpm --filter @vida/editor test && --filter @vida/web test` green · typecheck 0 · eslint 0 → `/component-audit` →
   `/critique` → the ░Visual Gate░ → §XXIX → ENTITY CLOSE.

## 6. Decisions — none open (all doc-fixed at this Doc Gate)
- **D-1 · The `/summary` block degrades against an inert engine — the design, not a gap; inert = `'empty'`.** MOD-journals
  is `blocked-by mod-notes`; the engine is 0 lines fenced to #33. B7 renders the block + degrades each row to `'empty'`
  ("available when Journals ships" — NOT an error, business-rules.md:30), following the AR-9 `JournalSeamNotActivated`
  precedent in prose (not thrown/caught — B7 never calls the register path). Not a choice. `[FACT: mod-journals.md deps;
  home/CLAUDE.md; journals/contract.md:5; business-rules.md:30; envision.md:29]`
- **D-2 · `buildJournalSummary` is a ② app surface, not an ① method — doc-fixed (Victor drift-catch A7).** The engine-vs-
  block split is unanimous across `contract.md:20`, `identity.md:19`, `current-spec.md:62`, `seam-contract.md:43`. B7
  authors no `@vida/core` journal code. `[FACT: seam-contract.md:43; current-spec.md:62]`
- **D-3 · The `/summary` block reuses the B4 block-body mechanism — the shipped pattern, not a new one.** `dailySummary`
  is an E5 integration node exactly like `entityLink`/`backlink`; `makeBlockBodyNode` + the `editor.tsx` swap already
  exist. Not a new mechanism. `[FACT: block-bodies.tsx; editor.tsx:150-152]`
- **D-4 · Home render stays Phase-1b; B7 ships the entry mount SEAM.** `home/CLAUDE.md` fences the rendered `/` screen to
  Phase-1b and names `entry` a seam. B7 provides `resolveTodayJournalPageId` + the B2 mount, not a Home screen. `[FACT:
  home/CLAUDE.md; home/section-model.ts:28-34]`
- **Doc-FLAGGED (NOT resolved here) — the G5 vocab delta → M1.4 (NOT DB-11):** the block enum `DAILY_SUMMARY_SECTION_TYPE`
  has 6 types (incl. `routines`); `JournalSummaryConfig` has 5 show-flags (no `routines`) because G5's section-set
  expansion hasn't landed. This is the doc-flagged **G5 delta**, homed to **M1.4** — not a new DB-11 type reconcile. B7
  renders the block's `sections` as-is; the 5→6 flag/enum reconcile lands with G5. `[FACT: business-rules.md:43 (G5);
  editor.ts:56-63; note.ts:83-89; slice-map.md:59 (M1.4)]`
- **Doc-FIXED (NOT decisions) — grounded above, do not reopen:** no `@vida/core`/dep/token change (BR-B7-8) · reuse the
  Home + core canons by TYPE, never `deriveTerminalState` in the inert path (BR-B7-6) · sections from the block attr,
  `getSummaryConfig` = persisted default (BR-B7-4) · full state/a11y/responsive coverage (BR-B7-9). The engine + registry
  + providers (#33 / MOD-*), the Home `/` screen (Phase-1b), the section-picker chrome + wider menu (M1.4), snapshots/
  reviews (Wave 3-4), and the agenda/`dueIn` lane are OUT (§1).
