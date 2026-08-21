# DB-4 · Domain Group #1 — Notes & Pages · Unit Spec

> **Unit:** the DB-4 per-domain schema build for the **Notes & Pages** domain group (the in-degree-14 hub) —
> Stream (ii) of the M1.0 schema foundation.
> **Issue:** LIF-66 · M1/M1.0 `#10` · profile **add-backend-component** · ← DB-1 ✅ · ← DB-3 ✅ (substrate spine).
> **Flow:** the 5-phase lifecycle in `docs/roadmap/schema-foundation-build-flow.md §2`. **This file = Phase 1 (Intent
> intake).** Phase 2 (current-state read) + Phase 3 (plan double-gate) append their sections below.
> **No-Guessing:** every claim `[FACT: src]` / `[INTERP]` / `[INTENT]` / `[UNKNOWN]`. Ship-scope trimming is **forbidden
> in Phase 1** — a foundation intakes the WHOLE documented intent so nothing is silently omitted
> (`[[intake-captures-intent-not-ship-scope]]`).

## §0. Source model
Backend schema unit — the frontend source-of-truth guard (`docs/specs/foundation/frontend-source-of-truth.md`) is
**N/A** (no DS/UI/UX token surface). The intent source here is the **`docs/features/notes-and-pages/` 5-aspect spec**
(`structure-data · identity · business-rules · contract · conventions`), which is itself sourced from **ADR-002 §5.2**
(the As-is DDL — flagged stale, see §3), **ADR-006** (universal tags/links/registry), **ADR-004 §3.1** (pomodoro
re-home), **ADR-007** (saved views), and `@vida/types/note.ts` (the canonical enum tuples + entity interfaces).

## §1. Identity — what this unit is
DB-4 / Notes & Pages authors the **net-new domain tables the Notes & Pages hub owns** on top of the finished DB-3
substrate. Because ADR-006 (universal tagging) and ADR-004 (pomodoro re-home) already moved this feature's tagging and
timer tables into the **AR-6 Spaces substrate** and the **Sessions realm** respectively, the net-new authoring surface
is **three tables — `pages`, `page_links`, `note_attachments`** — plus the `ENTITY_TYPES` reconcile and the RETIRE
verification. `pages` is the polymorphic hub every other module's `*_note` attachment and every `[[wiki-link]]` /
backlink hangs off. `[FACT: notes-and-pages/structure-data.md §[INTENT]:31; schema/foundation/spaces.ts]`

**Boundary (what this unit is NOT):**
- **NOT** `tags` / `entity_tags` / `entity_links` — those are **already authored** in the AR-6 substrate
  (`schema/foundation/spaces.ts`, migration 003); N&P is a **consumer** of the universal tag/link primitive, not their
  owner (ADR-006 §3.1). `[FACT: spaces.ts L34-79; current-spec.md L153]`
- **NOT** `pomodoro_sessions` — retired; re-homed to the Sessions realm as the `focus_sessions` extension of the
  `sessions` supertype (`session_id`), authored by **domain group #3 (Sessions & Scheduling)**. The `/pomodoro` block is
  a widget-lens, not an owned table here. `[FACT: ADR-004 §3.1; notes-and-pages/structure-data.md §[INTENT]:30]`
- **NOT** `page_tags` — retired to the universal `entity_tags` (ADR-006 §3.1); verify absent, do not author. `[FACT: notes-and-pages/business-rules.md NP-9 [INTENT]]`
- **NOT** the FTS5 `fts_pages` virtual table — that is **DB-8** (FTS5), not DB-4. `[FACT: current-spec.md L186 "DB-8 FTS5"]`
- **NOT** encryption wiring (DB-5 / M3): the `[E]` fields below are declared for M3 activation but inert in M1.0
  (repository pass-through over the empty active set, BR-DB6-3). `[FACT: ADR-017:20; repository.ts]`
- Authoring model: **hand-written SQL migration** (ADR-016 §3.5 — no drizzle-kit) + a Drizzle query-mirror module
  (`schema/foundation/…` or `schema/notes.ts` — physical home resolved in P2/P3) + `ENTITY_TYPES` reconcile.

