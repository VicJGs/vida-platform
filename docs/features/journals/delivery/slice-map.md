<!-- Slice Map — features/journals · Entity Delivery Flow Step 2 (Decomposition Gate)
     mod-journals #39 (LIF-127) · M1.1.1 — Hub & Foundation · Backend. Each slice tagged backend|frontend|shared.
     The backend slices are THIS unit; frontend slices are the ② fe-journals issue. Mode: DECIDE (net-new service). -->

# Slice Map — Journals (① backend engine + registry)

## Split summary
- **Backend (this unit, ① — 4 slices):** the aggregation engine, the contribution registry, the snapshot store, and
  the review compose-skeleton. Owns the ENGINE behind the block (JR-1).
- **Frontend (② fe-journals, deferred):** the Journal views (Calendar/List/Gallery), the Wrapped review UI, and the
  per-module selection controls. The Envision Gate fires there `[FACT: conventions.md:41-42 "Views deferred"; interpretation.md Step 1.5]`.
- **Delegated / not-owned (neither slice builds it):** the journal `pages` row + NP-2 + the `/summary` block interface
  + the free-form TipTap entry (→ Notes & Pages, JR-1); metric math (→ `analytics.ts`, JR-10); review
  scheduling/delivery (→ Notifications + Sessions, Wave 4). Cited, never authored here.

## Mode: DECIDE
Net-new service (`journal-service.ts` = 0 lines `[FACT: conventions.md:32]`). Not a ratify — but the *shape* is
doc-fixed by the aspect corpus + the ADR-004 registry precedent, so slicing is decide-the-cut, not invent-the-design.

## Backend slices (this unit) — linear dependency S1 → S2 → S3 → S4

### Slice 1 — Contribution registry + types + typed errors (backend · shared-consumed) — the seam foundation
The foundation every other slice rests on; **no store**, pure runtime + types.
- **1a · Canonical types → `@vida/core` (NOT `@vida/types`) — layering-forced.** `SectionData.state` is the
  `TerminalState` canon, which lives in `@vida/core/foundation/capability/types.ts` (`['loading','empty','error',
  'success']`) and `@vida/types` is the base layer that cannot import `@vida/core`
  `[FACT: foundation/capability/types.ts:14; packages/types imports no @vida/core; packages/core/package.json deps @vida/types]`.
  So `JournalContribution`/`SectionData`/`DataPoint`/`DateRange`/`HomeSectionKey` live in
  `packages/core/src/services/journals/types.ts` (barrel-exported), **reusing** the `TerminalState` canon by TYPE
  (never redefine; the docs' "populated" prose = the canon's `success` `[FACT: business-rules.md:52,57 vs
  foundation/capability/types.ts:14; memory design-model-reuses-canon-by-type-not-runtime]`). These **supersede** the
  local copies in `apps/web/src/home/journal-contribution.ts` + `HomeSectionKey` in `section-model.ts`
  `[FACT: journal-contribution.ts:6-39; section-model.ts:8]` — apps/web re-imports from `@vida/core`.
  (`JournalSummaryConfig` stays in `@vida/types/note.ts` — it's a `Page` field, references no `@vida/core` type
  `[FACT: note.ts:79-85]`; the S2 selection type is a separate concern.)
- **1b · Live registry → `@vida/core`** (architecture-forced home, interpretation resolution #1): `registerJournalContribution(def)`
  (replaces the throwing `apps/web` seam), an internal registry map keyed by `module` (dedup: re-register overwrites),
  and a **deterministic iteration accessor** (IR-a2 — declared `sectionKey` order, then `module` sort). ADR-004 registry
  pattern `[FACT: structure-data.md:44; conventions.md:9-11]`.
- **1c · Typed errors → `services/journals/types.ts`** (contract.md:38-42): `ContributionFailed(module, date)`,
  `SnapshotMissing(date)`, `InsufficientHistory(period)`, `ProviderUnavailable(module)`. Sessions `./types` precedent.
- **Verification Gate:** register 2 providers → deterministic iteration order; re-register dedups; `registerJournalContribution`
  no longer throws. (Pure logic — no live store needed here.)

### Slice 2 — `buildDashboard` + pure selection resolution (backend · shared-consumed) — the engine core
Composes S1's registry. **Pure logic — no db, no Preferences wiring** (the selection storage doesn't exist yet, N-3).
- **2a · `resolveSelection` + `JournalSelection` type (lifted from UX-6, cited).** `resolveSelection(globalDefault,
  perJournalOverride?)` — override-wins per module, no module dropped (BR-6); mirror `apps/web/src/home/selection.ts`
  exactly, canonical home = `@vida/core` (S1 lift pattern) `[FACT: apps/web/src/home/selection.ts resolveSelection]`.
