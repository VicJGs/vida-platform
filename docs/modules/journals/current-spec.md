<!-- CURRENT-SPEC — module: journals · born D6 (§XXIX Currency Rule) at mod-journals #39 Slice 1.
     Ground truth for /critique + /preflight + §XXVII. Reflects SHIPPED code; unbuilt slices flagged. -->

# Journals — Current Spec (as-built)

**Context:** `@vida/core/services/journals` — the **integration-layer aggregation engine + provider registry** behind
the journal daily dashboard. Journals owns the ENGINE, never the journal page (JR-1). Issue: mod-journals #39
(LIF-127), M1.1.1 — Hub & Foundation · Backend. Owns one table (`journal_snapshots`, migration 030, DB-4 #20);
this issue is service-only. Delivery docs: `docs/features/journals/delivery/{interpretation,slice-map,seam-contract}.md`.

## Build status (per slice)

- **Slice 1 · Contribution registry + types + typed errors — SHIPPED.** Pure logic, no store.
- **Slice 2 · `buildDashboard` + pure selection resolution — SHIPPED** (this session). Pure logic, no store.
  Persisted `getSelection`/`setSelection` are SEAMS (no Preferences journal-selection field / generalized
  `summary_config` exists yet — schema change out of ① scope, N-3).
- **Slice 3 · Snapshot store + service shell — SHIPPED** (this session). `createJournalsService` +
  `captureSnapshot`/`getJournal` over `journal_snapshots`; live-store Verification Gate (better-sqlite3 + initVault).
- **Slice 4 · `buildReview` compose-skeleton — SHIPPED** (this session). In-range snapshot composition +
  `InsufficientHistory`; named-period math / Wrapped trajectory / analytics presentation / scheduling = design-pass.
- **① BACKEND COMPLETE** (S1–S4). **② frontend** (Journal views Calendar/List/Gallery, Wrapped review UI, per-module
  selection controls) — `fe-journals`.

## Exposed surface (SHIPPED — Slice 1)

All in `@vida/core/services/journals` (barrel-exported from `@vida/core`). Types live here, NOT `@vida/types`
(layering: `SectionData.state` reuses the `@vida/core` `TerminalState` canon; `@vida/types` can't import `@vida/core`).

- **`createJournalRegistry(): JournalRegistry`** (`registry.ts`) — ADR-004 factory (mirrors `createEffectRegistry`);
  in-memory, no db (contributions are runtime code).
  - `register(def)` — dedup by `module`, **overwrites** (self-owned key; differs from EffectRegistry's throw).
  - `list()` — **deterministic**: `sectionKey` order (`summary→agenda→entry`) then `module` asc (BR-S1-2 / IR-a2).
  - `get(module)` — the contribution or `undefined`.
- **`buildDashboard(registry, date, selection?): Promise<DashboardData>`** (`dashboard.ts`, S2) — iterates
  `registry.list()`; `summary` = every contribution's `summary(date)` (dataPoints filtered by `selection[module]`);
  `agenda` = the `dueIn({from:date,to:date})` of contributions that have one (unfiltered). Per-provider try/catch →
  a degraded `{state:'error'}` section (never a blank journal, IR-d); result `sectionKey` normalized by producing
  method (assumption-A retired). Standalone pure fn (no db); the S3 service wraps it as a method.
- **`resolveSelection(globalDefault, perJournalOverride?): JournalSelection`** (`selection.ts`, S2) — override wins
  per module, no module dropped (BR-6); lifted from the UX-6 design model, canonical home now `@vida/core`.
- **`journalStillRenders(sections): boolean`** (`dashboard.ts`, S2) — anti-blank predicate (BR-3): false only when
  EVERY section errored. (`resolveDashboardStates` NOT ported — a fe 3-section-render helper, mismatches per-module output.)
- **`createJournalsService({db, deviceId, registry}): JournalsService`** (`service.ts`, S3) — factory-object, the
  composition root:
  - `buildDashboard(date, selection?)` — wraps the S2 engine over the injected registry.
  - `captureSnapshot(date): Promise<JournalSnapshot>` — freezes the FULL (unfiltered) summary — never the agenda —
    into one `journal_snapshots` row (`encryptedFields:[]`, single-row write, co-transactional `sync_queue`). Builds
    the return view explicitly (BR-S3-9: `journal_snapshots` is the first reduced-column table via the Repository;
    `create()` returns phantom `created_at`/`updated_at` — do not pass through).
  - `getJournal(date, {withLiveComparative?})` — snapshot-if-exists (latest `captured_at`, no UNIQUE) else live;
    malformed `sections_data` degrades to live; `withLiveComparative` attaches a live overlay. Realizes JR-6 today=live
    under the past-day capture policy (strict tz-aware today = design-pass).
  - `buildReview(period): Promise<ReviewData>` (S4) — reads `journal_snapshots` in `[period.from, period.to]`
    (latest-per-date, malformed skipped), composes a shell; throws `InsufficientHistory` when empty. Named-period→range
    math + Wrapped trajectory + `analytics.ts` presentation + scheduling/delivery = design-pass.
  - SEAM (N-3): `getSelection`/`setSelection` (no storage yet).

## Types (`services/journals/types.ts`)

- `JournalSelection = Record<string, readonly string[]>` (enabled dataPoint ids per module, S2) · `DashboardData
= { summary: SectionData[], agenda: SectionData[] }` (S2) · `JournalSnapshot` (id/snapshotDate/capturedAt/summary, S3)
  · `JournalView` (date/source:'snapshot'|'live'/summary/agenda?/capturedAt?/liveComparative?, S3) · `ReviewPeriod`
  (from/to/kind?, S4) · `ReviewData` (period/snapshots, S4).
- `HomeSectionKey = 'summary' | 'agenda' | 'entry'` (moved from `apps/web/src/home/section-model.ts`; backend owns it).
- `JournalContribution` `{ module, sectionKey, dataPoints[], summary(date), dueIn?(range) }` — `module` a plain string
  (JR-3); `dueIn` **optional** (summary-only modules; shared primitive per JR-5); providers may return a Promise.
- `SectionData` `{ sectionKey, module, dataPoints[], state: TerminalState, items? }` — `state` REUSES the
  `@vida/core` canon `['loading','empty','error','success']` (the docs' "populated" prose = `success`); `module` added
  for degrade attribution + ordering; `items` opaque-at-seam (`readonly unknown[]`).
- `DataPoint`, `DateRange` (YYYY-MM-DD).
- Typed errors (Error subclasses, stable `.name`): `ContributionFailed(module,date)` · `SnapshotMissing(date)` ·
  `InsufficientHistory(period)` · `ProviderUnavailable(module)`.

## Tests

- `services/journals/__tests__/registry.test.ts` — 8 pure-logic tests (S1): deterministic `list()` order,
  overwrite-dedup, empty/get-unknown edges, plain-module-string, dueIn-optional, error `.name`s, + a `@ts-expect-error`
  locking the `TerminalState` canon against `'populated'`.
- `services/journals/__tests__/dashboard.test.ts` — 10 pure-logic tests (S2): deterministic assembly, method-normalized
  membership, degrade isolation (never throws), async await, selection filter (summary-only), agenda unfiltered,
  empty registry, `journalStillRenders`, `resolveSelection` override-wins.
- `services/journals/__tests__/journals-service.test.ts` — 15 **live-store** tests (S3+S4, better-sqlite3 + migrate +
  initVault): [S3] capture writes one row + sync_queue enqueue, snapshot round-trip, summary-only freeze, live
  fallback, latest-wins, malformed→live degrade, withLiveComparative, unfiltered capture, buildDashboard composition;
  [S4] buildReview in-range composition + order, latest-per-date, out-of-range exclusion, InsufficientHistory (empty +
  all-malformed), malformed-skip.

## Registered contributions (first-consumer-pull — each module registers at its own build; no composition root at M1)

Shipped `register<X>Journal(registry, svc)` helpers (summary-only unless noted; the due-work agenda rides the SESSIONS
`dueIn()` lane, not `JournalContribution.dueIn` — JR-5 / SS-7): gamification · projects · habits · finance · books ·
knowledge · learning-education · purposes · relationships · notifications · **tasks (S9, 2026-10-19 —
`services/tasks/journal.ts`: the `/summary` SET per `cross-module-integration.md` §2; `utcDay` = the UTC-day
convention)**. Consequence (documented, not a defect): `buildDashboard().agenda` is EMPTY in M1 — no module registers
`dueIn` on its contribution; the journals→Sessions `dueIn()` bridge (contract.md:32) is the journals-side seam still
to pull.

## Not owned (delegated / cited — JR-1)

- **The journal ENTRY body** (today's `type:'journal'` page) is Notes-owned and rides `NotesService.ensureJournal`. Its
  Home cache key `['journal', date]` is read through the notes read-after-write barrier (`readAfterWrites(['journal:<date>'])`).
  A body write invalidates it plus `['calendar','journal']`, and the editor seeds from the notes latest-body overlay
  (notes-rescope R0 — `docs/modules/notes/current-business-rules.md` BR-R0-8/8a/8b).
  The journal `pages` row + NP-2 + the `/summary` block interface + the free-form TipTap entry → **Notes & Pages**;
  metric math → `analytics.ts` (present, never recompute, JR-10); review scheduling/delivery → Notifications + Sessions
  (Wave 4). The `apps/web/src/home` UX-6 placeholder migration to re-import these types → **fe-journals** first-consumer pull.
