# Spec: feature:mod-journals · Slice 1 — Contribution registry + types + typed errors

Status: implemented <!-- draft → approved → implemented --> (Verification Gate PASS 2026-09-19: tsc 0 · 8/8 · 940/940 · eslint clean)
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-09-19-mod-journals
Unit: mod-journals #39 (LIF-127) · M1.1.1 Backend · Slice 1 of 4 (S1→S2→S3→S4)
Gate: §XXVI double-gate (this file = gate 1, the SPEC). Delivery docs: docs/features/journals/delivery/{interpretation,slice-map,seam-contract}.md

## 1. Identity

The **seam foundation** of the journals engine: the canonical contribution **types**, the live **registry**, and the
service's **typed errors** — all in `@vida/core`. It supersedes the inert `apps/web` UX-6 placeholder that throws
`JournalSeamNotActivated` `[FACT: apps/web/src/home/journal-contribution.ts:45-58]`.

**What it is:** the `JournalRegistry` (ADR-004 factory pattern) a module registers its `summary(date)`/`dueIn(range)`
contribution into, plus the shared type vocabulary the engine + the ② UI + registering modules all speak
`[FACT: docs/features/journals/contract.md:11-14 JR-3; conventions.md:9-11]`.

**What it is NOT:** not the engine (`buildDashboard` = S2), not the store (S3), not review (S4). It registers nothing
itself and reads no DB — contributions are runtime code `[FACT: structure-data.md:19-22 "a runtime registry (code); NOT a table"]`.

## 2. Business Rules

- **BR-S1-1 · The journal names no module (JR-3).** A contribution's `module` is a plain `string` field, never a hard
  reference; the registry stores/returns contributions without importing any feature module `[FACT: business-rules.md:17-19
JR-3; conventions.md:35-36; identity.md:29-33]`. Prevents the god-context + the JR-2 cycle.
- **BR-S1-2 · Deterministic iteration (IR-a2).** `list()` returns contributions in a fixed order — `sectionKey` in the
  declared order `summary → agenda → entry`, then `module` ascending — NEVER Map-insertion/registration order
  `[FACT: interpretation.md IR-a2; business-rules.md:23-24; journal-contribution.ts sectionKey]`. A non-deterministic
  order would make the same day render differently per device (ZK multi-device) and break snapshot reproducibility (JR-7).
