> ⛔ **PARKED / SUPERSEDED by ADR-017 (2026-07-23)** — features-first resequencing defers sync (and the HLC
> representation decision) to a post-validation hardening pass. This stub is retained as the record; not active.

# Unit: db-2-sync-metadata-columns (foundation · refactor)

> Thin index (session-split form). Deep content lives in `sessions/`. No §3/§5 duplicated here.
> **STUB** — scaffolded by /task-new 2026-07-22. Written for real by the PLAN step (/documentation-component).

## Identity

- **What:** P0.5 of the from-zero storage rebuild — amend the shared `syncColumns` primitive
  (`packages/core/src/db/schema/_shared.ts`) to the FINAL sync-metadata set: add `_sync_field_ts`
  (per-field LWW, ADR-003 §17), settle the `effect_event_id` idempotency columns' home (ADR-004 F1),
  and pin the HLC representation of `_sync_lww_ts` / `_sync_field_ts` (F6 / D4-d).
- **Why:** Phase 1 is single-user localhost — these columns are written every transaction but never
  flushed. Locking the full set now makes the Phase-2 sync bolt-on **non-structural** (no later table
  migration to add sync metadata). Authored before any domain table so no table can miss a sync column.
- **Type:** refactor / foundation. **Additive** — amends the DB-1 primitive; the v1 monolith stays reference-only.
- **Issue:** LIF-64 · **Cluster:** ① Database Layer · **Phase:** 1.0.
- **What it is NOT:** not a domain table (DB-3/DB-4); not the sync engine (Phase 2); not encryption (DB-5).

## Acceptance

See the PLAN §4 (functional) and, after Approval 1, the IMPLEMENTATION-PLAN §Acceptance (technical/parity).

## Gate files (session split)

- **Gate 1 — PLAN (direction):** `sessions/PLAN-2026-07-22-db-2-sync-metadata-columns.md` — _to be written_
- **Gate 2 — IMPLEMENTATION-PLAN (build):** `sessions/IMPLEMENTATION-PLAN-2026-07-22-db-2-sync-metadata-columns.md` — _after Approval 1_

## Status

**Draft (stub)** — task activated; loop not yet started. Next: `/document-context` baseline → PLAN.

## Ground truth

`ADR-002 §5.20 owed-tables ledger (ADR-002-data-model.md:3790-3794)` — the consolidated scope · ADR-003 §17
(`_sync_field_ts` + HLC) · ADR-004 §3.2.5 F1 (`effect_event_id` + UNIQUE-on-output) · ADR-016 (campaign) ·
`docs/infrastructure/storage-build-plan.md` (ledger) · current primitive `packages/core/src/db/schema/_shared.ts:23-40`.

## Open UNKNOWNs / Decisions Needed

- [F6/D4-d] HLC representation of `_sync_lww_ts` + `_sync_field_ts` (string / BigInt / two-column) +
  HLC-state home (`last_l`/`last_c`); `updated_at` stays wall-ms. Resolve against ADR-003 §17 in PLAN.
- Scope of `effect_event_id`: NOT universal (effect-triggering + UNIQUE effect-output rows only) — decide
  whether DB-2 authors a helper vs deferring to per-table DB-3/4. Never guess past this.
