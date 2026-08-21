# DB-4 · Domain Group #20 — Journals · Unit Spec

**Task:** db-4-per-domain-schema (LIF-66) · **Group:** #20 of 21 active · **Profile:** Add Backend Component (5-phase schema-foundation)
**Migration slot:** `030_journals` (v30) · **Schema file:** `schema/journals.ts` · **Branch:** `db-4-per-domain-schema`
**Rerun:** NONE — `journals` was row-ALIGNED in the Part-1.2 sweep (no `part-1.2-reruns/journals.md`). The 5 aspect docs + `docs/intake/journals.md` (J1–J8 WHOLE, Victor 2026-07-12) are the sole source.

> The **lightest DB-4 group** — **1 net-new table** (`journal_snapshots`). Journals is the platform **INTEGRATION
> LAYER** (the aggregation engine above all modules) but almost all of it is **runtime code or owned-elsewhere**: the
> journal PAGE is Notes & Pages' `pages` row (already authored); the section registry is code (not a table); reviews +
> per-period rollups are design-pass (no table decided). Every shape is doc-determined; **zero build-decisions**,
> consistent with groups #1–#19.

## §0. Source model
Frontend/data source-of-truth = documented intent (`frontend-source-of-truth.md`). Ground truth for THIS unit:
`docs/features/journals/{identity,business-rules,structure-data,contract,conventions}.md` (all 5 aspects) ·
`docs/intake/journals.md` (J1–J8, **WHOLE**, Victor 2026-07-12) · **no rerun** (row ALIGNED) ·
`ADR-002 §5.2` (the `pages`/journal PAGE floor, L1266-1335 — **owned by Notes & Pages, referenced not duplicated**) ·
`ADR-002 §5.20 Stream (ii)` (journals is one of the 19 owed docs; named-not-enumerated → **this build IS the amendment**) ·
`packages/core/src/db/schema/notes.ts:36-65` (the authored `pages` row + `summary_config`) ·
`packages/types/src/note.ts:83-112` (the authored `JournalSummaryConfig` + `Page`).

## §1. Identity — what this unit is
The **aggregation engine + temporal dashboard** of the platform (identity.md). Two subsystems: the **daily dashboard**
(live `summary(date)` + `dueIn(range)` agenda, assembled through a provider registry) and the **temporal Review engine**
(day snapshots → user-defined periods → scheduled Wrapped-style recaps). It sits **above** all modules (depends downward;
nothing depends on it) — this is why it is a distinct context and not part of Notes & Pages (a Wave-0 foundation; if N&P
aggregated all modules it would depend on its own dependents → a cycle, JR-2).

**The schema footprint is a single frozen-record store.** The engine (`journal-service.ts`, 0 lines — INTENDED), the
provider registry, the dashboard assembly, and the reviews are **runtime code / design-pass**, not schema. This unit
authors only the **snapshot store** that the improvement lens reads: `journal_snapshots`.

