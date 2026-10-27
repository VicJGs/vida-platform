<!-- Structure & Data — features/journals · /documentation Phase 2 · sources: ADR-002 pages/journal L1266-1310 · note.ts JournalSummaryConfig L75-104 · notes-and-pages/structure-data.md · docs/intake/journals.md -->

# Structure & Data — Journals (level: Feature / integration layer)

> ⚠ **Mostly INTENDED + owned-elsewhere.** The journal PAGE is Notes & Pages' `pages` row (documented). This
> context adds the **snapshot store** + the **section-registry config**; `journal-service.ts` is 0 lines.

## Data model

### Owned by Notes & Pages (referenced, NOT duplicated)

- The journal is `pages` where `type='journal'`, `journal_date` (YYYY-MM-DD, NP-2 unique), `summary_config`
  `-- [E]`, plus `content` (the free-form TipTap entry). `[FACT: ADR-002 L1274-1310; note.ts Page L87-108]`
  Journals reads/fills this; it does not own the table. `[[../notes-and-pages/structure-data]]`

### Owned by THIS context (INTENDED → ADR-002 amendment)

- **`journal_snapshots`** (NEW) — a point-in-time record of a day's aggregated summary (JR-6/JR-7): `id ·
snapshot_date · sections_data -- [E] (JSON: the frozen per-section data) · captured_at · sync`. Each an
  encrypted blob (ZK/LWW). Optionally per-period rollup snapshots for reviews. `[INTENT: J4]`
- **The section registry** — a runtime registry (code) of module contributions (`module · section_key ·
dataPoints · summary(date)`); NOT a table. The user's **selection** persists as: global default in
  **Preferences** + per-journal override in `pages.summary_config` (existing field, generalized from the
  5-toggle `JournalSummaryConfig` to a per-module granular selection). `[INTENT: J2; FACT: note.ts L75-81, L104]`
- **Reviews** — composed from `journal_snapshots` over a user-defined period; the schedule (when to receive)
  is a scheduled item (⚠ forward-dep: Sessions `planned`/Notifications). No standalone review table decided
  yet (design-pass). `[INTENT: J4]`

### Superseded / refined

- **`JournalSummaryConfig` (5 fixed toggles)** `[FACT: note.ts L75-81]` → a **per-module granular selection**
  over the registry (JR-4). The 5 shipped toggles are the current subset; the type generalizes.
- **Notes & Pages G7 (live-only)** → **refined**: live-today + snapshot-past + optional comparative (JR-6).
  Cross-module note back to Notes & Pages.

## Dependencies / graph

- **Position:** the **integration layer** — sits **above** all feature modules (depends on them + Notes &
  Pages); nothing depends on Journals except the user surface. Documenting it **closes Wave 2**. `[FACT: J1 dep-graph argument]`
- **In-edges (registered providers):** every module's `summary(date)` + `dueIn(range)` (Habits, Tasks,
  Sessions, Finance, Relationships, Education, Routines, Reminders, …). Future: Purpose, Gamification.
- **Out-edges:** none that write — Journals reads via the registry and renders into the Notes-owned page. Its
  reviews consume `analytics.ts` output.
- **Coupling budget:** the registry keeps Journals decoupled — it depends on the **contribution contract**,
  not on 17 modules by name (JR-3). This is what prevents the god-context.

## ADRs / structural decisions

- **No new ADR.** Reuses the established provider-primitive pattern (ADR-004 `dueIn` + the registry seam) —
  Journals is the 4th consumer of it (after the Scheduler, the Global Calendar, and study-methods). `[FACT: ADR-004]`
- **ADR-002 amendment (Journals slice)** — add `journal_snapshots`; generalize `summary_config` to the
  per-module selection; (optional) period-rollup snapshots. Consolidate with the standing amendment.
- **Review engine design-pass** — snapshot timing/backfill + period math + Wrapped composition + delivery.

## Single source of truth (constitution §3)

- **The journal page** — Notes & Pages (`pages`); never duplicated here.
- **"What's due"** — the shared `dueIn()` primitive (Sessions-owned); Journals + Calendar both read it.
- **Metric computation** — `analytics.ts`; Journals presents, never recomputes.
- **A day's frozen record** — `journal_snapshots` (the one home for point-in-time journal data).

## Completion checklist

- [x] data model (owned-elsewhere referenced + the INTENDED snapshot store/registry) · [x] dep graph within
      budget (registry decouples) · [x] ADRs (no new; ADR-002 amendment + design-pass) · [x] single source per
      cross-cutting concept · [x] [FACT]/[INTENT] + refinements flagged loud