## §2. Business Rules (inherited invariants — the intake honors these)
Every table this unit authors is a normal **syncable** table upholding `database-layer/current-business-rules.md`
(UUIDv7 PK · Unix-ms timestamps · INTEGER bool/money · TEXT enums with SQL `CHECK` + Zod for FIXED enums, OPEN vocab =
plain TEXT no CHECK · the 6 `_sync_*` columns · polymorphic `entity_type` from `_registry.ts` · soft delete · three-layer
encryption) and the feature invariants **NP-1…NP-9** (`notes-and-pages/business-rules.md`). `[FACT: those two docs]`
- **BR-N1 — `pages.type` is a FIXED enum → SQL CHECK.** The 6 `PAGE_TYPE` values are closed (new page kinds require a
  schema change, identity.md "Not an open page-type system"). CHECK sourced from the `PAGE_TYPE` tuple in `note.ts`
  (`enumText('type', PAGE_TYPE)` mirror + hand-written CHECK in the migration). Contrast `pages.entity_type` (OPEN,
  no CHECK — see BR-N2). `[FACT: note.ts PAGE_TYPE; identity.md:17; [[open-vocab-columns-take-no-sql-check]]]`
- **BR-N2 — `pages.entity_type` is OPEN → plain TEXT, NO CHECK.** The polymorphic "what this note is attached to" is
  validated app-layer against `_registry.ts`, mirroring the `entity_links`/`entity_tags` precedent (spaces.ts). A CHECK
  here would silently forbid a domain that has not yet registered its type. `[FACT: spaces.ts L56,72; _registry.ts; [[open-vocab-columns-take-no-sql-check]]]`
- **BR-N3 — `pages.content` is CRDT, not LWW.** Schema-wise `content` is one `TEXT [E]` column; the Yjs machinery is
  ADR-003 runtime, not DDL. The column is authored; no per-column sync flag exists at the schema layer (NP-4). `[FACT: ADR-003; note.ts L99]`
- **BR-N4 — NP-2 one-journal-per-date** is a **partial UNIQUE index** (`WHERE type='journal' AND deleted_at IS NULL`),
  not a column constraint — authored in the migration. `[FACT: ADR-002 L1335; business-rules NP-2]`
- **BR-N5 — RETIRE = absent, not migrated-away.** The v2 surface is authored from zero (no local v1 rows in M1.0), so
  RETIRE (`page_tags`, `pomodoro_sessions`, `slug`) = verify the token never appears in `schema/`, not a data migration.
  `[FACT: storage-rebuild-strategy; BR-DB3-4 precedent]`

---

## §3. Intent ledger (Phase 1 intake — the FULL Notes & Pages set)

### 3a. FACT floor — the 7 As-is tables (ADR-002 §5.2, **flagged STALE**)
`[FACT: ADR-002 §5.2 L1292-1461; note.ts]` — ADR-002 §5.2 self-declares "pre-amendment v1 … stale" (L22). Recorded so
the divergence stays visible; the forward set is 3b.

| As-is table | Fate under intent | Authoritative forward source |
|---|---|---|
| `pages` | **AUTHOR (this unit)** | ADR-002 §5.2 shape + note.ts `Page` |
| `page_links` | **AUTHOR (this unit)** | ADR-002 §5.2 shape + note.ts `PageLink` |
| `note_attachments` | **AUTHOR (this unit)** | ADR-002 §5.2 shape + note.ts `NoteAttachment` |
| `entity_links` | **DONE — AR-6 substrate** (OPEN registry, no CHECK) | `schema/foundation/spaces.ts` L67-79 |
| `tags` | **DONE — AR-6 substrate** (nestable `parent_tag_id`) | `spaces.ts` L34-48 |
| `page_tags` | **RETIRE → `entity_tags`** (verify absent) | ADR-006 §3.1; `spaces.ts` `entityTags` |
| `pomodoro_sessions` | **RE-HOME → Sessions group #3** (`focus_sessions`) | ADR-004 §3.1 |

### 3b. The 3 ADD tables this unit authors
`[FACT: ADR-002 §5.2 (shape) + note.ts (columns) + the live no-FK convention (spaces.ts:20-22)]`

All three are **fully shape-determined by the docs** (no open decisions — see §4). Base = full `baseColumns` +
`deleted_at`; all cross-table/self refs = **plain TEXT + index, no SQL FK** (live convention, §4).

| # | Table | Encrypted `[E]` | Key constraints (all doc-determined) | Readiness |
|---|-------|-----------------|--------------------------------------|-----------|
| 1 | `pages` | `title` · `content` · `cover_image` · `summary_config` | `type` CHECK(6) FIXED; `entity_type` OPEN no-CHECK; partial UNIQUE on `journal_date` where `type='journal' AND deleted_at IS NULL`; `parent_id` self-ref (plain TEXT, no FK); indexes `type` / `journal_date` / `(entity_type,entity_id)` / `deleted_at` | ✓ shape-locked |
| 2 | `page_links` | `context` | `source_page_id` · `target_page_id` (plain TEXT, no FK); `UNIQUE(source_page_id, target_page_id)`; index on `target_page_id` | ✓ shape-locked |
| 3 | `note_attachments` | `filename` · `encrypted_blob` · `thumbnail_blob` | `page_id` (plain TEXT, no FK); index on `page_id`; `encrypted_blob` BLOB NOT NULL, `thumbnail_blob` BLOB | ✓ shape-locked |