### Scope boundary — doc-cited (author vs owned-elsewhere vs design-pass)
**AUTHOR (the FACT floor, structure-data.md "Owned by THIS context"):**
- **`journal_snapshots`** (NEW) — a point-in-time record of a day's aggregated summary (JR-6/JR-7): `id · snapshot_date ·
  sections_data [E] · captured_at · sync`. Each an encrypted blob (ZK/LWW). The one home for point-in-time journal data.

**OUT — owned elsewhere (referenced, NOT duplicated):**
- **The journal PAGE** — `pages` row `type='journal'` + `journal_date` (YYYY-MM-DD, NP-2 unique) + `summary_config [E]` +
  the free-form TipTap `content` — **Notes & Pages** (`schema/notes.ts:36-65`; `types/note.ts:83-112`). Journals fills the
  block; it never owns the row (JR-1). Already authored (group #1).
- **The `/summary` block + `buildJournalSummary(date, config)`** — Notes & Pages' block interface. Not schema.
- **The agenda `dueIn(range)` primitive** — Sessions-owned (ADR-004), shared with the Global Calendar. Not schema.
- **The per-module selection default** — Preferences (JR-4); the per-journal override is the **existing** `summary_config`
  column. No new column.
- **Metric computation** — `analytics.ts` (JR-10). Journals presents; never recomputes.

**OUT — design-pass (no table decided; authoring shape now = manufacturing for an undesigned subsystem):**
- **Reviews** (the Wrapped-style recap) — structure-data: *"No standalone review table decided yet (design-pass)."* The
  review-engine internals (period math, Wrapped composition, delivery scheduling) are explicitly a design-pass (J4).
- **Per-period rollup snapshots** — structure-data lists them "**Optionally** … for reviews" under the review design-pass.
  NOT the daily FACT floor → no `period`/`snapshot_type` discriminator authored (the `reading_plans`/`compound_sets`
  precedent — a base table with the deferred subsystem un-manufactured).
- **The section registry** — a **runtime** registry of module contributions (`module · section_key · dataPoints ·
  summary(date)`); structure-data: "NOT a table."

### Boundary — what this unit is NOT (doc-cited)
NOT the journal page/editor (N&P) · NOT `analytics.ts` · NOT the Global Calendar · NOT the review engine (design-pass) ·
NOT coupled to modules by name (registry seam, JR-3 — a code concern, no schema) · NOT tagged / NOT a measurable /
NOT a session / NOT ingest-AI (no such columns in the floor).

## §2. Business Rules (inherited invariants the shape honors)
- **ZK-1 [E] set:** `sections_data` is **`[E]`** (structure-data: "the frozen per-section data `-- [E]`"; conventions:
  "`-- [E]` on `sections_data`"). M1.0 = pass-through, marked via `@encrypted` JSDoc (the `summary_config` precedent).
  `snapshot_date` + `captured_at` are **plaintext** (temporal keys — snapshot lookup + ordering).
- **JR-6 — past = snapshot; today = live.** A past day renders the frozen `journal_snapshots` row; today re-aggregates
  live. The row is the faithful record of that day (refines Notes & Pages G7 — a cross-module note back, not a schema
  concern here).
- **JR-7 — a snapshot is a deterministic, date-keyed record.** `snapshot_date` (YYYY-MM-DD) keys it; `sections_data` IS
  the record → **NOT NULL** (a null contradicts "a faithful record of that day").
- **LF-2 / ZK/LWW:** full `syncColumns` (each snapshot syncs as an individually encrypted blob).
- **Frozen-record lifecycle (JR-6/JR-7):** a snapshot is captured once and frozen (backfill re-capture is a design-pass
  rule, JR-6 tension — NOT decided here). This is a ledger-style append record → **no `deleted_at`** (the floor omits it).

## §3. Intended shape — 1 table (FACT floor, cited)

### §3a. `journal_snapshots` `[FACT floor: structure-data.md "Owned by THIS context" · conventions.md naming/layout]`
Hand-composed column set (**not `baseColumns`** — the floor lists `captured_at` + `sync` and omits
`created_at`/`updated_at`/`deleted_at`; the `check_in_template_questions` reduced-column precedent, floor-governed):

| Column | Drizzle | SQL | Null | Note |
|---|---|---|---|---|
| `id` | `uuidPk()` | `TEXT PRIMARY KEY` | NOT NULL (pk) | UUIDv7 client-gen |
| `snapshot_date` | `calendarDate('snapshot_date')` | `TEXT NOT NULL` | NOT NULL | YYYY-MM-DD; the day this freezes (JR-7). plaintext |
| `sections_data` | `text('sections_data')` **[E]** | `TEXT NOT NULL` | NOT NULL | frozen per-section JSON; `@encrypted`, app-stringified (the `summary_config` pattern, NOT `json<T>()`) |
| `captured_at` | `timestampMs('captured_at')` | `INTEGER NOT NULL` | NOT NULL | Unix-ms; when the snapshot was frozen |
| `_sync_*` ×6 | `...syncColumns` | 6 cols | per `_shared` | ZK/LWW blob metadata |

- **Index:** `index('idx_journal_snapshots_date').on(snapshot_date)` — supports `getJournal(date)` lookups (mirrors
  `idx_pages_journal_date`, `notes.ts:62`). **No `UNIQUE`** — one-per-date is NP-2's rule for *pages* (JR-1 boundary),
  never stated for *snapshots*; backfill re-capture is design-pass, so a UNIQUE would encode an undecided rule.
- **No cross-table FK** (ADR-016 §3.4). `snapshot_date` links to the `pages` journal by date at the app layer, no
  `REFERENCES`.
- **No CHECK** — zero enum columns (no FIXED vocab), no numeric-range column.

## §4. Physical home & authoring model
- `packages/core/src/db/schema/journals.ts` (NEW) — 1 Drizzle mirror (`journalSnapshots`, query-type only). Hand-composed
  `{ id: uuidPk(), snapshot_date, sections_data, captured_at, ...syncColumns }`. No `baseColumns`, no `deleted_at`.
- `packages/core/src/db/migrations/030_journals.ts` (NEW) — hand-written SQL DDL (1 `CREATE TABLE` + 1 `CREATE INDEX`),
  `up()` only, no self-transaction. Registered in `migrations/runner.ts` `ALL_MIGRATIONS` (import + array append).
- `schema/index.ts` barrel += `export * from './journals'`.
- `db/tests/journals-introspection.test.ts` (NEW) — mirror #16/#19; apply migration 030 in-memory (better-sqlite3 +
  `PRAGMA table_info`), diff the real table vs the Drizzle mirror on **col-set · nullability · pk · defaults** (1 table ×4).

**NOT edited (doc-cited, not omissions):**
- **No `@vida/types` change** — zero enum columns → no tuple, no CHECK, no validator, no `enum-parity.test.ts` row. The
  `JournalSnapshot` interface is the standing **DB-11** mirror-only carry-forward (§P3.4), never a per-unit choice.
- **No `_registry.ts` `ENTITY_TYPES` append** — a snapshot is an internal record addressed by `snapshot_date`, not a
  `pages`/`entity_links`/`entity_tags` target (the `task_time_logs`/`habit_completions`/`project_documents` precedent).
  `'journal'` already exists (`_registry.ts:8` — the pages type, not the snapshot).
- **No ADR-002 §5 body edit** — §5.20 Stream (ii) is named-not-enumerated; the consolidated §5 re-write is deferred to its
  own session (D5-a). **This DB-4 authoring + the §XXIX current-* promotion ARE the amendment mechanism** (the stale-source
  rule; the prior net-new groups #9/#14 pattern). No hand-edit of the pre-amendment-v1 §5 body.

## §5. Phase-1 completion checklist
- [x] all 5 aspects read + intake J1–J8 (WHOLE); roster = `structure-data.md` authoritative; no rerun (row ALIGNED)
- [x] the `pages` journal PAGE + `summary_config` + `JournalSummaryConfig` confirmed **already authored** (N&P #1) → referenced, not re-authored
- [x] `journal_snapshots` confirmed absent on disk (grep-clean); the sole net-new table
- [x] `deleted_at`=NONE + reduced column set (no `created_at`/`updated_at`) are **documented FACTs** (floor lists `captured_at`+`sync`; `check_in_template_questions` precedent). NOT flagged calls.
- [x] no enums (no CHECK/tuple/validator); no-FK; no tags; no measurement; no session; no ingest-AI; reviews/rollups=design-pass; registry=code — **zero build-decisions**

### Shape resolutions — ALL doc-determined (ZERO decisions for Phase 3)
1. **Column set = `id + snapshot_date + sections_data + captured_at + syncColumns`** (documented FACT). structure-data lists
   exactly `id · snapshot_date · sections_data [E] · captured_at · sync`; `captured_at` IS the timestamp, so `created_at`/
   `updated_at` are absent (the reduced-column `check_in_template_questions` precedent; `pk==['id']` holds). Not `baseColumns`.
2. **`deleted_at` = NONE** (documented FACT). The floor omits it; a snapshot is a frozen ledger record (the
   `habit_completions`/`interactions` ledger precedent — the JR-6/JR-7 frozen-record lifecycle).
3. **`sections_data` NOT NULL** — it IS the frozen record (JR-7 "a faithful record of that day"); a null contradicts the
   invariant. Payload-column convention. `[E]` via `@encrypted` JSDoc, plain `text()` (the `summary_config` pattern).
4. **`snapshot_date` plain index, no UNIQUE** — index supports date lookups (`idx_pages_journal_date` precedent); one-per-date
   is NP-2 for *pages* not *snapshots*, and backfill re-capture is design-pass → no manufactured UNIQUE.
5. **No `period`/rollup discriminator** — reviews + per-period rollups are design-pass (structure-data "no review table
   decided yet"; "optionally … for reviews"). Author the daily FACT floor only (the `reading_plans` un-manufactured precedent).
6. **No `ENTITY_TYPES` append / no `@vida/types` edit / no ADR-002 §5 body edit** — §4 boundary (internal record; no enums;
   named-not-enumerated §5.20).

## Phase 2 — Current-state read (reconcile-and-extend baseline)
### Already authored — DO NOT re-create / reference only
- `pages` row (`type='journal'`, `journal_date`, `summary_config [E]`, NP-2 partial UNIQUE) — `schema/notes.ts:36-65`.
- `JournalSummaryConfig` + `Page` interfaces — `types/note.ts:83-112`. `'journal'` PAGE_TYPE + ENTITY_TYPE — `note.ts:14`,
  `_registry.ts:8`.
- `dueIn()` (Sessions), `analytics.ts`, Preferences selection default — consumed at runtime, not schema.

### To author — 1 table, clean-add
`journal_snapshots` (`schema/journals.ts`) + `030_journals.ts` (+runner) + `index.ts` barrel + `journals-introspection.test.ts`.
All absent (grep-clean). No `@vida/types` / `_registry` / `enum-parity` / ADR-002-body edit.

### Baseline verdict
**Append-only** clean-add (unlike #16 which edited `@vida/types`): the `@vida/types` layer is untouched (no enums; interface
= DB-11). Pattern = `health-training.ts` / `029_health_training.ts` / `health-training-introspection.test.ts`, reduced to a
single table with the reduced column set of `check_in_template_questions`.

## Phase 3 — Implementation Plan (gate-1 draft)
### §P3.1 — Exact DDL intent (`030_journals.ts`)
```sql
CREATE TABLE journal_snapshots (
  id              TEXT PRIMARY KEY,
  snapshot_date   TEXT NOT NULL,       -- YYYY-MM-DD (JR-7 date key)
  sections_data   TEXT NOT NULL,       -- [E] frozen per-section JSON (app-stringified)
  captured_at     INTEGER NOT NULL,    -- Unix ms (when frozen)
  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT
);
CREATE INDEX idx_journal_snapshots_date ON journal_snapshots(snapshot_date);
```
- `up()` only, inside the runner's BEGIN/COMMIT wrapper (no self-transaction). No CHECK, no UNIQUE, no FK.
- Drizzle mirror matches 1:1: `sqliteTable('journal_snapshots', { id: uuidPk(), snapshot_date: calendarDate('snapshot_date').notNull(), sections_data: text('sections_data').notNull() /* @encrypted [E] */, captured_at: timestampMs('captured_at').notNull(), ...syncColumns }, (t) => [index('idx_journal_snapshots_date').on(t.snapshot_date)])`.

### §P3.2 — Registry & validators
**None.** No `ENTITY_TYPES` append, no enum tuple, no validator, no `enum-parity.test.ts` row (no enums in this group).

### §P3.3 — Files, migration, tests
`schema/journals.ts` (NEW) · `migrations/030_journals.ts` (NEW, + runner import/append) · `schema/index.ts` barrel +=
`export * from './journals'` · `db/tests/journals-introspection.test.ts` (NEW; 1 table ×4 dims). `pnpm typecheck` 0 ·
`@vida/core` tests green · eslint 0.

### §P3.4 — DB-11 deferrals (cited, not fixed here)
`@vida/types` `JournalSnapshot` interface (mirror of `journalSnapshots.$inferSelect`) — the standing DB-11 mirror-only
carry-forward. Not authored now (the introspection test diffs SQL vs the Drizzle mirror — the mirror is the oracle when no
interface exists yet, per the #16 introspection header).

### §P3.5 — Plan checklist (pre-critique)
- [ ] `journal_snapshots` authored SQL + Drizzle mirror parity (col-set/nullability/pk/defaults) · [ ] index present, no UNIQUE/CHECK/FK
- [ ] introspection 1×4 green · [ ] runner registers 030 (v30) · [ ] index.ts barrel · [ ] typecheck/lint 0 · [ ] §XXIX currency (current-spec + current-business-rules, BR-JR-*)

## §4-Acceptance (Definition of Done)
- `journal_snapshots` exists with EXACTLY the §3a columns; nullability/pk/defaults match the Drizzle mirror (introspection green).
- Migration 030 applies clean (runner v30); `LATEST_VERSION === 30`.
- No enum/CHECK/UNIQUE/FK/`deleted_at`/`ENTITY_TYPES`/`@vida/types`/ADR-002-body change (the §4 boundary holds).
- `pnpm typecheck` 0 · `@vida/core` full suite green · eslint 0.
- §XXIX: `docs/modules/journals/current-spec.md` + `current-business-rules.md` promoted (BR-JR-1…n), commit-together.
