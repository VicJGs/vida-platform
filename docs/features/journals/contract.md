<!-- Contract — features/journals · /documentation Phase 2 · sources: note.ts JournalSummaryConfig L75-104 · notes-and-pages/contract.md (buildJournalSummary, /summary) · sessions-and-scheduling/contract.md (dueIn) · analytics.ts · docs/intake/journals.md -->

# Contract — Journals (level: Feature / integration layer)

> ⚠ INTENDED — `journal-service.ts` is **0 lines**. Notes & Pages already contracts `buildJournalSummary(date,
config)` at the block interface; THIS doc contracts the **engine + provider registry** behind it. Signatures
> are the documented target, not enforced reality.

## Exposed surface

### 1. The journal-contribution registry (the seam)

- **`registerJournalContribution(def)`** — a module registers its journal presence. `def` = `{ module,
section_key, dataPoints[] (advertised, user-selectable), summary(date) → SectionData, [reuses] dueIn(range) }`.
  Mirrors the `dueIn`/Session-effect/study-method registries — the journal names no module. `[INTENT: J2/J3]`

### 2. `journal-service` (the engine)

- **`buildDashboard(date, userSelection)`** — assembles the day: **summary** (iterate registry `summary(date)`
  for user-selected data points) + **agenda** (iterate `dueIn(today)`). Live for today. `[INTENT: J3; FACT: notes-and-pages buildJournalSummary]`
- **`captureSnapshot(date)`** — freezes the day's aggregated summary as a point-in-time record (JR-6/JR-7).
- **`getJournal(date)`** — past → snapshot (+ optional `withLiveComparative`); today → live. `[INTENT: J4]`
- **`buildReview(period, schedule)`** — composes snapshots over a user-defined time-frame into a Wrapped-style
  recap (improvement lens). Internals = design-pass. `[INTENT: J4]`
- **User selection** — `getSelection()/setSelection(perModule)` → global default in Preferences + per-journal
  override in `summary_config`. `[INTENT: J2/J4]`

## What it consumes (external — via documented integration points, never direct tables)

- **Every module (registered contributions):** `summary(date)` for the recap + `dueIn(range)` for the agenda.
  Present-day providers: Habits · Tasks · Sessions (study/review/…) · Finance (transactions) · Relationships
  (interactions) · Education (class schedule) · Routines · Reminders. `[FACT: note.ts JournalSummaryConfig 5 shipped + G5 INTENDED menu]`
- **Notes & Pages:** the journal `pages` row + the `/summary` block (Journals fills it) + the free-form editor
  surface + `[[links]]` (layered, J6). `[FACT: notes-and-pages/contract.md]`
- **Sessions & Scheduling:** the `dueIn()` primitive (agenda) + receives `surface_journal` effects (ADR-004).
- **Preferences:** the per-module selection default (JR-4). **`analytics.ts`:** computed metrics the reviews present (JR-10).
- **⚠ Forward-deps (stubbed, wire at their fill):** Purpose & Goals (goals/dreams/purposes progress — Wave 3) ·
  Gamification (streaks/XP in reviews — Wave 4) · Notifications + Sessions (scheduled review delivery — Wave 4).
- **Check-ins:** a registered section — integration **deferred** to the Check-ins module revisit (J8).

## Contract error cases (typed)

- `ContributionFailed(module, date)` — a `summary(date)` threw; that section degrades, others render.
- `SnapshotMissing(date)` — a past day with no snapshot → fall back to a flagged live re-aggregation (design-pass).
- `InsufficientHistory(period)` — a review lacks data → explicit "not enough yet", never a misleading recap.
- `ProviderUnavailable(module)` — an agenda `dueIn` lane failed; that lane degrades (shared with Sessions/Calendar).

## Completion checklist

- [x] exposed surface (registry + engine: dashboard/snapshot/review/selection) + consumed (modules/N&P/
      Sessions/Preferences/analytics) · [x] types/errors · [x] integration via documented points, no direct table
      access (§6) · [x] forward-deps flagged · [x] [FACT]/[INTENT] on each claim
