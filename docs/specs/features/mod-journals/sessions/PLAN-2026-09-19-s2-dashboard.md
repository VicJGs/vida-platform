# Spec: feature:mod-journals · Slice 2 — buildDashboard + pure selection resolution
Status: implemented      <!-- draft → approved → implemented -->  (Verification Gate PASS 2026-09-19: tsc 0 · 18/18 journals · 950/950 · eslint clean)
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-09-19-mod-journals
Unit: mod-journals #39 (LIF-127) · M1.1.1 Backend · Slice 2 of 4 · composes S1 (registry + types)
Gate: §XXVI double-gate (this file = gate 1). Delivery: docs/features/journals/delivery/{interpretation,slice-map,seam-contract}.md

## 1. Identity
The **engine core**: assemble a day's dashboard from the S1 registry — the backward **summary** (each module's
`summary(date)`, filtered by the user's selection) + the forward **agenda** (each module's `dueIn(today)`) — with
per-section degrade so one failing provider never blanks the journal. Plus the pure **`resolveSelection`** and the
**degrade helpers**, lifted to their canonical `@vida/core` home from the UX-6 design model.

**What it is:** pure logic over the in-memory registry `[FACT: interpretation.md N-3; conventions.md:9-11]`.
**What it is NOT:** not the store (S3), not review (S4), not the persisted selection (a SEAM — §6), not a service
shell (createJournalsService is assembled at S3 when db is needed). No db, no Preferences wiring.

## 2. Business Rules
- **BR-S2-1 · Deterministic assembly.** `buildDashboard` iterates `registry.list()` (already deterministic, BR-S1-2)
  and preserves that order within each of `summary` / `agenda` `[FACT: registry.ts list(); business-rules.md:23-24]`.
- **BR-S2-2 · Per-section degrade, never a blank journal (IR-d / JR-1 fail-loud).** Each provider call is isolated in
  try/catch: a throw yields a degraded `SectionData` (`state:'error'`, its `module`, empty `dataPoints`), and assembly
  continues — one failure degrades ONLY its section `[FACT: business-rules.md:42-43,60; conventions.md:22]`.
  `buildDashboard` NEVER throws for a provider failure; it returns error sections in place.
- **BR-S2-3 · `resolveSelection` — override wins per module, no module dropped (BR-6).** The per-journal override
  replaces the global default *for the modules it names*; unmentioned modules keep the global default. Pure.
  Lifted verbatim from `apps/web/src/home/selection.ts` (canonical home = `@vida/core`) `[FACT: selection.ts resolveSelection]`.
- **BR-S2-4 · Selection filters advertised data points.** For a summary section from module M, `buildDashboard` filters
  the returned `SectionData.dataPoints` to those whose `id ∈ selection[M]`. `selection` omitted → no filtering (all
  advertised shown); M absent from a provided selection → all shown (defensive) `[FACT: contract.md:17 "for user-selected data points"; JR-4]`.
