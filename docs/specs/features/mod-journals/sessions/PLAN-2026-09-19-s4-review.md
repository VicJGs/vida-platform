# Spec: feature:mod-journals · Slice 4 — buildReview compose-skeleton

Status: implemented <!-- draft → approved → implemented --> (Verification Gate PASS 2026-09-19: tsc 0 · 33 journals · 965/965 · eslint clean)
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-09-19-mod-journals
Unit: mod-journals #39 (LIF-127) · M1.1.1 Backend · Slice 4 of 4 · composes S3 (snapshot store)
Gate: §XXVI double-gate (this file = gate 1). Delivery: docs/features/journals/delivery/{interpretation,slice-map,seam-contract}.md

## 1. Identity

The **improvement-lens skeleton**: `buildReview(period)` composes the day-snapshots in a user-defined date range into a
review shell, with an explicit `InsufficientHistory` when the period is empty. The last slice of the ① engine.

**What it is NOT:** not the Wrapped-style trajectory math, not the `analytics.ts` metric presentation, not named-period
→ date-range resolution (week/month/year boundaries), not scheduling/delivery — **all design-pass** (JR-8/JR-9,
`identity.md:48-49`; `analytics.ts` is 0 lines). It composes snapshots; it never recomputes metrics (JR-10).

## 2. Business Rules

- **BR-S4-1 · Reviews compose SNAPSHOTS over a date range (JR-8).** `buildReview(period)` reads `journal_snapshots`
  where `snapshot_date ∈ [period.from, period.to]` (inclusive; lexicographic on `YYYY-MM-DD`), deduped to the **latest
  `captured_at` per date** (IR-f — same rule as `getJournal`), ordered by date `[FACT: business-rules.md:32-34 JR-8;
schema/journals.ts:38 no UNIQUE]`.
- **BR-S4-2 · Insufficient history is EXPLICIT, never a misleading recap.** A period with no valid snapshot → throw
  `InsufficientHistory(label)` (the S1 typed error) `[FACT: contract.md:41; business-rules.md:46-47]`.
- **BR-S4-3 · Compose, don't compute (JR-10).** `buildReview` returns a `ReviewData` shell = `{ period, snapshots }`;
  it NEVER re-implements metric math. The trajectory/Wrapped composition + the `analytics.ts` presentation are
  **design-pass** `[FACT: business-rules.md:38-39 JR-10; identity.md:48-49; conventions.md:18-19]`.
- **BR-S4-4 · Named-period → range resolution is DESIGN-PASS.** `buildReview` takes an explicit `{from,to}` range; the
  week/month/year/custom (bi-week/bimester/semester) boundary math is the caller's / a later pass `[FACT: business-rules.md:32
"day/week/month/year + custom"; identity.md:48 "the period math … design-pass"]`. `period.kind` is a free label.
- **BR-S4-5 · Scheduling/delivery is DESIGN-PASS.** No `schedule` param in the skeleton — "the user plans when to
  receive" + delivery ride Notifications/Sessions (Wave 4) `[FACT: contract.md:34-35; business-rules.md:32-34 JR-8]`.
- **BR-S4-6 · Malformed snapshot rows are skipped** (a bad `sections_data` doesn't abort the review — reuses the S3
  `parseSummary` degrade) `[FACT: business-rules.md:42-43; interpretation.md N-4]`.

**Terminal states (review):** insufficient-data (throws `InsufficientHistory`) · composed (the shell). generating /
delivered / scheduled = design-pass `[FACT: business-rules.md:55]`.

## 3. Contract

Files: `packages/core/src/services/journals/{types.ts (edit), service.ts (edit)}` + extend `__tests__/journals-service.test.ts`.

**`types.ts`** (add):

```ts
export interface ReviewPeriod {
  readonly from: string // YYYY-MM-DD (inclusive)
  readonly to: string // YYYY-MM-DD (inclusive)
  readonly kind?: string // free label: 'week' | 'month' | … (named→range resolution is design-pass)
}
export interface ReviewData {
  readonly period: ReviewPeriod
  readonly snapshots: readonly JournalSnapshot[] // latest-per-date, ordered by date
}
```

**`service.ts`** — extend `JournalsService`:

```ts
buildReview(period: ReviewPeriod): Promise<ReviewData>
```

`buildReview(period)` → `repo.findWhere(and(gte(snapshot_date, period.from), lte(snapshot_date, period.to)))`; group
by `snapshot_date`, keep the latest `captured_at` per date (reuse `latestByCapturedAt`); parse each `sections_data`
(skip malformed, BR-S4-6); order by `snapshot_date`; if 0 valid → `throw new InsufficientHistory(period.kind ??
\`${period.from}..${period.to}\`)`; else return `{ period, snapshots }`.

## 4. Acceptance (live store — same harness as S3)

- [ ] `buildReview` over a range with 2 snapshotted dates returns both, ordered by date, latest-per-date — BR-S4-1
- [ ] a range with 2 snapshots for the SAME date returns the latest `captured_at` only — BR-S4-1 (IR-f)
- [ ] a range with no snapshots throws `InsufficientHistory` (name/instanceof) — BR-S4-2
- [ ] snapshots OUTSIDE the range are excluded — BR-S4-1
- [ ] a malformed snapshot in-range is skipped, not fatal; other dates still compose — BR-S4-6
- [ ] `ReviewData.snapshots` carries the round-tripped summaries (compose, not recompute) — BR-S4-3
- [ ] `tsc --noEmit` 0 errors; `@vida/core` full suite green — §XXVI Step 8

## 5. Implementation Prompt

1. **`types.ts`** — add `ReviewPeriod` + `ReviewData` (§3).
2. **`service.ts`** — import `gte, lte, and` from `drizzle-orm` (extend the `eq` import); add a hoisted `buildReview`
   closure per §3; reuse `latestByCapturedAt` + `parseSummary`; map each kept row → `JournalSnapshot`
   (`{id, snapshotDate: row.snapshot_date, capturedAt: row.captured_at, summary: parsed}`); throw `InsufficientHistory`
   (import from `./types`) when empty; add `buildReview` to the returned object + the `JournalsService` interface.
   Satisfies BR-S4-1…6.
3. **`__tests__/journals-service.test.ts`** — add a `describe('buildReview')` block covering every §4 checkbox; seed
   rows via `createRepository(db, journalSnapshots, …)` with explicit `snapshot_date`/`captured_at`/`sections_data`.
4. `pnpm --filter @vida/core typecheck` + `test` under **Node 24** → §4 done-check. Do NOT touch `apps/web`.

Done = §4 all checked. **This closes the ① backend issue** → pre-ship `/critique` + `victor:quality-gate-engineering`.

## 6. Open UNKNOWNs / Decisions Needed

- None blocking. **Design-pass (deferred, grounded):** named-period→range math (BR-S4-4), Wrapped trajectory + the
  `analytics.ts` presentation (BR-S4-3), scheduling/delivery (BR-S4-5). All cite their source; none is invented away.

## 7. Change Log

| Date       | Session                 | Change                   |
| ---------- | ----------------------- | ------------------------ |
| 2026-09-19 | 2026-09-19-mod-journals | S4 spec drafted (gate 1) |
