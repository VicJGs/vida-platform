# Task: db-2-sync-metadata-columns
# Profile: Generic Coding Session
# Scenario: Default
# Spec: docs/specs/foundation/db-2-sync-metadata-columns/_index.md
# Created: 2026-07-22
# Status: PARKED — superseded by ADR-017 (features-first resequencing) on 2026-07-23. NOT completed.
#   Reason: DB-2's charter (add _sync_field_ts + decide the HLC representation F6/D4-d) is only needed
#   when the sync engine flushes. ADR-017 defers sync (and encryption/auth) to a post-validation hardening
#   pass, so the HLC decision defers WITH it. Baseline (§XXVI.1a) was done; no code was written; no schema
#   changed. If revived: the sync-metadata work resurfaces in the hardening pass, re-planned against ADR-017.
#   Linear LIF-64 → Backlog.
# Cluster: ① Database Layer
# Milestone: Schema
# Phase: 1.0 — Structural Foundation
# Issue: LIF-64
# Source: docs/roadmap.md → Phase 1.0 ① Database Layer (DB-2)

## Goal
Amend the shared `syncColumns` primitive so every syncable table inherits the FINAL
sync-metadata set: the 6 DB-1 columns (`_sync_id / _version / _device_id / _lww_ts /
_status / _hash`) **plus** `_sync_field_ts` (ADR-003 §17), plus `effect_event_id` +
UNIQUE-on-output for idempotent effect application (ADR-004 F1), and resolve the HLC
representation decision (F6 / D4-d). A primitive amendment — authored before any domain
table so no table is ever missing a sync column.

## Phase-1 framing (why this is safe to lock now)
Phase 1 is single-user localhost. These columns are **WRITTEN in every transaction but
NEVER flushed** to a server — there is no sync engine running yet. Locking the full column
set now makes the Phase-2 sync bolt-on **non-structural** (no table migration to add sync
metadata later). This is the whole reason DB-2 is a P0.5 primitive and not deferred.

## Dependencies
- Blocked by: DB-1 / LIF-61 (schema primitives) — DONE (commit b234e85). This task amends
  the `syncColumns` primitive DB-1 established (currently 6 cols; `_shared.ts:24-30`).

## Context
Profile: Generic Coding Session / Default
Files involved:
- `packages/core/src/db/schema/_shared.ts` — `syncColumns` (6 DB-1 cols, line 24-30) + the
  `...syncColumns` spread inside `baseColumns` (line 38).
- Possibly ADR-003 §17 / ADR-004 amendment if the HLC representation needs to be pinned in an ADR.
Integration points: every syncable table (via the `baseColumns` / `syncColumns` spread); the
future sync engine in `@vida/core` that reads these columns for LWW + idempotent effect replay.

## Ground truth (read first)
- **ADR-002 §5.20 owed-tables ledger — `ADR-002-data-model.md:3790-3794`** — the CONSOLIDATED
  authority; lists DB-2's exact scope: `_sync_field_ts TEXT` (universal, ADR-003 §17), the
  `effect_event_id` pair (ADR-004 F1), and the HLC-representation row (F6/D4-d). Start here.
  ⚠ SCOPE BOUNDARY: `_sync_field_ts` is universal (goes in the shared `syncColumns` spread);
  `effect_event_id` is NOT — it lives only on effect-**triggering** rows + UNIQUE on effect-**output**
  rows, so it must NOT be added to `syncColumns`. Resolve where it belongs in PLAN.
- ADR-016 (`docs/core/decisions/ADR-016-storage-layer-rebuild-from-zero.md`) — governs the campaign.
- `docs/infrastructure/storage-build-plan.md` — the master ledger (P0.5 sync-columns / DB-2 row).
- ADR-003 §17 (`docs/core/decisions/ADR-003-sync-protocol.md`) — `_sync_field_ts` + HLC:
  causal ordering + device-id tie-break, NOT raw wall-clock. Authority on the representation.
- ADR-004 (`docs/core/decisions/ADR-004-*.md`) F1 — `effect_event_id` + UNIQUE-on-output
  (idempotent effect application). Read for the exact column semantics.
- `packages/core/src/db/schema/_shared.ts:23-40` — current primitive state (6 cols; the
  in-code comment already reserves `_sync_field_ts` for DB-2).
- DB-1 boundary note (archived task): "`_sync_field_ts` + HLC representation → DB-2".

## Open Questions
- [D4-d / F6] HLC representation of `_sync_lww_ts` / `_sync_field_ts`: single packed INTEGER
  (wall-ms high bits + logical counter + device tie-break) vs separate columns? Resolve in PLAN
  against ADR-003 §17. Never guess past this UNKNOWN.
- `_sync_field_ts` granularity: one column (JSON map of field→ts) vs field-level LWW handled in
  the sync engine, not the schema? Confirm against ADR-003 §17 field-level intent.
- `effect_event_id` + UNIQUE-on-output (ADR-004 F1): is the UNIQUE constraint a schema-level
  index authored here, or migration-level (hand-written SQL, DB-3/4)? Boundary check in PLAN.

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| *(logged automatically by /session-log)* | | | |

## Progress
<!-- SESSION checklist — the scenario's ## Task List (what the native panel mirrors). Session-level. -->
- [x] document-context BASELINE (§XXVI.1a) — current-* for `database-layer` confirmed CURRENT (no drift; DB-1 already promoted). Ground truth solid: syncColumns=6, `_sync_field_ts` owed to DB-2, DDL=hand-written SQL so the amendment emits zero DDL (query-layer only).
- [ ] Per-Step Build Gate: plan → critique → preflight → critique
- [ ] Resolve HLC representation (D4-d/F6) + `_sync_field_ts` granularity against ADR-003 §17
- [ ] Confirm `effect_event_id` / UNIQUE-on-output scope (schema vs migration) against ADR-004 F1
- [ ] Implement the approved `_shared.ts` amendment
- [ ] Verify (tsc green core/web/server; syncColumns count; non-regression) + gates + Currency Rule

## Build Steps
<!-- UNIT-level — mirrors the active spec's §5 Implementation Prompt; what victor:execute-plan-* works.
     Filled when the unit's spec §5 is approved. Distinct from ## Progress. -->
- [ ] [filled from the spec §5 once planned]

## Plan
<!-- Only for a SPEC-LESS small task (§XXVI LITE): not applicable — this is a gated code unit. -->

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-07-20 | stub created (planned) — captured ADR-003 §17 / ADR-004 F1 / HLC F6-D4-d scope | — |
| 2026-07-22 | activated task (in-progress) + scaffolded spec stub; merged the pre-existing stub detail | run the loop: document-context baseline → plan (/documentation-component) → critique → preflight |

## Notes
Per-table gating (ADR-016): DB-2 is its own build gate even though it only amends a primitive.
The HLC decision may warrant an ADR-003 §17 amendment rather than a new ADR — decide in PLAN.