- **BR-S2-5 · summary vs agenda split — membership is by PRODUCING METHOD (retires assumption-A).** Every contribution
  has a mandatory `summary()` + optional `dueIn()`, so the `summary` list = `summary(date)` of **all** contributions;
  the `agenda` list = `dueIn({from:date,to:date})` of the contributions that have one. `buildDashboard` **normalizes**
  each result's `sectionKey` by the method that produced it (summary→`'summary'`, dueIn→`'agenda'`) so the output is
  provider-independent (and the degraded section gets the right key). **`JournalContribution.sectionKey` is confirmed
  the S1 ordering key ONLY** — its richer per-render role is fe-journals' concern `[FACT: types.ts JournalContribution
  (summary mandatory, dueIn optional); contract.md:17-18 JR-5; identity.md:30]`. A contribution with **no `dueIn`**
  contributes no agenda section. Agenda sections are NOT selection-filtered — the agenda is the shared `dueIn` surface,
  not the per-module recap `[INTERP: JR-4 scopes selection to the summary recap; JR-5 agenda = shared primitive]`.
- **BR-S2-6 · Providers may be async.** `summary`/`dueIn` may return a `Promise<SectionData>`; `buildDashboard` awaits
  each (still isolated per BR-S2-2) `[FACT: types.ts JournalContribution; S1 async divergence]`.
- **BR-S2-7 · Anti-blank invariant helper (BR-3).** `journalStillRenders(sections)` → true unless EVERY section
  errored — the "never a blank journal" predicate over the flat section list. Lifted from
  `apps/web/src/home/section-state.ts` `[FACT: section-state.ts; business-rules.md:60]`.
  **NOT ported: `resolveDashboardStates`** — it maps ONE state per `HomeSectionKey`, which fits the UX-6 3-section home
  RENDER but collapses `buildDashboard`'s per-module section lists (many `'summary'` entries → last-wins). It is a
  frontend rendering helper and stays with fe-journals `[FACT: section-state.ts resolveDashboardStates returns Partial<Record<HomeSectionKey,…>>]`.

**Terminal states:** empty registry → `{ summary: [], agenda: [] }` (not an error). Every provider throws →
sections all `'error'`, `journalStillRenders` = false, but `buildDashboard` still returns (never throws).

## 3. Contract
Files: `packages/core/src/services/journals/{types.ts (edit), selection.ts (new), dashboard.ts (new), index.ts (edit)}`
+ `__tests__/dashboard.test.ts`.

**`types.ts`** (add):
```ts
export type JournalSelection = Record<string, readonly string[]>   // enabled dataPoint ids per module
export interface DashboardData {
  readonly summary: readonly SectionData[]
  readonly agenda: readonly SectionData[]
}
```
**`selection.ts`** (new — lifted from `apps/web/src/home/selection.ts`, cited):
```ts
export function resolveSelection(
  globalDefault: JournalSelection,
  perJournalOverride?: Partial<JournalSelection>,
): JournalSelection
```
**`dashboard.ts`** (new):
```ts
export async function buildDashboard(
  registry: JournalRegistry,
  date: string,
  selection?: JournalSelection,
): Promise<DashboardData>
export function journalStillRenders(sections: readonly SectionData[]): boolean
```
`buildDashboard`: for each `c` in `registry.list()` → `summary(date)` (try/catch → degraded on throw), normalize
`sectionKey:'summary'`, filter dataPoints by `selection?.[c.module]` (BR-S2-4) → push to `summary`; if `c.dueIn` →
`dueIn({from:date,to:date})` (try/catch → degraded), normalize `sectionKey:'agenda'` → push to `agenda`. Order
preserved (BR-S2-1). Standalone function (the S3 service wraps it as `journalsService.buildDashboard(date, sel)`
closing over its registry — seam-contract).

## 4. Acceptance
- [ ] `buildDashboard` over 3 contributions (mixed sectionKeys, one summary-only) returns `summary`/`agenda` in
  `registry.list()` order — BR-S2-1/S2-5
- [ ] a provider whose `summary(date)` throws → that section is `state:'error'` with its `module`; the other sections
  render; `buildDashboard` does not throw — BR-S2-2
- [ ] an async provider (returns a Promise) is awaited and included — BR-S2-6
- [ ] `selection` filters a summary section's `dataPoints` to the enabled ids; omitted → all shown; module absent → all shown — BR-S2-4
- [ ] agenda sections are NOT selection-filtered — BR-S2-5
- [ ] every summary result has `sectionKey:'summary'`, every agenda result `'agenda'` (normalized by method, even if a fake provider returns a wrong key) — BR-S2-5 (assumption-A)
- [ ] `resolveSelection` — override replaces per module, unmentioned modules keep the global default — BR-S2-3
- [ ] `journalStillRenders` false only when all sections error, true otherwise — BR-S2-7
- [ ] empty registry → `{summary:[],agenda:[]}` — terminal state
- [ ] `tsc --noEmit` 0 errors; `@vida/core` full suite green (no store — pure logic) — §XXVI Step 8 / Verification Gate

## 5. Implementation Prompt
1. **`types.ts`** — add `JournalSelection` + `DashboardData` (cite N-3 for why selection is a param, not stored).
2. **`selection.ts`** — port `resolveSelection` verbatim from `apps/web/src/home/selection.ts` (header cites the UX-6
   origin + that `@vida/core` is now canonical; do NOT port the throwing `get/setSelection` seams — those stay deferred). BR-S2-3.
3. **`dashboard.ts`** — `buildDashboard` (BR-S2-1/2/4/5/6): iterate `registry.list()`; per provider, try/catch; on
   success spread the result and **normalize `sectionKey`** by method, on throw use a `degraded(module, sectionKey)`
   local helper → `{sectionKey, module, dataPoints:[], state:'error'}`; filter summary dataPoints by `selection`;
   agenda via `dueIn({from:date,to:date})` when present, unfiltered. Then `journalStillRenders` ported from
   `apps/web/src/home/section-state.ts` (BR-S2-7); do NOT port `resolveDashboardStates` (per-module output mismatch — fe-journals').
4. **`index.ts`** — add `export * from './selection'` + `export * from './dashboard'`.
5. **`__tests__/dashboard.test.ts`** — cover every §4 checkbox with fake contributions (a throwing one, an async one,
   a summary-only one, a dueIn one); assert order, degrade isolation, filter, no-throw, empty-registry.
6. `pnpm --filter @vida/core typecheck` + `test` under **Node 24** → §4 done-check. Do NOT touch `apps/web` (its
   UX-6 copies migrate via fe-journals — first-consumer pull).

Done = §4 all checked.

## 6. Open UNKNOWNs / Decisions Needed
- None blocking. **SEAM (documented, not built — N-3):** persisted `getSelection()`/`setSelection()` need a
  Preferences journal-selection field + the `summary_config` per-module generalization — both **schema changes out of
  this service-only issue's scope** `[FACT: schema/preferences.ts:55-57; note.ts:79-85]`. `buildDashboard`'s
  `selection` param + `resolveSelection` cover the runtime need; the storage is pulled by fe-journals / a later schema pass.

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-09-19 | 2026-09-19-mod-journals | S2 spec drafted (gate 1); N-3 selection-storage grounding correction folded in |
