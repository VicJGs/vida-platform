# Spec: feature:mod-journals · Slice 3 — snapshot store + service shell
Status: implemented      <!-- draft → approved → implemented -->  (Verification Gate PASS 2026-09-19: tsc 0 · 27/27 journals · 959/959 · eslint clean · live-store smoke)
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-09-19-mod-journals
Unit: mod-journals #39 (LIF-127) · M1.1.1 Backend · Slice 3 of 4 · composes S1 (registry) + S2 (buildDashboard)
Gate: §XXVI double-gate (this file = gate 1). Delivery: docs/features/journals/delivery/{interpretation,slice-map,seam-contract}.md

## 1. Identity
The **persistence slice + the service composition root**: `createJournalsService({db, deviceId, registry})` that
exposes `buildDashboard` (wrapping S2), and adds `captureSnapshot(date)` (freeze a day's summary into
`journal_snapshots`) + `getJournal(date)` (past → the frozen snapshot; today/never-captured → live). The **sole
live-persistence path** in this issue → the per-slice Verification Gate runs on the REAL store.

**What it is NOT:** not `buildReview` (S4), not the persisted selection (`getSelection`/`setSelection` remain seams,
N-3), not the past-no-snapshot "flagged fallback" or re-capture policy (design-pass, business-rules.md:44-45).

## 2. Business Rules
- **BR-S3-1 · A snapshot freezes the FULL summary (unfiltered) — JR-7 faithful record.** `captureSnapshot` aggregates
  the summary via `buildDashboard(date)` **without** selection; selection is a *read-time* presentation filter, never
  baked into the record `[FACT: business-rules.md:30-31 JR-7; conventions.md:12-13]`.
- **BR-S3-2 · A snapshot freezes SUMMARY only — never the agenda (IR-e2).** The agenda is forward (`dueIn`); freezing
  it into a past record is meaningless `[FACT: interpretation.md IR-e2; contract.md:19; business-rules.md:23-24 JR-5]`.
- **BR-S3-3 · Single-row write; `encryptedFields:[]`; vault required.** `captureSnapshot` does ONE
  `journal_snapshots` insert via `createRepository(db, journalSnapshots, {deviceId, encryptedFields:[]})` — the
  Repository owns the co-transactional `sync_queue` enqueue (IR-e3). **No `softDelete`** (the table has no `deleted_at`,
  IR-e). `initVault()` is required even with empty `[E]` — the sync-hash path runs regardless (IR-a)
  `[FACT: schema/journals.ts:26-41; db/repository.ts:236-497,339-340; memory m10-repos-use-empty-encryptedfields-seam]`.
- **BR-S3-4 · `getJournal(date)` — snapshot-if-exists else live (IR-e/IR-f); this REALIZES JR-6 "today = live".**
  Look up snapshots for `date`; if one exists return the **latest by `captured_at`** (no `UNIQUE(snapshot_date)`, IR-f)
  as `source:'snapshot'`; else re-aggregate `source:'live'`. This honors JR-6 "today = live" **under the capture
  policy** — snapshots are captured for *past* days, so none exists for the current day during it, and today falls to
  the live branch. The strict override ("today = live *even if* a snapshot was captured today") needs a timezone-aware
  "today" (the Brasília off-by-one hazard) → **design-pass**, consistent with capture-timing already being design-pass
  `[FACT: business-rules.md:27-31,44-45 JR-6; schema/journals.ts:38 no UNIQUE; memory calendar TZ-safe day-keying]`.
- **BR-S3-5 · Malformed `sections_data` degrades to live — never crashes (N-4).** `JSON.parse` in try/catch; a bad
  blob → fall back to live re-aggregation `[FACT: business-rules.md:42-43 degrade rule; interpretation.md N-4]`.
- **BR-S3-6 · `withLiveComparative` — snapshot + a live overlay (opt-in, not default).** When set AND a snapshot
  exists, attach a live `DashboardData` alongside the frozen summary `[FACT: business-rules.md:29 JR-6 "optional live comparative"]`.