- **2b · `buildDashboard(date, userSelection?)`** — iterate the registry: **summary** = each contribution's
  `summary(date)` (dataPoints filtered by the resolved selection for that module); **agenda** = each present
  `dueIn(today)`. Emit in the deterministic order (BR-S1-2/IR-a2). **Per-section degrade (IR-d):** wrap each provider
  call in try/catch → a throw yields a degraded `SectionData` (`state:'error'`, its `module`) + surfaces
  `ContributionFailed`, others render `[FACT: business-rules.md:42-43,60; conventions.md:22]`. `userSelection` is a
  PARAM (the ② UI passes it); with none, a computed default (all advertised dataPoints) applies. Live for today (JR-5/JR-6).
- **2c · degrade helpers (lifted from UX-6):** `resolveDashboardStates` + `journalStillRenders` (BR-3), canonical home
  `@vida/core` `[FACT: apps/web/src/home/section-state.ts]`.
- **SEAM (first-consumer-pull, N-3):** persisted `getSelection()`/`setSelection()` — need a Preferences
  journal-selection field + the `summary_config` per-module generalization, both **schema changes out of ① scope**.
  Documented, not built; `buildDashboard`'s param + `resolveSelection` cover the runtime need meanwhile.
- **Verification Gate:** multi-provider aggregation returns sections in deterministic order; a throwing provider
  degrades ONLY its section (rest render); selection filters dataPoints; `resolveSelection` override-wins. (Pure logic +
  fake providers — no live store; the live-store smoke is S3's.)

### Slice 3 — Snapshot store: `captureSnapshot` + `getJournal` (backend · shared-consumed) — persistence
Composes S2 (captureSnapshot freezes buildDashboard's summary). **The live-persistence slice.**
- **3a · `captureSnapshot(date)`** — aggregate the **summary** sections (IR-e2, NOT agenda) via S2, serialize to
  `sections_data` JSON (N-4), single-row insert into `journal_snapshots` (IR-e3) via `createRepository(db,
  journalSnapshots, { deviceId, encryptedFields: [] })` (IR-b) `[FACT: schema/journals.ts:26-41]`.
- **3b · `getJournal(date, { withLiveComparative? })`** — **today → live** `buildDashboard` (S2); **past → snapshot**:
  latest `captured_at` for the date (IR-f, no `UNIQUE(snapshot_date)`), parse `sections_data` (degrade on malformed,
  N-4), `SnapshotMissing` fallback to a flagged live re-aggregation (design-pass) `[FACT: contract.md:20,40; business-rules.md:27-31]`.
- **Verification Gate (LIVE STORE):** `initVault()` (IR-a) → `captureSnapshot` writes a real row → `getJournal(pastDate)`
  reads it back (round-trip); `getJournal(today)` returns live; malformed blob degrades; `SnapshotMissing` path.
  Real better-sqlite3 store, not fixtures.

### Slice 4 — `buildReview` compose-skeleton (backend · shared-consumed) — the improvement lens (skeleton)
Composes S3 (reads snapshots). **Skeleton only** — Wrapped math/scheduling/delivery = design-pass.
- **4a · `buildReview(period, schedule?)`** — resolve the period's date range (day/week/month/year + custom), read the
  snapshots in range (S3), compose into a review shell; **`InsufficientHistory` explicit** when a period lacks data
  (IR-g, never a misleading recap) `[FACT: business-rules.md:32-34,46-47; contract.md:21,41]`. Presents `analytics.ts`
  output — never recomputes (JR-10). Wrapped-composition internals + `schedule` delivery are documented design-pass seams.
- **Verification Gate:** a period with snapshots composes a shell; an empty period returns `InsufficientHistory`.

## Frontend slices — ② fe-journals (deferred, listed for the seam)
| Slice | Tag | Note |
|---|---|---|
| Journal views: Calendar / List / Gallery | frontend | consume the seam; VIEWS pass `[FACT: conventions.md:41]` |
| Wrapped review UI | frontend | renders `buildReview` output; Envision Gate applies |
| Per-module selection controls | frontend | calls `getSelection`/`setSelection`; the granular JR-4 UX |

## first-consumer-pull SEAMS (0 code now — pulled by the owner, per ADR-019 §3.5)
- **Provider registrations** — each module (Habits/Tasks/Finance/…) calls `registerJournalContribution` when it is
  built (N-2, JR-3). Journals ships the registry + iteration; providers wire in later.
- **`pages.summary_config` per-journal override read** — the Notes-consumer seam (N-3); resolves global-only until
  Notes & Pages' service exists.
- **Forward-deps** — Purpose/Gamification/Notifications contributions + review delivery (Wave 3/4); Check-ins section
  (J8) `[FACT: contract.md:34-36; conventions.md:39-40]`. Documented, never faked.

## Slice ordering & gate
Linear: **S1 → S2 → S3 → S4** (S2 needs S1's registry; S3 freezes S2's summary; S4 reads S3's snapshots). Each slice
runs its own §XXVI double-gate at implementation and closes with the **per-slice blocking Verification Gate** before
the next begins — no batching, no "owed" gate. Only S3 requires the live-store smoke (the sole persistence path).