`pages` full column set (ADR-002 §5.2 + note.ts `Page`, full `baseColumns`): `id · type · title[E] · content[E] ·
parent_id · entity_type · entity_id · journal_date · is_favorite · is_archived · icon · cover_image[E] ·
summary_config[E] · has_pomodoro · word_count · created_at · updated_at · deleted_at · _sync_*`.
`page_links` / `note_attachments` also take full `baseColumns` + `deleted_at` (ADR-016 §3.4 locked pattern — §4).

### 3c. `ENTITY_TYPES` registry reconcile
`_registry.ts` already seeds `page · note · journal · tag · space` (the Notes/Spaces foundation set). A page is
referenced by other entities as `entity_type='page'` (or `note`/`journal`), all already registered. **Intent: this unit
likely appends NOTHING** — the per-domain module types that `pages.entity_type` / `entity_links.entity_type` point *at*
(`task`, `habit`, `milestone`, …) arrive with **their own** domain groups (per the `_registry.ts` "each domain APPENDS
its types at DB-4" rule), not here. Confirm in P3. `[FACT: _registry.ts]`

### 3d. RETIRE set (verify absent — BR-N5)
`page_tags` (→ `entity_tags`) · `pomodoro_sessions` (→ `focus_sessions`, group #3) · `pages.slug` (v2 dropped, G2 —
links resolve by `target_page_id`). None must appear in the v2 `schema/`. `[FACT: identity.md:18; NP-9 [INTENT]]`

## §4. Shape is fully doc-determined — NO open decisions
The three tables carry **zero shape choices**. ADR-002 §5.2's literal DDL is self-flagged **stale** (L22) and its
divergences from the shape below are precisely the "five systemic gaps" ADR-016 exists to fix — the authoritative shape
is the DB-1/DB-3 **locked patterns + live conventions**, applied identically here. Each formerly-ambiguous point is
resolved by a citable rule, not a build-phase call:

- **N-R1 — All refs are plain TEXT + index, NO SQL FK** (incl. self-ref `pages.parent_id`). The no-FK model is the
  enforced convention across all 17 authored tables — self-refs included (`spaces.ts` `parent_tag_id`/`parent_space_id`
  "no FK") — and DB-3 `BR-DB3-1` ("cross-domain refs plain TEXT no FK"). ADR-002 §5.2's `REFERENCES … ON DELETE
  CASCADE/SET NULL` clauses are the stale-v1 form. NP-9's cascade/orphan semantics are **app/sync-layer** behavior, not
  SQL `ON DELETE`. `[FACT: spaces.ts:20-22; database-layer/current-business-rules.md BR-DB3-1; ADR-002 §5.2:22 stale]`
- **N-R2 — Full `baseColumns` (incl. `updated_at`) + `deleted_at` on all 3 tables.** ADR-016 §3.4 makes `baseColumns`
  (id · created_at · updated_at · sync) a **locked pattern enforced for every table**, and names `updated_at` omissions
  as one of the five systemic gaps being fixed. ADR-002 §5.2's minimal `created_at`-only shape for `page_links`/
  `note_attachments` is that exact stale gap; here they take full `baseColumns` + `deleted_at` (the AR-6 `entity_links`
  sibling already does). `[FACT: ADR-016 §3.1/§3.4; spaces.ts entityLinks full base]`
  - **Interface-staleness corollary:** `@vida/types` `PageLink`/`NoteAttachment` still extend `SyncMetadata`
    (`created_at` only), so the full-base tables diverge from those interfaces — the **same divergence already on `main`**
    for `entity_links` vs `EntityLink`. This unit authors the Drizzle mirror only (no `@vida/types` row-interface change,
    per the DB-3 precedent); interface reconciliation is DB-11. No `$inferSelect↔interface` assertion exists → compiles.
    `[FACT: spaces.ts vs note.ts:127; DB-3 authored 0 row interfaces]`
- **N-R3 — Physical home = `schema/notes.ts` + `migrations/012_notes.ts`.** ADR-016 §3.1 mandates the DB-4 layout:
  `<domain>.ts` (one per `structure-data.md`); `foundation/` is cross-cutting substrate only (DB-3-and-earlier). This is
  the first Stream (ii) domain module; migration slot is `012` (§6). `[FACT: ADR-016 §3.1; migrations/ ends at 011]`
- **N-R4 — `has_pomodoro` retained as a plaintext filter boolean.** Not retired anywhere — it is a P (plaintext)
  "boolean for filtering" (ADR-002:229; security-model:463). The pomodoro re-home retires only
  `pomodoro_sessions.page_id` (the timer→page direct link, PD-2), not the page-side filter flag. Keep as-is. `[FACT:
  ADR-002 L229,L1315; pomodoro/structure-data.md:41-42]`
- **N-R5 — `summary_config` is not a schema item.** It is a `TEXT [E]` JSON column; capturing the full intended section
  set is a `@vida/types JournalSummaryConfig` change (+ candidate `/adr-new`, G5) that does **not** alter this table's
  DDL. No P4 migration impact. `[FACT: note.ts L83-89; business-rules G5]`
- **N-R6 — `pages.type` FIXED CHECK(6) from `PAGE_TYPE`; `entity_type` OPEN no-CHECK** (BR-N1/N2); `journal_date`
  partial UNIQUE (BR-N4). All three are direct convention applications, not choices.

## §5. Phase-1 completion checklist
- [x] intent source read in full (5 aspects + note.ts + ADR-002 §5.2 + ADR-006/004 substrate on disk)
- [x] FULL intent intaken (no ship-scope trim) — 7 As-is → 3 ADD + 3 done-in-substrate + 1 re-homed
- [x] FIXED vs OPEN enum classified per column (BR-N1/N2)
- [x] RETIRE set enumerated (verify-absent, BR-N5)
- [x] `ENTITY_TYPES` reconcile scoped (no-op — page/note/journal/tag/space already seeded; confirm P3)
- [x] shape fully doc-determined — NO open decisions (§4 N-R1…N-R6, each doc-cited)
- [x] **P2 — current-state read** (done — see §6 below)
- [x] **P3 — plan double-gate** — `sessions/PLAN-2026-08-18-db-4-notes.md`; gate-1 independent critique REVISE (1 blocker: stale-interface wording; fixed, N-R2 kept) → Approval 1 · preflight PASSED +2 folds (`summary_config`→`text()`; runner count-dynamic) → gate-2 critique SHIP → Approval 2.
- [x] **P4 — implement** — `schema/notes.ts` + `migrations/012_notes.ts` + barrel + runner + 4 parity edits. `@vida/core` 193 green (incl. `pages.type` parity) · root typecheck 11/11 · grep gates pass.
- [x] **P5 — foundation-soundness** — post-impl independent critique **SHIP** (0 blocker/material) · §XXIX currency promoted to `database-layer/current-{spec,business-rules}.md` · foundation-readiness MOD-notes (#31) contract PASS. **Group #1 DONE.**

---

## §6. Phase 2 — Current-state read (reconcile-and-extend baseline)
`[FACT: grep over packages/core/src/db/schema/ · 2026-08-18]`

| Intent (3b) | On disk? | Evidence |
|---|---|---|
| `pages` | ✗ **absent** — author | no quoted def in `schema/**` |
| `page_links` | ✗ **absent** — author | no quoted def in `schema/**` |
| `note_attachments` | ✗ **absent** — author | no quoted def in `schema/**` |
| `entity_links` (substrate) | ✓ present | `spaces.ts:68` (migration 003) |
| `tags` (substrate) | ✓ present | `spaces.ts:35` |
| `entity_tags` (substrate) | ✓ present | `spaces.ts:52` |
| RETIRE `page_tags`/`pomodoro_sessions`/`slug` | ✓ absent (correct) | no occurrence in `schema/**` |

- **Migration slot:** next number is **`012`** (`migrations/` ends at `011_templates.ts`; `ALL_MIGRATIONS` in
  `runner.ts` ends at `migration011Templates`). This unit adds `012_notes.ts` + its registry import. `[FACT: migrations/ listing; runner.ts:22,44]`
- **Barrel:** `schema/index.ts` re-exports each `foundation/*` module; a new `schema/notes.ts` (D-N7) gets one `export *` line. `[FACT: index.ts]`
- **Baseline verdict:** clean reconcile-and-extend — 3 net-new tables, zero collisions, siblings already substrated,
  zero open shape decisions (§4). No divergent/stub rows to reconcile. P3 is a straight authoring plan.