- **BR-S3-7 · Snapshots are immutable.** No `update`/`delete` of a snapshot in this service; a captured day is frozen
  (re-capture-on-backfill is design-pass) `[FACT: business-rules.md:44-45; interpretation.md IR-e]`.
- **BR-S3-8 · A capture freezes what was aggregated, INCLUDING degraded sections.** If a provider errored during
  `captureSnapshot`, that `state:'error'` section is frozen as-is — a faithful record of that day (the section failed
  then). Retry/skip-on-capture is **design-pass** `[INTERP: business-rules.md:42-43 degrade + JR-7 faithful record]`.
- **BR-S3-9 · `journal_snapshots` is the FIRST reduced-column table (no `created_at`/`updated_at`) written via the
  Repository — construct the return view explicitly.** VERIFIED by probe: `repo.create` succeeds (Drizzle drops the
  non-column `created_at`/`updated_at` keys `createInTx` adds; `findAll`/`findWhere` return the real reduced row). BUT
  `create()`'s RETURN value carries phantom `created_at`/`updated_at` (and the `sync_queue` payload does too — harmless,
  opaque, M1.0-inert). → `captureSnapshot` builds `JournalSnapshot` from the values it controls (`id`, the `date` +
  `captured_at` it passed, the `summary` it serialized), never passing `create()`'s phantom fields through
  `[FACT: probe 2026-09-19 — repo.create(journalSnapshots) returns {…created_at,updated_at} but the row has neither column]`.

**Terminal states:** a snapshot — *pending* (no row for the date → `getJournal` returns `source:'live'`) · *captured*
(row exists → `source:'snapshot'`). `buildDashboard`'s own states are unchanged (S2).

## 3. Contract
Files: `packages/core/src/services/journals/{types.ts (edit), service.ts (new), index.ts (edit)}` + `__tests__/journals-service.test.ts`.

**`types.ts`** (add):
```ts
export interface JournalSnapshot {
  readonly id: string
  readonly snapshotDate: string          // YYYY-MM-DD
  readonly capturedAt: number            // Unix ms
  readonly summary: readonly SectionData[]
}
export interface JournalView {
  readonly date: string
  readonly source: 'snapshot' | 'live'
  readonly summary: readonly SectionData[]
  readonly agenda?: readonly SectionData[]      // live only (a snapshot froze summary only, BR-S3-2)
  readonly capturedAt?: number                  // snapshot only
  readonly liveComparative?: DashboardData       // when withLiveComparative + a snapshot exists (BR-S3-6)
}
```
**`service.ts`** (new):
```ts
export interface JournalsServiceDeps { db: DrizzleDb; deviceId: string; registry: JournalRegistry }
export interface JournalsService {
  buildDashboard(date: string, selection?: JournalSelection): Promise<DashboardData>
  captureSnapshot(date: string): Promise<JournalSnapshot>
  getJournal(date: string, opts?: { withLiveComparative?: boolean }): Promise<JournalView>
  // getSelection/setSelection — SEAM (N-3); buildReview — S4. Interface grows there.
}
export function createJournalsService(deps: JournalsServiceDeps): JournalsService
```
- `buildDashboard(date, sel?)` → wraps the S2 standalone `buildDashboard(deps.registry, date, sel)`.
- `captureSnapshot(date)` → `summary = (await buildDashboard(date)).summary` (unfiltered, BR-S3-1/2); `captured_at =
  Date.now()` (house convention `[FACT: CLAUDE.md Conventions Date.now()]`); `repo.create({snapshot_date:date,
  sections_data: JSON.stringify(summary), captured_at})`; return `{id, snapshotDate:date, capturedAt, summary}`.