- **BR-S1-3 · Dedup by `module` — re-register OVERWRITES (deliberate divergence from the precedent's throw).** The sole
  registry precedent `createEffectRegistry` _throws_ `DuplicateEffectHandler` on a duplicate key
  `[FACT: foundation/effects/registry.ts:23]`. Journals diverges because the **key semantics differ**: EffectRegistry's
  `effectType` key is a **shared resource** — two different modules claiming one effect-type is a wiring collision, so it
  must throw; JournalRegistry's `module` key is **self-owned** — only that module ever registers under its own key, so a
  second `register(sameModule)` is an idempotent re-wire (dev hot-reload / re-mount), which must overwrite, not crash
  `[INTERP: from the two keys' ownership models; business-rules.md:17-19 "a module registers ITS journal contribution"]`.
  Tested explicitly (asserts overwrite, list-length unchanged).
- **BR-S1-4 · `TerminalState` is REUSED, never redefined.** `SectionData.state` is the `@vida/core` canon
  `['loading','empty','error','success']`; the docs' "populated" prose = `success` `[FACT: foundation/capability/types.ts:14;
business-rules.md:52,57; memory design-model-reuses-canon-by-type-not-runtime]`. No 5th state, no local copy.
- **BR-S1-5 · Layering — types live in `@vida/core`, not `@vida/types`.** Because `SectionData.state` references the
  `@vida/core` `TerminalState` canon and `@vida/types` (base layer) cannot import `@vida/core`
  `[FACT: packages/core/package.json deps @vida/types; packages/types imports no @vida/core]`. `JournalSummaryConfig`
  stays in `@vida/types/note.ts` (a `Page` field, references no `@vida/core` type) `[FACT: note.ts:79-85]`.
- **BR-S1-6 · Typed errors, fail-loud.** The four contract errors are `Error` subclasses with a stable `name`
  `[FACT: contract.md:38-42; sessions ./types precedent services/sessions/service.ts:99-105]`.

**Terminal / edge states:** empty registry → `list()` returns `[]` (not an error) `[FACT: business-rules.md:48
"a module with no registered contribution → simply absent, not an error"]`. `get(unknownModule)` → `undefined`.

## 3. Contract

Home: `packages/core/src/services/journals/{types.ts, registry.ts, index.ts}` + `packages/core/src/index.ts` barrel.

**`types.ts`** (reuses `TerminalState` from `../../foundation/capability/types`):

```ts
export type HomeSectionKey = 'summary' | 'agenda' | 'entry' // moved from apps/web/src/home/section-model.ts:8
export interface DataPoint {
  readonly id: string
  readonly label: string
}
export interface DateRange {
  readonly from: string
  readonly to: string
} // YYYY-MM-DD
export interface SectionData {
  readonly sectionKey: HomeSectionKey
  readonly module: string
  readonly dataPoints: readonly DataPoint[]
  readonly state: TerminalState // the @vida/core canon (BR-S1-4)
  readonly items?: readonly unknown[] // app-shaped payload, opaque at the seam
}
export interface JournalContribution {
  readonly module: string
  readonly sectionKey: HomeSectionKey
  readonly dataPoints: readonly DataPoint[]
  summary(date: string): SectionData | Promise<SectionData> // date-keyed (JR-7)
  dueIn?(range: DateRange): SectionData | Promise<SectionData> // agenda; optional (not every module has one)
}
// typed errors (Error subclasses, stable .name):
export class ContributionFailed extends Error {
  constructor(module: string, date: string)
}
export class SnapshotMissing extends Error {
  constructor(date: string)
}
export class InsufficientHistory extends Error {
  constructor(period: string)
}
export class ProviderUnavailable extends Error {
  constructor(module: string)
}
```

> NB divergences from the `apps/web` placeholder, each grounded: (1) `dueIn?` is **optional** —
> `[INTERP: identity.md:30 "a summary(date) for the recap (and reuses **its** dueIn(range) for the agenda…)"` — the
> "its" is module-conditional, and JR-5 frames `dueIn` as a **shared** primitive, so a summary-only module (e.g.
> Finance transactions — nothing "due") registers no `dueIn`]`; the placeholder made it required
`[FACT: journal-contribution.ts:38]`. (2) `summary`/`dueIn`may return a Promise — a provider may read async`[INTERP: services are async, preferences/service.ts:256]`(S2's`buildDashboard`awaits). (3)`SectionData`gains`module`— NOT in the placeholder`[FACT: journal-contribution.ts:22-26]`; added as a grounded `[INTERP]` for degrade
attribution (`ContributionFailed(module)`, IR-d) + deterministic per-module ordering (BR-S1-2).

**`registry.ts`** (mirrors `createEffectRegistry` `[FACT: foundation/effects/registry.ts:19-30]`):

```ts
export interface JournalRegistry {
  register(def: JournalContribution): void // dedup by module (BR-S1-3)
  list(): readonly JournalContribution[] // deterministic (BR-S1-2)
  get(module: string): JournalContribution | undefined
}
export function createJournalRegistry(): JournalRegistry
```

**`index.ts`** barrel: `export * from './types'` + `export * from './registry'`.
**`packages/core/src/index.ts`**: `export * from './services/journals'` (mirrors the `services/preferences` line
`[FACT: packages/core/src/index.ts:139]`).

## 4. Acceptance

- [ ] `types.ts` compiles; `SectionData.state` typed as the imported `@vida/core` `TerminalState` (no local literal union) — BR-S1-4/BR-S1-5
- [ ] `createJournalRegistry().register` then `list()` returns registered contributions in `summary→agenda→entry`, then `module`-ascending order — BR-S1-2
- [ ] re-`register` of the same `module` overwrites (list length unchanged; `get` returns the new def) — BR-S1-3
- [ ] `list()` on an empty registry returns `[]`; `get(unknown)` returns `undefined` — edge states
- [ ] a contribution stores a plain `module` string; the registry imports no feature module — BR-S1-1
- [ ] the 4 typed errors are `Error` subclasses with stable `.name` — BR-S1-6
- [ ] `@vida/core` barrel re-exports the journals types + registry; `tsc --noEmit` zero errors — §XXVI Step 8
- [ ] Vitest unit suite (register/list-order/dedup/empty/get-unknown/error-names) green; @vida/core full suite still green — Verification Gate (pure logic; no live store for S1)

## 5. Implementation Prompt

1. **`packages/core/src/services/journals/types.ts`** — author the types + 4 error classes exactly as §3. Import
   `type TerminalState` from `../../foundation/capability/types`. Satisfies BR-S1-1/4/5/6. Cite the docs' "populated"→`success` map in a comment.
2. **`packages/core/src/services/journals/registry.ts`** — `createJournalRegistry()`: a `Map<string, JournalContribution>`
   keyed by `module`; `register` sets (overwrite, BR-S1-3); `list()` sorts by `SECTION_ORDER.indexOf(sectionKey)` then
   `module.localeCompare` and returns a readonly array (BR-S1-2); `get` reads the map. Declare
   `const SECTION_ORDER: readonly HomeSectionKey[] = ['summary','agenda','entry']`. Satisfies BR-S1-2/3.
3. **`packages/core/src/services/journals/index.ts`** — barrel: `export * from './types'`; `export * from './registry'`.
4. **`packages/core/src/index.ts`** — add `export * from './services/journals'` next to the other services (line ~139).
5. **`packages/core/src/services/journals/__tests__/registry.test.ts`** — cover every §4 checkbox (register/list-order
   across mixed sectionKeys + modules; dedup; empty; get-unknown; error `.name`s; a type-level assertion that
   `SectionData.state` accepts `'success'` and rejects `'populated'`). Mirror `foundation/effects/__tests__` style.
6. Run `pnpm --filter @vida/core typecheck` + `test` under **Node 24** → §4 done-check. Do NOT touch `apps/web` (its
   UX-6 placeholder migration is fe-journals' first-consumer pull — see §6).

Done = §4 all checked.

## 6. Open UNKNOWNs / Decisions Needed

- None blocking. **Noted (not this slice):** the `apps/web/src/home/journal-contribution.ts` + `section-model.ts`
  migration to re-import from `@vida/core` (replacing the local type copies + the throwing `register`) is **fe-journals'
  first-consumer pull** — editing the shipped UX-6 design model + its tests belongs to the frontend track, not this
  backend slice. The identical local copies are type-compatible; no runtime conflict until then `[FACT: slice-map.md
first-consumer-pull seams; apps/web/src/home/CLAUDE.md "downstream homes"]`.

## 7. Change Log

| Date       | Session                 | Change                   |
| ---------- | ----------------------- | ------------------------ |
| 2026-09-19 | 2026-09-19-mod-journals | S1 spec drafted (gate 1) |