- `getJournal(date, {withLiveComparative}?)` → `repo.findWhere(eq(snapshot_date, date))`; pick latest `captured_at`
  (BR-S3-4); parse `sections_data` (try/catch → live on malformed, BR-S3-5); snapshot → `{source:'snapshot', summary,
  capturedAt, [liveComparative if opt-in]}`; none → `{source:'live', summary, agenda}` from `buildDashboard(date)`.

Factory-object, hoisted closures, no `this.` `[FACT: services/preferences/service.ts; memory factory-service-no-this-for-intra-calls]`.

## 4. Acceptance (per-slice Verification Gate — LIVE STORE: better-sqlite3 + migrate + initVault)
- [ ] `captureSnapshot(date)` writes exactly one `journal_snapshots` row (real store); `initVault()` in setup — BR-S3-3
- [ ] `getJournal(pastDate)` after a capture returns `source:'snapshot'` with the round-tripped summary + `capturedAt` — BR-S3-4
- [ ] the snapshot freezes SUMMARY only — no `agenda` on a `source:'snapshot'` view — BR-S3-2
- [ ] `captureSnapshot` freezes the UNFILTERED summary (selection does not affect a capture) — BR-S3-1
- [ ] `getJournal(date-with-no-snapshot)` returns `source:'live'` with summary + agenda — BR-S3-4
- [ ] two snapshots for one date (different `captured_at`) → `getJournal` returns the LATEST — BR-S3-4 (IR-f)
- [ ] a malformed `sections_data` row → `getJournal` degrades to `source:'live'`, does not throw — BR-S3-5
- [ ] `getJournal(date, {withLiveComparative:true})` with a snapshot → `liveComparative` present — BR-S3-6
- [ ] `buildDashboard` via the service equals the standalone (wrap correctness) — S2 composition
- [ ] `tsc --noEmit` 0 errors; `@vida/core` full suite green — §XXVI Step 8

## 5. Implementation Prompt
1. **`types.ts`** — add `JournalSnapshot` + `JournalView` (§3). Import `DashboardData` already local.
2. **`service.ts`** — `createJournalsService(deps)`: build `repo = createRepository(deps.db, journalSnapshots,
   {deviceId: deps.deviceId, encryptedFields: []})` (no softDelete). Hoisted closures `buildDashboard`,
   `captureSnapshot`, `getJournal` per §3; `latestSnapshot(rows)` local (max `captured_at`); `parseSummary(raw)` local
   (try/catch → null). Import `buildDashboard as buildDashboardImpl` from `./dashboard`, `journalSnapshots` from
   `../../db/schema/journals`, `eq` from `drizzle-orm`. Satisfies BR-S3-1…7.
3. **`index.ts`** — add `export * from './service'`.
4. **`__tests__/journals-service.test.ts`** — live-store harness (mirror `preferences-service.test.ts`:
   `initVault` → better-sqlite3 `:memory:` → `migrate` → `createDrizzleProxy`). Register a fake contribution in a
   registry, wire the service. Cover every §4 checkbox; for latest-wins + malformed, insert rows directly via
   `createRepository(db, journalSnapshots, {deviceId, encryptedFields:[]})` with explicit `captured_at`/bad
   `sections_data`. Assert the `sync_queue` got a row on capture (co-transactional enqueue).
6. `pnpm --filter @vida/core typecheck` + `test` under **Node 24** → §4 done-check. Do NOT touch `apps/web`.

Done = §4 all checked.

## 6. Open UNKNOWNs / Decisions Needed
- None blocking. **Design-pass (deferred, grounded):** the past-vs-today distinction for a "flagged" `SnapshotMissing`
  fallback needs a clock/today input — `getJournal` uses snapshot-if-exists-else-live now; the *flag* is design-pass
  `[FACT: business-rules.md:44]`. Re-capture-on-backfill policy = design-pass (BR-S3-7). `SnapshotMissing`/`ProviderUnavailable`
  errors (S1) stay defined for their future consumers.

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-09-19 | 2026-09-19-mod-journals | S3 spec drafted (gate 1) |
